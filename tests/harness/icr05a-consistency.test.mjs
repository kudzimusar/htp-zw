import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RECORD_PATH = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/records/UIAT01-R3-ICR05A-LR01-verification.json');
const SQL_AUDIT_PATH = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/records/live-sql-session-audit.json');
const REPORT_PATH = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/HT-MVP-UIAT-01-R3-ICR05A-LR01-REPORT.md');
const MATRIX_PATH = path.resolve('docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/HT-MVP-UIAT-01-R3-ICR05A-LR01-MATRIX.md');

test('CONSISTENCY: Verification record exists and has zero failures', () => {
  assert.ok(fs.existsSync(RECORD_PATH), 'Verification record must exist');
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.failures.length, 0, `Harness must have 0 failures, got: ${JSON.stringify(record.failures)}`);
  assert.equal(record.unitId, 'HT-MVP-UIAT-01-R3-ICR05A-LR01');
  assert.equal(record.expectedApplicationSha, '48c2ecbf59eb75d3feb82b5984b66bb13a933480');
});

test('CONSISTENCY: Allowlisted query templates catalog least privilege', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.leastPrivilege.mode, 'ALLOWLISTED_QUERY_TEMPLATES_ENFORCED');
  assert.equal(record.leastPrivilege.arbitrarySqlPermitted, false);
  assert.ok(record.leastPrivilege.templatesCatalog.includes('NEWSROOM_ACTIVE_SESSIONS'));
  assert.ok(record.leastPrivilege.templatesCatalog.includes('AUTH_ACTIVE_SESSIONS'));
  assert.ok(record.leastPrivilege.templatesCatalog.includes('AUTH_ACTIVE_REFRESH_TOKENS'));
  assert.ok(record.leastPrivilege.templatesCatalog.includes('STAGING_MIGRATION_20261102160000_CHECK'));
  assert.ok(record.leastPrivilege.templatesCatalog.includes('STAGING_CREATE_STORY_PROSRC'));
  assert.ok(record.leastPrivilege.templatesCatalog.includes('HISTORIC_REVOCATIONS_AUDIT'));
});

test('CONSISTENCY: Exact provider session revocation enforced with zero null sentinels', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.sessionGovernance.sessionRevokeNullProviderIdPresent, false);
  assert.ok(record.sessionGovernance.trackedCurrentRunSessions.length >= 2, 'Must have tracked at least 2 UAT sessions');
  for (const s of record.sessionGovernance.trackedCurrentRunSessions) {
    assert.ok(s.providerSessionId && s.providerSessionId.length > 10, 'ProviderSessionId must be non-empty string');
    assert.notEqual(s.providerSessionId, 'null');
    assert.notEqual(s.providerSessionId, 'undefined');
  }
});

test('CONSISTENCY: Session hygiene pre/post audit verified with zero test leakage and owner preserved at 15', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.sessionAudit.preTest.counts.testNewsroomSessions, 0);
  assert.equal(record.sessionAudit.preTest.counts.ownerNewsroomSessions, 15);
  assert.equal(record.sessionAudit.postTest.counts.testNewsroomSessions, 0);
  assert.equal(record.sessionAudit.postTest.counts.ownerNewsroomSessions, 15);
  assert.equal(record.sessionAudit.postTest.counts.testAuthSessions, 0);
  assert.equal(record.sessionAudit.postTest.counts.testRefreshTokens, 0);
});

test('CONSISTENCY: Staging DB title authority and forward migration status', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.databaseTitleAuthority.stagingMigration20261102160000Applied, false);
  assert.equal(record.databaseTitleAuthority.stagingMigrationAuthStatus, 'BLOCKED_OWNER_AUTH_REQUIRED');
  assert.equal(record.databaseTitleAuthority.stagingCreateStoryHasUntitledFallback, true);
});

