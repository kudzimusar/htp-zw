import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  scanMigrationCatalog,
  buildMigrationPlan,
  verifyManifest,
  attestConnectedDatabase,
  verifyLedgerAndSequence,
  wrapMigrationSqlWithAtomicLedger,
  QUARANTINED_STAGING_MIGRATIONS,
  CANONICAL_COMMERCIAL_DDL_SEQUENCE,
  KNOWN_CANONICAL_BASELINE_MIGRATIONS,
  STAGING_PROJECT_REF,
  STAGING_LEDGER_TIP
} from "../../scripts/release/ht-migration-governor.mjs";

test("GOVERNOR: Approved manifest passes read-only immutability verification", () => {
  const result = verifyManifest();
  assert.equal(result, true);
});

test("GOVERNOR: All 110 migrations in repository are strictly classified with zero unreviewed files", () => {
  const catalog = scanMigrationCatalog();
  assert.equal(catalog.length, 110);
  for (const item of catalog) {
    assert.notEqual(item.classification, "UNKNOWN");
    assert.match(item.classification, /^(CANONICAL_BASELINE|CANONICAL_COMMERCIAL_DDL|STAGING_ONLY_UAT_RECONCILIATION_QUARANTINED)$/);
  }
});

test("GOVERNOR: Production migration plan strictly excludes quarantined staging UAT migrations", () => {
  const prodPlan = buildMigrationPlan("production");
  assert.equal(prodPlan.target, "production");
  assert.equal(prodPlan.totalMigrations, 108);
  assert.equal(prodPlan.exclusionEnforced, true);
  assert.equal(prodPlan.productionSafe, true);

  for (const q of QUARANTINED_STAGING_MIGRATIONS) {
    const found = prodPlan.plan.some((p) => p.file === q);
    assert.equal(found, false, `Quarantined file ${q} leaked into production plan!`);
  }
});

test("GOVERNOR: Canonical commercial DDL sequence is preserved in exact order", () => {
  const prodPlan = buildMigrationPlan("production");
  const commercialInPlan = prodPlan.plan
    .filter((p) => CANONICAL_COMMERCIAL_DDL_SEQUENCE.includes(p.file))
    .map((p) => p.file);

  assert.deepEqual(commercialInPlan, CANONICAL_COMMERCIAL_DDL_SEQUENCE);
});

test("GOVERNOR: Tamper detection fails immediately on modified migration content", () => {
  const testFile = path.resolve("supabase/migrations/20261030100000_ht_mvp_rel_com01_production_migration_safety.sql");
  const original = fs.readFileSync(testFile, "utf8");
  try {
    fs.writeFileSync(testFile, original + "\n-- INTENTIONAL_TAMPER_STRING\n");
    assert.throws(
      () => verifyManifest(),
      /CRITICAL_FAIL_CLOSED: Content-addressed checksum mismatch/
    );
  } finally {
    fs.writeFileSync(testFile, original);
  }
});

test("GOVERNOR: Database attestation rejects destination spoofing and conflicting identities", () => {
  const mockQueryFn = () => [
    {
      database_name: "postgres",
      session_user: "postgres",
      server_address: "127.0.0.1",
      server_port: 55432,
      has_migrations_schema: 1,
      platform_env: "",
      migration_policy: ""
    }
  ];

  // Valid disposable attestation
  const valid = attestConnectedDatabase({
    queryFn: mockQueryFn,
    target: "disposable",
    expectedDestinationId: "disposable"
  });
  assert.equal(valid.attested, true);

  // Spoofed destination ID
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: "spoofed-alias"
    }),
    /CRITICAL_FAIL_CLOSED: Disposable destination identity mismatch/
  );

  // Staging project ref on disposable target
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: STAGING_PROJECT_REF
    }),
    /CRITICAL_FAIL_CLOSED/
  );

  // Production target without authorization
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "production",
      expectedDestinationId: "production-canonical"
    }),
    /CRITICAL_FAIL_CLOSED: Production database connections and migrations are strictly prohibited/
  );
});

test("GOVERNOR: Dependency gap in migration sequence is detected and rejected", () => {
  assert.throws(
    () => verifyLedgerAndSequence({
      target: "disposable",
      plan: [
        { file: "20260909000100_content_core.sql", stagingLedgerVersion: "20260909000100" },
        { file: "20260909000200_taxonomy_and_geo.sql", stagingLedgerVersion: "20260909000200" }
      ],
      appliedVersions: ["20260909000200"] // Skipped 20260909000100!
    }),
    /CRITICAL_FAIL_CLOSED: Migration dependency gap detected/
  );
});

test("GOVERNOR: Atomic ledger SQL wrapping encloses statements and ledger record in single transaction", () => {
  const rawSql = "CREATE TABLE public._sample (id int);";
  const wrapped = wrapMigrationSqlWithAtomicLedger(rawSql, "20261030999999", "20261030999999_sample.sql");

  assert.match(wrapped, /\\set ON_ERROR_STOP on/);
  assert.match(wrapped, /BEGIN;/);
  assert.match(wrapped, /INSERT INTO supabase_migrations\.schema_migrations/);
  assert.match(wrapped, /COMMIT;/);
});
