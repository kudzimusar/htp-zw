-- AG-06 residual authority R1: canonical public author + section binding.
-- Forward-only. Existing authors/sections remain the only canonical public authorities.

begin;

alter table public.staff_profiles
  add column if not exists public_author_id uuid
  references public.authors(id) on delete set null;

create index if not exists idx_staff_profiles_public_author
  on public.staff_profiles(public_author_id)
  where public_author_id is not null;

-- Deterministic backfill rule:
-- bind only when BOTH the staff display name and author display name normalize to the
-- same exact full string, and that normalized string is unique on each side.
-- No email/handle/desk/role/fuzzy inference. Existing non-null bindings are untouched.
with staff_norm as (
  select id,
         lower(regexp_replace(trim(display_name),'\s+',' ','g')) as norm
  from public.staff_profiles
  where public_author_id is null
),
author_norm as (
  select id,
         lower(regexp_replace(trim(display_name),'\s+',' ','g')) as norm
  from public.authors
),
staff_unique as (
  select norm,count(*) as n from staff_norm group by norm
),
author_unique as (
  select norm,count(*) as n from author_norm group by norm
),
matches as (
  select s.id as staff_id,a.id as author_id
  from staff_norm s
  join staff_unique su on su.norm=s.norm and su.n=1
  join author_unique au on au.norm=s.norm and au.n=1
  join author_norm a on a.norm=s.norm
)
update public.staff_profiles sp
set public_author_id=m.author_id,
    updated_at=now()
from matches m
where sp.id=m.staff_id
  and sp.public_author_id is null;

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
       or new.assigned_editor_id is distinct from old.assigned_editor_id
       or new.public_author_id is distinct from old.public_author_id then
      raise exception using errcode='42501',message='Protected staff authority fields require an approved Newsroom RPC';
    end if;
  end if;
  return new;
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
       or new.author_id is distinct from old.author_id
       or new.primary_section_id is distinct from old.primary_section_id
       or new.published_at is distinct from old.published_at
       or new.scheduled_at is distinct from old.scheduled_at then
      raise exception using errcode='42501',message='Protected story authority fields require an approved Newsroom RPC';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.newsroom_list_public_authors()
