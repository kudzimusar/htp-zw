-- Migration 85: HT-NR-CLOSE-R1 — WhatsApp Recipient Authority + Provider State Invariants + Webhook Ingestion Closure
-- Logical Ordinal: 85
-- Repository migration count: 85
-- Staging migration count after application: 85

-- ============================================================================
-- 1. WHATSAPP PRIVATE RECIPIENT ENDPOINT AUTHORITY
-- ============================================================================

create table if not exists public.newsroom_whatsapp_recipients (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  phone_hash text not null unique,
  display_name text null,
  consent_status text not null default 'active' check (consent_status in ('active', 'opted_out', 'suppressed')),
  consent_purpose text not null default 'all' check (consent_purpose in ('all', 'breaking_alert', 'daily_briefing', 'story_update', 'health_alert')),
  consented_at timestamptz not null default now(),
  opted_out_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsroom_wa_recipients_active
  on public.newsroom_whatsapp_recipients(consent_status, consent_purpose);

alter table public.newsroom_whatsapp_recipients enable row level security;
revoke all on public.newsroom_whatsapp_recipients from public, anon, authenticated;
grant all on public.newsroom_whatsapp_recipients to service_role;

-- ============================================================================
-- 2. WHATSAPP WEBHOOK IDEMPOTENCY & REPLAY DEDUPLICATION LEDGER
-- ============================================================================

create table if not exists public.newsroom_whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  provider_message_id text null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists idx_newsroom_wa_webhook_events_msg
  on public.newsroom_whatsapp_webhook_events(provider_message_id);

alter table public.newsroom_whatsapp_webhook_events enable row level security;
revoke all on public.newsroom_whatsapp_webhook_events from public, anon, authenticated;
grant all on public.newsroom_whatsapp_webhook_events to service_role;

-- ============================================================================
-- 3. RESOLVE CONSENTED WHATSAPP RECIPIENTS RPC (SERVICE ROLE ONLY)
-- ============================================================================

create or replace function public.newsroom_get_consented_whatsapp_recipients(
  p_broadcast_type text default 'breaking_alert'
)
returns table (
  recipient_id uuid,
  phone text,
  phone_hash text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select distinct on (sub.phone_hash)
    sub.recipient_id,
    sub.phone,
    sub.phone_hash
  from (
    -- Direct newsroom WhatsApp recipient ledger
    select
      r.id as recipient_id,
      trim(r.phone) as phone,
      r.phone_hash
    from public.newsroom_whatsapp_recipients r
    where r.consent_status = 'active'
      and (r.consent_purpose = 'all' or r.consent_purpose = p_broadcast_type)
      and r.phone is not null
      and length(trim(r.phone)) >= 8

    union all

    -- Canonical COM-01 contact consent integration
    select
      cp.id as recipient_id,
      trim(cp.phone) as phone,
      encode(digest(trim(cp.phone), 'sha256'), 'hex') as phone_hash
    from public.contact_profiles cp
    join public.contact_consents cc on cc.contact_id = cp.id
    where lower(cc.channel) = 'whatsapp'
      and lower(cc.status) in ('opted_in', 'active', 'granted')
      and cc.withdrawn_at is null
      and (cc.purpose = 'all' or cc.purpose = p_broadcast_type or cc.purpose = 'distribution')
      and cp.phone is not null
      and length(trim(cp.phone)) >= 8
  ) sub
  order by sub.phone_hash;
end;
$$;

revoke all on function public.newsroom_get_consented_whatsapp_recipients(text) from public, anon, authenticated;
grant execute on function public.newsroom_get_consented_whatsapp_recipients(text) to service_role;

-- ============================================================================
-- 4. HARDENED WHATSAPP DISPATCH RESULT RECORDING RPC
-- ============================================================================

create or replace function public.newsroom_record_whatsapp_dispatch_result(
  p_dispatch_id uuid,
  p_status text,
  p_transport_status text,
  p_recipient_count integer,
  p_accepted_count integer,
  p_rejected_count integer,
  p_failure_reason text default null,
  p_provider_broadcast_id text default null,
  p_provider_response_envelope jsonb default '{}'::jsonb,
  p_messages jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_dispatch public.newsroom_whatsapp_dispatches%rowtype;
  v_msg jsonb;
  v_hash text;
begin
  select * into v_dispatch
  from public.newsroom_whatsapp_dispatches
  where id = p_dispatch_id
  for update;

  if v_dispatch.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp dispatch not found';
  end if;

  -- Accounting invariant: for completed submission attempts, accepted + rejected must equal recipient_count
  if p_transport_status in ('provider-accepted', 'provider-rejected', 'partially-accepted') then
    if (p_accepted_count + p_rejected_count) != p_recipient_count then
      raise exception using errcode = '22023',
        message = format('Accounting invariant violation: accepted_count (%s) + rejected_count (%s) must equal recipient_count (%s)',
          p_accepted_count, p_rejected_count, p_recipient_count);
    end if;
  end if;

  update public.newsroom_whatsapp_dispatches
  set transport_status = p_transport_status,
      recipient_count = p_recipient_count,
      accepted_count = p_accepted_count,
      rejected_count = p_rejected_count,
      failure_reason = p_failure_reason,
      provider_broadcast_id = coalesce(p_provider_broadcast_id, provider_broadcast_id),
      provider_response_envelope = coalesce(p_provider_response_envelope, '{}'::jsonb),
      updated_at = now()
  where id = p_dispatch_id;

  -- Distinct state machine: Broadcast becomes 'sent' IF AND ONLY IF at least one outbound message is accepted
  if p_status = 'sent' and p_accepted_count > 0 then
    update public.newsroom_whatsapp_broadcasts
    set status = 'sent',
        sent_at = now(),
        updated_at = now()
    where id = v_dispatch.broadcast_id;
  end if;

  -- Insert individual message receipts with deterministic non-empty recipient identity hash
  if jsonb_array_length(coalesce(p_messages, '[]'::jsonb)) > 0 then
    for v_msg in select * from jsonb_array_elements(p_messages) loop
      v_hash := v_msg->>'recipient_identity_hash';
      if v_hash is null or v_hash = 'unknown_hash' or length(trim(v_hash)) < 16 then
        raise exception using errcode = '22023',
          message = 'Invalid recipient identity hash: must be deterministic server-side hash >= 16 characters';
      end if;

      insert into public.newsroom_whatsapp_dispatch_messages (
        dispatch_id,
        provider_message_id,
        recipient_identity_hash,
        status,
        error_code,
        error_message
      ) values (
        p_dispatch_id,
        v_msg->>'provider_message_id',
        trim(v_hash),
        coalesce(v_msg->>'status', 'message-accepted'),
        v_msg->>'error_code',
        v_msg->>'error_message'
      );
    end loop;
  end if;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    null,
    'whatsapp.dispatch.recorded',
    'newsroom_whatsapp_dispatches',
    p_dispatch_id,
    jsonb_build_object(
      'transport_status', p_transport_status,
      'recipient_count', p_recipient_count,
      'accepted_count', p_accepted_count,
      'rejected_count', p_rejected_count,
      'broadcast_sent', (p_status = 'sent' and p_accepted_count > 0),
      'failure_reason', p_failure_reason
    )
  );

  return jsonb_build_object(
    'dispatch_id', p_dispatch_id,
    'transport_status', p_transport_status
  );
end;
$$;

revoke all on function public.newsroom_record_whatsapp_dispatch_result(uuid, text, text, integer, integer, integer, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.newsroom_record_whatsapp_dispatch_result(uuid, text, text, integer, integer, integer, text, text, jsonb, jsonb) to service_role;

-- ============================================================================
-- 5. HARDENED WHATSAPP WEBHOOK EVENT INGESTION RPC
-- ============================================================================

create or replace function public.newsroom_ingest_whatsapp_webhook_event(
  p_event_id text,
  p_provider_message_id text,
  p_status text,
  p_timestamp timestamptz default now(),
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_inserted_id uuid;
  v_msg public.newsroom_whatsapp_dispatch_messages%rowtype;
  v_dispatch public.newsroom_whatsapp_dispatches%rowtype;
begin
  if p_event_id is null or trim(p_event_id) = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_event_id');
  end if;

  if p_provider_message_id is null or trim(p_provider_message_id) = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_provider_message_id');
  end if;

  -- 1. Replay protection & deduplication
  insert into public.newsroom_whatsapp_webhook_events (
    event_id,
    provider_message_id,
    event_type,
    payload,
    processed_at
  ) values (
    trim(p_event_id),
    trim(p_provider_message_id),
    trim(p_status),
    coalesce(p_payload, '{}'::jsonb),
    now()
  ) on conflict (event_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    -- Duplicate event already processed: idempotent return
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'matched', true,
      'status', p_status
    );
  end if;

  -- 2. Match provider_message_id
  select * into v_msg
  from public.newsroom_whatsapp_dispatch_messages
  where provider_message_id = trim(p_provider_message_id)
  for update;

  if v_msg.id is null then
    return jsonb_build_object('ok', true, 'matched', false);
  end if;

  select * into v_dispatch
  from public.newsroom_whatsapp_dispatches
  where id = v_msg.dispatch_id
  for update;

  -- 3. Strict state machine transitions & accounting invariants
  if p_status = 'delivered' then
    if v_msg.delivered_at is null and v_msg.status in ('message-accepted') then
      -- Accounting check: delivered_count <= accepted_count
      if (v_dispatch.delivered_count + 1) > v_dispatch.accepted_count then
        raise exception using errcode = '22023',
          message = 'Accounting invariant violation: delivered_count cannot exceed accepted_count';
      end if;

      update public.newsroom_whatsapp_dispatch_messages
      set status = 'message-delivered',
          delivered_at = coalesce(p_timestamp, now()),
          updated_at = now()
      where id = v_msg.id;

      update public.newsroom_whatsapp_dispatches
      set delivered_count = delivered_count + 1,
          updated_at = now()
      where id = v_dispatch.id;
    end if;

  elsif p_status = 'read' then
    if v_msg.read_at is null and v_msg.status in ('message-accepted', 'message-delivered') then
      -- If message was read without prior explicit delivery event, record delivery first
      if v_msg.delivered_at is null then
        if (v_dispatch.delivered_count + 1) > v_dispatch.accepted_count then
          raise exception using errcode = '22023',
            message = 'Accounting invariant violation: delivered_count cannot exceed accepted_count';
        end if;
        v_dispatch.delivered_count := v_dispatch.delivered_count + 1;
        v_msg.delivered_at := coalesce(p_timestamp, now());
      end if;

      -- Accounting check: read_count <= delivered_count
      if (v_dispatch.read_count + 1) > v_dispatch.delivered_count then
        raise exception using errcode = '22023',
          message = 'Accounting invariant violation: read_count cannot exceed delivered_count';
      end if;

      update public.newsroom_whatsapp_dispatch_messages
      set status = 'message-read',
          delivered_at = coalesce(v_msg.delivered_at, now()),
          read_at = coalesce(p_timestamp, now()),
          updated_at = now()
      where id = v_msg.id;

      update public.newsroom_whatsapp_dispatches
      set delivered_count = v_dispatch.delivered_count,
          read_count = read_count + 1,
          updated_at = now()
      where id = v_dispatch.id;
    end if;

  elsif p_status = 'failed' then
    update public.newsroom_whatsapp_dispatch_messages
    set status = 'message-failed',
        error_code = p_payload->>'error_code',
        error_message = coalesce(p_payload->>'error_message', p_payload->>'error'),
        updated_at = now()
    where id = v_msg.id;
  end if;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    null,
    'whatsapp.webhook.event_ingested',
    'newsroom_whatsapp_dispatch_messages',
    v_msg.id,
    jsonb_build_object(
      'event_id', p_event_id,
      'provider_message_id', p_provider_message_id,
      'status', p_status
    )
  );

  return jsonb_build_object(
    'ok', true,
    'matched', true,
    'status', p_status
  );
end;
$$;

revoke all on function public.newsroom_ingest_whatsapp_webhook_event(text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.newsroom_ingest_whatsapp_webhook_event(text, text, text, timestamptz, jsonb) to service_role;
