# NM-01 — HealthTimes Native Foundation Implementation Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm01-foundation`  
**Programme:** HealthTimes unified native + PWA  
**Checkpoint:** NM-01 — Native Foundation  
**Production systems modified:** NO

## 1. Authorities used

Implementation follows these together:

1. `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md` — product/application authority.
2. `docs/native-mobile/DESIGN.md` — visual/UX authority.
3. AG-01 → AG-07 migration programme and available reports — data/backend/security authority.

No replacement database architecture was introduced.

## 2. Migration dependency state used by NM-01

- **AG-01 / CP1:** baseline/schema/taxonomy evidence available. The existing schema is the source for client read-model contracts.
- **AG-02 / CP2:** staging Vercel/Supabase/Auth/Storage infrastructure is available with deny-by-default RLS.
- **AG-03 / CP3:** authoritative private WordPress database/uploads package is still incomplete; CP3 is not ready.
- **AG-04:** real migrated content/media/taxonomy cannot yet replace fixtures.
- **AG-05:** verified production analytics/advertising/SEO integration is not connected in NM-01.
- **AG-06:** real reader/staff identity, entitlements, capabilities and Studio authority are not connected in NM-01.
- **AG-07:** integrated native certification cannot start until the upstream integrated candidate exists.

## 3. Implemented universal workspace

`apps/mobile/` is a React Native + Expo + TypeScript + Expo Router workspace for the same source commit to target:

- iOS;
- Android;
- mobile PWA/web;
- tablet/desktop web;
- HealthTimes Studio foundations.

Environment application IDs:

- development: `zw.co.healthtimes.app.dev`;
- staging: `zw.co.healthtimes.app.staging`;
- production: `zw.co.healthtimes.app`.

## 4. Reader screens implemented

Core five-destination Reader navigation:

- Home;
- Explore;
- Live;
- Watch;
- My HealthTimes.

Additional approved routes:

- Intelligent Search;
- Article Reader;
- Listen / Audio;
- Saved / Offline;
- Notifications;
- Country / Edition;
- Premium;
- Onboarding.

Home follows the approved hierarchy with editor-controlled hero treatment, Live rail, declared ad inventory, story sections, controlled personalization and Watch.

Article keeps journalism central and includes text sizing, Save, Listen, Share, Premium handling, declared ad placements, references area and related coverage.

## 5. Studio foundations implemented

Studio has a visually distinct dark operational navigation and light working canvas. Foundations exist for:

- Today;
- Stories;
- Create / Edit;
- Live Desk;
- Video Desk;
- Media;
- Advertising;
- Premium;
- Social Desk;
- Audience;
- Search & Growth;
- Analytics & Intelligence;
- Subscribers;
- Authors;
- Staff & Roles;
- Platform Settings.

Studio does not grant authority locally. Each module labels the AG owner for its eventual data/security integration.

## 6. Domain contracts created

- `ArticleRepository`
- `SearchService`
- `AuthService`
- `ReaderRepository`
- `PremiumService`
- `AdvertisingService`
- `AnalyticsService`
- `LiveService`
- `VideoService`
- `AudioService`
- `NotificationService`
- `SocialAttributionService`

The Article/Author/Media/Taxonomy/Advertising read models are projections of the existing certified migration schema, not a second database model.

## 7. Fixture policy

Fixture implementations remain for:

- article/card content;
- Live items;
- Watch/video items;
- Listen/audio items;
- notification rows;
- development reader identity/preferences;
- saved state.

Controls applied:

- development/fixture environment is visible in the UI;
- Premium protected fixture body is not shipped to an unauthorized client;
- advertising fixture returns `source: none`;
- analytics fixture is a no-op;
- no production price, revenue, audience metric, seller ID, role, capability or entitlement is fabricated;
- in-memory reader/saved state is explicitly non-authoritative;
- requesting staging service mode fails closed until real adapters are added.

## 8. AG replacement path

| Contract / feature | Real owner |
| --- | --- |
| ArticleRepository / migrated stories | AG-04 |
| media/authors/taxonomy | AG-04 |
| staging infrastructure / environment | AG-02 |
| source-contract reconciliation | AG-03 |
| Search/SEO/GA4/Search Console | AG-05 |
| AdvertisingService / direct + Google inventory | AG-05 |
| AnalyticsService / audience events | AG-05 |
| social attribution / deep-link measurement | AG-05 |
| AuthService / Reader identity | AG-06 |
| Premium entitlement | AG-06, with NM-05 store integration |
| Studio permissions / staff capabilities | AG-06 |
| integrated freeze/certification | AG-07 / NM-07 |

## 9. PWA parity

The Expo web target includes:

- static web export;
- web manifest;
- service-worker registration;
- app-shell caching;
- responsive Reader components;
- desktop navigation and wider editorial grids rather than stretched phone tabs;
- the same design tokens and content hierarchy as native.

The legacy PWA remains untouched for migration/client-review continuity while the new universal PWA matures.

## 10. Automated build evidence

Workflow: `.github/workflows/native-mobile.yml`

Required gates:

1. install the isolated mobile workspace;
2. Expo dependency compatibility check;
3. TypeScript strict check;
4. static web/PWA export;
5. verify `dist/index.html`, manifest, service worker and icon;
6. upload the generated web distribution as CI evidence.

Certified NM-01 branch-tip evidence:

- candidate SHA: `af306f04f9a738404aa4c1998b0f07dacec23d6d`
- Native Mobile Foundation run: `35443708975` — **SUCCESS**
- Validate HealthTimes 2.0 run: `35443709322` — **SUCCESS**
- Expo dependency compatibility: **PASS**
- strict TypeScript: **PASS**
- NM-01 foundation integrity tests: **6/6 PASS**
- static Expo web/PWA export: **PASS**
- PWA output verification: **PASS**
- artifact: `healthtimes-nm01-web-dist`
- artifact SHA-256: `c42422eb85475bdc19d4cf40fc2a0e4acb9c31b0b342d40a12dd27f48d08f7f7`

The existing Vercel project also produced successful branch previews for the preserved root client-review surface. Native simulator/emulator execution is still not claimed because this connected environment does not expose the required macOS/iOS Simulator or Android Emulator runtime.

## 11. Platform result boundary

- **iOS source/config:** implemented.
- **Android source/config:** implemented.
- **PWA source/config:** implemented.
- **Studio source/config:** implemented.
- **iOS Simulator runtime:** not claimed until executed in a macOS/native-capable environment.
- **Android Emulator runtime:** not claimed until executed in an Android SDK/emulator-capable environment.
- **App Store / Play Store submission:** not part of NM-01 and not claimed.

## 12. Outstanding dependencies / blockers

1. CP3 needs the authoritative private WordPress database export and complete uploads archive.
2. AG-04 must populate migrated content/media/taxonomy before fixture content can be retired.
3. AG-05 must finalize real advertising, analytics, SEO/growth and seller/integration decisions before NM-05.
4. AG-06 must provide server-backed identity, entitlement, roles/capabilities, audit and RLS policies before NM-06.
5. AG-07 must freeze an integrated candidate before NM-07 cross-platform certification.
6. Native simulator/emulator and signed development-build evidence still require an environment with the relevant native toolchains and signing/build access.

## 13. Safety statement

- production WordPress modified: **NO**
- production database modified: **NO**
- production DNS modified: **NO**
- production Auth modified: **NO**
- production Analytics/AdSense modified: **NO**
- production app-store configuration modified: **NO**
