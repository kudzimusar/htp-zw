-- Migration 74: HT-NR-06C-A — Reader Push Device Registration + Push Alert Control Plane Foundation
-- Repository migration count: 74
-- Staging migration count: 74

-- ============================================================================
-- 1. READER PUSH DEVICE TABLE & STORAGE
-- ============================================================================

create table if not exists public.reader_push_devices (
  id uuid primary key default gen_random_uuid(),
  reader_user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  token_hash text not null,
  platform text not null check (platform in ('ios', 'android')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_registered_at timestamptz not null default now(),
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create unique index if not exists reader_push_devices_token_hash_active_idx
  on public.reader_push_devices(token_hash)
  where status = 'active';

create index if not exists reader_push_devices_user_idx
  on public.reader_push_devices(reader_user_id);

create index if not exists reader_push_devices_status_idx
  on public.reader_push_devices(status);

-- RLS: Enable RLS and revoke all direct client table access
alter table public.reader_push_devices enable row level security;

revoke all on public.reader_push_devices from public, anon, authenticated;

-- ============================================================================
-- 2. READER PUSH DEVICE REGISTRATION & REVOCATION RPCS
-- ============================================================================

-- Register device RPC
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
begin
  -- 1. Require authenticated Reader
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required to register push device';
  end if;

  -- 2. Validate token
  v_token := trim(p_expo_push_token);
  if v_token is null or length(v_token) = 0 or length(v_token) > 255 then
    raise exception using errcode = '22023', message = 'Invalid push token: non-empty bounded token required';
  end if;

  if v_token !~ '^(ExponentPushToken|ExpoPushToken)\[[^\s\[\]]{10,200}\]$' then
    raise exception using errcode = '22023', message = 'Invalid Expo push token format';
  end if;

  -- 3. Validate platform
  v_platform := lower(trim(p_platform));
  if v_platform not in ('ios', 'android') then
    raise exception using errcode = '22023', message = 'Invalid platform: only ios and android are supported';
  end if;

  -- 4. Compute token hash
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');

  -- 5. Safe reassociation & idempotency
  -- If token was previously active under another user, revoke old registration
  update public.reader_push_devices
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where token_hash = v_token_hash
    and reader_user_id <> auth.uid()
    and status = 'active';

  -- If token already registered by currently authenticated Reader, refresh
  select id into v_device_id
  from public.reader_push_devices
  where reader_user_id = auth.uid()
    and token_hash = v_token_hash;

  if v_device_id is not null then
    update public.reader_push_devices
    set status = 'active',
        revoked_at = null,
        last_registered_at = now(),
        platform = v_platform,
        expo_push_token = v_token,
        updated_at = now()
    where id = v_device_id;
  else
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
  end if;

  -- Return only device ID and status; never expose raw token
  return jsonb_build_object(
    'device_id', v_device_id,
    'status', 'active'
  );
end;
$$;

-- Revoke device RPC
create or replace function public.reader_revoke_push_device(
  p_device_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- 1. Require authenticated Reader
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required to revoke push device';
  end if;

  if p_device_id is null then
    raise exception using errcode = '22023', message = 'Device ID is required';
  end if;

  -- 2. Revoke device only if owned by auth.uid()
  update public.reader_push_devices
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where id = p_device_id
    and reader_user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception using errcode = 'P0002', message = 'Device not found or not owned by authenticated reader';
  end if;

  return jsonb_build_object(
    'device_id', p_device_id,
    'status', 'revoked'
  );
end;
$$;

-- ============================================================================
-- 3. NEWSROOM PUSH ALERT REGISTRY TABLE
-- ============================================================================

create table if not exists public.newsroom_push_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null check (category in ('breaking', 'live', 'topic', 'premium', 'system')),
  destination text null,
  related_story_id uuid null references public.stories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'prepared')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  approved_by uuid null references auth.users(id),
  prepared_by uuid null references auth.users(id),
  approved_at timestamptz null,
  prepared_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists newsroom_push_alerts_status_idx
  on public.newsroom_push_alerts(status);

create index if not exists newsroom_push_alerts_category_idx
  on public.newsroom_push_alerts(category);

create index if not exists newsroom_push_alerts_created_at_idx
  on public.newsroom_push_alerts(created_at desc);

create index if not exists newsroom_push_alerts_related_story_idx
  on public.newsroom_push_alerts(related_story_id)
  where related_story_id is not null;

-- RLS
alter table public.newsroom_push_alerts enable row level security;

-- Drop policy if exists
drop policy if exists newsroom_push_alerts_select on public.newsroom_push_alerts;

create policy newsroom_push_alerts_select on public.newsroom_push_alerts
  for select to authenticated
  using (
    public.newsroom_has_capability('distribution.manage')
    or public.newsroom_has_capability('story.publish')
  );

revoke insert, update, delete, truncate on table public.newsroom_push_alerts from public, anon, authenticated;

-- ============================================================================
-- 4. NEWSROOM PUSH ALERT CONTROL PLANE RPCS
-- ============================================================================

-- List alerts RPC
create or replace function public.newsroom_list_push_alerts(
  p_status text default null,
  p_category text default null,
  p_search text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  title text,
  body text,
  category text,
  destination text,
  related_story_id uuid,
  status text,
  created_by uuid,
  updated_by uuid,
  approved_by uuid,
  prepared_by uuid,
  approved_at timestamptz,
  prepared_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_limit integer;
  v_search text;
  v_status text;
  v_category text;
begin
  if not public.newsroom_session_authorized()
     or not (public.newsroom_has_capability('distribution.manage') or public.newsroom_has_capability('story.publish')) then
    raise exception using errcode = '42501', message = 'distribution.manage or story.publish capability required';
  end if;

  v_status := nullif(trim(p_status), '');
  if v_status is not null and v_status not in ('draft', 'approved', 'prepared') then
    raise exception using errcode = '22023', message = 'Invalid status filter: must be draft, approved, or prepared';
  end if;

  v_category := nullif(trim(p_category), '');
  if v_category is not null and v_category not in ('breaking', 'live', 'topic', 'premium', 'system') then
    raise exception using errcode = '22023', message = 'Invalid category filter';
  end if;

  v_search := nullif(trim(p_search), '');
  v_limit := greatest(1, least(coalesce(p_limit, 100), 250));

  return query
  select a.id,
         a.title,
         a.body,
         a.category,
         a.destination,
         a.related_story_id,
         a.status,
         a.created_by,
         a.updated_by,
         a.approved_by,
         a.prepared_by,
         a.approved_at,
         a.prepared_at,
         a.created_at,
         a.updated_at
  from public.newsroom_push_alerts a
  where (v_status is null or a.status = v_status)
    and (v_category is null or a.category = v_category)
    and (v_search is null or (a.title ilike '%' || v_search || '%' or a.body ilike '%' || v_search || '%'))
  order by a.created_at desc
  limit v_limit;
end;
$$;

-- Create alert RPC
create or replace function public.newsroom_create_push_alert(
  p_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_alert_id uuid;
  v_title text;
  v_body text;
  v_category text;
  v_destination text;
  v_related_story_id uuid;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('distribution.manage') then
    raise exception using errcode = '42501', message = 'distribution.manage capability required';
  end if;

  if (p_input - array['title', 'body', 'category', 'destination', 'related_story_id']) <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Unexpected keys in create push alert payload';
  end if;

  v_title := trim(p_input->>'title');
  if v_title is null or length(v_title) = 0 or length(v_title) > 140 then
    raise exception using errcode = '22023', message = 'Push alert title is required and must not exceed 140 characters';
  end if;

  v_body := trim(p_input->>'body');
  if v_body is null or length(v_body) = 0 or length(v_body) > 500 then
    raise exception using errcode = '22023', message = 'Push alert body is required and must not exceed 500 characters';
  end if;

  v_category := lower(trim(p_input->>'category'));
  if v_category is null or v_category not in ('breaking', 'live', 'topic', 'premium', 'system') then
    raise exception using errcode = '22023', message = 'Invalid push alert category. Must be breaking, live, topic, premium, or system';
  end if;

  v_destination := nullif(trim(p_input->>'destination'), '');
  if v_destination is not null then
    if length(v_destination) > 255
       or v_destination !~ '^/[a-zA-Z0-9_\-./]*$'
       or v_destination like '%//%'
       or v_destination like '%:%' then
      raise exception using errcode = '22023', message = 'Push alert destination must be a valid internal path starting with / without schemes or credentials';
    end if;
  end if;

  if p_input ? 'related_story_id' and p_input->>'related_story_id' is not null and trim(p_input->>'related_story_id') <> '' then
    begin
      v_related_story_id := (trim(p_input->>'related_story_id'))::uuid;
    exception when others then
      raise exception using errcode = '22023', message = 'related_story_id must be a valid UUID';
    end;
    if not exists (select 1 from public.stories where id = v_related_story_id) then
      raise exception using errcode = '22023', message = 'Referenced related story does not exist in stories catalog';
    end if;
  else
    v_related_story_id := null;
  end if;

  insert into public.newsroom_push_alerts (
    title,
    body,
    category,
    destination,
    related_story_id,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    v_title,
    v_body,
    v_category,
    v_destination,
    v_related_story_id,
    'draft',
    auth.uid(),
    auth.uid(),
    now(),
    now()
  )
  returning id into v_alert_id;

  return v_alert_id;
end;
$$;

-- Save alert RPC
create or replace function public.newsroom_save_push_alert(
  p_alert_id uuid,
  p_patch jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current public.newsroom_push_alerts%rowtype;
  v_title text;
  v_body text;
  v_category text;
  v_destination text;
  v_related_story_id uuid;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('distribution.manage') then
    raise exception using errcode = '42501', message = 'distribution.manage capability required';
  end if;

  if (p_patch - array['title', 'body', 'category', 'destination', 'related_story_id']) <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Unexpected keys in push alert patch payload';
  end if;

  select * into v_current from public.newsroom_push_alerts where id = p_alert_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Push alert not found';
  end if;

  if v_current.status <> 'draft' then
    raise exception using errcode = '42501', message = 'Only draft push alerts may be edited';
  end if;

  if p_patch ? 'title' then
    v_title := trim(p_patch->>'title');
    if v_title is null or length(v_title) = 0 or length(v_title) > 140 then
      raise exception using errcode = '22023', message = 'Push alert title cannot be empty or exceed 140 characters';
    end if;
  else
    v_title := v_current.title;
  end if;

  if p_patch ? 'body' then
    v_body := trim(p_patch->>'body');
    if v_body is null or length(v_body) = 0 or length(v_body) > 500 then
      raise exception using errcode = '22023', message = 'Push alert body cannot be empty or exceed 500 characters';
    end if;
  else
    v_body := v_current.body;
  end if;

  if p_patch ? 'category' then
    v_category := lower(trim(p_patch->>'category'));
    if v_category is null or v_category not in ('breaking', 'live', 'topic', 'premium', 'system') then
      raise exception using errcode = '22023', message = 'Invalid push alert category. Must be breaking, live, topic, premium, or system';
    end if;
  else
    v_category := v_current.category;
  end if;

  if p_patch ? 'destination' then
    v_destination := nullif(trim(p_patch->>'destination'), '');
    if v_destination is not null then
      if length(v_destination) > 255
         or v_destination !~ '^/[a-zA-Z0-9_\-./]*$'
         or v_destination like '%//%'
         or v_destination like '%:%' then
        raise exception using errcode = '22023', message = 'Push alert destination must be a valid internal path starting with / without schemes or credentials';
      end if;
    end if;
  else
    v_destination := v_current.destination;
  end if;

  if p_patch ? 'related_story_id' then
    if p_patch->>'related_story_id' is not null and trim(p_patch->>'related_story_id') <> '' then
      begin
        v_related_story_id := (trim(p_patch->>'related_story_id'))::uuid;
      exception when others then
        raise exception using errcode = '22023', message = 'related_story_id must be a valid UUID';
      end;
      if not exists (select 1 from public.stories where id = v_related_story_id) then
        raise exception using errcode = '22023', message = 'Referenced related story does not exist in stories catalog';
      end if;
    else
      v_related_story_id := null;
    end if;
  else
    v_related_story_id := v_current.related_story_id;
  end if;

  update public.newsroom_push_alerts
  set title = v_title,
      body = v_body,
      category = v_category,
      destination = v_destination,
      related_story_id = v_related_story_id,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_alert_id;
end;
$$;

-- Approve alert RPC
create or replace function public.newsroom_approve_push_alert(
  p_alert_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current public.newsroom_push_alerts%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode = '42501', message = 'story.publish capability required to approve push alert';
  end if;

  select * into v_current from public.newsroom_push_alerts where id = p_alert_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Push alert not found';
  end if;

  if v_current.status <> 'draft' then
    raise exception using errcode = '42501', message = 'Only draft push alerts can be approved';
  end if;

  -- Validate complete canonical payload
  if v_current.title is null or length(trim(v_current.title)) = 0 then
    raise exception using errcode = '22023', message = 'Complete title required for approval';
  end if;
  if v_current.body is null or length(trim(v_current.body)) = 0 then
    raise exception using errcode = '22023', message = 'Complete body required for approval';
  end if;
  if v_current.category not in ('breaking', 'live', 'topic', 'premium', 'system') then
    raise exception using errcode = '22023', message = 'Valid category required for approval';
  end if;

  update public.newsroom_push_alerts
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_alert_id;
end;
$$;

-- Prepare push alert RPC
create or replace function public.newsroom_prepare_push_alert(
  p_alert_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current public.newsroom_push_alerts%rowtype;
  v_device_count integer := 0;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode = '42501', message = 'story.publish capability required to prepare push alert';
  end if;

  select * into v_current from public.newsroom_push_alerts where id = p_alert_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Push alert not found';
  end if;

  if v_current.status <> 'approved' then
    raise exception using errcode = '42501', message = 'Only approved push alerts can be prepared for distribution';
  end if;

  -- Compute only aggregate device eligibility
  select count(*)::integer into v_device_count
  from public.reader_push_devices
  where status = 'active';

  update public.newsroom_push_alerts
  set status = 'prepared',
      prepared_by = auth.uid(),
      prepared_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_alert_id;

  -- Return safe aggregate handoff; zero recipient identity exposure
  return jsonb_build_object(
    'alert_id', v_current.id,
    'title', v_current.title,
    'body', v_current.body,
    'category', v_current.category,
    'destination', v_current.destination,
    'eligible_device_count', v_device_count
  );
end;
$$;

-- ============================================================================
-- 5. GRANTS & REVOCATIONS
-- ============================================================================

grant select on table public.newsroom_push_alerts to authenticated;

grant execute on function public.reader_register_push_device(text, text) to authenticated;
grant execute on function public.reader_revoke_push_device(uuid) to authenticated;
grant execute on function public.newsroom_list_push_alerts(text, text, text, integer) to authenticated;
grant execute on function public.newsroom_create_push_alert(jsonb) to authenticated;
grant execute on function public.newsroom_save_push_alert(uuid, jsonb) to authenticated;
grant execute on function public.newsroom_approve_push_alert(uuid) to authenticated;
grant execute on function public.newsroom_prepare_push_alert(uuid) to authenticated;

revoke execute on function public.reader_register_push_device(text, text) from anon;
revoke execute on function public.reader_revoke_push_device(uuid) from anon;
revoke execute on function public.newsroom_list_push_alerts(text, text, text, integer) from anon;
revoke execute on function public.newsroom_create_push_alert(jsonb) from anon;
revoke execute on function public.newsroom_save_push_alert(uuid, jsonb) from anon;
revoke execute on function public.newsroom_approve_push_alert(uuid) from anon;
revoke execute on function public.newsroom_prepare_push_alert(uuid) from anon;
