-- Migration 78: HT-NR-06D — WhatsApp Editorial Control Plane + Delivery Ledger Foundation
-- Repository migration count: 78
-- Staging migration count after application: 78

-- ============================================================================
-- 1. WHATSAPP BROADCAST REGISTRY TABLE
-- ============================================================================

create table if not exists public.newsroom_whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) >= 3 and length(title) <= 200),
  body text not null check (length(trim(body)) >= 10 and length(body) <= 4096),
  broadcast_type text not null check (broadcast_type in ('breaking_alert', 'daily_briefing', 'story_update', 'health_alert')),
  channel_identity text not null default 'healthtimes-whatsapp-channel',
  related_story_id uuid null references public.stories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'rejected')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  approved_by uuid null references auth.users(id),
  rejected_by uuid null references auth.users(id),
  approved_at timestamptz null,
  rejected_at timestamptz null,
  sent_at timestamptz null,
  rejection_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsroom_whatsapp_broadcasts_status
  on public.newsroom_whatsapp_broadcasts(status, created_at desc);

create index if not exists idx_newsroom_whatsapp_broadcasts_story
  on public.newsroom_whatsapp_broadcasts(related_story_id);

alter table public.newsroom_whatsapp_broadcasts enable row level security;
revoke all on public.newsroom_whatsapp_broadcasts from public, anon, authenticated;
grant select on public.newsroom_whatsapp_broadcasts to authenticated;
grant all on public.newsroom_whatsapp_broadcasts to service_role;

drop policy if exists nr06d_whatsapp_broadcasts_read on public.newsroom_whatsapp_broadcasts;
create policy nr06d_whatsapp_broadcasts_read
on public.newsroom_whatsapp_broadcasts
for select
to authenticated
using (
  public.newsroom_has_capability('distribution.manage')
  or public.newsroom_has_capability('story.publish')
);

-- ============================================================================
-- 2. WHATSAPP DISPATCH DELIVERY LEDGER TABLE
-- ============================================================================

create table if not exists public.newsroom_whatsapp_dispatches (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null unique references public.newsroom_whatsapp_broadcasts(id) on delete restrict,
  transport_status text not null check (
    transport_status in (
      'submitted',
      'provider-accepted',
      'provider-rejected',
      'partially-accepted',
      'unconfigured',
      'delivery-failed'
    )
  ),
  provider text not null default 'whatsapp_cloud_api',
  provider_broadcast_id text null,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  read_count integer not null default 0 check (read_count >= 0),
  failure_reason text null,
  provider_response_envelope jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  dispatched_by uuid not null references auth.users(id),
  dispatched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_newsroom_whatsapp_dispatches_broadcast_id unique (broadcast_id)
);

create unique index if not exists idx_newsroom_whatsapp_dispatches_idempotency
  on public.newsroom_whatsapp_dispatches(idempotency_key);

create index if not exists idx_newsroom_whatsapp_dispatches_status
  on public.newsroom_whatsapp_dispatches(transport_status, dispatched_at desc);

alter table public.newsroom_whatsapp_dispatches enable row level security;
revoke all on public.newsroom_whatsapp_dispatches from public, anon, authenticated;
grant select on public.newsroom_whatsapp_dispatches to authenticated;
grant all on public.newsroom_whatsapp_dispatches to service_role;

drop policy if exists nr06d_whatsapp_dispatches_read on public.newsroom_whatsapp_dispatches;
create policy nr06d_whatsapp_dispatches_read
on public.newsroom_whatsapp_dispatches
for select
to authenticated
using (
  public.newsroom_has_capability('distribution.manage')
  or public.newsroom_has_capability('story.publish')
);

-- ============================================================================
-- 3. WHATSAPP DISPATCH INDIVIDUAL MESSAGE RECEIPTS TABLE
-- ============================================================================

