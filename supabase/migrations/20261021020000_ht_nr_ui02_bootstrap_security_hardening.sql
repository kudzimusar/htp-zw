-- ============================================================================
-- Migration: 20261021020000_ht_nr_ui02_bootstrap_security_hardening.sql
-- Programme: HealthTimes Newsroom OS (HT-NR-UI-02)
-- Description: Critical First-Owner Bootstrap Hardening & Confirmation Sync
-- ============================================================================

-- 1. Revoke the old vulnerable parameterized bootstrap function
revoke all on function public.newsroom_bootstrap_owner(text, text) from public, anon, authenticated;
drop function if exists public.newsroom_bootstrap_owner(text, text);

-- 2. Define hardened parameterless bootstrap function strictly bounded to kudzimusar@gmail.com
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
begin
  -- 1. Permanent disablement: Once ANY active Publisher / Owner exists, fail closed
  if exists (
    select 1 from public.staff_profiles sp
    join public.newsroom_roles r on sp.role_id = r.id
    where r.name = c_owner_role and sp.status = 'active'
  ) then
    raise exception using errcode = '42501',
      message = 'Bootstrap permanently disabled: Active Publisher / Owner already provisioned.';
  end if;

  -- 2. Caller verification: If called in an authenticated session, caller must match exact Owner email
  if auth.uid() is not null then
    v_caller_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
    if v_caller_email <> c_owner_email then
      raise exception using errcode = '42501',
        message = 'Unauthorized caller: Bootstrap is strictly restricted to ' || c_owner_email;
    end if;
  end if;

  -- 3. Lookup canonical Publisher / Owner role
  select id into v_role_id from public.newsroom_roles where name = c_owner_role;
  if v_role_id is null then
    raise exception using errcode = '22023', message = 'Publisher / Owner role not found in system roles';
  end if;

  -- 4. Verify canonical pre-authorized Owner invitation
  select id into v_inv_id
  from public.newsroom_staff_invitations
  where id = c_owner_invitation_id
    and lower(invited_email) = c_owner_email
    and invited_role_id = v_role_id
    and status in ('pending', 'sent')
    and expires_at > now();

  if v_inv_id is null then
    -- Fallback: lookup by exact email & role if invitation UUID differed
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

  -- 5. Check if auth user already exists in auth.users
  select id into v_auth_user_id
  from auth.users
  where lower(email) = c_owner_email;

  if v_auth_user_id is not null then
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
  end if;

  -- 6. Record immutable audit log
  insert into public.audit_logs (
    actor_staff_id, action, target_table, target_id, metadata
  )
  values (
    v_audit_actor,
    'newsroom.owner.bootstrap_verified',
    'staff_profiles',
    coalesce(v_staff_id, v_inv_id),
    jsonb_build_object(
      'target_email', c_owner_email,
      'role', c_owner_role,
      'invitation_id', v_inv_id,
      'auth_user_linked', v_auth_user_id is not null,
      'activated', v_staff_id is not null,
      'caller_auth_uid', auth.uid()
    )
  );

  return jsonb_build_object(
    'status', case when v_staff_id is not null then 'activated' else 'invitation_ready' end,
    'email', c_owner_email,
    'invitation_id', v_inv_id,
    'auth_user_linked', v_auth_user_id is not null
  );
end;
$function$;

-- Restrict execution: Deny anon and public. Allow authenticated (verified inside function) and service_role.
revoke all on function public.newsroom_bootstrap_owner() from public, anon;
grant execute on function public.newsroom_bootstrap_owner() to authenticated, service_role;

-- 3. Enhance newsroom_sync_staff_from_auth() for email confirmation lifecycle
create or replace function public.newsroom_sync_staff_from_auth()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_invite public.newsroom_staff_invitations%rowtype;
  v_handle text;
  v_status text;
  v_staff_id uuid;
begin
  -- First try explicit invitation ID from metadata
  if new.raw_user_meta_data ? 'newsroom_invitation_id' then
    select * into v_invite
    from public.newsroom_staff_invitations
    where id = (new.raw_user_meta_data->>'newsroom_invitation_id')::uuid
      and lower(invited_email) = lower(new.email)
      and expires_at > now()
      and status in ('pending', 'sent')
    limit 1;
  end if;

  -- Fallback: match by email for any pending invitation
  if v_invite.id is null and new.email is not null then
    select * into v_invite
    from public.newsroom_staff_invitations
    where lower(invited_email) = lower(new.email)
      and expires_at > now()
      and status in ('pending', 'sent')
    order by created_at desc
    limit 1;
  end if;

  if v_invite.id is not null then
    v_handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9._-]+', '-', 'g'));
    if exists(select 1 from public.staff_profiles where lower(handle) = lower(v_handle) and auth_user_id is distinct from new.id) then
      v_handle := v_handle || '-' || left(replace(new.id::text, '-', ''), 8);
    end if;

    -- Email confirmed transitions directly to active
    v_status := case when new.email_confirmed_at is not null then 'active' else 'invited' end;

    perform set_config('app.newsroom_rpc', '1', true);
    insert into public.staff_profiles (
      auth_user_id, display_name, email, role_id, desk, country, status, handle, assigned_editor_id, created_at, updated_at
    )
    values (
      new.id, v_invite.display_name, lower(new.email), v_invite.invited_role_id, v_invite.desk, v_invite.country, v_status, v_handle, v_invite.assigned_editor_id, now(), now()
    )
    on conflict (email) do update set
      auth_user_id = excluded.auth_user_id,
      display_name = excluded.display_name,
      role_id = excluded.role_id,
      desk = excluded.desk,
      country = excluded.country,
      status = excluded.status,
      handle = coalesce(public.staff_profiles.handle, excluded.handle),
      assigned_editor_id = excluded.assigned_editor_id,
      updated_at = now()
    returning id into v_staff_id;

    update public.newsroom_staff_invitations
    set auth_user_id = new.id,
        status = case when new.email_confirmed_at is not null then 'accepted' else 'sent' end,
        accepted_at = case when new.email_confirmed_at is not null then coalesce(accepted_at, now()) else accepted_at end
    where id = v_invite.id;

    -- Audit registration / confirmation
    insert into public.audit_logs (
      actor_staff_id, action, target_table, target_id, metadata
    )
    values (
      v_staff_id,
      case when new.email_confirmed_at is not null then 'staff.account.activated' else 'staff.account.invited_registered' end,
      'staff_profiles',
      v_staff_id,
      jsonb_build_object(
        'email', lower(new.email),
        'invitation_id', v_invite.id,
        'email_confirmed', new.email_confirmed_at is not null,
        'status', v_status
      )
    );
  end if;

  return new;
end;
$function$;

-- Ensure trigger runs on INSERT and on relevant UPDATE events
drop trigger if exists on_auth_user_newsroom_sync on auth.users;
create trigger on_auth_user_newsroom_sync
  after insert or update of email_confirmed_at, raw_user_meta_data, email
  on auth.users
  for each row
  execute function public.newsroom_sync_staff_from_auth();
