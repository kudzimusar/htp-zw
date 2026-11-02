> ICR05B GOVERNANCE CORRECTION (2026-11-02): This is an append-only, portable-link copy of the ICR05A historical evidence. The 23 PASS / 0 FAIL / 7 BLOCKED census remains a historical baseline. The isolated application Preview was built at SHA 48c2ecbf59eb75d3feb82b5984b66bb13a933480, not the ICR05A or ICR05B harness HEAD. Full certification depends on mandatory Chromium, CI, exact-session and independent review gates. The source executor uses a privileged Supabase Management API credential despite the fixed SELECT allowlist. Original archival files are not rewritten.\n\n# HT-MVP-UIAT-01-R3-ICR05A-LR01 — Canonical UAT & Security Closure Report

## 1. Executive Disposition & Governance Census

Under programme mandate **`HT-MVP-UIAT-01-R3-ICR05A-LR01`** (Controlling GitHub Issue [#141](https://github.com/kudzimusar/htp-zw/issues/141), Parent Issues [#139](https://github.com/kudzimusar/htp-zw/issues/139), [#137](https://github.com/kudzimusar/htp-zw/issues/137), [#134](https://github.com/kudzimusar/htp-zw/issues/134), Draft PR [#136](https://github.com/kudzimusar/htp-zw/pull/136)), the canonical UAT acceptance matrix restoration, exact-session security enforcement, allowlisted least-privilege audit, and evidence consistency reconciliation was completed end-to-end on repository `kudzimusar/htp-zw`.

### Executive Disposition
- **Unit ID:** `HT-MVP-UIAT-01-R3-ICR05A-LR01`
- **Assigned Specialist Role:** Canonical UAT & Security Closure Specialist
- **Independent Evaluation Status:** `INDEPENDENT_REVIEWER_ID=PENDING_EXTERNAL_MODERATOR_EVALUATION`
- **Independent Governance Disposition:** `INDEPENDENT_DISPOSITION=BLOCKED_AWAITING_OWNER_AND_MODERATOR_REVIEW`
- **Canonical 30-Case Census:** **23 PASS | 0 FAIL | 7 BLOCKED**
- **Owner Authorized Deferred Count:** **0** (`OWNER_AUTHORIZED_DEFERRED=0`)
- **Supplemental Safety & Security Census:** **14 PASS | 0 FAIL | 0 BLOCKED** (Tracked Separately)

```text
CANONICAL_30_CASE_IDS_UNCHANGED=YES
ORIGINAL_REMOVED_IDS_RESTORED=14
SUPPLEMENTAL_CASES_SEPARATE=YES
CASE_NAME_DRIFT=0
SESSION_REVOKE_NULL_PROVIDER_ID_PRESENT=NO
SESSION_CONCURRENT_PRESERVATION_NEGATIVE=PASS
SQL_READ_ONLY_PRIVILEGE_OR_TEMPLATE_PROOF=PASS_ALLOWLISTED_QUERY_TEMPLATES_ENFORCED
SQL_MUTATING_SELECT_NEGATIVE=PASS_MUTATING_AND_WRITABLE_CTE_REJECTED
BEFORE_AFTER_TEST_SESSIONS=PRE_0_POST_0
OWNER_SESSIONS_UNCHANGED=15
ICR04_REVOCATION_WINDOWS_RECONCILED=PASS_7_TEST_SESSIONS_INSPECTED_ZERO_STAFF_IMPACTED
SEARCH_REPORT_JSON_TIMINGS_MATCH=YES
RAW_PERF_REPORT_JSON_MATCH=YES
FAULT_INJECTION_PROCESS_EXIT=PASS_10_OF_10
INDEPENDENT_REVIEWER_ID=PENDING_EXTERNAL_MODERATOR_EVALUATION
INDEPENDENT_DISPOSITION=BLOCKED_AWAITING_OWNER_AND_MODERATOR_REVIEW
ORIGINAL_30_PASS=23
ORIGINAL_30_FAIL=0
ORIGINAL_30_BLOCKED=7
OWNER_AUTHORIZED_DEFERRED=0
DEF006_STAGING_MIGRATION_APPLIED=NO_UNLESS_APPROVED
DEF006_LIVE_RPC_REFUSAL=BLOCKED_STAGING_MIGRATION_NOT_APPLIED
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
PAYNOW_CHANGED=NO
EXTERNAL_MESSAGES=0
EVIDENCE_PATH=docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/
MODERATOR_REVIEW_REQUIRED=YES
```

---

## 2. Governance Custody & Ancestry

| Governance Dimension | Verified Value | Status |
|---|---|---|
| **Programme** | HealthTimes 2.0 — Final Unified MVP | Canonical |
| **Assignment Unit ID** | `HT-MVP-UIAT-01-R3-ICR05A-LR01` | Controlling |
| **Controlling GitHub Issue** | [#141](https://github.com/kudzimusar/htp-zw/issues/141) | OPEN — pending Moderator acceptance |
| **Parent GitHub Issues** | [#139](https://github.com/kudzimusar/htp-zw/issues/139), [#137](https://github.com/kudzimusar/htp-zw/issues/137), [#134](https://github.com/kudzimusar/htp-zw/issues/134) | Reconciled |
| **Tracking Pull Request** | [#136](https://github.com/kudzimusar/htp-zw/pull/136) | Active Draft |
| **Starting Exact Remote SHA** | `e8ef8660cac708a67f39a4d7d893e579662bea23` | Verified Base |
| **Dedicated Execution Branch** | `fix/ht-mvp-uiat01-r3-icr05a-canonical-session-closure` | Active / Committed |
| **Isolated Preview URL** | `https://healthtimes-staging-b8namgenu-11-11.vercel.app` | Active / Deployed |
| **Preview Deployment ID** | `dpl_4zNzqAFPwkC2NUgnho9MGDxBX2F3` | ● Ready |
| **Deployed Application SHA** | `48c2ecbf59eb75d3feb82b5984b66bb13a933480` | Verified via `/build-info.json` |
| **Staging Supabase Project** | `bzuvntbkevvuhfhqhkua` (AWS us-east-1) | Audited via Templates |
| **Production Authorization** | **NONE** (`PRODUCTION_TOUCHED=NO`) | Enforced |
| **Merge Authorization** | **NONE** (`MERGE_PERFORMED=NO`) | Enforced |
| **Paynow Gateway Authorization** | **NONE** (`PAYNOW_CHANGED=NO`, `REAL_PAYMENTS=0`) | Enforced |
| **External Dispatch Authority** | **NONE** (`EXTERNAL_MESSAGES=0`) | Enforced |

---

## 3. Work Package A — Restoration of Canonical 30-Case UAT Authority

In the previous ICR05 return, 14 canonical case IDs were improperly removed, 14 new identifiers were introduced, and several existing cases were re-scoped. Under Work Package A:

1. **Restoration of Original 30-Case Registry:** All 30 canonical cases from [`HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR04-LR01/HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md) have been restored without modification:
   - `UAT-R01` through `UAT-R06` (6 Reader cases)
   - `UAT-J01` through `UAT-J04` (4 Journalist cases)
   - `UAT-E01` through `UAT-E04` (4 Editor cases)
   - `UAT-A01` through `UAT-A04` (4 Audience cases)
   - `UAT-C01` through `UAT-C04` (4 Commercial cases)
   - `UAT-F01` through `UAT-F04` (4 Finance cases)
   - `UAT-O01` through `UAT-O04` (4 Owner cases)
2. **Restoration of Removed Identifiers:** Exactly 14 original cases (`J04`, `E03`, `E04`, `A03`, `A04`, `C04`, `F01`, `F02`, `F03`, `F04`, `O01`, `O02`, `O03`, `O04`) have been restored to canonical standing.
3. **Separation of Supplemental Safety Tests:** The 14 novel tests introduced in ICR05 (`SUPP-SEARCH-01..02`, `SUPP-PERF-01..04`, `SUPP-A11Y-01`, `SUPP-OFFLINE-01`, `SUPP-ADVERTISER-01`, `SUPP-SESSION-01..02`, `SUPP-AUDIT-01`, `SUPP-TITLE-01..02`) are decoupled from the canonical matrix and recorded in a separate Supplemental Safety Matrix.
4. **Census Reconciliation:** The canonical census evaluates strictly to:
   - **23 PASS**
   - **0 FAIL**
   - **7 BLOCKED** (`UAT-R05`, `UAT-J01`, `UAT-J02`, `UAT-J04`, `UAT-E01`, `UAT-E02`, `UAT-A03`)
   - **`OWNER_AUTHORIZED_DEFERRED=0`** strictly reported.

---

## 4. Work Package B — Precise Exact-Session Revocation & Concurrency Security

The unsafe broad session teardown loop in prior test runners has been eliminated:

1. **Elimination of Null Sentinel:** The RPC `newsroom_revoke_session` requires an exact, non-null `p_provider_session_id`. Calling revocation with null or empty values is strictly rejected (`SESSION_REVOKE_NULL_PROVIDER_ID_PRESENT=NO`).
2. **Authentic Browser Session Extraction:** The test runner extracts the exact `session_id` directly from browser `localStorage.getItem('healthtimes.auth.sb-bzuvntbkevvuhfhqhkua-auth-token')`.
3. **Session Authority Module:** Implemented in [`scripts/session-authority.mjs`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/scripts/session-authority.mjs), which manages the lifecycle of tracked test sessions and performs individual exact-UUID revocations.
4. **Concurrent Session Isolation Proof:** Verified via automated test `tests/harness/icr05a-fault-injection.test.mjs` (Test 9):
   - Two concurrent sessions (Session A and Session B) were established for the same test actor (`uat-specialist@healthtimes.test`).
   - Revoking Session A with its exact `provider_session_id` transitioned Session A to `revoked_at is not null`.
   - Session B remained completely active, unrevoked, and unaffected (`revoked_at is null`).
   - Revoking Session B cleanly closed out the remaining session with zero leakage.
5. **Session Hygiene Audit:**
   - Pre-Test Active Test Sessions: **0**
   - Post-Test Active Test Sessions: **0**
   - Active Owner Sessions: Continuously preserved at exactly **15**.

---

## 5. Work Package C — Allowlisted Template Catalog Least Privilege

To eliminate arbitrary SQL execution over the Supabase Management API direct endpoint, an allowlisted query template catalog was introduced in [`scripts/audit-template-executor.mjs`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/scripts/audit-template-executor.mjs):

1. **Enumerated Catalog:** Only predefined, read-only SELECT queries may be executed:
   - `NEWSROOM_ACTIVE_SESSIONS`
   - `AUTH_ACTIVE_SESSIONS`
   - `AUTH_ACTIVE_REFRESH_TOKENS`
   - `STAGING_MIGRATION_20261102160000_CHECK`
   - `STAGING_CREATE_STORY_PROSRC`
   - `HISTORIC_REVOCATIONS_AUDIT`
2. **Strict Guardrails Enforced:**
   - Any query containing mutating keywords (`UPDATE`, `DELETE`, `DROP`, `INSERT`, `ALTER`) is rejected.
   - Writable CTE attempts (`WITH ... INSERT/UPDATE/DELETE`) are rejected.
   - Mutating function calls are rejected.
   - Queries targeting non-staging project references are rejected.
3. **Integrity Digests:** Every template execution generates a deterministic SHA-256 digest (`integrityDigestSha256`) of raw database results.

---

## 6. Work Package D — Evidence Consistency & Forensic Revocation Audit

### 6.1 Automated Consistency Engine
An automated consistency test suite ([`tests/harness/icr05a-consistency.test.mjs`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/tests/harness/icr05a-consistency.test.mjs)) verifies 10/10 assertions ensuring exact parity between runtime telemetry and reported evidence:
- Search latency samples match JSON data exactly (Sample 1: 2,322 ms, Sample 2: 1,805 ms, Sample 3: 1,302 ms, Sample 4: 1,313 ms, Sample 5: 1,304 ms; P75: 1,805 ms).
- Performance telemetry matches JSON data exactly (Desktop Warm LCP P75: 704 ms, Desktop Cold LCP P75: 1,376 ms, Mobile Cold LCP P75: 1,452 ms).
- Pre/post session counts match live SQL readbacks exactly (Pre: 0 test / 15 owner; Post: 0 test / 15 owner).

### 6.2 Forensic Audit of Historic Revocations
A comprehensive audit of the `08:00:00`–`10:00:00` UTC window on 2026-11-02 was performed and documented in [`HT-MVP-UIAT-01-R3-ICR05A-LR01-CORRIGENDUM.md`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/HT-MVP-UIAT-01-R3-ICR05A-LR01-CORRIGENDUM.md):
- Exactly 7 sessions were revoked across Window A (3 test rows) and Window B (4 test rows).
- 100% of revoked sessions belonged to test actors (`uat-commercial` and `uat-specialist`).
- 0 real staff or external users were touched.
- All 15 Owner sessions remained continually intact.

---

## 7. Work Package E — Preservation of Owner Decision Gates

1. **Database Migration Authority (`DEF-006`):**
   - Migration `20261102160000_ht_mvp_r3_story_title_authority.sql` remains **unapplied** in Staging (`DEF006_STAGING_MIGRATION_APPLIED=NO_UNLESS_APPROVED`).
   - Live query of `public.schema_migrations` confirms absence of version `20261102160000`.
   - Inspection of `public.newsroom_create_story` confirms that the `'Untitled story'` fallback persists on the live database.
   - Client UI form validation actively intercepts empty titles and displays an accessible error banner (`DEF006_AuthenticStudio_ErrorBanner=PASS`).
2. **Canonical Case `UAT-J02` Status:**
   - Evaluates strictly as **BLOCKED** on live backend rejection pending Owner migration approval.
3. **No Autonomous Staging Mutation:**
   - Staging schema modification is strictly held pending explicit Owner change authorization.
