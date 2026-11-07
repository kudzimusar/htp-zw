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
import { crc32, deflateSync } from "node:zlib";
import {
  REQUIRED_PHONE_SCREENS,
  REQUIRED_TABLET_SCREENS,
  reconcileUi02NativeMatrix
} from "../../scripts/native/ui02-phase6a-aggregate.mjs";

const TEST_SHA = "9c4a11618733a4d4b5f7dc9baa323fdd855aaef7";
const TEST_RUN_ID = "41812008951";

const pngCache = new Map();

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcVal = crc32(Buffer.concat([typeBuf, data])) >>> 0;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Generates a complete, valid PNG with CRC32-verified chunks and a valid zlib-compressed IDAT stream.
 */
function createValidPngBuffer(width = 64, height = 128) {
  const key = `${width}x${height}`;
  if (pngCache.has(key)) return pngCache.get(key);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bitDepth = 8
  ihdr.writeUInt8(2, 9); // colorType = 2 (RGB, 3 channels)
  ihdr.writeUInt8(0, 10); // compression = 0
  ihdr.writeUInt8(0, 11); // filter = 0
  ihdr.writeUInt8(0, 12); // interlace = 0

  const rowBytes = 1 + width * 3;
  const rawScanlines = Buffer.alloc(height * rowBytes, 0x2a);
  for (let y = 0; y < height; y++) {
    rawScanlines[y * rowBytes] = 0; // filter type 0 (None)
  }
  const compressed = deflateSync(rawScanlines, { level: 0 });

  const fullPng = Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
  pngCache.set(key, fullPng);
  return fullPng;
}

