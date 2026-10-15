-- AG-05 post-AG04 handoff compatibility.
-- AG-04 authoritative handoff uses PRESERVE_DIRECTLY; consume case-insensitively without rewriting AG-04 rows.

drop view if exists public.ag05_url_coverage_status;

create view public.ag05_url_coverage_status as
with snapshot as (
  select *
  from public.migration_source_snapshots
  where snapshot_key = 'cp3-2026-09-21'
),
sources as (
  select id
  from public.legacy_sources
  where system='wordpress' and source_type in ('post','page')
),
mapping_stats as (
  select
    count(*)::integer as mapping_rows,
    count(distinct m.legacy_source_id)::integer as distinct_mapped_sources,
    count(*) filter (where upper(coalesce(m.preservation_strategy,''))='PRESERVE_DIRECTLY' and m.redirect_status=200)::integer as preserved_direct,
    count(*) filter (where upper(coalesce(m.preservation_strategy,'')) in ('REDIRECT','301_REDIRECT') and m.redirect_status=301)::integer as redirected,
    count(*) filter (where m.old_path='/' and m.new_path='/' and s.source_url <> 'https://healthtimes.co.zw/')::integer as invalid_homepage_catchalls
  from public.legacy_url_mappings m
  join public.legacy_sources s on s.id=m.legacy_source_id
  where m.legacy_source_id in (select id from sources)
),
duplicate_stats as (
  select count(*)::integer as duplicate_sources
  from (
    select legacy_source_id
    from public.legacy_url_mappings
    where legacy_source_id in (select id from sources)
    group by legacy_source_id
    having count(*) <> 1
  ) d
),
exception_stats as (
  select
    count(*)::integer as exception_rows,
    count(*) filter (where lower(handling) in ('archive','noindex'))::integer as noindex_archive,
    count(*) filter (where lower(handling)='exception')::integer as explicit_exceptions
  from public.legacy_url_exceptions e
  join snapshot s on s.id=e.snapshot_id
),
source_stats as (
  select count(*)::integer as source_rows from sources
)
select
  snapshot.snapshot_key,
  snapshot.published_posts + snapshot.published_pages as expected_public_objects,
  source_stats.source_rows,
  mapping_stats.mapping_rows,
  mapping_stats.distinct_mapped_sources,
  exception_stats.exception_rows,
  mapping_stats.preserved_direct,
  mapping_stats.redirected,
  exception_stats.noindex_archive,
  exception_stats.explicit_exceptions,
  duplicate_stats.duplicate_sources,
  mapping_stats.invalid_homepage_catchalls,
  greatest(
    (snapshot.published_posts + snapshot.published_pages)
      - mapping_stats.distinct_mapped_sources
      - exception_stats.exception_rows,
    0
  ) as unresolved,
  case
    when source_stats.source_rows = snapshot.published_posts + snapshot.published_pages
     and mapping_stats.distinct_mapped_sources + exception_stats.exception_rows = snapshot.published_posts + snapshot.published_pages
     and mapping_stats.mapping_rows = mapping_stats.distinct_mapped_sources
     and mapping_stats.preserved_direct + mapping_stats.redirected + exception_stats.exception_rows = snapshot.published_posts + snapshot.published_pages
     and duplicate_stats.duplicate_sources = 0
     and mapping_stats.invalid_homepage_catchalls = 0
    then 'COVERED'
    else 'BLOCKED'
  end as coverage_status
from snapshot,source_stats,mapping_stats,duplicate_stats,exception_stats;

