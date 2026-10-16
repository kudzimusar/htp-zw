-- HT-NR-05C-B: Governed Video Publication + Public Watch Delivery
-- Authoritative migration adding publication controls, public Watch RPC, and edit protections.

-- 1. Extend public.newsroom_videos with bounded publication fields
alter table public.newsroom_videos
  add column if not exists published_at timestamptz null,
  add column if not exists published_by uuid null references public.staff_profiles(id) on delete set null,
  add column if not exists watch_featured boolean not null default false;

-- 2. Single explicit featured video constraint (at most one published video can be featured)
create unique index if not exists newsroom_videos_single_watch_featured_idx
  on public.newsroom_videos (watch_featured)
  where (watch_featured = true and published_at is not null);

-- 3. Public Watch listing index (featured first, newest published, deterministic id tie-break)
create index if not exists newsroom_videos_public_watch_idx
  on public.newsroom_videos (watch_featured desc, published_at desc, id asc)
  where (published_at is not null and status = 'ready');

-- 4. Recreate newsroom_list_videos with extended operational projection
drop function if exists public.newsroom_list_videos(text, text, integer);

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
  updated_at timestamptz,
  published_at timestamptz,
  watch_featured boolean,
  published_by uuid
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
         v.updated_at,
         v.published_at,
         v.watch_featured,
         v.published_by
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

revoke execute on function public.newsroom_list_videos(text, text, integer) from public, anon;
grant execute on function public.newsroom_list_videos(text, text, integer) to authenticated, service_role, postgres;

-- 5. Harden newsroom_save_video: Reject ordinary metadata saves if video is published
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

  -- CRITICAL SECURITY BOUNDARY: Published video cannot be edited. Unpublish first.
  if v_existing.published_at is not null then
    raise exception using errcode='42501', message='Published video cannot be edited. Unpublish first.';
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

revoke execute on function public.newsroom_save_video(uuid, bigint, jsonb) from public, anon;
grant execute on function public.newsroom_save_video(uuid, bigint, jsonb) to authenticated, service_role, postgres;

-- 6. Harden newsroom_set_video_ready: Reject transitioning to draft while published
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

  -- CRITICAL SECURITY BOUNDARY: Cannot transition published video to draft
  if not p_ready and v_existing.published_at is not null then
    raise exception using errcode='42501', message='Published video cannot be transitioned to draft. Unpublish first.';
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

revoke execute on function public.newsroom_set_video_ready(uuid, bigint, boolean) from public, anon;
grant execute on function public.newsroom_set_video_ready(uuid, bigint, boolean) to authenticated, service_role, postgres;

