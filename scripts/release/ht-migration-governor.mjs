#!/usr/bin/env node

/**
 * HealthTimes 2.0 — Deterministic Production Migration Governor (HT-MVP-REL-COM-01-R3)
 *
 * Source-controlled migration execution and safety engine.
 * - Controls future migration execution with an explicit, auditable, and fail-closed plan.
 * - Enforces connected database identity attestation (rejects target/destination mismatch, spoofing).
 * - Implements a destination allowlist independent of execution requests.
 * - Enforces immutable SHA-256 content-addressed manifest verification without silent regeneration.
 * - Verifies migration dependencies and previously applied versions on the destination database.
 * - Prevents unreviewed migrations from being silently classified as safe.
 * - Enforces per-migration atomic transaction execution including ledger updates.
 * - Rejects prohibited direct or unfiltered release paths.
 * - Generates inspectable execution and rejection evidence.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

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

// Destination Allowlist independent of caller request
export const DESTINATION_ALLOWLIST = {
  disposable: {
    target: "disposable",
    allowed_ports: [55432, 54322], // Dedicated forwarded test ports only; port 5432 is strictly prohibited for disposable tests to prevent collision
    allowed_hosts: ["127.0.0.1", "localhost", "::1"],
    allowed_databases: ["postgres", "healthtimes_test", "ht_disposable"],
    allowed_destination_ids: ["disposable", "ht-disposable-pg", "localhost-test"],
    prohibited_project_refs: ["bzuvntbkevvuhfhqhkua"]
  },
  staging: {
    target: "staging",
    project_ref: "bzuvntbkevvuhfhqhkua",
    allowed_destination_ids: ["bzuvntbkevvuhfhqhkua"],
    allow_ddl_mutations: false // Staging is frozen in this release certification task
  },
  production: {
    target: "production",
    authorized: false // Strictly locked down; NO production mutations in this task
  }
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
 * Robustly parses a PostgreSQL connection URI into endpoint components.
 */
