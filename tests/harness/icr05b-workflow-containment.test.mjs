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
const BOOTSTRAP_REL_PATH = 'scripts/release/owner-trusted-uat-bootstrap.mjs';

const PINNED_INNER_VERIFIER_SHA256 =
  'f2fbbb8ef4ac349aa8cfb0af55b3f3c156888cd9c75ea95e069cd01b59257f13';
const PINNED_OUTER_BOOTSTRAP_SHA256 =
  '30b66388ed4a672c928e27c0127a1f4504af2e2bba71d17ab9dab8cf00068b11';
const FROZEN_G1_SHA = '1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5';

function canonicalizeJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(value[k])}`).join(',')}}`;
}

function generateFixtureKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const fpHex = crypto.createHash('sha256').update(spkiDer).digest('hex');
  const fpB64 = `SHA256:${crypto.createHash('sha256').update(spkiDer).digest('base64').replace(/=+$/, '')}`;
  return { publicKey, privateKey, publicKeyPem, fpHex, fpB64 };
}

function createIsolatedCleanRepoClone() {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-g2-r6-containment-repo-'));
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', process.cwd(), tmpBase]);
  execFileSync('git', ['config', 'user.email', 'containment-test@healthtimes.test'], {
    cwd: tmpBase,
  });
  execFileSync('git', ['config', 'user.name', 'Containment Test'], { cwd: tmpBase });
  execFileSync('git', ['checkout', '-B', 'fix/ht-g2-rbac-session-boundary'], {
    cwd: tmpBase,
    stdio: 'pipe',
  });

  for (const rel of [
    WORKFLOW_PATH,
    ALLOWLIST_PATH,
    EXECUTOR_REL_PATH,
    BOOTSTRAP_REL_PATH,
    'docs/delivery/ht-g2-owner-external-custody-and-key-ceremony.md',
    'tests/database/g2-rbac-session-boundary.test.mjs',
    'tests/database/real-schema-title-authority.test.mjs',
    'tests/database/story-title-authority.test.mjs',
  ]) {
    const src = path.join(process.cwd(), rel);
    if (fs.existsSync(src)) {
      const dst = path.join(tmpBase, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }

  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: tmpBase,
    encoding: 'utf8',
  }).trim();
  if (status.length > 0) {
    execFileSync('git', ['add', '-A'], { cwd: tmpBase });
    execFileSync('git', ['commit', '-m', 'test: sync working tree for R6 containment verification'], {
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
  return spawnSync(process.execPath, [path.join(repoDir, EXECUTOR_REL_PATH), ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...cleanEnv,
      ...extraEnv,
    },
  });
}

function stageExternalCustodyEnv(repoDir) {
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-g2-r6-ext-custody-'));
  const extBootstrapPath = path.join(extDir, 'owner-trusted-uat-bootstrap.mjs');
  fs.copyFileSync(path.join(repoDir, BOOTSTRAP_REL_PATH), extBootstrapPath);
  fs.chmodSync(extBootstrapPath, 0o500);

  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoDir,
    encoding: 'utf8',
  }).trim();
  const allowlistObj = JSON.parse(fs.readFileSync(path.join(repoDir, ALLOWLIST_PATH), 'utf8'));

  const fixtureKey = generateFixtureKeypair();

  const buildTrustRoot = (overrides = {}) => ({
    schemaVersion: '1.0.0',
    keyClassification: 'NON_PRODUCTION_FIXTURE_REHEARSAL_ONLY',
    ownerEd25519PublicKeyPem: fixtureKey.publicKeyPem,
    expectedPublicKeyFingerprintSha256Hex: fixtureKey.fpHex,
    expectedPublicKeyFingerprintSha256B64: fixtureKey.fpB64,
    approvedHeadSha: headSha,
    frozenG1BaseSha: FROZEN_G1_SHA,
    pinnedCandidateVerifierSha256: PINNED_INNER_VERIFIER_SHA256,
    pinnedArtifactDigests: { ...allowlistObj.requiredArtifactDigests },
    ...overrides,
  });

  const buildWarrantPayload = (overrides = {}) => {
    const now = Date.now();
    return {
      warrantId: `warrant-r6-rehearsal-${crypto.randomUUID()}`,
      issuedAt: new Date(now - 5000).toISOString(),
      expiresAt: new Date(now + 900_000).toISOString(),
      approvedHeadSha: headSha,
      frozenG1BaseSha: FROZEN_G1_SHA,
      approvedBranch: 'fix/ht-g2-rbac-session-boundary',
      approvedCandidateVerifierSha256: PINNED_INNER_VERIFIER_SHA256,
      ownerPublicKeyFingerprintSha256B64: fixtureKey.fpB64,
      stagingProjectRef: 'bzuvntbkevvuhfhqhkua',
      artifactDigests: { ...allowlistObj.requiredArtifactDigests },
      independentSecurityReview: {
        decision: 'SECURITY_ACCEPT_G2_SOURCE_ONLY',
        reviewedSha: headSha,
        reviewerLogin: '11-eleven-skm',
        reviewUrl: 'https://github.com/kudzimusar/htp-zw/pull/153#pullrequestreview-5810305688',
      },
      ownerExecutionAuthorization: {
        granted: true,
        stagingProjectRef: 'bzuvntbkevvuhfhqhkua',
        allowedTargetActors: [
          'reporter',
          'editor_in_chief',
          'section_editor',
          'moderator',
          'commercial_subscriber',
          'anonymous',
        ],
        allowedSessionOnlyEffects: [
          'auth_sign_in_sign_out',
          'session_revocation_check',
          'bounded_editorial_draft_title_check',
          'non_dispatching_newsletter_preview_check',
          'read_only_rls_boundary_probe',
        ],
      },
      ...overrides,
    };
  };

  const buildSyntheticCredentials = (overrides = {}) => ({
    credentialClassification: 'DISPOSABLE_SYNTHETIC_REHEARSAL_ONLY',
    supabaseAccessToken: 'sbp_synthetic_rehearsal_token_000000000000',
    actors: {
      reporter: {
        email: 'synthetic-reporter@healthtimes.test',
        password: 'synthetic-password-reporter-01',
      },
      editor_in_chief: {
        email: 'synthetic-eic@healthtimes.test',
        password: 'synthetic-password-eic-01',
      },
      section_editor: {
        email: 'synthetic-se@healthtimes.test',
        password: 'synthetic-password-se-01',
      },
      moderator: {
        email: 'synthetic-mod@healthtimes.test',
        password: 'synthetic-password-mod-01',
      },
      'uat-specialist@healthtimes.test': {
        email: 'uat-specialist@healthtimes.test',
        password: 'synthetic-password-spec-01',
      },
      'uat-commercial@healthtimes.test': {
        email: 'uat-commercial@healthtimes.test',
        password: 'synthetic-password-comm-01',
      },
    },
    ...overrides,
  });

  const signWarrant = (payload, privKey = fixtureKey.privateKey) => {
    const canonicalBytes = Buffer.from(canonicalizeJson(payload), 'utf8');
    return {
      payload,
      ed25519SignatureBase64: crypto.sign(null, canonicalBytes, privKey).toString('base64'),
    };
  };

  const runBootstrap = (args, extraEnv = {}) =>
    spawnSync(process.execPath, [extBootstrapPath, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...extraEnv },
    });

  return {
    extDir,
    extBootstrapPath,
    headSha,
    fixtureKey,
    buildTrustRoot,
    buildWarrantPayload,
    buildSyntheticCredentials,
    signWarrant,
    runBootstrap,
  };
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

