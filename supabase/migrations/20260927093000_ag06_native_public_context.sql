-- AG-06 residual authority R2: native-only public category + author context.
-- AG-05 migrated context authority is intentionally unchanged.

begin;

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
  v_id uuid;
  v_name text;
  v_bio text;
  v_items jsonb := '[]'::jsonb;
begin
  if v_path ~ '^/category/[^/]+/$' then
    v_kind := 'category';
    v_slug := regexp_replace(v_path,'^/category/([^/]+)/$','\1');

    select s.id,s.name
    into v_id,v_name
    from public.sections s
    where lower(s.slug)=lower(v_slug)
    order by s.created_at,s.id
    limit 1;

    if v_id is null then return null; end if;

    select coalesce(jsonb_agg(q.item order by q.published_at desc nulls last,q.created_at desc,q.story_id),'[]'::jsonb)
    into v_items
    from (
      select st.id as story_id,
             st.published_at,
             st.created_at,
             jsonb_build_object(
               'story_id',st.id,
               'title',st.title,
               'canonical_url',coalesce(nullif(st.canonical_url,''),'https://healthtimes.co.zw/'||st.slug||'/'),
               'published_at',st.published_at,
               'modified_at',coalesce(st.modified_at,st.published_at),
               'author_name',a.display_name,
               'author_slug',a.slug,
               'section_name',sec.name,
               'section_slug',sec.slug,
               'access_policy',lower(st.access_policy)
             ) as item
      from public.stories st
      left join public.authors a on a.id=st.author_id
      join public.sections sec on sec.id=st.primary_section_id
      where st.legacy_source_id is null
        and st.primary_section_id=v_id
        and lower(st.status) in ('publish','published')
        and coalesce((st.distribution->>'public_reader')::boolean,false)=true
        and (st.published_at is null or st.published_at<=now())
      order by st.published_at desc nulls last,st.created_at desc,st.id
      limit 50
    ) q;

  elsif v_path ~ '^/author/[^/]+/$' then
    v_kind := 'author';
    v_slug := regexp_replace(v_path,'^/author/([^/]+)/$','\1');

    select a.id,a.display_name,a.bio
    into v_id,v_name,v_bio
    from public.authors a
    where lower(a.slug)=lower(v_slug)
    order by a.created_at,a.id
    limit 1;

    if v_id is null then return null; end if;

    select coalesce(jsonb_agg(q.item order by q.published_at desc nulls last,q.created_at desc,q.story_id),'[]'::jsonb)
    into v_items
    from (
      select st.id as story_id,
             st.published_at,
             st.created_at,
             jsonb_build_object(
               'story_id',st.id,
               'title',st.title,
               'canonical_url',coalesce(nullif(st.canonical_url,''),'https://healthtimes.co.zw/'||st.slug||'/'),
               'published_at',st.published_at,
               'modified_at',coalesce(st.modified_at,st.published_at),
               'author_name',a.display_name,
               'author_slug',a.slug,
               'section_name',sec.name,
               'section_slug',sec.slug,
               'access_policy',lower(st.access_policy)
             ) as item
      from public.stories st
      join public.authors a on a.id=st.author_id
      left join public.sections sec on sec.id=st.primary_section_id
      where st.legacy_source_id is null
        and st.author_id=v_id
        and lower(st.status) in ('publish','published')
        and coalesce((st.distribution->>'public_reader')::boolean,false)=true
        and (st.published_at is null or st.published_at<=now())
      order by st.published_at desc nulls last,st.created_at desc,st.id
      limit 50
    ) q;

  else
    return null;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'kind',v_kind,
    'slug',v_slug,
    'name',v_name,
    'bio',case when v_kind='author' then v_bio else null end,
    'path',v_path,
    'canonical_url','https://healthtimes.co.zw'||v_path,
    'source_type','native-story-context',
    'handling','native_cms',
    'items',v_items
  ));
end;
$$;

revoke execute on function public.newsroom_public_context_document(text) from public;
grant execute on function public.newsroom_public_context_document(text) to anon, authenticated, service_role;

commit;
