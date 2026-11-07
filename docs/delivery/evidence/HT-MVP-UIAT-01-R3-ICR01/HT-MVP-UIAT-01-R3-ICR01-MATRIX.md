# HT-MVP-UIAT-01-R3-ICR01 — Complete 30-Case UAT Reconciliation Matrix

## 1. Full 30-Case Reconciliation Matrix

| Test ID | Original Status | Final Status | Persona / Viewport | Scope / Capability | Physical Observation / Measured Evidence | Target / Threshold | Evidence Artifact |
|:---:|:---:|:---:|:---|:---|:---|:---|:---|
| **UAT-R01** | PASS | **PASS** | Anonymous Reader<br>375×667, 768×1024, 1440×900 | Home feed, hero, latest and publication visibility | Home feed loaded across all target viewports; hero story `[UAT04B] Test Story 001` verified intact at global rank 1. | HTTP 200, hero title rendered | `screenshots/DEF014-performance-dashboard.jpg` |
| **UAT-R02** | FAIL | **FAIL / DEFERRED** | Anonymous Reader<br>375×667 (Mobile) | Category filter with clean route and active state | Clicking category filters updates displayed articles in-memory, but does not update URL query string or expose `aria-selected` (`DEF-003`, P2 defect). | URL updates with category query | `DEF-003` Defect Record |
| **UAT-R03** | FAIL | **PASS** | Anonymous Reader<br>375×667, 1440×900 | Article body/teaser and clean not-found | Slug URL `/article/uat04b-test-story-001`, browser refresh, and UUID direct link all return HTTP 200 with full headline (`DEF-001` resolved). | HTTP 200, headline preserved on reload | `screenshots/DEF001-slug-direct.jpg`, `DEF001-slug-refresh.jpg` |
| **UAT-R04** | FAIL | **PASS** | Anonymous Reader<br>375×667, 1440×900 | Bookmark and Saved persistence | Save and offline download write to distinct storage keys; full article body (5 paragraphs) readable while `context.setOffline(true)`; survives reload (`DEF-002` resolved). | Offline reading functional; distinct keys | `screenshots/DEF002-article-saved-offline.jpg`, `DEF002-offline-reading-success.jpg` |
| **UAT-R05** | BLOCKED | **BLOCKED / DEFERRED** | Anonymous Reader<br>375×667 (Mobile) | Audio playback, pause and seek | Feature absence in MVP: `/listen` screen explicitly displays "Playback unavailable". Deferred with Owner authority. | Audio playback controls | `apps/mobile/app/listen.tsx:67` |
| **UAT-R06** | FAIL | **PASS** | Anonymous Reader<br>375×667, 768×1024, 1440×900 | Dark theme, light theme, contrast & persistence | Contrast ratios across light, dark, mobile, tablet, article, and premium surfaces meet WCAG AA ($\ge 4.5:1$ ordinary text, `DEF-013` resolved). | Contrast ratio $\ge 4.5:1$ | `screenshots/DEF013-desktop-dark.jpg`, `DEF013-premium-dark.jpg` |
| **UAT-J01** | BLOCKED | **BLOCKED** | Journalist / Reporter<br>1440×900 (Desktop) | Journalist sign-in and desk restrictions | No active Journalist staging identity exists in Supabase `auth.users` or `staff_profiles` (`status = 'active'`). Blocked by test identity availability. | Legitimate role authentication | Supabase DB Attestation |
| **UAT-J02** | FAIL | **FAIL / DEFERRED** | Publisher/Owner substitute<br>1440×900 (Desktop) | Validated draft, counters and autosave | Submitting empty required form defaults to `"Untitled story"` on the server rather than enforcing client-side validation (`DEF-006`, P2 defect). | Client validation error on empty submit | `StudioStoryWorkspace.tsx:361` |
| **UAT-J03** | PASS | **PASS** | Publisher/Owner substitute<br>1440×900 (Desktop) | Valid image/attribution and MIME rejection | JPEG saved with attribution; non-image MIME types rejected. Prior accepted evidence verified. | Valid MIME accepted, invalid rejected | UIAT-01/02 Archive |
| **UAT-J04** | BLOCKED | **BLOCKED** | Journalist / Reporter<br>1440×900 (Desktop) | Journalist submission without publish authority | No active Journalist test identity exists to test workflow submission transitions without publish permissions. | Role-denied publish action | Supabase DB Attestation |
| **UAT-E01** | BLOCKED | **BLOCKED** | Editor-in-Chief<br>1440×900 (Desktop) | Editor queue and role restriction | No active Editor-in-Chief staging identity exists. Review Queue counter mismatch noted as `DEF-007` (P2). | Queue accessible under Editor session | Supabase DB Attestation |
| **UAT-E02** | BLOCKED | **BLOCKED** | Editor-in-Chief<br>1440×900 (Desktop) | Edit, note and immutable revision | Controlled edit and revision history work under Owner session, but genuine Editor RBAC isolation requires an active Editor account. | Immutable edit record under Editor | Supabase DB Attestation |
| **UAT-E03** | PASS | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Publish and Reader visibility | Full review lifecycle completed, media promoted, status became Published, and Reader displayed the story. | Story published & visible to reader | UIAT-01/02 Archive |
| **UAT-E04** | PASS | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Hero update and restricted curation | Global placement rank 1 curation verified on Staging Supabase DB. | Hero curation saved | UIAT-01/02 Archive |
| **UAT-A01** | FAIL | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | WhatsApp composition and preview | Composer displays `DEFERRED TO DISPATCH` notice; schedule date input is disabled; draft submission accepted (`DEF-008` resolved). | Notice displayed, input disabled | `screenshots/DEF008-whatsapp-composer.jpg` |
| **UAT-A02** | FAIL | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Staging queue without delivery | Broadcast draft persisted in `public.whatsapp_broadcasts` with `status = 'draft'` and `dispatch IS NULL` (`DEF-008` resolved). | DB row persisted with dispatch=null | `screenshots/DEF008-whatsapp-desk-created.jpg` |
| **UAT-A03** | BLOCKED | **BLOCKED** | Publisher/Owner<br>1440×900 (Desktop) | Responsive newsletter preview | Staging database table `contact_segments` contains 0 rows; UI fail-closed button is intentionally disabled. | Newsletter campaign preview | SQL count check (`contact_segments`) |
| **UAT-A04** | PASS | **PASS** | Publisher/Owner<br>1440×900 (Desktop) | Push draft, targeting and confirmation | Push draft saved with topic targeting and fail-closed dispatch enforced. Prior accepted evidence verified. | Draft saved with no auto-send | UIAT-01/02 Archive |
| **UAT-C01** | FAIL | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Advertiser directory and detail | Advertiser card is interactive; clicking `VIEW DETAILS` opens modal showing Associated Campaigns, Registration, and Metrics (`DEF-009` resolved). | Modal renders campaign metrics | `screenshots/DEF009-advertiser-details-modal.jpg` |
| **UAT-C02** | PASS | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Orders and self-approval boundary | Commercial Orders workspace operational ($3,000 revenue collected); self-approval controls strictly absent. | Workspace active; self-approval absent | UIAT-02 Archive |
| **UAT-C03** | PASS | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Campaign, placement, asset and zone | Advertising Manager workspace, campaign listings, HOSPAZ campaign continuity, and inventory placements verified. | Placements visible & interactive | UIAT-02 Archive |
| **UAT-C04** | PASS | **PASS** | Commercial Manager<br>1440×900 (Desktop) | Telemetry and test-persona logout | Commercial profile telemetry verified; session logout redirects cleanly out of `/studio` to `/`. | Clean logout redirect to `/` | UIAT-02 Archive |
| **UAT-F01** | PASS | **PASS** | Publisher/Owner; desktop | 13-account balanced Trial Balance | UI displayed balanced USD 31,300 debits/credits. Prior accepted evidence verified. | Debits == Credits | UIAT-01/02 Archive |
| **UAT-F02** | PASS | **PASS** | Publisher/Owner; desktop | Invoices, payments and classification | 12 invoices, two USD 1,500 bank-transfer payments, and synthetic customers displayed. Prior accepted evidence verified. | Ledger entries verified | UIAT-01/02 Archive |
| **UAT-F03** | PASS | **PASS** | Publisher/Owner; desktop | Expense state and unbalanced guard | 12 synthetic expenses and GL viewed; no new postings; accepted trigger evidence verified. | Unbalanced guard enforced | UIAT-01/02 Archive |
| **UAT-F04** | PASS | **PASS** | Publisher/Owner; desktop | Balance Sheet and P&L | Assets USD 10,500 = liabilities USD 0 + equity USD 10,500; P&L surplus USD 10,500 verified. | Assets == Liabilities + Equity | UIAT-01/02 Archive |
| **UAT-O01** | PASS | **PASS** | Publisher/Owner; desktop | Owner session and Publisher role | Executive desk, MFA enforcement, and 76 capabilities verified under Owner session. | 76 capabilities active | UIAT-01/02 Archive |
| **UAT-O02** | PASS | **PASS** | Publisher/Owner; desktop | Access all seven desks | My Work, Editorial, Audience, Commercial, Finance, Publisher, and Administration physically traversed. | All 7 desks navigable | UIAT-01/02 Archive |
| **UAT-O03** | PASS | **PASS** | Publisher/Owner; desktop | Staff directory and roles | Full-authority directory and 19-role catalogue visible (`DEF-010` P2 noted; non-blocking). | Directory visible | UIAT-01/02 Archive |
| **UAT-O04** | PASS | **PASS** | Publisher/Owner; desktop | Ordered immutable audit visibility | Reverse-chronological security events visible with no edit/delete controls (`DEF-011` P2 noted; non-blocking). | Audit events immutable | UIAT-01/02 Archive |

