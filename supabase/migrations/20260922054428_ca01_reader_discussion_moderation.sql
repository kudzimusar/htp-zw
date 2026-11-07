-- CA-01 verified reader story discussion and moderation domain.
-- Public discussion is intentionally separate from private Newsroom communication.

begin;

alter table public.stories
  add column if not exists comment_policy text not null default 'disabled';

alter table public.stories
  drop constraint if exists stories_comment_policy_check,
  add constraint stories_comment_policy_check
    check (comment_policy in ('disabled','read_only','open'));

create table if not exists public.reader_comment_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  display_name text not null,
  state text not null default 'active' check (state in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_comment_at timestamptz
);

create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete restrict,
  author_profile_id uuid not null references public.reader_comment_profiles(id) on delete restrict,
  parent_comment_id uuid references public.story_comments(id) on delete set null,
  body text not null,
  state text not null check (state in ('PENDING','PUBLISHED','HELD','REJECTED','HIDDEN','REMOVED')),
  risk_flags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  published_at timestamptz,
  removed_by_author_at timestamptz
);

create table if not exists public.story_comment_revisions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.story_comments(id) on delete restrict,
  actor_auth_user_id uuid not null,
  revision_type text not null check (revision_type in ('edit','withdraw')),
  previous_body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.story_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.story_comments(id) on delete restrict,
  reporter_profile_id uuid not null references public.reader_comment_profiles(id) on delete restrict,
  reason_code text not null check (reason_code in ('spam','harassment','impersonation','phishing','health_misinformation','privacy','other')),
  details text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  unique(comment_id,reporter_profile_id)
);

create table if not exists public.story_comment_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.story_comments(id) on delete restrict,
  actor_staff_id uuid not null references public.staff_profiles(id) on delete restrict,
  action text not null,
  previous_state text not null,
  new_state text not null,
  reason_code text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reader_comment_restrictions (
  id uuid primary key default gen_random_uuid(),
  reader_profile_id uuid not null references public.reader_comment_profiles(id) on delete restrict,
  kind text not null check (kind in ('pre_moderation','comment_block','link_block')),
  reason_code text not null,
  notes text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by_staff_id uuid not null references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by_staff_id uuid references public.staff_profiles(id)
);

create index if not exists idx_story_comments_public
  on public.story_comments(story_id,published_at desc)
  where state='PUBLISHED';
create index if not exists idx_story_comments_author_recent
  on public.story_comments(author_profile_id,created_at desc);
create index if not exists idx_story_comments_parent
  on public.story_comments(parent_comment_id,created_at);
create index if not exists idx_story_comment_revisions_comment
  on public.story_comment_revisions(comment_id,created_at desc);
create index if not exists idx_story_comment_reports_queue
  on public.story_comment_reports(status,created_at desc);
create index if not exists idx_story_comment_moderation_actions_comment
  on public.story_comment_moderation_actions(comment_id,created_at desc);
create index if not exists idx_reader_comment_restrictions_active
  on public.reader_comment_restrictions(reader_profile_id,kind,starts_at,ends_at)
  where lifted_at is null;

alter table public.reader_comment_profiles enable row level security;
alter table public.story_comments enable row level security;
alter table public.story_comment_revisions enable row level security;
alter table public.story_comment_reports enable row level security;
alter table public.story_comment_moderation_actions enable row level security;
alter table public.reader_comment_restrictions enable row level security;

revoke all on public.reader_comment_profiles from public,anon,authenticated;
revoke all on public.story_comments from public,anon,authenticated;
revoke all on public.story_comment_revisions from public,anon,authenticated;
revoke all on public.story_comment_reports from public,anon,authenticated;
revoke all on public.story_comment_moderation_actions from public,anon,authenticated;
revoke all on public.reader_comment_restrictions from public,anon,authenticated;

grant select on public.reader_comment_profiles to authenticated;
grant select on public.story_comments to authenticated;
grant select on public.story_comment_revisions to authenticated;
grant select on public.story_comment_reports to authenticated;
grant select on public.story_comment_moderation_actions to authenticated;
grant select on public.reader_comment_restrictions to authenticated;

create or replace function public.reader_current_comment_profile_id()
returns uuid
language sql
stable
security definer
set search_path=public,auth
as $$
  select p.id
  from public.reader_comment_profiles p
  where p.auth_user_id=auth.uid() and p.state='active'
  limit 1;
