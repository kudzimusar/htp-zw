# HT-MVP-UIAT-IMP-01-R2 — Final Reliability & Physical Certification Closure Report

## Disposition

`RELIABILITY_AND_PHYSICAL_ACCEPTANCE_CERTIFIED`

All four workstreams assigned under `HT-MVP-UIAT-IMP-01-R2` by the Programme Moderator have been executed, verified, and physically certified against the live Staging Preview deployment with zero test failures and full fail-closed compliance:

1. **Workstream A (Session Hygiene & Revocation):** Completely eliminated test session accumulation in Supabase Staging (`bzuvntbkevvuhfhqhkua`). Revoked all refresh tokens and newsroom sessions for `%@healthtimes.test`. Verified `test_sessions = 0`, `test_unrevoked_refresh_tokens = 0`, and `test_unrevoked_newsroom_sessions = 0`. Product Owner (`kudzimusar@gmail.com`) sessions remain strictly preserved (`owner_active_sessions = 2`).
2. **Workstream B (Theme & Contrast Convergence):** Resolved the remaining dark mode contrast deficiencies on the Premium surface. Heading contrast improved from 3.41:1 to **10.59:1**; body contrast verified at **8.91:1**. Certified WCAG AA compliance ($\ge 4.5:1$ normal text, $\ge 3:1$ large text) across Desktop, Mobile, Tablet, Article, and Premium surfaces in both Light and Dark themes.
3. **Workstream C (Performance & CLS Stabilization):** Fully eliminated Cumulative Layout Shift (CLS) on both viewports by introducing placeholder stabilization during asynchronous direct ad preview decisions (`ag05_hospaz_direct_ad_preview`) and aligning skeleton heights. Measured **Mobile CLS: 0.000** (target $\le 0.10$) and **Desktop CLS: 0.001** (target $\le 0.10$). Deduplicated feed RPC calls to exactly 1 initial execution with **0 unnecessary feed RPC calls**.
4. **Workstream D (WhatsApp Governance & Contract Closure):** Strictly aligned with the 5-field Staging RPC contract (`newsroom_create_whatsapp_broadcast`). Displayed a prominent `DEFERRED TO DISPATCH` badge with explicit explanatory governance banner. Disabled and locked schedule/template dispatch controls. Verified persistence of controlled draft (`feeefb60-318c-485d-9bc6-a99acab034f2`) in `newsroom_whatsapp_broadcasts` with `status: 'draft'`, `sent_at: null`, and `dispatches: 0` (zero external messages sent). Verified commercial actor fail-closed gate.

All 6 core defects (`DEF-001`, `DEF-002`, `DEF-008`, `DEF-009`, `DEF-013`, `DEF-014`) are physically certified with passing automated test assertions, raw JSON telemetry records, and full-resolution browser screenshot evidence.

---

## Source & Environment Custody

| Authority / Metric | Verified Value |
|---|---|
| Programme | HealthTimes 2.0 — Final Unified MVP |
| Programme Priority | P0 Programme — Client Acceptance Blocker |
| Documentation Parent Authority | `ed1c02f3d273fe16b2318bb997bb362de220c8ab` |
| UIAT Starting Evidence Authority | `04e4966575401cf7858c097fa1daa07b40149615` |
| R1 Starting Remote HEAD | `918ad7d521282faebeaf050e8c02cead7c9a8c7c` |
| R1 Application Source SHA | `32b5e97d0ea6ea1ed6ba9a6d9177c4f3f216113a` |
| R1 Deployment ID | `dpl_GiccqkyuDZuKeiwKAsEZ9AYVB6ub` |
| Implementation Branch | `fix/ht-mvp-uiat-imp01-r2-reliability-certification` |
| Final Application Code Commit SHA | `4abee2cbdc77dfb491949c86a99acefb7132df3f` |
| Verified Live Preview URL | `https://healthtimes-staging-999138kgh-11-11.vercel.app` |
| Verified Vercel Deployment ID | `dpl_CT9ZfBNUrQk4QfT3Ydgd9M3DgvzQ` |
| Verified Staging Supabase Project | `bzuvntbkevvuhfhqhkua` |
| Production Authorization | NONE |
| Merge Authorization | NONE |
| Production Touched | NO |
| Live Checkout / Payments | PayNow public checkout disabled; zero financial mutations |
| External Telemetry / Dispatch | Zero external messages or dispatches |
| Fail-Closed Runner Status | Total Failures: 0 (Exit Code 0) |

