-- HT-NR-05B-R1: Story Media Integrity & Pre-Stage Deletion Replacement
-- Provides story-scoped media listing and bounded pre-stage public storage cleanup.
-- Additive lineage: replaces only delete authorization helper and adds story-scoped reader RPC.

begin;

create or replace function public.newsroom_list_story_media(p_story_id uuid)
returns table(
  id uuid,
  source_url text,
  storage_bucket text,
  storage_key text,
  public_url text,
  checksum text,
  mime_type text,
  filename text,
  alt_text text,
  caption text,
  credit text,
  width integer,
  height integer,
  status text,
  byte_size bigint,
  source_provenance text,
  uploaded_by_staff_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  usage jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or not public.newsroom_can_edit_story(p_story_id)
     or not exists (select 1 from public.stories s where s.id = p_story_id) then
    raise exception using errcode='42501', message='media.manage and story edit authority required';
  end if;

  return query
  select ma.id,
         ma.source_url,
         ma.storage_bucket,
         ma.storage_key,
         ma.public_url,
         ma.checksum,
         ma.mime_type,
         ma.filename,
         ma.alt_text,
         ma.caption,
         ma.credit,
         ma.width,
         ma.height,
         ma.status,
         ma.byte_size,
         ma.source_provenance,
         ma.uploaded_by_staff_id,
         ma.created_at,
         ma.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'story_id', mu.story_id,
             'usage_type', mu.usage_type,
             'source_context', mu.source_context
           ) order by
               case mu.usage_type
                 when 'featured' then 1
                 when 'inline' then 2
                 when 'supporting_document' then 3
                 else 4
               end,
               mu.usage_type)
           from public.media_usage mu
           where mu.media_id = ma.id and mu.story_id = p_story_id
         ), '[]'::jsonb) as usage
  from public.media_assets ma
  where exists (
    select 1
    from public.media_usage mu
    where mu.media_id = ma.id
      and mu.story_id = p_story_id
  )
  order by
    (
      select min(
        case mu.usage_type
          when 'featured' then 1
          when 'inline' then 2
          when 'supporting_document' then 3
          else 4
        end
      )
      from public.media_usage mu
      where mu.media_id = ma.id and mu.story_id = p_story_id
    ),
    ma.created_at desc,
    ma.id;
end;
$$;

create or replace function public.newsroom_can_delete_staged_public_media_object(p_bucket text, p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_story text := split_part(coalesce(p_name, ''), '/', 2);
  v_media text := split_part(coalesce(p_name, ''), '/', 3);
  v_checksum text := split_part(coalesce(p_name, ''), '/', 4);
  v_filename text := split_part(coalesce(p_name, ''), '/', 5);
  v_story_id uuid;
  v_media_id uuid;
begin
  if p_bucket <> 'newsroom-public'
     or split_part(coalesce(p_name, ''), '/', 1) <> 'story-media'
     or coalesce(p_name, '') !~ '^story-media/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[0-9a-fA-F]{64}/[A-Za-z0-9._-]+$'
     or v_checksum !~* '^[0-9a-f]{64}$'
     or not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    return false;
  end if;

  begin
    v_story_id := v_story::uuid;
    v_media_id := v_media::uuid;
  exception when others then
    return false;
  end;

  return exists(
    select 1
    from public.media_assets ma
    join public.media_usage mu on mu.media_id = ma.id
    join public.stories s on s.id = mu.story_id
    where mu.story_id = v_story_id
      and mu.media_id = v_media_id
      and ma.filename = v_filename
      and ma.storage_bucket = 'newsroom-private'
      and ma.status in ('private_ready', 'public_staged')
      and ma.status <> 'published'
      and coalesce(s.workflow_status, '') <> 'Published'
      and (
        (ma.status = 'public_staged' and (ma.public_storage_key = p_name or ma.public_storage_key is null))
        or
        (ma.status = 'private_ready')
      )
      and (
        mu.usage_type = 'featured'
        or (
          mu.usage_type = 'inline'
          and lower(coalesce(s.access_policy, 'public')) = 'public'
          and ma.id = any(public.newsroom_validate_inline_body_bindings(v_story_id))
        )
      )
  );
end;
$$;

revoke execute on function public.newsroom_list_story_media(uuid) from public, anon;
grant execute on function public.newsroom_list_story_media(uuid) to authenticated;

revoke execute on function public.newsroom_can_delete_staged_public_media_object(text, text) from public, anon;
grant execute on function public.newsroom_can_delete_staged_public_media_object(text, text) to authenticated;

commit;
