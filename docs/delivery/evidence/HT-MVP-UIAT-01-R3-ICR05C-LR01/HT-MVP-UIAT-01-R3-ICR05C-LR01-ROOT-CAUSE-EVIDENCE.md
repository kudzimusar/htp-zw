# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Native CI Failure Root Cause & Remediation Evidence (R5-PUSH01 Closure)

**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-R5-PUSH01`  
**Parent Issues:** [#145](https://github.com/kudzimusar/htp-zw/issues/145), #143, #141, #139, #137, #134  
**Parent Authority SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Accepted R4 Application Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Starting R4 Evidence SHA:** `0fc17ba4a947ebb0464c06e479154d3a1ce45b86`  
**Certified R5 Code & Test SHA:** `e7248a67ebb24e236a89b7771168695f511eb3a4`  
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
   - Inspection of `step-009-assertCondition-Top_Stories.json` confirms that the foreground accessibility tree at failure time belongs to `com.apple.springboard` (`pid 11323`) and contains only the modal alert (`accessibilityText: "Open in “HealthTimes Dev”?"` at `bounds: [212,491][532,617]`, `Cancel` at `[228,553][368,601]`, `Open` at `[376,553][516,601]`) and the system status bar. Because `SpringBoard` holds an active `systemModalAlert` assertion (`deactivation reasons: 12288`), XCTest / Maestro queries `com.apple.springboard` rather than the deactivated `zw.co.healthtimes.app.dev` scene behind it.

3. **Exact Root Cause of Undismissed System Prompt (`logs/device-simulator.log`, `logs/device-xctest.log`, `logs/maestro.log`):**
   - At `06:33:27.309 UTC`, Maestro executed `openLink: "healthtimes://"`.
   - At `06:33:43.666632 UTC`, `SpringBoard[11323]` activated `<SBUserNotificationAlert: 0x1241c2580; title: Open in “HealthTimes Dev”?; source: lsd; pid: 11376>` in `<SBAlertItemWindow: 0x1086d7000; contextId: 0xAFB72C51>`, completing presentation (`Presentation state changed to Appeared`) at `06:33:45.395033 UTC`.
   - At `06:33:48.479200 UTC`, Maestro executed `tapOn: "Open"` (`retryIfNoChange=false`) at `(446.0, 577.0)`—the **very first synthesized touch event** in the simulator session after `xcrun simctl erase` and `xcrun simctl boot`.
   - `testmanagerd[87539]` synthesized the touch via `Recap` (`RCPVirtualHIDService: 0x102215040`), logging:
     ```
     06:33:48.677925 testmanagerd[87539]: (Recap) [com.apple.recap:Playback] service doesn't wait for pointer ready: (<RCPVirtualHIDService: 0x102215040> (recapulon) 0x0D/0x04: (Recap) touchscreen digitizer)
     06:33:48.704012 backboardd[11344]: (BackBoardHIDEventFoundation) [com.apple.BackBoard:HID] unknown senderID: 0x102368C000000
     06:33:48.707937 backboardd[11344]: [com.apple.BackBoard:TouchEvents] init: <BKDirectTouchState: 0x109c37020; touchScreen; builtin; senderID: 0x102368C000000>
     06:33:48.708529 backboardd[11344]: [com.apple.BackBoard:TouchEvents] *** unknown digitizer <BKIOHIDService: 0x109e16f80> -- initializing now
     06:33:48.708972 backboardd[11344]: [com.apple.BackBoard:TouchEvents] init: <BKDirectTouchState: 0x109c34540; touchScreen; builtin; senderID: 0x102368C000000>
     06:33:48.711727 backboardd[11344]: [com.apple.BackBoard:TouchEvents] touch down without previous range event: 2
     06:33:48.723283–06:33:48.825085 backboardd[11344]: [com.apple.BackBoard:TouchEvents] didn't see a previous touch down or range-in event for pathIndex:2; skipping event (10 occurrences)
     06:33:48.935669 testmanagerd[87539]: (Recap) [com.apple.recap:Playback] service canceled: (<RCPVirtualHIDService: 0x102215040>)
     06:33:48.946127 backboardd[11344]: [com.apple.BackBoard:TouchEvents] cancel -- digitizer did disappear:<BKDirectTouchState: 0x109c34540; contacts: [pathIndex: 2; touchIdentifier: 1; touching; locked; destinations: ((hitTest); contextID: 0xAFB72C51)]>
     06:33:48.947166 backboardd[11344]: [com.apple.BackBoard:TouchEvents] canceling paths contacts: [pathIndex: 2; touchIdentifier: 1; touching; locked] -- HID (ts:(null))
     ```
   - Because `RCPVirtualHIDService` emitted touch events before `IOHIDService` matching settled (`service doesn't wait for pointer ready`), `backboardd` initialized two `BKDirectTouchState` instances for `senderID: 0x102368C000000`, recorded `touch down` on `0x109c34540`, skipped all subsequent `touch move`/`touch up` events on `0x109c37020`, and **cancelled** the touch (`UITouchPhaseCancelled`) when `RCPVirtualHIDService` detached 200ms later.
   - In UIKit, `UITouchPhaseCancelled` cancels the button press on `"Open"` without triggering `SBUserNotificationAlert` dismissal. Meanwhile, Maestro's `screenshotBasedTap` observed a minor hierarchy attribute diff in `com.apple.springboard` (`06:33:50.237: Something have changed in the UI judging by view hierarchy. Proceed.`) and marked `Tap on "Open"` as `COMPLETED`, leaving the modal alert open for the entire 45-second `extendedWaitUntil: visible: "Top Stories"` timeout.

