# HealthTimes Zimbabwe — 2.1 Client-Review Platform

HealthTimes 2.1 is a modernization of the HealthTimes Zimbabwe publication into a premium editorial website, native-feeling mobile news product, subscriber experience, advertising platform, HealthTimes Intelligence layer and role-governed Newsroom.

## Live surfaces

- Publication: https://kudzimusar.github.io/htp-zw/
- Premium: https://kudzimusar.github.io/htp-zw/premium.html
- Sections & archive: https://kudzimusar.github.io/htp-zw/archive.html
- My HealthTimes: https://kudzimusar.github.io/htp-zw/preferences.html
- Editorial standards: https://kudzimusar.github.io/htp-zw/about.html
- Newsroom: https://kudzimusar.github.io/htp-zw/newsroom.html
- Operations manual: https://kudzimusar.github.io/htp-zw/manual.html

## Client-review priorities implemented

### Premium research

- US$5/month proposition.
- Preview is tracked per reader + Premium story.
- Small Premium notice after approximately 8 seconds.
- Stronger countdown reminder from approximately 20 seconds.
- Protected research locks automatically at 30 seconds.
- Subscription sheet opens automatically at expiry.
- Dismissing the sheet does not unlock content.
- Refresh does not reset that story’s allowance.
- Premium reader bypasses the gate.
- Citation tools and deeper Ask HealthTimes context are positioned as member value.

The frontend demonstrates the product contract. Production must enforce paid entitlement at the server/edge and connect real billing.

### Advertising

The redesign retains HealthTimes’ paid-commercial model instead of stripping it out.

- HOSPAZ AGM campaign represented as initial source-site campaign.
- Desktop masthead placement.
- Compact mobile placement.
- Homepage and article inventory.
- Paid-placement disclosure and editorial/commercial separation.
- Newsroom Advertising Manager with campaign, creative, placement, status, review and schedule controls.

### Source parity

`archive.html` and `docs/HEALTHTIMES_SOURCE_PARITY_REGISTER.md` preserve the original publication taxonomy/product map, including Breaking News, Features, Epidemics, specialist disease sections, Academic & Research, Jobs, Fellowships & Grants, BARAZA E-PAPER, Premium, videos and institutional pages.

The client-review build contains/mirrors a broad current-story catalogue using official public HealthTimes imagery. Final approval should trigger authoritative CMS/media/URL migration rather than manual recreation.

## Separate desktop and mobile UX

The platform deliberately has two presentation systems over the same content model.

### Desktop

- richer editorial grids;
- full header and footer;
- wider typography with bounded sizes;
- advertising inventory;
- sidebars/context;
- article research rail.

### Mobile/tablet

- separate native-news homepage feed;
- compact masthead;
- bottom navigation;
- persistent menu/search/saved/profile sheets;
- smaller images/headlines/card density;
- no desktop footer;
- safe-area aware navigation;
- mobile ad creative treatment.

## Reader accounts and themes

Public reader UI supports:

- Sign in;
- Create account;
- Profile;
- Premium state;
- saved reading;
- reading history;
- My HealthTimes preferences;
- Light / Dark / System appearance;
- sign out.

Presentation Premium reader:

```text
reader@healthtimes.co.zw
HealthTimes#Reader26
```

Reader credentials/state are browser-local for client review and are not production security.

## Ask HealthTimes

HealthTimes Intelligence supports article summaries, significance, plain-language explanation, related coverage and topical discovery across the bundled reporting catalogue.

Medical safety rules prevent personal diagnosis, prescribing and medication dosage guidance. Production should replace static browser matching with server-side RAG over the authoritative CMS, provenance, citations, safety monitoring and access controls.

## Newsroom

Existing Newsroom roles include Publisher/Owner, Editor-in-Chief, Managing Editor, Section Editor, News Editor, Reporter, Health/Science Editor, Fact Checker, Copy Editor, Multimedia Editor, Social Editor, Newsletter Editor, Commercial Manager, Subscriber Manager and Analyst.

Presentation credentials:

| Role | Username | Password |
| --- | --- | --- |
| Publisher / Owner | `publisher` | `HealthTimes#Publisher26` |
| Editor-in-Chief | `editor` | `HealthTimes#Editor26` |
| Reporter / Journalist | `reporter` | `HealthTimes#Reporter26` |
| Newsletter / Audience | `audience` | `HealthTimes#Audience26` |
| Commercial Manager | `commercial` | `HealthTimes#Commercial26` |

