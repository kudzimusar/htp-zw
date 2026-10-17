-- Migration 75: HT-NR-06C-A-R1 — Push Token Ownership + Database Privilege Recustody
-- Repository migration count: 75
-- Staging migration count: 75

-- ============================================================================
-- 1. HARDEN TABLE PRIVILEGES (ZERO CLIENT TABLE PERMISSIONS)
-- ============================================================================

revoke all on table public.reader_push_devices from public, anon, authenticated;
revoke all on table public.newsroom_push_alerts from public, anon, authenticated;

-- ============================================================================
-- 2. REPLACE READER_REGISTER_PUSH_DEVICE (STRICT OWNERSHIP & NO CROSS-READER MUTATION)
-- ============================================================================

create or replace function public.reader_register_push_device(
  p_expo_push_token text,
  p_platform text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token text;
  v_platform text;
  v_token_hash text;
  v_device_id uuid;
  v_existing_id uuid;
  v_existing_reader_id uuid;
  v_revoked_id uuid;
begin
  -- 1. Require authenticated Reader session
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required to register push device';
  end if;

  -- 2. Validate token format (ExpoPushToken or ExponentPushToken)
  v_token := trim(p_expo_push_token);
  if v_token is null or length(v_token) = 0 or length(v_token) > 255 then
    raise exception using errcode = '22023', message = 'Invalid push token: non-empty bounded token required';
  end if;

  if v_token !~ '^(ExponentPushToken|ExpoPushToken)\[[^\s\[\]]{10,200}\]$' then
    raise exception using errcode = '22023', message = 'Invalid Expo push token format';
  end if;

  -- 3. Validate platform (strictly ios or android)
  v_platform := lower(trim(p_platform));
  if v_platform not in ('ios', 'android') then
    raise exception using errcode = '22023', message = 'Invalid platform: only ios and android are supported';
  end if;

  -- 4. Compute SHA-256 token hash
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');

  -- 5. Inspect any ACTIVE registration for this token hash
  select id, reader_user_id into v_existing_id, v_existing_reader_id
  from public.reader_push_devices
  where token_hash = v_token_hash
    and status = 'active'
  for update;

  if v_existing_id is not null then
    -- If active registration belongs to current authenticated user: refresh idempotently
    if v_existing_reader_id = auth.uid() then
      update public.reader_push_devices
      set status = 'active',
          revoked_at = null,
          last_registered_at = now(),
          platform = v_platform,
          expo_push_token = v_token,
          updated_at = now()
      where id = v_existing_id;
      v_device_id := v_existing_id;
    else
      -- Active registration belongs to another reader -> FAIL CLOSED
      -- Do NOT revoke the other reader, do NOT update or transfer ownership
      raise exception using errcode = '42501', message = 'Push token is already registered to another reader';
    end if;
  else
    -- No active registration exists for this token hash
    -- Check if current authenticated reader has a historical revoked row to reactivate
    select id into v_revoked_id
    from public.reader_push_devices
    where reader_user_id = auth.uid()
      and token_hash = v_token_hash
      and status = 'revoked'
    limit 1
    for update;

    if v_revoked_id is not null then
      update public.reader_push_devices
      set status = 'active',
          revoked_at = null,
          last_registered_at = now(),
          platform = v_platform,
          expo_push_token = v_token,
          updated_at = now()
      where id = v_revoked_id;
      v_device_id := v_revoked_id;
    else
      -- Insert new active registration row
      begin
        insert into public.reader_push_devices (
          reader_user_id,
          expo_push_token,
          token_hash,
          platform,
          status,
          last_registered_at,
          revoked_at,
          created_at,
          updated_at
        ) values (
          auth.uid(),
          v_token,
          v_token_hash,
          v_platform,
          'active',
          now(),
          null,
          now(),
          now()
        )
        returning id into v_device_id;
      exception when unique_violation then
        -- Concurrent active registration race: re-verify owner
        select id, reader_user_id into v_existing_id, v_existing_reader_id
        from public.reader_push_devices
        where token_hash = v_token_hash
          and status = 'active'
        for update;

        if v_existing_id is not null and v_existing_reader_id = auth.uid() then
          v_device_id := v_existing_id;
        else
          raise exception using errcode = '42501', message = 'Push token is already registered to another reader';
        end if;
      end;
    end if;
  end if;

  -- Return bounded response: only device_id and status; zero token or user leakage
  return jsonb_build_object(
    'device_id', v_device_id,
    'status', 'active'
  );
end;
$$;

-- ============================================================================
-- 3. HARDEN FUNCTION PRIVILEGES (REVOKE FROM PUBLIC & ANON; GRANT TO AUTHENTICATED)
-- ============================================================================

-- reader_register_push_device(text, text)
revoke all on function public.reader_register_push_device(text, text) from public;
revoke execute on function public.reader_register_push_device(text, text) from public;
revoke all on function public.reader_register_push_device(text, text) from anon;
revoke execute on function public.reader_register_push_device(text, text) from anon;
grant execute on function public.reader_register_push_device(text, text) to authenticated;

-- reader_revoke_push_device(uuid)
revoke all on function public.reader_revoke_push_device(uuid) from public;
revoke execute on function public.reader_revoke_push_device(uuid) from public;
revoke all on function public.reader_revoke_push_device(uuid) from anon;
revoke execute on function public.reader_revoke_push_device(uuid) from anon;
grant execute on function public.reader_revoke_push_device(uuid) to authenticated;

-- newsroom_list_push_alerts(text, text, text, integer)
revoke all on function public.newsroom_list_push_alerts(text, text, text, integer) from public;
revoke execute on function public.newsroom_list_push_alerts(text, text, text, integer) from public;
revoke all on function public.newsroom_list_push_alerts(text, text, text, integer) from anon;
revoke execute on function public.newsroom_list_push_alerts(text, text, text, integer) from anon;
grant execute on function public.newsroom_list_push_alerts(text, text, text, integer) to authenticated;

-- newsroom_create_push_alert(jsonb)
revoke all on function public.newsroom_create_push_alert(jsonb) from public;
revoke execute on function public.newsroom_create_push_alert(jsonb) from public;
revoke all on function public.newsroom_create_push_alert(jsonb) from anon;
revoke execute on function public.newsroom_create_push_alert(jsonb) from anon;
grant execute on function public.newsroom_create_push_alert(jsonb) to authenticated;

-- newsroom_save_push_alert(uuid, jsonb)
revoke all on function public.newsroom_save_push_alert(uuid, jsonb) from public;
revoke execute on function public.newsroom_save_push_alert(uuid, jsonb) from public;
revoke all on function public.newsroom_save_push_alert(uuid, jsonb) from anon;
revoke execute on function public.newsroom_save_push_alert(uuid, jsonb) from anon;
grant execute on function public.newsroom_save_push_alert(uuid, jsonb) to authenticated;

-- newsroom_approve_push_alert(uuid)
revoke all on function public.newsroom_approve_push_alert(uuid) from public;
revoke execute on function public.newsroom_approve_push_alert(uuid) from public;
revoke all on function public.newsroom_approve_push_alert(uuid) from anon;
revoke execute on function public.newsroom_approve_push_alert(uuid) from anon;
grant execute on function public.newsroom_approve_push_alert(uuid) to authenticated;

-- newsroom_prepare_push_alert(uuid)
revoke all on function public.newsroom_prepare_push_alert(uuid) from public;
revoke execute on function public.newsroom_prepare_push_alert(uuid) from public;
revoke all on function public.newsroom_prepare_push_alert(uuid) from anon;
revoke execute on function public.newsroom_prepare_push_alert(uuid) from anon;
grant execute on function public.newsroom_prepare_push_alert(uuid) to authenticated;
