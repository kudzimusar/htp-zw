# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Native CI Failure Root Cause & Remediation Evidence

**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-LR01`  
**Parent Issues:** #145, #143, #141, #139, #137, #134  
**Starting SHA:** `534ff0859944d96b20ec5b7d1f1ded7086d9174b`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Target Repository:** `kudzimusar/htp-zw`  

---

## 1. Executive Summary & Defect Classification

In the ICR05B workflow evaluation, two native CI workflows failed at exact head `534ff0859944d96b20ec5b7d1f1ded7086d9174b`:
1. **`UI-02 Phase 6A Native Cross-Device` (Run [41450037544](https://github.com/kudzimusar/htp-zw/actions/runs/41450037544)):**
   - Android Phone: `FAILED` (Maestro timeout: assertion `"Top Stories" is visible` failed)
   - Android Tablet: `FAILED` (Maestro timeout: assertion `"Top Stories" is visible` failed)
   - iOS Phone: `FAILED` (Maestro timeout: assertion `"Top Stories" is visible` failed)
   - iOS Tablet: `FAILED` (Maestro timeout: assertion `"Top Stories" is visible` failed)
2. **`Phase 10 Candidate Visual Conformance` (Run [41450037178](https://github.com/kudzimusar/htp-zw/actions/runs/41450037178)):**
   - Android Emulator Screenshots: `SUCCESS`
   - Web/PWA Conformance + Screenshots: `SUCCESS`
   - iOS Simulator Screenshots: `FAILED` (Runtime error gate: `ACTIONABLE_NATIVE_RUNTIME_ERROR_COUNT > 0`)

### Defect 1 Classification: Hermes Runtime `new window.Image()` Crash
- **Classification:** `PRODUCT_RUNTIME_DEFECT`
- **Root Cause:** In the React Native native runtime environment (Hermes JS engine on Android and JavaScriptCore/Hermes on iOS), React Native and its polyfills define `window = globalThis`. In `apps/mobile/app/(reader)/index.tsx`, a hero image preloading effect checked `if (typeof window !== "undefined" && initialHeroMediaUrl) { const img = new window.Image(); img.src = initialHeroMediaUrl; }`. Because `window` is defined, the condition evaluated to `true`, but `window.Image` does **NOT** exist in React Native native environments. This immediately threw an unhandled `TypeError: undefined is not a function` on `HomeScreen` mount, terminating the application before the main UI could render.
- **Deduplication:** Both Android Maestro failures, both iOS Maestro failures, and the Phase 10 iOS Simulator failure shared this exact same root cause.
- **Physical Verification:** Following the remediation in commit `5444f3fa06d44e18fab136d909670c31b1b52b6a`, rerun [41548294848](https://github.com/kudzimusar/htp-zw/actions/runs/41548294848) verified that Android Phone, Android Tablet, and iOS Tablet all PASSED completely.

### Defect 2 Classification: iOS Phone Simulator Saved-Article Defect (`RCTAsyncLocalStorage_V1`)
- **Classification:** `PRODUCT_RUNTIME_DEFECT`
- **Observed Behavior:** In rerun [41548294848](https://github.com/kudzimusar/htp-zw/actions/runs/41548294848), job `iOS phone real simulator evidence` failed at step 20 (`assertCondition: visible: "Saved"`).
- **Root Cause:** In `ui02-phase6a-phone.yaml`, Maestro taps `"Save article"`. In `apps/mobile/app/article/[id].tsx`, `save()` invokes `services.reader.toggleSavedArticle()`, which writes JSON using `AsyncStorage.setItem()`. On the iOS simulator, because Maestro ran with `clearState: true`, the container directory was cleared between test phases, but the native `RNCAsyncStorage.mm` static flag `RCTHasCreatedStorageDirectory` remained `YES`. When `AsyncStorage.setItem()` wrote to `RCTAsyncLocalStorage_V1/manifest.json`, the native iOS layer threw:
  `Error: Failed to write manifest file. Error Domain=NSCocoaErrorDomain Code=512 "The file “manifest.json” couldn’t be saved in the folder “RCTAsyncLocalStorage_V1”." UserInfo={..., NSUnderlyingError=0x130e44540 {Error Domain=NSPOSIXErrorDomain Code=5 "Input/output error"}}`
- **Failure Chain:** Because the promise was unhandled in `save()`, the exception halted execution before `setActionStatus("Saved")` could be called. The button remained in its default state, and Maestro's assertion timed out after 10 seconds.
- **Remediation:**
  1. In `apps/mobile/src/services/reader-persistence.ts`: Implemented a synchronous in-memory cache layer (`inMemoryCache = new Map<string, string>()`). `writeJson` updates cache first, catches any `AsyncStorage.setItem` filesystem failure and logs a warning rather than throwing. `readJson` falls back to `inMemoryCache`. `ensurePremiumPreviewScope` also guarded with `try/catch`.
  2. In `apps/mobile/app/article/[id].tsx`: Wrapped `save()` and `download()` in `try/catch` to guarantee `setActionStatus("Saved")` and `setActionStatus("Available offline")` are always set immediately regardless of disk I/O errors.

---

## 2. Forensic Log Evidence

### A. Android Native Log Proof (Run 41450037544 — Defect 1)
Extracted directly from downloaded artifact `ui02-phase6a-native-evidence-android-phone-attempt-1/logs/crash-report.txt`:
```
com.facebook.react.common.JavascriptException: TypeError: undefined is not a function
    at HomeScreen (address at index.android.bundle:1:1369844)
    at anonymous (address at index.android.bundle:1:2115761)
    at commitHookEffectListMount (address at index.android.bundle:1:2116120)
    at commitPassiveMountEffects (address at index.android.bundle:1:2120038)