test('CONSISTENCY: Canonical 30-case matrix restored from ICR04 (23 PASS, 0 FAIL, 7 BLOCKED, 0 DEFERRED)', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.canonical30Matrix.totalCases, 30);
  assert.equal(record.canonical30Matrix.passCount, 23);
  assert.equal(record.canonical30Matrix.failCount, 0);
  assert.equal(record.canonical30Matrix.blockedCount, 7);
  assert.equal(record.canonical30Matrix.ownerAuthorizedDeferredCount, 0);
  assert.equal(record.canonical30Matrix.registrySource, 'HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md');

  const blockedIds = record.canonical30Matrix.blockedCases.map(b => b.caseId).sort();
  assert.deepEqual(blockedIds, ['UAT-A03', 'UAT-E01', 'UAT-E02', 'UAT-J01', 'UAT-J02', 'UAT-J04', 'UAT-R05'].sort());
});

test('CONSISTENCY: Supplemental safety matrix tracked separately (14 PASS, 0 FAIL, 0 BLOCKED)', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  assert.equal(record.supplementalSafetyMatrix.totalCases, 14);
  assert.equal(record.supplementalSafetyMatrix.passCount, 14);
  assert.equal(record.supplementalSafetyMatrix.failCount, 0);
  assert.equal(record.supplementalSafetyMatrix.blockedCount, 0);
  assert.equal(record.supplementalSafetyMatrix.cases.length, 14);
  for (const c of record.supplementalSafetyMatrix.cases) {
    assert.equal(c.status, 'PASS');
  }
});

test('CONSISTENCY: Live SQL session audit file matches verification record and has valid SHA-256 integrity digest', () => {
  assert.ok(fs.existsSync(SQL_AUDIT_PATH), 'Live SQL session audit file must exist');
  const sqlAudit = JSON.parse(fs.readFileSync(SQL_AUDIT_PATH, 'utf8'));
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));

  assert.equal(sqlAudit.unitId, 'HT-MVP-UIAT-01-R3-ICR05A-LR01');
  assert.equal(sqlAudit.authority, 'ALLOWLISTED_QUERY_TEMPLATES_ENFORCED');
  assert.equal(sqlAudit.preTest.counts.testNewsroomSessions, 0);
  assert.equal(sqlAudit.postTest.counts.testNewsroomSessions, 0);
  assert.equal(sqlAudit.postTest.counts.ownerNewsroomSessions, 15);
  assert.ok(sqlAudit.integrityDigestSha256 && sqlAudit.integrityDigestSha256.length === 64);
});

test('CONSISTENCY: Search telemetry SLA and negative query pass', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  const search = record.checks.supplementalSearch;
  assert.equal(search.samples.length, 5);
  assert.ok(search.p75DurationMs <= 2500, `P75 duration ${search.p75DurationMs} must be <= 2500ms`);
  assert.equal(search.negativeQueryPass, true);
  assert.equal(search.pass, true);
});

test('CONSISTENCY: Core web vitals and telemetry benchmark pass SLAs', () => {
  const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
  const perf = record.checks.supplementalPerformance;
  assert.ok(perf.desktopWarm.p75Lcp <= 2000, `Desktop warm LCP ${perf.desktopWarm.p75Lcp} must be <= 2000ms`);
  assert.ok(perf.desktopCold.p75Lcp <= 2500, `Desktop cold LCP ${perf.desktopCold.p75Lcp} must be <= 2500ms`);
  assert.ok(perf.mobileCold.p75Lcp <= 2500, `Mobile cold LCP ${perf.mobileCold.p75Lcp} must be <= 2500ms`);
  assert.ok(perf.desktopWarm.p75Cls <= 0.05, `Desktop warm CLS ${perf.desktopWarm.p75Cls} must be <= 0.05`);
  assert.ok(perf.mobileCold.p75Cls <= 0.05, `Mobile cold CLS ${perf.mobileCold.p75Cls} must be <= 0.05`);
  assert.equal(perf.desktopWarm.singleRpcPass, true);
  assert.equal(perf.desktopCold.singleRpcPass, true);
  assert.equal(perf.mobileCold.singleRpcPass, true);
  assert.equal(perf.pass, true);
});
