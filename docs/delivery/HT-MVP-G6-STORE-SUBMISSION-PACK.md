# HealthTimes G6 Android/iOS submission pack

**Status:** prepared on 2026-11-14 on the local G5 branch. No binary was built, no signing key touched, nothing submitted. G6 is the last gate: it waits for G5 production (live domain, policies, deletion) and an Owner decision to submit.
**Audience:** HealthTimes Owner, mobile engineer, release manager.

## 1. Accounts and ownership checklist (Owner)

| Item | Requirement | Status |
|---|---|---|
| Apple Developer Program | **Organization** membership in the HealthTimes publisher's legal name. Needs a D-U-N-S number. At least two Admins with 2FA. | Not started |
| Google Play Console | **Organization** developer account; identity verification; at least two Admins | Not started |
| Expo / EAS | An Expo organization owned by HealthTimes, with an EAS project. Its ID becomes `extra.eas.projectId` and `owner` in `app.config.ts`. | Missing: push and EAS builds are blocked |
| Signing | EAS-managed credentials: iOS distribution certificate and profiles; Android upload key with Play App Signing. Keys are never committed or shared in chat. | Not configured |
| Store API access | App Store Connect API key and Play service account for `eas submit`. Held by the Owner; values never in the repository. | `submit.production` is `{}` |
| Recovery | Recovery contacts and the credential-custody procedure written down | Not started |

## 2. Submission metadata

The source is `docs/STORE_LISTING_METADATA.md`, the existing draft.

- **Name and identity:** "HealthTimes Zimbabwe" (short name "HealthTimes"). Bundle and package `zw.co.healthtimes.app`. Version `0.1.0`. Category: News (Apple) / News & Magazines (Play).
- **Copy that must change before submission.** Both stores reject metadata that describes features the app does not contain (Apple 2.3.1; Google Play misleading-claims policy).

| Listing claim | Reality on 2026-11-14 | Action |
|---|---|---|
| "Ask HealthTimes Intelligence" / caption 3 "Ask the follow-up" | No such feature in `apps/mobile` | Remove |
| "Research citation tools for Premium reporting" | Not found in the Reader | Remove, or ship the feature |
| "HealthTimes Premium research and analysis" / Premium screenshot | Premium cannot be bought in the apps. Existing members can sign in. | Describe as "for existing HealthTimes Premium members", or remove |
| "Breaking news" | The Reader feed has no breaking-news surfacing (G4–G6 readiness audit) | Remove until built |
| "Email and WhatsApp briefing preferences" | Preference toggles exist in My HealthTimes; public newsletter sign-up is excluded at launch | Keep only if the toggles are wired to delivery; otherwise reword |

- **Policy URLs.** Must be the production web pages after legal approval:
  - `https://healthtimes.co.zw/privacy`
  - `/terms`
  - `/subscription-terms` (only if Premium is mentioned)
  - a support page
  - an account-deletion page (Google requires a web deletion link)

## 3. Assets

`scripts/native/render-store-assets.mjs` renders **draft** assets from the existing brand mark for brand review. They are not wired into the app.

| Asset | Size | Rule | Draft |
|---|---|---|---|
| iOS app icon | 1024×1024 PNG | Opaque (no alpha), no rounded corners | `ios-app-icon-1024.png` (RGB) |
| Google Play icon | 512×512 PNG | | `play-store-icon-512.png` |
| Android adaptive icon | 1024×1024 foreground (mark inside the central safe zone) and background | | `android-adaptive-foreground-1024.png`, `android-adaptive-background-1024.png` |
| Splash icon | 1024×1024, transparent | | `splash-icon-1024.png` |
| Play feature graphic | 1024×500 | | `play-feature-graphic-1024x500.png` (tagline is draft copy) |

