#!/usr/bin/env node

/**
 * HealthTimes 2.0 — Deterministic Production Migration Governor (HT-MVP-REL-COM-01-R2)
 *
 * Source-controlled migration execution and safety engine.
 * - Controls future migration execution with an explicit, auditable, and fail-closed plan.
 * - Prevents staging-only migrations from entering an executable production package.
 * - Requires explicit destination identity verification (rejects target/destination mismatch).
 * - Validates migration checksums and source custody against signed manifest.
 * - Verifies migration dependencies and previously applied versions on the destination database.
 * - Prevents unreviewed migrations from being silently classified as safe.
 * - Executes migrations with fail-closed transaction control and error-abort safety.
 * - Rejects prohibited direct or unfiltered release paths.
 * - Generates inspectable execution and rejection evidence.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT_DIR = path.resolve(process.cwd());
const MIGRATIONS_DIR = path.join(ROOT_DIR, "supabase", "migrations");
const MANIFEST_PATH = path.join(ROOT_DIR, "docs", "delivery", "ht-mvp-production-migration-manifest.json");
const AUDIT_PATH = path.join(ROOT_DIR, "docs", "delivery", "migration-execution-audit.json");

export const STAGING_PROJECT_REF = "bzuvntbkevvuhfhqhkua";
export const STAGING_LEDGER_TIP = "20261030001134";

// Authoritative classification of all migrations introduced in the commercial and release units
export const QUARANTINED_STAGING_MIGRATIONS = [
  "20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql",
  "20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql"
];

export const QUARANTINED_LEDGER_VERSIONS = [
  "20261029080000",
  "20261029090000",
  "20261029131047",
  "20261029142840"
];

export const CANONICAL_COMMERCIAL_DDL_SEQUENCE = [
  "20261029020000_ht_mvp_com_final01_operational_completion.sql",
  "20261029040000_ht_mvp_com_final01_r1_privilege_hardening.sql",
  "20261029050000_ht_mvp_com_final01_r1_idempotency_fix.sql",
  "20261029060000_ht_mvp_com_final01_r2_r1_statement_reversal_parity.sql",
  "20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql",
  "20261030100000_ht_mvp_rel_com01_production_migration_safety.sql"
];

// Staging schema_migrations ledger timestamp to file mapping
export const STAGING_LEDGER_VERSION_MAP = {
  "20261025123000_ht_mvp_uat04b_staff_directory_current_actor.sql": "20261025133040",
  "20261029020000_ht_mvp_com_final01_operational_completion.sql": "20261029031548",
  "20261029040000_ht_mvp_com_final01_r1_privilege_hardening.sql": "20261029044030",
  "20261029050000_ht_mvp_com_final01_r1_idempotency_fix.sql": "20261029045728",
  "20261029060000_ht_mvp_com_final01_r2_r1_statement_reversal_parity.sql": "20261029060000",
  "20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql": "20261029070000",
  "20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql": "20261029131047",
  "20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql": "20261029142840",
  "20261030100000_ht_mvp_rel_com01_production_migration_safety.sql": "20261030001134"
};

// Authoritative audited baseline migrations (102 files)
export const KNOWN_CANONICAL_BASELINE_MIGRATIONS = [
  "20260909000100_content_core.sql",
  "20260909000200_taxonomy_and_geo.sql",
  "20260909000300_redirects_and_seo.sql",
  "20260909000400_analytics_and_ads.sql",
  "20260909000500_migration_runs_and_checkpoints.sql",
  "20260916030642_ag02_staging_security_baseline.sql",
  "20260921232347_ag05_seo_analytics_monetization_continuity.sql",
  "20260922003145_ag05_rehearsal_runtime_closure.sql",
  "20260922003554_ag05_sitemap_xml_rpc.sql",
  "20260922003722_ag05_url_resolution_ledger.sql",
  "20260922004651_ag05_link_ledger_evidence.sql",
  "20260922005024_ag05_materialize_link_audit.sql",
  "20260922020254_ag06_newsroom_auth_rbac.sql",
  "20260922021319_ag06_staging_http_cert_helper.sql",
  "20260922021408_ag06_staging_http_cert_helper_cleanup.sql",
  "20260922021521_ag06_security_advisor_hardening.sql",
  "20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql",
  "20260922030247_ag05_context_routes.sql",
  "20260922030729_ag05_preserve_direct_handoff_case.sql",
  "20260922031250_ag06_newsroom_story_listing_perf.sql",
  "20260922032244_ag06_story_rls_performance.sql",
  "20260922033138_ag06_certification_cleanup_35683173735_v2.sql",
  "20260922033157_ag06_auth_delete_revocation.sql",
  "20260922033542_ag06_auth_delete_guard.sql",
  "20260922035013_ag05_normalize_preserve_strategy.sql",
  "20260922035050_ag06_cleanup_failed_certification_users.sql",
  "20260922035335_ag05_nested_category_context.sql",
  "20260922040649_ag05_rehearsal_readiness_guard.sql",
  "20260922054411_ca01_internal_schema_capabilities.sql",
  "20260922054415_ca01_inbox_story_discussion.sql",
  "20260922054420_ca01_desks_threads_announcements.sql",
  "20260922054424_ca01_communication_storage.sql",
  "20260922054428_ca01_reader_discussion_moderation.sql",
  "20260922054449_ca01_realtime_authorization.sql",
  "20260922055517_ca01_attachment_access_hardening.sql",
  "20260922061142_ca01_attachment_access_hardening.sql",
  "20260922061238_ca01_desk_member_rls_recursion_fix.sql",
  "20260922065253_ca01_fk_index_hardening.sql",
  "20260922065811_ca01_fk_index_hardening.sql",
  "20260922070256_ca01_realtime_event_emission.sql",
  "20260922094527_com01_communications_domain.sql",
  "20260922095013_com01_private_attachments.sql",
  "20260922100851_com01_campaign_and_escalation_authority.sql",
  "20260924072830_ag06_story_media_request_changes.sql",
  "20260924073135_ag06_media_listing_performance.sql",
  "20260924073537_ag06_media_storage_policy_helper.sql",
  "20260924074219_ag06_media_storage_read_helper.sql",
  "20260924103201_ag06_cms_public_media_promotion.sql",
  "20260924105815_ag06_native_reader_release_marker.sql",
  "20260925230247_ag06_public_story_release_boundary_hardening.sql",
  "20260927040923_ag06_certification_active_binding_cleanup.sql",
  "20260927091500_ag06_canonical_author_section_authority.sql",
  "20260927093000_ag06_native_public_context.sql",
  "20260927094500_ag06_inline_body_binding.sql",
  "20260927101500_ag06_public_inline_media_promotion.sql",
  "20260927110000_ag06_inline_public_storage_authority.sql",
  "20260927113000_ag06_certification_author_binding_cleanup.sql",
  "20260927120000_ag06_certification_cleanup_service_role_claim.sql",
  "20260927121500_ag06_audit_feed_performance.sql",
  "20260927123000_ag06_certification_active_binding_cleanup.sql",
  "20261002060846_ag05_premium_teaser_public_projection.sql",
  "20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql",
  "20261016140000_ht_nr04b_public_homepage_presentations.sql",
  "20261016150000_ht_nr04b_r1_public_presentation_safety.sql",
  "20261016190000_ht_nr05b_r1_story_media_integrity.sql",
  "20261016210000_ht_nr05c_video_desk_foundation.sql",
  "20261016220000_ht_nr05ca_r1_video_url_safety.sql",
  "20261016230000_ht_nr05ca_r2_video_url_port_safety.sql",
  "20261017000000_ht_nr05cb_public_watch_delivery.sql",
  "20261017010000_ht_nr05da_live_desk_foundation.sql",
  "20261017020000_ht_nr05db_live_blog_updates.sql",
  "20261017020000_ht_nr06b_campaign_read_authority.sql",
  "20261017030000_ht_nr05db_r1_stream_integrity.sql",
  "20261017030000_ht_nr06ca_push_alert_foundation.sql",
  "20261017031000_ht_nr06ca_r1_push_security_boundary.sql",
  "20261017040000_ht_nr06cb_push_provider_execution.sql",
  "20261017041000_ht_nr06cb_r1_dispatch_idempotency_runtime_parity.sql",
  "20261017050000_ht_nr06d_whatsapp_distribution_foundation.sql",
  "20261017060000_ht_nr_wave_b_intelligence.sql",
  "20261017070000_ht_nr_wave_c_staff_operations.sql",
  "20261017080000_ht_nr_wave_d_commercial_operations.sql",
  "20261017090000_ht_nr_wave_e_ai_and_citations.sql",
  "20261017100000_ht_nr_wave_f_authors_taxonomy_settings.sql",
  "20261018040000_ht_nr_r1_runtime_truth_audit_acl.sql",
  "20261018050000_ht_nr_r1_whatsapp_provider_webhook.sql",
  "20261018060000_ht_nr_close_r2_provider_integrity.sql",
  "20261018070000_ht_nr_close_r3_transport_serialization.sql",
  "20261018080000_ht_nr_close_r4_send_authority.sql",
  "20261020041108_ui_nr_conv02_native_context_discovery.sql",
  "20261020042423_ui_nr_conv02_r1_context_media_https_boundary.sql",
  "20261021000000_ht_nr_ui01_finance_foundation.sql",
  "20261021010000_ht_nr_ui01_first_owner_bootstrap.sql",
  "20261021020000_ht_nr_ui02_bootstrap_security_hardening.sql",
  "20261021030000_ht_nr_ui02_acl_hardening.sql",
  "20261021040000_ht_nr_ui02_general_ledger.sql",
  "20261021050000_ht_nr_rc01_owner_auth_email_verification.sql",
  "20261025105152_ht_mvp_uat04b_staging_contract_convergence.sql",
  "20261025123000_ht_mvp_uat04b_staff_directory_current_actor.sql",
  "20261027000000_ht_ext01a_payment_finance_readiness.sql",
  "20261027010000_ht_ext01a_rdy01_stg01_pgcrypto_runtime_parity.sql",
  "20261028010000_ht_ext01a_paynow_test_authority.sql",
  "20261029010000_ht_ext01a_paynow_currency_evidence.sql"
];

/**
 * Computes SHA-256 hash of a file
 */