function writeCellArtifact(
  downloadedRoot,
  {
    dirName,
    platform,
    deviceClass,
    attempt = 1,
    candidateSha = TEST_SHA,
    workflowRunId = TEST_RUN_ID,
    deviceIdentity = `${platform} ${deviceClass} test device`,
    osVersion = platform === "iOS" ? "iOS 26.5" : "16",
    nativeRuntimeErrorLineCount = 0,
    nativeErrorsLogLines = [],
    omitScreens = [],
    corruptScreenPng = null,
    corruptPngIdat = null,
    corruptManifestJson = false,
    omitManifest = false,
    includeMaestroInternalManifest = true,
    extraManifestPath = null,
    selfDeclaredArtifactId = undefined,
    selfDeclaredJobId = undefined
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
    const width = isLandscape ? 160 : 100;
    const height = isLandscape ? 100 : 160;
    const pngRel = `screenshots/${key}.png`;
    const pngAbs = join(subDir, pngRel);
    mkdirSync(join(subDir, "screenshots"), { recursive: true });

    let buf;
    if (corruptScreenPng === key) {
      buf = Buffer.from("CORRUPTED_NOT_A_VALID_PNG_HEADER");
    } else if (corruptPngIdat === key) {
      const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(width, 0);
      ihdr.writeUInt32BE(height, 4);
      ihdr.writeUInt8(8, 8);
      ihdr.writeUInt8(2, 9);
      ihdr.writeUInt8(0, 10);
      ihdr.writeUInt8(0, 11);
      ihdr.writeUInt8(0, 12);
      buf = Buffer.concat([
        signature,
        makeChunk("IHDR", ihdr),
        makeChunk("IDAT", Buffer.from("NOT_VALID_ZLIB_DEFLATE_STREAM")),
        makeChunk("IEND", Buffer.alloc(0))
      ]);
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

  // Simulate Maestro's internal CLI runner manifest inside <timestamp>/ui02-phase6a-(phone|tablet)/manifest.json
  if (includeMaestroInternalManifest) {
    const maestroInternalDir = join(
      subDir,
      "2026-11-04_101500",
      `ui02-phase6a-${deviceClass}`
    );
    mkdirSync(maestroInternalDir, { recursive: true });
    writeFileSync(
      join(maestroInternalDir, "manifest.json"),
      JSON.stringify(
        {
          $schema:
            "https://storage.googleapis.com/maestro-schemas/artifact-manifest/v1.schema.json",
          entries: [
            {
              kind: "TAKE_SCREENSHOT",
              format: "PNG",
              relativePath: "takeScreenshot",
              count: screens.length
            }
          ]
        },
        null,
        2
      )
    );
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
      ...(selfDeclaredArtifactId !== undefined
        ? { artifactId: selfDeclaredArtifactId }
        : {}),
      ...(selfDeclaredJobId !== undefined ? { jobId: selfDeclaredJobId } : {}),
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

function buildAuthoritativeApiMetadata({
  runId = Number(TEST_RUN_ID),
  headSha = TEST_SHA,
  cells = [
    {
      name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
      artifactId: 13313414537,
      jobId: 126513302194,
      jobName: "Android phone real emulator evidence",
      attempt: 1,
      conclusion: "success"
    },
    {
      name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
      artifactId: 13313867886,
      jobId: 126513301244,
      jobName: "Android tablet real emulator evidence",
      attempt: 1,
      conclusion: "success"
    },
    {
      name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
      artifactId: 13314188557,
      jobId: 126513301621,
      jobName: "iOS phone real simulator evidence",
      attempt: 1,
      conclusion: "success"
    },
    {
      name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
      artifactId: 13314372723,
      jobId: 126513303346,
      jobName: "iOS tablet real simulator evidence",
      attempt: 1,
      conclusion: "success"
    }
  ],
  contractJob = {
    id: 126513301657,
    name: "Phase 6A contract + frozen Reader regressions",
    run_attempt: 1,
    conclusion: "success"
  }
} = {}) {
  const artifacts = cells
    .filter((c) => c.includeArtifact !== false)
    .map((c) => ({
      id: c.artifactId,
      name: c.name,
      expired: false,
      workflow_run: {
        id: c.artifactRunId ?? runId,
        head_sha: c.artifactHeadSha ?? headSha
      }
    }));

  const jobs = [
    ...(contractJob ? [contractJob] : []),
    ...cells
      .filter((c) => c.includeJob !== false)
      .map((c) => ({
        id: c.jobId,
        run_id: c.jobRunId ?? runId,
        head_sha: c.jobHeadSha ?? headSha,
        name: c.jobName,
        run_attempt: c.jobAttempt ?? c.attempt,
        conclusion: c.conclusion ?? "success"
      }))
  ];

  return {
    artifactsApiData: { ok: true, total_count: artifacts.length, artifacts },
    jobsApiData: { ok: true, total_count: jobs.length, jobs }
  };
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

test("Scenario 1: All four cells from attempt 1 (with Maestro internal $schema manifests present) — PASS", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, true);
    assert.equal(res.matrixBlocked, "0");
    assert.equal(readFileSync(join(env.outputDir, "matrix-blocked"), "utf8"), "0");
    assert.deepEqual(res.aggregate.sourceAttempts, [1]);
    assert.equal(res.aggregate.matrix.length, 4);
    assert.equal(res.aggregate.screenshots.length, 56);
    assert.equal(res.aggregate.selectedCells.androidPhone.artifactId, 13313414537);
    assert.equal(res.aggregate.selectedCells.androidPhone.jobId, 126513302194);
    assert.equal(
      res.aggregate.selectedCells.androidPhone.independentVisualReviewStatus,
      "PENDING_NON_AUTHOR_REVIEW"
    );
    assert.equal(res.aggregate.programmeDisposition, "READY FOR UI MODERATOR REVIEW");
  } finally {
    env.cleanup();
  }
});

test("Scenario 2: Three valid attempt-1 cells plus one successful attempt-2 retry — PASS", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 2 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13300262966,
          jobId: 126429708123,
          jobName: "Android phone real emulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13299844628,
          jobId: 126429708897,
          jobName: "Android tablet real emulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13301230604,
          jobId: 126429746045,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-2",
          artifactId: 13303755005,
          jobId: 126429706722,
          jobName: "iOS phone real simulator evidence",
          attempt: 2,
          conclusion: "success"
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, true);
    assert.equal(res.matrixBlocked, "0");
    assert.deepEqual(res.aggregate.sourceAttempts, [1, 2]);
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
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "phone",
      attempt: 1,
      omitManifest: true
    });
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "phone",
      attempt: 2
    });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13300262966,
          jobId: 126429708123,
          jobName: "Android phone real emulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13299844628,
          jobId: 126429708897,
          jobName: "Android tablet real emulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13301230604,
          jobId: 126429746045,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13300298812,
          jobId: 126412650001,
          jobName: "iOS phone real simulator evidence",
          attempt: 1,
          conclusion: "failure"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-2",
          artifactId: 13303755005,
          jobId: 126429706722,
          jobName: "iOS phone real simulator evidence",
          attempt: 2,
          conclusion: "success"
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, true);
    assert.equal(res.matrixBlocked, "0");
    assert.equal(res.aggregate.selectedCells.iosPhone.sourceAttempt, 2);
    assert.equal(res.aggregate.selectedCells.iosPhone.artifactId, 13303755005);
    const excludedIosPhone1 = res.aggregate.excludedArtifacts.find(
      (e) => e.artifactRoot === "ui02-phase6a-native-evidence-ios-phone-attempt-1"
    );
    assert.ok(excludedIosPhone1);
    assert.equal(excludedIosPhone1.supersededByAttempt, 2);
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

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.unavailableMatrixCells.includes("iPad: NOT CAPTURED / NOT CERTIFIED")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 5: An invalid or corrupted artifact (corrupt PNG header, corrupt IDAT deflate stream, or malformed JSON) — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "phone",
      attempt: 1,
      corruptScreenPng: "home-light"
    });
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "tablet",
      attempt: 1,
      corruptPngIdat: "tablet-home"
    });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, {
      platform: "iOS",
      deviceClass: "tablet",
      attempt: 1,
      corruptManifestJson: true
    });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) =>
        e.reason.includes("INVALID_SCREENSHOT_home-light:INVALID_PNG_SIGNATURE")
      )
    );
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) =>
        e.reason.includes("INVALID_SCREENSHOT_tablet-home:INVALID_PNG_IDAT_DEFLATE_STREAM")
      )
    );
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) => e.reason === "MALFORMED_MANIFEST_JSON")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 6: A different commit SHA in manifest — BLOCK", () => {
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

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) => e.reason === "MISMATCHED_CANDIDATE_SHA")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 7: An unrelated workflow run in manifest — BLOCK", () => {
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

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
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

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 101,
          jobId: 201,
          jobName: "Android phone real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 102,
          jobId: 202,
          jobName: "Android tablet real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 103,
          jobId: 203,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-2-a",
          artifactId: 104,
          jobId: 204,
          jobName: "iOS phone real simulator evidence",
          attempt: 2
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-2-b",
          artifactId: 105,
          jobId: 204,
          jobName: "iOS phone real simulator evidence",
          attempt: 2
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(res.aggregate.duplicateMatrixCells.length > 0);
    assert.match(
      res.aggregate.duplicateMatrixCells[0],
      /iOS phone: 2 conflicting valid artifacts for attempt 2/
    );
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

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(res.aggregate.runtimeErrorCells.includes("Android phone"));
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

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
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
      },
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.equal(res.aggregate.contractGate.status, "BLOCKED");
  } finally {
    env.cleanup();
  }
});

