-- HT-MVP-PUBLIC-LAUNCH-01-G2-LR01-R2
-- Remediation ID: DEF-G2-SQL-REVOKE-NULL-ACTOR
-- Forward-only G2 security boundary hardening for SECURITY DEFINER Newsroom & Communications RPCs.
-- Enforces active staff identity (v_actor IS NOT NULL), active registered Newsroom session
-- (public.newsroom_session_authorized()), null-safe IS DISTINCT FROM ownership checks,
-- trusted search_path, and restrictive EXECUTE grants.

begin;

-- 1. Session Revocation Hardening: public.newsroom_revoke_session(uuid, text)
create or replace function public.newsroom_revoke_session(
  p_staff_id uuid,
  p_provider_session_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_count integer;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  if p_staff_id is distinct from v_actor and not (
    public.newsroom_has_capability('staff.manage')
    or public.newsroom_has_capability('security.revoke_session')
  ) then
    raise exception using errcode = '42501', message = 'security.revoke_session or staff.manage capability required';
  end if;

  if p_staff_id is null then
    raise exception using errcode = '42501', message = 'Target staff_profile_id required';
  end if;

  update public.newsroom_sessions
  set revoked_at = coalesce(revoked_at, now()),
      revoked_by = v_actor
  where staff_profile_id = p_staff_id
    and revoked_at is null
    and (p_provider_session_id is null or provider_session_id = p_provider_session_id);

  get diagnostics v_count = row_count;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'session.revoked',
    'staff_profiles',
    p_staff_id,
    jsonb_build_object('provider_session_id', p_provider_session_id, 'revoked_count', v_count)
  );

  return v_count;
end;
$$;

-- 2. Assignment Progression Hardening: public.newsroom_progress_assignment(uuid)
create or replace function public.newsroom_progress_assignment(p_assignment_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_status text;
  v_reporter uuid;
  v_next text;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select status, reporter_staff_id
    into v_status, v_reporter
    from public.story_assignments
   where id = p_assignment_id
     for update;

  if v_reporter is null then
    raise exception using errcode = 'P0002', message = 'Assignment not found';
  end if;

  if v_reporter is distinct from v_actor and not public.newsroom_has_capability('assignment.manage') then
    raise exception using errcode = '42501', message = 'Assignment authority required';
  end if;

  v_next := case v_status
    when 'Assigned' then 'Accepted'
    when 'Accepted' then 'Reporting'
    when 'Reporting' then 'Drafting'
    when 'Drafting' then 'Submitted'
    when 'Submitted' then 'Complete'
    else v_status
  end;

  update public.story_assignments
     set status = v_next,
         updated_at = now()
   where id = p_assignment_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'assignment.status.changed',
    'story_assignments',
    p_assignment_id,
    jsonb_build_object('previous', v_status, 'new', v_next)
  );

  return v_next;
end;
$$;

