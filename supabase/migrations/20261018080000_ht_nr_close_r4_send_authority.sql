-- Migration 88: ht_nr_close_r4_send_authority
-- Purpose: HT-NR-CLOSE-R4 Active-attempt uniqueness, removal of time-based automatic takeover,
-- immutable staff actor capture at preparation, safe replay persisted readback, and cross-source suppression cleanup.

-- =============================================================================
-- 1. ADD DISPATCHED_STAFF_ID COLUMN TO NEWSROOM_WHATSAPP_DISPATCHES
-- =============================================================================

ALTER TABLE public.newsroom_whatsapp_dispatches
  ADD COLUMN IF NOT EXISTS dispatched_staff_id uuid REFERENCES public.staff_profiles(id);

-- =============================================================================
-- 2. DATABASE-ENFORCED ACTIVE ATTEMPT UNIQUENESS
-- Structurally prevents more than one unresolved submitted attempt for a broadcast.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsroom_whatsapp_dispatches_submitted
  ON public.newsroom_whatsapp_dispatches (broadcast_id)
  WHERE (transport_status = 'submitted');

-- =============================================================================
-- 3. CROSS-SOURCE COM-01 WHATSAPP CONSENT & SUPPRESSION RESOLVER
-- Fix: Remove invalid cross-domain contact comparison across different UUID domains.
-- Preserve normalized-phone cross-source suppression.
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
      and norm.original_trimmed not like '0%'
      and norm.original_trimmed not like '+0%'
      and norm.clean_digits ~ '^[1-9][0-9]{7,14}$'
      -- Exclusion on active WhatsApp suppression (via matching COM-01 contact or suppression metadata)
      -- NOTE: Cross-domain contact_id to recipient_id comparison REMOVED (different UUID identity domains)
      and not exists (
        select 1 from public.communication_suppressions cs
        where lower(cs.channel) = 'whatsapp'
          and cs.active = true
          and (
            cs.metadata->>'phone' = norm.clean_digits
            or exists (
              select 1 from public.contact_profiles cp
              where cp.id = cs.contact_id
                and regexp_replace(trim(cp.phone), '[\s\-\(\)\.\+]', '', 'g') = norm.clean_digits
            )
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
            or exists (
              select 1 from public.contact_profiles cp2
              where cp2.id = cs.contact_id
                and regexp_replace(trim(cp2.phone), '[\s\-\(\)\.\+]', '', 'g') = norm.clean_digits
            )
          )
      )
  ) sub
  order by sub.phone_hash;
end;
$$;

-- =============================================================================
-- 4. SERIALIZED DISPATCH PREPARATION:
-- - Immutable Staff actor resolution at preparation
-- - Removal of 2-minute auto takeover (submitted blocks resend regardless of age)
-- - Return complete persisted dispatch summary on idempotent replay
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
  v_staff_id uuid;