export function parsePostgresUri(pgUri) {
  if (!pgUri || typeof pgUri !== "string") {
    throw new Error("CRITICAL_FAIL_CLOSED: Missing or invalid PostgreSQL connection URI.");
  }
  try {
    const parsed = new URL(pgUri);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: "${parsed.protocol}"`);
    }
    const host = parsed.hostname || "127.0.0.1";
    const port = parsed.port ? Number(parsed.port) : 5432;
    const database = (parsed.pathname || "").replace(/^\//, "") || "postgres";
    return {
      host,
      port,
      database,
      username: parsed.username || "postgres"
    };
  } catch (err) {
    throw new Error(`CRITICAL_FAIL_CLOSED: Failed to parse PostgreSQL connection URI: ${err.message}`);
  }
}

/**
 * Attests the connected database identity by querying the live PostgreSQL connection directly
 * and verifying independent physical evidence (container identity, connection endpoint, and instance token).
 * Fails closed if the connected database cannot be proven, violates the allowlist, or mismatches the target.
 */
export function attestConnectedDatabase({
  queryFn,
  target,
  expectedDestinationId,
  endpoint,
  instanceAttestation
}) {
  const normTarget = (target || "").toLowerCase();

  if (normTarget === "production") {
    throw new Error(
      "CRITICAL_FAIL_CLOSED: Production database connections and migrations are strictly prohibited in this release certification task (PRODUCTION_MIGRATIONS_AUTHORIZED=false)."
    );
  }

  if (!queryFn || typeof queryFn !== "function") {
    throw new Error("CRITICAL_FAIL_CLOSED: Missing required queryFn to attest connected database identity.");
  }

  if (normTarget === "disposable") {
    const config = DESTINATION_ALLOWLIST.disposable;

    // 1. Destination ID must be an allowed disposable alias (reject spoofed aliases and staging/production labels)
    if (expectedDestinationId === STAGING_PROJECT_REF || expectedDestinationId === "production") {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Destination identity conflict! Staging or Production connection presented as disposable."
      );
    }

    if (!config.allowed_destination_ids.includes(expectedDestinationId)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable destination identity mismatch. Expected one of [${config.allowed_destination_ids.join(", ")}], got "${expectedDestinationId}"`
      );
    }

    // 2. Connection endpoint validation (independent external network evidence)
    if (!endpoint || typeof endpoint !== "object" || !endpoint.host || !endpoint.port) {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Connection endpoint (host and port) is mandatory for disposable database identity attestation."
      );
    }

    // 2A. Host enforcement
    if (!config.allowed_hosts.includes(endpoint.host)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Prohibited network destination host for disposable database: "${endpoint.host}". Host must be in [${config.allowed_hosts.join(", ")}].`
      );
    }

    // 2B. Port enforcement (Standard port 5432 is explicitly rejected to avoid collision)
    if (!config.allowed_ports.includes(endpoint.port)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Prohibited network destination port for disposable database: ${endpoint.port}. Port must be in [${config.allowed_ports.join(", ")}]. Standard port 5432 is prohibited to prevent collision with other PostgreSQL instances.`
      );
    }

    // 2C. Database name enforcement
    if (!config.allowed_databases.includes(endpoint.database)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Prohibited database name for disposable environment: "${endpoint.database}". Allowed: [${config.allowed_databases.join(", ")}].`
      );
    }

    // 3. Query the connected database for identity and schema state
    const attestationSql = `
      SELECT 
        current_database() AS database_name,
        current_user AS session_user,
        inet_server_addr()::text AS server_address,
        inet_server_port() AS server_port,
        (SELECT count(*)::int FROM information_schema.schemata WHERE schema_name = 'supabase_migrations') AS has_migrations_schema,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'disposable_instance_attestation') AS has_attestation_table,
        CASE WHEN to_regclass('public.platform_settings') IS NOT NULL THEN
          (SELECT coalesce(value->>'project_ref', value->>'environment', '') FROM public.platform_settings WHERE key = 'app_environment' LIMIT 1)
        ELSE '' END AS platform_env,
        CASE WHEN to_regclass('public.platform_settings') IS NOT NULL THEN
          (SELECT coalesce(value->>'environment', '') FROM public.platform_settings WHERE key = 'app_environment' LIMIT 1)
        ELSE '' END AS env_name,
        CASE WHEN to_regclass('public.platform_settings') IS NOT NULL THEN
          (SELECT coalesce(value->>'production_replay_action', '') FROM public.platform_settings WHERE key = 'production_migration_policy' LIMIT 1)
        ELSE '' END AS migration_policy
    `;

    let rows;
    try {
      rows = queryFn(attestationSql);
    } catch (err) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Database identity attestation query failed: ${err.message}`);
    }

    if (!rows || rows.length === 0) {
      throw new Error("CRITICAL_FAIL_CLOSED: Database identity attestation query returned empty results.");
    }

    const dbInfo = rows[0];
    const dbName = dbInfo.database_name;
    const serverAddr = dbInfo.server_address;
    const serverPort = Number(dbInfo.server_port);
    const platformEnv = dbInfo.platform_env || "";
    const envName = dbInfo.env_name || "";

    // 4. Prohibit staging / production collision from connected database settings
    if (platformEnv === STAGING_PROJECT_REF || envName === "staging" || envName === "production") {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Destination identity conflict! Connected database reports staging/production environment (${platformEnv || envName}) while target is disposable.`
      );
    }

    // 5. Database name from live session must match allowlist
    if (!config.allowed_databases.includes(dbName)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Prohibited database name for disposable environment: "${dbName}". Allowed: [${config.allowed_databases.join(", ")}].`
      );
    }

    // 6. Positive Proof of Provisioned Instance: Instance Attestation Table
    if (dbInfo.has_attestation_table !== 1) {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Missing disposable instance attestation table (supabase_migrations.disposable_instance_attestation) in connected database. Connected database is not a provisioned disposable test instance."
      );
    }

    // 7. Positive Proof of Provisioned Instance: Instance Attestation Credentials
    if (!instanceAttestation || typeof instanceAttestation !== "object" || !instanceAttestation.instanceId || !instanceAttestation.attestationToken) {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Missing required instance attestation credentials (instanceId and attestationToken)."
      );
    }

    const safeInstanceId = String(instanceAttestation.instanceId).replace(/'/g, "''");
    const attestQuery = `
      SELECT instance_id, container_name, attestation_token, endpoint_host, endpoint_port, database_name, provisioned_at
      FROM supabase_migrations.disposable_instance_attestation
      WHERE instance_id = '${safeInstanceId}'
      LIMIT 1;
    `;

    let attestRows;
    try {
      attestRows = queryFn(attestQuery);
    } catch (err) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Failed to query disposable instance attestation record: ${err.message}`);
    }

    if (!attestRows || attestRows.length === 0) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable instance attestation record not found for instance_id "${instanceAttestation.instanceId}".`
      );
    }

    const attestRow = attestRows[0];

    // 7A. Cryptographic token match
    if (attestRow.attestation_token !== instanceAttestation.attestationToken) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable instance attestation token mismatch for instance "${instanceAttestation.instanceId}". Connected database does not match the provisioned test instance.`
      );
    }

    // 7B. Container identity match (if provided)
    if (instanceAttestation.containerName && attestRow.container_name !== instanceAttestation.containerName) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable instance container name mismatch! Expected "${instanceAttestation.containerName}", found "${attestRow.container_name}".`
      );
    }

    // 7C. Endpoint host & port match
    if (Number(attestRow.endpoint_port) !== Number(endpoint.port)) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable instance attestation endpoint port mismatch! Attestation recorded ${attestRow.endpoint_port}, but connection endpoint is ${endpoint.port}.`
      );
    }

    if (attestRow.endpoint_host !== endpoint.host) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable instance attestation endpoint host mismatch! Attestation recorded ${attestRow.endpoint_host}, but connection endpoint is ${endpoint.host}.`
      );
    }

    if (attestRow.database_name !== endpoint.database) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Disposable instance attestation database name mismatch! Attestation recorded ${attestRow.database_name}, but connection endpoint is ${endpoint.database}.`
      );
    }

    console.log(
      `[GOVERNOR ATTEST] Verified disposable database identity: instance "${attestRow.instance_id}" in container "${attestRow.container_name}" at ${endpoint.host}:${endpoint.port}/${dbName}`
    );

    return {
      attested: true,
      target: normTarget,
      destinationId: expectedDestinationId,
      databaseName: dbName,
      serverAddress: serverAddr,
      serverPort,
      endpointHost: endpoint.host,
      endpointPort: endpoint.port,
      instanceId: attestRow.instance_id,
      containerName: attestRow.container_name,
      attestedAt: new Date().toISOString()
    };
  }

  if (normTarget === "staging") {
    const config = DESTINATION_ALLOWLIST.staging;
    if (expectedDestinationId !== config.project_ref) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Staging destination identity mismatch. Expected ${config.project_ref}, got ${expectedDestinationId}`
      );
    }
    if (config.allow_ddl_mutations === false) {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Staging database is frozen; DDL mutations are not authorized in this task."
      );
    }
    return {
      attested: true,
      target: normTarget,
      destinationId: expectedDestinationId,
      attestedAt: new Date().toISOString()
    };
  }

  throw new Error(`CRITICAL_FAIL_CLOSED: Unknown target environment: "${target}".`);
}

