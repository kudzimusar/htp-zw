begin;

alter table public.media_assets
  add column if not exists public_storage_bucket text,
  add column if not exists public_storage_key text,
  add column if not exists public_staged_at timestamptz,
  add column if not exists public_published_at timestamptz,
  add column if not exists public_published_by_staff_id uuid references public.staff_profiles(id) on delete set null;

create unique index if not exists idx_media_assets_public_storage_identity
  on public.media_assets(public_storage_bucket, public_storage_key)
  where public_storage_bucket is not null and public_storage_key is not null;

create index if not exists idx_media_assets_public_status
  on public.media_assets(status, public_published_at desc)
  where public_storage_bucket is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'newsroom-public',
  'newsroom-public',
  true,
  15728640,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

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
      and mu.usage_type='featured'
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
    join public.media_usage mu on mu.media_id=ma.id and mu.usage_type='featured'
    join public.stories s on s.id=mu.story_id
    where ma.public_storage_bucket=p_bucket
      and ma.public_storage_key=p_name
      and ma.status='public_staged'
      and coalesce(s.workflow_status,'') <> 'Published'
  );
end;
$$;

drop policy if exists ag06_newsroom_public_read on storage.objects;
create policy ag06_newsroom_public_read
on storage.objects
for select
to public
using (bucket_id='newsroom-public');

drop policy if exists ag06_newsroom_public_promote_insert on storage.objects;
create policy ag06_newsroom_public_promote_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id='newsroom-public'
  and public.newsroom_can_promote_public_media_object(bucket_id,name)
);

drop policy if exists ag06_newsroom_public_staged_delete on storage.objects;
create policy ag06_newsroom_public_staged_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id='newsroom-public'
  and public.newsroom_can_delete_staged_public_media_object(bucket_id,name)
);

