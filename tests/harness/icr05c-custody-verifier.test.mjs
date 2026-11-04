import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const verificationPath = join(
  repoRoot,
  'docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05C-LR01/records/UIAT01-R3-ICR05C-LR01-verification.json'
);
const ui03EvidenceScriptPath = join(
  repoRoot,
  'apps/mobile/tests/ui03-commercial-reader-evidence.mjs'
);
const tabletFlowPath = join(
  repoRoot,
  'apps/mobile/e2e/ui02-phase6a-tablet.yaml'
);

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

test('ICR05C custody verifier: recorded SHAs are 40-char hex and resolve to real Git commits', () => {
  const record = JSON.parse(readFileSync(verificationPath, 'utf8'));
  const shaEntries = [
    ['parentAuthoritySha', record.parentAuthoritySha],
    ['acceptedR4ApplicationCodeSha', record.acceptedR4ApplicationCodeSha],
    ['startingR4EvidenceSha', record.startingR4EvidenceSha],
    ['r5RemediationCommitSha', record.r5RemediationCommitSha],
    ['deployedApplicationCodeSha', record.deployedApplicationCodeSha]
  ];

  for (const [label, sha] of shaEntries) {
    assert.equal(typeof sha, 'string', `${label} must be a string`);
    assert.match(sha, /^[0-9a-f]{40}$/, `${label} must be a full 40-character lowercase hex SHA`);
    const resolved = git('rev-parse', '--verify', `${sha}^{commit}`);
    assert.equal(resolved, sha, `${label} must resolve to an existing commit in Git`);
  }

  // Deployed application code SHA must match accepted R4 application code SHA
  assert.equal(
    record.deployedApplicationCodeSha,
    record.acceptedR4ApplicationCodeSha,
    'Deployed application code SHA must equal accepted R4 application code SHA when runtime source is unchanged'
  );
});

test('ICR05C custody verifier: verifies actual Git ancestry and exact file scope', () => {
  const record = JSON.parse(readFileSync(verificationPath, 'utf8'));
  const parentAuth = record.parentAuthoritySha;
  const r4Code = record.acceptedR4ApplicationCodeSha;
  const r4Evidence = record.startingR4EvidenceSha;
  const r5Code = record.r5RemediationCommitSha;

  // Verify parentAuthoritySha is an ancestor of r4Code
  execFileSync('git', ['merge-base', '--is-ancestor', parentAuth, r4Code], { cwd: repoRoot });

  // Verify direct parent links: r4Code -> r4Evidence -> r5Code
  assert.equal(git('rev-parse', `${r4Evidence}^`), r4Code, 'startingR4EvidenceSha must be direct child of acceptedR4ApplicationCodeSha');
  assert.equal(git('rev-parse', `${r5Code}^`), r4Evidence, 'r5RemediationCommitSha must be direct child of startingR4EvidenceSha');

  // Verify R5 remediation commit modified ONLY apps/mobile/e2e/ui02-phase6a-tablet.yaml
  const r5ChangedFiles = git('diff', '--name-only', r4Evidence, r5Code).split('\n').filter(Boolean);
  assert.deepEqual(
    r5ChangedFiles,
    ['apps/mobile/e2e/ui02-phase6a-tablet.yaml'],
    'R5 remediation commit must modify only apps/mobile/e2e/ui02-phase6a-tablet.yaml'
  );

  // Verify zero application runtime files changed between R4 code SHA and R5 remediation SHA
  const runtimeDiff = git(
    'diff',
    '--name-only',
    r4Code,
    r5Code,
    '--',
    'apps/mobile/app',
    'apps/mobile/src',
    'api',
    'app',
    'lib',
    'supabase'
  );
  assert.equal(runtimeDiff, '', 'Application runtime directories must have zero diff between R4 code SHA and R5 remediation SHA');
});

