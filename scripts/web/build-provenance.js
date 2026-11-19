'use strict';

const SHA_40_RE = /^[0-9a-f]{40}$/i;

function normalizeSha(value, label) {
  if (value == null || String(value).trim() === '') return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!SHA_40_RE.test(trimmed)) {
    throw new Error(`INVALID_BUILD_SHA: ${label} must be a 40-character hex commit SHA (got "${String(value).slice(0, 64)}").`);
  }
  return trimmed;
}

/**
 * Resolves authoritative build provenance distinguishing:
 *  - sourceSha: exact checked-out git commit actually being built
 *  - workflowEventSha: GitHub Actions event SHA (may be a synthetic PR merge commit)
 *  - deploymentSha: Vercel-controlled deployment commit SHA
 *
 * Rules:
 *  1. Checked-out git HEAD is authoritative over GITHUB_SHA so PR synthetic merge
 *     commits never overwrite actual checked-out source provenance.
 *  2. On Vercel deployments, VERCEL_GIT_COMMIT_SHA is preserved and must agree with
 *     checked-out git HEAD if both are present (fail closed on disagreement).
 *  3. If HT_EXPECTED_BUILD_SHA is explicitly provided, the resolved source SHA must
 *     match it exactly (fail closed on mismatch).
 */
function resolveBuildProvenance({ env = process.env, gitHeadSha = null } = {}) {
  const checkedOutSha = normalizeSha(gitHeadSha, 'git HEAD');
  const deploymentSha = normalizeSha(env.VERCEL_GIT_COMMIT_SHA, 'VERCEL_GIT_COMMIT_SHA');
  const workflowEventSha = normalizeSha(env.GITHUB_SHA, 'GITHUB_SHA');
  const expectedSha = normalizeSha(env.HT_EXPECTED_BUILD_SHA, 'HT_EXPECTED_BUILD_SHA');

  if (deploymentSha && checkedOutSha && deploymentSha !== checkedOutSha) {
    throw new Error(
      `BUILD_PROVENANCE_MISMATCH: VERCEL_GIT_COMMIT_SHA (${deploymentSha}) disagrees with checked-out git HEAD (${checkedOutSha}).`
    );
  }

  const sourceSha = checkedOutSha || deploymentSha || workflowEventSha;
  if (!sourceSha) {
    throw new Error('MISSING_BUILD_SHA: unable to determine a 40-character source commit SHA from git HEAD or CI/Vercel environment.');
  }

  if (expectedSha && sourceSha !== expectedSha) {
    throw new Error(
      `BUILD_PROVENANCE_MISMATCH: resolved source SHA (${sourceSha}) does not match HT_EXPECTED_BUILD_SHA (${expectedSha}).`
    );
  }

  return {
    sha: sourceSha,
    sourceSha,
    workflowEventSha,
    deploymentSha
  };
}

module.exports = {
  SHA_40_RE,
  normalizeSha,
  resolveBuildProvenance
};
