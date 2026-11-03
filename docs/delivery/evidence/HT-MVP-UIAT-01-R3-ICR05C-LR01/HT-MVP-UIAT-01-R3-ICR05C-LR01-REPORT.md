# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Final Native Certification Closure, Exact-SHA Custody and Independent Acceptance Report (R5-PUSH01)

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-R5-PUSH01`  
**Priority:** P0 — Consolidated Long-Run Execution  
**Controlling Issue:** [#145](https://github.com/kudzimusar/htp-zw/issues/145)  
**Draft PR:** [#146](https://github.com/kudzimusar/htp-zw/pull/146) (`cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`)  
**Parent Authority SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Accepted R4 Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Starting R4 Evidence SHA:** `0fc17ba4a947ebb0464c06e479154d3a1ce45b86`  
**Certified R5 Code & Test SHA:** `e7248a67ebb24e236a89b7771168695f511eb3a4`  
**Target Preview URL:** `https://healthtimes-staging-3blub5s3c-11-11.vercel.app`  
**Preview Deployment ID:** `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21`  
**Vercel Project:** `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`)  

---

## 1. Complete Exact-Head Native Certification Matrix (Run `41614064581`)

Workflow run [`41614064581`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064581) executed on exact commit `e7248a67ebb24e236a89b7771168695f511eb3a4` and completed with **`SUCCESS`** across all 6 jobs:

| Required Gate | Job ID | Device / Simulator Identity | OS Version | Maestro Commands | Screens | Runtime Errors | Artifact ID | Outcome |
|:---|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Phase 6A Contracts** | `125842968056` | Ubuntu 24.04 (Node 22) | Linux | 23/23 tests | N/A | 0 | N/A | **PASS (`SUCCESS`)** |
| **Android Phone** | `125842967918` | `sdk_gphone64_x86_64 (pixel_7_pro)` | Android 16 (API 36) | 139 (`115` completed, `24` skipped, `0` failed) | 22 | 0 | `13222815225` | **PASS (`SUCCESS`)** |
| **Android Tablet** | `125842967539` | `sdk_gphone64_x86_64 (pixel_tablet)` | Android 16 (API 36) | 37 (`29` completed, `8` skipped, `0` failed) | 6 | 0 | `13222325454` | **PASS (`SUCCESS`)** |
| **iOS Phone** | `125842968089` | `iPhone Air (1F0A9C4B-2DFC-444E-B162-696E5078A72B)` | iOS 26.5 | 145 (`120` completed, `25` skipped, `0` failed) | 22 | 0 | `13223005800` | **PASS (`SUCCESS`)** |
| **iOS Tablet** | `125842968203` | `iPad mini (A17 Pro) (A1BBB2ED-CC79-4E5C-82CF-1489A77F232D)` | iOS 26.5 | 47 (`37` completed, `10` skipped, `0` failed) | 6 | 0 | `13222426562` | **PASS (`SUCCESS`)** |
| **Aggregate Native Evidence** | `125859288116` | Exact-Head Matrix Aggregator | Linux | All 4 cells verified (`matrix-blocked=0`) | 56 | 0 | `13221778888` | **PASS (`SUCCESS`)** |

---

## 2. Complete Exact-Head CI Matrix on `e7248a67ebb24e236a89b7771168695f511eb3a4`

