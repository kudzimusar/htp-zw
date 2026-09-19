# NM-07 — Native Integrated Certification Matrix

**Candidate branch:** `feat/native-mobile-nm07-native-certification`  
**Target checkpoint:** NM-07 — Native Integrated Certification  
**Backend:** HealthTimes Staging (`gcdohgbmqhqwydgaxrcr`, Tokyo)  
**Production release authorized by this document:** **NO**

## 1. Evidence classes

NM-07 distinguishes four evidence classes:

1. **Source/contract CI** — TypeScript, inherited checkpoint suites, live staging probes and PWA export.
2. **Native binary CI** — Android debug APK and iOS Simulator app compiled from the same candidate SHA.
3. **Simulator/emulator UAT** — launch and interaction on Android Emulator / iOS Simulator.
4. **Physical-device UAT** — Android phone, Android tablet, iPhone and iPad.

A pass in one class must not be presented as a pass in another.

## 2. Backend/schema anchor

Accepted staging project:

- project: `HealthTimes Staging`
- ref: `gcdohgbmqhqwydgaxrcr`
- region: `ap-northeast-1`
- state: `ACTIVE_HEALTHY`

Applied migrations:

1. `20260909000100_content_core`
2. `20260909000200_taxonomy_and_geo`
3. `20260909000300_redirects_and_seo`
4. `20260909000400_analytics_and_ads`
5. `20260909000500_migration_runs_and_checkpoints`
6. `20260916030642_ag02_staging_security_baseline`

## 3. Native build matrix

| Target | Artifact | CI status | Physical-device status |
| --- | --- | --- | --- |
| Android | debug APK | pending final NM-07 run | not executed |
| Android tablet | same Android package, tablet layout | binary shared with Android | not executed |
| iPhone | iOS Simulator app | pending final NM-07 run | not executed |
| iPad | same universal iOS app, tablet layout | binary shared with iOS | not executed |

The CI binaries are unsigned/non-store certification artifacts. They do not equal App Store / Play Store release builds.

## 4. Core UAT matrix

| Area | Automated/source evidence | Native simulator/emulator | Physical devices |
| --- | --- | --- | --- |
| install / first launch | binary build workflow | pending | pending |
| upgrade | not yet automated | pending | pending |
| cold/warm launch | not yet automated | pending | pending |
| onboarding | route/source tests | pending | pending |
| edition selection | persistent Reader tests | pending | pending |
| login/logout | NM-06 Auth tests + live staging | pending | pending |
| session persistence | SecureStore contract tests | pending | pending |
| Home | Reader/PWA tests | pending | pending |
| Search | privacy-safe search tests | pending | pending |
| Article | NM-04/NM-05 tests | pending | pending |
| Premium gate | entitlement/store fail-closed tests | pending | pending |
| purchase sandbox/test | storefront abstraction only | blocked: products absent | blocked |
| Save | persistence tests | pending | pending |
| Offline | download snapshot tests | pending | pending |
| Listen | source route only | pending | pending |
| Video / Watch | source route only | pending | pending |
| Live | source route only | pending | pending |
| Share | attributed URL tests | pending | pending |
| deep link | URL/parser tests | pending | pending |
| notification routing | settings + push baseline | pending | pending |
| dark mode | appearance tests | pending | pending |
| text scaling | Reader tests | pending | pending |
| network loss/recovery | not yet device-tested | pending | pending |
| expired/revoked session | client boundary implemented | pending | blocked: server revoke endpoint absent |
| staff workflows | Studio gates | locked by design | blocked: AG-06 authority absent |
| advertising test delivery | policy/no-inventory tests | blocked: mobile provider IDs absent | blocked |
| analytics event validation | event-schema tests | provider delivery blocked | blocked: native provider absent |
| accessibility | touch-target/semantic tests | pending | pending |
| security | RLS/capability/Auth tests | pending | pending |

## 5. Required physical-device matrix

The final native certification must execute on at least:

- Android phone;
- Android tablet;
- iPhone;
- iPad.

For each device capture:

- device model;
- OS version;
- candidate SHA;
- binary/build identifier;
- install result;
- first-launch result;
- cold/warm launch result;
- navigation/UAT result;
- screenshots for critical failures;
- blocker/defect references.

## 6. Stop conditions

Do not mark NM-07 fully certified while any of these remain true:

- no Android binary evidence;
- no iOS binary evidence;
- no physical Android phone run;
- no physical Android tablet run;
- no physical iPhone run;
- no physical iPad run;
- AG-04 migrated content unavailable;
- AG-05 native analytics/ads/store identities unavailable where required;
- AG-06 server capability/session/push authority unavailable for protected workflows;
- no Expo/EAS project identity for traceable EAS/internal build and push-token issuance.

## 7. Release boundary

NM-07 certification does not authorize production release by itself.
