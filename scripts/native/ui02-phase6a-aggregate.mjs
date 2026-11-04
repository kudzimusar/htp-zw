import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_PHONE_SCREENS = [
  "home-light",
  "search-keyboard",
  "search-results",
  "article-actions-light",
  "article-native-share",
  "saved-persistence",
  "offline-persistence",
  "premium-locked-light",
  "explore-light",
  "live-light",
  "watch-light",
  "watch-external-youtube",
  "listen-truthful",
  "my-healthtimes-light",
  "edition-light",
  "appearance-dark-selected",
  "home-dark",
  "article-dark",
  "premium-dark",
  "premium-landing-dark",
  "watch-dark",
  "my-healthtimes-dark"
];

export const REQUIRED_TABLET_SCREENS = [
  "tablet-home",
  "tablet-article",
  "tablet-watch",
  "tablet-my-healthtimes",
  "tablet-edition",
  "tablet-home-landscape"
];

export const EXPECTED_MATRIX_CELLS = [
  {
    platform: "iOS",
    deviceClass: "phone",
    cellKey: "iosPhone",
    label: "iOS phone",
    jobNamePattern: /iOS phone real simulator evidence/i,
    requiredScreens: REQUIRED_PHONE_SCREENS
  },
  {
    platform: "iOS",
    deviceClass: "tablet",
    cellKey: "iosTablet",
    label: "iPad",
    jobNamePattern: /iOS tablet real simulator evidence/i,
    requiredScreens: REQUIRED_TABLET_SCREENS
  },
  {
    platform: "Android",
    deviceClass: "phone",
    cellKey: "androidPhone",
    label: "Android phone",
    jobNamePattern: /Android phone real emulator evidence/i,
    requiredScreens: REQUIRED_PHONE_SCREENS
  },
  {
    platform: "Android",
    deviceClass: "tablet",
    cellKey: "androidTablet",
    label: "Android tablet",
    jobNamePattern: /Android tablet real emulator evidence/i,
    requiredScreens: REQUIRED_TABLET_SCREENS
  }
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function sha256Buffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(readFileSync(filePath));
}

function walkFiles(dirPath) {
  const results = [];
  if (!existsSync(dirPath)) return results;
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (st.isFile()) {
      results.push(full);
    }
  }
  return results.sort();
}

function inspectPngFile(filePath) {
  if (!existsSync(filePath)) {
    return { valid: false, reason: "MISSING_PNG_FILE" };
  }
  const buf = readFileSync(filePath);
  if (
    buf.length < 24 ||
    !buf.subarray(0, 8).equals(PNG_SIGNATURE) ||
    buf.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    return { valid: false, reason: "INVALID_PNG_HEADER" };
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { valid: false, reason: "INVALID_PNG_DIMENSIONS" };
  }
  return {
    valid: true,
    width,
    height,
    sizeBytes: buf.length,
    sha256: sha256Buffer(buf)
  };
}

function parseArtifactDirName(dirName) {
  // Aggregate artifacts are named ui02-phase6a-native-evidence-attempt-<N>
  if (/^ui02-phase6a-native-evidence-attempt-\d+$/i.test(dirName)) {
    return { isAggregate: true };
  }
  const match = dirName.match(
    /^ui02-phase6a-native-evidence-(ios|android)-(phone|tablet)-attempt-(\d+)(?:-(.+))?$/i
  );
  if (!match) {
    return { isAggregate: false, parsed: null };
  }
  const rawPlatform = match[1].toLowerCase();
  const platform = rawPlatform === "ios" ? "iOS" : "Android";
  const deviceClass = match[2].toLowerCase();
  const attempt = Number(match[3]);
  return {
    isAggregate: false,
    parsed: {
      platform,
      deviceClass,
      attempt
    }
  };
}

function findCellDef(platform, deviceClass) {
  return (
    EXPECTED_MATRIX_CELLS.find(
      (c) => c.platform === platform && c.deviceClass === deviceClass
    ) ?? null
  );
}

/**
 * Validate a single candidate artifact directory under downloadedRoot.
 */
