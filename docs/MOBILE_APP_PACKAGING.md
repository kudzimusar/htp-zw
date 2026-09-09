# HealthTimes Mobile App Packaging & Store Readiness

**Application:** HealthTimes Zimbabwe  
**Package / bundle ID proposal:** `zw.co.healthtimes.app`  
**Public PWA:** `https://kudzimusar.github.io/htp-zw/`  
**Status:** Client-review / pre-signing scaffold

## 1. Mobile strategy

HealthTimes uses one authoritative publication/content model but deliberately presents a native-news mobile UI at phone/tablet widths. The delivery strategy is:

1. **Installable PWA** — immediate installable mobile/desktop experience.
2. **Google Play** — Trusted Web Activity (TWA) generated with Bubblewrap around the verified HTTPS PWA.
3. **Apple App Store** — Capacitor iOS container around the same publication, with native signing and App Store Connect completed on macOS after client approval.

The PWA is the source of truth for the web experience. Store wrappers should not fork editorial logic.

## 2. PWA baseline

Repository components:

- `site.webmanifest`
- `sw.js`
- `favicon.svg`
- mobile-specific UI in `v21.css` / `v21.js`
- HTTPS deployment through GitHub Pages
- standalone display mode
- offline application shell
- Light / Dark / System theme support
- safe-area-aware mobile navigation

### Install test

On a supported Android/Chromium device:

1. Open the HealthTimes HTTPS URL.
2. Open browser menu.
3. Choose **Install app** / **Add to Home screen**.
4. Launch HealthTimes from the installed icon.
5. Confirm standalone presentation and native mobile bottom navigation.

On iPhone/iPad:

1. Open HealthTimes in Safari.
2. Share → **Add to Home Screen**.
3. Launch from the Home Screen.

## 3. Google Play — Trusted Web Activity

The repository includes `app/twa-manifest.json` as a Bubblewrap configuration scaffold.

### Why TWA

HealthTimes is web-first, content-heavy and already served securely over HTTPS. A Trusted Web Activity keeps the public web/PWA as the primary product while allowing a Play Store package with browser-engine rendering and verified site ownership.

### Before generating the production Android project

Replace the GitHub Pages host with the approved production HealthTimes domain if the client chooses the new site as canonical.

Production requirements:

- final HTTPS domain;
- approved app icon PNGs, including 512×512 and maskable variants;
- Android signing keystore owned by the publisher;
- Google Play Console developer account;
- Digital Asset Links file on the production origin;
- privacy policy and support URLs;
- final package ID confirmation.

### Bubblewrap workflow

Install current Bubblewrap CLI, then initialize/update from the PWA manifest. The repository scaffold can be used as the configuration reference.

Typical release flow:

```bash
bubblewrap init --manifest="https://YOUR-PRODUCTION-DOMAIN/site.webmanifest" --directory="android"
bubblewrap validate --url="https://YOUR-PRODUCTION-DOMAIN/"
bubblewrap fingerprint add <SHA-256-SIGNING-FINGERPRINT>
bubblewrap fingerprint generateAssetLinks
bubblewrap build
```

`bubblewrap build` requires the signing-key passwords for a signed release. Keep keys outside source control.

### Digital Asset Links

Publish the generated file at:

```text
https://YOUR-PRODUCTION-DOMAIN/.well-known/assetlinks.json
```

It must authorize `zw.co.healthtimes.app` with the final signing certificate fingerprint. Without verified Digital Asset Links, the TWA will fall back to browser chrome rather than the intended full-screen trusted experience.

### Play Console checklist

- Create application: **HealthTimes Zimbabwe**.
- Confirm package ID.
- Upload signed Android App Bundle (AAB).
- Complete App Content declarations.
- Complete Data Safety based on the production analytics/auth/messaging implementation.
- Add privacy policy URL.
- Add support email/website.
- Add phone and tablet screenshots.
- Add 512×512 icon and feature graphic.
- Complete content rating.
- Declare ads accurately if advertising is enabled.
- Test through Internal Testing before Production.

## 4. Apple App Store — Capacitor path

The repository includes `capacitor.config.json` as the wrapper configuration scaffold.

Capacitor is appropriate when HealthTimes wants an App Store presence and may later add native features such as push notifications, secure authentication, share extensions or saved/offline reading.

### Requirements not available in this repository

An actual signed iOS submission requires:

- macOS;
- current Xcode;
- Apple Developer Program membership;
- distribution signing certificate;
- App Store provisioning/profile setup;
- App Store Connect application record.

### Production setup

After client approval, on the signing Mac:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

Review the generated Xcode target:

- Bundle ID: `zw.co.healthtimes.app`
- Display name: HealthTimes
- deployment target appropriate for the current Capacitor release;
- icons and launch screen;
- privacy descriptions for any native APIs actually used;
- universal-link/app-site-association settings if added;
- associated domains if needed.

### App Review quality note

The App Store should receive more than a bare website wrapper. The HealthTimes mobile product already has a separate app-style UI, saved reading, reader profile, Premium access state, AI, themes and PWA/offline shell. Before submission, strengthen native value further with production push notifications, secure login, offline saved articles and native share behavior if required by current App Review expectations.

## 5. Store screenshots

Capture final production screenshots after branding/domain approval.

Recommended screenshot stories:

1. Native mobile homepage.
2. Premium research story with access indicator.
3. Ask HealthTimes Intelligence.
4. Saved stories / My HealthTimes.
5. Topic/weekly briefing preferences.
6. Dark theme.

Do not capture Newsroom/admin as a consumer store screenshot unless a separate staff app is later planned.

## 6. Icon and splash deliverables

For production, request or create client-approved source artwork and generate:

- 1024×1024 App Store icon;
- 512×512 Play Store icon;
- 192×192 PWA icon;
- 512×512 PWA icon;
- maskable 512×512 icon with safe zone;
- Android adaptive foreground/background assets;
- iOS icon asset catalogue;
- launch/splash artwork where required.

The current `favicon.svg` is sufficient for the browser/PWA client review, but production store submission should use exported PNG assets from approved brand artwork.

## 7. Payments warning

The current US$5 Premium activation is presentation state only.

Before store submission, determine the applicable platform payment rules for digital subscriptions and implement the appropriate production billing architecture. Do not ship the local/browser Premium toggle as a real paid entitlement system.

## 8. Release gates

A mobile store release requires all of the following:

- production backend/authentication;
- server-side Premium entitlement;
- real billing architecture;
- privacy policy/data inventory;
- analytics consent strategy;
- secure messaging preferences;
- final domain;
- approved branding/icons;
- mobile UAT on physical devices;
- accessibility review;
- signed Android/iOS builds;
- internal/beta testing;
- store metadata and legal declarations.

The current repository establishes the technical and product path so the client can evaluate a web + mobile-app strategy before those production credentials are supplied.
