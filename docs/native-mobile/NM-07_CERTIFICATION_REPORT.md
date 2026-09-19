# NM-07 — Native Integrated Certification Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm07-native-certification`  
**Checkpoint:** NM-07 — Native Integrated Certification  
**Status:** **CI NATIVE BINARIES CERTIFIED / PHYSICAL-DEVICE & UPSTREAM-INTEGRATION BLOCKED**  
**Production systems modified:** **NO**

## 1. Certification objective

Compile and trace native Android/iOS artifacts from one candidate SHA, carry forward every NM-01→NM-06 gate, anchor the candidate to the accepted staging schema, and document the remaining device/provider/server blockers without converting source evidence into false native certification.

## 2. Added NM-07 certification infrastructure

- `.github/workflows/native-certification.yml`
  - universal readiness job;
  - development/staging/production Expo config capture;
  - Android native prebuild + Gradle debug APK build;
  - iOS native prebuild + CocoaPods + Xcode iOS Simulator build;
  - Android/iOS artifact upload.
- `apps/mobile/tests/native-certification.test.mjs`
  - environment-identity separation;
  - development/staging/production profile separation;
  - production fail-closed assertion;
  - Android/iOS binary workflow presence;
  - no false store/signing claim;
  - no fabricated Expo project/signing credentials.
- `docs/native-mobile/NM-07_UAT_MATRIX.md`
  - core UAT matrix;
  - physical-device matrix;
  - explicit stop conditions.

## 3. Environment identities

Expected application identities:

| Environment | Android package | iOS bundle |
| --- | --- | --- |
| Development | `zw.co.healthtimes.app.dev` | `zw.co.healthtimes.app.dev` |
| Staging | `zw.co.healthtimes.app.staging` | `zw.co.healthtimes.app.staging` |
| Production | `zw.co.healthtimes.app` | `zw.co.healthtimes.app` |

Deep-link scheme: `healthtimes`.

## 4. Backend/schema anchor

Staging project:

- `HealthTimes Staging`
- ref `gcdohgbmqhqwydgaxrcr`
- Tokyo / `ap-northeast-1`
- `ACTIVE_HEALTHY`

Applied schema versions:

- `20260909000100_content_core`
- `20260909000200_taxonomy_and_geo`
- `20260909000300_redirects_and_seo`
- `20260909000400_analytics_and_ads`
- `20260909000500_migration_runs_and_checkpoints`
- `20260916030642_ag02_staging_security_baseline`

## 5. Certified candidate evidence

**Certified runtime / binary candidate SHA:** `e75fb698f4dae3e62df46090be0b130438d83d5d`

Exact-SHA workflows:

- Validate HealthTimes 2.0 — run `35448957695` — **SUCCESS**
- Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification — run `35448957674` — **SUCCESS**
- Native Binary Certification — run `35448957700` — **SUCCESS**

Certified artifacts:

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `healthtimes-android-debug-apk` | 77,715,479 bytes | `f7e152d6e53e26608b36fccae32a2be99085b5bab3d87608c57b8a5ca48a8220` |
| `healthtimes-ios-simulator-app` | 46,073,959 bytes | `ee906a9b7c061fadbbb8c71dacc70a9b56820fcf6c4158402c70544fb1bd17cd` |
| `healthtimes-native-config-matrix` | 1,768 bytes | `1602b3c59762f0999996e690ac287ab64bf34297acb94cf037d2ce9f6f235d32` |
| `healthtimes-native-web-dist` | 811,056 bytes | `5902920b4a9a04e54766bd0778922017f713306477e37f2c9e93f08d0960e651` |

Native binary results:

- Android Expo prebuild: **PASS**
- Android Gradle debug APK build: **PASS**
- Android APK existence verification: **PASS**
- Android artifact upload: **PASS**
- iOS Expo prebuild: **PASS**
- CocoaPods installation: **PASS**
- application Xcode scheme resolution: **PASS**
- Xcode iOS Simulator app build: **PASS**
- iOS `.app` verification: **PASS**
- iOS archive creation: **PASS**
- iOS artifact upload: **PASS**
- development/staging/production resolved identity matrix: **PASS**

An earlier binary run (`35448625332`) exposed a certification-workflow defect: Xcode successfully built the first CocoaPods scheme (`EXApplication`) rather than the application scheme, causing artifact verification to fail. The workflow was corrected to resolve the actual app scheme and the complete binary matrix passed on the certified SHA above.

## 6. Known blockers that prevent full NM-07 certification

1. No physical Android phone run yet.
2. No physical Android tablet run yet.
3. No physical iPhone run yet.
4. No physical iPad run yet.
5. Expo/EAS project identity is not present in the repository, so traceable EAS/internal builds and push-token issuance cannot yet be certified.
6. AG-03 CP3 remains blocked on the authoritative private WordPress database/uploads package.
7. AG-04 real migrated content/media has not replaced fixtures.
8. AG-05 native analytics/mobile ads/store-product provider identities remain unverified.
9. AG-06 server capability/session-revocation/push-registration authority remains unavailable.
10. Purchase sandbox, advertising delivery, revoked-session and authorized Studio flows therefore cannot be fully exercised.

## 7. Safety

- production release performed: **NO**
- production signing credentials committed: **NO**
- App Store submission performed: **NO**
- Google Play submission performed: **NO**
- production backend enabled in Reader: **NO**
- physical-device pass claimed without evidence: **NO**


## 8. Certification disposition

NM-07 has now proven that the shared HealthTimes codebase can produce:

- a real Android native APK;
- a real iOS Simulator application bundle;
- a web/PWA artifact;
- environment-separated native identities;

all traceable to the same candidate SHA.

This is a **native binary certification milestone**, not final production/mobile acceptance. Full NM-07 remains blocked by the physical-device matrix and the upstream AG-04/05/06 + CP7 integration conditions already listed above.