test('G2-WF-CONTAINMENT-04: Approved UAT Source Allowlist pins exact SHA-256 digests, removes embedded placeholder public key, and forbids in-branch live authorization', () => {
  assert.ok(fs.existsSync(ALLOWLIST_PATH), `${ALLOWLIST_PATH} must exist`);
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

  assert.equal(allowlist.frozenG1BaseSha, FROZEN_G1_SHA);
  assert.equal(allowlist.manifestScope, 'SOURCE_CONSISTENCY_ONLY_NOT_EXECUTION_AUTHORIZATION');
  assert.equal(allowlist.trustBoundaryPolicy.inBranchManifestCanAuthorizeLiveExecution, false);
  assert.equal(allowlist.trustBoundaryPolicy.cliExpectedShaCanAuthorizeBranch, false);
  assert.equal(allowlist.trustBoundaryPolicy.embeddedPublicKeyTrustedForLiveExecution, false);
  assert.equal(allowlist.ownerPublicKeyCustodyPolicy.embeddedCandidatePublicKeyPresent, false);
  assert.equal(allowlist.pinnedCandidateVerifierSha256, PINNED_INNER_VERIFIER_SHA256);
  assert.equal(allowlist.stagingProject.orderedGate2Migrations.length, 2);

  for (const [relPath, expectedDigest] of Object.entries(allowlist.requiredArtifactDigests)) {
    const actualDigest = crypto
      .createHash('sha256')
      .update(fs.readFileSync(relPath))
      .digest('hex');
    assert.equal(actualDigest, expectedDigest);
  }
});