-- 3. Thread Creation Ownership Null-Safety Hardening: public.newsroom_create_thread(...)
create or replace function public.newsroom_create_thread(
  p_thread_type text,
  p_title text,
  p_assignment_id uuid default null,
  p_desk_id uuid default null,
  p_priority text default 'normal',
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_type text := lower(trim(coalesce(p_thread_type, '')));
  v_priority text := lower(trim(coalesce(p_priority, 'normal')));
  v_title text := trim(coalesce(p_title, ''));
  v_id uuid;
  v_assignment public.story_assignments%rowtype;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;
  if v_type not in ('assignment', 'desk', 'breaking', 'general') then
    raise exception using errcode = '22023', message = 'Invalid thread type';
  end if;
  if v_priority not in ('normal', 'high', 'urgent') then
    raise exception using errcode = '22023', message = 'Invalid thread priority';
  end if;
  if length(v_title) < 2 or length(v_title) > 180 then
    raise exception using errcode = '22023', message = 'Thread title must be between 2 and 180 characters';
  end if;

  if v_type = 'assignment' then
    select * into v_assignment from public.story_assignments where id = p_assignment_id;
    if v_assignment.id is null then
      raise exception using errcode = 'P0002', message = 'Assignment not found';
    end if;
    if v_actor is distinct from v_assignment.reporter_staff_id
       and v_actor is distinct from v_assignment.assigned_editor_staff_id
       and v_actor is distinct from v_assignment.assigned_by
       and not public.newsroom_has_capability('assignment.manage') then
      raise exception using errcode = '42501', message = 'Assignment thread authority required';
    end if;
    p_desk_id := null;
  elsif v_type = 'desk' then
    if p_desk_id is null or not public.newsroom_can_read_desk(p_desk_id) then
      raise exception using errcode = '42501', message = 'Desk access required';
    end if;
    p_assignment_id := null;
  elsif v_type = 'breaking' then
    if not public.newsroom_has_capability('communication.breaking.manage') then
      raise exception using errcode = '42501', message = 'communication.breaking.manage capability required';
    end if;
    if p_desk_id is not null and not exists(select 1 from public.newsroom_desks where id = p_desk_id and archived_at is null) then
      raise exception using errcode = 'P0002', message = 'Desk not found';
    end if;
    p_assignment_id := null;
  else
    p_assignment_id := null;
    p_desk_id := null;
  end if;

  insert into public.newsroom_threads(thread_type, title, assignment_id, desk_id, created_by, priority, expires_at)
  values(v_type, public.newsroom_safe_editor_text(v_title), p_assignment_id, p_desk_id, v_actor, v_priority, p_expires_at)
  returning id into v_id;

  insert into public.newsroom_thread_members(thread_id, staff_profile_id, member_role)
  values(v_id, v_actor, 'owner')
  on conflict do nothing;

  if v_type = 'assignment' then
    insert into public.newsroom_thread_members(thread_id, staff_profile_id, member_role)
    select v_id, x, 'member'
    from (
      select v_assignment.reporter_staff_id x
      union select v_assignment.assigned_editor_staff_id
      union select v_assignment.assigned_by
    ) q
    where x is not null
    on conflict do nothing;
  elsif v_type = 'desk' then
    insert into public.newsroom_thread_members(thread_id, staff_profile_id, member_role)
    select v_id, dm.staff_profile_id, case when dm.member_role = 'lead' then 'owner' else 'member' end
    from public.newsroom_desk_members dm
    where dm.desk_id = p_desk_id and dm.left_at is null
    on conflict do nothing;
  end if;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'communication.thread.created',
    'newsroom_threads',
    v_id,
    jsonb_build_object('thread_type', v_type, 'assignment_id', p_assignment_id, 'desk_id', p_desk_id, 'priority', v_priority)
  );

  return v_id;
end;
$$;

-- 4. Thread Membership Hardening: public.newsroom_set_thread_member(uuid, uuid, boolean)
create or replace function public.newsroom_set_thread_member(
  p_thread_id uuid,
  p_staff_id uuid,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_thread public.newsroom_threads%rowtype;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select * into v_thread from public.newsroom_threads where id = p_thread_id;
  if v_thread.id is null then
    raise exception using errcode = 'P0002', message = 'Thread not found';
  end if;
  if not exists(select 1 from public.staff_profiles where id = p_staff_id and lower(status) = 'active') then
    raise exception using errcode = 'P0002', message = 'Active staff profile not found';
  end if;

  if v_thread.thread_type = 'assignment' then
    if not public.newsroom_has_capability('assignment.manage') then
      raise exception using errcode = '42501', message = 'assignment.manage capability required';
    end if;
  elsif v_thread.thread_type = 'desk' then
    if not public.newsroom_has_capability('communication.desk.manage') then
      raise exception using errcode = '42501', message = 'communication.desk.manage capability required';
    end if;
  elsif v_thread.thread_type = 'breaking' then
    if not public.newsroom_has_capability('communication.breaking.manage') then
      raise exception using errcode = '42501', message = 'communication.breaking.manage capability required';
    end if;
  elsif v_thread.created_by is distinct from v_actor then
    raise exception using errcode = '42501', message = 'Only the thread owner may manage general thread membership';
  end if;

  insert into public.newsroom_thread_members(thread_id, staff_profile_id, member_role, joined_at, left_at)
  values(p_thread_id, p_staff_id, 'member', now(), case when p_active then null else now() end)
  on conflict(thread_id, staff_profile_id)
  do update set
    joined_at = case when p_active then now() else public.newsroom_thread_members.joined_at end,
    left_at = case when p_active then null else now() end;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    case when p_active then 'communication.thread.member.enabled' else 'communication.thread.member.disabled' end,
    'newsroom_threads',
    p_thread_id,
    jsonb_build_object('staff_profile_id', p_staff_id)
  );
