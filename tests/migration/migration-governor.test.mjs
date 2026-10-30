import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  scanMigrationCatalog,
  buildMigrationPlan,
  verifyManifest,
  parsePostgresUri,
  attestConnectedDatabase,
  createGovernedSqlAdapter,
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

test("GOVERNOR: PostgreSQL URI parsing extracts verified endpoint components", () => {
  const parsed = parsePostgresUri("postgres://postgres:secret@127.0.0.1:55432/postgres");
  assert.equal(parsed.host, "127.0.0.1");
  assert.equal(parsed.port, 55432);
  assert.equal(parsed.database, "postgres");
  assert.equal(parsed.username, "postgres");

  const defaultPort = parsePostgresUri("postgres://app_user:pwd@localhost/healthtimes_test");
  assert.equal(defaultPort.host, "localhost");
  assert.equal(defaultPort.port, 5432);
  assert.equal(defaultPort.database, "healthtimes_test");

  assert.throws(() => parsePostgresUri(""), /Missing or invalid PostgreSQL connection URI/);
  assert.throws(() => parsePostgresUri("http://127.0.0.1:5432/db"), /Invalid protocol/);
});

test("GOVERNOR: Database attestation verifies trusted instance identity and rejects spoofing/unauthorized endpoints", () => {
  const instanceId = "test-instance-001";
  const attestationToken = "crypto-test-token-abcdef123456";
  const containerName = "ht-disposable-pg-test";

  const mockQueryFn = (sql) => {
    if (sql.includes("disposable_instance_attestation") && sql.includes("SELECT instance_id")) {
      return [
        {
          instance_id: instanceId,
          container_name: containerName,
          attestation_token: attestationToken,
          endpoint_host: "127.0.0.1",
          endpoint_port: 55432,
          database_name: "postgres",
          provisioned_at: new Date().toISOString()
        }
      ];
    }
    return [
      {
        database_name: "postgres",
        session_user: "postgres",
        server_address: "127.0.0.1",
        server_port: 5432, // Internal listening port inside container
        has_migrations_schema: 1,
        has_attestation_table: 1,
        platform_env: "",
        env_name: "",
        migration_policy: ""
      }
    ];
  };

  const validEndpoint = {
    host: "127.0.0.1",
    port: 55432,
    database: "postgres"
  };

  const validAttestation = {
    instanceId,
    attestationToken,
    containerName
  };

  // 1. Valid disposable attestation
  const valid = attestConnectedDatabase({
    queryFn: mockQueryFn,
    target: "disposable",
    expectedDestinationId: "disposable",
    endpoint: validEndpoint,
    instanceAttestation: validAttestation
  });
  assert.equal(valid.attested, true);
  assert.equal(valid.instanceId, instanceId);
  assert.equal(valid.containerName, containerName);
  assert.equal(valid.endpointPort, 55432);

  // 2. Negative Test 1: Non-allowlisted network destination
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: "disposable",
      endpoint: { host: "192.168.1.100", port: 55432, database: "postgres" },
      instanceAttestation: validAttestation
    }),
    /CRITICAL_FAIL_CLOSED: Prohibited network destination host for disposable database: "192.168.1.100"/
  );

  // 3. Negative Test 2: Another PostgreSQL instance named 'postgres' without attestation table
  const unprovisionedMockQueryFn = (sql) => [
    {
      database_name: "postgres",
      session_user: "postgres",
      server_address: "127.0.0.1",
      server_port: 5432,
      has_migrations_schema: 1,
      has_attestation_table: 0, // Attestation table absent!
      platform_env: "",
      env_name: "",
      migration_policy: ""
    }
  ];
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: unprovisionedMockQueryFn,
      target: "disposable",
      expectedDestinationId: "disposable",
      endpoint: validEndpoint,
      instanceAttestation: validAttestation
    }),
    /CRITICAL_FAIL_CLOSED: Missing disposable instance attestation table/
  );

  // 4. Negative Test 3: Otherwise plausible database on port 5432
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: "disposable",
      endpoint: { host: "127.0.0.1", port: 5432, database: "postgres" },
      instanceAttestation: validAttestation
    }),
    /CRITICAL_FAIL_CLOSED: Prohibited network destination port for disposable database: 5432/
  );

  // 5. Negative Test 4: Missing or mismatched instance attestation
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: "disposable",
      endpoint: validEndpoint,
      instanceAttestation: null
    }),
    /CRITICAL_FAIL_CLOSED: Missing required instance attestation credentials/
  );

  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: "disposable",
      endpoint: validEndpoint,
      instanceAttestation: { instanceId, attestationToken: "wrong-token-value", containerName }
    }),
    /CRITICAL_FAIL_CLOSED: Disposable instance attestation token mismatch/
  );

  // 6. Negative Test 5: Caller-supplied disposable label mismatch
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: "spoofed-disposable-label",
      endpoint: validEndpoint,
      instanceAttestation: validAttestation
    }),
    /CRITICAL_FAIL_CLOSED: Disposable destination identity mismatch/
  );

  // 7. Negative Test 6: Staging or Production presented as disposable
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "disposable",
      expectedDestinationId: STAGING_PROJECT_REF,
      endpoint: validEndpoint,
      instanceAttestation: validAttestation
    }),
    /CRITICAL_FAIL_CLOSED: Destination identity conflict! Staging or Production connection presented as disposable/
  );

  // 8. Negative Test 6B: Staging environment reported by connected database platform_settings
  const stagingConnectedMockQueryFn = () => [
    {
      database_name: "postgres",
      session_user: "postgres",
      server_address: "127.0.0.1",
      server_port: 5432,
      has_migrations_schema: 1,
      has_attestation_table: 1,
      platform_env: STAGING_PROJECT_REF, // Staging project ref!
      env_name: "staging",
      migration_policy: ""
    }
  ];
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: stagingConnectedMockQueryFn,
      target: "disposable",
      expectedDestinationId: "disposable",
      endpoint: validEndpoint,
      instanceAttestation: validAttestation
    }),
    /CRITICAL_FAIL_CLOSED: Destination identity conflict! Connected database reports staging\/production environment/
  );

  // 9. Unauthorized Production Target
  assert.throws(
    () => attestConnectedDatabase({
      queryFn: mockQueryFn,
      target: "production",
      expectedDestinationId: "production-canonical"
    }),
    /CRITICAL_FAIL_CLOSED: Production database connections and migrations are strictly prohibited/
  );
});

test("GOVERNOR: Governed SQL execution adapter refuses mutations before positive attestation", () => {
  const adapter = createGovernedSqlAdapter({
    pgUri: "postgres://postgres:postgres@127.0.0.1:55432/postgres"
  });

  assert.equal(adapter.isAttested(), false);
  assert.throws(
    () => adapter.executeSqlAtomic("SELECT 1;"),
    /CRITICAL_FAIL_CLOSED: Governed SQL execution adapter refused execution: Database identity has not been attested/
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