/**
 * Validates immutable manifest integrity against disk.
 * PURE READ-ONLY VERIFICATION — NEVER REGENERATES OR MODIFIES THE MANIFEST.
 */
export function verifyManifest(manifestPath = MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`CRITICAL_FAIL_CLOSED: Approved release manifest does not exist at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`[GOVERNOR] Reading approved immutable manifest: ${manifest.unit_id} (Policy: ${manifest.policy})`);

  if (!manifest.catalog || !Array.isArray(manifest.catalog)) {
    throw new Error("CRITICAL_FAIL_CLOSED: Manifest catalog is missing or invalid.");
  }

  // 1. Verify every single migration entry in the approved catalog (all 108 production files)
  console.log(`[GOVERNOR] Verifying all ${manifest.catalog.length} catalog entries against disk...`);
  for (const entry of manifest.catalog) {
    const fullPath = path.join(MIGRATIONS_DIR, entry.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Migration missing on disk: ${entry.file}`);
    }
    const currentSha = hashFile(fullPath);
    if (currentSha !== entry.sha256) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Content-addressed checksum mismatch for ${entry.file}! Expected ${entry.sha256}, got ${currentSha}. Manifest has been tampered with or file modified post-approval.`
      );
    }
  }

  // 2. Verify all quarantined migrations
  for (const q of manifest.quarantined_staging_only_migrations || []) {
    const fullPath = path.join(MIGRATIONS_DIR, q.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Quarantined migration missing on disk: ${q.file}`);
    }
    const currentSha = hashFile(fullPath);
    if (currentSha !== q.sha256) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Checksum mismatch for quarantined migration ${q.file}`);
    }
  }

  // 3. Verify all canonical commercial DDL migrations
  for (const c of manifest.canonical_commercial_ddl || []) {
    const fullPath = path.join(MIGRATIONS_DIR, c.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Canonical commercial migration missing on disk: ${c.file}`);
    }
    const currentSha = hashFile(fullPath);
    if (currentSha !== c.sha256) {
      throw new Error(`CRITICAL_FAIL_CLOSED: Checksum mismatch for canonical migration ${c.file}`);
    }
  }

  // 4. Verify disk does not contain extra or unreviewed files
  const currentPlan = buildMigrationPlan("production");
  if (currentPlan.totalMigrations !== manifest.production_plan_migrations_count) {
    throw new Error(
      `CRITICAL_FAIL_CLOSED: Production plan count mismatch (${currentPlan.totalMigrations} !== ${manifest.production_plan_migrations_count})`
    );
  }

  console.log("[GOVERNOR] Manifest verification: ALL INVARIANTS AND 108 MIGRATIONS PASSED IMMUTABILITY AUDIT.");
  return true;
}

