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

const REQUIRED_FILES = [
  'config.json',
  'static/index.html',
  'static/manifest.json',
  'static/build-info.json',
  'static/sw.js',
  'static/healthtimes-icon.svg',
  'functions/api/public.func/.vc-config.json'
];

/**
 * Deterministically traverses directory and collects sorted relative file paths.
 * Enforces safety: rejects symlinks, directory traversal, and unsafe characters.
 */
export function getDeterministicFiles(dir, relativeBase = '') {
  let fileList = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Deterministic lexicographical sort
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

    // Reject unsafe path components
    if (entry.name.includes('..') || entry.name.includes('\\') || entry.name.includes(':')) {
      throw new Error(`[MANIFEST_ERROR] Unsafe filename detected: ${relPath}`);
    }

    if (entry.isSymbolicLink()) {
      throw new Error(`[MANIFEST_ERROR] Symbolic links are strictly prohibited in output artifact: ${relPath}`);
    } else if (entry.isDirectory()) {
      fileList = fileList.concat(getDeterministicFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      fileList.push(relPath);
    } else {
      throw new Error(`[MANIFEST_ERROR] Unsupported file system entity: ${relPath}`);
    }
  }
  return fileList.sort();
}

/**
 * Computes deterministic manifest object and aggregate SHA-256 digest.
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

    overallHash.update(`${relPath}:${fileSha256}\n`);
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

  if (fs.existsSync(buildInfoPath)) {
    try {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      buildInfoSha = buildInfo.sha || null;
      serviceMode = buildInfo.serviceMode || serviceMode;
      previewLocked = Boolean(buildInfo.previewLocked);
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
 * Strictly read-only verification of artifact integrity against recorded manifest.
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

  // 4. Validate build-info.json exists and is valid
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

  // 6. Compute fresh manifest from live filesystem
  let liveManifest;
  try {
    liveManifest = computeManifest(outputDir);
  } catch (e) {
    errors.push(`Failed to compute live manifest from ${outputDir}: ${e.message}`);
    return failVerification(errors);
  }

  // 7. Check file count match
  if (liveManifest.fileCount !== goldenManifest.fileCount) {
    errors.push(`File count mismatch: live directory has ${liveManifest.fileCount} files, manifest expected ${goldenManifest.fileCount}`);
  }

  // 8. Check aggregate digest match
  if (liveManifest.aggregateDigest !== goldenManifest.aggregateDigest) {
    errors.push(`Aggregate digest mismatch: live '${liveManifest.aggregateDigest}', manifest '${goldenManifest.aggregateDigest}'`);
  }

  // 9. Check per-file checksum and byte length matches
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