end;
$$;

-- 5. Thread Closure Hardening: public.newsroom_close_thread(uuid)
create or replace function public.newsroom_close_thread(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_thread public.newsroom_threads%rowtype;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select * into v_thread from public.newsroom_threads where id = p_thread_id for update;
  if v_thread.id is null then
    raise exception using errcode = 'P0002', message = 'Thread not found';
  end if;

  if v_thread.thread_type = 'assignment' and not public.newsroom_has_capability('assignment.manage') then
    raise exception using errcode = '42501', message = 'assignment.manage capability required';
  elsif v_thread.thread_type = 'desk' and not public.newsroom_has_capability('communication.desk.manage') then
    raise exception using errcode = '42501', message = 'communication.desk.manage capability required';
  elsif v_thread.thread_type = 'breaking' and not public.newsroom_has_capability('communication.breaking.manage') then
    raise exception using errcode = '42501', message = 'communication.breaking.manage capability required';
  elsif v_thread.thread_type = 'general' and v_thread.created_by is distinct from v_actor then
    raise exception using errcode = '42501', message = 'Only the thread owner may close this thread';
  end if;

  update public.newsroom_threads
     set status = 'closed',
         closed_at = now(),
         updated_at = now()
   where id = p_thread_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'communication.thread.closed',
    'newsroom_threads',
    p_thread_id,
    jsonb_build_object('thread_type', v_thread.thread_type)
  );
end;
$$;

-- 6. Internal Communication Attachment Finalize/Delete Hardening
create or replace function public.newsroom_finalize_communication_attachment(p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_attachment public.newsroom_communication_attachments%rowtype;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select * into v_attachment
  from public.newsroom_communication_attachments
  where id = p_attachment_id
  for update;

  if v_attachment.id is null then
    raise exception using errcode = 'P0002', message = 'Attachment not found';
  end if;
  if v_attachment.uploaded_by is distinct from v_actor then
    raise exception using errcode = '42501', message = 'Only the uploader may finalize this attachment';
  end if;
  if not public.newsroom_can_read_communication_attachment(v_attachment.id) then
    raise exception using errcode = '42501', message = 'Attachment parent access required';
  end if;
  if not exists(
    select 1 from storage.objects o
    where o.bucket_id = v_attachment.storage_bucket and o.name = v_attachment.storage_path
  ) then
    raise exception using errcode = 'P0002', message = 'Uploaded Storage object not found';
  end if;

  update public.newsroom_communication_attachments
  set status = 'ready', ready_at = coalesce(ready_at, now())
  where id = p_attachment_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'communication.attachment.ready',
    'newsroom_communication_attachments',
    p_attachment_id,
    jsonb_build_object('storage_path', v_attachment.storage_path)
  );

  return jsonb_build_object('id', p_attachment_id, 'status', 'ready', 'bucket', v_attachment.storage_bucket, 'path', v_attachment.storage_path);
end;
$$;

create or replace function public.newsroom_mark_communication_attachment_deleted(p_attachment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_attachment public.newsroom_communication_attachments%rowtype;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select * into v_attachment from public.newsroom_communication_attachments where id = p_attachment_id for update;
  if v_attachment.id is null then
    raise exception using errcode = 'P0002', message = 'Attachment not found';
  end if;
  if v_attachment.uploaded_by is distinct from v_actor
     and not public.newsroom_has_capability('story.edit_all')
     and not public.newsroom_has_capability('communication.breaking.manage')
     and not public.newsroom_has_capability('communication.desk.manage') then
    raise exception using errcode = '42501', message = 'Attachment deletion authority required';
  end if;
  if not public.newsroom_can_read_communication_attachment(v_attachment.id) then
    raise exception using errcode = '42501', message = 'Attachment parent access required';
  end if;

  update public.newsroom_communication_attachments
  set status = 'deleted', deleted_at = coalesce(deleted_at, now())
  where id = p_attachment_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'communication.attachment.deleted',
    'newsroom_communication_attachments',
    p_attachment_id,
    jsonb_build_object('storage_path', v_attachment.storage_path)
  );
end;
$$;

