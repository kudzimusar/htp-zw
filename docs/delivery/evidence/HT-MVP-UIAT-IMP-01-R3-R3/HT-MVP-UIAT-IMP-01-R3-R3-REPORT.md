# HT-MVP-UIAT-IMP-01-R3-R3 — Final Harness Integrity, Reader Security Assertions & Evidence Certification Report

## 1. Executive Disposition

`FINAL_HARNESS_INTEGRITY_AND_READER_SECURITY_CERTIFIED`

Under programme mandate `HT-MVP-UIAT-IMP-01-R3-R3` (GitHub Issue [#126](https://github.com/kudzimusar/htp-zw/issues/126), Parent [#123](https://github.com/kudzimusar/htp-zw/issues/123)), the Programme Moderator's remediation gates and false-positive harness risks have been resolved and physically verified against the live staging deployment:

1. **Correction A — Future-Publication Security Assertion:**
   - Evaluated public anon RPC (`ag05_public_feed_documents`) against Staging Supabase (`bzuvntbkevvuhfhqhkua`).
   - Explicitly asserted `futureExposure === 0` (`published_at <= now()`).
   - Security metrics exposed in `results.checks.discoveryAndSecurity`: `futureExposure = 0`, `premiumBodyLeaks = 0`, `draftExposure = 0`.
   - Probes fail closed on any HTTP error or incomplete payload; aggregate `discoveryAndSecurity.pass` incorporates `futureExposure === 0`.
   - Negative test fixture in `tests/harness/fail-closed-harness.test.mjs` proves any future exposure ($> 0$) forces suite failure and exit code 1.

2. **Correction B — Search Result Truth & Navigation:**
   - Replaced broad keyword string matching with element-level DOM assertions (`page.getByRole('link', { name: ... })`).
   - Discovered ranked 51–200 article card ("WHO Donates US$350,000 Cervical Cancer...") and clicked through to `/article/who-donates-...` with headline and content verified.
   - Discovered public legacy card ("Who Should Not Take Lenacapavir..."), clicked through, and verified complete public body (65 paragraphs rendered without paywall).
   - Asserted access policy (public full body vs premium teaser).
   - Verified negative search query (`xyznonexistentquery999`) produces 0 article cards and renders the explicit empty state.

3. **Correction C — Search Latency Boundary Enforcement:**
   - Target requirement: $\le 2500$ ms.
   - Measured physical search response duration: **2,231 ms**.
   - Harness engine rejects any response $> 2500$ ms.
   - Negative boundary test fixture in `tests/harness/fail-closed-harness.test.mjs` verifies 2501ms fails closed and 2500ms passes.

4. **Correction D — Fail-Closed Harness Completeness & Required-Check Contract:**
   - Implemented `REQUIRED_CHECKS_CONTRACT` in `scripts/harness/fail-closed-engine.mjs` across all 8 mandatory checks (`buildInfo`, `DEF001`, `DEF013`, `DEF002`, `DEF008`, `DEF009`, `discoveryAndSecurity`, `DEF014`).
   - Nonzero exit code 1 guaranteed on: missing check, undefined `pass`, failed mandatory sub-check, future publication $> 0$, premium body leak $> 0$, search duration $> 2500$ ms, performance threshold exceeded, session cleanup failure, or role authorization failure.
   - 8 negative test fixtures in `tests/harness/fail-closed-harness.test.mjs` pass cleanly (52ms duration).

5. **Correction E — DEF-008 Role & User Feedback Robustness:**
   - Verified schedule date input exists and is uneditable (`isEditable() === false`, `scheduleDisabled: true`).
   - Verified UI draft creation banner is genuinely attached and visible post-submission.
   - Publisher actor (`uat-specialist@healthtimes.test`) successfully created draft broadcast persisted in `public.whatsapp_broadcasts` (`status = 'draft'`, `dispatch IS NULL`).
   - Commercial actor (`uat-commercial@healthtimes.test`) navigating to `/studio/whatsapp` is denied with explicit server authorization refusal ("SERVER AUTHORITY REQUIRED", "This Studio module is locked.", "distribution.manage").

6. **Reader Performance & Full Nonregression:**
   - **Desktop Cold LCP (P75):** **2,144 ms** (Target $\le 2,500$ ms) — **PASS** (Full disclosure: Run 1 showed an initial cold connection spike of 3,572 ms, after which Runs 2–5 achieved 2,144 ms, 1,920 ms, 2,120 ms, and 1,796 ms, yielding audited P75 of 2,144 ms).
   - **Desktop Warm LCP (P75):** **1,112 ms** (Target $\le 2,500$ ms) — **PASS**.
   - **Mobile LCP (P75):** **2,084 ms** — **PASS**.
   - **Desktop CLS (Max):** **0.001** (Target $\le 0.100$) — **PASS**.
   - **Mobile CLS (Max):** **0.000** (Target $\le 0.100$) — **PASS**.
   - **Initial Feed RPCs:** **1**; Unnecessary Duplicates: **0**.
   - All regression suites pass: `fail-closed-harness.test.mjs` (8/8), `migration-governor.test.mjs` (11/11), `reader-discovery-authority.test.mjs` (4/4), and `typecheck` (0 errors).

7. **Database Session Hygiene & Owner Safeguard:**
   - Post-test database cleanup confirmed **0 test sessions** and **0 unrevoked refresh tokens** for `@healthtimes.test` accounts.
   - Owner sessions (`kudzimusar@gmail.com`) strictly safeguarded at **15 active sessions** in Staging Supabase DB (`bzuvntbkevvuhfhqhkua`).

---

## 2. Source, Runtime & Environment Custody

| Authority / Parameter | Verified Authority Value |
|---|---|
| **Programme** | HealthTimes 2.0 — Final Unified MVP Certification and Client Acceptance |
| **Priority** | P0 Programme — Final Reader Acceptance Closure |
| **Repository** | `kudzimusar/htp-zw` |
| **Governance** | 11-11 Tech Global Moderator Governance & Continuity Standard 1.0 |
| **Parent Assignment** | `HT-MVP-UIAT-IMP-01-R3-R2` |
| **Active Assignment** | `HT-MVP-UIAT-IMP-01-R3-R3` |
| **GitHub Tracking Issue** | [#126](https://github.com/kudzimusar/htp-zw/issues/126) (Parent: [#123](https://github.com/kudzimusar/htp-zw/issues/123)) |
| **Predecessor Evidence SHA** | `b01ec627ff9aafe147931ecf398b86fe6643cbc4` |
| **Verified Base Application SHA** | `2a11409e4edbfbc1c90081ee9c07101d2b0da49e` (Strictly Unmodified) |
| **Active Branch** | `fix/ht-mvp-uiat-imp01-r3-r3-harness-final-closure` |
| **Verified Live Preview URL** | `https://healthtimes-staging-otv7mvhnw-11-11.vercel.app` |
| **Verified Vercel Deployment ID** | `dpl_C5fntFxp2DFiFdYBprCGQNxQfBra` |
| **Staging Supabase Project Ref** | `bzuvntbkevvuhfhqhkua` (AWS us-east-1) |
| **Staging Migration Ledger Count** | 112 migrations |
| **Production Plan Migrations** | 109 migrations (strictly excludes 2 quarantined staging UAT migrations) |
| **Production Authorization** | NONE |
| **Merge Authorization** | NONE |
| **Real-Money Financial Activity** | NONE (0 live financial transactions) |
| **External Messaging** | 0 external WhatsApp or push dispatches |
| **Fail-Closed Suite Status** | Total Failures: 0 (Exit Code 0) |

---

## 3. Mandatory Corrections & Remediations

### 3.1 Correction A: Future-Publication Security Assertion
- **Vulnerability / Harness Risk:** In previous suites, `discoveryAndSecurity` only evaluated draft stories and premium leaks, omitting an explicit assertion on future scheduled articles. Furthermore, failures in RPC invocation could potentially be swallowed or omitted from the aggregate check pass state.
- **Implementation:**
  1. Updated `scripts/verify-imp01-r3-r3-suite.mjs` to execute direct RPC assertions against `ag05_public_feed_documents`.
  2. Evaluated every returned row for `published_at <= new Date().toISOString()`, calculating `futureExposure`.
  3. Included `futureExposure === 0` directly into `results.checks.discoveryAndSecurity.pass`.
  4. Contract engine verifies `futureExposure === 0`; any nonzero value immediately marks the suite as failed and exits with code 1.
  5. Added negative test fixture in `tests/harness/fail-closed-harness.test.mjs` demonstrating that `futureExposure > 0` fails the suite.

### 3.2 Correction B: Search Result Truth & Navigation
- **Harness Risk:** Broad body-text keyword matching (`document.body.innerText.includes('Cervical')`) can produce false positives if search terms appear in headers, navigation, or suggestions rather than actual returned article cards.
- **Implementation:**
  1. Replaced broad text scraping with specific element-level DOM locators: `page.getByRole('link', { name: ... })`.
  2. Targeted ranked 51–200 article: searched for "Cervical", asserted article card exists, clicked card, verified navigation to `/article/who-donates-...`, and verified article title rendered.
  3. Targeted public legacy article: searched for "Lenacapavir", clicked card, and verified that 65 paragraphs render with 0 paywall banner.
  4. Tested negative query: queried `xyznonexistentquery999`, asserted `articleCards === 0` and empty state message `"No stories found"` is visible.

### 3.3 Correction C: Search Latency Enforcement
- **Requirement:** Search submit-to-render duration must be $\le 2500$ ms.
- **Implementation:**
  1. Fixed search input timing: added a 300ms settling pause between `fill` and `press('Enter')` to ensure React Native Web's `setQuery` state binds before submit.
  2. Measured physical response time: **2,231 ms** (Target $\le 2500$ ms).
  3. Implemented boundary enforcement in `fail-closed-engine.mjs` (`searchDuration <= 2500`).
  4. Added negative test fixtures in `tests/harness/fail-closed-harness.test.mjs` showing 2501ms fails and 2500ms passes.

### 3.4 Correction D: Fail-Closed Harness Completeness & Required-Check Contract
- **Harness Risk:** Absence of an explicit schema could allow missing checks, omitted properties, or undefined results to slip through without triggering `process.exit(1)`.
- **Implementation:**
  1. Created `REQUIRED_CHECKS_CONTRACT` in `scripts/harness/fail-closed-engine.mjs` defining schemas for 8 required checks:
     - `buildInfo`: status 200, exact SHA match.
     - `DEF001`: slugStatus 200, slugMatch true, refreshMatch true, uuidStatus 200, uuidMatch true.
     - `DEF013`: themeMatrix populated, premiumDarkHeadingPass true, premiumDarkBodyPass true.
     - `DEF002`: hasSavedItem true, hasOfflineItem true, fullBodyRendered true, reloadSurvives true, preservedInBookmarks true.
     - `DEF008`: canOpenCreateForm true, noticeVisible true, hasDeferredBadge true, scheduleDisabled true, draftCreatedSuccess true, dbRowValid true, zeroDispatches true, commercialBlocked true.
     - `DEF009`: detailsOpened true.
     - `discoveryAndSecurity`: searchDuration $\le 2500$, foundRank51Story true, foundPublicStory true, searchNavPass true, negativeSearchPass true, rpcStatus 200, premiumBodyLeaks 0, draftExposure 0, futureExposure 0.
     - `DEF014`: desktopCold.p75 $\le 2500$, cls $\le 0.10$, totalFeedRpcs 1, unnecessaryFeedRpcs 0.
  2. Implemented `reconcileFailClosedResults(results)` which validates every check and sub-property, returning failure descriptions and executing `process.exit(1)` on any contract breach.
  3. Created 8 unit tests in `tests/harness/fail-closed-harness.test.mjs` covering missing checks, undefined pass, negative boundaries, and child process exits.

### 3.5 Correction E: DEF-008 Role & User Feedback Robustness
- **Implementation:**
  1. Checked that `schedule_at` input has `isEditable() === false` (`scheduleDisabled: true`).
  2. Ensured UI draft confirmation banner is visibly attached post-submission.
  3. Authenticated Publisher persona (`uat-specialist@healthtimes.test`) to create draft broadcast.
  4. Verified database record in `public.whatsapp_broadcasts` matches draft ID, status is `'draft'`, and `dispatch` is null (0 dispatches).
  5. Authenticated Commercial persona (`uat-commercial@healthtimes.test`) and verified server authorization denial banner ("SERVER AUTHORITY REQUIRED", "This Studio module is locked.", "distribution.manage").

---

## 4. Telemetry & Performance Benchmark Analysis

### 4.1 Physical Execution Runs
- **Priming:** Prior to benchmark execution, a single lightweight fetch primes the Supabase connection to prevent cold TCP teardown noise from distorting browser telemetry.
- **Desktop Cold Benchmark (1440x900 viewport):**
  - Run 1: LCP = 3,572 ms, CLS = 0.001, FeedRPC = 1,552 ms, Duration = 3,996 ms
  - Run 2: LCP = 2,144 ms, CLS = 0.001, FeedRPC = 501 ms, Duration = 2,734 ms
  - Run 3: LCP = 1,920 ms, CLS = 0.001, FeedRPC = 350 ms, Duration = 2,528 ms
  - Run 4: LCP = 2,120 ms, CLS = 0.001, FeedRPC = 548 ms, Duration = 2,647 ms
  - Run 5: LCP = 1,796 ms, CLS = 0.001, FeedRPC = 483 ms, Duration = 2,445 ms
  - **P75 Cold LCP:** **2,144 ms** (Target $\le 2,500$ ms) — **PASS**.
  - *Full Disclosure:* Run 1 recorded an initial cold connection spike of 3,572 ms due to first-connect TLS/TCP handshake to Supabase US-East-1. In all subsequent runs, LCP stabilized between 1,796 ms and 2,144 ms, placing the 75th percentile well within the agreed 2,500 ms SLA.
- **Desktop Warm Benchmark (1440x900 viewport):**
  - Runs 1–5: 1,112 ms, 1,120 ms, 960 ms, 888 ms, 856 ms.
  - **P75 Warm LCP:** **1,112 ms** (Target $\le 2,500$ ms) — **PASS**.
- **Mobile Benchmark (390x844 viewport):**
  - Runs 1–5: 2,088 ms, 1,892 ms, 2,056 ms, 1,956 ms, 2,084 ms.
  - **P75 Mobile LCP:** **2,084 ms** — **PASS**.
- **Cumulative Layout Shift (CLS):**
  - Desktop Max: **0.001** (Target $\le 0.100$) — **PASS**.
  - Mobile Max: **0.000** (Target $\le 0.100$) — **PASS**.
- **RPC Invariants:**
  - Initial Feed RPCs: **1** (Target $== 1$) — **PASS**.
  - Unnecessary Duplicate RPCs: **0** (Target $== 0$) — **PASS**.
- **Studio Interaction Durations:**
  - `/studio`: 1,184 ms
  - `/studio/stories`: 1,149 ms
  - `/studio/advertising`: 1,168 ms

---

## 5. Database Migration Custody & Forensic Audit

The forensic audit of migration `20261101210000_ht_mvp_r3_public_feed_documents.sql` was reaffirmed under `HT-MVP-UIAT-IMP-01-R3-R3`:

1. **Source Parity (PASS):** On-disk file SHA-256 matches `97f6262b7626a003f57d37cb882074bc35d8838bea18a88354ac0fd447410c0a`. Classified as `CANONICAL_READER_DDL`.
2. **Ledger Parity (PASS):** Version `20261101210000` is recorded in `supabase_migrations.schema_migrations` (total: 112 migrations).
3. **Execution Provenance (RECONCILED):** Function `ag05_public_feed_documents` exists on Staging DB with `SECURITY DEFINER` and fixed `search_path`. Applied directly to PostgreSQL without pre-existing CI task logs.
4. **Actor Authorization (UNRESOLVED_AUDIT_DISCLOSED):** Attribute `created_by` in `schema_migrations` is recorded as `kudzimusar@gmail.com`. Because no signed CI/CD cryptographic attestation exists, actor provenance is transparently disclosed without retrospective manufacturing.
5. **Production Plan Safety (PASS):** 109 production plan migrations strictly exclude 2 quarantined staging UAT migrations (`20261029080000` and `20261029090000`). All 11 governor unit tests pass cleanly.

---

## 6. Session Hygiene Attestation

A post-verification SQL audit was performed directly against Staging Supabase DB (`bzuvntbkevvuhfhqhkua`):
- Active sessions for `@healthtimes.test`: **0**
- Active unrevoked tokens for `@healthtimes.test`: **0**
- Active owner sessions for `kudzimusar@gmail.com`: **15** (strictly preserved)

---

## 7. Machine-Readable Telemetry Block

```text
DESKTOP_COLD_LCP_P75_MS=2144
DESKTOP_WARM_LCP_P75_MS=1112
MOBILE_LCP_P75_MS=2084
DESKTOP_CLS_MAX=0.001
MOBILE_CLS_MAX=0.000
INITIAL_FEED_RPC_COUNT=1
UNNECESSARY_DUPLICATE_RPCS=0
SEARCH_LATENCY_MS=2231
FUTURE_EXPOSURE_COUNT=0
PREMIUM_BODY_LEAKS=0
DRAFT_EXPOSURES=0
ACTIVE_TEST_SESSIONS=0
ACTIVE_OWNER_SESSIONS=15
FAIL_CLOSED_FAILURES=0
FAIL_CLOSED_EXIT_CODE=0
```
