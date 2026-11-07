# HT-MVP-UIAT-01-R3-ICR02-LR01 — Authoritative 30-Case Client Acceptance Matrix

## 1. Authoritative 30-Case UAT Status Census

| Case ID | Persona | Viewport | Scope / Capability | Original Status | Implemented Correction | Final Deployed Runtime Status | Final Branch Source Status | Authenticated Persona | Tested SHA | Evidence Artifact Link | Blocker / Owner Decision |
|:---:|:---|:---:|:---|:---:|:---|:---:|:---:|:---|:---:|:---|:---|
| **UAT-R01** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Home feed, hero, latest and publication visibility | PASS | None required (Preserved) | **PASS** | **PASS** | Anonymous | `2a11409` | `screenshots/DEF014-performance-dashboard.jpg` | Verified rank 1 hero intact |
| **UAT-R02** | Anonymous Reader | 375×667 (Mobile) | Category filter with clean route and active state | FAIL (`DEF-003`) | Added URL param sync, popstate listener, tablist ARIA semantics | **FAIL** | **PASS (REMEDIATED)** | Anonymous | `fix/ht-mvp` | [`apps/mobile/app/(reader)/index.tsx:43-156`](file:///Users/shadreckmusarurwa/Project%20AI/htp-zw/apps/mobile/app/(reader)/index.tsx#L43-L156) | Resolved on branch; verified by unit tests |
| **UAT-R03** | Anonymous Reader | 375×667<br>1440×900 | Article body/teaser and clean not-found | FAIL (`DEF-001`) | Article direct routing & reload fix (`DEF-001` resolved) | **PASS** | **PASS** | Anonymous | `2a11409` | `screenshots/DEF001-article-deep-link.jpg` | HTTP 200, headline preserved on reload |
| **UAT-R04** | Anonymous Reader | 375×667<br>1440×900 | Bookmark and Saved persistence | FAIL (`DEF-002`) | Saved articles & offline download fix (`DEF-002` resolved) | **PASS** | **PASS** | Anonymous | `2a11409` | `screenshots/DEF002-saved-offline-read.jpg` | Offline reading functional; distinct keys |
| **UAT-R05** | Anonymous Reader | 375×667 (Mobile) | Audio playback, pause and seek | BLOCKED | None (Out of Scope for MVP) | **BLOCKED** | **BLOCKED** | Anonymous | `2a11409` | [`apps/mobile/app/listen.tsx:67`](file:///Users/shadreckmusarurwa/Project%20AI/htp-zw/apps/mobile/app/listen.tsx#L67) | Feature absence in MVP scope; Owner deferred |
| **UAT-R06** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Dark theme, light theme, contrast & persistence | FAIL (`DEF-013`) | Tokens & theme contrast update (`DEF-013` resolved) | **PASS** | **PASS** | Anonymous | `2a11409` | `screenshots/DEF013-theme-dark.jpg` | Contrast ratio $\ge 4.5:1$ across all 6 surfaces |
| **UAT-J01** | Journalist / Reporter | 1440×900 (Desktop) | Journalist sign-in and desk restrictions | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `2a11409` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-J02** | Publisher/Reporter | 1440×900 (Desktop) | Validated draft, counters and autosave | FAIL (`DEF-006`) | Removed default title fallback; added alert error banner & service check | **FAIL** | **PASS (REMEDIATED)** | Publisher substitute | `fix/ht-mvp` | [`apps/mobile/src/ui/StudioStoryWorkspace.tsx:361`](file:///Users/shadreckmusarurwa/Project%20AI/htp-zw/apps/mobile/src/ui/StudioStoryWorkspace.tsx#L361) | Resolved on branch; verified by unit tests |
| **UAT-J03** | Journalist / Reporter | 1440×900 (Desktop) | Valid image attribution and invalid MIME rejection | PASS | None required (Preserved) | **PASS** | **PASS** | Publisher substitute | `2a11409` | UIAT-01/02 Archive | JPEG saved with attribution; MIME rejected |
| **UAT-J04** | Journalist / Reporter | 1440×900 (Desktop) | Submit for review without publish permission | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `2a11409` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-E01** | Editor-in-Chief | 1440×900 (Desktop) | Review queue and role-restricted actions | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `2a11409` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-E02** | Editor-in-Chief | 1440×900 (Desktop) | Edit, add review note and request revision | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `2a11409` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-E03** | Editor-in-Chief | 1440×900 (Desktop) | Approve, publish and verify live appearance | PASS | None required (Preserved) | **PASS** | **PASS** | Publisher substitute | `2a11409` | UIAT-01/02 Archive | Lifecycle & reader visibility verified |
| **UAT-E04** | Editor-in-Chief | 1440×900 (Desktop) | Hero story curation and placement order | PASS | None required (Preserved) | **PASS** | **PASS** | Publisher substitute | `2a11409` | UIAT-01/02 Archive | Placement rank 1 curation verified on DB |
| **UAT-A01** | Publisher / Audience | 1440×900 (Desktop) | WhatsApp composition, contract and preview | FAIL (`DEF-008`) | Disabled date input; added deferred dispatch notice (`DEF-008` resolved) | **PASS** | **PASS** | `uat-specialist` | `2a11409` | `screenshots/DEF008-whatsapp-composer.jpg` | Deferred notice & schedule lock enforced |
| **UAT-A02** | Publisher / Audience | 1440×900 (Desktop) | WhatsApp staging queue persistence | FAIL (`DEF-008`) | Database draft persistence verified with zero dispatches (`DEF-008` resolved) | **PASS** | **PASS** | `uat-specialist` | `2a11409` | `screenshots/DEF008-whatsapp-desk-created.jpg` | DB draft created; `sent_at = null`; 0 dispatches |
| **UAT-A03** | Audience Specialist | 1440×900 (Desktop) | Responsive newsletter campaign preview | BLOCKED | None | **BLOCKED** | **BLOCKED** | `uat-specialist` | `2a11409` | SQL `public.contact_segments` | Empty staging audience segment corpus (`count=0`) |
| **UAT-A04** | Audience Specialist | 1440×900 (Desktop) | Push notification draft and fail-closed dispatch | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-specialist` | `2a11409` | UIAT-01/02 Archive | Draft saved; zero external dispatches |
| **UAT-C01** | Commercial Manager | 1440×900 (Desktop) | Advertiser directory and detail modal | FAIL (`DEF-009`) | Interactive card row & modal navigation (`DEF-009` resolved) | **PASS** | **PASS** | `uat-commercial` | `2a11409` | `screenshots/DEF009-advertiser-details.jpg` | Advertiser details modal operational |
| **UAT-C02** | Commercial Manager | 1440×900 (Desktop) | Commercial orders & self-approval boundary | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-commercial` | `2a11409` | UIAT-02 Archive | Orders workspace active; self-approval absent |
| **UAT-C03** | Commercial Manager | 1440×900 (Desktop) | Campaign, placement, asset and zone continuity | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-commercial` | `2a11409` | UIAT-02 Archive | Ad manager workspace & campaigns verified |
| **UAT-C04** | Commercial Manager | 1440×900 (Desktop) | Commercial telemetry and session logout | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-commercial` | `2a11409` | UIAT-02 Archive | Telemetry verified; clean logout redirect |
| **UAT-F01** | Finance Manager | 1440×900 (Desktop) | Balanced Trial Balance | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `2a11409` | UIAT-01/02 Archive | Balanced USD 31,300 debits/credits verified |
| **UAT-F02** | Finance Manager | 1440×900 (Desktop) | Invoices, payments and classifications | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `2a11409` | UIAT-01/02 Archive | 12 invoices, two USD 1,500 bank transfers |
| **UAT-F03** | Finance Manager | 1440×900 (Desktop) | Expense state and unbalanced guard | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `2a11409` | UIAT-01/02 Archive | 12 synthetic expenses; GL balanced |
| **UAT-F04** | Finance Manager | 1440×900 (Desktop) | Balance Sheet & P&L parity | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `2a11409` | UIAT-01/02 Archive | Assets $10,500 = Equity $10,500; P&L surplus |
| **UAT-O01** | Publisher / Owner | 1440×900 (Desktop) | Owner session and Publisher role | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `2a11409` | UIAT-01/02 Archive | Executive desk & 76 capabilities verified |
| **UAT-O02** | Publisher / Owner | 1440×900 (Desktop) | Access all seven desks | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `2a11409` | UIAT-01/02 Archive | All 7 desks physically traversed |
| **UAT-O03** | Publisher / Owner | 1440×900 (Desktop) | Staff directory and roles | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `2a11409` | UIAT-01/02 Archive | Full directory & 19-role catalogue visible |
| **UAT-O04** | Publisher / Owner | 1440×900 (Desktop) | Ordered immutable audit visibility | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `2a11409` | UIAT-01/02 Archive | Immutable security audit events log verified |

---

## 2. Search Latency Multi-Attempt Sample Battery

Measured from `searchInput.press('Enter')` until unique result card (`[role="link"]`) matching query term is visible in the DOM:

| Attempt | Query | Context Condition | Returned Story Headline | Duration (ms) | Target SLA | SLA Status |
|:---:|:---:|:---:|:---|:---:|:---:|:---:|
| **Sample 1** | `"Cervical"` | Cold Context | *WHO Donates US$350,000 Cervical Cancer, Cholera Equipment to Zimbabwe* | **2,336 ms** | $\le 2500$ ms | **PASS** |
| **Sample 2** | `"Lenacapavir"` | Warm Context | *Zimbabwe Puts Communities at the Heart of HIV Prevention As It Prepares For Injectable PrEP (CAB-LA) and Lenacapavir Roll-out* | **1,273 ms** | $\le 2500$ ms | **PASS** |
| **Sample 3** | `"Cervical"` | Warm Context | *WHO Donates US$350,000 Cervical Cancer, Cholera Equipment to Zimbabwe* | **1,179 ms** | $\le 2500$ ms | **PASS** |
| **Sample 4** | `"Cancer"` | Warm Context | *WHO Donates US$350,000 Cervical Cancer, Cholera Equipment to Zimbabwe* | **862 ms** | $\le 2500$ ms | **PASS** |
| **Sample 5** | `"Health"` | Warm Context | *Zimbabwe Moves Towards Dedicated Menstrual Health Policy* | **1,076 ms** | $\le 2500$ ms | **PASS** |

### Statistical Distribution Across All 5 Attempts
- **Minimum Duration:** **862 ms**
- **Median Duration:** **1,179 ms**
- **P75 Duration:** **1,273 ms** (Target $\le 2,500$ ms) — **PASS**
- **Maximum Duration (Cold Outlier):** **2,336 ms** (Target $\le 2,500$ ms) — **PASS**
- **Cold Outlier Breached SLA:** **NO** (2,336 ms $\le$ 2,500 ms)

---

## 3. Surface Theme & Contrast Ratio Matrix (DEF-013)

| Surface | Mode | Path | Background | Brand Contrast | Heading Contrast | Body Contrast | Target Ratio | WCAG AA Status |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **Desktop** | Light | `/` | `rgb(255, 255, 255)` | **16.69:1** | **16.69:1** | **5.76:1** | $\ge 4.5:1$ | **PASS** |
| **Desktop** | Dark | `/` | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| **Mobile** | Dark | `/` (375px) | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| **Tablet** | Dark | `/` (768px) | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| **Article** | Dark | `/article/uat04b-test-story-001` | `rgb(11, 22, 34)` | **16.92:1** | **16.92:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| **Premium** | Dark | `/premium` | `rgb(11, 22, 34)` | **16.92:1** | **10.59:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |

---

## 4. Performance & Layout Stability Benchmark (DEF-014)

| Telemetry Metric | Measured P75 / Value | Contract Target | Evaluation |
|---|:---:|:---:|:---:|
| **Desktop Warm LCP (P75)** | **1,344 ms** | $\le 1,800$ ms | **PASS** |
| **Desktop Cold LCP (P75)** | **1,644 ms** | $\le 2,000$ ms | **PASS** |
| **Mobile Cold LCP (P75)** | **1,772 ms** | $\le 2,200$ ms | **PASS** |
| **Desktop Warm CLS (P75)** | **0.001** | $\le 0.050$ | **PASS** |
| **Mobile Cold CLS (P75)** | **0.000** | $\le 0.050$ | **PASS** |
| **Initial Feed RPCs** | **1** | $== 1$ | **PASS** |
| **Unnecessary Duplicate RPCs** | **0** | $== 0$ | **PASS** |

---

## 5. Machine-Readable Summary Census Block

```text
CANONICAL_UAT_CASES=30
DEPLOYED_RUNTIME_PREVIEW_SHA=2a11409e4edbfbc1c90081ee9c07101d2b0da49e
DEPLOYED_STATUS: 22 PASS | 2 FAIL (DEF-003, DEF-006) | 6 BLOCKED
BRANCH_SOURCE_CANDIDATE: fix/ht-mvp-uiat01-icr02-final-uat-completion
BRANCH_STATUS: 24 PASS (22 Preserved + 2 Remediated) | 0 FAIL | 6 BLOCKED
DESKTOP_WARM_LCP_P75_MS=1344
DESKTOP_COLD_LCP_P75_MS=1644
MOBILE_COLD_LCP_P75_MS=1772
DESKTOP_CLS_P75=0.001
MOBILE_CLS_P75=0.000
INITIAL_FEED_RPC_COUNT=1
UNNECESSARY_DUPLICATE_RPCS=0
SEARCH_LATENCY_MIN_MS=862
SEARCH_LATENCY_MEDIAN_MS=1179
SEARCH_LATENCY_P75_MS=1273
SEARCH_LATENCY_MAX_MS=2336
SEARCH_COLD_OUTLIER_BREACHED=NO
NEGATIVE_SEARCH_ARTICLE_CARDS_COUNT=0
PREMIUM_BODY_LEAKS=0
DRAFT_EXPOSURES=0
FUTURE_EXPOSURES=0
WHATSAPP_DISPATCHES=0
ACTIVE_OWNER_SESSIONS=15
ACTIVE_TEST_SESSIONS=0
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
PAYNOW_CHANGED=NO
REAL_PAYMENTS=0
EXTERNAL_MESSAGES=0
```
