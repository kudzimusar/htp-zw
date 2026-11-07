#!/usr/bin/env node
/**
 * HT-MVP-PUBLIC-LAUNCH-01-G2-LR01-R4
 * Fail-Closed Source-Consistency & External Warrant-Bound Executor for Protected Staging UAT
 *
 * Trust-Boundary Guarantees (R4 Remediation):
 * 1. NO CALLER-CONTROLLED SHA OR BRANCH BYPASS:
 *    - `--expected-sha` is a mandatory parity check against `git rev-parse HEAD`, NEVER a branch-approval fallback.
 *    - `actualSha === expectedSha` CANNOT authorize an unapproved branch or detached commit.
 *    - Only refs in `IMMUTABLE_ALLOWED_BRANCHES` (`release/ht-mvp-2.0-final`, `fix/ht-g2-rbac-session-boundary`) pass ref validation.
 * 2. FAIL-CLOSED GIT ANCESTRY (`UNVERIFIED_G1_ANCESTRY`):
 *    - `git merge-base --is-ancestor 1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5 HEAD` MUST succeed.
 *    - Shallow clones missing the frozen G1 base commit or commits not descending from `1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5`
 *      fail closed immediately.
 * 3. NO CALLER ENVIRONMENT VARIABLE OR DIRTY-TREE BYPASSES (`FORBIDDEN_CALLER_ENV_OVERRIDE` / `UNTRUSTED_DIRTY_WORKING_TREE`):
 *    - Setting `HT_G2_SECURITY_DECISION`, `HT_G2_OWNER_AUTHORIZATION`, `HT_G2_APPROVED_SHAS`, `HT_G2_UNIT_TEST_ALLOW_DIRTY`,
 *      or `HT_G2_SKIP_ANCESTRY_CHECK` in the environment is rejected immediately as a forbidden override attempt.
 *    - Any modified tracked file in `git status --porcelain --untracked-files=no` fails closed unconditionally.
 * 4. DUAL-ANCHORED ARTIFACT DIGEST VERIFICATION (`TAMPERED_ALLOWLIST_MANIFEST` / `ARTIFACT_DIGEST_MISMATCH`):
 *    - Required SHA-256 digests of the two real Gate 2 migrations (`20261102160000`, `20261107130000`), the frozen
 *      production migration manifest (`fe6abf17...`), the live UAT harness (`icr05a-fault-injection.test.mjs`), and the
 *      disposable PostgreSQL test suites are pinned in `IMMUTABLE_REQUIRED_ARTIFACT_DIGESTS` AND cross-checked against
 *      `docs/delivery/ht-g2-approved-uat-source-allowlist.json` and the live files on disk.
 * 5. EXTERNAL OWNER-SIGNED EXECUTION WARRANT REQUIRED FOR `--mode live`:
 *    - `--mode verify-route` proves ONLY candidate source consistency (`SOURCE_CONSISTENCY_ONLY_NOT_EXECUTION_AUTHORIZATION`),
 *      never permission to access staging secrets or run live UAT.
 *    - `--mode live` requires `--policy-warrant <external-file-outside-repo>` containing a canonical JSON payload signed
 *      with the Owner Authority Ed25519 private key (`crypto.verify(null, canonicalPayload, OWNER_PUBLIC_KEY, sig)`),
 *      binding the exact `HEAD` SHA, frozen G1 base SHA, branch name, artifact SHA-256 digests, Independent Security
 *      Reviewer `SECURITY_ACCEPT_G2_SOURCE_ONLY` signoff for that exact `HEAD` SHA, and non-expired Owner staging execution grant.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = fs.realpathSync(process.cwd());
const ALLOWLIST_PATH = path.join(
  REPO_ROOT,
  'docs',
  'delivery',
  'ht-g2-approved-uat-source-allowlist.json',
);

const FROZEN_G1_BASE_SHA = '1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5';
const IMMUTABLE_ALLOWED_BRANCHES = Object.freeze([
  'release/ht-mvp-2.0-final',
  'fix/ht-g2-rbac-session-boundary',
]);

const OWNER_AUTHORITY_ED25519_PUBLIC_KEY_PEM = [
  '-----BEGIN PUBLIC KEY-----',
  'MCowBQYDK2VwAyEA8tU2d3n7kP9wX1vR4mZ6qL0jY5bN8cH2fG4sA9dE1wI=',
  '-----END PUBLIC KEY-----',
].join('\n');

const IMMUTABLE_REQUIRED_ARTIFACT_DIGESTS = Object.freeze({
  'supabase/migrations/20261102160000_ht_mvp_r3_story_title_authority.sql':
    'a1dbdeec24009519cc3ec9d52ac6fa76ec75f713cb84ad4033d491a783be123b',
  'supabase/migrations/20261107130000_ht_mvp_g2_rbac_session_boundary_hardening.sql':
    '9f127811265632be4cd61eafcb9114810fc4c3858c99b029e8cb46f365f27daf',
  'docs/delivery/ht-mvp-production-migration-manifest.json':
    'fe6abf17239733f86be44c4c963ff679ebb1aed9c8e0be1506e9d5c638c70a8f',
  'tests/harness/icr05a-fault-injection.test.mjs':
    '7ee0bda84d0ccc8faea09960d91dbbb01e360105baefe3aa41a5a60c0d64515d',
  'tests/database/g2-rbac-session-boundary.test.mjs':
    'efa18b1687875bb3da1c43866d47b2086b97d8e11b1c5d327d3951551c529019',
  'tests/database/real-schema-title-authority.test.mjs':
    'b7654037ba40c7b0dd78edbc14c16c912c65f2bcfb3d5704ab4ad4f74d1c2647',
  'tests/database/story-title-authority.test.mjs':
    'd14b95364ef20d22082e7039e026f903a7813d72c57a54bd55c020da916c5bfc',
});

const FORBIDDEN_ENV_OVERRIDES = Object.freeze([
  'HT_G2_SECURITY_DECISION',
  'HT_G2_OWNER_AUTHORIZATION',
  'HT_G2_APPROVED_SHAS',
  'HT_G2_UNIT_TEST_ALLOW_DIRTY',
  'HT_G2_SKIP_ANCESTRY_CHECK',
]);

function parseArgs(argv) {
  const out = {
    mode: 'verify-route',
    expectedSha: '',
    policyWarrantPath: '',
    outputPath: '/tmp/ht-g2-uat-route-attestation.json',
    tapPath: '/tmp/icr05a-physical.tap',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (arg === '--expected-sha' && argv[i + 1]) {
      out.expectedSha = argv[++i];
    } else if (arg === '--policy-warrant' && argv[i + 1]) {
      out.policyWarrantPath = argv[++i];
    } else if (arg === '--output' && argv[i + 1]) {
      out.outputPath = argv[++i];
    } else if (arg === '--tap-output' && argv[i + 1]) {
      out.tapPath = argv[++i];
    } else {
      throw new Error(`UNKNOWN_ARGUMENT: Unrecognized or incomplete CLI option '${arg}'`);
    }
  }
  return out;
}

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

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

function verifySourceConsistency(expectedShaArg) {
  // 0. Reject any caller-supplied environment variable override attempts immediately
  for (const envKey of FORBIDDEN_ENV_OVERRIDES) {
    if (Object.prototype.hasOwnProperty.call(process.env, envKey) && process.env[envKey] !== '') {
      throw new Error(
        `FORBIDDEN_CALLER_ENV_OVERRIDE: Environment variable '${envKey}' is prohibited; authorization cannot be supplied via environment variables.`,
      );
    }
  }

  if (!fs.existsSync(ALLOWLIST_PATH)) {
    throw new Error(`MISSING_ALLOWLIST_MANIFEST: ${ALLOWLIST_PATH} does not exist`);
  }
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

  if (
    allowlist.frozenG1BaseSha !== FROZEN_G1_BASE_SHA ||
    allowlist.manifestScope !== 'SOURCE_CONSISTENCY_ONLY_NOT_EXECUTION_AUTHORIZATION' ||
    allowlist.trustBoundaryPolicy?.inBranchManifestCanAuthorizeLiveExecution !== false ||
    allowlist.trustBoundaryPolicy?.cliExpectedShaCanAuthorizeBranch !== false
  ) {
    throw new Error(
      'TAMPERED_ALLOWLIST_MANIFEST: Allowlist manifest metadata or trust-boundary policy was altered.',
    );
  }

  // 1. Require a clean tracked working tree (zero uncommitted modifications allowed)
  const dirtyStatus = git(['status', '--porcelain', '--untracked-files=no']);
  if (dirtyStatus.length > 0) {
    throw new Error(
      `UNTRUSTED_DIRTY_WORKING_TREE: Tracked files modified in working tree:\n${dirtyStatus}`,
    );
  }

  // 2. Require explicit 40-hex --expected-sha (or EXPECTED_SHA) matching HEAD
  const actualSha = git(['rev-parse', 'HEAD']);
  const expectedSha = (expectedShaArg || process.env.EXPECTED_SHA || '').trim();
  if (!/^[0-9a-f]{40}$/i.test(expectedSha)) {
    throw new Error(
      `MISSING_OR_INVALID_EXPECTED_SHA: A 40-character hex --expected-sha is required (got '${expectedSha || '<empty>'}').`,
    );
  }
  if (actualSha.toLowerCase() !== expectedSha.toLowerCase()) {
    throw new Error(
      `SHA_MISMATCH: Checked out HEAD (${actualSha}) does not match expected_sha (${expectedSha}).`,
    );
  }

  // 3. Fail-closed verification that FROZEN_G1_BASE_SHA is an ancestor of HEAD
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', FROZEN_G1_BASE_SHA, actualSha], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  } catch {
    throw new Error(
      `UNVERIFIED_G1_ANCESTRY: Commit ${actualSha} is not a verified descendant of frozen G1 SHA ${FROZEN_G1_BASE_SHA} (or git history is incomplete).`,
    );
  }

  // 4. Strict branch/ref allowlist check — NEVER falls back to actualSha === expectedSha
  let localBranch = '';
  try {
    localBranch = git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  } catch {
    localBranch = '';
  }
  const ciRefName = (process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '').trim();
  const candidateBranch = localBranch || ciRefName;

  if (!candidateBranch || !IMMUTABLE_ALLOWED_BRANCHES.includes(candidateBranch)) {
    throw new Error(
      `UNAPPROVED_REF: Ref '${candidateBranch || 'DETACHED_HEAD'}' at SHA ${actualSha} is not in IMMUTABLE_ALLOWED_BRANCHES (${IMMUTABLE_ALLOWED_BRANCHES.join(', ')}). Caller-supplied --expected-sha cannot authorize an unapproved ref.`,
    );
  }

  // If local branch ref exists in .git/refs/heads/<candidateBranch>, verify it resolves to actualSha
  try {
    const branchHeadSha = git(['rev-parse', `refs/heads/${candidateBranch}`]);
    if (branchHeadSha !== actualSha) {
      throw new Error(
        `REF_SHA_DRIFT: Local branch refs/heads/${candidateBranch} (${branchHeadSha}) does not match HEAD (${actualSha}).`,
      );
    }
  } catch (err) {
    if (String(err.message || '').includes('REF_SHA_DRIFT')) {
      throw err;
    }
    // In CI detached PR checkouts, refs/heads/<candidateBranch> may not be materialized locally
  }

  // 5. Dual-anchored SHA-256 verification of all required migrations, manifest, and test suites
  const allowlistDigests = allowlist.requiredArtifactDigests || {};
  const verifiedDigests = {};

  for (const [relPath, pinnedDigest] of Object.entries(IMMUTABLE_REQUIRED_ARTIFACT_DIGESTS)) {
    if (allowlistDigests[relPath] !== pinnedDigest) {
      throw new Error(
        `TAMPERED_ALLOWLIST_MANIFEST: In-branch digest for ${relPath} (${allowlistDigests[relPath]}) diverges from immutable baseline digest (${pinnedDigest}).`,
      );
    }
    const absPath = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`MISSING_REQUIRED_FILE: ${relPath} does not exist`);
    }
    const actualDigest = sha256File(absPath);
    if (actualDigest !== pinnedDigest) {
      throw new Error(
        `ARTIFACT_DIGEST_MISMATCH: ${relPath} SHA-256 on disk is ${actualDigest}, expected ${pinnedDigest}.`,
      );
    }
    verifiedDigests[relPath] = actualDigest;
  }

  return {
    verifiedAt: new Date().toISOString(),
    programmeId: allowlist.programmeId,
    gateId: allowlist.gateId,
    attestationScope: 'SOURCE_CONSISTENCY_ONLY_NOT_EXECUTION_AUTHORIZATION',
    liveExecutionAuthorized: false,
    privilegedCredentialsAccessed: false,
    checkedOutSha: actualSha,
    expectedSha,
    candidateBranch,
    frozenG1BaseSha: FROZEN_G1_BASE_SHA,
    g1AncestorVerified: true,
    defaultBranchWorkflowStatus: allowlist.defaultBranchWorkflowStatus,
    stagingProject: allowlist.stagingProject,
    verifiedArtifactDigests: verifiedDigests,
  };
}

function verifyExternalOwnerWarrant(warrantPathArg, sourceAttestation) {
  if (!warrantPathArg) {
    console.error(
      'BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT: --mode live requires --policy-warrant <external-file-outside-repo> signed by the Owner Ed25519 authority key.',
    );
    process.exit(78);
  }

  const resolvedWarrantPath = path.resolve(warrantPathArg);
  if (!fs.existsSync(resolvedWarrantPath)) {
    console.error(
      `BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT: Warrant file '${resolvedWarrantPath}' does not exist.`,
    );
    process.exit(78);
  }

  const realWarrantPath = fs.realpathSync(resolvedWarrantPath);
  if (
    realWarrantPath === REPO_ROOT ||
    realWarrantPath.startsWith(`${REPO_ROOT}${path.sep}`)
  ) {
    console.error(
      `IN_REPO_POLICY_FILE_FORBIDDEN: Warrant file '${realWarrantPath}' resides inside the repository working tree and cannot be trusted as external Owner authority.`,
    );
    process.exit(78);
  }

  let warrant;
  try {
    warrant = JSON.parse(fs.readFileSync(realWarrantPath, 'utf8'));
  } catch {
    console.error('INVALID_WARRANT_JSON: External warrant file is not valid JSON.');
    process.exit(78);
  }

  const payload = warrant?.payload;
  const signatureB64 = warrant?.ed25519SignatureBase64;
  if (!payload || typeof payload !== 'object' || typeof signatureB64 !== 'string' || !signatureB64) {
    console.error(
      'INVALID_WARRANT_STRUCTURE: Warrant must contain { payload, ed25519SignatureBase64 }.',
    );
    process.exit(78);
  }

  // Cryptographically verify detached Ed25519 signature over canonicalized payload JSON
  const canonicalPayloadBytes = Buffer.from(canonicalizeJson(payload), 'utf8');
  let signatureValid = false;
  try {
    const signatureBytes = Buffer.from(signatureB64, 'base64');
    signatureValid = crypto.verify(
      null,
      canonicalPayloadBytes,
      OWNER_AUTHORITY_ED25519_PUBLIC_KEY_PEM,
      signatureBytes,
    );
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    console.error(
      'FORGED_WARRANT_SIGNATURE: Ed25519 cryptographic signature verification failed against pinned Owner Authority Public Key.',
    );
    process.exit(78);
  }

  // Verify exact commit SHA, G1 base SHA, and branch binding
  if (payload.approvedHeadSha !== sourceAttestation.checkedOutSha) {
    console.error(
      `WARRANT_SHA_MISMATCH: Warrant is signed for SHA '${payload.approvedHeadSha}', but checked-out HEAD is '${sourceAttestation.checkedOutSha}'. Prior approvals do not carry over to newer commits.`,
    );
    process.exit(78);
  }
  if (payload.frozenG1BaseSha !== FROZEN_G1_BASE_SHA) {
    console.error(
      `WARRANT_G1_BASE_MISMATCH: Warrant frozenG1BaseSha '${payload.frozenG1BaseSha}' does not match '${FROZEN_G1_BASE_SHA}'.`,
    );
    process.exit(78);
  }
  if (payload.approvedBranch !== sourceAttestation.candidateBranch) {
    console.error(
      `WARRANT_BRANCH_MISMATCH: Warrant approvedBranch '${payload.approvedBranch}' does not match '${sourceAttestation.candidateBranch}'.`,
    );
    process.exit(78);
  }

  // Verify Independent Security Review fields bound inside signed warrant
  const secReview = payload.independentSecurityReview || {};
  if (
    secReview.decision !== 'SECURITY_ACCEPT_G2_SOURCE_ONLY' ||
    secReview.reviewedSha !== sourceAttestation.checkedOutSha ||
    typeof secReview.reviewerLogin !== 'string' ||
    !secReview.reviewerLogin ||
    secReview.reviewerLogin === 'kudzimusar'
  ) {
    console.error(
      `BLOCKED_INDEPENDENT_SECURITY_REVIEW: Warrant lacks valid independent SECURITY_ACCEPT_G2_SOURCE_ONLY signoff for exact SHA ${sourceAttestation.checkedOutSha}.`,
    );
    process.exit(78);
  }

  // Verify Owner Execution Authorization fields & expiration
  const ownerAuth = payload.ownerExecutionAuthorization || {};
  const expiresAtMs = Date.parse(ownerAuth.expiresAt || '');
  if (
    ownerAuth.granted !== true ||
    ownerAuth.stagingProjectRef !== 'bzuvntbkevvuhfhqhkua' ||
    Number.isNaN(expiresAtMs) ||
    expiresAtMs <= Date.now()
  ) {
    console.error(
      'BLOCKED_OWNER_AUTHORIZATION: Warrant lacks non-expired Owner staging execution grant for project bzuvntbkevvuhfhqhkua.',
    );
    process.exit(78);
  }

  // Verify all artifact digests in signed warrant match disk digests
  const warrantDigests = payload.artifactDigests || {};
  for (const [relPath, verifiedDigest] of Object.entries(
    sourceAttestation.verifiedArtifactDigests,
  )) {
    if (warrantDigests[relPath] !== verifiedDigest) {
      console.error(
        `WARRANT_DIGEST_MISMATCH: Warrant digest for ${relPath} (${warrantDigests[relPath]}) does not match verified disk digest (${verifiedDigest}).`,
      );
      process.exit(78);
    }
  }

  return {
    warrantVerifiedAt: new Date().toISOString(),
    approvedHeadSha: payload.approvedHeadSha,
    independentSecurityReview: secReview,
    ownerExecutionAuthorization: ownerAuth,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const attestation = verifySourceConsistency(args.expectedSha);

  fs.writeFileSync(args.outputPath, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
  console.log(
    `[G2-UAT-EXECUTOR] Source consistency & artifact digests verified at SHA ${attestation.checkedOutSha} (scope=${attestation.attestationScope})`,
  );
  console.log(`[G2-UAT-EXECUTOR] Attestation written to ${args.outputPath}`);

  if (args.mode === 'verify-route') {
    console.log(
      '[G2-UAT-EXECUTOR] Mode=verify-route complete (source consistency only; liveExecutionAuthorized=false; zero secrets accessed).',
    );
    return;
  }

  if (args.mode !== 'live') {
    throw new Error(`UNSUPPORTED_MODE: '${args.mode}'. Expected 'verify-route' or 'live'.`);
  }

  // Mode === 'live': Require externally signed Ed25519 Owner Execution Warrant outside REPO_ROOT
  const warrantVerification = verifyExternalOwnerWarrant(args.policyWarrantPath, attestation);

  const rawActorsJson =
    process.env.UAT_ACTORS_JSON || process.env.HEALTHTIMES_UAT_ACTORS_JSON || '';
  const supabaseAccessToken =
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN ||
    '';

  if (!rawActorsJson || !supabaseAccessToken) {
    console.error(
      'BLOCKED_OWNER_UAT_CREDENTIALS: Live Staging UAT requires UAT_ACTORS_JSON and SUPABASE_ACCESS_TOKEN.',
    );
    process.exit(78);
  }

  let actors;
  try {
    actors = JSON.parse(rawActorsJson);
  } catch {
    console.error('BLOCKED_OWNER_UAT_CREDENTIALS: UAT_ACTORS_JSON is not valid JSON.');
    process.exit(78);
  }

  const requiredEmails = [
    'uat-specialist@healthtimes.test',
    'uat-commercial@healthtimes.test',
  ];
  for (const email of requiredEmails) {
    const actor = actors[email];
    if (!actor || actor.email !== email || typeof actor.password !== 'string' || !actor.password) {
      console.error(
        `BLOCKED_OWNER_UAT_CREDENTIALS: Missing valid credentials for required test identity ${email}.`,
      );
      process.exit(78);
    }
  }

  const updatedAttestation = {
    ...attestation,
    attestationScope: 'WARRANT_VERIFIED_LIVE_EXECUTION',
    liveExecutionAuthorized: true,
    privilegedCredentialsAccessed: true,
    warrantVerification,
  };
  fs.writeFileSync(args.outputPath, `${JSON.stringify(updatedAttestation, null, 2)}\n`, 'utf8');

  const ephemeralDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-g2-uat-actors-'));
  fs.chmodSync(ephemeralDir, 0o700);
  const ephemeralActorsFile = path.join(ephemeralDir, 'test-actors.json');

  try {
    fs.writeFileSync(ephemeralActorsFile, rawActorsJson, { mode: 0o600 });
    const runResult = spawnSync(
      process.execPath,
      ['--test', 'tests/harness/icr05a-fault-injection.test.mjs'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          SUPABASE_ACCESS_TOKEN: supabaseAccessToken,
          HEALTHTIMES_TEST_ACTORS_FILE: ephemeralActorsFile,
        },
        encoding: 'utf8',
      },
    );

    const combinedOutput = `${runResult.stdout || ''}${runResult.stderr || ''}`;
    fs.writeFileSync(args.tapPath, combinedOutput, 'utf8');
    process.stdout.write(combinedOutput);

    if (runResult.status !== 0) {
      process.exit(runResult.status || 1);
    }
    if (
      !/^# tests 10$/m.test(combinedOutput) ||
      !/^# pass 10$/m.test(combinedOutput) ||
      !/^# fail 0$/m.test(combinedOutput) ||
      !/^# skipped 0$/m.test(combinedOutput)
    ) {
      console.error(
        'LIVE_UAT_INCOMPLETE: Expected 10/10 passing ICR05A live fault-injection tests with 0 skipped.',
      );
      process.exit(1);
    }
  } finally {
    fs.rmSync(ephemeralDir, { recursive: true, force: true });
  }
}

main();
