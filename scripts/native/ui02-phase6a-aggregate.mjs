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
import { crc32, inflateSync } from "node:zlib";

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

/**
 * Full PNG structure, chunk framing, CRC32, and IDAT zlib inflate verification.
 * Note: This verifies binary image integrity and decompression; it does NOT
 * replace mandatory independent human visual review of rendered content.
 */
export function inspectPngFile(filePath) {
  if (!existsSync(filePath)) {
    return { valid: false, reason: "MISSING_PNG_FILE" };
  }
  const buf = readFileSync(filePath);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { valid: false, reason: "INVALID_PNG_SIGNATURE" };
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let seenIhdr = false;
  let seenIend = false;
  const idatChunks = [];

  while (offset < buf.length) {
    if (offset + 8 > buf.length) {
      return { valid: false, reason: "TRUNCATED_PNG_CHUNK_HEADER" };
    }
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    if (offset + 12 + length > buf.length) {
      return { valid: false, reason: `TRUNCATED_PNG_CHUNK_DATA:${type}` };
    }

    if (typeof crc32 === "function") {
      const actualCrc = crc32(buf.subarray(offset + 4, offset + 8 + length)) >>> 0;
      const expectedCrc = buf.readUInt32BE(offset + 8 + length) >>> 0;
      if (actualCrc !== expectedCrc) {
        return { valid: false, reason: `INVALID_PNG_CHUNK_CRC:${type}` };
      }
    }

    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (!seenIhdr) {
      if (type !== "IHDR" || length !== 13) {
        return { valid: false, reason: "MISSING_OR_INVALID_IHDR" };
      }
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      const compression = data.readUInt8(10);
      const filter = data.readUInt8(11);
      interlace = data.readUInt8(12);
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        compression !== 0 ||
        filter !== 0 ||
        (interlace !== 0 && interlace !== 1)
      ) {
        return { valid: false, reason: "INVALID_PNG_IHDR_PARAMETERS" };
      }
      seenIhdr = true;
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      if (length !== 0) {
        return { valid: false, reason: "INVALID_PNG_IEND_LENGTH" };
      }
      seenIend = true;
      offset += 12 + length;
      break;
    }
    offset += 12 + length;
  }

  if (!seenIhdr || !seenIend || idatChunks.length === 0 || offset !== buf.length) {
    return { valid: false, reason: "INCOMPLETE_PNG_CHUNK_STREAM" };
  }

  let decompressed;
  try {
    decompressed = inflateSync(Buffer.concat(idatChunks));
  } catch {
    return { valid: false, reason: "INVALID_PNG_IDAT_DEFLATE_STREAM" };
  }

  const channelsByColorType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByColorType[colorType] ?? 0;
  if (channels === 0 || ![1, 2, 4, 8, 16].includes(bitDepth)) {
    return { valid: false, reason: "UNSUPPORTED_PNG_COLOR_OR_BIT_DEPTH" };
  }

  if (interlace === 0) {
    const expectedScanlineBytes = height * (1 + Math.ceil((width * channels * bitDepth) / 8));
    if (decompressed.length !== expectedScanlineBytes) {
      return { valid: false, reason: "PNG_DECOMPRESSED_SCANLINE_SIZE_MISMATCH" };
    }
  } else if (decompressed.length < height) {
    return { valid: false, reason: "PNG_DECOMPRESSED_STREAM_TOO_SMALL" };
  }

  return {
    valid: true,
    width,
    height,
    sizeBytes: buf.length,
    decompressedBytes: decompressed.length,
    sha256: sha256Buffer(buf)
  };
}

