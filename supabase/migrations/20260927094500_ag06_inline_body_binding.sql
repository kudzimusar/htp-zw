-- AG-06 residual authority R3: stable inline body binding for CMS-native stories.
-- Applies only to Newsroom native story publication authority; migrated WordPress body HTML is untouched.

begin;

create or replace function public.newsroom_inline_media_marker(p_media_id uuid)
returns text
language sql
immutable
set search_path = public
as $$
  select '<figure data-healthtimes-media-id="'||p_media_id::text||'"></figure>';
$$;

create or replace function public.newsroom_validate_inline_body_bindings(p_story_id uuid)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_story public.stories%rowtype;
  v_body text;
  v_match text[];
  v_media_id uuid;
  v_ids uuid[] := '{}'::uuid[];
  v_without_valid_markers text;
begin
  select * into v_story
  from public.stories
  where id=p_story_id;

  if v_story.id is null then
    raise exception using errcode='P0002',message='Story not found';
  end if;

  -- This validator is deliberately scoped to CMS-native Newsroom stories.
  if v_story.legacy_source_id is not null then
    return v_ids;
  end if;

  v_body := coalesce(v_story.body_html,'');

  if lower(v_body) like '%newsroom-private%' then
    raise exception using errcode='22023',message='Native public body cannot contain newsroom-private media URLs';
  end if;

  if lower(v_body) like '%/storage/v1/object/sign/%'
     or lower(v_body) like '%/storage/v1/object/sign/authenticated/%' then
    raise exception using errcode='22023',message='Native public body cannot contain signed private Storage URLs';
  end if;

  -- Only the canonical marker representation is accepted. Any other HealthTimes
  -- marker syntax remains unresolved and publication must fail closed.
  v_without_valid_markers := regexp_replace(
    v_body,
    '<figure data-healthtimes-media-id="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"></figure>',
    '',
    'g'
  );

  if lower(v_without_valid_markers) like '%data-healthtimes-media-id%' then
    raise exception using errcode='22023',message='Native body contains an unresolved HealthTimes media marker';
  end if;

  for v_match in
    select regexp_matches(
      v_body,
      '<figure data-healthtimes-media-id="([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})"></figure>',
      'g'
    )
  loop
    v_media_id := v_match[1]::uuid;

    if not exists (
      select 1
      from public.media_usage mu
      join public.media_assets ma on ma.id=mu.media_id
      where mu.story_id=p_story_id
        and mu.media_id=v_media_id
        and mu.usage_type='inline'
        and ma.storage_bucket='newsroom-private'
        and ma.mime_type like 'image/%'
        and ma.status in ('private_ready','public_staged','published')
    ) then
      raise exception using errcode='22023',message='Inline media marker is not bound to same-story inline image authority';
    end if;

    if not (v_media_id = any(v_ids)) then
      v_ids := array_append(v_ids,v_media_id);
    end if;
  end loop;

  return v_ids;
end;
$$;

revoke execute on function public.newsroom_inline_media_marker(uuid) from public,anon,authenticated;
revoke execute on function public.newsroom_validate_inline_body_bindings(uuid) from public,anon,authenticated;

commit;
