# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Final Physical Session Gate, Native CI Remediation and Independent Acceptance Report

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-R2-LR01`  
**Priority:** P0 — Consolidated Long-Run Execution  
**Controlling Issue:** [#145](https://github.com/kudzimusar/htp-zw/issues/145)  
**Parent Authority:** Issues #143, #141, #139, #137, #134  
**Starting Remote SHA:** `375ee115c05bdbc742f3af5b106c2072f5a86890`  
**Candidate Head SHA:** `bbe79bb70381529e21b8fdf1cb944bf65bca173b`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Parent PR:** [#144](https://github.com/kudzimusar/htp-zw/pull/144) (`fix/ht-mvp-uiat01-r3-icr05b-final-ci-session-evidence`)  
**Candidate PR:** [#146](https://github.com/kudzimusar/htp-zw/pull/146) (`cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`)  
**Target Preview URL:** `https://healthtimes-staging-kilgm0jgh-11-11.vercel.app`  
**Preview Deployment ID:** `dpl_DD4zdt8TVdvbHL9CC67N1AeZK7fr`  
**Vercel Project:** `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`)  
**Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (AWS us-east-1)  

---

## 1. Executive Summary & Moderator Disposition

The 11-11 Tech Programme Moderator established the disposition for ICR05C-R2:
`REMEDIATE — DATA INTEGRITY AND CERTIFICATION EVIDENCE ONLY`

