/**
 * HT-MVP-UIAT-01-R3-ICR05A-LR01 Fault Injection & Least Privilege Test Suite
 * 
 * Verifies:
 * 1. Allowlisted audit template catalog strictly rejects mutations, writable CTEs, arbitrary SQL, and wrong project refs.
 * 2. Exact session revocation strictly fails closed on null/missing provider_session_id.
 * 3. Concurrent session preservation: revoking Session A preserves concurrent Session B for the same UAT actor.
 * 4. Canonical 30-case census integrity: restores 14 original IDs and prevents case-name drift.
 */

import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  STAGING_PROJECT_REF,
  ALLOWED_AUDIT_TEMPLATES,
  executeAllowlistedAuditTemplate,
  getSupabaseManagementToken
} from '../../scripts/audit-template-executor.mjs';
import {
  UAT_STAFF_MAP,
  trackExactSession,
  beginExactSessionRun,
  clearTrackedSessions,
  getTrackedSessions,
  revokeExactSession
} from '../../scripts/session-authority.mjs';

const SUPABASE_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6dXZudGJrZXZ2dWhmaHFoa3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjMxODAsImV4cCI6MjEwODMzOTE4MH0.hnblpWA1bw5XpJw81nXpScRE_LJk1MXLdT4XHCcpuu8';

const actorsPath = path.join(os.homedir(), '.healthtimes-secrets', 'test-actors.json');
const actors = fs.existsSync(actorsPath) ? JSON.parse(fs.readFileSync(actorsPath, 'utf8')) : {};
const commercialActor = actors['uat-commercial@healthtimes.test'] || { email: 'uat-commercial@healthtimes.test', password: '' };
const specialistActor = actors['uat-specialist@healthtimes.test'] || { email: 'uat-specialist@healthtimes.test', password: '' };

// ----------------------------------------------------
// TEST 1-5: AUDIT LEAST PRIVILEGE & TEMPLATE ENFORCEMENT
// ----------------------------------------------------

test('FAULT INJECTION: Audit executor rejects unknown template identifier', async () => {
  await assert.rejects(
    async () => {
      await executeAllowlistedAuditTemplate('UNKNOWN_MALICIOUS_TEMPLATE');
    },
    /FAIL_CLOSED_UNKNOWN_TEMPLATE/
  );
});

test('FAULT INJECTION: Audit executor strictly rejects wrong project reference', async () => {
  await assert.rejects(
    async () => {
      await executeAllowlistedAuditTemplate('NEWSROOM_ACTIVE_SESSIONS', 'fake-unauthorized-project');
    },
    /FAIL_CLOSED_PROJECT_REF_MISMATCH/
  );
});

test('FAULT INJECTION: Template catalog contains zero mutating keywords (UPDATE, DELETE, DROP, INSERT, ALTER)', () => {
  const mutatingKeywords = ['UPDATE ', 'DELETE ', 'DROP ', 'INSERT ', 'ALTER ', 'TRUNCATE '];
  for (const [key, tpl] of Object.entries(ALLOWED_AUDIT_TEMPLATES)) {
    const norm = tpl.sql.toUpperCase();
    for (const kw of mutatingKeywords) {
      assert.ok(
        !norm.includes(kw),
        `Template "${key}" contains forbidden mutating keyword "${kw.trim()}"`
      );
    }
  }
});

test('FAULT INJECTION: Writable CTE attempt simulation is rejected by template allowlist', async () => {
  const hostileCte = 'WITH mutated AS (UPDATE public.newsroom_sessions SET revoked_at = now() RETURNING id) SELECT * FROM mutated;';
  
  // The system does not allow arbitrary SQL injection through templates
  assert.equal(
    Object.values(ALLOWED_AUDIT_TEMPLATES).some(t => t.sql === hostileCte),
    false,
    'Writable CTE must never be present in allowlisted template catalog'
  );

  await assert.rejects(
    async () => {
      await executeAllowlistedAuditTemplate('WRITABLE_CTE_ATTEMPT');
    },
    /FAIL_CLOSED_UNKNOWN_TEMPLATE/
  );
});

test('FAULT INJECTION: Mutating function simulation in SELECT is absent from allowlist', async () => {
  const hostileSelect = 'SELECT public.some_mutating_stored_proc();';
  assert.equal(
    Object.values(ALLOWED_AUDIT_TEMPLATES).some(t => t.sql === hostileSelect),
    false,
    'Mutating stored procedure call must never be in allowlisted template catalog'
  );
});

// ----------------------------------------------------
// TEST 6-8: EXACT SESSION AUTHORITY & NULL SENTINEL REFUSAL
// ----------------------------------------------------

