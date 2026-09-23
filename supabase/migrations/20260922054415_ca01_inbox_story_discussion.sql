-- CA-01 story discussion, Inbox and durable notification producers.

begin;

drop policy if exists ca01_story_comment_revisions_read on public.story_internal_comment_revisions;
create policy ca01_story_comment_revisions_read
on public.story_internal_comment_revisions
for select to authenticated
using (
  exists(
    select 1
    from public.story_internal_comments c
    where c.id=comment_id
      and public.newsroom_can_read_story(c.story_id)
  )
);

drop policy if exists ca01_story_comment_mentions_read on public.story_internal_comment_mentions;
create policy ca01_story_comment_mentions_read
on public.story_internal_comment_mentions
for select to authenticated
using (
  exists(
    select 1
    from public.story_internal_comments c
    where c.id=comment_id
      and public.newsroom_can_read_story(c.story_id)
  )
);

create or replace function public.newsroom_add_internal_comment(
  p_story_id uuid,
  p_body text,
  p_parent_comment_id uuid default null,
  p_mention_staff_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_id uuid;
  v_parent_author uuid;
  v_mention uuid;
  v_body text:=trim(coalesce(p_body,''));
begin
  if not public.newsroom_can_read_story(p_story_id) then
    raise exception using errcode='42501',message='Story access required';
  end if;
  if length(v_body)<1 or length(v_body)>8000 then
    raise exception using errcode='22023',message='Comment body must be between 1 and 8000 characters';
  end if;

  if p_parent_comment_id is not null then
    select author_staff_id into v_parent_author
    from public.story_internal_comments
    where id=p_parent_comment_id and story_id=p_story_id;
    if v_parent_author is null then
      raise exception using errcode='22023',message='Parent comment must belong to the same story';
    end if;
  end if;

  foreach v_mention in array coalesce(p_mention_staff_ids,'{}'::uuid[]) loop
    if v_mention=v_actor then continue; end if;
    if not public.newsroom_staff_can_read_story(v_mention,p_story_id) then
      raise exception using errcode='42501',message='Mentioned staff member does not have story access';
    end if;
  end loop;

  insert into public.story_internal_comments(story_id,author_staff_id,body,parent_comment_id)
  values(p_story_id,v_actor,public.newsroom_safe_editor_text(v_body),p_parent_comment_id)
  returning id into v_id;

  insert into public.story_internal_comment_mentions(comment_id,mentioned_staff_id)
  select v_id,x
  from (select distinct unnest(coalesce(p_mention_staff_ids,'{}'::uuid[])) x) q
  where x<>v_actor
  on conflict do nothing;

  foreach v_mention in array coalesce(p_mention_staff_ids,'{}'::uuid[]) loop
    if v_mention<>v_actor then
      perform public.newsroom_emit_notification(
        v_mention,'story.internal_comment.mention','story_internal_comments',v_id,
        jsonb_build_object('story_id',p_story_id,'comment_id',v_id),
        v_actor,'mention','normal',
        'mention:story-comment:'||v_id::text||':'||v_mention::text,false,null
      );
    end if;
  end loop;

  if v_parent_author is not null and v_parent_author<>v_actor
     and not (v_parent_author=any(coalesce(p_mention_staff_ids,'{}'::uuid[]))) then
    perform public.newsroom_emit_notification(
      v_parent_author,'story.internal_comment.reply','story_internal_comments',v_id,
      jsonb_build_object('story_id',p_story_id,'comment_id',v_id,'parent_comment_id',p_parent_comment_id),
      v_actor,'mention','normal',
      'reply:story-comment:'||v_id::text||':'||v_parent_author::text,false,null
    );
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.internal_comment.created','story_internal_comments',v_id,
    jsonb_build_object('story_id',p_story_id,'parent_comment_id',p_parent_comment_id));

  return v_id;
end;
$$;

create or replace function public.newsroom_add_comment(p_story_id uuid,p_body text)
returns uuid
language sql
security definer
set search_path=public,auth
as $$
  select public.newsroom_add_internal_comment(p_story_id,p_body,null,'{}'::uuid[]);
$$;

