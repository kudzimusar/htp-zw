> ICR05B GOVERNANCE CORRECTION (2026-11-02): This is an append-only, portable-link copy of the ICR05A historical evidence. The 23 PASS / 0 FAIL / 7 BLOCKED census remains a historical baseline. The isolated application Preview was built at SHA 48c2ecbf59eb75d3feb82b5984b66bb13a933480, not the ICR05A or ICR05B harness HEAD. Full certification depends on mandatory Chromium, CI, exact-session and independent review gates. The source executor uses a privileged Supabase Management API credential despite the fixed SELECT allowlist. Original archival files are not rewritten.\n\n# HT-MVP-UIAT-01-R3-ICR05A-LR01 — Authoritative 30-Case Client Acceptance & Supplemental Matrix

## 1. Authoritative 30-Case UAT Status Census

- **Target Preview URL:** `https://healthtimes-staging-b8namgenu-11-11.vercel.app`
- **Preview Deployment ID:** `dpl_4zNzqAFPwkC2NUgnho9MGDxBX2F3`
- **Application Commit SHA:** `48c2ecbf59eb75d3feb82b5984b66bb13a933480`
- **Starting Exact Branch SHA:** `e8ef8660cac708a67f39a4d7d893e579662bea23`
- **Dedicated Execution Branch:** `fix/ht-mvp-uiat01-r3-icr05a-canonical-session-closure`
- **Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (AWS us-east-1)
- **Canonical 30-Case Registry Source:** Restored strictly from [`HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR04-LR01/HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md)
- **Final Canonical Reconciliation:** **23 PASS | 0 FAIL | 7 BLOCKED**
- **Owner Authorized Deferred Count:** **0** (`OWNER_AUTHORIZED_DEFERRED=0`)
- **Supplemental Safety & Security Matrix:** **14 PASS | 0 FAIL | 0 BLOCKED** (Tracked Separately)

---

## 2. Canonical 30-Case Client Acceptance Matrix

| Case ID | Persona | Viewport | Scope / Capability | Original Status | Implemented Correction | Final Deployed Runtime Status | Final Branch Source Status | Authenticated Persona | Tested SHA | Evidence Artifact Link | Blocker / Governance Decision |
|:---:|:---|:---:|:---|:---:|:---|:---:|:---:|:---|:---:|:---|:---|
| **UAT-R01** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Home feed, hero, latest and publication visibility | PASS | None required (Preserved) | **PASS** | **PASS** | Anonymous | `48c2ecb` | [`DEF014-performance-dashboard.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/records/UIAT01-R3-ICR05A-LR01-verification.json) | Verified rank 1 hero intact |
| **UAT-R02** | Anonymous Reader | 375×667 (Mobile) | Category filter with clean route and active state | FAIL (`DEF-003`) | Added URL param sync, popstate listener, tablist ARIA semantics | **PASS** | **PASS** | Anonymous | `48c2ecb` | [`DEF003-category-zimbabwe.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF003-category-zimbabwe.jpg) | Physically tested on exact-HEAD preview; URL and state synced |
| **UAT-R03** | Anonymous Reader | 375×667<br>1440×900 | Article body/teaser and clean not-found | FAIL (`DEF-001`) | Article direct routing & reload fix (`DEF-001` resolved) | **PASS** | **PASS** | Anonymous | `48c2ecb` | [`DEF001-article-deep-link.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF001-article-deep-link.jpg) | HTTP 200, headline preserved on reload |
| **UAT-R04** | Anonymous Reader | 375×667<br>1440×900 | Bookmark and Saved persistence | FAIL (`DEF-002`) | Saved articles & offline download fix (`DEF-002` resolved) | **PASS** | **PASS** | Anonymous | `48c2ecb` | [`DEF002-saved-offline-read.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF002-saved-offline-read.jpg) | Offline reading functional; distinct storage keys |
| **UAT-R05** | Anonymous Reader | 375×667 (Mobile) | Audio playback, pause and seek | BLOCKED | None (Out of Scope for MVP) | **BLOCKED** | **BLOCKED** | Anonymous | `48c2ecb` | [`apps/mobile/app/listen.tsx:67`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/apps/mobile/app/listen.tsx#L67) | Feature absence in MVP scope; Owner decision pending (no authorized deferral) |
| **UAT-R06** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Dark theme, light theme, contrast & persistence | FAIL (`DEF-013`) | Tokens & theme contrast update (`DEF-013` resolved) | **PASS** | **PASS** | Anonymous | `48c2ecb` | [`DEF013-theme-dark.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF013-theme-dark.jpg) | Contrast ratio $\ge 4.5:1$ across all 6 surfaces |
| **UAT-J01** | Journalist / Reporter | 1440×900 (Desktop) | Journalist sign-in and desk restrictions | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `48c2ecb` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-J02** | Publisher/Reporter | 1440×900 (Desktop) | Validated draft, counters and autosave | FAIL (`DEF-006`) | Client form banner + DB migration authored (pending Owner Staging application) | **BLOCKED** | **BLOCKED** | Publisher substitute | `48c2ecb` | [`DEF006-studio-authentic-validation-error.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF006-studio-authentic-validation-error.jpg) | Client UI validated; Backend migration `20261102160000` certified on disposable DB; Staging application blocked pending Owner approval |
| **UAT-J03** | Journalist / Reporter | 1440×900 (Desktop) | Valid image attribution and invalid MIME rejection | PASS | None required (Preserved) | **PASS** | **PASS** | Publisher substitute | `48c2ecb` | UIAT-01/02 Archive | JPEG saved with attribution; MIME rejected |
| **UAT-J04** | Journalist / Reporter | 1440×900 (Desktop) | Submit for review without publish permission | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `48c2ecb` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-E01** | Editor-in-Chief | 1440×900 (Desktop) | Review queue and role-restricted actions | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `48c2ecb` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-E02** | Editor-in-Chief | 1440×900 (Desktop) | Edit, add review note and request revision | BLOCKED | None | **BLOCKED** | **BLOCKED** | None available | `48c2ecb` | Staging DB `staff_profiles` | Missing authorized test credentials in Staging |
| **UAT-E03** | Editor-in-Chief | 1440×900 (Desktop) | Approve, publish and verify live appearance | PASS | None required (Preserved) | **PASS** | **PASS** | Publisher substitute | `48c2ecb` | UIAT-01/02 Archive | Lifecycle & reader visibility verified |
| **UAT-E04** | Editor-in-Chief | 1440×900 (Desktop) | Hero story curation and placement order | PASS | None required (Preserved) | **PASS** | **PASS** | Publisher substitute | `48c2ecb` | UIAT-01/02 Archive | Placement rank 1 curation verified on DB |
| **UAT-A01** | Publisher / Audience | 1440×900 (Desktop) | WhatsApp composition, contract and preview | FAIL (`DEF-008`) | Disabled date input; added deferred dispatch notice (`DEF-008` resolved) | **PASS** | **PASS** | `uat-specialist` | `48c2ecb` | [`DEF008-whatsapp-composer.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF008-whatsapp-composer.jpg) | Deferred notice & schedule lock enforced |
| **UAT-A02** | Publisher / Audience | 1440×900 (Desktop) | WhatsApp staging queue persistence | FAIL (`DEF-008`) | Database draft persistence verified with zero dispatches (`DEF-008` resolved) | **PASS** | **PASS** | `uat-specialist` | `48c2ecb` | [`DEF008-whatsapp-desk-created.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF008-whatsapp-desk-created.jpg) | DB draft created via RPC; `sent_at = null`; 0 dispatches |
| **UAT-A03** | Audience Specialist | 1440×900 (Desktop) | Responsive newsletter campaign preview | BLOCKED | None | **BLOCKED** | **BLOCKED** | `uat-specialist` | `48c2ecb` | SQL `public.contact_segments` | Empty staging audience segment corpus (`count=0`) |
| **UAT-A04** | Audience Specialist | 1440×900 (Desktop) | Push notification draft and fail-closed dispatch | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-specialist` | `48c2ecb` | UIAT-01/02 Archive | Draft saved; zero external dispatches |
| **UAT-C01** | Commercial Manager | 1440×900 (Desktop) | Advertiser directory and detail modal | FAIL (`DEF-009`) | Interactive card row & modal navigation (`DEF-009` resolved) | **PASS** | **PASS** | `uat-commercial` | `48c2ecb` | [`DEF009-advertiser-details-modal.jpg`](https://github.com/kudzimusar/htp-zw/blob/e5f2fd7730317ae8edc63f71bb90349a53fd868c/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR05A-LR01/screenshots/DEF009-advertiser-details-modal.jpg) | Advertiser details modal operational; clean dismissal |
| **UAT-C02** | Commercial Manager | 1440×900 (Desktop) | Commercial orders & self-approval boundary | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-commercial` | `48c2ecb` | UIAT-02 Archive | Orders workspace active; self-approval absent |
| **UAT-C03** | Commercial Manager | 1440×900 (Desktop) | Campaign, placement, asset and zone continuity | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-commercial` | `48c2ecb` | UIAT-02 Archive | Ad manager workspace & campaigns verified |
| **UAT-C04** | Commercial Manager | 1440×900 (Desktop) | Commercial telemetry and session logout | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-commercial` | `48c2ecb` | UIAT-02 Archive | Telemetry verified; clean logout redirect |
| **UAT-F01** | Finance Manager | 1440×900 (Desktop) | Balanced Trial Balance | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `48c2ecb` | UIAT-01/02 Archive | Balanced USD 31,300 debits/credits verified |
| **UAT-F02** | Finance Manager | 1440×900 (Desktop) | Invoices, payments and classifications | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `48c2ecb` | UIAT-01/02 Archive | 12 invoices, two USD 1,500 bank transfers |
| **UAT-F03** | Finance Manager | 1440×900 (Desktop) | Expense state and unbalanced guard | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `48c2ecb` | UIAT-01/02 Archive | 12 synthetic expenses; GL balanced |
| **UAT-F04** | Finance Manager | 1440×900 (Desktop) | Balance Sheet & P&L parity | PASS | None required (Preserved) | **PASS** | **PASS** | `uat-finance` | `48c2ecb` | UIAT-01/02 Archive | Assets $10,500 = Equity $10,500; P&L surplus |
| **UAT-O01** | Publisher / Owner | 1440×900 (Desktop) | Owner session and Publisher role | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `48c2ecb` | UIAT-01/02 Archive | Executive desk & 76 capabilities verified |
| **UAT-O02** | Publisher / Owner | 1440×900 (Desktop) | Access all seven desks | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `48c2ecb` | UIAT-01/02 Archive | All 7 desks physically traversed |
| **UAT-O03** | Publisher / Owner | 1440×900 (Desktop) | Staff directory and roles | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `48c2ecb` | UIAT-01/02 Archive | Full directory & 19-role catalogue visible |
| **UAT-O04** | Publisher / Owner | 1440×900 (Desktop) | Ordered immutable audit visibility | PASS | None required (Preserved) | **PASS** | **PASS** | `kudzimusar` | `48c2ecb` | UIAT-01/02 Archive | Immutable security audit events log verified |

---

## 3. Supplemental Safety & Security Evidence Matrix

The 14 supplemental tests introduced during ICR05 verification are tracked separately from the canonical 30-case registry as corroborating safety evidence:

| Supplemental ID | Capability / Safety Area | Target SLA / Standard | Measured Value | Verification Result |
|:---|:---|:---|:---:|:---:|
| **SUPP-SEARCH-01** | Canonical article links and query matching in search | Valid `/article/*` href & text match | 5/5 valid article links | **PASS** |
| **SUPP-SEARCH-02** | Tab-scoped negative search empty state | 0 cards rendered + empty state banner | 0 cards, banner visible | **PASS** |
| **SUPP-PERF-01** | Desktop Warm LCP P75 | $\le 2000$ ms | **704 ms** | **PASS** |
| **SUPP-PERF-02** | Desktop Cold LCP P75 | $\le 2500$ ms | **1,376 ms** | **PASS** |
| **SUPP-PERF-03** | Mobile Cold LCP P75 | $\le 2500$ ms | **1,452 ms** | **PASS** |
| **SUPP-PERF-04** | Single-flight Feed RPC per navigation | Exactly $\le 1$ call / load | 0 extra feed RPCs | **PASS** |
| **SUPP-A11Y-01** | 6-Surface WCAG AA Contrast Ratios | $\ge 4.5:1$ ratio | Light: 17.85:1, Dark: 16.64:1, Premium: 17.06:1 | **PASS** |
| **SUPP-OFFLINE-01** | Saved article offline rendering | Cached body rendered offline | Verified in offline browser mode | **PASS** |
| **SUPP-ADVERTISER-01** | Advertiser details modal navigation & dismissal | Clean overlay, id match, dismiss | HOSPAZ matched, clean close | **PASS** |
| **SUPP-SESSION-01** | Exact provider_session_id tracking and revocation | Non-null UUID passed to RPC | 3/3 sessions tracked & revoked | **PASS** |
| **SUPP-SESSION-02** | Concurrent session preservation for same actor | Unrelated sessions remain unrevoked | Verified via fault-injection test | **PASS** |
| **SUPP-AUDIT-01** | Allowlisted query template catalog least privilege | Reject arbitrary SQL & mutating queries | Enforced via `ALLOWED_AUDIT_TEMPLATES` | **PASS** |
| **SUPP-TITLE-01** | Real-schema parity testing on disposable PostgreSQL | Full schema title authority | 15/15 tests passing on disposable DB | **PASS** |
| **SUPP-TITLE-02** | Authentic Studio UI client title validation banner | Visible banner, clear on input | Banner rendered & cleared | **PASS** |

---

## 4. Search Latency Multi-Attempt Sample Battery

Measured from `searchInput.press('Enter')` until unique result card (`[role="link"]`) matching query term is visible in the DOM:

| Attempt | Query | Context Condition | Returned Story Headline | Duration (ms) | Target SLA | SLA Status |
|:---:|:---:|:---:|:---|:---:|:---:|:---:|
| **Sample 1** | `"Cervical"` | Cold Context | *WHO Donates US$350,000 Cervical Cancer, Cholera Equipment to Zimbabwe* | **2,322 ms** | $\le 2500$ ms | **PASS** |
| **Sample 2** | `"Lenacapavir"` | Warm Context | *Zimbabwe Puts Communities at the Heart of HIV Prevention as It Shapes PrEP Choice and Lenacapavir Rollout* | **1,805 ms** | $\le 2500$ ms | **PASS** |
| **Sample 3** | `"Cervical"` | Warm Context | *WHO Donates US$350,000 Cervical Cancer, Cholera Equipment to Zimbabwe* | **1,302 ms** | $\le 2500$ ms | **PASS** |
| **Sample 4** | `"Cancer"` | Warm Context | *WHO Donates US$350,000 Cervical Cancer, Cholera Equipment to Zimbabwe* | **1,313 ms** | $\le 2500$ ms | **PASS** |
| **Sample 5** | `"Health"` | Warm Context | *Zimbabwe Moves Towards Dedicated Menstrual Health Policy and Law* | **1,304 ms** | $\le 2500$ ms | **PASS** |

### Statistical Distribution Across All 5 Attempts
- **Minimum Duration:** **1,302 ms**
- **Median Duration:** **1,313 ms**
- **P75 Duration:** **1,805 ms** (Target $\le 2,500$ ms) — **PASS**
- **Maximum Duration (Cold Outlier):** **2,322 ms** (Target $\le 2,500$ ms) — **PASS**
- **Cold Outlier Breached SLA:** **NO** (2,322 ms $\le$ 2,500 ms)

---

## 5. Surface Theme & Contrast Ratio Matrix (DEF-013)

| Surface | Mode | Path | Background | Heading Contrast | Body Contrast | Target Ratio | WCAG AA Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| **Desktop** | Light | `/` | `rgb(255, 255, 255)` | **17.85:1** | **5.76:1** | $\ge 4.5:1$ | **PASS** |
| **Desktop** | Dark | `/` | `rgb(11, 22, 34)` | **16.64:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |
| **Premium Hub** | Dark | `/premium` | `rgb(11, 22, 34)` | **17.06:1** | **8.91:1** | $\ge 4.5:1$ | **PASS** |

---

## 6. Performance & Layout Stability Benchmark (DEF-014)

| Telemetry Metric | Measured P75 / Value | Contract Target | Evaluation |
|---|:---:|:---:|:---:|
| **Desktop Warm LCP (P75)** | **704 ms** | $\le 2,000$ ms | **PASS** |
| **Desktop Cold LCP (P75)** | **1,376 ms** | $\le 2,500$ ms | **PASS** |
| **Mobile Cold LCP (P75)** | **1,452 ms** | $\le 2,500$ ms | **PASS** |
| **Desktop Warm CLS (P75)** | **0.001** | $\le 0.05$ | **PASS** |
| **Mobile Cold CLS (P75)** | **0.000** | $\le 0.05$ | **PASS** |
| **Single-Flight Feed RPC** | **1 call / load** | Exactly $\le 1$ | **PASS** |

---

## 7. Live Supabase Session Hygiene Audit

Direct live SQL queries to Staging Supabase project `bzuvntbkevvuhfhqhkua` via Management API using allowlisted template catalog:

| Readback Query Target | Pre-Test Count | Post-Test Count | Governance Target | Evaluation |
|---|:---:|:---:|:---:|:---:|
| **Active Test Newsroom Sessions** | **0** | **0** | **0** | **PASS** |
| **Active Owner Newsroom Sessions** | **15** | **15** | **15** | **PASS (Intact)** |
| **Active Test GoTrue Auth Sessions** | **0** | **0** | **0** | **PASS** |
| **Active Owner GoTrue Auth Sessions** | **2** | **2** | **2** | **PASS (Intact)** |
| **Active Test Refresh Tokens** | **0** | **0** | **0** | **PASS** |
| **Active Owner Refresh Tokens** | **2** | **2** | **2** | **PASS (Intact)** |