create or replace function public.newsroom_story_media_promotion_plan(p_story_id uuid)
returns table(
  media_id uuid,
  private_bucket text,
  private_key text,
  filename text,
  mime_type text,
  byte_size bigint,
  checksum text,
  public_storage_bucket text,
  public_storage_key text,
  public_url text,
  media_status text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_story public.stories%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501',message='story.publish capability required for public media promotion';
  end if;

  select * into v_story from public.stories where id=p_story_id;
  if v_story.id is null then
    raise exception using errcode='P0002',message='Story not found';
  end if;
  if coalesce(v_story.workflow_status,'') not in ('Ready','Scheduled','Published','Updated / Corrected') then
    raise exception using errcode='22023',message='Story is not in a publication state for public media promotion';
  end if;

  return query
  select ma.id,ma.storage_bucket,ma.storage_key,ma.filename,ma.mime_type,ma.byte_size,ma.checksum,
         ma.public_storage_bucket,ma.public_storage_key,ma.public_url,ma.status
  from public.media_usage mu
  join public.media_assets ma on ma.id=mu.media_id
  where mu.story_id=p_story_id
    and mu.usage_type='featured'
    and ma.storage_bucket='newsroom-private'
    and ma.status in ('private_ready','public_staged','published')
  order by ma.created_at desc;
end;
$$;

create or replace function public.newsroom_stage_story_media_promotion(
  p_story_id uuid,
  p_media_id uuid,
  p_public_storage_key text,
  p_verified_checksum text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_asset public.media_assets%rowtype;
  v_expected_prefix text := 'story-media/'||p_story_id::text||'/'||p_media_id::text||'/';
  v_hash text := lower(trim(coalesce(p_verified_checksum,'')));
  v_expected_key text;
  v_public_url text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501',message='story.publish capability required for public media promotion';
  end if;
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='Verified SHA-256 checksum is required';
  end if;

  select ma.* into v_asset
  from public.media_assets ma
  join public.media_usage mu on mu.media_id=ma.id
  join public.stories s on s.id=mu.story_id
  where ma.id=p_media_id
    and mu.story_id=p_story_id
    and mu.usage_type='featured'
    and ma.storage_bucket='newsroom-private'
    and ma.status in ('private_ready','public_staged','published')
    and coalesce(s.workflow_status,'') in ('Ready','Scheduled','Published','Updated / Corrected')
  for update of ma;

  if v_asset.id is null then
    raise exception using errcode='P0002',message='Promotable featured Newsroom media not found';
  end if;

  if v_asset.checksum is not null and lower(v_asset.checksum)<>v_hash then
    raise exception using errcode='22023',message='Promoted media checksum does not match private custody';
  end if;

  v_expected_key := v_expected_prefix||v_hash||'/'||v_asset.filename;
  if p_public_storage_key<>v_expected_key then
    raise exception using errcode='22023',message='Public media key does not match immutable promotion identity';
  end if;

  if v_asset.status='published'
     and v_asset.public_storage_bucket='newsroom-public'
     and v_asset.public_storage_key=v_expected_key
     and v_asset.public_url is not null then
    return jsonb_build_object(
      'media_id',v_asset.id,
      'status','published',
      'public_storage_bucket',v_asset.public_storage_bucket,
      'public_storage_key',v_asset.public_storage_key,
      'public_url',v_asset.public_url,
      'checksum',coalesce(v_asset.checksum,v_hash)
    );
  end if;

  v_public_url := '/storage/v1/object/public/newsroom-public/'||v_expected_key;

  update public.media_assets
  set checksum=coalesce(checksum,v_hash),
      public_storage_bucket='newsroom-public',
      public_storage_key=v_expected_key,
      public_url=v_public_url,
      public_staged_at=now(),
      status='public_staged',
      updated_at=now()
  where id=p_media_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(
    v_actor,'story.media.public_staged','media_assets',p_media_id,
    jsonb_build_object(
      'story_id',p_story_id,
      'public_storage_bucket','newsroom-public',
      'public_storage_key',v_expected_key,
      'checksum',v_hash
    )
  );

  return jsonb_build_object(
    'media_id',p_media_id,
    'status','public_staged',
    'public_storage_bucket','newsroom-public',
    'public_storage_key',v_expected_key,
    'public_url',v_public_url,
    'checksum',v_hash
  );
end;
$$;

create or replace function public.newsroom_clear_staged_story_media(
  p_story_id uuid,
  p_media_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_asset public.media_assets%rowtype;
  v_workflow text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501',message='story.publish capability required';
  end if;

  select ma.* into v_asset
  from public.media_assets ma
  join public.media_usage mu on mu.media_id=ma.id and mu.story_id=p_story_id and mu.usage_type='featured'
  where ma.id=p_media_id
  for update of ma;

  if v_asset.id is null then
    raise exception using errcode='P0002',message='Staged media not found';
  end if;

  select s.workflow_status into v_workflow
  from public.stories s
  where s.id=p_story_id;

  if v_asset.status<>'public_staged' then
    return;
  end if;
  if coalesce(v_workflow,'')='Published' then
    raise exception using errcode='42501',message='Published public media cannot be rolled back through staging cleanup';
  end if;

  update public.media_assets
  set public_storage_bucket=null,
      public_storage_key=null,
      public_url=null,
      public_staged_at=null,
      status='private_ready',
      updated_at=now()
  where id=p_media_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.media.public_stage_cleared','media_assets',p_media_id,
    jsonb_build_object('story_id',p_story_id));
end;
$$;

create or replace function public.newsroom_transition_story(p_story_id uuid, p_next_status text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_old public.stories%rowtype;
  v_current text;
  v_next text := trim(p_next_status);
  v_allowed boolean := false;
  v_next_revision integer;
begin
  select * into v_old from public.stories where id=p_story_id for update;
  if v_old.id is null then raise exception using errcode='P0002',message='Story not found'; end if;
  v_current := coalesce(v_old.workflow_status, case when lower(v_old.status) in ('publish','published') then 'Published' else initcap(v_old.status) end);

  if v_next='Submitted' then
    v_allowed := public.newsroom_has_capability('story.submit') and public.newsroom_can_edit_story(p_story_id)
      and v_current in ('Pitch','Approved','Assigned','Reporting','Draft');
  elsif v_next='Fact check' then
    v_allowed := public.newsroom_has_capability('story.fact_check') and v_current in ('Submitted','Fact check');
  elsif v_next='Health / Science review' then
    v_allowed := public.newsroom_has_capability('story.health_review') and v_current in ('Fact check','Health / Science review');
  elsif v_next='Copy edit' then
    v_allowed := public.newsroom_has_capability('story.copy_edit') and v_current in ('Health / Science review','Copy edit');
  elsif v_next='Editor review' then
    v_allowed := (public.newsroom_has_capability('story.edit_all') or public.newsroom_has_capability('story.copy_edit'))
      and v_current in ('Copy edit','Editor review');
  elsif v_next='Ready' then
    v_allowed := public.newsroom_has_capability('story.edit_all') and v_current in ('Editor review','Ready');
  elsif v_next='Scheduled' then
    v_allowed := public.newsroom_has_capability('story.publish') and v_current in ('Ready','Scheduled');
  elsif v_next='Published' then
    v_allowed := public.newsroom_has_capability('story.publish') and v_current in ('Ready','Scheduled');
  elsif v_next='Updated / Corrected' then
    v_allowed := public.newsroom_has_capability('story.correct') and v_current='Published' and nullif(trim(coalesce(p_reason,'')),'') is not null;
  elsif v_next='Archived' then
    v_allowed := public.newsroom_has_capability('story.edit_all') and v_current <> 'Published';
  end if;

  if not v_allowed then
    raise exception using errcode='42501', message='Workflow transition is not authorized';
  end if;

  if v_next='Published' and exists(
    select 1
    from public.media_usage mu
    join public.media_assets ma on ma.id=mu.media_id
    where mu.story_id=p_story_id
      and mu.usage_type='featured'
      and ma.storage_bucket='newsroom-private'
      and (
        ma.status not in ('public_staged','published')
        or ma.public_storage_bucket<>'newsroom-public'
        or ma.public_storage_key is null
        or ma.public_url is null
      )
  ) then
    raise exception using errcode='22023',message='Featured Newsroom media must be promoted before publication';
  end if;

  perform set_config('app.newsroom_rpc','1',true);

  update public.stories
  set workflow_status=v_next,
      status=case when v_next in ('Published','Updated / Corrected') then 'publish'
                  when v_next='Archived' then 'draft'
                  else status end,
      published_at=case when v_next='Published' then coalesce(published_at,now()) else published_at end,
      lock_version=lock_version+1,
      last_saved_by=v_actor,
      modified_at=now(),
      updated_at=now()
  where id=p_story_id;

  if v_next='Published' then
    update public.media_assets ma
    set status='published',
        public_published_at=coalesce(ma.public_published_at,now()),
        public_published_by_staff_id=coalesce(ma.public_published_by_staff_id,v_actor),
        updated_at=now()
    from public.media_usage mu
    where mu.story_id=p_story_id
      and mu.media_id=ma.id
      and mu.usage_type='featured'
      and ma.storage_bucket='newsroom-private'
      and ma.status='public_staged';

    insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
    select v_actor,'story.media.published','media_assets',ma.id,
      jsonb_build_object(
        'story_id',p_story_id,
        'public_storage_bucket',ma.public_storage_bucket,
        'public_storage_key',ma.public_storage_key,
        'checksum',ma.checksum
      )
    from public.media_usage mu
    join public.media_assets ma on ma.id=mu.media_id
    where mu.story_id=p_story_id
      and mu.usage_type='featured'
      and ma.storage_bucket='newsroom-private'
      and ma.status='published'
      and ma.public_published_by_staff_id=v_actor
      and ma.public_published_at is not null;
  end if;

  insert into public.story_lifecycle_events(story_id,from_status,to_status,actor_staff_id,reason)
  values(p_story_id,v_current,v_next,v_actor,p_reason);

  if v_next in ('Submitted','Published','Updated / Corrected') then
    select coalesce(max(revision_number),0)+1 into v_next_revision from public.story_revisions where story_id=p_story_id;
    insert into public.story_revisions(story_id,revision_number,title,body_html,body_json,editor_id,change_summary)
    select id,v_next_revision,title,body_html,body_json,v_actor,'Workflow milestone: '||v_next
    from public.stories where id=p_story_id;
    delete from public.story_autosaves where story_id=p_story_id;
  end if;

  if v_current in ('Fact check','Health / Science review','Copy edit','Editor review') and v_next<>v_current then
    insert into public.story_reviews(story_id,review_type,assigned_to,status,notes,completed_at,completed_by,created_by)
    values(
      p_story_id,
      case v_current when 'Fact check' then 'fact_check' when 'Health / Science review' then 'health_review' when 'Copy edit' then 'copy_edit' else 'editor_review' end,
      v_actor,'approved',public.newsroom_safe_editor_text(p_reason),now(),v_actor,v_actor
    );
  end if;

  if v_next='Updated / Corrected' then
    insert into public.story_corrections(story_id,reason,changed_by,previous_revision_id,new_revision_id)
    select p_story_id,p_reason,v_actor,
      (select id from public.story_revisions where story_id=p_story_id order by revision_number desc offset 1 limit 1),
      (select id from public.story_revisions where story_id=p_story_id order by revision_number desc limit 1);
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,
    case when v_next='Published' then 'story.published' when v_next='Submitted' then 'story.submitted' else 'story.transitioned' end,
    'stories',p_story_id,jsonb_build_object('previous',v_current,'new',v_next,'reason',p_reason));

  return v_next;
end;
$$;

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

revoke execute on function public.newsroom_can_promote_public_media_object(text,text) from public, anon;
grant execute on function public.newsroom_can_promote_public_media_object(text,text) to authenticated;

revoke execute on function public.newsroom_can_delete_staged_public_media_object(text,text) from public, anon;
grant execute on function public.newsroom_can_delete_staged_public_media_object(text,text) to authenticated;

revoke execute on function public.newsroom_story_media_promotion_plan(uuid) from public, anon;
grant execute on function public.newsroom_story_media_promotion_plan(uuid) to authenticated;

revoke execute on function public.newsroom_stage_story_media_promotion(uuid,uuid,text,text) from public, anon;
grant execute on function public.newsroom_stage_story_media_promotion(uuid,uuid,text,text) to authenticated;

revoke execute on function public.newsroom_clear_staged_story_media(uuid,uuid) from public, anon;
grant execute on function public.newsroom_clear_staged_story_media(uuid,uuid) to authenticated;

revoke execute on function public.newsroom_transition_story(uuid,text,text) from public, anon;
grant execute on function public.newsroom_transition_story(uuid,text,text) to authenticated;

revoke execute on function public.newsroom_public_story_document(text) from public;
grant execute on function public.newsroom_public_story_document(text) to anon, authenticated;

commit;
