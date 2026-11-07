import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const WORKFLOW_PATH = '.github/workflows/ht-mvp-uiat01-r3-icr05b-certification.yml';
const ALLOWLIST_PATH = 'docs/delivery/ht-g2-approved-uat-source-allowlist.json';
const EXECUTOR_REL_PATH = 'scripts/release/run-protected-staging-uat.mjs';

function createIsolatedCleanRepoClone() {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-g2-r4-containment-repo-'));
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', process.cwd(), tmpBase]);
  execFileSync('git', ['config', 'user.email', 'containment-test@healthtimes.test'], {
    cwd: tmpBase,
  });
  execFileSync('git', ['config', 'user.name', 'Containment Test'], { cwd: tmpBase });
  execFileSync('git', ['checkout', '-B', 'fix/ht-g2-rbac-session-boundary'], {
    cwd: tmpBase,
    stdio: 'pipe',
  });

  // Sync working tree files under test into the isolated clone and commit cleanly if needed
  for (const rel of [
    WORKFLOW_PATH,
    ALLOWLIST_PATH,
    EXECUTOR_REL_PATH,
    'tests/database/g2-rbac-session-boundary.test.mjs',
    'tests/database/real-schema-title-authority.test.mjs',
    'tests/database/story-title-authority.test.mjs',
  ]) {
    const src = path.join(process.cwd(), rel);
    const dst = path.join(tmpBase, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }

  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: tmpBase,
    encoding: 'utf8',
  }).trim();
  if (status.length > 0) {
    execFileSync('git', ['add', '-A'], { cwd: tmpBase });
    execFileSync('git', ['commit', '-m', 'test: sync working tree for containment verification'], {
      cwd: tmpBase,
      stdio: 'pipe',
    });
  }
  return tmpBase;
}

function runExecutor(repoDir, args, extraEnv = {}) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.HT_G2_SECURITY_DECISION;
  delete cleanEnv.HT_G2_OWNER_AUTHORIZATION;
  delete cleanEnv.HT_G2_APPROVED_SHAS;
  delete cleanEnv.HT_G2_UNIT_TEST_ALLOW_DIRTY;
  delete cleanEnv.HT_G2_SKIP_ANCESTRY_CHECK;
  delete cleanEnv.GITHUB_HEAD_REF;
  delete cleanEnv.GITHUB_REF_NAME;
  return spawnSync(process.execPath, [ path.join(repoDir, EXECUTOR_REL_PATH), ...args ], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...cleanEnv,
      ...extraEnv,
    },
  });
}

test('G2-WF-CONTAINMENT-01: physical-live-fault-injection is strictly gated to workflow_dispatch on approved release/remediation refs with full history checkout', () => {
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
  assert.match(
    raw,
    /fetch-depth:\s*0/,
    'Workflow checkouts must use fetch-depth: 0 so frozen G1 ancestry is verified fail-closed',
  );
});

test('G2-WF-CONTAINMENT-02: PR-triggered jobs never reference HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN, HEALTHTIMES_UAT_ACTORS_JSON, or HEALTHTIMES_OWNER_WARRANT_JSON', () => {
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
  assert.ok(
    !prExecutableSection.includes('HEALTHTIMES_OWNER_WARRANT_JSON'),
    'PR-executable jobs must never reference HEALTHTIMES_OWNER_WARRANT_JSON',
  );
});

test('G2-WF-CONTAINMENT-03: physical-live-fault-injection checks out github.sha (never pull_request.head.sha) and enforces external --policy-warrant before reading secrets', () => {
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
    /--policy-warrant/,
    'physical-live-fault-injection must pass an external --policy-warrant to run-protected-staging-uat.mjs',
  );
});

