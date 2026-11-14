# Test evidence: G2G4G6-PARALLEL-CLOSE-01

**Run:** 2026-11-14, macOS, Node 22.23.2, PostgreSQL 16.15 (Homebrew)
**Code:** base `4fa9768a7f9ac85fd6d4fa2097af78cf93681b80` plus the new files on `local/g2g4g6-parallel-close-01`

**Disposable database.** A fresh cluster created with `initdb` in a session scratch directory:
- listening on `127.0.0.1:55432`, TCP only;
- password `ephemeral-ci-only`, matching CI;
- stopped and deleted after the runs.

```sh
# New offline suites: 38/38
node --test tests/continuity/content-continuity.test.mjs tests/continuity/legacy-url-preservation.test.mjs tests/account/process-account-deletions.test.mjs

# Database suites, one parallel invocation (CI form): 59/59, 0 skipped
PGPASSWORD=ephemeral-ci-only HT_DISPOSABLE_PG_BASE_URI=postgres://postgres:ephemeral-ci-only@127.0.0.1:55432 \
node --test tests/database/canonical-schema-roles.test.mjs tests/database/source-sync-writer.test.mjs \
  tests/database/reader-editorial-eligibility.test.mjs tests/database/account-deletion-contract.test.mjs \
  tests/database/account-deletion-operator.test.mjs

# Non-regression: 65/65
node --test tests/g5-web-edge.test.mjs tests/p0-editorial-source-sync-plan.test.mjs

# Commerce (root), each file separately: 1+17+5+6+7+2+3+1+1 = 43/43
node --test tests/g5-commerce-disabled.test.mjs tests/migration/paynow-edge-callback.test.mjs \
  tests/migration/paynow-r3-status-authorization.test.js tests/migration/paynow-usd01-premium-contract.test.mjs \
  tests/migration/paynow-usd01-r2-isolation.test.js tests/migration/paynow-r3-live-usd-attestation.test.js \
  tests/migration/paynow-r5-shared-rate.test.js tests/migration/paynow-r5-evidence-trust.test.js tests/migration/paynow-r5-http-auth.test.js

# Mobile (apps/mobile, node_modules linked from the main checkout): 18/18 and 17/17
node --test tests/g5-commerce-launch-guard.test.mjs tests/ht-ext01a-payment-finance-readiness.test.mjs
node --test tests/nm05-premium-consumer.test.mjs tests/ui-wf02c-premium-landing.test.mjs tests/ui03-premium-subscription-prompt.test.mjs

# Real-data continuity run (offline): exit 1 (1 BLOCK, the pilot coverage gap)
node scripts/continuity/snapshot-from-migration-output.mjs ../htp-zw/migration-output > snapshot.json
node scripts/continuity/content-continuity.mjs snapshot.json --out report.json
```

## Patch B1

- SHA-256: `0f84322b40aebd3800192dfff2b4470699e2faea62a405419c346a4b1e1ba088`
- `git apply --check` passes at `4fa9768`.

With the patch applied:
- `npx tsc --noEmit` exits 0.
- `identity-security`, `g5-policy-surfaces`, `g5-route-metadata`, `ui04-reader-ownership` and `ui-wf04-reader-personalization` all pass except `identity-security` test 13.
- Test 13 fails with *"staff_profiles should either return an empty RLS projection or fail closed, received HTTP 402"*. It is a live staging probe, it fails identically without the patch, and it is classified as staging-blocked from its own diagnostic.

## Mutation checks

**Continuity verifier:**

| Mutant | Change | Result |
|---|---|---|
| M1 | Withdrawal inferred from a partial listing | killed |
| M2 | Media rights inferred | killed |
| M3 | Homepage catch-all allowed | killed |
| M4 | Embargo ignored | killed |
| M5 | Slug collision check off | killed |
| M6 | `ready` ignores the BLOCK count | survived; equivalent, because every BLOCK code fails a gate |

**Operator:**

| Mutant | Change | Result |
|---|---|---|
| O1 | Auth errors swallowed | killed |
| O2 | Mark result trusted | killed (by a test added for this mutant) |
| O3 | Raw user ID logged | killed |
| O4 | Dry run acts | killed |
| O5 | Rejected staff identity deleted | killed |

## Real-data inputs (SHA-256)

| File | SHA-256 |
|---|---|
| `normalized-records.json` | `cbe506af16f26130e00f53de4c1b93e17221f33d3d88fe5291518662098dc0cb` |
| `media-manifest.json` | `a72df7ad859009586b2c4fd9d090e277edc1ae6ce00b06886c5c528a634b503c` |
| `redirect-manifest.json` | `681caa23c247f242ba9fcdc2575f25e218700004caf220c164337136fe3b0d19` (identical to `tests/continuity/fixtures/redirect-manifest-pilot.json`) |
| `wordpress-public-inventory.json` | `48b6fa5f7c74e64707e595d0ca126a615c5dd4a3ab31e5f890ff87e6cc11d0c4` |
