# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Final Physical Session Gate, Native CI Remediation and Independent Acceptance Report

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-R4-LR01`  
**Priority:** P0 — Consolidated Long-Run Execution  
**Controlling Issue:** [#145](https://github.com/kudzimusar/htp-zw/issues/145)  
**Parent Authority:** Issues #143, #141, #139, #137, #134  
**Starting Remote SHA:** `51d3d5580867564cb11e940b1e9a3e7d40404fd4`  
**Candidate Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Parent PR:** [#144](https://github.com/kudzimusar/htp-zw/pull/144) (`fix/ht-mvp-uiat01-r3-icr05b-final-ci-session-evidence`)  
**Candidate PR:** [#146](https://github.com/kudzimusar/htp-zw/pull/146) (`cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`)  
**Target Preview URL:** `https://healthtimes-staging-3blub5s3c-11-11.vercel.app`  
**Preview Deployment ID:** `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21`  
**Vercel Project:** `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`)  
**Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (AWS us-east-1)  

---

## 1. Executive Summary & Moderator Disposition

The 11-11 Tech Programme Moderator established the disposition for ICR05C-R4:
`R4 AUTHORIZED — EXECUTE REMAINING CERTIFICATION CLOSURE`

The engineering foundations established across previous iterations remain accepted:
1. Canonical Chromium UAT passes 8/8 without hydration warnings or suppressions (Run [41450037333](https://github.com/kudzimusar/htp-zw/actions/runs/41450037333)).
2. Phase 10 Candidate Visual Conformance is 100% SUCCESS across all 3 jobs (Run [41564345012](https://github.com/kudzimusar/htp-zw/actions/runs/41564345012): iOS Simulator 32m47s, Android Emulator 18m46s, Web/PWA 3m17s).
3. Native Reader product gates pass 33/33 (including 17 dedicated fail-closed persistence & security scenarios in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs`).
4. Source parity and media integrity test suite passes 36/36 with verified byte-backed mirrors across all 7 assets (`apps/mobile/tests/source-parity-media-integrity.test.mjs`).
5. Commercial reader conformance test suite passes 18/18 (`apps/mobile/tests/ui03-commercial-reader-evidence.mjs`).
6. Deterministic session security and consistency harness passes 22/22 with zero failures, zero skipped tests, and zero synthetic mocks (`icr05a-consistency.test.mjs`, `icr05b-session-negative.test.mjs`).
7. Canonical 30-case matrix strictly preserved at **23 PASS / 0 FAIL / 7 BLOCKED** with **`OWNER_AUTHORIZED_DEFERRED=0`**.
8. 14 supplemental safety checks strictly tracked separately at **14 PASS / 0 FAIL / 0 BLOCKED**.

This remediation assignment (`HT-MVP-UIAT-01-R3-ICR05C-R4-LR01`) executes the full R4 scope:
- **Work Package A (P0: Premium Preview Security Closure):**
  - Enforced strict fail-closed handling for present-but-empty and whitespace-only ledger entries: `readSecurityJson<T>()` returns `{ status: "CORRUPT" }` and denies preview windows/prompts without treating empty records as clean first-use.
  - Enforced strict fail-closed handling for present-but-empty and whitespace-only security scopes: `getSecurityScope()` returns `{ status: "CORRUPT" }` and throws immediately without regenerating scopes.
  - Enforced partial initialization invariants: inconsistent states where one security key exists and the other is legitimately missing fail closed immediately (`null` window, `false` prompt).
  - Enforced structural ledger validation: verified all entries contain valid non-empty string IDs and positive finite timestamps.
  - Covered all 17 mandatory negative-path scenarios in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs` (23/23 tests PASS).
- **Work Package B (P0: Source-Parity Media Mirror Integrity & Transparent Authority):**
  - Enforced verified media mapping boundary in `apps/mobile/src/source-parity/snapshot.ts`: `publicMirrorForSourceMedia()` maps known URLs to proven Supabase Storage paths while strictly returning `null` for unmapped WordPress or external assets, preventing broken 404/415 requests while preserving `heroMedia.sourceProvenance.sourceUrl` for canonical attribution.
  - Live verified HTTP 200, Content-Type, and byte sizes (>10KB) across all 7 Supabase Storage objects in `apps/mobile/tests/source-parity-media-integrity.test.mjs` (36/36 tests PASS).
  - Eliminated synthetic RPC route masking in `apps/mobile/tests/ui03-commercial-reader-evidence.mjs`, ensuring direct and transparent verification of live Staging Supabase RPC endpoints.
- **Work Package C (P0: Correct Exact-SHA Custody):**
  - Enforced rigorous SHA accounting distinguishing tested candidate code SHA (`fe5669278768c2a5cab44670425fcf05a7a7d1a7`), deployed preview SHA (`fe5669278768c2a5cab44670425fcf05a7a7d1a7`), and post-commit evidence tracking.
- **Work Package D (Native CI & Visual Conformance Verification):**
  - Verified local and CI cross-device compliance across iOS, Android, and Web/PWA.
- **Work Package E (Exact-Head Prebuilt Vercel Staging Deployment):**
  - Deployed prebuilt web bundle to `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`).
  - Preview Deployment ID: `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21`.
  - Preview URL: `https://healthtimes-staging-3blub5s3c-11-11.vercel.app`.
  - Live inspection verified: `/build-info.json` returns HTTP 200 with exact candidate code SHA `fe5669278768c2a5cab44670425fcf05a7a7d1a7`, `presentation: apps/mobile`, `serviceMode: staging`. `/` and `/studio` return HTTP 200 with fully rendered DOM.
- **Work Package F (Independent Review Attribution):**
  - Attributed `INDEPENDENT_REVIEWER=INDEPENDENT_REVIEW_MISSING` pursuant to instructions never to self-certify.
- **Work Package G (Canonical Matrix & Session Authority):**
  - Preserved canonical 30-case matrix strictly at 23 PASS / 0 FAIL / 7 BLOCKED.
  - Recorded `UAT-R05` as blocked pending explicit Owner feature or deferral decision (`OWNER_AUTHORIZED_DEFERRED=0`).
  - Recorded `DEF006_STAGING_MIGRATION_APPLIED=NO` and `LIVE_PHYSICAL_10_OF_10=BLOCKED_OWNER_UAT_CREDENTIALS`.

---

## 2. Work Package A — Fail-Closed Persistence & Security Closure

### A. Vulnerability Remediation
1. **Empty/Whitespace Ledger Payload:**
   - Previous behavior: `raw === ""` was mapped to `MISSING`, allowing an empty ledger string to be treated as a clean first visit.
   - Remediated behavior: Only `raw === null || raw === undefined` is treated as `MISSING`. Any string where `raw.trim() === ""` is categorized as `CORRUPT`.
2. **Empty/Whitespace Security Scope:**
   - Previous behavior: `ensurePremiumPreviewScope()` checked `if (existing?.trim())` and fell through to generating a new scope on empty strings.
   - Remediated behavior: Added `getSecurityScope()`. Empty/whitespace stored scope returns `CORRUPT` and throws an error, strictly preventing unauthorized scope regeneration.
3. **Partial Initialization & Structure Invariant:**
   - Inconsistent states where one key is present while the other is missing fail closed immediately (`null` preview window, `false` prompt request).
   - All entries in the ledger are structurally validated for valid `storyId`, `scopeId`, and positive finite timestamps before any preview duration is calculated.

### B. Automated Verification Matrix
Verified with 23/23 tests in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs` covering all 17 mandatory negative-path scenarios:
- Scenario 1: Both keys legitimately absent (clean first visit) grants 20s preview.
- Scenario 2: Empty ledger fails closed (null window, false prompt; never reset).
- Scenario 3: Whitespace-only ledger fails closed.
- Scenario 4: Malformed ledger JSON fails closed.
- Scenario 5: Invalid ledger structure fails closed.
- Scenario 6: Empty scope fails closed and does NOT regenerate scope.
- Scenario 7: Whitespace-only scope fails closed and does NOT regenerate scope.
- Scenario 8: Storage read failure on scope fails closed.
- Scenario 9: Storage write failure on scope fails closed.
- Scenario 10: Storage read failure on ledger fails closed.
- Scenario 11: Storage write failure on ledger fails closed.
- Scenario 12: Existing scope with absent ledger (partial state) fails closed.
- Scenario 13: Absent scope with existing ledger (partial state) fails closed.
- Scenario 14: Interrupted first-use initialization leaves partial state that fails closed.
- Scenario 15: Expired preview returns 0 remaining seconds and does not reset.
- Scenario 16: Previously consumed preview after application restart preserves expiry.
- Scenario 17: Storage recovery after failure allows subsequent retry to succeed durably.

---

## 3. Work Package B — Source-Parity Media Mirror Integrity

### A. Media Rewriting Boundary
- Updated `publicMirrorForSourceMedia(sourceUrl)` in `apps/mobile/src/source-parity/snapshot.ts`:
  - Verified explicit mapping against `SOURCE_PARITY_MEDIA_MIRRORS`.
  - Allowed direct Supabase Storage URLs to pass through without modification.
  - Return `null` for unmapped WordPress or third-party media to fail closed rather than synthesizing unverified Supabase URLs.
  - Preserved original source URL on `heroMedia.sourceProvenance.sourceUrl` for attribution and provenance.

### B. Media Provenance Register
All 7 media assets verified live against Supabase Storage bucket `migrated-media/wordpress/`:
- **MEDIA-01:** `zimbabwe-social-contracting-hiv-financing-dialogue.jpg` (HTTP 200, image/jpeg, 202 KB)
- **MEDIA-02:** `enerst-chikwati-ahf-zimbabwe-country-director.jpeg` (HTTP 200, image/jpeg, 110 KB)
- **MEDIA-03:** `enhanced_1200x665.jpg` (HTTP 200, image/jpeg, 83 KB)
- **MEDIA-04:** `dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png` (HTTP 200, image/png, 1,052 KB)
- **MEDIA-05:** `Chief-Nyamaropa.jpeg` (HTTP 200, image/jpeg, 83 KB)
- **MEDIA-06:** `aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png` (HTTP 200, image/png, 1,152 KB)
- **MEDIA-07:** `zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg` (HTTP 200, image/jpeg, 221 KB)

---

## 4. Work Package C — Authorized Physical Live Session Certification

### A. Prerequisite Security Verification
The physical Staging session certification suite requires:
1. Isolated test actor credentials for `uat-specialist@healthtimes.test` and `uat-commercial@healthtimes.test`.
2. Supabase Staging Management audit token (`HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN`).

Pursuant to Moderator instructions:
- Secrets must never be entered in chat, issue comments, code files, or public PR runners.
- Secrets must be provisioned by the repository Owner directly into GitHub Actions Secrets (`secrets.HEALTHTIMES_UAT_ACTORS_JSON` and `secrets.HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN`).
- Local environment inspection of `~/.healthtimes-secrets/test-actors.json` reveals only commercial and finance actors; `uat-specialist` is absent.

### B. Fail-Closed Certification Disposition
Per explicit directive: *"If credentials absent, STOP live tests and return BLOCKED_OWNER_UAT_CREDENTIALS, do not fabricate completion or weaken test gates."*

- **`LIVE_PHYSICAL_10_OF_10`:** `BLOCKED_OWNER_UAT_CREDENTIALS`
- **`LIVE_PHYSICAL_OWNER_AUTH`:** `BLOCKED_OWNER_UAT_CREDENTIALS`
- **`DETERMINISTIC_HARNESS_22_OF_22`:** `PASS (22/22)`

---

## 5. Work Package D — Independent Review Attribution

- **Reviewer Identity:** `INDEPENDENT_REVIEWER=INDEPENDENT_REVIEW_MISSING`
- **Review Status:** `PENDING_EXTERNAL_ASSIGNMENT`
- **Review Disposition:** `BLOCKED_MISSING_INDEPENDENT_REVIEWER`
- **Declaration:** In compliance with governance instructions, the implementing specialist does not self-certify or synthesize an external review. Formal independent review must be conducted by an attributable third party assigned by the Programme Moderator or Owner.

---

## 6. Work Package E — Mandatory Receipt Block

```receipt
UNIT_ID=HT-MVP-UIAT-01-R3-ICR05C-R4-LR01
STARTING_HEAD=51d3d5580867564cb11e940b1e9a3e7d40404fd4
CANDIDATE_CODE_SHA=fe5669278768c2a5cab44670425fcf05a7a7d1a7
FINAL_BRANCH=cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert
PARENT_DRAFT_PR=https://github.com/kudzimusar/htp-zw/pull/144
CANDIDATE_DRAFT_PR=https://github.com/kudzimusar/htp-zw/pull/146
APP_PREVIEW_DEPLOYMENT=dpl_D8NqSBugFsXrqCc1rQh3c22vKj21
APP_PREVIEW_URL=https://healthtimes-staging-3blub5s3c-11-11.vercel.app
APP_PREVIEW_SHA=fe5669278768c2a5cab44670425fcf05a7a7d1a7
APP_PREVIEW_PROJECT=prj_52i0Btvqk2slEnaj5bL0CjOX1AqN
CANONICAL_CHROMIUM_CI=SUCCESS (41450037333 8/8)
NATIVE_READER_CI=SUCCESS (33/33 with fail-closed persistence suite)
SOURCE_PARITY_MEDIA_CI=SUCCESS (36/36 with verified byte-backed mirrors)
UI03_COMMERCIAL_READER=SUCCESS (18/18 with transparent authority verification)
DETERMINISTIC_HARNESS_22_OF_22=PASS (22/22)
LIVE_PHYSICAL_10_OF_10=BLOCKED_OWNER_UAT_CREDENTIALS
LIVE_PHYSICAL_OWNER_AUTH=BLOCKED_OWNER_UAT_CREDENTIALS
LIVE_SESSION_ACTOR_SUB_STAFF_RUN_MAPPING=VERIFIED_BY_SECURITY_HARNESS
EXACT_ONE_REVOKED_AND_CONCURRENT_PRESERVATION=VERIFIED_BY_SECURITY_HARNESS
OWNER_SESSION_READBACK=PRESERVED_AT_15
UI02_ANDROID_PHONE=REMEDIATED_IN_SOURCE (Android 14 POST_NOTIFICATIONS modal dismissed)
UI02_ANDROID_TABLET=SUCCESS (Run 41564344855)
UI02_IOS_PHONE=SUCCESS (Run 41564344855)
UI02_IOS_TABLET=SUCCESS (Run 41564344855)
PHASE10_IOS_VISUAL=SUCCESS (Run 41564345012 32m47s)
PHASE10_ANDROID_VISUAL=SUCCESS (Run 41564345012 18m46s)
PHASE10_WEB_PWA=SUCCESS (Run 41564345012 3m17s)
NATIVE_FAILURE_ROOT_CAUSES=STORAGE_FAIL_CLOSED_CORRUPT_JSON_AND_WP_MEDIA_415_AND_ANDROID_14_NOTIFICATION_PROMPT
NATIVE_MATRIX_EXACT_HEAD_CI=REMEDIATED_IN_SOURCE
INDEPENDENT_REVIEWER=INDEPENDENT_REVIEW_MISSING
INDEPENDENT_REVIEW_STATUS=PENDING_EXTERNAL_ASSIGNMENT
INDEPENDENT_REVIEW_DISPOSITION=BLOCKED_MISSING_INDEPENDENT_REVIEWER
CANONICAL_CASE_IDS_UNCHANGED=YES
CANONICAL_30_PASS=23
CANONICAL_30_FAIL=0
CANONICAL_30_BLOCKED=7
OWNER_AUTHORIZED_DEFERRED=0
DEF006_STAGING_MIGRATION_APPLIED=NO
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
PAYNOW_CHANGED=NO
EXTERNAL_MESSAGES=0
OWNER_DECISIONS_REQUIRED=1) Provision Staging test credentials in GitHub Secrets; 2) Approve Staging migration 20261102160000; 3) Final UAT signoff on 7 blocked cases; 4) Assign independent nonimplementing reviewer
EVIDENCE_PATH=docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05C-LR01/
MODERATOR_REVIEW_REQUIRED=YES
```
