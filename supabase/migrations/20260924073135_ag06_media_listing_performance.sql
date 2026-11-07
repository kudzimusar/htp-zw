-- Optimize Newsroom media listing against the migrated media corpus without widening access.

begin;

create index if not exists idx_media_usage_media_story
  on public.media_usage(media_id,story_id,usage_type);

create index if not exists idx_media_assets_created_at
  on public.media_assets(created_at desc);

create or replace function public.newsroom_list_media(p_search text default null,p_limit integer default 100)
returns table(
  id uuid,source_url text,storage_bucket text,storage_key text,public_url text,checksum text,
  mime_type text,filename text,alt_text text,caption text,credit text,width integer,height integer,
  status text,byte_size bigint,source_provenance text,uploaded_by_staff_id uuid,
  created_at timestamptz,updated_at timestamptz,usage jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_staff uuid := public.newsroom_current_staff_id_basic();
  v_limit integer := least(greatest(coalesce(p_limit,100),1),250);
  v_q text := nullif(lower(trim(coalesce(p_search,''))),'');
  v_can_all boolean;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501',message='media.manage capability required';
  end if;

  v_can_all :=
    public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
    or public.newsroom_has_capability('story.fact_check')
    or public.newsroom_has_capability('story.health_review')
    or public.newsroom_has_capability('story.copy_edit');

  return query
  select ma.id,ma.source_url,ma.storage_bucket,ma.storage_key,ma.public_url,ma.checksum,
         ma.mime_type,ma.filename,ma.alt_text,ma.caption,ma.credit,ma.width,ma.height,
         ma.status,ma.byte_size,ma.source_provenance,ma.uploaded_by_staff_id,
         ma.created_at,ma.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'story_id',mu.story_id,'usage_type',mu.usage_type,'source_context',mu.source_context
           ) order by mu.story_id,mu.usage_type)
           from public.media_usage mu where mu.media_id=ma.id
         ),'[]'::jsonb) as usage
  from public.media_assets ma
  where (
      v_can_all
      or ma.uploaded_by_staff_id=v_staff
      or exists (
        select 1
        from public.media_usage mu
        join public.stories s on s.id=mu.story_id
        where mu.media_id=ma.id
          and (
            s.owner_staff_id=v_staff
            or exists (
              select 1 from public.story_assignments a
              where a.story_id=s.id and a.reporter_staff_id=v_staff
            )
          )
      )
    )
    and (
      v_q is null
      or lower(ma.filename) like '%'||v_q||'%'
      or lower(coalesce(ma.caption,'')) like '%'||v_q||'%'
      or lower(coalesce(ma.credit,'')) like '%'||v_q||'%'
      or lower(coalesce(ma.source_provenance,'')) like '%'||v_q||'%'
    )
  order by ma.created_at desc
  limit v_limit;
end;
$$;

revoke execute on function public.newsroom_list_media(text,integer) from public,anon;
grant execute on function public.newsroom_list_media(text,integer) to authenticated;

commit;