**Screenshots** are captured from the signed release build, not the web export:
- iPhone 6.9" (1320×2868) and 6.5" (1242×2688);
- **iPad 13" (2064×2752), required because `supportsTablet: true`**;
- Android phone (16:9 or 9:16, at least 1080 px on the short side), plus 7" and 10" tablets.

**Configuration still to add** to `apps/mobile/app.config.ts`, after brand approval (a separate, reviewed change):
- `icon`, `splash` and `android.adaptiveIcon`;
- `extra.eas.projectId` and `owner`;
- iOS `associatedDomains` and Android `intentFilters` for `healthtimes.co.zw` links;
- `appVersionSource` and a build-number policy.

## 4. Privacy disclosures (candidate answers for legal review)

These come from the code facts anchored in `apps/mobile/tests/g5-policy-surfaces.test.mjs`.

| Data | Collected? | Purpose | Linked to user | Tracking |
|---|---|---|---|---|
| Email address, display name (optional) | Yes, when creating an account | Account management | Yes | No |
| User ID (Supabase Auth) | Yes | Account and app functionality | Yes | No |
| Push token | Only after the reader allows notifications | Notifications | Yes, when signed in | No |
| Purchase history | Not at launch (purchases off) | — | — | — |
| Analytics and usage data | **Not transmitted** (events are format-checked only) | — | — | No |
| Advertising data | No third-party ad SDK; first-party ad events are not transmitted | — | — | No |
| Location, contacts, photos, health records | No | — | — | — |
| Crash data | Not collected (client error capture is off by default) | — | — | — |

- **Data safety (Google).**
  - Data is encrypted in transit (HTTPS only; CSP `upgrade-insecure-requests`).
  - Users can request deletion: the G5 deletion contract must be live before submission.
- **App Tracking Transparency.** Not required: there is no tracking.

## 5. Permissions

| Permission | Platform | Why | Shown when |
|---|---|---|---|
| Notifications (`POST_NOTIFICATIONS` on Android 13+, iOS push authorization) | Both | Breaking-news and briefing alerts the reader opts into | Only when the reader enables alerts |
| Document picker | Both | Newsroom Studio file uploads (staff only) | Only inside Studio |

There are no camera, microphone, location or contacts permissions. Before submission, audit the generated `AndroidManifest.xml` and `Info.plist` from the release build for permissions added by libraries.

## 6. Authentication, deletion and Premium rules

- **Sign-in:** email and password only, so Sign in with Apple is not required.
- **Account deletion** (Apple 5.1.1(v), Google Play) **blocks submission** until it is live. The contract, tests and integration steps are in `docs/delivery/HT-MVP-G5-NEWSLETTER-AND-ACCOUNT-DELETION.md`. Also required: the in-app entry point, and a web deletion page for Google Play.
- **Native Premium** (Apple 3.1.1/3.1.3(a) reader-app rules; Google Play Payments):
  - The apps never open an external checkout (`purchase-policy.ts`).
  - They show no in-app purchase and, since this change, no "Restore purchases" until store billing exists.
  - Existing members may sign in.
  - Do not add copy or links that steer users to buy elsewhere.

## 7. Store-review instructions (template)

> HealthTimes is a news reader. Browse Home, Explore, Live and Watch without an account. To test account features, sign in with the review account below. Premium membership cannot be purchased in the app; the review account [has/does not have] Premium access. Account deletion: My HealthTimes → Devices and sessions → Delete account.
>
> Review account: provided by HealthTimes in App Store Connect / Play Console only (never in this repository).

## 8. Backend readiness conditions for G6

1. G5 production is live on `healthtimes.co.zw`, with approved policy pages.
2. Production Supabase has the account-deletion migration and the operator deletion job.
3. The EAS project exists, push credentials are configured (APNs key, FCM), and the production `EXPO_PUBLIC_*` values point at production services.
4. The native release build passes the existing native CI (Native Binary Certification, UI-02 cross-device) at the exact SHA, plus device UAT on at least one physical Android phone and one iPhone.
5. The Owner authorizes submission.
