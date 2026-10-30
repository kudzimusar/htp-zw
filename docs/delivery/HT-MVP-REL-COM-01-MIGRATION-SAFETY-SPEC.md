# HealthTimes 2.0 — Commercial Baseline Convergence & Production Migration Safety Specification

**Document Identifier:** `HT-MVP-REL-COM-01-MIGRATION-SAFETY-SPEC`  
**Governing Unit:** `HT-MVP-REL-COM-01`  
**Repository:** `kudzimusar/htp-zw`  
**Accepted Commercial Source:** `6a8503235f82da7e5fdbf382d727dca6c0d6f173`  
**Controlling Release Base (PR #120 Head):** `3a53d964eb353416f7cc1fa50400cf7689a21cea`  
**Integration Branch:** `release/ht-mvp-commercial-unified-integration`  
**Staging Supabase Project:** `bzuvntbkevvuhfhqhkua`  
**Current Staging Migration Tip:** `20261030100000`  
**Target Classification:** Technical Release Candidate Baseline & Safety Certification  

---

## 1. Executive Summary & Source Lineage Reconciliation

This document formally certifies the technical convergence and production migration safety of the HealthTimes 2.0 Commercial, Accounting, Advertising, and Finance operating baseline into the controlling release candidate lineage.

### Source Ancestry Proof
Independent topological analysis confirms:
- Controlling release parent: `3a53d964eb353416f7cc1fa50400cf7689a21cea` (`origin/release/ht-mvp-rc02-final-unified-candidate`, PR #120).
- Commercial accepted head: `6a8503235f82da7e5fdbf382d727dca6c0d6f173` (`origin/fix/ht-mvp-com-final01-r2-r3-security-remediation`).
- **Strict Ancestry Verification:** `git merge-base --is-ancestor 3a53d964 6a850323` evaluates to **TRUE**.
- **Lineage Integrity:** The accepted Commercial branch is a direct, linear descendant of PR #120. It builds incrementally upon the accepted UAT-04B Newsroom UX, Paynow fail-closed edge transport, and Commercial operational modules without fork divergence, cherry-pick regressions, or discarded commits.

```text
3a53d964 (PR #120 Release Head)
   │
   ▼ [UAT-04B Staging Shell & Routing Truth: c9241061...a41f7be3]
   │
   ▼ [Paynow Provider Spine & Fail-Closed Gates: fe650e32...e5aefbe3]
   │
   ▼ [HT-MVP-COM-FINAL-01 Commercial Back Office: e8c02ec0]
   │
   ▼ [COM-FINAL-01-R1 ACL & Privilege Hardening: 0ad3f34a...a1a6aa69]
   │
   ▼ [COM-FINAL-01-R2 Credential Containment: 23021060...cb86269f]
   │
   ▼ [COM-FINAL-01-R2-R1 Reporting Parity: 5805db6b...cf7ce3cf]
   │
   ▼ [COM-FINAL-01-R2-R2 Fixture Reconciliation: 98d48373...026e88c8]
   │
   ▼ [COM-FINAL-01-R2-R3 P0 Privilege Closure: 6a850323]
   │
   ▼ [HT-MVP-REL-COM-01 Production Migration Safety & UAT Reconciler Drop]
```

---

## 2. Production Migration Safety Audit

An exhaustive forensic audit was conducted on all database migrations introduced since the accepted Paynow parent `e5aefbe365b40e468a59311c6fef8de46df92a58`.

### Detailed Migration Inventory & Classification

| Migration Version | File Name | Classification | Production Safety Verdict | Scope & Rationale |
| :--- | :--- | :---: | :---: | :--- |
| `20261029020000` | `...operational_completion.sql` | `CANONICAL_DDL` | **SAFE** | Enhances `finance_issue_invoice` for GL discount net revenue; overloads `commercial_list_orders(text)` and `finance_list_expenses(text)` with status filters; hardens `finance_upsert_customer`. Pure DDL/RPC. |
| `20261029040000` | `...privilege_hardening.sql` | `CANONICAL_DDL` | **SAFE** | Revokes `anon` and `public` execute permissions across all Newsroom Finance and Commercial management functions; restricts execute strictly to `authenticated` and `service_role`. |
| `20261029050000` | `...idempotency_fix.sql` | `CANONICAL_DDL` | **SAFE** | Corrects column mappings (`source_id`/`source` in journal lookups, `rejected_reason` in expense listing) and re-asserts execute grants. |
| `20261029060000` | `...statement_reversal_parity.sql` | `CANONICAL_DDL` | **SAFE** | Implements GAAP double-entry parity across Trial Balance, P&L, and Balance Sheet RPCs by incorporating reversed journal entries (`e.status in ('posted', 'reversed')`). |
| `20261029070000` | `...invoice_line_casing_tolerance.sql` | `CANONICAL_DDL` | **SAFE** | Adds casing tolerance (`unitPrice`, `taxRate`) to `finance_create_invoice` line processor. |
| `20261029080000` | `...financial_fixture_reconciliation.sql` | `STAGING_UAT_RECON` | **UNSAFE FOR PROD REPLAY** | Contains hardcoded staging identifiers (`JRN-2026-0012`–`0017`, `INV-2026-0004`–`0006`, `EXP-2026-0006`–`0008`, `ORD-2026-0008`–`0010`), wildcard customer pattern (`UAT HealthCorp%`), test user session mutations, and defines `finance_reconcile_uat_fixtures`. |
| `20261029090000` | `...security_privilege_remediation.sql` | `STAGING_UAT_RECON` | **UNSAFE FOR PROD REPLAY** | Revokes `authenticated` from `finance_reconcile_uat_fixtures`; hardcodes resolution for `ORD-2026-0011` and `HealthCorp 272105`/`895254`; contains wildcard updates (`notes ilike '%UAT%'`). |
| `20261030100000` | `...production_migration_safety.sql` | `CANONICAL_DDL` | **SAFE** | Permanently drops `public.finance_reconcile_uat_fixtures(text, text)` from schema; registers authoritative `production_migration_policy` in `platform_settings`. |

### Specific Vulnerabilities Identified in Staging-Only Migrations

1. **Hardcoded Transaction Numbers:**
   - `JRN-2026-0012` through `JRN-2026-0017`
   - `INV-2026-0004` through `INV-2026-0006`
   - `EXP-2026-0006` through `EXP-2026-0008`
   - `ORD-2026-0008` through `ORD-2026-0011`
   *Risk:* In Production, if these numbers represent genuine commercial transactions, replaying these migrations would erroneously void live invoices and cancel active contracts.
2. **Unbounded Wildcard Filters:**
   - `WHERE legal_name LIKE 'UAT HealthCorp%'`
   - `WHERE notes ILIKE '%UAT%'`
   - `WHERE trading_name ILIKE '%HealthCorp%'`
   *Risk:* Could match legitimate future corporate advertisers sharing name fragments.
3. **Internal Auth Session Deletion:**
   - Queries `auth.sessions` directly by email lookup on `public.staff_profiles`.
   *Risk:* Violates Supabase schema boundary conventions in production environments.
4. **Temporary UAT-Only RPC Residue:**
   - `finance_reconcile_uat_fixtures` was created solely for Playwright browser teardown.
   *Risk:* Any destructive bulk-reconciliation function in a production schema represents an unacceptable privilege expansion.

---

## 3. Authoritative Production Migration Strategy

To guarantee that production cutover remains 100% deterministic, audit-compliant, and free of staging pollution, the following three-pillar strategy is mandated:

### Pillar 1: Staging History Preservation
Staging database `bzuvntbkevvuhfhqhkua` has already applied migrations `20261029080000` and `20261029090000`. In accordance with programme instructions, applied migration history on staging is **NOT rewritten or altered**. Staging retains its full audit lineage.

### Pillar 2: Permanent Removal of UAT Reconciler RPC (Migration `20261030100000`)
Migration `20261030100000` executes:
```sql
DROP FUNCTION IF EXISTS public.finance_reconcile_uat_fixtures(text, text);
```
This ensures that the unified release baseline contains **zero residue** of the temporary fixture reconciler. Neither `authenticated`, `anon`, nor `service_role` can invoke it.

### Pillar 3: Production Rollout Manifest Policy
The production migration rollout sequence is formally registered in `platform_settings` under key `production_migration_policy`:
```json
{
  "production_replay_action": "EXCLUDE_STAGING_UAT_RECONCILIATION",
  "canonical_ddl_migrations": [
    "20261029020000_ht_mvp_com_final01_operational_completion.sql",
    "20261029040000_ht_mvp_com_final01_r1_privilege_hardening.sql",
    "20261029050000_ht_mvp_com_final01_r1_idempotency_fix.sql",
    "20261029060000_ht_mvp_com_final01_r2_r1_statement_reversal_parity.sql",
    "20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql",
    "20261030100000_ht_mvp_rel_com01_production_migration_safety.sql"
  ],
  "staging_only_uat_migrations": [
    "20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql",
    "20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql"
  ],
  "uat_reconciler_function_status": "DROPPED"
}
```
**Cutover Instruction:** When executing migrations against the Production database during future authorized deployment, the deployment automation will apply the canonical DDL migrations and exclude the staging-only reconciliation migrations, preventing any synthetic data logic from executing against live records.

---

## 4. Financial Ledger Audit & Truth Invariants

A live SQL audit of staging Supabase project `bzuvntbkevvuhfhqhkua` confirms:
1. **Double-Entry Balance Equation:**
   $$\sum \text{Debits} = \$22,400.00 = \sum \text{Credits} = \$22,400.00 \quad (\text{Balanced: } \mathbf{true})$$
2. **Net Revenue Integrity:**
   - Active Issued Invoices: `INV-2026-0001`, `INV-2026-0002`, `INV-2026-0003` (genuine baseline orders totaling USD 7,500.00).
   - Zero synthetic UAT invoices remain active (invoices `0004` through `0010` are confirmed `void`).
3. **Expense Liabilities:**
   - Zero active expense claims exist (expenses `0001` through `0012` are confirmed `void` or `rejected`).
4. **Order Pipeline:**
   - Zero active synthetic commercial orders exist (orders `0001` through `0016` are confirmed `cancelled`).
5. **Customer Directory:**
   - Zero active synthetic customers exist (only the 4 baseline `UAT04B Partner` corporate profiles are active).

---

## 5. Scope Freeze & Safety Boundaries

```text
PAYNOW_PROVIDER_AUTHORITY_CERTIFIED=NO
PAYNOW_CHECKOUT_AVAILABLE=NO
PRODUCTION_DEPLOYMENT_AUTHORIZED=NO
PRODUCTION_MIGRATIONS_AUTHORIZED=NO
MERGE_AUTHORIZED=NO
```

## 6. R1 Remediation: Executable Migration Governance & Disposable Safety Proof

### 6.1 Deterministic Migration Governor & Replay Blockers
Under `HT-MVP-REL-COM-01-R1`, migration governance has been upgraded to an executable, deterministic, source-controlled architecture:
1. **Source-Controlled Governor Engine (`scripts/release/ht-migration-governor.mjs`):**
   - Implements automated manifest generation and plan building.
   - For `production` plans: Deterministically filters out `20261029080000` and `20261029090000`.
   - **Fail-Closed Gate 1:** If either prohibited migration is present in the production plan, execution immediately aborts with `CRITICAL_FAIL_CLOSED`.
   - **Fail-Closed Gate 2:** Asserts strict dependency order of canonical DDL migrations.
   - Emits inspectable `docs/delivery/ht-mvp-production-migration-manifest.json` with SHA-256 hashes and ledger version mappings.
2. **In-File SQL Replay Guards:**
   - Both `20261029080000` and `20261029090000` contain an unconditional SQL block at line 1.
   - Any ordinary unfiltered migration command (`psql`, `supabase db push`) attempting replay against production or without explicit staging authorization immediately fails closed with PostgreSQL error `55000`.

### 6.2 Disposable PostgreSQL Environment Safety Proof
Executed via `scripts/release/disposable-env-runner.mjs` in an isolated PostgreSQL 17 container:
- Injected controlled sentinel financial records (genuine active customers, issued invoices, active commercial orders, approved expenses, balanced posted journals, user sessions).
- Executed the canonical production migration plan.
- **Results:**
  * 100% of sentinel records preserved without voiding, cancellation, deactivation, or reversal.
  * General ledger balance preserved ($4,000.00 debits = $4,000.00 credits).
  * `finance_reconcile_uat_fixtures` confirmed non-existent in schema.
  * Direct unfiltered `psql` execution of quarantined migrations threw error `55000` and failed closed.
  * Full pre/post evidence audited in `docs/delivery/migration-execution-audit.json`.

### 6.3 Test Harness Defect Resolution
- `apps/mobile/tests/ui-nr-native-discovery.test.mjs` (Test 11):
  * **Classification:** Test Harness / Staging Environment Assumption Defect.
  * **Root Cause:** Test previously asserted `body.length === 0` based on a historical zero-state assumption. Subsequent Newsroom UAT legitimately published 4 native stories.
  * **Remediation:** Updated test 11 to validate schema projection compliance across all published stories (`id`, `title`, `slug`, `body_html` bounds) and verified zero-state return when querying non-existent canary slugs. All 13 suite tests now pass.

---

## 7. R2 Remediation: Mandatory Migration Execution Control & Final Governance

### 7.1 Staging Migration History Provenance & Reconciled Lineage
In accordance with HT-MVP-REL-COM-01-R2 instructions, applied migration history on staging is strictly preserved without manufactured rewrites.

| Dimension | Migration 1 (Reconciliation) | Migration 2 (Privilege Remediation) | Migration 3 (Safety & Drop) |
| :--- | :--- | :--- | :--- |
| **Source Filename** | `20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql` | `20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql` | `20261030100000_ht_mvp_rel_com01_production_migration_safety.sql` |
| **Actual Staging Ledger Version** | `20261029131047` | `20261029142840` | `20261030001134` (Staging Ledger Tip) |
| **Post-Apply Source Modifications** | In-file fail-closed SQL guard added: raises PostgreSQL error 55000 on direct replay | In-file fail-closed SQL guard added: raises PostgreSQL error 55000 on direct replay | None (applies canonically; drops `finance_reconcile_uat_fixtures`) |
| **Future Release Execution Action** | Strictly excluded from production manifest by Governor | Strictly excluded from production manifest by Governor | Included in production package; executed via Governor |

### 7.2 Executable Migration Governor (`scripts/release/ht-migration-governor.mjs`)
The governor has been upgraded from a passive verifier to an executable execution control engine:
1. **Destination Identity Verification:** Requires explicit `--destination-id`. Rejects target/destination mismatches. Production execution requires explicit `PRODUCTION_MIGRATIONS_AUTHORIZED=true`.
2. **Checksum & Source Custody Guards:** Hashes each file on disk and validates SHA-256 equality against `docs/delivery/ht-mvp-production-migration-manifest.json` before applying.
3. **Dependency & Ledger Conflict Guards:** Rejects execution if any quarantined migration version (`20261029131047`, `20261029142840`) is detected in the destination ledger.
4. **Strict Review Classification:** Every migration must be categorized in `KNOWN_CANONICAL_BASELINE_MIGRATIONS`, `CANONICAL_COMMERCIAL_DDL_SEQUENCE`, or `QUARANTINED_STAGING_MIGRATIONS`. Unreviewed files trigger immediate fail-closed abort.
5. **Fail-Closed Execution Engine:** Executes migrations in transaction with `ON_ERROR_STOP=1`. If any statement fails, rolls back and halts immediately.

### 7.3 Disposable Execution Certification (9 Negative Tests & 9 Invariants)
Executed via `scripts/release/disposable-env-runner.mjs` in isolated PostgreSQL 17 container (`ht-disposable-pg-r2`):
- **9 Negative Tests Passed (9/9):**
  1. `QUARANTINED_IN_MANIFEST`: Injected quarantined migration in production plan rejected with `CRITICAL_FAIL_CLOSED`.
  2. `INCORRECT_DESTINATION_IDENTITY`: Destination identity mismatch rejected with `CRITICAL_FAIL_CLOSED`.
  3. `MISSING_MIGRATION_FILE`: Non-existent migration file rejected with `CRITICAL_FAIL_CLOSED`.
  4. `CHECKSUM_MISMATCH`: File hash mismatch rejected with `CRITICAL_FAIL_CLOSED`.
  5. `INVALID_MIGRATION_ORDER`: Out-of-order migration sequence rejected with `CRITICAL_FAIL_CLOSED`.
  6. `LEDGER_VERSION_CONFLICT`: Ledger containing quarantined version rejected with `CRITICAL_FAIL_CLOSED`.
  7. `UNFILTERED_REPLAY_ATTEMPT`: Direct `psql` execution of quarantined files blocked by SQL error `55000`.
  8. `UNAUTHORIZED_EXECUTION`: Production target without `PRODUCTION_MIGRATIONS_AUTHORIZED=true` rejected with `CRITICAL_FAIL_CLOSED`.
  9. `SCRIPT_ERROR_ABORTION`: Runtime script error aborted remainder of script and rolled back.
- **Positive Incremental Execution:**
  * Canonical commercial DDL sequence (`20261029020000` through `20261030100000`) applied safely via governor.
  * All 9 safety invariants preserved: 0 invoices voided, 0 orders cancelled, 0 customers deactivated, 0 expenses voided, 0 journals reversed, GL balanced at $4,000.00 debits = $4,000.00 credits, reconciler RPC confirmed absent, sessions preserved, policy registered.
  * Idempotency verified on repeat execution.
  * Audit evidence persisted to `docs/delivery/migration-execution-audit.json`.

### 7.4 Updated Release Preflight
`scripts/release/ht-mvp-preflight.mjs` has been updated:
- Obsolete 96-migration count and October 21 tip replaced with:
  * Local migration count: 110.
  * Migration tip: `20261030100000_ht_mvp_rel_com01_production_migration_safety.sql`.
  * Production plan count: 108 (strictly excluding 2 quarantined staging UAT migrations).
  * Staging ledger tip: `20261030001134` (110 records).
- Integrates `ht-migration-governor.mjs` manifest verification.
- Output: `PREFLIGHT STATUS: ALL CHECKS PASSED`, `DISPOSITION: READY_FOR_OWNER_CLIENT_DRY_RUN`.

---

## 8. R3 Remediation: Execution Integrity, Database Attestation & Transaction Atomicity

### 8.1 Connected Database Identity Attestation (`attestConnectedDatabase`)
Under HT-MVP-REL-COM-01-R3, destination identity is no longer trusted from command-line arguments or environment variables. Instead, the migration governor directly queries the connected database session:
- **Direct Live Session Inspection:** Queries `current_database()`, `current_user`, `inet_server_addr()`, `inet_server_port()`, `information_schema.schemata`, and `platform_settings`.
- **Destination Allowlist (`DESTINATION_ALLOWLIST`):**
  * `disposable`: Allowed ports `[55432, 54322, 5432]`, allowed hosts `['127.0.0.1', 'localhost', '::1', null]`, allowed databases `['postgres', 'healthtimes_test', 'ht_disposable']`, prohibited project refs `['bzuvntbkevvuhfhqhkua']`.
  * `staging`: Frozen; DDL mutations explicitly prohibited (`allow_ddl_mutations: false`).
  * `production`: Strictly locked down; `authorized: false` (`PRODUCTION_MIGRATIONS_AUTHORIZED=false`).
- **Negative Proofs:** Conflicting destination identifiers, destination spoofing, cross-environment target collisions (e.g. attempting to pass staging project ref to a disposable target), and unauthorized production runs are rejected fail-closed.

### 8.2 Pure Immutable-Manifest Verification
The CLI command structure enforces strict lifecycle separation:
- `manifest`: Explicit command to propose and generate a release manifest.
- `verify`: Pure read-only verification that inspects `docs/delivery/ht-mvp-production-migration-manifest.json` against all 108 production files on disk without rewriting or regenerating it.
- `execute`: Governed execution that applies only verified manifests.
- **Tamper Resistance Proof:** An intentional tampering test proved that mutating even a single byte or appending a comment in any migration file after approval immediately triggers `CRITICAL_FAIL_CLOSED: Content-addressed checksum mismatch` and prevents execution.

### 8.3 Real-Runner Per-Migration Transaction Atomicity (`wrapMigrationSqlWithAtomicLedger`)
The governor execution engine employs a dedicated SQL execution adapter (`createGovernedSqlAdapter`, `executeGovernedMigrations`) ensuring per-migration atomicity:
- Each migration is executed inside an atomic transaction envelope (`BEGIN; ... COMMIT;` with `\set ON_ERROR_STOP on`).
- The ledger record insertion into `supabase_migrations.schema_migrations` occurs inside the same transaction prior to `COMMIT`.
- **Failure Isolation Proof:** Tested with an intentional failure (`SELECT 1 / 0;` between statements):
  1. Statements prior to the failure are rolled back completely (canary table count = 0).
  2. Subsequent statements never execute.
  3. The schema_migrations ledger is NOT updated (ledger count = 0).
  4. The next execution run safely detects and handles the unapplied state without corrupting the ledger.
  5. Controlled sentinel financial records ($4,000 GL balance) remain completely intact.
- **Transactional Architecture Distinction:** Per-migration atomicity guarantees that individual migration files succeed completely or fail completely with zero partial schema mutation. Whole-release rollback is governed by dependency checking and sequential integrity, preventing execution from continuing past a failed step.

---

## 9. R3-R1 Remediation: Final Disposable Database Identity Boundary

### 9.1 Root Cause & Security Defect Resolution
The independent Moderator review identified that relying solely on server-reported internal listening ports (`inet_server_port()`) and database names could not conclusively distinguish the authorized, provisioned test instance from another local PostgreSQL instance running on port 5432 with database `postgres`. Because Docker maps port 55432 to internal container port 5432, server-internal queries reported 5432, masking the external connection endpoint.

To establish an unbreachable identity boundary, HT-MVP-REL-COM-01-R3-R1 introduced a three-fold independent evidence attestation framework:

1. **Independent Connection Endpoint Verification (`parsePostgresUri`):**
   - Parses the actual connection URI endpoint components (`host`, `port`, `database`).
   - Enforces `allowed_hosts: ["127.0.0.1", "localhost", "::1"]`.
   - Enforces `allowed_ports: [55432, 54322]`. Standard PostgreSQL port 5432 is strictly prohibited for disposable execution to prevent same-name/same-port collisions.
   - Enforces `allowed_databases: ["postgres", "healthtimes_test", "ht_disposable"]`.

2. **Instance-Specific Database Attestation Token (`supabase_migrations.disposable_instance_attestation`):**
   - Controlled container provisioning establishes an isolated database attestation table containing:
     * `instance_id`: Unique timestamped instance identifier (`ht-disp-inst-...`).
     * `container_name`: Exact Docker container identity (`ht-disposable-pg-r3-r1`).
     * `attestation_token`: Cryptographically random 256-bit token (`crypto.randomBytes(32).toString('hex')`).
     * `endpoint_host` and `endpoint_port`: Verified connection endpoint coordinates.
   - The migration governor queries this table and matches all credentials before certifying database identity.

3. **Governed SQL Execution Adapter Mutation Gate:**
   - `createGovernedSqlAdapter` tracks an internal `isAttested` lifecycle state.
   - Any invocation of `executeSqlAtomic(sql)` without prior positive attestation throws `CRITICAL_FAIL_CLOSED: Governed SQL execution adapter refused execution: Database identity has not been attested`.
   - Prevents un-attested connections from executing mutations.

### 9.2 Mandatory Negative Verification Matrix (All 6 Scenarios Proven)
In `tests/migration/migration-governor.test.mjs` and live container runner `scripts/release/disposable-env-runner.mjs`, all mandatory negative verification tests were executed and proven:

| Requirement | Failure Scenario | Live Rejection Proof | Result |
| :--- | :--- | :--- | :---: |
| **Negative Req 1** | Non-allowlisted network destination (`192.168.1.100`) | `CRITICAL_FAIL_CLOSED: Prohibited network destination host for disposable database: "192.168.1.100"` | **PASS** |
| **Negative Req 2** | Another PostgreSQL instance named `postgres` lacking attestation | `CRITICAL_FAIL_CLOSED: Missing disposable instance attestation table (supabase_migrations.disposable_instance_attestation)` | **PASS** |
| **Negative Req 3** | Otherwise plausible database on standard port 5432 | `CRITICAL_FAIL_CLOSED: Prohibited network destination port for disposable database: 5432` | **PASS** |
| **Negative Req 4** | Missing or mismatched instance attestation credentials | `CRITICAL_FAIL_CLOSED: Disposable instance attestation token mismatch for instance...` | **PASS** |
| **Negative Req 5** | Caller-supplied disposable label or container mismatch | `CRITICAL_FAIL_CLOSED: Disposable destination identity mismatch. Expected one of [disposable, ...]` | **PASS** |
| **Negative Req 6** | Staging or Production connection presented as disposable | `CRITICAL_FAIL_CLOSED: Destination identity conflict! Staging or Production connection presented as disposable` / reports staging | **PASS** |
| **Mutation Gate** | Un-attested adapter SQL mutation attempt | `CRITICAL_FAIL_CLOSED: Governed SQL execution adapter refused execution: Database identity has not been attested` | **PASS** |

### 9.3 Invariant & Financial Sentinel Preservation
Post-migration verification in the attested disposable container confirmed all 9 release safety invariants remain 100% intact:
- **GL Balance:** Debits $4,000.00 = Credits $4,000.00 (Zero discrepancy).
- **Invoices:** 4/4 remain `issued` (0 voided).
- **Orders:** 5/5 remain `approved` (0 cancelled).
- **Expenses:** 4/4 remain `approved` (0 voided).
- **Journals:** 4/4 remain `posted` (0 reversed).
- **Customer:** Sentinel customer remains `active`.
- **Reconciler RPC:** Confirmed dropped from public schema.
- **Sessions:** Auth sessions preserved.
- **Policy:** Registered in `platform_settings` as `EXCLUDE_STAGING_UAT_RECONCILIATION`.



