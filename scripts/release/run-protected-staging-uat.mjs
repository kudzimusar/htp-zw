#!/usr/bin/env node
/**
 * HT-MVP-PUBLIC-LAUNCH-01-G2-LR01-R7
 * Fail-Closed Source-Consistency & External Owner Trust-Root Bound Executor for Protected Staging UAT
 *
 * R6 Trust-Boundary & Key-Interoperability Guarantees:
 * 1. NO EMBEDDED PLACEHOLDER PUBLIC KEY:
 *    - The historical unowned placeholder key (`SHA256:j0jsyP9NEhN5XtSDIloQV757NXqoM1hzIdyGvA9wvm4` /
 *      hex `8f48ecc8ff4d1213795ed483225a1057be7b357aa833587321dc86bc0f70be6e`) has been removed and
 *      permanently blocklisted (`UNVERIFIED_CANDIDATE_PLACEHOLDER_KEY_FORBIDDEN`).
 *    - Both the external Owner-controlled bootstrap (`owner-trusted-uat-bootstrap.mjs`) and this inner
 *      candidate verifier load the Owner Ed25519 public key from an external Owner-controlled trust-root
 *      file (`--owner-trust-root <external-path-outside-repo>`) and verify its SPKI DER SHA-256 fingerprint
 *      before verifying the detached Ed25519 signature on `--policy-warrant <external-path-outside-repo>`.
 * 2. STRICT SEPARATION OF SYNTHETIC REHEARSAL VS. LIVE PRODUCTION AUTHORITY:
 *    - `--mode synthetic-live-rehearsal` requires `keyClassification: "NON_PRODUCTION_FIXTURE_REHEARSAL_ONLY"`
 *      and `credentialClassification: "DISPOSABLE_SYNTHETIC_REHEARSAL_ONLY"`, executes the full outer->inner
 *      warrant signature, SHA, verifier-digest, review-binding, actor-role, and effect-scope verification
 *      chain, and makes ZERO network calls or staging mutations (`liveExecutionAuthorized: false`).
 *    - `--mode live` requires `keyClassification: "OWNER_OFFLINE_PRODUCTION_AUTHORITY"` (with out-of-band
 *      `provenanceCeremonyId` and `outOfBandVerificationRef`) and `credentialClassification:
 *      "PRODUCTION_OWNER_STAGING_VAULT"`. Test fixture keys and synthetic credentials fail closed
 *      (`TEST_FIXTURE_KEY_FORBIDDEN_IN_LIVE_MODE` / `SYNTHETIC_CREDENTIALS_FORBIDDEN_IN_LIVE_MODE`).
 * 3. NO CALLER-CONTROLLED SHA, BRANCH, OR ENVIRONMENT VARIABLE BYPASSES:
 *    - `--expected-sha` is a mandatory parity check against `git rev-parse HEAD`, never a branch fallback.
 *    - `git merge-base --is-ancestor 1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5 HEAD` is mandatory (`UNVERIFIED_G1_ANCESTRY`).
 *    - Dirty tracked working trees (`UNTRUSTED_DIRTY_WORKING_TREE`) and caller env overrides (`FORBIDDEN_CALLER_ENV_OVERRIDE`)
 *      fail closed unconditionally.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_PATH = fs.realpathSync(fileURLToPath(import.meta.url));
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

const BLOCKLISTED_PLACEHOLDER_KEY_SHA256_HEX =
  '8f48ecc8ff4d1213795ed483225a1057be7b357aa833587321dc86bc0f70be6e';

const REQUIRED_ACTOR_ROLES = Object.freeze([
  'reporter',
  'editor_in_chief',
  'section_editor',
  'moderator',
  'commercial_subscriber',
  'anonymous',
]);

const ALLOWED_SESSION_EFFECTS = Object.freeze([
  'auth_sign_in_sign_out',
  'session_revocation_check',
  'bounded_editorial_draft_title_check',
  'non_dispatching_newsletter_preview_check',
  'read_only_rls_boundary_probe',
]);

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
    ownerTrustRootPath: '',
    policyWarrantPath: '',
    credentialsFilePath: '',
    outputPath: '/tmp/ht-g2-uat-route-attestation.json',
    tapPath: '/tmp/icr05a-physical.tap',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (arg === '--expected-sha' && argv[i + 1]) {
      out.expectedSha = argv[++i];
    } else if (arg === '--owner-trust-root' && argv[i + 1]) {
      out.ownerTrustRootPath = argv[++i];
    } else if (arg === '--policy-warrant' && argv[i + 1]) {
      out.policyWarrantPath = argv[++i];
    } else if (arg === '--credentials-file' && argv[i + 1]) {
      out.credentialsFilePath = argv[++i];
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

function assertExternalFile(filePathArg, missingCode, inRepoCode, label) {
  if (!filePathArg) {
    console.error(`${missingCode}: Missing required external ${label} path.`);
    process.exit(78);
  }
  const resolved = path.resolve(filePathArg);
  if (!fs.existsSync(resolved)) {
    console.error(`${missingCode}: External ${label} '${resolved}' does not exist.`);
    process.exit(78);
  }
  const realPath = fs.realpathSync(resolved);
  if (realPath === REPO_ROOT || realPath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    console.error(
      `${inRepoCode}: ${label} '${realPath}' resides inside the repository working tree and cannot be trusted as external Owner authority.`,
    );
    process.exit(78);
  }
  return realPath;
}

function computeSpkiFingerprints(publicKeyPem) {
  try {
    const keyObj = crypto.createPublicKey(publicKeyPem);
    if (keyObj.asymmetricKeyType !== 'ed25519') {
      console.error(
        `UNSUPPORTED_KEY_ALGORITHM: Expected Ed25519 public key, got '${keyObj.asymmetricKeyType}'.`,
      );
      process.exit(78);
    }
    const spkiDer = keyObj.export({ type: 'spki', format: 'der' });
    const hex = crypto.createHash('sha256').update(spkiDer).digest('hex');
    const b64 = `SHA256:${crypto.createHash('sha256').update(spkiDer).digest('base64').replace(/=+$/, '')}`;
    return { hex, b64 };
  } catch (err) {
    console.error(`INVALID_TRUST_ROOT_PUBLIC_KEY: ${err.message}`);
    process.exit(78);
  }
}

function verifySourceConsistency(expectedShaArg) {
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
    allowlist.trustBoundaryPolicy?.cliExpectedShaCanAuthorizeBranch !== false ||
    allowlist.trustBoundaryPolicy?.embeddedPublicKeyTrustedForLiveExecution !== false
  ) {
    throw new Error(
      'TAMPERED_ALLOWLIST_MANIFEST: Allowlist manifest metadata or trust-boundary policy was altered.',
    );
  }

  const dirtyStatus = git(['status', '--porcelain', '--untracked-files=no']);
  if (dirtyStatus.length > 0) {
    throw new Error(
      `UNTRUSTED_DIRTY_WORKING_TREE: Tracked files modified in working tree:\n${dirtyStatus}`,
    );
  }

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
  }

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
    credentialsEnvelopeInspected: false,
    credentialsForwardedToInner: false,
    privilegedSecretsRead: false,
    privilegedSecretsInjected: false,
    privilegedRuntimeUsed: false,
    checkedOutSha: actualSha,
    expectedSha,
    candidateBranch,
    frozenG1BaseSha: FROZEN_G1_BASE_SHA,
    g1AncestorVerified: true,
    candidateVerifierSha256: sha256File(SELF_PATH),
    defaultBranchWorkflowStatus: allowlist.defaultBranchWorkflowStatus,
    stagingProject: allowlist.stagingProject,
    verifiedArtifactDigests: verifiedDigests,
  };
}

function verifyExternalTrustRootAndWarrant(mode, trustRootPathArg, warrantPathArg, sourceAttestation) {
  if (!trustRootPathArg && !warrantPathArg) {
    console.error(
      'BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT: Execution requires both --owner-trust-root <external-path> and --policy-warrant <external-path> outside the repository.',
    );
    process.exit(78);
  }
  const realWarrantPath = assertExternalFile(
    warrantPathArg,
    'BLOCKED_MISSING_EXTERNAL_OWNER_WARRANT',
    'IN_REPO_POLICY_FILE_FORBIDDEN',
    'policy warrant file',
  );
  const realTrustRootPath = assertExternalFile(
    trustRootPathArg,
    'BLOCKED_MISSING_EXTERNAL_OWNER_TRUST_ROOT',
    'IN_REPO_TRUST_ROOT_FORBIDDEN',
    'Owner trust-root file',
  );

  let trustRoot;
  try {
    trustRoot = JSON.parse(fs.readFileSync(realTrustRootPath, 'utf8'));
  } catch {
    console.error('INVALID_TRUST_ROOT_JSON: External trust-root file is not valid JSON.');
    process.exit(78);
  }

  const keyFp = computeSpkiFingerprints(trustRoot.ownerEd25519PublicKeyPem || '');
  if (keyFp.hex === BLOCKLISTED_PLACEHOLDER_KEY_SHA256_HEX) {
    console.error(
      'UNVERIFIED_CANDIDATE_PLACEHOLDER_KEY_FORBIDDEN: The historical candidate placeholder public key has no Owner private key and is permanently blocklisted.',
    );
    process.exit(78);
  }
  if (
    trustRoot.expectedPublicKeyFingerprintSha256Hex !== keyFp.hex ||
    trustRoot.expectedPublicKeyFingerprintSha256B64 !== keyFp.b64
  ) {
    console.error(
      `MISMATCHED_TRUST_ROOT_KEY_FINGERPRINT: Trust-root public key fingerprint (${keyFp.b64}) does not match expected fingerprint (${trustRoot.expectedPublicKeyFingerprintSha256B64}).`,
    );
    process.exit(78);
  }

  if (mode === 'live') {
    if (trustRoot.keyClassification !== 'OWNER_OFFLINE_PRODUCTION_AUTHORITY') {
      console.error(
        `TEST_FIXTURE_KEY_FORBIDDEN_IN_LIVE_MODE: --mode live requires keyClassification='OWNER_OFFLINE_PRODUCTION_AUTHORITY' (got '${trustRoot.keyClassification}'). Test fixtures never qualify as production Owner authority.`,
      );
      process.exit(78);
    }
    if (!trustRoot.provenanceCeremonyId || !trustRoot.outOfBandVerificationRef) {
      console.error(
        'UNPROVENANCED_OWNER_KEY_FORBIDDEN: --mode live requires provenanceCeremonyId and outOfBandVerificationRef.',
      );
      process.exit(78);
    }
  } else if (mode === 'synthetic-live-rehearsal') {
    if (trustRoot.keyClassification !== 'NON_PRODUCTION_FIXTURE_REHEARSAL_ONLY') {
      console.error(
        `INVALID_REHEARSAL_KEY_CLASSIFICATION: --mode synthetic-live-rehearsal requires keyClassification='NON_PRODUCTION_FIXTURE_REHEARSAL_ONLY' (got '${trustRoot.keyClassification}').`,
      );
      process.exit(78);
    }
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

  const canonicalPayloadBytes = Buffer.from(canonicalizeJson(payload), 'utf8');
  let signatureValid = false;
  try {
    const signatureBytes = Buffer.from(signatureB64, 'base64');
    signatureValid = crypto.verify(
      null,
      canonicalPayloadBytes,
      trustRoot.ownerEd25519PublicKeyPem,
      signatureBytes,
    );
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    console.error(
      'FORGED_WARRANT_SIGNATURE: Ed25519 cryptographic signature verification failed against external Owner Trust Root Public Key.',
    );
    process.exit(78);
  }

  if (payload.ownerPublicKeyFingerprintSha256B64 !== keyFp.b64) {
    console.error(
      `WARRANT_KEY_FINGERPRINT_MISMATCH: Warrant key fingerprint (${payload.ownerPublicKeyFingerprintSha256B64}) does not match external Trust Root fingerprint (${keyFp.b64}).`,
    );
    process.exit(78);
  }

  if (payload.approvedHeadSha !== sourceAttestation.checkedOutSha) {
    console.error(
      `WARRANT_SHA_MISMATCH: Warrant is signed for SHA '${payload.approvedHeadSha}', but checked-out HEAD is '${sourceAttestation.checkedOutSha}'.`,
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
  if (payload.approvedCandidateVerifierSha256 !== sourceAttestation.candidateVerifierSha256) {
    console.error(
      `WARRANT_VERIFIER_DIGEST_MISMATCH: Warrant approvedCandidateVerifierSha256 '${payload.approvedCandidateVerifierSha256}' does not match actual candidate verifier SHA-256 '${sourceAttestation.candidateVerifierSha256}'.`,
    );
    process.exit(78);
  }

  const nowMs = Date.now();
  const issuedAtMs = Date.parse(payload.issuedAt || '');
  const expiresAtMs = Date.parse(payload.expiresAt || '');
  if (
    Number.isNaN(issuedAtMs) ||
    Number.isNaN(expiresAtMs) ||
    issuedAtMs > nowMs + 5000 ||
    expiresAtMs <= nowMs ||
    expiresAtMs - issuedAtMs > 3600 * 1000
  ) {
    console.error(
      `EXPIRED_OR_INVALID_WARRANT_WINDOW: Warrant timestamp window is expired or invalid (issuedAt=${payload.issuedAt}, expiresAt=${payload.expiresAt}).`,
    );
    process.exit(78);
  }

  const secReview = payload.independentSecurityReview || {};
  if (
    secReview.decision !== 'SECURITY_ACCEPT_G2_SOURCE_ONLY' ||
    secReview.reviewedSha !== sourceAttestation.checkedOutSha ||
    typeof secReview.reviewerLogin !== 'string' ||
    !secReview.reviewerLogin ||
    secReview.reviewerLogin === 'kudzimusar' ||
    secReview.reviewerLogin.startsWith('@') ||
    secReview.reviewerLogin === 'sec-arch-independent' ||
    !/^https:\/\/github\.com\/kudzimusar\/htp-zw\/pull\/153#pullrequestreview-\d+$/.test(
      secReview.reviewUrl || '',
    )
  ) {
    console.error(
      `BLOCKED_INDEPENDENT_SECURITY_REVIEW: Warrant lacks valid independent GitHub account SECURITY_ACCEPT_G2_SOURCE_ONLY signoff for exact SHA ${sourceAttestation.checkedOutSha}.`,
    );
    process.exit(78);
  }

  const ownerAuth = payload.ownerExecutionAuthorization || {};
  if (
    ownerAuth.granted !== true ||
    ownerAuth.stagingProjectRef !== 'bzuvntbkevvuhfhqhkua' ||
    payload.stagingProjectRef !== 'bzuvntbkevvuhfhqhkua'
  ) {
    console.error(
      'BLOCKED_OWNER_AUTHORIZATION: Warrant lacks valid Owner staging execution grant for project bzuvntbkevvuhfhqhkua.',
    );
    process.exit(78);
  }

  const allowedActors = Array.isArray(ownerAuth.allowedTargetActors)
    ? ownerAuth.allowedTargetActors
    : [];
  for (const role of REQUIRED_ACTOR_ROLES) {
    if (!allowedActors.includes(role)) {
      console.error(
        `INCOMPLETE_TARGET_ACTOR_SCOPE: Warrant allowedTargetActors is missing required role '${role}'.`,
      );
      process.exit(78);
    }
  }

  const allowedEffects = Array.isArray(ownerAuth.allowedSessionOnlyEffects)
    ? ownerAuth.allowedSessionOnlyEffects
    : [];
  if (allowedEffects.length === 0) {
    console.error('EMPTY_WARRANT_EFFECT_SCOPE: Warrant allowedSessionOnlyEffects cannot be empty.');
    process.exit(78);
  }
  for (const eff of allowedEffects) {
    if (!ALLOWED_SESSION_EFFECTS.includes(eff)) {
      console.error(
        `PROHIBITED_WARRANT_EFFECT_SCOPE: Effect '${eff}' is outside bounded session-only UAT scope.`,
      );
      process.exit(78);
    }
  }

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
    warrantId: payload.warrantId,
    approvedHeadSha: payload.approvedHeadSha,
    trustRootKeyClassification: trustRoot.keyClassification,
    trustRootPublicKeyFingerprintSha256B64: keyFp.b64,
    trustRootPublicKeyFingerprintSha256Hex: keyFp.hex,
    independentSecurityReview: secReview,
    ownerExecutionAuthorization: ownerAuth,
  };
}

function verifyCredentialsEnvelope(mode, credentialsFilePathArg) {
  const realCredsPath = assertExternalFile(
    credentialsFilePathArg,
    'BLOCKED_OWNER_UAT_CREDENTIALS',
    'IN_REPO_CREDENTIALS_FILE_FORBIDDEN',
    'credentials envelope file',
  );

  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(realCredsPath, 'utf8'));
  } catch {
    console.error('BLOCKED_OWNER_UAT_CREDENTIALS: Credentials file is not valid JSON.');
    process.exit(78);
  }

  if (mode === 'live') {
    if (envelope.credentialClassification !== 'PRODUCTION_OWNER_STAGING_VAULT') {
      console.error(
        `SYNTHETIC_CREDENTIALS_FORBIDDEN_IN_LIVE_MODE: --mode live requires credentialClassification='PRODUCTION_OWNER_STAGING_VAULT' (got '${envelope.credentialClassification}').`,
      );
      process.exit(78);
    }
  } else if (mode === 'synthetic-live-rehearsal') {
    if (envelope.credentialClassification !== 'DISPOSABLE_SYNTHETIC_REHEARSAL_ONLY') {
      console.error(
        `LIVE_CREDENTIALS_FORBIDDEN_IN_REHEARSAL: --mode synthetic-live-rehearsal requires credentialClassification='DISPOSABLE_SYNTHETIC_REHEARSAL_ONLY' (got '${envelope.credentialClassification}').`,
      );
      process.exit(78);
    }
  }

  if (typeof envelope.supabaseAccessToken !== 'string' || envelope.supabaseAccessToken.length < 16) {
    console.error('BLOCKED_OWNER_UAT_CREDENTIALS: Missing valid supabaseAccessToken in envelope.');
    process.exit(78);
  }

  const actors = envelope.actors || {};
  const requiredActorKeys = [
    'reporter',
    'editor_in_chief',
    'section_editor',
    'moderator',
    'uat-specialist@healthtimes.test',
    'uat-commercial@healthtimes.test',
  ];
  for (const key of requiredActorKeys) {
    const actor = actors[key];
    if (
      !actor ||
      typeof actor.email !== 'string' ||
      !actor.email.includes('@') ||
      typeof actor.password !== 'string' ||
      actor.password.length < 8
    ) {
      console.error(
        `BLOCKED_OWNER_UAT_CREDENTIALS: Missing or unverified credentials for required UAT identity '${key}'.`,
      );
      process.exit(78);
    }
  }

  return envelope;
}

function main() {
  const args = parseArgs(process.argv);
  const attestation = verifySourceConsistency(args.expectedSha);

  fs.writeFileSync(args.outputPath, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
  console.log(
    `[G2-UAT-EXECUTOR] Source consistency & artifact digests verified at SHA ${attestation.checkedOutSha} (scope=${attestation.attestationScope})`,
  );

  if (args.mode === 'verify-route') {
    console.log(
      '[G2-UAT-EXECUTOR] Mode=verify-route complete (source consistency only; liveExecutionAuthorized=false; zero secrets accessed).',
    );
    return;
  }

  if (args.mode !== 'synthetic-live-rehearsal' && args.mode !== 'live') {
    throw new Error(
      `UNSUPPORTED_MODE: '${args.mode}'. Expected 'verify-route', 'synthetic-live-rehearsal', or 'live'.`,
    );
  }

  const warrantVerification = verifyExternalTrustRootAndWarrant(
    args.mode,
    args.ownerTrustRootPath,
    args.policyWarrantPath,
    attestation,
  );

  const credsEnvelope = verifyCredentialsEnvelope(args.mode, args.credentialsFilePath);

  if (args.mode === 'synthetic-live-rehearsal') {
    const rehearsalAttestation = {
      ...attestation,
      attestationScope: 'SYNTHETIC_REHEARSAL_OUTER_AND_INNER_VERIFIED_NO_LIVE_AUTHORITY',
      liveExecutionAuthorized: false,
      credentialsEnvelopeInspected: true,
      credentialsForwardedToInner: true,
      privilegedSecretsRead: false,
      privilegedSecretsInjected: false,
      privilegedRuntimeUsed: false,
      privilegedCredentialsAccessed: false,
      innerVerifierWarrantVerified: true,
      innerVerifierCredentialsSchemaVerified: true,
      warrantVerification,
      verifiedActorKeys: Object.keys(credsEnvelope.actors),
    };
    fs.writeFileSync(args.outputPath, `${JSON.stringify(rehearsalAttestation, null, 2)}\n`, 'utf8');
    console.log(
      '[G2-UAT-EXECUTOR] Mode=synthetic-live-rehearsal complete (inner verifier warrant + synthetic credentials verified; zero live network calls).',
    );
    return;
  }

  // Mode === 'live' (requires real OWNER_OFFLINE_PRODUCTION_AUTHORITY key & PRODUCTION_OWNER_STAGING_VAULT credentials)
  const updatedAttestation = {
    ...attestation,
    attestationScope: 'WARRANT_VERIFIED_LIVE_EXECUTION',
    liveExecutionAuthorized: true,
    credentialsEnvelopeInspected: true,
    credentialsForwardedToInner: true,
    privilegedSecretsRead: true,
    privilegedSecretsInjected: true,
    privilegedRuntimeUsed: true,
    privilegedCredentialsAccessed: true,
    innerVerifierWarrantVerified: true,
    warrantVerification,
  };
  fs.writeFileSync(args.outputPath, `${JSON.stringify(updatedAttestation, null, 2)}\n`, 'utf8');

  const ephemeralDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-g2-uat-actors-'));
  fs.chmodSync(ephemeralDir, 0o700);
  const ephemeralActorsFile = path.join(ephemeralDir, 'test-actors.json');

  try {
    fs.writeFileSync(ephemeralActorsFile, JSON.stringify(credsEnvelope.actors), { mode: 0o600 });
    const runResult = spawnSync(
      process.execPath,
      ['--test', 'tests/harness/icr05a-fault-injection.test.mjs'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          SUPABASE_ACCESS_TOKEN: credsEnvelope.supabaseAccessToken,
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
