-- HT-NR-05C-A: Video Desk Registry and Editorial Metadata Foundation
-- Authoritative migration establishing public.newsroom_videos and canonical RPCs.

create or replace function public.newsroom_validate_video_https_url(p_url text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_trimmed text;
begin
  if p_url is null then
    return false;
  end if;
  v_trimmed := trim(p_url);
  if length(v_trimmed) = 0 then
    return false;
  end if;
  -- Must not contain whitespace
  if v_trimmed ~ '\s' then
    return false;
  end if;
  -- Must start with https://
  if v_trimmed !~* '^https://' then
    return false;
  end if;
  -- Must not contain credentials before first /
  if v_trimmed ~* '^https://[^/]*@' then
    return false;
  end if;
  -- Must have a valid host following https://
  if v_trimmed !~* '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]+)?(/.*)?$' then
    return false;
  end if;
  return true;
end;
$$;

create table if not exists public.newsroom_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  source_url text not null check (public.newsroom_validate_video_https_url(source_url)),
  thumbnail_url text null check (thumbnail_url is null or public.newsroom_validate_video_https_url(thumbnail_url)),
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  related_story_id uuid null references public.stories(id) on delete set null,
  source_provenance text not null check (length(trim(source_provenance)) > 0),
  status text not null default 'draft' check (status in ('draft', 'ready')),
  lock_version bigint not null default 1 check (lock_version >= 1),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsroom_videos_status_idx on public.newsroom_videos(status, updated_at desc);
create index if not exists newsroom_videos_related_story_idx on public.newsroom_videos(related_story_id) where related_story_id is not null;
create index if not exists newsroom_videos_updated_at_idx on public.newsroom_videos(updated_at desc);

-- RLS: all direct access disabled; all access mediated by canonical SECURITY DEFINER RPCs
alter table public.newsroom_videos enable row level security;

-- 1. List RPC
create or replace function public.newsroom_list_videos(
  p_status text default null,
  p_search text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  title text,
  source_url text,
  thumbnail_url text,
  duration_seconds integer,
  related_story_id uuid,
  source_provenance text,
  status text,
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
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501', message='media.manage authority required';
  end if;

  v_status := nullif(trim(p_status), '');
  if v_status is not null and v_status not in ('draft', 'ready') then
    raise exception using errcode='22023', message='Invalid status filter: must be draft or ready';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 100), 250));
  v_search := nullif(trim(p_search), '');

  return query
  select v.id,
         v.title,
         v.source_url,
         v.thumbnail_url,
         v.duration_seconds,
         v.related_story_id,
         v.source_provenance,
         v.status,
         v.lock_version,
         v.created_by,
         v.updated_by,
         v.created_at,
         v.updated_at
  from public.newsroom_videos v
  where (v_status is null or v.status = v_status)
    and (
      v_search is null
      or v.title ilike ('%' || v_search || '%')
      or v.source_provenance ilike ('%' || v_search || '%')
      or v.source_url ilike ('%' || v_search || '%')
    )
  order by v.updated_at desc
  limit v_limit;
end;
$$;

