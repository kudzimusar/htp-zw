# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Final Native Certification Closure, Exact-SHA Custody and Independent Acceptance Report (R5-PUSH01 / ICR06-R4-LR01)

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit ID:** `HT-MVP-UIAT-01-R3-ICR06-R4-LR01`  
**Priority:** P0 — Consolidated Long-Run Execution  
**Controlling Issue:** [#145](https://github.com/kudzimusar/htp-zw/issues/145)  
**Draft PR:** [#146](https://github.com/kudzimusar/htp-zw/pull/146) (`cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`)  
**Parent Authority SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Accepted R4 Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Starting R4 Evidence SHA:** `0fc17ba4a947ebb0464c06e479154d3a1ce45b86`  
**Certified R5 Code & Test SHA:** `e7248a67ebb24e236a89b7771168695f511eb3a4`  
**Phase 10 Android R1 Remediation SHA:** `058689b420a1481ccca3ee2c9c7c349ff9cd009a`  
**Previously Successful R2 Engineering SHA:** `f5bd386d919b862702597193d839c0b38ac62bc7`  
**Moderator CI Enforcement SHA:** `b82286340df9ef7d24f0f12598ddda3150b3adc1`  
**ICR06-R3 Candidate SHA:** `9c4a11618733a4d4b5f7dc9baa323fdd855aaef7`  
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

---

## 3. Source-Parity Transparency, Preview Custody & Independent Review Handoff

- **UI-03 Test Interception Classification:**
  - `loadAcceptedPremiumTeaserAuthority()` executes live against Staging Supabase RPC `ag05_public_story_teaser_document` (`https://bzuvntbkevvuhfhqhkua.supabase.co`).
  - `installPremiumAuthorityRoutes()` intercepts `https://healthtimes.co.zw/wp-json/wp/v2/posts**` with HTTP 200 `[]` as **scoped fixture isolation** (confirming no unauthenticated protected `content` field is requested by the client), **not** live external WordPress API availability proof.
  - All 7 mapped WordPress media objects are verified live (HTTP 200) against Supabase Storage (`migrated-media/wordpress/`).
- **Staging Preview Custody:**
  - Deployment `dpl_D8NqSBugFsXrqCc1rQh3c22vKj21` on `healthtimes-staging` (`prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`) serves application code SHA `fe5669278768c2a5cab44670425fcf05a7a7d1a7`.
  - Automated custody test `tests/harness/icr05c-custody-verifier.test.mjs` verifies zero runtime diff between `fe5669278768c2a5cab44670425fcf05a7a7d1a7` and `HEAD`.
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

---

## 4. Final Exact-Head Phase 10 Android R2 Recertification & Negative-Path Evidence (Commit `f5bd386d`)

- **Phase 10 Candidate Visual Conformance (Run [`41775397669`](https://github.com/kudzimusar/htp-zw/actions/runs/41775397669)):** **3/3 SUCCESS** (Android `126394445819` / Artifact `13297757108`, Web/PWA `126394446061` / Artifact `13296806728`, iOS `126394446070` / Artifact `13298012284`).
- **UI-02 Phase 6A Native Cross-Device Evidence (Run [`41775397921`](https://github.com/kudzimusar/htp-zw/actions/runs/41775397921)):** **6/6 SUCCESS** (Aggregate Artifact `13298801755`).
- **Native Binary Certification (Run [`41775397572`](https://github.com/kudzimusar/htp-zw/actions/runs/41775397572)):** **3/3 SUCCESS**.

---

## 5. Moderator CI Enforcement Head (`b8228634`), ICR06-R3 (`9c4a1161`), and ICR06-R4 Provenance & Maestro Schema Closure

### A. Verified CI Results on `b82286340df9ef7d24f0f12598ddda3150b3adc1` and `9c4a11618733a4d4b5f7dc9baa323fdd855aaef7`

| Workflow Name | `b8228634` Run & Status | `9c4a1161` Run & Status | `9c4a1161` Jobs & Artifacts |
|:---|:---|:---|:---|
| **Phase 10 Candidate Visual Conformance** | [`41780992191`](https://github.com/kudzimusar/htp-zw/actions/runs/41780992191) (**3/3 PASS**) | [`41812008942`](https://github.com/kudzimusar/htp-zw/actions/runs/41812008942) (**3/3 PASS**) | Web: `126513305147` (`13311989274`)<br>Android: `126513302148` (`13313603027`)<br>iOS: `126513302028` (`13313852801`) |
| **Native Binary Certification** | [`41780992413`](https://github.com/kudzimusar/htp-zw/actions/runs/41780992413) (**3/3 PASS** att 2) | [`41812008980`](https://github.com/kudzimusar/htp-zw/actions/runs/41812008980) (**3/3 PASS** att 1) | Readiness: `126513302537` (`13311934875`)<br>iOS: `126513302213` (`13312924922`)<br>Android: `126513301897` (`13313578097`) |
| **UI-02 Phase 6A Native Cross-Device Evidence** | [`41780992206`](https://github.com/kudzimusar/htp-zw/actions/runs/41780992206) (**5/6 PASS**, Aggregate `126442613997` FAIL) | [`41812008951`](https://github.com/kudzimusar/htp-zw/actions/runs/41812008951) (**5/6 PASS** on att 1, Aggregate `126525748704` FAIL) | Contracts: `126513301657` (`SUCCESS`)<br>Android Phone: `126513302194` (`13313414537`, `SUCCESS`)<br>Android Tablet: `126513301244` (`13313867886`, `SUCCESS`)<br>iOS Phone: `126513301621` (`13314188557`, `SUCCESS`)<br>iOS Tablet: `126513303346` (`13314372723`, `SUCCESS`)<br>Aggregate: `126525748704` (`13313769951`, `FAILURE`) |
| **Companion CI Suites on `9c4a1161`** | All PASS | All PASS (`16/16` workflows) | `41812008902` (Chromium), `41812008804` & `41812001689` (Reader Product), `41812008789` (UI-03), `41812008871` (NM-07), `41812008808` (AG-05/HOSPAZ), `41812008792` (Phase 10 Web), `41812008762` (Mobile Foundation), `41812008853` (UI-01 P3), `41812008802` (UI-01 P4), `41812008950` (UI-04 P5), `41812008912` (UI-04 Reload), `41812008887` (UI-05 P6B), `41812008862` (UI-06 P6C), `41812008923` (Validate), `41812008765` (ICR05B deterministic PASS / live session `BLOCKED_OWNER_UAT_CREDENTIALS`) |

### B. ICR06-R4 Root Cause of Job `126525748704` & Provenance Hardening
1. **Why Aggregate Job `126525748704` Rejected All 4 Passing Attempt-1 Device Artifacts on `9c4a1161`:**
   - Maestro's CLI (`maestro test --test-output-dir "$EVIDENCE_DIR"`) writes an internal runner artifact manifest at `<timestamp>/ui02-phase6a-(phone|tablet)/manifest.json` (`"$schema": "https://storage.googleapis.com/maestro-schemas/artifact-manifest/v1.schema.json"`).
   - Meanwhile, `scripts/native/ui02-phase6a-manifest.mjs` writes the UI-02 Phase 6A cell manifest at `<EVIDENCE_DIR>/manifest.json`.
   - In `9c4a1161`, `evaluateCandidateArtifact` matched every file ending in `/manifest.json` without filtering out Maestro's internal `$schema` runner manifest, causing all four valid device cells to be rejected with `MULTIPLE_MANIFESTS_IN_SINGLE_ARTIFACT`.
2. **ICR06-R4 Remediation (`HT-MVP-UIAT-01-R3-ICR06-R4-LR01`):**
   - **Maestro Internal `$schema` Manifest Filtering:** `isMaestroInternalRunnerManifest()` in [`scripts/native/ui02-phase6a-aggregate.mjs`](../../../scripts/native/ui02-phase6a-aggregate.mjs) ignores Maestro's internal `maestro-schemas/artifact-manifest` file while continuing to fail closed (`MULTIPLE_MANIFESTS_IN_SINGLE_ARTIFACT`) if multiple UI-02 cell manifests exist in a single artifact. Verified directly against the 4 real extracted device artifacts and 56 real screenshots from Run `41614064581`.
   - **Workflow `actions: read` Permission & Paginated Fail-Closed Metadata Fetching (Workstream B1):** Added `actions: read` to [`.github/workflows/ui02-phase6a-native-cross-device.yml`](../../../.github/workflows/ui02-phase6a-native-cross-device.yml) and replaced the silent catch-all helper with a paginated fetcher (`per_page=100`, `total_count` completeness check) that records explicit `ok: false` and diagnostic errors on HTTP/auth/pagination failures.
   - **Strict Authoritative `artifactId` & `jobId` Provenance (Workstream B2):** `reconcileUi02NativeMatrix` now requires valid `artifactsApiData` and `jobsApiData` from the GitHub REST API, never falls back to self-declared `manifest.artifactId` or `manifest.jobId`, enforces exact `run_attempt` matching between each artifact and its upstream GitHub job (`ARTIFACT_JOB_ATTEMPT_MISMATCH`), verifies `conclusion === "success"`, and blocks on duplicate/conflicting artifact or job identities.
   - **Full PNG Chunk `CRC32` + `IDAT` Zlib Inflate Verification & Honest Visual Status (Workstream B3):** `inspectPngFile()` validates the 8-byte PNG signature, `IHDR` parameters, per-chunk `CRC32` checksums (`node:zlib.crc32`), `IDAT` zlib stream inflation (`node:zlib.inflateSync`), expected scanline byte length, and terminal `IEND` chunk, while setting `independentVisualReviewStatus: "PENDING_NON_AUTHOR_REVIEW"`.
   - **20-Scenario Deterministic Regression Suite (Workstream C):** Extended [`tests/harness/ui02-phase6a-aggregation.test.mjs`](../../../tests/harness/ui02-phase6a-aggregation.test.mjs) to **20/20 passing scenarios** (`56/56` combined with Phase 6A, Phase 10 negative-path, and custody verifier suites).