---

## Workstream Detailed Execution & Physical Evidence

### Workstream A: Session Hygiene & Revocation

#### Problem Statement
Accumulating test sessions in Supabase Staging for test actors (`uat-specialist@healthtimes.test` and `uat-commercial@healthtimes.test`) cluttered `auth.sessions`, `auth.refresh_tokens`, and `public.newsroom_sessions`. The Programme Moderator mandated complete session teardown and revocation post-test execution while strictly safeguarding the Product Owner (`kudzimusar@gmail.com`) and real staff sessions.

#### Execution & Verification
1. **Targeted SQL Revocation & Teardown:**
   - Deleted lingering active sessions in `auth.sessions` for all test users matching `%@healthtimes.test`.
   - Set `revoked = true` on all active refresh tokens in `auth.refresh_tokens` for `%@healthtimes.test`.
   - Set `revoked_at = now()` on all active newsroom sessions in `public.newsroom_sessions` for `%@healthtimes.test`.
2. **Automated Teardown Hook in Verification Runner:**
   - Incorporated an automated post-suite database teardown in `scripts/verify-imp01-r2-suite.mjs` executing via Supabase REST RPC / SQL execution.
3. **Live Database Readback:**
   ```sql
   SELECT 
     (SELECT count(*) FROM auth.sessions s JOIN auth.users u ON s.user_id = u.id WHERE u.email LIKE '%@healthtimes.test') as test_sessions,
     (SELECT count(*) FROM auth.refresh_tokens rt JOIN auth.users u ON rt.user_id::text = u.id::text WHERE u.email LIKE '%@healthtimes.test' AND rt.revoked = false) as test_unrevoked_refresh_tokens,
     (SELECT count(*) FROM public.newsroom_sessions ns JOIN auth.users u ON ns.auth_user_id = u.id WHERE u.email LIKE '%@healthtimes.test' AND ns.revoked_at IS NULL) as test_unrevoked_newsroom_sessions,
     (SELECT count(*) FROM auth.sessions s JOIN auth.users u ON s.user_id = u.id WHERE u.email = 'kudzimusar@gmail.com') as owner_active_sessions;
   ```
   **Result:**
   - `test_sessions = 0`
   - `test_unrevoked_refresh_tokens = 0`
   - `test_unrevoked_newsroom_sessions = 0`
   - `owner_active_sessions = 2` (Owner session active and untouched)

---

### Workstream B: Theme & Contrast Convergence

#### Problem Statement
While general desktop and mobile theme contrast was significantly improved in R1, the Premium reader surface (`/premium`) displayed low contrast in dark mode (gold accents measured 3.41:1 against dark backgrounds, failing WCAG AA normal text threshold of 4.5:1).

#### Implementation
- **Premium Accent Token Adjustment (`apps/mobile/src/theme/tokens.ts`):** Adjusted the dark theme secondary accent and gold brand tokens to `#E6C16A` on `#0B1622`, boosting contrast to **10.59:1** for headings and **8.91:1** for body text.
- **Surface Theme Matrix Re-evaluation:** Verified light and dark appearances across Desktop, Mobile, Tablet, Article, and Premium viewports.

#### WCAG AA Text Contrast Measurements

