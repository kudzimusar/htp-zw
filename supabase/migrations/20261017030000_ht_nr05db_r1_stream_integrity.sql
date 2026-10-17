-- HT-NR-05D-B-R1: Live Update Stream Recustody + Public Projection + Lossless Cursor Closure
-- 1. Adds server-owned monotonic sequence stream_seq bigint GENERATED ALWAYS AS IDENTITY to public.newsroom_live_updates
--    with unique index and (coverage_id, stream_seq DESC) index.
-- 2. Replaces public.newsroom_public_live_coverage(integer) to remove internal source_provenance and started_at,
--    preserving accepted 05D-A public fields + update_count.
-- 3. Replaces timestamp-cursor public.newsroom_public_live_updates with lossless monotonic cursor signature
--    public.newsroom_public_live_updates(uuid, bigint, integer).
-- 4. Hardens public.newsroom_live_updates application-role privileges so service_role has SELECT only
--    (revoking direct INSERT, UPDATE, DELETE from service_role).

begin;

-- =============================================================================
-- 1. MONOTONIC STREAM SEQUENCE (stream_seq)
-- =============================================================================

alter table public.newsroom_live_updates
  add column if not exists stream_seq bigint generated always as identity;

create unique index if not exists newsroom_live_updates_stream_seq_uidx
  on public.newsroom_live_updates (stream_seq);

create index if not exists newsroom_live_updates_coverage_stream_seq_idx
  on public.newsroom_live_updates (coverage_id, stream_seq desc);

-- =============================================================================
-- 2. APPEND-ONLY APPLICATION ROLE HARDENING
-- =============================================================================

revoke all on table public.newsroom_live_updates from public, anon, authenticated, service_role;
grant select on table public.newsroom_live_updates to service_role;
grant select, insert, update, delete on table public.newsroom_live_updates to postgres;

-- =============================================================================
-- 3. RESTORE SAFE PUBLIC COVERAGE CONTRACT (NO source_provenance)
-- =============================================================================

revoke all on function public.newsroom_public_live_coverage(integer) from public, anon, authenticated, service_role;
drop function if exists public.newsroom_public_live_coverage(integer);

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
    end as media_credit,
    case
      when c.kind = 'live-blog' then (
        select count(*)::integer
        from public.newsroom_live_updates u
        where u.coverage_id = c.id
      )
      else 0
    end as update_count
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

revoke all on function public.newsroom_public_live_coverage(integer) from public;
grant execute on function public.newsroom_public_live_coverage(integer) to anon, authenticated, service_role, postgres;

-- =============================================================================
-- 4. LOSSLESS MONOTONIC CURSOR PUBLIC UPDATES RPC
-- =============================================================================

revoke all on function public.newsroom_public_live_updates(uuid, timestamptz, integer) from public, anon, authenticated, service_role;
drop function if exists public.newsroom_public_live_updates(uuid, timestamptz, integer);

create or replace function public.newsroom_public_live_updates(
  p_coverage_id uuid,
  p_after_seq bigint default null,
  p_limit integer default 100
)
returns table (
  stream_seq bigint,
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

  if p_after_seq is not null and p_after_seq < 0 then
    raise exception 'p_after_seq must be >= 0' using errcode = '22023';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 100), 100));

  if p_after_seq is null then
    return query
    select
      u.stream_seq,
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
    order by u.stream_seq desc
    limit v_limit;
  else
    return query
    select
      u.stream_seq,
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
      and u.stream_seq > p_after_seq
    order by u.stream_seq asc
    limit v_limit;
  end if;
end;
$$;

revoke all on function public.newsroom_public_live_updates(uuid, bigint, integer) from public;
grant execute on function public.newsroom_public_live_updates(uuid, bigint, integer) to anon, authenticated, service_role, postgres;

commit;
