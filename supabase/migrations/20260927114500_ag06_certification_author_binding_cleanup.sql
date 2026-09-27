-- AG-06 certification cleanup authority.
-- Allows service-role cleanup of stale public-author bindings only on revoked,
-- synthetic AG-06 staging certification profiles. It does not grant general
-- staff-author mutation authority and does not weaken the protected-field trigger.

begin;

create or replace function public.newsroom_cleanup_revoked_certification_author_binding(
  p_staff_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_previous uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception using errcode='42501',message='service_role required for certification cleanup';
  end if;

  select *
  into v_staff
  from public.staff_profiles
  where id=p_staff_id
    and email like 'ag06-%@healthtimes.co.zw'
    and beat='AG-06 staging certification'
    and lower(status)='revoked'
    and revoked_at is not null
  for update;

  if v_staff.id is null then
    raise exception using errcode='P0002',message='Revoked AG-06 certification profile not found';
  end if;

  if v_staff.public_author_id is null then
    return false;
  end if;

  v_previous := v_staff.public_author_id;
  perform set_config('app.newsroom_rpc','1',true);

  update public.staff_profiles
  set public_author_id=null,
      updated_at=now()
  where id=p_staff_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(
    null,
    'certification.public_author_binding.cleaned',
    'staff_profiles',
    p_staff_id,
    jsonb_build_object(
      'previous_author_id',v_previous,
      'scope','AG-06 staging certification cleanup'
    )
  );

  return true;
end;
$$;

revoke execute on function public.newsroom_cleanup_revoked_certification_author_binding(uuid) from public,anon,authenticated;
grant execute on function public.newsroom_cleanup_revoked_certification_author_binding(uuid) to service_role;

commit;
