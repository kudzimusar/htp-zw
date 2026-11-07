import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const PSQL_BIN = fs.existsSync('/opt/homebrew/opt/libpq/bin/psql')
  ? '/opt/homebrew/opt/libpq/bin/psql'
  : 'psql';

const BASE_PG_URI = process.env.HT_DISPOSABLE_PG_BASE_URI || 'postgres://postgres:ephemeral-ci-only@127.0.0.1:55432';
const DB_NAME = 'ht_g2_rbac_session_boundary_test';
const PG_URI = `${BASE_PG_URI}/${DB_NAME}`;

function runSql(sql) {
  const cmd = `${PSQL_BIN} "${PG_URI}" -X -A -t -v ON_ERROR_STOP=1`;
  const output = execSync(cmd, { encoding: 'utf8', input: sql }).trim();
  const lines = output
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '' && l !== 'SET' && l !== 'RESET' && l !== 'DO' && l !== 'BEGIN' && l !== 'COMMIT');
  return lines.length > 0 ? lines[lines.length - 1] : '';
}

function runSqlFull(sql) {
  const cmd = `${PSQL_BIN} "${PG_URI}" -X -A -t -v ON_ERROR_STOP=1`;
  return execSync(cmd, { encoding: 'utf8', input: sql }).trim();
}

function runSqlExpectError(sql, expectedCode, expectedMessageSubstring = '') {
  try {
    const cmd = `${PSQL_BIN} "${PG_URI}" -X -A -t -v ON_ERROR_STOP=1 -v VERBOSITY=verbose`;
    execSync(cmd, { encoding: 'utf8', input: sql });
    assert.fail(`Expected SQL to fail with ${expectedCode}, but it succeeded.`);
  } catch (err) {
    const stderr = `${err.stderr || ''}\n${err.message || ''}`;
    assert.ok(
      stderr.includes(expectedCode),
      `Expected SQLSTATE/error "${expectedCode}", got:\n${stderr}`
    );
    if (expectedMessageSubstring) {
      assert.ok(
        stderr.includes(expectedMessageSubstring),
        `Expected error message "${expectedMessageSubstring}", got:\n${stderr}`
      );
    }
  }
}

const ACTORS = {
  owner: {
    userId: '10000000-0000-4000-8000-000000000001',
    staffId: '20000000-0000-4000-8000-000000000001',
    sessionA: 'sess-owner-active-a',
    sessionB: 'sess-owner-active-b',
  },
  eic: {
    userId: '10000000-0000-4000-8000-000000000002',
    staffId: '20000000-0000-4000-8000-000000000002',
    sessionA: 'sess-eic-active-a',
  },
  managingEditor: {
    userId: '10000000-0000-4000-8000-000000000003',
    staffId: '20000000-0000-4000-8000-000000000003',
    sessionA: 'sess-me-active-a',
  },
  reporter1: {
    userId: '10000000-0000-4000-8000-000000000004',
    staffId: '20000000-0000-4000-8000-000000000004',
    sessionA: 'sess-rep1-active-a',
    sessionB: 'sess-rep1-active-b',
    sessionRevoked: 'sess-rep1-revoked-c',
  },
  reporter2: {
    userId: '10000000-0000-4000-8000-000000000005',
    staffId: '20000000-0000-4000-8000-000000000005',
    sessionA: 'sess-rep2-active-a',
  },
  commercial: {
    userId: '10000000-0000-4000-8000-000000000006',
    staffId: '20000000-0000-4000-8000-000000000006',
    sessionA: 'sess-comm-active-a',
  },
  suspendedStaff: {
    userId: '10000000-0000-4000-8000-000000000007',
    staffId: '20000000-0000-4000-8000-000000000007',
    sessionA: 'sess-susp-active-a',
  },
  revokedStaff: {
    userId: '10000000-0000-4000-8000-000000000008',
    staffId: '20000000-0000-4000-8000-000000000008',
    sessionA: 'sess-revstaff-active-a',
  },
  nonStaffAuth: {
    userId: '10000000-0000-4000-8000-000000000099',
    sessionA: 'sess-reader-nonstaff-a',
  },
};

const FIXTURES = {
  storyId: '30000000-0000-4000-8000-000000000001',
  assignmentId: '40000000-0000-4000-8000-000000000001',
  generalThreadId: '50000000-0000-4000-8000-000000000001',
};

