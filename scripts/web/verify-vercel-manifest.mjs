#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, '.vercel/output');

if (!fs.existsSync(OUTPUT_DIR)) {
  console.error('Error: .vercel/output directory does not exist. Run "npx vercel build" first.');
  process.exit(1);
}

function getFiles(dir, relativeBase = '') {
  let fileList = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      fileList = fileList.concat(getFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      fileList.push(relPath);
    }
  }
  return fileList;
}

const allRelativePaths = getFiles(OUTPUT_DIR).sort();
console.log(`[MANIFEST] Discovered ${allRelativePaths.length} files in .vercel/output`);

const entries = [];
const overallHash = crypto.createHash('sha256');

for (const relPath of allRelativePaths) {
  const filePath = path.join(OUTPUT_DIR, relPath);
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
console.log(`[MANIFEST] Deterministic Package Manifest SHA-256 Digest: ${aggregateDigest}`);

let currentGitSha = 'local';
try {
  currentGitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {}

const buildInfoPath = path.join(OUTPUT_DIR, 'static/build-info.json');
let buildInfoSha = null;
if (fs.existsSync(buildInfoPath)) {
  try {
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfoSha = buildInfo.sha || null;
    console.log(`[MANIFEST] build-info.json SHA: ${buildInfoSha}`);
    console.log(`[MANIFEST] Candidate Git HEAD:  ${currentGitSha}`);
    if (buildInfoSha === currentGitSha) {
      console.log(`[MANIFEST] PASS: build-info.json matches Candidate Git HEAD exactly.`);
    } else {
      console.warn(`[MANIFEST] WARNING: build-info.json SHA (${buildInfoSha}) differs from current HEAD (${currentGitSha}). Run build:phase4:web to sync.`);
    }
  } catch (e) {
    console.error(`[MANIFEST] Failed to parse build-info.json: ${e.message}`);
  }
} else {
  console.error(`[MANIFEST] Missing build-info.json in .vercel/output/static!`);
}

const manifestOutputPath = path.join(ROOT_DIR, '.vercel/package-manifest.json');
fs.writeFileSync(manifestOutputPath, JSON.stringify({
  version: 1,
  aggregateDigest,
  fileCount: allRelativePaths.length,
  gitSha: currentGitSha,
  buildInfoSha,
  timestamp: new Date().toISOString(),
  entries
}, null, 2) + '\n', 'utf8');

console.log(`[MANIFEST] Manifest written to ${manifestOutputPath}`);
