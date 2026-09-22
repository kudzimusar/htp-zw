-- AG-05 CP5 rehearsal runtime closure.
-- Consumes the completed AG-04 staging rehearsal without rewriting the importer.
-- Production systems are not modified.

-- Remove the single proven spurious mapping created for WP post 33190.
delete from public.legacy_url_mappings m
using public.legacy_sources s
where m.legacy_source_id = s.id
  and s.system = 'wordpress'
  and s.source_type = 'post'
  and s.source_id = '33190'
  and m.old_path = '/'
  and m.new_path = '/';

-- The accepted AG-04 rehearsal contains no changed-path mappings.
-- Same-path public objects are preserved-direct and should resolve HTTP 200.
update public.legacy_url_mappings
set redirect_status = 200,
    preservation_strategy = 'preserve_directly'
where old_path = new_path
  and legacy_source_id in (
    select id from public.legacy_sources
    where system = 'wordpress' and source_type in ('post','page')
  );

-- Any future changed-path handoff remains an explicit one-hop permanent redirect.
update public.legacy_url_mappings
set redirect_status = 301,
    preservation_strategy = 'redirect'
where old_path <> new_path
  and legacy_source_id in (
    select id from public.legacy_sources
    where system = 'wordpress' and source_type in ('post','page')
  );

-- Bind AG-05 commercial provenance to AG-04 migrated media identities.
update public.ad_source_assets asa
set media_id = ma.id
from public.media_assets ma
join public.legacy_sources ls on ls.id = ma.legacy_source_id
where ls.system = 'wordpress'
  and ls.source_type = 'media'
  and ls.source_id = asa.source_attachment_id
  and asa.source_attachment_id in ('32960','32971','33005');

update public.ad_placements
set status = 'bound_rehearsal',
    layout_policy = coalesce(layout_policy,'{}'::jsonb) || jsonb_build_object(
      'reserve_space', true,
      'prevent_layout_shift', true,
      'destination_url_state', 'UNKNOWN',
      'schedule_state', 'UNKNOWN',
      'placement_conditions_state', 'UNKNOWN',
      'activation_policy', 'preview_only_until_conditions_verified'
    )
where placement_key = 'hospaz-header-direct';

create or replace function public.ag05_normalize_path(p_path text)
returns text
language sql
immutable
as $$
  select case
    when nullif(split_part(split_part(coalesce(p_path,''),'?',1),'#',1),'') is null then '/'
    when split_part(split_part(p_path,'?',1),'#',1) = '/' then '/'
    when right(split_part(split_part(p_path,'?',1),'#',1),1) = '/'
      then split_part(split_part(p_path,'?',1),'#',1)
    else split_part(split_part(p_path,'?',1),'#',1) || '/'
  end;
$$;

create or replace view public.ag05_url_coverage_status as
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
    count(*) filter (where m.preservation_strategy='preserve_directly' and m.redirect_status=200)::integer as preserved_direct,
    count(*) filter (where m.preservation_strategy='redirect' and m.redirect_status=301)::integer as redirected,
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
     and duplicate_stats.duplicate_sources = 0
     and mapping_stats.invalid_homepage_catchalls = 0
    then 'COVERED'
    else 'BLOCKED'
  end as coverage_status
from snapshot,source_stats,mapping_stats,duplicate_stats,exception_stats;