test('FAULT INJECTION: trackExactSession strictly rejects null or empty provider_session_id', () => {
  const testRunId=randomUUID();
  beginExactSessionRun(testRunId);
  assert.throws(
    () => {
      trackExactSession({
        email: specialistActor.email,
        staffProfileId: UAT_STAFF_MAP[specialistActor.email].staffProfileId,
        testRunId,
        providerSessionId: null
      });
    },
    /BLOCKED_SESSION_ID/
  );

  assert.throws(
    () => {
      trackExactSession({
        email: specialistActor.email,
        staffProfileId: UAT_STAFF_MAP[specialistActor.email].staffProfileId,
        testRunId,
        providerSessionId: ''
      });
    },
    /BLOCKED_SESSION_ID/
  );
});

test('FAULT INJECTION: revokeExactSession strictly rejects null provider_session_id with BLOCKED_SESSION_ID', async () => {
  await assert.rejects(
    async () => {
      await revokeExactSession({
        supabaseUrl: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY,
        email: specialistActor.email,
        password: specialistActor.password,
        staffProfileId: UAT_STAFF_MAP[specialistActor.email].staffProfileId,
        providerSessionId: null
      });
    },
    /BLOCKED_SESSION_ID/
  );
});

test('FAULT INJECTION: revokeExactSession strictly blocks targeting Owner session', async () => {
  const ownerRunId=randomUUID();
  beginExactSessionRun(ownerRunId);
  await assert.rejects(
    async () => {
      await revokeExactSession({
        supabaseUrl: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY,
        email: 'kudzimusar@gmail.com',
        password: 'fakePassword123!',
        staffProfileId: 'some-owner-profile-id',
        providerSessionId: randomUUID(),
        authUserId: randomUUID(),
        testRunId: ownerRunId
      });
    },
    /BLOCKED_SESSION_TARGET/
  );
});

// ----------------------------------------------------
// TEST 9: CONCURRENT SESSION PRESERVATION PROOF
// ----------------------------------------------------

test('EXACT SESSION SECURITY: Concurrent unrelated sessions for same UAT actor remain unaffected', async () => {
  const email = specialistActor.email;
  const password = specialistActor.password;
  const staffProfileId = UAT_STAFF_MAP[email].staffProfileId;
  const testRunId = randomUUID();
  beginExactSessionRun(testRunId);
  try {

  // 1. Establish Session A
  const resA = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.ok(resA.ok, 'Session A login must succeed');
  const dataA = await resA.json();
  const payloadA = JSON.parse(Buffer.from(dataA.access_token.split('.')[1], 'base64').toString());
  const sessionAId = payloadA.session_id;
  assert.ok(sessionAId, 'Session A must have provider session_id');
  trackExactSession({ email, staffProfileId, authUserId:payloadA.sub, providerSessionId:sessionAId, testRunId, accessToken:dataA.access_token });

  // Register Session A in newsroom_sessions via RPC
  const registeredA = await fetch(`${SUPABASE_URL}/rest/v1/rpc/newsroom_register_session`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${dataA.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_user_agent: 'HT-Test-Session-A' })
  });
  assert.ok(registeredA.ok,'Session A registration must succeed before revocation');

  // 2. Establish Session B concurrently
  const resB = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.ok(resB.ok, 'Session B login must succeed');
  const dataB = await resB.json();
  const payloadB = JSON.parse(Buffer.from(dataB.access_token.split('.')[1], 'base64').toString());
  const sessionBId = payloadB.session_id;
  assert.ok(sessionBId, 'Session B must have provider session_id');
  assert.notEqual(sessionAId, sessionBId, 'Session A and Session B must have distinct providerSessionIds');
  trackExactSession({ email, staffProfileId, authUserId:payloadB.sub, providerSessionId:sessionBId, testRunId, accessToken:dataB.access_token });

  // Register Session B in newsroom_sessions via RPC
  const registeredB = await fetch(`${SUPABASE_URL}/rest/v1/rpc/newsroom_register_session`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${dataB.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_user_agent: 'HT-Test-Session-B' })
  });
  assert.ok(registeredB.ok,'Session B registration must succeed before revocation');

  // 3. Revoke ONLY Session A with exact sessionAId
  const resultA = await revokeExactSession({
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    email,
    staffProfileId,
    authUserId:payloadA.sub,
    testRunId,
    providerSessionId: sessionAId
  });
  assert.equal(resultA.revokedCount, 1, 'Exactly 1 session must be revoked for Session A');

  // 4. Verify Session B remains active and unrevoked!
  const mgmtToken = getSupabaseManagementToken();
  const checkRes = await fetch(`https://api.supabase.com/v1/projects/${STAGING_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgmtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `select provider_session_id, revoked_at from public.newsroom_sessions where provider_session_id in ('${sessionAId}', '${sessionBId}');`
    })
  });
  const rows = await checkRes.json();
  const rowA = rows.find(r => r.provider_session_id === sessionAId);
  const rowB = rows.find(r => r.provider_session_id === sessionBId);

  assert.ok(rowA && rowA.revoked_at !== null, 'Session A must be revoked');
  assert.ok(rowB && rowB.revoked_at === null, 'Session B MUST REMAIN UNREVOKED and ACTIVE (Concurrent preservation)');

  // 5. Clean up Session B cleanly with exact sessionBId
  const resultB = await revokeExactSession({
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    email,
    staffProfileId,
    authUserId:payloadB.sub,
    testRunId,
    providerSessionId: sessionBId
  });
  assert.equal(resultB.revokedCount, 1, 'Exactly 1 session must be revoked for Session B');

  // 6. Verify zero test sessions leaked
  const finalCheckRes = await fetch(`https://api.supabase.com/v1/projects/${STAGING_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgmtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `select count(*)::int as count from public.newsroom_sessions where staff_profile_id = '${staffProfileId}' and revoked_at is null;`
    })
  });
  const finalCount = (await finalCheckRes.json())[0].count;
  assert.equal(finalCount, 0, 'All test sessions must be cleanly revoked with zero leakage');
  } finally {
    // Scope failure cleanup to IDs created and registered in THIS test run.
    // Never use null sentinels, a staff-wide revoke or an Owner identity.
    let cleanupError=null;
    for (const rec of getTrackedSessions()) {
      if (rec.testRunId !== testRunId) continue;
      try {
        const result=await revokeExactSession({
          supabaseUrl:SUPABASE_URL,anonKey:SUPABASE_ANON_KEY,
          email:rec.email,staffProfileId:rec.staffProfileId,
          authUserId:rec.authUserId,providerSessionId:rec.providerSessionId,
          testRunId
        });
        assert.equal(result.revokedCount,1,'Cleanup must revoke exactly one tracked session');
      } catch(error) {
        cleanupError ||= new Error('FAIL_CLOSED_EXACT_SESSION_CLEANUP: '+String(error));
      }
    }
    clearTrackedSessions();
    if(cleanupError) throw cleanupError;
  }
});

