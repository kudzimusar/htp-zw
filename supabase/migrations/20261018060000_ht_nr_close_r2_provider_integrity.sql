-- Migration 86: ht_nr_close_r2_provider_integrity
-- Purpose: R2 Provider Integrity, COM-01 WhatsApp Consent Authority & Suppression,
-- Safe Dispatch Retries, Webhook Authentication & Ingestion State Machine,
-- AI Provider Model Truth & Fail-Closed Persistence, Table ACL Hardening.

-- =============================================================================
-- 1. AI PROVIDER MODEL SETTINGS TRUTH
-- =============================================================================

UPDATE public.platform_settings
SET value = jsonb_build_object(
  'model', 'gemini-3.8-flash',
  'quota_rpm', 60
),
updated_at = now()
WHERE key = 'gemini_ai_api';

-- =============================================================================
-- 2. DISPATCH ATTEMPT SCHEMA & RETRYABLE CONSTRAINTS
-- =============================================================================

-- Drop the old UNIQUE(broadcast_id) constraint that blocked retries after rejection
ALTER TABLE public.newsroom_whatsapp_dispatches
  DROP CONSTRAINT IF EXISTS uq_newsroom_whatsapp_dispatches_broadcast_id;

-- Enforce: only ONE accepted attempt (accepted_count > 0) permitted per broadcast
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsroom_whatsapp_dispatches_accepted
  ON public.newsroom_whatsapp_dispatches (broadcast_id)
  WHERE (accepted_count > 0);

-- Ensure idempotency index remains intact
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsroom_whatsapp_dispatches_idempotency
  ON public.newsroom_whatsapp_dispatches (idempotency_key);