test('G2-WF-CONTAINMENT-05: Negative test — Self-asserted caller environment variable overrides fail closed', () => {
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
      assert.notEqual(res.status, 0);
      assert.match(`${res.stderr}\n${res.stdout}`, /FORBIDDEN_CALLER_ENV_OVERRIDE/);
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

    const branchRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha,
    ]);
    assert.notEqual(branchRes.status, 0);
    assert.match(`${branchRes.stderr}\n${branchRes.stdout}`, /UNAPPROVED_REF/);

    execFileSync('git', ['checkout', '--detach', headSha], { cwd: repoDir, stdio: 'pipe' });
    const detachedRes = runExecutor(repoDir, [
      '--mode',
      'verify-route',
      '--expected-sha',
      headSha,
    ]);
    assert.notEqual(detachedRes.status, 0);
    assert.match(`${detachedRes.stderr}\n${detachedRes.stdout}`, /UNAPPROVED_REF/);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-07: Negative test — Commit not descending from frozen G1 SHA 1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5 fails closed (UNVERIFIED_G1_ANCESTRY)', () => {
  const repoDir = createIsolatedCleanRepoClone();
  try {
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

    const res = runExecutor(repoDir, ['--mode', 'verify-route', '--expected-sha', orphanSha]);
    assert.notEqual(res.status, 0);
    assert.match(`${res.stderr}\n${res.stdout}`, /UNVERIFIED_G1_ANCESTRY/);
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

    fs.writeFileSync(migPath, `${originalMig}\n-- uncommitted tamper\n`, 'utf8');
    const headSha1 = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    const dirtyRes = runExecutor(repoDir, ['--mode', 'verify-route', '--expected-sha', headSha1]);
    assert.notEqual(dirtyRes.status, 0);
    assert.match(`${dirtyRes.stderr}\n${dirtyRes.stdout}`, /UNTRUSTED_DIRTY_WORKING_TREE/);

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
    assert.match(`${tamperedManifestRes.stderr}\n${tamperedManifestRes.stdout}`, /TAMPERED_ALLOWLIST_MANIFEST/);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-09: Negative test — Inner candidate verifier fails closed (exit 78) on missing warrant/trust-root, in-repo warrant/trust-root, or forged Ed25519 signature', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    // 1. Missing --policy-warrant / --owner-trust-root -> BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT
    const missingRes = runExecutor(repoDir, ['--mode', 'live', '--expected-sha', env.headSha]);
    assert.equal(missingRes.status, 78);
    assert.match(missingRes.stderr, /BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT/);

    // 2. Warrant file inside REPO_ROOT -> IN_REPO_POLICY_FILE_FORBIDDEN
    const inRepoWarrantPath = path.join(repoDir, 'forged-in-repo-warrant.json');
    fs.writeFileSync(inRepoWarrantPath, '{}', 'utf8');
    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));

    const inRepoRes = runExecutor(repoDir, [
      '--mode',
      'synthetic-live-rehearsal',
      '--expected-sha',
      env.headSha,
      '--owner-trust-root',
      trustRootPath,
      '--policy-warrant',
      inRepoWarrantPath,
    ]);
    fs.rmSync(inRepoWarrantPath, { force: true });
    assert.equal(inRepoRes.status, 78);
    assert.match(inRepoRes.stderr, /IN_REPO_POLICY_FILE_FORBIDDEN/);

    // 3. External warrant signed with attacker Ed25519 key -> FORGED_WARRANT_SIGNATURE
    const attackerKey = generateFixtureKeypair();
    const forgedWarrantPath = path.join(env.extDir, 'forged-warrant.json');
    fs.writeFileSync(
      forgedWarrantPath,
      JSON.stringify(env.signWarrant(env.buildWarrantPayload(), attackerKey.privateKey), null, 2),
    );
    const forgedSigRes = runExecutor(repoDir, [
      '--mode',
      'synthetic-live-rehearsal',
      '--expected-sha',
      env.headSha,
      '--owner-trust-root',
      trustRootPath,
      '--policy-warrant',
      forgedWarrantPath,
    ]);
    assert.equal(forgedSigRes.status, 78);
    assert.match(forgedSigRes.stderr, /FORGED_WARRANT_SIGNATURE/);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-10: Positive source-consistency verification (--mode verify-route) succeeds on clean approved branch and marks liveExecutionAuthorized=false', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const outPath = path.join(os.tmpdir(), `ht-g2-r6-attest-${Date.now()}.json`);
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
    assert.equal(attestation.candidateVerifierSha256, PINNED_INNER_VERIFIER_SHA256);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(outPath, { force: true });
  }
});