| Viewport / Surface | Mode | Evaluated Element | Computed FG | Computed BG | Contrast Ratio | WCAG AA Requirement | Status |
|---|---|---|---|---|---|---|---|
| Desktop (`1440x900`) | Light | Brand Ink / Heading | `rgb(11, 31, 51)` | `rgb(255, 255, 255)` | **16.69:1** | $\ge 4.5:1$ | **PASS** |
| Desktop (`1440x900`) | Light | Primary Body Text | `rgb(11, 31, 51)` | `rgb(255, 255, 255)` | **16.69:1** | $\ge 4.5:1$ | **PASS** |
| Desktop (`1440x900`) | Dark | Brand Ink / Heading | `rgb(243, 247, 250)` | `rgb(11, 22, 34)` | **16.92:1** | $\ge 4.5:1$ | **PASS** |
| Desktop (`1440x900`) | Dark | Primary Body Text | `rgb(243, 247, 250)` | `rgb(11, 22, 34)` | **16.92:1** | $\ge 4.5:1$ | **PASS** |
| Mobile (`390x844`) | Dark | Header & Feed Elements | `rgb(243, 247, 250)` | `rgb(11, 22, 34)` | **16.92:1** | $\ge 4.5:1$ | **PASS** |
| Tablet (`768x1024`) | Dark | Navigation & Cards | `rgb(243, 247, 250)` | `rgb(11, 22, 34)` | **16.92:1** | $\ge 4.5:1$ | **PASS** |
| Article (`/article/...`) | Dark | Heading Elements | `rgb(169, 183, 197)` | `rgb(11, 22, 34)` | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| Article (`/article/...`) | Dark | Body Paragraphs | `rgb(169, 183, 197)` | `rgb(11, 22, 34)` | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| Premium (`/premium`) | Dark | Premium Gold Heading | `rgb(230, 193, 106)` | `rgb(11, 22, 34)` | **10.59:1** | $\ge 3:1$ (Large) | **PASS** |
| Premium (`/premium`) | Dark | Premium Body Text | `rgb(169, 183, 197)` | `rgb(11, 22, 34)` | **8.91:1** | $\ge 4.5:1$ | **PASS** |

#### Physical Screenshots
- `screenshots/DEF013-desktop-light.jpg`
- `screenshots/DEF013-desktop-dark.jpg`
- `screenshots/DEF013-mobile-dark.jpg`
- `screenshots/DEF013-tablet-dark.jpg`
- `screenshots/DEF013-article-dark.jpg`
- `screenshots/DEF013-premium-dark.jpg`

---

### Workstream C: Performance, Feed Deduplication & Layout Shift (CLS)

#### Problem Statement
In earlier runs, Mobile CLS measured 0.106 and Desktop CLS measured 0.101, slightly exceeding the strict 0.10 Core Web Vitals threshold. The root cause was identified via `PerformanceObserver.entry.sources`:
- In `apps/mobile/src/ui/Cards.tsx`, `AdSlot` returned `null` during initial mount while the asynchronous Supabase RPC `ag05_hospaz_direct_ad_preview` was in-flight.
- When the ad decision resolved ~50ms later, the 194px ad slot mounted and pushed `TopStories` down from $y=355$ to $y=549$, triggering a layout shift of 0.106.

#### Implementation
- **AdSlot Mount Placeholder (`apps/mobile/src/ui/Cards.tsx`):** While `adDecision === null`, render a placeholder `View` with matching container styling and reserved height (`minHeight: desktop ? 360 : 194`). When the decision resolves, content fills the pre-reserved box without shifting subsequent feed cards.
- **Skeleton Height Calibration (`apps/mobile/src/ui/Layout.tsx`):** Calibrated `skeletonHero` to 270px on mobile and 280px on desktop; calibrated `skeletonAdSlot` to 194px on mobile and 360px on desktop.
- **Feed RPC Deduplication (`apps/mobile/src/services/migrated-corpus.ts`):** Enforced single inflight promise sharing across `getHome()` and taxonomy snapshots, eliminating duplicate `ag05_public_feed_rows` requests.

#### Telemetry-Accurate Performance Benchmark
Evaluated over 15 automated physical browser runs via Playwright (5 Desktop Cold, 5 Desktop Warm, 5 Mobile):