function jwtContext(userId, sessionId, role = 'authenticated') {
  if (!userId) {
    return `
      SET ROLE anon;
      SET "request.jwt.claim.sub" = '';
      SET "request.jwt.claims" = '{}';
    `;
  }
  const claims = JSON.stringify({ sub: userId, session_id: sessionId, role });
  return `
    SET ROLE ${role};
    SET "request.jwt.claim.sub" = '${userId}';
    SET "request.jwt.claims" = '${claims}';
  `;
}

const BASELINE_MIGRATIONS = [
  'supabase/migrations/20260909000100_content_core.sql',
  'supabase/migrations/20260909000200_taxonomy_and_geo.sql',
  'supabase/migrations/20260909000300_redirects_and_seo.sql',
  'supabase/migrations/20260909000400_analytics_and_ads.sql',
  'supabase/migrations/20260909000500_migration_runs_and_checkpoints.sql',
  'supabase/migrations/20260922020254_ag06_newsroom_auth_rbac.sql',
  'supabase/migrations/20260922054411_ca01_internal_schema_capabilities.sql',
  'supabase/migrations/20260922054415_ca01_inbox_story_discussion.sql',
  'supabase/migrations/20260922054420_ca01_desks_threads_announcements.sql',
  'supabase/migrations/20260922054424_ca01_communication_storage.sql',
  'supabase/migrations/20260922094527_com01_communications_domain.sql',
  'supabase/migrations/20260922095013_com01_private_attachments.sql',
  'supabase/migrations/20261017070000_ht_nr_wave_c_staff_operations.sql',
];

const G2_REMEDIATION_MIGRATION =
  'supabase/migrations/20261107130000_ht_mvp_g2_rbac_session_boundary_hardening.sql';

const TARGET_REGPROCEDURES = [
  'newsroom_revoke_session(uuid,text)',
  'newsroom_progress_assignment(uuid)',
  'newsroom_create_thread(text,text,uuid,uuid,text,timestamp with time zone)',
  'newsroom_set_thread_member(uuid,uuid,boolean)',
  'newsroom_close_thread(uuid)',
  'newsroom_finalize_communication_attachment(uuid)',
  'newsroom_mark_communication_attachment_deleted(uuid)',
  'communications_finalize_attachment(uuid)',
  'communications_delete_attachment(uuid)',
];

function snapshotFunctionDefs() {
  const arrayLiteral = TARGET_REGPROCEDURES.map(s => `'${s}'`).join(', ');
  const rows = runSqlFull(`
    SELECT p.oid::regprocedure::text || ':::' || encode(digest(pg_get_functiondef(p.oid), 'sha256'), 'hex')
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = ANY(ARRAY[${arrayLiteral}])
    ORDER BY 1;
  `);
  return Object.fromEntries(
    rows
      .split('\n')
      .filter(Boolean)
      .map(line => line.split(':::'))
  );
}

function captureFunctionRollbackSql() {
  const arrayLiteral = TARGET_REGPROCEDURES.map(s => `'${s}'`).join(', ');
  return runSqlFull(`
    SELECT pg_get_functiondef(p.oid) || ';'
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = ANY(ARRAY[${arrayLiteral}])
    ORDER BY p.oid::regprocedure::text;
  `);
}

let preG2FunctionDigests = {};
let preG2RollbackSql = '';
let postG2FunctionDigests = {};