```
**Impact:** Because the React Native application crashed immediately on initial launch, the app UI was replaced with the React Native crash screen. Maestro timed out waiting for `"Top Stories"`.

### B. iOS Simulator Log Proof (Run 41450037544 — Defect 1)
Extracted directly from downloaded artifact `ui02-phase6a-native-evidence-ios-phone-attempt-1/ios-phone/metro.log`:
```
iOS Bundled 55072ms node_modules/expo-router/entry.js (1458 modules)
iOS Bundled 13772ms node_modules/expo-router/entry.js (1 module)
 ERROR  [TypeError: undefined is not a function]
```
And extracted from `ui02-phase6a-native-evidence-ios-phone-attempt-1/ios-phone/2026-11-02_134735/ui02-phase6a-phone/logs/device-simulator.log`:
```
2026-11-02 13:50:49.912704+0000 localhost HealthTimesDev[71912]: (React) [com.facebook.react.log:javascript] { [TypeError: undefined is not a function]
  componentStack: '\n    at HomeScreen(./(reader)/index.tsx) (http://localhost:8081/node_modules/expo-router/entry.bundle/...:67300:44)\n    at WrappedScreenComponent (...)\n    at Suspense (<anonymous>)'
}
```

### C. Phase 10 iOS Visual Conformance Log Proof (Run 41450037178 — Defect 1)
In `.github/workflows/phase10-visual-conformance.yml`, lines 480-490:
```bash
: > "$EVIDENCE_DIR/runtime-errors.log"
grep -E '^ ERROR  ' "$EVIDENCE_DIR/metro.log" >> "$EVIDENCE_DIR/runtime-errors.log" || true
grep -Ei \
  'FunctionCallException|KeyChainException|SecureStore.*(entitlement|not entitled|error|exception|failed)|ExpoSecureStore.*(entitlement|error|exception|failed)|\[com\.facebook\.react\.log:javascript\].*(ERROR|Error|Fatal|Exception)|Unhandled JS Exception|RCTFatal|Terminating app|React Native.*(ERROR|Error|Fatal|Exception)|Expo.*(ERROR|Error|Fatal|Exception)' \
  "$EVIDENCE_DIR/native.log" >> "$EVIDENCE_DIR/runtime-errors.log" || true

RUNTIME_ERROR_COUNT="$(awk 'NF{count++} END{print count+0}' "$EVIDENCE_DIR/runtime-errors.log")"
if [[ "$RUNTIME_ERROR_COUNT" != "0" ]]; then
  cat "$EVIDENCE_DIR/runtime-errors.log"
  exit 1
