-- CA-01 internal communication schema and capability foundation.
-- Parent: AG-06 CP6 accepted closure a94955d44b87a40df0f169dbf75cf24a33344554
-- Forward-only. No production cutover.

begin;

alter table public.story_internal_comments
  add column if not exists parent_comment_id uuid references public.story_internal_comments(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.staff_profiles(id) on delete set null;

alter table public.newsroom_notifications
  add column if not exists actor_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists category text not null default 'general',
  add column if not exists priority text not null default 'normal',
  add column if not exists dedupe_key text,
  add column if not exists requires_ack boolean not null default false,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table public.newsroom_notifications
  drop constraint if exists newsroom_notifications_category_check,
  add constraint newsroom_notifications_category_check
    check (category in ('general','mention','assignment','review','urgent','announcement','newsletter','moderation')),
  drop constraint if exists newsroom_notifications_priority_check,
  add constraint newsroom_notifications_priority_check
    check (priority in ('normal','high','urgent'));

create unique index if not exists idx_newsroom_notifications_dedupe
  on public.newsroom_notifications(staff_profile_id,dedupe_key)
  where dedupe_key is not null;
create index if not exists idx_newsroom_notifications_inbox
  on public.newsroom_notifications(staff_profile_id,created_at desc)
  where archived_at is null;
create index if not exists idx_story_internal_comments_parent
  on public.story_internal_comments(parent_comment_id);

create table if not exists public.story_internal_comment_revisions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.story_internal_comments(id) on delete restrict,
  previous_body text not null,
  edited_by uuid not null references public.staff_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.story_internal_comment_mentions (
  comment_id uuid not null references public.story_internal_comments(id) on delete cascade,
  mentioned_staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(comment_id,mentioned_staff_id)
);

create table if not exists public.newsroom_desks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_by uuid not null references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.newsroom_desk_members (
  desk_id uuid not null references public.newsroom_desks(id) on delete cascade,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member','lead')),
  added_by uuid references public.staff_profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key(desk_id,staff_profile_id)
);

create table if not exists public.newsroom_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null check (thread_type in ('assignment','desk','breaking','general')),
  title text not null,
  assignment_id uuid references public.story_assignments(id) on delete cascade,
  desk_id uuid references public.newsroom_desks(id) on delete set null,
  created_by uuid not null references public.staff_profiles(id),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  status text not null default 'open' check (status in ('open','closed','archived')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsroom_threads_context_check check (
    (thread_type='assignment' and assignment_id is not null and desk_id is null)
    or (thread_type='desk' and assignment_id is null and desk_id is not null)
    or (thread_type='breaking' and assignment_id is null)
    or (thread_type='general' and assignment_id is null and desk_id is null)
  )
);

create table if not exists public.newsroom_thread_members (
  thread_id uuid not null references public.newsroom_threads(id) on delete cascade,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','member','observer')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  primary key(thread_id,staff_profile_id)
);

create table if not exists public.newsroom_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.newsroom_threads(id) on delete cascade,
  author_staff_id uuid not null references public.staff_profiles(id) on delete restrict,
  parent_message_id uuid references public.newsroom_messages(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.newsroom_message_mentions (
  message_id uuid not null references public.newsroom_messages(id) on delete cascade,
  mentioned_staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(message_id,mentioned_staff_id)
);

create table if not exists public.newsroom_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience_scope text not null check (audience_scope in ('all_staff','desk')),
  desk_id uuid references public.newsroom_desks(id) on delete set null,
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  requires_ack boolean not null default false,
  created_by uuid not null references public.staff_profiles(id),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint newsroom_announcements_scope_check check (
    (audience_scope='all_staff' and desk_id is null)
    or (audience_scope='desk' and desk_id is not null)
  )
);

create index if not exists idx_story_internal_comment_revisions_comment
  on public.story_internal_comment_revisions(comment_id,created_at desc);
create index if not exists idx_story_internal_comment_mentions_staff
  on public.story_internal_comment_mentions(mentioned_staff_id,created_at desc);
create index if not exists idx_newsroom_desk_members_staff
  on public.newsroom_desk_members(staff_profile_id,desk_id)
  where left_at is null;
create index if not exists idx_newsroom_threads_assignment
  on public.newsroom_threads(assignment_id)
  where assignment_id is not null;
create index if not exists idx_newsroom_threads_desk
  on public.newsroom_threads(desk_id,updated_at desc)
  where desk_id is not null;
create index if not exists idx_newsroom_thread_members_staff
  on public.newsroom_thread_members(staff_profile_id,thread_id)
  where left_at is null;
create index if not exists idx_newsroom_messages_thread
  on public.newsroom_messages(thread_id,created_at);
create index if not exists idx_newsroom_message_mentions_staff
  on public.newsroom_message_mentions(mentioned_staff_id,created_at desc);
create index if not exists idx_newsroom_announcements_active
  on public.newsroom_announcements(published_at desc)
  where archived_at is null;

insert into public.newsroom_capabilities(key,description) values
  ('communication.desk.manage','Manage newsroom desks and desk membership'),
  ('communication.breaking.manage','Create and manage breaking-news coordination rooms'),
  ('communication.announce','Publish newsroom leadership announcements'),
  ('comment.configure','Configure reader discussion policy on canonical stories'),
  ('comment.moderate','Moderate reader story discussions'),
  ('comment.restrict','Restrict reader commenting privileges'),
  ('comment.audit','Inspect reader-comment moderation audit history')
on conflict (key) do update set description=excluded.description;

insert into public.newsroom_roles(name,description) values
  ('Audience Moderator','Reader discussion moderation and restriction operations without editorial publishing authority')
on conflict (name) do update set description=excluded.description;

with role_caps(role_name,cap) as (
  values
    ('Publisher / Owner','communication.desk.manage'),
    ('Publisher / Owner','communication.breaking.manage'),
    ('Publisher / Owner','communication.announce'),
    ('Publisher / Owner','comment.configure'),
    ('Publisher / Owner','comment.moderate'),
    ('Publisher / Owner','comment.restrict'),
    ('Publisher / Owner','comment.audit'),

    ('Editor-in-Chief','communication.desk.manage'),
    ('Editor-in-Chief','communication.breaking.manage'),
    ('Editor-in-Chief','communication.announce'),
    ('Editor-in-Chief','comment.configure'),
    ('Editor-in-Chief','comment.moderate'),
    ('Editor-in-Chief','comment.restrict'),
    ('Editor-in-Chief','comment.audit'),

    ('Managing Editor','communication.desk.manage'),
    ('Managing Editor','communication.breaking.manage'),
    ('Managing Editor','communication.announce'),
    ('Managing Editor','comment.configure'),
    ('Managing Editor','comment.moderate'),
    ('Managing Editor','comment.restrict'),
    ('Managing Editor','comment.audit'),

    ('Section Editor','communication.desk.manage'),
    ('Section Editor','communication.breaking.manage'),
    ('News Editor','communication.desk.manage'),
    ('News Editor','communication.breaking.manage'),
    ('Health / Science Editor','comment.moderate'),

    ('Audience Moderator','comment.moderate'),
    ('Audience Moderator','comment.restrict'),
    ('Audience Moderator','comment.audit')
)
insert into public.newsroom_role_capabilities(role_id,capability_key)
select r.id,rc.cap
from role_caps rc
join public.newsroom_roles r on r.name=rc.role_name
on conflict do nothing;

create or replace function public.newsroom_staff_has_capability(p_staff_id uuid,p_capability text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  with member as (
    select sp.id,sp.role_id
    from public.staff_profiles sp
    where sp.id=p_staff_id and lower(sp.status)='active'
  ), override_value as (
    select o.allowed
    from public.newsroom_staff_capability_overrides o
    join member m on m.id=o.staff_profile_id
    where o.capability_key=p_capability
    limit 1
  )
  select coalesce(
    (select allowed from override_value),
    exists(
      select 1 from member m
      join public.newsroom_role_capabilities rc on rc.role_id=m.role_id
      where rc.capability_key=p_capability
    ),
    false
  );
$$;

create or replace function public.newsroom_staff_can_read_story(p_staff_id uuid,p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(select 1 from public.staff_profiles sp where sp.id=p_staff_id and lower(sp.status)='active')
    and (
      public.newsroom_staff_has_capability(p_staff_id,'story.edit_all')
      or public.newsroom_staff_has_capability(p_staff_id,'story.publish')
      or public.newsroom_staff_has_capability(p_staff_id,'story.fact_check')
      or public.newsroom_staff_has_capability(p_staff_id,'story.health_review')
      or public.newsroom_staff_has_capability(p_staff_id,'story.copy_edit')
      or exists(select 1 from public.stories s where s.id=p_story_id and s.owner_staff_id=p_staff_id)
      or exists(select 1 from public.story_assignments a where a.story_id=p_story_id and a.reporter_staff_id=p_staff_id)
    );
$$;

create or replace function public.newsroom_can_read_desk(p_desk_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select public.newsroom_session_authorized()
    and (
      public.newsroom_has_capability('communication.desk.manage')
      or exists(
        select 1 from public.newsroom_desk_members dm
        where dm.desk_id=p_desk_id
          and dm.staff_profile_id=public.newsroom_current_staff_id_basic()
          and dm.left_at is null
      )
    );
$$;

create or replace function public.newsroom_can_read_thread(p_thread_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_thread public.newsroom_threads%rowtype;
  v_staff uuid:=public.newsroom_current_staff_id_basic();
begin
  if not public.newsroom_session_authorized() then return false; end if;
  select * into v_thread from public.newsroom_threads where id=p_thread_id;
  if v_thread.id is null then return false; end if;

  if v_thread.thread_type='assignment' then
    return exists(
      select 1 from public.story_assignments a
      where a.id=v_thread.assignment_id
        and (
          a.reporter_staff_id=v_staff
          or a.assigned_editor_staff_id=v_staff
          or a.assigned_by=v_staff
          or public.newsroom_has_capability('assignment.manage')
        )
    );
  elsif v_thread.thread_type='desk' then
    return public.newsroom_can_read_desk(v_thread.desk_id);
  elsif v_thread.thread_type='breaking' then
    return public.newsroom_has_capability('communication.breaking.manage')
      or exists(
        select 1 from public.newsroom_thread_members tm
        where tm.thread_id=p_thread_id and tm.staff_profile_id=v_staff and tm.left_at is null
      );
  else
    return exists(
      select 1 from public.newsroom_thread_members tm
      where tm.thread_id=p_thread_id and tm.staff_profile_id=v_staff and tm.left_at is null
    );
  end if;
end;
$$;

create or replace function public.newsroom_can_read_announcement(p_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select public.newsroom_session_authorized()
    and exists(
      select 1 from public.newsroom_announcements a
      where a.id=p_announcement_id
        and a.archived_at is null
        and (a.expires_at is null or a.expires_at>now())
        and (
          a.audience_scope='all_staff'
          or (a.audience_scope='desk' and public.newsroom_can_read_desk(a.desk_id))
        )
    );
$$;

create or replace function public.newsroom_emit_notification(
  p_staff_profile_id uuid,
  p_event_type text,
  p_target_table text,
  p_target_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_actor_staff_id uuid default null,
  p_category text default 'general',
  p_priority text default 'normal',
  p_dedupe_key text default null,
  p_requires_ack boolean default false,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if p_staff_profile_id is null then return null; end if;
  if p_actor_staff_id is not null and p_staff_profile_id=p_actor_staff_id then return null; end if;
  if p_category not in ('general','mention','assignment','review','urgent','announcement','newsletter','moderation') then
    raise exception using errcode='22023',message='Invalid notification category';
  end if;
  if p_priority not in ('normal','high','urgent') then
    raise exception using errcode='22023',message='Invalid notification priority';
  end if;

  insert into public.newsroom_notifications(
    staff_profile_id,event_type,target_table,target_id,payload,actor_staff_id,
    category,priority,dedupe_key,requires_ack,expires_at
  )
  values(
    p_staff_profile_id,left(coalesce(p_event_type,'event'),120),p_target_table,p_target_id,
    coalesce(p_payload,'{}'::jsonb),p_actor_staff_id,p_category,p_priority,
    nullif(p_dedupe_key,''),p_requires_ack,p_expires_at
  )
  on conflict (staff_profile_id,dedupe_key) where dedupe_key is not null
  do update set
    payload=excluded.payload,
    priority=excluded.priority,
    requires_ack=excluded.requires_ack,
    expires_at=excluded.expires_at
  returning id into v_id;

  return v_id;
end;
$$;

alter table public.story_internal_comment_revisions enable row level security;
alter table public.story_internal_comment_mentions enable row level security;
alter table public.newsroom_desks enable row level security;
alter table public.newsroom_desk_members enable row level security;
alter table public.newsroom_threads enable row level security;
alter table public.newsroom_thread_members enable row level security;
alter table public.newsroom_messages enable row level security;
alter table public.newsroom_message_mentions enable row level security;
alter table public.newsroom_announcements enable row level security;

revoke all on public.story_internal_comment_revisions from public,anon,authenticated;
revoke all on public.story_internal_comment_mentions from public,anon,authenticated;
revoke all on public.newsroom_desks from public,anon,authenticated;
revoke all on public.newsroom_desk_members from public,anon,authenticated;
revoke all on public.newsroom_threads from public,anon,authenticated;
revoke all on public.newsroom_thread_members from public,anon,authenticated;
revoke all on public.newsroom_messages from public,anon,authenticated;
revoke all on public.newsroom_message_mentions from public,anon,authenticated;
revoke all on public.newsroom_announcements from public,anon,authenticated;

grant select on public.story_internal_comment_revisions to authenticated;
grant select on public.story_internal_comment_mentions to authenticated;
grant select on public.newsroom_desks to authenticated;
grant select on public.newsroom_desk_members to authenticated;
grant select on public.newsroom_threads to authenticated;
grant select on public.newsroom_thread_members to authenticated;
grant select on public.newsroom_messages to authenticated;
grant select on public.newsroom_message_mentions to authenticated;
grant select on public.newsroom_announcements to authenticated;

revoke execute on function public.newsroom_staff_has_capability(uuid,text) from public,anon,authenticated;
revoke execute on function public.newsroom_staff_can_read_story(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.newsroom_emit_notification(uuid,text,text,uuid,jsonb,uuid,text,text,text,boolean,timestamptz) from public,anon,authenticated;

revoke execute on function public.newsroom_can_read_desk(uuid) from public,anon;
revoke execute on function public.newsroom_can_read_thread(uuid) from public,anon;
revoke execute on function public.newsroom_can_read_announcement(uuid) from public,anon;
grant execute on function public.newsroom_can_read_desk(uuid) to authenticated;
grant execute on function public.newsroom_can_read_thread(uuid) to authenticated;
grant execute on function public.newsroom_can_read_announcement(uuid) to authenticated;

commit;