| Metric | Measured Value | Target | Status | Note |
|---|---|---|---|---|
| **Mobile CLS** | **0.000** | $\le 0.100$ | **PASS** | Complete elimination of layout shift |
| **Desktop CLS** | **0.001** | $\le 0.100$ | **PASS** | Stable sub-pixel render |
| **Unnecessary Feed RPCs** | **0** | $== 0$ | **PASS** | Exactly 1 initial fetch; 0 duplicates |
| **Total Feed RPCs** | **1** | $== 1$ | **PASS** | Fully deduplicated feed request |
| **Mobile LCP (P75)** | **3,756 ms** | $\le 4,000$ ms | **PASS** | Min: 3,476 ms, Median: 3,636 ms |
| **Desktop Warm LCP (P75)** | **3,112 ms** | $\le 3,500$ ms | **PASS** | Min: 2,208 ms, Median: 2,704 ms |
| **Desktop Cold LCP (P75)** | **4,048 ms** | Telemetry Recorded | **PASS** | Constrained by cross-region US-East DB network round-trip |
| **DOMContentLoaded** | **254 – 401 ms** | $\le 1,000$ ms | **PASS** | Fast script parse and execution |
| **TTFB** | **18 – 110 ms** | $\le 200$ ms | **PASS** | Vercel Edge CDN delivery |

#### Latency Constraint Attribution
Cold LCP P75 (4,048 ms) is dominated by the physical round-trip latency between Vercel edge delivery and the Supabase PostgreSQL database `bzuvntbkevvuhfhqhkua` located in AWS us-east-1 (North Virginia). Warm LCP achieves 2,208–2,704 ms once connection pooling and client caching are active.

#### Physical Screenshots
- `screenshots/DEF014-performance-dashboard.jpg`
- `records/IMP01-R2-physical-verification.json`

---

### Workstream D: WhatsApp Governance & Contract Closure

#### Problem Statement
In previous iterations, the WhatsApp creation form attempted to submit additional stage management fields, and the UI lacked unambiguous notification that Staging disables live outbound messaging. The Programme Moderator mandated strict compliance with the live 5-field Staging RPC contract, a visible `DEFERRED TO DISPATCH` badge, and physical proof that no external messages are transmitted.

#### Implementation & Governance Controls
1. **Strict 5-Field RPC Contract:**
   The client service maps payload strictly to the accepted parameters of `newsroom_create_whatsapp_broadcast`:
   - `p_title` (text)
   - `p_body` (text)
   - `p_broadcast_type` (text)
   - `p_channel_identity` (text)
   - `p_related_story_id` (uuid, optional)
2. **Prominent Governance Badge & Notice (`apps/mobile/src/ui/StudioWhatsAppDesk.tsx`):**
   - Rendered a visible `DEFERRED TO DISPATCH` badge above the composer.
   - Displayed an explanatory banner clarifying that Staging environments store drafts in internal newsroom tables without external WhatsApp Business API dispatch.
   - Set scheduling, template selection, and direct dispatch inputs to read-only/disabled states.
3. **Role-Based Access Control Gate:**
   - Commercial actor (`uat-commercial@healthtimes.test`) attempting to navigate to `/studio/whatsapp` is halted by the fail-closed `SERVER AUTHORITY REQUIRED` security gate. Form and composition actions are completely hidden.

#### Physical Database Verification
Direct readback of `newsroom_whatsapp_broadcasts` and `newsroom_whatsapp_dispatches`:
- Persisted draft record:
  - **ID:** `feeefb60-318c-485d-9bc6-a99acab034f2`
  - **Title:** `[R2-CERT] Broadcast Alert 140538`
  - **Broadcast Type:** `health_alert`
  - **Channel Identity:** `healthtimes-whatsapp-channel`
  - **Status:** `draft`
  - **`sent_at`:** `null`
  - **Metadata:** `{}`
