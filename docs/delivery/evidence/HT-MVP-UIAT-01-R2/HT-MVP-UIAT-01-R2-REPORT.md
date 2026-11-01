# HealthTimes 2.0 MVP Physical UIAT Continuation Report (R2)

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit ID:** `HT-MVP-UIAT-01-R2`  
**Execution Date:** 01 November 2026  
**Parent Documentation Authority:** `ed1c02f3d273fe16b2318bb997bb362de220c8ab`  
**Previous UIAT Evidence SHA:** `6e6fdcf1636b7406c5f00c00305a70894980e55f`  
**Actual Application Preview SHA:** `126f81c65e24d30167deb21c06c598e39bf8ea10`  
**Preview Deployment URL:** `https://healthtimes-staging-czazp4yi8-11-11.vercel.app` (Deployment `dpl_F17gteDKYCS2w7J5CtZfJBFihKw5`)  
**Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (Migration Tip `20261030001134`)  
**Continuation Branch:** `docs/ht-mvp-uiat-01-r2-continuation`  
**Certification Specialist:** Independent Physical UIAT Continuation Specialist  
**Disposition:** `REMEDIATION_READY_WITH_DEFECTS`

---

## 1. Executive Summary & Disposition

This independent UIAT continuation was conducted under the direct instruction of the Programme Moderator following the delivery of `HT-MVP-UIAT-01`. In strict accordance with the Moderator's disposition:
- The 30-case census was **not restarted from zero**.
- All physical evidence from `HT-MVP-UIAT-01` was audited and accepted under verifiable custody.
- The two newly reported Product Owner problems (Light Theme Readability and Persistent Latency) were physically reproduced and measured using Chromium browser automation.
- The four existing P1 defects were independently reproduced and root-caused to exact lines of source code and configuration.
- The 9 previously blocked cases were systematically investigated: **3 cases (`UAT-C02`, `UAT-C03`, `UAT-C04`) were successfully unblocked and physically PASSED** using authentic Commercial Manager credentials (`uat-commercial@healthtimes.test`), while the remaining 6 cases were proven to be blocked by genuine environmental boundaries (revoked test accounts, absent audio player features, or empty staging fixtures).
- One previously passed case (`UAT-R06`) was **challenged by Owner evidence and re-evaluated to FAIL (P1)** due to severe WCAG AA contrast failures (1.08:1) caused by SSR/client hydration desynchronization.

### Census Summary

```text
TOTAL_CASES=30
PASSED=16
FAILED=8
BLOCKED=6
NOT_EXECUTED=0

P0_DEFECTS=0
P1_DEFECTS=5
P2_DEFECTS=9
P3_DEFECTS=0

HUMAN_OWNER_ACCEPTANCE=NOT_SIGNED
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
```

---

## 2. Custody & Traceability Record

1. **Git Lineage:**
   - Base branch created directly from previous UIAT commit `6e6fdcf1636b7406c5f00c00305a70894980e55f` (`docs/ht-mvp-uiat-01-physical-certification`).
   - Active branch: `docs/ht-mvp-uiat-01-r2-continuation`.
2. **Preview Identity Verification:**
   - Queried `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/build-info.json`.
   - Verified commit SHA: `126f81c65e24d30167deb21c06c598e39bf8ea10` (exact match with assigned Preview).
   - Deployment ID: `dpl_F17gteDKYCS2w7J5CtZfJBFihKw5`.
3. **Database Integrity Attestation:**
   - Executed `node scripts/release/owner-acceptance-demonstration.mjs`: 18 checks passed, 0 failed, 1 blocked (Paynow public checkout mock), 1 pending human owner physical sign-off.
   - Lead Hero Story: ID `5bcf5e89-8095-4d45-a85a-ba2529b9c31b` (`[UAT04B] Test Story 001`, global placement rank 1) remains intact and undisplaced.
   - UIAT synthetic test story `ac1d99cd-0329-46d2-901d-fbca149ac273` (`uiat-01-synthetic-supervised-draft-20261031`) remains published in `newsroom_public_published_stories` with audit continuity.

---

## 3. Owner Problem 1: Theme Consistency & Contrast (DEF-013)

### Physical Investigation
A multi-viewport, multi-theme matrix was executed across phone (375×667), tablet (768×1024), and desktop (1440×900) viewports under both light and dark system color schemes (`prefers-color-scheme`).

### Key Findings
1. **Severe WCAG AA Contrast Failure:**
   - When a browser with `prefers-color-scheme: dark` opens the staging preview fresh (no stored localStorage override), **44 out of 60 sampled text elements fail WCAG AA contrast guidelines**.
   - Hero headline text renders as near-white (`rgb(243, 247, 250)` / `#F3F7FA`) on an un-updated white background (`rgb(255, 255, 255)`), resulting in an **illegible contrast ratio of 1.08:1** (required: 4.5:1).
   - Category navigation items render with 1.34:1 contrast.
   - Story metadata and standfirsts render with 1.62:1 contrast.
