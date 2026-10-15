-- COM-01 private organizational communication attachments.
-- Separate from CA-01 internal Newsroom attachment authority.
-- Forward-only staging implementation. No production mutation.

begin;

create table public.communication_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.communication_messages(id) on delete restrict,
  uploaded_by uuid references public.staff_profiles(id) on delete set null,
  storage_bucket text not null default 'communications-private',
  storage_path text not null unique,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  sha256 text,
  status text not null default 'pending' check (status in ('pending','ready','quarantined','rejected','deleted')),
  scan_status text not null default 'not_configured' check (scan_status in ('not_configured','pending','clean','suspicious','malicious','error')),
  quarantine_reason text,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  deleted_at timestamptz,
  constraint communication_attachment_size check (byte_size > 0 and byte_size <= 10485760)
);

create index idx_communication_attachments_message
  on public.communication_attachments(message_id,created_at)
  where status <> 'deleted';

alter table public.communication_attachments enable row level security;
revoke all on public.communication_attachments from public,anon,authenticated;
grant select on public.communication_attachments to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'communications-private',
  'communications-private',
  false,
  10485760,
  array[
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.communications_can_access_attachment(p_attachment_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select public.newsroom_session_authorized()
    and exists(
      select 1
      from public.communication_attachments a
      join public.communication_messages m on m.id=a.message_id
      where a.id=p_attachment_id
        and a.status='ready'
        and public.communications_can_access_thread(m.thread_id)
    );
$$;

create policy com01_attachments_read
on public.communication_attachments
for select to authenticated
using (public.communications_can_access_attachment(id));

drop policy if exists com01_communications_private_read on storage.objects;
create policy com01_communications_private_read
on storage.objects
for select to authenticated
using (
  bucket_id='communications-private'
  and exists(
    select 1
    from public.communication_attachments a
    where a.storage_bucket=bucket_id
      and a.storage_path=name
      and a.status='ready'
      and public.communications_can_access_attachment(a.id)
  )
);

drop policy if exists com01_communications_private_insert on storage.objects;
create policy com01_communications_private_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id='communications-private'
  and exists(
    select 1
    from public.communication_attachments a
    join public.communication_messages m on m.id=a.message_id
    where a.storage_bucket=bucket_id
      and a.storage_path=name
      and a.status='pending'
      and a.uploaded_by=public.newsroom_current_staff_id_basic()
      and public.communications_can_access_thread(m.thread_id)
  )
);

create or replace function public.communications_prepare_attachment(
  p_message_id uuid,
  p_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_thread uuid;
  v_id uuid:=gen_random_uuid();
  v_filename text:=trim(coalesce(p_filename,''));
  v_mime text:=lower(trim(coalesce(p_mime_type,'')));
  v_ext text:=lower(regexp_replace(v_filename,'^.*\.','',''));
  v_path text;
  v_status text:='pending';
  v_reason text;
begin
  if not public.newsroom_has_capability('communications.reply') then
    raise exception using errcode='42501',message='communications.reply capability required';
  end if;

  select thread_id into v_thread from public.communication_messages where id=p_message_id;
  if v_thread is null then raise exception using errcode='P0002',message='Communication message not found'; end if;
  if not public.communications_can_access_thread(v_thread) then
    raise exception using errcode='42501',message='Communications thread access denied';
  end if;

  if length(v_filename)<1 or length(v_filename)>180 or v_filename~'[\\\/]' or v_filename like '%..%' then
    raise exception using errcode='22023',message='Invalid attachment filename';
  end if;
  if coalesce(p_byte_size,0)<=0 or p_byte_size>10485760 then
    raise exception using errcode='22023',message='Attachment must be between 1 byte and 10 MiB';
  end if;
  if p_sha256 is not null and p_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception using errcode='22023',message='Invalid SHA-256 value';
  end if;

  if v_ext in ('exe','com','bat','cmd','js','mjs','cjs','html','htm','svg','php','phtml','sh','bash','zsh','ps1','jar','apk','dmg','pkg','msi','scr','vbs','wsf') then
    v_status:='quarantined';
    v_reason:='dangerous_extension';
  elsif v_mime not in (
    'application/pdf','text/plain','image/jpeg','image/png','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) then
    v_status:='quarantined';
    v_reason:='mime_not_allowed';
  elsif (v_ext='pdf' and v_mime<>'application/pdf')
     or (v_ext in ('jpg','jpeg') and v_mime<>'image/jpeg')
     or (v_ext='png' and v_mime<>'image/png')
     or (v_ext='webp' and v_mime<>'image/webp')
     or (v_ext='txt' and v_mime<>'text/plain')
     or (v_ext='docx' and v_mime<>'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
     or (v_ext='xlsx' and v_mime<>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then
    v_status:='quarantined';
    v_reason:='extension_mime_mismatch';
  end if;

  v_path:='thread/'||v_thread::text||'/message/'||p_message_id::text||'/'||v_id::text||'/'||v_filename;

  insert into public.communication_attachments(
    id,message_id,uploaded_by,storage_path,filename,mime_type,byte_size,sha256,status,scan_status,quarantine_reason
  ) values(
    v_id,p_message_id,v_actor,v_path,v_filename,v_mime,p_byte_size,lower(p_sha256),v_status,'not_configured',v_reason
  );

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(
    v_actor,
    case when v_status='quarantined' then 'communications.attachment.quarantined' else 'communications.attachment.prepared' end,
    'communication_attachments',v_id,
    jsonb_build_object('message_id',p_message_id,'mime_type',v_mime,'byte_size',p_byte_size,'reason',v_reason)
  );

  return jsonb_build_object(
    'id',v_id,
    'bucket','communications-private',
    'path',v_path,
    'status',v_status,
    'scan_status','not_configured',
    'quarantine_reason',v_reason
  );
end;
$$;

create or replace function public.communications_finalize_attachment(p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,storage
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_attachment public.communication_attachments%rowtype;
  v_thread uuid;
begin
  select * into v_attachment
  from public.communication_attachments
  where id=p_attachment_id
  for update;

  if v_attachment.id is null then raise exception using errcode='P0002',message='Attachment not found'; end if;
  if v_attachment.uploaded_by<>v_actor then raise exception using errcode='42501',message='Only the uploader may finalize attachment'; end if;
  if v_attachment.status<>'pending' then raise exception using errcode='22023',message='Only pending attachments may be finalized'; end if;

  select thread_id into v_thread from public.communication_messages where id=v_attachment.message_id;
  if not public.communications_can_access_thread(v_thread) then
    raise exception using errcode='42501',message='Communications thread access denied';
  end if;

  if not exists(
    select 1 from storage.objects o
    where o.bucket_id=v_attachment.storage_bucket and o.name=v_attachment.storage_path
  ) then
    raise exception using errcode='P0002',message='Uploaded Storage object not found';
  end if;

  update public.communication_attachments
  set status='ready',ready_at=now()
  where id=p_attachment_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communications.attachment.ready','communication_attachments',p_attachment_id,
    jsonb_build_object('scan_status',v_attachment.scan_status));

  return jsonb_build_object('id',p_attachment_id,'status','ready','scan_status',v_attachment.scan_status);
end;
$$;

create or replace function public.communications_mark_attachment_scan(
  p_attachment_id uuid,
  p_scan_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_scan_status not in ('pending','clean','suspicious','malicious','error','not_configured') then
    raise exception using errcode='22023',message='Invalid scan status';
  end if;

  update public.communication_attachments
  set scan_status=p_scan_status,
      quarantine_reason=case
        when p_scan_status in ('suspicious','malicious','error') then coalesce(nullif(p_reason,''),p_scan_status)
        else quarantine_reason
      end,
      status=case
        when p_scan_status in ('suspicious','malicious') then 'quarantined'
        when p_scan_status='error' and status='pending' then 'quarantined'
        else status
      end
  where id=p_attachment_id;

  if not found then raise exception using errcode='P0002',message='Attachment not found'; end if;
end;
$$;

create or replace function public.communications_delete_attachment(p_attachment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_attachment public.communication_attachments%rowtype;
  v_thread uuid;
begin
  select * into v_attachment from public.communication_attachments where id=p_attachment_id for update;
  if v_attachment.id is null then raise exception using errcode='P0002',message='Attachment not found'; end if;
  select thread_id into v_thread from public.communication_messages where id=v_attachment.message_id;

  if v_attachment.uploaded_by<>v_actor
     and not public.newsroom_has_capability('communications.manage_channels')
     and not public.newsroom_has_capability('communications.close') then
    raise exception using errcode='42501',message='Attachment deletion authority required';
  end if;
  if not public.communications_can_access_thread(v_thread) then
    raise exception using errcode='42501',message='Communications thread access denied';
  end if;

  update public.communication_attachments
  set status='deleted',deleted_at=coalesce(deleted_at,now())
  where id=p_attachment_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communications.attachment.deleted','communication_attachments',p_attachment_id,
    jsonb_build_object('storage_path',v_attachment.storage_path));
end;
$$;

revoke execute on function public.communications_can_access_attachment(uuid) from public,anon;
grant execute on function public.communications_can_access_attachment(uuid) to authenticated;

revoke execute on function public.communications_prepare_attachment(uuid,text,text,bigint,text) from public,anon;
revoke execute on function public.communications_finalize_attachment(uuid) from public,anon;
revoke execute on function public.communications_delete_attachment(uuid) from public,anon;
grant execute on function public.communications_prepare_attachment(uuid,text,text,bigint,text) to authenticated;
grant execute on function public.communications_finalize_attachment(uuid) to authenticated;
grant execute on function public.communications_delete_attachment(uuid) to authenticated;

revoke execute on function public.communications_mark_attachment_scan(uuid,text,text) from public,anon,authenticated;
grant execute on function public.communications_mark_attachment_scan(uuid,text,text) to service_role;

commit;
