-- Migration: 20261101210000_ht_mvp_r3_public_feed_documents.sql
-- Module: Reader Feed Performance & LCP Critical Path Remediation (HT-MVP-UIAT-IMP-01-R3)
-- Scope:
--   1. Batch public feed document RPC (ag05_public_feed_documents) returning complete
--      story teaser documents for the initial reader feed in a single round-trip.
--   2. Eliminates sequential N-round-trip RPC waterfalls on reader homepage ingress.
--   3. Strictly enforces premium teaser boundaries (body_html null for premium, 
--      first editorial paragraph in premium_teaser_html).

create or replace function public.ag05_public_feed_documents(p_limit int default 50)
returns jsonb
security definer
language plpgsql
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 40), 1), 100);
  v_result jsonb;
begin
  with top_stories as (
    select st.id, st.title, st.published_at, st.modified_at, st.access_policy, st.body_html, st.standfirst, st.excerpt,
           st.legacy_source_id, st.author_id, st.primary_section_id
    from public.stories st
    join public.legacy_sources ls on ls.id = st.legacy_source_id
    where ls.system = 'wordpress'
      and ls.source_type = 'post'
      and lower(st.status) in ('publish', 'published')
      and (st.published_at is null or st.published_at <= now())
    order by st.published_at desc nulls last, st.created_at desc
    limit v_limit
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'story_id', st.id,
      'source_id', ls.source_id,
      'source_type', ls.source_type,
      'source_url', ls.source_url,
      'old_path', m.old_path,
      'new_path', m.new_path,
      'handling', m.preservation_strategy,
      'http_status', m.redirect_status,
      'title', coalesce(nullif(sm.title,''), nullif(st.title,'')),
      'story_title', st.title,
      'description', coalesce(
        nullif(sm.description,''),
        nullif(st.standfirst,''),
        nullif(st.excerpt,'')
      ),
      'canonical_url', coalesce(nullif(sm.canonical_url,''), ls.source_url),
      'open_graph_image', coalesce(
        nullif(sm.open_graph_image,''),
        case when fm.storage_object_name is not null then '/storage/' || fm.storage_object_name else null end,
        fm.source_url
      ),
      'featured_storage_object', fm.storage_object_name,
      'featured_source_url', fm.source_url,
      'featured_alt_text', fm.alt_text,
      'published_at', st.published_at,
      'modified_at', coalesce(st.modified_at, st.published_at),
      'author', case when au.id is null then null else jsonb_build_object(
        'name', au.display_name,
        'slug', au.slug,
        'bio', au.bio
      ) end,
      'section', case when sec.id is null then null else jsonb_build_object(
        'name', sec.name,
        'slug', sec.slug
      ) end,
      'access_policy', st.access_policy,
      'body_html', case when lower(st.access_policy) = 'public' then st.body_html else null end,
      'premium_teaser_html', case when lower(st.access_policy) != 'public' then public.ag05_first_editorial_paragraph_html(st.body_html) else null end,
      'standfirst', st.standfirst,
      'excerpt', st.excerpt
    )
    order by st.published_at desc nulls last
  ), '[]'::jsonb)
  into v_result
  from top_stories st
  join public.legacy_sources ls on ls.id = st.legacy_source_id
  left join public.legacy_url_mappings m on m.legacy_source_id = ls.id
  left join public.seo_metadata sm on sm.legacy_source_id = ls.id
  left join public.authors au on au.id = st.author_id
  left join public.sections sec on sec.id = st.primary_section_id
  left join lateral (
    select
      ma.source_url,
      ma.alt_text,
      so.name as storage_object_name
    from public.media_usage mu
    join public.media_assets ma on ma.id = mu.media_id
    left join lateral (
      select o.name
      from storage.objects o
      where o.bucket_id = 'migrated-media'
        and o.name in (
          ma.storage_key,
          regexp_replace(ma.storage_key, '^wordpress/', 'wordpress/uploads/')
        )
      order by case when o.name = ma.storage_key then 0 else 1 end
      limit 1
    ) so on true
    where mu.story_id = st.id and mu.usage_type = 'featured'
    limit 1
  ) fm on true;

  return v_result;
end;
$$;

grant execute on function public.ag05_public_feed_documents(int) to anon, authenticated, service_role;
