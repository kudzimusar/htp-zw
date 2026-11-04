# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Native CI Failure Root Cause & Remediation Evidence (R5-PUSH01, ICR06-R3 & ICR06-R4 Closure)

**Unit ID:** `HT-MVP-UIAT-01-R3-ICR06-R4-LR01`  
**Parent Issues:** [#145](https://github.com/kudzimusar/htp-zw/issues/145), #143, #141, #139, #137, #134  
**Parent Authority SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Accepted R4 Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Starting R4 Evidence SHA:** `0fc17ba4a947ebb0464c06e479154d3a1ce45b86`  
**Certified R5 Code & Test SHA:** `e7248a67ebb24e236a89b7771168695f511eb3a4`  
**Previously Successful R2 Engineering SHA:** `f5bd386d919b862702597193d839c0b38ac62bc7`  
**Moderator CI Enforcement SHA:** `b82286340df9ef7d24f0f12598ddda3150b3adc1`  
**ICR06-R3 Candidate SHA:** `9c4a11618733a4d4b5f7dc9baa323fdd855aaef7`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Target Repository:** `kudzimusar/htp-zw`  

---

## 1. Work Package A — Independent Forensic Investigation of iOS Tablet Failure (Run `41587007329`)

- **Workflow Run:** [`41587007329`](https://github.com/kudzimusar/htp-zw/actions/runs/41587007329) (`UI-02 Phase 6A Native Cross-Device Evidence`, Job `125754753429`, Artifact `13210032036`)
- **Simulator Identity:** `iPad mini (A17 Pro)` (`A1BBB2ED-CC79-4E5C-82CF-1489A77F232D`), `iOS 26.5`
- **Root Cause:** Cold-boot `RCPVirtualHIDService` emitted touch events before `IOHIDService` matching settled (`service doesn't wait for pointer ready`), causing `backboardd` to initialize duplicate `BKDirectTouchState` instances for `senderID: 0x102368C000000` and cancel the touch on the `SpringBoard` `"Open"` alert button (`UITouchPhaseCancelled`).
- **Recertified in Run [`41614064581`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064581) (`e7248a67ebb24e236a89b7771168695f511eb3a4`):** **6/6 SUCCESS** (`UI02_AGGREGATE=SUCCESS`, Artifact `13221778888`).

---

## 2. Phase 10 Android Emulator Failure & Fail-Closed Negative-Path Closure (Runs `41635266596` -> `41775397669` -> `41780992191` -> `41812008942`)

- **Failed Run [`41635266596`](https://github.com/kudzimusar/htp-zw/actions/runs/41635266596):** Attempt 1 (`125914749339`) failed at Step 8 Gradle dependency download; Attempt 2 (`126280637640`) passed Step 8 APK compilation and failed at Step 9 emulator preflight (`ANDROID_EMULATOR_CAPTURE_PREFLIGHT_FAILED_EXACT_COMMAND_UNPROVEN`).
- **Remediated & Certified:**
  - `f5bd386d919b862702597193d839c0b38ac62bc7`: Run [`41775397669`](https://github.com/kudzimusar/htp-zw/actions/runs/41775397669) (**3/3 SUCCESS**).
  - `b82286340df9ef7d24f0f12598ddda3150b3adc1`: Run [`41780992191`](https://github.com/kudzimusar/htp-zw/actions/runs/41780992191) (**3/3 SUCCESS**, including 6-vector Android fail-closed negative-path CI step).
  - `9c4a11618733a4d4b5f7dc9baa323fdd855aaef7`: Run [`41812008942`](https://github.com/kudzimusar/htp-zw/actions/runs/41812008942) (**3/3 SUCCESS**: Web `126513305147`/`13311989274`, Android `126513302148`/`13313603027`, iOS `126513302028`/`13313852801`).

---

## 3. ICR06-R3 & ICR06-R4 — UI-02 Cross-Attempt Aggregation & Provenance Closure (Runs `41780992206` & `41812008951`)

### A. Run `41780992206` (`b82286340df9ef7d24f0f12598ddda3150b3adc1`) — Mixed-Attempt Selection Defect
- **Upstream Jobs (5/5 `SUCCESS`):** Contracts `126429759091`, Android Phone `126429708123` (Att 1 Artifact `13300262966`), Android Tablet `126429708897` (Att 1 Artifact `13299844628`), iOS Tablet `126429746045` (Att 1 Artifact `13301230604`), iOS Phone `126429706722` (Att 2 Retry Artifact `13303755005`).
- **Failed Aggregate Job `126442613997` (Artifact `13303285803`):** Downloaded only `*-attempt-2` and filtered by `runAttempt == current_attempt`, excluding the 3 valid Attempt-1 artifacts (`UI02_AGGREGATE_MIXED_ATTEMPT_ARTIFACT_SELECTION_DEFECT`).

### B. Run `41812008951` (`9c4a11618733a4d4b5f7dc9baa323fdd855aaef7`) — Maestro Internal `$schema` Manifest Collision & Provenance Hardening
- **Upstream Jobs (5/5 `SUCCESS` on Attempt 1):**
  - `Phase 6A contract + frozen Reader regressions`: Job `126513301657` (`SUCCESS` — including the 10-scenario aggregation regression suite)
  - `Android phone real emulator evidence`: Job `126513302194` (`SUCCESS`, Artifact `13313414537`, 11,457,007 B)
  - `Android tablet real emulator evidence`: Job `126513301244` (`SUCCESS`, Artifact `13313867886`, 5,425,936 B)
  - `iOS phone real simulator evidence`: Job `126513301621` (`SUCCESS`, Artifact `13314188557`, 41,192,829 B)
  - `iOS tablet real simulator evidence`: Job `126513303346` (`SUCCESS`, Artifact `13314372723`, 4,081,630 B)
- **Failed Aggregate Job `126525748704` (Artifact `13313769951`):**
  - Forensic reproduction against the real extracted Maestro artifacts proved that Maestro's CLI writes an internal runner manifest at `<timestamp>/ui02-phase6a-(phone|tablet)/manifest.json` (`"$schema": "https://storage.googleapis.com/maestro-schemas/artifact-manifest/v1.schema.json"`). Because `evaluateCandidateArtifact` in `9c4a1161` matched all `manifest.json` files without filtering out Maestro's internal `$schema` file, each cell was flagged with `MULTIPLE_MANIFESTS_IN_SINGLE_ARTIFACT`.
- **ICR06-R4 Engineering Closure:**
  1. Filtered out Maestro's internal `$schema: ".../maestro-schemas/artifact-manifest/..."` file via `isMaestroInternalRunnerManifest()` while preserving `MULTIPLE_MANIFESTS_IN_SINGLE_ARTIFACT` on genuine multi-manifest conflicts (verified directly against the 4 real extracted device artifacts and 56 real screenshots from Run `41614064581`).
  2. Added `actions: read` permission and paginated, fail-closed REST metadata fetching in [`.github/workflows/ui02-phase6a-native-cross-device.yml`](../../../.github/workflows/ui02-phase6a-native-cross-device.yml).
  3. Enforced strict authoritative GitHub API `artifactId` and `jobId` provenance in [`scripts/native/ui02-phase6a-aggregate.mjs`](../../../scripts/native/ui02-phase6a-aggregate.mjs) (rejecting missing/null/self-declared IDs, non-success job conclusions, and artifact-to-job attempt mismatches).
  4. Added full PNG chunk framing, `CRC32`, and `IDAT` zlib stream inflation (`node:zlib`) verification on all screenshots while preserving `independentVisualReviewStatus: "PENDING_NON_AUTHOR_REVIEW"`.
  5. Expanded [`tests/harness/ui02-phase6a-aggregation.test.mjs`](../../../tests/harness/ui02-phase6a-aggregation.test.mjs) to **20 deterministic regression scenarios** (`20/20 PASS`).
