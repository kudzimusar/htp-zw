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

### Defect Classification
- **Classification:** `PRODUCT_RUNTIME_DEFECT`
- **Root Cause:** In the React Native native runtime environment (Hermes JS engine on Android and JavaScriptCore/Hermes on iOS), React Native and its polyfills define `window = globalThis`. In `apps/mobile/app/(reader)/index.tsx`, a hero image preloading effect checked `if (typeof window !== "undefined" && initialHeroMediaUrl) { const img = new window.Image(); img.src = initialHeroMediaUrl; }`. Because `window` is defined, the condition evaluated to `true`, but `window.Image` does **NOT** exist in React Native native environments. This immediately threw an unhandled `TypeError: undefined is not a function` on `HomeScreen` mount, terminating the application before the main UI could render.
- **Deduplication:** Both Android Maestro failures, both iOS Maestro failures, and the Phase 10 iOS Simulator failure share this exact same root cause.

---

## 2. Forensic Log Evidence

### A. Android Native Log Proof (Run 41450037544)
Extracted directly from downloaded artifact `ui02-phase6a-native-evidence-android-phone-attempt-1/logs/crash-report.txt`:
```
com.facebook.react.common.JavascriptException: TypeError: undefined is not a function
    at HomeScreen (address at index.android.bundle:1:1369844)
    at anonymous (address at index.android.bundle:1:2115761)
    at commitHookEffectListMount (address at index.android.bundle:1:2116120)
    at commitPassiveMountEffects (address at index.android.bundle:1:2120038)
```
**Impact:** Because the React Native application crashed immediately on initial launch, the app UI was replaced with the React Native crash screen / process termination. Maestro was instructed to wait up to 240 seconds for `"Top Stories"`:
```json
{
  "command": {
    "assertConditionCommand": {
      "condition": {
        "visible": {
          "textRegex": "Top Stories"
        }
      },
      "timeout": "240000"
    }
  },
  "metadata": {
    "status": "FAILED",
    "error": {
      "message": "Assertion is false: \"Top Stories\" is visible"
    }
  }
}
```

### B. iOS Simulator Log Proof (Run 41450037544)
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
**Impact:** The Metro packager served the bundle correctly, and the iOS Simulator launched the application. However, as soon as `HomeScreen` mounted, Hermes threw the exact same unhandled `TypeError: undefined is not a function`, preventing the reader feed from rendering.

### C. Phase 10 iOS Visual Conformance Log Proof (Run 41450037178)
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
**Impact:** `ERROR  [TypeError: undefined is not a function]` in `metro.log` and `[com.facebook.react.log:javascript] { [TypeError: undefined is not a function]` in `native.log` matched the fail-closed error regex. `RUNTIME_ERROR_COUNT` was 1, failing the visual conformance gate.

---

## 3. Code Remediation Details

### A. Guard Image Constructor in `apps/mobile/app/(reader)/index.tsx`
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

### B. Guard Web-Only URL and History Constructs in `apps/mobile/app/(reader)/index.tsx`
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

### C. Safe Native Fallbacks in `apps/mobile/src/ui/Cards.tsx` & `apps/mobile/src/ui/Studio.tsx`
- In `Cards.tsx`: `useHydratedCardDimensions` now checks `Platform.OS === "web"` before reading `window.innerWidth`/`window.innerHeight`, ensuring defined numeric values on native viewports.
- In `Studio.tsx`: `handleKeyDown` keyboard event listener explicitly checks `Platform.OS === "web" && typeof window !== "undefined"`.

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
