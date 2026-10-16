-- HT-NR-05D-A: Canonical Live Coverage Registry + Public Reader Delivery Foundation
-- Authoritative migration establishing public.newsroom_live_coverage and canonical RPCs.

create table if not exists public.newsroom_live_coverage (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  kind text not null check (kind in ('live-blog', 'scheduled')),
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'ended')),
  scheduled_at timestamptz null,
  started_at timestamptz null,
  ended_at timestamptz null,
  related_story_id uuid null references public.stories(id) on delete set null,
  media_id uuid null references public.media_assets(id) on delete set null,
  source_provenance text not null check (length(trim(source_provenance)) > 0),
  lock_version bigint not null default 1 check (lock_version >= 1),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsroom_live_coverage_status_idx
  on public.newsroom_live_coverage(status, scheduled_at asc nulls last, updated_at desc);

create index if not exists newsroom_live_coverage_related_story_idx
  on public.newsroom_live_coverage(related_story_id)
  where related_story_id is not null;

create index if not exists newsroom_live_coverage_media_idx
  on public.newsroom_live_coverage(media_id)
  where media_id is not null;

create index if not exists newsroom_live_coverage_updated_at_idx
  on public.newsroom_live_coverage(updated_at desc);

-- RLS: all direct access disabled; all access mediated by canonical SECURITY DEFINER RPCs
alter table public.newsroom_live_coverage enable row level security;