create or replace function public.ag05_public_story_document(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_path text := public.ag05_normalize_path(p_path);
  v_result jsonb;
begin
  select jsonb_build_object(
    'story_id', st.id,
    'source_id', ls.source_id,
    'source_type', ls.source_type,
    'source_url', ls.source_url,
    'old_path', m.old_path,
    'new_path', m.new_path,
    'handling', m.preservation_strategy,
    'http_status', m.redirect_status,
    'title', coalesce(nullif(sm.title,''),nullif(st.seo_title,''),st.title),
    'story_title', st.title,
    'description', coalesce(
      nullif(sm.description,''),
      nullif(st.seo_description,''),
      nullif(st.standfirst,''),
      nullif(st.excerpt,''),
      nullif(left(regexp_replace(regexp_replace(coalesce(st.body_html,''),'<[^>]+>',' ','g'),'\\s+',' ','g'),300),'')
    ),
    'canonical_url', coalesce(nullif(sm.canonical_url,''),nullif(st.canonical_url,''),ls.source_url),
    'robots', coalesce(nullif(sm.robots,''),'index,follow,max-image-preview:large'),
    'index_policy', coalesce(nullif(sm.index_policy,''),'index'),
    'open_graph_title', coalesce(nullif(sm.open_graph_title,''),nullif(sm.title,''),nullif(st.seo_title,''),st.title),
    'open_graph_description', coalesce(
      nullif(sm.open_graph_description,''),
      nullif(sm.description,''),
      nullif(st.seo_description,''),
      nullif(st.standfirst,''),
      nullif(st.excerpt,'')
    ),
    'open_graph_image', coalesce(
      nullif(sm.open_graph_image,''),
      case when fm.storage_object_name is not null then '/storage/' || fm.storage_object_name else null end,
      fm.source_url
    ),
    'featured_storage_object', fm.storage_object_name,
    'featured_source_url', fm.source_url,
    'featured_alt_text', fm.alt_text,
    'schema_type', coalesce(nullif(sm.structured_data_type,''),case when ls.source_type='post' then 'NewsArticle' else 'Article' end),
    'source_plugin', sm.source_plugin,
    'published_at', st.published_at,
    'modified_at', coalesce(st.modified_at,st.published_at),
    'author', case when au.id is null then null else jsonb_build_object(
      'name',au.display_name,
      'slug',au.slug,
      'bio',au.bio
    ) end,
    'section', case when sec.id is null then null else jsonb_build_object(
      'name',sec.name,
      'slug',sec.slug
    ) end,
    'access_policy', st.access_policy,
    'body_html', case when lower(st.access_policy)='public' then st.body_html else null end,
    'standfirst', st.standfirst,
    'excerpt', st.excerpt
  )
  into v_result
  from public.legacy_url_mappings m
  join public.legacy_sources ls on ls.id=m.legacy_source_id
  join public.stories st on st.legacy_source_id=ls.id
  left join public.seo_metadata sm on sm.legacy_source_id=ls.id
  left join public.authors au on au.id=st.author_id
  left join public.sections sec on sec.id=st.primary_section_id
  left join lateral (
    select
      ma.source_url,
      ma.alt_text,
      so.name as storage_object_name
    from public.media_usage mu
    join public.media_assets ma on ma.id=mu.media_id
    left join lateral (
      select o.name
      from storage.objects o
      where o.bucket_id='migrated-media'
        and o.name in (
          ma.storage_key,
          regexp_replace(ma.storage_key,'^wordpress/','wordpress/uploads/')
        )
      order by case when o.name=ma.storage_key then 0 else 1 end
      limit 1
    ) so on true
    where mu.story_id=st.id and mu.usage_type='featured'
    limit 1
  ) fm on true
  where ls.system='wordpress'
    and ls.source_type in ('post','page')
    and lower(st.status) in ('publish','published')
    and (st.published_at is null or st.published_at <= now())
    and m.old_path=v_path
  limit 1;

  return v_result;
end;
$$;

create or replace function public.ag05_public_sitemap_rows()
returns table(
  canonical_url text,
  modified_at timestamptz,
  source_type text,
  source_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(sm.canonical_url,''),nullif(st.canonical_url,''),ls.source_url),
    coalesce(st.modified_at,st.published_at),
    ls.source_type,
    ls.source_id
  from public.stories st
  join public.legacy_sources ls on ls.id=st.legacy_source_id
  join public.legacy_url_mappings m on m.legacy_source_id=ls.id
  left join public.seo_metadata sm on sm.legacy_source_id=ls.id
  where ls.system='wordpress'
    and ls.source_type in ('post','page')
    and lower(st.status) in ('publish','published')
    and (st.published_at is null or st.published_at <= now())
    and coalesce(lower(nullif(sm.index_policy,'')),'index') not in ('noindex','archive')
    and coalesce(lower(sm.robots),'') not like '%noindex%'
  order by st.published_at desc nulls last,ls.source_id;
$$;

create or replace function public.ag05_public_feed_rows(p_limit integer default 50)
returns table(
  title text,
  canonical_url text,
  published_at timestamptz,
  modified_at timestamptz,
  author_name text,
  description text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    st.title,
    coalesce(nullif(sm.canonical_url,''),nullif(st.canonical_url,''),ls.source_url),
    st.published_at,
    coalesce(st.modified_at,st.published_at),
    au.display_name,
    coalesce(nullif(sm.description,''),nullif(st.seo_description,''),nullif(st.standfirst,''),nullif(st.excerpt,''))
  from public.stories st
  join public.legacy_sources ls on ls.id=st.legacy_source_id
  left join public.seo_metadata sm on sm.legacy_source_id=ls.id
  left join public.authors au on au.id=st.author_id
  where ls.system='wordpress'
    and ls.source_type='post'
    and lower(st.status) in ('publish','published')
    and (st.published_at is null or st.published_at <= now())
  order by st.published_at desc nulls last,st.created_at desc
  limit least(greatest(coalesce(p_limit,50),1),200);
$$;

create or replace function public.ag05_hospaz_direct_ad_preview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'advertiser',a.name,
    'campaign',c.name,
    'placement_key',ap.placement_key,
    'placement_status',ap.status,
    'allowed_sources',ap.allowed_sources,
    'default_source',ap.default_source,
    'destination_url',ac.destination_url,
    'destination_url_state',pp.destination_url_state,
    'schedule_state',pp.schedule_state,
    'placement_conditions_state',pp.placement_conditions_state,
    'ad_inserter_placement',pp.ad_inserter_placement,
    'standalone_campaign_register_found',pp.standalone_campaign_register_found,
    'current_source_attachment_id',pp.current_source_attachment_id,
    'current_media_id',current_asset.media_id,
    'current_storage_object',current_asset.storage_object_name,
    'current_source_url',current_asset.source_url,
    'historical_assets',historical.assets
  )
  into v_result
  from public.advertisers a
  join public.ad_campaigns c on c.advertiser_id=a.id
  join public.ad_creatives ac on ac.campaign_id=c.id
  join public.ad_placements ap on ap.placement_key=ac.placement
  join public.ad_placement_provenance pp on pp.placement_id=ap.id
  left join lateral (
    select
      asa.media_id,
      ma.source_url,
      so.name as storage_object_name
    from public.ad_source_assets asa
    left join public.media_assets ma on ma.id=asa.media_id
    left join lateral (
      select o.name
      from storage.objects o
      where o.bucket_id='migrated-media'
        and o.name in (ma.storage_key,regexp_replace(ma.storage_key,'^wordpress/','wordpress/uploads/'))
      order by case when o.name=ma.storage_key then 0 else 1 end
      limit 1
    ) so on true
    where asa.source_attachment_id=pp.current_source_attachment_id
    limit 1
  ) current_asset on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'source_attachment_id',asa.source_attachment_id,
      'media_id',asa.media_id,
      'checksum_sha256',asa.checksum_sha256,
      'source_role',asa.source_role,
      'asset_source_provenance',asa.asset_source_provenance
    ) order by asa.source_attachment_id) as assets
    from public.ad_source_assets asa
    where asa.campaign_id=c.id and asa.source_attachment_id in ('32960','32971')
  ) historical on true
  where a.name='HOSPAZ'
    and ap.placement_key='hospaz-header-direct'
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.ag05_public_story_document(text) from public;
revoke all on function public.ag05_public_sitemap_rows() from public;
revoke all on function public.ag05_public_feed_rows(integer) from public;
revoke all on function public.ag05_hospaz_direct_ad_preview() from public;

grant execute on function public.ag05_public_story_document(text) to anon, authenticated;
grant execute on function public.ag05_public_sitemap_rows() to anon, authenticated;
grant execute on function public.ag05_public_feed_rows(integer) to anon, authenticated;
grant execute on function public.ag05_hospaz_direct_ad_preview() to anon, authenticated;
