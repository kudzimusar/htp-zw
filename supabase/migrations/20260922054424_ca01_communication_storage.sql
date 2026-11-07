-- CA-01 confidential communication attachment boundary.

begin;

create table if not exists public.newsroom_communication_attachments (
  id uuid primary key default gen_random_uuid(),
  story_internal_comment_id uuid references public.story_internal_comments(id) on delete restrict,
  newsroom_message_id uuid references public.newsroom_messages(id) on delete restrict,
  uploaded_by uuid not null references public.staff_profiles(id),
  storage_bucket text not null default 'newsroom-communications-private',
  storage_path text not null unique,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  sha256 text,
  status text not null default 'pending' check (status in ('pending','ready','deleted')),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  deleted_at timestamptz,
  constraint newsroom_communication_attachment_parent_check
    check (num_nonnulls(story_internal_comment_id,newsroom_message_id)=1),
  constraint newsroom_communication_attachment_size_check
    check (byte_size>0 and byte_size<=10485760)
);

create index if not exists idx_newsroom_communication_attachments_story
  on public.newsroom_communication_attachments(story_internal_comment_id)
  where story_internal_comment_id is not null and status<>'deleted';
create index if not exists idx_newsroom_communication_attachments_message
  on public.newsroom_communication_attachments(newsroom_message_id)
  where newsroom_message_id is not null and status<>'deleted';