$$;

create or replace function public.reader_email_verified()
returns boolean
language sql
stable
security definer
set search_path=auth
as $$
  select exists(
    select 1 from auth.users u
    where u.id=auth.uid() and u.email_confirmed_at is not null
  );
$$;

create or replace function public.reader_has_active_comment_restriction(p_profile_id uuid,p_kind text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.reader_comment_restrictions r
    where r.reader_profile_id=p_profile_id
      and r.kind=p_kind
      and r.lifted_at is null
      and r.starts_at<=now()
      and (r.ends_at is null or r.ends_at>now())
  );
$$;

create or replace function public.reader_story_discussion_visible(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.stories s
    where s.id=p_story_id
      and lower(s.status) in ('publish','published')
      and lower(s.access_policy)='public'
      and (s.published_at is null or s.published_at<=now())
      and s.comment_policy in ('read_only','open')
  );
$$;

create or replace function public.reader_story_is_commentable(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.stories s
    where s.id=p_story_id
      and lower(s.status) in ('publish','published')
      and lower(s.access_policy)='public'
      and (s.published_at is null or s.published_at<=now())
      and s.comment_policy='open'
  );
$$;

drop policy if exists ca01_reader_comment_profiles_read on public.reader_comment_profiles;
create policy ca01_reader_comment_profiles_read
on public.reader_comment_profiles for select to authenticated
using (
  auth_user_id=(select auth.uid())
  or public.newsroom_has_capability('comment.moderate')
  or public.newsroom_has_capability('comment.restrict')
  or public.newsroom_has_capability('comment.audit')
);

drop policy if exists ca01_story_comments_read on public.story_comments;
create policy ca01_story_comments_read
on public.story_comments for select to authenticated
using (
  author_profile_id=public.reader_current_comment_profile_id()
  or public.newsroom_has_capability('comment.moderate')
  or public.newsroom_has_capability('comment.audit')
);

drop policy if exists ca01_story_comment_revisions_read on public.story_comment_revisions;
create policy ca01_story_comment_revisions_read
on public.story_comment_revisions for select to authenticated
using (
  exists(
    select 1 from public.story_comments c
    where c.id=comment_id and c.author_profile_id=public.reader_current_comment_profile_id()
  )
  or public.newsroom_has_capability('comment.audit')
);

drop policy if exists ca01_story_comment_reports_read on public.story_comment_reports;
create policy ca01_story_comment_reports_read
on public.story_comment_reports for select to authenticated
using (
  reporter_profile_id=public.reader_current_comment_profile_id()
  or public.newsroom_has_capability('comment.moderate')
  or public.newsroom_has_capability('comment.audit')
);

drop policy if exists ca01_story_comment_moderation_actions_read on public.story_comment_moderation_actions;
create policy ca01_story_comment_moderation_actions_read
on public.story_comment_moderation_actions for select to authenticated
using (
  public.newsroom_has_capability('comment.moderate')
  or public.newsroom_has_capability('comment.audit')
);

drop policy if exists ca01_reader_comment_restrictions_read on public.reader_comment_restrictions;
create policy ca01_reader_comment_restrictions_read
on public.reader_comment_restrictions for select to authenticated
using (
  public.newsroom_has_capability('comment.restrict')
  or public.newsroom_has_capability('comment.audit')
);

