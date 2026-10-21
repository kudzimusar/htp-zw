-- ============================================================================
-- Migration 96: 20261021050000_ht_nr_rc01_owner_auth_email_verification.sql
-- Programme: HealthTimes Newsroom OS (HT-MVP-RC-01)
-- Classification: P0 Security Hardening (First-Owner Activation & Identity Assurance)
-- Description: Enforces strict email verification on newsroom_bootstrap_owner():
--              1. Disallows anonymous invocation (authenticated session required).
--              2. Asserts caller JWT email strictly equals 'kudzimusar@gmail.com'.
--              3. Prevents unconfirmed identity privilege escalation by verifying
--                 auth.users.email_confirmed_at IS NOT NULL before Publisher activation.
--              4. Revokes execution privileges from anon and public roles.
--              5. Grants idempotent success to active confirmed Owner.
-- ============================================================================

create or replace function public.newsroom_bootstrap_owner()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  c_owner_email constant text := 'kudzimusar@gmail.com';
  c_owner_role constant text := 'Publisher / Owner';
  c_owner_desk constant text := 'Executive';
  c_owner_invitation_id constant uuid := '3c277c48-5319-429f-a2c3-1bf2dbae4c2a'::uuid;

  v_role_id uuid;
  v_inv_id uuid;
  v_auth_user_id uuid;
  v_caller_email text;
  v_handle text;
  v_staff_id uuid;
  v_audit_actor uuid;
  v_email_confirmed boolean := false;
begin
  -- 1. Check if active Publisher / Owner already exists
  select sp.id into v_staff_id
  from public.staff_profiles sp
  join public.newsroom_roles r on sp.role_id = r.id
  where r.name = c_owner_role and sp.status = 'active' and lower(sp.email) = c_owner_email;

  if v_staff_id is not null then
    -- If caller is the active Owner, return idempotent success
    if auth.uid() is not null and exists (
      select 1 from public.staff_profiles where id = v_staff_id and auth_user_id = auth.uid()
    ) then
      return jsonb_build_object(
        'success', true,
        'message', 'Publisher / Owner profile is already active for ' || c_owner_email,
        'staff_id', v_staff_id,
        'role', c_owner_role,
        'already_provisioned', true
      );
    end if;

    -- Otherwise, permanent fail-closed
    raise exception using errcode = '42501',
      message = 'Bootstrap permanently disabled: Active Publisher / Owner already provisioned.';
  end if;

  -- 2. Authenticated Session Required: Disallow anonymous invocation
  if auth.uid() is null then
    raise exception using errcode = '42501',
      message = 'Unauthorized caller: Authenticated session required for Owner activation.';
  end if;

  -- 3. Caller Identity Verification: Caller JWT must strictly match canonical Owner email
  v_caller_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  if v_caller_email <> c_owner_email then
    raise exception using errcode = '42501',
      message = 'Unauthorized caller: Bootstrap is strictly restricted to ' || c_owner_email;
  end if;

  -- 4. Email Confirmation Verification: Prevent unconfirmed identity privilege escalation
  select id, (email_confirmed_at is not null or confirmed_at is not null)
  into v_auth_user_id, v_email_confirmed
  from auth.users
  where id = auth.uid() and lower(email) = c_owner_email;

  if v_auth_user_id is null then
    raise exception using errcode = '42501',
      message = 'Unauthorized caller: No matching user record found in authentication directory.';
  end if;

  if not v_email_confirmed then
    raise exception using errcode = '42501',
      message = 'Publisher activation blocked: Email address is registered but has not been confirmed. Independent email ownership verification required.';
  end if;

  -- 5. Lookup canonical Publisher / Owner role
  select id into v_role_id from public.newsroom_roles where name = c_owner_role;
  if v_role_id is null then
    raise exception using errcode = '22023', message = 'Publisher / Owner role not found in system roles';
  end if;

  -- 6. Verify canonical pre-authorized Owner invitation
  select id into v_inv_id
  from public.newsroom_staff_invitations
  where id = c_owner_invitation_id
    and lower(invited_email) = c_owner_email
    and invited_role_id = v_role_id
    and status in ('pending', 'sent')
    and expires_at > now();

  if v_inv_id is null then
    select id into v_inv_id
    from public.newsroom_staff_invitations
    where lower(invited_email) = c_owner_email
      and invited_role_id = v_role_id
      and status in ('pending', 'sent')
      and expires_at > now()
    order by created_at desc
    limit 1;
  end if;

  if v_inv_id is null then
    raise exception using errcode = '42501',
      message = 'Valid pending Publisher / Owner invitation for ' || c_owner_email || ' does not exist or has expired.';
  end if;

  -- 7. Provision active Staff Profile
  v_handle := lower(regexp_replace(split_part(c_owner_email, '@', 1), '[^a-z0-9._-]+', '-', 'g'));
  if exists(select 1 from public.staff_profiles where lower(handle) = lower(v_handle) and auth_user_id is distinct from v_auth_user_id) then
    v_handle := v_handle || '-' || left(replace(v_auth_user_id::text, '-', ''), 8);
  end if;

  perform set_config('app.newsroom_rpc', '1', true);
  insert into public.staff_profiles (
    auth_user_id, display_name, email, role_id, desk, country, status, handle, created_at, updated_at
  )
  values (
    v_auth_user_id, 'Kudzi Musarurwa', c_owner_email, v_role_id, c_owner_desk, 'ZW', 'active', v_handle, now(), now()
  )
  on conflict (email) do update set
    auth_user_id = excluded.auth_user_id,
    display_name = excluded.display_name,
    role_id = excluded.role_id,
    desk = excluded.desk,
    country = excluded.country,
    status = 'active',
    handle = coalesce(public.staff_profiles.handle, excluded.handle),
    updated_at = now()
  returning id into v_staff_id;

  update public.newsroom_staff_invitations
  set auth_user_id = v_auth_user_id,
      status = 'accepted',
      accepted_at = coalesce(accepted_at, now())
  where id = v_inv_id;

  v_audit_actor := v_staff_id;

  -- 8. Record immutable audit log
  insert into public.audit_logs (
    actor_staff_id, action, target_table, target_id, metadata
  )
  values (
    v_audit_actor,
    'newsroom.owner.bootstrap_verified',
    'staff_profiles',
    v_staff_id,
    jsonb_build_object(
      'target_email', c_owner_email,
      'role', c_owner_role,
      'invitation_id', v_inv_id,
      'auth_user_linked', true,
      'email_confirmed', true,
      'activated', true,
      'caller_auth_uid', auth.uid()
    )
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Publisher / Owner profile successfully activated for ' || c_owner_email,
    'staff_id', v_staff_id,
    'role', c_owner_role,
    'invitation_id', v_inv_id,
    'email_confirmed', true
  );
end;
$function$;

-- Restrict function execution strictly to authenticated users (revoke anon and public)
revoke execute on function public.newsroom_bootstrap_owner() from anon, public;
grant execute on function public.newsroom_bootstrap_owner() to authenticated;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version)
values ('20261021050000')
on conflict (version) do nothing;