test("Scenario 11: GitHub artifact metadata API unavailable — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData: { ok: false, error: "HTTP_403_Forbidden_ON_artifacts_PAGE_1", artifacts: [] },
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.match(
      res.aggregate.apiProvenanceStatus,
      /BLOCKED:GITHUB_ARTIFACTS_METADATA_API_UNAVAILABLE:HTTP_403_Forbidden_ON_artifacts_PAGE_1/
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 12: GitHub jobs metadata API unavailable — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData: { ok: false, error: "HTTP_500_Internal_Error_ON_jobs_PAGE_1", jobs: [] }
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.match(
      res.aggregate.apiProvenanceStatus,
      /BLOCKED:GITHUB_JOBS_METADATA_API_UNAVAILABLE:HTTP_500_Internal_Error_ON_jobs_PAGE_1/
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 13: Missing artifactId in GitHub API (even when manifest self-declares artifactId) — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "phone",
      attempt: 1,
      selfDeclaredArtifactId: 999999
    });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: null,
          includeArtifact: false,
          jobId: 126513302194,
          jobName: "Android phone real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13313867886,
          jobId: 126513301244,
          jobName: "Android tablet real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13314188557,
          jobId: 126513301621,
          jobName: "iOS phone real simulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13314372723,
          jobId: 126513303346,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some(
        (e) =>
          e.artifactRoot === "ui02-phase6a-native-evidence-android-phone-attempt-1" &&
          e.reason === "MISSING_AUTHORITATIVE_ARTIFACT_ID"
      )
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 14: Missing jobId in GitHub API (even when manifest self-declares jobId) — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "phone",
      attempt: 1,
      selfDeclaredJobId: 888888
    });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13313414537,
          jobId: null,
          includeJob: false,
          jobName: "Android phone real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13313867886,
          jobId: 126513301244,
          jobName: "Android tablet real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13314188557,
          jobId: 126513301621,
          jobName: "iOS phone real simulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13314372723,
          jobId: 126513303346,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some(
        (e) =>
          e.artifactRoot === "ui02-phase6a-native-evidence-android-phone-attempt-1" &&
          e.reason === "MISSING_AUTHORITATIVE_JOB_ID"
      )
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 15: Upstream job conclusion not successful — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13313414537,
          jobId: 126513302194,
          jobName: "Android phone real emulator evidence",
          attempt: 1,
          conclusion: "failure"
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13313867886,
          jobId: 126513301244,
          jobName: "Android tablet real emulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13314188557,
          jobId: 126513301621,
          jobName: "iOS phone real simulator evidence",
          attempt: 1,
          conclusion: "success"
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13314372723,
          jobId: 126513303346,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1,
          conclusion: "success"
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some(
        (e) => e.reason === "UPSTREAM_JOB_NOT_SUCCESS:failure"
      )
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 16: Artifact and job attempt mismatch — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    // iOS tablet artifact is attempt 1, but the only job record in jobsApiData has run_attempt = 2
    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13313414537,
          jobId: 126513302194,
          jobName: "Android phone real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13313867886,
          jobId: 126513301244,
          jobName: "Android tablet real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13314188557,
          jobId: 126513301621,
          jobName: "iOS phone real simulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13314372723,
          jobId: 126513303346,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1,
          jobAttempt: 2
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 2,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some(
        (e) =>
          e.artifactRoot === "ui02-phase6a-native-evidence-ios-tablet-attempt-1" &&
          e.reason === "ARTIFACT_JOB_ATTEMPT_MISMATCH"
      )
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 17: Artifact in GitHub API belongs to another workflow run — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13313414537,
          artifactRunId: 88888888888,
          jobId: 126513302194,
          jobName: "Android phone real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13313867886,
          jobId: 126513301244,
          jobName: "Android tablet real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13314188557,
          jobId: 126513301621,
          jobName: "iOS phone real simulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13314372723,
          jobId: 126513303346,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some((e) => e.reason === "UNRELATED_WORKFLOW_RUN")
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 18: Artifact in GitHub API belongs to another commit SHA — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata({
      cells: [
        {
          name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
          artifactId: 13313414537,
          artifactHeadSha: "ffffffffffffffffffffffffffffffffffffffff",
          jobId: 126513302194,
          jobName: "Android phone real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-android-tablet-attempt-1",
          artifactId: 13313867886,
          jobId: 126513301244,
          jobName: "Android tablet real emulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-phone-attempt-1",
          artifactId: 13314188557,
          jobId: 126513301621,
          jobName: "iOS phone real simulator evidence",
          attempt: 1
        },
        {
          name: "ui02-phase6a-native-evidence-ios-tablet-attempt-1",
          artifactId: 13314372723,
          jobId: 126513303346,
          jobName: "iOS tablet real simulator evidence",
          attempt: 1
        }
      ]
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.excludedArtifacts.some(
        (e) => e.reason === "MISMATCHED_API_ARTIFACT_HEAD_SHA"
      )
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 19: Unexpected duplicate or conflicting artifact identity in GitHub API — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    // Inject a second non-expired artifact with the exact same name in the API list
    artifactsApiData.artifacts.push({
      id: 999999999,
      name: "ui02-phase6a-native-evidence-android-phone-attempt-1",
      expired: false,
      workflow_run: {
        id: Number(TEST_RUN_ID),
        head_sha: TEST_SHA
      }
    });

    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.duplicateMatrixCells.some((m) =>
        m.includes("DUPLICATE_OR_CONFLICTING_ARTIFACT_IDENTITY")
      )
    );
  } finally {
    env.cleanup();
  }
});