alter table public.newsroom_communication_attachments enable row level security;
revoke all on public.newsroom_communication_attachments from public,anon,authenticated;
grant select on public.newsroom_communication_attachments to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'newsroom-communications-private',
  'newsroom-communications-private',
  false,
  10485760,
  array[
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.newsroom_can_read_communication_attachment(p_attachment_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select public.newsroom_session_authorized()
    and exists(
      select 1
      from public.newsroom_communication_attachments a
      where a.id=p_attachment_id
        and a.status<>'deleted'
        and (
          (
            a.story_internal_comment_id is not null
            and exists(
              select 1 from public.story_internal_comments c
              where c.id=a.story_internal_comment_id
                and public.newsroom_can_read_story(c.story_id)
            )
          )
          or (
            a.newsroom_message_id is not null
            and exists(
              select 1 from public.newsroom_messages m
              where m.id=a.newsroom_message_id
                and public.newsroom_can_read_thread(m.thread_id)
            )
          )
        )
    );
$$;

drop policy if exists ca01_communication_attachments_read on public.newsroom_communication_attachments;
create policy ca01_communication_attachments_read
on public.newsroom_communication_attachments
for select to authenticated
using (public.newsroom_can_read_communication_attachment(id));

drop policy if exists ca01_communications_private_read on storage.objects;
create policy ca01_communications_private_read
on storage.objects
for select to authenticated
using (
  bucket_id='newsroom-communications-private'
  and exists(
    select 1
    from public.newsroom_communication_attachments a
    where a.storage_bucket=bucket_id
      and a.storage_path=name
      and a.status='ready'
      and public.newsroom_can_read_communication_attachment(a.id)
  )
);

create or replace function public.newsroom_prepare_communication_attachment(
  p_story_internal_comment_id uuid default null,
  p_newsroom_message_id uuid default null,
  p_filename text default null,
  p_mime_type text default null,
  p_byte_size bigint default null,
  p_sha256 text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,storage
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_id uuid:=gen_random_uuid();
  v_filename text:=trim(coalesce(p_filename,''));
  v_mime text:=lower(trim(coalesce(p_mime_type,'')));
  v_path text;
  v_story_id uuid;
  v_thread_id uuid;
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;
  if num_nonnulls(p_story_internal_comment_id,p_newsroom_message_id)<>1 then
    raise exception using errcode='22023',message='Exactly one attachment parent is required';
  end if;
  if length(v_filename)<1 or length(v_filename)>180 or v_filename~'[\\/]' or v_filename like '%..%' then
    raise exception using errcode='22023',message='Invalid attachment filename';
  end if;
  if v_mime not in (
    'application/pdf','text/plain','image/jpeg','image/png','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception using errcode='22023',message='Attachment MIME type is not permitted';
  end if;
  if coalesce(p_byte_size,0)<=0 or p_byte_size>10485760 then
    raise exception using errcode='22023',message='Attachment must be between 1 byte and 10 MiB';
  end if;
  if p_sha256 is not null and p_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception using errcode='22023',message='Invalid SHA-256 value';
  end if;

  if p_story_internal_comment_id is not null then
    select c.story_id into v_story_id
    from public.story_internal_comments c
    where c.id=p_story_internal_comment_id;
    if v_story_id is null then raise exception using errcode='P0002',message='Story comment not found'; end if;
    if not public.newsroom_can_read_story(v_story_id) then
      raise exception using errcode='42501',message='Story access required';
    end if;
    v_path:='story/'||v_story_id::text||'/'||p_story_internal_comment_id::text||'/'||v_id::text||'/'||v_filename;
  else
    select m.thread_id into v_thread_id
    from public.newsroom_messages m
    where m.id=p_newsroom_message_id;
    if v_thread_id is null then raise exception using errcode='P0002',message='Thread message not found'; end if;
    if not public.newsroom_can_read_thread(v_thread_id) then
      raise exception using errcode='42501',message='Thread access required';
    end if;
    v_path:='thread/'||v_thread_id::text||'/'||p_newsroom_message_id::text||'/'||v_id::text||'/'||v_filename;
  end if;

  insert into public.newsroom_communication_attachments(
    id,story_internal_comment_id,newsroom_message_id,uploaded_by,storage_path,
    filename,mime_type,byte_size,sha256,status
  )
  values(
    v_id,p_story_internal_comment_id,p_newsroom_message_id,v_actor,v_path,
    v_filename,v_mime,p_byte_size,lower(p_sha256),'pending'
  );

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.attachment.prepared','newsroom_communication_attachments',v_id,
    jsonb_build_object('storage_path',v_path,'mime_type',v_mime,'byte_size',p_byte_size));

  return jsonb_build_object(
    'id',v_id,
    'bucket','newsroom-communications-private',
    'path',v_path,
    'filename',v_filename,
    'mime_type',v_mime,
    'byte_size',p_byte_size
  );
end;
$$;

create or replace function public.newsroom_finalize_communication_attachment(p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,storage
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_attachment public.newsroom_communication_attachments%rowtype;
begin
  select * into v_attachment
  from public.newsroom_communication_attachments
  where id=p_attachment_id
  for update;

  if v_attachment.id is null then raise exception using errcode='P0002',message='Attachment not found'; end if;
  if v_attachment.uploaded_by<>v_actor then
    raise exception using errcode='42501',message='Only the uploader may finalize this attachment';
  end if;
  if not public.newsroom_can_read_communication_attachment(v_attachment.id) then
    raise exception using errcode='42501',message='Attachment parent access required';
  end if;
  if not exists(
    select 1 from storage.objects o
    where o.bucket_id=v_attachment.storage_bucket and o.name=v_attachment.storage_path
  ) then
    raise exception using errcode='P0002',message='Uploaded Storage object not found';
  end if;

  update public.newsroom_communication_attachments
  set status='ready',ready_at=coalesce(ready_at,now())
  where id=p_attachment_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.attachment.ready','newsroom_communication_attachments',p_attachment_id,
    jsonb_build_object('storage_path',v_attachment.storage_path));

  return jsonb_build_object('id',p_attachment_id,'status','ready','bucket',v_attachment.storage_bucket,'path',v_attachment.storage_path);
end;
$$;

create or replace function public.newsroom_mark_communication_attachment_deleted(p_attachment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_attachment public.newsroom_communication_attachments%rowtype;
begin
  select * into v_attachment from public.newsroom_communication_attachments where id=p_attachment_id for update;
  if v_attachment.id is null then raise exception using errcode='P0002',message='Attachment not found'; end if;
  if v_attachment.uploaded_by<>v_actor
     and not public.newsroom_has_capability('story.edit_all')
     and not public.newsroom_has_capability('communication.breaking.manage')
     and not public.newsroom_has_capability('communication.desk.manage') then
    raise exception using errcode='42501',message='Attachment deletion authority required';
  end if;
  if not public.newsroom_can_read_communication_attachment(v_attachment.id) then
    raise exception using errcode='42501',message='Attachment parent access required';
  end if;

  update public.newsroom_communication_attachments
  set status='deleted',deleted_at=coalesce(deleted_at,now())
  where id=p_attachment_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.attachment.deleted','newsroom_communication_attachments',p_attachment_id,
    jsonb_build_object('storage_path',v_attachment.storage_path));
end;
$$;

revoke execute on function public.newsroom_can_read_communication_attachment(uuid) from public,anon;
grant execute on function public.newsroom_can_read_communication_attachment(uuid) to authenticated;

revoke execute on function public.newsroom_prepare_communication_attachment(uuid,uuid,text,text,bigint,text) from public,anon;
revoke execute on function public.newsroom_finalize_communication_attachment(uuid) from public,anon;
revoke execute on function public.newsroom_mark_communication_attachment_deleted(uuid) from public,anon;
grant execute on function public.newsroom_prepare_communication_attachment(uuid,uuid,text,text,bigint,text) to authenticated;
grant execute on function public.newsroom_finalize_communication_attachment(uuid) to authenticated;
grant execute on function public.newsroom_mark_communication_attachment_deleted(uuid) to authenticated;

commit;
