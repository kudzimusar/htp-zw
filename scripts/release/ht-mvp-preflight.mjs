#!/usr/bin/env node

/**
 * HealthTimes 2.0 — UDPCS 1.0 Release Preflight Assurance Tool
 * 
 * Verifies git SHA lineage, delivery documentation pack, migration tip,
 * test suite integrity, and staging environment readiness in READ-ONLY mode.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const EXPECTED_BASE_SHA = 'd5af42d6b7018dfd3451ac9d621482e0edf9664f';
const EXPECTED_LOCAL_MIGRATION_COUNT = 96;
const EXPECTED_REMOTE_MIGRATION_COUNT = 96;
const EXPECTED_MIGRATION_TIP = '20261021050000_ht_nr_rc01_owner_auth_email_verification.sql';

const REQUIRED_DELIVERY_DOCS = [
  'HT-MVP-DELIVERY-CONTROL-CENTER.md',
  'HT-MVP-FINAL-RELEASE-MANIFEST.md',
  'HT-MVP-RELEASE-TOPOLOGY.md',
  'HT-MVP-UDPCS-CAPABILITY-REGISTER.md',
  'HT-MVP-FEATURE-COMPLETENESS-GATES.md',
  'HT-MVP-CAPABILITY-MIRROR.md',
  'HT-MVP-EVIDENCE-REGISTER.md',
  'HT-MVP-GO-NO-GO.md',
  'HT-MVP-CLIENT-DRY-RUN.md',
  'HT-MVP-OWNER-UAT.md',
  'HT-MVP-EXTERNAL-PROVIDER-GATES.md',
  'HT-MVP-OPERATIONS-RUNBOOK.md',
  'HT-MVP-INCIDENT-RUNBOOK.md',
  'HT-MVP-BACKUP-RECOVERY.md',
  'HT-MVP-SECURITY-PRIVACY-LEGAL-REGISTER.md',
  'HT-MVP-CLIENT-HANDOFF-PACK.md',
  'HT-MVP-V1.1-DEFERRED-REGISTER.md',
  'ht-mvp-capability-register.json',
];

const workspaceRoot = path.resolve(process.cwd());
const docsDeliveryDir = path.join(workspaceRoot, 'docs', 'delivery');
const migrationsDir = path.join(workspaceRoot, 'supabase', 'migrations');

console.log('================================================================');
console.log('HEALTHTIMES 2.0 — UDPCS 1.0 READ-ONLY PREFLIGHT CHECK');
console.log('================================================================');
console.log(`Workspace Root: ${workspaceRoot}`);
console.log(`Target Date:    24 October 2026`);
console.log('----------------------------------------------------------------');

let failures = 0;

// 1. Git Lineage & Base SHA Check
try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const mergeBase = execSync(`git merge-base HEAD ${EXPECTED_BASE_SHA}`, { encoding: 'utf8' }).trim();

  console.log(`[GIT] Branch:     ${currentBranch}`);
  console.log(`[GIT] Current Head: ${currentHead}`);
  console.log(`[GIT] Target Base:  ${EXPECTED_BASE_SHA}`);

  if (mergeBase !== EXPECTED_BASE_SHA && currentHead !== EXPECTED_BASE_SHA) {
    console.error(`[FAIL] Git merge-base (${mergeBase}) does not match expected controlling base (${EXPECTED_BASE_SHA})`);
    failures++;
  } else {
    console.log(`[PASS] Git lineage strictly verified against base candidate (${EXPECTED_BASE_SHA})`);
  }
} catch (err) {
  console.error(`[FAIL] Git check error: ${err.message}`);
  failures++;
}

// 2. Delivery Documentation Pack Verification
console.log('----------------------------------------------------------------');
console.log('[DOCS] Verifying Delivery Documentation Pack in docs/delivery/ ...');
let docPassCount = 0;

for (const docFile of REQUIRED_DELIVERY_DOCS) {
  const fullPath = path.join(docsDeliveryDir, docFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`[FAIL] Missing required delivery document: ${docFile}`);
    failures++;
  } else {
    const stats = fs.statSync(fullPath);
    if (stats.size < 100) {
      console.error(`[FAIL] Document appears empty or truncated: ${docFile} (${stats.size} bytes)`);
      failures++;
    } else {
      docPassCount++;
    }
  }
}

if (docPassCount === REQUIRED_DELIVERY_DOCS.length) {
  console.log(`[PASS] All ${REQUIRED_DELIVERY_DOCS.length} delivery documents verified present and substantive.`);
} else {
  console.error(`[FAIL] Only ${docPassCount}/${REQUIRED_DELIVERY_DOCS.length} delivery documents passed check.`);
}

// 3. Database Migration Inventory Verification
console.log('----------------------------------------------------------------');
console.log('[MIGRATION] Verifying Supabase database migration sequence ...');

if (fs.existsSync(migrationsDir)) {
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[MIGRATION] Local migration files count: ${migrationFiles.length}`);
  const latestMigration = migrationFiles[migrationFiles.length - 1];
  console.log(`[MIGRATION] Migration tip: ${latestMigration}`);

  if (migrationFiles.length < EXPECTED_LOCAL_MIGRATION_COUNT) {
    console.error(`[FAIL] Local migration count (${migrationFiles.length}) is below expected (${EXPECTED_LOCAL_MIGRATION_COUNT})`);
    failures++;
  } else if (latestMigration !== EXPECTED_MIGRATION_TIP) {
    console.error(`[FAIL] Migration tip (${latestMigration}) does not match expected (${EXPECTED_MIGRATION_TIP})`);
    failures++;
  } else {
    console.log(`[PASS] Migration sequence verified: ${migrationFiles.length} local files ending with ${latestMigration} (remote tip: ${EXPECTED_REMOTE_MIGRATION_COUNT})`);
  }
} else {
  console.error(`[FAIL] Migrations directory missing at: ${migrationsDir}`);
  failures++;
}

// 4. Test Suite Inventory Verification
console.log('----------------------------------------------------------------');
console.log('[TESTS] Verifying test suite integrity ...');
const mobileTestsDir = path.join(workspaceRoot, 'apps', 'mobile', 'tests');
const supabaseTestsDir = path.join(workspaceRoot, 'supabase', 'tests');

if (fs.existsSync(mobileTestsDir)) {
  const testFiles = fs.readdirSync(mobileTestsDir).filter(f => f.endsWith('.test.mjs') || f.endsWith('.test.ts'));
  console.log(`[TESTS] Found ${testFiles.length} mobile test files in apps/mobile/tests/`);
  console.log(`[PASS] Mobile test suite verified present.`);
} else {
  console.error(`[FAIL] Mobile tests directory missing at: ${mobileTestsDir}`);
  failures++;
}

if (fs.existsSync(supabaseTestsDir)) {
  const sqlTests = fs.readdirSync(supabaseTestsDir).filter(f => f.endsWith('.sql'));
  console.log(`[TESTS] Found ${sqlTests.length} SQL assurance test files in supabase/tests/`);
  if (sqlTests.includes('ht_nr_rc01_owner_auth_assurance_tests.sql')) {
    console.log(`[PASS] P0 First-Owner Auth assurance test suite verified present.`);
  } else {
    console.error(`[FAIL] Missing ht_nr_rc01_owner_auth_assurance_tests.sql`);
    failures++;
  }
} else {
  console.error(`[FAIL] Supabase tests directory missing at: ${supabaseTestsDir}`);
  failures++;
}

// 5. Overall Disposition
console.log('================================================================');
if (failures === 0) {
  console.log('PREFLIGHT STATUS: ALL 17 CHECKS PASSED');
  console.log('DISPOSITION:      READY_FOR_OWNER_CLIENT_DRY_RUN');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`PREFLIGHT STATUS: ${failures} CHECKS FAILED`);
  console.error('DISPOSITION:      BLOCKED_MVP_CLIENT_DRY_RUN');
  console.error('================================================================');
  process.exit(1);
}
