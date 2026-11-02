-- Migration: 20261102160000_ht_mvp_r3_story_title_authority.sql
-- Description: Authoritative DB boundary validation for story titles (DEF-006 remediation)
-- Rejects null, missing, empty, or whitespace-only story titles at the PostgreSQL RPC boundary.
-- Eliminates 'Untitled story' fallback in newsroom_create_story and newsroom_save_story.
-- Preserves SECURITY DEFINER, author attribution, section verification, revisions, audit logs, and owner/author RBAC.

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
  v_clean_title text := nullif(btrim(coalesce(p_story->>'title',''), E' \t\r\n'),'');
begin
  if not public.newsroom_has_capability('story.create') then
    raise exception using errcode='42501', message='story.create capability required';
  end if;

  if v_clean_title is null then
    raise exception using errcode='22023', message='Story title cannot be empty';
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
    v_clean_title,
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
  values(v_story_id,1,v_clean_title,
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

  if p_patch ? 'title' and nullif(btrim(coalesce(p_patch->>'title',''), E' \t\r\n'),'') is null then
    raise exception using errcode='22023', message='Story title cannot be empty';
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
  set title=case when p_patch ? 'title' then btrim(p_patch->>'title', E' \t\r\n') else title end,
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
      jsonb_build_object('previous_access_policy',v_old.access_policy,'new_access_policy',v_access));
  end if;

  return v_new_version;
end;
$$;

revoke all on function public.newsroom_create_story(jsonb) from public, anon;
grant execute on function public.newsroom_create_story(jsonb) to authenticated;

revoke all on function public.newsroom_save_story(uuid, integer, jsonb, text) from public, anon;
grant execute on function public.newsroom_save_story(uuid, integer, jsonb, text) to authenticated;