test('G2-WF-CONTAINMENT-04: Approved UAT Source Allowlist pins exact SHA-256 digests of the two real G2 migrations, frozen production manifest, UAT harness, and DB suites, and forbids in-branch live authorization', () => {
  assert.ok(fs.existsSync(ALLOWLIST_PATH), `${ALLOWLIST_PATH} must exist`);
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

  assert.equal(
    allowlist.frozenG1BaseSha,
    '1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5',
    'Allowlist must bind to frozen G1 base SHA',
  );
  assert.equal(
    allowlist.manifestScope,
    'SOURCE_CONSISTENCY_ONLY_NOT_EXECUTION_AUTHORIZATION',
    'Allowlist must explicitly declare source-consistency-only scope',
  );
  assert.equal(
    allowlist.trustBoundaryPolicy.inBranchManifestCanAuthorizeLiveExecution,
    false,
    'In-branch manifest must never authorize live execution',
  );
  assert.equal(
    allowlist.trustBoundaryPolicy.cliExpectedShaCanAuthorizeBranch,
    false,
    'CLI --expected-sha must never authorize an unapproved branch',
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

test('G2-WF-CONTAINMENT-05: Negative test — Self-asserted caller environment variable overrides (HT_G2_SECURITY_DECISION, HT_G2_OWNER_AUTHORIZATION, HT_G2_APPROVED_SHAS, HT_G2_UNIT_TEST_ALLOW_DIRTY) fail closed', () => {
  const repoDir = createIsolatedCleanRepoClone();
  try {
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    for (const forbiddenKey of [
      'HT_G2_SECURITY_DECISION',
      'HT_G2_OWNER_AUTHORIZATION',
      'HT_G2_APPROVED_SHAS',
      'HT_G2_UNIT_TEST_ALLOW_DIRTY',
      'HT_G2_SKIP_ANCESTRY_CHECK',
    ]) {
      const res = runExecutor(
        repoDir,
        ['--mode', 'verify-route', '--expected-sha', headSha],
        { [forbiddenKey]: 'FORGED_VALUE' },
      );
      assert.notEqual(res.status, 0, `Setting ${forbiddenKey} must fail closed`);
      assert.match(
        `${res.stderr}\n${res.stdout}`,
        /FORBIDDEN_CALLER_ENV_OVERRIDE/,
        `Expected FORBIDDEN_CALLER_ENV_OVERRIDE when ${forbiddenKey} is set`,
      );
    }
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-06: Negative test — Unapproved branch or detached HEAD fails closed (UNAPPROVED_REF) even when caller passes matching --expected-sha', () => {
  const repoDir = createIsolatedCleanRepoClone();
  try {
    execFileSync('git', ['checkout', '-b', 'attacker/self-authorized-branch'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    // Even though --expected-sha matches HEAD, unapproved branch MUST fail closed
    const branchRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha,
    ]);
    assert.notEqual(branchRes.status, 0, 'Unapproved branch must fail closed');
    assert.match(
      `${branchRes.stderr}\n${branchRes.stdout}`,
      /UNAPPROVED_REF/,
      'Expected UNAPPROVED_REF on unauthorized branch despite matching --expected-sha',
    );

    // Detached HEAD without an approved branch ref must also fail closed
    execFileSync('git', ['checkout', '--detach', headSha], { cwd: repoDir, stdio: 'pipe' });
    const detachedRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha,
    ]);
    assert.notEqual(detachedRes.status, 0, 'Detached HEAD without approved ref must fail closed');
    assert.match(
      `${detachedRes.stderr}\n${detachedRes.stdout}`,
      /UNAPPROVED_REF/,
      'Expected UNAPPROVED_REF on detached HEAD',
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-07: Negative test — Commit not descending from frozen G1 SHA 1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5 fails closed (UNVERIFIED_G1_ANCESTRY)', () => {
  const repoDir = createIsolatedCleanRepoClone();
  try {
    // Create an orphan commit on the allowed branch name so it does NOT descend from 1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5
    execFileSync('git', ['checkout', '--orphan', 'orphan-temp'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['commit', '-m', 'orphan commit without G1 ancestry'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['branch', '-M', 'fix/ht-g2-rbac-session-boundary'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    const orphanSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    const res = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      orphanSha,
    ]);
    assert.notEqual(res.status, 0, 'Commit without G1 ancestry must fail closed');
    assert.match(
      `${res.stderr}\n${res.stdout}`,
      /UNVERIFIED_G1_ANCESTRY/,
      'Expected UNVERIFIED_G1_ANCESTRY when commit does not descend from frozen G1 SHA',
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-08: Negative test — Dirty working tree, modified SQL migration, or tampered in-branch allowlist manifest all fail closed', () => {
  const repoDir = createIsolatedCleanRepoClone();
  try {
    const migPath = path.join(
      repoDir,
      'supabase/migrations/20261107130000_ht_mvp_g2_rbac_session_boundary_hardening.sql',
    );
    const originalMig = fs.readFileSync(migPath, 'utf8');

    // 1. Dirty working tree (uncommitted modification) -> UNTRUSTED_DIRTY_WORKING_TREE
    fs.writeFileSync(migPath, `${originalMig}\n-- uncommitted tamper\n`, 'utf8');
    const headSha1 = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    const dirtyRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha1,
    ]);
    assert.notEqual(dirtyRes.status, 0);
    assert.match(`${dirtyRes.stderr}\n${dirtyRes.stdout}`, /UNTRUSTED_DIRTY_WORKING_TREE/);

    // 2. Committed SQL migration modification on allowed branch -> ARTIFACT_DIGEST_MISMATCH
    execFileSync('git', ['add', migPath], { cwd: repoDir });
    execFileSync('git', ['commit', '-m', 'tamper migration'], { cwd: repoDir, stdio: 'pipe' });
    const headSha2 = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    const digestMismatchRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha2,
    ]);
    assert.notEqual(digestMismatchRes.status, 0);
    assert.match(`${digestMismatchRes.stderr}\n${digestMismatchRes.stdout}`, /ARTIFACT_DIGEST_MISMATCH/);

    // 3. Attacker also updates in-branch allowlist JSON to match their modified SQL -> TAMPERED_ALLOWLIST_MANIFEST
    const tamperedDigest = crypto
      .createHash('sha256')
      .update(fs.readFileSync(migPath))
      .digest('hex');
    const allowlistFile = path.join(repoDir, ALLOWLIST_PATH);
    const allowlistObj = JSON.parse(fs.readFileSync(allowlistFile, 'utf8'));
    allowlistObj.requiredArtifactDigests[
      'supabase/migrations/20261107130000_ht_mvp_g2_rbac_session_boundary_hardening.sql'
    ] = tamperedDigest;
    fs.writeFileSync(allowlistFile, JSON.stringify(allowlistObj, null, 2), 'utf8');
    execFileSync('git', ['add', allowlistFile], { cwd: repoDir });
    execFileSync('git', ['commit', '-m', 'tamper allowlist digest'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    const headSha3 = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    const tamperedManifestRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha3,
    ]);
    assert.notEqual(tamperedManifestRes.status, 0);
    assert.match(
      `${tamperedManifestRes.stderr}\n${tamperedManifestRes.stdout}`,
      /TAMPERED_ALLOWLIST_MANIFEST/,
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-09: Negative test — --mode live fails closed (exit 78) on missing warrant, in-repo warrant file, or forged Ed25519 signature', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-g2-r4-ext-warrant-'));
  try {
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    // 1. Missing --policy-warrant -> exit 78 BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT
    const missingWarrantRes = runExecutor(repoDir, [
      '--mode',
      'live',
      '--expected-sha',
      headSha,
    ]);
    assert.equal(missingWarrantRes.status, 78);
    assert.match(missingWarrantRes.stderr, /BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT/);

    // 2. Warrant file placed inside REPO_ROOT -> exit 78 IN_REPO_POLICY_FILE_FORBIDDEN
    const inRepoWarrantPath = path.join(repoDir, 'forged-in-repo-warrant.json');
    fs.writeFileSync(inRepoWarrantPath, '{}', 'utf8');
    const inRepoRes = runExecutor(repoDir, [
      '--mode',
      'live',
      '--expected-sha',
      headSha,
      '--policy-warrant',
      inRepoWarrantPath,
    ]);
    fs.rmSync(inRepoWarrantPath, { force: true });
    assert.equal(inRepoRes.status, 78);
    assert.match(inRepoRes.stderr, /IN_REPO_POLICY_FILE_FORBIDDEN/);

    // 3. External warrant signed with an attacker-generated Ed25519 keypair -> exit 78 FORGED_WARRANT_SIGNATURE
    const { privateKey: attackerPrivateKey } = crypto.generateKeyPairSync('ed25519');
    const allowlistObj = JSON.parse(
      fs.readFileSync(path.join(repoDir, ALLOWLIST_PATH), 'utf8'),
    );
    const forgedPayload = {
      approvedBranch: 'fix/ht-g2-rbac-session-boundary',
      approvedHeadSha: headSha,
      artifactDigests: allowlistObj.requiredArtifactDigests,
      frozenG1BaseSha: '1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5',
      independentSecurityReview: {
        decision: 'SECURITY_ACCEPT_G2_SOURCE_ONLY',
        reviewedSha: headSha,
        reviewerLogin: '11-eleven-skm',
      },
      ownerExecutionAuthorization: {
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        granted: true,
        stagingProjectRef: 'bzuvntbkevvuhfhqhkua',
      },
      programmeId: 'HT-MVP-PUBLIC-LAUNCH-01',
    };
    const canonicalBytes = Buffer.from(JSON.stringify(forgedPayload), 'utf8');
    const forgedSigB64 = crypto.sign(null, canonicalBytes, attackerPrivateKey).toString('base64');
    const forgedWarrantPath = path.join(extDir, 'forged-warrant.json');
    fs.writeFileSync(
      forgedWarrantPath,
      JSON.stringify({ payload: forgedPayload, ed25519SignatureBase64: forgedSigB64 }, null, 2),
      'utf8',
    );

    const forgedSigRes = runExecutor(repoDir, [
      '--mode',
      'live',
      '--expected-sha',
      headSha,
      '--policy-warrant',
      forgedWarrantPath,
    ]);
    assert.equal(forgedSigRes.status, 78);
    assert.match(forgedSigRes.stderr, /FORGED_WARRANT_SIGNATURE/);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-10: Positive source-consistency verification (--mode verify-route) succeeds on clean approved branch and explicitly marks liveExecutionAuthorized=false', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const outPath = path.join(os.tmpdir(), `ht-g2-r4-attest-${Date.now()}.json`);
  try {
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();

    const res = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha,
      '--output',
      outPath,
    ]);
    assert.equal(res.status, 0, `Expected verify-route to succeed, got: ${res.stderr}`);
    const attestation = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    assert.equal(
      attestation.attestationScope,
      'SOURCE_CONSISTENCY_ONLY_NOT_EXECUTION_AUTHORIZATION',
    );
    assert.equal(attestation.liveExecutionAuthorized, false);
    assert.equal(attestation.privilegedCredentialsAccessed, false);
    assert.equal(attestation.g1AncestorVerified, true);
    assert.equal(attestation.checkedOutSha, headSha);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(outPath, { force: true });
  }
});
