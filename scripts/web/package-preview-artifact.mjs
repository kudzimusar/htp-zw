#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { generateManifest, verifyManifest } from './verify-vercel-manifest.mjs';

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, '.vercel/output');
const PREVIEW_BARRIER_SOURCE = path.join(ROOT_DIR, 'api/preview-barrier.js');

if (!fs.existsSync(OUTPUT_DIR)) {
  console.error('[PACKAGE_ERROR] .vercel/output does not exist. Run "npm run build:phase4:web && npx vercel build --yes" first.');
  process.exit(1);
}

if (!fs.existsSync(PREVIEW_BARRIER_SOURCE)) {
  console.error('[PACKAGE_ERROR] Missing api/preview-barrier.js');
  process.exit(1);
}

const currentSha = (function() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: ROOT_DIR }).trim();
  } catch {
    return 'local';
  }
})();

console.log(`[PACKAGE_PREVIEW] Packaging Reader-Only Preview Artifact for commit ${currentSha}`);

// 1. Ensure build-info.json in static output enforces previewLocked and source-parity
const buildInfo = {
  sha: currentSha,
  presentation: 'apps/mobile',
  capability: 'cp5-phase3-v1',
  basePath: '/',
  serviceMode: 'source-parity',
  previewLocked: true,
  profile: 'reader-only-preview'
};

const staticBuildInfoPath = path.join(OUTPUT_DIR, 'static/build-info.json');
fs.writeFileSync(staticBuildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n', 'utf8');

const distBuildInfoPath = path.join(ROOT_DIR, 'apps/mobile/dist/build-info.json');
if (fs.existsSync(path.dirname(distBuildInfoPath))) {
  fs.writeFileSync(distBuildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n', 'utf8');
}

// 2. Install fail-closed preview barrier in mutating serverless function bundles
// Operational handlers (newsroom, communications, commerce) are replaced with the immutable
// preview barrier. Privileged database, payment, and email code is physically excluded from the lambda.
const barrierContent = fs.readFileSync(PREVIEW_BARRIER_SOURCE, 'utf8');

const mutatingFunctions = [
  { name: 'newsroom.func', file: 'api/newsroom.js' },
  { name: 'communications.func', file: 'api/communications.js' },
  { name: 'commerce.func', file: 'api/commerce.js' }
];

for (const fn of mutatingFunctions) {
  const funcDir = path.join(OUTPUT_DIR, 'functions/api', fn.name);
  if (fs.existsSync(funcDir)) {
    const targetScript = path.join(funcDir, fn.file);
    fs.mkdirSync(path.dirname(targetScript), { recursive: true });
    fs.writeFileSync(targetScript, barrierContent, 'utf8');

    // Update .vc-config.json with baked build-time preview lock environment
    const vcConfigPath = path.join(funcDir, '.vc-config.json');
    if (fs.existsSync(vcConfigPath)) {
      try {
        const vcConfig = JSON.parse(fs.readFileSync(vcConfigPath, 'utf8'));
        vcConfig.environment = {
          ...vcConfig.environment,
          HEALTHTIMES_PREVIEW_LOCK: '1',
          HEALTHTIMES_ARTIFACT_PROFILE: 'reader-only-preview'
        };
        fs.writeFileSync(vcConfigPath, JSON.stringify(vcConfig, null, 2) + '\n', 'utf8');
      } catch (e) {
        console.warn(`[PACKAGE_PREVIEW] Could not update .vc-config.json for ${fn.name}: ${e.message}`);
      }
    }
    console.log(`[PACKAGE_PREVIEW] Sealed ${fn.name} with immutable fail-closed preview barrier.`);
  }
}

// 3. Confirm public reader function is preserved intact
const publicFuncDir = path.join(OUTPUT_DIR, 'functions/api/public.func');
if (!fs.existsSync(publicFuncDir)) {
  console.error('[PACKAGE_ERROR] public.func missing from output artifact!');
  process.exit(1);
}
console.log('[PACKAGE_PREVIEW] Public Reader API function preserved intact.');

// 4. Generate deterministic manifest across all packaged files
const manifest = generateManifest(OUTPUT_DIR);

// 5. Run immediate verification to confirm manifest matches packaged files
verifyManifest({ outputDir: OUTPUT_DIR, expectedSha: currentSha });

console.log('[PACKAGE_PREVIEW] Reader-Only Preview Artifact packaged and verified successfully.');
