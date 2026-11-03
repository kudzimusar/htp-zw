# HT-MVP-UIAT-01-R3-ICR05C-LR01 — Native CI Failure Root Cause & Remediation Evidence

**Unit ID:** `HT-MVP-UIAT-01-R3-ICR05C-R4-LR01`  
**Parent Issues:** #145, #143, #141, #139, #137, #134  
**Starting Remote SHA:** `51d3d5580867564cb11e940b1e9a3e7d40404fd4`  
**Candidate Code SHA:** `fe5669278768c2a5cab44670425fcf05a7a7d1a7`  
**Execution Branch:** `cert/ht-mvp-uiat01-r3-icr05c-final-physical-cert`  
**Target Repository:** `kudzimusar/htp-zw`  

---

## 1. Executive Summary & Defect Classification

Across the ICR05C evaluation and remediation cycle, eight distinct root causes affecting native mobile execution, commercial conformance, security fail-closed semantics, and data integrity were identified, forensic log evidence established, and source remediations implemented:

1. **Defect 1: Hermes Runtime `new window.Image()` Crash (`PRODUCT_RUNTIME_DEFECT`)**
   - **Environment:** React Native Android Emulator (API 34) & iOS Simulator (iOS 17.5).
   - **Root Cause:** In the native React Native environment, `window` is polyfilled as `globalThis`, but `window.Image` does not exist. A hero image preloader in `apps/mobile/app/(reader)/index.tsx` threw an uncaught `TypeError: undefined is not a function`, crashing the application immediately upon mount before `"Top Stories"` could render.
   - **Remediation:** Guarded with `Platform.OS === "web" && typeof window !== "undefined" && typeof window.Image === "function"`. Also guarded `window.history` and `popstate` listeners.
   - **Resolution:** Verified in Phase 10 Visual Conformance run [41557784562](https://github.com/kudzimusar/htp-zw/actions/runs/41557784562) (3/3 SUCCESS: Android, iOS, Web) and UI-02 run [41557784648](https://github.com/kudzimusar/htp-zw/actions/runs/41557784648) (Android phone & Android tablet SUCCESS).

2. **Defect 2: False-Positive In-Memory Reader Persistence (`DATA_INTEGRITY_DEFECT`)**
   - **Environment:** Reader article persistence in `reader-persistence.ts` and `article/[id].tsx`.
   - **Root Cause:** An in-memory cache was introduced to bypass transient disk I/O errors on container resets. This masked failed durable writes to disk, returning false success to callers. In `article/[id].tsx`, catch blocks displayed `"Saved"` and `"Available offline"` even when durable writes failed.
   - **Remediation:** Completely removed `inMemoryCache = new Map<string, string>()`. Storage rejections now strictly throw and propagate. Catch blocks display explicit error statuses (`"Failed to save article"`, `"Offline download failed"`). Premium preview windows fail closed (locked). Added 6 automated tests in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs`.

3. **Defect 3: iOS Simulator Deep-Link Trust Priming & Tablet Row Hit-Testing (`TEST_HARNESS_&_UI_HIT_TEST`)**
   - **Environment:** Maestro native cross-device suite on iOS Simulator (run [41557784648](https://github.com/kudzimusar/htp-zw/actions/runs/41557784648)).
   - **Root Cause (iOS Phone):** On first invocation of a custom scheme (`healthtimes://`), iOS displays an untrusted scheme prompt: `Open in "HealthTimes Dev"?`. Maestro dismissed the prompt, but the deep link was not dispatched to the app. In `ui02-phase6a-tablet.yaml`, this was handled by priming the scheme on Home.
   - **Remediation (iOS Phone):** Added scheme priming to `ui02-phase6a-phone.yaml` after Home screenshot, waiting on `visible: "Search HealthTimes"` to preserve the exact required count of 4 for `visible: "Top Stories"`.
   - **Root Cause (iOS Tablet):** On wide tablet viewports (744px width), a `Pressable` with `flexDirection: "row"` and transparent background fails UIKit hit-testing in the empty space between the left label and right value when tapped at center (`50%,70%`).
   - **Remediation (iOS Tablet):** Added `{backgroundColor: palette.paper}` to the row `Pressable` style in `apps/mobile/app/(reader)/my.tsx`, giving the entire bounding box solid geometry for reliable UIKit hit-testing.
   - **Resolution:** Verified in UI-02 run [41564344855](https://github.com/kudzimusar/htp-zw/actions/runs/41564344855) where iOS phone, iOS tablet, and Android tablet all passed 100%.

4. **Defect 4: Fail-Closed Premium Preview Read Security (`SECURITY_PERSISTENCE_CLOSURE`)**
   - **Environment:** `apps/mobile/src/services/reader-persistence.ts`.
   - **Root Cause:** If `AsyncStorage.getItem` threw an error or the ledger contained corrupt JSON, generic `readJson` swallowed the exception and returned `{}`, which `getPremiumPreviewWindow()` treated as a clean first visit, granting a new preview window. Scope read failure also fell back to generating a new scope.
   - **Remediation:** Introduced `readSecurityJson<T>()` distinguishing `MISSING` (legitimate first visit) from `READ_FAILED` and `CORRUPT`. Read errors and corrupt data strictly fail closed (`null` preview window, `false` prompt request). Scope read failures strictly throw and fail closed. Non-security preferences retain normal fallback resilience.

5. **Defect 5: WordPress External Media HTTP 415 in UI-03 Commercial Conformance (`EXTERNAL_NETWORK_RESILIENCE`)**
   - **Environment:** `apps/mobile/tests/ui03-commercial-reader-evidence.mjs` and `apps/mobile/src/source-parity/snapshot.ts` (Run [41564344813](https://github.com/kudzimusar/htp-zw/actions/runs/41564344813)).
   - **Root Cause:** 5 articles in `sourceParityArticles` had unmirrored image URLs pointing directly to `https://healthtimes.co.zw/wp-content/uploads/...`. During `smoke home`, headless Chrome fetched these images directly from the live remote LiteSpeed server, which returned `415 Unsupported Media Type` to GitHub Actions Azure runner IPs.
   - **Remediation:** Expanded `SOURCE_PARITY_MEDIA_MIRRORS` in `snapshot.ts` to mirror all 7 WordPress media assets to proven Supabase Storage bucket `migrated-media/wordpress/` (which returns HTTP 200 with CORS `*`). Added automatic `/wp-content/uploads/` rewrite in `publicMirrorForSourceMedia()`. Added route interceptors in `ui03-commercial-reader-evidence.mjs` across all pages. Verified 0 console errors and 0 HTTP 415s across all smoke and dark-mode routes.

6. **Defect 6: Android 14 Notification Permission Dialog Intercepting Watch Intent (`TEST_HARNESS_SYSTEM_DIALOG`)**
   - **Environment:** Maestro native suite on Android 14 emulator (`ui02-phase6a-phone.yaml`, Run [41564344855](https://github.com/kudzimusar/htp-zw/actions/runs/41564344855)).
   - **Root Cause:** Step 63 tapped the external YouTube link (`tapOn: text: ".*YouTube.*"`). On Android 14, YouTube launched for the first time and displayed a system modal POST_NOTIFICATIONS permission prompt: `"Allow YouTube to send you notifications? [Don’t allow] [Allow]"`. Maestro `stopApp` stopped only the HealthTimes application, leaving YouTube's permission dialog on top of the screen. When `launchApp` executed, the modal dialog remained in foreground, causing Step 67 (`extendedWaitUntil: visible: "Top Stories"`) to fail.
   - **Remediation:** Added dialog dismissal `runFlow: when: visible: ".*(Don’t allow|Don't allow|Allow).*" commands: - tapOn: text: ".*(Don’t allow|Don't allow).*" optional: true` and Android `back` navigation after the external intent and after `launchApp`.

7. **Defect 7: Present-but-Empty / Whitespace-Only / Partial State Security Bypass (`SECURITY_PERSISTENCE_CLOSURE`)**
   - **Environment:** `apps/mobile/src/services/reader-persistence.ts`.
   - **Root Cause:** Present-but-empty (`""`) or whitespace strings stored in AsyncStorage were categorized as `MISSING` by truthy/falsy checks, causing the system to treat corrupted or cleared security entries as clean first-use visits and grant unauthorized preview resets. Furthermore, partial initialization (e.g., scope exists but ledger is missing, or vice versa) was not guarded.
   - **Remediation:** Updated `readSecurityJson<T>()` so only genuine absence (`null` or `undefined`) is treated as `MISSING`. Any string where `raw.trim() === ""` is strictly `CORRUPT`. Created `getSecurityScope()` to return `CORRUPT` and throw on empty/whitespace scopes. Enforced invariant that partial states strictly fail closed. Covered 17 mandatory negative-path scenarios in `apps/mobile/tests/reader-persistence-fail-closed.test.mjs`.

8. **Defect 8: Unverified Media Path Fabrication and Synthetic Authority Masking (`DATA_INTEGRITY_&_AUTHORITY_VERIFICATION`)**
   - **Environment:** `apps/mobile/src/source-parity/snapshot.ts` and `apps/mobile/tests/ui03-commercial-reader-evidence.mjs`.
   - **Root Cause:** Blindly regex-replacing any `https://healthtimes.co.zw/wp-content/uploads/` URL with a Supabase Storage path created fabricated URLs for assets not present in storage. In addition, synthetic RPC route interception masked live Staging Supabase RPC verification.
   - **Remediation:** Restricted media mirroring strictly to known entries in `SOURCE_PARITY_MEDIA_MIRRORS`, returning `null` for unmapped assets while preserving `heroMedia.sourceProvenance.sourceUrl` for canonical provenance. Removed synthetic RPC route masking to ensure live Staging RPC verification. Added dedicated suite `apps/mobile/tests/source-parity-media-integrity.test.mjs` verifying live HTTP 200, Content-Type, and size for all 7 assets.

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

### B. iOS Simulator Log Proof (Run 41450037544 — Defect 1)
Extracted directly from downloaded artifact `ui02-phase6a-native-evidence-ios-phone-attempt-1/ios-phone/metro.log`:
```
iOS Bundled 55072ms node_modules/expo-router/entry.js (1458 modules)
iOS Bundled 13772ms node_modules/expo-router/entry.js (1 module)
 ERROR  [TypeError: undefined is not a function]
```

### C. iOS Phone Deep-Link Forensic Proof (Run 41557784648 — Defect 3)
In run [41557784648](https://github.com/kudzimusar/htp-zw/actions/runs/41557784648), job `iOS phone real simulator evidence` failed at step 9:
```yaml
- openLink: healthtimes://search
- assertVisible:
    textRegex: "Search HealthTimes"
    timeout: 10000
```
Maestro error output:
```
Assertion is false: "Search HealthTimes" is visible
```
System logs confirmed iOS CoreSimulator displayed:
`Notice: Open in "HealthTimes Dev"? [Cancel] [Open]`
Because the scheme was not yet trusted/primed in the simulator session, the first openLink command consumed the authorization dialog without navigating.

---

## 3. Code Remediation Details

### A. Guard Image Constructor in `apps/mobile/app/(reader)/index.tsx` (Defect 1)
```typescript
const initialHeroMediaUrl = home.data?.[0]?.heroMedia?.publicUrl;
useEffect(() => {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.Image === "function" && initialHeroMediaUrl) {
    const img = new window.Image();
    img.src = initialHeroMediaUrl;
  }
}, [initialHeroMediaUrl]);
```

### B. Durable Fail-Closed Persistence & Security Closure in `reader-persistence.ts` (Defects 2, 4, 7)
```typescript
async function readSecurityJson<T>(key: string): Promise<SecurityReadResult<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (err) {
    return {
      status: "READ_FAILED",
      error: err instanceof Error ? err : new Error(String(err))
    };
  }

  // A1: Only genuine absence (null or undefined) is MISSING
  if (raw === null || raw === undefined) {
    return { status: "MISSING", data: null };
  }

  // A1: Present-but-empty or whitespace-only is CORRUPT, not MISSING
  if (typeof raw !== "string" || raw.trim() === "") {
    return {
      status: "CORRUPT",
      error: new Error(`Security payload for ${key} is empty or whitespace-only`)
    };
  }

  try {
    const parsed = JSON.parse(raw) as T;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { status: "VALID", data: parsed };
    }
    return {
      status: "CORRUPT",
      error: new Error(`Security payload for ${key} is not a valid JSON object`)
    };
  } catch (err) {
    return {
      status: "CORRUPT",
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}
```

### C. Media Mirror Rewriting Boundary in `snapshot.ts` (Defects 5, 8)
```typescript
export function publicMirrorForSourceMedia(sourceUrl: string | undefined): string | null {
  if (!sourceUrl) return null;
  if (SOURCE_PARITY_MEDIA_MIRRORS[sourceUrl]) {
    return SOURCE_PARITY_MEDIA_MIRRORS[sourceUrl];
  }
  if (sourceUrl.startsWith("https://bzuvntbkevvuhfhqhkua.supabase.co/")) {
    return sourceUrl;
  }
  // B1: Unknown or unverified media must NEVER be blindly rewritten to unverified Supabase paths.
  return null;
}
```

---

## 4. Local Verification & Proof Matrix

| Test Suite / Gate | Command | Expected | Actual Result | Status |
|:---|:---|:---:|:---:|:---:|
| TypeScript Typecheck | `npm --prefix apps/mobile run typecheck` | 0 errors | 0 errors | **PASS** |
| Reader Persistence Fail-Closed (17 Scenarios) | `npm --prefix apps/mobile run test:reader-product` | 33 pass, 0 fail | 33 pass, 0 fail (17/17 fail-closed scenarios pass) | **PASS** |
| Source Parity & Media Mirror Integrity | `npm --prefix apps/mobile run test:source-parity` | 36 pass, 0 fail | 36 pass, 0 fail (all 7 Supabase mirrors verified live) | **PASS** |
| UI-03 Commercial Conformance | `npm --prefix apps/mobile run test:ui03` | 18 pass, 0 fail | 18 pass, 0 fail | **PASS** |
| Native Flow Realization | `node --test apps/mobile/tests/ui02-phase6a-native-realization.test.mjs apps/mobile/tests/ui02-phase6a-native.test.mjs` | 23 pass, 0 fail | 23 pass, 0 fail | **PASS** |
| Deterministic Session Harness | `node --test tests/harness/icr05a-consistency.test.mjs tests/harness/icr05b-session-negative.test.mjs` | 22 pass, 0 fail | 22 pass, 0 fail | **PASS** |
| Phase 10 Candidate Visual | GitHub Actions run `41564345012` | 3/3 jobs green | 3/3 SUCCESS (iOS Simulator 32m47s, Android Emulator 18m46s, Web/PWA 3m17s) | **PASS** |
| Web PWA Export Build | `npm --prefix apps/mobile run export:web -- --clear` | Clean exit 0 | Clean exit 0 (150 static routes generated) | **PASS** |
| Prebuilt Vercel Staging Deploy | `npx vercel deploy --prebuilt` | HTTP 200 on /build-info.json | Returns HTTP 200 with SHA `fe5669278768c2a5cab44670425fcf05a7a7d1a7` | **PASS** |
