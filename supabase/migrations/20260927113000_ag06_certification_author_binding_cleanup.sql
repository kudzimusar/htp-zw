-- Clear only bounded AG-06 staging-test staff bylines through a dedicated
-- service-role RPC. The protected staff trigger remains in force for direct writes.

begin;

create function public.newsroom_clear_certification_public_author_bindings(p_profile_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cleared integer := 0;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception using errcode='42501',message='Certification cleanup service role required';
  end if;
  if p_profile_ids is null or cardinality(p_profile_ids)>1000 then
    raise exception using errcode='22023',message='Bounded certification profile IDs required';
  end if;

  perform set_config('app.newsroom_rpc','1',true);
  update public.staff_profiles sp
  set public_author_id=null,updated_at=now()
  where sp.id=any(p_profile_ids)
    and sp.beat='AG-06 staging certification'
    and sp.email ~ '^ag06-(reporter|editor|commercial|publisher)-[0-9]+-[0-9]+@healthtimes[.]co[.]zw$'
    and sp.public_author_id is not null;
  get diagnostics v_cleared = row_count;
  return v_cleared;
end;
$$;

revoke execute on function public.newsroom_clear_certification_public_author_bindings(uuid[]) from public, anon, authenticated;
grant execute on function public.newsroom_clear_certification_public_author_bindings(uuid[]) to service_role;

commit;