create or replace function public.newsroom_edit_internal_comment(
  p_comment_id uuid,
  p_body text,
  p_mention_staff_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_comment public.story_internal_comments%rowtype;
  v_body text:=trim(coalesce(p_body,''));
  v_mention uuid;
begin
  select * into v_comment from public.story_internal_comments where id=p_comment_id for update;
  if v_comment.id is null then raise exception using errcode='P0002',message='Comment not found'; end if;
  if not public.newsroom_can_read_story(v_comment.story_id) then
    raise exception using errcode='42501',message='Story access required';
  end if;
  if v_comment.author_staff_id<>v_actor then
    raise exception using errcode='42501',message='Only the original author may edit this comment';
  end if;
  if length(v_body)<1 or length(v_body)>8000 then
    raise exception using errcode='22023',message='Comment body must be between 1 and 8000 characters';
  end if;

  if p_mention_staff_ids is not null then
    foreach v_mention in array p_mention_staff_ids loop
      if v_mention=v_actor then continue; end if;
      if not public.newsroom_staff_can_read_story(v_mention,v_comment.story_id) then
        raise exception using errcode='42501',message='Mentioned staff member does not have story access';
      end if;
    end loop;
  end if;

  insert into public.story_internal_comment_revisions(comment_id,previous_body,edited_by)
  values(v_comment.id,v_comment.body,v_actor);

  update public.story_internal_comments
  set body=public.newsroom_safe_editor_text(v_body),edited_at=now(),edited_by=v_actor
  where id=v_comment.id;

  if p_mention_staff_ids is not null then
    delete from public.story_internal_comment_mentions where comment_id=v_comment.id;
    insert into public.story_internal_comment_mentions(comment_id,mentioned_staff_id)
    select v_comment.id,x
    from (select distinct unnest(p_mention_staff_ids) x) q
    where x<>v_actor
    on conflict do nothing;

    foreach v_mention in array p_mention_staff_ids loop
      if v_mention<>v_actor then
        perform public.newsroom_emit_notification(
          v_mention,'story.internal_comment.mention','story_internal_comments',v_comment.id,
          jsonb_build_object('story_id',v_comment.story_id,'comment_id',v_comment.id),
          v_actor,'mention','normal',
          'mention:story-comment:'||v_comment.id::text||':'||v_mention::text,false,null
        );
      end if;
    end loop;
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.internal_comment.edited','story_internal_comments',v_comment.id,
    jsonb_build_object('story_id',v_comment.story_id));
end;
$$;

create or replace function public.newsroom_set_internal_comment_resolved(
  p_comment_id uuid,
  p_resolved boolean
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_comment public.story_internal_comments%rowtype;
begin
  select * into v_comment from public.story_internal_comments where id=p_comment_id for update;
  if v_comment.id is null then raise exception using errcode='P0002',message='Comment not found'; end if;
  if not public.newsroom_can_read_story(v_comment.story_id) then
    raise exception using errcode='42501',message='Story access required';
  end if;
  if v_comment.author_staff_id<>v_actor
     and not public.newsroom_has_capability('story.edit_all')
     and not public.newsroom_has_capability('story.publish') then
    raise exception using errcode='42501',message='Comment resolution authority required';
  end if;

  update public.story_internal_comments
  set resolved_at=case when p_resolved then now() else null end,
      resolved_by=case when p_resolved then v_actor else null end
  where id=p_comment_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,
    case when p_resolved then 'story.internal_comment.resolved' else 'story.internal_comment.reopened' end,
    'story_internal_comments',p_comment_id,jsonb_build_object('story_id',v_comment.story_id));
end;
$$;

create or replace function public.newsroom_list_inbox(
  p_filter text default 'all',
  p_limit integer default 50,
  p_before timestamptz default null
)
returns setof public.newsroom_notifications
language sql
stable
security definer
set search_path=public,auth
as $$
  select n.*
  from public.newsroom_notifications n
  where public.newsroom_session_authorized()
    and n.staff_profile_id=public.newsroom_current_staff_id_basic()
    and n.archived_at is null
    and (n.expires_at is null or n.expires_at>now())
    and (p_before is null or n.created_at<p_before)
    and (
      lower(coalesce(p_filter,'all'))='all'
      or (lower(p_filter)='mentions' and n.category='mention')
      or (lower(p_filter)='assignments' and n.category='assignment')
      or (lower(p_filter)='reviews' and n.category='review')
      or (lower(p_filter)='urgent' and n.priority='urgent')
      or (lower(p_filter)='announcements' and n.category='announcement')
      or (lower(p_filter)='newsletter' and n.category='newsletter')
      or (lower(p_filter)='moderation' and n.category='moderation')
    )
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit,50),1),100);
$$;

create or replace function public.newsroom_inbox_summary()
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  with inbox as (
    select *
    from public.newsroom_notifications n
    where public.newsroom_session_authorized()
      and n.staff_profile_id=public.newsroom_current_staff_id_basic()
      and n.archived_at is null
      and (n.expires_at is null or n.expires_at>now())
  )
  select jsonb_build_object(
    'unread_total',count(*) filter(where read_at is null),
    'mentions',count(*) filter(where category='mention' and read_at is null),
    'assignments',count(*) filter(where category='assignment' and read_at is null),
    'reviews',count(*) filter(where category='review' and read_at is null),
    'urgent',count(*) filter(where priority='urgent' and read_at is null),
    'announcements',count(*) filter(where category='announcement' and read_at is null),
    'newsletter',count(*) filter(where category='newsletter' and read_at is null),
    'moderation',count(*) filter(where category='moderation' and read_at is null),
    'unacknowledged',count(*) filter(where requires_ack and acknowledged_at is null)
  )
  from inbox;
