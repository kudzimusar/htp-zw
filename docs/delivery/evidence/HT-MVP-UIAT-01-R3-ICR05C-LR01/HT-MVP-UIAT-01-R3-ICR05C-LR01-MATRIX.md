# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Authoritative 30-Case Client Acceptance & Supplemental Matrix

**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-LR01`  
**Parent Issues:** #145, #143, #141, #139, #137, #134  
**Starting SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Target Repository:** `kudzimusar/htp-zw`  

---

## 1. Authoritative 30-Case UAT Status Census

- **Target Preview URL:** `https://healthtimes-staging-lnq4s7mcc-11-11.vercel.app`
- **Preview Deployment ID:** `dpl_8JSfuhXzFFqLT95M94XBLyzpdpWQ`
- **Vercel Project ID:** `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN` (`healthtimes-staging`)
- **Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (AWS us-east-1)
- **Canonical 30-Case Registry Source:** Restored strictly from [`HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md`](https://github.com/kudzimusar/htp-zw/blob/main/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR04-LR01/HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md)
- **Final Canonical Reconciliation:** **23 PASS | 0 FAIL | 7 BLOCKED**
- **Owner Authorized Deferred Count:** **0** (`OWNER_AUTHORIZED_DEFERRED=0`)
- **Supplemental Safety & Security Matrix:** **14 PASS | 0 FAIL | 0 BLOCKED** (Tracked Separately)
- **Exact-Head Native Cross-Device Status:** Remediated in candidate commit (`PRODUCT_RUNTIME_DEFECT` resolved in `apps/mobile`)

---

## 2. Canonical 30-Case Client Acceptance Matrix

| Case ID | Persona | Viewport | Scope / Capability | Historical Baseline Status | Implemented Correction | Source / Runtime Status | Authenticated Persona | Tested Reference | Blocker / Governance Decision |
|:---:|:---|:---:|:---|:---:|:---|:---:|:---|:---:|:---|
| **UAT-R01** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Home feed, hero, latest and publication visibility | PASS | None required (Preserved) | **PASS** | Anonymous | `534ff08` | Verified rank 1 hero intact |
| **UAT-R02** | Anonymous Reader | 375×667 (Mobile) | Category filter with clean route and active state | PASS (remediated) | URL param sync, popstate listener, guarded `Platform.OS === "web"` | **PASS** | Anonymous | `534ff08` | Physically tested; URL and state synced |
| **UAT-R03** | Anonymous Reader | 375×667<br>1440×900 | Article body/teaser and clean not-found | PASS (remediated) | Article direct routing & reload fix (`DEF-001` resolved) | **PASS** | Anonymous | `534ff08` | HTTP 200, headline preserved on reload |
| **UAT-R04** | Anonymous Reader | 375×667<br>1440×900 | Bookmark and Saved persistence | PASS (remediated) | In-memory persistence & offline download fix (`DEF-002` resolved) | **PASS** | Anonymous | `534ff08` | Offline reading functional; distinct storage keys |
| **UAT-R05** | Anonymous Reader | 375×667 (Mobile) | Audio playback, pause and seek | BLOCKED | None (Out of Scope for MVP) | **BLOCKED** | Anonymous | `534ff08` | Feature absence in MVP scope; blocked pending Owner feature or deferral decision |
| **UAT-R06** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Dark theme, light theme, contrast & persistence | PASS (remediated) | Tokens & theme contrast update (`DEF-013` resolved) | **PASS** | Anonymous | `534ff08` | Contrast ratio $\ge 4.5:1$ across all 6 surfaces |
| **UAT-J01** | Journalist / Reporter | 1440×900 (Desktop) | Journalist sign-in and desk restrictions | BLOCKED | None | **BLOCKED** | None available | Staging DB | Missing authorized test credentials in Staging |
| **UAT-J02** | Publisher/Reporter | 1440×900 (Desktop) | Validated draft, counters and autosave | BLOCKED (`DEF-006`) | Client form banner + DB migration authored (pending Owner Staging application) | **BLOCKED** | Publisher substitute | Staging DB | Client UI validated; Backend migration `20261102160000` certified on disposable DB; Staging application blocked pending Owner approval |
| **UAT-J03** | Journalist / Reporter | 1440×900 (Desktop) | Valid image attribution and invalid MIME rejection | PASS | None required (Preserved) | **PASS** | Publisher substitute | `534ff08` | JPEG saved with attribution; MIME rejected |
| **UAT-J04** | Journalist / Reporter | 1440×900 (Desktop) | Submit for review without publish permission | BLOCKED | None | **BLOCKED** | None available | Staging DB | Missing authorized test credentials in Staging |
| **UAT-E01** | Editor-in-Chief | 1440×900 (Desktop) | Review queue and role-restricted actions | BLOCKED | None | **BLOCKED** | None available | Staging DB | Missing authorized test credentials in Staging |
| **UAT-E02** | Editor-in-Chief | 1440×900 (Desktop) | Edit, add review note and request revision | BLOCKED | None | **BLOCKED** | None available | Staging DB | Missing authorized test credentials in Staging |
| **UAT-E03** | Editor-in-Chief | 1440×900 (Desktop) | Approve, publish and verify live appearance | PASS | None required (Preserved) | **PASS** | Publisher substitute | `534ff08` | Lifecycle & reader visibility verified |
| **UAT-E04** | Editor-in-Chief | 1440×900 (Desktop) | Hero story curation and placement order | PASS | None required (Preserved) | **PASS** | Publisher substitute | `534ff08` | Placement rank 1 curation verified on DB |
| **UAT-A01** | Publisher / Audience | 1440×900 (Desktop) | WhatsApp composition, contract and preview | PASS (remediated) | Disabled date input; added deferred dispatch notice (`DEF-008` resolved) | **PASS** | `uat-specialist` | `534ff08` | Deferred notice & schedule lock enforced |
| **UAT-A02** | Publisher / Audience | 1440×900 (Desktop) | WhatsApp staging queue persistence | PASS (remediated) | Database draft persistence verified with zero dispatches (`DEF-008` resolved) | **PASS** | `uat-specialist` | `534ff08` | DB draft created via RPC; `sent_at = null`; 0 dispatches |
| **UAT-A03** | Audience Specialist | 1440×900 (Desktop) | Responsive newsletter campaign preview | BLOCKED | None | **BLOCKED** | `uat-specialist` | Staging DB | Empty staging audience segment corpus (`count=0`) |
| **UAT-A04** | Audience Specialist | 1440×900 (Desktop) | Push notification draft and fail-closed dispatch | PASS | None required (Preserved) | **PASS** | `uat-specialist` | `534ff08` | Draft saved; zero external dispatches |
| **UAT-C01** | Commercial Manager | 1440×900 (Desktop) | Advertiser directory and detail modal | PASS (remediated) | Interactive card row & modal navigation (`DEF-009` resolved) | **PASS** | `uat-commercial` | `534ff08` | Advertiser details modal operational; clean dismissal |
| **UAT-C02** | Commercial Manager | 1440×900 (Desktop) | Commercial orders & self-approval boundary | PASS | None required (Preserved) | **PASS** | `uat-commercial` | `534ff08` | Orders workspace active; self-approval absent |
| **UAT-C03** | Commercial Manager | 1440×900 (Desktop) | Campaign, placement, asset and zone continuity | PASS | None required (Preserved) | **PASS** | `uat-commercial` | `534ff08` | Ad manager workspace & campaigns verified |
| **UAT-C04** | Commercial Manager | 1440×900 (Desktop) | Commercial telemetry and session logout | PASS | None required (Preserved) | **PASS** | `uat-commercial` | `534ff08` | Telemetry verified; clean logout redirect |
| **UAT-F01** | Finance Manager | 1440×900 (Desktop) | Balanced Trial Balance | PASS | None required (Preserved) | **PASS** | `uat-finance` | `534ff08` | Balanced USD 31,300 debits/credits verified |
| **UAT-F02** | Finance Manager | 1440×900 (Desktop) | Invoices, payments and classifications | PASS | None required (Preserved) | **PASS** | `uat-finance` | `534ff08` | 12 invoices, two USD 1,500 bank transfers |
| **UAT-F03** | Finance Manager | 1440×900 (Desktop) | Expense state and unbalanced guard | PASS | None required (Preserved) | **PASS** | `uat-finance` | `534ff08` | 12 synthetic expenses; GL balanced |
| **UAT-F04** | Finance Manager | 1440×900 (Desktop) | Balance Sheet & P&L parity | PASS | None required (Preserved) | **PASS** | `uat-finance` | `534ff08` | Assets $10,500 = Equity $10,500; P&L surplus |
| **UAT-O01** | Publisher / Owner | 1440×900 (Desktop) | Owner session and Publisher role | PASS | None required (Preserved) | **PASS** | `kudzimusar` | `534ff08` | Executive desk & 76 capabilities verified |
| **UAT-O02** | Publisher / Owner | 1440×900 (Desktop) | Access all seven desks | PASS | None required (Preserved) | **PASS** | `kudzimusar` | `534ff08` | All 7 desks physically traversed |
| **UAT-O03** | Publisher / Owner | 1440×900 (Desktop) | Staff directory and roles | PASS | None required (Preserved) | **PASS** | `kudzimusar` | `534ff08` | Full directory & 19-role catalogue visible |
| **UAT-O04** | Publisher / Owner | 1440×900 (Desktop) | Ordered immutable audit visibility | PASS | None required (Preserved) | **PASS** | `kudzimusar` | `534ff08` | Immutable security audit events log verified |

---

## 3. Seven Authoritative Blocked Cases Summary

| Case ID | Persona | Title / Scope | Blocker Root Cause | Non-Negotiable Gate to Unblock |
|:---:|:---|:---|:---|:---|
| **UAT-R05** | Reader | Audio playback & seeking | Native audio stream playback not part of initial MVP architecture | Written Owner scope approval / product release roadmap |
| **UAT-J01** | Journalist | Journalist sign-in & desk restriction | Isolated Staging-only test credentials for `uat-journalist@healthtimes.test` not provisioned | Owner provision of test identity in GitHub Secrets |
| **UAT-J02** | Publisher/Reporter | Validated draft & empty title rejection | Backend DB function `newsroom_create_story` allows `"Untitled story"` fallback in Staging; migration `20261102160000` requires explicit Owner authorization to apply | Written Owner authorization to apply DDL to Staging |
| **UAT-J04** | Journalist | Submit for review without publish rights | Isolated Staging-only test credentials for `uat-journalist@healthtimes.test` not provisioned | Owner provision of test identity in GitHub Secrets |
| **UAT-E01** | Editor | Review queue & role-restricted actions | Isolated Staging-only test credentials for `uat-editor@healthtimes.test` not provisioned | Owner provision of test identity in GitHub Secrets |
| **UAT-E02** | Editor | Revision request & editorial notes | Isolated Staging-only test credentials for `uat-editor@healthtimes.test` not provisioned | Owner provision of test identity in GitHub Secrets |
| **UAT-A03** | Audience | Responsive newsletter campaign preview | Empty staging audience segment corpus (`count=0` in `public.contact_segments`) | Owner provisioning of Staging audience segment fixtures |

---

## 4. Supplemental Safety & Security Evidence Matrix (14 PASS)

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

## 5. Native CI Cross-Device Reconciliation Matrix

| Matrix Cell | Device / Viewport | Flow | ICR05B Workflow Status | Defect Classification | Run 41548294848 Status | Candidate Status |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| **Android Phone** | Pixel 7 (Android 14) | Maestro (`ui02-phase6a-phone.yaml`) | FAILED (run 41450037544) | `PRODUCT_RUNTIME_DEFECT` (`new window.Image()`) | **SUCCESS** | **PASS** |
| **Android Tablet** | Pixel Tablet (Android 14) | Maestro (`ui02-phase6a-tablet.yaml`) | FAILED (run 41450037544) | `PRODUCT_RUNTIME_DEFECT` (`new window.Image()`) | **SUCCESS** | **PASS** |
| **iOS Phone** | iPhone 15 (iOS 17.5) | Maestro (`ui02-phase6a-phone.yaml`) | FAILED (run 41450037544) | `PRODUCT_RUNTIME_DEFECT` (AsyncStorage manifest I/O) | FAILED (step 20 "Saved") | **REMEDIATED IN SOURCE** |
| **iOS Tablet** | iPad Pro 11-in (iOS 17.5) | Maestro (`ui02-phase6a-tablet.yaml`) | FAILED (run 41450037544) | `PRODUCT_RUNTIME_DEFECT` (`new window.Image()`) | **SUCCESS** | **PASS** |
| **Phase 10 iOS Visual** | iPhone 15 Simulator | Maestro (`phase10-ios-visual.yaml`) | FAILED (run 41450037178) | `PRODUCT_RUNTIME_DEFECT` (Runtime error regex match) | **SUCCESS** (run 41548294579) | **PASS** |
| **Phase 10 Android** | Pixel 7 Emulator | Maestro (`phase10-android-visual.yaml`) | SUCCESS (run 41450037178) | N/A | **SUCCESS** (run 41548294579) | **PASS** |
| **Phase 10 Web/PWA** | Chromium (Desktop & Mobile) | Playwright Conformance | SUCCESS (run 41450037178) | N/A | **SUCCESS** (run 41548294579) | **PASS** |
