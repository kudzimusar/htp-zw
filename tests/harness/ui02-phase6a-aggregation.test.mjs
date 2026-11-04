import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  REQUIRED_PHONE_SCREENS,
  REQUIRED_TABLET_SCREENS,
  reconcileUi02NativeMatrix
} from "../../scripts/native/ui02-phase6a-aggregate.mjs";

const TEST_SHA = "b82286340df9ef7d24f0f12598ddda3150b3adc1";
const TEST_RUN_ID = "41780992206";

function createValidPngBuffer(width = 1280, height = 2400) {
  const buf = Buffer.alloc(64);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

/**
 * Helper to populate a synthetic device cell artifact directory under downloadedRoot.
 */
function writeCellArtifact(
  downloadedRoot,
  {
    dirName,
    platform,
    deviceClass,
    attempt = 1,
    candidateSha = TEST_SHA,
    workflowRunId = TEST_RUN_ID,
    artifactId = 1000 + attempt,
    jobId = 2000 + attempt,
    deviceIdentity = `${platform} ${deviceClass} test device`,
    osVersion = platform === "iOS" ? "iOS 26.5" : "16",
    nativeRuntimeErrorLineCount = 0,
    nativeErrorsLogLines = [],
    omitScreens = [],
    corruptScreenPng = null,
    corruptManifestJson = false,
    omitManifest = false,
    extraManifestPath = null
  }
) {
  const artifactName =
    dirName ??
    `ui02-phase6a-native-evidence-${platform.toLowerCase()}-${deviceClass}-attempt-${attempt}`;
  const rootDir = join(downloadedRoot, artifactName);
  const subDir = join(rootDir, `${platform.toLowerCase()}-${deviceClass}`);
  mkdirSync(subDir, { recursive: true });

  const reqScreens =
    deviceClass === "tablet" ? REQUIRED_TABLET_SCREENS : REQUIRED_PHONE_SCREENS;
  const omitSet = new Set(omitScreens);
  const screens = [];

  for (const key of reqScreens) {
    if (omitSet.has(key)) continue;
    const isLandscape = key.includes("landscape");
    const width = isLandscape ? 2560 : 1600;
    const height = isLandscape ? 1600 : 2560;
    const pngRel = `screenshots/${key}.png`;
    const pngAbs = join(subDir, pngRel);
    mkdirSync(join(subDir, "screenshots"), { recursive: true });

    let buf;
    if (corruptScreenPng === key) {
      buf = Buffer.from("CORRUPTED_NOT_A_VALID_PNG_HEADER");
    } else {
      buf = createValidPngBuffer(width, height);
    }
    writeFileSync(pngAbs, buf);
    const sha256 = createHash("sha256").update(buf).digest("hex");

    screens.push({
      candidateSha,
      workflowRunId,
      runAttempt: attempt,
      platform,
      deviceClass,
      deviceIdentity,
      osVersion,
      orientation: isLandscape ? "landscape" : "portrait",
      physicalOrientation: isLandscape ? "landscape" : "portrait",
      screenshotWidth: width,
      screenshotHeight: height,
      screen: key,
      route: "/",
      screenshotFilename: pngRel,
      sha256,
      resolvedState: "resolved",
      nativeRuntimeErrors:
        nativeRuntimeErrorLineCount > 0 ? ["Runtime Fatal Error"] : [],
      layoutSafeAreaResult: "CAPTURED",
      keyboardResult: "NOT APPLICABLE",
      appearance: "light",
      testedInteractionResult: "screen resolved and captured"
    });
  }

  const errorLogFile = join(subDir, "native-errors.log");
  writeFileSync(
    errorLogFile,
    nativeErrorsLogLines.length > 0 ? nativeErrorsLogLines.join("\n") + "\n" : ""
  );

  if (!omitManifest) {
    const manifestObj = {
      phase: "UI-02 Phase 6A Native Cross-Device Realization",
      candidateSha,
      workflowRunId,
      runAttempt: attempt,
      artifactId,
      jobId,
      platform,
      deviceClass,
      deviceIdentity,
      osVersion,
      orientation: "portrait",
      capturedAt: new Date().toISOString(),
      evidenceSource:
        "real native simulator/emulator via Maestro; no resized browser substitution",
      matrixCellDisposition: "CAPTURED — READY FOR UI MODERATOR REVIEW",
      certificationDisposition: "IMPLEMENTATION AGENT DOES NOT SELF-ACCEPT",
      screens,
      nativeRuntimeErrorLineCount,
      unavailableMatrixCells: [],
      authorityPreservation: {
        canonicalReader: "apps/mobile",
        acceptedPhase1To5ProductMutation: false,
        ag05Mutation: false,
        ag06AuthorizationMutation: false,
        premiumEntitlementMutation: false,
        advertisingOrHospazAuthorityMutation: false,
        supabaseMigrationOrRlsMutation: false,
        communicationsMutation: false,
        productionMutation: false,
        dnsMutation: false,
        pagesDeploymentCustodyMutation: false
      }
    };

    const manifestPath = join(subDir, "manifest.json");
    if (corruptManifestJson) {
      writeFileSync(manifestPath, "{ CORRUPTED_JSON_MANIFEST ");
    } else {
      writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2));
    }

    if (extraManifestPath) {
      const extraAbs = join(rootDir, extraManifestPath);
      mkdirSync(join(extraAbs, ".."), { recursive: true });
      writeFileSync(extraAbs, JSON.stringify(manifestObj, null, 2));
    }
  }

  return artifactName;
}