---

## 2. Search Latency Multi-Attempt Sample Battery (Section 3.A)

| Attempt | Query | Context Condition | Returned Story Title | Requests | Duration (ms) | Target SLA | SLA Status |
|:---:|:---:|:---:|:---|:---:|:---:|:---:|:---:|
| **Sample 1** | `"Cervical"` | Cold Context | `HEALTH NEWS` (WHO Donates US$350,000 Cervical Cancer...) | 24 | **2,937 ms** | $\le 2500$ ms | Cold Handshake Outlier |
| **Sample 2** | `"Lenacapavir"` | Warm Context | `HEALTH NEWS` (Who Should Not Take Lenacapavir...) | 24 | **1,588 ms** | $\le 2500$ ms | **PASS** |
| **Sample 3** | `"Cervical"` | Warm Context | `HEALTH NEWS` (Zimbabwe Records Decline in Cervical Cancer...) | 24 | **1,187 ms** | $\le 2500$ ms | **PASS** |
| **Sample 4** | `"Cancer"` | Warm Context | `HEALTH NEWS` (WHO Donates US$350,000 Cervical Cancer...) | 24 | **1,525 ms** | $\le 2500$ ms | **PASS** |
| **Sample 5** | `"Health"` | Warm Context | `My HealthTimes` (Public Category Discovery...) | 24 | **1,307 ms** | $\le 2500$ ms | **PASS** |