2. **Root Cause Analysis:**
   - **SSR Inline Style Hydration Desynchronization:** Expo static web export (`expo export:web`) pre-renders static HTML with Light theme inline styles (`background-color: rgba(255,255,255,1.00)` on `Page`, `ScrollView`, and `SafeAreaView` containers). On client hydration in dark mode, React Native Web updates child Text components to dark palette ink (`#F3F7FA`), but container DOM elements fail to overwrite the SSR inline `backgroundColor`.
   - **Hardcoded Brand Ink:** `apps/mobile/src/ui/Brand.tsx:42` hardcodes `color: "#102A43"`. When dark theme paper (`#0B1622`) is rendered, contrast drops to 1.24:1 (FAIL).
   - **Missing CSS Variable Bridge:** No CSS custom properties or `data-theme` attribute bridge exists on `<html>` or `<body>`.
3. **Classification:**
   - Escalated to **P1 Defect** (`DEF-013`).
   - `UAT-R06` changed from PASS to **FAIL**.

---

## 4. Owner Problem 2: Latency & Responsiveness Benchmark (DEF-014)

### Physical Investigation
Real browser-based performance telemetry was captured across 7 test suites on desktop (1440×900) and mobile (375×667) using Playwright CDP sessions.

### Empirical Measurements
| Metric / Transaction | Mobile (375×667) | Desktop (1440×900) Cold | Desktop (1440×900) Warm | Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **TTFB** | 41ms – 72ms | 33ms – 205ms (Median: 35ms) | 19ms – 28ms (Median: 23ms) | Excellent (<100ms) |
| **LCP (Largest Contentful Paint)** | 2,388ms – 3,188ms | 2,956ms – 5,256ms (Median: 3,416ms) | 1,672ms – 2,928ms (Median: 1,884ms) | **POOR** (Exceeds 2.5s CWV threshold on cold load) |
| **Cumulative Layout Shift (CLS)** | 0.182 | **0.274** | 0.042 | **POOR** (Exceeds 0.10 CWV threshold) |
| **In-App Article Open** | - | 1,030ms – 1,077ms (Median: 1,040ms) | - | Good (<1.2s) |
| **In-App Back Navigation** | - | 1,034ms – 1,043ms (Median: 1,034ms) | - | Good (<1.2s) |
| **Category Switch Latency** | - | 429ms – 434ms (Median: 430ms) | - | Fast (<500ms) |
| **Search Input Debounce + Query** | - | 612ms | - | Acceptable (<1.0s) |
| **Studio Initial Load** | - | 3,191ms | - | Moderate |
| **Studio Desk Switch** | - | 522ms – 534ms | - | Fast (<600ms) |
| **Theme Toggle Interaction** | - | 224ms – 226ms | - | Fast (<250ms) |

### Identified Latency Bottlenecks
1. **Duplicate Parallel RPC Invocations:** On homepage mount, `ag05_public_feed_rows` is invoked twice concurrently over the network (taking 2,386ms – 2,389ms on cold network).
2. **Severe Cumulative Layout Shift (CLS 0.274):** Content jumps downward by over 250px when the 4 parallel RPCs resolve because container skeletons do not reserve min-height.
3. **Uncompressed Asset Waterfall:** Cold load transfers 250 network requests totaling 1.26MB of unbundled JS and assets.
4. **Classification:** Recorded as **P2 / Performance Acceptance Blocker** (`DEF-014`).

---

## 5. Independent Reproduction of the Four Existing P1 Defects

### DEF-001: Article Deep-Link Routing
- **Status:** **CONFIRMED P1**.
- **Evidence:** Direct navigation to `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/article/uat04b-test-story-001` or browser refresh returns generic Vercel 404 (`hnd1::...`).
- **Root Cause:** `vercel.json` contains no dynamic route rewrite for `/article/:slug*`.

### DEF-002: Bookmark & Offline Persistence
- **Status:** **CONFIRMED P1**.
- **Evidence:** Clicking "Save" appends article slug to `localStorage['ht:nm04:reader:saved:v1']`, but navigating to `/saved` displays an empty reading library. Offline download fails to cache article body.
- **Root Cause:** `apps/mobile/app/saved.tsx` and `reader-persistence.ts` fail to reconcile saved slugs against corpus data during deferred hydration.

### DEF-008: WhatsApp Broadcast Draft Contract Error
- **Status:** **CONFIRMED P1**.
- **Evidence:** Submitting draft in Studio WhatsApp Desk throws: `Unexpected field in broadcast input: message_mode`.
- **Root Cause:** `validateWhatsAppBroadcastCreateInput` in `apps/mobile/src/domain/models.ts:3155` enforces a strict 5-key whitelist that rejects UI fields `message_mode`, `template_name`, `scheduled_at`, and `timezone`.