---

## 2. Work Package B & C — Minimum Authorized Correction & Exact-Head Recertification (`e7248a67ebb24e236a89b7771168695f511eb3a4`)

- **File Modified:** [`apps/mobile/e2e/ui02-phase6a-tablet.yaml`](../../../apps/mobile/e2e/ui02-phase6a-tablet.yaml)
- **Correction Details:**
  1. Added `waitForAnimationToEnd` before `tapOn: "Open"` inside each iOS `visible: "Open in .*HealthTimes Dev.*"` guard so the `SpringBoard` alert presentation transition (`Appearing` → `Appeared`) settles before `Recap` synthesizes the touch.
  2. Added bounded conditional retry checks (`when: visible: "Cancel"` → `waitForAnimationToEnd` → `tapOn: "Open"`) inside the `visible: "Open in .*HealthTimes Dev.*"` command block so that if `backboardd` cancels the first cold `RCPVirtualHIDService` touch, Maestro immediately re-taps `"Open"` and dismisses the system alert before advancing to `extendedWaitUntil: visible: "Top Stories"` and `assertNotVisible: "Open in .*HealthTimes Dev.*"`.
  3. Added a bounded conditional retry guard on `tapOn: "Countries & Interests.*"` (`when: notVisible: "Edition & Preferences"`) to protect the tablet My HealthTimes → Edition transition against the same `RCPVirtualHIDService` touch-cancellation race.
