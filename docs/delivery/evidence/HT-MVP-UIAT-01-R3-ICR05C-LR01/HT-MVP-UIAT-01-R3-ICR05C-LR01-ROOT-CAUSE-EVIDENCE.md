# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Native CI Failure Root Cause & Remediation Evidence (R5-PUSH01 & ICR06-R3 Closure)

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

## 1. Work Package A — Independent Forensic Investigation of iOS Tablet Failure (Run `41587007329`)

### A. Authoritative Failed Run Identity
- **Workflow Run:** [`41587007329`](https://github.com/kudzimusar/htp-zw/actions/runs/41587007329) (`UI-02 Phase 6A Native Cross-Device Evidence`)
- **Failed Job:** `iOS tablet real simulator evidence` (Job ID: `125754753429`)
- **Downloaded Evidence Artifact:** `13210032036` (`ui02-phase6a-native-evidence-ios-tablet-attempt-1`)
- **Simulator Identity:** `iPad mini (A17 Pro)` (`A1BBB2ED-CC79-4E5C-82CF-1489A77F232D`), `iOS 26.5`
- **Flow:** `apps/mobile/e2e/ui02-phase6a-tablet.yaml`

### B. Forensic Findings Across All Mandatory Surfaces
1. **Metro Bundler & Native Application Runtime (`ios-tablet/metro.log` & `logs/device-simulator.log`):**
   - `metro.log` completed cleanly (`iOS Bundled 14545ms node_modules/expo-router/entry.js (1458 modules)`, `iOS Bundled 766ms node_modules/expo-router/entry.js (1 module)`) with **0 JavaScript or native runtime errors**.
   - `HealthTimesDev` (`pid 88893`, bundle ID `zw.co.healthtimes.app.dev`) launched cleanly with `clearState: true` (`duration: 13192ms`) and passed the initial `extendedWaitUntil: visible: "Top Stories"` assertion in `10385ms` (`06:33:26.376 UTC`).
   - There is **no defect** in `apps/mobile/app/(reader)/index.tsx`, Expo Router route resolution, or native deep-link handling.

2. **Failing Screenshot (`screenshots/step-009-assertCondition-Top_Stories.png`) & Accessibility Hierarchy (`screen-hierarchy/step-009-assertCondition-Top_Stories.json`):**
   - Visual inspection of `step-009-assertCondition-Top_Stories.png` proves that the `HealthTimesDev` application is rendered on the Home screen with `"Top Stories"` (`Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt`, `US medical team brings specialist surgical expertise...`, `Meet Dr Neddy Makonza...`) visible directly behind the translucent iOS system modal alert `Open in “HealthTimes Dev”? [Cancel] [Open]`.
   - Inspection of `step-009-assertCondition-Top_Stories.json` confirms that the foreground accessibility tree at failure time belongs to `com.apple.springboard` (`pid 11323`) and contains only the modal alert (`accessibilityText: "Open in “HealthTimes Dev”?"` at `bounds: [212,491][532,617]`, `Cancel` at `[228,553][368,601]`, `Open` at `[376,553][516,601]`) and the system status bar.

3. **Exact Root Cause of Undismissed System Prompt (`logs/device-simulator.log`, `logs/device-xctest.log`, `logs/maestro.log`):**
   - Because `RCPVirtualHIDService` emitted touch events before `IOHIDService` matching settled (`service doesn't wait for pointer ready`), `backboardd` initialized two `BKDirectTouchState` instances for `senderID: 0x102368C000000`, recorded `touch down` on `0x109c34540`, skipped all subsequent `touch move`/`touch up` events on `0x109c37020`, and **cancelled** the touch (`UITouchPhaseCancelled`) when `RCPVirtualHIDService` detached 200ms later.

---

## 2. Work Package B & C — Minimum Authorized Correction & Exact-Head Recertification (`e7248a67ebb24e236a89b7771168695f511eb3a4`)

- **File Modified:** [`apps/mobile/e2e/ui02-phase6a-tablet.yaml`](../../../apps/mobile/e2e/ui02-phase6a-tablet.yaml)
- **Exact-Head Recertification (Run [`41614064581`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064581) on `e7248a67ebb24e236a89b7771168695f511eb3a4`):** **6/6 SUCCESS** (`UI02_AGGREGATE=SUCCESS`, Artifact `13221778888`).

---

## 3. Work Package A & B — Forensic Investigation & Remediation of Phase 10 Android Emulator Failure (Run `41635266596`)

- **Failed Run:** [`41635266596`](https://github.com/kudzimusar/htp-zw/actions/runs/41635266596) (Job `125914749339` failed at Step 8 Gradle dependency download; Retry Job `126280637640` passed Step 8 APK build and failed at Step 9 emulator preflight: `ANDROID_EMULATOR_CAPTURE_PREFLIGHT_FAILED_EXACT_COMMAND_UNPROVEN`).
- **Remediation (`058689b4` -> Moderator fail-closed patch `3fac20e9` & `c48f2dcf` -> R2 cold-boot System UI ANR handling & 6-vector negative-path suite `f5bd386d` -> Moderator CI enforcement `b8228634`):**
  - Certified in Run [`41775397669`](https://github.com/kudzimusar/htp-zw/actions/runs/41775397669) (`f5bd386d`, 3/3 PASS) and Run [`41780992191`](https://github.com/kudzimusar/htp-zw/actions/runs/41780992191) (`b8228634`, 3/3 PASS: Web `126412652313`/`13298588970`, iOS `126412652527`/`13299507629`, Android `126412652730`/`13300072371`).

---

## 4. ICR06-R3 — Forensic Root Cause & Remediation of UI-02 Mixed-Attempt Aggregate Failure (Run `41780992206`)

### A. Authoritative Run & Job Evidence (`b82286340df9ef7d24f0f12598ddda3150b3adc1`)
- **Workflow Run:** [`41780992206`](https://github.com/kudzimusar/htp-zw/actions/runs/41780992206) (`UI-02 Phase 6A Native Cross-Device Evidence`, `run_attempt: 2`)
- **Upstream Certification Jobs (All 5 `SUCCESS`):**
  - `Phase 6A contract + frozen Reader regressions`: Job `126429759091` (`SUCCESS`)
  - `Android phone real emulator evidence`: Job `126429708123` (`SUCCESS`, Attempt 1 Artifact `13300262966`, 10,432,924 B)
  - `Android tablet real emulator evidence`: Job `126429708897` (`SUCCESS`, Attempt 1 Artifact `13299844628`, 5,399,359 B)
  - `iOS tablet real simulator evidence`: Job `126429746045` (`SUCCESS`, Attempt 1 Artifact `13301230604`, 17,982,647 B)
  - `iOS phone real simulator evidence`: Job `126429706722` (`SUCCESS` on Attempt 2 retry, Artifact `13303755005`, 33,893,099 B; superseding failed Attempt 1 Artifact `13300298812`)
- **Failed Aggregate Job:** `aggregate exact-head native evidence` (Job `126442613997`, Attempt 2 Artifact `13303285803`)

### B. Proven Root Cause (`UI02_AGGREGATE_MIXED_ATTEMPT_ARTIFACT_SELECTION_DEFECT`)
1. On Attempt 2 of Run `41780992206`, GitHub Actions reran only the failed `iOS phone` job and the downstream `aggregate exact-head native evidence` job.
2. The three device cells that already passed in Attempt 1 retained their Attempt-1 artifact names (`ui02-phase6a-native-evidence-android-phone-attempt-1`, `ui02-phase6a-native-evidence-android-tablet-attempt-1`, `ui02-phase6a-native-evidence-ios-tablet-attempt-1`) and `runAttempt: 1` manifest metadata.
3. Because `.github/workflows/ui02-phase6a-native-cross-device.yml` downloaded only `pattern: ui02-phase6a-native-evidence-*-attempt-${{ github.run_attempt }}` (`*-attempt-2`) and filtered for `int(m.get("runAttempt",-1))==current_attempt`, only `ui02-phase6a-native-evidence-ios-phone-attempt-2` (`13303755005`) was included. The aggregate job rightly refused to certify an incomplete 1-of-4 matrix and exited nonzero at Step 8 (`Enforce complete required native matrix`).

### C. Engineering Repair & 10-Scenario Regression Suite
1. **Cross-Attempt Same-Run Exact-SHA Aggregator ([`scripts/native/ui02-phase6a-aggregate.mjs`](../../../scripts/native/ui02-phase6a-aggregate.mjs)):**
   - Discovers all per-cell artifacts across attempts of the same workflow run (`pattern: ui02-phase6a-native-evidence-*-attempt-*`).
   - Validates exact `candidateSha`, `workflowRunId`, `platform`, `deviceClass`, `runAttempt` bounds (`1..currentAttempt`), required screen sets (`22` phone / `6` tablet), PNG headers and geometry, and zero actionable native runtime errors (`nativeRuntimeErrorLineCount === 0` and empty `native-errors.log`).
   - Selects the latest valid and successful attempt per required device cell, superseding earlier failed attempts while failing closed if a higher attempt for the same cell failed, if same-attempt duplicates/conflicts exist, if any cell is missing/corrupted/mismatched, or if the Phase 6A contract gate did not succeed.
   - Emits a provenance-preserving aggregate `manifest.json` recording `workflowRunId`, `sourceAttempts`, `selectedCells` (with `sourceAttempt`, `jobId`, `artifactId`, `manifestSha256`, `screenshotChecksums`), and `excludedArtifacts`.
2. **Deterministic 10-Scenario Regression Suite ([`tests/harness/ui02-phase6a-aggregation.test.mjs`](../../../tests/harness/ui02-phase6a-aggregation.test.mjs)):**
   - Scenario 1: All four cells from attempt 1 — `PASS`.
   - Scenario 2: Three valid attempt-1 cells plus one successful attempt-2 retry — `PASS`.
   - Scenario 3: Later successful retry supersedes earlier failed attempt of the same cell — `PASS`.
   - Scenario 4: Missing device artifact — `BLOCK`.
   - Scenario 5: Invalid or corrupted artifact — `BLOCK`.
   - Scenario 6: Different commit SHA — `BLOCK`.
   - Scenario 7: Unrelated workflow run — `BLOCK`.
   - Scenario 8: Duplicate or conflicting device evidence without deterministic resolution — `BLOCK`.
   - Scenario 9: Nonzero actionable runtime-error result — `BLOCK`.
   - Scenario 10: Incomplete or failed contract gate — `BLOCK`.
