# HealthTimes Mobile Packaging & Native Release Authority

**Application:** HealthTimes  
**Canonical Reader source:** `apps/mobile`  
**Native stack:** Expo + React Native + Expo Router  
**Web/PWA stack:** React Native Web static export from the same `apps/mobile` source  
**Current product authority:** UI-WF certified Reader lineage  
**Status:** Native release custody recertified; store signing/submission remains a future release gate

> **Release-custody rule:** Do not build a shipping HealthTimes Reader from the repository-root PWA, `app/twa-manifest.json`, Bubblewrap/TWA, or the root `capacitor.config.json`. Those files are retained only as historical evidence of an earlier web-wrapper strategy.

## 1. Canonical delivery strategy

HealthTimes now has one canonical Reader implementation:

```text
apps/mobile
  ├─ Expo / React Native / Expo Router        → Android + iOS
  └─ React Native Web / Metro static export  → Web/PWA
```

The native Android and iOS applications render React Native Reader components. They must not use a remote web page, Trusted Web Activity, Custom Tab, Capacitor WebView, or other browser shell as the primary Reader UI.

The PWA and native apps share the same `apps/mobile` design/product source. Platform adaptation may legitimately change safe areas, native controls, responsive composition, media behavior and desktop layout. Desktop PWA is allowed to recompose into a publication layout rather than imitate a phone screen.

## 2. Historical wrapper files — non-shipping

The following remain in the repository for provenance only.

### `app/twa-manifest.json`

Historical Bubblewrap / Trusted Web Activity scaffold.

It targets the former GitHub Pages web presentation and uses browser-engine rendering. It is **not** current Android release authority and must not be used to create an owner APK, internal-test APK/AAB, Play release, or native certification binary.

### `capacitor.config.json`

Historical Capacitor remote-web wrapper scaffold.

Its root configuration points at the former GitHub Pages presentation. It is **not** current Android or iOS release authority and must not be used for Reader release work.

Do not delete or rewrite these historical files merely to make the repository look cleaner. Their presence documents the superseded strategy. This document controls how they are interpreted.

## 3. Canonical development commands

From repository root:

```bash
npm install --prefix apps/mobile --no-audit --no-fund
npm run native:android
```

Equivalent Android workspace command:

```bash
npm --prefix apps/mobile run android
```

For iOS development on macOS:

```bash
npm install --prefix apps/mobile --no-audit --no-fund
npm run native:ios
```

For the canonical Web/PWA:

```bash
npm install --prefix apps/mobile --no-audit --no-fund
npm run native:export:web
```

The PWA output is:

```text
apps/mobile/dist/
```

## 4. Deterministic certified Android build

The certified source-parity Android path is:

```bash
npm install --prefix apps/mobile --no-audit --no-fund

cd apps/mobile

APP_ENV=development \
EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=source-parity \
npx expo prebuild --platform android --clean --no-install

cd android
./gradlew assembleRelease --no-daemon
```

Expected APK:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Current development package identity is resolved by `apps/mobile/app.config.ts`:

```text
zw.co.healthtimes.app.dev
```

The release APK is a React Native application generated from `apps/mobile`. The primary Android activity must remain a React Native activity; it must not become a Bubblewrap launcher, Trusted Web Activity, Capacitor bridge activity, or remote WebView shell.

## 5. Native identity authority

`apps/mobile/app.config.ts` controls native identity.

Current environment identities:

| Environment | Android package / iOS bundle ID | Display name |
|---|---|---|
| Development | `zw.co.healthtimes.app.dev` | HealthTimes Dev |
| Staging | `zw.co.healthtimes.app.staging` | HealthTimes Staging |
| Production | `zw.co.healthtimes.app` | HealthTimes |

The canonical application entry remains:

```text
apps/mobile/package.json
main = expo-router/entry
```

A shipping Reader must not add `react-native-webview` or a remote PWA URL as the primary application renderer.

## 6. Future production Android

Future production Android work starts from:

```text
apps/mobile/eas.json
apps/mobile/app.config.ts
```

Expected release toolchain:

```bash
cd apps/mobile
npx eas build --platform android --profile production
```

Production release additionally requires publisher-owned signing authority, final Play Console configuration, production backend/security readiness, privacy/data-safety declarations, approved icons/store assets, physical-device UAT and release approval.

Do not substitute Bubblewrap/TWA for this path.

## 7. Future production iOS

Future production iOS also starts from `apps/mobile`.

Expected release toolchain is Expo native iOS / EAS and, where required, Xcode signing and App Store Connect:

```bash
cd apps/mobile
npx eas build --platform ios --profile production
```

Local native generation on macOS may use:

```bash
cd apps/mobile
npx expo prebuild --platform ios --clean --no-install
```

The root Capacitor wrapper is not the future iOS strategy.

Production iOS still requires an Apple Developer account, publisher-controlled signing, provisioning, final privacy declarations, production service readiness, physical-device UAT and App Store approval.

## 8. Owner/internal Android preview

An owner-review APK must be built from an explicitly recorded Git SHA of `apps/mobile`, normally in `development` identity with the approved data mode.

For UI-WF owner preview the required environment is:

```text
APP_ENV=development
EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=source-parity
```

The build evidence must record at minimum:

- repository Git SHA;
- frozen product authority when the repository head contains documentation/evidence-only commits;
- APK SHA-256;
- package ID;
- display name;
- build environment and service mode;
- proof that the generated main activity is React Native;
- emulator/device smoke-test evidence;
- proof that Chrome/Custom Tabs/WebView is not the primary Reader.

## 9. Store screenshots

Capture final store screenshots from the canonical native app after branding and production release authority are approved.

Recommended screenshot stories:

1. Home.
2. Premium research story and access treatment.
3. Search / discovery.
4. Watch.
5. Saved / My HealthTimes.
6. Dark mode.

Do not use screenshots from the historical TWA, Capacitor wrapper or retired repository-root Reader.

## 10. Release gates

A production mobile store release requires all of the following:

- production backend/authentication;
- server-side Premium entitlement;
- approved billing architecture;
- privacy policy and data inventory;
- analytics/consent strategy;
- secure messaging/preferences;
- final production domain and service configuration;
- approved branding/icons;
- accessibility review;
- physical-device UAT;
- publisher-controlled Android/iOS signing;
- internal/beta testing;
- store metadata and legal declarations;
- explicit production deployment/release authority.

This file defines release-path custody only. It does not itself authorize a Play Store or App Store submission.