function createTempTestEnv() {
  const baseDir = mkdtempSync(join(tmpdir(), "ui02-agg-test-"));
  const downloadedRoot = join(baseDir, "downloaded");
  const outputDir = join(baseDir, "output");
  mkdirSync(downloadedRoot, { recursive: true });
  return {
    baseDir,
    downloadedRoot,
    outputDir,
    cleanup() {
      rmSync(baseDir, { recursive: true, force: true });
    }
  };
}

test("Scenario 1: All four cells from attempt 1 — PASS", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1, artifactId: 101, jobId: 201 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1, artifactId: 102, jobId: 202 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1, artifactId: 103, jobId: 203 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1, artifactId: 104, jobId: 204 });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1
    });

    assert.equal(res.ready, true);
    assert.equal(res.matrixBlocked, "0");
    assert.equal(readFileSync(join(env.outputDir, "matrix-blocked"), "utf8"), "0");
    assert.deepEqual(res.aggregate.sourceAttempts, [1]);
    assert.equal(res.aggregate.matrix.length, 4);
    assert.equal(res.aggregate.screenshots.length, 56);
    assert.equal(res.aggregate.selectedCells.androidPhone.sourceAttempt, 1);
    assert.equal(res.aggregate.selectedCells.androidTablet.sourceAttempt, 1);
    assert.equal(res.aggregate.selectedCells.iosPhone.sourceAttempt, 1);
    assert.equal(res.aggregate.selectedCells.iosTablet.sourceAttempt, 1);
    assert.equal(res.aggregate.programmeDisposition, "READY FOR UI MODERATOR REVIEW");
  } finally {
    env.cleanup();
  }
});

test("Scenario 2: Three valid attempt-1 cells plus one successful attempt-2 retry — PASS", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1, artifactId: 13300262966, jobId: 126429708123 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1, artifactId: 13299844628, jobId: 126429708897 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1, artifactId: 13301230604, jobId: 126429746045 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 2, artifactId: 13303755005, jobId: 126429706722 });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2
    });

    assert.equal(res.ready, true);
    assert.equal(res.matrixBlocked, "0");
    assert.deepEqual(res.aggregate.sourceAttempts, [1, 2]);
    assert.equal(res.aggregate.matrix.length, 4);
    assert.equal(res.aggregate.screenshots.length, 56);
    assert.equal(res.aggregate.selectedCells.androidPhone.sourceAttempt, 1);
    assert.equal(res.aggregate.selectedCells.androidTablet.sourceAttempt, 1);
    assert.equal(res.aggregate.selectedCells.iosTablet.sourceAttempt, 1);
    assert.equal(res.aggregate.selectedCells.iosPhone.sourceAttempt, 2);
    assert.equal(res.aggregate.selectedCells.iosPhone.artifactId, 13303755005);
    assert.equal(res.aggregate.selectedCells.iosPhone.jobId, 126429706722);
  } finally {
    env.cleanup();
  }
});

