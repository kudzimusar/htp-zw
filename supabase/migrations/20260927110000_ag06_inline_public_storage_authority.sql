-- Extend the accepted public Storage insert and rollback authority to the
-- same-story inline images certified by the R3 body marker validator.
-- The earlier applied migrations remain immutable.

begin;

create or replace function public.newsroom_can_promote_public_media_object(p_bucket text,p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_story text := split_part(coalesce(p_name,''),'/',2);
  v_media text := split_part(coalesce(p_name,''),'/',3);
  v_checksum text := split_part(coalesce(p_name,''),'/',4);
  v_filename text := split_part(coalesce(p_name,''),'/',5);
  v_story_id uuid;
  v_media_id uuid;
begin
  if p_bucket <> 'newsroom-public'
     or split_part(coalesce(p_name,''),'/',1) <> 'story-media'
     or coalesce(p_name,'') !~ '^story-media/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[0-9a-fA-F]{64}/[A-Za-z0-9._-]+$'
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
    from public.media_usage mu
    join public.media_assets ma on ma.id=mu.media_id
    join public.stories s on s.id=mu.story_id
    where mu.story_id=v_story_id
      and mu.media_id=v_media_id
      and (
        mu.usage_type='featured'
        or (
          mu.usage_type='inline'
          and lower(coalesce(s.access_policy,'public'))='public'
          and ma.id=any(public.newsroom_validate_inline_body_bindings(v_story_id))
        )
      )
      and ma.storage_bucket='newsroom-private'
      and ma.status in ('private_ready','public_staged','published')
      and ma.filename=v_filename
      and coalesce(s.workflow_status,'') in ('Ready','Scheduled','Published','Updated / Corrected')
  );
end;
$$;

create or replace function public.newsroom_can_delete_staged_public_media_object(p_bucket text,p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if p_bucket <> 'newsroom-public'
     or not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    return false;
  end if;

  return exists(
    select 1
    from public.media_assets ma
    join public.media_usage mu on mu.media_id=ma.id
    join public.stories s on s.id=mu.story_id
    where ma.public_storage_bucket=p_bucket
      and ma.public_storage_key=p_name
      and ma.status='public_staged'
      and (
        mu.usage_type='featured'
        or (mu.usage_type='inline' and lower(coalesce(s.access_policy,'public'))='public')
      )
      and coalesce(s.workflow_status,'') <> 'Published'
  );
end;
$$;

revoke execute on function public.newsroom_can_promote_public_media_object(text,text) from public, anon;
grant execute on function public.newsroom_can_promote_public_media_object(text,text) to authenticated;
revoke execute on function public.newsroom_can_delete_staged_public_media_object(text,text) from public, anon;
grant execute on function public.newsroom_can_delete_staged_public_media_object(text,text) to authenticated;

commit;
