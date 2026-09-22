-- AG-06 account-lifecycle hardening.
-- Keep historical staff/audit references while ensuring deletion of an Auth identity
-- immediately revokes the corresponding Newsroom profile and sessions.

begin;

create or replace function public.newsroom_revoke_staff_on_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform set_config('app.newsroom_rpc','1',true);

  update public.staff_profiles
  set status='revoked',
      revoked_at=coalesce(revoked_at,now()),
      updated_at=now()
  where auth_user_id=old.id;

  update public.newsroom_sessions ns
  set revoked_at=coalesce(ns.revoked_at,now())
  where ns.auth_user_id=old.id
    and ns.revoked_at is null;

  return old;
end;
$$;

revoke execute on function public.newsroom_revoke_staff_on_auth_delete() from public, anon, authenticated;

drop trigger if exists on_auth_user_newsroom_revoke on auth.users;
create trigger on_auth_user_newsroom_revoke
after delete on auth.users
for each row execute function public.newsroom_revoke_staff_on_auth_delete();

-- Backfill already-deleted Auth identities. This preserves staff IDs referenced by
-- immutable audit/editorial history while making their authority state accurate.
select set_config('app.newsroom_rpc','1',true);

update public.staff_profiles sp
set status='revoked',
    revoked_at=coalesce(sp.revoked_at,now()),
    updated_at=now()
where lower(sp.status)='active'
  and sp.auth_user_id is not null
  and not exists (select 1 from auth.users u where u.id=sp.auth_user_id);

update public.newsroom_sessions ns
set revoked_at=coalesce(ns.revoked_at,now())
where ns.revoked_at is null
  and exists (
    select 1
    from public.staff_profiles sp
    where sp.id=ns.staff_profile_id
      and lower(sp.status)='revoked'
      and sp.auth_user_id is not null
      and not exists (select 1 from auth.users u where u.id=sp.auth_user_id)
  );

commit;