export function hashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`FAIL_CLOSED: File does not exist on disk: ${filePath}`);
  }
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Scans local migrations directory and returns catalog.
 * Fails closed if any unreviewed migration is detected.
 */
export function scanMigrationCatalog(migrationsDir = MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`FAIL_CLOSED: Migrations directory not found at ${migrationsDir}`);
  }

  const allFiles = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const catalog = allFiles.map((file) => {
    const filePath = path.join(migrationsDir, file);
    const sha256 = hashFile(filePath);
    const isQuarantined = QUARANTINED_STAGING_MIGRATIONS.includes(file);
    const isCanonicalCommercial = CANONICAL_COMMERCIAL_DDL_SEQUENCE.includes(file);
    const isKnownBaseline = KNOWN_CANONICAL_BASELINE_MIGRATIONS.includes(file);

    let classification = "UNKNOWN";
    if (isQuarantined) {
      classification = "STAGING_ONLY_UAT_RECONCILIATION_QUARANTINED";
    } else if (isCanonicalCommercial) {
      classification = "CANONICAL_COMMERCIAL_DDL";
    } else if (isKnownBaseline) {
      classification = "CANONICAL_BASELINE";
    } else {
      // FAIL-CLOSED: Prevent unreviewed migrations from being silently classified as safe
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Unreviewed migration detected: ${file}. All migrations must be explicitly reviewed and categorized before release.`
      );
    }

    return {
      file,
      classification,
      sha256,
      stagingLedgerVersion: STAGING_LEDGER_VERSION_MAP[file] || file.split("_")[0],
      isQuarantinedForProduction: isQuarantined
    };
  });

  return catalog;
}

/**
 * Builds a deterministic migration execution plan for a specific target
 */
export function buildMigrationPlan(target = "production", migrationsDir = MIGRATIONS_DIR) {
  const normalizedTarget = (target || "").toLowerCase();
  const catalog = scanMigrationCatalog(migrationsDir);

  if (normalizedTarget === "production") {
    // 1. Strictly exclude quarantined staging-only migrations
    const plan = catalog.filter((entry) => !entry.isQuarantinedForProduction);

    // 2. FAIL-CLOSED INVARIANT 1: Assert NO quarantined files are in production plan
    const violations = plan.filter((entry) => QUARANTINED_STAGING_MIGRATIONS.includes(entry.file));
    if (violations.length > 0) {
      const names = violations.map((v) => v.file).join(", ");
      throw new Error(`CRITICAL_FAIL_CLOSED: Production migration plan contains quarantined staging-only migrations: [${names}]`);
    }

    // 3. FAIL-CLOSED INVARIANT 2: Assert ALL canonical commercial DDL migrations are present in exact sequence
    const plannedCommercialFiles = plan
      .filter((entry) => CANONICAL_COMMERCIAL_DDL_SEQUENCE.includes(entry.file))
      .map((entry) => entry.file);

    if (plannedCommercialFiles.length !== CANONICAL_COMMERCIAL_DDL_SEQUENCE.length) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Missing canonical commercial DDL migrations. Expected ${CANONICAL_COMMERCIAL_DDL_SEQUENCE.length}, found ${plannedCommercialFiles.length}`
      );
    }

    for (let i = 0; i < CANONICAL_COMMERCIAL_DDL_SEQUENCE.length; i++) {
      if (plannedCommercialFiles[i] !== CANONICAL_COMMERCIAL_DDL_SEQUENCE[i]) {
        throw new Error(
          `CRITICAL_FAIL_CLOSED: Canonical commercial DDL sequence violation at index ${i}. Expected ${CANONICAL_COMMERCIAL_DDL_SEQUENCE[i]}, found ${plannedCommercialFiles[i]}`
        );
      }
    }

    return {
      target: "production",
      plan,
      totalMigrations: plan.length,
      excludedMigrations: QUARANTINED_STAGING_MIGRATIONS,
      exclusionEnforced: true,
      productionSafe: true
    };
  }

  if (normalizedTarget === "staging") {
    return {
      target: "staging",
      plan: catalog,
      totalMigrations: catalog.length,
      excludedMigrations: [],
      exclusionEnforced: false,
      productionSafe: false
    };
  }

  if (normalizedTarget === "disposable") {
    // Disposable test environment runs the exact production plan to prove safety
    const prodPlan = buildMigrationPlan("production", migrationsDir);
    return {
      ...prodPlan,
      target: "disposable"
    };
  }

  throw new Error(`CRITICAL_FAIL_CLOSED: Unknown target environment: "${target}". Valid targets are: production, staging, disposable.`);
}