create or replace function public.reader_register_comment_profile(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_name text:=trim(regexp_replace(coalesce(p_display_name,''),'\s+',' ','g'));
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode='28000',message='Authenticated reader required';
  end if;
  if not public.reader_email_verified() then
    raise exception using errcode='42501',message='Verified email required for commenting';
  end if;
  if length(v_name)<2 or length(v_name)>80 then
    raise exception using errcode='22023',message='Display name must be between 2 and 80 characters';
  end if;
  if lower(v_name) in ('healthtimes','healthtimes official','healthtimes newsroom','admin','administrator','moderator','healthtimes editor') then
    raise exception using errcode='22023',message='Reserved display name';
  end if;
  if exists(
    select 1 from public.staff_profiles sp
    where lower(sp.status)='active'
      and (lower(sp.display_name)=lower(v_name) or lower(coalesce(sp.handle,''))=lower(v_name))
  ) then
    raise exception using errcode='22023',message='Display name conflicts with a HealthTimes staff identity';
  end if;

  insert into public.reader_comment_profiles(auth_user_id,display_name,state)
  values(auth.uid(),v_name,'active')
  on conflict(auth_user_id)
  do update set display_name=excluded.display_name,updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.reader_comment_eligibility(p_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_profile public.reader_comment_profiles%rowtype;
  v_user auth.users%rowtype;
  v_published_count integer:=0;
  v_mode text;
begin
  if auth.uid() is null then
    return jsonb_build_object('status','blocked','reason','authentication_required');
  end if;

  select * into v_user from auth.users where id=auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then
    return jsonb_build_object('status','blocked','reason','email_verification_required');
  end if;

  select * into v_profile
  from public.reader_comment_profiles
  where auth_user_id=auth.uid();

  if v_profile.id is null then
    return jsonb_build_object('status','blocked','reason','comment_profile_required');
  end if;
  if v_profile.state<>'active' then
    return jsonb_build_object('status','blocked','reason','comment_profile_disabled');
  end if;
  if not public.reader_story_is_commentable(p_story_id) then
    return jsonb_build_object('status','blocked','reason','story_not_commentable');
  end if;
  if public.reader_has_active_comment_restriction(v_profile.id,'comment_block') then
    return jsonb_build_object('status','blocked','reason','comment_privilege_restricted');
  end if;
  if public.reader_has_active_comment_restriction(v_profile.id,'pre_moderation') then
    return jsonb_build_object('status','pre_moderated','reason','pre_moderation_restriction');
  end if;

  select count(*) into v_published_count
  from public.story_comments c
  where c.author_profile_id=v_profile.id and c.state='PUBLISHED';

  if v_user.created_at>now()-interval '30 days' or v_published_count<5 then
    v_mode:='pre_moderated';
  else
    v_mode:='allowed';
  end if;

  return jsonb_build_object(
    'status',v_mode,
    'reason',case when v_mode='allowed' then 'eligible' else 'new_or_low_history_account' end,
    'profile_id',v_profile.id,
    'published_comment_count',v_published_count
  );
end;
$$;

create or replace function public.reader_submit_story_comment(
  p_story_id uuid,
  p_body text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_profile public.reader_comment_profiles%rowtype;
  v_user auth.users%rowtype;
  v_body text:=trim(coalesce(p_body,''));
  v_parent public.story_comments%rowtype;
  v_recent10 integer;
  v_recent24 integer;
  v_duplicates integer;
  v_published_count integer;
  v_state text;
  v_flags text[]:='{}'::text[];
  v_id uuid;
  v_has_link boolean;
begin
  if auth.uid() is null then raise exception using errcode='28000',message='Authenticated reader required'; end if;
  select * into v_user from auth.users where id=auth.uid();
  if v_user.email_confirmed_at is null then
    raise exception using errcode='42501',message='Verified email required for commenting';
  end if;

  select * into v_profile
  from public.reader_comment_profiles
  where auth_user_id=auth.uid() and state='active';
  if v_profile.id is null then
    raise exception using errcode='42501',message='Active reader comment profile required';
  end if;
  if not public.reader_story_is_commentable(p_story_id) then
    raise exception using errcode='42501',message='Canonical public story is not open for comments';
  end if;
  if public.reader_has_active_comment_restriction(v_profile.id,'comment_block') then
    raise exception using errcode='42501',message='Comment privilege is restricted';
  end if;
  if length(v_body)<2 or length(v_body)>4000 then
    raise exception using errcode='22023',message='Comment body must be between 2 and 4000 characters';
  end if;
  if v_body~'<[^>]+>' then
    raise exception using errcode='22023',message='HTML markup is not permitted in reader comments';
  end if;

  v_has_link:=v_body~*'(https?://|www\.)';
  if v_has_link and public.reader_has_active_comment_restriction(v_profile.id,'link_block') then
    raise exception using errcode='42501',message='Links are restricted for this reader account';
  end if;

  if p_parent_comment_id is not null then
    select * into v_parent from public.story_comments where id=p_parent_comment_id;
    if v_parent.id is null or v_parent.story_id<>p_story_id or v_parent.state<>'PUBLISHED' then
      raise exception using errcode='22023',message='Reply parent must be a published comment on the same story';
    end if;
    if v_parent.parent_comment_id is not null then
      raise exception using errcode='22023',message='Reader discussion supports one reply level';
    end if;
  end if;

  select count(*) into v_recent10
  from public.story_comments
  where author_profile_id=v_profile.id and created_at>now()-interval '10 minutes';
  if v_recent10>=5 then
    raise exception using errcode='P0001',message='Comment rate limit exceeded';
  end if;

  select count(*) into v_recent24
  from public.story_comments
  where author_profile_id=v_profile.id and created_at>now()-interval '24 hours';
  if v_recent24>=20 then
    raise exception using errcode='P0001',message='Daily comment rate limit exceeded';
  end if;

  select count(*) into v_duplicates
  from public.story_comments
  where author_profile_id=v_profile.id
    and created_at>now()-interval '24 hours'
    and lower(trim(body))=lower(v_body);

  select count(*) into v_published_count
  from public.story_comments
  where author_profile_id=v_profile.id and state='PUBLISHED';

  if v_has_link then v_flags:=array_append(v_flags,'link'); end if;
  if v_duplicates>=2 then v_flags:=array_append(v_flags,'duplicate_content'); end if;

  if v_duplicates>=2 then
    v_state:='HELD';
  elsif public.reader_has_active_comment_restriction(v_profile.id,'pre_moderation') then
    v_state:='PENDING';
  elsif v_user.created_at>now()-interval '30 days' or v_published_count<5 or v_has_link then
    v_state:='PENDING';
  else
    v_state:='PUBLISHED';
  end if;

  insert into public.story_comments(
    story_id,author_profile_id,parent_comment_id,body,state,risk_flags,published_at
  )
  values(
    p_story_id,v_profile.id,p_parent_comment_id,v_body,v_state,v_flags,
    case when v_state='PUBLISHED' then now() else null end
  )
  returning id into v_id;

  update public.reader_comment_profiles
  set last_comment_at=now(),updated_at=now()
  where id=v_profile.id;

  return v_id;
end;
$$;

create or replace function public.reader_edit_story_comment(p_comment_id uuid,p_body text)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_profile uuid:=public.reader_current_comment_profile_id();
  v_comment public.story_comments%rowtype;
  v_body text:=trim(coalesce(p_body,''));
  v_has_link boolean;
begin
  if v_profile is null then raise exception using errcode='42501',message='Active reader comment profile required'; end if;
  select * into v_comment from public.story_comments where id=p_comment_id for update;
  if v_comment.id is null then raise exception using errcode='P0002',message='Comment not found'; end if;
  if v_comment.author_profile_id<>v_profile then raise exception using errcode='42501',message='Only the author may edit this comment'; end if;
  if v_comment.state in ('REJECTED','REMOVED') then raise exception using errcode='42501',message='This comment can no longer be edited'; end if;
  if length(v_body)<2 or length(v_body)>4000 or v_body~'<[^>]+>' then
    raise exception using errcode='22023',message='Invalid reader comment body';
  end if;
  v_has_link:=v_body~*'(https?://|www\.)';
  if v_has_link and public.reader_has_active_comment_restriction(v_profile,'link_block') then
    raise exception using errcode='42501',message='Links are restricted for this reader account';
  end if;

  insert into public.story_comment_revisions(comment_id,actor_auth_user_id,revision_type,previous_body)
  values(v_comment.id,auth.uid(),'edit',v_comment.body);

  update public.story_comments
  set body=v_body,
      state=case when state='PUBLISHED' then 'PENDING' else state end,
      published_at=case when state='PUBLISHED' then null else published_at end,
      risk_flags=case when v_has_link then array['link']::text[] else '{}'::text[] end,
      edited_at=now(),
      updated_at=now()
  where id=v_comment.id;
end;
$$;

create or replace function public.reader_withdraw_story_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_profile uuid:=public.reader_current_comment_profile_id();
  v_comment public.story_comments%rowtype;
begin
  if v_profile is null then raise exception using errcode='42501',message='Active reader comment profile required'; end if;
  select * into v_comment from public.story_comments where id=p_comment_id for update;
  if v_comment.id is null then raise exception using errcode='P0002',message='Comment not found'; end if;
  if v_comment.author_profile_id<>v_profile then raise exception using errcode='42501',message='Only the author may withdraw this comment'; end if;
  if v_comment.state='REMOVED' then return; end if;

  insert into public.story_comment_revisions(comment_id,actor_auth_user_id,revision_type,previous_body)
  values(v_comment.id,auth.uid(),'withdraw',v_comment.body);

  update public.story_comments
  set state='REMOVED',removed_by_author_at=now(),updated_at=now()
  where id=v_comment.id;
end;
$$;

create or replace function public.reader_report_story_comment(
  p_comment_id uuid,
  p_reason_code text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_profile uuid:=public.reader_current_comment_profile_id();
  v_comment public.story_comments%rowtype;
  v_reason text:=lower(trim(coalesce(p_reason_code,'')));
  v_id uuid;
  v_staff uuid;
begin
  if v_profile is null or not public.reader_email_verified() then
    raise exception using errcode='42501',message='Verified active reader profile required';
  end if;
  if v_reason not in ('spam','harassment','impersonation','phishing','health_misinformation','privacy','other') then
    raise exception using errcode='22023',message='Invalid report reason';
  end if;
  select * into v_comment from public.story_comments where id=p_comment_id;
  if v_comment.id is null or v_comment.state<>'PUBLISHED' then
    raise exception using errcode='P0002',message='Published comment not found';
  end if;
  if v_comment.author_profile_id=v_profile then
    raise exception using errcode='42501',message='Readers cannot report their own comment';
  end if;

  insert into public.story_comment_reports(comment_id,reporter_profile_id,reason_code,details)
  values(v_comment.id,v_profile,v_reason,left(nullif(trim(p_details),''),2000))
  returning id into v_id;

  for v_staff in
    select sp.id from public.staff_profiles sp
    where lower(sp.status)='active'
      and public.newsroom_staff_has_capability(sp.id,'comment.moderate')
  loop
    perform public.newsroom_emit_notification(
      v_staff,'reader.comment.reported','story_comment_reports',v_id,
      jsonb_build_object('report_id',v_id,'comment_id',v_comment.id,'story_id',v_comment.story_id,'reason_code',v_reason),
      null,'moderation',
      case when v_reason in ('phishing','health_misinformation','privacy') then 'high' else 'normal' end,
      'moderation:report:'||v_id::text||':'||v_staff::text,false,null
    );
  end loop;

  return v_id;
end;
$$;

create or replace function public.reader_public_story_comments(
  p_story_id uuid,
  p_limit integer default 50,
  p_before timestamptz default null
)
returns table(
  id uuid,
  story_id uuid,
  parent_comment_id uuid,
  display_name text,
  body text,
  published_at timestamptz,
  edited boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select c.id,c.story_id,c.parent_comment_id,p.display_name,c.body,c.published_at,(c.edited_at is not null)
  from public.story_comments c
  join public.reader_comment_profiles p on p.id=c.author_profile_id
  where public.reader_story_discussion_visible(p_story_id)
    and c.story_id=p_story_id
    and c.state='PUBLISHED'
    and (p_before is null or c.published_at<p_before)
  order by c.published_at asc
  limit least(greatest(coalesce(p_limit,50),1),100);
$$;

create or replace function public.newsroom_set_story_comment_policy(p_story_id uuid,p_policy text)
returns text
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_policy text:=lower(trim(coalesce(p_policy,'')));
  v_story public.stories%rowtype;
begin
  if not public.newsroom_has_capability('comment.configure') then
    raise exception using errcode='42501',message='comment.configure capability required';
  end if;
  if not public.newsroom_can_read_story(p_story_id) then
    raise exception using errcode='42501',message='Story access required';
  end if;
  if v_policy not in ('disabled','read_only','open') then
    raise exception using errcode='22023',message='Invalid comment policy';
  end if;

  select * into v_story from public.stories where id=p_story_id for update;
  if v_story.id is null then raise exception using errcode='P0002',message='Story not found'; end if;
  if v_policy in ('read_only','open')
     and not (
       lower(v_story.status) in ('publish','published')
       and lower(v_story.access_policy)='public'
       and (v_story.published_at is null or v_story.published_at<=now())
     ) then
    raise exception using errcode='42501',message='Only canonical published public stories may enable discussion';
  end if;

  perform set_config('app.newsroom_rpc','1',true);
  update public.stories set comment_policy=v_policy,updated_at=now() where id=p_story_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'reader.comment_policy.changed','stories',p_story_id,jsonb_build_object('policy',v_policy));

  return v_policy;
end;
$$;

create or replace function public.newsroom_list_comment_moderation_queue(
  p_state text default null,
  p_limit integer default 50
)
returns setof public.story_comments
language sql
stable
security definer
set search_path=public,auth
as $$
  select c.*
  from public.story_comments c
  where public.newsroom_session_authorized()
    and public.newsroom_has_capability('comment.moderate')
    and (p_state is null or c.state=upper(p_state))
    and c.state in ('PENDING','HELD','PUBLISHED','HIDDEN')
  order by
    case c.state when 'HELD' then 0 when 'PENDING' then 1 when 'HIDDEN' then 2 else 3 end,
    c.created_at asc
  limit least(greatest(coalesce(p_limit,50),1),100);
$$;

create or replace function public.newsroom_moderate_story_comment(
  p_comment_id uuid,
  p_action text,
  p_reason_code text,
  p_notes text default null
)
returns text
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_comment public.story_comments%rowtype;
  v_action text:=lower(trim(coalesce(p_action,'')));
  v_new text;
  v_allowed boolean:=false;
begin
  if not public.newsroom_has_capability('comment.moderate') then
    raise exception using errcode='42501',message='comment.moderate capability required';
  end if;
  select * into v_comment from public.story_comments where id=p_comment_id for update;
  if v_comment.id is null then raise exception using errcode='P0002',message='Comment not found'; end if;

  v_new:=case v_action
    when 'publish' then 'PUBLISHED'
    when 'hold' then 'HELD'
    when 'reject' then 'REJECTED'
    when 'hide' then 'HIDDEN'
    when 'remove' then 'REMOVED'
    when 'restore' then 'PUBLISHED'
    else null
  end;
  if v_new is null then raise exception using errcode='22023',message='Invalid moderation action'; end if;

  v_allowed:=case
    when v_comment.state='PENDING' and v_new in ('PUBLISHED','HELD','REJECTED') then true
    when v_comment.state='HELD' and v_new in ('PUBLISHED','REJECTED','REMOVED') then true
    when v_comment.state='PUBLISHED' and v_new in ('HIDDEN','REMOVED') then true
    when v_comment.state='HIDDEN' and v_new in ('PUBLISHED','REMOVED') then true
    when v_comment.state='REJECTED' and v_new='PUBLISHED' then true
    else false
  end;
  if not v_allowed then raise exception using errcode='22023',message='Moderation transition is not permitted'; end if;

  update public.story_comments
  set state=v_new,
      published_at=case when v_new='PUBLISHED' then coalesce(published_at,now()) else case when v_comment.state='PUBLISHED' then published_at else null end end,
      updated_at=now()
  where id=p_comment_id;

  insert into public.story_comment_moderation_actions(
    comment_id,actor_staff_id,action,previous_state,new_state,reason_code,notes
  )
  values(
    p_comment_id,v_actor,v_action,v_comment.state,v_new,
    left(trim(coalesce(p_reason_code,'policy')),120),
    left(nullif(trim(p_notes),''),4000)
  );

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'reader.comment.moderated','story_comments',p_comment_id,
    jsonb_build_object('previous',v_comment.state,'new',v_new,'action',v_action,'reason_code',p_reason_code));

  return v_new;
end;
$$;

create or replace function public.newsroom_restrict_reader_comments(
  p_reader_profile_id uuid,
  p_kind text,
  p_reason_code text,
  p_ends_at timestamptz default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_kind text:=lower(trim(coalesce(p_kind,'')));
  v_id uuid;
begin
  if not public.newsroom_has_capability('comment.restrict') then
    raise exception using errcode='42501',message='comment.restrict capability required';
  end if;
  if v_kind not in ('pre_moderation','comment_block','link_block') then
    raise exception using errcode='22023',message='Invalid reader restriction kind';
  end if;
  if not exists(select 1 from public.reader_comment_profiles where id=p_reader_profile_id) then
    raise exception using errcode='P0002',message='Reader comment profile not found';
  end if;
  if p_ends_at is not null and p_ends_at<=now() then
    raise exception using errcode='22023',message='Restriction end must be in the future';
  end if;

  insert into public.reader_comment_restrictions(
    reader_profile_id,kind,reason_code,notes,ends_at,created_by_staff_id
  )
  values(
    p_reader_profile_id,v_kind,left(trim(coalesce(p_reason_code,'policy')),120),
    left(nullif(trim(p_notes),''),4000),p_ends_at,v_actor
  )
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'reader.comment.restricted','reader_comment_restrictions',v_id,
    jsonb_build_object('reader_profile_id',p_reader_profile_id,'kind',v_kind,'ends_at',p_ends_at,'reason_code',p_reason_code));

  return v_id;
end;
$$;

create or replace function public.newsroom_lift_reader_comment_restriction(
  p_restriction_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_actor uuid:=public.newsroom_current_staff_id_basic();
  v_profile uuid;
begin
  if not public.newsroom_has_capability('comment.restrict') then
    raise exception using errcode='42501',message='comment.restrict capability required';
  end if;

  update public.reader_comment_restrictions
  set lifted_at=coalesce(lifted_at,now()),lifted_by_staff_id=v_actor,
      notes=case when nullif(trim(p_notes),'') is null then notes else coalesce(notes||E'\n','')||left(trim(p_notes),2000) end
  where id=p_restriction_id
  returning reader_profile_id into v_profile;

  if v_profile is null then raise exception using errcode='P0002',message='Reader restriction not found'; end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'reader.comment.restriction_lifted','reader_comment_restrictions',p_restriction_id,
    jsonb_build_object('reader_profile_id',v_profile));
end;
$$;

revoke execute on function public.reader_current_comment_profile_id() from public,anon;
revoke execute on function public.reader_email_verified() from public,anon;
revoke execute on function public.reader_has_active_comment_restriction(uuid,text) from public,anon,authenticated;
revoke execute on function public.reader_story_discussion_visible(uuid) from public,anon,authenticated;
revoke execute on function public.reader_story_is_commentable(uuid) from public,anon,authenticated;
grant execute on function public.reader_current_comment_profile_id() to authenticated;
grant execute on function public.reader_email_verified() to authenticated;

revoke execute on function public.reader_register_comment_profile(text) from public,anon;
revoke execute on function public.reader_comment_eligibility(uuid) from public,anon;
revoke execute on function public.reader_submit_story_comment(uuid,text,uuid) from public,anon;
revoke execute on function public.reader_edit_story_comment(uuid,text) from public,anon;
revoke execute on function public.reader_withdraw_story_comment(uuid) from public,anon;
revoke execute on function public.reader_report_story_comment(uuid,text,text) from public,anon;
grant execute on function public.reader_register_comment_profile(text) to authenticated;
grant execute on function public.reader_comment_eligibility(uuid) to authenticated;
grant execute on function public.reader_submit_story_comment(uuid,text,uuid) to authenticated;
grant execute on function public.reader_edit_story_comment(uuid,text) to authenticated;
grant execute on function public.reader_withdraw_story_comment(uuid) to authenticated;
grant execute on function public.reader_report_story_comment(uuid,text,text) to authenticated;

revoke execute on function public.reader_public_story_comments(uuid,integer,timestamptz) from public;
grant execute on function public.reader_public_story_comments(uuid,integer,timestamptz) to anon,authenticated;

revoke execute on function public.newsroom_set_story_comment_policy(uuid,text) from public,anon;
revoke execute on function public.newsroom_list_comment_moderation_queue(text,integer) from public,anon;
revoke execute on function public.newsroom_moderate_story_comment(uuid,text,text,text) from public,anon;
revoke execute on function public.newsroom_restrict_reader_comments(uuid,text,text,timestamptz,text) from public,anon;
revoke execute on function public.newsroom_lift_reader_comment_restriction(uuid,text) from public,anon;
grant execute on function public.newsroom_set_story_comment_policy(uuid,text) to authenticated;
grant execute on function public.newsroom_list_comment_moderation_queue(text,integer) to authenticated;
grant execute on function public.newsroom_moderate_story_comment(uuid,text,text,text) to authenticated;
grant execute on function public.newsroom_restrict_reader_comments(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function public.newsroom_lift_reader_comment_restriction(uuid,text) to authenticated;

commit;