2.1 extensions add:

- Public/Premium story controls synchronized to the public browser model;
- Advertising Manager;
- Migration Parity module;
- appearance control.

Commercial staff may manage campaigns/subscriber functions but do not receive unrestricted editorial-copy authority.

## Editorial workflow

`Idea → Assignment → Draft → Source verification → Fact check → Health/science review → Copy edit → Ready/Scheduled → Published → Correction/Update → Archive`

## PWA and app-store readiness

HealthTimes is now an installable Progressive Web App using:

- `site.webmanifest`
- `sw.js`
- standalone display mode
- cached application shell
- mobile-specific app UI

Store scaffolds/documentation:

- `app/twa-manifest.json` — Google Play Trusted Web Activity/Bubblewrap configuration.
- `capacitor.config.json` — Capacitor wrapper configuration for iOS/Android follow-on work.
- `docs/MOBILE_APP_PACKAGING.md` — signing/build/store guide.
- `docs/STORE_LISTING_METADATA.md` — store listing draft and screenshot plan.

Actual Play/App Store submission is not claimed: final domain ownership, production billing/auth/privacy, signing credentials and store accounts are required.

## UAT

The repository includes Playwright/Chromium certification across:

- 375px phone
- 430px phone
- 768px tablet
- 1024px landscape/small laptop
- 1440px desktop
- 1920px wide desktop

UAT covers layout overflow/overlap, separate device presentations, stable mobile sheets, reader account flow, theme persistence, Premium timing/locking, refresh resistance, ads, Newsroom Premium/Advertising controls, RBAC and PWA assets.

Run locally:

```bash
npm install
npx playwright install chromium
npm run test:uat
```

GitHub Actions workflow: `.github/workflows/uat.yml`.

## Repository structure

```text
.
├── index.html
├── article.html
├── premium.html
├── preferences.html
├── archive.html
├── about.html
├── newsroom.html
├── manual.html
├── app.js
├── v21.js
├── newsroom.js
├── newsroom-v21.js
├── styles.css
├── v21.css
├── newsroom.css
├── newsroom-v21.css
├── site.webmanifest
├── sw.js
├── favicon.svg
├── capacitor.config.json
├── app/
│   └── twa-manifest.json
├── tests/
│   └── uat.spec.js
├── docs/
│   ├── HEALTHTIMES_2_IMPLEMENTATION_PLAN.md
│   ├── HEALTHTIMES_SOURCE_PARITY_REGISTER.md
│   ├── HEALTHTIMES_OPERATIONS_MANUAL.md
│   ├── MOBILE_APP_PACKAGING.md
│   └── STORE_LISTING_METADATA.md
└── .github/workflows/
    ├── validate.yml
    ├── uat.yml
    └── pages.yml
```

## Production replacement checklist

Before operational launch:

1. authoritative CMS/database + media migration;
2. managed reader/staff authentication and staff MFA;
3. server-side RBAC;
4. server/edge Premium entitlement;
5. production US$5 billing compliant with the chosen web/store distribution model;
6. consent-aware email/WhatsApp subscriber store and real providers;
7. ad-serving/commercial analytics stack;
8. privacy-aware product analytics;
9. server-side HealthTimes Intelligence RAG/provenance/safety;
10. app icons from client-approved source artwork;
11. final domain and Digital Asset Links;
12. Android/iOS signing and beta testing;
13. redirects/SEO/canonical migration;
14. accessibility, security, editorial and physical-device UAT;
15. backup, monitoring and disaster recovery.

## Documentation

- `docs/HEALTHTIMES_2_IMPLEMENTATION_PLAN.md` — authoritative implementation/client record.
- `docs/HEALTHTIMES_SOURCE_PARITY_REGISTER.md` — original-site migration parity.
- `docs/HEALTHTIMES_OPERATIONS_MANUAL.md` — downloadable work manual.
- `manual.html` — browser-readable manual.
- `docs/MOBILE_APP_PACKAGING.md` — Play/App Store path.
- `docs/STORE_LISTING_METADATA.md` — store listing draft.
