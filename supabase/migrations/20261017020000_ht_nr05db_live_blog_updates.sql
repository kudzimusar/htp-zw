-- HT-NR-05D-B: Canonical Live Blog Update Stream + Near-Real-Time / Real-Time Reader Delivery
-- Establishes public.newsroom_live_updates with strict RLS (zero permissive table policies),
-- operational SECURITY DEFINER RPCs (newsroom_post_live_update, newsroom_list_live_updates)
-- requiring server-verified newsroom session + story.publish capability,
-- public Reader update projection RPC (newsroom_public_live_updates),
-- and truthful update_count projection on public.newsroom_public_live_coverage.

begin;

-- =============================================================================
-- 1. CANONICAL LIVE BLOG UPDATES TABLE
-- =============================================================================

create table if not exists public.newsroom_live_updates (
  id uuid primary key default gen_random_uuid(),
  coverage_id uuid not null references public.newsroom_live_coverage(id) on delete cascade,
  headline text null,
  body text not null,
  media_id uuid null references public.media_assets(id) on delete set null,
  published_at timestamptz not null default now(),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint newsroom_live_updates_body_check
    check (length(btrim(body)) > 0 and length(btrim(body)) <= 10000),
  constraint newsroom_live_updates_headline_check
    check (headline is null or (length(btrim(headline)) > 0 and length(btrim(headline)) <= 200))
);

create index if not exists newsroom_live_updates_coverage_published_idx
  on public.newsroom_live_updates (coverage_id, published_at desc, id desc);

create index if not exists newsroom_live_updates_media_id_idx
  on public.newsroom_live_updates (media_id)
  where media_id is not null;

-- =============================================================================
-- 2. ROW LEVEL SECURITY (FAIL-CLOSED, ZERO PERMISSIVE POLICIES)
-- =============================================================================

alter table public.newsroom_live_updates enable row level security;

revoke all on table public.newsroom_live_updates from public, anon, authenticated;
grant select, insert, update, delete on table public.newsroom_live_updates to service_role, postgres;

-- =============================================================================
-- 3. OPERATIONAL RPC: POST LIVE UPDATE
-- =============================================================================

create or replace function public.newsroom_post_live_update(
  p_coverage_id uuid,
  p_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid;
  v_coverage public.newsroom_live_coverage%rowtype;
  v_key text;
  v_headline text := null;
  v_body text;
  v_media_id uuid := null;
  v_raw_uuid text;
  v_now timestamptz := now();
  v_new_id uuid;
begin
  if not public.newsroom_session_authorized() then
    raise exception 'Unauthorized newsroom session' using errcode = '42501';
  end if;

  if not public.newsroom_has_capability('story.publish') then
    raise exception 'Insufficient capability: story.publish required' using errcode = '42501';
  end if;

  v_actor_id := coalesce(
    public.newsroom_current_staff_id_basic(),
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  if p_coverage_id is null then
    raise exception 'p_coverage_id is required' using errcode = '22023';
  end if;

  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'p_input must be a JSON object' using errcode = '22023';
  end if;

  -- Reject unknown or forbidden keys
  for v_key in select jsonb_object_keys(p_input)
  loop
    if v_key not in ('headline', 'body', 'media_id') then
      raise exception 'Unknown or forbidden input key: %', v_key using errcode = '22023';
    end if;
  end loop;

  -- Lock and verify parent coverage
  select *
  into v_coverage
  from public.newsroom_live_coverage
  where id = p_coverage_id
  for update;

  if not found then
    raise exception 'Live coverage not found: %', p_coverage_id using errcode = 'P0002';
  end if;

  if v_coverage.kind <> 'live-blog' then
    raise exception 'Live updates can only be posted to live-blog coverage (current kind: %)', v_coverage.kind using errcode = '22023';
  end if;

  if v_coverage.status <> 'live' then
    raise exception 'Live updates can only be posted when coverage status is live (current status: %)', v_coverage.status using errcode = '22023';
  end if;

  -- Validate body (required, trimmed 1..10000 chars)
  if not (p_input ? 'body') or jsonb_typeof(p_input->'body') <> 'string' then
    raise exception 'body is required and must be a string' using errcode = '22023';
  end if;
  v_body := btrim(p_input->>'body');
  if length(v_body) = 0 or length(v_body) > 10000 then
    raise exception 'body must be between 1 and 10000 characters after trimming' using errcode = '22023';
  end if;

  -- Validate headline (optional string or null, trimmed <= 200 chars)
  if p_input ? 'headline' and jsonb_typeof(p_input->'headline') <> 'null' then
    if jsonb_typeof(p_input->'headline') <> 'string' then
      raise exception 'headline must be a string or null' using errcode = '22023';
    end if;
    v_headline := nullif(btrim(p_input->>'headline'), '');
    if v_headline is not null and length(v_headline) > 200 then
      raise exception 'headline must not exceed 200 characters after trimming' using errcode = '22023';
    end if;
  end if;

  -- Validate media_id (optional existing UUID in public.media_assets)
  if p_input ? 'media_id' and jsonb_typeof(p_input->'media_id') <> 'null' then
    if jsonb_typeof(p_input->'media_id') <> 'string' then
      raise exception 'media_id must be a UUID string or null' using errcode = '22023';
    end if;
    v_raw_uuid := btrim(p_input->>'media_id');
    if v_raw_uuid = '' then
      v_media_id := null;
    else
      begin
        v_media_id := v_raw_uuid::uuid;
      exception when others then
        raise exception 'media_id must be a valid UUID' using errcode = '22023';
      end;
      if not exists (select 1 from public.media_assets where id = v_media_id) then
        raise exception 'Referenced media_id does not exist in media_assets' using errcode = '23503';
      end if;
    end if;
  end if;

  insert into public.newsroom_live_updates (
    coverage_id,
    headline,
    body,
    media_id,
    published_at,
    created_by,
    created_at
  )
  values (
    p_coverage_id,
    v_headline,
    v_body,
    v_media_id,
    v_now,
    v_actor_id,
    v_now
  )
  returning id into v_new_id;

  -- Update parent coverage updated_at timestamp so coverage recency reflects latest update
  update public.newsroom_live_coverage
  set
    updated_at = v_now,
    updated_by = v_actor_id
  where id = p_coverage_id;

  return v_new_id;
end;
$$;

-- =============================================================================
-- 4. OPERATIONAL RPC: LIST LIVE UPDATES
-- =============================================================================

create or replace function public.newsroom_list_live_updates(
  p_coverage_id uuid,
  p_limit integer default 100
)
returns table (
  id uuid,
  coverage_id uuid,
  headline text,
  body text,
  media_id uuid,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer;
begin
  if not public.newsroom_session_authorized() then
    raise exception 'Unauthorized newsroom session' using errcode = '42501';
  end if;

  if not public.newsroom_has_capability('story.publish') then
    raise exception 'Insufficient capability: story.publish required' using errcode = '42501';
  end if;

  if p_coverage_id is null then
    raise exception 'p_coverage_id is required' using errcode = '22023';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 100), 250));

  return query
  select
    u.id,
    u.coverage_id,
    u.headline,
    u.body,
    u.media_id,
    u.published_at,
    u.created_by,
    u.created_at
  from public.newsroom_live_updates u
  where u.coverage_id = p_coverage_id
  order by u.published_at desc, u.id desc
  limit v_limit;