test("Scenario 20: Two UI-02 cell manifests inside a single artifact directory — BLOCK", () => {
  const env = createTempTestEnv();
  try {
    writeCellArtifact(env.downloadedRoot, {
      platform: "Android",
      deviceClass: "phone",
      attempt: 1,
      extraManifestPath: "duplicate-sub/manifest.json"
    });
    writeCellArtifact(env.downloadedRoot, { platform: "Android", deviceClass: "tablet", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "phone", attempt: 1 });
    writeCellArtifact(env.downloadedRoot, { platform: "iOS", deviceClass: "tablet", attempt: 1 });

    const { artifactsApiData, jobsApiData } = buildAuthoritativeApiMetadata();
    const res = reconcileUi02NativeMatrix({
      downloadedRoot: env.downloadedRoot,
      outputDir: env.outputDir,
      expectedSha: TEST_SHA,
      expectedWorkflowRunId: TEST_RUN_ID,
      currentAttempt: 1,
      artifactsApiData,
      jobsApiData
    });

    assert.equal(res.ready, false);
    assert.equal(res.matrixBlocked, "1");
    assert.ok(
      res.aggregate.duplicateMatrixCells.some((m) =>
        m.includes("MULTIPLE_MANIFESTS_IN_SINGLE_ARTIFACT")
      )
    );
  } finally {
    env.cleanup();
  }
});
