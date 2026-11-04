# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Final Native Certification Closure, Exact-SHA Custody and Independent Acceptance Report (R5-PUSH01 / ICR06-PHASE10-ANDROID)

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit ID:** `HT-MVP-UIAT-01-R3-ICR06-PHASE10-ANDROID-LR01`  
**Priority:** P0 — Consolidated Long-Run Execution  
**Controlling Issue:** [#145](https://github.com/kudzimusar/htp-zw/issues/145)  
**Draft PR:** [#146](https://github.com/kudzimusar/htp-zw/pull/146) (`cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`)  
**Parent Authority SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Accepted R4 Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Starting R4 Evidence SHA:** `0fc17ba4a947ebb0464c06e479154d3a1ce45b86`  
**Certified R5 Code & Test SHA:** `e7248a67ebb24e236a89b7771168695f511eb3a4`  
**Phase 10 Android Remediation Commit SHA:** `058689b420a1481ccca3ee2c9c7c349ff9cd009a`  
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

## 2. Complete Exact-Head CI Matrix on `e7248a67ebb24e236a89b7771168695f511eb3a4` and Phase 10 Head `058689b420a1481ccca3ee2c9c7c349ff9cd009a`

### A. Certified Phase 10 Visual Conformance Recertification (Run `41763784097` on `058689b420a1481ccca3ee2c9c7c349ff9cd009a`)

Workflow run [`41763784097`](https://github.com/kudzimusar/htp-zw/actions/runs/41763784097) completed with **`SUCCESS`** across all 3 visual matrix cells:

| Matrix Cell | Job ID | Device / Runner | Artifact ID & Size | Captured Screens / Hashes | Native Errors | Outcome |
|:---|:---:|:---|:---:|:---|:---:|:---:|
| **Candidate Web/PWA Conformance** | `126357291599` | Ubuntu 24.04 (Chrome) | `13291399266` (4.68 MB) | Web reader conformance & PWA screens | 0 | **PASS (`SUCCESS`)** |
| **Candidate iOS Simulator Screenshots** | `126357291481` | macOS 15 (iPhone 16) | `13292054744` (3.52 MB) | iOS Reader Home, Premium, Watch screens | 0 | **PASS (`SUCCESS`)** |
| **Candidate Android Emulator Screenshots** | `126357291909` | Ubuntu 24.04 (KVM Pixel 7 Pro, API 36) | `13292913629` (3.84 MB) | `home.png` (`4bf6f773...`, 884 KB)<br>`premium.png` (`ffeca2d1...`, 286 KB)<br>`watch.png` (`8c8d030d...`, 220 KB) | 0 | **PASS (`SUCCESS`)** |

- **Android Diagnostics Package Uploaded:** Includes `adb-devices.txt`, `apk-info.txt`, `apk-install.log`, `boot-properties.txt`, `device-info.txt`, `kvm.txt`, `logcat.log` (6.13 MB), `maestro.log`, `package-verify.txt`, `runtime-errors.log` (0 bytes).
- **Candidate Companion UI-02 Native Run [`41763783738`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783738):** All 5 jobs completed with **`SUCCESS`** (Android phone `126357290341`, Android tablet `126357290657`, iOS phone `126357290703`, iOS tablet `126357290722`, Phase 6A contracts `126357290643`).

### B. CI Matrix Across Unified PR #146 Head

| Workflow Name | Run ID | Job / Gate Details | Outcome |
|:---|:---:|:---|:---:|
| **UI-02 Phase 6A Native Cross-Device Evidence** | [`41763783738`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783738) | All 5 jobs (Android phone, Android tablet, iOS phone, iOS tablet, Phase 6A contracts) | **SUCCESS** |
| **Phase 10 Candidate Visual Conformance** | [`41763784097`](https://github.com/kudzimusar/htp-zw/actions/runs/41763784097) | Web/PWA (`126357291599`), iOS (`126357291481`), Android (`126357291909`) | **SUCCESS (3/3)** |
| **Phase 10 Web/PWA Evidence** | [`41763783748`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783748) | Web/PWA visual evidence | **SUCCESS** |
| **Chromium UAT — Canonical Reader** | [`41763783707`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783707) | Canonical Chromium 8/8 | **SUCCESS** |
| **Native Reader Product Gates** | [`41763783713`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783713) | 33/33 (including 17 fail-closed persistence scenarios) | **SUCCESS** |
| **UI-03 Commercial Reader Conformance** | [`41763783727`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783727) | Live Staging RPC + commercial reader conformance | **SUCCESS** |
| **NM-07 Phase 6 Migrated Corpus Reader** | [`41763783750`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783750) | Migrated corpus reader verification | **SUCCESS** |
| **AG-05 + NM-07 Phase 7 Premium + HOSPAZ** | [`41763783723`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783723) | Premium & HOSPAZ direct advertising authority | **SUCCESS** |
| **Native Binary Certification** | [`41763783711`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783711) | Android & iOS native compilation | **SUCCESS** |
| **Native Mobile Foundation + Security + Certification** | [`41763783749`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783749) | Full mobile foundation & security gates | **SUCCESS** |
| **UI-01 Phase 3 Discovery Conformance** | [`41763783720`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783720) | Search & discovery conformance | **SUCCESS** |
| **UI-01 Phase 4 Media Conformance** | [`41763783709`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783709) | Live, Watch, Listen conformance | **SUCCESS** |
| **UI-04 Phase 5 Reader Ownership Conformance** | [`41763783756`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783756) | Saved, My HealthTimes, Edition conformance | **SUCCESS** |
| **UI-04 Edition Full Reload Persistence** | [`41763783704`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783704) | Edition persistence across reload | **SUCCESS** |
| **UI-05 Phase 6B Accessibility & Responsive** | [`41763783752`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783752) | Accessibility & responsive states | **SUCCESS** |
| **UI-06 Phase 6C Final Recertification** | [`41763783732`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783732) | Cross-device edition recertification | **SUCCESS** |
| **Validate HealthTimes 2.0** | [`41763783751`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783751) | Repository validation | **SUCCESS** |
| **ICR05B — Deterministic Security Evidence** | [`41763783721`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783721) | Job `126357288674` (22/22 deterministic checks) | **SUCCESS** |
| **ICR05B — Physical Live Fault Injection** | [`41763783721`](https://github.com/kudzimusar/htp-zw/actions/runs/41763783721) | Job `126357288924` (Step 4 credential preflight) | **`BLOCKED_OWNER_UAT_CREDENTIALS`** |

---

## 3. Source-Parity Transparency, Preview Custody & Independent Review Handoff

- **UI-03 Test Interception Classification:**
  - `loadAcceptedPremiumTeaserAuthority()` executes live against Staging Supabase RPC `ag05_public_story_teaser_document` (`https://bzuvntbkevvuhfhqhkua.supabase.co`).
  - `installPremiumAuthorityRoutes()` intercepts `https://healthtimes.co.zw/wp-json/wp/v2/posts**` with HTTP 200 `[]` as **scoped fixture isolation** (confirming no unauthenticated protected `content` field is requested by the client), **not** live external WordPress API availability proof.
  - All 7 mapped WordPress media objects are verified live (HTTP 200) against Supabase Storage (`migrated-media/wordpress/`).
- **Staging Preview Custody:**
  - Deployment `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21` on `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`) serves application code SHA `fe5669278768c2a5cab44670425fcf05a7a7d1a7`.
  - Automated custody test `tests/harness/icr05c-custody-verifier.test.mjs` verifies zero runtime diff between `fe5669278768c2a5cab44670425fcf05a7a7d1a7` and `058689b420a1481ccca3ee2c9c7c349ff9cd009a`.
- **Independent Review Status:**
  - `INDEPENDENT_REVIEW_STATUS=BLOCKED_INDEPENDENT_REVIEWER_NOT_AVAILABLE`. The implementing specialist does not self-approve PR #146. Formal independent review requires distinct reviewer assignment by Owner.

---

## Moderator correction — 4 November 2026 (subsequent to specialist return)

**Disposition: REMEDIATE; no final independent or Owner release acceptance.** This addendum is an append-only correction, not a replacement for historical successful runs.

GitHub's run [41763784097](https://github.com/kudzimusar/htp-zw/actions/runs/41763784097) on `058689b420a1481ccca3ee2c9c7c349ff9cd009a` genuinely completed 3/3 jobs. Its Android job `126357291909` log explicitly reports **Maestro exit code 0** and three screenshots copied from Maestro; **no fallback capture occurred in that run**. The companion run [41763783738](https://github.com/kudzimusar/htp-zw/actions/runs/41763783738) actually completed **6/6 jobs**, including the aggregate job `126370337228` (not five total).

**Newly identified certification-harness defect:** the original Android runner did not fail when Maestro exited nonzero; instead it could take fallback screenshots via ADB, mark route status `resolved=True` without proof, and set unsupported negative visual assertions. This was a latent **potential false-positive certification path**, even though it was not taken during the historical successful run. The original ADB wait was also unbounded, and the package lookup used a substring match.

**Moderator corrective commits:**
- `3fac20e916c9fb28861270e1a5264b0aaf8d8a67`: bounded ADB registration, exact package path query, fail on nonzero Maestro, no fallback images, require Maestro-generated route screenshots, fail on detected runtime errors, and mark independent visual inspection as pending.
- `c48f2dcf0e2eaf0cb30c0d299309cf789d658c79`: regression guard against a return to fallback/unsupported-assertion behavior.
- Corrected root-cause classification and custody in the verification record without altering historical run results.

**Certification boundary:** These corrections require a **new exact-head Phase 10 run and companion CI evidence**. Neither the earlier `058689b...` green run nor the specialist's later evidence-only head certifies the corrected runner. Formal independent review remains `BLOCKED_INDEPENDENT_REVIEWER_NOT_AVAILABLE`. The authenticated Owner session gate remains `BLOCKED_OWNER_UAT_CREDENTIALS`; the staging migration remains unapplied; canonical UAT remains 23 PASS / 0 FAIL / 7 BLOCKED. No merge, production, Paynow or deployment authorization was granted.