-- =============================================================================
-- 3. COM-01 WHATSAPP CONSENT & SUPPRESSION RESOLVER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.newsroom_get_consented_whatsapp_recipients(
  p_broadcast_type text DEFAULT 'breaking_alert'::text
)
RETURNS TABLE(recipient_id uuid, phone text, phone_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_com01_purpose text;
begin
  -- Conservative canonical COM-01 purpose mapping:
  -- 'breaking_alert' -> 'BREAKING_NEWS'
  -- 'daily_briefing' -> 'NEWSLETTER'
  -- Any other broadcast type (e.g. story_update, health_alert) does NOT map to COM-01.
  if p_broadcast_type = 'breaking_alert' then
    v_com01_purpose := 'BREAKING_NEWS';
  elsif p_broadcast_type = 'daily_briefing' then
    v_com01_purpose := 'NEWSLETTER';
  else
    v_com01_purpose := null;
  end if;

  return query
  select distinct on (sub.phone_hash)
    sub.recipient_id,
    sub.phone,
    sub.phone_hash
  from (
    -- Source 1: Direct Newsroom WhatsApp recipients
    select
      r.id as recipient_id,
      norm.clean_digits as phone,
      encode(digest(norm.clean_digits, 'sha256'), 'hex') as phone_hash
    from public.newsroom_whatsapp_recipients r
    cross join lateral (
      select regexp_replace(trim(r.phone), '[\s\-\(\)\.\+]', '', 'g') as clean_digits,
             trim(r.phone) as original_trimmed
    ) norm
    where r.consent_status = 'active'
      and r.opted_out_at is null
      and r.consent_status not in ('opted_out', 'suppressed')
      and (r.consent_purpose = 'all' or r.consent_purpose = p_broadcast_type)
      and r.phone is not null
      -- Phone normalization & international validation:
      -- Must not start with local '0' (do not infer missing country code)
      and norm.original_trimmed not like '0%'
      and norm.original_trimmed not like '+0%'
      and norm.clean_digits ~ '^[1-9][0-9]{7,14}$'
      -- Exclusion on active WhatsApp suppression
      and not exists (
        select 1 from public.communication_suppressions cs
        where lower(cs.channel) = 'whatsapp'
          and cs.active = true
          and (
            cs.contact_id = r.id
            or lower(cs.email) = lower(r.phone)
            or cs.metadata->>'phone' = norm.clean_digits
          )
      )

    union all

    -- Source 2: COM-01 Contact profiles with valid consented channel
    select
      cp.id as recipient_id,
      norm.clean_digits as phone,
      encode(digest(norm.clean_digits, 'sha256'), 'hex') as phone_hash
    from public.contact_profiles cp
    join public.contact_consents cc on cc.contact_id = cp.id
    cross join lateral (
      select regexp_replace(trim(cp.phone), '[\s\-\(\)\.\+]', '', 'g') as clean_digits,
             trim(cp.phone) as original_trimmed
    ) norm
    where v_com01_purpose is not null
      and lower(cc.channel) = 'whatsapp'
      and lower(cc.status) = 'granted'
      and cc.withdrawn_at is null
      and cc.purpose = v_com01_purpose
      and cp.phone is not null
      -- Phone normalization & international validation:
      and norm.original_trimmed not like '0%'
      and norm.original_trimmed not like '+0%'
      and norm.clean_digits ~ '^[1-9][0-9]{7,14}$'
      -- Exclusion on active WhatsApp suppression (fail closed on any active WhatsApp suppression for contact)
      and not exists (
        select 1 from public.communication_suppressions cs
        where lower(cs.channel) = 'whatsapp'
          and cs.active = true
          and (
            cs.contact_id = cp.id
            or (cp.email is not null and lower(cs.email) = lower(cp.email))
            or cs.metadata->>'phone' = norm.clean_digits
          )
      )
  ) sub
  order by sub.phone_hash;
end;
$$;

-- =============================================================================
-- 4. PREPARE WHATSAPP DISPATCH RPC (SAFE ATTEMPT & RETRY SEMANTICS)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.newsroom_prepare_whatsapp_dispatch(
  p_broadcast_id uuid,
  p_idempotency_key text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_broadcast public.newsroom_whatsapp_broadcasts%rowtype;
  v_existing_by_key public.newsroom_whatsapp_dispatches%rowtype;
  v_accepted_dispatch public.newsroom_whatsapp_dispatches%rowtype;
  v_active_dispatch public.newsroom_whatsapp_dispatches%rowtype;
  v_dispatch_id uuid;
begin
  select * into v_broadcast
  from public.newsroom_whatsapp_broadcasts
  where id = p_broadcast_id;

  if v_broadcast.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp broadcast not found';
  end if;

  if v_broadcast.status <> 'approved' then
    raise exception using errcode = '22023', message = 'Broadcast must be in approved status for dispatch';
  end if;

  -- 1. Check if broadcast already has an accepted dispatch
  select * into v_accepted_dispatch
  from public.newsroom_whatsapp_dispatches
  where broadcast_id = p_broadcast_id
    and accepted_count > 0
  limit 1;

  if v_accepted_dispatch.id is null and v_broadcast.status = 'sent' then
    raise exception using errcode = '22023', message = 'Broadcast has already been sent and cannot be re-dispatched';
  end if;

  if v_accepted_dispatch.id is not null then
    -- If same idempotency key passed for already accepted broadcast, return idempotent envelope
    if v_accepted_dispatch.idempotency_key = p_idempotency_key then
      return jsonb_build_object(
        'is_duplicate', true,
        'dispatch_id', v_accepted_dispatch.id,
        'status', v_accepted_dispatch.transport_status,
        'broadcast', jsonb_build_object(
          'id', v_broadcast.id,
          'title', v_broadcast.title,
          'body', v_broadcast.body,
          'broadcast_type', v_broadcast.broadcast_type,
          'channel_identity', v_broadcast.channel_identity,
          'related_story_id', v_broadcast.related_story_id
        )
      );
    end if;
    raise exception using errcode = '22023', message = 'Broadcast has already been accepted by provider and cannot be re-dispatched';
  end if;

  -- 2. Check if this exact idempotency key exists
  select * into v_existing_by_key
  from public.newsroom_whatsapp_dispatches
  where idempotency_key = p_idempotency_key;

  if v_existing_by_key.id is not null then
    if v_existing_by_key.broadcast_id = p_broadcast_id then
      -- Idempotent replay of same attempt
      return jsonb_build_object(
        'is_duplicate', true,
        'dispatch_id', v_existing_by_key.id,
        'status', v_existing_by_key.transport_status,
        'broadcast', jsonb_build_object(
          'id', v_broadcast.id,
          'title', v_broadcast.title,
          'body', v_broadcast.body,
          'broadcast_type', v_broadcast.broadcast_type,
          'channel_identity', v_broadcast.channel_identity,
          'related_story_id', v_broadcast.related_story_id
        )
      );
    else
      raise exception using errcode = '23505', message = 'Idempotency key collision from another broadcast';
    end if;
  end if;

  -- 3. Check for concurrent in-flight attempt for the same broadcast
  select * into v_active_dispatch
  from public.newsroom_whatsapp_dispatches
  where broadcast_id = p_broadcast_id
    and transport_status = 'submitted'
    and dispatched_at > (now() - interval '2 minutes')
  limit 1;

  if v_active_dispatch.id is not null then
    raise exception using errcode = '40001', message = 'A dispatch attempt is currently in progress for this broadcast';
  end if;

  -- 4. Create new dispatch attempt
  insert into public.newsroom_whatsapp_dispatches (
    broadcast_id,
    transport_status,
    provider,
    recipient_count,
    accepted_count,
    rejected_count,
    delivered_count,
    read_count,
    failure_reason,
    idempotency_key,
    dispatched_by
  ) values (
    p_broadcast_id,
    'submitted',
    'whatsapp_cloud_api',
    0,
    0,
    0,
    0,
    0,
    null,
    p_idempotency_key,
    p_actor_user_id
  )
  returning id into v_dispatch_id;

  return jsonb_build_object(
    'is_duplicate', false,
    'dispatch_id', v_dispatch_id,
    'status', 'submitted',
    'broadcast', jsonb_build_object(
      'id', v_broadcast.id,
      'title', v_broadcast.title,
      'body', v_broadcast.body,
      'broadcast_type', v_broadcast.broadcast_type,
      'channel_identity', v_broadcast.channel_identity,
      'related_story_id', v_broadcast.related_story_id
    )
  );
end;
$$;

-- =============================================================================
-- 5. RECORD WHATSAPP DISPATCH RESULT WITH CANONICAL STAFF AUDIT ACTOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.newsroom_record_whatsapp_dispatch_result(
  p_dispatch_id uuid,
  p_status text,
  p_transport_status text,
  p_recipient_count integer,
  p_accepted_count integer,
  p_rejected_count integer,
  p_failure_reason text DEFAULT NULL::text,
  p_provider_broadcast_id text DEFAULT NULL::text,
  p_provider_response_envelope jsonb DEFAULT '{}'::jsonb,
  p_messages jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_dispatch public.newsroom_whatsapp_dispatches%rowtype;
  v_staff_id uuid;
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

  if p_status = 'sent' and p_accepted_count > 0 then
    update public.newsroom_whatsapp_broadcasts
    set status = 'sent',
        sent_at = now(),
        updated_at = now()
    where id = v_dispatch.broadcast_id;
  end if;

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

  -- Resolve dispatched_by auth user to canonical Staff profile ID
  select sp.id into v_staff_id
  from public.staff_profiles sp
  where sp.auth_user_id = v_dispatch.dispatched_by
    and lower(sp.status) = 'active'
  limit 1;

  if v_staff_id is null then
    select sp.id into v_staff_id
    from public.staff_profiles sp
    where sp.auth_user_id = v_dispatch.dispatched_by
    limit 1;
  end if;

  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_staff_id,
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

-- =============================================================================
-- 6. WEBHOOK INGESTION: MATCH FIRST, RETRYABLE UNMATCHED, READ-BEFORE-DELIVERED FAIL-CLOSED
-- =============================================================================

CREATE OR REPLACE FUNCTION public.newsroom_ingest_whatsapp_webhook_event(
  p_event_id text,
  p_provider_message_id text,
  p_status text,
  p_timestamp timestamp with time zone DEFAULT now(),
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
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

  -- Fail closed on unsupported webhook statuses
  if trim(p_status) not in ('delivered', 'read', 'failed') then
    return jsonb_build_object('ok', false, 'reason', 'unsupported_status');
  end if;

  -- 1. MATCH MESSAGE FIRST: If event arrives before dispatch-message row, do NOT consume!
  select * into v_msg
  from public.newsroom_whatsapp_dispatch_messages
  where provider_message_id = trim(p_provider_message_id)
  for update;

  if v_msg.id is null then
    -- Unmatched event remains retryable: do NOT insert into replay table
    return jsonb_build_object('ok', true, 'matched', false, 'retryable', true);
  end if;

  -- 2. Deduplication check on matched event
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
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'matched', true,
      'status', p_status
    );
  end if;

  select * into v_dispatch
  from public.newsroom_whatsapp_dispatches
  where id = v_msg.dispatch_id
  for update;

  -- 3. State transitions
  if p_status = 'delivered' then
    if v_msg.delivered_at is null and v_msg.status in ('message-accepted') then
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
    -- READ-BEFORE-DELIVERED MUST FAIL CLOSED:
    -- If message does not already have authoritative delivery state, fail closed!
    if v_msg.delivered_at is null or v_msg.status not in ('message-delivered', 'message-read') then
      return jsonb_build_object(
        'ok', false,
        'matched', true,
        'reason', 'read_before_delivered_rejected'
      );
    end if;

    if v_msg.read_at is null and v_msg.status = 'message-delivered' then
      if (v_dispatch.read_count + 1) > v_dispatch.delivered_count then
        raise exception using errcode = '22023',
          message = 'Accounting invariant violation: read_count cannot exceed delivered_count';
      end if;

      update public.newsroom_whatsapp_dispatch_messages
      set status = 'message-read',
          read_at = coalesce(p_timestamp, now()),
          updated_at = now()
      where id = v_msg.id;

      update public.newsroom_whatsapp_dispatches
      set read_count = read_count + 1,
          updated_at = now()
      where id = v_dispatch.id;
    end if;

  elsif p_status = 'failed' then
    -- NO STATE REGRESSION: A failed event cannot overwrite an already delivered or read message
    if v_msg.status in ('message-delivered', 'message-read') then
      return jsonb_build_object(
        'ok', true,
        'matched', true,
        'regressed', false,
        'status', v_msg.status
      );
    end if;

    update public.newsroom_whatsapp_dispatch_messages
    set status = 'message-failed',
        error_code = p_payload->>'error_code',
        error_message = coalesce(p_payload->>'error_message', p_payload->>'error'),
        updated_at = now()
    where id = v_msg.id;
  end if;

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

-- =============================================================================
-- 7. GET / LIST DISPATCH RPCs WITH DURABLE RETRY HISTORY SANITIZATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.newsroom_get_whatsapp_broadcast_dispatch(p_broadcast_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_res jsonb;
begin
  if not (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

  -- Select latest relevant attempt: prefer accepted attempt, then most recent dispatched_at
  select jsonb_build_object(
    'id', d.id,
    'broadcast_id', d.broadcast_id,
    'transport_status', d.transport_status,
    'provider', d.provider,
    'provider_broadcast_id', d.provider_broadcast_id,
    'recipient_count', d.recipient_count,
    'accepted_count', d.accepted_count,
    'rejected_count', d.rejected_count,
    'delivered_count', d.delivered_count,
    'read_count', d.read_count,
    'failure_reason', d.failure_reason,
    'idempotency_key', d.idempotency_key,
    'dispatched_at', d.dispatched_at
  )
  into v_res
  from public.newsroom_whatsapp_dispatches d
  where d.broadcast_id = p_broadcast_id
  order by (d.accepted_count > 0) desc, d.dispatched_at desc
  limit 1;

  if v_res is null then
    return null;
  end if;

  return v_res;
end;
$$;

CREATE OR REPLACE FUNCTION public.newsroom_list_whatsapp_broadcasts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_result jsonb;
begin
  if not (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'title', b.title,
      'body', b.body,
      'broadcast_type', b.broadcast_type,
      'channel_identity', b.channel_identity,
      'related_story_id', b.related_story_id,
      'status', b.status,
      'created_by', b.created_by,
      'approved_by', b.approved_by,
      'rejected_by', b.rejected_by,
      'approved_at', b.approved_at,
      'rejected_at', b.rejected_at,
      'sent_at', b.sent_at,
      'rejection_reason', b.rejection_reason,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'dispatch', case when d.id is not null then
        jsonb_build_object(
          'id', d.id,
          'transport_status', d.transport_status,
          'provider', d.provider,
          'recipient_count', d.recipient_count,
          'accepted_count', d.accepted_count,
          'rejected_count', d.rejected_count,
          'delivered_count', d.delivered_count,
          'read_count', d.read_count,
          'failure_reason', d.failure_reason,
          'dispatched_at', d.dispatched_at
        )
      else null end
    ) order by b.created_at desc
  ), '[]'::jsonb)
  into v_result
  from public.newsroom_whatsapp_broadcasts b
  left join lateral (
    select *
    from public.newsroom_whatsapp_dispatches d
    where d.broadcast_id = b.id
    order by (d.accepted_count > 0) desc, d.dispatched_at desc
    limit 1
  ) d on true;

  return v_result;
end;
$$;

-- =============================================================================
-- 8. AI ASSIST OVERVIEW TRUTH & FAIL-CLOSED SESSION PERSISTENCE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.newsroom_get_ai_assist_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_user_id uuid;
  v_has_access boolean;
  v_provider_status text;
  v_provider_model text;
  v_total_sessions int;
  v_task_counts jsonb;
  v_recent_sessions jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('story.create')
    or public.newsroom_has_capability('story.edit_own')
    or public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.copy_edit')
    or public.newsroom_has_capability('story.fact_check')
    or public.newsroom_has_capability('story.health_review')
    or public.newsroom_has_capability('story.publish')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities for AI Desk access';
  end if;

  -- Determine provider status from analytics_integrations or fallback
  select coalesce(
    (select status from public.analytics_integrations where provider in ('ai_assistant', 'gemini', 'openai') limit 1),
    'provider_unconfigured'
  ) into v_provider_status;

  -- Derive model truth dynamically from platform_settings without legacy heuristic fallbacks
  select (value->>'model') into v_provider_model
  from public.platform_settings
  where key = 'gemini_ai_api';

  if v_provider_model is null or trim(v_provider_model) = '' then
    v_provider_model := 'gemini-3.8-flash';
  end if;

  select count(*) into v_total_sessions from public.newsroom_ai_assist_sessions;

  select coalesce(
    jsonb_object_agg(task_type, count),
    '{}'::jsonb
  ) into v_task_counts
  from (
    select task_type, count(*) as count
    from public.newsroom_ai_assist_sessions
    group by task_type
  ) t;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'story_id', s.story_id,
        'story_title', st.title,
        'task_type', s.task_type,
        'input_prompt', s.input_prompt,
        'input_context', s.input_context,
        'suggestions', s.suggestions,
        'provider', s.provider,
        'provider_status', s.provider_status,
        'status', s.status,
        'safety_flags', s.safety_flags,
        'created_by', s.created_by,
        'created_at', s.created_at
      ) order by s.created_at desc
    ),
    '[]'::jsonb
  ) into v_recent_sessions
  from (
    select * from public.newsroom_ai_assist_sessions
    order by created_at desc
    limit 25
  ) s
  left join public.stories st on st.id = s.story_id;

  return jsonb_build_object(
    'provider_status', v_provider_status,
    'provider_model', v_provider_model,
    'safety_policy', jsonb_build_object(
      'can_publish', false,
      'can_approve', false,
      'can_bypass_review', false,
      'human_review_required', true,
      'principle', 'AI is restricted to reviewable suggestions and drafting assistance. Direct story publication or silent mutation is strictly prohibited.'
    ),
    'supported_tasks', jsonb_build_array(
      jsonb_build_object('id', 'headline_alternatives', 'name', 'Headline Alternatives', 'description', 'Generate engaging, punchy, and policy-accurate news headlines'),
      jsonb_build_object('id', 'seo_alternatives', 'name', 'SEO Alternatives', 'description', 'Generate search-optimized titles and meta descriptions'),
      jsonb_build_object('id', 'summary', 'name', 'Executive Summary', 'description', 'Condense complex medical or public health copy into clear standfirsts'),
      jsonb_build_object('id', 'evidence_gap', 'name', 'Evidence Gap Detection', 'description', 'Analyze copy for missing sources, statistics, or balance'),
      jsonb_build_object('id', 'citation_suggestion', 'name', 'Citation Suggestions', 'description', 'Identify potential academic, WHO, or MOHCC citations'),
      jsonb_build_object('id', 'interview_questions', 'name', 'Interview Questions', 'description', 'Generate targeted questions for public health officials and experts'),
      jsonb_build_object('id', 'claim_fact_check', 'name', 'Fact-Check Claim Flagging', 'description', 'Highlight claims requiring independent evidence verification')
    ),
    'metrics', jsonb_build_object(
      'total_sessions', v_total_sessions,
      'task_counts', v_task_counts
    ),
    'recent_sessions', v_recent_sessions
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.newsroom_record_ai_assist_session(
  p_story_id uuid,
  p_task_type text,
  p_input_prompt text,
  p_input_context text,
  p_suggestions jsonb,
  p_provider text,
  p_provider_status text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
declare
  v_staff_id uuid;
  v_session_id uuid;
begin
  -- Resolve canonical Staff profile; fail closed if staff identity cannot be resolved
  select sp.id into v_staff_id
  from public.staff_profiles sp
  where sp.auth_user_id = p_actor_user_id
    and lower(sp.status) = 'active'
  limit 1;

  if v_staff_id is null then
    select sp.id into v_staff_id
    from public.staff_profiles sp
    where sp.auth_user_id = p_actor_user_id
    limit 1;
  end if;

  if v_staff_id is null then
    raise exception using errcode = '42501',
      message = 'Canonical Staff profile required for AI assist session persistence';
  end if;

  insert into public.newsroom_ai_assist_sessions (
    story_id,
    task_type,
    input_prompt,
    input_context,
    suggestions,
    provider,
    provider_status,
    status,
    created_by
  ) values (
    p_story_id,
    p_task_type,
    p_input_prompt,
    p_input_context,
    coalesce(p_suggestions, '[]'::jsonb),
    p_provider,
    p_provider_status,
    'completed',
    p_actor_user_id
  ) returning id into v_session_id;

  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_staff_id,
    'ai.assist.completed',
    'newsroom_ai_assist_sessions',
    v_session_id,
    jsonb_build_object(
      'task_type', p_task_type,
      'provider', p_provider,
      'provider_status', p_provider_status,
      'story_id', p_story_id,
      'suggestion_count', jsonb_array_length(coalesce(p_suggestions, '[]'::jsonb))
    )
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'status', 'completed'
  );
end;
$$;

-- =============================================================================
-- 9. PRIVILEGE HARDENING (REVOKE DIRECT DISPATCH SELECT FROM AUTHENTICATED)
-- =============================================================================

REVOKE ALL ON public.newsroom_whatsapp_dispatches FROM anon, authenticated;
REVOKE ALL ON public.newsroom_whatsapp_dispatch_messages FROM anon, authenticated;
