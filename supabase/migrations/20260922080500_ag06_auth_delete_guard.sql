-- AG-06 nested lifecycle-trigger hardening.
-- Permit only the database-owner security-definer path used by Auth deletion
-- to update protected staff authority fields without an RPC GUC.

begin;

create or replace function public.newsroom_protect_staff_authority_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'postgres'
     and current_setting('app.newsroom_rpc',true) is distinct from '1' then
    if new.auth_user_id is distinct from old.auth_user_id
       or new.email is distinct from old.email
       or new.role_id is distinct from old.role_id
       or new.status is distinct from old.status
       or new.mfa_required is distinct from old.mfa_required
       or new.mfa_enrolled_at is distinct from old.mfa_enrolled_at
       or new.revoked_at is distinct from old.revoked_at
       or new.assigned_editor_id is distinct from old.assigned_editor_id then
      raise exception using errcode='42501',message='Protected staff authority fields require an approved Newsroom RPC';
    end if;
  end if;
  return new;
end;
$$;

commit;