function parseArtifactDirName(dirName) {
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
 * Distinguish Maestro's internal CLI runner manifest
 * ($schema: "https://storage.googleapis.com/maestro-schemas/artifact-manifest/v1.schema.json")
 * from candidate UI-02 Phase 6A cell manifests.
 */
function isMaestroInternalRunnerManifest(filePath) {
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof parsed.$schema === "string" &&
      parsed.$schema.includes("maestro-schemas/artifact-manifest") &&
      Array.isArray(parsed.entries) &&
      parsed.phase === undefined &&
      parsed.candidateSha === undefined
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
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
  artifactsList,
  jobsList
}) {
  const dirParse = parseArtifactDirName(artifactDirName);
  if (dirParse.isAggregate) {
    return { ignored: true, reason: "AGGREGATE_ARTIFACT_IGNORED" };
  }

  const allFiles = walkFiles(artifactDirPath);
  const candidateManifestPaths = allFiles
    .filter((p) => p.endsWith("/manifest.json") || p === join(artifactDirPath, "manifest.json"))
    .filter((p) => !isMaestroInternalRunnerManifest(p));

  const errorLogs = allFiles.filter(
    (p) => p.endsWith("/native-errors.log") || p === join(artifactDirPath, "native-errors.log")
  );
  const nonEmptyErrorLines = [];
  for (const errPath of errorLogs) {
    const lines = readFileSync(errPath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    nonEmptyErrorLines.push(...lines);
  }

  if (candidateManifestPaths.length === 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform: dirParse.parsed?.platform ?? null,
      deviceClass: dirParse.parsed?.deviceClass ?? null,
      attempt: dirParse.parsed?.attempt ?? null,
      hasRuntimeErrors: nonEmptyErrorLines.length > 0,
      reason:
        nonEmptyErrorLines.length > 0
          ? "ACTIONABLE_NATIVE_RUNTIME_ERRORS"
          : "MISSING_MANIFEST"
    };
  }

  if (candidateManifestPaths.length > 1) {
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

  const manifestPath = candidateManifestPaths[0];
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
  const attempt =
    Number.isInteger(manifestAttempt) && manifestAttempt > 0
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

  // B2.1: Enforce authoritative same-run GitHub artifact identity from artifactsApiData.
  // Never accept self-declared manifest.artifactId as a substitute for GitHub API provenance.
  const matchingApiArtifacts = artifactsList.filter(
    (a) => a && a.name === artifactDirName && !a.expired
  );
  if (matchingApiArtifacts.length === 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_AUTHORITATIVE_ARTIFACT_ID"
    };
  }
  if (matchingApiArtifacts.length > 1) {
    return {
      valid: false,
      isConflict: true,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "DUPLICATE_OR_CONFLICTING_ARTIFACT_IDENTITY"
    };
  }

  const apiArtifact = matchingApiArtifacts[0];
  const apiArtifactId = Number(apiArtifact.id ?? NaN);
  if (!Number.isInteger(apiArtifactId) || apiArtifactId <= 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_AUTHORITATIVE_ARTIFACT_ID"
    };
  }

  // Ensure no other artifact in the run shares this artifact ID
  const sameIdArtifacts = artifactsList.filter((a) => Number(a?.id) === apiArtifactId);
  if (sameIdArtifacts.length > 1) {
    return {
      valid: false,
      isConflict: true,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "DUPLICATE_OR_CONFLICTING_ARTIFACT_IDENTITY"
    };
  }

  if (
    manifest.artifactId !== undefined &&
    manifest.artifactId !== null &&
    Number(manifest.artifactId) !== apiArtifactId
  ) {
    return {
      valid: false,
      isConflict: true,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "CONFLICTING_MANIFEST_AND_API_ARTIFACT_ID"
    };
  }

  // B2.2 & B2.3: Validate workflow-run identity and candidate SHA on both API artifact and manifest
  const expectedRunStr =
    expectedWorkflowRunId !== null && expectedWorkflowRunId !== undefined
      ? String(expectedWorkflowRunId).trim()
      : "";
  if (!expectedRunStr) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_EXPECTED_WORKFLOW_RUN_ID"
    };
  }

  const apiRunId =
    apiArtifact?.workflow_run?.id !== undefined && apiArtifact?.workflow_run?.id !== null
      ? String(apiArtifact.workflow_run.id).trim()
      : "";
  if (!apiRunId) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_WORKFLOW_RUN_PROVENANCE"
    };
  }
  if (apiRunId !== expectedRunStr) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      workflowRunId: apiRunId,
      reason: "UNRELATED_WORKFLOW_RUN"
    };
  }

  const manifestRunId =
    manifest.workflowRunId !== undefined &&
    manifest.workflowRunId !== null &&
    String(manifest.workflowRunId).trim() !== ""
      ? String(manifest.workflowRunId).trim()
      : null;
  if (manifestRunId !== null && manifestRunId !== expectedRunStr) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      workflowRunId: manifestRunId,
      reason: "UNRELATED_WORKFLOW_RUN"
    };
  }

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

  const apiHeadSha = apiArtifact?.workflow_run?.head_sha ?? null;
  if (!apiHeadSha || apiHeadSha !== expectedSha) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      candidateSha: apiHeadSha,
      reason: "MISMATCHED_API_ARTIFACT_HEAD_SHA"
    };
  }

  // B2.6 & B2.7: Enforce authoritative upstream GitHub job identity, attempt match, and conclusion.
  // Never accept self-declared manifest.jobId without authoritative jobsApiData match.
  const cellJobs = jobsList.filter((j) => cellDef.jobNamePattern.test(String(j?.name ?? "")));
  if (cellJobs.length === 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_AUTHORITATIVE_JOB_ID"
    };
  }

  const attemptMatchingJobs = cellJobs.filter(
    (j) => Number(j?.run_attempt ?? j?.attempt ?? NaN) === manifestAttempt
  );
  if (attemptMatchingJobs.length === 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "ARTIFACT_JOB_ATTEMPT_MISMATCH"
    };
  }

  // Deduplicate if the same job object was fetched identically, but flag conflict if distinct job IDs or conclusions exist for the same cell+attempt
  const uniqueJobIds = new Set(attemptMatchingJobs.map((j) => j?.id));
  const uniqueConclusions = new Set(attemptMatchingJobs.map((j) => j?.conclusion));
  if (uniqueJobIds.size > 1 || uniqueConclusions.size > 1) {
    return {
      valid: false,
      isConflict: true,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "DUPLICATE_OR_CONFLICTING_JOB_IDENTITY"
    };
  }

  const matchingJob = attemptMatchingJobs[0];
  const apiJobId = Number(matchingJob?.id ?? NaN);
  if (!Number.isInteger(apiJobId) || apiJobId <= 0) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISSING_AUTHORITATIVE_JOB_ID"
    };
  }

  if (
    manifest.jobId !== undefined &&
    manifest.jobId !== null &&
    Number(manifest.jobId) !== apiJobId
  ) {
    return {
      valid: false,
      isConflict: true,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "CONFLICTING_MANIFEST_AND_API_JOB_ID"
    };
  }

  if (
    matchingJob.run_id !== undefined &&
    matchingJob.run_id !== null &&
    String(matchingJob.run_id) !== expectedRunStr
  ) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "UNRELATED_JOB_WORKFLOW_RUN"
    };
  }

  if (
    matchingJob.head_sha !== undefined &&
    matchingJob.head_sha !== null &&
    matchingJob.head_sha !== expectedSha
  ) {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: "MISMATCHED_JOB_HEAD_SHA"
    };
  }

  if (matchingJob.conclusion !== "success") {
    return {
      valid: false,
      artifactRoot: artifactDirName,
      platform,
      deviceClass,
      attempt: manifestAttempt,
      reason: `UPSTREAM_JOB_NOT_SUCCESS:${matchingJob.conclusion ?? "null"}`
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

  // B2.10: Validate zero actionable native runtime errors
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

  // B2.8 & B2.9: Validate screens list, checksums, and full PNG decode on disk
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
      sizeBytes: pngInfo.sizeBytes,
      decompressedBytes: pngInfo.decompressedBytes
    });
  }

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
    workflowRunId: expectedRunStr,
    artifactId: apiArtifactId,
    jobId: apiJobId,
    jobConclusion: matchingJob.conclusion,
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
  const apiProvenanceErrors = [];

  if (
    !artifactsApiData ||
    typeof artifactsApiData !== "object" ||
    artifactsApiData.ok === false ||
    !Array.isArray(artifactsApiData.artifacts)
  ) {
    apiProvenanceErrors.push(
      `GITHUB_ARTIFACTS_METADATA_API_UNAVAILABLE${
        artifactsApiData?.error ? ":" + artifactsApiData.error : ""
      }`
    );
  }

  if (
    !jobsApiData ||
    typeof jobsApiData !== "object" ||
    jobsApiData.ok === false ||
    !Array.isArray(jobsApiData.jobs)
  ) {
    apiProvenanceErrors.push(
      `GITHUB_JOBS_METADATA_API_UNAVAILABLE${
        jobsApiData?.error ? ":" + jobsApiData.error : ""
      }`
    );
  }

  const artifactsList =
    apiProvenanceErrors.length === 0 ? artifactsApiData.artifacts : [];
  const jobsList =
    apiProvenanceErrors.length === 0 ? jobsApiData.jobs : [];

  const candidateDirs =
    apiProvenanceErrors.length === 0 && existsSync(downloadedRoot)
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
      artifactsList,
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
    if (apiProvenanceErrors.length > 0) {
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

    const cellCandidates = evaluated.filter(
      (c) => c.platform === cellDef.platform && c.deviceClass === cellDef.deviceClass
    );

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

    const explicitConflicts = cellCandidates.filter((c) => c.isConflict);
    if (explicitConflicts.length > 0) {
      duplicateMatrixCells.push(
        `${cellDef.label}: conflicting artifact/job/manifest identity in ${explicitConflicts
          .map((c) => `${c.artifactRoot} (${c.reason})`)
          .join(", ")}`
      );
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

    const validCandidates = cellCandidates.filter((c) => c.valid);
    const byAttempt = new Map();
    for (const cand of validCandidates) {
      const list = byAttempt.get(cand.attempt) ?? [];
      list.push(cand);
      byAttempt.set(cand.attempt, list);
    }

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

    const sortedValidAttempts = Array.from(byAttempt.keys()).sort((a, b) => b - a);
    const highestValidAttempt = sortedValidAttempts[0] ?? null;

    const runtimeErrorCandidates = cellCandidates.filter(
      (c) =>
        !c.valid &&
        c.hasRuntimeErrors &&
        (highestValidAttempt === null ||
          (Number.isInteger(c.attempt) && c.attempt >= highestValidAttempt))
    );
    if (runtimeErrorCandidates.length > 0) {
      runtimeErrorCells.push(cellDef.label);
      unavailableMatrixCells.push(`${cellDef.label}: NOT CAPTURED / NOT CERTIFIED`);
      continue;
    }

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
      jobConclusion: winner.jobConclusion,
      manifestSha256: winner.manifestSha256,
      screenshotIntegrityVerification:
        "PNG_SIGNATURE_IHDR_CRC32_AND_ZLIB_IDAT_INFLATE_VERIFIED",
      independentVisualReviewStatus: "PENDING_NON_AUTHOR_REVIEW"
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
      jobConclusion: winner.jobConclusion,
      artifactId: winner.artifactId,
      artifactName: winner.artifactRoot,
      candidateSha: winner.candidateSha,
      deviceIdentity: winner.deviceIdentity,
      osVersion: winner.osVersion,
      screensCaptured: winner.screensCaptured,
      manifestSha256: winner.manifestSha256,
      screenshotChecksums: winner.screenshotChecksums,
      screenshotIntegrityVerification:
        "PNG_SIGNATURE_IHDR_CRC32_AND_ZLIB_IDAT_INFLATE_VERIFIED",
      independentVisualReviewStatus: "PENDING_NON_AUTHOR_REVIEW",
      nativeRuntimeErrorLineCount: 0,
      status: "SUCCESS"
    };
  }

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

  const contractJobs = jobsList.filter((j) =>
    /Phase 6A contract/i.test(String(j?.name ?? ""))
  );
  const contractJobRecord =
    contractJobs.find(
      (j) => Number(j?.run_attempt ?? normalizedAttempt) === normalizedAttempt
    ) ??
    contractJobs.sort(
      (a, b) => Number(b?.run_attempt ?? 0) - Number(a?.run_attempt ?? 0)
    )[0] ??
    null;

  const contractJobId = Number(contractJobRecord?.id ?? NaN);
  const contractGatePassed =
    apiProvenanceErrors.length === 0 &&
    jobResults?.contract === "success" &&
    jobResults?.ios === "success" &&
    jobResults?.android === "success" &&
    Number.isInteger(contractJobId) &&
    contractJobId > 0 &&
    contractJobRecord?.conclusion === "success";

  const ready =
    apiProvenanceErrors.length === 0 &&
    unavailableMatrixCells.length === 0 &&
    duplicateMatrixCells.length === 0 &&
    runtimeErrorCells.length === 0 &&
    selectedManifests.length === EXPECTED_MATRIX_CELLS.length &&
    contractGatePassed;

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
          sourceAttempt: winner.attempt,
          artifactId: winner.artifactId,
          jobId: winner.jobId
        });
      }
    }
  }
  screenshots.sort((a, b) => a.file.localeCompare(b.file));

  const sourceAttempts = Array.from(
    new Set(selectedManifests.map((s) => s.winner.attempt))
  ).sort((a, b) => a - b);

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
    screenshotIntegrityVerification:
      "PNG_SIGNATURE_IHDR_CRC32_AND_ZLIB_IDAT_INFLATE_VERIFIED",
    independentVisualReviewStatus: "PENDING_NON_AUTHOR_REVIEW",
    apiProvenanceStatus:
      apiProvenanceErrors.length === 0
        ? "VERIFIED"
        : `BLOCKED:${apiProvenanceErrors.join(";")}`,
    apiProvenanceErrors,
    contractGate: {
      status: contractGatePassed ? "PASS" : "BLOCKED",
      jobId: Number.isInteger(contractJobId) && contractJobId > 0 ? contractJobId : null,
      jobConclusion: contractJobRecord?.conclusion ?? null,
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
    } catch (err) {
      artifactsApiData = {
        ok: false,
        error: `MALFORMED_ARTIFACTS_API_JSON:${err instanceof Error ? err.message : String(err)}`
      };
    }
  } else {
    artifactsApiData = {
      ok: false,
      error: `MISSING_ARTIFACTS_API_FILE:${artifactsApiFile}`
    };
  }

  let jobsApiData = null;
  const jobsApiFile = process.env.JOBS_API_JSON ?? "downloaded-jobs-api.json";
  if (existsSync(jobsApiFile)) {
    try {
      jobsApiData = JSON.parse(readFileSync(jobsApiFile, "utf8"));
    } catch (err) {
      jobsApiData = {
        ok: false,
        error: `MALFORMED_JOBS_API_JSON:${err instanceof Error ? err.message : String(err)}`
      };
    }
  } else {
    jobsApiData = {
      ok: false,
      error: `MISSING_JOBS_API_FILE:${jobsApiFile}`
    };
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