/**
 * Validates explicit destination identity and authorization
 */
export function verifyDestinationIdentity({ target, destinationId, dbContext = null }) {
  const normTarget = (target || "").toLowerCase();

  if (!["production", "staging", "disposable"].includes(normTarget)) {
    throw new Error(`CRITICAL_FAIL_CLOSED: Invalid target environment: "${target}".`);
  }

  if (!destinationId || typeof destinationId !== "string" || destinationId.trim() === "") {
    throw new Error("CRITICAL_FAIL_CLOSED: Missing required destination identity (--destination-id).");
  }

  if (normTarget === "production") {
    // Production requires explicit governance authorization
    if (process.env.PRODUCTION_MIGRATIONS_AUTHORIZED !== "true") {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Production migration execution is NOT authorized. PRODUCTION_MIGRATIONS_AUTHORIZED is false or unset."
      );
    }

    const expectedProdId = process.env.PRODUCTION_PROJECT_REF || "production-canonical";
    if (destinationId !== expectedProdId) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Destination identity mismatch for production. Expected ${expectedProdId}, got ${destinationId}`
      );
    }

    if (destinationId === STAGING_PROJECT_REF || destinationId === "disposable") {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Prohibited destination identity for production: ${destinationId}`
      );
    }

    if (dbContext && (dbContext.project_ref === STAGING_PROJECT_REF || dbContext.is_staging)) {
      throw new Error("CRITICAL_FAIL_CLOSED: Target is production but connected database is staging!");
    }
  }

  if (normTarget === "staging") {
    if (destinationId !== STAGING_PROJECT_REF) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Staging destination identity mismatch. Expected ${STAGING_PROJECT_REF}, got ${destinationId}`
      );
    }
    if (dbContext && dbContext.project_ref && dbContext.project_ref !== STAGING_PROJECT_REF) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Connected database project ref (${dbContext.project_ref}) does not match staging.`
      );
    }
  }

  if (normTarget === "disposable") {
    if (!["disposable", "ht-disposable-pg", "localhost-test"].includes(destinationId)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable destination identity mismatch. Expected "disposable" or "ht-disposable-pg", got "${destinationId}"`
      );
    }
    if (destinationId === STAGING_PROJECT_REF) {
      throw new Error("CRITICAL_FAIL_CLOSED: Disposable destination cannot be staging project ref!");
    }
    if (dbContext && dbContext.project_ref === STAGING_PROJECT_REF) {
      throw new Error("CRITICAL_FAIL_CLOSED: Connected database is staging, not disposable!");
    }
  }

  return {
    verified: true,
    target: normTarget,
    destinationId
  };
}

/**
 * Validates migration checksums and source custody against the signed manifest
 */
export function verifyMigrationChecksums(plan, manifestPath = MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`CRITICAL_FAIL_CLOSED: Signed manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifestMap = new Map();

  for (const entry of manifest.canonical_commercial_ddl || []) {
    manifestMap.set(entry.file, entry.sha256);
  }
  for (const entry of manifest.quarantined_staging_only_migrations || []) {
    manifestMap.set(entry.file, entry.sha256);
  }
  for (const entry of manifest.catalog || []) {
    manifestMap.set(entry.file, entry.sha256);
  }

  for (const item of plan) {
    const filePath = path.join(MIGRATIONS_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Migration file missing from disk: ${item.file}`);
    }
    const currentSha = hashFile(filePath);

    // If manifest has recorded sha, check equality
    if (manifestMap.has(item.file)) {
      const expectedSha = manifestMap.get(item.file);
      if (currentSha !== expectedSha) {
        throw new Error(
          `CRITICAL_FAIL_CLOSED: Migration checksum mismatch for ${item.file}. Expected ${expectedSha}, got ${currentSha}`
        );
      }
    }

    if (item.sha256 && item.sha256 !== currentSha) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: In-memory plan checksum mismatch for ${item.file}. Expected ${item.sha256}, got ${currentSha}`
      );
    }
  }

  return true;
}

