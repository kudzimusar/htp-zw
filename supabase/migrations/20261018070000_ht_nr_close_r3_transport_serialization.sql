-- Migration 87: ht_nr_close_r3_transport_serialization
-- Purpose: HT-NR-CLOSE-R3 Irreversible transport serialization, SELECT ... FOR UPDATE broadcast locking,
-- Cross-source COM-01 suppression hardening, Staff audit actor enforcement, and truthful AI configuration overview.

-- =============================================================================
-- 1. CROSS-SOURCE COM-01 WHATSAPP CONSENT & SUPPRESSION RESOLVER
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
      -- Exclusion on active WhatsApp suppression (direct or via matching COM-01 contact)
      and not exists (
        select 1 from public.communication_suppressions cs
        where lower(cs.channel) = 'whatsapp'
          and cs.active = true
          and (
            cs.contact_id = r.id
            or lower(cs.email) = lower(r.phone)
            or cs.metadata->>'phone' = norm.clean_digits
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
-- 2. SERIALIZED DISPATCH PREPARATION WITH SELECT ... FOR UPDATE LOCKING
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
  -- CRITICAL SERIALIZATION POINT:
  -- Lock canonical broadcast row before evaluating accepted attempts, matching keys, or active attempts.
  -- This establishes a deterministic database transaction serialization barrier for concurrent callers.
  select * into v_broadcast
  from public.newsroom_whatsapp_broadcasts
  where id = p_broadcast_id
  for update;

  if v_broadcast.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp broadcast not found';
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
      raise exception using errcode = '23505',
        message = 'Idempotency key collision from another broadcast';
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
    raise exception using errcode = '40001',
      message = 'A dispatch attempt is currently in progress for this broadcast';
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
-- 3. RECORD DISPATCH RESULT: FAIL CLOSED IF STAFF IDENTITY IS UNRESOLVED
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

  -- CRITICAL STAFF AUDIT ACTOR RESOLUTION:
  -- For staff-triggered irreversible sends, fail closed if dispatched_by cannot resolve to canonical Staff profile!
  -- Must fail closed before committing final provider-result state or audit log.
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
-- 4. AI ASSIST OVERVIEW: TRUTHFUL MODEL AUTHORITY (ZERO SILENT MANUFACTURING)
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

  -- Derive model truth dynamically from platform_settings without silently manufacturing one
  select (value->>'model') into v_provider_model
  from public.platform_settings
  where key = 'gemini_ai_api';

  if v_provider_model is not null and trim(v_provider_model) <> '' then
    v_provider_model := trim(v_provider_model);
  else
    v_provider_model := null;
  end if;

  -- Determine provider status from analytics_integrations or fallback
  select coalesce(
    (select status from public.analytics_integrations where provider in ('ai_assistant', 'gemini', 'openai') limit 1),
    'provider_unconfigured'
  ) into v_provider_status;

  if v_provider_model is null then
    v_provider_status := 'provider_unconfigured';
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
    'provider_model', coalesce(v_provider_model, ''),
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

-- =============================================================================
-- 5. RE-ASSERT PRIVILEGES (REVOKE DIRECT DISPATCH MUTATION & SELECT FROM AUTH/ANON)
-- =============================================================================

REVOKE ALL ON public.newsroom_whatsapp_dispatches FROM anon, authenticated;
REVOKE ALL ON public.newsroom_whatsapp_dispatch_messages FROM anon, authenticated;