create table if not exists public.newsroom_whatsapp_dispatch_messages (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.newsroom_whatsapp_dispatches(id) on delete cascade,
  provider_message_id text null,
  recipient_identity_hash text not null, -- SHA-256 hash of recipient phone; zero raw phone exposure
  status text not null check (
    status in (
      'message-accepted',
      'message-rejected',
      'message-delivered',
      'message-read',
      'message-failed'
    )
  ),
  error_code text null,
  error_message text null,
  delivered_at timestamptz null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsroom_whatsapp_messages_dispatch
  on public.newsroom_whatsapp_dispatch_messages(dispatch_id);

create unique index if not exists idx_newsroom_whatsapp_messages_provider_id
  on public.newsroom_whatsapp_dispatch_messages(provider_message_id)
  where provider_message_id is not null;

alter table public.newsroom_whatsapp_dispatch_messages enable row level security;
revoke all on public.newsroom_whatsapp_dispatch_messages from public, anon, authenticated;
grant all on public.newsroom_whatsapp_dispatch_messages to service_role;

-- ============================================================================
-- 4. CAPABILITY-GATED EDITORIAL RPCs
-- ============================================================================

-- List broadcasts RPC (returns broadcasts with sanitized dispatch summary)
create or replace function public.newsroom_list_whatsapp_broadcasts()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
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
  left join public.newsroom_whatsapp_dispatches d on d.broadcast_id = b.id;

  return v_result;
end;
$$;

-- Create broadcast RPC
create or replace function public.newsroom_create_whatsapp_broadcast(
  p_title text,
  p_body text,
  p_broadcast_type text,
  p_channel_identity text default 'healthtimes-whatsapp-channel',
  p_related_story_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_title text;
  v_body text;
  v_type text;
  v_channel text;
  v_id uuid;
begin
  if not (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

  v_title := trim(coalesce(p_title, ''));
  v_body := trim(coalesce(p_body, ''));
  v_type := lower(trim(coalesce(p_broadcast_type, '')));
  v_channel := trim(coalesce(p_channel_identity, 'healthtimes-whatsapp-channel'));

  if length(v_title) < 3 or length(v_title) > 200 then
    raise exception using errcode = '22023', message = 'Broadcast title must be between 3 and 200 characters';
  end if;

  if length(v_body) < 10 or length(v_body) > 4096 then
    raise exception using errcode = '22023', message = 'Broadcast body must be between 10 and 4096 characters';
  end if;

  if v_type not in ('breaking_alert', 'daily_briefing', 'story_update', 'health_alert') then
    raise exception using errcode = '22023', message = 'Invalid broadcast type';
  end if;

  if p_related_story_id is not null and not exists(select 1 from public.stories where id = p_related_story_id) then
    raise exception using errcode = '22023', message = 'Related story does not exist';
  end if;

  insert into public.newsroom_whatsapp_broadcasts (
    title,
    body,
    broadcast_type,
    channel_identity,
    related_story_id,
    status,
    created_by,
    updated_by
  ) values (
    v_title,
    v_body,
    v_type,
    v_channel,
    p_related_story_id,
    'draft',
    auth.uid(),
    auth.uid()
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    public.newsroom_current_staff_id_basic(),
    'whatsapp.broadcast.created',
    'newsroom_whatsapp_broadcasts',
    v_id,
    jsonb_build_object(
      'title', v_title,
      'broadcast_type', v_type,
      'channel_identity', v_channel,
      'related_story_id', p_related_story_id
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'status', 'draft'
  );
end;
$$;

-- Approve broadcast RPC
create or replace function public.newsroom_approve_whatsapp_broadcast(
  p_broadcast_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rec record;
begin
  if not (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

  if p_broadcast_id is null then
    raise exception using errcode = '22023', message = 'Broadcast ID is required';
  end if;

  select * into v_rec
  from public.newsroom_whatsapp_broadcasts
  where id = p_broadcast_id
  for update;

  if v_rec.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp broadcast not found';
  end if;

  if v_rec.status <> 'draft' then
    raise exception using errcode = '22023', message = 'Only draft broadcasts can be approved';
  end if;

  update public.newsroom_whatsapp_broadcasts
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_broadcast_id;

  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    public.newsroom_current_staff_id_basic(),
    'whatsapp.broadcast.approved',
    'newsroom_whatsapp_broadcasts',
    p_broadcast_id,
    jsonb_build_object('approved_at', now())
  );

  return jsonb_build_object(
    'id', p_broadcast_id,
    'status', 'approved'
  );
end;
$$;

-- Reject broadcast RPC
create or replace function public.newsroom_reject_whatsapp_broadcast(
  p_broadcast_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rec record;
begin
  if not (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

  if p_broadcast_id is null then
    raise exception using errcode = '22023', message = 'Broadcast ID is required';
  end if;

  select * into v_rec
  from public.newsroom_whatsapp_broadcasts
  where id = p_broadcast_id
  for update;

  if v_rec.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp broadcast not found';
  end if;

  if v_rec.status not in ('draft', 'approved') then
    raise exception using errcode = '22023', message = 'Sent broadcasts cannot be rejected';
  end if;

  update public.newsroom_whatsapp_broadcasts
  set status = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = trim(coalesce(p_reason, 'Editorial rejection')),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_broadcast_id;

  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    public.newsroom_current_staff_id_basic(),
    'whatsapp.broadcast.rejected',
    'newsroom_whatsapp_broadcasts',
    p_broadcast_id,
    jsonb_build_object('reason', p_reason, 'rejected_at', now())
  );

  return jsonb_build_object(
    'id', p_broadcast_id,
    'status', 'rejected'
  );
end;
$$;

-- Get dispatch summary RPC (sanitized aggregate, zero recipient identity)
create or replace function public.newsroom_get_whatsapp_broadcast_dispatch(
  p_broadcast_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_res jsonb;
begin
  if not (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

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
  where d.broadcast_id = p_broadcast_id;

  if v_res is null then
    return null;
  end if;

  return v_res;
end;
$$;

-- ============================================================================
-- 5. SERVICE-ROLE ONLY PROVIDER DISPATCH RPCS
-- ============================================================================

-- Prepare dispatch RPC (atomic single-dispatch guard)
create or replace function public.newsroom_prepare_whatsapp_dispatch(
  p_broadcast_id uuid,
  p_idempotency_key text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_broadcast public.newsroom_whatsapp_broadcasts%rowtype;
  v_existing_dispatch public.newsroom_whatsapp_dispatches%rowtype;
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

  -- Atomic single-dispatch insertion
  begin
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

    -- Return preparation envelope
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

  exception when unique_violation then
    -- Catch conflict on broadcast_id or idempotency_key
    select * into v_existing_dispatch
    from public.newsroom_whatsapp_dispatches
    where broadcast_id = p_broadcast_id;

    if v_existing_dispatch.id is not null then
      return jsonb_build_object(
        'is_duplicate', true,
        'dispatch_id', v_existing_dispatch.id,
        'status', v_existing_dispatch.transport_status,
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
  end;
end;
$$;

-- Record dispatch result RPC
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
begin
  select * into v_dispatch
  from public.newsroom_whatsapp_dispatches
  where id = p_dispatch_id
  for update;

  if v_dispatch.id is null then
    raise exception using errcode = 'P0002', message = 'WhatsApp dispatch not found';
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

  if p_status = 'sent' then
    update public.newsroom_whatsapp_broadcasts
    set status = 'sent',
        sent_at = now(),
        updated_at = now()
    where id = v_dispatch.broadcast_id;
  end if;

  -- Insert message receipts if provided
  if jsonb_array_length(coalesce(p_messages, '[]'::jsonb)) > 0 then
    for v_msg in select * from jsonb_array_elements(p_messages) loop
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
        coalesce(v_msg->>'recipient_identity_hash', 'unknown_hash'),
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
    null,
    'whatsapp.dispatch.recorded',
    'newsroom_whatsapp_dispatches',
    p_dispatch_id,
    jsonb_build_object(
      'transport_status', p_transport_status,
      'recipient_count', p_recipient_count,
      'accepted_count', p_accepted_count,
      'rejected_count', p_rejected_count,
      'failure_reason', p_failure_reason
    )
  );

  return jsonb_build_object(
    'dispatch_id', p_dispatch_id,
    'transport_status', p_transport_status
  );
end;
$$;

-- Webhook event ingestion RPC (delivering receipt and read updates)
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
  v_msg public.newsroom_whatsapp_dispatch_messages%rowtype;
begin
  if p_provider_message_id is null or trim(p_provider_message_id) = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_provider_message_id');
  end if;

  select * into v_msg
  from public.newsroom_whatsapp_dispatch_messages
  where provider_message_id = p_provider_message_id
  for update;

  if v_msg.id is null then
    return jsonb_build_object('ok', true, 'matched', false);
  end if;

  if p_status = 'delivered' and v_msg.delivered_at is null then
    update public.newsroom_whatsapp_dispatch_messages
    set status = 'message-delivered',
        delivered_at = coalesce(p_timestamp, now()),
        updated_at = now()
    where id = v_msg.id;

    update public.newsroom_whatsapp_dispatches
    set delivered_count = delivered_count + 1,
        updated_at = now()
    where id = v_msg.dispatch_id;

  elsif p_status = 'read' and v_msg.read_at is null then
    update public.newsroom_whatsapp_dispatch_messages
    set status = 'message-read',
        read_at = coalesce(p_timestamp, now()),
        updated_at = now()
    where id = v_msg.id;

    update public.newsroom_whatsapp_dispatches
    set read_count = read_count + 1,
        updated_at = now()
    where id = v_msg.dispatch_id;

  elsif p_status = 'failed' then
    update public.newsroom_whatsapp_dispatch_messages
    set status = 'message-failed',
        error_message = p_payload->>'error',
        updated_at = now()
    where id = v_msg.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'matched', true,
    'status', p_status
  );
end;
$$;

-- Revoke all function execute from public and anon
revoke execute on function public.newsroom_list_whatsapp_broadcasts() from public, anon;
revoke execute on function public.newsroom_create_whatsapp_broadcast(text, text, text, text, uuid) from public, anon;
revoke execute on function public.newsroom_approve_whatsapp_broadcast(uuid) from public, anon;
revoke execute on function public.newsroom_reject_whatsapp_broadcast(uuid, text) from public, anon;
revoke execute on function public.newsroom_get_whatsapp_broadcast_dispatch(uuid) from public, anon;
revoke execute on function public.newsroom_prepare_whatsapp_dispatch(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.newsroom_record_whatsapp_dispatch_result(uuid, text, text, integer, integer, integer, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.newsroom_ingest_whatsapp_webhook_event(text, text, text, timestamptz, jsonb) from public, anon, authenticated;

-- Grant authenticated to editorial RPCs
grant execute on function public.newsroom_list_whatsapp_broadcasts() to authenticated;
grant execute on function public.newsroom_create_whatsapp_broadcast(text, text, text, text, uuid) to authenticated;
grant execute on function public.newsroom_approve_whatsapp_broadcast(uuid) to authenticated;
grant execute on function public.newsroom_reject_whatsapp_broadcast(uuid, text) to authenticated;
grant execute on function public.newsroom_get_whatsapp_broadcast_dispatch(uuid) to authenticated;

-- Grant service_role to dispatch execution & webhook RPCs
grant execute on function public.newsroom_prepare_whatsapp_dispatch(uuid, text, uuid) to service_role;
grant execute on function public.newsroom_record_whatsapp_dispatch_result(uuid, text, text, integer, integer, integer, text, text, jsonb, jsonb) to service_role;
grant execute on function public.newsroom_ingest_whatsapp_webhook_event(text, text, text, timestamptz, jsonb) to service_role;
