import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PSQL_BIN = '/opt/homebrew/opt/libpq/bin/psql';
const PG_URI = 'postgres://postgres:ephemeral-ci-only@127.0.0.1:55432/postgres';

function runSql(sql) {
  const cmd = `${PSQL_BIN} "${PG_URI}" -A -t -v ON_ERROR_STOP=1`;
  return execSync(cmd, { encoding: 'utf8', input: sql });
}

function runSqlExpectError(sql, expectedCodeOrMessage) {
  try {
    const cmd = `${PSQL_BIN} "${PG_URI}" -A -t -v ON_ERROR_STOP=1`;
    execSync(cmd, { encoding: 'utf8', input: sql });
    assert.fail('Expected SQL execution to throw an exception, but it succeeded.');
  } catch (err) {
    const stderr = err.stderr || err.message || '';
    assert.ok(
      stderr.includes(expectedCodeOrMessage),
      `Expected error message or SQLSTATE "${expectedCodeOrMessage}", got: ${stderr}`
    );
  }
}

test('DEF-006 Database Authority: Setup isolated test fixture in disposable Postgres', () => {
  const setupSql = `
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS public;

    -- Minimal mock tables required by newsroom_create_story and newsroom_save_story
    CREATE TABLE IF NOT EXISTS public.staff_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      display_name text,
      public_author_id uuid,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.authors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.sections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text,
      slug text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.stories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      slug text UNIQUE,
      standfirst text,
      body_html text,
      status text DEFAULT 'draft',
      workflow_status text DEFAULT 'Draft',
      access_policy text DEFAULT 'public',
      author_id uuid,
      primary_section_id uuid,
      owner_staff_id uuid,
      assigned_editor_staff_id uuid,
      fact_checker_staff_id uuid,
      desk text,
      topic text,
      country text,
      region text,
      source_notes text,
      internal_notes text,
      deadline_at timestamptz,
      seo_title text,
      seo_description text,
      scheduled_at timestamptz,
      distribution jsonb DEFAULT '{}'::jsonb,
      ad_setting text DEFAULT 'Standard',
      lock_version integer DEFAULT 1,
      last_saved_by uuid,
      modified_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.story_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id uuid REFERENCES public.stories(id),
      revision_number integer NOT NULL,
      title text,
      body_html text,
      editor_id uuid,
      change_summary text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.story_lifecycle_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id uuid REFERENCES public.stories(id),
      from_status text,
      to_status text,
      actor_staff_id uuid,
      reason text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.story_autosaves (
      story_id uuid PRIMARY KEY REFERENCES public.stories(id),
      title text,
      standfirst text,
      body_html text,
      saved_by uuid,
      lock_version integer,
      saved_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_staff_id uuid,
      action text,
      target_table text,
      target_id uuid,
      metadata jsonb,
      created_at timestamptz DEFAULT now()
    );

    -- Mock security and helper functions
    CREATE OR REPLACE FUNCTION public.newsroom_current_staff_id_basic()
    RETURNS uuid LANGUAGE plpgsql AS $$
    DECLARE v_id uuid;
    BEGIN
      SELECT id INTO v_id FROM public.staff_profiles WHERE email = 'test-reporter@healthtimes.test' LIMIT 1;
      IF v_id IS NULL THEN
        INSERT INTO public.staff_profiles(email, display_name)
        VALUES ('test-reporter@healthtimes.test', 'Test Reporter')
        RETURNING id INTO v_id;
      END IF;
      RETURN v_id;
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.newsroom_has_capability(p_cap text)
    RETURNS boolean LANGUAGE sql AS $$ SELECT true; $$;

    CREATE OR REPLACE FUNCTION public.newsroom_can_edit_story(p_story_id uuid)
    RETURNS boolean LANGUAGE sql AS $$ SELECT true; $$;

    CREATE OR REPLACE FUNCTION public.newsroom_safe_editor_text(p_text text)
    RETURNS text LANGUAGE sql AS $$ SELECT p_text; $$;
  `;
  runSql(setupSql);

  // Apply the authoritative migration
  const migrationPath = path.resolve('supabase/migrations/20261102160000_ht_mvp_r3_story_title_authority.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  runSql(migrationSql);
});

test('DEF-006 Database Authority: newsroom_create_story strictly rejects null title with errcode 22023', () => {
  const sql = `SELECT public.newsroom_create_story('{"title": null, "desk": "Health"}'::jsonb);`;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('DEF-006 Database Authority: newsroom_create_story strictly rejects empty string title with errcode 22023', () => {
  const sql = `SELECT public.newsroom_create_story('{"title": "", "desk": "Health"}'::jsonb);`;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('DEF-006 Database Authority: newsroom_create_story strictly rejects whitespace-only title with errcode 22023', () => {
  const sql = `SELECT public.newsroom_create_story('{"title": "    \\t  ", "desk": "Health"}'::jsonb);`;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('DEF-006 Database Authority: newsroom_create_story strictly rejects missing title property with errcode 22023', () => {
  const sql = `SELECT public.newsroom_create_story('{"desk": "Health"}'::jsonb);`;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('DEF-006 Database Authority: newsroom_create_story creates valid story and revision 1 without regression', () => {
  const sql = `
    DO $$
    DECLARE
      v_id uuid;
      v_title text;
      v_rev_title text;
      v_rev_count int;
    BEGIN
      v_id := public.newsroom_create_story('{"title": "Valid Clinical Trial Results Announced", "desk": "Clinical"}'::jsonb);
      
      SELECT title INTO v_title FROM public.stories WHERE id = v_id;
      IF v_title <> 'Valid Clinical Trial Results Announced' THEN
        RAISE EXCEPTION 'Stored story title mismatch: got %', v_title;
      END IF;

      SELECT count(*), max(title) INTO v_rev_count, v_rev_title FROM public.story_revisions WHERE story_id = v_id;
      IF v_rev_count <> 1 OR v_rev_title <> 'Valid Clinical Trial Results Announced' THEN
        RAISE EXCEPTION 'Revision 1 mismatch: count %, title %', v_rev_count, v_rev_title;
      END IF;
    END;
    $$;
  `;
  runSql(sql);
});

test('DEF-006 Database Authority: newsroom_save_story rejects empty title patch with errcode 22023', () => {
  const createSql = `SELECT public.newsroom_create_story('{"title": "Story For Save Testing", "desk": "Policy"}'::jsonb);`;
  const storyId = runSql(createSql).trim();

  // Test empty title in patch
  runSqlExpectError(
    `SELECT public.newsroom_save_story('${storyId}'::uuid, 1, '{"title": ""}'::jsonb, 'Autosave');`,
    'Story title cannot be empty'
  );

  // Test whitespace title in patch
  runSqlExpectError(
    `SELECT public.newsroom_save_story('${storyId}'::uuid, 1, '{"title": "   "}'::jsonb, 'Manual save');`,
    'Story title cannot be empty'
  );

  // Test null title in patch
  runSqlExpectError(
    `SELECT public.newsroom_save_story('${storyId}'::uuid, 1, '{"title": null}'::jsonb, 'Autosave');`,
    'Story title cannot be empty'
  );
});

test('DEF-006 Database Authority: newsroom_save_story preserves existing title when title not in patch', () => {
  const sql = `
    DO $$
    DECLARE
      v_id uuid;
      v_title text;
      v_new_version int;
      v_standfirst text;
    BEGIN
      v_id := public.newsroom_create_story('{"title": "Unchanged Title Test", "standfirst": "Initial standfirst"}'::jsonb);
      v_new_version := public.newsroom_save_story(v_id, 1, '{"standfirst": "Updated standfirst"}'::jsonb, 'Autosave');
      
      SELECT title, standfirst INTO v_title, v_standfirst FROM public.stories WHERE id = v_id;
      IF v_title <> 'Unchanged Title Test' THEN
        RAISE EXCEPTION 'Expected title to remain unchanged, got %', v_title;
      END IF;
      IF v_standfirst <> 'Updated standfirst' THEN
        RAISE EXCEPTION 'Expected standfirst to update, got %', v_standfirst;
      END IF;
    END;
    $$;
  `;
  runSql(sql);
});

test('DEF-006 Database Authority: newsroom_save_story updates title when valid non-empty title provided', () => {
  const sql = `
    DO $$
    DECLARE
      v_id uuid;
      v_title text;
      v_new_version int;
    BEGIN
      v_id := public.newsroom_create_story('{"title": "Old Headline"}'::jsonb);
      v_new_version := public.newsroom_save_story(v_id, 1, '{"title": "Brand New Editorial Headline"}'::jsonb, 'Manual save');
      
      SELECT title INTO v_title FROM public.stories WHERE id = v_id;
      IF v_title <> 'Brand New Editorial Headline' THEN
        RAISE EXCEPTION 'Expected title to be updated, got %', v_title;
      END IF;
    END;
    $$;
  `;
  runSql(sql);
});