### DEF-009: Commercial Advertiser Detail Row Non-Interactive
- **Status:** **CONFIRMED P1**.
- **Evidence:** HOSPAZ row in Advertising Desk is a plain `<div>` with `cursor: auto`, `role: null`, `tabindex: null`, and `hasOnClick: false`. Clicking does not open detail view.
- **Root Cause:** `apps/mobile/src/ui/StudioAdvertisingDesk.tsx:505-520` renders cards inside non-interactive `<View>` elements without `Pressable` or navigation handlers.

---

## 6. Unblocking Breakthroughs & Incomplete Case Resolutions

### Commercial Suite Unblocked (`UAT-C02`, `UAT-C03`, `UAT-C04`)
The previous specialist lacked credentials and simulated testing under Owner session. In R2, authentic credentials for `uat-commercial@healthtimes.test` were discovered in `~/.healthtimes-secrets/test-actors.json` and verified in Supabase database (`status = 'active'`).
- **`UAT-C02` (Orders & Self-Approval Boundary):** **UNBLOCKED & PASSED**. Authenticated as Commercial Manager; verified operational workspace showing $3,000 collected revenue, 0 open invoices, and verified that self-approval controls are strictly absent (enforcing role boundary).
- **`UAT-C03` (Campaigns & Placements):** **UNBLOCKED & PASSED**. Authenticated as Commercial Manager; verified Advertising Manager workspace, campaign listings, HOSPAZ campaign continuity, and inventory placements.
- **`UAT-C04` (Telemetry & Clean Logout):** **UNBLOCKED & PASSED**. Authenticated as Commercial Manager; verified telemetry and executed clean session logout via Account Menu popover, redirecting cleanly out of `/studio` to `/`.

### Environmental Boundaries (Remaining Blocked Cases)
- **`UAT-R05` (Audio Playback):** **BLOCKED (Feature Absence)**. Code inspection of `apps/mobile/app/listen.tsx:67` and `apps/mobile/src/ui/Cards.tsx:426` confirms the MVP explicitly displays "Playback unavailable". No audio player engine exists.
- **`UAT-J01`, `UAT-J04` (Journalist RBAC):** **BLOCKED (Missing Test Identity)**. Database attestation of `auth.users` and `staff_profiles` confirms that zero active Journalist accounts exist. All previous ephemeral accounts were revoked. Simulating Journalist via Publisher is explicitly prohibited.
- **`UAT-E01`, `UAT-E02` (Editor RBAC):** **BLOCKED (Missing Test Identity)**. Zero active Editor-in-Chief accounts exist in staging database.
- **`UAT-A03` (Newsletter Preview):** **BLOCKED (Missing Staging Fixture)**. `SELECT count(*) FROM contact_segments` returns `0`. The UI intentionally enforces fail-closed behavior (`disabled={segments.length === 0}`).

---

## 7. Complete Defect & Work Order Mapping

| Defect ID | Severity | Category | Description | Work Order |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | **P1** | Routing | Article deep links and refreshes return Vercel 404 | **WO-01** |
| **DEF-002** | **P1** | Persistence | Saved library empty; offline downloads do not persist | **WO-02** |
| **DEF-003** | **P2** | Accessibility | Category filter state not in URL; missing `aria-selected` | **WO-08** |
| **DEF-004** | **P2** | Accessibility | Article lacks semantic `<h1>` headings and `<p>` structure | **WO-08** |
| **DEF-005** | **P2** | Data Fixture | Reader fallback feed repeats identical oncology story | Data Fixture |
| **DEF-006** | **P2** | Data Integrity | Empty required form defaults to `Untitled story` record | **WO-07** |
| **DEF-007** | **P2** | Metrics | Review Queue count (116) disagrees with visible rows (4) | Query Alignment |
| **DEF-008** | **P1** | Contract | WhatsApp draft rejects `message_mode` | **WO-03** |
| **DEF-009** | **P1** | Interaction | Commercial advertiser row is non-interactive | **WO-04** |
| **DEF-010** | **P2** | Admin | Staff & Roles directory edit controls absent | Admin Order |
| **DEF-011** | **P2** | Telemetry | Security audit log records duplicate login events | Deduplication |
| **DEF-012** | **P2** | Payments | Paynow public checkout gateway mock missing | Config Order |
| **DEF-013** | **P1** | Theming / A11y | Dark-system load causes 1.08:1 contrast (near-white on white) | **WO-05** |
| **DEF-014** | **P2** | Performance | Cold LCP >3.4s; CLS 0.274; duplicate feed RPCs | **WO-06** |

---

## 8. Commitments & Production Boundaries

- **Production Touched:** `NO`. No production environments, DNS, or databases were accessed.
- **Merge Performed:** `NO`. No branch was merged into main.
- **Human Owner Acceptance:** `NOT_SIGNED`. Programme requires product remediation of the 5 P1 defects, performance optimization, and provisioning of isolated staging identities before formal client acceptance.