begin
  -- CRITICAL SERIALIZATION POINT:
  -- Lock canonical broadcast row before evaluating accepted attempts, matching keys, or active attempts.
  select * into v_broadcast
  from public.newsroom_whatsapp_broadcasts
  where id = p_broadcast_id
  for update;

  if v_broadcast.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp broadcast not found';
  end if;

  -- CRITICAL STAFF AUDIT ACTOR RESOLUTION BEFORE CREATION:
  -- Resolve p_actor_user_id to an ACTIVE canonical Staff profile.
  select sp.id into v_staff_id
  from public.staff_profiles sp
  where (sp.auth_user_id = p_actor_user_id or sp.id = p_actor_user_id)
    and lower(sp.status) = 'active'
    and sp.revoked_at is null
  limit 1;

  if v_staff_id is null then
    raise exception using errcode = '42501',
      message = 'Dispatch actor must resolve to an active staff profile';
  end if;

  -- 1. Check if broadcast already has an accepted dispatch
  select * into v_accepted_dispatch
  from public.newsroom_whatsapp_dispatches
  where broadcast_id = p_broadcast_id
    and accepted_count > 0
  limit 1;

  if v_accepted_dispatch.id is not null then
    -- Successful same-key replay after sent broadcast returns the existing accepted attempt
    if v_accepted_dispatch.idempotency_key = p_idempotency_key then
      return jsonb_build_object(
        'is_duplicate', true,
        'dispatch_id', v_accepted_dispatch.id,
        'status', v_accepted_dispatch.transport_status,
        'transport_status', v_accepted_dispatch.transport_status,
        'existing_dispatch', jsonb_build_object(
          'id', v_accepted_dispatch.id,
          'broadcast_id', v_accepted_dispatch.broadcast_id,
          'transport_status', v_accepted_dispatch.transport_status,
          'provider', v_accepted_dispatch.provider,
          'provider_broadcast_id', v_accepted_dispatch.provider_broadcast_id,
          'recipient_count', v_accepted_dispatch.recipient_count,
          'accepted_count', v_accepted_dispatch.accepted_count,
          'rejected_count', v_accepted_dispatch.rejected_count,
          'delivered_count', v_accepted_dispatch.delivered_count,
          'read_count', v_accepted_dispatch.read_count,
          'failure_reason', v_accepted_dispatch.failure_reason,
          'idempotency_key', v_accepted_dispatch.idempotency_key,
          'dispatched_at', v_accepted_dispatch.dispatched_at
        ),
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
      -- Sent broadcast + different key: fail closed with conflict / already sent authority
      raise exception using errcode = '22023',
        message = 'Broadcast has already been accepted by provider and cannot be re-dispatched';
    end if;
  end if;

  if v_broadcast.status = 'sent' then
    raise exception using errcode = '22023',
      message = 'Broadcast has already been sent and cannot be re-dispatched';
  end if;

  -- For new dispatch attempts, broadcast must be approved
  if v_broadcast.status <> 'approved' then
    raise exception using errcode = '22023',
      message = 'Broadcast must be in approved status for dispatch';
  end if;

  -- 2. Check if this exact idempotency key exists (for prior unaccepted / in-flight attempt)
  select * into v_existing_by_key
  from public.newsroom_whatsapp_dispatches
  where idempotency_key = p_idempotency_key;

  if v_existing_by_key.id is not null then
    if v_existing_by_key.broadcast_id = p_broadcast_id then
      -- Idempotent replay of same attempt: return complete persisted dispatch summary
      return jsonb_build_object(
        'is_duplicate', true,
        'dispatch_id', v_existing_by_key.id,
        'status', v_existing_by_key.transport_status,
        'transport_status', v_existing_by_key.transport_status,
        'existing_dispatch', jsonb_build_object(
          'id', v_existing_by_key.id,
          'broadcast_id', v_existing_by_key.broadcast_id,
          'transport_status', v_existing_by_key.transport_status,
          'provider', v_existing_by_key.provider,
          'provider_broadcast_id', v_existing_by_key.provider_broadcast_id,
          'recipient_count', v_existing_by_key.recipient_count,
          'accepted_count', v_existing_by_key.accepted_count,
          'rejected_count', v_existing_by_key.rejected_count,
          'delivered_count', v_existing_by_key.delivered_count,
          'read_count', v_existing_by_key.read_count,
          'failure_reason', v_existing_by_key.failure_reason,
          'idempotency_key', v_existing_by_key.idempotency_key,
          'dispatched_at', v_existing_by_key.dispatched_at
        ),
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
      raise exception using errcode = '23505',
        message = 'Idempotency key collision from another broadcast';
    end if;
  end if;

  -- 3. Check for concurrent in-flight attempt for the same broadcast
  -- NOTE: NO automatic time-based takeover! A submitted attempt blocks resend regardless of age.
  select * into v_active_dispatch
  from public.newsroom_whatsapp_dispatches
  where broadcast_id = p_broadcast_id
    and transport_status = 'submitted'
  limit 1;

  if v_active_dispatch.id is not null then
    raise exception using errcode = '40001',
      message = 'A dispatch attempt is currently in progress for this broadcast';
  end if;

  -- 4. Create new dispatch attempt with captured staff actor
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
    dispatched_by,
    dispatched_staff_id
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
    p_actor_user_id,
    v_staff_id
  )
  returning id into v_dispatch_id;

  return jsonb_build_object(
    'is_duplicate', false,
    'dispatch_id', v_dispatch_id,
    'status', 'submitted',
    'dispatched_staff_id', v_staff_id,
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
-- 5. RECORD DISPATCH RESULT: USE IMMUTABLE CAPTURED STAFF ACTOR
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

  -- CRITICAL STAFF AUDIT ACTOR:
  -- Must use the immutable Staff actor captured during preparation!
  v_staff_id := v_dispatch.dispatched_staff_id;

  if v_staff_id is null then
    raise exception using errcode = '42501',
      message = 'Canonical Staff profile required for WhatsApp dispatch record';
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
-- 6. PRIVILEGE ENFORCEMENT
-- =============================================================================

REVOKE ALL ON public.newsroom_whatsapp_dispatches FROM authenticated, anon;
REVOKE ALL ON public.newsroom_whatsapp_dispatch_messages FROM authenticated, anon;