$$;

create or replace function public.newsroom_mark_notification_read(
  p_notification_id uuid,
  p_read boolean default true
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;
  update public.newsroom_notifications
  set read_at=case when p_read then coalesce(read_at,now()) else null end
  where id=p_notification_id
    and staff_profile_id=public.newsroom_current_staff_id_basic();
  if not found then raise exception using errcode='P0002',message='Notification not found'; end if;
end;
$$;

create or replace function public.newsroom_ack_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;
  update public.newsroom_notifications
  set read_at=coalesce(read_at,now()),acknowledged_at=coalesce(acknowledged_at,now())
  where id=p_notification_id
    and staff_profile_id=public.newsroom_current_staff_id_basic()
    and requires_ack;
  if not found then raise exception using errcode='P0002',message='Acknowledgement-required notification not found'; end if;
end;
$$;

create or replace function public.newsroom_archive_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;
  update public.newsroom_notifications
  set archived_at=coalesce(archived_at,now()),read_at=coalesce(read_at,now())
  where id=p_notification_id
    and staff_profile_id=public.newsroom_current_staff_id_basic();
  if not found then raise exception using errcode='P0002',message='Notification not found'; end if;
end;
$$;

create or replace function public.newsroom_update_notification_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_result jsonb;
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;
  if p_preferences is null or jsonb_typeof(p_preferences)<>'object' then
    raise exception using errcode='22023',message='Notification preferences must be a JSON object';
  end if;
  if exists(
    select 1 from jsonb_object_keys(p_preferences) as k
    where k not in ('mentions','assignments','reviews','breaking','announcements','newsletter','moderation','push')
  ) then
    raise exception using errcode='22023',message='Unknown notification preference';
  end if;

  update public.staff_profiles
  set notification_preferences=coalesce(notification_preferences,'{}'::jsonb)||p_preferences,
      updated_at=now()
  where id=v_actor
  returning notification_preferences into v_result;

  return coalesce(v_result,'{}'::jsonb);
end;
$$;

create or replace function public.ca01_notify_assignment_event()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
begin
  if tg_op='INSERT' then
    perform public.newsroom_emit_notification(
      new.reporter_staff_id,'assignment.created','story_assignments',new.id,
      jsonb_build_object('assignment_id',new.id,'story_id',new.story_id,'title',new.title,'status',new.status),
      coalesce(v_actor,new.assigned_by),'assignment',
      case when lower(new.priority)='urgent' then 'urgent' when lower(new.priority)='high' then 'high' else 'normal' end,
      'assignment:'||new.id::text||':created:'||new.reporter_staff_id::text,false,null
    );
    if new.assigned_editor_staff_id is not null then
      perform public.newsroom_emit_notification(
        new.assigned_editor_staff_id,'assignment.created','story_assignments',new.id,
        jsonb_build_object('assignment_id',new.id,'story_id',new.story_id,'title',new.title,'status',new.status),
        coalesce(v_actor,new.assigned_by),'assignment',
        case when lower(new.priority)='urgent' then 'urgent' when lower(new.priority)='high' then 'high' else 'normal' end,
        'assignment:'||new.id::text||':created:'||new.assigned_editor_staff_id::text,false,null
      );
    end if;
  elsif new.status is distinct from old.status then
    if new.assigned_editor_staff_id is not null then
      perform public.newsroom_emit_notification(
        new.assigned_editor_staff_id,'assignment.status.changed','story_assignments',new.id,
        jsonb_build_object('assignment_id',new.id,'story_id',new.story_id,'previous',old.status,'status',new.status),
        v_actor,'assignment','normal',
        'assignment:'||new.id::text||':status:'||new.status||':'||new.assigned_editor_staff_id::text,false,null
      );
    end if;
    if new.assigned_by is not null then
      perform public.newsroom_emit_notification(
        new.assigned_by,'assignment.status.changed','story_assignments',new.id,
        jsonb_build_object('assignment_id',new.id,'story_id',new.story_id,'previous',old.status,'status',new.status),
        v_actor,'assignment','normal',
        'assignment:'||new.id::text||':status:'||new.status||':'||new.assigned_by::text,false,null
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ca01_assignment_notifications on public.story_assignments;
create trigger ca01_assignment_notifications
after insert or update of status on public.story_assignments
for each row execute function public.ca01_notify_assignment_event();

create or replace function public.ca01_notify_lifecycle_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_story public.stories%rowtype;
  v_target uuid;
  v_category text:='review';
begin
  select * into v_story from public.stories where id=new.story_id;
  v_target:=case new.to_status
    when 'Submitted' then v_story.assigned_editor_staff_id
    when 'Fact check' then v_story.fact_checker_staff_id
    when 'Health / Science review' then v_story.health_reviewer_staff_id
    when 'Copy edit' then v_story.copy_editor_staff_id
    when 'Editor review' then v_story.assigned_editor_staff_id
    else null
  end;
  if v_target is not null then
    perform public.newsroom_emit_notification(
      v_target,'story.workflow.'||lower(replace(new.to_status,' ','_')),
      'stories',new.story_id,
      jsonb_build_object('story_id',new.story_id,'from_status',new.from_status,'to_status',new.to_status),
      new.actor_staff_id,v_category,
      case when new.to_status='Submitted' then 'high' else 'normal' end,
      'story-workflow:'||new.id::text||':'||v_target::text,false,null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists ca01_lifecycle_notifications on public.story_lifecycle_events;
create trigger ca01_lifecycle_notifications
after insert on public.story_lifecycle_events
for each row execute function public.ca01_notify_lifecycle_event();

create or replace function public.ca01_notify_review_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_story public.stories%rowtype;
  v_reporter uuid;
begin
  select * into v_story from public.stories where id=new.story_id;

  perform public.newsroom_emit_notification(
    v_story.owner_staff_id,'story.review.recorded','story_reviews',new.id,
    jsonb_build_object('story_id',new.story_id,'review_id',new.id,'review_type',new.review_type,'status',new.status),
    new.completed_by,'review','normal',
    'review:'||new.id::text||':owner:'||coalesce(v_story.owner_staff_id::text,'none'),false,null
  );

  perform public.newsroom_emit_notification(
    v_story.assigned_editor_staff_id,'story.review.recorded','story_reviews',new.id,
    jsonb_build_object('story_id',new.story_id,'review_id',new.id,'review_type',new.review_type,'status',new.status),
    new.completed_by,'review','normal',
    'review:'||new.id::text||':editor:'||coalesce(v_story.assigned_editor_staff_id::text,'none'),false,null
  );

  for v_reporter in
    select distinct a.reporter_staff_id from public.story_assignments a where a.story_id=new.story_id
  loop
    perform public.newsroom_emit_notification(
      v_reporter,'story.review.recorded','story_reviews',new.id,
      jsonb_build_object('story_id',new.story_id,'review_id',new.id,'review_type',new.review_type,'status',new.status),
      new.completed_by,'review','normal',
      'review:'||new.id::text||':reporter:'||v_reporter::text,false,null
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists ca01_review_notifications on public.story_reviews;
create trigger ca01_review_notifications
after insert on public.story_reviews
for each row execute function public.ca01_notify_review_event();

revoke execute on function public.newsroom_add_internal_comment(uuid,text,uuid,uuid[]) from public,anon;
revoke execute on function public.newsroom_edit_internal_comment(uuid,text,uuid[]) from public,anon;
revoke execute on function public.newsroom_set_internal_comment_resolved(uuid,boolean) from public,anon;
revoke execute on function public.newsroom_list_inbox(text,integer,timestamptz) from public,anon;
revoke execute on function public.newsroom_inbox_summary() from public,anon;
revoke execute on function public.newsroom_mark_notification_read(uuid,boolean) from public,anon;
revoke execute on function public.newsroom_ack_notification(uuid) from public,anon;
revoke execute on function public.newsroom_archive_notification(uuid) from public,anon;
revoke execute on function public.newsroom_update_notification_preferences(jsonb) from public,anon;

grant execute on function public.newsroom_add_internal_comment(uuid,text,uuid,uuid[]) to authenticated;
grant execute on function public.newsroom_edit_internal_comment(uuid,text,uuid[]) to authenticated;
grant execute on function public.newsroom_set_internal_comment_resolved(uuid,boolean) to authenticated;
grant execute on function public.newsroom_list_inbox(text,integer,timestamptz) to authenticated;
grant execute on function public.newsroom_inbox_summary() to authenticated;
grant execute on function public.newsroom_mark_notification_read(uuid,boolean) to authenticated;
grant execute on function public.newsroom_ack_notification(uuid) to authenticated;
grant execute on function public.newsroom_archive_notification(uuid) to authenticated;
grant execute on function public.newsroom_update_notification_preferences(jsonb) to authenticated;

revoke execute on function public.ca01_notify_assignment_event() from public,anon,authenticated;
revoke execute on function public.ca01_notify_lifecycle_event() from public,anon,authenticated;
revoke execute on function public.ca01_notify_review_event() from public,anon,authenticated;

commit;