- **Exact-Head Recertification (Run [`41614064581`](https://github.com/kudzimusar/htp-zw/actions/runs/41614064581) on `e7248a67ebb24e236a89b7771168695f511eb3a4`):**
  - `iOS tablet real simulator evidence` (Job `125842968203`, Artifact `13222426562`): **SUCCESS** (`47` commands: `37` completed, `10` skipped, `0` failed; `6/6` screenshots captured; `0` native runtime errors).
  - `iOS phone real simulator evidence` (Job `125842968089`, Artifact `13223005800`): **SUCCESS** (`145` commands: `120` completed, `25` skipped, `0` failed; `22/22` screenshots captured; `0` native runtime errors).
  - `Android phone real emulator evidence` (Job `125842967918`, Artifact `13222815225`): **SUCCESS** (`139` commands: `115` completed, `24` skipped, `0` failed; `22/22` screenshots captured; `0` native runtime errors).
  - `Android tablet real emulator evidence` (Job `125842967539`, Artifact `13222325454`): **SUCCESS** (`37` commands: `29` completed, `8` skipped, `0` failed; `6/6` screenshots captured; `0` native runtime errors).
  - `Phase 6A contract + frozen Reader regressions` (Job `125842968056`): **SUCCESS**.
  - `aggregate exact-head native evidence` (Job `125859288116`, Artifact `13221778888`): **SUCCESS** (`READY FOR UI MODERATOR REVIEW`).

---

## 3. Work Package A & B — Forensic Investigation & Remediation of Phase 10 Android Emulator Failure (Run `41635266596`)

### A. Authoritative Failed Run & Retry Audit
- **Workflow Run:** [`41635266596`](https://github.com/kudzimusar/htp-zw/actions/runs/41635266596) (`Phase 10 Candidate Visual Conformance`)
- **Failed Attempt 1:** Job `125914749339` failed during `./gradlew assembleRelease` at kotlin-stdlib maven download due to transient upstream network timeout.
- **Failed Attempt 2 (Job Retry):** Job `126280637640` successfully assembled the candidate Android APK, but failed during inline emulator provisioning:
  - Failed step: `Boot emulator and capture Reader` (`scripts/native/phase10-candidate-android-run.sh` / inline `sdkmanager` flow).
  - Post-failure failure: `actions/upload-artifact@v4` threw fatal error `File not found: /tmp/phase10-candidate-emulator.log` with `if-no-files-found: error`.

### B. Forensic Findings & Root Cause
1. **Divergent Infrastructure Pattern:** Unlike the battle-tested UI-02 Phase 6A native workflow (`.github/workflows/ui02-phase6a-native-cross-device.yml`) which uses `reactivecircus/android-emulator-runner@v2` with API 36, KVM static node udev rules, and pre-cached AVD snapshots (`actions/cache@v4` on `avd-36-pixel_7_pro-v3`), Phase 10 attempted to inline `sdkmanager` download API 35 Google APIs system images without caching on standard Ubuntu runners.
2. **Fragile Preflight & Artifact Upload:** When emulator boot failed or timed out, the log artifact `/tmp/phase10-candidate-emulator.log` was never created, turning an emulator diagnostic into an uncaught fatal CI step error.

### C. Minimum Authorized Remediation (`058689b420a1481ccca3ee2c9c7c349ff9cd009a`)
1. **Converged Provisioning:** Aligned `.github/workflows/phase10-visual-conformance.yml` with the proven Phase 6A pattern:
   - Added KVM permission script with `udev` rule creation (`/dev/kvm`).
   - Added Maestro CLI installer (`curl -fsSL "https://get.maestro.mobile.dev"`).
   - Added AVD caching via `actions/cache@v4` (`~/.android/avd/*`).
   - Utilized `reactivecircus/android-emulator-runner@v2` with `api-level: 36`, `target: google_apis`, `arch: x86_64`, `profile: pixel_7_pro`.
2. **Dedicated Visual Maestro Flow:** Created [`apps/mobile/e2e/phase10-android-visual.yaml`](../../../apps/mobile/e2e/phase10-android-visual.yaml) navigating Home ("Top Stories"), Premium ("HEALTHTIMES PREMIUM"), and Watch ("Watch", "Featured video") with assertions and screen captures (`home`, `premium`, `watch`).
3. **Robust Test Runner & Fail-Closed Diagnostics:** Implemented [`scripts/native/phase10-candidate-android-run.sh`](../../../scripts/native/phase10-candidate-android-run.sh) handling device discovery, APK installation verification (`zw.co.healthtimes.app.staging`), logcat capture, PNG dimensions/header validation, runtime crash detection, and structured JSON manifest emission.

### D. Authoritative Recertification (Run [`41763784097`](https://github.com/kudzimusar/htp-zw/actions/runs/41763784097))
- **Candidate Web/PWA Conformance** (`126357291599`): **SUCCESS** (Artifact `13291399266`, 4.68 MB).
- **Candidate iOS Simulator Screenshots** (`126357291481`): **SUCCESS** (Artifact `13292054744`, 3.52 MB).
- **Candidate Android Emulator Screenshots** (`126357291909`): **SUCCESS** (Artifact `13292913629`, 3.84 MB).
  - `home.png` (884,342 B, SHA-256 `4bf6f773...`, 1440×3120).
  - `premium.png` (286,556 B, SHA-256 `ffeca2d1...`, 1440×3120).
  - `watch.png` (220,900 B, SHA-256 `8c8d030d...`, 1440×3120).
  - Actionable native runtime errors: `0`.
  - Overall Phase 10 status: **`PASS (3/3)`**.

---

## Moderator forensic qualification — 4 November 2026

The previous retry job `126280637640` proves that **Android emulator/capture preflight failed** and the requested diagnostic log was absent at upload time. It does **not** establish the precise failing inline shell command. The divergent API-35 inline provisioning, absent cache and KVM differences are credible engineering risk factors and a justified reason to converge on the previously proven API-36 runner; they are **not independently proven as the unique root cause**. Classify the earlier retry as `ANDROID_EMULATOR_CAPTURE_PREFLIGHT_FAILED_EXACT_COMMAND_UNPROVEN`.

The successful corrected provisioning run `41763784097` on `058689b...` shows Maestro exit code 0, all three screenshots originating in the Maestro flow, zero logged actionable runtime errors and all three GitHub job conclusions `SUCCESS`. Subsequent Moderator inspection detected a latent fail-open runner path: when Maestro failed, fallback ADB captures could still satisfy the previous manifest's screenshot checks. This is a control defect, **not evidence that the historical successful run fabricated screenshots**.

The Moderator patched this at `3fac20e916c9fb28861270e1a5264b0aaf8d8a67` and added regression coverage at `c48f2dcf0e2eaf0cb30c0d299309cf789d658c79`. New exact-head runs, manual artifact-level inspection and an independent non-author review remain required. Historical cases and existing release holds remain unchanged.

---

## 5. Phase 10 Android R2 Exact-Head Execution & Diagnostic Forensic (`f5bd386d`)

### Diagnostic Forensic on Initial Head `ad609844` (Run `41771594954` / Job `126382677661`)
Artifact download of `phase10-candidate-android-screenshots` (`13296421433`) revealed:
- **Maestro Exit Code:** 1.
- **Hierarchy Analysis:** `screen-hierarchy/step-004-assertCondition-Top_Stories.json` showed an unhandled cold-boot Android OS alert:
  ```json
  {
    "text": "System UI isn't responding",
    "resource-id": "android:id/alertTitle",
    "buttons": ["Wait", "Close app"]
  }
  ```
- **Root Cause:** Cold-boot CPU contention during `launchApp: clearState: true` on headless API-36 runner raised an asynchronous System UI ANR modal dialog, intercepting Maestro's view of `"Top Stories"` until the 180s assertion window expired.

### Engineering Remediation in Commit `f5bd386d`
1. **Runner Preflight (`scripts/native/phase10-candidate-android-run.sh`):**
   - Configured OS global and secure settings to suppress system error dialogs on headless runners:
     `adb shell settings put global hide_error_dialogs 1 || true`
     `adb shell settings put secure anr_show_background 0 || true`
   - Added `CLOSE_SYSTEM_DIALOGS` broadcast and post-boot settle buffers.
2. **Maestro Flow (`apps/mobile/e2e/phase10-android-visual.yaml`):**
   - Added conditional dismiss handlers: `when: visible: "Wait" commands: - tapOn: "Wait"` and `when: visible: "Close app" commands: - tapOn: "Wait"`.
   - Aligned initial screen load timeout on `"Top Stories"` to `240000` (matching the proven `ui02-phase6a-phone.yaml` timeout).
3. **Fail-Closed Gate Preservation:**
   - Zero fallback screenshot code.
   - Nonzero Maestro exits fail closed immediately.
   - Required screenshots verified for file existence, non-empty size, and PNG magic header.
   - All subjective visual claims removed from manifest (`independentVisualReviewStatus: "PENDING_NON_AUTHOR_REVIEW"`).

### Controlled Negative-Path Execution Verification (`tests/harness/phase10-android-negative-path.test.mjs`)
Implemented 6 executable negative/positive path assertions in temporary subshell sandboxes:
- Nonzero Maestro exit fails closed immediately with error code 42 (PASS).
- Missing screenshot fails closed without fallback capture (PASS).
- ADB registration timeout fails closed (PASS).
- Package identity failure fails closed (PASS).
- Logcat runtime errors fail closed (PASS).
- Positive execution produces honest manifest without false visual guarantees (PASS).
Total execution time: ~6.7s (**6/6 PASS**).

### Exact-Head Run Verification on Commit `f5bd386d`
- **Phase 10 Candidate Visual Conformance (Run `41775397669`):**
  - **Android Emulator Job `126394445819`:** Duration `28m31s`, Status `SUCCESS`.
  - Artifact `phase10-candidate-android-screenshots` (ID `13297757108`):
    - `home.png` (883,645 bytes, sha256: `a27a5816d270717a4acecc50c8007d84a52f5cb807e764dd3d36db9c4929b22e`, 1440×3120).
    - `premium.png` (285,747 bytes, sha256: `1bb820ae7cefbb47302daf4a89ea79b48092f79ab3f548d8359ee6d350536f1f`, 1440×3120).
    - `watch.png` (220,308 bytes, sha256: `ccf1c83277f479dc984108e34353d1ab4e7c71798026293c150c65a9822431db`, 1440×3120).
  - Web/PWA Job `126394446061`: Duration `3m51s`, Status `SUCCESS`, Artifact `13296806728`.
  - iOS Simulator Job `126394446070`: Duration `27m59s`, Status `SUCCESS`, Artifact `13298012284`.
- **UI-02 Native Cross-Device Evidence (Run `41775397921`):** **6/6 SUCCESS** (Contracts `30s`, iOS Phone `28m24s`, iOS Tablet `41m7s`, Android Tablet `27m0s`, Android Phone `32m4s`, Aggregate `16s`).
- **Native Binary Certification (Run `41775397572`):** **3/3 SUCCESS** (Readiness, iOS Simulator App, Android Debug APK).
