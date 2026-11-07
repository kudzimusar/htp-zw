#!/usr/bin/env node
/**
 * HT-MVP-PUBLIC-LAUNCH-01-G2-LR01-R7
 * Reference Implementation of Owner-Controlled External Trusted Bootstrap Controller
 *
 * CUSTODY & EXECUTION BOUNDARY:
 * - Mounted in the repository (`scripts/release/owner-trusted-uat-bootstrap.mjs`) so the Independent
 *   Security Reviewer, Programme Moderator, and GitHub Actions CI can inspect its exact code and verify
 *   its SHA-256 digest and end-to-end synthetic rehearsal behavior.
 * - At runtime, this script REFUSES to execute from inside the candidate git repository (`REPO_ROOT`)
 *   (`IN_REPO_BOOTSTRAP_EXECUTION_FORBIDDEN`). It MUST be installed/staged into an external custody
 *   directory outside `REPO_ROOT` (e.g. `/opt/healthtimes-owner-custody/bin/owner-trusted-uat-bootstrap.mjs`)
 *   before execution.
 * - Performs all 10 pre-secret trust-root, candidate SHA, frozen G1 ancestry, inner-verifier SHA-256
 *   (`8b1f3fab30ab4f964500d93655b3b002d5f2a1184e8a4cf44480269002701ce5`), 7-artifact digest, Ed25519
 *   warrant signature, kernel-level atomic single-use claim & replay ledger, security-review binding,
 *   actor/effect scope, and credential-classification checks BEFORE invoking the inner candidate verifier (`run-protected-staging-uat.mjs`).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOTSTRAP_SELF_PATH = fs.realpathSync(fileURLToPath(import.meta.url));
const FROZEN_G1_BASE_SHA = '1f6a8ca4b41cb646beb6f12ecf11aee96c5973b5';
const PINNED_INNER_CANDIDATE_VERIFIER_SHA256 =
  '8b1f3fab30ab4f964500d93655b3b002d5f2a1184e8a4cf44480269002701ce5';

const ALLOWED_BRANCHES = Object.freeze([
  'release/ht-mvp-2.0-final',
  'fix/ht-g2-rbac-session-boundary',
]);

const BLOCKLISTED_CANDIDATE_EMBEDDED_KEY_SHA256_HEX =
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

const AMBIENT_SECRET_ENV_KEYS = Object.freeze([
  'SUPABASE_ACCESS_TOKEN',
  'HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN',
  'UAT_ACTORS_JSON',
  'HEALTHTIMES_UAT_ACTORS_JSON',
  'HEALTHTIMES_TEST_ACTORS_FILE',
  'HT_G2_SECURITY_DECISION',
  'HT_G2_OWNER_AUTHORIZATION',
  'HT_G2_APPROVED_SHAS',
  'HT_G2_UNIT_TEST_ALLOW_DIRTY',
  'HT_G2_SKIP_ANCESTRY_CHECK',
]);

function failClosed(code, message) {
  const payload = {
    bootstrapStatus: 'DENIED_BEFORE_SECRET_INJECTION',
    errorCode: code,
    message,
    credentialsEnvelopeInspected: false,
    credentialsForwardedToInner: false,
    privilegedSecretsRead: false,
    privilegedSecretsInjected: false,
    privilegedRuntimeUsed: false,
    liveExecutionAuthorized: false,
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
  process.exit(78);
}

function parseArgs(argv) {
  const out = {
    mode: 'rehearsal',
    repoRoot: '',
    trustRootPath: '',
    warrantPath: '',
    replayLedgerPath: '',
    credentialsFilePath: '',
    outputPath: '',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      out.mode = argv[++i];
    } else if (arg === '--repo-root' && argv[i + 1]) {
      out.repoRoot = argv[++i];
    } else if (arg === '--trust-root' && argv[i + 1]) {
      out.trustRootPath = argv[++i];
    } else if (arg === '--warrant' && argv[i + 1]) {
      out.warrantPath = argv[++i];
    } else if (arg === '--replay-ledger' && argv[i + 1]) {
      out.replayLedgerPath = argv[++i];
    } else if (arg === '--credentials-file' && argv[i + 1]) {
      out.credentialsFilePath = argv[++i];
    } else if (arg === '--output' && argv[i + 1]) {
      out.outputPath = argv[++i];
    } else {
      failClosed('UNKNOWN_BOOTSTRAP_ARGUMENT', `Unrecognized or incomplete option '${arg}'`);
    }
  }
  return out;
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

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function assertOutsideRepo(realRepoRoot, targetPath, errorCode, label) {
  const resolved = path.resolve(targetPath);
  const parentReal = fs.realpathSync(path.dirname(resolved));
  const fullReal = fs.existsSync(resolved)
    ? fs.realpathSync(resolved)
    : path.join(parentReal, path.basename(resolved));
  if (fullReal === realRepoRoot || fullReal.startsWith(`${realRepoRoot}${path.sep}`)) {
    failClosed(
      errorCode,
      `${label} ('${fullReal}') resides inside candidate repository '${realRepoRoot}' and cannot act as an external Owner-controlled trust artifact.`,
    );
  }
  return fullReal;
}

function computeSpkiFingerprints(publicKeyPem) {
  try {
    const keyObj = crypto.createPublicKey(publicKeyPem);
    if (keyObj.asymmetricKeyType !== 'ed25519') {
      failClosed(
        'UNSUPPORTED_KEY_ALGORITHM',
        `Expected Ed25519 public key, got '${keyObj.asymmetricKeyType}'`,
      );
    }
    const spkiDer = keyObj.export({ type: 'spki', format: 'der' });
    const hex = crypto.createHash('sha256').update(spkiDer).digest('hex');
    const b64 = `SHA256:${crypto.createHash('sha256').update(spkiDer).digest('base64').replace(/=+$/, '')}`;
    return { hex, b64 };
  } catch (err) {
    failClosed('INVALID_TRUST_ROOT_PUBLIC_KEY', `Failed to parse Ed25519 public key: ${err.message}`);
  }
}

function git(repoRoot, args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function claimWarrantExclusively(realReplayLedgerPath, warrantId, metadata = {}) {
  const ledgerDir = path.dirname(realReplayLedgerPath);
  const claimsDir = path.join(ledgerDir, 'warrant-claims');
  fs.mkdirSync(claimsDir, { recursive: true });

  const claimPath = path.join(claimsDir, `${warrantId}.claim`);

  let claimFd;
  try {
    claimFd = fs.openSync(claimPath, 'wx');
  } catch (err) {
    if (err.code === 'EEXIST') {
      failClosed(
        'REPLAYED_WARRANT_ID',
        `Warrant '${warrantId}' has already been claimed or consumed and cannot be replayed.`,
      );
    }
    throw err;
  }

  try {
    const claimRecord = {
      warrantId,
      claimedAt: new Date().toISOString(),
      pid: process.pid,
      ...metadata,
    };
    fs.writeFileSync(claimFd, `${JSON.stringify(claimRecord, null, 2)}\n`, 'utf8');
  } finally {
    fs.closeSync(claimFd);
  }

  const lockDir = path.join(ledgerDir, 'replay-ledger.lock');
  let acquiredLock = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      fs.mkdirSync(lockDir);
      acquiredLock = true;
      break;
    } catch (err) {
      if (err.code === 'EEXIST') {
        const sleepMs = 20;
        const waitUntil = Date.now() + sleepMs;
        while (Date.now() < waitUntil) {
          // busy wait
        }
      } else {
        throw err;
      }
    }
  }

  try {
    let replayLedger = { consumedWarrantIds: [] };
    if (fs.existsSync(realReplayLedgerPath)) {
      try {
        replayLedger = JSON.parse(fs.readFileSync(realReplayLedgerPath, 'utf8'));
      } catch {
        replayLedger = { consumedWarrantIds: [] };
      }
    }
    if (!Array.isArray(replayLedger.consumedWarrantIds)) {
      replayLedger.consumedWarrantIds = [];
    }
    if (replayLedger.consumedWarrantIds.includes(warrantId)) {
      failClosed(
        'REPLAYED_WARRANT_ID',
        `Warrant '${warrantId}' has already been consumed and cannot be replayed.`,
      );
    }
    replayLedger.consumedWarrantIds.push(warrantId);
    const tmpLedgerPath = `${realReplayLedgerPath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmpLedgerPath, `${JSON.stringify(replayLedger, null, 2)}\n`, 'utf8');
    fs.renameSync(tmpLedgerPath, realReplayLedgerPath);
  } finally {
    if (acquiredLock) {
      try {
        fs.rmdirSync(lockDir);
      } catch {
        // ignore lock release error
      }
    }
  }
}

function main() {
  // 1. Strip ambient privileged environment variables before touching anything
  const strippedEnvKeys = [];
  for (const k of AMBIENT_SECRET_ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(process.env, k)) {
      strippedEnvKeys.push(k);
      delete process.env[k];
    }
  }

  const args = parseArgs(process.argv);
  if (args.mode !== 'rehearsal' && args.mode !== 'live') {
    failClosed(
      'UNSUPPORTED_BOOTSTRAP_MODE',
      `Mode must be 'rehearsal' or 'live' (got '${args.mode}')`,
    );
  }
  if (
    !args.repoRoot ||
    !args.trustRootPath ||
    !args.warrantPath ||
    !args.replayLedgerPath ||
    !args.credentialsFilePath
  ) {
    failClosed(
      'MISSING_REQUIRED_BOOTSTRAP_ARGS',
      'Required arguments: --repo-root, --trust-root, --warrant, --replay-ledger, --credentials-file',
    );
  }

  const realRepoRoot = fs.realpathSync(path.resolve(args.repoRoot));

  // 2. Enforce that the running bootstrap executable and all control files reside OUTSIDE REPO_ROOT
  assertOutsideRepo(
    realRepoRoot,
    BOOTSTRAP_SELF_PATH,
    'IN_REPO_BOOTSTRAP_EXECUTION_FORBIDDEN',
    'Bootstrap executable',
  );
  const realTrustRootPath = assertOutsideRepo(
    realRepoRoot,
    args.trustRootPath,
    'IN_REPO_TRUST_ARTIFACT_FORBIDDEN',
    'Trust root file',
  );
  const realWarrantPath = assertOutsideRepo(
    realRepoRoot,
    args.warrantPath,
    'IN_REPO_TRUST_ARTIFACT_FORBIDDEN',
    'Signed warrant file',
  );
  const realReplayLedgerPath = assertOutsideRepo(
    realRepoRoot,
    args.replayLedgerPath,
    'IN_REPO_TRUST_ARTIFACT_FORBIDDEN',
    'Replay ledger file',
  );
  const realCredentialsPath = assertOutsideRepo(
    realRepoRoot,
    args.credentialsFilePath,
    'IN_REPO_TRUST_ARTIFACT_FORBIDDEN',
    'Credentials file',
  );

  if (!fs.existsSync(realTrustRootPath)) {
    failClosed('MISSING_TRUST_ROOT_FILE', `Trust root file not found: ${realTrustRootPath}`);
  }
  if (!fs.existsSync(realWarrantPath)) {
    failClosed('MISSING_WARRANT_FILE', `Warrant file not found: ${realWarrantPath}`);
  }
  if (!fs.existsSync(realCredentialsPath)) {
    failClosed('MISSING_CREDENTIALS_FILE', `Credentials file not found: ${realCredentialsPath}`);
  }

  const trustRoot = JSON.parse(fs.readFileSync(realTrustRootPath, 'utf8'));
  const warrant = JSON.parse(fs.readFileSync(realWarrantPath, 'utf8'));

  // 3. Verify external Trust Root public key fingerprint & reject historical placeholder key
  const keyFp = computeSpkiFingerprints(trustRoot.ownerEd25519PublicKeyPem || '');
  if (keyFp.hex === BLOCKLISTED_CANDIDATE_EMBEDDED_KEY_SHA256_HEX) {
    failClosed(
      'UNVERIFIED_CANDIDATE_PLACEHOLDER_KEY_FORBIDDEN',
      `Public key ${keyFp.b64} is the historical candidate placeholder key and has no established Owner private signing key.`,
    );
  }
  if (
    trustRoot.expectedPublicKeyFingerprintSha256Hex !== keyFp.hex ||
    trustRoot.expectedPublicKeyFingerprintSha256B64 !== keyFp.b64
  ) {
    failClosed(
      'MISMATCHED_TRUST_ROOT_KEY_FINGERPRINT',
      `Public key fingerprint (${keyFp.b64} / ${keyFp.hex}) does not match pinned trust-root fingerprint.`,
    );
  }

  if (args.mode === 'rehearsal') {
    if (trustRoot.keyClassification !== 'NON_PRODUCTION_FIXTURE_REHEARSAL_ONLY') {
      failClosed(
        'INVALID_REHEARSAL_KEY_CLASSIFICATION',
        'Rehearsal mode requires keyClassification=NON_PRODUCTION_FIXTURE_REHEARSAL_ONLY.',
      );
    }
  } else if (args.mode === 'live') {
    if (
      trustRoot.keyClassification !== 'OWNER_OFFLINE_PRODUCTION_AUTHORITY' ||
      !trustRoot.provenanceCeremonyId ||
      !trustRoot.outOfBandVerificationRef
    ) {
      failClosed(
        'TEST_FIXTURE_KEY_FORBIDDEN_IN_LIVE_MODE',
        'Live mode requires an out-of-band verified Owner authority key (OWNER_OFFLINE_PRODUCTION_AUTHORITY). Test fixtures never qualify as production Owner authority.',
      );
    }
  }

  // 4. Verify candidate git checkout state, exact SHA, G1 ancestry, and branch BEFORE invoking candidate code
  const dirtyStatus = git(realRepoRoot, ['status', '--porcelain', '--untracked-files=no']);
  if (dirtyStatus.length > 0) {
    failClosed(
      'CANDIDATE_DIRTY_WORKING_TREE',
      `Candidate repo has uncommitted modifications:\n${dirtyStatus}`,
    );
  }

  const actualHeadSha = git(realRepoRoot, ['rev-parse', 'HEAD']);
  if (actualHeadSha !== trustRoot.approvedHeadSha) {
    failClosed(
      'WRONG_CANDIDATE_SHA',
      `Candidate HEAD (${actualHeadSha}) does not match trust-root approvedHeadSha (${trustRoot.approvedHeadSha}).`,
    );
  }

  try {
    execFileSync('git', ['merge-base', '--is-ancestor', FROZEN_G1_BASE_SHA, actualHeadSha], {
      cwd: realRepoRoot,
      stdio: 'pipe',
    });
  } catch {
    failClosed(
      'UNVERIFIED_G1_ANCESTRY',
      `Candidate HEAD ${actualHeadSha} does not descend from frozen G1 SHA ${FROZEN_G1_BASE_SHA}.`,
    );
  }

  let candidateBranch = '';
  try {
    candidateBranch = git(realRepoRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  } catch {
    candidateBranch = '';
  }
  if (!ALLOWED_BRANCHES.includes(candidateBranch)) {
    failClosed(
      'UNAPPROVED_CANDIDATE_BRANCH',
      `Candidate branch '${candidateBranch || 'DETACHED_HEAD'}' is not in ALLOWED_BRANCHES.`,
    );
  }

  // 5. Verify inner candidate verifier executable SHA-256 BEFORE invoking it
  const candidateVerifierRelPath = 'scripts/release/run-protected-staging-uat.mjs';
  const candidateVerifierAbsPath = path.join(realRepoRoot, candidateVerifierRelPath);
  if (!fs.existsSync(candidateVerifierAbsPath)) {
    failClosed('MISSING_CANDIDATE_VERIFIER', `${candidateVerifierRelPath} does not exist.`);
  }
  const actualVerifierSha256 = sha256File(candidateVerifierAbsPath);
  if (
    actualVerifierSha256 !== PINNED_INNER_CANDIDATE_VERIFIER_SHA256 ||
    trustRoot.pinnedCandidateVerifierSha256 !== PINNED_INNER_CANDIDATE_VERIFIER_SHA256
  ) {
    failClosed(
      'ALTERED_CANDIDATE_VERIFIER_DIGEST',
      `Candidate verifier ${candidateVerifierRelPath} digest (${actualVerifierSha256}) diverges from pinned digest (${PINNED_INNER_CANDIDATE_VERIFIER_SHA256}).`,
    );
  }

  // 6. Verify detached Ed25519 signature over external warrant payload using external Trust Root public key
  const payload = warrant?.payload;
  const sigB64 = warrant?.ed25519SignatureBase64;
  if (!payload || typeof payload !== 'object' || typeof sigB64 !== 'string' || !sigB64) {
    failClosed(
      'INVALID_WARRANT_STRUCTURE',
      'Warrant must contain { payload, ed25519SignatureBase64 }.',
    );
  }

  const canonicalBytes = Buffer.from(canonicalizeJson(payload), 'utf8');
  let sigValid = false;
  try {
    sigValid = crypto.verify(
      null,
      canonicalBytes,
      trustRoot.ownerEd25519PublicKeyPem,
      Buffer.from(sigB64, 'base64'),
    );
  } catch {
    sigValid = false;
  }
  if (!sigValid) {
    failClosed(
      'FORGED_OR_MISMATCHED_WARRANT_SIGNATURE',
      'Ed25519 signature verification failed against external Trust Root public key.',
    );
  }

  if (payload.ownerPublicKeyFingerprintSha256B64 !== keyFp.b64) {
    failClosed(
      'WARRANT_KEY_FINGERPRINT_MISMATCH',
      `Warrant key fingerprint (${payload.ownerPublicKeyFingerprintSha256B64}) != trust-root fingerprint (${keyFp.b64}).`,
    );
  }

  // 7. Verify warrant bindings: SHA, G1 base, branch, candidate verifier digest, and all artifact digests
  if (payload.approvedHeadSha !== actualHeadSha) {
    failClosed(
      'WARRANT_SHA_MISMATCH',
      `Warrant approvedHeadSha (${payload.approvedHeadSha}) != candidate HEAD (${actualHeadSha}).`,
    );
  }
  if (payload.frozenG1BaseSha !== FROZEN_G1_BASE_SHA) {
    failClosed(
      'WARRANT_G1_BASE_MISMATCH',
      `Warrant frozenG1BaseSha (${payload.frozenG1BaseSha}) != ${FROZEN_G1_BASE_SHA}.`,
    );
  }
  if (payload.approvedBranch !== candidateBranch) {
    failClosed(
      'WARRANT_BRANCH_MISMATCH',
      `Warrant approvedBranch (${payload.approvedBranch}) != candidate branch (${candidateBranch}).`,
    );
  }
  if (payload.approvedCandidateVerifierSha256 !== actualVerifierSha256) {
    failClosed(
      'WARRANT_VERIFIER_DIGEST_MISMATCH',
      `Warrant approvedCandidateVerifierSha256 (${payload.approvedCandidateVerifierSha256}) != disk digest (${actualVerifierSha256}).`,
    );
  }

  const pinnedDigests = trustRoot.pinnedArtifactDigests || {};
  const warrantDigests = payload.artifactDigests || {};
  const verifiedDiskDigests = {};
  for (const [relPath, expectedDigest] of Object.entries(pinnedDigests)) {
    const absPath = path.join(realRepoRoot, relPath);
    if (!fs.existsSync(absPath)) {
      failClosed('MISSING_PINNED_ARTIFACT', `Pinned artifact missing on disk: ${relPath}`);
    }
    const diskDigest = sha256File(absPath);
    if (diskDigest !== expectedDigest || warrantDigests[relPath] !== expectedDigest) {
      failClosed(
        'CANDIDATE_ARTIFACT_DIGEST_MISMATCH',
        `Digest mismatch for ${relPath}: disk=${diskDigest}, trustRoot=${expectedDigest}, warrant=${warrantDigests[relPath]}`,
      );
    }
    verifiedDiskDigests[relPath] = diskDigest;
  }

  // 8. Verify warrant freshness, expiration window, single-use replay ledger, and staging project
  if (!payload.warrantId || typeof payload.warrantId !== 'string' || payload.warrantId.length < 12) {
    failClosed('INVALID_WARRANT_ID', 'Warrant requires a unique warrantId (>= 12 chars).');
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
    failClosed(
      'EXPIRED_OR_INVALID_WARRANT_WINDOW',
      `Warrant timestamp window invalid or expired (issuedAt=${payload.issuedAt}, expiresAt=${payload.expiresAt}).`,
    );
  }

  const claimsDir = path.join(path.dirname(realReplayLedgerPath), 'warrant-claims');
  const claimPath = path.join(claimsDir, `${payload.warrantId}.claim`);
  if (fs.existsSync(claimPath)) {
    failClosed(
      'REPLAYED_WARRANT_ID',
      `Warrant '${payload.warrantId}' has already been claimed and cannot be replayed.`,
    );
  }

  let replayLedger = { consumedWarrantIds: [] };
  if (fs.existsSync(realReplayLedgerPath)) {
    try {
      replayLedger = JSON.parse(fs.readFileSync(realReplayLedgerPath, 'utf8'));
    } catch {
      replayLedger = { consumedWarrantIds: [] };
    }
  }
  if (Array.isArray(replayLedger.consumedWarrantIds) && replayLedger.consumedWarrantIds.includes(payload.warrantId)) {
    failClosed(
      'REPLAYED_WARRANT_ID',
      `Warrant '${payload.warrantId}' has already been consumed and cannot be replayed.`,
    );
  }

  if (payload.stagingProjectRef !== 'bzuvntbkevvuhfhqhkua') {
    failClosed(
      'WRONG_STAGING_PROJECT_REF',
      `Warrant stagingProjectRef '${payload.stagingProjectRef}' != 'bzuvntbkevvuhfhqhkua'.`,
    );
  }

  // 9. Verify Independent Security Reviewer signoff bound to exact HEAD SHA
  const sec = payload.independentSecurityReview || {};
  if (sec.decision !== 'SECURITY_ACCEPT_G2_SOURCE_ONLY') {
    failClosed(
      'MISSING_QUALIFIED_SECURITY_DECISION',
      `Expected SECURITY_ACCEPT_G2_SOURCE_ONLY, got '${sec.decision || '<empty>'}'.`,
    );
  }
  if (sec.reviewedSha !== actualHeadSha) {
    failClosed(
      'SECURITY_REVIEW_SHA_MISMATCH',
      `Security review SHA (${sec.reviewedSha}) != candidate HEAD (${actualHeadSha}).`,
    );
  }
  if (
    typeof sec.reviewerLogin !== 'string' ||
    !sec.reviewerLogin ||
    sec.reviewerLogin === 'kudzimusar' ||
    sec.reviewerLogin.startsWith('@') ||
    sec.reviewerLogin === 'sec-arch-independent'
  ) {
    failClosed(
      'INVALID_SECURITY_REVIEWER_IDENTITY',
      `Reviewer login '${sec.reviewerLogin}' is not a valid independent GitHub account.`,
    );
  }
  if (
    !/^https:\/\/github\.com\/kudzimusar\/htp-zw\/pull\/153#pullrequestreview-\d+$/.test(
      sec.reviewUrl || '',
    )
  ) {
    failClosed(
      'INVALID_SECURITY_REVIEW_EVIDENCE_LINK',
      `Invalid GitHub PR review URL: '${sec.reviewUrl || '<empty>'}'.`,
    );
  }

  // 10. Verify Owner execution scope (required actor roles & bounded session-only effects)
  const ownerAuth = payload.ownerExecutionAuthorization || {};
  if (ownerAuth.granted !== true) {
    failClosed('MISSING_OWNER_EXECUTION_GRANT', 'ownerExecutionAuthorization.granted must be true.');
  }
  const actors = Array.isArray(ownerAuth.allowedTargetActors) ? ownerAuth.allowedTargetActors : [];
  for (const requiredRole of REQUIRED_ACTOR_ROLES) {
    if (!actors.includes(requiredRole)) {
      failClosed(
        'INCOMPLETE_TARGET_ACTOR_SCOPE',
        `Warrant allowedTargetActors is missing required UAT role '${requiredRole}'.`,
      );
    }
  }
  const effects = Array.isArray(ownerAuth.allowedSessionOnlyEffects)
    ? ownerAuth.allowedSessionOnlyEffects
    : [];
  if (effects.length === 0) {
    failClosed('EMPTY_WARRANT_EFFECT_SCOPE', 'allowedSessionOnlyEffects must not be empty.');
  }
  for (const eff of effects) {
    if (!ALLOWED_SESSION_EFFECTS.includes(eff)) {
      failClosed(
        'PROHIBITED_WARRANT_EFFECT_SCOPE',
        `Effect '${eff}' is outside bounded session-only UAT scope.`,
      );
    }
  }

  // 11. Pre-verify credentials envelope classification and required actors BEFORE invoking inner candidate verifier
  const credsEnvelope = JSON.parse(fs.readFileSync(realCredentialsPath, 'utf8'));
  if (args.mode === 'live') {
    if (credsEnvelope.credentialClassification !== 'PRODUCTION_OWNER_STAGING_VAULT') {
      failClosed(
        'SYNTHETIC_CREDENTIALS_FORBIDDEN_IN_LIVE_MODE',
        `--mode live requires credentialClassification='PRODUCTION_OWNER_STAGING_VAULT' (got '${credsEnvelope.credentialClassification}').`,
      );
    }
  } else if (args.mode === 'rehearsal') {
    if (credsEnvelope.credentialClassification !== 'DISPOSABLE_SYNTHETIC_REHEARSAL_ONLY') {
      failClosed(
        'LIVE_CREDENTIALS_FORBIDDEN_IN_REHEARSAL',
        `--mode rehearsal requires credentialClassification='DISPOSABLE_SYNTHETIC_REHEARSAL_ONLY' (got '${credsEnvelope.credentialClassification}').`,
      );
    }
  }

  const requiredCredKeys = [
    'reporter',
    'editor_in_chief',
    'section_editor',
    'moderator',
    'uat-specialist@healthtimes.test',
    'uat-commercial@healthtimes.test',
  ];
  for (const key of requiredCredKeys) {
    const actor = credsEnvelope.actors?.[key];
    if (
      !actor ||
      typeof actor.email !== 'string' ||
      !actor.email.includes('@') ||
      typeof actor.password !== 'string' ||
      actor.password.length < 8
    ) {
      failClosed(
        'INVALID_SYNTHETIC_ACTOR_CREDENTIALS',
        `Credentials envelope is missing valid entry for required UAT identity '${key}'.`,
      );
    }
  }

  // Atomically claim warrantId in external warrant-claims store and update replay ledger before invoking candidate script
  claimWarrantExclusively(realReplayLedgerPath, payload.warrantId, {
    mode: args.mode,
    approvedHeadSha: actualHeadSha,
  });

  const sanitizedEnv = { ...process.env };
  for (const k of AMBIENT_SECRET_ENV_KEYS) {
    delete sanitizedEnv[k];
  }

  const innerAttestationFile = path.join(
    os.tmpdir(),
    `ht-g2-inner-attestation-${payload.warrantId}.json`,
  );
  const innerMode = args.mode === 'rehearsal' ? 'synthetic-live-rehearsal' : 'live';

  const candidateRun = spawnSync(
    process.execPath,
    [
      candidateVerifierAbsPath,
      '--mode',
      innerMode,
      '--expected-sha',
      actualHeadSha,
      '--owner-trust-root',
      realTrustRootPath,
      '--policy-warrant',
      realWarrantPath,
      '--credentials-file',
      realCredentialsPath,
      '--output',
      innerAttestationFile,
    ],
    {
      cwd: realRepoRoot,
      env: sanitizedEnv,
      encoding: 'utf8',
    },
  );

  if (candidateRun.status !== 0) {
    failClosed(
      'INNER_CANDIDATE_VERIFIER_REJECTED',
      `Inner candidate verifier (${innerMode}) exited ${candidateRun.status}: ${candidateRun.stderr || candidateRun.stdout}`,
    );
  }

  const innerAttestation = JSON.parse(fs.readFileSync(innerAttestationFile, 'utf8'));
  fs.rmSync(innerAttestationFile, { force: true });

  const isLive = args.mode === 'live';
  const report = {
    bootstrapStatus:
      args.mode === 'rehearsal'
        ? 'OUTER_TO_INNER_SYNTHETIC_REHEARSAL_VERIFIED_NO_LIVE_AUTHORITY'
        : 'LIVE_OUTER_AND_INNER_VERIFIED',
    mode: args.mode,
    innerMode,
    verifiedAt: new Date().toISOString(),
    bootstrapExecutablePath: BOOTSTRAP_SELF_PATH,
    bootstrapExecutableSha256: sha256File(BOOTSTRAP_SELF_PATH),
    candidateRepoRoot: realRepoRoot,
    verifiedCandidateHeadSha: actualHeadSha,
    verifiedFrozenG1BaseSha: FROZEN_G1_BASE_SHA,
    verifiedCandidateBranch: candidateBranch,
    verifiedCandidateVerifierSha256: actualVerifierSha256,
    outerBootstrapVerified: true,
    innerVerifierWarrantVerified: innerAttestation.innerVerifierWarrantVerified === true,
    innerVerifierAttestationScope: innerAttestation.attestationScope,
    trustRootKeyClassification: trustRoot.keyClassification,
    trustRootPublicKeyFingerprintSha256B64: keyFp.b64,
    trustRootPublicKeyFingerprintSha256Hex: keyFp.hex,
    consumedWarrantId: payload.warrantId,
    independentSecurityReview: sec,
    allowedTargetActors: actors,
    allowedSessionOnlyEffects: effects,
    strippedAmbientEnvKeys: strippedEnvKeys,
    credentialsEnvelopeInspected: true,
    credentialsForwardedToInner: true,
    privilegedSecretsRead: isLive,
    privilegedSecretsInjected: isLive,
    privilegedRuntimeUsed: isLive,
    liveExecutionAuthorized: isLive,
    verifiedArtifactDigests: verifiedDiskDigests,
  };

  if (args.outputPath) {
    fs.writeFileSync(path.resolve(args.outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
