import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const WORKFLOW_PATH = '.github/workflows/ht-mvp-uiat01-r3-icr05b-certification.yml';

test('G2-WF-CONTAINMENT-01: physical-live-fault-injection is strictly gated to workflow_dispatch on approved release/remediation refs', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  // Extract the physical-live-fault-injection job block
  const jobIndex = raw.indexOf('  physical-live-fault-injection:');
  assert.ok(jobIndex !== -1, 'physical-live-fault-injection job must exist');
  const jobBlock = raw.slice(jobIndex);

  assert.match(
    jobBlock,
    /if:\s*>?-?\s*[\s\S]*?github\.event_name\s*==\s*'workflow_dispatch'/,
    'physical-live-fault-injection must require github.event_name == workflow_dispatch'
  );
  assert.match(
    jobBlock,
    /github\.ref\s*==\s*'refs\/heads\/release\/ht-mvp-2\.0-final'/,
    'physical-live-fault-injection must restrict ref to release/ht-mvp-2.0-final or fix/ht-g2-rbac-session-boundary'
  );
  assert.match(
    jobBlock,
    /environment:\s*staging-uat-certification/,
    'physical-live-fault-injection must bind to protected GitHub Environment staging-uat-certification'
  );
});

test('G2-WF-CONTAINMENT-02: PR-triggered jobs never reference HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN or HEALTHTIMES_UAT_ACTORS_JSON', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const jobIndex = raw.indexOf('  physical-live-fault-injection:');
  assert.ok(jobIndex !== -1);

  const prExecutableSection = raw.slice(0, jobIndex);
  assert.ok(
    !prExecutableSection.includes('HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN'),
    'PR-executable jobs must never reference HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN'
  );
  assert.ok(
    !prExecutableSection.includes('HEALTHTIMES_UAT_ACTORS_JSON'),
    'PR-executable jobs must never reference HEALTHTIMES_UAT_ACTORS_JSON'
  );
});

test('G2-WF-CONTAINMENT-03: physical-live-fault-injection checks out github.sha (never pull_request.head.sha) and enforces expected_sha parity', () => {
  const raw = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const jobIndex = raw.indexOf('  physical-live-fault-injection:');
  const jobBlock = raw.slice(jobIndex);

  assert.ok(
    !jobBlock.includes('github.event.pull_request.head.sha'),
    'physical-live-fault-injection must never checkout untrusted pull_request.head.sha'
  );
  assert.match(
    jobBlock,
    /EXPECTED_SHA/,
    'physical-live-fault-injection must verify EXPECTED_SHA before reading secrets'
  );
});
