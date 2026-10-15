# HT-NR-01 — KERNEL CONVERGENCE EXECUTION PLAN

**Programme:** `HT-NR — HealthTimes Newsroom OS`  
**Execution Phase:** `HT-NR-01`  
**Certification Phase:** `HT-NR-00C-R2`  
**Role:** Newsroom Kernel Convergence Specialist  
**Governing Manifest:** `docs/newsroom/HT-NR-00_CANONICAL_RECUSTODY_MANIFEST.md`  
**From-Zero Replay Authority:** Certified in `docs/newsroom/HT-NR-00C_R2_DISPOSABLE_REPLAY_EVIDENCE.md` (Run ID `38665442217`)  
**Source Authority:** `755b7ba7aedaff0d3997a9f540572665c218d7e7` (PR #40 cumulative head)  
**Destination Authority:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c` (canonical `main`)  
**Target Staging Database:** `gcdohgbmqhqwydgaxrcr` (`ACTIVE_HEALTHY`)

---

## 1. OBJECTIVE & EXECUTION MANDATE

This document is the **deterministic, mechanical execution recipe** for phase `HT-NR-01`.
The from-zero database replay prerequisite has been **proven and certified** via remote ephemeral containerized replay (HT-NR-00C-R2, Run ID `38665442217`).

The specialist executing `HT-NR-01` must follow this plan sequentially from Gate 1 to Gate 10.
- **Do not merge PR #40.**
- **Do not rebase PR #40 onto `main`.**
- **Do not renumber or edit migrations.**
- **Do not alter mobile reader code or `apps/mobile/app/studio/**`.**
- **Do not restore legacy prototypes (`newsroom.html`, `newsroom.js`, `newsroom.css`).**
- **Do not add or modify `vercel.json`.**
- **Do not recover staging-mutating scripts or Edge Functions.**
- **Do not execute DDL/DML on Staging (`gcdohgbmqhqwydgaxrcr`).**
- Perform selective, file-by-file blob recustody of the **70 kernel authority files** strictly as instructed below.

---

## 2. DETERMINISTIC STAGE GATES

```mermaid
flowchart TD
    G1[Gate 1: Baseline Verification] --> G2[Gate 2: 62-Migration Ledger Recustody]
    G2 --> G3[Gate 3: Lineage Manifest Recustody]
    G3 --> G4[Gate 4: Serverless API Recustody]
    G4 --> G5[Gate 5: Local Test Harness Recustody]
    G5 --> G6[Gate 6: Standalone Contract Test Recustody]
    G6 --> G7[Gate 7: Local Contract Suite Certification]
    G7 --> G8[Gate 8: Generated Types Regeneration & Mobile Safety]
    G8 --> G9[Gate 9: Staging Live Ledger Verification]
    G9 --> G10[Gate 10: Convergence Commit & PR Submission]
```

---

### GATE 1: BASELINE VERIFICATION

1. **Create Execution Branch:**
   Branch strictly from canonical `main` (`6994aa18d37e2189dbc1d3f8efc76a638ee0971c`):
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/ht-nr01-kernel-convergence
   ```

2. **Verify Clean Working Tree & Mobile Baseline:**
   ```bash
   git status --porcelain
   # Expect empty output (or only untracked local ignore artifacts)

   npm --prefix apps/mobile run typecheck
   # Expect exit 0, 0 errors
   ```

---

### GATE 2: 62-MIGRATION LEDGER RECUSTODY

1. **Restore First 60 Migrations from PR #40 Head:**
   ```bash
   # Checkout the 60 migration blobs from PR #40 head
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- supabase/migrations/
   ```

2. **Ensure Migrations 61 and 62 from `main` Remain Authoritative:**
   ```bash
   git checkout 6994aa18d37e2189dbc1d3f8efc76a638ee0971c -- supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql
   git checkout 6994aa18d37e2189dbc1d3f8efc76a638ee0971c -- supabase/migrations/20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql
   ```

3. **Verify Migration Ledger Completeness (62 Total):**
   ```bash
   MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql | wc -l | tr -d ' ')
   echo "Migrations count: $MIGRATION_COUNT"
   test "$MIGRATION_COUNT" -eq 62 || { echo "ERROR: Expected 62 migrations, found $MIGRATION_COUNT"; exit 1; }
   ```

---

### GATE 3: LINEAGE MANIFEST RECUSTODY

1. **Restore Staging Adoption Manifest:**
   ```bash
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- supabase/migration-lineage/healthtimes-staging-adoption.json
   ```

---

### GATE 4: SERVERLESS API RECUSTODY

1. **Restore Proven Server APIs:**
   ```bash
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- api/newsroom.js
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- api/communications.js
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- api/public.js
   ```
   *(Note: `api/discussion.js` is excluded because mobile services call Supabase RPCs directly. `api/commerce.js` remains untouched on `main`).*

2. **Syntax and Dependency Smoke Check:**
   ```bash
   node -e "require('./api/newsroom.js'); console.log('api/newsroom syntax OK');"
   node -e "require('./api/communications.js'); console.log('api/communications syntax OK');"
   node -e "require('./api/public.js'); console.log('api/public syntax OK');"
   node -e "require('./api/commerce.js'); console.log('api/commerce syntax OK');"
   ```

---

### GATE 5: LOCAL TEST HARNESS RECUSTODY

1. **Restore Local Test Servers:**
   ```bash
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- scripts/ag06/newsroom-test-server.js
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- scripts/ca01/communications-test-server.js
   ```
   *(Note: `scripts/ag06/provision-staging-signups.mjs` and `supabase/functions/**` are excluded because they mutate Staging).*

---

### GATE 6: STANDALONE CONTRACT TEST RECUSTODY

1. **Restore Safe Local Contract Suites:**
   ```bash
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- tests/ag06-security-contract.spec.js
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- tests/ca01-contract.spec.js
   git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- tests/com01-contract.spec.js
   ```
   *(Note: `tests/ag06-live-security.spec.js` and `tests/ca01-live-security.spec.js` are excluded because they mutate Staging. `tests/newsroom-os.spec.js` remains untouched on `main`).*

---

### GATE 7: LOCAL CONTRACT SUITE CERTIFICATION

1. **Execute Standalone Contract Tests Against Local Test Servers:**
   ```bash
   npm run test:ag06:contract
   npm run test:ca01:contract
   npm run test:com01:contract
   ```

---

### GATE 8: GENERATED TYPES REGENERATION & MOBILE SAFETY

1. **Regenerate Types from Active Staging Database (Read-Only):**
   ```bash
   # Read-only introspection against project gcdohgbmqhqwydgaxrcr (ZERO database mutations)
   npx supabase gen types typescript --project-id gcdohgbmqhqwydgaxrcr > apps/mobile/src/generated/database.types.ts
   ```

2. **Verify Full Mobile Quality Suite (Zero Regressions):**
   ```bash
   npm --prefix apps/mobile run lint
   npm --prefix apps/mobile run typecheck
   npm --prefix apps/mobile run test -- --watchAll=false
   # Must pass with 0 errors
   ```

---

### GATE 9: STAGING LIVE LEDGER VERIFICATION

1. **Verify Live Staging Ledger Alignment (Read-Only):**
   - Confirm project `gcdohgbmqhqwydgaxrcr` is `ACTIVE_HEALTHY`.
   - Verify that all 62 migrations match live Staging ledger.
   - **STRICT ENFORCEMENT: ZERO DDL OR DML MUST BE EXECUTED ON STAGING.**

---

### GATE 10: CONVERGENCE COMMIT & PR SUBMISSION

1. **Stage Recustodied Kernel Files Exclusively (Exactly 70 Files):**
   ```bash
   git add \
     api/communications.js \
     api/newsroom.js \
     api/public.js \
     apps/mobile/src/generated/database.types.ts \
     scripts/ag06/newsroom-test-server.js \
     scripts/ca01/communications-test-server.js \
     supabase/migration-lineage/healthtimes-staging-adoption.json \
     supabase/migrations/ \
     tests/ag06-security-contract.spec.js \
     tests/ca01-contract.spec.js \
     tests/com01-contract.spec.js
   ```

2. **Verify Staged Files Count:**
   ```bash
   STAGED_COUNT=$(git diff --staged --name-only | wc -l | tr -d ' ')
   echo "Staged files count: $STAGED_COUNT"
   test "$STAGED_COUNT" -eq 70 || { echo "ERROR: Expected 70 staged files, found $STAGED_COUNT"; exit 1; }
   ```

3. **Commit with Deterministic Message:**
   ```bash
   git commit -m "feat(newsroom): canonical server-authority recustody (HT-NR-01)

   - Recustodied 60 historical migrations from PR #40 and unified with 2 main Premium migrations (62 total)
   - Restored serverless APIs: api/newsroom.js, api/communications.js, api/public.js
   - Preserved canonical api/commerce.js and all apps/mobile reader architecture
   - Regenerated database.types.ts against active Staging (gcdohgbmqhqwydgaxrcr)
   - Restored local contract test suites (ag06, ca01, com01) and local test server harnesses"
   ```

4. **Push to Remote and Open PR:**
   ```bash
   git push origin feat/ht-nr01-kernel-convergence
   gh pr create \
     --title "feat(newsroom): canonical server-authority recustody (HT-NR-01)" \
     --body "Follows HT-NR-00C-R1 recustody manifest and execution plan. Recustodies the 62-migration database ledger, serverless Newsroom/Communications/Public APIs, and local contract tests without altering canonical Mobile/Reader history."
   ```

---

## 3. HT-NR-01 RETURN RECEIPT TEMPLATE

Upon completion, the HT-NR-01 specialist must submit the following return receipt:

```markdown
# HT-NR-01 RETURN RECEIPT — CANONICAL KERNEL CONVERGENCE

- **Branch:** `feat/ht-nr01-kernel-convergence`
- **Starting Base SHA:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c` (`main`)
- **Final Convergence SHA:** `<NEW_COMMIT_SHA>`
- **Total Migrations in Repository:** 62
- **First 60 Migrations Source:** PR #40 (`755b7ba7aedaff0d3997a9f540572665c218d7e7`)
- **Final 2 Migrations Source:** Canonical `main` (`20261002060846`, `20261002061027`)
- **Live Staging Database Status:** `gcdohgbmqhqwydgaxrcr` (Verified 62 migrations, ZERO mutations applied)
- **Recustodied APIs:**
  - `api/newsroom.js` (Blob `f3520094832ad255d4e5a325430b2e51296af64f`)
  - `api/communications.js` (Blob `d09ef467bea7435a1aee9e941d3a4e810c5de348`)
  - `api/public.js` (Blob `2354d14094aafb0ab92429caa87bd31e00871127`)
- **Preserved Main APIs:**
  - `api/commerce.js` (Blob `ff899e65f2fe60f3c1563f2a55581c511ab44214`)
- **Excluded Non-Kernel Files:**
  - `newsroom.html`, `newsroom.js`, `newsroom.css` (Preserved main prototype copy untouched)
  - `vercel.json` (Excluded from source recustody)
  - `api/discussion.js` (Excluded; no canonical consumer)
  - `scripts/ag06/provision-staging-signups.mjs` (Excluded)
  - `supabase/functions/**` (Excluded)
  - `tests/ag06-live-security.spec.js`, `tests/ca01-live-security.spec.js` (Excluded)
- **Type Generation:**
  - Regenerated `apps/mobile/src/generated/database.types.ts`
  - Mobile Typecheck: PASSED (0 errors)
- **Contract Tests Passed:**
  - `test:ag06:contract`: PASSED
  - `test:ca01:contract`: PASSED
  - `test:com01:contract`: PASSED
- **Mobile Reader Safety Check:**
  - `apps/mobile/app/**`: UNTOUCHED
  - `apps/mobile/src/ui/**`: UNTOUCHED
  - `apps/mobile/src/services/**`: UNTOUCHED
  - `apps/mobile` tests: ALL PASSED
- **Pull Request:** `<PR_URL>`
```
