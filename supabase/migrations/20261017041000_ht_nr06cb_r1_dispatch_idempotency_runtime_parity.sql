-- Migration 77: HT-NR-06C-B-R1 — Dispatch Idempotency & Runtime Parity
-- Repository migration count: 77
-- Staging migration count: 77

-- ============================================================================
-- 1. ENFORCE SINGLE-DISPATCH INVARIANT PER ALERT
-- ============================================================================

-- Add database-enforced unique constraint on alert_id in newsroom_push_dispatches
-- Guarantees at most ONE provider dispatch lifecycle per push alert
alter table public.newsroom_push_dispatches
  add constraint uq_newsroom_push_dispatches_alert_id unique (alert_id);

-- ============================================================================
-- 2. REVISE PREPARATION RPC (ATOMIC SINGLE-ALERT & KEY IDEMPOTENCY)
-- ============================================================================

create or replace function public.newsroom_prepare_dispatch_recipients(
  p_alert_id uuid,
  p_idempotency_key text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_alert record;
  v_existing_dispatch record;
  v_new_dispatch_id uuid;
  v_devices jsonb;
  v_clean_key text;
begin
  -- 1. Enforce service-role authority
  if current_user not in ('service_role', 'postgres') and coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role authority required';
  end if;

  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'Actor user ID required';
  end if;

  v_clean_key := trim(p_idempotency_key);
  if v_clean_key is null or length(v_clean_key) = 0 then
    raise exception using errcode = '22023', message = 'Idempotency key required';
  end if;

  -- 2. Check if this idempotency key is already bound to a DIFFERENT alert -> FAIL CLOSED
  select * into v_existing_dispatch
  from public.newsroom_push_dispatches
  where idempotency_key = v_clean_key;

  if v_existing_dispatch.id is not null then
    if v_existing_dispatch.alert_id <> p_alert_id then
      raise exception using errcode = '23505', message = 'Idempotency key already belongs to a different push alert';
    end if;

    -- Same alert + same key: idempotent replay
    return jsonb_build_object(
      'is_duplicate', true,
      'dispatch_id', v_existing_dispatch.id,
      'alert_id', v_existing_dispatch.alert_id,
      'status', v_existing_dispatch.status,
      'eligible_device_count', v_existing_dispatch.eligible_device_count,
      'provider_accepted_count', v_existing_dispatch.provider_accepted_count,
      'provider_rejected_count', v_existing_dispatch.provider_rejected_count,
      'confirmed_delivery_count', v_existing_dispatch.confirmed_delivery_count,
      'failure_reason', v_existing_dispatch.failure_reason,
      'devices', '[]'::jsonb
    );
  end if;

  -- 3. Check if this alert has ALREADY been dispatched under a DIFFERENT key -> IDEMPOTENT REPLAY
  select * into v_existing_dispatch
  from public.newsroom_push_dispatches
  where alert_id = p_alert_id;

  if v_existing_dispatch.id is not null then
    return jsonb_build_object(
      'is_duplicate', true,
      'dispatch_id', v_existing_dispatch.id,
      'alert_id', v_existing_dispatch.alert_id,
      'status', v_existing_dispatch.status,
      'eligible_device_count', v_existing_dispatch.eligible_device_count,
      'provider_accepted_count', v_existing_dispatch.provider_accepted_count,
      'provider_rejected_count', v_existing_dispatch.provider_rejected_count,
      'confirmed_delivery_count', v_existing_dispatch.confirmed_delivery_count,
      'failure_reason', v_existing_dispatch.failure_reason,
      'devices', '[]'::jsonb
    );
  end if;

  -- 4. Lock push alert row and verify existence and 'prepared' status
  select * into v_alert
  from public.newsroom_push_alerts
  where id = p_alert_id
  for update;

  if v_alert.id is null then
    raise exception using errcode = '22023', message = 'Push alert not found';
  end if;

  if v_alert.status <> 'prepared' then
    raise exception using errcode = '22023', message = 'Push alert must be in prepared status for dispatch';
  end if;

  -- 5. Atomic race-safe insertion:
  -- If two concurrent dispatches race for the same alert_id or key,
  -- catch unique_violation and safely return existing dispatch record
  begin
    insert into public.newsroom_push_dispatches (
      alert_id,
      idempotency_key,
      dispatched_by,
      status,
      eligible_device_count,
      created_at,
      updated_at
    ) values (
      p_alert_id,
      v_clean_key,
      p_actor_user_id,
      'dispatching',
      0,
      now(),
      now()
    ) returning id into v_new_dispatch_id;
  exception
    when unique_violation then
      -- Check if key belonged to another alert
      select * into v_existing_dispatch
      from public.newsroom_push_dispatches
      where idempotency_key = v_clean_key;

      if v_existing_dispatch.id is not null and v_existing_dispatch.alert_id <> p_alert_id then
        raise exception using errcode = '23505', message = 'Idempotency key already belongs to a different push alert';
      end if;

      -- Fetch existing dispatch for this alert
      select * into v_existing_dispatch
      from public.newsroom_push_dispatches
      where alert_id = p_alert_id;

      if v_existing_dispatch.id is not null then
        return jsonb_build_object(
          'is_duplicate', true,
          'dispatch_id', v_existing_dispatch.id,
          'alert_id', v_existing_dispatch.alert_id,
          'status', v_existing_dispatch.status,
          'eligible_device_count', v_existing_dispatch.eligible_device_count,
          'provider_accepted_count', v_existing_dispatch.provider_accepted_count,
          'provider_rejected_count', v_existing_dispatch.provider_rejected_count,
          'confirmed_delivery_count', v_existing_dispatch.confirmed_delivery_count,
          'failure_reason', v_existing_dispatch.failure_reason,
          'devices', '[]'::jsonb
        );
      end if;

      raise;
  end;

  -- 6. Collect active recipient device tokens (strictly inside service_role boundary)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'device_id', d.id,
        'expo_push_token', d.expo_push_token
      )
    ),
    '[]'::jsonb
  ) into v_devices
  from public.reader_push_devices d
  where d.status = 'active';

  return jsonb_build_object(
    'is_duplicate', false,
    'dispatch_id', v_new_dispatch_id,
    'alert_id', v_alert.id,
    'status', 'dispatching',
    'alert', jsonb_build_object(
      'id', v_alert.id,
      'title', v_alert.title,
      'body', v_alert.body,
      'category', v_alert.category,
      'destination', v_alert.destination
    ),
    'devices', v_devices
  );