test('G2-RBAC-01: Initialize disposable PostgreSQL 16 database with pre-G2 baseline migrations and seed test actors', () => {
  execSync(`${PSQL_BIN} "${BASE_PG_URI}/postgres" -X -c "DROP DATABASE IF EXISTS ${DB_NAME};"`);
  execSync(`${PSQL_BIN} "${BASE_PG_URI}/postgres" -X -c "CREATE DATABASE ${DB_NAME};"`);

  runSql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
      END IF;
    END
    $$;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE SCHEMA IF NOT EXISTS auth;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      email_confirmed_at timestamptz,
      raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $f$;
    GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC, anon, authenticated, service_role;

    CREATE SCHEMA IF NOT EXISTS storage;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id text PRIMARY KEY,
      name text UNIQUE,
      public boolean DEFAULT false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
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
  `);

  for (const mig of BASELINE_MIGRATIONS) {
    execSync(`${PSQL_BIN} "${PG_URI}" -X -v ON_ERROR_STOP=1 -f "${mig}"`);
  }

  preG2FunctionDigests = snapshotFunctionDefs();
  preG2RollbackSql = captureFunctionRollbackSql();
  assert.equal(Object.keys(preG2FunctionDigests).length, 9, 'All 9 target functions must exist in pre-G2 baseline');

  // Seed actors with authentic auth_user_id + role_id + newsroom_sessions (auth_user_id, staff_profile_id, provider_session_id)
  runSql(`
    INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
      ('${ACTORS.owner.userId}', 'owner@healthtimes.test', now()),
      ('${ACTORS.eic.userId}', 'eic@healthtimes.test', now()),
      ('${ACTORS.managingEditor.userId}', 'me@healthtimes.test', now()),
      ('${ACTORS.reporter1.userId}', 'reporter1@healthtimes.test', now()),
      ('${ACTORS.reporter2.userId}', 'reporter2@healthtimes.test', now()),
      ('${ACTORS.commercial.userId}', 'commercial@healthtimes.test', now()),
      ('${ACTORS.suspendedStaff.userId}', 'suspended@healthtimes.test', now()),
      ('${ACTORS.revokedStaff.userId}', 'revoked@healthtimes.test', now()),
      ('${ACTORS.nonStaffAuth.userId}', 'reader@healthtimes.test', now());

    INSERT INTO public.staff_profiles (id, auth_user_id, email, display_name, status, role_id) VALUES
      ('${ACTORS.owner.staffId}', '${ACTORS.owner.userId}', 'owner@healthtimes.test', 'Publisher Owner', 'active', (SELECT id FROM public.newsroom_roles WHERE name = 'Publisher / Owner')),
      ('${ACTORS.eic.staffId}', '${ACTORS.eic.userId}', 'eic@healthtimes.test', 'Editor In Chief', 'active', (SELECT id FROM public.newsroom_roles WHERE name = 'Editor-in-Chief')),
      ('${ACTORS.managingEditor.staffId}', '${ACTORS.managingEditor.userId}', 'me@healthtimes.test', 'Managing Editor', 'active', (SELECT id FROM public.newsroom_roles WHERE name = 'Managing Editor')),
      ('${ACTORS.reporter1.staffId}', '${ACTORS.reporter1.userId}', 'reporter1@healthtimes.test', 'Reporter One', 'active', (SELECT id FROM public.newsroom_roles WHERE name = 'Reporter / Journalist')),
      ('${ACTORS.reporter2.staffId}', '${ACTORS.reporter2.userId}', 'reporter2@healthtimes.test', 'Reporter Two', 'active', (SELECT id FROM public.newsroom_roles WHERE name = 'Reporter / Journalist')),
      ('${ACTORS.commercial.staffId}', '${ACTORS.commercial.userId}', 'commercial@healthtimes.test', 'Commercial Manager', 'active', (SELECT id FROM public.newsroom_roles WHERE name = 'Commercial Manager')),
      ('${ACTORS.suspendedStaff.staffId}', '${ACTORS.suspendedStaff.userId}', 'suspended@healthtimes.test', 'Suspended Staff', 'suspended', (SELECT id FROM public.newsroom_roles WHERE name = 'Publisher / Owner')),
      ('${ACTORS.revokedStaff.staffId}', '${ACTORS.revokedStaff.userId}', 'revoked@healthtimes.test', 'Revoked Staff', 'revoked', (SELECT id FROM public.newsroom_roles WHERE name = 'Publisher / Owner'));

    INSERT INTO public.newsroom_sessions (auth_user_id, staff_profile_id, provider_session_id, revoked_at) VALUES
      ('${ACTORS.owner.userId}', '${ACTORS.owner.staffId}', '${ACTORS.owner.sessionA}', null),
      ('${ACTORS.owner.userId}', '${ACTORS.owner.staffId}', '${ACTORS.owner.sessionB}', null),
      ('${ACTORS.eic.userId}', '${ACTORS.eic.staffId}', '${ACTORS.eic.sessionA}', null),
      ('${ACTORS.managingEditor.userId}', '${ACTORS.managingEditor.staffId}', '${ACTORS.managingEditor.sessionA}', null),
      ('${ACTORS.reporter1.userId}', '${ACTORS.reporter1.staffId}', '${ACTORS.reporter1.sessionA}', null),
      ('${ACTORS.reporter1.userId}', '${ACTORS.reporter1.staffId}', '${ACTORS.reporter1.sessionB}', null),
      ('${ACTORS.reporter1.userId}', '${ACTORS.reporter1.staffId}', '${ACTORS.reporter1.sessionRevoked}', now()),
      ('${ACTORS.reporter2.userId}', '${ACTORS.reporter2.staffId}', '${ACTORS.reporter2.sessionA}', null),
      ('${ACTORS.commercial.userId}', '${ACTORS.commercial.staffId}', '${ACTORS.commercial.sessionA}', null),
      ('${ACTORS.suspendedStaff.userId}', '${ACTORS.suspendedStaff.staffId}', '${ACTORS.suspendedStaff.sessionA}', null),
      ('${ACTORS.revokedStaff.userId}', '${ACTORS.revokedStaff.staffId}', '${ACTORS.revokedStaff.sessionA}', null);

    INSERT INTO public.stories (id, slug, title, status, workflow_status, owner_staff_id)
    VALUES ('${FIXTURES.storyId}', 'g2-rbac-test-story', 'G2 RBAC Test Story', 'draft', 'Draft', '${ACTORS.reporter1.staffId}');

    INSERT INTO public.story_assignments (id, story_id, title, reporter_staff_id, assigned_editor_staff_id, assigned_by, priority, status)
    VALUES ('${FIXTURES.assignmentId}', '${FIXTURES.storyId}', 'Investigate RBAC boundary', '${ACTORS.reporter1.staffId}', '${ACTORS.managingEditor.staffId}', '${ACTORS.managingEditor.staffId}', 'Normal', 'Assigned');

    INSERT INTO public.newsroom_threads (id, thread_type, title, created_by, priority, status)
    VALUES ('${FIXTURES.generalThreadId}', 'general', 'General Editorial Thread', '${ACTORS.reporter1.staffId}', 'normal', 'open');
  `);
});

test('G2-RBAC-02: PRE-REMEDIATION PROOF — Reproduce DEF-G2-SQL-REVOKE-NULL-ACTOR on baseline schema (rolled back)', () => {
  // 1. Prove non-staff authenticated user (v_actor IS NULL) can revoke Publisher/Owner sessions, progress assignments, and close general threads on pre-G2 baseline
  const preFixOutput = runSqlFull(`
    BEGIN;
    ${jwtContext(ACTORS.nonStaffAuth.userId, ACTORS.nonStaffAuth.sessionA)}
    SELECT 'VULN_NONSTAFF_REVOKE=' || public.newsroom_revoke_session('${ACTORS.owner.staffId}'::uuid, null)::text;
    SELECT 'VULN_NONSTAFF_PROGRESS=' || public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    SELECT public.newsroom_close_thread('${FIXTURES.generalThreadId}'::uuid);
    RESET ROLE;
    SELECT 'VULN_NONSTAFF_CLOSE_THREAD=' || status FROM public.newsroom_threads WHERE id = '${FIXTURES.generalThreadId}'::uuid;
    ROLLBACK;
  `);
  assert.ok(
    preFixOutput.includes('VULN_NONSTAFF_REVOKE=2'),
    `Expected pre-G2 baseline to allow non-staff authenticated user to revoke 2 Owner sessions, got:\n${preFixOutput}`
  );
  assert.ok(
    preFixOutput.includes('VULN_NONSTAFF_PROGRESS=Accepted'),
    `Expected pre-G2 baseline to allow non-staff authenticated user to progress assignment to Accepted, got:\n${preFixOutput}`
  );
  assert.ok(
    preFixOutput.includes('VULN_NONSTAFF_CLOSE_THREAD=closed'),
    `Expected pre-G2 baseline to allow non-staff authenticated user to close general thread, got:\n${preFixOutput}`
  );

  // 2. Prove already-revoked session of Reporter 1 can still revoke Reporter 1's active sibling sessions on pre-G2 baseline
  const revokedSessionOutput = runSqlFull(`
    BEGIN;
    ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionRevoked)}
    SELECT 'VULN_REVOKED_SESS_REVOKE=' || public.newsroom_revoke_session('${ACTORS.reporter1.staffId}'::uuid, '${ACTORS.reporter1.sessionA}')::text;
    ROLLBACK;
  `);
  assert.ok(
    revokedSessionOutput.includes('VULN_REVOKED_SESS_REVOKE=1'),
    `Expected pre-G2 baseline to allow already-revoked session to revoke active sibling session, got:\n${revokedSessionOutput}`
  );
});

test('G2-RBAC-03: APPLY FORWARD-ONLY G2 MIGRATION & verify function hardening metadata', () => {
  execSync(`${PSQL_BIN} "${PG_URI}" -X -v ON_ERROR_STOP=1 -f "${G2_REMEDIATION_MIGRATION}"`);
  postG2FunctionDigests = snapshotFunctionDefs();
  assert.equal(Object.keys(postG2FunctionDigests).length, 9);

  for (const fnSig of Object.keys(postG2FunctionDigests)) {
    assert.notEqual(
      postG2FunctionDigests[fnSig],
      preG2FunctionDigests[fnSig],
      `Function ${fnSig} definition must be updated by G2 remediation migration`
    );
  }

  const arrayLiteral = TARGET_REGPROCEDURES.map(s => `'${s}'`).join(', ');
  const secMeta = runSqlFull(`
    SELECT
      p.oid::regprocedure::text || '|' ||
      p.prosecdef::text || '|' ||
      coalesce(array_to_string(p.proconfig, ','), '') || '|' ||
      has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|' ||
      has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = ANY(ARRAY[${arrayLiteral}])
    ORDER BY 1;
  `);

  for (const line of secMeta.split('\n').filter(Boolean)) {
    const [sig, prosecdef, proconfig, anonExec, authExec] = line.split('|');
    assert.equal(prosecdef, 'true', `${sig} must be SECURITY DEFINER`);
    assert.ok(proconfig.includes('search_path=public, auth'), `${sig} must pin search_path=public, auth (got ${proconfig})`);
    assert.equal(anonExec, 'false', `${sig} must deny EXECUTE to anon`);
    assert.equal(authExec, 'true', `${sig} must grant EXECUTE to authenticated`);
  }
});

test('G2-RBAC-04: POST-REMEDIATION NEGATIVE BOUNDARY — Reject anonymous, non-staff, suspended, revoked, unregistered/revoked session, and cross-staff callers', () => {
  // 1. Anonymous caller rejected by permission deny (42501)
  runSqlExpectError(
    `
      ${jwtContext(null, null, 'anon')}
      SELECT public.newsroom_revoke_session('${ACTORS.owner.staffId}'::uuid, null);
    `,
    '42501'
  );
  runSqlExpectError(
    `
      ${jwtContext(null, null, 'anon')}
      SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    `,
    '42501'
  );

  // 2. Non-staff authenticated caller (v_actor IS NULL) rejected with 42501 ('Active Newsroom session required')
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.nonStaffAuth.userId, ACTORS.nonStaffAuth.sessionA)}
      SELECT public.newsroom_revoke_session('${ACTORS.owner.staffId}'::uuid, null);
    `,
    '42501',
    'Active Newsroom session required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.nonStaffAuth.userId, ACTORS.nonStaffAuth.sessionA)}
      SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    `,
    '42501',
    'Active Newsroom session required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.nonStaffAuth.userId, ACTORS.nonStaffAuth.sessionA)}
      SELECT public.newsroom_set_thread_member('${FIXTURES.generalThreadId}'::uuid, '${ACTORS.reporter2.staffId}'::uuid, true);
    `,
    '42501',
    'Active Newsroom session required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.nonStaffAuth.userId, ACTORS.nonStaffAuth.sessionA)}
      SELECT public.newsroom_close_thread('${FIXTURES.generalThreadId}'::uuid);
    `,
    '42501',
    'Active Newsroom session required'
  );

  // 3. Suspended staff caller (status='suspended' -> v_actor IS NULL) rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.suspendedStaff.userId, ACTORS.suspendedStaff.sessionA)}
      SELECT public.newsroom_revoke_session('${ACTORS.owner.staffId}'::uuid, null);
    `,
    '42501',
    'Active Newsroom session required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.suspendedStaff.userId, ACTORS.suspendedStaff.sessionA)}
      SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    `,
    '42501',
    'Active Newsroom session required'
  );

  // 4. Revoked staff caller (status='revoked' -> v_actor IS NULL) rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.revokedStaff.userId, ACTORS.revokedStaff.sessionA)}
      SELECT public.newsroom_revoke_session('${ACTORS.owner.staffId}'::uuid, null);
    `,
    '42501',
    'Active Newsroom session required'
  );

  // 5. Active staff (Reporter 1) with an already-revoked session rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionRevoked)}
      SELECT public.newsroom_revoke_session('${ACTORS.reporter1.staffId}'::uuid, '${ACTORS.reporter1.sessionA}');
    `,
    '42501',
    'Active Newsroom session required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionRevoked)}
      SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    `,
    '42501',
    'Active Newsroom session required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionRevoked)}
      SELECT public.newsroom_close_thread('${FIXTURES.generalThreadId}'::uuid);
    `,
    '42501',
    'Active Newsroom session required'
  );

  // 6. Active staff (Reporter 1) with an unregistered provider_session_id rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, 'sess-unregistered-xyz')}
      SELECT public.newsroom_revoke_session('${ACTORS.reporter1.staffId}'::uuid, '${ACTORS.reporter1.sessionA}');
    `,
    '42501',
    'Active Newsroom session required'
  );

  // 7. Non-admin active staff (Reporter 1 & Commercial Manager) attempting cross-staff exact-ID or NULL bulk revocation rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionA)}
      SELECT public.newsroom_revoke_session('${ACTORS.owner.staffId}'::uuid, '${ACTORS.owner.sessionA}');
    `,
    '42501',
    'security.revoke_session or staff.manage capability required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.commercial.userId, ACTORS.commercial.sessionA)}
      SELECT public.newsroom_revoke_session('${ACTORS.reporter1.staffId}'::uuid, null);
    `,
    '42501',
    'security.revoke_session or staff.manage capability required'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionA)}
      SELECT public.newsroom_revoke_session(null, null);
    `,
    '42501',
    'security.revoke_session or staff.manage capability required'
  );

  // 8. Unassigned Reporter 2 attempting to progress Reporter 1's assignment rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter2.userId, ACTORS.reporter2.sessionA)}
      SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    `,
    '42501',
    'Assignment authority required'
  );

  // 9. Reporter 2 attempting to manage/close Reporter 1's general thread rejected with 42501
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter2.userId, ACTORS.reporter2.sessionA)}
      SELECT public.newsroom_set_thread_member('${FIXTURES.generalThreadId}'::uuid, '${ACTORS.commercial.staffId}'::uuid, true);
    `,
    '42501',
    'Only the thread owner may manage general thread membership'
  );
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter2.userId, ACTORS.reporter2.sessionA)}
      SELECT public.newsroom_close_thread('${FIXTURES.generalThreadId}'::uuid);
    `,
    '42501',
    'Only the thread owner may close this thread'
  );

  // Verify ZERO rows were mutated across all negative tests
  const stateCheck = runSql(`
    SELECT
      (SELECT count(*) FROM public.newsroom_sessions WHERE staff_profile_id = '${ACTORS.owner.staffId}' AND revoked_at IS NULL)::text || '|' ||
      (SELECT count(*) FROM public.newsroom_sessions WHERE staff_profile_id = '${ACTORS.reporter1.staffId}' AND revoked_at IS NULL)::text || '|' ||
      (SELECT status FROM public.story_assignments WHERE id = '${FIXTURES.assignmentId}')::text || '|' ||
      (SELECT status FROM public.newsroom_threads WHERE id = '${FIXTURES.generalThreadId}')::text;
  `);
  assert.equal(
    stateCheck,
    '2|2|Assigned|open',
    'Zero sessions, assignments, or threads may be mutated by rejected unauthorized calls'
  );
});