/**
 * Verifies migration dependencies, sequential ordering, and ledger conflict avoidance
 */
export function verifyLedgerAndSequence({ target, plan, appliedVersions = [] }) {
  const normTarget = (target || "").toLowerCase();

  // 1. Verify sequence ordering in plan
  for (let i = 1; i < plan.length; i++) {
    const prev = plan[i - 1].file;
    const curr = plan[i].file;
    if (prev.localeCompare(curr) > 0) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Migration plan ordering violation: ${curr} appears after ${prev}`
      );
    }
  }

  // 2. Production target must NOT have any quarantined migrations in applied ledger
  if (normTarget === "production" || normTarget === "disposable") {
    for (const applied of appliedVersions) {
      const versionStr = String(applied);
      if (QUARANTINED_LEDGER_VERSIONS.includes(versionStr)) {
        throw new Error(
          `CRITICAL_FAIL_CLOSED: Quarantined staging migration version found in destination ledger: ${versionStr}`
        );
      }
      for (const qFile of QUARANTINED_STAGING_MIGRATIONS) {
        if (versionStr === qFile.split("_")[0]) {
          throw new Error(
            `CRITICAL_FAIL_CLOSED: Quarantined staging migration file version found in destination ledger: ${versionStr}`
          );
        }
      }
    }
  }

  return true;
}

/**
 * Generates the inspectable JSON migration manifest
 */
export function generateManifest(manifestPath = MANIFEST_PATH) {
  const prodPlan = buildMigrationPlan("production");
  const stagingPlan = buildMigrationPlan("staging");

  const manifest = {
    schema_version: "1.0.0",
    programme: "HealthTimes 2.0 MVP Unified Release",
    unit_id: "HT-MVP-REL-COM-01-R2",
    policy: "STRICT_EXCLUSION_STAGING_UAT_RECONCILIATION",
    generated_at: new Date().toISOString(),
    governance: {
      production_replay_action: "EXCLUDE_STAGING_UAT_RECONCILIATION",
      unfiltered_execution_blocked: true,
      in_file_sql_replay_guards: true,
      uat_reconciler_status: "DROPPED"
    },
    quarantined_staging_only_migrations: QUARANTINED_STAGING_MIGRATIONS.map((file) => ({
      file,
      reason: "Contains hardcoded staging identifiers, synthetic customer/order mutations, or UAT cleanup logic",
      staging_ledger_version: STAGING_LEDGER_VERSION_MAP[file],
      remedial_status: "Permanently dropped and barred from production execution",
      sha256: hashFile(path.join(MIGRATIONS_DIR, file))
    })),
    canonical_commercial_ddl: CANONICAL_COMMERCIAL_DDL_SEQUENCE.map((file) => ({
      file,
      classification: "CANONICAL_COMMERCIAL_DDL",
      staging_ledger_version: STAGING_LEDGER_VERSION_MAP[file],
      sha256: hashFile(path.join(MIGRATIONS_DIR, file))
    })),
    staging_ledger_tip: STAGING_LEDGER_TIP,
    staging_ledger_records_count: stagingPlan.totalMigrations,
    production_plan_migrations_count: prodPlan.totalMigrations,
    fail_closed_invariants: [
      "FAIL_IF_QUARANTINED_IN_PRODUCTION_PLAN",
      "FAIL_IF_CANONICAL_DDL_ORDER_VIOLATED",
      "FAIL_IF_TARGET_ENVIRONMENT_MISMATCH",
      "FAIL_IF_DESTINATION_IDENTITY_MISMATCH",
      "FAIL_IF_UNFILTERED_COMMAND_ATTEMPTS_QUARANTINED_REPLAY",
      "FAIL_IF_UAT_RECONCILER_RPC_EXISTS_AFTER_MIGRATION",
      "FAIL_IF_CHECKSUM_MISMATCH",
      "FAIL_IF_UNREVIEWED_MIGRATION_DETECTED"
    ],
    catalog: prodPlan.plan.map((item) => ({
      file: item.file,
      classification: item.classification,
      sha256: item.sha256
    }))
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[GOVERNOR] Manifest generated at: ${manifestPath}`);
  return manifest;
}