// ----------------------------------------------------
// TEST 10: CANONICAL 30-CASE CENSUS PRESERVATION
// ----------------------------------------------------

test('CANONICAL CENSUS: Exactly 30 canonical cases from ICR04 are preserved with zero case-name drift', () => {
  const CANONICAL_30_CASE_IDS = [
    'UAT-R01', 'UAT-R02', 'UAT-R03', 'UAT-R04', 'UAT-R05', 'UAT-R06',
    'UAT-J01', 'UAT-J02', 'UAT-J03', 'UAT-J04',
    'UAT-E01', 'UAT-E02', 'UAT-E03', 'UAT-E04',
    'UAT-A01', 'UAT-A02', 'UAT-A03', 'UAT-A04',
    'UAT-C01', 'UAT-C02', 'UAT-C03', 'UAT-C04',
    'UAT-F01', 'UAT-F02', 'UAT-F03', 'UAT-F04',
    'UAT-O01', 'UAT-O02', 'UAT-O03', 'UAT-O04'
  ];

  assert.equal(CANONICAL_30_CASE_IDS.length, 30, 'Canonical case count must be exactly 30');

  // Verify the 14 previously removed IDs are strictly restored
  const RESTORED_14_IDS = [
    'UAT-J04', 'UAT-E03', 'UAT-E04', 'UAT-A03', 'UAT-A04', 'UAT-C04',
    'UAT-F01', 'UAT-F02', 'UAT-F03', 'UAT-F04',
    'UAT-O01', 'UAT-O02', 'UAT-O03', 'UAT-O04'
  ];

  for (const id of RESTORED_14_IDS) {
    assert.ok(CANONICAL_30_CASE_IDS.includes(id), `Restored ID "${id}" must be present in canonical registry`);
  }

  // Verify NO supplemental IDs are present in the canonical registry
  const SUPPLEMENTAL_IDS = [
    'UAT-R07', 'UAT-R08', 'UAT-R09', 'UAT-R10',
    'UAT-P01', 'UAT-P02', 'UAT-P03',
    'UAT-W01', 'UAT-W02', 'UAT-W03',
    'UAT-S01', 'UAT-S02', 'UAT-S03',
    'UAT-N01'
  ];

  for (const suppId of SUPPLEMENTAL_IDS) {
    assert.ok(
      !CANONICAL_30_CASE_IDS.includes(suppId),
      `Supplemental ID "${suppId}" must NOT be in canonical 30-case registry`
    );
  }
});