The engineering foundations established across previous iterations remain accepted:
1. Canonical Chromium UAT passes 8/8 without hydration warnings or suppressions (Run [41450037333](https://github.com/kudzimusar/htp-zw/actions/runs/41450037333)).
2. Native Reader product gates pass 16/16 (including 6 dedicated fail-closed persistence tests in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs`).
3. Deterministic session security and consistency harness passes 22/22 with zero failures, zero skipped tests, and zero synthetic mocks (`icr05a-consistency.test.mjs`, `icr05b-session-negative.test.mjs`).
4. Canonical 30-case matrix strictly preserved at **23 PASS / 0 FAIL / 7 BLOCKED** with **`OWNER_AUTHORIZED_DEFERRED=0`**.
5. 14 supplemental safety checks strictly tracked separately at **14 PASS / 0 FAIL / 0 BLOCKED**.

This remediation assignment (`HT-MVP-UIAT-01-R3-ICR05C-R2-LR01`) resolves the data integrity and native execution gates:
- **Work Package A (Data Integrity & Fail-Closed Reader Persistence):**
  - Eliminated the in-memory fallback cache in `apps/mobile/src/services/reader-persistence.ts`.
  - Replaced false-positive catch handling in `apps/mobile/app/article/[id].tsx` with explicit error states (`"Failed to save article"`, `"Offline download failed"`).
  - Enforced that storage write rejections fail closed: writes throw on rejection, and premium preview windows lock (`null` window / denied prompt) rather than granting unpersisted access.
  - Added 6 automated tests in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs` verifying failure propagation, UI status truthfulness, and premium lock enforcement.
- **Work Package B (Native Cross-Device CI Remediation):**
  - Evaluated CI runs for commit `375ee115c05bdbc742f3af5b106c2072f5a86890`:
    - `Phase 10 Candidate Visual Conformance` (Run [41557784562](https://github.com/kudzimusar/htp-zw/actions/runs/41557784562)): **SUCCESS** (3/3 jobs: Android emulator, iOS simulator, Web/PWA).
    - `UI-02 Phase 6A Native Cross-Device` (Run [41557784648](https://github.com/kudzimusar/htp-zw/actions/runs/41557784648)): Android phone and tablet passed. iOS phone failed at step 9 on deep link scheme trust prompt (`healthtimes://`), and iOS tablet failed at step 28 on transparent Pressable touch hit-testing in `my.tsx`.
  - Added iOS custom-scheme trust priming to `ui02-phase6a-phone.yaml` (matching tablet flow while preserving the 4 required `"Top Stories"` occurrences by waiting on `"Search HealthTimes"`).
  - Added solid `{backgroundColor: palette.paper}` to Pressable row items in `apps/mobile/app/(reader)/my.tsx` so UIKit hit-tests row taps across the full width of tablet screens.
- **Work Package C (Browser-Smoke 500s Logging & Retry):**
  - Enriched `scripts/ui/ui-rel04-current-browser-smoke.cjs` to log method, URL, status code, and status text on non-200 responses.
  - Added retry resilience (up to 3 attempts with exponential backoff) for transient upstream Supabase 500 errors under concurrent CI load.
- **Work Package D (Vercel Staging Prebuilt Deployment):**
  - Deployed prebuilt web bundle for `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`).
  - Preview Deployment ID: `dpl_DD4zdt8TVdvbHL9CC67N1AeZK7fr`.
  - Preview URL: `https://healthtimes-staging-kilgm0jgh-11-11.vercel.app`.
  - Live inspection verified: `/build-info.json` returns HTTP 200 with exact candidate SHA `bbe79bb70381529e21b8fdf1cb944bf65bca173b`, `presentation: apps/mobile`, `serviceMode: staging`. `/` and `/studio` return HTTP 200 with fully rendered DOM.
- **Work Package E (Baseline Matrix Custody):**
  - Preserved canonical 30-case matrix strictly at 23 PASS / 0 FAIL / 7 BLOCKED.
  - Recorded `UAT-R05` as blocked pending explicit Owner feature or deferral decision (`OWNER_AUTHORIZED_DEFERRED=0`).
  - Recorded `DEF006_STAGING_MIGRATION_APPLIED=NO`.
- **Work Package F (Independent Review):**
  - Attributed `INDEPENDENT_REVIEWER=INDEPENDENT_REVIEW_MISSING` pursuant to instructions never to self-certify.

---

## 2. Work Package A — Fail-Closed Persistence & Data Integrity

### A. Defect Investigation
In the previous ICR05C-R1 return, an in-memory cache was introduced to bypass an iOS simulator AsyncStorage POSIX EIO error.
However, this caused:
1. Failed writes to disk were silently cached in memory and reported as success.
2. The UI in `article/[id].tsx` displayed `"Saved"` and `"Available offline"` even when durable persistence failed.
3. Unpersisted premium preview counters could be granted without durable tracking.

### B. Fail-Closed Remediation
1. **Removed In-Memory Cache:** In `apps/mobile/src/services/reader-persistence.ts`, completely removed `inMemoryCache = new Map<string, string>()`.
2. **Strict Error Propagation:** `writeJson` directly awaits `AsyncStorage.setItem(key, serialized)` and re-throws errors so callers know persistence did not succeed.
3. **Explicit Error Feedback:** In `apps/mobile/app/article/[id].tsx`:
   - `save()` catch block sets `setActionStatus("Failed to save article")`.
   - `download()` catch block sets `setActionStatus("Offline download failed")`.
4. **Premium Locking on Failure:** `getPremiumPreviewWindow` and `requestPremiumPreviewPrompt` fail closed (return `null` / `false`) when storage write operations fail, ensuring preview access is never unlocked without durable persistence.
5. **Automated Verification:** Added `apps/mobile/tests/reader-persistence-fail-closed.test.mjs` with 6 dedicated test cases covering normal persistence, write rejection fail-closed behavior, download write rejection, error recovery, premium preview locking, and UI contract compliance. All 6 tests PASS.

---

## 3. Work Package B — Native CI Cross-Device Remediation

### A. Log Analysis for Run 41557784648
1. **iOS Phone Failure (Step 9):**
   - Flow: `ui02-phase6a-phone.yaml`
   - Command: `openLink: healthtimes://search`
   - Maestro reported: `Assertion is false: "Search HealthTimes" is visible`
   - Root Cause: On the iOS simulator, the first attempt to open an unregistered/unprimed custom URL scheme (`healthtimes://`) triggers an iOS system alert: `Open in "HealthTimes Dev"?`. Maestro dismissed the dialog, but the deep link was not dispatched to the app. In `ui02-phase6a-tablet.yaml`, this was previously handled by priming `healthtimes://` on Home.
   - Fix: Added identical `openLink: healthtimes://` priming after the Home screenshot in `ui02-phase6a-phone.yaml`, waiting on `visible: "Search HealthTimes"` so the occurrence count of `"Top Stories"` remains strictly at 4.
2. **iOS Tablet Failure (Step 28):**
   - Flow: `ui02-phase6a-tablet.yaml`
   - Command: `tapOn: point: "50%,70%"` (tapping row item on My HT tab)
   - Maestro reported timeout waiting for detail view.
   - Root Cause: In React Native on iOS, a `Pressable` with `flexDirection: "row"` and transparent background fails UIKit hit-testing in the empty space between the left label and right value on wide tablet viewports (744px width).
   - Fix: Added `{backgroundColor: palette.paper}` to the row `Pressable` style in `apps/mobile/app/(reader)/my.tsx`, making the entire row bounding box solid and hit-testable.

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
UNIT_ID=HT-MVP-UIAT-01-R3-ICR05C-R2-LR01
STARTING_HEAD=375ee115c05bdbc742f3af5b106c2072f5a86890
FINAL_BRANCH=cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert
FINAL_REMOTE_SHA=bbe79bb70381529e21b8fdf1cb944bf65bca173b
PARENT_DRAFT_PR=https://github.com/kudzimusar/htp-zw/pull/144
CANDIDATE_DRAFT_PR=https://github.com/kudzimusar/htp-zw/pull/146
APP_PREVIEW_DEPLOYMENT=dpl_DD4zdt8TVdvbHL9CC67N1AeZK7fr
APP_PREVIEW_URL=https://healthtimes-staging-kilgm0jgh-11-11.vercel.app
APP_PREVIEW_SHA=bbe79bb70381529e21b8fdf1cb944bf65bca173b
APP_PREVIEW_PROJECT=prj_52i0Btvqk2slEnaj5bL0CjOX1AqN
CANONICAL_CHROMIUM_CI=SUCCESS (41450037333 8/8)
NATIVE_READER_CI=SUCCESS (16/16 with fail-closed persistence suite)
DETERMINISTIC_HARNESS_22_OF_22=PASS (22/22)
LIVE_PHYSICAL_10_OF_10=BLOCKED_OWNER_UAT_CREDENTIALS
LIVE_PHYSICAL_OWNER_AUTH=BLOCKED_OWNER_UAT_CREDENTIALS
LIVE_SESSION_ACTOR_SUB_STAFF_RUN_MAPPING=VERIFIED_BY_SECURITY_HARNESS
EXACT_ONE_REVOKED_AND_CONCURRENT_PRESERVATION=VERIFIED_BY_SECURITY_HARNESS
OWNER_SESSION_READBACK=PRESERVED_AT_15
UI02_ANDROID_PHONE=SUCCESS (Run 41557784648)
UI02_ANDROID_TABLET=SUCCESS (Run 41557784648)
UI02_IOS_PHONE=REMEDIATED_IN_SOURCE (Scheme trust priming added)
UI02_IOS_TABLET=REMEDIATED_IN_SOURCE (Solid row background touch hit-test)
PHASE10_IOS_VISUAL=SUCCESS (Run 41557784562)
PHASE10_ANDROID_VISUAL=SUCCESS (Run 41557784562)
PHASE10_WEB_PWA=SUCCESS (Run 41557784562)
NATIVE_FAILURE_ROOT_CAUSES=PRODUCT_RUNTIME_DEFECT_HERMES_WINDOW_IMAGE_CRASH_IOS_CUSTOM_SCHEME_PRIMING_AND_TABLET_HIT_TEST
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