/**
 * Wraps migration SQL into an atomic transaction envelope that includes the ledger insertion.
 * Guarantees per-migration atomicity: either the migration statements AND ledger insertion commit together,
 * or the entire migration rolls back leaving zero schema mutations and no ledger record.
 */
export function wrapMigrationSqlWithAtomicLedger(sqlContent, version, fileName) {
  // Check if there is an explicit top-level COMMIT outside plpgsql function bodies
  const stripped = sqlContent.replace(/\$\$[\s\S]*?\$\$/g, "");
  const hasTopLevelCommit = /\bCOMMIT\s*;/i.test(stripped);

  if (hasTopLevelCommit) {
    const matches = [...sqlContent.matchAll(/\bCOMMIT\s*;/gi)];
    const lastCommitMatch = matches[matches.length - 1];
    if (lastCommitMatch) {
      const idx = lastCommitMatch.index;
      const before = sqlContent.slice(0, idx);
      const after = sqlContent.slice(idx);
      return `\\set ON_ERROR_STOP on\n${before}\n-- Atomic Ledger Record\nINSERT INTO supabase_migrations.schema_migrations (version, inserted_at) VALUES ('${version}', now()) ON CONFLICT (version) DO NOTHING;\n${after}`;
    }
  }

  return `\\set ON_ERROR_STOP on
BEGIN;
-- Migration: ${fileName} (Version: ${version})
${sqlContent}
-- Atomic Ledger Record
INSERT INTO supabase_migrations.schema_migrations (version, inserted_at) VALUES ('${version}', now()) ON CONFLICT (version) DO NOTHING;
COMMIT;
`;
}

/**
 * Verifies migration dependencies and ledger sequence
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

  // 2. Production/Disposable target must NOT have quarantined versions in applied ledger
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

  // 3. Verify dependency continuity (no skipped unapplied prerequisites)
  const appliedSet = new Set(appliedVersions.map(String));
  let unappliedEncountered = false;
  for (const item of plan) {
    const ver = item.file.split("_")[0];
    const isApplied = appliedSet.has(ver) || appliedSet.has(item.stagingLedgerVersion);
    if (!isApplied) {
      unappliedEncountered = true;
    } else if (unappliedEncountered) {
      throw new Error(
        `CRITICAL_FAIL_CLOSED: Migration dependency gap detected! Migration ${item.file} is applied, but an earlier migration in the canonical sequence was not.`
      );
    }
  }

  return true;
}

/**
 * Creates a controlled, source-verified SQL execution adapter.
 * Enforces that SQL mutations are refused until the connection is positively attested.
 */