- **Minimum:** **1,187 ms**
- **Median:** **1,525 ms**
- **P75:** **1,588 ms** (Target $\le 2500$ ms) — **PASS**
- **Maximum:** **2,937 ms**

---

## 3. Surface Theme & Contrast Ratio Matrix (DEF-013)

| Surface | Mode | Path | Background | Brand Contrast | Heading Contrast | Body Contrast | WCAG AA Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| **Desktop** | Light | `/` | `rgb(255, 255, 255)` | **16.69:1** | **16.69:1** | **5.76:1** | **PASS** |
| **Desktop** | Dark | `/` | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | **PASS** |
| **Mobile** | Dark | `/` (390px) | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | **PASS** |
| **Tablet** | Dark | `/` (768px) | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | **PASS** |
| **Article** | Dark | `/article/uat04b-test-story-001` | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | **PASS** |
| **Premium** | Dark | `/premium` | `rgb(11, 22, 34)` | **16.92:1** | **10.59:1** | **8.91:1** | **PASS** |

---

## 4. Performance & Layout Stability Benchmark (DEF-014)

| Telemetry Metric | Measured P75 / Max | Contract Threshold | Evaluation |
|---|:---:|:---:|:---:|
| **Desktop Cold LCP (P75)** | **1,752 ms** | $\le 2,500$ ms | **PASS** |
| **Desktop Warm LCP (P75)** | **932 ms** | $\le 2,500$ ms | **PASS** |
| **Mobile LCP (P75)** | **1,668 ms** | $\le 2,500$ ms | **PASS** |
| **Desktop CLS (Max)** | **0.001** | $\le 0.100$ | **PASS** |
| **Mobile CLS (Max)** | **0.000** | $\le 0.100$ | **PASS** |
| **Initial Feed RPCs** | **1** | $== 1$ | **PASS** |
| **Unnecessary Duplicate RPCs** | **0** | $== 0$ | **PASS** |

---

## 5. Session Hygiene & Owner Safeguard Attestation

| Audit Dimension | Pre-Test Baseline | Post-Test Readback | Target / Invariant | Status |
|---|:---:|:---:|:---:|:---:|
| **Test Newsroom Sessions (`@healthtimes.test`)** | **0** | **0** | $== 0$ | **PASS** |
| **Test Refresh Tokens (`@healthtimes.test`)** | **0** | **0** | $== 0$ | **PASS** |
| **Owner Newsroom Sessions (`kudzimusar@gmail.com`)** | **15** | **15** | Preserved ($== 15$) | **PASS** |
| **Owner Refresh Tokens (`kudzimusar@gmail.com`)** | **2** | **2** | Preserved ($== 2$) | **PASS** |

---

## 6. Telemetry Summary Block

```text
DESKTOP_COLD_LCP_P75_MS=1752
DESKTOP_WARM_LCP_P75_MS=932
MOBILE_LCP_P75_MS=1668
DESKTOP_CLS_MAX=0.001
MOBILE_CLS_MAX=0.000
INITIAL_FEED_RPC_COUNT=1
UNNECESSARY_DUPLICATE_RPCS=0
SEARCH_LATENCY_MEDIAN_MS=1525
SEARCH_LATENCY_P75_MS=1588
SEARCH_LATENCY_MAX_MS=2937
FUTURE_EXPOSURE_COUNT=0
PREMIUM_BODY_LEAKS=0
DRAFT_EXPOSURES=0
ACTIVE_TEST_SESSIONS=0
ACTIVE_OWNER_SESSIONS=15
ORIGINAL_UAT_CASES=30
ORIGINAL_PASS=16
ORIGINAL_FAIL=8
ORIGINAL_BLOCKED=6
FINAL_PASS=22
FINAL_FAIL=2
FINAL_BLOCKED=6
FINAL_DEFERRED_WITH_OWNER_AUTHORITY=3
FAIL_CLOSED_FAILURES=0
FAIL_CLOSED_EXIT_CODE=0
```
