-- AG-06 R5 certification/runtime hardening.
-- Forward-only: optimize global audit reads and correct the service-role cleanup boundary.

begin;

create index if not exists idx_audit_logs_created_at_desc
  on public.audit_logs(created_at desc);

create or replace function public.newsroom_clear_certification_public_author_bindings(p_profile_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cleared integer := 0;
begin
  -- Execution authority is enforced by explicit GRANT/REVOKE below.
  -- This avoids relying on deprecated request.jwt.claim.* GUCs inside PostgREST.
  if p_profile_ids is null
     or cardinality(p_profile_ids)=0
     or cardinality(p_profile_ids)>1000 then
    raise exception using errcode='22023',message='Bounded certification profile IDs required';
  end if;

  perform set_config('app.newsroom_rpc','1',true);

  update public.staff_profiles sp
  set public_author_id=null,
      updated_at=now()
  where sp.id=any(p_profile_ids)
    and sp.beat='AG-06 staging certification'
    and lower(sp.status)='revoked'
    and sp.revoked_at is not null
    and sp.email ~ '^ag06-(reporter|editor|commercial|publisher)-[0-9]+-[0-9]+@healthtimes[.]co[.]zw$'
    and sp.public_author_id is not null;

  get diagnostics v_cleared = row_count;
  return v_cleared;
end;
$$;

revoke execute on function public.newsroom_clear_certification_public_author_bindings(uuid[])
  from public, anon, authenticated;
grant execute on function public.newsroom_clear_certification_public_author_bindings(uuid[])
  to service_role;

commit;