create or replace function public.ag05_resolve_public_path(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text := public.ag05_normalize_path(p_path);
  v_direct record;
  v_alias record;
begin
  if v_path='/' then
    return jsonb_build_object(
      'resolution','homepage',
      'http_status',200,
      'requested_path','/',
      'target_path','/'
    );
  end if;

  select m.old_path,m.new_path,m.redirect_status,m.preservation_strategy,
         ls.id legacy_source_id,ls.source_id,ls.source_type
  into v_direct
  from public.legacy_url_mappings m
  join public.legacy_sources ls on ls.id=m.legacy_source_id
  where ls.system='wordpress'
    and ls.source_type in ('post','page')
    and m.old_path=v_path
  limit 1;

  if v_direct.old_path is not null then
    return jsonb_build_object(
      'resolution',case when v_direct.redirect_status=301 then 'redirect' else 'preserved_direct' end,
      'http_status',v_direct.redirect_status,
      'requested_path',v_path,
      'target_path',v_direct.new_path,
      'legacy_source_id',v_direct.legacy_source_id,
      'source_id',v_direct.source_id,
      'source_type',v_direct.source_type,
      'handling',v_direct.preservation_strategy
    );
  end if;

  with slug_candidate as (
    select regexp_replace(v_path,'^.*/([^/]+)/$','\1') as slug
  ), matches as (
    select st.id story_id,ls.id legacy_source_id,ls.source_id,ls.source_type,
           m.old_path canonical_path,
           count(*) over() match_count
    from slug_candidate sc
    join public.stories st on st.slug=sc.slug
    join public.legacy_sources ls on ls.id=st.legacy_source_id
    join public.legacy_url_mappings m on m.legacy_source_id=ls.id
    where ls.system='wordpress'
      and ls.source_type in ('post','page')
      and lower(st.status) in ('publish','published')
      and (st.published_at is null or st.published_at <= now())
      and m.redirect_status=200
      and upper(coalesce(m.preservation_strategy,''))='PRESERVE_DIRECTLY'
  )
  select * into v_alias from matches where match_count=1 limit 1;

  if v_alias.story_id is not null then
    return jsonb_build_object(
      'resolution','alias_redirect',
      'http_status',301,
      'requested_path',v_path,
      'target_path',v_alias.canonical_path,
      'legacy_source_id',v_alias.legacy_source_id,
      'source_id',v_alias.source_id,
      'source_type',v_alias.source_type,
      'reason','unique_story_slug_match'
    );
  end if;

  return jsonb_build_object(
    'resolution','explicit_404_exception',
    'http_status',404,
    'requested_path',v_path,
    'target_path',null,
    'reason','no_unique_authoritative_destination'
  );
end;
$$;

create or replace function public.ag05_refresh_internal_link_audit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  truncate table public.ag05_internal_link_audit;

  insert into public.ag05_internal_link_audit (
    path,occurrences,classification,http_status,target_path,reason,refreshed_at
  )
  with links as (
    select (regexp_matches(coalesce(s.body_html,''), 'href=["'']([^"'']+)["'']', 'gi'))[1] as href
    from public.stories s
    where lower(s.status) in ('publish','published')
  ),
  internal as (
    select case
      when href ~ '^https?://(www\.)?healthtimes\.co\.zw/' then regexp_replace(href,'^https?://(www\.)?healthtimes\.co\.zw','')
      when href like '/%' then href
      else null
    end as raw_path
    from links
  ),
  paths as (
    select public.ag05_normalize_path(raw_path) as path,count(*)::bigint as occurrences
    from internal
    where raw_path is not null
      and raw_path !~ '^/wp-content/'
      and raw_path !~ '^/(wp-admin|wp-login\.php|feed|category|tag|author)(/|$)'
    group by public.ag05_normalize_path(raw_path)
  ),
  direct_targets as (
    select m.old_path,m.new_path,m.redirect_status,m.preservation_strategy
    from public.legacy_url_mappings m
    join public.legacy_sources ls on ls.id=m.legacy_source_id
    where ls.system='wordpress'
      and ls.source_type in ('post','page')
  ),
  slug_targets as (
    select
      st.slug,
      count(*)::integer as n,
      (array_agg(m.old_path order by m.old_path))[1] as target_path
    from public.stories st
    join public.legacy_sources ls on ls.id=st.legacy_source_id
    join public.legacy_url_mappings m on m.legacy_source_id=ls.id
    where ls.system='wordpress'
      and ls.source_type in ('post','page')
      and lower(st.status) in ('publish','published')
      and (st.published_at is null or st.published_at <= now())
      and m.redirect_status=200
      and upper(coalesce(m.preservation_strategy,''))='PRESERVE_DIRECTLY'
    group by st.slug
  ),
  classified as (
    select
      p.path,
      p.occurrences,
      d.old_path as direct_path,
      d.new_path as direct_target,
      d.redirect_status as direct_status,
      st.n as slug_match_count,
      st.target_path as slug_target
    from paths p
    left join direct_targets d on d.old_path=p.path
    left join slug_targets st on st.slug=regexp_replace(p.path,'^.*/([^/]+)/$','\1')
  )
  select
    path,
    occurrences,
    case
      when path='/' then 'homepage'
      when direct_path is not null and direct_status=200 then 'preserved_direct'
      when direct_path is not null and direct_status=301 then 'redirect'
      when slug_match_count=1 then 'alias_redirect'
      else 'explicit_404_exception'
    end,
    case
      when path='/' then 200
      when direct_path is not null then direct_status
      when slug_match_count=1 then 301
      else 404
    end,
    case
      when path='/' then '/'
      when direct_path is not null then direct_target
      when slug_match_count=1 then slug_target
      else null
    end,
    case
      when path='/' then 'homepage_or_fragment_target'
      when direct_path is not null then 'canonical_public_mapping'
      when slug_match_count=1 then 'unique_story_slug_match'
      else 'no_unique_authoritative_destination'
    end,
    now()
  from classified;

  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'refreshed_rows',v_rows,
    'refreshed_at',now()
  );
end;
$$;

select public.ag05_refresh_internal_link_audit();

revoke all on function public.ag05_resolve_public_path(text) from public;
revoke all on function public.ag05_refresh_internal_link_audit() from public;
grant execute on function public.ag05_resolve_public_path(text) to anon, authenticated;
grant execute on function public.ag05_refresh_internal_link_audit() to service_role;
