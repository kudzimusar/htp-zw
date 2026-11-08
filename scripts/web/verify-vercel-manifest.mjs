#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, '.vercel/output');
const MANIFEST_PATH = path.join(ROOT_DIR, '.vercel/package-manifest.json');
const PREVIEW_BARRIER_SOURCE = path.join(ROOT_DIR, 'api/preview-barrier.js');

const REQUIRED_FILES = [
  'config.json',
  'static/index.html',
  'static/manifest.json',
  'static/build-info.json',
  'static/sw.js',
  'static/healthtimes-icon.svg',
  'functions/api/public.func/.vc-config.json',
  'functions/api/public.func/api/public.js',
  'functions/api/newsroom.func/.vc-config.json',
  'functions/api/newsroom.func/api/newsroom.js',
  'functions/api/communications.func/.vc-config.json',
  'functions/api/communications.func/api/communications.js',
  'functions/api/commerce.func/.vc-config.json',
  'functions/api/commerce.func/api/commerce.js'
];

const ALLOWED_API_FUNCTIONS = new Set([
  'public.func',
  'newsroom.func',
  'communications.func',
  'commerce.func'
]);

/**
 * Deterministically traverses directory and collects sorted relative file paths.
 * Enforces safety: rejects symlinks, directory traversal, and unsafe characters.
 */
export function getDeterministicFiles(dir, relativeBase = '') {
  let fileList = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

    // Reject symbolic links in deploy artifact
    if (entry.isSymbolicLink()) {
      throw new Error(`[MANIFEST_ERROR] Symbolic link detected in output artifact: ${relPath}`);
    }

    // Reject path traversal characters in relative paths
    if (relPath.includes('..') || relPath.startsWith('/') || relPath.includes('\\')) {
      throw new Error(`[MANIFEST_ERROR] Unsafe path format detected: ${relPath}`);
    }

    if (entry.isDirectory()) {
      fileList = fileList.concat(getDeterministicFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      fileList.push(relPath);
    }
  }

  return fileList.sort();
}

/**
 * Computes deterministic file digests and overall aggregate SHA-256 hash
 */
export function computeManifest(outputDir = OUTPUT_DIR) {
  if (!fs.existsSync(outputDir)) {
    throw new Error(`[MANIFEST_ERROR] Output directory does not exist: ${outputDir}`);
  }

  const allRelativePaths = getDeterministicFiles(outputDir);
  const entries = [];
  const overallHash = crypto.createHash('sha256');

  for (const relPath of allRelativePaths) {
    const filePath = path.join(outputDir, relPath);
    const content = fs.readFileSync(filePath);
    const fileSha256 = crypto.createHash('sha256').update(content).digest('hex');
    entries.push({
      path: relPath,
      sha256: fileSha256,
      bytes: content.length
    });
    overallHash.update(`${relPath}:${fileSha256}:${content.length}\n`);
  }

  const aggregateDigest = overallHash.digest('hex');

  let gitSha = 'local';
  try {
    gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: ROOT_DIR }).trim();
  } catch {}

  const buildInfoPath = path.join(outputDir, 'static/build-info.json');
  let buildInfoSha = null;
  let serviceMode = 'source-parity';
  let previewLocked = false;
  let profile = 'reader-only-preview';

  if (fs.existsSync(buildInfoPath)) {
    try {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      buildInfoSha = buildInfo.sha || null;
      serviceMode = buildInfo.serviceMode || serviceMode;
      previewLocked = Boolean(buildInfo.previewLocked);
      profile = buildInfo.profile || profile;
    } catch (e) {
      throw new Error(`[MANIFEST_ERROR] Failed to parse static/build-info.json: ${e.message}`);
    }
  }

  return {
    version: 1,
    aggregateDigest,
    fileCount: allRelativePaths.length,
    gitSha,
    buildInfoSha,
    serviceMode,
    previewLocked,
    profile,
    timestamp: new Date().toISOString(),
    entries
  };
}

/**
 * Generates and writes .vercel/package-manifest.json
 */