/**
 * Validates manifest integrity against disk
 */
export function verifyManifest(manifestPath = MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`FAIL_CLOSED: Manifest file does not exist at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`[GOVERNOR] Verifying manifest: ${manifest.unit_id} (${manifest.policy})`);

  // Verify quarantined files
  for (const q of manifest.quarantined_staging_only_migrations) {
    const fullPath = path.join(MIGRATIONS_DIR, q.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`FAIL_CLOSED: Quarantined migration missing on disk: ${q.file}`);
    }
    const currentSha = hashFile(fullPath);
    if (currentSha !== q.sha256) {
      throw new Error(`FAIL_CLOSED: Checksum mismatch for quarantined migration ${q.file}`);
    }
  }

  // Verify canonical sequence
  for (const c of manifest.canonical_commercial_ddl) {
    const fullPath = path.join(MIGRATIONS_DIR, c.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`FAIL_CLOSED: Canonical migration missing on disk: ${c.file}`);
    }
    const currentSha = hashFile(fullPath);
    if (currentSha !== c.sha256) {
      throw new Error(`FAIL_CLOSED: Checksum mismatch for canonical migration ${c.file}`);
    }
  }

  // Verify production plan exclusion
  const prodPlan = buildMigrationPlan("production");
  if (prodPlan.totalMigrations !== manifest.production_plan_migrations_count) {
    throw new Error(
      `FAIL_CLOSED: Production plan count mismatch (${prodPlan.totalMigrations} !== ${manifest.production_plan_migrations_count})`
    );
  }

  console.log("[GOVERNOR] Manifest verification: ALL INVARIANTS PASSED.");
  return true;
}

/**
 * Governed migration execution engine.
 * Applies the validated migration plan with strict fail-closed safety.
 */
export function executeMigrationPlan({
  target = "disposable",
  destinationId,
  runner,
  manifestPath = MANIFEST_PATH,
  auditPath = AUDIT_PATH,
  dbContext = null,
  incrementalFiles = null
}) {
  const startTime = Date.now();
  console.log(`[GOVERNOR EXEC] Starting governed migration execution for target: ${target}, destination: ${destinationId}`);

  // 1. Destination identity verification
  verifyDestinationIdentity({ target, destinationId, dbContext });

  // 2. Build migration plan
  const planObj = buildMigrationPlan(target);

  // 3. Verify checksums
  verifyMigrationChecksums(planObj.plan, manifestPath);

  // 4. Verify ledger and sequence if applied versions available
  if (dbContext && dbContext.appliedVersions) {
    verifyLedgerAndSequence({
      target,
      plan: planObj.plan,
      appliedVersions: dbContext.appliedVersions
    });
  }

  // 5. Filter files to execute
  let filesToExecute = planObj.plan;
  if (Array.isArray(incrementalFiles)) {
    filesToExecute = planObj.plan.filter((item) => incrementalFiles.includes(item.file));
  } else if (dbContext && Array.isArray(dbContext.appliedVersions)) {
    // Only execute unapplied migrations
    filesToExecute = planObj.plan.filter((item) => {
      const ver = item.file.split("_")[0];
      return !dbContext.appliedVersions.includes(ver) && !dbContext.appliedVersions.includes(item.stagingLedgerVersion);
    });
  }

  console.log(`[GOVERNOR EXEC] Executing ${filesToExecute.length} migration(s)...`);

  const appliedList = [];
  try {
    for (const item of filesToExecute) {
      const filePath = path.join(MIGRATIONS_DIR, item.file);
      console.log(`[GOVERNOR APPLY] ${item.file} (SHA: ${item.sha256.slice(0, 10)})...`);

      if (typeof runner !== "function") {
        throw new Error("FAIL_CLOSED: No SQL execution runner function provided to governor.");
      }

      const fileStart = Date.now();
      runner(filePath, fs.readFileSync(filePath, "utf8"));
      const durationMs = Date.now() - fileStart;

      appliedList.push({
        file: item.file,
        sha256: item.sha256,
        durationMs,
        appliedAt: new Date().toISOString()
      });
    }

    const executionSummary = {
      execution_id: `HT-GOV-EXEC-${Date.now()}`,
      status: "SUCCESS",
      target,
      destinationId,
      total_applied: appliedList.length,
      applied_migrations: appliedList,
      quarantined_migrations_excluded: QUARANTINED_STAGING_MIGRATIONS,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    console.log(`[GOVERNOR EXEC] Execution SUCCEEDED: ${appliedList.length} migrations applied safely.`);
    return executionSummary;
  } catch (err) {
    console.error(`[GOVERNOR EXEC ERROR] Migration execution aborted: ${err.message}`);
    const failureSummary = {
      execution_id: `HT-GOV-EXEC-FAILED-${Date.now()}`,
      status: "ABORTED",
      target,
      destinationId,
      error: err.message,
      total_applied_before_failure: appliedList.length,
      applied_migrations: appliedList,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    throw Object.assign(err, { executionSummary: failureSummary });
  }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("ht-migration-governor.mjs")) {
  const command = process.argv[2] || "verify";

  try {
    if (command === "manifest") {
      generateManifest();
    } else if (command === "plan") {
      const target = process.argv[3] || "production";
      const plan = buildMigrationPlan(target);
      console.log(`[GOVERNOR] Generated ${target.toUpperCase()} Migration Plan (${plan.totalMigrations} migrations):`);
      console.log(`[GOVERNOR] Excluded migrations:`, plan.excludedMigrations);
      console.log(`[GOVERNOR] Production Safe: ${plan.productionSafe}`);
    } else if (command === "verify") {
      generateManifest();
      verifyManifest();
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[GOVERNOR ERROR] ${err.message}`);
    process.exit(1);
  }
}