function evaluateCandidateArtifact({
  artifactDirName,
  artifactDirPath,
  expectedSha,
  expectedWorkflowRunId,
  currentAttempt,
  artifactsByName,
  jobsList
}) {
  const dirParse = parseArtifactDirName(artifactDirName);
  if (dirParse.isAggregate) {
    return { ignored: true, reason: "AGGREGATE_ARTIFACT_IGNORED" };
  }

  const allFiles = walkFiles(artifactDirPath);
  const manifestPaths = allFiles.filter((p) => p.endsWith("/manifest.json") || p === join(artifactDirPath, "manifest.json"));

  const apiArtifact = artifactsByName.get(artifactDirName) ?? null;
  const metaPath = join(artifactDirPath, "artifact-metadata.json");
  let localMeta = null;
  if (existsSync(metaPath)) {
    try {
      localMeta = JSON.parse(readFileSync(metaPath, "utf8"));
    } catch {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform: dirParse.parsed?.platform ?? null,
        deviceClass: dirParse.parsed?.deviceClass ?? null,
        attempt: dirParse.parsed?.attempt ?? null,
        reason: "MALFORMED_ARTIFACT_METADATA"
      };
    }
  }

  // Check if any non-empty native-errors.log exists in the directory even before manifest parsing
  const errorLogs = allFiles.filter((p) => p.endsWith("/native-errors.log") || p === join(artifactDirPath, "native-errors.log"));
  const nonEmptyErrorLines = [];
  for (const errPath of errorLogs) {
    const lines = readFileSync(errPath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    nonEmptyErrorLines.push(...lines);
  }

  if (manifestPaths.length === 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform: dirParse.parsed?.platform ?? null,
      deviceClass: dirParse.parsed?.deviceClass ?? null,
      attempt: dirParse.parsed?.attempt ?? null,
      hasRuntimeErrors: nonEmptyErrorLines.length > 0,
      reason: nonEmptyErrorLines.length > 0 ? "ACTIONABLE_NATIVE_RUNTIME_ERRORS" : "MISSING_MANIFEST"
    };
  }

  if (manifestPaths.length > 1) {
    return {
      valid: false,
      isConflict: true,
      artifactRoot: artifactDirName,
      platform: dirParse.parsed?.platform ?? null,
      deviceClass: dirParse.parsed?.deviceClass ?? null,
      attempt: dirParse.parsed?.attempt ?? null,
      reason: "MULTIPLE_MANIFESTS_IN_SINGLE_ARTIFACT"
    };
  }

  const manifestPath = manifestPaths[0];
  const manifestDir = dirname(manifestPath);
  let manifest;
  let manifestRaw;
  try {
    manifestRaw = readFileSync(manifestPath);
    manifest = JSON.parse(manifestRaw.toString("utf8"));
  } catch {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform: dirParse.parsed?.platform ?? null,
      deviceClass: dirParse.parsed?.deviceClass ?? null,
      attempt: dirParse.parsed?.attempt ?? null,
      reason: "MALFORMED_MANIFEST_JSON"
    };
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform: dirParse.parsed?.platform ?? null,
      deviceClass: dirParse.parsed?.deviceClass ?? null,
      attempt: dirParse.parsed?.attempt ?? null,
      reason: "INVALID_MANIFEST_OBJECT"
    };
  }

  const platform = manifest.platform ?? dirParse.parsed?.platform ?? null;
  const deviceClass = manifest.deviceClass ?? dirParse.parsed?.deviceClass ?? null;
  const manifestAttempt = Number(manifest.runAttempt ?? NaN);
  const attempt = Number.isInteger(manifestAttempt) && manifestAttempt > 0
    ? manifestAttempt
    : (dirParse.parsed?.attempt ?? null);

  const cellDef = findCellDef(platform, deviceClass);
  if (!cellDef) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt,
      reason: "UNKNOWN_PLATFORM_OR_DEVICE_CLASS"
    };
  }

  // If directory name encodes platform/deviceClass/attempt, manifest must match it
  if (dirParse.parsed) {
    if (
      dirParse.parsed.platform !== platform ||
      dirParse.parsed.deviceClass !== deviceClass ||
      dirParse.parsed.attempt !== manifestAttempt
    ) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform: dirParse.parsed.platform,
        deviceClass: dirParse.parsed.deviceClass,
        attempt: dirParse.parsed.attempt,
        reason: "DIRECTORY_MANIFEST_IDENTITY_MISMATCH"
      };
    }
  }

  // Validate attempt number bounds
  if (!Number.isInteger(manifestAttempt) || manifestAttempt < 1 || manifestAttempt > currentAttempt) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "INVALID_RUN_ATTEMPT"
    };
  }

  // Validate workflow-run identity
  const manifestRunId =
    manifest.workflowRunId !== undefined && manifest.workflowRunId !== null && String(manifest.workflowRunId) !== ""
      ? String(manifest.workflowRunId)
      : null;
  const metaRunId =
    localMeta?.workflowRunId !== undefined && localMeta?.workflowRunId !== null && String(localMeta.workflowRunId) !== ""
      ? String(localMeta.workflowRunId)
      : null;
  const apiRunId =
    apiArtifact?.workflow_run?.id !== undefined && apiArtifact?.workflow_run?.id !== null
      ? String(apiArtifact.workflow_run.id)
      : null;

  const observedRunIds = new Set([manifestRunId, metaRunId, apiRunId].filter(Boolean));
  if (observedRunIds.size > 1) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "CONFLICTING_WORKFLOW_RUN_IDS"
    };
  }

  const resolvedWorkflowRunId = manifestRunId ?? metaRunId ?? apiRunId ?? null;
  if (expectedWorkflowRunId !== null && expectedWorkflowRunId !== undefined && String(expectedWorkflowRunId) !== "") {
    const expectedRunStr = String(expectedWorkflowRunId);
    if (!resolvedWorkflowRunId) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: "MISSING_WORKFLOW_RUN_PROVENANCE"
      };
    }
    if (resolvedWorkflowRunId !== expectedRunStr) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        workflowRunId: resolvedWorkflowRunId,
        reason: "UNRELATED_WORKFLOW_RUN"
      };
    }
  }

  // Validate candidate SHA
  if (!expectedSha || typeof manifest.candidateSha !== "string" || manifest.candidateSha !== expectedSha) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      candidateSha: manifest.candidateSha ?? null,
      reason: "MISMATCHED_CANDIDATE_SHA"
    };
  }

  if (
    apiArtifact?.workflow_run?.head_sha &&
    apiArtifact.workflow_run.head_sha !== expectedSha
  ) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      candidateSha: apiArtifact.workflow_run.head_sha,
      reason: "MISMATCHED_API_ARTIFACT_HEAD_SHA"
    };
  }

  // Validate deviceIdentity and osVersion
  if (
    typeof manifest.deviceIdentity !== "string" ||
    manifest.deviceIdentity.trim() === "" ||
    typeof manifest.osVersion !== "string" ||
    manifest.osVersion.trim() === ""
  ) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_DEVICE_METADATA"
    };
  }

  // Validate zero actionable native runtime errors
  const runtimeErrorCount = Number(manifest.nativeRuntimeErrorLineCount ?? NaN);
  const screenErrorCount = Array.isArray(manifest.screens)
    ? manifest.screens.reduce(
        (acc, s) => acc + (Array.isArray(s?.nativeRuntimeErrors) ? s.nativeRuntimeErrors.length : 0),
        0
      )
    : 0;
  if (
    !Number.isInteger(runtimeErrorCount) ||
    runtimeErrorCount !== 0 ||
    screenErrorCount !== 0 ||
    nonEmptyErrorLines.length !== 0
  ) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      hasRuntimeErrors: true,
      nativeRuntimeErrorLineCount: Math.max(
        Number.isFinite(runtimeErrorCount) ? runtimeErrorCount : 1,
        screenErrorCount,
        nonEmptyErrorLines.length
      ),
      reason: "ACTIONABLE_NATIVE_RUNTIME_ERRORS"
    };
  }

  // Validate screens list and PNG files on disk
  if (!Array.isArray(manifest.screens) || manifest.screens.length === 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "EMPTY_SCREENS_ARRAY"
    };
  }

  const screenMap = new Map();
  for (const screenObj of manifest.screens) {
    if (
      !screenObj ||
      typeof screenObj !== "object" ||
      typeof screenObj.screen !== "string" ||
      !screenObj.screen ||
      typeof screenObj.screenshotFilename !== "string" ||
      !screenObj.screenshotFilename
    ) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: "MALFORMED_SCREEN_ENTRY"
      };
    }
    if (
      screenObj.candidateSha !== expectedSha ||
      screenObj.platform !== platform ||
      screenObj.deviceClass !== deviceClass ||
      Number(screenObj.runAttempt) !== manifestAttempt
    ) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: "SCREEN_METADATA_MISMATCH"
      };
    }
    if (screenMap.has(screenObj.screen)) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: "DUPLICATE_SCREEN_KEY_IN_MANIFEST"
      };
    }
    screenMap.set(screenObj.screen, screenObj);
  }

  for (const reqScreen of cellDef.requiredScreens) {
    if (!screenMap.has(reqScreen)) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: `MISSING_REQUIRED_SCREEN:${reqScreen}`
      };
    }
  }

  const screenshotChecksums = [];
  for (const [screenKey, screenObj] of screenMap.entries()) {
    const pngPath = join(manifestDir, screenObj.screenshotFilename);
    const pngInfo = inspectPngFile(pngPath);
    if (!pngInfo.valid) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: `INVALID_SCREENSHOT_${screenKey}:${pngInfo.reason}`
      };
    }
    if (screenObj.sha256 && screenObj.sha256 !== pngInfo.sha256) {
      return {
        valid: false,
        artifactRoot: artifactDirName,
        platform,
        deviceClass,
        attempt: manifestAttempt,
        reason: `SCREENSHOT_CHECKSUM_MISMATCH:${screenKey}`
      };
    }
    if (platform === "Android" && deviceClass === "tablet") {
      if (screenKey === "tablet-home" && pngInfo.height <= pngInfo.width) {
        return {
          valid: false,
          artifactRoot: artifactDirName,
          platform,
          deviceClass,
          attempt: manifestAttempt,
          reason: "ANDROID_TABLET_PORTRAIT_GEOMETRY_INVALID"
        };
      }
      if (screenKey === "tablet-home-landscape" && pngInfo.width <= pngInfo.height) {
        return {
          valid: false,
          artifactRoot: artifactDirName,
          platform,
          deviceClass,
          attempt: manifestAttempt,
          reason: "ANDROID_TABLET_LANDSCAPE_GEOMETRY_INVALID"
        };
      }
    }
    screenshotChecksums.push({
      screen: screenKey,
      file: relative(artifactDirPath, pngPath),
      sha256: pngInfo.sha256,
      width: pngInfo.width,
      height: pngInfo.height,
      sizeBytes: pngInfo.sizeBytes
    });
  }

  // Match job record if jobsList is provided
  const matchingJob = jobsList.find(
    (j) =>
      cellDef.jobNamePattern.test(String(j?.name ?? "")) &&
      Number(j?.run_attempt ?? manifestAttempt) === manifestAttempt
  ) ?? jobsList.find((j) => cellDef.jobNamePattern.test(String(j?.name ?? ""))) ?? null;

  if (matchingJob && matchingJob.conclusion && matchingJob.conclusion !== "success") {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: `UPSTREAM_JOB_NOT_SUCCESS:${matchingJob.conclusion}`
    };
  }

  const resolvedArtifactId =
    apiArtifact?.id ?? localMeta?.artifactId ?? manifest.artifactId ?? null;
  const resolvedJobId =
    matchingJob?.id ?? localMeta?.jobId ?? manifest.jobId ?? null;

  return {
    valid: true,
    artifactRoot: artifactDirName,
    artifactDirPath,
    manifestPath,
    manifestSha256: sha256Buffer(manifestRaw),
    platform,
    deviceClass,
    cellKey: cellDef.cellKey,
    label: cellDef.label,
    attempt: manifestAttempt,
    workflowRunId: resolvedWorkflowRunId,
    artifactId: resolvedArtifactId !== null ? Number(resolvedArtifactId) : null,
    jobId: resolvedJobId !== null ? Number(resolvedJobId) : null,
    candidateSha: expectedSha,
    deviceIdentity: manifest.deviceIdentity,
    osVersion: manifest.osVersion,
    screensCaptured: manifest.screens.length,
    screenshotChecksums,
    manifest
  };
}

