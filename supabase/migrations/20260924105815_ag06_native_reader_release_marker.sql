begin;

create or replace function public.newsroom_mark_public_reader_release()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.workflow_status='Published'
     and coalesce(old.workflow_status,'')<>'Published' then
    if current_setting('app.newsroom_rpc',true)<>'1' then
      raise exception using errcode='42501',message='Public Reader release marker requires Newsroom workflow authority';
    end if;
    new.distribution := jsonb_set(coalesce(new.distribution,'{}'::jsonb),'{public_reader}','true'::jsonb,true);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_newsroom_mark_public_reader_release on public.stories;
create trigger trg_newsroom_mark_public_reader_release
before update on public.stories
for each row execute function public.newsroom_mark_public_reader_release();

create or replace function public.newsroom_public_story_document(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text := public.ag05_normalize_path(p_path);
  v_result jsonb;
begin
  select jsonb_build_object(
    'story_id',s.id,
    'source_id',null,
    'source_type','native-story',
    'source_url',null,
    'old_path',v_path,
    'new_path',v_path,
    'handling','native_cms',
    'http_status',200,
    'title',coalesce(nullif(s.seo_title,''),s.title),
    'story_title',s.title,
    'description',coalesce(nullif(s.seo_description,''),nullif(s.standfirst,''),nullif(s.excerpt,'')),
    'canonical_url',coalesce(nullif(s.canonical_url,''),'https://healthtimes.co.zw/'||s.slug||'/'),
    'robots','index,follow,max-image-preview:large',
    'index_policy','index',
    'open_graph_title',coalesce(nullif(s.seo_title,''),s.title),
    'open_graph_description',coalesce(nullif(s.seo_description,''),nullif(s.standfirst,''),nullif(s.excerpt,'')),
    'open_graph_image',fm.public_url,
    'featured_storage_bucket',fm.public_storage_bucket,
    'featured_storage_object',fm.public_storage_key,
    'featured_public_url',fm.public_url,
    'featured_source_url',null,
    'featured_alt_text',fm.alt_text,
    'featured_caption',fm.caption,
    'featured_credit',fm.credit,
    'featured_checksum',fm.checksum,
    'schema_type','NewsArticle',
    'source_plugin','healthtimes-newsroom',
    'published_at',s.published_at,
    'modified_at',coalesce(s.modified_at,s.published_at),
    'author',case when a.id is null then null else jsonb_build_object(
      'name',a.display_name,
      'slug',a.slug,
      'bio',a.bio
    ) end,
    'section',case when sec.id is null then null else jsonb_build_object(
      'name',sec.name,
      'slug',sec.slug
    ) end,
    'access_policy',s.access_policy,
    'body_html',case when lower(s.access_policy)='public' then s.body_html else null end,
    'standfirst',s.standfirst,
    'excerpt',s.excerpt
  )
  into v_result
  from public.stories s
  left join public.authors a on a.id=s.author_id
  left join public.sections sec on sec.id=s.primary_section_id
  left join lateral (
    select ma.public_storage_bucket,ma.public_storage_key,ma.public_url,ma.alt_text,ma.caption,ma.credit,ma.checksum
    from public.media_usage mu
    join public.media_assets ma on ma.id=mu.media_id
    where mu.story_id=s.id
      and mu.usage_type='featured'
      and ma.status='published'
      and ma.public_storage_bucket='newsroom-public'
      and ma.public_storage_key is not null
      and ma.public_url is not null
    order by ma.public_published_at desc nulls last,ma.created_at desc
    limit 1
  ) fm on true
  where s.legacy_source_id is null
    and lower(s.status) in ('publish','published')
    and lower(s.access_policy) in ('public','premium')
    and coalesce((s.distribution->>'public_reader')::boolean,false)=true
    and (s.published_at is null or s.published_at<=now())
    and (
      public.ag05_normalize_path('/'||s.slug||'/')=v_path
      or (
        nullif(s.canonical_url,'') is not null
        and public.ag05_normalize_path(regexp_replace(s.canonical_url,'^https?://[^/]+',''))=v_path
      )
    )
  order by s.published_at desc nulls last,s.created_at desc
  limit 1;

  return v_result;
end;
$$;

revoke execute on function public.newsroom_mark_public_reader_release() from public, anon, authenticated;
grant execute on function public.newsroom_public_story_document(text) to anon, authenticated;

commit;