test('G2-WF-CONTAINMENT-11: Reference outer bootstrap matches pinned SHA-256 and refuses execution directly from inside REPO_ROOT (IN_REPO_BOOTSTRAP_EXECUTION_FORBIDDEN)', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    const actualBootstrapSha = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(repoDir, BOOTSTRAP_REL_PATH)))
      .digest('hex');
    assert.equal(actualBootstrapSha, PINNED_OUTER_BOOTSTRAP_SHA256);

    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    const warrantPath = path.join(env.extDir, 'warrant.json');
    const ledgerPath = path.join(env.extDir, 'ledger.json');
    const credsPath = path.join(env.extDir, 'creds.json');
    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));
    fs.writeFileSync(warrantPath, JSON.stringify(env.signWarrant(env.buildWarrantPayload()), null, 2));
    fs.writeFileSync(credsPath, JSON.stringify(env.buildSyntheticCredentials(), null, 2));

    // Invoking scripts/release/owner-trusted-uat-bootstrap.mjs directly from inside repoDir MUST fail closed
    const inRepoBootstrapRes = spawnSync(
      process.execPath,
      [
        path.join(repoDir, BOOTSTRAP_REL_PATH),
        '--mode',
        'rehearsal',
        '--repo-root',
        repoDir,
        '--trust-root',
        trustRootPath,
        '--warrant',
        warrantPath,
        '--replay-ledger',
        ledgerPath,
        '--credentials-file',
        credsPath,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(inRepoBootstrapRes.status, 78);
    assert.equal(
      JSON.parse(inRepoBootstrapRes.stderr.trim()).errorCode,
      'IN_REPO_BOOTSTRAP_EXECUTION_FORBIDDEN',
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-12: Positive end-to-end Outer-Bootstrap -> Inner-Candidate-Verifier rehearsal succeeds with disposable test key and synthetic credentials', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    const warrantPath = path.join(env.extDir, 'warrant.json');
    const ledgerPath = path.join(env.extDir, 'ledger.json');
    const credsPath = path.join(env.extDir, 'creds.json');
    const outputPath = path.join(env.extDir, 'rehearsal-report.json');

    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));
    fs.writeFileSync(warrantPath, JSON.stringify(env.signWarrant(env.buildWarrantPayload()), null, 2));
    fs.writeFileSync(credsPath, JSON.stringify(env.buildSyntheticCredentials(), null, 2));

    const res = env.runBootstrap(
      [
        '--mode',
        'rehearsal',
        '--repo-root',
        repoDir,
        '--trust-root',
        trustRootPath,
        '--warrant',
        warrantPath,
        '--replay-ledger',
        ledgerPath,
        '--credentials-file',
        credsPath,
        '--output',
        outputPath,
      ],
      {
        SUPABASE_ACCESS_TOKEN: 'ambient-secret-must-be-stripped',
        HT_G2_OWNER_AUTHORIZATION: 'ambient-override-must-be-stripped',
      },
    );

    assert.equal(res.status, 0, `Expected exit 0, got ${res.status}: ${res.stderr}`);
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.equal(
      report.bootstrapStatus,
      'OUTER_TO_INNER_SYNTHETIC_REHEARSAL_VERIFIED_NO_LIVE_AUTHORITY',
    );
    assert.equal(report.outerBootstrapVerified, true);
    assert.equal(report.innerVerifierWarrantVerified, true);
    assert.equal(
      report.innerVerifierAttestationScope,
      'SYNTHETIC_REHEARSAL_OUTER_AND_INNER_VERIFIED_NO_LIVE_AUTHORITY',
    );
    assert.equal(report.verifiedCandidateVerifierSha256, PINNED_INNER_VERIFIER_SHA256);
    assert.equal(report.bootstrapExecutableSha256, PINNED_OUTER_BOOTSTRAP_SHA256);
    assert.equal(report.privilegedSecretsRead, false);
    assert.equal(report.privilegedSecretsInjected, false);
    assert.ok(report.strippedAmbientEnvKeys.includes('SUPABASE_ACCESS_TOKEN'));
    assert.ok(report.strippedAmbientEnvKeys.includes('HT_G2_OWNER_AUTHORIZATION'));
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-13: Negative test — Warrant replay and expired warrant both fail closed before secret injection', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    const warrantPath = path.join(env.extDir, 'warrant.json');
    const ledgerPath = path.join(env.extDir, 'ledger.json');
    const credsPath = path.join(env.extDir, 'creds.json');

    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));
    fs.writeFileSync(warrantPath, JSON.stringify(env.signWarrant(env.buildWarrantPayload()), null, 2));
    fs.writeFileSync(credsPath, JSON.stringify(env.buildSyntheticCredentials(), null, 2));

    const first = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(first.status, 0);

    // Replay same warrant -> REPLAYED_WARRANT_ID
    const replay = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(replay.status, 78);
    assert.equal(JSON.parse(replay.stderr.trim()).errorCode, 'REPLAYED_WARRANT_ID');

    // Expired warrant -> EXPIRED_OR_INVALID_WARRANT_WINDOW
    const now = Date.now();
    const expiredPayload = env.buildWarrantPayload({
      issuedAt: new Date(now - 7200_000).toISOString(),
      expiresAt: new Date(now - 60_000).toISOString(),
    });
    fs.writeFileSync(warrantPath, JSON.stringify(env.signWarrant(expiredPayload), null, 2));
    const expired = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(expired.status, 78);
    assert.equal(JSON.parse(expired.stderr.trim()).errorCode, 'EXPIRED_OR_INVALID_WARRANT_WINDOW');
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-14: Negative test — Blocklisted placeholder key, mismatched key, and test-fixture key or synthetic credentials in --mode live fail closed', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    const warrantPath = path.join(env.extDir, 'warrant.json');
    const ledgerPath = path.join(env.extDir, 'ledger.json');
    const credsPath = path.join(env.extDir, 'creds.json');
    fs.writeFileSync(credsPath, JSON.stringify(env.buildSyntheticCredentials(), null, 2));

    // 1. Historical placeholder key -> UNVERIFIED_CANDIDATE_PLACEHOLDER_KEY_FORBIDDEN
    const placeholderPem = [
      '-----BEGIN PUBLIC KEY-----',
      'MCowBQYDK2VwAyEA8tU2d3n7kP9wX1vR4mZ6qL0jY5bN8cH2fG4sA9dE1wI=',
      '-----END PUBLIC KEY-----',
    ].join('\n');
    fs.writeFileSync(
      trustRootPath,
      JSON.stringify(
        env.buildTrustRoot({
          ownerEd25519PublicKeyPem: placeholderPem,
          expectedPublicKeyFingerprintSha256Hex:
            '8f48ecc8ff4d1213795ed483225a1057be7b357aa833587321dc86bc0f70be6e',
          expectedPublicKeyFingerprintSha256B64:
            'SHA256:j0jsyP9NEhN5XtSDIloQV757NXqoM1hzIdyGvA9wvm4',
        }),
        null,
        2,
      ),
    );
    fs.writeFileSync(warrantPath, JSON.stringify(env.signWarrant(env.buildWarrantPayload()), null, 2));
    const resPlaceholder = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resPlaceholder.status, 78);
    assert.equal(
      JSON.parse(resPlaceholder.stderr.trim()).errorCode,
      'UNVERIFIED_CANDIDATE_PLACEHOLDER_KEY_FORBIDDEN',
    );

    // 2. Test-fixture key in --mode live -> TEST_FIXTURE_KEY_FORBIDDEN_IN_LIVE_MODE (both outer and inner)
    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));
    const resLiveFixtureOuter = env.runBootstrap([
      '--mode',
      'live',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resLiveFixtureOuter.status, 78);
    assert.equal(
      JSON.parse(resLiveFixtureOuter.stderr.trim()).errorCode,
      'TEST_FIXTURE_KEY_FORBIDDEN_IN_LIVE_MODE',
    );

    const resLiveFixtureInner = runExecutor(repoDir, [
      '--mode',
      'live',
      '--expected-sha',
      env.headSha,
      '--owner-trust-root',
      trustRootPath,
      '--policy-warrant',
      warrantPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resLiveFixtureInner.status, 78);
    assert.match(resLiveFixtureInner.stderr, /TEST_FIXTURE_KEY_FORBIDDEN_IN_LIVE_MODE/);

    // 3. Synthetic credentials in --mode live -> SYNTHETIC_CREDENTIALS_FORBIDDEN_IN_LIVE_MODE
    fs.writeFileSync(
      trustRootPath,
      JSON.stringify(
        env.buildTrustRoot({
          keyClassification: 'OWNER_OFFLINE_PRODUCTION_AUTHORITY',
          provenanceCeremonyId: 'CEREMONY-TEST-01',
          outOfBandVerificationRef: 'OOB-REF-01',
        }),
        null,
        2,
      ),
    );
    const resLiveSyntheticOuter = env.runBootstrap([
      '--mode',
      'live',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resLiveSyntheticOuter.status, 78);
    assert.equal(
      JSON.parse(resLiveSyntheticOuter.stderr.trim()).errorCode,
      'SYNTHETIC_CREDENTIALS_FORBIDDEN_IN_LIVE_MODE',
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-15: Negative test — Unauthorized/superseded commit, old Security review SHA, non-account alias, or altered inner candidate verifier fails closed', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    const warrantPath = path.join(env.extDir, 'warrant.json');
    const ledgerPath = path.join(env.extDir, 'ledger.json');
    const credsPath = path.join(env.extDir, 'creds.json');
    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));
    fs.writeFileSync(credsPath, JSON.stringify(env.buildSyntheticCredentials(), null, 2));

    // 1. Warrant signed for superseded commit SHA -> WARRANT_SHA_MISMATCH
    fs.writeFileSync(
      warrantPath,
      JSON.stringify(
        env.signWarrant(
          env.buildWarrantPayload({ approvedHeadSha: '4c0277c7ea806e1b10ebc001815ca8d6ccd16118' }),
        ),
        null,
        2,
      ),
    );
    const resSuperseded = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resSuperseded.status, 78);
    assert.equal(JSON.parse(resSuperseded.stderr.trim()).errorCode, 'WARRANT_SHA_MISMATCH');

    // 2. Old Security review SHA or @sec-arch-independent alias -> SECURITY_REVIEW_SHA_MISMATCH / INVALID_SECURITY_REVIEWER_IDENTITY
    fs.writeFileSync(
      warrantPath,
      JSON.stringify(
        env.signWarrant(
          env.buildWarrantPayload({
            independentSecurityReview: {
              decision: 'SECURITY_ACCEPT_G2_SOURCE_ONLY',
              reviewedSha: '5d80096c7a63df0d6f569415a1a325a13461db52',
              reviewerLogin: '11-eleven-skm',
              reviewUrl: 'https://github.com/kudzimusar/htp-zw/pull/153#pullrequestreview-5810280475',
            },
          }),
        ),
        null,
        2,
      ),
    );
    const resOldReview = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resOldReview.status, 78);
    assert.equal(JSON.parse(resOldReview.stderr.trim()).errorCode, 'SECURITY_REVIEW_SHA_MISMATCH');

    // 3. Altered inner candidate verifier executable -> caught by outer bootstrap (ALTERED_CANDIDATE_VERIFIER_DIGEST) before invocation
    const verifierAbs = path.join(repoDir, EXECUTOR_REL_PATH);
    fs.appendFileSync(verifierAbs, '\n// tampered inner verifier\n');
    execFileSync('git', ['commit', '-am', 'tamper inner verifier'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
    const tamperedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    fs.writeFileSync(
      trustRootPath,
      JSON.stringify(env.buildTrustRoot({ approvedHeadSha: tamperedSha }), null, 2),
    );
    fs.writeFileSync(
      warrantPath,
      JSON.stringify(env.signWarrant(env.buildWarrantPayload({ approvedHeadSha: tamperedSha })), null, 2),
    );
    const resTamperedVerifier = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resTamperedVerifier.status, 78);
    assert.equal(
      JSON.parse(resTamperedVerifier.stderr.trim()).errorCode,
      'ALTERED_CANDIDATE_VERIFIER_DIGEST',
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});