-- 7. Publication RPC: newsroom_publish_video
create or replace function public.newsroom_publish_video(
  p_video_id uuid,
  p_expected_version bigint,
  p_featured boolean default false
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
  v_staff uuid;
  v_featured boolean;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required to publish video';
  end if;

  if p_video_id is null then
    raise exception using errcode='22023', message='p_video_id is required';
  end if;

  -- Lock row and verify version
  select * into v_existing
  from public.newsroom_videos
  where id = p_video_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or video not found';
  end if;

  -- Require status = ready
  if v_existing.status <> 'ready' then
    raise exception using errcode='22023', message='Video must be in ready status to publish';
  end if;

  -- Require published_at is null
  if v_existing.published_at is not null then
    raise exception using errcode='22023', message='Video is already published';
  end if;

  -- Revalidate minimum publishing criteria
  if v_existing.title is null or length(trim(v_existing.title)) = 0 then
    raise exception using errcode='22023', message='Video title cannot be empty for publication';
  end if;
  if v_existing.source_url is null or not public.newsroom_validate_video_https_url(v_existing.source_url) then
    raise exception using errcode='22023', message='Valid canonical HTTPS source_url is required for publication';
  end if;
  if v_existing.thumbnail_url is not null and not public.newsroom_validate_video_https_url(v_existing.thumbnail_url) then
    raise exception using errcode='22023', message='Valid canonical HTTPS thumbnail_url is required for publication';
  end if;
  if v_existing.source_provenance is null or length(trim(v_existing.source_provenance)) = 0 then
    raise exception using errcode='22023', message='source_provenance cannot be empty for publication';
  end if;

  v_featured := coalesce(p_featured, false);

  -- If publishing as featured, clear existing watch_featured on other published videos
  if v_featured then
    update public.newsroom_videos
    set watch_featured = false,
        updated_at = now()
    where watch_featured = true
      and published_at is not null
      and id <> p_video_id;
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_staff := public.newsroom_current_staff_id_basic();
  if v_staff is null and exists (select 1 from public.staff_profiles sp where sp.id = v_actor) then
    v_staff := v_actor;
  end if;

  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_videos
  set published_at = now(),
      published_by = v_staff,
      watch_featured = v_featured,
      updated_at = now(),
      updated_by = v_actor,
      lock_version = v_new_version
  where id = p_video_id;

  return v_new_version;
end;
$$;

revoke execute on function public.newsroom_publish_video(uuid, bigint, boolean) from public, anon;
grant execute on function public.newsroom_publish_video(uuid, bigint, boolean) to authenticated, service_role, postgres;

-- 8. Unpublish RPC: newsroom_unpublish_video
create or replace function public.newsroom_unpublish_video(
  p_video_id uuid,
  p_expected_version bigint
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
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required to unpublish video';
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

  if v_existing.published_at is null then
    raise exception using errcode='22023', message='Video is not currently published';
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_videos
  set published_at = null,
      published_by = null,
      watch_featured = false,
      updated_at = now(),
      updated_by = v_actor,
      lock_version = v_new_version
  where id = p_video_id;

  return v_new_version;
end;
$$;

revoke execute on function public.newsroom_unpublish_video(uuid, bigint) from public, anon;
grant execute on function public.newsroom_unpublish_video(uuid, bigint) to authenticated, service_role, postgres;

-- 9. Featured Control RPC: newsroom_set_video_featured
create or replace function public.newsroom_set_video_featured(
  p_video_id uuid,
  p_expected_version bigint,
  p_featured boolean
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
  v_featured boolean;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501', message='story.publish authority required to set featured video';
  end if;

  if p_video_id is null then
    raise exception using errcode='22023', message='p_video_id is required';
  end if;

  if p_featured is null then
    raise exception using errcode='22023', message='p_featured is required';
  end if;

  select * into v_existing
  from public.newsroom_videos
  where id = p_video_id
  for update;

  if not found or v_existing.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='Optimistic concurrency conflict or video not found';
  end if;

  -- Target must currently be published
  if v_existing.published_at is null then
    raise exception using errcode='22023', message='Only published videos can be featured on Watch';
  end if;

  v_featured := p_featured;

  -- If featuring, clear any other featured video
  if v_featured then
    update public.newsroom_videos
    set watch_featured = false,
        updated_at = now()
    where watch_featured = true
      and published_at is not null
      and id <> p_video_id;
  end if;

  v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_new_version := v_existing.lock_version + 1;

  update public.newsroom_videos
  set watch_featured = v_featured,
      updated_at = now(),
      updated_by = v_actor,
      lock_version = v_new_version
  where id = p_video_id;

  return v_new_version;
end;
$$;

revoke execute on function public.newsroom_set_video_featured(uuid, bigint, boolean) from public, anon;
grant execute on function public.newsroom_set_video_featured(uuid, bigint, boolean) to authenticated, service_role, postgres;

-- 10. Public Read RPC: newsroom_public_videos
create or replace function public.newsroom_public_videos(
  p_limit integer default 50
)
returns table (
  id uuid,
  title text,
  source_url text,
  thumbnail_url text,
  duration_seconds integer,
  related_story_id uuid,
  published_at timestamptz,
  watch_featured boolean
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
  select v.id,
         v.title,
         v.source_url,
         v.thumbnail_url,
         v.duration_seconds,
         v.related_story_id,
         v.published_at,
         v.watch_featured
  from public.newsroom_videos v
  where v.published_at is not null
    and v.status = 'ready'
    and public.newsroom_validate_video_https_url(v.source_url)
    and (v.thumbnail_url is null or public.newsroom_validate_video_https_url(v.thumbnail_url))
  order by v.watch_featured desc,
           v.published_at desc,
           v.id asc
  limit v_limit;
end;
$$;

revoke execute on function public.newsroom_public_videos(integer) from public;
grant execute on function public.newsroom_public_videos(integer) to anon, authenticated, service_role, postgres;
