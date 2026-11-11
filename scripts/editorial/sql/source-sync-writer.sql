-- HELD: this is NOT a migration and must not be placed in supabase/migrations.
-- It runs only on disposable databases until the Owner separately authorizes a
-- staging run against an independently reviewed exact SHA.
--
-- Applies a plan from scripts/editorial/sync-incremental-dryrun.mjs in one
-- transaction: any failed check aborts every change in the plan. Reconciles on
-- legacy_sources.stable_key, never on slug. Takes the plan as a parameter.

create table if not exists public.source_sync_runs (
  id uuid primary key default gen_random_uuid(),
  plan_sha256 text not null unique,
  applied_by text not null,
  status text not null default 'applied' check (status in ('applied','rolled_back')),
  counts jsonb not null default '{}'::jsonb,
  applied_at timestamptz not null default now(),
  rolled_back_at timestamptz,
  rolled_back_by text
);

create table if not exists public.source_sync_row_audit (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.source_sync_runs(id),
  stable_key text not null,
  action text not null check (action in ('insert','update')),
  story_id uuid not null,
  legacy_source_id uuid not null,
  before_story jsonb,
  before_source jsonb,
  after_lock_version integer not null,
  after_modified_at timestamptz
);

alter table public.source_sync_runs enable row level security;
alter table public.source_sync_row_audit enable row level security;
revoke all on public.source_sync_runs from public, anon, authenticated;
revoke all on public.source_sync_row_audit from public, anon, authenticated;

create or replace function public.ht_source_sync_apply(p_plan jsonb, p_actor text)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_run_id uuid;
  v_candidate jsonb;
  v_key text;
  v_source public.legacy_sources%rowtype;
  v_story public.stories%rowtype;
  v_source_id uuid;
  v_story_id uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if coalesce(p_plan->>'planSha256','') !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='SYNC_PLAN_HASH_REQUIRED';
  end if;
  if coalesce(trim(p_actor),'') = '' then
    raise exception using errcode='22023', message='SYNC_ACTOR_REQUIRED';
  end if;
  if exists (select 1 from public.source_sync_runs where plan_sha256 = p_plan->>'planSha256') then
    raise exception using errcode='23505', message='SYNC_PLAN_ALREADY_APPLIED';
  end if;

  insert into public.source_sync_runs (plan_sha256, applied_by)
  values (p_plan->>'planSha256', p_actor)
  returning id into v_run_id;

  for v_candidate in select value from jsonb_array_elements(coalesce(p_plan->'candidates','[]'::jsonb)) loop
    v_key := v_candidate->>'stableKey';
    if coalesce(v_key,'') !~ '^wordpress:post:[0-9]+$' then
      raise exception using errcode='22023', message='SYNC_INVALID_SOURCE_KEY';
    end if;
    -- The stored policy is a constant below; this only rejects a forged plan.
    if v_candidate->>'accessPolicy' is distinct from 'public' then
      raise exception using errcode='22023', message='SYNC_NON_PUBLIC_CANDIDATE';
    end if;

    if v_candidate->>'decision' = 'INSERT_CANDIDATE' then
      if exists (select 1 from public.legacy_sources where stable_key = v_key) then
        raise exception using errcode='23505', message='SYNC_SOURCE_KEY_EXISTS';
      end if;
      if exists (select 1 from public.stories where slug = v_candidate->>'slug') then
        raise exception using errcode='23505', message='SYNC_SLUG_COLLISION';
      end if;

      insert into public.legacy_sources (system, site_url, source_type, source_id, stable_key, source_url, checksum, raw)
      values ('wordpress', 'https://healthtimes.co.zw', 'post', v_candidate->>'sourceId', v_key,
              v_candidate->>'canonicalUrl', v_candidate->>'checksum',
              jsonb_build_object('id', v_candidate->>'sourceId', 'sync', 'source-key-v2'))
      returning id into v_source_id;

      insert into public.stories (legacy_source_id, title, slug, excerpt, body_html, body_json, status, access_policy,
                                  author_id, primary_section_id, published_at, modified_at, canonical_url)
      values (v_source_id, v_candidate->>'title', v_candidate->>'slug', v_candidate->>'excerpt', v_candidate->>'bodyHtml',
              jsonb_build_object('wordpress_id', v_candidate->>'sourceId'), 'published', 'public',
              (select id from public.authors where wordpress_source_id = v_candidate->>'authorSourceId' limit 1),
              (select id from public.sections where wordpress_source_id = v_candidate->>'primaryCategorySourceId' limit 1),
              (v_candidate->>'publishedAt')::timestamptz, (v_candidate->>'modifiedAt')::timestamptz, v_candidate->>'canonicalUrl')
      returning id into v_story_id;

      insert into public.legacy_url_mappings (legacy_source_id, old_path, new_path, redirect_status, preservation_strategy)
      values (v_source_id, v_candidate->>'legacyPath', v_candidate->>'legacyPath', 301, 'preserve');

      insert into public.seo_metadata (story_id, legacy_source_id, canonical_url, title, review_status)
      values (v_story_id, v_source_id, v_candidate->>'canonicalUrl', v_candidate->>'title', 'pending');

      insert into public.source_sync_row_audit (run_id, stable_key, action, story_id, legacy_source_id, after_lock_version, after_modified_at)
      select v_run_id, v_key, 'insert', s.id, s.legacy_source_id, s.lock_version, s.modified_at
      from public.stories s where s.id = v_story_id;
      v_inserted := v_inserted + 1;

    elsif v_candidate->>'decision' = 'UPDATE_CANDIDATE' then
      select * into v_source from public.legacy_sources where stable_key = v_key for update;
      if not found then
        raise exception using errcode='P0002', message='SYNC_SOURCE_KEY_MISSING';
      end if;
      select * into v_story from public.stories where legacy_source_id = v_source.id for update;
      if not found
         or v_story.id is distinct from (v_candidate->'expected'->>'storyId')::uuid
         or v_story.lock_version is distinct from (v_candidate->'expected'->>'lockVersion')::integer
         or v_story.modified_at is distinct from (v_candidate->'expected'->>'modifiedAt')::timestamptz then
        raise exception using errcode='40001', message='SYNC_STALE_STORY';
      end if;
      if v_story.access_policy is distinct from 'public' then
        raise exception using errcode='42501', message='SYNC_PREMIUM_PROTECTED';
      end if;
      if exists (select 1 from public.story_revisions r where r.story_id = v_story.id and r.editor_id is not null) then
        raise exception using errcode='40001', message='SYNC_NATIVE_EDIT_CONFLICT';
      end if;

      insert into public.source_sync_row_audit (run_id, stable_key, action, story_id, legacy_source_id, before_story, before_source, after_lock_version, after_modified_at)
      values (v_run_id, v_key, 'update', v_story.id, v_source.id, to_jsonb(v_story), to_jsonb(v_source),
              v_story.lock_version, (v_candidate->>'modifiedAt')::timestamptz);

      -- Source-owned fields only: status, policy, workflow, author, publication
      -- time, distribution and lock_version are never written here.
      update public.stories
      set title = v_candidate->>'title',
          excerpt = v_candidate->>'excerpt',
          body_html = v_candidate->>'bodyHtml',
          modified_at = (v_candidate->>'modifiedAt')::timestamptz,
          updated_at = now()
      where id = v_story.id;

      update public.legacy_sources
      set source_url = v_candidate->>'canonicalUrl', checksum = v_candidate->>'checksum', last_seen_at = now()
      where id = v_source.id;
      v_updated := v_updated + 1;

    else
      raise exception using errcode='22023', message='SYNC_UNKNOWN_DECISION';
    end if;
  end loop;

  update public.source_sync_runs
  set counts = jsonb_build_object('inserted', v_inserted, 'updated', v_updated)
  where id = v_run_id;

  return jsonb_build_object('runId', v_run_id, 'inserted', v_inserted, 'updated', v_updated);