test('G2-RBAC-05: POST-REMEDIATION POSITIVE CONTINUITY — Self-revocation, admin exact/bulk revocation, and assignment progression', () => {
  // 1. Assigned Reporter 1 progresses own assignment: Assigned -> Accepted
  const nextStatus1 = runSql(`
    ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionA)}
    SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
  `);
  assert.equal(nextStatus1, 'Accepted');

  // 2. Managing Editor (assignment.manage) progresses Reporter 1's assignment: Accepted -> Reporting
  const nextStatus2 = runSql(`
    ${jwtContext(ACTORS.managingEditor.userId, ACTORS.managingEditor.sessionA)}
    SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
  `);
  assert.equal(nextStatus2, 'Reporting');

  // 3. Reporter 1 self-revokes Session A while Session B remains active (ICR-05B self-isolation)
  const selfRevokeCount = runSql(`
    ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionA)}
    SELECT public.newsroom_revoke_session('${ACTORS.reporter1.staffId}'::uuid, '${ACTORS.reporter1.sessionA}')::text;
  `);
  assert.equal(selfRevokeCount, '1');

  // Revoked Session A can no longer progress assignment or revoke Session B
  runSqlExpectError(
    `
      ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionA)}
      SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
    `,
    '42501',
    'Active Newsroom session required'
  );

  // Concurrent Session B of Reporter 1 remains authorized and progresses assignment: Reporting -> Drafting
  const nextStatus3 = runSql(`
    ${jwtContext(ACTORS.reporter1.userId, ACTORS.reporter1.sessionB)}
    SELECT public.newsroom_progress_assignment('${FIXTURES.assignmentId}'::uuid);
  `);
  assert.equal(nextStatus3, 'Drafting');

  // 4. Editor-in-Chief (security.revoke_session / staff.manage) revokes Reporter 2's exact session
  const adminExactRevoke = runSql(`
    ${jwtContext(ACTORS.eic.userId, ACTORS.eic.sessionA)}
    SELECT public.newsroom_revoke_session('${ACTORS.reporter2.staffId}'::uuid, '${ACTORS.reporter2.sessionA}')::text;
  `);
  assert.equal(adminExactRevoke, '1');

  // 5. Publisher / Owner performs administrative NULL bulk revocation for Reporter 1 (revokes remaining Session B)
  const adminBulkRevoke = runSql(`
    ${jwtContext(ACTORS.owner.userId, ACTORS.owner.sessionA)}
    SELECT public.newsroom_revoke_session('${ACTORS.reporter1.staffId}'::uuid, null)::text;
  `);
  assert.equal(adminBulkRevoke, '1');

  // Verify audit_logs recorded non-null actor_staff_id for every legitimate operation
  const nullActorAudits = runSql(`
    SELECT count(*)::text FROM public.audit_logs WHERE actor_staff_id IS NULL;
  `);
  assert.equal(nullActorAudits, '0', 'All audit_logs entries must record a valid non-null actor_staff_id');
});

