-- CA-01 desk, typed-thread and announcement coordination model.

begin;

create or replace function public.newsroom_staff_can_read_thread(p_staff_id uuid,p_thread_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_thread public.newsroom_threads%rowtype;
begin
  if not exists(select 1 from public.staff_profiles sp where sp.id=p_staff_id and lower(sp.status)='active') then
    return false;
  end if;
  select * into v_thread from public.newsroom_threads where id=p_thread_id;
  if v_thread.id is null then return false; end if;

  if v_thread.thread_type='assignment' then
    return exists(
      select 1 from public.story_assignments a
      where a.id=v_thread.assignment_id
        and (
          a.reporter_staff_id=p_staff_id
          or a.assigned_editor_staff_id=p_staff_id
          or a.assigned_by=p_staff_id
          or public.newsroom_staff_has_capability(p_staff_id,'assignment.manage')
        )
    );
  elsif v_thread.thread_type='desk' then
    return public.newsroom_staff_has_capability(p_staff_id,'communication.desk.manage')
      or exists(
        select 1 from public.newsroom_desk_members dm
        where dm.desk_id=v_thread.desk_id
          and dm.staff_profile_id=p_staff_id
          and dm.left_at is null
      );
  elsif v_thread.thread_type='breaking' then
    return public.newsroom_staff_has_capability(p_staff_id,'communication.breaking.manage')
      or exists(
        select 1 from public.newsroom_thread_members tm
        where tm.thread_id=p_thread_id and tm.staff_profile_id=p_staff_id and tm.left_at is null
      );
  else
    return exists(
      select 1 from public.newsroom_thread_members tm
      where tm.thread_id=p_thread_id and tm.staff_profile_id=p_staff_id and tm.left_at is null
    );
  end if;
end;
$$;

drop policy if exists ca01_newsroom_desks_read on public.newsroom_desks;
create policy ca01_newsroom_desks_read
on public.newsroom_desks for select to authenticated
using (public.newsroom_session_authorized());

drop policy if exists ca01_newsroom_desk_members_read on public.newsroom_desk_members;
create policy ca01_newsroom_desk_members_read
on public.newsroom_desk_members for select to authenticated
using (
  public.newsroom_session_authorized()
  and (
    public.newsroom_has_capability('communication.desk.manage')
    or staff_profile_id=public.newsroom_current_staff_id_basic()
    or exists(
      select 1 from public.newsroom_desk_members mine
      where mine.desk_id=newsroom_desk_members.desk_id
        and mine.staff_profile_id=public.newsroom_current_staff_id_basic()
        and mine.left_at is null
    )
  )
);

drop policy if exists ca01_newsroom_threads_read on public.newsroom_threads;
create policy ca01_newsroom_threads_read
on public.newsroom_threads for select to authenticated
using (public.newsroom_can_read_thread(id));

drop policy if exists ca01_newsroom_thread_members_read on public.newsroom_thread_members;
create policy ca01_newsroom_thread_members_read
on public.newsroom_thread_members for select to authenticated
using (public.newsroom_can_read_thread(thread_id));

drop policy if exists ca01_newsroom_messages_read on public.newsroom_messages;
create policy ca01_newsroom_messages_read
on public.newsroom_messages for select to authenticated
using (public.newsroom_can_read_thread(thread_id));

drop policy if exists ca01_newsroom_message_mentions_read on public.newsroom_message_mentions;
create policy ca01_newsroom_message_mentions_read
on public.newsroom_message_mentions for select to authenticated
using (
  exists(
    select 1 from public.newsroom_messages m
    where m.id=message_id and public.newsroom_can_read_thread(m.thread_id)
  )
);

drop policy if exists ca01_newsroom_announcements_read on public.newsroom_announcements;
create policy ca01_newsroom_announcements_read
on public.newsroom_announcements for select to authenticated
using (public.newsroom_can_read_announcement(id));

create or replace function public.newsroom_create_desk(
  p_key text,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_id uuid;
  v_key text:=lower(trim(coalesce(p_key,'')));
  v_name text:=trim(coalesce(p_name,''));
begin
  if not public.newsroom_has_capability('communication.desk.manage') then
    raise exception using errcode='42501',message='communication.desk.manage capability required';
  end if;
  if v_key !~ '^[a-z0-9][a-z0-9_-]{1,63}$' then
    raise exception using errcode='22023',message='Invalid desk key';
  end if;
  if length(v_name)<2 or length(v_name)>120 then
    raise exception using errcode='22023',message='Desk name must be between 2 and 120 characters';
  end if;

  insert into public.newsroom_desks(key,name,description,created_by)
  values(v_key,v_name,public.newsroom_safe_editor_text(p_description),v_actor)
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.desk.created','newsroom_desks',v_id,jsonb_build_object('key',v_key,'name',v_name));

  return v_id;
end;
$$;

create or replace function public.newsroom_set_desk_member(
  p_desk_id uuid,
  p_staff_id uuid,
  p_member_role text default 'member',
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_role text:=lower(trim(coalesce(p_member_role,'member')));
begin
  if not public.newsroom_has_capability('communication.desk.manage') then
    raise exception using errcode='42501',message='communication.desk.manage capability required';
  end if;
  if v_role not in ('member','lead') then
    raise exception using errcode='22023',message='Invalid desk member role';
  end if;
  if not exists(select 1 from public.newsroom_desks where id=p_desk_id and archived_at is null) then
    raise exception using errcode='P0002',message='Desk not found';
  end if;
  if not exists(select 1 from public.staff_profiles where id=p_staff_id and lower(status)='active') then
    raise exception using errcode='P0002',message='Active staff profile not found';
  end if;

  insert into public.newsroom_desk_members(desk_id,staff_profile_id,member_role,added_by,joined_at,left_at)
  values(p_desk_id,p_staff_id,v_role,v_actor,now(),case when p_active then null else now() end)
  on conflict(desk_id,staff_profile_id)
  do update set
    member_role=excluded.member_role,
    added_by=v_actor,
    joined_at=case when p_active then now() else public.newsroom_desk_members.joined_at end,
    left_at=case when p_active then null else now() end;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,
    case when p_active then 'communication.desk.member.enabled' else 'communication.desk.member.disabled' end,
    'newsroom_desks',p_desk_id,jsonb_build_object('staff_profile_id',p_staff_id,'member_role',v_role));
end;
$$;

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
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_type text:=lower(trim(coalesce(p_thread_type,'')));
  v_priority text:=lower(trim(coalesce(p_priority,'normal')));
  v_title text:=trim(coalesce(p_title,''));
  v_id uuid;
  v_assignment public.story_assignments%rowtype;
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;
  if v_type not in ('assignment','desk','breaking','general') then
    raise exception using errcode='22023',message='Invalid thread type';
  end if;
  if v_priority not in ('normal','high','urgent') then
    raise exception using errcode='22023',message='Invalid thread priority';
  end if;
  if length(v_title)<2 or length(v_title)>180 then
    raise exception using errcode='22023',message='Thread title must be between 2 and 180 characters';
  end if;

  if v_type='assignment' then
    select * into v_assignment from public.story_assignments where id=p_assignment_id;
    if v_assignment.id is null then raise exception using errcode='P0002',message='Assignment not found'; end if;
    if v_actor<>v_assignment.reporter_staff_id
       and v_actor is distinct from v_assignment.assigned_editor_staff_id
       and v_actor<>v_assignment.assigned_by
       and not public.newsroom_has_capability('assignment.manage') then
      raise exception using errcode='42501',message='Assignment thread authority required';
    end if;
    p_desk_id:=null;
  elsif v_type='desk' then
    if p_desk_id is null or not public.newsroom_can_read_desk(p_desk_id) then
      raise exception using errcode='42501',message='Desk access required';
    end if;
    p_assignment_id:=null;
  elsif v_type='breaking' then
    if not public.newsroom_has_capability('communication.breaking.manage') then
      raise exception using errcode='42501',message='communication.breaking.manage capability required';
    end if;
    if p_desk_id is not null and not exists(select 1 from public.newsroom_desks where id=p_desk_id and archived_at is null) then
      raise exception using errcode='P0002',message='Desk not found';
    end if;
    p_assignment_id:=null;
  else
    p_assignment_id:=null;
    p_desk_id:=null;
  end if;

  insert into public.newsroom_threads(thread_type,title,assignment_id,desk_id,created_by,priority,expires_at)
  values(v_type,public.newsroom_safe_editor_text(v_title),p_assignment_id,p_desk_id,v_actor,v_priority,p_expires_at)
  returning id into v_id;

  insert into public.newsroom_thread_members(thread_id,staff_profile_id,member_role)
  values(v_id,v_actor,'owner')
  on conflict do nothing;

  if v_type='assignment' then
    insert into public.newsroom_thread_members(thread_id,staff_profile_id,member_role)
    select v_id,x,'member'
    from (
      select v_assignment.reporter_staff_id x
      union select v_assignment.assigned_editor_staff_id
      union select v_assignment.assigned_by
    ) q
    where x is not null
    on conflict do nothing;
  elsif v_type='desk' then
    insert into public.newsroom_thread_members(thread_id,staff_profile_id,member_role)
    select v_id,dm.staff_profile_id,case when dm.member_role='lead' then 'owner' else 'member' end
    from public.newsroom_desk_members dm
    where dm.desk_id=p_desk_id and dm.left_at is null
    on conflict do nothing;
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.thread.created','newsroom_threads',v_id,
    jsonb_build_object('thread_type',v_type,'assignment_id',p_assignment_id,'desk_id',p_desk_id,'priority',v_priority));

  return v_id;
end;
$$;

create or replace function public.newsroom_set_thread_member(
  p_thread_id uuid,
  p_staff_id uuid,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_thread public.newsroom_threads%rowtype;
begin
  select * into v_thread from public.newsroom_threads where id=p_thread_id;
  if v_thread.id is null then raise exception using errcode='P0002',message='Thread not found'; end if;
  if not exists(select 1 from public.staff_profiles where id=p_staff_id and lower(status)='active') then
    raise exception using errcode='P0002',message='Active staff profile not found';
  end if;

  if v_thread.thread_type='assignment' then
    if not public.newsroom_has_capability('assignment.manage') then
      raise exception using errcode='42501',message='assignment.manage capability required';
    end if;
  elsif v_thread.thread_type='desk' then
    if not public.newsroom_has_capability('communication.desk.manage') then
      raise exception using errcode='42501',message='communication.desk.manage capability required';
    end if;
  elsif v_thread.thread_type='breaking' then
    if not public.newsroom_has_capability('communication.breaking.manage') then
      raise exception using errcode='42501',message='communication.breaking.manage capability required';
    end if;
  elsif v_thread.created_by<>v_actor then
    raise exception using errcode='42501',message='Only the thread owner may manage general thread membership';
  end if;

  insert into public.newsroom_thread_members(thread_id,staff_profile_id,member_role,joined_at,left_at)
  values(p_thread_id,p_staff_id,'member',now(),case when p_active then null else now() end)
  on conflict(thread_id,staff_profile_id)
  do update set
    joined_at=case when p_active then now() else public.newsroom_thread_members.joined_at end,
    left_at=case when p_active then null else now() end;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,
    case when p_active then 'communication.thread.member.enabled' else 'communication.thread.member.disabled' end,
    'newsroom_threads',p_thread_id,jsonb_build_object('staff_profile_id',p_staff_id));
end;
$$;

create or replace function public.newsroom_post_thread_message(
  p_thread_id uuid,
  p_body text,
  p_parent_message_id uuid default null,
  p_mention_staff_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_thread public.newsroom_threads%rowtype;
  v_id uuid;
  v_parent_author uuid;
  v_mention uuid;
  v_body text:=trim(coalesce(p_body,''));
begin
  if not public.newsroom_can_read_thread(p_thread_id) then
    raise exception using errcode='42501',message='Thread access required';
  end if;
  select * into v_thread from public.newsroom_threads where id=p_thread_id;
  if v_thread.status<>'open' or (v_thread.expires_at is not null and v_thread.expires_at<=now()) then
    raise exception using errcode='42501',message='Thread is closed';
  end if;
  if length(v_body)<1 or length(v_body)>8000 then
    raise exception using errcode='22023',message='Message body must be between 1 and 8000 characters';
  end if;

  if p_parent_message_id is not null then
    select author_staff_id into v_parent_author
    from public.newsroom_messages
    where id=p_parent_message_id and thread_id=p_thread_id;
    if v_parent_author is null then
      raise exception using errcode='22023',message='Parent message must belong to the same thread';
    end if;
  end if;

  foreach v_mention in array coalesce(p_mention_staff_ids,'{}'::uuid[]) loop
    if v_mention=v_actor then continue; end if;
    if not public.newsroom_staff_can_read_thread(v_mention,p_thread_id) then
      raise exception using errcode='42501',message='Mentioned staff member does not have thread access';
    end if;
  end loop;

  insert into public.newsroom_messages(thread_id,author_staff_id,parent_message_id,body)
  values(p_thread_id,v_actor,p_parent_message_id,public.newsroom_safe_editor_text(v_body))
  returning id into v_id;

  update public.newsroom_threads set updated_at=now() where id=p_thread_id;

  insert into public.newsroom_message_mentions(message_id,mentioned_staff_id)
  select v_id,x
  from (select distinct unnest(coalesce(p_mention_staff_ids,'{}'::uuid[])) x) q
  where x<>v_actor
  on conflict do nothing;

  foreach v_mention in array coalesce(p_mention_staff_ids,'{}'::uuid[]) loop
    if v_mention<>v_actor then
      perform public.newsroom_emit_notification(
        v_mention,'communication.thread.mention','newsroom_messages',v_id,
        jsonb_build_object('thread_id',p_thread_id,'message_id',v_id,'thread_type',v_thread.thread_type),
        v_actor,'mention',case when v_thread.priority='urgent' then 'urgent' else 'normal' end,
        'mention:thread-message:'||v_id::text||':'||v_mention::text,false,v_thread.expires_at
      );
    end if;
  end loop;

  if v_parent_author is not null and v_parent_author<>v_actor
     and not (v_parent_author=any(coalesce(p_mention_staff_ids,'{}'::uuid[]))) then
    perform public.newsroom_emit_notification(
      v_parent_author,'communication.thread.reply','newsroom_messages',v_id,
      jsonb_build_object('thread_id',p_thread_id,'message_id',v_id,'parent_message_id',p_parent_message_id),
      v_actor,'mention',case when v_thread.priority='urgent' then 'urgent' else 'normal' end,
      'reply:thread-message:'||v_id::text||':'||v_parent_author::text,false,v_thread.expires_at
    );
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.message.created','newsroom_messages',v_id,
    jsonb_build_object('thread_id',p_thread_id,'thread_type',v_thread.thread_type));

  return v_id;
end;
$$;

create or replace function public.newsroom_mark_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
begin
  if not public.newsroom_can_read_thread(p_thread_id) then
    raise exception using errcode='42501',message='Thread access required';
  end if;
  insert into public.newsroom_thread_members(thread_id,staff_profile_id,member_role,joined_at,last_read_at)
  values(p_thread_id,v_actor,'member',now(),now())
  on conflict(thread_id,staff_profile_id)
  do update set last_read_at=now();
end;
$$;

create or replace function public.newsroom_close_thread(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_thread public.newsroom_threads%rowtype;
begin
  select * into v_thread from public.newsroom_threads where id=p_thread_id for update;
  if v_thread.id is null then raise exception using errcode='P0002',message='Thread not found'; end if;

  if v_thread.thread_type='assignment' and not public.newsroom_has_capability('assignment.manage') then
    raise exception using errcode='42501',message='assignment.manage capability required';
  elsif v_thread.thread_type='desk' and not public.newsroom_has_capability('communication.desk.manage') then
    raise exception using errcode='42501',message='communication.desk.manage capability required';
  elsif v_thread.thread_type='breaking' and not public.newsroom_has_capability('communication.breaking.manage') then
    raise exception using errcode='42501',message='communication.breaking.manage capability required';
  elsif v_thread.thread_type='general' and v_thread.created_by<>v_actor then
    raise exception using errcode='42501',message='Only the thread owner may close this thread';
  end if;

  update public.newsroom_threads set status='closed',closed_at=now(),updated_at=now() where id=p_thread_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.thread.closed','newsroom_threads',p_thread_id,jsonb_build_object('thread_type',v_thread.thread_type));
end;
$$;

create or replace function public.newsroom_publish_announcement(
  p_title text,
  p_body text,
  p_audience_scope text,
  p_desk_id uuid default null,
  p_priority text default 'normal',
  p_requires_ack boolean default false,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_scope text:=lower(trim(coalesce(p_audience_scope,'')));
  v_priority text:=lower(trim(coalesce(p_priority,'normal')));
  v_id uuid;
  v_recipient uuid;
begin
  if not public.newsroom_has_capability('communication.announce') then
    raise exception using errcode='42501',message='communication.announce capability required';
  end if;
  if v_scope not in ('all_staff','desk') then raise exception using errcode='22023',message='Invalid announcement audience'; end if;
  if v_priority not in ('normal','high','urgent') then raise exception using errcode='22023',message='Invalid announcement priority'; end if;
  if v_scope='desk' and not exists(select 1 from public.newsroom_desks where id=p_desk_id and archived_at is null) then
    raise exception using errcode='P0002',message='Desk not found';
  end if;
  if length(trim(coalesce(p_title,'')))<2 or length(trim(p_title))>180 then
    raise exception using errcode='22023',message='Announcement title must be between 2 and 180 characters';
  end if;
  if length(trim(coalesce(p_body,'')))<1 or length(trim(p_body))>12000 then
    raise exception using errcode='22023',message='Announcement body must be between 1 and 12000 characters';
  end if;

  insert into public.newsroom_announcements(title,body,audience_scope,desk_id,priority,requires_ack,created_by,expires_at)
  values(
    public.newsroom_safe_editor_text(trim(p_title)),
    public.newsroom_safe_editor_text(trim(p_body)),
    v_scope,case when v_scope='desk' then p_desk_id else null end,
    v_priority,p_requires_ack,v_actor,p_expires_at
  )
  returning id into v_id;

  for v_recipient in
    select sp.id
    from public.staff_profiles sp
    where lower(sp.status)='active'
      and (
        v_scope='all_staff'
        or exists(
          select 1 from public.newsroom_desk_members dm
          where dm.desk_id=p_desk_id and dm.staff_profile_id=sp.id and dm.left_at is null
        )
      )
  loop
    perform public.newsroom_emit_notification(
      v_recipient,'communication.announcement.published','newsroom_announcements',v_id,
      jsonb_build_object('announcement_id',v_id,'title',trim(p_title),'audience_scope',v_scope,'desk_id',p_desk_id),
      v_actor,'announcement',v_priority,
      'announcement:'||v_id::text||':'||v_recipient::text,p_requires_ack,p_expires_at
    );
  end loop;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.announcement.published','newsroom_announcements',v_id,
    jsonb_build_object('audience_scope',v_scope,'desk_id',p_desk_id,'priority',v_priority,'requires_ack',p_requires_ack));

  return v_id;
end;
$$;

create or replace function public.newsroom_archive_announcement(p_announcement_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
begin
  if not public.newsroom_has_capability('communication.announce') then
    raise exception using errcode='42501',message='communication.announce capability required';
  end if;
  update public.newsroom_announcements set archived_at=coalesce(archived_at,now())
  where id=p_announcement_id;
  if not found then raise exception using errcode='P0002',message='Announcement not found'; end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'communication.announcement.archived','newsroom_announcements',p_announcement_id,'{}'::jsonb);
end;
$$;

revoke execute on function public.newsroom_staff_can_read_thread(uuid,uuid) from public,anon,authenticated;

revoke execute on function public.newsroom_create_desk(text,text,text) from public,anon;
revoke execute on function public.newsroom_set_desk_member(uuid,uuid,text,boolean) from public,anon;
revoke execute on function public.newsroom_create_thread(text,text,uuid,uuid,text,timestamptz) from public,anon;
revoke execute on function public.newsroom_set_thread_member(uuid,uuid,boolean) from public,anon;
revoke execute on function public.newsroom_post_thread_message(uuid,text,uuid,uuid[]) from public,anon;
revoke execute on function public.newsroom_mark_thread_read(uuid) from public,anon;
revoke execute on function public.newsroom_close_thread(uuid) from public,anon;
revoke execute on function public.newsroom_publish_announcement(text,text,text,uuid,text,boolean,timestamptz) from public,anon;
revoke execute on function public.newsroom_archive_announcement(uuid) from public,anon;

grant execute on function public.newsroom_create_desk(text,text,text) to authenticated;
grant execute on function public.newsroom_set_desk_member(uuid,uuid,text,boolean) to authenticated;
grant execute on function public.newsroom_create_thread(text,text,uuid,uuid,text,timestamptz) to authenticated;
grant execute on function public.newsroom_set_thread_member(uuid,uuid,boolean) to authenticated;
grant execute on function public.newsroom_post_thread_message(uuid,text,uuid,uuid[]) to authenticated;
grant execute on function public.newsroom_mark_thread_read(uuid) to authenticated;
grant execute on function public.newsroom_close_thread(uuid) to authenticated;
grant execute on function public.newsroom_publish_announcement(text,text,text,uuid,text,boolean,timestamptz) to authenticated;
grant execute on function public.newsroom_archive_announcement(uuid) to authenticated;

commit;
