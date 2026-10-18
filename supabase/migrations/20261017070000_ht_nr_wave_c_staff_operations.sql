-- Migration 80: HT-NR-CLOSE Wave C — Staff / Access / Security Operations
-- Closes /studio/staff-roles with full staff directory, roles, capabilities, status management, session revocation and audit history.

begin;

-- 1. Capabilities: Ensure staff.manage capability exists
insert into public.newsroom_capabilities (key, description)
values ('staff.manage', 'Full management of newsroom staff profiles, roles, status, and sessions')
on conflict (key) do update set description = excluded.description;

-- Grant staff.manage to Publisher / Owner and Editor-in-Chief
insert into public.newsroom_role_capabilities (role_id, capability_key)
select r.id, 'staff.manage'
from public.newsroom_roles r
where r.name in ('Publisher / Owner', 'Editor-in-Chief')
on conflict do nothing;

-- 2. Roles: Ensure Contributor role exists
insert into public.newsroom_roles (name, description)
values ('Contributor', 'External or guest writer; can draft and submit stories for editorial review')
on conflict (name) do update set description = excluded.description;

insert into public.newsroom_role_capabilities (role_id, capability_key)
select r.id, c.key
from public.newsroom_roles r
cross join (
  values ('story.create'), ('story.edit_own'), ('story.submit')
) as c(key)
where r.name = 'Contributor'
on conflict do nothing;

-- 3. Replace newsroom_change_staff_role with alias support and staff.manage permission
create or replace function public.newsroom_change_staff_role(p_staff_id uuid, p_role_name text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_role_id uuid;
  v_previous text;
  v_target_role text;
begin
  if not (public.newsroom_has_capability('staff.manage') or public.newsroom_has_capability('staff.change_role')) then
    raise exception using errcode='42501',message='staff.manage capability required';
  end if;
  if p_staff_id = v_actor then
    raise exception using errcode='42501',message='Self role changes are not permitted';
  end if;

  -- Canonical alias mapping
  v_target_role := case
    when lower(trim(p_role_name)) in ('admin', 'administrator', 'publisher', 'owner', 'publisher / owner') then 'Publisher / Owner'
    when lower(trim(p_role_name)) in ('commercial / ops', 'commercial manager', 'ops') then 'Commercial Manager'
    when lower(trim(p_role_name)) in ('reporter', 'journalist', 'reporter / journalist') then 'Reporter / Journalist'
    when lower(trim(p_role_name)) in ('managing editor') then 'Managing Editor'
    when lower(trim(p_role_name)) in ('editor-in-chief', 'editor in chief') then 'Editor-in-Chief'
    when lower(trim(p_role_name)) in ('section editor') then 'Section Editor'
    when lower(trim(p_role_name)) in ('copy editor') then 'Copy Editor'
    when lower(trim(p_role_name)) in ('contributor') then 'Contributor'
    else trim(p_role_name)
  end;

  select id into v_role_id from public.newsroom_roles where lower(name) = lower(v_target_role) or name = v_target_role;
  if v_role_id is null then
    raise exception using errcode='22023',message='Unknown newsroom role: ' || p_role_name;
  end if;

  select r.name into v_previous
  from public.staff_profiles sp
  left join public.newsroom_roles r on r.id = sp.role_id
  where sp.id = p_staff_id;

  if v_previous is null and not exists (select 1 from public.staff_profiles where id = p_staff_id) then
    raise exception using errcode='P0002',message='Staff profile not found';
  end if;

  perform set_config('app.newsroom_rpc', '1', true);
  update public.staff_profiles set role_id = v_role_id, updated_at = now() where id = p_staff_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'staff.role.changed',
    'staff_profiles',
    p_staff_id,
    jsonb_build_object('previous', coalesce(v_previous, 'none'), 'new', v_target_role)
  );
end;
$$;

