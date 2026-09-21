-- AG-06 Newsroom backend/auth/RBAC foundation.
-- Scope: Newsroom/auth/security only. AG-04 retains ownership of content-ingestion semantics.
-- Forward-only migration; existing CP1/CP2 migrations are not rewritten.

begin;

alter table public.staff_profiles
  add column if not exists handle text,
  add column if not exists beat text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists assigned_editor_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists last_login_at timestamptz,
  add column if not exists bio text,
  add column if not exists profile_image_url text,
  add column if not exists phone text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb,
  add column if not exists mfa_enrolled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_staff_profiles_handle_unique
  on public.staff_profiles (lower(handle))
  where handle is not null;

alter table public.ad_campaigns
  add column if not exists created_by uuid references public.staff_profiles(id) on delete set null,
  add column if not exists approved_by uuid references public.staff_profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.ad_creatives
  add column if not exists created_by uuid references public.staff_profiles(id) on delete set null,
  add column if not exists status text not null default 'draft';

alter table public.stories
  add column if not exists workflow_status text,
  add column if not exists owner_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists assigned_editor_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists fact_checker_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists health_reviewer_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists copy_editor_staff_id uuid references public.staff_profiles(id) on delete set null,
  add column if not exists desk text,
  add column if not exists topic text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists source_notes text,
  add column if not exists internal_notes text,
  add column if not exists deadline_at timestamptz,
  add column if not exists distribution jsonb not null default '{}'::jsonb,
  add column if not exists ad_setting text not null default 'Standard',
  add column if not exists lock_version integer not null default 1,
  add column if not exists last_saved_by uuid references public.staff_profiles(id) on delete set null;

create table if not exists public.newsroom_staff_invitations (
  id uuid primary key default gen_random_uuid(),
  invited_email text not null,
  display_name text not null,
  invited_role_id uuid not null references public.newsroom_roles(id),
  desk text,
  country text,
  assigned_editor_id uuid references public.staff_profiles(id) on delete set null,
  invited_by uuid not null references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  accepted_at timestamptz,
  status text not null default 'pending',
  auth_user_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_newsroom_staff_invites_open_email
  on public.newsroom_staff_invitations (lower(invited_email))
  where status in ('pending','sent');

create table if not exists public.newsroom_staff_capability_overrides (
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  capability_key text not null references public.newsroom_capabilities(key) on delete cascade,
  allowed boolean not null,
  granted_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (staff_profile_id, capability_key)
);

create table if not exists public.newsroom_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  provider_session_id text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.staff_profiles(id) on delete set null,
  unique (auth_user_id, provider_session_id)
);

create table if not exists public.story_autosaves (
  story_id uuid primary key references public.stories(id) on delete cascade,
  title text,
  standfirst text,
  body_html text,
  saved_by uuid not null references public.staff_profiles(id),
  lock_version integer not null,
  saved_at timestamptz not null default now()
);

create table if not exists public.story_assignments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  title text not null,
  reporter_staff_id uuid not null references public.staff_profiles(id),
  assigned_editor_staff_id uuid references public.staff_profiles(id) on delete set null,
  desk text,
  deadline_at timestamptz,
  priority text not null default 'Normal',
  notes text,
  status text not null default 'Assigned',
  assigned_by uuid not null references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_reviews (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  review_type text not null,
  assigned_to uuid references public.staff_profiles(id) on delete set null,
  status text not null default 'pending',
  notes text,
  completed_at timestamptz,
  completed_by uuid references public.staff_profiles(id) on delete set null,
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_internal_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_staff_id uuid not null references public.staff_profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.staff_profiles(id) on delete set null
);

