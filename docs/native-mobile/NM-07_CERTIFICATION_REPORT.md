# NM-07 — Native Integrated Certification Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm07-native-certification`  
**Checkpoint:** NM-07 — Native Integrated Certification  
**Status:** **IN PROGRESS / PHYSICAL-DEVICE BLOCKED**  
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

## 5. Candidate evidence

Final NM-07 CI run IDs, candidate SHA and binary artifact digests are recorded only after the new binary workflow completes successfully.

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
