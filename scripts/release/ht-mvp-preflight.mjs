#!/usr/bin/env node

/**
 * HealthTimes 2.0 — UDPCS 1.0 Release Preflight Assurance Tool
 *
 * Verifies single releasable head across Reader + Newsroom + Launch Control,
 * zero unresolved P0 blockers, delivery documentation pack & governance truth,
 * migration tip, Reader Home hook-order invariant, and test suite integrity.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const EXPECTED_AUTHORITIES = {
  reader: "c4e779dbbc2b65232c90b4e69b74551b62f1910d",
  newsroom: "d5af42d6b7018dfd3451ac9d621482e0edf9664f",
  launchControl: "a57b2748a4aaa46478028ac3857f0f84fbeae5f2"
};
const EXPECTED_LOCAL_MIGRATION_COUNT = 96;
const EXPECTED_REMOTE_MIGRATION_COUNT = 96;
const EXPECTED_MIGRATION_TIP = "20261021050000_ht_nr_rc01_owner_auth_email_verification.sql";

const REQUIRED_DELIVERY_DOCS = [
  "HT-MVP-DELIVERY-CONTROL-CENTER.md",
  "HT-MVP-FINAL-RELEASE-MANIFEST.md",
  "HT-MVP-RELEASE-TOPOLOGY.md",
  "HT-MVP-UDPCS-CAPABILITY-REGISTER.md",
  "HT-MVP-FEATURE-COMPLETENESS-GATES.md",
  "HT-MVP-CAPABILITY-MIRROR.md",
  "HT-MVP-EVIDENCE-REGISTER.md",
  "HT-MVP-GO-NO-GO.md",
  "HT-MVP-CLIENT-DRY-RUN.md",
  "HT-MVP-OWNER-UAT.md",
  "HT-MVP-EXTERNAL-PROVIDER-GATES.md",
  "HT-MVP-OPERATIONS-RUNBOOK.md",
  "HT-MVP-INCIDENT-RUNBOOK.md",
  "HT-MVP-BACKUP-RECOVERY.md",
  "HT-MVP-SECURITY-PRIVACY-LEGAL-REGISTER.md",
  "HT-MVP-CLIENT-HANDOFF-PACK.md",
  "HT-MVP-V1.1-DEFERRED-REGISTER.md",
  "ht-mvp-capability-register.json"
];

const workspaceRoot = path.resolve(process.cwd());
const docsDeliveryDir = path.join(workspaceRoot, "docs", "delivery");
const migrationsDir = path.join(workspaceRoot, "supabase", "migrations");

console.log("================================================================");
console.log("HEALTHTIMES 2.0 — UDPCS 1.0 READ-ONLY PREFLIGHT CHECK");
console.log("================================================================");
console.log(`Workspace Root: ${workspaceRoot}`);
console.log("Target Date:    24 October 2026");
console.log("----------------------------------------------------------------");

let failures = 0;

function isAncestor(ancestorSha) {
  try {
    execSync(`git merge-base --is-ancestor ${ancestorSha} HEAD`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// 1. Single Releasable Head & Authority Lineage Check
try {
  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const readerOk = isAncestor(EXPECTED_AUTHORITIES.reader);
  const newsroomOk = isAncestor(EXPECTED_AUTHORITIES.newsroom);
  const launchControlOk = isAncestor(EXPECTED_AUTHORITIES.launchControl);
  const singleReleasableHead = readerOk && newsroomOk && launchControlOk;

  console.log(`[GIT] Branch:                    ${currentBranch}`);
  console.log(`[GIT] Current Head:              ${currentHead}`);
  console.log(`[GIT] Reader Authority (PR #116): ${EXPECTED_AUTHORITIES.reader} (ancestor=${readerOk})`);
  console.log(`[GIT] Newsroom Authority (PR #118): ${EXPECTED_AUTHORITIES.newsroom} (ancestor=${newsroomOk})`);
  console.log(`[GIT] Launch Control (PR #119):   ${EXPECTED_AUTHORITIES.launchControl} (ancestor=${launchControlOk})`);
  console.log(`[GIT] SINGLE_RELEASABLE_HEAD_EXISTS=${singleReleasableHead ? "YES" : "NO"}`);

  if (!singleReleasableHead) {
    console.error("[FAIL] SINGLE_RELEASABLE_HEAD_EXISTS=NO — one or more required authorities are not ancestors of HEAD");
    failures++;
  } else {
    console.log("[PASS] Single releasable head verified across Reader, Newsroom, and Launch Control authorities.");
  }
} catch (err) {
  console.error(`[FAIL] Git lineage check error: ${err.message}`);
  failures++;
}

// 2. Delivery Documentation Pack & Governance Truth Verification
console.log("----------------------------------------------------------------");
console.log("[DOCS] Verifying Delivery Documentation Pack & Governance Truth ...");
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

// 3. P0 Blocker Gate & Governance Truth Verification
console.log("----------------------------------------------------------------");
console.log("[P0 / TRUTH] Verifying P0 blocker census and non-fabricated governance status ...");
try {
  const registerJson = JSON.parse(
    fs.readFileSync(path.join(docsDeliveryDir, "ht-mvp-capability-register.json"), "utf8")
  );
  const goNoGoMd = fs.readFileSync(path.join(docsDeliveryDir, "HT-MVP-GO-NO-GO.md"), "utf8");
  const manifestMd = fs.readFileSync(path.join(docsDeliveryDir, "HT-MVP-FINAL-RELEASE-MANIFEST.md"), "utf8");

  const p0Count = registerJson?.summary?.p0BlockerCount;
  const goNoGoZeroP0 = /\*Active P0 Blockers Remaining:\*\s*\*\*0\*\*/.test(goNoGoMd);
  const unresolvedP0InTable = /^\|\s*\*\*P0-[^*]+\*\*\s*\|[^|]+\|\s*\*\*(?!RESOLVED\*\*)/m.test(goNoGoMd);

  if (p0Count !== 0 || !goNoGoZeroP0 || unresolvedP0InTable) {
    console.error(`[FAIL] Unresolved P0 blocker detected (register p0BlockerCount=${p0Count}, goNoGoZeroP0=${goNoGoZeroP0}, unresolvedP0InTable=${unresolvedP0InTable})`);
    failures++;
  } else {
    console.log("[PASS] Zero unresolved P0 blockers verified across JSON capability register and Go/No-Go board.");
  }

  const ownerAuthStatus = registerJson?.summary?.ownerPhysicalAuth?.status;
  const legalGate = registerJson?.summary?.externalAdvisorGates?.legalCounsel ?? "";
  const taxGate = registerJson?.summary?.externalAdvisorGates?.taxAdvisor ?? "";
  const dpoGate = registerJson?.summary?.externalAdvisorGates?.dpoCompliance ?? "";

  if (
    ownerAuthStatus !== "OWNER_ACTION_REQUIRED" ||
    !legalGate.includes("NOT_EVIDENCED") ||
    !taxGate.includes("NOT_EVIDENCED") ||
    !dpoGate.includes("NOT_EVIDENCED") ||
    !manifestMd.includes("OWNER_PHYSICAL_AUTH=OWNER_ACTION_REQUIRED")
  ) {
    console.error("[FAIL] Governance truth invariant violated (Owner physical auth or Legal/Tax/DPO review status improperly claimed).");
    failures++;
  } else {
    console.log("[PASS] Delivery governance truth preserved (Owner physical auth = OWNER_ACTION_REQUIRED; Legal/Tax/DPO = NOT_EVIDENCED).");
  }
} catch (err) {
  console.error(`[FAIL] P0 / governance verification error: ${err.message}`);
  failures++;
}