end;
$$;

-- =============================================================================
-- 5. PUBLIC READER RPC: LIST PUBLIC LIVE UPDATES
-- =============================================================================

create or replace function public.newsroom_public_live_updates(
  p_coverage_id uuid,
  p_since timestamptz default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  coverage_id uuid,
  headline text,
  body text,
  published_at timestamptz,
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
  if p_coverage_id is null then
    return;
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 100), 100));

  return query
  select
    u.id,
    u.coverage_id,
    u.headline,
    u.body,
    u.published_at,
    ma.id as media_id,
    ma.public_url as media_public_url,
    ma.alt_text as media_alt_text,
    ma.caption as media_caption,
    ma.credit as media_credit
  from public.newsroom_live_updates u
  inner join public.newsroom_live_coverage c
    on c.id = u.coverage_id
    and c.kind = 'live-blog'
    and c.status = 'live'
  left join public.media_assets ma
    on ma.id = u.media_id
    and ma.status = 'published'
    and ma.public_storage_bucket = 'newsroom-public'
    and ma.public_storage_key is not null
    and ma.public_url is not null
  where u.coverage_id = p_coverage_id
    and (p_since is null or u.published_at >= p_since)
  order by u.published_at desc, u.id desc
  limit v_limit;
end;
$$;

-- =============================================================================
-- 6. PUBLIC READER RPC: REPLACE PUBLIC LIVE COVERAGE TO INCLUDE UPDATE_COUNT
-- =============================================================================

drop function if exists public.newsroom_public_live_coverage(integer);

create or replace function public.newsroom_public_live_coverage(
  p_limit integer default 50
)
returns table (
  id uuid,
  title text,
  kind text,
  status text,
  scheduled_at timestamptz,
  started_at timestamptz,
  updated_at timestamptz,
  source_provenance text,
  media_id uuid,
  media_public_url text,
  media_alt_text text,
  media_caption text,
  media_credit text,
  update_count integer
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
  select
    c.id,
    c.title,
    c.kind,
    c.status,
    c.scheduled_at,
    c.started_at,
    c.updated_at,
    c.source_provenance,
    ma.id as media_id,
    ma.public_url as media_public_url,
    ma.alt_text as media_alt_text,
    ma.caption as media_caption,
    ma.credit as media_credit,
    case
      when c.kind = 'live-blog' then (
        select count(*)::integer
        from public.newsroom_live_updates u
        where u.coverage_id = c.id
      )
      else 0
    end as update_count
  from public.newsroom_live_coverage c
  left join public.media_assets ma
    on ma.id = c.media_id
    and ma.status = 'published'
    and ma.public_storage_bucket = 'newsroom-public'
    and ma.public_storage_key is not null
    and ma.public_url is not null
  where c.status in ('live', 'upcoming')
  order by
    case when c.status = 'live' then 0 else 1 end asc,
    c.updated_at desc,
    c.id desc
  limit v_limit;
end;
$$;

-- =============================================================================
-- 7. GRANTS & REVOCATIONS
-- =============================================================================

revoke all on function public.newsroom_post_live_update(uuid, jsonb) from public, anon;
revoke execute on function public.newsroom_post_live_update(uuid, jsonb) from public, anon;
grant execute on function public.newsroom_post_live_update(uuid, jsonb) to authenticated, service_role, postgres;

revoke all on function public.newsroom_list_live_updates(uuid, integer) from public, anon;
revoke execute on function public.newsroom_list_live_updates(uuid, integer) from public, anon;
grant execute on function public.newsroom_list_live_updates(uuid, integer) to authenticated, service_role, postgres;

revoke all on function public.newsroom_public_live_updates(uuid, timestamptz, integer) from public;
grant execute on function public.newsroom_public_live_updates(uuid, timestamptz, integer) to anon, authenticated, service_role, postgres;

revoke all on function public.newsroom_public_live_coverage(integer) from public;
grant execute on function public.newsroom_public_live_coverage(integer) to anon, authenticated, service_role, postgres;

commit;
