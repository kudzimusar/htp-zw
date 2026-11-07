import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const WORKFLOW_PATH = '.github/workflows/ht-mvp-uiat01-r3-icr05b-certification.yml';
const ALLOWLIST_PATH = 'docs/delivery/ht-g2-approved-uat-source-allowlist.json';
const EXECUTOR_PATH = 'scripts/release/run-protected-staging-uat.mjs';

test('G2-WF-CONTAINMENT-01: physical-live-fault-injection is strictly gated to workflow_dispatch on approved release/remediation refs', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  const jobIndex = raw.indexOf('  physical-live-fault-injection:');
  assert.ok(jobIndex !== -1, 'physical-live-fault-injection job must exist');
  const jobBlock = raw.slice(jobIndex);

  assert.match(
    jobBlock,
    /if:\s*>?-?\s*[\s\S]*?github\.event_name\s*==\s*'workflow_dispatch'/,
    'physical-live-fault-injection must require github.event_name == workflow_dispatch',
  );
  assert.match(
    jobBlock,
    /github\.ref\s*==\s*'refs\/heads\/release\/ht-mvp-2\.0-final'/,
    'physical-live-fault-injection must restrict ref to release/ht-mvp-2.0-final or fix/ht-g2-rbac-session-boundary',
  );
  assert.match(
    jobBlock,
    /environment:\s*staging-uat-certification/,
    'physical-live-fault-injection must bind to protected GitHub Environment staging-uat-certification',
  );
});

test('G2-WF-CONTAINMENT-02: PR-triggered jobs never reference HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN or HEALTHTIMES_UAT_ACTORS_JSON', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const jobIndex = raw.indexOf('  physical-live-fault-injection:');
  assert.ok(jobIndex !== -1);

  const prExecutableSection = raw.slice(0, jobIndex);
  assert.ok(
    !prExecutableSection.includes('HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN'),
    'PR-executable jobs must never reference HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN',
  );
  assert.ok(
    !prExecutableSection.includes('HEALTHTIMES_UAT_ACTORS_JSON'),
    'PR-executable jobs must never reference HEALTHTIMES_UAT_ACTORS_JSON',
  );
});

test('G2-WF-CONTAINMENT-03: physical-live-fault-injection checks out github.sha (never pull_request.head.sha) and enforces allowlist-bound runner before reading secrets', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const jobIndex = raw.indexOf('  physical-live-fault-injection:');
  const jobBlock = raw.slice(jobIndex);

  assert.ok(
    !jobBlock.includes('github.event.pull_request.head.sha'),
    'physical-live-fault-injection must never checkout untrusted pull_request.head.sha',
  );
  assert.match(
    jobBlock,
    /EXPECTED_SHA/,
    'physical-live-fault-injection must verify EXPECTED_SHA before reading secrets',
  );
  assert.match(
    jobBlock,
    /run-protected-staging-uat\.mjs/,
    'physical-live-fault-injection must invoke scripts/release/run-protected-staging-uat.mjs to enforce the repository-committed allowlist',
  );
});

test('G2-WF-CONTAINMENT-04: Approved UAT Source Allowlist pins exact SHA-256 digests of the two real G2 migrations, frozen production manifest, and UAT harness', () => {
  assert.ok(fs.existsSync(ALLOWLIST_PATH), `${ALLOWLIST_PATH} must exist`);
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

  assert.equal(
    allowlist.frozenG1BaseSha,
    '1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5',
    'Allowlist must bind to frozen G1 base SHA',
  );
  assert.equal(
    allowlist.defaultBranchWorkflowStatus.workflowFileOnDefaultBranch,
    false,
    'Allowlist must accurately record that workflow is not on default branch main prior to merge',
  );
  assert.equal(
    allowlist.stagingProject.orderedGate2Migrations.length,
    2,
    'Exactly two real Gate 2 SQL migrations exist (20261102160000 and 20261107130000)',
  );

  for (const [relPath, expectedDigest] of Object.entries(allowlist.requiredArtifactDigests)) {
    const actualDigest = crypto
      .createHash('sha256')
      .update(fs.readFileSync(relPath))
      .digest('hex');
    assert.equal(
      actualDigest,
      expectedDigest,
      `SHA-256 mismatch for ${relPath}: got ${actualDigest}, expected ${expectedDigest}`,
    );
  }
});

test('G2-WF-CONTAINMENT-05: Attested UAT executor fails closed (exit 78) in --mode live until Independent Security Review and Owner authorization are granted', () => {
  const res = spawnSync(
    process.execPath,
    [EXECUTOR_PATH, '--mode', 'live', '--output', '/tmp/ht-g2-containment-test-attestation.json'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        HT_G2_UNIT_TEST_ALLOW_DIRTY: '1',
        HT_G2_SECURITY_DECISION: '',
        HT_G2_OWNER_AUTHORIZATION: '',
        UAT_ACTORS_JSON: '',
        SUPABASE_ACCESS_TOKEN: '',
      },
    },
  );
  assert.equal(
    res.status,
    78,
    `Expected exit code 78 when Security/Owner approvals are pending, got ${res.status} (${res.stderr})`,
  );
  assert.match(
    res.stderr,
    /BLOCKED_INDEPENDENT_SECURITY_REVIEW/,
    'Must fail closed on missing Independent Security Reviewer certification first',
  );
});