-- 2. Create RPC
create or replace function public.newsroom_create_video(
  p_video jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_title text;
  v_source_url text;
  v_thumbnail_url text;
  v_duration_seconds integer;
  v_related_story_id uuid;
  v_source_provenance text;
  v_actor uuid;
  v_raw_story_id text;
  v_raw_duration text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501', message='media.manage authority required';
  end if;

  if p_video is null or jsonb_typeof(p_video) <> 'object' then
    raise exception using errcode='22023', message='p_video must be a valid JSON object';
  end if;

  -- Title validation
  v_title := nullif(trim(p_video ->> 'title'), '');
  if v_title is null then
    raise exception using errcode='22023', message='Video title is required and cannot be empty';
  end if;

  -- Source URL validation
  v_source_url := nullif(trim(p_video ->> 'source_url'), '');
  if v_source_url is null or not public.newsroom_validate_video_https_url(v_source_url) then
    raise exception using errcode='22023', message='source_url must be a valid absolute HTTPS URL without embedded credentials';
  end if;

  -- Thumbnail URL validation
  v_thumbnail_url := nullif(trim(p_video ->> 'thumbnail_url'), '');
  if v_thumbnail_url is not null and not public.newsroom_validate_video_https_url(v_thumbnail_url) then
    raise exception using errcode='22023', message='thumbnail_url must be a valid absolute HTTPS URL without embedded credentials';
  end if;

  -- Duration validation
  v_raw_duration := p_video ->> 'duration_seconds';
  if v_raw_duration is not null and trim(v_raw_duration) <> '' then
    begin
      v_duration_seconds := (p_video ->> 'duration_seconds')::integer;
    exception when others then
      raise exception using errcode='22023', message='duration_seconds must be a valid integer';
    end;
    if v_duration_seconds < 0 then
      raise exception using errcode='22023', message='duration_seconds must be greater than or equal to 0';
    end if;
  else
    v_duration_seconds := null;
  end if;

  -- Related story validation
  v_raw_story_id := nullif(trim(p_video ->> 'related_story_id'), '');
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

  -- Source provenance validation
  v_source_provenance := nullif(trim(p_video ->> 'source_provenance'), '');
  if v_source_provenance is null then
    raise exception using errcode='22023', message='source_provenance is required and cannot be empty';
  end if;

  -- Resolve actor staff ID
  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  insert into public.newsroom_videos (
    title,
    source_url,
    thumbnail_url,
    duration_seconds,
    related_story_id,
    source_provenance,
    status,
    lock_version,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    v_title,
    v_source_url,
    v_thumbnail_url,
    v_duration_seconds,
    v_related_story_id,
    v_source_provenance,
    'draft',
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

-- 3. Save RPC
create or replace function public.newsroom_save_video(
  p_video_id uuid,
  p_expected_version bigint,
  p_patch jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.newsroom_videos%rowtype;
  v_new_version bigint;
  v_actor uuid;
  v_key text;
  v_title text;
  v_source_url text;
  v_thumbnail_url text;
  v_duration_seconds integer;
  v_related_story_id uuid;
  v_source_provenance text;
  v_raw_story_id text;
  v_raw_duration text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501', message='media.manage authority required';
  end if;

  if p_video_id is null then
    raise exception using errcode='22023', message='p_video_id is required';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception using errcode='22023', message='p_patch must be a valid JSON object';
  end if;

  -- Fail closed on unpatchable or unknown keys
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('title', 'source_url', 'thumbnail_url', 'duration_seconds', 'related_story_id', 'source_provenance') then
      raise exception using errcode='42501', message=format('Invalid or unpatchable field: %s', v_key);
    end if;
  end loop;

  -- Lock row and check version
  select * into v_existing
  from public.newsroom_videos
  where id = p_video_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or video not found';
  end if;

  -- Title
  if p_patch ? 'title' then
    v_title := nullif(trim(p_patch ->> 'title'), '');
    if v_title is null then
      raise exception using errcode='22023', message='Video title cannot be empty';
    end if;
  else
    v_title := v_existing.title;
  end if;

  -- Source URL
  if p_patch ? 'source_url' then
    v_source_url := nullif(trim(p_patch ->> 'source_url'), '');
    if v_source_url is null or not public.newsroom_validate_video_https_url(v_source_url) then
      raise exception using errcode='22023', message='source_url must be a valid absolute HTTPS URL without embedded credentials';
    end if;
  else
    v_source_url := v_existing.source_url;
  end if;

  -- Thumbnail URL
  if p_patch ? 'thumbnail_url' then
    v_thumbnail_url := nullif(trim(p_patch ->> 'thumbnail_url'), '');
    if v_thumbnail_url is not null and not public.newsroom_validate_video_https_url(v_thumbnail_url) then
      raise exception using errcode='22023', message='thumbnail_url must be a valid absolute HTTPS URL without embedded credentials';
    end if;
  else
    v_thumbnail_url := v_existing.thumbnail_url;
  end if;

  -- Duration
  if p_patch ? 'duration_seconds' then
    v_raw_duration := p_patch ->> 'duration_seconds';
    if v_raw_duration is not null and trim(v_raw_duration) <> '' then
      begin
        v_duration_seconds := (p_patch ->> 'duration_seconds')::integer;
      exception when others then
        raise exception using errcode='22023', message='duration_seconds must be a valid integer';
      end;
      if v_duration_seconds < 0 then
        raise exception using errcode='22023', message='duration_seconds must be greater than or equal to 0';
      end if;
    else
      v_duration_seconds := null;
    end if;
  else
    v_duration_seconds := v_existing.duration_seconds;
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

  update public.newsroom_videos
  set title = v_title,
      source_url = v_source_url,
      thumbnail_url = v_thumbnail_url,
      duration_seconds = v_duration_seconds,
      related_story_id = v_related_story_id,
      source_provenance = v_source_provenance,
      updated_by = v_actor,
      updated_at = now(),
      lock_version = v_new_version
  where id = p_video_id;

  return v_new_version;
end;
$$;

-- 4. Readiness RPC
create or replace function public.newsroom_set_video_ready(
  p_video_id uuid,
  p_expected_version bigint,
  p_ready boolean
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.newsroom_videos%rowtype;
  v_new_version bigint;
  v_actor uuid;
  v_new_status text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501', message='media.manage authority required';
  end if;

  if p_video_id is null then
    raise exception using errcode='22023', message='p_video_id is required';
  end if;

  select * into v_existing
  from public.newsroom_videos
  where id = p_video_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or video not found';
  end if;

  if p_ready then
    -- Validate publication-ready minimum
    if v_existing.title is null or length(trim(v_existing.title)) = 0 then
      raise exception using errcode='22023', message='Video title cannot be empty for ready status';
    end if;
    if v_existing.source_url is null or not public.newsroom_validate_video_https_url(v_existing.source_url) then
      raise exception using errcode='22023', message='Valid HTTPS source_url is required for ready status';
    end if;
    if v_existing.source_provenance is null or length(trim(v_existing.source_provenance)) = 0 then
      raise exception using errcode='22023', message='source_provenance cannot be empty for ready status';
    end if;
    v_new_status := 'ready';
  else
    v_new_status := 'draft';
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_videos
  set status = v_new_status,
      updated_by = v_actor,
      updated_at = now(),
      lock_version = v_new_version
  where id = p_video_id;

  return v_new_version;
end;
$$;

-- Revoke & Grant Execute privileges
revoke execute on function public.newsroom_validate_video_https_url(text) from public, anon;
grant execute on function public.newsroom_validate_video_https_url(text) to authenticated, service_role, postgres;

revoke execute on function public.newsroom_list_videos(text, text, integer) from public, anon;
grant execute on function public.newsroom_list_videos(text, text, integer) to authenticated, service_role, postgres;

revoke execute on function public.newsroom_create_video(jsonb) from public, anon;
grant execute on function public.newsroom_create_video(jsonb) to authenticated, service_role, postgres;

revoke execute on function public.newsroom_save_video(uuid, bigint, jsonb) from public, anon;
grant execute on function public.newsroom_save_video(uuid, bigint, jsonb) to authenticated, service_role, postgres;

revoke execute on function public.newsroom_set_video_ready(uuid, bigint, boolean) from public, anon;
grant execute on function public.newsroom_set_video_ready(uuid, bigint, boolean) to authenticated, service_role, postgres;
