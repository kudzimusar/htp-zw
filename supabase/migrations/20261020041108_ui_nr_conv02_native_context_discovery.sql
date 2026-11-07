-- UI-NR-CONV-02: Native Newsroom Explore / Category / Author context discovery convergence
-- Provides bounded public RPC newsroom_public_context_document(p_kind, p_slug, p_limit)
-- and updates newsroom_public_context_document(p_path) to delegate to it.

begin;

create or replace function public.newsroom_public_context_document(
  p_kind text,
  p_slug text,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_id uuid;
  v_name text;
  v_bio text;
  v_canonical_kind text;
  v_path text;
  v_items jsonb := '[]'::jsonb;
begin
  if v_slug = '' then
    return null;
  end if;

  if v_kind in ('category', 'section') then
    v_canonical_kind := 'category';
    v_path := '/category/' || v_slug || '/';

    select s.id, s.name
    into v_id, v_name
    from public.sections s
    where lower(s.slug) = v_slug
    order by s.created_at, s.id
    limit 1;

    if v_id is null then
      return null;
    end if;

    select coalesce(jsonb_agg(q.item order by q.published_at desc nulls last, q.created_at desc, q.story_id asc), '[]'::jsonb)
    into v_items
    from (
      select st.id as story_id,
             st.published_at,
             st.created_at,
             jsonb_build_object(
               'story_id', st.id,
               'title', st.title,
               'slug', st.slug,
               'standfirst', st.standfirst,
               'excerpt', st.excerpt,
               'canonical_url', coalesce(nullif(st.canonical_url, ''), 'https://healthtimes.co.zw/' || st.slug || '/'),
               'published_at', st.published_at,
               'modified_at', coalesce(st.modified_at, st.published_at),
               'author_name', a.display_name,
               'author_slug', a.slug,
               'section_name', sec.name,
               'section_slug', sec.slug,
               'access_policy', lower(st.access_policy),
               'featured_public_url', fm.public_url,
               'featured_alt_text', fm.alt_text,
               'featured_caption', fm.caption,
               'featured_credit', fm.credit
             ) as item
      from public.stories st
      left join public.authors a on a.id = st.author_id
      join public.sections sec on sec.id = st.primary_section_id
      left join lateral (
        select ma.public_storage_bucket, ma.public_storage_key, ma.public_url, ma.alt_text, ma.caption, ma.credit
        from public.media_usage mu
        join public.media_assets ma on ma.id = mu.media_id
        where mu.story_id = st.id
          and mu.usage_type = 'featured'
          and ma.status = 'published'
          and ma.public_storage_bucket = 'newsroom-public'
          and ma.public_storage_key is not null
          and ma.public_url is not null
        order by ma.public_published_at desc nulls last, ma.created_at desc
        limit 1
      ) fm on true
      where st.legacy_source_id is null
        and st.primary_section_id = v_id
        and lower(st.status) in ('publish', 'published')
        and coalesce((st.distribution->>'public_reader')::boolean, false) = true
        and (st.published_at is null or st.published_at <= now())
      order by st.published_at desc nulls last, st.created_at desc, st.id asc
      limit v_limit
    ) q;

  elsif v_kind = 'author' then
    v_canonical_kind := 'author';
    v_path := '/author/' || v_slug || '/';

    select a.id, a.display_name, a.bio
    into v_id, v_name, v_bio
    from public.authors a
    where lower(a.slug) = v_slug
    order by a.created_at, a.id
    limit 1;

    if v_id is null then
      return null;
    end if;

    select coalesce(jsonb_agg(q.item order by q.published_at desc nulls last, q.created_at desc, q.story_id asc), '[]'::jsonb)
    into v_items
    from (
      select st.id as story_id,
             st.published_at,
             st.created_at,
             jsonb_build_object(
               'story_id', st.id,
               'title', st.title,
               'slug', st.slug,
               'standfirst', st.standfirst,
               'excerpt', st.excerpt,
               'canonical_url', coalesce(nullif(st.canonical_url, ''), 'https://healthtimes.co.zw/' || st.slug || '/'),
               'published_at', st.published_at,
               'modified_at', coalesce(st.modified_at, st.published_at),
               'author_name', a.display_name,
               'author_slug', a.slug,
               'section_name', sec.name,
               'section_slug', sec.slug,
               'access_policy', lower(st.access_policy),
               'featured_public_url', fm.public_url,
               'featured_alt_text', fm.alt_text,
               'featured_caption', fm.caption,
               'featured_credit', fm.credit
             ) as item
      from public.stories st
      join public.authors a on a.id = st.author_id
      left join public.sections sec on sec.id = st.primary_section_id
      left join lateral (
        select ma.public_storage_bucket, ma.public_storage_key, ma.public_url, ma.alt_text, ma.caption, ma.credit
        from public.media_usage mu
        join public.media_assets ma on ma.id = mu.media_id
        where mu.story_id = st.id
          and mu.usage_type = 'featured'
          and ma.status = 'published'
          and ma.public_storage_bucket = 'newsroom-public'
          and ma.public_storage_key is not null
          and ma.public_url is not null
        order by ma.public_published_at desc nulls last, ma.created_at desc
        limit 1
      ) fm on true
      where st.legacy_source_id is null
        and st.author_id = v_id
        and lower(st.status) in ('publish', 'published')
        and coalesce((st.distribution->>'public_reader')::boolean, false) = true
        and (st.published_at is null or st.published_at <= now())
      order by st.published_at desc nulls last, st.created_at desc, st.id asc
      limit v_limit
    ) q;

  else
    -- Unsupported context kinds (e.g. topic, tag, geography, or arbitrary strings): FAIL CLOSED
    return null;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'kind', v_canonical_kind,
    'slug', v_slug,
    'name', v_name,
    'bio', case when v_canonical_kind = 'author' then v_bio else null end,
    'path', v_path,
    'canonical_url', 'https://healthtimes.co.zw' || v_path,
    'source_type', 'native-story-context',
    'handling', 'native_cms',
    'items', v_items
  ));
end;
$$;

revoke all on function public.newsroom_public_context_document(text, text, integer) from public;
grant execute on function public.newsroom_public_context_document(text, text, integer) to anon, authenticated, service_role;

create or replace function public.newsroom_public_context_document(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text := public.ag05_normalize_path(p_path);
  v_kind text;
  v_slug text;
begin
  if v_path ~ '^/category/[^/]+/$' then
    v_kind := 'category';
    v_slug := regexp_replace(v_path, '^/category/([^/]+)/$', '\1');
  elsif v_path ~ '^/section/[^/]+/$' then
    v_kind := 'section';
    v_slug := regexp_replace(v_path, '^/section/([^/]+)/$', '\1');
  elsif v_path ~ '^/author/[^/]+/$' then
    v_kind := 'author';
    v_slug := regexp_replace(v_path, '^/author/([^/]+)/$', '\1');
  else
    return null;
  end if;

  return public.newsroom_public_context_document(v_kind, v_slug, 50);
end;
$$;

revoke all on function public.newsroom_public_context_document(text) from public;
grant execute on function public.newsroom_public_context_document(text) to anon, authenticated, service_role;

commit;