export function generateManifest(outputDir = OUTPUT_DIR, manifestPath = MANIFEST_PATH) {
  const manifest = computeManifest(outputDir);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[MANIFEST] Discovered ${manifest.fileCount} files in ${outputDir}`);
  console.log(`[MANIFEST] Deterministic Package Manifest SHA-256 Digest: ${manifest.aggregateDigest}`);
  console.log(`[MANIFEST] Manifest written to ${manifestPath}`);
  return manifest;
}

/**
 * Strictly read-only verification of artifact integrity against recorded manifest and security policies.
 * Returns true if valid; throws or exits nonzero on ANY discrepancy.
 */
export function verifyManifest(options = {}) {
  const outputDir = options.outputDir || OUTPUT_DIR;
  const manifestPath = options.manifestPath || MANIFEST_PATH;
  const expectedSha = options.expectedSha || (function() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: ROOT_DIR }).trim();
    } catch {
      return null;
    }
  })();

  const errors = [];

  // 1. Validate output directory exists
  if (!fs.existsSync(outputDir)) {
    errors.push(`Output directory does not exist: ${outputDir}`);
    return failVerification(errors);
  }

  // 2. Validate manifest file exists
  if (!fs.existsSync(manifestPath)) {
    errors.push(`Manifest file does not exist: ${manifestPath}. Run with --generate first.`);
    return failVerification(errors);
  }

  // 3. Read and parse manifest
  let goldenManifest;
  try {
    goldenManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push(`Malformed manifest JSON at ${manifestPath}: ${e.message}`);
    return failVerification(errors);
  }

  // 4. Validate build-info.json exists and satisfies strict security metadata policies
  const buildInfoPath = path.join(outputDir, 'static/build-info.json');
  if (!fs.existsSync(buildInfoPath)) {
    errors.push(`Missing required static/build-info.json in ${outputDir}`);
  } else {
    try {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      if (!buildInfo.sha || typeof buildInfo.sha !== 'string' || buildInfo.sha.length < 7) {
        errors.push(`build-info.json has missing or invalid sha property: ${JSON.stringify(buildInfo.sha)}`);
      } else if (expectedSha && buildInfo.sha !== expectedSha) {
        errors.push(`build-info.json SHA mismatch: artifact has '${buildInfo.sha}', expected '${expectedSha}'`);
      }
      if (buildInfo.serviceMode !== 'source-parity') {
        errors.push(`build-info.json serviceMode must be 'source-parity', found '${buildInfo.serviceMode}'`);
      }
      if (buildInfo.previewLocked !== true) {
        errors.push(`build-info.json previewLocked must be true, found ${buildInfo.previewLocked}`);
      }
      if (buildInfo.profile !== 'reader-only-preview') {
        errors.push(`build-info.json profile must be 'reader-only-preview', found '${buildInfo.profile}'`);
      }
    } catch (e) {
      errors.push(`build-info.json is malformed JSON: ${e.message}`);
    }
  }

  // 5. Validate required baseline files
  for (const reqFile of REQUIRED_FILES) {
    const fullReq = path.join(outputDir, reqFile);
    if (!fs.existsSync(fullReq)) {
      errors.push(`Required baseline file missing: ${reqFile}`);
    }
  }

  // 6. Security-Aware Function Bundle Inspection (DEF-G3-02)
  const apiFuncDir = path.join(outputDir, 'functions/api');
  if (fs.existsSync(apiFuncDir)) {
    const discoveredFuncs = fs.readdirSync(apiFuncDir).filter(name => name.endsWith('.func'));

    // Check for unexpected function bundles
    for (const discovered of discoveredFuncs) {
      if (!ALLOWED_API_FUNCTIONS.has(discovered)) {
        errors.push(`Unexpected function bundle detected in preview artifact: functions/api/${discovered}`);
      }
    }

    // Determine approved preview barrier hash
    let approvedBarrierHash = options.expectedBarrierDigest || null;
    if (!approvedBarrierHash && fs.existsSync(PREVIEW_BARRIER_SOURCE)) {
      approvedBarrierHash = crypto.createHash('sha256').update(fs.readFileSync(PREVIEW_BARRIER_SOURCE)).digest('hex');
    }

    // Inspect mutating function bundles for trusted barrier sealing
    const mutatingBundles = [
      { name: 'newsroom.func', handlerFile: 'api/newsroom.js' },
      { name: 'communications.func', handlerFile: 'api/communications.js' },
      { name: 'commerce.func', handlerFile: 'api/commerce.js' }
    ];

    for (const mb of mutatingBundles) {
      const bundleDir = path.join(apiFuncDir, mb.name);
      if (fs.existsSync(bundleDir)) {
        const vcConfigPath = path.join(bundleDir, '.vc-config.json');
        if (fs.existsSync(vcConfigPath)) {
          try {
            const vcConfig = JSON.parse(fs.readFileSync(vcConfigPath, 'utf8'));
            if (vcConfig.environment?.HEALTHTIMES_PREVIEW_LOCK !== '1') {
              errors.push(`${mb.name}/.vc-config.json missing HEALTHTIMES_PREVIEW_LOCK='1'`);
            }
            if (vcConfig.environment?.HEALTHTIMES_ARTIFACT_PROFILE !== 'reader-only-preview') {
              errors.push(`${mb.name}/.vc-config.json missing HEALTHTIMES_ARTIFACT_PROFILE='reader-only-preview'`);
            }
            if (vcConfig.handler !== mb.handlerFile) {
              errors.push(`${mb.name} handler entrypoint mismatch: found '${vcConfig.handler}', expected '${mb.handlerFile}'`);
            }
          } catch (e) {
            errors.push(`${mb.name}/.vc-config.json malformed JSON: ${e.message}`);
          }
        }

        // Validate handler script matches approved barrier hash
        const handlerScriptPath = path.join(bundleDir, mb.handlerFile);
        if (fs.existsSync(handlerScriptPath)) {
          if (approvedBarrierHash) {
            const liveHandlerHash = crypto.createHash('sha256').update(fs.readFileSync(handlerScriptPath)).digest('hex');
            if (liveHandlerHash !== approvedBarrierHash) {
              errors.push(`${mb.name} handler is NOT sealed with approved preview barrier! Live: ${liveHandlerHash}, Expected: ${approvedBarrierHash}`);
            }
          }
        } else {
          errors.push(`${mb.name} handler entrypoint file missing at ${mb.handlerFile}`);
        }

        // Verify absence of unexpected extraneous scripts in mutating bundles
        function checkNoExtraneous(dir) {
          for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              checkNoExtraneous(full);
            } else if (ent.isFile() && ent.name.endsWith('.js')) {
              const rel = path.relative(bundleDir, full).replace(/\\/g, '/');
              if (rel !== mb.handlerFile) {
                errors.push(`Unexpected executable script retained in sealed bundle ${mb.name}: ${rel}`);
              }
            }
          }
        }
        checkNoExtraneous(bundleDir);
      }
    }
  }

  // 7. Compute fresh manifest from live filesystem
  let liveManifest;
  try {
    liveManifest = computeManifest(outputDir);
  } catch (e) {
    errors.push(`Failed to compute live manifest from ${outputDir}: ${e.message}`);
    return failVerification(errors);
  }

  // 8. Check file count match
  if (liveManifest.fileCount !== goldenManifest.fileCount) {
    errors.push(`File count mismatch: live directory has ${liveManifest.fileCount} files, manifest expected ${goldenManifest.fileCount}`);
  }

  // 9. Check aggregate digest match
  if (liveManifest.aggregateDigest !== goldenManifest.aggregateDigest) {
    errors.push(`Aggregate digest mismatch: live '${liveManifest.aggregateDigest}', manifest '${goldenManifest.aggregateDigest}'`);
  }

  // 10. Check per-file checksum and byte length matches
  const goldenMap = new Map((goldenManifest.entries || []).map(e => [e.path, e]));
  const liveMap = new Map((liveManifest.entries || []).map(e => [e.path, e]));

  for (const [relPath, liveEntry] of liveMap.entries()) {
    const goldenEntry = goldenMap.get(relPath);
    if (!goldenEntry) {
      errors.push(`Untracked extraneous file detected: ${relPath}`);
    } else {
      if (liveEntry.sha256 !== goldenEntry.sha256) {
        errors.push(`File byte hash mismatch for '${relPath}': live ${liveEntry.sha256}, expected ${goldenEntry.sha256}`);
      }
      if (liveEntry.bytes !== goldenEntry.bytes) {
        errors.push(`File byte size mismatch for '${relPath}': live ${liveEntry.bytes} bytes, expected ${goldenEntry.bytes} bytes`);
      }
    }
  }

  for (const [relPath] of goldenMap.entries()) {
    if (!liveMap.has(relPath)) {
      errors.push(`Expected file missing from artifact: ${relPath}`);
    }
  }

  if (errors.length > 0) {
    return failVerification(errors);
  }

  console.log(`[MANIFEST] PASS: All ${liveManifest.fileCount} artifact files verified.`);
  console.log(`[MANIFEST] Aggregate Digest: ${liveManifest.aggregateDigest}`);
  console.log(`[MANIFEST] Build SHA:        ${liveManifest.buildInfoSha} (Matches expected: ${expectedSha || 'N/A'})`);
  console.log(`[MANIFEST] Service Mode:     ${liveManifest.serviceMode}`);
  console.log(`[MANIFEST] Preview Locked:   ${liveManifest.previewLocked}`);
  console.log(`[MANIFEST] Profile:          ${liveManifest.profile}`);
  return true;
}

function failVerification(errors) {
  console.error(`[MANIFEST_VERIFICATION_FAILED] ${errors.length} verification error(s) detected:`);
  for (let i = 0; i < errors.length; i++) {
    console.error(`  ${i + 1}. ${errors[i]}`);
  }
  const err = new Error(`Manifest verification failed with ${errors.length} error(s): ${errors.join('; ')}`);
  err.errors = errors;
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
  throw err;
}

// CLI Execution
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const isVerify = args.includes('--verify');
  const isGenerate = args.includes('--generate');
  const shaIndex = args.indexOf('--expected-sha');
  const expectedSha = shaIndex >= 0 && args[shaIndex + 1] ? args[shaIndex + 1] : undefined;

  try {
    if (isVerify) {
      verifyManifest({ expectedSha });
    } else if (isGenerate) {
      generateManifest();
    } else {
      // Default: generate then verify
      generateManifest();
      verifyManifest({ expectedSha });
    }
  } catch (err) {
    process.exit(1);
  }
}