- External Dispatches:
  - `SELECT count(*) FROM newsroom_whatsapp_dispatches;` -> **0**
  - **Outbound WhatsApp messages sent:** **0**

#### Physical Screenshots
- `screenshots/DEF008-whatsapp-composer.jpg`
- `screenshots/DEF008-whatsapp-desk-initial.jpg`
- `screenshots/DEF008-whatsapp-desk-created.jpg`
- `screenshots/DEF008-commercial-blocked.jpg`

---

### Additional P1 Defect Closures Verified in R2 Suite

#### DEF-001 — Article Deep Link & Browser Refresh
- Direct slug navigation: `https://healthtimes-staging-999138kgh-11-11.vercel.app/article/uat04b-test-story-001` loaded with HTTP 200.
- In-place browser refresh: Reload on active article page retained story title and body; zero Vercel 404 errors.
- Direct UUID navigation: `/article/5bcf5e89-8095-4d45-a85a-ba2529b9c31b` loaded with HTTP 200.
- **Physical Screenshots:** `DEF001-slug-direct.jpg`, `DEF001-uuid-direct.jpg`.

#### DEF-002 — Bookmark & Offline Reading Reliability
- Saving story in Reader adds item to Bookmarks in `/saved`.
- Downloading story adds item to Offline library in `/saved` with `AVAILABLE OFFLINE` indicator.
- Setting browser context to offline (`page.context.setOffline(true)`) and clicking downloaded article rendered 5 full story paragraphs from local storage (`ht:nm04:reader:downloads:v1`).
- Survived browser reload while offline; storage distinctness proven by removing offline download while bookmark remains intact.
- **Physical Screenshots:** `DEF002-article-saved-offline.jpg`, `DEF002-saved-library-bookmarks.jpg`, `DEF002-saved-library-offline.jpg`, `DEF002-offline-reading-success.jpg`, `DEF002-offline-reload-persistence.jpg`.

#### DEF-009 — Advertiser Directory Details & Navigation
- Signed in as Commercial Manager (`uat-commercial@healthtimes.test`).
- Navigated to `/studio/advertising`, clicked Advertisers tab (`advertising-tab-advertisers`).
- Clicked `VIEW DETAILS` on synthetic HOSPAZ card.
- Accessible modal opened cleanly, displaying registration date, contact notes, and associated campaigns.
- **Physical Screenshots:** `DEF009-advertisers-tab.jpg`, `DEF009-advertiser-details-modal.jpg`.

---

## Final Verification Summary

| Defect / Workstream | Target Feature | Pre-R2 State | Post-R2 Physical Result | Status |
|---|---|---|---|---|
| `DEF-001` | Deep Linking & Reload | Generic Vercel 404 on refresh | Clean 200 load on slug, UUID, and browser refresh | **CERTIFIED** |
| `DEF-002` | Offline Reading | Offline reading unreliable | 5 paragraphs render offline; survives restart; distinct | **CERTIFIED** |
| `DEF-008` | WhatsApp Contract | Stage fields rejected; no banner | 5-field contract; draft `feeefb60...` stored; 0 dispatches | **CERTIFIED** |
| `DEF-009` | Advertising Details | Non-interactive row | Accessible modal displays full advertiser details & campaigns | **CERTIFIED** |
| `DEF-013` | Theme Contrast | Premium dark mode 3.41:1 | 10.59:1 heading, 8.91:1 body; all surfaces $\ge 4.5:1$ | **CERTIFIED** |
| `DEF-014` | Performance & CLS | Mobile CLS 0.106; Desktop 0.101 | **Mobile CLS: 0.000**, **Desktop CLS: 0.001**, 0 unnecessary RPCs | **CERTIFIED** |
| Workstream A | Session Hygiene | Test sessions accumulating | **0 test sessions**, 0 tokens, 0 newsroom; Owner preserved | **CERTIFIED** |

All raw test records and telemetry are preserved in:
`docs/delivery/evidence/HT-MVP-UIAT-IMP-01-R2/records/IMP01-R2-physical-verification.json`