-- 4. Status management: newsroom_update_staff_status (activate, suspend, revoke)
create or replace function public.newsroom_update_staff_status(p_staff_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_status text := lower(trim(p_status));
  v_previous text;
begin
  if not (public.newsroom_has_capability('staff.manage') or public.newsroom_has_capability('staff.revoke')) then
    raise exception using errcode='42501',message='staff.manage capability required';
  end if;
  if p_staff_id = v_actor then
    raise exception using errcode='42501',message='Self status modification is not permitted';
  end if;
  if v_status not in ('active', 'suspended', 'revoked', 'deactivated') then
    raise exception using errcode='22023',message='Invalid staff status: ' || p_status;
  end if;

  select status into v_previous from public.staff_profiles where id = p_staff_id;
  if v_previous is null then
    raise exception using errcode='P0002',message='Staff profile not found';
  end if;

  perform set_config('app.newsroom_rpc', '1', true);

  update public.staff_profiles
  set status = v_status,
      revoked_at = case
        when v_status in ('revoked', 'deactivated', 'suspended') then coalesce(revoked_at, now())
        when v_status = 'active' then null
        else revoked_at
      end,
      updated_at = now()
  where id = p_staff_id;

  if v_status in ('suspended', 'revoked', 'deactivated') then
    update public.newsroom_sessions
    set revoked_at = coalesce(revoked_at, now()),
        revoked_by = v_actor
    where staff_profile_id = p_staff_id and revoked_at is null;
  end if;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'staff.status.' || v_status,
    'staff_profiles',
    p_staff_id,
    jsonb_build_object('previous_status', v_previous, 'new_status', v_status)
  );
end;
$$;

-- 5. Session Revocation: update newsroom_revoke_session to recognize staff.manage
create or replace function public.newsroom_revoke_session(p_staff_id uuid, p_provider_session_id text default null)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_count integer;
begin
  if p_staff_id <> v_actor and not (
    public.newsroom_has_capability('staff.manage')
    or public.newsroom_has_capability('security.revoke_session')
  ) then
    raise exception using errcode='42501',message='security.revoke_session or staff.manage capability required';
  end if;

  update public.newsroom_sessions
  set revoked_at = coalesce(revoked_at, now()),
      revoked_by = v_actor
  where staff_profile_id = p_staff_id
    and revoked_at is null
    and (p_provider_session_id is null or provider_session_id = p_provider_session_id);

  get diagnostics v_count = row_count;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'session.revoked',
    'staff_profiles',
    p_staff_id,
    jsonb_build_object('provider_session_id', p_provider_session_id, 'revoked_count', v_count)
  );

  return v_count;
end;
$$;

-- 6. Invitation cancellation: newsroom_cancel_invitation
create or replace function public.newsroom_cancel_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_invite public.newsroom_staff_invitations%rowtype;
begin
  if not (public.newsroom_has_capability('staff.manage') or public.newsroom_has_capability('staff.invite')) then
    raise exception using errcode='42501',message='staff.manage capability required';
  end if;

  select * into v_invite from public.newsroom_staff_invitations where id = p_invitation_id;
  if v_invite.id is null then
    raise exception using errcode='P0002',message='Invitation not found';
  end if;

  update public.newsroom_staff_invitations
  set status = 'cancelled'
  where id = p_invitation_id and status in ('pending', 'sent');

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'staff.invitation.cancelled',
    'newsroom_staff_invitations',
    p_invitation_id,
    jsonb_build_object('email', v_invite.invited_email, 'role_id', v_invite.invited_role_id)
  );
end;
$$;

-- 7. Staff Operations Directory: newsroom_get_staff_operations_directory()
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

  -- 1. Staff directory
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
    ) order by s.display_name
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
    limit 200
  ) s;

  -- 2. Pending invitations
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

  -- 3. Roles catalogue
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

  -- 4. Capabilities catalogue
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', c.key,
      'description', c.description,
      'category', case
        when c.key like 'story.%' or c.key like 'assignment.%' or c.key like 'comment.%' then 'editorial'
        when c.key like 'distribution.%' or c.key like 'social.%' or c.key like 'marketing.%' or c.key like 'communication.%' then 'distribution'
        when c.key like 'ads.%' or c.key like 'premium.%' or c.key like 'subscriber.%' then 'commercial'
        when c.key like 'security.%' then 'audit'
        else 'staff_admin'
      end
    ) order by c.key
  ), '[]'::jsonb)
  into v_capabilities
  from public.newsroom_capabilities c;

  -- 5. Audit history
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

-- 8. Permissions and Security
revoke all on function public.newsroom_change_staff_role(uuid, text) from public, anon;
grant execute on function public.newsroom_change_staff_role(uuid, text) to authenticated, service_role;

revoke all on function public.newsroom_update_staff_status(uuid, text) from public, anon;
grant execute on function public.newsroom_update_staff_status(uuid, text) to authenticated, service_role;

revoke all on function public.newsroom_revoke_session(uuid, text) from public, anon;
grant execute on function public.newsroom_revoke_session(uuid, text) to authenticated, service_role;

revoke all on function public.newsroom_cancel_invitation(uuid) from public, anon;
grant execute on function public.newsroom_cancel_invitation(uuid) to authenticated, service_role;

revoke all on function public.newsroom_get_staff_operations_directory() from public, anon;
grant execute on function public.newsroom_get_staff_operations_directory() to authenticated, service_role;

commit;