test('G2-RBAC-06: FORWARD -> ROLLBACK -> RE-APPLY DETERMINISM — Verify exact SHA-256 function definition parity', () => {
  // Roll back to exact pre-G2 function definitions captured from baseline migrations
  runSql(preG2RollbackSql);

  const rolledBackDigests = snapshotFunctionDefs();
  assert.deepEqual(
    rolledBackDigests,
    preG2FunctionDigests,
    'Rollback must restore exact pre-G2 function definition SHA-256 digests'
  );

  // Re-apply G2 forward-only migration
  execSync(`${PSQL_BIN} "${PG_URI}" -X -v ON_ERROR_STOP=1 -f "${G2_REMEDIATION_MIGRATION}"`);
  const reappliedDigests = snapshotFunctionDefs();
  assert.deepEqual(
    reappliedDigests,
    postG2FunctionDigests,
    'Re-applying G2 migration must produce identical post-G2 function definition SHA-256 digests'
  );
});

test('G2-RBAC-07: ADJACENT ATTACHMENT & THREAD CREATION RPCs — Reject non-staff and revoked-session callers upfront with 42501', () => {
  const dummyAttachmentId = '60000000-0000-4000-8000-000000000001';
  for (const rpcCall of [
    `SELECT public.newsroom_create_thread('general', 'Unauthorized Thread', null, null, 'normal', null);`,
    `SELECT public.newsroom_finalize_communication_attachment('${dummyAttachmentId}'::uuid);`,
    `SELECT public.newsroom_mark_communication_attachment_deleted('${dummyAttachmentId}'::uuid);`,
    `SELECT public.communications_finalize_attachment('${dummyAttachmentId}'::uuid);`,
    `SELECT public.communications_delete_attachment('${dummyAttachmentId}'::uuid);`,
  ]) {
    // Non-staff authenticated caller rejected upfront with 42501 (not P0002 Attachment not found)
    runSqlExpectError(
      `
        ${jwtContext(ACTORS.nonStaffAuth.userId, ACTORS.nonStaffAuth.sessionA)}
        ${rpcCall}
      `,
      '42501',
      'Active Newsroom session required'
    );
    // Suspended staff caller rejected upfront with 42501
    runSqlExpectError(
      `
        ${jwtContext(ACTORS.suspendedStaff.userId, ACTORS.suspendedStaff.sessionA)}
        ${rpcCall}
      `,
      '42501',
      'Active Newsroom session required'
    );
  }
});
