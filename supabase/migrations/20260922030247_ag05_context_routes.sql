-- AG-05 post-AG04 context route contract.
-- Uses imported staging taxonomy/author identities; no second content store.
-- Historical author aliases without exact imported slug identity remain unresolved.

create or replace function public.ag05_public_context_document(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text := public.ag05_normalize_path(p_path);
  v_slug text;
  v_kind text;
  v_id uuid;
  v_name text;
  v_items jsonb;
begin
  if v_path ~ '^/category/[^/]+/$' then
    v_kind := 'category';
    v_slug := regexp_replace(v_path,'^/category/([^/]+)/$','\1');

    select id,name into v_id,v_name
    from public.sections
    where lower(slug)=lower(v_slug)
    order by created_at,id
    limit 1;

    if v_id is null then return null; end if;

    select coalesce(jsonb_agg(row_data order by published_at desc nulls last),'[]'::jsonb)
    into v_items
    from (
      select jsonb_build_object(
        'title',st.title,
        'canonical_url',coalesce(nullif(sm.canonical_url,''),nullif(st.canonical_url,''),ls.source_url),
        'published_at',st.published_at,
        'author_name',a.display_name,
        'source_id',ls.source_id
      ) row_data, st.published_at
      from public.stories st
      join public.legacy_sources ls on ls.id=st.legacy_source_id
      left join public.seo_metadata sm on sm.legacy_source_id=ls.id
      left join public.authors a on a.id=st.author_id
      where st.primary_section_id=v_id
        and lower(st.status) in ('publish','published')
        and (st.published_at is null or st.published_at<=now())
      order by st.published_at desc nulls last
      limit 50
    ) q;

  elsif v_path ~ '^/tag/[^/]+/$' then
    v_kind := 'tag';
    v_slug := regexp_replace(v_path,'^/tag/([^/]+)/$','\1');

    select id,name into v_id,v_name
    from public.tags
    where lower(slug)=lower(v_slug)
    order by created_at,id
    limit 1;

    if v_id is null then return null; end if;

    select coalesce(jsonb_agg(row_data order by published_at desc nulls last),'[]'::jsonb)
    into v_items
    from (
      select jsonb_build_object(
        'title',st.title,
        'canonical_url',coalesce(nullif(sm.canonical_url,''),nullif(st.canonical_url,''),ls.source_url),
        'published_at',st.published_at,
        'author_name',a.display_name,
        'source_id',ls.source_id
      ) row_data, st.published_at
      from public.story_tags rel
      join public.stories st on st.id=rel.story_id
      join public.legacy_sources ls on ls.id=st.legacy_source_id
      left join public.seo_metadata sm on sm.legacy_source_id=ls.id
      left join public.authors a on a.id=st.author_id
      where rel.tag_id=v_id
        and lower(st.status) in ('publish','published')
        and (st.published_at is null or st.published_at<=now())
      order by st.published_at desc nulls last
      limit 50
    ) q;

  elsif v_path ~ '^/author/[^/]+/$' then
    v_kind := 'author';
    v_slug := regexp_replace(v_path,'^/author/([^/]+)/$','\1');

    select id,display_name into v_id,v_name
    from public.authors
    where lower(slug)=lower(v_slug)
    order by created_at,id
    limit 1;

    if v_id is null then return null; end if;

    select coalesce(jsonb_agg(row_data order by published_at desc nulls last),'[]'::jsonb)
    into v_items
    from (
      select jsonb_build_object(
        'title',st.title,
        'canonical_url',coalesce(nullif(sm.canonical_url,''),nullif(st.canonical_url,''),ls.source_url),
        'published_at',st.published_at,
        'author_name',v_name,
        'source_id',ls.source_id
      ) row_data, st.published_at
      from public.stories st
      join public.legacy_sources ls on ls.id=st.legacy_source_id
      left join public.seo_metadata sm on sm.legacy_source_id=ls.id
      where st.author_id=v_id
        and lower(st.status) in ('publish','published')
        and (st.published_at is null or st.published_at<=now())
      order by st.published_at desc nulls last
      limit 50
    ) q;

  else
    return null;
  end if;

  return jsonb_build_object(
    'kind',v_kind,
    'slug',v_slug,
    'name',v_name,
    'path',v_path,
    'canonical_url','https://healthtimes.co.zw' || v_path,
    'robots','noindex,follow',
    'routing_disposition',
      case when v_kind='tag' then 'LEGACY_CONTEXT_NOINDEX'
           else 'PRESERVE_CONTEXT_NOINDEX' end,
    'items',v_items
  );
end;
$$;

revoke all on function public.ag05_public_context_document(text) from public;
grant execute on function public.ag05_public_context_document(text) to anon, authenticated;