end;
$$;

revoke all on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) from public;
revoke execute on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) from public;
revoke all on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) from anon;
revoke execute on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) from anon;
revoke all on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) from authenticated;
revoke execute on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) from authenticated;
grant execute on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) to service_role;

-- ============================================================================
-- 3. REVISE RESULT-RECORDING RPC (ENFORCE ACCOUNTING INVARIANT)
-- ============================================================================

create or replace function public.newsroom_record_dispatch_result(
  p_dispatch_id uuid,
  p_status text,
  p_eligible_count integer,
  p_accepted_count integer,
  p_rejected_count integer,
  p_failure_reason text default null,
  p_tickets jsonb default '[]'::jsonb,
  p_provider_response jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rec record;
  v_ticket jsonb;
  v_status text;
begin
  -- 1. Enforce service-role authority
  if current_user not in ('service_role', 'postgres') and coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role authority required';
  end if;

  if p_status not in (
    'provider-accepted',
    'partially-accepted',
    'provider-rejected',
    'delivery-failed',
    'zero-recipients'
  ) then
    raise exception using errcode = '22023', message = 'Invalid dispatch result status';
  end if;

  -- 2. Enforce internal accounting invariant: accepted + rejected == eligible
  if coalesce(p_accepted_count, 0) + coalesce(p_rejected_count, 0) <> coalesce(p_eligible_count, 0) then
    raise exception using errcode = '22023', message = 'Accepted and rejected counts must sum to eligible count';
  end if;

  -- 3. Update dispatch ledger row
  update public.newsroom_push_dispatches
  set status = p_status,
      eligible_device_count = coalesce(p_eligible_count, 0),
      provider_accepted_count = coalesce(p_accepted_count, 0),
      provider_rejected_count = coalesce(p_rejected_count, 0),
      failure_reason = p_failure_reason,
      provider_response = p_provider_response,
      updated_at = now()
  where id = p_dispatch_id
  returning * into v_rec;

  if v_rec.id is null then
    raise exception using errcode = '22023', message = 'Dispatch record not found';
  end if;

  -- 4. Record individual tickets if present
  if p_tickets is not null and jsonb_typeof(p_tickets) = 'array' and jsonb_array_length(p_tickets) > 0 then
    for v_ticket in select * from jsonb_array_elements(p_tickets)
    loop
      if (v_ticket->>'device_id') is not null and (v_ticket->>'device_id') ~ '^[0-9a-f-]{36}$' then
        v_status := coalesce(v_ticket->>'status', 'ticket-accepted');
        if v_status not in ('ticket-accepted', 'ticket-rejected', 'ticket-error') then
          v_status := 'ticket-error';
        end if;

        insert into public.newsroom_push_dispatch_tickets (
          dispatch_id,
          device_id,
          ticket_id,
          status,
          ticket_error
        ) values (
          p_dispatch_id,
          (v_ticket->>'device_id')::uuid,
          v_ticket->>'ticket_id',
          v_status,
          v_ticket->>'ticket_error'
        );
      end if;
    end loop;
  end if;

  -- 5. Return sanitized bounded aggregate
  return jsonb_build_object(
    'dispatch_id', v_rec.id,
    'alert_id', v_rec.alert_id,
    'status', v_rec.status,
    'eligible_device_count', v_rec.eligible_device_count,
    'provider_accepted_count', v_rec.provider_accepted_count,
    'provider_rejected_count', v_rec.provider_rejected_count,
    'confirmed_delivery_count', v_rec.confirmed_delivery_count,
    'failure_reason', v_rec.failure_reason,
    'dispatched_at', v_rec.updated_at
  );
end;
$$;

revoke all on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) from public;
revoke execute on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) from public;
revoke all on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) from anon;
revoke execute on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) from anon;
revoke all on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) from authenticated;
revoke execute on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) from authenticated;
grant execute on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) to service_role;
