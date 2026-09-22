-- CA-01 private Realtime topic authorization.
-- Realtime transports event hints only; persisted rows remain authoritative.

begin;

create or replace function public.ca01_safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path=public
as $$
begin
  if p_value is null or p_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.newsroom_can_join_realtime_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_kind text:=split_part(coalesce(p_topic,''),':',2);
  v_id uuid:=public.ca01_safe_uuid(split_part(coalesce(p_topic,''),':',3));
  v_staff uuid:=public.newsroom_current_staff_id_basic();
begin
  if split_part(coalesce(p_topic,''),':',1)<>'newsroom'
     or not public.newsroom_session_authorized()
     or v_id is null then
    return false;
  end if;

  if v_kind='story' then
    return public.newsroom_can_read_story(v_id);
  elsif v_kind='assignment' then
    return exists(
      select 1 from public.story_assignments a
      where a.id=v_id
        and (
          a.reporter_staff_id=v_staff
          or a.assigned_editor_staff_id=v_staff
          or a.assigned_by=v_staff
          or public.newsroom_has_capability('assignment.manage')
        )
    );
  elsif v_kind='thread' then
    return public.newsroom_can_read_thread(v_id);
  elsif v_kind='desk' then
    return public.newsroom_can_read_desk(v_id);
  elsif v_kind='inbox' then
    return v_id=v_staff;
  end if;
  return false;
end;
$$;

create or replace function public.newsroom_can_use_presence(p_topic text)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select split_part(coalesce(p_topic,''),':',1)='newsroom'
    and split_part(coalesce(p_topic,''),':',2)='thread'
    and exists(
      select 1
      from public.newsroom_threads t
      where t.id=public.ca01_safe_uuid(split_part(coalesce(p_topic,''),':',3))
        and t.thread_type='breaking'
        and t.status='open'
        and (t.expires_at is null or t.expires_at>now())
        and public.newsroom_can_read_thread(t.id)
    );
$$;

create or replace function public.reader_can_join_comment_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select auth.uid() is not null
    and split_part(coalesce(p_topic,''),':',1)='reader'
    and split_part(coalesce(p_topic,''),':',2)='story-comments'
    and public.reader_story_discussion_visible(
      public.ca01_safe_uuid(split_part(coalesce(p_topic,''),':',3))
    );
$$;

revoke execute on function public.ca01_safe_uuid(text) from public,anon,authenticated;
revoke execute on function public.newsroom_can_join_realtime_topic(text) from public,anon;
revoke execute on function public.newsroom_can_use_presence(text) from public,anon;
revoke execute on function public.reader_can_join_comment_topic(text) from public,anon;
grant execute on function public.newsroom_can_join_realtime_topic(text) to authenticated;
grant execute on function public.newsroom_can_use_presence(text) to authenticated;
grant execute on function public.reader_can_join_comment_topic(text) to authenticated;

drop policy if exists ca01_newsroom_broadcast_read on realtime.messages;
create policy ca01_newsroom_broadcast_read
on realtime.messages
for select to authenticated
using (
  realtime.messages.extension='broadcast'
  and public.newsroom_can_join_realtime_topic((select realtime.topic()))
);

drop policy if exists ca01_breaking_presence_read on realtime.messages;
create policy ca01_breaking_presence_read
on realtime.messages
for select to authenticated
using (
  realtime.messages.extension='presence'
  and public.newsroom_can_use_presence((select realtime.topic()))
);

drop policy if exists ca01_breaking_presence_write on realtime.messages;
create policy ca01_breaking_presence_write
on realtime.messages
for insert to authenticated
with check (
  realtime.messages.extension='presence'
  and public.newsroom_can_use_presence((select realtime.topic()))
);

drop policy if exists ca01_reader_comment_broadcast_read on realtime.messages;
create policy ca01_reader_comment_broadcast_read
on realtime.messages
for select to authenticated
using (
  realtime.messages.extension='broadcast'
  and public.reader_can_join_comment_topic((select realtime.topic()))
);

commit;