test('ICR05C custody verifier: verifies actual UI-03 source file authority vs documented classification', () => {
  const record = JSON.parse(readFileSync(verificationPath, 'utf8'));
  const ui03Source = readFileSync(ui03EvidenceScriptPath, 'utf8');
  const tabletFlow = readFileSync(tabletFlowPath, 'utf8');

  // Verify actual UI-03 script queries live Staging Supabase RPC and intercepts WordPress posts
  assert.ok(
    ui03Source.includes('/rest/v1/rpc/ag05_public_story_teaser_document'),
    'UI-03 evidence script must call live Staging RPC ag05_public_story_teaser_document'
  );
  assert.ok(
    ui03Source.includes('page.route("https://healthtimes.co.zw/wp-json/wp/v2/posts**"'),
    'UI-03 evidence script must contain explicit route interception for wp-json/wp/v2/posts'
  );
  assert.equal(
    record.ui03TransparencyClassification?.wordpressPostsInterception,
    'SCOPED_FIXTURE_ISOLATION_EMPTY_ARRAY_NOT_LIVE_WP_API_PROOF'
  );
  assert.equal(
    record.ui03TransparencyClassification?.liveStagingSupabaseRpc,
    'VERIFIED_LIVE_STAGING_RPC_ag05_public_story_teaser_document'
  );

  // Verify tablet flow preserves both initial and post-custom-scheme Top Stories assertions
  const topStoriesMatches = tabletFlow.match(/visible: "Top Stories"/g) ?? [];
  assert.equal(topStoriesMatches.length, 4, 'Tablet flow must preserve all 4 Top Stories visibility assertions');
  assert.ok(tabletFlow.includes('assertNotVisible: "Open in .*HealthTimes Dev.*"'));
});

test('ICR05C custody verifier: verifies exact-head UI-02 native matrix records match tested commit SHA', () => {
  const record = JSON.parse(readFileSync(verificationPath, 'utf8'));
  const matrix = record.ui02ExactHeadMatrix;
  assert.ok(matrix, 'ui02ExactHeadMatrix must be present');
  assert.equal(matrix.testedSha, record.r5RemediationCommitSha, 'UI-02 matrix testedSha must match r5RemediationCommitSha');
  assert.equal(matrix.workflowRunId, 41614064581);
  assert.equal(matrix.aggregateJob.status, 'SUCCESS');
  assert.ok(matrix.aggregateJob.jobId > 0);
  assert.ok(matrix.aggregateJob.artifactId > 0);

  const requiredCells = ['androidPhone', 'androidTablet', 'iosPhone', 'iosTablet'];
  for (const key of requiredCells) {
    const cell = matrix.cells[key];
    assert.ok(cell, `Missing UI-02 matrix cell ${key}`);
    assert.equal(cell.status, 'SUCCESS', `Cell ${key} must be SUCCESS`);
    assert.equal(cell.candidateSha, record.r5RemediationCommitSha, `Cell ${key} candidateSha must match r5RemediationCommitSha`);
    assert.ok(Number.isInteger(cell.jobId) && cell.jobId > 0, `Cell ${key} must have a valid jobId`);
    assert.ok(Number.isInteger(cell.artifactId) && cell.artifactId > 0, `Cell ${key} must have a valid artifactId`);
    assert.equal(cell.nativeRuntimeErrors, 0, `Cell ${key} must have 0 native runtime errors`);
  }
});


test('Phase 10 Android evidence is fail-closed: no Maestro failure fallback or unsupported visual certification flags', () => {
  const runner = readFileSync(join(repoRoot, 'scripts/native/phase10-candidate-android-run.sh'), 'utf8');
  assert.match(runner, /timeout 120s adb wait-for-device/, 'ADB registration must be bounded');
  assert.match(runner, /if \[\[ "\$MAESTRO_EXIT" -ne 0 \]\]; then/, 'Maestro nonzero must be checked');
  assert.match(runner, /exit "\$MAESTRO_EXIT"/, 'Maestro failure must exit nonzero');
  assert.doesNotMatch(runner, /ensure_screenshot|Resilient fallback capture/, 'Fallback screenshots must never substitute for route evidence');
  assert.match(runner, /Missing Maestro screenshot/, 'All three Maestro-produced screenshots are required');
  assert.doesNotMatch(runner, /"resolved": True|"loadingOrErrorSurfaceRemaining": False|"systemDialogRemaining": False/, 'Automated capture must not assert unreviewed visual conditions');
  assert.match(runner, /"independentVisualReviewStatus": "PENDING_NON_AUTHOR_REVIEW"/, 'Automated result must preserve independent review gate');
});

test('Phase 10 Android controlled execution: verified negative-paths fail closed under simulation', () => {
  const res = spawnSync('node', ['--test', join(repoRoot, 'tests/harness/phase10-android-negative-path.test.mjs')], {
    encoding: 'utf8'
  });
  assert.equal(res.status, 0, `Negative path test suite failed:\n${res.stdout}\n${res.stderr}`);
});

