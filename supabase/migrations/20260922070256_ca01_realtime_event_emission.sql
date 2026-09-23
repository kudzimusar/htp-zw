-- CA-01 Realtime event emission.
-- Private Broadcast carries minimal invalidation hints only. Persisted rows remain authoritative.

begin;

create or replace function public.ca01_emit_story_discussion_event()
returns trigger
language plpgsql
security definer
set search_path=public,realtime
as $$
declare
  v_row public.story_internal_comments%rowtype;
begin
  v_row:=coalesce(new,old);
  perform realtime.send(
    jsonb_build_object(
      'event','story_internal_comment.changed',
      'object_id',v_row.id,
      'story_id',v_row.story_id,
      'occurred_at',now()
    ),
    'story_internal_comment.changed',
    'newsroom:story:'||v_row.story_id::text,
    true
  );
  return coalesce(new,old);
end;
$$;

create or replace function public.ca01_emit_thread_message_event()
returns trigger
language plpgsql
security definer
set search_path=public,realtime
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'event','newsroom_message.created',
      'object_id',new.id,
      'thread_id',new.thread_id,
      'occurred_at',new.created_at
    ),
    'newsroom_message.created',
    'newsroom:thread:'||new.thread_id::text,
    true
  );
  return new;
end;
$$;

create or replace function public.ca01_emit_inbox_event()
returns trigger
language plpgsql
security definer
set search_path=public,realtime
as $$
declare
  v_row public.newsroom_notifications%rowtype;
begin
  v_row:=coalesce(new,old);
  perform realtime.send(
    jsonb_build_object(
      'event','newsroom_inbox.changed',
      'object_id',v_row.id,
      'category',v_row.category,
      'priority',v_row.priority,
      'occurred_at',now()
    ),
    'newsroom_inbox.changed',
    'newsroom:inbox:'||v_row.staff_profile_id::text,
    true
  );
  return coalesce(new,old);
end;
$$;

create or replace function public.ca01_emit_assignment_event()
returns trigger
language plpgsql
security definer
set search_path=public,realtime
as $$
declare
  v_row public.story_assignments%rowtype;
begin
  v_row:=coalesce(new,old);
  perform realtime.send(
    jsonb_build_object(
      'event','story_assignment.changed',
      'object_id',v_row.id,
      'story_id',v_row.story_id,
      'status',v_row.status,
      'occurred_at',now()
    ),
    'story_assignment.changed',
    'newsroom:assignment:'||v_row.id::text,
    true
  );
  return coalesce(new,old);
end;
$$;

create or replace function public.ca01_emit_desk_thread_event()
returns trigger
language plpgsql
security definer
set search_path=public,realtime
as $$
declare
  v_row public.newsroom_threads%rowtype;
begin
  v_row:=coalesce(new,old);
  if v_row.desk_id is not null then
    perform realtime.send(
      jsonb_build_object(
        'event','newsroom_desk.changed',
        'object_id',v_row.id,
        'desk_id',v_row.desk_id,
        'thread_type',v_row.thread_type,
        'status',v_row.status,
        'occurred_at',now()
      ),
      'newsroom_desk.changed',
      'newsroom:desk:'||v_row.desk_id::text,
      true
    );
  end if;
  return coalesce(new,old);
end;
$$;

create or replace function public.ca01_emit_reader_comment_event()
returns trigger
language plpgsql
security definer
set search_path=public,realtime
as $$
declare
  v_row public.story_comments%rowtype;
begin
  v_row:=coalesce(new,old);
  perform realtime.send(
    jsonb_build_object(
      'event','reader_story_comment.changed',
      'object_id',v_row.id,
      'story_id',v_row.story_id,
      'state',v_row.state,
      'occurred_at',now()
    ),
    'reader_story_comment.changed',
    'reader:story-comments:'||v_row.story_id::text,
    true
  );
  return coalesce(new,old);
end;
$$;

drop trigger if exists ca01_story_discussion_realtime on public.story_internal_comments;
create trigger ca01_story_discussion_realtime
after insert or update on public.story_internal_comments
for each row execute function public.ca01_emit_story_discussion_event();

drop trigger if exists ca01_thread_message_realtime on public.newsroom_messages;
create trigger ca01_thread_message_realtime
after insert on public.newsroom_messages
for each row execute function public.ca01_emit_thread_message_event();

drop trigger if exists ca01_inbox_realtime on public.newsroom_notifications;
create trigger ca01_inbox_realtime
after insert or update of read_at,acknowledged_at,archived_at on public.newsroom_notifications
for each row execute function public.ca01_emit_inbox_event();

drop trigger if exists ca01_assignment_realtime on public.story_assignments;
create trigger ca01_assignment_realtime
after insert or update of status,story_id,reporter_staff_id,assigned_editor_staff_id on public.story_assignments
for each row execute function public.ca01_emit_assignment_event();

drop trigger if exists ca01_desk_thread_realtime on public.newsroom_threads;
create trigger ca01_desk_thread_realtime
after insert or update of status,priority,desk_id on public.newsroom_threads
for each row execute function public.ca01_emit_desk_thread_event();

drop trigger if exists ca01_reader_comment_realtime on public.story_comments;
create trigger ca01_reader_comment_realtime
after insert or update of state,edited_at on public.story_comments
for each row execute function public.ca01_emit_reader_comment_event();

revoke execute on function public.ca01_emit_story_discussion_event() from public,anon,authenticated;
revoke execute on function public.ca01_emit_thread_message_event() from public,anon,authenticated;
revoke execute on function public.ca01_emit_inbox_event() from public,anon,authenticated;
revoke execute on function public.ca01_emit_assignment_event() from public,anon,authenticated;
revoke execute on function public.ca01_emit_desk_thread_event() from public,anon,authenticated;
revoke execute on function public.ca01_emit_reader_comment_event() from public,anon,authenticated;

commit;