test("Scenario 3: A later successful retry supersedes an earlier failed attempt of the same cell — PASS", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1, artifactId: 13300262966, jobId: 126429708123 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1, artifactId: 13299844628, jobId: 126429708897 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1, artifactId: 13301230604, jobId: 126429746045 });
    // Attempt 1 of iOS phone failed before producing a manifest (or omitted screens)
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "phone",
      attempt: 1,
      artifactId: 13300298812,
      omitManifest: true
    });
    // Attempt 2 of iOS phone succeeded
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "phone",
      attempt: 2,
      artifactId: 13303755005,
      jobId: 126429706722
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2
    });

    assert.equal(res.ready, true);
    assert.equal(res.matrixBlocked, "0");
    assert.equal(res.aggregate.selectedCells.iosPhone.sourceAttempt, 2);
    assert.equal(res.aggregate.selectedCells.iosPhone.artifactId, 13303755005);
    // Verify failed attempt 1 was excluded and marked as superseded by attempt 2
    const excludedIosPhone1 = res.aggregate.excludedArtifacts.find(
      (e) => e.artifactRoot === "ui02-phase6a-native-evidence-ios-phone-attempt-1"
    );
    assert.ok(excludedIosPhone1, "Failed attempt-1 artifact must be recorded in excludedArtifacts");
    assert.equal(excludedIosPhone1.supersededByAttempt, 2);
    // Verify failed attempt-1 directory was NOT copied into final output
    assert.equal(
      existsSync(join(env.outputDir, "ui02-phase6a-native-evidence-ios-phone-attempt-1")),
      false
    );
    assert.equal(
      existsSync(join(env.outputDir, "ui02-phase6a-native-evidence-ios-phone-attempt-2")),
      true
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 4: A missing device artifact — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    // iOS tablet is completely missing

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("iPad: NOT CAPTURED / NOT CERTIFIED")
    );
    assert.match(res.aggregate.programmeDisposition, /^BLOCKED/);
  } finally {
    env.cleanup();
  }
});

test("Scenario 5: An invalid or corrupted artifact — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "phone",
      attempt: 1,
      corruptScreenPng: "home-light"
    });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "tablet",
      attempt: 1,
      corruptManifestJson: true
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("Android phone: NOT CAPTURED / NOT CERTIFIED")
    );
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("iPad: NOT CAPTURED / NOT CERTIFIED")
    );
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) =>
        e.reason.includes("INVALID_SCREENSHOT_home-light")
      )
    );
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) => e.reason === "MALFORMED_MANIFEST_JSON")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 6: A different commit SHA — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "tablet",
      attempt: 1,
      candidateSha: "0000000000000000000000000000000000000000"
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("iPad: NOT CAPTURED / NOT CERTIFIED")
    );
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) => e.reason === "MISMATCHED_CANDIDATE_SHA")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 7: An unrelated workflow run — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "tablet",
      attempt: 1,
      workflowRunId: "99999999999"
    });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("Android tablet: NOT CAPTURED / NOT CERTIFIED")
    );
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) => e.reason === "UNRELATED_WORKFLOW_RUN")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 8: Duplicate or conflicting device evidence without deterministic resolution — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });
    // Two separate artifacts for iOS phone at the exact same attempt number 2
    writeCellArtifact(env.downloadedRoot, {
      dirName: "ui02-phase6a-native-evidence-ios-phone-attempt-2-a",
      platform: "iOS",
      deviceClass: "phone",
      attempt: 2,
      deviceIdentity: "iPhone Air A"
    });
    writeCellArtifact(env.downloadedRoot, {
      dirName: "ui02-phase6a-native-evidence-ios-phone-attempt-2-b",
      platform: "iOS",
      deviceClass: "phone",
      attempt: 2,
      deviceIdentity: "iPhone Air B"
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(res.aggregate.duplicateMatrixCells.length > 0);
    assert.match(res.aggregate.duplicateMatrixCells[0], /iOS phone: 2 conflicting valid artifacts for attempt 2/);
  } finally {
    env.cleanup();
  }
});

test("Scenario 9: A nonzero actionable runtime-error result — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "phone",
      attempt: 1,
      nativeRuntimeErrorLineCount: 1,
      nativeErrorsLogLines: ["E ReactNativeJS: Unhandled JS Exception"]
    });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(res.aggregate.runtimeErrorCells.includes("Android phone"));
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("Android phone: NOT CAPTURED / NOT CERTIFIED")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 10: An incomplete or failed contract gate — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      jobResults: {
        contract: "failure",
        ios: "success",
        android: "success"
      }
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.equal(res.aggregate.contractGate.status, "BLOCKED");
    assert.match(res.aggregate.programmeDisposition, /^BLOCKED/);
  } finally {
    env.cleanup();
  }
});