returns table(
  id uuid,
  display_name text,
  slug text,
  bio text,
  wordpress_source_id text,
  provenance text,
  linked_staff jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;

  return query
  select a.id,a.display_name,a.slug,a.bio,a.wordpress_source_id,
         case when a.wordpress_source_id is null then 'native' else 'migrated' end,
         coalesce((
           select jsonb_agg(
             jsonb_build_object('staff_profile_id',sp.id,'display_name',sp.display_name)
             order by sp.display_name,sp.id
           )
           from public.staff_profiles sp
           where sp.public_author_id=a.id
             and lower(sp.status)='active'
             and sp.revoked_at is null
         ),'[]'::jsonb)
  from public.authors a
  order by lower(a.display_name),a.id;
end;
$$;

create or replace function public.newsroom_list_sections()
returns table(
  id uuid,
  name text,
  slug text,
  parent_id uuid,
  wordpress_source_id text,
  provenance text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501',message='Active Newsroom session required';
  end if;

  return query
  select s.id,s.name,s.slug,s.parent_id,s.wordpress_source_id,
         case when s.wordpress_source_id is null then 'native' else 'migrated' end
  from public.sections s
  order by lower(s.name),s.id;
end;
$$;

create or replace function public.newsroom_bind_staff_public_author(
  p_staff_id uuid,
  p_author_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_staff public.staff_profiles%rowtype;
  v_author public.authors%rowtype;
  v_previous uuid;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.edit_all') then
    raise exception using errcode='42501',message='story.edit_all capability required for public author binding';
  end if;

  select * into v_staff
  from public.staff_profiles
  where id=p_staff_id
    and lower(status)='active'
    and revoked_at is null
  for update;

  if v_staff.id is null then
    raise exception using errcode='P0002',message='Active staff profile not found';
  end if;

  if p_author_id is not null then
    select * into v_author from public.authors where id=p_author_id;
    if v_author.id is null then
      raise exception using errcode='P0002',message='Canonical public author not found';
    end if;
  end if;

  v_previous := v_staff.public_author_id;
  perform set_config('app.newsroom_rpc','1',true);

  update public.staff_profiles
  set public_author_id=p_author_id,
      updated_at=now()
  where id=p_staff_id;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(
    v_actor,'staff.public_author.bound','staff_profiles',p_staff_id,
    jsonb_build_object('previous_author_id',v_previous,'new_author_id',p_author_id)
  );

  return jsonb_build_object(
    'staff_profile_id',p_staff_id,
    'public_author_id',p_author_id,
    'previous_author_id',v_previous
  );
end;
$$;

create or replace function public.newsroom_create_public_author(
  p_display_name text,
  p_slug text,
  p_bio text default null,
  p_staff_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_name text := trim(coalesce(p_display_name,''));
  v_slug text := lower(trim(coalesce(p_slug,'')));
  v_id uuid;
  v_staff public.staff_profiles%rowtype;
begin
  if not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('story.edit_all') then
    raise exception using errcode='42501',message='story.edit_all capability required for public author management';
  end if;

  if length(v_name)<2 or length(v_name)>160 then
    raise exception using errcode='22023',message='Public author display name must be 2-160 characters';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug)>180 then
    raise exception using errcode='22023',message='Public author slug must be canonical lowercase kebab-case';
  end if;

  if exists(select 1 from public.authors where slug=v_slug) then
    raise exception using errcode='23505',message='Public author slug already exists; bind explicitly instead of mutating the existing author';
  end if;

  if p_staff_id is not null then
    select * into v_staff
    from public.staff_profiles
    where id=p_staff_id
      and lower(status)='active'
      and revoked_at is null
    for update;
    if v_staff.id is null then
      raise exception using errcode='P0002',message='Active staff profile not found';
    end if;
  end if;

  insert into public.authors(display_name,slug,bio,wordpress_source_id)
  values(v_name,v_slug,nullif(trim(coalesce(p_bio,'')),''),null)
  returning id into v_id;

  if p_staff_id is not null then
    perform set_config('app.newsroom_rpc','1',true);
    update public.staff_profiles
    set public_author_id=v_id,
        updated_at=now()
    where id=p_staff_id;
  end if;

  insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
  values(
    v_actor,'public_author.created','authors',v_id,
    jsonb_build_object('slug',v_slug,'bound_staff_id',p_staff_id,'wordpress_source_id',null)
  );

  return v_id;
end;
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
  v_default_author uuid;
  v_author uuid;
  v_section uuid;
  v_raw_author text := nullif(trim(coalesce(p_story->>'author_id','')),'');
  v_raw_section text := nullif(trim(coalesce(p_story->>'primary_section_id','')),'');
begin
  if not public.newsroom_has_capability('story.create') then
    raise exception using errcode='42501', message='story.create capability required';
  end if;

  select public_author_id into v_default_author
  from public.staff_profiles
  where id=v_actor;

  v_author := v_default_author;

  if p_story ? 'author_id' then
    if v_raw_author is null then
      if v_default_author is not null and not public.newsroom_has_capability('story.edit_all') then
        raise exception using errcode='42501',message='Reporter cannot clear the canonical public byline';
      end if;
      v_author := null;
    else
      if v_raw_author !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception using errcode='22023',message='Invalid public author id';
      end if;
      v_author := v_raw_author::uuid;
      if not exists(select 1 from public.authors where id=v_author) then
        raise exception using errcode='22023',message='Canonical public author does not exist';
      end if;
      if v_author is distinct from v_default_author
         and not public.newsroom_has_capability('story.edit_all') then
        raise exception using errcode='42501',message='Reporter cannot assign another public author';
      end if;
    end if;
  end if;

  if v_raw_section is not null then
    if v_raw_section !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode='22023',message='Invalid canonical section id';
    end if;
    v_section := v_raw_section::uuid;
    if not exists(select 1 from public.sections where id=v_section) then
      raise exception using errcode='22023',message='Canonical section does not exist';
    end if;
  end if;

  v_slug := nullif(trim(coalesce(p_story->>'slug','')),'');
  if v_slug is null then
    v_slug := 'draft-' || replace(gen_random_uuid()::text,'-','');
  end if;

  insert into public.stories(
    title,slug,standfirst,body_html,status,workflow_status,access_policy,author_id,primary_section_id,
    owner_staff_id,assigned_editor_staff_id,desk,topic,country,region,source_notes,internal_notes,
    deadline_at,seo_title,seo_description,scheduled_at,distribution,ad_setting,last_saved_by,modified_at
  ) values(
    coalesce(nullif(trim(p_story->>'title'),''),'Untitled story'),
    v_slug,
    public.newsroom_safe_editor_text(p_story->>'standfirst'),
    public.newsroom_safe_editor_text(p_story->>'body'),
    'draft','Draft','public',v_author,v_section,v_actor,
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
  values(
    v_actor,'story.created','stories',v_story_id,
    jsonb_build_object('workflow_status','Draft','author_id',v_author,'primary_section_id',v_section)
  );

  return v_story_id;
end;
$$;

create or replace function public.newsroom_save_story(
  p_story_id uuid,
  p_expected_version integer,
  p_patch jsonb,
  p_reason text default 'Autosave'
)
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
  v_author uuid;
  v_section uuid;
  v_access text;
  v_scheduled_at timestamptz;
  v_distribution jsonb;
  v_ad_setting text;
  v_next_revision integer;
  v_raw_author text;
  v_raw_section text;
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
  v_author := v_old.author_id;
  v_section := v_old.primary_section_id;
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

  if p_patch ? 'author_id' then
    v_raw_author := nullif(trim(coalesce(p_patch->>'author_id','')),'');
    if v_raw_author is null then
      if v_author is not null and not public.newsroom_has_capability('story.edit_all') then
        raise exception using errcode='42501',message='story.edit_all required to change canonical public author';
      end if;
      v_author := null;
    else
      if v_raw_author !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception using errcode='22023',message='Invalid public author id';
      end if;
      if v_raw_author::uuid is distinct from v_author
         and not public.newsroom_has_capability('story.edit_all') then
        raise exception using errcode='42501',message='story.edit_all required to change canonical public author';
      end if;
      v_author := v_raw_author::uuid;
      if not exists(select 1 from public.authors where id=v_author) then
        raise exception using errcode='22023',message='Canonical public author does not exist';
      end if;
    end if;
  end if;

  if p_patch ? 'primary_section_id' then
    v_raw_section := nullif(trim(coalesce(p_patch->>'primary_section_id','')),'');
    if v_raw_section is null then
      v_section := null;
    else
      if v_raw_section !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception using errcode='22023',message='Invalid canonical section id';
      end if;
      v_section := v_raw_section::uuid;
      if not exists(select 1 from public.sections where id=v_section) then
        raise exception using errcode='22023',message='Canonical section does not exist';
      end if;
    end if;
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
      author_id=v_author,
      primary_section_id=v_section,
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
    select coalesce(max(revision_number),0)+1 into v_next_revision
    from public.story_revisions where story_id=p_story_id;
    insert into public.story_revisions(story_id,revision_number,title,body_html,editor_id,change_summary)
    select id,v_next_revision,title,body_html,v_actor,left(coalesce(p_reason,'Manual save'),240)
    from public.stories where id=p_story_id;
    delete from public.story_autosaves where story_id=p_story_id;
  end if;

  if v_author is distinct from v_old.author_id then
    insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
    values(v_actor,'story.public_author.changed','stories',p_story_id,
      jsonb_build_object('previous_author_id',v_old.author_id,'new_author_id',v_author));
  end if;
  if v_section is distinct from v_old.primary_section_id then
    insert into public.audit_logs(actor_staff_id,action,target_table,target_id,metadata)
    values(v_actor,'story.primary_section.changed','stories',p_story_id,
      jsonb_build_object('previous_section_id',v_old.primary_section_id,'new_section_id',v_section));
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

revoke execute on function public.newsroom_list_public_authors() from public,anon;
revoke execute on function public.newsroom_list_sections() from public,anon;
revoke execute on function public.newsroom_bind_staff_public_author(uuid,uuid) from public,anon;
revoke execute on function public.newsroom_create_public_author(text,text,text,uuid) from public,anon;

grant execute on function public.newsroom_list_public_authors() to authenticated;
grant execute on function public.newsroom_list_sections() to authenticated;
grant execute on function public.newsroom_bind_staff_public_author(uuid,uuid) to authenticated;
grant execute on function public.newsroom_create_public_author(text,text,text,uuid) to authenticated;

commit;
