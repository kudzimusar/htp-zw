-- HT-MVP-RL-01-UAT-04B-STG01-R1
-- Keep the authenticated staff member visible in the bounded administration
-- directory even when certification/test identities exceed the 200-row cap.

begin;

create or replace function public.newsroom_get_staff_operations_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_can_manage boolean := false;
  v_can_view boolean := false;
  v_staff jsonb;
  v_invitations jsonb;
  v_roles jsonb;
  v_capabilities jsonb;
  v_audit_history jsonb;
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Not authorized';
  end if;

  v_can_manage := public.newsroom_has_capability('staff.manage');
  v_can_view := v_can_manage or public.newsroom_has_capability('staff.view');

  if not v_can_view then
    raise exception using errcode='42501',message='staff.view capability required';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'display_name', s.display_name,
      'email', s.email,
      'handle', coalesce(s.handle, split_part(s.email, '@', 1)),
      'role_id', s.role_id,
      'role_name', coalesce(s.role_name, 'Unassigned'),
      'desk', s.desk,
      'beat', s.beat,
      'country', s.country,
      'region', s.region,
      'status', s.status,
      'mfa_required', s.mfa_required,
      'last_login_at', s.last_login_at,
      'created_at', s.created_at,
      'active_sessions_count', s.active_sessions_count,
      'capabilities', s.capabilities
    ) order by (s.id = v_actor) desc, s.display_name
  ), '[]'::jsonb)
  into v_staff
  from (
    select
      sp.id,
      sp.display_name,
      sp.email,
      sp.handle,
      sp.role_id,
      r.name as role_name,
      sp.desk,
      sp.beat,
      sp.country,
      sp.region,
      sp.status,
      sp.mfa_required,
      sp.last_login_at,
      sp.created_at,
      (
        select count(*)::int
        from public.newsroom_sessions ns
        where ns.staff_profile_id = sp.id
          and ns.revoked_at is null
      ) as active_sessions_count,
      coalesce(
        (
          select jsonb_agg(distinct cap.capability_key)
          from (
            select rc.capability_key
            from public.newsroom_role_capabilities rc
            where rc.role_id = sp.role_id
            union
            select o.capability_key
            from public.newsroom_staff_capability_overrides o
            where o.staff_profile_id = sp.id and o.allowed = true
          ) cap
          where not exists (
            select 1
            from public.newsroom_staff_capability_overrides o2
            where o2.staff_profile_id = sp.id
              and o2.capability_key = cap.capability_key
              and o2.allowed = false
          )
        ),
        '[]'::jsonb
      ) as capabilities
    from public.staff_profiles sp
    left join public.newsroom_roles r on r.id = sp.role_id
    order by (sp.id = v_actor) desc, sp.created_at desc, sp.id
    limit 200
  ) s;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', inv.id,
      'invited_email', inv.invited_email,
      'display_name', inv.display_name,
      'role_name', r.name,
      'desk', inv.desk,
      'country', inv.country,
      'status', inv.status,
      'created_at', inv.created_at,
      'expires_at', inv.expires_at
    ) order by inv.created_at desc
  ), '[]'::jsonb)
  into v_invitations
  from public.newsroom_staff_invitations inv
  left join public.newsroom_roles r on r.id = inv.invited_role_id
  where inv.status in ('pending', 'sent')
  limit 50;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ro.id,
      'name', ro.name,
      'description', ro.description,
      'capabilities', coalesce((
        select jsonb_agg(rc.capability_key order by rc.capability_key)
        from public.newsroom_role_capabilities rc
        where rc.role_id = ro.id
      ), '[]'::jsonb)
    ) order by ro.name
  ), '[]'::jsonb)
  into v_roles
  from public.newsroom_roles ro;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', c.key,
      'description', c.description,
      'category', case
        when c.key like 'story.%' or c.key like 'assignment.%' or c.key like 'comment.%' then 'editorial'
        when c.key like 'distribution.%' or c.key like 'social.%' or c.key like 'marketing.%' or c.key like 'communication.%' then 'distribution'
        when c.key like 'ads.%' or c.key like 'premium.%' or c.key like 'subscriber.%' then 'commercial'
        when c.key like 'finance.%' then 'finance'
        when c.key like 'security.%' then 'audit'
        else 'staff_admin'
      end
    ) order by c.key
  ), '[]'::jsonb)
  into v_capabilities
  from public.newsroom_capabilities c;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'action', a.action,
      'actor_staff_id', a.actor_staff_id,
      'actor_name', actor.display_name,
      'target_table', a.target_table,
      'target_id', a.target_id,
      'metadata', a.metadata,
      'created_at', a.created_at
    ) order by a.created_at desc
  ), '[]'::jsonb)
  into v_audit_history
  from (
    select al.id, al.action, al.actor_staff_id, al.target_table, al.target_id, al.metadata, al.created_at
    from public.audit_logs al
    where al.action like 'staff.%'
       or al.action like 'session.%'
       or al.action like 'security.%'
    order by al.created_at desc, al.id desc
    limit 40
  ) a
  left join public.staff_profiles actor on actor.id = a.actor_staff_id;

  return jsonb_build_object(
    'staff', v_staff,
    'invitations', v_invitations,
    'roles', v_roles,
    'capabilities', v_capabilities,
    'audit_history', v_audit_history,
    'can_manage_staff', v_can_manage
  );
end;
$$;

revoke all on function public.newsroom_get_staff_operations_directory() from public, anon;
grant execute on function public.newsroom_get_staff_operations_directory() to authenticated, service_role;

commit;