end;
$$;

create or replace function public.ht_source_sync_rollback(p_run_id uuid, p_actor text)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_run public.source_sync_runs%rowtype;
  v_row public.source_sync_row_audit%rowtype;
  v_story public.stories%rowtype;
  v_reverted integer := 0;
begin
  if coalesce(trim(p_actor),'') = '' then
    raise exception using errcode='22023', message='SYNC_ACTOR_REQUIRED';
  end if;
  select * into v_run from public.source_sync_runs where id = p_run_id for update;
  if not found then
    raise exception using errcode='P0002', message='SYNC_RUN_NOT_FOUND';
  end if;
  if v_run.status <> 'applied' then
    raise exception using errcode='55000', message='SYNC_RUN_NOT_APPLIED';
  end if;

  for v_row in select * from public.source_sync_row_audit where run_id = p_run_id order by id desc loop
    select * into v_story from public.stories where id = v_row.story_id for update;
    -- Never undo over someone's later work.
    if not found
       or v_story.lock_version is distinct from v_row.after_lock_version
       or v_story.modified_at is distinct from v_row.after_modified_at then
      raise exception using errcode='40001', message='SYNC_ROLLBACK_CONFLICT';
    end if;

    if v_row.action = 'insert' then
      delete from public.seo_metadata where story_id = v_row.story_id;
      delete from public.legacy_url_mappings where legacy_source_id = v_row.legacy_source_id;
      delete from public.stories where id = v_row.story_id;
      delete from public.legacy_sources where id = v_row.legacy_source_id;
    else
      update public.stories
      set title = v_row.before_story->>'title',
          excerpt = v_row.before_story->>'excerpt',
          body_html = v_row.before_story->>'body_html',
          modified_at = (v_row.before_story->>'modified_at')::timestamptz,
          updated_at = (v_row.before_story->>'updated_at')::timestamptz
      where id = v_row.story_id;
      update public.legacy_sources
      set source_url = v_row.before_source->>'source_url',
          checksum = v_row.before_source->>'checksum',
          last_seen_at = (v_row.before_source->>'last_seen_at')::timestamptz
      where id = v_row.legacy_source_id;
    end if;
    v_reverted := v_reverted + 1;
  end loop;

  update public.source_sync_runs
  set status = 'rolled_back', rolled_back_at = now(), rolled_back_by = p_actor
  where id = p_run_id;

  return jsonb_build_object('runId', p_run_id, 'reverted', v_reverted);
end;
$$;

revoke all on function public.ht_source_sync_apply(jsonb, text) from public, anon, authenticated;
revoke all on function public.ht_source_sync_rollback(uuid, text) from public, anon, authenticated;