-- 1. List RPC: newsroom_list_live_coverage
create or replace function public.newsroom_list_live_coverage(
  p_status text default null,
  p_kind text default null,
  p_search text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  title text,
  kind text,
  status text,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  related_story_id uuid,
  media_id uuid,
  source_provenance text,
  lock_version bigint,
  created_by uuid,
  updated_by uuid,
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
  v_kind text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required';
  end if;

  v_status := nullif(trim(p_status), '');
  if v_status is not null and v_status not in ('upcoming', 'live', 'ended') then
    raise exception using errcode='22023', message='Invalid status filter: must be upcoming, live, or ended';
  end if;

  v_kind := nullif(trim(p_kind), '');
  if v_kind is not null and v_kind not in ('live-blog', 'scheduled') then
    raise exception using errcode='22023', message='Invalid kind filter: must be live-blog or scheduled';
  end if;

  v_search := nullif(trim(p_search), '');
  v_limit := greatest(1, least(coalesce(p_limit, 100), 250));

  return query
  select c.id,
         c.title,
         c.kind,
         c.status,
         c.scheduled_at,
         c.started_at,
         c.ended_at,
         c.related_story_id,
         c.media_id,
         c.source_provenance,
         c.lock_version,
         c.created_by,
         c.updated_by,
         c.created_at,
         c.updated_at
  from public.newsroom_live_coverage c
  where (v_status is null or c.status = v_status)
    and (v_kind is null or c.kind = v_kind)
    and (
      v_search is null
      or c.title ilike ('%' || v_search || '%')
      or c.source_provenance ilike ('%' || v_search || '%')
    )
  order by c.updated_at desc, c.id asc
  limit v_limit;
end;
$$;

revoke execute on function public.newsroom_list_live_coverage(text, text, text, integer) from public, anon;
grant execute on function public.newsroom_list_live_coverage(text, text, text, integer) to authenticated, service_role, postgres;

-- 2. Create RPC: newsroom_create_live_coverage
create or replace function public.newsroom_create_live_coverage(
  p_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_key text;
  v_title text;
  v_kind text;
  v_raw_scheduled text;
  v_scheduled_at timestamptz;
  v_raw_story_id text;
  v_related_story_id uuid;
  v_raw_media_id text;
  v_media_id uuid;
  v_source_provenance text;
  v_actor uuid;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required';
  end if;

  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode='22023', message='p_input must be a valid JSON object';
  end if;

  -- Fail closed on unrecognized keys
  for v_key in select jsonb_object_keys(p_input) loop
    if v_key not in ('title', 'kind', 'scheduled_at', 'related_story_id', 'media_id', 'source_provenance') then
      raise exception using errcode='42501', message=format('Invalid or unrecognized field: %s', v_key);
    end if;
  end loop;

  -- Title validation
  v_title := nullif(trim(p_input ->> 'title'), '');
  if v_title is null then
    raise exception using errcode='22023', message='Coverage title is required and cannot be empty';
  end if;

  -- Kind validation
  v_kind := nullif(trim(p_input ->> 'kind'), '');
  if v_kind is null or v_kind not in ('live-blog', 'scheduled') then
    raise exception using errcode='22023', message='kind must be either live-blog or scheduled';
  end if;

  -- Scheduled At validation
  v_raw_scheduled := p_input ->> 'scheduled_at';
  if v_raw_scheduled is not null and trim(v_raw_scheduled) <> '' then
    begin
      v_scheduled_at := v_raw_scheduled::timestamptz;
    exception when others then
      raise exception using errcode='22023', message='scheduled_at must be a valid timestamp with time zone';
    end;
  else
    v_scheduled_at := null;
  end if;

  -- Related Story validation
  v_raw_story_id := nullif(trim(p_input ->> 'related_story_id'), '');
  if v_raw_story_id is not null then
    begin
      v_related_story_id := v_raw_story_id::uuid;
    exception when others then
      raise exception using errcode='22023', message='related_story_id must be a valid UUID';
    end;
    if not exists (select 1 from public.stories s where s.id = v_related_story_id) then
      raise exception using errcode='42501', message='Related story not found';
    end if;
    if not public.newsroom_can_edit_story(v_related_story_id) then
      raise exception using errcode='42501', message='Story edit authority required for related story';
    end if;
  else
    v_related_story_id := null;
  end if;

  -- Media validation
  v_raw_media_id := nullif(trim(p_input ->> 'media_id'), '');
  if v_raw_media_id is not null then
    begin
      v_media_id := v_raw_media_id::uuid;
    exception when others then
      raise exception using errcode='22023', message='media_id must be a valid UUID';
    end;
    if not exists (select 1 from public.media_assets ma where ma.id = v_media_id) then
      raise exception using errcode='42501', message='Media asset not found';
    end if;
  else
    v_media_id := null;
  end if;

  -- Source Provenance validation
  v_source_provenance := nullif(trim(p_input ->> 'source_provenance'), '');
  if v_source_provenance is null then
    raise exception using errcode='22023', message='source_provenance is required and cannot be empty';
  end if;

  -- Resolve actor staff ID
  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  insert into public.newsroom_live_coverage (
    title,
    kind,
    status,
    scheduled_at,
    started_at,
    ended_at,
    related_story_id,
    media_id,
    source_provenance,
    lock_version,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    v_title,
    v_kind,
    'upcoming',
    v_scheduled_at,
    null,
    null,
    v_related_story_id,
    v_media_id,
    v_source_provenance,
    1,
    v_actor,
    v_actor,
    now(),
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.newsroom_create_live_coverage(jsonb) from public, anon;
grant execute on function public.newsroom_create_live_coverage(jsonb) to authenticated, service_role, postgres;

-- 3. Save RPC: newsroom_save_live_coverage
create or replace function public.newsroom_save_live_coverage(
  p_coverage_id uuid,
  p_expected_version bigint,
  p_patch jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.newsroom_live_coverage%rowtype;
  v_new_version bigint;
  v_actor uuid;
  v_key text;
  v_title text;
  v_raw_scheduled text;
  v_scheduled_at timestamptz;
  v_raw_story_id text;
  v_related_story_id uuid;
  v_raw_media_id text;
  v_media_id uuid;
  v_source_provenance text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required';
  end if;

  if p_coverage_id is null then
    raise exception using errcode='22023', message='p_coverage_id is required';
  end if;

  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode='22023', message='p_expected_version must be >= 1';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception using errcode='22023', message='p_patch must be a valid JSON object';
  end if;

  -- Fail closed on unpatchable or unknown keys
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('title', 'scheduled_at', 'related_story_id', 'media_id', 'source_provenance') then
      raise exception using errcode='42501', message=format('Invalid or unpatchable field: %s', v_key);
    end if;
  end loop;

  -- Lock row and check version
  select * into v_existing
  from public.newsroom_live_coverage
  where id = p_coverage_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or coverage not found';
  end if;

  -- Ended coverage cannot be edited
  if v_existing.status = 'ended' then
    raise exception using errcode='42501', message='Ended live coverage cannot be edited';
  end if;

  -- Title
  if p_patch ? 'title' then
    v_title := nullif(trim(p_patch ->> 'title'), '');
    if v_title is null then
      raise exception using errcode='22023', message='Coverage title cannot be empty';
    end if;
  else
    v_title := v_existing.title;
  end if;

  -- Scheduled At
  if p_patch ? 'scheduled_at' then
    v_raw_scheduled := p_patch ->> 'scheduled_at';
    if v_raw_scheduled is not null and trim(v_raw_scheduled) <> '' then
      begin
        v_scheduled_at := v_raw_scheduled::timestamptz;
      exception when others then
        raise exception using errcode='22023', message='scheduled_at must be a valid timestamp with time zone';
      end;
    else
      v_scheduled_at := null;
    end if;
  else
    v_scheduled_at := v_existing.scheduled_at;
  end if;

  -- Related Story
  if p_patch ? 'related_story_id' then
    v_raw_story_id := nullif(trim(p_patch ->> 'related_story_id'), '');
    if v_raw_story_id is not null then
      begin
        v_related_story_id := v_raw_story_id::uuid;
      exception when others then
        raise exception using errcode='22023', message='related_story_id must be a valid UUID';
      end;
      if not exists (select 1 from public.stories s where s.id = v_related_story_id) then
        raise exception using errcode='42501', message='Related story not found';
      end if;
      if not public.newsroom_can_edit_story(v_related_story_id) then
        raise exception using errcode='42501', message='Story edit authority required for related story';
      end if;
    else
      v_related_story_id := null;
    end if;
  else
    v_related_story_id := v_existing.related_story_id;
  end if;

  -- Media Asset
  if p_patch ? 'media_id' then
    v_raw_media_id := nullif(trim(p_patch ->> 'media_id'), '');
    if v_raw_media_id is not null then
      begin
        v_media_id := v_raw_media_id::uuid;
      exception when others then
        raise exception using errcode='22023', message='media_id must be a valid UUID';
      end;
      if not exists (select 1 from public.media_assets ma where ma.id = v_media_id) then
        raise exception using errcode='42501', message='Media asset not found';
      end if;
    else
      v_media_id := null;
    end if;
  else
    v_media_id := v_existing.media_id;
  end if;

  -- Source Provenance
  if p_patch ? 'source_provenance' then
    v_source_provenance := nullif(trim(p_patch ->> 'source_provenance'), '');
    if v_source_provenance is null then
      raise exception using errcode='22023', message='source_provenance cannot be empty';
    end if;
  else
    v_source_provenance := v_existing.source_provenance;
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_live_coverage
  set title = v_title,
      scheduled_at = v_scheduled_at,
      related_story_id = v_related_story_id,
      media_id = v_media_id,
      source_provenance = v_source_provenance,
      updated_at = now(),
      updated_by = v_actor,
      lock_version = v_new_version
  where id = p_coverage_id;

  return v_new_version;
end;
$$;

revoke execute on function public.newsroom_save_live_coverage(uuid, bigint, jsonb) from public, anon;
grant execute on function public.newsroom_save_live_coverage(uuid, bigint, jsonb) to authenticated, service_role, postgres;

-- 4. Start RPC: newsroom_start_live_coverage
create or replace function public.newsroom_start_live_coverage(
  p_coverage_id uuid,
  p_expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.newsroom_live_coverage%rowtype;
  v_new_version bigint;
  v_actor uuid;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required';
  end if;

  if p_coverage_id is null then
    raise exception using errcode='22023', message='p_coverage_id is required';
  end if;

  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode='22023', message='p_expected_version must be >= 1';
  end if;

  select * into v_existing
  from public.newsroom_live_coverage
  where id = p_coverage_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or coverage not found';
  end if;

  if v_existing.status <> 'upcoming' then
    raise exception using errcode='42501', message=format('Cannot start coverage in status %s: only upcoming coverage may be started', v_existing.status);
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_live_coverage
  set status = 'live',
      started_at = now(),
      ended_at = null,
      updated_at = now(),
      updated_by = v_actor,
      lock_version = v_new_version
  where id = p_coverage_id;

  return v_new_version;
end;
$$;

revoke execute on function public.newsroom_start_live_coverage(uuid, bigint) from public, anon;
grant execute on function public.newsroom_start_live_coverage(uuid, bigint) to authenticated, service_role, postgres;

-- 5. End RPC: newsroom_end_live_coverage
create or replace function public.newsroom_end_live_coverage(
  p_coverage_id uuid,
  p_expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.newsroom_live_coverage%rowtype;
  v_new_version bigint;
  v_actor uuid;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required';
  end if;

  if p_coverage_id is null then
    raise exception using errcode='22023', message='p_coverage_id is required';
  end if;

  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode='22023', message='p_expected_version must be >= 1';
  end if;

  select * into v_existing
  from public.newsroom_live_coverage
  where id = p_coverage_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or coverage not found';
  end if;

  if v_existing.status <> 'live' then
    raise exception using errcode='42501', message=format('Cannot end coverage in status %s: only currently live coverage may be ended', v_existing.status);
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_live_coverage
  set status = 'ended',
      ended_at = now(),
      updated_at = now(),
      updated_by = v_actor,
      lock_version = v_new_version
  where id = p_coverage_id;

  return v_new_version;
end;
$$;

revoke execute on function public.newsroom_end_live_coverage(uuid, bigint) from public, anon;
grant execute on function public.newsroom_end_live_coverage(uuid, bigint) to authenticated, service_role, postgres;

-- 6. Public Projection RPC: newsroom_public_live_coverage
create or replace function public.newsroom_public_live_coverage(
  p_limit integer default 50
)
returns table (
  id uuid,
  title text,
  kind text,
  status text,
  updated_at timestamptz,
  scheduled_at timestamptz,
  media_id uuid,
  media_public_url text,
  media_alt_text text,
  media_caption text,
  media_credit text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_limit integer;
begin
  v_limit := greatest(1, least(coalesce(p_limit, 50), 100));

  return query
  select c.id,
         c.title,
         c.kind,
         c.status,
         c.updated_at,
         c.scheduled_at,
         case
           when ma.id is not null
             and lower(coalesce(ma.status, '')) = 'published'
             and ma.public_storage_bucket = 'newsroom-public'
             and ma.public_storage_key is not null
             and ma.public_url is not null
           then ma.id
           else null
         end as media_id,
         case
           when ma.id is not null
             and lower(coalesce(ma.status, '')) = 'published'
             and ma.public_storage_bucket = 'newsroom-public'
             and ma.public_storage_key is not null
             and ma.public_url is not null
           then ma.public_url
           else null
         end as media_public_url,
         case
           when ma.id is not null
             and lower(coalesce(ma.status, '')) = 'published'
             and ma.public_storage_bucket = 'newsroom-public'
             and ma.public_storage_key is not null
             and ma.public_url is not null
           then ma.alt_text
           else null
         end as media_alt_text,
         case
           when ma.id is not null
             and lower(coalesce(ma.status, '')) = 'published'
             and ma.public_storage_bucket = 'newsroom-public'
             and ma.public_storage_key is not null
             and ma.public_url is not null
           then ma.caption
           else null
         end as media_caption,
         case
           when ma.id is not null
             and lower(coalesce(ma.status, '')) = 'published'
             and ma.public_storage_bucket = 'newsroom-public'
             and ma.public_storage_key is not null
             and ma.public_url is not null
           then ma.credit
           else null
         end as media_credit
  from public.newsroom_live_coverage c
  left join public.media_assets ma on ma.id = c.media_id
  where c.status in ('live', 'upcoming')
  order by
    case when c.status = 'live' then 0 else 1 end asc,
    c.scheduled_at asc nulls last,
    c.updated_at desc,
    c.id asc
  limit v_limit;
end;
$$;

revoke execute on function public.newsroom_public_live_coverage(integer) from public;
grant execute on function public.newsroom_public_live_coverage(integer) to anon, authenticated, service_role, postgres;