| Workflow Name | Run ID | Job / Gate Details | Outcome |
|:---|:---:|:---|:---:|
| **UI-02 Phase 6A Native Cross-Device Evidence** | [`41614064581`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064581) | All 6 jobs (`125842968056`, `125842967918`, `125842967539`, `125842968089`, `125842968203`, `125859288116`) | **SUCCESS** |
| **Phase 10 Candidate Visual Conformance** | [`41614064336`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064336) | iOS (`125842967435`), Android (`125842967798`), Web/PWA (`125842967114`) | **SUCCESS (3/3)** |
| **Phase 10 Web/PWA Evidence** | [`41614064453`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064453) | Web/PWA visual evidence | **SUCCESS** |
| **Chromium UAT — Canonical Reader** | [`41614064333`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064333) | Canonical Chromium 8/8 | **SUCCESS** |
| **Native Reader Product Gates** | [`41614064733`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064733) | 33/33 (including 17 fail-closed persistence scenarios) | **SUCCESS** |
| **UI-03 Commercial Reader Conformance** | [`41614064268`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064268) | Live Staging RPC + commercial reader conformance | **SUCCESS** |
| **NM-07 Phase 6 Migrated Corpus Reader** | [`41614064339`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064339) | Migrated corpus reader verification | **SUCCESS** |
| **AG-05 + NM-07 Phase 7 Premium + HOSPAZ** | [`41614064530`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064530) | Premium & HOSPAZ direct advertising authority | **SUCCESS** |
| **Native Binary Certification** | [`41614064362`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064362) | Android & iOS native compilation | **SUCCESS** |
| **Native Mobile Foundation + Security + Certification** | [`41614064506`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064506) | Full mobile foundation & security gates | **SUCCESS** |
| **UI-01 Phase 3 Discovery Conformance** | [`41614064383`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064383) | Search & discovery conformance | **SUCCESS** |
| **UI-01 Phase 4 Media Conformance** | [`41614064356`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064356) | Live, Watch, Listen conformance | **SUCCESS** |
| **UI-04 Phase 5 Reader Ownership Conformance** | [`41614064525`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064525) | Saved, My HealthTimes, Edition conformance | **SUCCESS** |
| **UI-04 Edition Full Reload Persistence** | [`41614064521`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064521) | Edition persistence across reload | **SUCCESS** |
| **UI-05 Phase 6B Accessibility & Responsive** | [`41614064451`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064451) | Accessibility & responsive states | **SUCCESS** |
| **UI-06 Phase 6C Final Recertification** | [`41614064337`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064337) | Cross-device edition recertification | **SUCCESS** |
| **Validate HealthTimes 2.0** | [`41614064357`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064357) | Repository validation | **SUCCESS** |
| **ICR05B — Deterministic Security Evidence** | [`41614064384`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064384) | Job `125842966515` (22/22 deterministic checks) | **SUCCESS** |
| **ICR05B — Physical Live Fault Injection** | [`41614064384`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064384) | Job `125842966839` (Step 4 credential preflight) | **`BLOCKED_OWNER_UAT_CREDENTIALS`** |

---

## 3. Source-Parity Transparency, Preview Custody & Independent Review Handoff

- **UI-03 Test Interception Classification:**
  - `loadAcceptedPremiumTeaserAuthority()` executes live against Staging Supabase RPC `ag05_public_story_teaser_document` (`https://bzuvntbkevvuhfhqhkua.supabase.co`).
  - `installPremiumAuthorityRoutes()` intercepts `https://healthtimes.co.zw/wp-json/wp/v2/posts**` with HTTP 200 `[]` as **scoped fixture isolation** (confirming no unauthenticated protected `content` field is requested by the client), **not** live external WordPress API availability proof.
  - All 7 mapped WordPress media objects are verified live (HTTP 200) against Supabase Storage (`migrated-media/wordpress/`).
- **Staging Preview Custody:**
  - Deployment `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21` on `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`) serves application code SHA `fe5669278768c2a5cab44670425fcf05a7a7d1a7`.
  - Automated custody test `tests/harness/icr05c-custody-verifier.test.mjs` verifies zero runtime diff between `fe5669278768c2a5cab44670425fcf05a7a7d1a7` and `e7248a67ebb24e236a89b7771168695f511eb3a4`.
- **Independent Review Status:**
  - `INDEPENDENT_REVIEW_MISSING` (`PENDING_EXTERNAL_ASSIGNMENT`). The implementing specialist does not self-approve PR #146.