-- 7. Organizational Communications Attachment Finalize/Delete Hardening
create or replace function public.communications_finalize_attachment(p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_attachment public.communication_attachments%rowtype;
  v_thread uuid;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select * into v_attachment
  from public.communication_attachments
  where id = p_attachment_id
  for update;

  if v_attachment.id is null then
    raise exception using errcode = 'P0002', message = 'Attachment not found';
  end if;
  if v_attachment.uploaded_by is distinct from v_actor then
    raise exception using errcode = '42501', message = 'Only the uploader may finalize attachment';
  end if;
  if v_attachment.status <> 'pending' then
    raise exception using errcode = '22023', message = 'Only pending attachments may be finalized';
  end if;

  select thread_id into v_thread from public.communication_messages where id = v_attachment.message_id;
  if not public.communications_can_access_thread(v_thread) then
    raise exception using errcode = '42501', message = 'Communications thread access denied';
  end if;

  if not exists(
    select 1 from storage.objects o
    where o.bucket_id = v_attachment.storage_bucket and o.name = v_attachment.storage_path
  ) then
    raise exception using errcode = 'P0002', message = 'Uploaded Storage object not found';
  end if;

  update public.communication_attachments
  set status = 'ready', ready_at = now()
  where id = p_attachment_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'communications.attachment.ready',
    'communication_attachments',
    p_attachment_id,
    jsonb_build_object('scan_status', v_attachment.scan_status)
  );

  return jsonb_build_object('id', p_attachment_id, 'status', 'ready', 'scan_status', v_attachment.scan_status);
end;
$$;

create or replace function public.communications_delete_attachment(p_attachment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_attachment public.communication_attachments%rowtype;
  v_thread uuid;
begin
  if v_actor is null or not public.newsroom_session_authorized() then
    raise exception using errcode = '42501', message = 'Active Newsroom session required';
  end if;

  select * into v_attachment from public.communication_attachments where id = p_attachment_id for update;
  if v_attachment.id is null then
    raise exception using errcode = 'P0002', message = 'Attachment not found';
  end if;
  select thread_id into v_thread from public.communication_messages where id = v_attachment.message_id;

  if v_attachment.uploaded_by is distinct from v_actor
     and not public.newsroom_has_capability('communications.manage_channels')
     and not public.newsroom_has_capability('communications.close') then
    raise exception using errcode = '42501', message = 'Attachment deletion authority required';
  end if;
  if not public.communications_can_access_thread(v_thread) then
    raise exception using errcode = '42501', message = 'Communications thread access denied';
  end if;

  update public.communication_attachments
  set status = 'deleted', deleted_at = coalesce(deleted_at, now())
  where id = p_attachment_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(
    v_actor,
    'communications.attachment.deleted',
    'communication_attachments',
    p_attachment_id,
    jsonb_build_object('storage_path', v_attachment.storage_path)
  );
end;
$$;

-- 8. Explicit Function Privilege Grants (Deny PUBLIC and anon; allow authenticated and service_role)
revoke all on function public.newsroom_revoke_session(uuid, text) from public, anon;
revoke all on function public.newsroom_progress_assignment(uuid) from public, anon;
revoke all on function public.newsroom_create_thread(text, text, uuid, uuid, text, timestamptz) from public, anon;
revoke all on function public.newsroom_set_thread_member(uuid, uuid, boolean) from public, anon;
revoke all on function public.newsroom_close_thread(uuid) from public, anon;
revoke all on function public.newsroom_finalize_communication_attachment(uuid) from public, anon;
revoke all on function public.newsroom_mark_communication_attachment_deleted(uuid) from public, anon;
revoke all on function public.communications_finalize_attachment(uuid) from public, anon;
revoke all on function public.communications_delete_attachment(uuid) from public, anon;

grant execute on function public.newsroom_revoke_session(uuid, text) to authenticated, service_role;
grant execute on function public.newsroom_progress_assignment(uuid) to authenticated, service_role;
grant execute on function public.newsroom_create_thread(text, text, uuid, uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.newsroom_set_thread_member(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.newsroom_close_thread(uuid) to authenticated, service_role;
grant execute on function public.newsroom_finalize_communication_attachment(uuid) to authenticated, service_role;
grant execute on function public.newsroom_mark_communication_attachment_deleted(uuid) to authenticated, service_role;
grant execute on function public.communications_finalize_attachment(uuid) to authenticated, service_role;
grant execute on function public.communications_delete_attachment(uuid) to authenticated, service_role;

commit;
