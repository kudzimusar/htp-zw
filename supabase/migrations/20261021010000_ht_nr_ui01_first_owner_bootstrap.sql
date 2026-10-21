-- ============================================================================
-- Migration: 20261021010000_ht_nr_ui01_first_owner_bootstrap.sql
-- Description: First-Owner Bootstrap & Invitation Fallback for HT-NR-UI-01
-- ============================================================================

-- 1. Allow nullable invited_by for bootstrap invitations
alter table public.newsroom_staff_invitations
  alter column invited_by drop not null;

-- 2. Enhance newsroom_sync_staff_from_auth to match invitations by email when
--    newsroom_invitation_id is not present in raw_user_meta_data.
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
    v_status := case when new.email_confirmed_at is not null then 'active' else 'invited' end;

    perform set_config('app.newsroom_rpc', '1', true);
    insert into public.staff_profiles(
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
      updated_at = now();

    update public.newsroom_staff_invitations
    set auth_user_id = new.id,
        status = case when new.email_confirmed_at is not null then 'accepted' else 'sent' end,
        accepted_at = case when new.email_confirmed_at is not null then coalesce(accepted_at, now()) else accepted_at end
    where id = v_invite.id;
  end if;

  return new;
end;
$function$;

-- 3. Dedicated bootstrap RPC that provisions the first Publisher / Owner safely
create or replace function public.newsroom_bootstrap_owner(
  p_email text default 'kudzimusar@gmail.com',
  p_display_name text default 'Publisher / Owner'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_role_id uuid;
  v_inv_id uuid;
  v_auth_user_id uuid;
  v_email text := lower(trim(p_email));
  v_name text := trim(p_display_name);
  v_handle text;
  v_staff_id uuid;
begin
  -- Deadlock-protection: ONLY allow bootstrap if NO active Publisher / Owner staff exists
  if exists (
    select 1 from public.staff_profiles sp
    join public.newsroom_roles r on sp.role_id = r.id
    where r.name = 'Publisher / Owner' and sp.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Bootstrap disabled: Active Publisher / Owner already provisioned.';
  end if;

  -- Ensure target email is valid
  if v_email is null or position('@' in v_email) = 0 then
    raise exception using errcode = '22023', message = 'Invalid bootstrap email address';
  end if;

  -- Lookup Publisher / Owner role
  select id into v_role_id from public.newsroom_roles where name = 'Publisher / Owner';
  if v_role_id is null then
    raise exception using errcode = '22023', message = 'Publisher / Owner role not found';
  end if;

  -- Check if an active/pending invitation already exists
  select id into v_inv_id
  from public.newsroom_staff_invitations
  where lower(invited_email) = v_email
    and status in ('pending', 'sent')
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_inv_id is null then
    insert into public.newsroom_staff_invitations (
      invited_email, display_name, invited_role_id, desk, country, invited_by, status, metadata, expires_at
    )
    values (
      v_email, v_name, v_role_id, 'Executive', 'ZW', null, 'pending',
      jsonb_build_object('bootstrap', true, 'created_at', now()),
      now() + interval '30 days'
    )
    returning id into v_inv_id;
  end if;

  -- Check if auth user already exists in auth.users
  select id into v_auth_user_id
  from auth.users
  where lower(email) = v_email;

  if v_auth_user_id is not null then
    v_handle := lower(regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9._-]+', '-', 'g'));
    if exists(select 1 from public.staff_profiles where lower(handle) = lower(v_handle) and auth_user_id is distinct from v_auth_user_id) then
      v_handle := v_handle || '-' || left(replace(v_auth_user_id::text, '-', ''), 8);
    end if;

    perform set_config('app.newsroom_rpc', '1', true);
    insert into public.staff_profiles(
      auth_user_id, display_name, email, role_id, desk, country, status, handle, created_at, updated_at
    )
    values (
      v_auth_user_id, v_name, v_email, v_role_id, 'Executive', 'ZW', 'active', v_handle, now(), now()
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
        accepted_at = now()
    where id = v_inv_id;
  end if;

  -- Audit log entry
  insert into public.audit_logs (actor_staff_id, action, target_table, target_id, metadata)
  values (
    v_staff_id,
    'newsroom.bootstrap_owner',
    'newsroom_staff_invitations',
    v_inv_id,
    jsonb_build_object('email', v_email, 'staff_id', v_staff_id, 'auth_linked', v_auth_user_id is not null)
  );

  return jsonb_build_object(
    'ok', true,
    'invitation_id', v_inv_id,
    'email', v_email,
    'role', 'Publisher / Owner',
    'auth_linked', v_auth_user_id is not null,
    'staff_id', v_staff_id
  );
end;
$function$;

-- Permissions: revoke from anon, grant execute to authenticated
revoke all on function public.newsroom_bootstrap_owner(text, text) from public;
revoke all on function public.newsroom_bootstrap_owner(text, text) from anon;
grant execute on function public.newsroom_bootstrap_owner(text, text) to authenticated;