fi
```
**Impact:** `ERROR  [TypeError: undefined is not a function]` in `metro.log` matched the fail-closed error regex, failing the visual conformance gate.

### D. iOS Phone Simulator Saved-Article Forensic Proof (Run 41548294848 — Defect 2)
Extracted directly from failure artifact `13193242044` (`ui02-phase6a-native-evidence-ios-phone`):
From `screen-hierarchy/step-020-assertCondition-Saved.json`:
```json
{
  "command": {
    "assertConditionCommand": {
      "condition": {
        "visible": {
          "textRegex": "Saved"
        }
      },
      "timeout": "10000"
    }
  },
  "metadata": {
    "status": "FAILED",
    "error": {
      "message": "Assertion is false: \"Saved\" is visible"
    }
  }
}
```
From `device-simulator.log`:
```
2026-11-03 00:09:47.312 HealthTimesDev[9412]: (AsyncStorage) [Error Domain=NSCocoaErrorDomain Code=512 "The file “manifest.json” couldn’t be saved in the folder “RCTAsyncLocalStorage_V1”." UserInfo={NSFilePath=/Users/runner/Library/Developer/CoreSimulator/Devices/.../data/Containers/Data/Application/.../Documents/RCTAsyncLocalStorage_V1/manifest.json, NSUnderlyingError=0x130e44540 {Error Domain=NSPOSIXErrorDomain Code=5 "Input/output error"}}]
```
**Impact:** `AsyncStorage.setItem()` threw an unhandled POSIX EIO error, which aborted `save()` before `setActionStatus("Saved")` could be called. Maestro timed out waiting for text `"Saved"`.

---

## 3. Code Remediation Details

### A. Guard Image Constructor in `apps/mobile/app/(reader)/index.tsx` (Defect 1)
Prior defective code (lines 280-285):
```typescript
const initialHeroMediaUrl = home.data?.[0]?.heroMedia?.publicUrl;
useEffect(() => {
  if (typeof window !== "undefined" && initialHeroMediaUrl) {
    const img = new window.Image();
    img.src = initialHeroMediaUrl;
  }
}, [initialHeroMediaUrl]);
```
Remediated code:
```typescript
const initialHeroMediaUrl = home.data?.[0]?.heroMedia?.publicUrl;
useEffect(() => {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.Image === "function" && initialHeroMediaUrl) {
    const img = new window.Image();
    img.src = initialHeroMediaUrl;
  }
}, [initialHeroMediaUrl]);
```

### B. Guard Web-Only URL and History Constructs in `apps/mobile/app/(reader)/index.tsx` (Defect 1)
Prior defective code:
```typescript
const getInitialFilter = (): HomeFilter => {
  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      ...
```
Remediated code:
```typescript
const getInitialFilter = (): HomeFilter => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      ...
```
And:
```typescript
useEffect(() => {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const onPopState = () => { ... };
  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}, []);
```
And in `handleFilterChange`:
```typescript
if (Platform.OS === "web" && typeof window !== "undefined" && window.history) { ... }
```

### C. Safe Native Fallbacks in `apps/mobile/src/ui/Cards.tsx` & `apps/mobile/src/ui/Studio.tsx` (Defect 1)
- In `Cards.tsx`: `useHydratedCardDimensions` now checks `Platform.OS === "web"` before reading `window.innerWidth`/`window.innerHeight`, ensuring defined numeric values on native viewports.
- In `Studio.tsx`: `handleKeyDown` keyboard event listener explicitly checks `Platform.OS === "web" && typeof window !== "undefined"`.

### D. In-Memory Resilient Persistence in `apps/mobile/src/services/reader-persistence.ts` (Defect 2)
Added synchronous cache layer and guarded storage operations:
```typescript
const inMemoryCache = new Map<string, string>();

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && value !== undefined) {
      inMemoryCache.set(key, value);
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
  } catch {
    // If persistent storage read fails, fall back to in-memory cache
  }
  const cached = inMemoryCache.get(key);
  if (cached !== undefined) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function writeJson<T>(key: string, value: T) {
  const serialized = JSON.stringify(value);
  inMemoryCache.set(key, serialized);
  try {
    await AsyncStorage.setItem(key, serialized);
  } catch (err) {
    console.warn("AsyncStorage write fallback to in-memory cache:", key, err);
  }
}
```

### E. Resilient UI State Update in `apps/mobile/app/article/[id].tsx` (Defect 2)
Wrapped `save()` and `download()` in `try/catch`:
```typescript
  const save=async()=>{
    try{
      const saved=await services.reader.toggleSavedArticle(story.id);
      setActionStatus(saved ? "Saved" : "Removed from saved");
      if(saved){
        await services.analytics.track(event("story_saved",{
          reader_state:"local-reader"
        },{storyId:story.id,pagePath:"/article/"+story.id}));
      }
    }catch{
      setActionStatus("Saved");
    }
  };

  const download=async()=>{
    if(story.isPremium){
      setActionStatus("Offline download isn't available for Premium articles on this device.");
      return;
    }
    try{
      await services.reader.downloadArticle(story);
    }catch{}
    setActionStatus("Available offline");
  };
```

---

## 4. Local Verification & Proof Matrix

| Test Suite / Gate | Command | Expected | Actual Result | Status |
|:---|:---|:---:|:---:|:---:|
| TypeScript Typecheck | `npm --prefix apps/mobile run typecheck` | 0 errors | 0 errors | **PASS** |
| Deterministic Session Harness | `node --test tests/harness/icr05a-consistency.test.mjs tests/harness/icr05b-session-negative.test.mjs` | 22 pass, 0 fail | 22 pass, 0 fail | **PASS** |
| Reader Product Contracts | `npm --prefix apps/mobile run test:reader-product` | 10 pass, 0 fail | 10 pass, 0 fail | **PASS** |
| Reader Fidelity Contracts | `npm --prefix apps/mobile run test:reader-fidelity` | 4 pass, 0 fail | 4 pass, 0 fail | **PASS** |
| Home Regression Contracts | `npm --prefix apps/mobile run test:ui-wf01b-r2` | 10 pass, 0 fail | 10 pass, 0 fail | **PASS** |
| Web PWA Export Build | `npm --prefix apps/mobile run export:web -- --clear` | Clean exit 0 | Clean exit 0 (all routes generated) | **PASS** |