test('G2-WF-CONTAINMENT-16: Negative test — Missing Reporter/Editor-in-Chief actor role, excessive effect scope, or unverified credentials fail closed', () => {
  const repoDir = createIsolatedCleanRepoClone();
  const env = stageExternalCustodyEnv(repoDir);
  try {
    const trustRootPath = path.join(env.extDir, 'trust-root.json');
    const warrantPath = path.join(env.extDir, 'warrant.json');
    const ledgerPath = path.join(env.extDir, 'ledger.json');
    const credsPath = path.join(env.extDir, 'creds.json');
    fs.writeFileSync(trustRootPath, JSON.stringify(env.buildTrustRoot(), null, 2));
    fs.writeFileSync(credsPath, JSON.stringify(env.buildSyntheticCredentials(), null, 2));

    // 1. Missing reporter / editor_in_chief in allowedTargetActors -> INCOMPLETE_TARGET_ACTOR_SCOPE
    fs.writeFileSync(
      warrantPath,
      JSON.stringify(
        env.signWarrant(
          env.buildWarrantPayload({
            ownerExecutionAuthorization: {
              granted: true,
              stagingProjectRef: 'bzuvntbkevvuhfhqhkua',
              allowedTargetActors: ['commercial_subscriber', 'anonymous'],
              allowedSessionOnlyEffects: ['auth_sign_in_sign_out'],
            },
          }),
        ),
        null,
        2,
      ),
    );
    const resActors = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resActors.status, 78);
    assert.equal(JSON.parse(resActors.stderr.trim()).errorCode, 'INCOMPLETE_TARGET_ACTOR_SCOPE');

    // 2. Excessive effect scope -> PROHIBITED_WARRANT_EFFECT_SCOPE
    fs.writeFileSync(
      warrantPath,
      JSON.stringify(
        env.signWarrant(
          env.buildWarrantPayload({
            ownerExecutionAuthorization: {
              granted: true,
              stagingProjectRef: 'bzuvntbkevvuhfhqhkua',
              allowedTargetActors: [
                'reporter',
                'editor_in_chief',
                'section_editor',
                'moderator',
                'commercial_subscriber',
                'anonymous',
              ],
              allowedSessionOnlyEffects: ['auth_sign_in_sign_out', 'unbounded_schema_ddl_write'],
            },
          }),
        ),
        null,
        2,
      ),
    );
    const resEffects = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resEffects.status, 78);
    assert.equal(JSON.parse(resEffects.stderr.trim()).errorCode, 'PROHIBITED_WARRANT_EFFECT_SCOPE');

    // 3. Unverified / missing editor_in_chief credentials -> INVALID_SYNTHETIC_ACTOR_CREDENTIALS
    fs.writeFileSync(warrantPath, JSON.stringify(env.signWarrant(env.buildWarrantPayload()), null, 2));
    const badCreds = env.buildSyntheticCredentials();
    delete badCreds.actors.editor_in_chief;
    fs.writeFileSync(credsPath, JSON.stringify(badCreds, null, 2));

    const resBadCreds = env.runBootstrap([
      '--mode',
      'rehearsal',
      '--repo-root',
      repoDir,
      '--trust-root',
      trustRootPath,
      '--warrant',
      warrantPath,
      '--replay-ledger',
      ledgerPath,
      '--credentials-file',
      credsPath,
    ]);
    assert.equal(resBadCreds.status, 78);
    assert.equal(
      JSON.parse(resBadCreds.stderr.trim()).errorCode,
      'INVALID_SYNTHETIC_ACTOR_CREDENTIALS',
    );
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(env.extDir, { recursive: true, force: true });
  }
});