create table if not exists public.story_corrections (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  reason text not null,
  changed_by uuid not null references public.staff_profiles(id),
  previous_revision_id uuid references public.story_revisions(id) on delete set null,
  new_revision_id uuid references public.story_revisions(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.newsroom_notifications (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  event_type text not null,
  target_table text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_assignments_reporter_status on public.story_assignments(reporter_staff_id, status);
create index if not exists idx_story_reviews_story_type on public.story_reviews(story_id, review_type);
create index if not exists idx_story_internal_comments_story on public.story_internal_comments(story_id, created_at);
create index if not exists idx_newsroom_sessions_staff on public.newsroom_sessions(staff_profile_id, revoked_at);
create index if not exists idx_audit_logs_actor_time on public.audit_logs(actor_staff_id, created_at);
create index if not exists idx_stories_owner_workflow on public.stories(owner_staff_id, workflow_status);

insert into public.newsroom_capabilities(key, description) values
  ('story.create','Create newsroom stories'),
  ('story.edit_own','Edit owned or assigned newsroom stories'),
  ('story.edit_all','Edit newsroom stories across permitted desks'),
  ('story.submit','Submit a story into editorial review'),
  ('story.fact_check','Perform fact-check review'),
  ('story.health_review','Perform health/science review'),
  ('story.copy_edit','Perform copy editing'),
  ('story.publish','Publish a story after required gates'),
  ('story.correct','Record and publish corrections'),
  ('assignment.create','Create assignments'),
  ('assignment.manage','Manage newsroom assignments'),
  ('premium.assign','Assign Public/Premium editorial policy'),
  ('premium.manage','Manage Premium editorial policy'),
  ('ads.view','View advertising operations'),
  ('ads.create','Create advertising campaigns and creatives'),
  ('ads.approve','Approve advertising campaigns'),
  ('subscriber.view','View permitted subscriber records'),
  ('subscriber.manage','Manage subscriber operations'),
  ('staff.view','View staff administration records'),
  ('staff.invite','Invite newsroom staff'),
  ('staff.change_role','Change staff role collections'),
  ('staff.revoke','Suspend/revoke newsroom access'),
  ('analytics.view','View newsroom analytics'),
  ('settings.manage','Manage privileged newsroom settings'),
  ('security.manage','Manage newsroom security policy'),
  ('security.view_sessions','View staff session registry'),
  ('security.revoke_session','Revoke newsroom sessions'),
  ('security.view_audit','View immutable audit records'),
  ('distribution.manage','Manage newsroom distribution surfaces'),
  ('media.manage','Manage newsroom media')
on conflict (key) do update set description = excluded.description;

insert into public.newsroom_roles(name, description) values
  ('Publisher / Owner','Publisher-level organisation authority; all actions remain audited'),
  ('Editor-in-Chief','Senior editorial review and publishing authority'),
  ('Managing Editor','Editorial operations, assignments, review and publishing'),
  ('Section Editor','Desk editorial and assignment management'),
  ('News Editor','News desk editorial and assignment management'),
  ('Reporter / Journalist','Create, edit own/assigned stories and submit for review'),
  ('Health / Science Editor','Specialist health/science review'),
  ('Fact Checker','Fact-check review'),
  ('Copy Editor','Copy-edit review'),
  ('Multimedia Editor','Media and permitted story editing'),
  ('Social Editor','Distribution and analytics'),
  ('Newsletter Editor','Newsletter/distribution and audience analytics'),
  ('Commercial Manager','Advertising, subscriber and Premium operations without editorial publishing'),
  ('Subscriber Manager','Subscriber operations'),
  ('Analyst','Analytics-only access')
on conflict (name) do update set description = excluded.description;

delete from public.newsroom_role_capabilities
where role_id in (select id from public.newsroom_roles where name in (
  'Publisher / Owner','Editor-in-Chief','Managing Editor','Section Editor','News Editor',
  'Reporter / Journalist','Health / Science Editor','Fact Checker','Copy Editor',
  'Multimedia Editor','Social Editor','Newsletter Editor','Commercial Manager',
  'Subscriber Manager','Analyst'
));

with role_caps(role_name, cap) as (
  values
  ('Publisher / Owner','story.create'),('Publisher / Owner','story.edit_own'),('Publisher / Owner','story.edit_all'),
  ('Publisher / Owner','story.submit'),('Publisher / Owner','story.fact_check'),('Publisher / Owner','story.health_review'),
  ('Publisher / Owner','story.copy_edit'),('Publisher / Owner','story.publish'),('Publisher / Owner','story.correct'),
  ('Publisher / Owner','assignment.create'),('Publisher / Owner','assignment.manage'),
  ('Publisher / Owner','premium.assign'),('Publisher / Owner','premium.manage'),
  ('Publisher / Owner','ads.view'),('Publisher / Owner','ads.create'),('Publisher / Owner','ads.approve'),
  ('Publisher / Owner','subscriber.view'),('Publisher / Owner','subscriber.manage'),
  ('Publisher / Owner','staff.view'),('Publisher / Owner','staff.invite'),('Publisher / Owner','staff.change_role'),('Publisher / Owner','staff.revoke'),
  ('Publisher / Owner','analytics.view'),('Publisher / Owner','settings.manage'),('Publisher / Owner','security.manage'),
  ('Publisher / Owner','security.view_sessions'),('Publisher / Owner','security.revoke_session'),('Publisher / Owner','security.view_audit'),
  ('Publisher / Owner','distribution.manage'),('Publisher / Owner','media.manage'),

  ('Editor-in-Chief','story.create'),('Editor-in-Chief','story.edit_own'),('Editor-in-Chief','story.edit_all'),
  ('Editor-in-Chief','story.submit'),('Editor-in-Chief','story.fact_check'),('Editor-in-Chief','story.health_review'),
  ('Editor-in-Chief','story.copy_edit'),('Editor-in-Chief','story.publish'),('Editor-in-Chief','story.correct'),
  ('Editor-in-Chief','assignment.create'),('Editor-in-Chief','assignment.manage'),
  ('Editor-in-Chief','premium.assign'),('Editor-in-Chief','premium.manage'),
  ('Editor-in-Chief','ads.view'),('Editor-in-Chief','ads.approve'),('Editor-in-Chief','subscriber.view'),
  ('Editor-in-Chief','staff.view'),('Editor-in-Chief','staff.invite'),('Editor-in-Chief','staff.change_role'),('Editor-in-Chief','staff.revoke'),
  ('Editor-in-Chief','analytics.view'),('Editor-in-Chief','security.manage'),('Editor-in-Chief','security.view_sessions'),
  ('Editor-in-Chief','security.revoke_session'),('Editor-in-Chief','security.view_audit'),
  ('Editor-in-Chief','distribution.manage'),('Editor-in-Chief','media.manage'),

  ('Managing Editor','story.create'),('Managing Editor','story.edit_own'),('Managing Editor','story.edit_all'),
  ('Managing Editor','story.submit'),('Managing Editor','story.fact_check'),('Managing Editor','story.health_review'),
  ('Managing Editor','story.copy_edit'),('Managing Editor','story.publish'),('Managing Editor','story.correct'),
  ('Managing Editor','assignment.create'),('Managing Editor','assignment.manage'),
  ('Managing Editor','premium.assign'),('Managing Editor','staff.view'),('Managing Editor','analytics.view'),
  ('Managing Editor','distribution.manage'),('Managing Editor','media.manage'),

  ('Section Editor','story.create'),('Section Editor','story.edit_own'),('Section Editor','story.edit_all'),
  ('Section Editor','story.submit'),('Section Editor','story.fact_check'),('Section Editor','story.copy_edit'),
  ('Section Editor','assignment.create'),('Section Editor','assignment.manage'),('Section Editor','premium.assign'),
  ('Section Editor','analytics.view'),('Section Editor','distribution.manage'),('Section Editor','media.manage'),

  ('News Editor','story.create'),('News Editor','story.edit_own'),('News Editor','story.edit_all'),
  ('News Editor','story.submit'),('News Editor','story.fact_check'),('News Editor','story.copy_edit'),
  ('News Editor','assignment.create'),('News Editor','assignment.manage'),('News Editor','analytics.view'),
  ('News Editor','distribution.manage'),('News Editor','media.manage'),

  ('Reporter / Journalist','story.create'),('Reporter / Journalist','story.edit_own'),
  ('Reporter / Journalist','story.submit'),('Reporter / Journalist','media.manage'),

  ('Health / Science Editor','story.edit_all'),('Health / Science Editor','story.health_review'),
  ('Health / Science Editor','story.submit'),('Health / Science Editor','analytics.view'),

  ('Fact Checker','story.edit_all'),('Fact Checker','story.fact_check'),('Fact Checker','story.submit'),
  ('Copy Editor','story.edit_all'),('Copy Editor','story.copy_edit'),('Copy Editor','story.submit'),
  ('Multimedia Editor','media.manage'),('Multimedia Editor','story.edit_all'),
  ('Social Editor','distribution.manage'),('Social Editor','analytics.view'),
  ('Newsletter Editor','distribution.manage'),('Newsletter Editor','analytics.view'),('Newsletter Editor','subscriber.view'),
  ('Commercial Manager','ads.view'),('Commercial Manager','ads.create'),('Commercial Manager','ads.approve'),
  ('Commercial Manager','subscriber.view'),('Commercial Manager','subscriber.manage'),
  ('Commercial Manager','analytics.view'),('Commercial Manager','premium.manage'),
  ('Subscriber Manager','subscriber.view'),('Subscriber Manager','subscriber.manage'),('Subscriber Manager','analytics.view'),
  ('Analyst','analytics.view')
)
insert into public.newsroom_role_capabilities(role_id, capability_key)
select r.id, rc.cap
from role_caps rc
join public.newsroom_roles r on r.name = rc.role_name
on conflict do nothing;

create or replace function public.newsroom_jwt_session_id()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'session_id','');
$$;

create or replace function public.newsroom_current_staff_id_basic()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select sp.id
  from public.staff_profiles sp
  where sp.auth_user_id = auth.uid()
    and lower(sp.status) = 'active'
  limit 1;
$$;

create or replace function public.newsroom_session_authorized()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.newsroom_sessions ns on ns.staff_profile_id = sp.id
    where sp.auth_user_id = auth.uid()
      and lower(sp.status) = 'active'
      and ns.auth_user_id = auth.uid()
      and ns.provider_session_id = public.newsroom_jwt_session_id()
      and ns.revoked_at is null
  );
$$;

create or replace function public.newsroom_has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  with me as (
    select sp.id, sp.role_id
    from public.staff_profiles sp
    where sp.auth_user_id = auth.uid()
      and lower(sp.status) = 'active'
    limit 1
  ),
  override_value as (
    select o.allowed
    from public.newsroom_staff_capability_overrides o
    join me on me.id = o.staff_profile_id
    where o.capability_key = p_capability
    limit 1
  )
  select public.newsroom_session_authorized()
     and coalesce(
       (select allowed from override_value),
       exists (
         select 1
         from me
         join public.newsroom_role_capabilities rc on rc.role_id = me.role_id
         where rc.capability_key = p_capability
       ),
       false
     );
$$;

create or replace function public.newsroom_can_read_story(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.newsroom_session_authorized() and (
    public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
    or public.newsroom_has_capability('story.fact_check')
    or public.newsroom_has_capability('story.health_review')
    or public.newsroom_has_capability('story.copy_edit')
    or exists (
      select 1 from public.stories s
      where s.id = p_story_id
        and s.owner_staff_id = public.newsroom_current_staff_id_basic()
    )
    or exists (
      select 1 from public.story_assignments a
      where a.story_id = p_story_id
        and a.reporter_staff_id = public.newsroom_current_staff_id_basic()
    )
  );
$$;

create or replace function public.newsroom_can_edit_story(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.newsroom_session_authorized() and (
    public.newsroom_has_capability('story.edit_all')
    or (
      public.newsroom_has_capability('story.edit_own')
      and (
        exists (select 1 from public.stories s where s.id=p_story_id and s.owner_staff_id=public.newsroom_current_staff_id_basic())
        or exists (select 1 from public.story_assignments a where a.story_id=p_story_id and a.reporter_staff_id=public.newsroom_current_staff_id_basic())
      )
    )
  );
$$;

create or replace function public.newsroom_safe_editor_text(p_value text)
returns text
language plpgsql
immutable
as $$
begin
  if p_value is null then return null; end if;
  if p_value ~* '<\s*script\b|javascript\s*:|onerror\s*=|onload\s*=' then
    raise exception using errcode='22023', message='Unsafe executable markup is not permitted in newsroom content';
  end if;
  return p_value;
end;
$$;

create or replace function public.newsroom_register_session(p_user_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_session_id text := public.newsroom_jwt_session_id();
  v_was_registered boolean := false;
begin
  if auth.uid() is null or v_session_id is null then
    raise exception using errcode='28000', message='Authenticated provider session required';
  end if;

  select * into v_staff
  from public.staff_profiles
  where auth_user_id = auth.uid()
    and lower(status) = 'active'
  limit 1;

  if v_staff.id is null then
    raise exception using errcode='42501', message='Active Newsroom staff profile required';
  end if;

  select exists(
    select 1 from public.newsroom_sessions
    where auth_user_id=auth.uid() and provider_session_id=v_session_id and revoked_at is null
  ) into v_was_registered;

  insert into public.newsroom_sessions(auth_user_id, staff_profile_id, provider_session_id, user_agent, last_seen_at, revoked_at, revoked_by)
  values(auth.uid(), v_staff.id, v_session_id, left(p_user_agent,500), now(), null, null)
  on conflict (auth_user_id, provider_session_id)
  do update set
    staff_profile_id=excluded.staff_profile_id,
    user_agent=excluded.user_agent,
    last_seen_at=now()
  where public.newsroom_sessions.revoked_at is null;

  if not exists (
    select 1 from public.newsroom_sessions
    where auth_user_id=auth.uid()
      and provider_session_id=v_session_id
      and revoked_at is null
  ) then
    raise exception using errcode='42501', message='Newsroom session has been revoked';
  end if;

  perform set_config('app.newsroom_rpc','1',true);
  update public.staff_profiles set last_login_at=now(), updated_at=now() where id=v_staff.id;

  if not v_was_registered then
    insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
    values(v_staff.id,'staff.login','staff_profiles',v_staff.id,jsonb_build_object('session_id',v_session_id));
  end if;

  return jsonb_build_object('staff_profile_id',v_staff.id,'session_id',v_session_id);
end;
$$;

create or replace function public.newsroom_current_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_role text;
  v_caps text[];
  v_editor_handle text;
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501', message='Active Newsroom session required';
  end if;

  select sp.* into v_staff
  from public.staff_profiles sp
  where sp.auth_user_id=auth.uid()
  limit 1;

  select r.name into v_role
  from public.newsroom_roles r
  where r.id=v_staff.role_id;

  select coalesce(array_agg(capability_key order by capability_key), array[]::text[])
  into v_caps
  from (
    select c.key as capability_key
    from public.newsroom_capabilities c
    where public.newsroom_has_capability(c.key)
  ) q;

  select handle into v_editor_handle from public.staff_profiles where id=v_staff.assigned_editor_id;

  return jsonb_build_object(
    'id',v_staff.id,
    'auth_user_id',v_staff.auth_user_id,
    'handle',coalesce(v_staff.handle, split_part(v_staff.email,'@',1)),
    'email',v_staff.email,
    'display_name',v_staff.display_name,
    'role',v_role,
    'desk',v_staff.desk,
    'beat',v_staff.beat,
    'country',v_staff.country,
    'region',v_staff.region,
    'status',v_staff.status,
    'assigned_editor',v_editor_handle,
    'last_login_at',v_staff.last_login_at,
    'mfa_required',v_staff.mfa_required,
    'mfa_enrolled_at',v_staff.mfa_enrolled_at,
    'capabilities',to_jsonb(v_caps),
    'session_id',public.newsroom_jwt_session_id()
  );
end;
$$;

create or replace function public.newsroom_staff_directory()
returns table(
  id uuid,
  handle text,
  display_name text,
  role text,
  desk text,
  beat text,
  country text,
  region text,
  status text,
  assigned_editor_id uuid
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select sp.id, coalesce(sp.handle,split_part(sp.email,'@',1)), sp.display_name, r.name,
         sp.desk, sp.beat, sp.country, sp.region, sp.status, sp.assigned_editor_id
  from public.staff_profiles sp
  left join public.newsroom_roles r on r.id=sp.role_id
  where public.newsroom_session_authorized()
    and (lower(sp.status)='active' or public.newsroom_has_capability('staff.view'))
  order by sp.display_name;
$$;

create or replace function public.newsroom_public_published_stories(p_slug text default null)
returns table(
  id uuid,
  title text,
  slug text,
  standfirst text,
  excerpt text,
  body_html text,
  published_at timestamptz,
  modified_at timestamptz,
  seo_title text,
  seo_description text,
  canonical_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,s.title,s.slug,s.standfirst,s.excerpt,s.body_html,s.published_at,s.modified_at,
         s.seo_title,s.seo_description,s.canonical_url
  from public.stories s
  where lower(s.status) in ('publish','published')
    and lower(s.access_policy)='public'
    and (s.published_at is null or s.published_at <= now())
    and (p_slug is null or s.slug=p_slug)
  order by s.published_at desc nulls last, s.created_at desc;
$$;

create or replace function public.newsroom_create_story(p_story jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_story_id uuid;
  v_slug text;
begin
  if not public.newsroom_has_capability('story.create') then
    raise exception using errcode='42501', message='story.create capability required';
  end if;

  v_slug := nullif(trim(coalesce(p_story->>'slug','')),'');
  if v_slug is null then
    v_slug := 'draft-' || replace(gen_random_uuid()::text,'-','');
  end if;

  insert into public.stories(
    title,slug,standfirst,body_html,status,workflow_status,access_policy,owner_staff_id,
    assigned_editor_staff_id,desk,topic,country,region,source_notes,internal_notes,
    deadline_at,seo_title,seo_description,scheduled_at,distribution,ad_setting,last_saved_by,modified_at
  ) values(
    coalesce(nullif(trim(p_story->>'title'),''),'Untitled story'),
    v_slug,
    public.newsroom_safe_editor_text(p_story->>'standfirst'),
    public.newsroom_safe_editor_text(p_story->>'body'),
    'draft','Draft','public',v_actor,
    null,
    p_story->>'desk',p_story->>'topic',p_story->>'country',p_story->>'region',
    public.newsroom_safe_editor_text(p_story->>'sources'),
    public.newsroom_safe_editor_text(p_story->>'notes'),
    nullif(p_story->>'deadline_at','')::timestamptz,
    p_story->>'seo_title',p_story->>'seo_description',
    null,
    '{}'::jsonb,
    'Standard',
    v_actor,now()
  ) returning id into v_story_id;

  insert into public.story_revisions(story_id,revision_number,title,body_html,editor_id,change_summary)
  values(v_story_id,1,coalesce(nullif(trim(p_story->>'title'),''),'Untitled story'),
         public.newsroom_safe_editor_text(p_story->>'body'),v_actor,'Story created');

  insert into public.story_lifecycle_events(story_id,from_status,to_status,actor_staff_id,reason)
  values(v_story_id,null,'Draft',v_actor,'Story created');

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.created','stories',v_story_id,jsonb_build_object('workflow_status','Draft'));

  return v_story_id;
end;
$$;

create or replace function public.newsroom_save_story(p_story_id uuid, p_expected_version integer, p_patch jsonb, p_reason text default 'Autosave')
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_old public.stories%rowtype;
  v_new_version integer;
  v_owner uuid;
  v_editor uuid;
  v_checker uuid;
  v_access text;
  v_scheduled_at timestamptz;
  v_distribution jsonb;
  v_ad_setting text;
  v_next_revision integer;
begin
  if not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501', message='Story edit authority required';
  end if;

  select * into v_old from public.stories where id=p_story_id for update;
  if v_old.id is null then raise exception using errcode='P0002', message='Story not found'; end if;
  if v_old.lock_version <> p_expected_version then
    raise exception using errcode='40001', message='VERSION_CONFLICT';
  end if;

  v_owner := v_old.owner_staff_id;
  v_editor := v_old.assigned_editor_staff_id;
  v_checker := v_old.fact_checker_staff_id;
  v_access := v_old.access_policy;
  v_scheduled_at := v_old.scheduled_at;
  v_distribution := v_old.distribution;
  v_ad_setting := v_old.ad_setting;

  if p_patch ? 'owner_staff_id' and coalesce(p_patch->>'owner_staff_id','') <> coalesce(v_owner::text,'') then
    if not public.newsroom_has_capability('story.edit_all') then raise exception using errcode='42501',message='story.edit_all required to reassign owner'; end if;
    v_owner := nullif(p_patch->>'owner_staff_id','')::uuid;
  end if;
  if p_patch ? 'assigned_editor_staff_id' and coalesce(p_patch->>'assigned_editor_staff_id','') <> coalesce(v_editor::text,'') then
    if not public.newsroom_has_capability('story.edit_all') then raise exception using errcode='42501',message='story.edit_all required to assign editor'; end if;
    v_editor := nullif(p_patch->>'assigned_editor_staff_id','')::uuid;
  end if;
  if p_patch ? 'fact_checker_staff_id' and coalesce(p_patch->>'fact_checker_staff_id','') <> coalesce(v_checker::text,'') then
    if not public.newsroom_has_capability('story.edit_all') then raise exception using errcode='42501',message='story.edit_all required to assign fact checker'; end if;
    v_checker := nullif(p_patch->>'fact_checker_staff_id','')::uuid;
  end if;
  if p_patch ? 'access_policy' and lower(coalesce(p_patch->>'access_policy','')) <> lower(coalesce(v_access,'')) then
    if not (public.newsroom_has_capability('premium.assign') or public.newsroom_has_capability('premium.manage')) then
      raise exception using errcode='42501',message='Premium policy capability required';
    end if;
    v_access := lower(p_patch->>'access_policy');
  end if;
  if p_patch ? 'scheduled_at' then
    v_scheduled_at := nullif(p_patch->>'scheduled_at','')::timestamptz;
    if v_scheduled_at is distinct from v_old.scheduled_at and not public.newsroom_has_capability('story.publish') then
      raise exception using errcode='42501',message='story.publish capability required to schedule publication';
    end if;
  end if;
  if p_patch ? 'distribution' then
    v_distribution := coalesce(p_patch->'distribution','{}'::jsonb);
    if v_distribution is distinct from v_old.distribution
       and not (public.newsroom_has_capability('distribution.manage') or public.newsroom_has_capability('story.edit_all')) then
      raise exception using errcode='42501',message='Distribution authority required';
    end if;
  end if;
  if p_patch ? 'ad_setting' then
    v_ad_setting := coalesce(nullif(p_patch->>'ad_setting',''),'Standard');
    if v_ad_setting is distinct from v_old.ad_setting and not public.newsroom_has_capability('story.edit_all') then
      raise exception using errcode='42501',message='Editorial authority required to change story advertising policy';
    end if;
  end if;

  perform set_config('app.newsroom_rpc','1',true);

  update public.stories
  set title=coalesce(nullif(trim(p_patch->>'title'),''),title),
      standfirst=case when p_patch ? 'standfirst' then public.newsroom_safe_editor_text(p_patch->>'standfirst') else standfirst end,
      body_html=case when p_patch ? 'body' then public.newsroom_safe_editor_text(p_patch->>'body') else body_html end,
      source_notes=case when p_patch ? 'sources' then public.newsroom_safe_editor_text(p_patch->>'sources') else source_notes end,
      internal_notes=case when p_patch ? 'notes' then public.newsroom_safe_editor_text(p_patch->>'notes') else internal_notes end,
      owner_staff_id=v_owner,
      assigned_editor_staff_id=v_editor,
      fact_checker_staff_id=v_checker,
      desk=coalesce(p_patch->>'desk',desk),
      topic=coalesce(p_patch->>'topic',topic),
      country=coalesce(p_patch->>'country',country),
      region=coalesce(p_patch->>'region',region),
      access_policy=v_access,
      deadline_at=case when p_patch ? 'deadline_at' then nullif(p_patch->>'deadline_at','')::timestamptz else deadline_at end,
      seo_title=case when p_patch ? 'seo_title' then p_patch->>'seo_title' else seo_title end,
      seo_description=case when p_patch ? 'seo_description' then p_patch->>'seo_description' else seo_description end,
      slug=case when nullif(trim(p_patch->>'slug'),'') is not null then trim(p_patch->>'slug') else slug end,
      scheduled_at=v_scheduled_at,
      distribution=v_distribution,
      ad_setting=v_ad_setting,
      lock_version=lock_version+1,
      last_saved_by=v_actor,
      modified_at=now(),
      updated_at=now()
  where id=p_story_id
  returning lock_version into v_new_version;

  if lower(coalesce(p_reason,'autosave'))='autosave' then
    insert into public.story_autosaves(story_id,title,standfirst,body_html,saved_by,lock_version,saved_at)
    select id,title,standfirst,body_html,v_actor,lock_version,now()
    from public.stories where id=p_story_id
    on conflict (story_id) do update set
      title=excluded.title,
      standfirst=excluded.standfirst,
      body_html=excluded.body_html,
      saved_by=excluded.saved_by,
      lock_version=excluded.lock_version,
      saved_at=excluded.saved_at;
  else
    select coalesce(max(revision_number),0)+1 into v_next_revision from public.story_revisions where story_id=p_story_id;
    insert into public.story_revisions(story_id,revision_number,title,body_html,editor_id,change_summary)
    select id,v_next_revision,title,body_html,v_actor,left(coalesce(p_reason,'Manual save'),240)
    from public.stories where id=p_story_id;
    delete from public.story_autosaves where story_id=p_story_id;
  end if;

  if v_access is distinct from v_old.access_policy then
    insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
    values(v_actor,'story.access_policy.changed','stories',p_story_id,
      jsonb_build_object('previous',v_old.access_policy,'new',v_access));
  end if;
  if v_scheduled_at is distinct from v_old.scheduled_at then
    insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
    values(v_actor,'story.schedule.changed','stories',p_story_id,
      jsonb_build_object('previous',v_old.scheduled_at,'new',v_scheduled_at));
  end if;

  return v_new_version;
end;
$$;

create or replace function public.newsroom_transition_story(p_story_id uuid, p_next_status text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_old public.stories%rowtype;
  v_current text;
  v_next text := trim(p_next_status);
  v_allowed boolean := false;
  v_next_revision integer;
begin
  select * into v_old from public.stories where id=p_story_id for update;
  if v_old.id is null then raise exception using errcode='P0002',message='Story not found'; end if;
  v_current := coalesce(v_old.workflow_status, case when lower(v_old.status) in ('publish','published') then 'Published' else initcap(v_old.status) end);

  if v_next='Submitted' then
    v_allowed := public.newsroom_has_capability('story.submit') and public.newsroom_can_edit_story(p_story_id)
      and v_current in ('Pitch','Approved','Assigned','Reporting','Draft');
  elsif v_next='Fact check' then
    v_allowed := public.newsroom_has_capability('story.fact_check') and v_current in ('Submitted','Fact check');
  elsif v_next='Health / Science review' then
    v_allowed := public.newsroom_has_capability('story.health_review') and v_current in ('Fact check','Health / Science review');
  elsif v_next='Copy edit' then
    v_allowed := public.newsroom_has_capability('story.copy_edit') and v_current in ('Health / Science review','Copy edit');
  elsif v_next='Editor review' then
    v_allowed := (public.newsroom_has_capability('story.edit_all') or public.newsroom_has_capability('story.copy_edit'))
      and v_current in ('Copy edit','Editor review');
  elsif v_next='Ready' then
    v_allowed := public.newsroom_has_capability('story.edit_all') and v_current in ('Editor review','Ready');
  elsif v_next='Scheduled' then
    v_allowed := public.newsroom_has_capability('story.publish') and v_current in ('Ready','Scheduled');
  elsif v_next='Published' then
    v_allowed := public.newsroom_has_capability('story.publish') and v_current in ('Ready','Scheduled');
  elsif v_next='Updated / Corrected' then
    v_allowed := public.newsroom_has_capability('story.correct') and v_current='Published' and nullif(trim(coalesce(p_reason,'')),'') is not null;
  elsif v_next='Archived' then
    v_allowed := public.newsroom_has_capability('story.edit_all') and v_current <> 'Published';
  end if;

  if not v_allowed then
    raise exception using errcode='42501', message='Workflow transition is not authorized';
  end if;

  perform set_config('app.newsroom_rpc','1',true);

  update public.stories
  set workflow_status=v_next,
      status=case when v_next in ('Published','Updated / Corrected') then 'publish'
                  when v_next='Archived' then 'draft'
                  else status end,
      published_at=case when v_next='Published' then coalesce(published_at,now()) else published_at end,
      lock_version=lock_version+1,
      last_saved_by=v_actor,
      modified_at=now(),
      updated_at=now()
  where id=p_story_id;

  insert into public.story_lifecycle_events(story_id,from_status,to_status,actor_staff_id,reason)
  values(p_story_id,v_current,v_next,v_actor,p_reason);

  if v_next in ('Submitted','Published','Updated / Corrected') then
    select coalesce(max(revision_number),0)+1 into v_next_revision from public.story_revisions where story_id=p_story_id;
    insert into public.story_revisions(story_id,revision_number,title,body_html,body_json,editor_id,change_summary)
    select id,v_next_revision,title,body_html,body_json,v_actor,'Workflow milestone: '||v_next
    from public.stories where id=p_story_id;
    delete from public.story_autosaves where story_id=p_story_id;
  end if;

  if v_current in ('Fact check','Health / Science review','Copy edit','Editor review') and v_next<>v_current then
    insert into public.story_reviews(story_id,review_type,assigned_to,status,notes,completed_at,completed_by,created_by)
    values(
      p_story_id,
      case v_current when 'Fact check' then 'fact_check' when 'Health / Science review' then 'health_review' when 'Copy edit' then 'copy_edit' else 'editor_review' end,
      v_actor,'approved',public.newsroom_safe_editor_text(p_reason),now(),v_actor,v_actor
    );
  end if;

  if v_next='Updated / Corrected' then
    insert into public.story_corrections(story_id,reason,changed_by,previous_revision_id,new_revision_id)
    select p_story_id,p_reason,v_actor,
      (select id from public.story_revisions where story_id=p_story_id order by revision_number desc offset 1 limit 1),
      (select id from public.story_revisions where story_id=p_story_id order by revision_number desc limit 1);
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,
    case when v_next='Published' then 'story.published' when v_next='Submitted' then 'story.submitted' else 'story.transitioned' end,
    'stories',p_story_id,jsonb_build_object('previous',v_current,'new',v_next,'reason',p_reason));

  return v_next;
end;
$$;

create or replace function public.newsroom_create_assignment(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_id uuid;
begin
  if not (public.newsroom_has_capability('assignment.create') or public.newsroom_has_capability('assignment.manage')) then
    raise exception using errcode='42501',message='Assignment capability required';
  end if;

  insert into public.story_assignments(story_id,title,reporter_staff_id,assigned_editor_staff_id,desk,deadline_at,priority,notes,status,assigned_by)
  values(
    nullif(p_payload->>'story_id','')::uuid,
    public.newsroom_safe_editor_text(p_payload->>'title'),
    (p_payload->>'reporter_staff_id')::uuid,
    nullif(p_payload->>'assigned_editor_staff_id','')::uuid,
    p_payload->>'desk',
    nullif(p_payload->>'deadline_at','')::timestamptz,
    coalesce(nullif(p_payload->>'priority',''),'Normal'),
    public.newsroom_safe_editor_text(p_payload->>'notes'),
    'Assigned',
    v_actor
  ) returning id into v_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'assignment.created','story_assignments',v_id,jsonb_build_object('reporter_staff_id',p_payload->>'reporter_staff_id'));

  return v_id;
end;
$$;

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
  select status,reporter_staff_id into v_status,v_reporter from public.story_assignments where id=p_assignment_id for update;
  if v_reporter is null then raise exception using errcode='P0002',message='Assignment not found'; end if;
  if v_reporter<>v_actor and not public.newsroom_has_capability('assignment.manage') then
    raise exception using errcode='42501',message='Assignment authority required';
  end if;
  v_next := case v_status
    when 'Assigned' then 'Accepted'
    when 'Accepted' then 'Reporting'
    when 'Reporting' then 'Drafting'
    when 'Drafting' then 'Submitted'
    when 'Submitted' then 'Complete'
    else v_status end;
  update public.story_assignments set status=v_next,updated_at=now() where id=p_assignment_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'assignment.status.changed','story_assignments',p_assignment_id,jsonb_build_object('previous',v_status,'new',v_next));
  return v_next;
end;
$$;

create or replace function public.newsroom_add_comment(p_story_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_id uuid;
begin
  if not public.newsroom_can_read_story(p_story_id) then
    raise exception using errcode='42501',message='Story access required';
  end if;
  insert into public.story_internal_comments(story_id,author_staff_id,body)
  values(p_story_id,v_actor,public.newsroom_safe_editor_text(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.newsroom_create_invitation(
  p_email text,
  p_display_name text,
  p_role_name text,
  p_desk text default null,
  p_country text default null,
  p_assigned_editor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_role_id uuid;
  v_id uuid;
begin
  if not public.newsroom_has_capability('staff.invite') then
    raise exception using errcode='42501',message='staff.invite capability required';
  end if;
  select id into v_role_id from public.newsroom_roles where name=p_role_name;
  if v_role_id is null then raise exception using errcode='22023',message='Unknown newsroom role'; end if;

  insert into public.newsroom_staff_invitations(invited_email,display_name,invited_role_id,desk,country,assigned_editor_id,invited_by)
  values(lower(trim(p_email)),trim(p_display_name),v_role_id,p_desk,p_country,p_assigned_editor_id,v_actor)
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'staff.invited','newsroom_staff_invitations',v_id,
    jsonb_build_object('email',lower(trim(p_email)),'role',p_role_name));

  return jsonb_build_object('id',v_id,'email',lower(trim(p_email)),'display_name',trim(p_display_name),'role',p_role_name);
end;
$$;

create or replace function public.newsroom_change_staff_role(p_staff_id uuid, p_role_name text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_role_id uuid;
  v_previous text;
begin
  if not public.newsroom_has_capability('staff.change_role') then
    raise exception using errcode='42501',message='staff.change_role capability required';
  end if;
  if p_staff_id=v_actor then
    raise exception using errcode='42501',message='Self role changes are not permitted';
  end if;
  select id into v_role_id from public.newsroom_roles where name=p_role_name;
  if v_role_id is null then raise exception using errcode='22023',message='Unknown newsroom role'; end if;
  select r.name into v_previous from public.staff_profiles sp left join public.newsroom_roles r on r.id=sp.role_id where sp.id=p_staff_id;
  if v_previous is null then raise exception using errcode='P0002',message='Staff profile not found'; end if;
  perform set_config('app.newsroom_rpc','1',true);
  update public.staff_profiles set role_id=v_role_id,updated_at=now() where id=p_staff_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'staff.role.changed','staff_profiles',p_staff_id,jsonb_build_object('previous',v_previous,'new',p_role_name));
end;
$$;

create or replace function public.newsroom_revoke_staff(p_staff_id uuid, p_status text default 'revoked')
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_status text := lower(p_status);
begin
  if not public.newsroom_has_capability('staff.revoke') then
    raise exception using errcode='42501',message='staff.revoke capability required';
  end if;
  if p_staff_id=v_actor then raise exception using errcode='42501',message='Self revocation is not permitted'; end if;
  if v_status not in ('suspended','revoked','deactivated') then
    raise exception using errcode='22023',message='Invalid access status';
  end if;
  perform set_config('app.newsroom_rpc','1',true);
  update public.staff_profiles
  set status=v_status,revoked_at=case when v_status='revoked' then now() else revoked_at end,updated_at=now()
  where id=p_staff_id;
  if not found then raise exception using errcode='P0002',message='Staff profile not found'; end if;
  update public.newsroom_sessions set revoked_at=coalesce(revoked_at,now()),revoked_by=v_actor
  where staff_profile_id=p_staff_id and revoked_at is null;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'staff.access.'||v_status,'staff_profiles',p_staff_id,jsonb_build_object('status',v_status));
end;
$$;

create or replace function public.newsroom_revoke_session(p_staff_id uuid, p_provider_session_id text default null)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_count integer;
begin
  if p_staff_id<>v_actor and not public.newsroom_has_capability('security.revoke_session') then
    raise exception using errcode='42501',message='security.revoke_session capability required';
  end if;
  update public.newsroom_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=v_actor
  where staff_profile_id=p_staff_id
    and revoked_at is null
    and (p_provider_session_id is null or provider_session_id=p_provider_session_id);
  get diagnostics v_count = row_count;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'session.revoked','staff_profiles',p_staff_id,jsonb_build_object('provider_session_id',p_provider_session_id,'count',v_count));
  return v_count;
end;
$$;

create or replace function public.newsroom_record_review(
  p_story_id uuid,
  p_review_type text,
  p_status text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_type text := lower(trim(p_review_type));
  v_cap text;
  v_id uuid;
begin
  v_cap := case v_type
    when 'fact_check' then 'story.fact_check'
    when 'health_review' then 'story.health_review'
    when 'science_review' then 'story.health_review'
    when 'copy_edit' then 'story.copy_edit'
    when 'editor_review' then 'story.edit_all'
    else null
  end;
  if v_cap is null or not public.newsroom_has_capability(v_cap) then
    raise exception using errcode='42501',message='Review capability required';
  end if;
  if not public.newsroom_can_read_story(p_story_id) then
    raise exception using errcode='42501',message='Story access required';
  end if;

  insert into public.story_reviews(story_id,review_type,assigned_to,status,notes,completed_at,completed_by,created_by)
  values(
    p_story_id,v_type,v_actor,lower(coalesce(nullif(trim(p_status),''),'completed')),
    public.newsroom_safe_editor_text(p_notes),
    case when lower(coalesce(p_status,'')) in ('completed','approved','changes_requested') then now() else null end,
    case when lower(coalesce(p_status,'')) in ('completed','approved','changes_requested') then v_actor else null end,
    v_actor
  ) returning id into v_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.review.recorded','stories',p_story_id,
    jsonb_build_object('review_id',v_id,'review_type',v_type,'status',p_status));

  return v_id;
end;
$$;

create or replace function public.newsroom_restore_revision(p_story_id uuid, p_revision_id uuid, p_expected_version integer)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_revision public.story_revisions%rowtype;
  v_current public.stories%rowtype;
  v_new_version integer;
  v_next_revision integer;
begin
  if not public.newsroom_can_edit_story(p_story_id) then
    raise exception using errcode='42501',message='Story edit authority required';
  end if;
  select * into v_current from public.stories where id=p_story_id for update;
  if v_current.lock_version<>p_expected_version then
    raise exception using errcode='40001',message='VERSION_CONFLICT';
  end if;
  select * into v_revision from public.story_revisions where id=p_revision_id and story_id=p_story_id;
  if v_revision.id is null then raise exception using errcode='P0002',message='Revision not found'; end if;

  perform set_config('app.newsroom_rpc','1',true);
  update public.stories
  set title=coalesce(v_revision.title,title),
      body_html=v_revision.body_html,
      body_json=v_revision.body_json,
      lock_version=lock_version+1,
      last_saved_by=v_actor,
      modified_at=now(),
      updated_at=now()
  where id=p_story_id
  returning lock_version into v_new_version;

  select coalesce(max(revision_number),0)+1 into v_next_revision from public.story_revisions where story_id=p_story_id;
  insert into public.story_revisions(story_id,revision_number,title,body_html,body_json,editor_id,change_summary)
  values(p_story_id,v_next_revision,coalesce(v_revision.title,v_current.title),v_revision.body_html,v_revision.body_json,v_actor,
         'Restored revision '||v_revision.revision_number::text);

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.revision.restored','stories',p_story_id,
    jsonb_build_object('revision_id',p_revision_id,'revision_number',v_revision.revision_number));

  return v_new_version;
end;
$$;

create or replace function public.newsroom_create_campaign(
  p_advertiser_id uuid,
  p_name text,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_id uuid;
begin
  if not public.newsroom_has_capability('ads.create') then
    raise exception using errcode='42501',message='ads.create capability required';
  end if;
  insert into public.ad_campaigns(advertiser_id,name,status,start_at,end_at,review_status,created_by)
  values(p_advertiser_id,trim(p_name),'draft',p_start_at,p_end_at,'pending',v_actor)
  returning id into v_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'campaign.created','ad_campaigns',v_id,jsonb_build_object('status','draft','review_status','pending'));
  return v_id;
end;
$$;

create or replace function public.newsroom_approve_campaign(p_campaign_id uuid, p_approved boolean)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_review text := case when p_approved then 'approved' else 'rejected' end;
begin
  if not public.newsroom_has_capability('ads.approve') then
    raise exception using errcode='42501',message='ads.approve capability required';
  end if;
  perform set_config('app.newsroom_rpc','1',true);
  update public.ad_campaigns
  set review_status=v_review,
      status=case when p_approved and status='draft' then 'approved' else status end,
      approved_by=case when p_approved then v_actor else null end,
      approved_at=case when p_approved then now() else null end
  where id=p_campaign_id;
  if not found then raise exception using errcode='P0002',message='Campaign not found'; end if;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'campaign.reviewed','ad_campaigns',p_campaign_id,jsonb_build_object('review_status',v_review));
  return v_review;
end;
$$;

create or replace function public.newsroom_set_story_access(p_story_id uuid, p_access_policy text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_old text;
  v_new text := lower(p_access_policy);
begin
  if not (public.newsroom_has_capability('premium.assign') or public.newsroom_has_capability('premium.manage')) then
    raise exception using errcode='42501',message='Premium policy capability required';
  end if;
  if v_new not in ('public','premium') then raise exception using errcode='22023',message='Invalid access policy'; end if;
  select access_policy into v_old from public.stories where id=p_story_id for update;
  if v_old is null then raise exception using errcode='P0002',message='Story not found'; end if;
  perform set_config('app.newsroom_rpc','1',true);
  update public.stories set access_policy=v_new,lock_version=lock_version+1,last_saved_by=v_actor,updated_at=now() where id=p_story_id;
  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(v_actor,'story.access_policy.changed','stories',p_story_id,jsonb_build_object('previous',v_old,'new',v_new));
  return v_new;
end;
$$;

create or replace function public.newsroom_protect_story_authority_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.newsroom_rpc',true) is distinct from '1' then
    if new.status is distinct from old.status
       or new.workflow_status is distinct from old.workflow_status
       or new.access_policy is distinct from old.access_policy
       or new.owner_staff_id is distinct from old.owner_staff_id
       or new.assigned_editor_staff_id is distinct from old.assigned_editor_staff_id
       or new.fact_checker_staff_id is distinct from old.fact_checker_staff_id
       or new.health_reviewer_staff_id is distinct from old.health_reviewer_staff_id
       or new.copy_editor_staff_id is distinct from old.copy_editor_staff_id
       or new.published_at is distinct from old.published_at
       or new.scheduled_at is distinct from old.scheduled_at then
      raise exception using errcode='42501',message='Protected story authority fields require an approved Newsroom RPC';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_newsroom_protect_story_authority on public.stories;
create trigger trg_newsroom_protect_story_authority
before update on public.stories
for each row execute function public.newsroom_protect_story_authority_fields();

create or replace function public.newsroom_protect_staff_authority_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.newsroom_rpc',true) is distinct from '1' then
    if new.auth_user_id is distinct from old.auth_user_id
       or new.email is distinct from old.email
       or new.role_id is distinct from old.role_id
       or new.status is distinct from old.status
       or new.mfa_required is distinct from old.mfa_required
       or new.mfa_enrolled_at is distinct from old.mfa_enrolled_at
       or new.revoked_at is distinct from old.revoked_at
       or new.assigned_editor_id is distinct from old.assigned_editor_id then
      raise exception using errcode='42501',message='Protected staff authority fields require an approved Newsroom RPC';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.newsroom_protect_campaign_authority_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.newsroom_rpc',true) is distinct from '1'
     and (new.status is distinct from old.status
       or new.review_status is distinct from old.review_status
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at) then
    raise exception using errcode='42501',message='Campaign authority fields require an approved Newsroom RPC';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_newsroom_protect_campaign_authority on public.ad_campaigns;
create trigger trg_newsroom_protect_campaign_authority
before update on public.ad_campaigns
for each row execute function public.newsroom_protect_campaign_authority_fields();

drop trigger if exists trg_newsroom_protect_staff_authority on public.staff_profiles;
create trigger trg_newsroom_protect_staff_authority
before update on public.staff_profiles
for each row execute function public.newsroom_protect_staff_authority_fields();

create or replace function public.newsroom_sync_staff_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite public.newsroom_staff_invitations%rowtype;
  v_handle text;
  v_status text;
begin
  if new.raw_user_meta_data ? 'newsroom_invitation_id' then
    select * into v_invite
    from public.newsroom_staff_invitations
    where id=(new.raw_user_meta_data->>'newsroom_invitation_id')::uuid
      and lower(invited_email)=lower(new.email)
      and expires_at > now()
      and status in ('pending','sent')
    limit 1;

    if v_invite.id is not null then
      v_handle := lower(regexp_replace(split_part(new.email,'@',1),'[^a-z0-9._-]+','-','g'));
      if exists(select 1 from public.staff_profiles where lower(handle)=lower(v_handle) and auth_user_id is distinct from new.id) then
        v_handle := v_handle || '-' || left(replace(new.id::text,'-',''),8);
      end if;
      v_status := case when new.email_confirmed_at is not null then 'active' else 'invited' end;

      perform set_config('app.newsroom_rpc','1',true);
      insert into public.staff_profiles(auth_user_id,display_name,email,role_id,desk,country,status,handle,assigned_editor_id,created_at,updated_at)
      values(new.id,v_invite.display_name,lower(new.email),v_invite.invited_role_id,v_invite.desk,v_invite.country,v_status,v_handle,v_invite.assigned_editor_id,now(),now())
      on conflict (email) do update set
        auth_user_id=excluded.auth_user_id,
        display_name=excluded.display_name,
        role_id=excluded.role_id,
        desk=excluded.desk,
        country=excluded.country,
        status=excluded.status,
        handle=coalesce(public.staff_profiles.handle,excluded.handle),
        assigned_editor_id=excluded.assigned_editor_id,
        updated_at=now();

      update public.newsroom_staff_invitations
      set auth_user_id=new.id,
          status=case when new.email_confirmed_at is not null then 'accepted' else 'sent' end,
          accepted_at=case when new.email_confirmed_at is not null then coalesce(accepted_at,now()) else accepted_at end
      where id=v_invite.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_newsroom_sync on auth.users;
create trigger on_auth_user_newsroom_sync
after insert or update of email_confirmed_at on auth.users
for each row execute function public.newsroom_sync_staff_from_auth();

alter table public.newsroom_staff_invitations enable row level security;
alter table public.newsroom_staff_capability_overrides enable row level security;
alter table public.newsroom_sessions enable row level security;
alter table public.story_autosaves enable row level security;
alter table public.story_assignments enable row level security;
alter table public.story_reviews enable row level security;
alter table public.story_internal_comments enable row level security;
alter table public.story_corrections enable row level security;
alter table public.newsroom_notifications enable row level security;

drop policy if exists ag06_staff_profiles_read on public.staff_profiles;
create policy ag06_staff_profiles_read on public.staff_profiles for select to authenticated
using (public.newsroom_session_authorized() and (
  auth_user_id=auth.uid() or public.newsroom_has_capability('staff.view')
));

drop policy if exists ag06_staff_profiles_self_update on public.staff_profiles;
create policy ag06_staff_profiles_self_update on public.staff_profiles for update to authenticated
using (public.newsroom_session_authorized() and auth_user_id=auth.uid())
with check (public.newsroom_session_authorized() and auth_user_id=auth.uid());

drop policy if exists ag06_stories_read on public.stories;
create policy ag06_stories_read on public.stories for select to authenticated
using (public.newsroom_can_read_story(id));

drop policy if exists ag06_stories_insert on public.stories;
-- Intentionally no direct INSERT policy. Story creation must use newsroom_create_story(),
-- which derives ownership from the authenticated staff identity and writes audit history.

drop policy if exists ag06_stories_update on public.stories;
create policy ag06_stories_update on public.stories for update to authenticated
using (public.newsroom_can_edit_story(id))
with check (public.newsroom_can_edit_story(id));

drop policy if exists ag06_story_revisions_read on public.story_revisions;
create policy ag06_story_revisions_read on public.story_revisions for select to authenticated
using (public.newsroom_can_read_story(story_id));

drop policy if exists ag06_story_lifecycle_read on public.story_lifecycle_events;
create policy ag06_story_lifecycle_read on public.story_lifecycle_events for select to authenticated
using (public.newsroom_can_read_story(story_id));

drop policy if exists ag06_autosaves_read on public.story_autosaves;
create policy ag06_autosaves_read on public.story_autosaves for select to authenticated
using (public.newsroom_can_read_story(story_id));

drop policy if exists ag06_assignments_read on public.story_assignments;
create policy ag06_assignments_read on public.story_assignments for select to authenticated
using (
  public.newsroom_session_authorized()
  and (reporter_staff_id=public.newsroom_current_staff_id_basic() or public.newsroom_has_capability('assignment.manage'))
);

drop policy if exists ag06_reviews_read on public.story_reviews;
create policy ag06_reviews_read on public.story_reviews for select to authenticated
using (public.newsroom_can_read_story(story_id));

drop policy if exists ag06_comments_read on public.story_internal_comments;
create policy ag06_comments_read on public.story_internal_comments for select to authenticated
using (public.newsroom_can_read_story(story_id));

drop policy if exists ag06_corrections_read on public.story_corrections;
create policy ag06_corrections_read on public.story_corrections for select to authenticated
using (public.newsroom_can_read_story(story_id));

drop policy if exists ag06_invitations_read on public.newsroom_staff_invitations;
create policy ag06_invitations_read on public.newsroom_staff_invitations for select to authenticated
using (public.newsroom_has_capability('staff.view') or public.newsroom_has_capability('staff.invite'));

drop policy if exists ag06_sessions_read on public.newsroom_sessions;
create policy ag06_sessions_read on public.newsroom_sessions for select to authenticated
using (
  public.newsroom_session_authorized()
  and (staff_profile_id=public.newsroom_current_staff_id_basic() or public.newsroom_has_capability('security.view_sessions'))
);

drop policy if exists ag06_audit_read on public.audit_logs;
create policy ag06_audit_read on public.audit_logs for select to authenticated
using (public.newsroom_has_capability('security.view_audit'));

drop policy if exists ag06_roles_read on public.newsroom_roles;
create policy ag06_roles_read on public.newsroom_roles for select to authenticated
using (public.newsroom_session_authorized());

drop policy if exists ag06_caps_read on public.newsroom_capabilities;
create policy ag06_caps_read on public.newsroom_capabilities for select to authenticated
using (public.newsroom_session_authorized());

drop policy if exists ag06_role_caps_read on public.newsroom_role_capabilities;
create policy ag06_role_caps_read on public.newsroom_role_capabilities for select to authenticated
using (public.newsroom_session_authorized());

drop policy if exists ag06_ads_campaign_read on public.ad_campaigns;
create policy ag06_ads_campaign_read on public.ad_campaigns for select to authenticated
using (public.newsroom_has_capability('ads.view'));

drop policy if exists ag06_ads_campaign_insert on public.ad_campaigns;
drop policy if exists ag06_ads_campaign_update on public.ad_campaigns;
-- Campaign creation/approval is RPC-only so status/review changes are always authorized and audited.

drop policy if exists ag06_advertisers_read on public.advertisers;
create policy ag06_advertisers_read on public.advertisers for select to authenticated
using (public.newsroom_has_capability('ads.view'));

drop policy if exists ag06_ad_creatives_read on public.ad_creatives;
create policy ag06_ad_creatives_read on public.ad_creatives for select to authenticated
using (public.newsroom_has_capability('ads.view'));

drop policy if exists ag06_subscribers_read on public.subscribers;
create policy ag06_subscribers_read on public.subscribers for select to authenticated
using (public.newsroom_has_capability('subscriber.view'));

drop policy if exists ag06_subscribers_update on public.subscribers;
create policy ag06_subscribers_update on public.subscribers for update to authenticated
using (public.newsroom_has_capability('subscriber.manage'))
with check (public.newsroom_has_capability('subscriber.manage'));

drop policy if exists ag06_entitlements_read on public.premium_entitlements;
create policy ag06_entitlements_read on public.premium_entitlements for select to authenticated
using (public.newsroom_has_capability('subscriber.view') or public.newsroom_has_capability('premium.manage'));

drop policy if exists ag06_notifications_read on public.newsroom_notifications;
create policy ag06_notifications_read on public.newsroom_notifications for select to authenticated
using (staff_profile_id=public.newsroom_current_staff_id_basic() and public.newsroom_session_authorized());

drop policy if exists ag06_newsroom_private_read on storage.objects;
create policy ag06_newsroom_private_read on storage.objects for select to authenticated
using (bucket_id='newsroom-private' and public.newsroom_session_authorized());

drop policy if exists ag06_newsroom_private_insert on storage.objects;
create policy ag06_newsroom_private_insert on storage.objects for insert to authenticated
with check (bucket_id='newsroom-private' and public.newsroom_has_capability('media.manage'));

drop policy if exists ag06_newsroom_private_update on storage.objects;
create policy ag06_newsroom_private_update on storage.objects for update to authenticated
using (bucket_id='newsroom-private' and public.newsroom_has_capability('media.manage'))
with check (bucket_id='newsroom-private' and public.newsroom_has_capability('media.manage'));

revoke all on public.audit_logs from anon;
revoke all on public.newsroom_staff_invitations from anon;
revoke all on public.newsroom_staff_capability_overrides from anon;
revoke all on public.newsroom_sessions from anon;
revoke all on public.story_autosaves from anon;
revoke all on public.story_assignments from anon;
revoke all on public.story_reviews from anon;
revoke all on public.story_internal_comments from anon;
revoke all on public.story_corrections from anon;
revoke all on public.staff_profiles from anon;
revoke all on public.stories from anon;

revoke execute on function public.newsroom_register_session(text) from public, anon;
revoke execute on function public.newsroom_current_context() from public, anon;
revoke execute on function public.newsroom_staff_directory() from public, anon;
revoke execute on function public.newsroom_create_story(jsonb) from public, anon;
revoke execute on function public.newsroom_save_story(uuid,integer,jsonb,text) from public, anon;
revoke execute on function public.newsroom_transition_story(uuid,text,text) from public, anon;
revoke execute on function public.newsroom_create_assignment(jsonb) from public, anon;
revoke execute on function public.newsroom_progress_assignment(uuid) from public, anon;
revoke execute on function public.newsroom_add_comment(uuid,text) from public, anon;
revoke execute on function public.newsroom_create_invitation(text,text,text,text,text,uuid) from public, anon;
revoke execute on function public.newsroom_change_staff_role(uuid,text) from public, anon;
revoke execute on function public.newsroom_revoke_staff(uuid,text) from public, anon;
revoke execute on function public.newsroom_revoke_session(uuid,text) from public, anon;
revoke execute on function public.newsroom_set_story_access(uuid,text) from public, anon;
revoke execute on function public.newsroom_record_review(uuid,text,text,text) from public, anon;
revoke execute on function public.newsroom_restore_revision(uuid,uuid,integer) from public, anon;
revoke execute on function public.newsroom_create_campaign(uuid,text,timestamptz,timestamptz) from public, anon;
revoke execute on function public.newsroom_approve_campaign(uuid,boolean) from public, anon;

grant execute on function public.newsroom_public_published_stories(text) to anon, authenticated;
grant execute on function public.newsroom_register_session(text) to authenticated;
grant execute on function public.newsroom_current_context() to authenticated;
grant execute on function public.newsroom_staff_directory() to authenticated;
grant execute on function public.newsroom_create_story(jsonb) to authenticated;
grant execute on function public.newsroom_save_story(uuid,integer,jsonb,text) to authenticated;
grant execute on function public.newsroom_transition_story(uuid,text,text) to authenticated;
grant execute on function public.newsroom_create_assignment(jsonb) to authenticated;
grant execute on function public.newsroom_progress_assignment(uuid) to authenticated;
grant execute on function public.newsroom_add_comment(uuid,text) to authenticated;
grant execute on function public.newsroom_create_invitation(text,text,text,text,text,uuid) to authenticated;
grant execute on function public.newsroom_change_staff_role(uuid,text) to authenticated;
grant execute on function public.newsroom_revoke_staff(uuid,text) to authenticated;
grant execute on function public.newsroom_revoke_session(uuid,text) to authenticated;
grant execute on function public.newsroom_set_story_access(uuid,text) to authenticated;
grant execute on function public.newsroom_record_review(uuid,text,text,text) to authenticated;
grant execute on function public.newsroom_restore_revision(uuid,uuid,integer) to authenticated;
grant execute on function public.newsroom_create_campaign(uuid,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.newsroom_approve_campaign(uuid,boolean) to authenticated;

revoke execute on function public.newsroom_has_capability(text) from anon;
revoke execute on function public.newsroom_session_authorized() from anon;
revoke execute on function public.newsroom_current_staff_id_basic() from anon;

commit;
