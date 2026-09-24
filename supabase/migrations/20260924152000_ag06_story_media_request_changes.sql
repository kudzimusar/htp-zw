-- AG-06 / CA-01 bounded Newsroom story-media + request-changes workflow.
-- Extends existing media_assets/media_usage. Does not reuse CA-01/COM-01 communication attachments.
-- New editorial uploads remain private in newsroom-private. No migrated-media promotion is introduced here.

begin;

alter table public.media_assets
  add column if not exists byte_size bigint,
  add column if not exists source_provenance text,
  add column if not exists uploaded_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_media_assets_newsroom_status
  on public.media_assets(storage_bucket,status,created_at desc);

create index if not exists idx_media_assets_uploaded_by
  on public.media_assets(uploaded_by_staff_id,created_at desc);

create index if not exists idx_media_usage_story_media
  on public.media_usage(story_id,media_id,usage_type);

create or replace function public.newsroom_media_usage_type_valid(p_usage_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(p_usage_type,''))) in ('featured_image','inline_image','supporting_document');
$$;

create or replace function public.newsroom_can_read_media(p_media_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_staff uuid := public.newsroom_current_staff_id_basic();
  v_asset public.media_assets%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    return false;
  end if;

  select * into v_asset
  from public.media_assets
  where id=p_media_id;

  if v_asset.id is null then return false; end if;

  if public.newsroom_has_capability('story.edit_all')
     or v_asset.uploaded_by_staff_id=v_staff then
    return true;
  end if;

  return exists (
    select 1
    from public.media_usage mu
    where mu.media_id=p_media_id
      and mu.story_id is not null
      and public.newsroom_can_read_story(mu.story_id)
  );
end;
$$;

create or replace function public.newsroom_prepare_story_media(
  p_story_id uuid,
  p_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_checksum text default null,
  p_alt_text text default null,
  p_caption text default null,
  p_credit text default null,
  p_source_provenance text default null,
  p_usage_type text default 'inline_image'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_media_id uuid := gen_random_uuid();
  v_filename text;
  v_mime text := lower(trim(coalesce(p_mime_type,'')));
  v_usage text := lower(trim(coalesce(p_usage_type,'')));
  v_path text;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501',message='media.manage capability required';
  end if;
  if not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501',message='Story edit authority required for media attachment';
  end if;

  if v_mime not in (
    'image/jpeg','image/png','image/webp',
    'application/pdf','text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception using errcode='22023',message='Unsupported Newsroom media type';
  end if;

  if coalesce(p_byte_size,0) <= 0 or p_byte_size > 15728640 then
    raise exception using errcode='22023',message='Newsroom media must be between 1 byte and 15 MB';
  end if;

  if not public.newsroom_media_usage_type_valid(v_usage) then
    raise exception using errcode='22023',message='Unsupported story media usage role';
  end if;

  if v_usage in ('featured_image','inline_image') and v_mime not like 'image/%' then
    raise exception using errcode='22023',message='Image usage roles require an image MIME type';
  end if;

  if v_usage='supporting_document' and v_mime like 'image/%' then
    raise exception using errcode='22023',message='Supporting document requires a document MIME type';
  end if;

  if v_mime like 'image/%' and length(trim(coalesce(p_alt_text,''))) < 2 then
    raise exception using errcode='22023',message='Image alt text is required';
  end if;

  if nullif(trim(coalesce(p_source_provenance,'')),'') is null then
    raise exception using errcode='22023',message='Source/provenance is required';
  end if;

  if nullif(trim(coalesce(p_checksum,'')),'') is not null
     and trim(p_checksum) !~* '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='Checksum must be SHA-256 hexadecimal';
  end if;

  v_filename := regexp_replace(trim(coalesce(p_filename,'')),'[^A-Za-z0-9._-]+','-','g');
  v_filename := regexp_replace(v_filename,'^-+|-+$','','g');
  if length(v_filename)<1 then
    raise exception using errcode='22023',message='A safe filename is required';
  end if;
  if length(v_filename)>120 then
    v_filename := right(v_filename,120);
  end if;

  v_path := 'story-media/'||p_story_id::text||'/'||v_media_id::text||'/'||v_filename;

  insert into public.media_assets(
    id,source_url,storage_bucket,storage_key,public_url,checksum,mime_type,filename,
    alt_text,caption,credit,status,byte_size,source_provenance,uploaded_by_staff_id,created_at,updated_at
  ) values(
    v_media_id,null,'newsroom-private',v_path,null,lower(nullif(trim(p_checksum),'')),v_mime,v_filename,
    nullif(trim(p_alt_text),''),nullif(trim(p_caption),''),nullif(trim(p_credit),''),
    'upload_pending',p_byte_size,trim(p_source_provenance),v_actor,now(),now()
  );

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.media.prepared','media_assets',v_media_id,
    jsonb_build_object(
      'story_id',p_story_id,'usage_type',v_usage,'storage_bucket','newsroom-private',
      'filename',v_filename,'mime_type',v_mime,'byte_size',p_byte_size
    ));

  return jsonb_build_object(
    'media_id',v_media_id,
    'story_id',p_story_id,
    'usage_type',v_usage,
    'storage_bucket','newsroom-private',
    'storage_key',v_path,
    'filename',v_filename,
    'mime_type',v_mime,
    'byte_size',p_byte_size,
    'status','upload_pending'
  );
end;
$$;

create or replace function public.newsroom_media_upload_context(p_media_id uuid,p_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_asset public.media_assets%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501',message='Story media authority required';
  end if;

  select * into v_asset
  from public.media_assets
  where id=p_media_id
    and storage_bucket='newsroom-private'
    and status='upload_pending';

  if v_asset.id is null then
    raise exception using errcode='P0002',message='Pending story media not found';
  end if;

  if v_asset.uploaded_by_staff_id<>v_actor
     and not public.newsroom_has_capability('story.edit_all') then
    raise exception using errcode='42501',message='Pending media belongs to another staff member';
  end if;

  return jsonb_build_object(
    'media_id',v_asset.id,'story_id',p_story_id,
    'storage_bucket',v_asset.storage_bucket,'storage_key',v_asset.storage_key,
    'filename',v_asset.filename,'mime_type',v_asset.mime_type,'byte_size',v_asset.byte_size
  );
end;
$$;

create or replace function public.newsroom_finalize_story_media(
  p_media_id uuid,
  p_story_id uuid,
  p_usage_type text,
  p_checksum text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_asset public.media_assets%rowtype;
  v_usage text := lower(trim(coalesce(p_usage_type,'')));
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501',message='Story media authority required';
  end if;
  if not public.newsroom_media_usage_type_valid(v_usage) then
    raise exception using errcode='22023',message='Unsupported story media usage role';
  end if;

  select * into v_asset
  from public.media_assets
  where id=p_media_id
    and storage_bucket='newsroom-private'
    and status='upload_pending'
  for update;

  if v_asset.id is null then
    raise exception using errcode='P0002',message='Pending story media not found';
  end if;
  if v_asset.uploaded_by_staff_id<>v_actor
     and not public.newsroom_has_capability('story.edit_all') then
    raise exception using errcode='42501',message='Pending media belongs to another staff member';
  end if;

  if nullif(trim(coalesce(p_checksum,'')),'') is not null
     and trim(p_checksum) !~* '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='Checksum must be SHA-256 hexadecimal';
  end if;

  update public.media_assets
  set status='private_ready',
      checksum=coalesce(lower(nullif(trim(p_checksum),'')),checksum),
      updated_at=now()
  where id=p_media_id;

  insert into public.media_usage(media_id,story_id,usage_type,source_context)
  values(
    p_media_id,p_story_id,v_usage,
    jsonb_build_object(
      'attachment_state','private_draft',
      'attached_by',v_actor,
      'attached_at',now(),
      'caption',v_asset.caption,
      'credit',v_asset.credit,
      'source_provenance',v_asset.source_provenance
    )
  )
  on conflict (media_id,story_id,usage_type)
  do update set source_context=excluded.source_context;

  perform set_config('app.newsroom_rpc','1',true);
  update public.stories
  set lock_version=lock_version+1,last_saved_by=v_actor,updated_at=now(),modified_at=now()
  where id=p_story_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.media.attached','stories',p_story_id,
    jsonb_build_object('media_id',p_media_id,'usage_type',v_usage,'storage_bucket','newsroom-private'));

  return jsonb_build_object('media_id',p_media_id,'story_id',p_story_id,'usage_type',v_usage,'status','private_ready');
end;
$$;

create or replace function public.newsroom_attach_story_media(
  p_media_id uuid,
  p_story_id uuid,
  p_usage_type text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_usage text := lower(trim(coalesce(p_usage_type,'')));
  v_asset public.media_assets%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501',message='Story media authority required';
  end if;
  if not public.newsroom_media_usage_type_valid(v_usage) then
    raise exception using errcode='22023',message='Unsupported story media usage role';
  end if;
  if not public.newsroom_can_read_media(p_media_id) then
    raise exception using errcode='42501',message='Media is not available to this staff session';
  end if;

  select * into v_asset from public.media_assets where id=p_media_id;
  if v_asset.id is null or v_asset.storage_bucket<>'newsroom-private'
     or v_asset.status not in ('private_ready','published') then
    raise exception using errcode='22023',message='Only ready Newsroom media can be attached';
  end if;

  if v_usage in ('featured_image','inline_image') and v_asset.mime_type not like 'image/%' then
    raise exception using errcode='22023',message='Image usage roles require image media';
  end if;
  if v_usage='supporting_document' and v_asset.mime_type like 'image/%' then
    raise exception using errcode='22023',message='Supporting document requires document media';
  end if;

  insert into public.media_usage(media_id,story_id,usage_type,source_context)
  values(p_media_id,p_story_id,v_usage,
    jsonb_build_object('attachment_state','private_draft','attached_by',v_actor,'attached_at',now()))
  on conflict (media_id,story_id,usage_type) do nothing;

  perform set_config('app.newsroom_rpc','1',true);
  update public.stories set lock_version=lock_version+1,last_saved_by=v_actor,updated_at=now(),modified_at=now()
  where id=p_story_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.media.attached','stories',p_story_id,
    jsonb_build_object('media_id',p_media_id,'usage_type',v_usage,'storage_bucket',v_asset.storage_bucket));
end;
$$;

create or replace function public.newsroom_detach_story_media(
  p_media_id uuid,
  p_story_id uuid,
  p_usage_type text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_usage text := lower(trim(coalesce(p_usage_type,'')));
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501',message='Story media authority required';
  end if;

  delete from public.media_usage
  where media_id=p_media_id and story_id=p_story_id and usage_type=v_usage;
  if not found then
    raise exception using errcode='P0002',message='Story media attachment not found';
  end if;

  perform set_config('app.newsroom_rpc','1',true);
  update public.stories set lock_version=lock_version+1,last_saved_by=v_actor,updated_at=now(),modified_at=now()
  where id=p_story_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.media.detached','stories',p_story_id,
    jsonb_build_object('media_id',p_media_id,'usage_type',v_usage));
end;
$$;

create or replace function public.newsroom_update_story_media_metadata(
  p_media_id uuid,
  p_alt_text text default null,
  p_caption text default null,
  p_credit text default null,
  p_source_provenance text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_asset public.media_assets%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or not public.newsroom_can_read_media(p_media_id) then
    raise exception using errcode='42501',message='Media authority required';
  end if;

  select * into v_asset from public.media_assets where id=p_media_id for update;
  if v_asset.id is null then raise exception using errcode='P0002',message='Media not found'; end if;

  if v_asset.mime_type like 'image/%' and length(trim(coalesce(p_alt_text,v_asset.alt_text,'')))<2 then
    raise exception using errcode='22023',message='Image alt text is required';
  end if;

  update public.media_assets
  set alt_text=coalesce(nullif(trim(p_alt_text),''),alt_text),
      caption=case when p_caption is null then caption else nullif(trim(p_caption),'') end,
      credit=case when p_credit is null then credit else nullif(trim(p_credit),'') end,
      source_provenance=coalesce(nullif(trim(p_source_provenance),''),source_provenance),
      updated_at=now()
  where id=p_media_id;
end;
$$;

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
  v_limit integer := least(greatest(coalesce(p_limit,100),1),250);
  v_q text := nullif(lower(trim(coalesce(p_search,''))),'');
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage') then
    raise exception using errcode='42501',message='media.manage capability required';
  end if;

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
  where public.newsroom_can_read_media(ma.id)
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

create or replace function public.newsroom_get_media_preview(p_media_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_asset public.media_assets%rowtype;
begin
  if not public.newsroom_can_read_media(p_media_id) then
    raise exception using errcode='42501',message='Media is not available to this staff session';
  end if;
  select * into v_asset from public.media_assets where id=p_media_id;
  return jsonb_build_object(
    'media_id',v_asset.id,'storage_bucket',v_asset.storage_bucket,'storage_key',v_asset.storage_key,
    'mime_type',v_asset.mime_type,'filename',v_asset.filename,'status',v_asset.status,
    'public_url',v_asset.public_url
  );
end;
$$;

create or replace function public.newsroom_request_story_changes(p_story_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_story public.stories%rowtype;
  v_current text;
  v_reason text := trim(coalesce(p_reason,''));
  v_reporter uuid;
  v_review_id uuid;
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;

  if not (
    public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.fact_check')
    or public.newsroom_has_capability('story.health_review')
    or public.newsroom_has_capability('story.copy_edit')
    or public.newsroom_has_capability('story.publish')
  ) then
    raise exception using errcode='42501',message='Editorial review capability required';
  end if;

  if length(v_reason)<3 then
    raise exception using errcode='22023',message='A non-empty editorial reason is required';
  end if;

  select * into v_story from public.stories where id=p_story_id for update;
  if v_story.id is null then raise exception using errcode='P0002',message='Story not found'; end if;

  v_current := coalesce(v_story.workflow_status,
    case when lower(v_story.status) in ('publish','published') then 'Published' else initcap(v_story.status) end);

  if v_current not in ('Submitted','Fact check','Health / Science review','Copy edit','Editor review','Ready') then
    raise exception using errcode='22023',message='Story is not currently eligible for requested changes';
  end if;

  select reporter_staff_id into v_reporter
  from public.story_assignments
  where story_id=p_story_id
    and reporter_staff_id is not null
  order by updated_at desc,created_at desc
  limit 1;

  if v_reporter is null then
    select sp.id into v_reporter
    from public.staff_profiles sp
    join public.newsroom_roles r on r.id=sp.role_id
    where sp.id=v_story.owner_staff_id
      and r.name='Reporter / Journalist'
    limit 1;
  end if;

  if v_reporter is null then
    raise exception using errcode='22023',message='Story has no Reporter to return changes to';
  end if;

  insert into public.story_reviews(
    story_id,review_type,assigned_to,status,notes,completed_at,completed_by,created_by,created_at,updated_at
  ) values(
    p_story_id,'editorial_review',v_reporter,'changes_requested',v_reason,now(),v_actor,v_actor,now(),now()
  ) returning id into v_review_id;

  perform set_config('app.newsroom_rpc','1',true);
  update public.stories
  set workflow_status='Draft',status='draft',lock_version=lock_version+1,last_saved_by=v_actor,
      updated_at=now(),modified_at=now()
  where id=p_story_id;

  update public.story_assignments
  set status='Drafting',updated_at=now()
  where story_id=p_story_id and reporter_staff_id=v_reporter and status<>'Complete';

  insert into public.story_lifecycle_events(story_id,from_status,to_status,actor_staff_id,reason)
  values(p_story_id,v_current,'Draft',v_actor,'Changes requested: '||v_reason);

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.changes_requested','stories',p_story_id,
    jsonb_build_object('review_id',v_review_id,'previous',v_current,'new','Draft','reason',v_reason,'reporter_staff_id',v_reporter));

  insert into public.newsroom_notifications(
    staff_profile_id,event_type,target_table,target_id,payload,actor_staff_id,category,priority,requires_ack,created_at
  ) values(
    v_reporter,'story.changes_requested','stories',p_story_id,
    jsonb_build_object('story_id',p_story_id,'title',v_story.title,'reason',v_reason,'from_status',v_current,'to_status','Draft','review_id',v_review_id),
    v_actor,'review','normal',false,now()
  );

  return jsonb_build_object(
    'story_id',p_story_id,'review_id',v_review_id,'previous_status',v_current,
    'status','Draft','reporter_staff_id',v_reporter,'reason',v_reason
  );
end;
$$;

alter table public.media_assets enable row level security;
alter table public.media_usage enable row level security;

revoke all on public.media_assets from anon, authenticated;
revoke all on public.media_usage from anon, authenticated;

drop policy if exists ag06_newsroom_private_insert on storage.objects;
drop policy if exists ag06_newsroom_private_update on storage.objects;
drop policy if exists ag06_newsroom_private_read on storage.objects;

create policy ag06_newsroom_private_read on storage.objects
for select to authenticated
using (
  bucket_id='newsroom-private'
  and exists (
    select 1 from public.media_assets ma
    where ma.storage_bucket=objects.bucket_id
      and ma.storage_key=objects.name
      and public.newsroom_can_read_media(ma.id)
  )
);

revoke execute on function public.newsroom_media_usage_type_valid(text) from public,anon;
revoke execute on function public.newsroom_can_read_media(uuid) from public,anon;
revoke execute on function public.newsroom_prepare_story_media(uuid,text,text,bigint,text,text,text,text,text,text) from public,anon;
revoke execute on function public.newsroom_media_upload_context(uuid,uuid) from public,anon;
revoke execute on function public.newsroom_finalize_story_media(uuid,uuid,text,text) from public,anon;
revoke execute on function public.newsroom_attach_story_media(uuid,uuid,text) from public,anon;
revoke execute on function public.newsroom_detach_story_media(uuid,uuid,text) from public,anon;
revoke execute on function public.newsroom_update_story_media_metadata(uuid,text,text,text,text) from public,anon;
revoke execute on function public.newsroom_list_media(text,integer) from public,anon;
revoke execute on function public.newsroom_get_media_preview(uuid) from public,anon;
revoke execute on function public.newsroom_request_story_changes(uuid,text) from public,anon;

grant execute on function public.newsroom_can_read_media(uuid) to authenticated;
grant execute on function public.newsroom_prepare_story_media(uuid,text,text,bigint,text,text,text,text,text,text) to authenticated;
grant execute on function public.newsroom_media_upload_context(uuid,uuid) to authenticated;
grant execute on function public.newsroom_finalize_story_media(uuid,uuid,text,text) to authenticated;
grant execute on function public.newsroom_attach_story_media(uuid,uuid,text) to authenticated;
grant execute on function public.newsroom_detach_story_media(uuid,uuid,text) to authenticated;
grant execute on function public.newsroom_update_story_media_metadata(uuid,text,text,text,text) to authenticated;
grant execute on function public.newsroom_list_media(text,integer) to authenticated;
grant execute on function public.newsroom_get_media_preview(uuid) to authenticated;
grant execute on function public.newsroom_request_story_changes(uuid,text) to authenticated;

commit;
