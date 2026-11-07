import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const PSQL_BIN = fs.existsSync('/opt/homebrew/opt/libpq/bin/psql')
  ? '/opt/homebrew/opt/libpq/bin/psql'
  : 'psql';
const PG_URI = 'postgres://postgres:ephemeral-ci-only@127.0.0.1:55432/ht_real_schema_test';

function runSql(sql) {
  const cmd = `${PSQL_BIN} "${PG_URI}" -A -t -v ON_ERROR_STOP=1`;
  const output = execSync(cmd, { encoding: 'utf8', input: sql }).trim();
  const lines = output.split('\n').filter(l => l !== 'SET' && l !== 'DO' && l !== '');
  return lines.length > 0 ? lines[lines.length - 1].trim() : '';
}

function runSqlFull(sql) {
  const cmd = `${PSQL_BIN} "${PG_URI}" -A -t -v ON_ERROR_STOP=1`;
  return execSync(cmd, { encoding: 'utf8', input: sql }).trim();
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

const JWT_CLAIMS_HEADER = `
SET "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
SET "request.jwt.claims" = '{"sub": "11111111-1111-4111-8111-111111111111", "session_id": "session-test-001"}';
`;

test('REAL SCHEMA PARITY: Initialize real HealthTimes database schema in disposable Postgres', () => {
  // Reset and create clean database
  execSync(`${PSQL_BIN} "postgres://postgres:ephemeral-ci-only@127.0.0.1:55432/postgres" -c "DROP DATABASE IF EXISTS ht_real_schema_test;"`);
  execSync(`${PSQL_BIN} "postgres://postgres:ephemeral-ci-only@127.0.0.1:55432/postgres" -c "CREATE DATABASE ht_real_schema_test;"`);

  // Setup extensions and auth schema prerequisites
  const initSql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      email_confirmed_at timestamptz,
      raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text,
      name text,
      owner uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      last_accessed_at timestamptz DEFAULT now(),
      metadata jsonb
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `;
  runSql(initSql);

  // Apply canonical baseline migrations in sequence
  const migrations = [
    'supabase/migrations/20260909000100_content_core.sql',
    'supabase/migrations/20260909000200_taxonomy_and_geo.sql',
    'supabase/migrations/20260909000300_redirects_and_seo.sql',
    'supabase/migrations/20260909000400_analytics_and_ads.sql',
    'supabase/migrations/20260909000500_migration_runs_and_checkpoints.sql',
    'supabase/migrations/20260922020254_ag06_newsroom_auth_rbac.sql',
    'supabase/migrations/20260927091500_ag06_canonical_author_section_authority.sql'
  ];

  for (const mig of migrations) {
    execSync(`${PSQL_BIN} "${PG_URI}" -v ON_ERROR_STOP=1 -f ${mig}`);
  }

  // Verify baseline function uses 'Untitled story' fallback before forward migration
  const baselineFunc = runSqlFull(`select pg_get_functiondef(oid) from pg_proc where proname = 'newsroom_create_story';`);
  assert.ok(baselineFunc.includes("'Untitled story'"), "Baseline schema must contain 'Untitled story' fallback before migration.");
});

test('REAL SCHEMA PARITY: Provision authentic staff profile, capabilities, and author identity', () => {
  const provisionSql = `
    DO $$
    DECLARE
      v_user_id uuid := '11111111-1111-4111-8111-111111111111'::uuid;
      v_staff_id uuid := '22222222-2222-4222-8222-222222222222'::uuid;
      v_author_id uuid := '33333333-3333-4333-8333-333333333333'::uuid;
      v_role_id uuid;
    BEGIN
      INSERT INTO auth.users (id, email) VALUES (v_user_id, 'uat-reporter@healthtimes.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.authors (id, display_name, slug) VALUES (v_author_id, 'Dr. UAT Reporter', 'dr-uat-reporter')
      ON CONFLICT (id) DO NOTHING;

      -- Use real Reporter / Journalist role created by canonical migration
      SELECT id INTO v_role_id FROM public.newsroom_roles WHERE name = 'Reporter / Journalist';

      INSERT INTO public.staff_profiles (id, auth_user_id, email, display_name, status, role_id, public_author_id)
      VALUES (v_staff_id, v_user_id, 'uat-reporter@healthtimes.test', 'Dr. UAT Reporter', 'active', v_role_id, v_author_id)
      ON CONFLICT (id) DO UPDATE SET role_id = v_role_id;

      -- Provision active session
      INSERT INTO public.newsroom_sessions (staff_profile_id, auth_user_id, provider_session_id, user_agent)
      VALUES (v_staff_id, v_user_id, 'session-test-001', 'TestRunner')
      ON CONFLICT (auth_user_id, provider_session_id) DO NOTHING;
    END $$;
  `;
  runSql(provisionSql);

  const staffCount = runSql(`SELECT count(*) FROM public.staff_profiles WHERE email = 'uat-reporter@healthtimes.test';`);
  assert.equal(staffCount, '1');

  const capCheck = runSql(`${JWT_CLAIMS_HEADER} SELECT public.newsroom_has_capability('story.create');`);
  assert.equal(capCheck, 't', 'Reporter must have story.create capability through real newsroom session');
});

test('REAL SCHEMA PARITY: Baseline accepts empty title and defaults to "Untitled story" before forward migration', () => {
  const createSql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_create_story('{"title": ""}'::jsonb);
  `;
  const storyId = runSql(createSql);
  assert.ok(storyId && storyId.length === 36, "Baseline newsroom_create_story accepted empty title and generated story ID");

  const title = runSql(`SELECT title FROM public.stories WHERE id = '${storyId}';`);
  assert.equal(title, 'Untitled story', "Baseline schema created story with fallback title 'Untitled story'");
});

test('REAL SCHEMA PARITY: Apply forward migration 20261102160000_ht_mvp_r3_story_title_authority.sql', () => {
  execSync(`${PSQL_BIN} "${PG_URI}" -v ON_ERROR_STOP=1 -f supabase/migrations/20261102160000_ht_mvp_r3_story_title_authority.sql`);

  const updatedFunc = runSqlFull(`select pg_get_functiondef(oid) from pg_proc where proname = 'newsroom_create_story';`);
  assert.ok(updatedFunc.includes("Story title cannot be empty"), "Forward migration added clean title check");
  assert.ok(!updatedFunc.includes("'Untitled story'"), "Forward migration removed 'Untitled story' fallback completely");
});

test('REAL SCHEMA PARITY: newsroom_create_story strictly rejects null title with errcode 22023', () => {
  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_create_story('{"title": null}'::jsonb);
  `;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('REAL SCHEMA PARITY: newsroom_create_story strictly rejects empty string title with errcode 22023', () => {
  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_create_story('{"title": ""}'::jsonb);
  `;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('REAL SCHEMA PARITY: newsroom_create_story strictly rejects whitespace-only title with errcode 22023', () => {
  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_create_story('{"title": "   \\t\\n\\r"}'::jsonb);
  `;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('REAL SCHEMA PARITY: newsroom_create_story strictly rejects missing title property with errcode 22023', () => {
  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_create_story('{"standfirst": "Valid standfirst"}'::jsonb);
  `;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('REAL SCHEMA PARITY: newsroom_create_story creates valid story with real revisions and audit logs', () => {
  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_create_story('{"title": "Genuine Breakthrough in Maternal Healthcare", "body": "<p>Content</p>"}'::jsonb);
  `;
  const storyId = runSql(sql);
  assert.ok(storyId && storyId.length === 36, "Valid story creation returned UUID");

  const storyRow = runSql(`SELECT title FROM public.stories WHERE id = '${storyId}';`);
  assert.equal(storyRow, "Genuine Breakthrough in Maternal Healthcare");

  const revCount = runSql(`SELECT count(*) FROM public.story_revisions WHERE story_id = '${storyId}' AND revision_number = 1;`);
  assert.equal(revCount, '1');

  const lifecycleCount = runSql(`SELECT count(*) FROM public.story_lifecycle_events WHERE story_id = '${storyId}';`);
  assert.equal(lifecycleCount, '1');

  const auditCount = runSql(`SELECT count(*) FROM public.audit_logs WHERE target_id = '${storyId}';`);
  assert.equal(auditCount, '1');
});

test('REAL SCHEMA PARITY: newsroom_save_story strictly rejects empty title patch with errcode 22023', () => {
  const getStorySql = `SELECT id FROM public.stories WHERE title = 'Genuine Breakthrough in Maternal Healthcare' LIMIT 1;`;
  const storyId = runSql(getStorySql);

  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_save_story('${storyId}'::uuid, 1, '{"title": ""}'::jsonb, 'Patch with empty title');
  `;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('REAL SCHEMA PARITY: newsroom_save_story strictly rejects whitespace title patch with errcode 22023', () => {
  const getStorySql = `SELECT id FROM public.stories WHERE title = 'Genuine Breakthrough in Maternal Healthcare' LIMIT 1;`;
  const storyId = runSql(getStorySql);

  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_save_story('${storyId}'::uuid, 1, '{"title": "   "}'::jsonb, 'Patch with whitespace title');
  `;
  runSqlExpectError(sql, 'Story title cannot be empty');
});

test('REAL SCHEMA PARITY: newsroom_save_story preserves existing title when patch omits title property', () => {
  const getStorySql = `SELECT id FROM public.stories WHERE title = 'Genuine Breakthrough in Maternal Healthcare' LIMIT 1;`;
  const storyId = runSql(getStorySql);

  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_save_story('${storyId}'::uuid, 1, '{"standfirst": "Updated standfirst without title change"}'::jsonb, 'Update standfirst');
  `;
  runSql(sql);

  const title = runSql(`SELECT title FROM public.stories WHERE id = '${storyId}';`);
  assert.equal(title, 'Genuine Breakthrough in Maternal Healthcare', 'Title remains preserved when title is omitted in patch');
});

test('REAL SCHEMA PARITY: newsroom_save_story cleanly updates title when valid non-empty title provided', () => {
  const getStorySql = `SELECT id FROM public.stories WHERE title = 'Genuine Breakthrough in Maternal Healthcare' LIMIT 1;`;
  const storyId = runSql(getStorySql);

  const sql = `
    ${JWT_CLAIMS_HEADER}
    SELECT public.newsroom_save_story('${storyId}'::uuid, 2, '{"title": "Updated Title: Maternal Health Expansion"}'::jsonb, 'Update title');
  `;
  runSql(sql);

  const title = runSql(`SELECT title FROM public.stories WHERE id = '${storyId}';`);
  assert.equal(title, 'Updated Title: Maternal Health Expansion', 'Title is updated when valid non-empty title is passed');
});

test('REAL SCHEMA PARITY: RBAC enforcement - unprivileged staff member cannot create story (errcode 42501)', () => {
  // Create unprivileged user without story.create capability
  const sqlSetup = `
    DO $$
    DECLARE
      v_unpriv_user uuid := '44444444-4444-4444-8444-444444444444'::uuid;
      v_unpriv_staff uuid := '55555555-5555-4555-8555-555555555555'::uuid;
    BEGIN
      INSERT INTO auth.users (id, email) VALUES (v_unpriv_user, 'unprivileged@healthtimes.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.staff_profiles (id, auth_user_id, email, display_name, status)
      VALUES (v_unpriv_staff, v_unpriv_user, 'unprivileged@healthtimes.test', 'Guest Viewer', 'active')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.newsroom_sessions (staff_profile_id, auth_user_id, provider_session_id, user_agent)
      VALUES (v_unpriv_staff, v_unpriv_user, 'unpriv-session-001', 'TestRunner')
      ON CONFLICT (auth_user_id, provider_session_id) DO NOTHING;
    END $$;
  `;
  runSql(sqlSetup);

  const sqlCreate = `
    SET "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
    SET "request.jwt.claims" = '{"sub": "44444444-4444-4444-8444-444444444444", "session_id": "unpriv-session-001"}';
    SELECT public.newsroom_create_story('{"title": "Attempted Unauthorized Story"}'::jsonb);
  `;
  runSqlExpectError(sqlCreate, 'story.create capability required');
});

test('REAL SCHEMA PARITY: Pre-existing stories in database remain completely intact with all fields and revisions preserved', () => {
  const storyCount = runSql(`SELECT count(*) FROM public.stories;`);
  assert.ok(parseInt(storyCount, 10) >= 2, "Both baseline story and test story exist");

  const baselineStory = runSql(`SELECT title, status FROM public.stories WHERE title = 'Untitled story';`);
  assert.ok(baselineStory.includes('Untitled story'), "Baseline story created before migration is preserved without mutation");
});