/**
 * Reconcile UI-02 Phase 6A native matrix evidence across workflow attempts.
 */
export function reconcileUi02NativeMatrix({
  downloadedRoot,
  outputDir,
  expectedSha,
  expectedWorkflowRunId,
  currentAttempt,
  jobResults = { contract: "success", ios: "success", android: "success" },
  artifactsApiData = null,
  jobsApiData = null
}) {
  const normalizedAttempt = Number(currentAttempt ?? 1);
  const artifactsByName = new Map();
  if (Array.isArray(artifactsApiData?.artifacts)) {
    for (const art of artifactsApiData.artifacts) {
      if (art?.name) {
        // Keep the latest non-expired artifact entry for a given name
        artifactsByName.set(art.name, art);
      }
    }
  }
  const jobsList = Array.isArray(jobsApiData?.jobs) ? jobsApiData.jobs : [];

  const candidateDirs = existsSync(downloadedRoot)
    ? readdirSync(downloadedRoot)
        .filter((name) => statSync(join(downloadedRoot, name)).isDirectory())
        .sort()
    : [];

  const evaluated = [];
  for (const dirName of candidateDirs) {
    const res = evaluateCandidateArtifact({
      artifactDirName: dirName,
      artifactDirPath: join(downloadedRoot, dirName),
      expectedSha,
      expectedWorkflowRunId,
      currentAttempt: normalizedAttempt,
      artifactsByName,
      jobsList
    });
    if (!res.ignored) {
      evaluated.push(res);
    }
  }

  const selectedManifests = [];
  const selectedCells = {};
  const excludedArtifacts = [];
  const unavailableMatrixCells = [];
  const duplicateMatrixCells = [];
  const runtimeErrorCells = [];

  for (const cellDef of EXPECTED_MATRIX_CELLS) {
    const cellCandidates = evaluated.filter(
      (c) => c.platform === cellDef.platform && c.deviceClass === cellDef.deviceClass
    );

    // Record any invalid candidates immediately in excludedArtifacts
    for (const cand of cellCandidates) {
      if (!cand.valid) {
        excludedArtifacts.push({
          artifactRoot: cand.artifactRoot,
          platform: cand.platform,
          deviceClass: cand.deviceClass,
          attempt: cand.attempt,
          reason: cand.reason
        });
      }
    }

    // Check for explicit multi-manifest conflicts inside a single artifact
    const explicitConflicts = cellCandidates.filter((c) => c.isConflict);
    if (explicitConflicts.length > 0) {
      duplicateMatrixCells.push(
        `${cellDef.label}: conflicting manifests inside ${explicitConflicts.map((c) => c.artifactRoot).join(", ")}`
      );
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

    // Group same-run/same-SHA candidates by attempt to detect duplicate/conflicting attempts
    const validCandidates = cellCandidates.filter((c) => c.valid);
    const byAttempt = new Map();
    for (const cand of validCandidates) {
      const list = byAttempt.get(cand.attempt) ?? [];
      list.push(cand);
      byAttempt.set(cand.attempt, list);
    }

    // Check if any attempt has duplicate valid artifacts
    let hasDuplicateAttempt = false;
    for (const [att, list] of byAttempt.entries()) {
      if (list.length > 1) {
        duplicateMatrixCells.push(
          `${cellDef.label}: ${list.length} conflicting valid artifacts for attempt ${att}`
        );
        hasDuplicateAttempt = true;
      }
    }
    if (hasDuplicateAttempt) {
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

    // Determine highest valid attempt
    const sortedValidAttempts = Array.from(byAttempt.keys()).sort((a, b) => b - a);
    const highestValidAttempt = sortedValidAttempts[0] ?? null;

    // Check if there is a same-run, same-SHA failed attempt with a HIGHER attempt number than highestValidAttempt,
    // or if there is a runtime-error candidate that was not superseded by a later valid attempt
    const runtimeErrorCandidates = cellCandidates.filter(
      (c) =>
        !c.valid &&
        c.hasRuntimeErrors &&
        (highestValidAttempt === null || (Number.isInteger(c.attempt) && c.attempt >= highestValidAttempt))
    );
    if (runtimeErrorCandidates.length > 0) {
      runtimeErrorCells.push(cellDef.label);
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

    // Also check if a same-attempt invalid candidate coexists with the highest valid attempt
    if (highestValidAttempt !== null) {
      const sameAttemptInvalid = cellCandidates.filter(
        (c) => !c.valid && c.attempt === highestValidAttempt
      );
      if (sameAttemptInvalid.length > 0) {
        duplicateMatrixCells.push(
          `${cellDef.label}: conflicting valid and invalid evidence at attempt ${highestValidAttempt}`
        );
        unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
        continue;
      }
    }

    if (highestValidAttempt === null) {
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

    const winner = byAttempt.get(highestValidAttempt)[0];

    // Mark any earlier valid attempts as superseded
    for (const att of sortedValidAttempts.slice(1)) {
      const older = byAttempt.get(att)[0];
      excludedArtifacts.push({
        artifactRoot: older.artifactRoot,
        platform: older.platform,
        deviceClass: older.deviceClass,
        attempt: older.attempt,
        reason: "SUPERSEDED_BY_LATER_VALID_ATTEMPT",
        supersededByAttempt: winner.attempt
      });
    }

    // Annotate any earlier failed attempts for this cell with supersededByAttempt
    for (const ex of excludedArtifacts) {
      if (
        ex.platform === cellDef.platform &&
        ex.deviceClass === cellDef.deviceClass &&
        Number.isInteger(ex.attempt) &&
        ex.attempt < winner.attempt
      ) {
        ex.supersededByAttempt = winner.attempt;
      }
    }

    const enrichedManifest = {
      ...winner.manifest,
      workflowRunId: winner.workflowRunId,
      sourceAttempt: winner.attempt,
      artifactId: winner.artifactId,
      artifactName: winner.artifactRoot,
      jobId: winner.jobId,
      manifestSha256: winner.manifestSha256
    };

    selectedManifests.push({
      winner,
      enrichedManifest
    });

    selectedCells[cellDef.cellKey] = {
      platform: winner.platform,
      deviceClass: winner.deviceClass,
      label: cellDef.label,
      sourceAttempt: winner.attempt,
      workflowRunId: winner.workflowRunId,
      jobId: winner.jobId,
      artifactId: winner.artifactId,
      artifactName: winner.artifactRoot,
      candidateSha: winner.candidateSha,
      deviceIdentity: winner.deviceIdentity,
      osVersion: winner.osVersion,
      screensCaptured: winner.screensCaptured,
      manifestSha256: winner.manifestSha256,
      screenshotChecksums: winner.screenshotChecksums,
      nativeRuntimeErrorLineCount: 0,
      status: "SUCCESS"
    };
  }

  // Also record any rejected candidates whose platform/deviceClass was unknown or mismatched
  for (const cand of evaluated) {
    if (
      !cand.valid &&
      !EXPECTED_MATRIX_CELLS.some(
        (c) => c.platform === cand.platform && c.deviceClass === cand.deviceClass
      )
    ) {
      excludedArtifacts.push({
        artifactRoot: cand.artifactRoot,
        platform: cand.platform,
        deviceClass: cand.deviceClass,
        attempt: cand.attempt,
        reason: cand.reason
      });
    }
  }

  const contractGatePassed =
    jobResults?.contract === "success" &&
    jobResults?.ios === "success" &&
    jobResults?.android === "success";

  const ready =
    unavailableMatrixCells.length === 0 &&
    duplicateMatrixCells.length === 0 &&
    runtimeErrorCells.length === 0 &&
    selectedManifests.length === EXPECTED_MATRIX_CELLS.length &&
    contractGatePassed;

  // Prepare outputDir cleanly
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const screenshots = [];
  for (const { winner } of selectedManifests) {
    const destRoot = join(outputDir, winner.artifactRoot);
    cpSync(winner.artifactDirPath, destRoot, { recursive: true });
    for (const file of walkFiles(destRoot)) {
      if (file.toLowerCase().endsWith(".png")) {
        screenshots.push({
          file: relative(outputDir, file),
          sha256: sha256File(file),
          cell: winner.cellKey,
          sourceAttempt: winner.attempt
        });
      }
    }
  }
  screenshots.sort((a, b) => a.file.localeCompare(b.file));

  const sourceAttempts = Array.from(
    new Set(selectedManifests.map((s) => s.winner.attempt))
  ).sort((a, b) => a - b);

  const contractJobRecord =
    jobsList.find(
      (j) =>
        /Phase 6A contract/i.test(String(j?.name ?? "")) &&
        Number(j?.run_attempt ?? normalizedAttempt) === normalizedAttempt
    ) ??
    jobsList.find((j) => /Phase 6A contract/i.test(String(j?.name ?? ""))) ??
    null;

  const aggregate = {
    phase: "UI-02 Phase 6A Native Cross-Device Realization",
    candidateSha: expectedSha,
    workflowRunId:
      expectedWorkflowRunId !== null && expectedWorkflowRunId !== undefined
        ? String(expectedWorkflowRunId)
        : null,
    runAttempt: normalizedAttempt,
    sourceAttempts,
    reconciliationMode: "SAME_RUN_EXACT_SHA_LATEST_VALID_CELL_SELECTION",
    evidenceSource:
      "real native iOS Simulator and Android Emulator; no resized-browser substitution",
    contractGate: {
      status: contractGatePassed ? "PASS" : "BLOCKED",
      jobId: contractJobRecord?.id ? Number(contractJobRecord.id) : null,
      jobResult: jobResults?.contract ?? "unknown"
    },
    selectedCells,
    matrix: selectedManifests.map((s) => s.enrichedManifest),
    excludedArtifacts,
    unavailableMatrixCells,
    duplicateMatrixCells,
    runtimeErrorCells,
    programmeDisposition: ready
      ? "READY FOR UI MODERATOR REVIEW"
      : "BLOCKED — REQUIRED NATIVE DEVICE EVIDENCE INCOMPLETE OR INVALID",
    screenshots,
    jobResults,
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

  const manifestJson = JSON.stringify(aggregate, null, 2);
  const manifestPath = join(outputDir, "manifest.json");
  writeFileSync(manifestPath, manifestJson);
  const manifestDigest = sha256Buffer(Buffer.from(manifestJson, "utf8"));
  writeFileSync(join(outputDir, "manifest.sha256"), `${manifestDigest}  manifest.json\n`);
  writeFileSync(join(outputDir, "matrix-blocked"), ready ? "0" : "1");

  return {
    ready,
    matrixBlocked: ready ? "0" : "1",
    manifestDigest,
    aggregate
  };
}

function runCli() {
  const downloadedRoot = resolve(process.env.DOWNLOADED_ROOT ?? "downloaded");
  const outputDir = resolve(process.env.OUTPUT_DIR ?? "ui02-phase6a-native-evidence-final");
  const expectedSha = process.env.EXPECTED_SHA ?? "";
  const expectedWorkflowRunId =
    process.env.WORKFLOW_RUN_ID ?? process.env.GITHUB_RUN_ID ?? "";
  const currentAttempt = Number(process.env.RUN_ATTEMPT ?? "1");
  const jobResults = {
    contract: process.env.CONTRACT_JOB_RESULT ?? "success",
    ios: process.env.IOS_JOB_RESULT ?? "success",
    android: process.env.ANDROID_JOB_RESULT ?? "success"
  };

  let artifactsApiData = null;
  const artifactsApiFile = process.env.ARTIFACTS_API_JSON ?? "downloaded-artifacts-api.json";
  if (existsSync(artifactsApiFile)) {
    try {
      artifactsApiData = JSON.parse(readFileSync(artifactsApiFile, "utf8"));
    } catch {
      artifactsApiData = null;
    }
  }

  let jobsApiData = null;
  const jobsApiFile = process.env.JOBS_API_JSON ?? "downloaded-jobs-api.json";
  if (existsSync(jobsApiFile)) {
    try {
      jobsApiData = JSON.parse(readFileSync(jobsApiFile, "utf8"));
    } catch {
      jobsApiData = null;
    }
  }

  const result = reconcileUi02NativeMatrix({
    downloadedRoot,
    outputDir,
    expectedSha,
    expectedWorkflowRunId,
    currentAttempt,
    jobResults,
    artifactsApiData,
    jobsApiData
  });

  console.log(JSON.stringify(result.aggregate, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
