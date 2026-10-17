-- Migration 76: HT-NR-06C-B — Governed Push Provider Execution + Delivery Ledger Foundation
-- Repository migration count: 76
-- Staging migration count: 76

-- ============================================================================
-- 1. CANONICAL DISPATCH LEDGER & TICKETS TABLES
-- ============================================================================

create table if not exists public.newsroom_push_dispatches (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.newsroom_push_alerts(id) on delete cascade,
  idempotency_key text not null,
  dispatched_by uuid not null references auth.users(id),
  status text not null check (status in (
    'dispatching',
    'provider-accepted',
    'partially-accepted',
    'provider-rejected',
    'delivery-failed',
    'zero-recipients'
  )),
  eligible_device_count integer not null default 0 check (eligible_device_count >= 0),
  provider_accepted_count integer not null default 0 check (provider_accepted_count >= 0),
  provider_rejected_count integer not null default 0 check (provider_rejected_count >= 0),
  confirmed_delivery_count integer not null default 0 check (confirmed_delivery_count >= 0),
  failure_reason text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_newsroom_push_dispatches_idempotency unique (idempotency_key)
);

create index if not exists idx_push_dispatches_alert on public.newsroom_push_dispatches(alert_id, created_at desc);

create table if not exists public.newsroom_push_dispatch_tickets (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.newsroom_push_dispatches(id) on delete cascade,
  device_id uuid not null references public.reader_push_devices(id),
  ticket_id text,
  status text not null check (status in ('ticket-accepted', 'ticket-rejected', 'ticket-error')),
  ticket_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_dispatch_tickets_dispatch on public.newsroom_push_dispatch_tickets(dispatch_id);

-- ============================================================================
-- 2. HARDEN TABLE PRIVILEGES (ZERO CLIENT TABLE ACCESS)
-- ============================================================================

alter table public.newsroom_push_dispatches enable row level security;
alter table public.newsroom_push_dispatch_tickets enable row level security;

revoke all on table public.newsroom_push_dispatches from public, anon, authenticated;
revoke all on table public.newsroom_push_dispatch_tickets from public, anon, authenticated;

-- ============================================================================
-- 3. STAFF AGGREGATE DISPATCH PROJECTION RPC
-- ============================================================================

create or replace function public.newsroom_get_push_alert_dispatch(
  p_alert_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_dispatch record;
begin
  -- 1. Require authenticated Newsroom session with distribution.manage or story.publish
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not (public.newsroom_has_capability('distribution.manage') or public.newsroom_has_capability('story.publish')) then
    raise exception using errcode = '42501', message = 'Push desk capability required to view dispatch state';
  end if;

  -- 2. Fetch latest dispatch record for this alert
  select
    id,
    alert_id,
    idempotency_key,
    status,
    eligible_device_count,
    provider_accepted_count,
    provider_rejected_count,
    confirmed_delivery_count,
    failure_reason,
    created_at,
    updated_at
  into v_dispatch
  from public.newsroom_push_dispatches
  where alert_id = p_alert_id
  order by created_at desc
  limit 1;

  if v_dispatch.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'dispatch_id', v_dispatch.id,
    'alert_id', v_dispatch.alert_id,
    'idempotency_key', v_dispatch.idempotency_key,
    'status', v_dispatch.status,
    'eligible_device_count', v_dispatch.eligible_device_count,
    'provider_accepted_count', v_dispatch.provider_accepted_count,
    'provider_rejected_count', v_dispatch.provider_rejected_count,
    'confirmed_delivery_count', v_dispatch.confirmed_delivery_count,
    'failure_reason', v_dispatch.failure_reason,
    'created_at', v_dispatch.created_at,
    'updated_at', v_dispatch.updated_at
  );
end;
$$;

revoke all on function public.newsroom_get_push_alert_dispatch(uuid) from public;
revoke execute on function public.newsroom_get_push_alert_dispatch(uuid) from public;
revoke all on function public.newsroom_get_push_alert_dispatch(uuid) from anon;
revoke execute on function public.newsroom_get_push_alert_dispatch(uuid) from anon;
grant execute on function public.newsroom_get_push_alert_dispatch(uuid) to authenticated;

-- ============================================================================
-- 4. SERVICE-ROLE BOUNDARY RPCs (FOR EDGE FUNCTION EXECUTION)
-- ============================================================================

-- Function 4a: newsroom_prepare_dispatch_recipients
-- ONLY callable by service_role
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
begin
  -- Enforce service-role authority
  if current_user not in ('service_role', 'postgres') and coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role authority required';
  end if;

  -- Verify actor user ID
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'Actor user ID required';
  end if;

  -- Clean & validate idempotency key
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception using errcode = '22023', message = 'Idempotency key required';
  end if;

  -- Check if idempotency key was already used
  select * into v_existing_dispatch
  from public.newsroom_push_dispatches
  where idempotency_key = trim(p_idempotency_key);

  if v_existing_dispatch.id is not null then
    -- Idempotent hit: return existing dispatch state with empty devices list to prevent re-send
    return jsonb_build_object(
      'is_duplicate', true,
      'dispatch_id', v_existing_dispatch.id,
      'status', v_existing_dispatch.status,
      'eligible_device_count', v_existing_dispatch.eligible_device_count,
      'provider_accepted_count', v_existing_dispatch.provider_accepted_count,
      'provider_rejected_count', v_existing_dispatch.provider_rejected_count,
      'confirmed_delivery_count', v_existing_dispatch.confirmed_delivery_count,
      'failure_reason', v_existing_dispatch.failure_reason,
      'devices', '[]'::jsonb
    );
  end if;

  -- Validate push alert exists and is in prepared status
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

  -- Create new dispatch record in 'dispatching' status
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
    trim(p_idempotency_key),
    p_actor_user_id,
    'dispatching',
    0,
    now(),
    now()
  ) returning id into v_new_dispatch_id;

  -- Collect active recipient device tokens (only inside service_role boundary)
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

-- Function 4b: newsroom_record_dispatch_result
-- ONLY callable by service_role
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
begin
  -- Enforce service-role authority
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

  -- Record individual tickets if present
  if p_tickets is not null and jsonb_typeof(p_tickets) = 'array' and jsonb_array_length(p_tickets) > 0 then
    for v_ticket in select * from jsonb_array_elements(p_tickets)
    loop
      if (v_ticket->>'device_id') is not null and (v_ticket->>'device_id') ~ '^[0-9a-f-]{36}$' then
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
          coalesce(v_ticket->>'status', 'ticket-accepted'),
          v_ticket->>'ticket_error'
        );
      end if;
    end loop;
  end if;

  -- Return sanitized bounded aggregate
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
