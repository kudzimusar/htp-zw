# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Authoritative 30-Case Client Acceptance & Native CI Matrix (R5-PUSH01 / ICR06-R3-LR01)

**Unit ID:** `HT-MVP-UIAT-01-R3-ICR06-R3-LR01`  
**Parent Issues:** [#145](https://github.com/kudzimusar/htp-zw/issues/145), #143, #141, #139, #137, #134  
**Parent Authority SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Accepted R4 Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Starting R4 Evidence SHA:** `0fc17ba4a947ebb0464c06e479154d3a1ce45b86`  
**Certified R5 Code & Test SHA:** `e7248a67ebb24e236a89b7771168695f511eb3a4`  
**Previously Successful R2 Engineering SHA:** `f5bd386d919b862702597193d839c0b38ac62bc7`  
**Moderator CI Enforcement SHA:** `b82286340df9ef7d24f0f12598ddda3150b3adc1`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Target Repository:** `kudzimusar/htp-zw`  

---

## 1. Authoritative 30-Case UAT Status Census

- **Target Preview URL:** `https://healthtimes-staging-3blub5s3c-11-11.vercel.app`
- **Preview Deployment ID:** `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21`
- **Vercel Project ID:** `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN` (`healthtimes-staging`)
- **Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7` (0 runtime files changed in R5, Phase 10, and ICR06-R3)
- **Staging Database:** Supabase `bzuvntbkevvuhfhqhkua` (AWS us-east-1)
- **Canonical 30-Case Registry Source:** Restored strictly from [`HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md`](https://github.com/kudzimusar/htp-zw/blob/main/docs/delivery/evidence/HT-MVP-UIAT-01-R3-ICR04-LR01/HT-MVP-UIAT-01-R3-ICR04-LR01-MATRIX.md)
- **Final Canonical Reconciliation:** **23 PASS | 0 FAIL | 7 BLOCKED**
- **Owner Authorized Deferred Count:** **0** (`OWNER_AUTHORIZED_DEFERRED=0`)
- **Supplemental Safety & Security Matrix:** **14 PASS | 0 FAIL | 0 BLOCKED** (Tracked Separately)
- **Phase 10 Visual Conformance (`b8228634` Run `41780992191`):** **3/3 JOBS SUCCESS** (`PHASE10=3_OF_3_PASS`)
- **Native Binary Certification (`b8228634` Run `41780992413`):** **3/3 JOBS SUCCESS** (`NATIVE_BINARY=3_OF_3_PASS`)

---

## 2. Canonical 30-Case Client Acceptance Matrix

| Case ID | Persona | Viewport | Scope / Capability | Historical Baseline Status | Implemented Correction | Source / Runtime Status | Authenticated Persona | Tested Reference | Blocker / Governance Decision |
|:---:|:---|:---:|:---|:---:|:---|:---:|:---|:---:|:---|
| **UAT-R01** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Home feed, hero, latest and publication visibility | PASS | None required (Preserved) | **PASS** | Anonymous | `534ff08` | Verified rank 1 hero intact |
| **UAT-R02** | Anonymous Reader | 375×667 (Mobile) | Category filter with clean route and active state | PASS (remediated) | URL param sync, popstate listener, guarded `Platform.OS === "web"` | **PASS** | Anonymous | `534ff08` | Physically tested; URL and state synced |
| **UAT-R03** | Anonymous Reader | 375×667<br>1440×900 | Article body/teaser and clean not-found | PASS (remediated) | Article direct routing & reload fix (`DEF-001` resolved) | **PASS** | Anonymous | `534ff08` | HTTP 200, headline preserved on reload |
| **UAT-R04** | Anonymous Reader | 375×667<br>1440×900 | Bookmark and Saved persistence | PASS (remediated) | Durable fail-closed persistence (`DEF-002` resolved; in-memory fallback eliminated) | **PASS** | Anonymous | `bbe79bb` | Durable storage verified; write rejections fail closed without masking |
| **UAT-R05** | Anonymous Reader | 375×667 (Mobile) | Audio playback, pause and seek | BLOCKED | None (Out of Scope for MVP) | **BLOCKED** | Anonymous | `534ff08` | Feature absence in MVP scope; blocked pending Owner feature or deferral decision |
| **UAT-R06** | Anonymous Reader | 375×667<br>768×1024<br>1440×900 | Dark theme, light theme, contrast & persistence | PASS (remediated) | Tokens & theme contrast update (`DEF-013` resolved) | **PASS** | Anonymous | `534ff08` | Contrast ratio $\ge 4.5:1$ across all 6 surfaces |
| **UAT-J01** | Journalist / Reporter | 1440×900 (Desktop) | Journalist sign-in and desk restrictions | BLOCKED | None | **BLOCKED** | None available | Staging DB | Missing authorized test credentials in Staging |
| **UAT-J02** | Publisher/Reporter | 1440×900 (Desktop) | Validated draft, counters and autosave | BLOCKED (`DEF-006`) | Client form banner + DB migration authored (pending Owner Staging application) | **BLOCKED** | Publisher substitute | Staging DB | Client UI validated; Backend migration `supabase/migrations/20261102160000_ht_mvp_r3_story_title_authority.sql` certified on disposable DB; Staging application blocked pending Owner approval |
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

## 3. Native Cross-Device Certification Matrix Evolution (`e7248a67` -> `f5bd386d` -> `b8228634`)

| Matrix Cell | Device / Simulator Identity | R5 Run `41614064581` (`e7248a67`) | R2 Run `41775397921` (`f5bd386d`) | Moderator Head Run `41780992206` (`b8228634`) |
|:---|:---|:---:|:---:|:---:|
| **Phase 6A Contracts** | Ubuntu 24.04 (Node 22) | `125842968056` (`SUCCESS`) | `126394446205` (`SUCCESS`) | `126429759091` (`SUCCESS`) |
| **Android Phone** | `sdk_gphone64_x86_64 (pixel_7_pro)` (Android 16) | `125842967918` / `13222815225` (`SUCCESS`) | `126394446539` / `13298241448` (`SUCCESS`) | `126429708123` / `13300262966` (Att 1 `SUCCESS`) |
| **Android Tablet** | `sdk_gphone64_x86_64 (pixel_tablet)` (Android 16) | `125842967539` / `13222325454` (`SUCCESS`) | `126394446500` / `13297443027` (`SUCCESS`) | `126429708897` / `13299844628` (Att 1 `SUCCESS`) |
| **iOS Phone** | `iPhone Air (1F0A9C4B-2DFC-444E-B162-696E5078A72B)` (iOS 26.5) | `125842968089` / `13223005800` (`SUCCESS`) | `126394446375` / `13298380341` (`SUCCESS`) | `126429706722` / `13303755005` (Att 2 `SUCCESS`) |
| **iOS Tablet** | `iPad mini (A17 Pro) (A1BBB2ED-CC79-4E5C-82CF-1489A77F232D)` (iOS 26.5) | `125842968203` / `13222426562` (`SUCCESS`) | `126394446352` / `13297624410` (`SUCCESS`) | `126429746045` / `13301230604` (Att 1 `SUCCESS`) |
| **Aggregate Native Evidence** | Exact-Head Matrix Aggregator | `125859288116` / `13221778888` (`SUCCESS`) | `126408391094` / `13298801755` (`SUCCESS`) | `126442613997` / `13303285803` (`FAILURE` — mixed-attempt pattern defect repaired in ICR06-R3) |