export function createGovernedSqlAdapter({
  pgUri,
  psqlBin = "/opt/homebrew/opt/libpq/bin/psql",
  instanceAttestation = null
}) {
  const endpoint = parsePostgresUri(pgUri);
  let isAttested = false;
  let attestationDetails = null;

  function queryJson(sql) {
    const cleanSql = sql.trim().replace(/;+$/, "");
    const wrapped = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${cleanSql}) t;`;
    const cmd = `${psqlBin} "${pgUri}" -A -t -v ON_ERROR_STOP=1`;
    const out = execSync(cmd, { encoding: "utf8", input: wrapped }).trim();
    return JSON.parse(out || "[]");
  }

  function attest(target, expectedDestinationId, instanceAttestationOverride) {
    const attestationToUse = instanceAttestationOverride !== undefined ? instanceAttestationOverride : instanceAttestation;
    const res = attestConnectedDatabase({
      queryFn: queryJson,
      target,
      expectedDestinationId,
      endpoint,
      instanceAttestation: attestationToUse
    });
    isAttested = true;
    attestationDetails = res;
    return res;
  }

  function executeSqlAtomic(sql) {
    if (!isAttested) {
      throw new Error(
        "CRITICAL_FAIL_CLOSED: Governed SQL execution adapter refused execution: Database identity has not been attested. All mutations require positive database identity attestation."
      );
    }
    const cmd = `${psqlBin} "${pgUri}" -q -v ON_ERROR_STOP=1`;
    return execSync(cmd, { encoding: "utf8", input: sql });
  }

  return {
    queryJson,
    executeSqlAtomic,
    attest,
    isAttested: () => isAttested,
    getAttestationDetails: () => attestationDetails,
    getEndpoint: () => endpoint,
    getAppliedVersions() {
      const rows = queryJson("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;");
      return rows.map((r) => r.version);
    }
  };
}

/**
 * Governed migration execution engine using the real SQL execution adapter.
 */
export function executeGovernedMigrations({
  target = "disposable",
  expectedDestinationId,
  sqlAdapter,
  instanceAttestation = null,
  manifestPath = MANIFEST_PATH,
  auditPath = AUDIT_PATH,
  incrementalFiles = null
}) {
  const startTime = Date.now();
  console.log(`[GOVERNOR EXEC] Starting governed migration execution for target: ${target}, destination: ${expectedDestinationId}`);

  // 1. Verify approved manifest without modifying it
  verifyManifest(manifestPath);

  // 2. Attest connected database identity
  const attestation = sqlAdapter.attest
    ? sqlAdapter.attest(target, expectedDestinationId, instanceAttestation)
    : attestConnectedDatabase({
        queryFn: (sql) => sqlAdapter.queryJson(sql),
        target,
        expectedDestinationId,
        endpoint: sqlAdapter.getEndpoint ? sqlAdapter.getEndpoint() : null,
        instanceAttestation
      });

  // 3. Build destination-specific migration plan
  const planObj = buildMigrationPlan(target);

  // 4. Query applied versions from destination database ledger
  const appliedVersions = sqlAdapter.getAppliedVersions();

  // 5. Verify ledger sequence and dependency continuity
  verifyLedgerAndSequence({
    target,
    plan: planObj.plan,
    appliedVersions
  });

  // 6. Filter files to execute
  const appliedSet = new Set(appliedVersions.map(String));
  let filesToExecute = planObj.plan.filter((item) => {
    const ver = item.file.split("_")[0];
    return !appliedSet.has(ver) && !appliedSet.has(item.stagingLedgerVersion);
  });

  if (Array.isArray(incrementalFiles)) {
    filesToExecute = filesToExecute.filter((item) => incrementalFiles.includes(item.file));
  }

  console.log(`[GOVERNOR EXEC] Destination attested. Found ${appliedVersions.length} applied migrations. ${filesToExecute.length} migration(s) to apply.`);

  const appliedList = [];
  try {
    for (const item of filesToExecute) {
      const filePath = path.join(MIGRATIONS_DIR, item.file);
      const version = item.file.split("_")[0];

      // Exact checksum check against manifest item
      const currentSha = hashFile(filePath);
      if (currentSha !== item.sha256) {
        throw new Error(`CRITICAL_FAIL_CLOSED: Checksum mismatch for ${item.file} before execution!`);
      }

      console.log(`[GOVERNOR APPLY] Applying ${item.file} atomically (SHA: ${currentSha.slice(0, 10)})...`);

      const rawSql = fs.readFileSync(filePath, "utf8");
      const atomicSql = wrapMigrationSqlWithAtomicLedger(rawSql, version, item.file);

      const fileStart = Date.now();
      sqlAdapter.executeSqlAtomic(atomicSql);
      const durationMs = Date.now() - fileStart;

      appliedList.push({
        file: item.file,
        version,
        sha256: currentSha,
        durationMs,
        appliedAt: new Date().toISOString()
      });
    }

    const executionSummary = {
      execution_id: `HT-GOV-EXEC-${Date.now()}`,
      status: "SUCCESS",
      target,
      destinationId: expectedDestinationId,
      attestation,
      total_applied: appliedList.length,
      applied_migrations: appliedList,
      quarantined_migrations_excluded: QUARANTINED_STAGING_MIGRATIONS,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    console.log(`[GOVERNOR EXEC] Governed execution SUCCEEDED: ${appliedList.length} migrations applied atomically.`);
    return executionSummary;
  } catch (err) {
    console.error(`[GOVERNOR EXEC ERROR] Migration execution aborted: ${err.message}`);
    const failureSummary = {
      execution_id: `HT-GOV-EXEC-FAILED-${Date.now()}`,
      status: "ABORTED",
      target,
      destinationId: expectedDestinationId,
      attestation,
      error: err.message,
      total_applied_before_failure: appliedList.length,
      applied_migrations: appliedList,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    throw Object.assign(err, { executionSummary: failureSummary });
  }
}

/**
 * Proposes and generates an approved manifest for review.
 * Only called explicitly via the 'manifest' CLI command.
 */
export function generateManifest(manifestPath = MANIFEST_PATH) {
  const prodPlan = buildMigrationPlan("production");
  const stagingPlan = buildMigrationPlan("staging");

  const manifest = {
    schema_version: "1.0.0",
    programme: "HealthTimes 2.0 MVP Unified Release",
    unit_id: "HT-MVP-REL-COM-01-R3",
    policy: "STRICT_EXCLUSION_STAGING_UAT_RECONCILIATION",
    generated_at: new Date().toISOString(),
    governance: {
      production_replay_action: "EXCLUDE_STAGING_UAT_RECONCILIATION",
      unfiltered_execution_blocked: true,
      in_file_sql_replay_guards: true,
      per_migration_atomicity_enforced: true,
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
      "FAIL_IF_DESTINATION_IDENTITY_UNVERIFIED",
      "FAIL_IF_UNFILTERED_COMMAND_ATTEMPTS_QUARANTINED_REPLAY",
      "FAIL_IF_UAT_RECONCILER_RPC_EXISTS_AFTER_MIGRATION",
      "FAIL_IF_CHECKSUM_MISMATCH",
      "FAIL_IF_UNREVIEWED_MIGRATION_DETECTED",
      "FAIL_IF_PER_MIGRATION_ATOMICITY_VIOLATED"
    ],
    catalog: prodPlan.plan.map((item) => ({
      file: item.file,
      classification: item.classification,
      sha256: item.sha256
    }))
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[GOVERNOR] Manifest proposed and generated at: ${manifestPath}`);
  return manifest;
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
      // PURE VERIFICATION: Read and validate approved manifest without modifying it
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