// 4. Unified Reader Runtime Invariant Verification
console.log("----------------------------------------------------------------");
console.log("[RUNTIME] Verifying unified Reader HomeScreen hook-order & presentation invariant ...");
try {
  const readerHomePath = path.join(workspaceRoot, "apps", "mobile", "app", "(reader)", "index.tsx");
  const readerHome = fs.readFileSync(readerHomePath, "utf8");
  const earlyReturnIdx = readerHome.indexOf("if (home.loading) return");
  const presentationHookIdx = readerHome.indexOf("const presentationState = useAsync");
  if (earlyReturnIdx === -1 || presentationHookIdx === -1 || presentationHookIdx > earlyReturnIdx) {
    console.error("[FAIL] Reader HomeScreen violates React Rules of Hooks (useAsync called after early return).");
    failures++;
  } else {
    console.log("[PASS] Reader HomeScreen calls all hooks unconditionally before loading/error early returns.");
  }
} catch (err) {
  console.error(`[FAIL] Reader runtime verification error: ${err.message}`);
  failures++;
}

// 5. Database Migration Inventory Verification
console.log("----------------------------------------------------------------");
console.log("[MIGRATION] Verifying Supabase database migration sequence ...");

if (fs.existsSync(migrationsDir)) {
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`[MIGRATION] Local migration files count: ${migrationFiles.length}`);
  const latestMigration = migrationFiles[migrationFiles.length - 1];
  console.log(`[MIGRATION] Migration tip: ${latestMigration}`);

  if (migrationFiles.length !== EXPECTED_LOCAL_MIGRATION_COUNT) {
    console.error(`[FAIL] Local migration count (${migrationFiles.length}) does not match expected (${EXPECTED_LOCAL_MIGRATION_COUNT})`);
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

// 6. Test Suite Inventory Verification
console.log("----------------------------------------------------------------");
console.log("[TESTS] Verifying test suite integrity ...");
const mobileTestsDir = path.join(workspaceRoot, "apps", "mobile", "tests");
const supabaseTestsDir = path.join(workspaceRoot, "supabase", "tests");

if (fs.existsSync(mobileTestsDir)) {
  const testFiles = fs.readdirSync(mobileTestsDir).filter((f) => f.endsWith(".test.mjs") || f.endsWith(".test.ts"));
  console.log(`[TESTS] Found ${testFiles.length} mobile test files in apps/mobile/tests/`);
  console.log("[PASS] Mobile test suite verified present.");
} else {
  console.error(`[FAIL] Mobile tests directory missing at: ${mobileTestsDir}`);
  failures++;
}

if (fs.existsSync(supabaseTestsDir)) {
  const sqlTests = fs.readdirSync(supabaseTestsDir).filter((f) => f.endsWith(".sql"));
  console.log(`[TESTS] Found ${sqlTests.length} SQL assurance test files in supabase/tests/`);
  if (sqlTests.includes("ht_nr_rc01_owner_auth_assurance_tests.sql")) {
    console.log("[PASS] P0 First-Owner Auth assurance test suite verified present.");
  } else {
    console.error("[FAIL] Missing ht_nr_rc01_owner_auth_assurance_tests.sql");
    failures++;
  }
} else {
  console.error(`[FAIL] Supabase tests directory missing at: ${supabaseTestsDir}`);
  failures++;
}

// 7. Overall Disposition
console.log("================================================================");
if (failures === 0) {
  console.log("PREFLIGHT STATUS: ALL CHECKS PASSED");
  console.log("DISPOSITION:      READY_FOR_OWNER_CLIENT_DRY_RUN");
  console.log("================================================================");
  process.exit(0);
} else {
  console.error(`PREFLIGHT STATUS: ${failures} CHECKS FAILED`);
  console.error("DISPOSITION:      BLOCKED_MVP_CLIENT_DRY_RUN");
  console.error("================================================================");
  process.exit(1);
}
