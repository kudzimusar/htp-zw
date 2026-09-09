# HealthTimes 2.1 Operations & Work Manual

**Publication:** HealthTimes Zimbabwe  
**Public site:** https://kudzimusar.github.io/htp-zw/  
**Newsroom:** https://kudzimusar.github.io/htp-zw/newsroom.html  
**Version:** 2.1 client-review hardening  
**Date:** 2026-09-09

## 1. Purpose

This manual is the working reference for the modern HealthTimes publication, Premium membership, reader accounts, Ask HealthTimes, WhatsApp/briefings, advertising and Newsroom administration. It is intended both for the client review and for future operational handover.

The current hosted release is a semi-working frontend product. Authentication, payments, authoritative CMS persistence, message delivery, production analytics and security enforcement remain production integration boundaries. Those limitations are documented here but are not unnecessarily exposed in the public presentation UI.

## 2. Device experiences

HealthTimes uses the same reporting catalogue but deliberately presents **two device experiences**.

### Desktop

Desktop is an editorial publication environment with:

- multi-column lead-story hierarchy;
- trending/context sidebars;
- full institutional navigation and footer;
- visible advertising inventory;
- disciplined large-format serif typography;
- article research/context rail;
- reader account and appearance controls.

### Mobile and tablet

Mobile is an app-style news product rather than a smaller desktop page:

- compact sticky masthead;
- list-based mobile news feed;
- smaller editorial images and headline sizes;
- scrollable section/topic rail;
- bottom navigation: Home, Latest, Ask AI, Saved, More;
- persistent sheets for menu/search/saved/profile;
- no desktop footer;
- safe-area-aware spacing and touch targets;
- mobile advertising variant;
- native-style article density.

All footer/institutional destinations available on desktop are reachable through **More** on mobile.

## 3. Reader accounts

Use the profile icon in the masthead to sign in or create a reader account.

Reader state contains:

- reader identity;
- Premium status;
- saved stories;
- reading history;
- briefing/topic preferences;
- theme preference.

### Presentation Premium reader

**Email:** `reader@healthtimes.co.zw`  
**Password:** `HealthTimes#Reader26`

This account is intended for client review of the subscribed experience.

New reader accounts can also be created from the public UI. The current client-review release stores reader accounts in browser-local state. Production must use secure managed authentication and server sessions.

## 4. Light, dark and system themes

Reader appearance can be changed from the profile/account controls.

Available modes:

- **System** — follows device/browser color preference;
- **Light**;
- **Dark**.

The preference persists in the browser and applies across public reading surfaces and the Newsroom extension layer.

## 5. HealthTimes Premium — core commercial behavior

Premium is priced at **US$5/month** in the current proposition.

### Per-story reading allowance

Every Premium story is controlled independently for a non-subscriber.

1. Opening a Premium story starts that reader’s allowance for that specific story.
2. After approximately eight seconds, a small Premium notice appears without interrupting reading.
3. At roughly twenty seconds, the notice becomes a stronger countdown reminder.
4. At thirty seconds, protected content locks automatically.
5. The membership sheet opens automatically.
6. Closing or selecting **Not now** dismisses the sheet but does not unlock the article.
7. The reader can still navigate the rest of HealthTimes.
8. Refreshing/reopening does not restart the allowance for that reader/story.
9. A subscribed reader bypasses the gate.

Guest preview state and signed-in reader preview state are separated by reader identity.

### Premium research tools

Premium research can expose:

- full protected article;
- **Cite this research** / copy citation;
- save and reading history;
- article-level Ask HealthTimes;
- related evidence/coverage;
- member briefings;
- reduced advertising interruptions.

### Editorial Premium control

Authorized Newsroom editors can mark a mapped story **Public** or **HealthTimes Premium**. That choice is synchronized into the public reader access model in the same browser data layer.

### Production replacement

The final live product must enforce entitlement server-side or at the edge. Browser-local access state is not secure enough for paid research.

## 6. Advertising

Advertising is a retained HealthTimes revenue product, not decorative filler.

The current source publication’s prominent HOSPAZ annual-general-meeting creative is represented as the first campaign in the modern advertising inventory.

### Public placements

The client-review build supports:

- desktop masthead leaderboard;
- compact mobile campaign placement;
- homepage in-feed slot;
- article placement for free readers;
- placement map for future topic/briefing sponsorship;
- reduced advertising for Premium readers.

Every placement is labelled as paid advertising/sponsorship and includes a statement separating advertising from editorial coverage.

### Newsroom Advertising Manager

Available to roles with commercial authority.

Campaign fields include:

- advertiser;
- campaign name;
- desktop creative URL;
- mobile creative URL;
- destination;
- placement;
- status;
- review state;
- disclosure label;
- start/end dates;
- local presentation impressions/clicks.

Do not interpret the browser-local metrics as production analytics. They exist only to demonstrate the management model.

### Health advertising governance

Commercial staff cannot silently edit editorial stories. Health-related commercial claims should receive appropriate review before publication and sponsored material must be visually disclosed.

## 7. Source sections and archive

Open `archive.html` to view the migration/parity catalogue.

The modernization retains or tracks:

- Breaking News;
- Feature;
- Epidemics;
- Abortion Compendium;
- Academic & Research;
- Global Health;
- Community Development;
- Communicable Diseases;
- Noncommunicable Diseases;
- HIV/AIDS;
- Policy;
- Public Health;
- Jobs;
- Opinion & Analysis;
- Fellowships & Grants;
- Training & Courses;
- Research & Findings;
- BARAZA E-PAPER;
- HealthTimes Premium;
- Videos;
- About/Contact/Corrections.

The formal migration record is `docs/HEALTHTIMES_SOURCE_PARITY_REGISTER.md`.

The client-review catalogue includes current official HealthTimes story imagery and a broad sample of recent reporting. Final approval triggers a full CMS/media/URL migration, not manual re-entry.

## 8. Public article tools

Article pages include:

- headline and standfirst;
- author and beat;
- date/update/read-time metadata;
- primary-source/reviewer context;
- reading progress;
- save;
- share;
- WhatsApp comment/discussion;
- recognizable WhatsApp/Facebook/X/LinkedIn icons;
- correction route;
- related reporting;
- Ask HealthTimes prompts;
- citation tools on Premium research.

## 9. Ask HealthTimes / HealthTimes Intelligence

Ask HealthTimes is a journalism research/discovery assistant.

Typical uses:

- summarise the current story;
- explain why it matters;
- explain it in plain language;
- show related HealthTimes coverage;
- search HealthTimes topics;
- explain Premium.

### Medical safety boundary

Ask HealthTimes must not diagnose a person, prescribe medicine, provide dosage instructions or impersonate a clinician. Potential emergency/individual-care requests should direct the reader to qualified medical or emergency services.

Production should replace static browser matching with server-side RAG over the authoritative HealthTimes CMS, including provenance, logging and safety monitoring.

## 10. WhatsApp and social

Primary WhatsApp desk: **+263 77 628 0754**  
Secondary: **+263 772 679 680**

Article WhatsApp actions include the story title/URL so comments arrive with context. Private journalist telephone numbers are not exposed by default.

Other article sharing includes Facebook, X, LinkedIn, native share and copy-link fallback.

Tips/corrections: **editorial@healthtimes.co.zw**.

## 11. My HealthTimes briefings

Open `preferences.html`.

Readers can choose topics such as breaking health news, HIV/AIDS, policy, medical research, mental health, maternal/child health, medicines, health financing, innovation and Africa health.

Frequencies:

- Breaking alerts;
- Daily;
- Weekly HealthTimes;
- Premium weekly intelligence;
- Monthly research digest.

Channels:

- Email;
- WhatsApp;
- Browser notification presentation.

Production requires consent-aware subscriber records and real delivery providers.

## 12. Newsroom sign-in

Open `newsroom.html`.

Presentation credentials:

| Role | Username | Password |
| --- | --- | --- |
| Publisher / Owner | `publisher` | `HealthTimes#Publisher26` |
| Editor-in-Chief | `editor` | `HealthTimes#Editor26` |
| Reporter / Journalist | `reporter` | `HealthTimes#Reporter26` |
| Newsletter / Audience | `audience` | `HealthTimes#Audience26` |
| Commercial Manager | `commercial` | `HealthTimes#Commercial26` |

Accounts remain separate. There is no impersonation shortcut: sign out before signing into another staff identity.

## 13. Newsroom roles and separation

The governance model includes Publisher/Owner, Editor-in-Chief, Managing Editor, Section Editor, News Editor, Reporter, Health/Science Editor, Fact Checker, Copy Editor, Multimedia Editor, Social Editor, Newsletter Editor, Commercial Manager, Subscriber Manager and Analyst.

Important boundaries:

- reporters can create/edit own or assigned work and submit for review but cannot unrestrictedly publish;
- editorial leadership can review/publish and control Premium status;
- commercial roles can manage advertising/subscriber products but cannot silently edit editorial copy;
- subscriber service does not grant editorial authority;
- passwords are not displayed in staff listings.

## 14. Editorial workflow

Target lifecycle:

**Idea → Assignment → Draft → Source verification → Fact check → Health/science review when required → Copy edit → Ready/Scheduled → Published → Correction/Update → Archive**

### Create a story

1. Sign in with an authorized editorial account.
2. Choose **New story**.
3. Set headline, section, story type and access (**Public** or **HealthTimes Premium**).
4. Add assigned editor, standfirst and reporting/source notes.
5. Save as Draft.
6. Move through the authorized review workflow.

Published/approved Premium status is synchronized to the public access model for mapped client-review stories.

## 15. Newsroom modules

Core modules include:

- Overview;
- Stories;
- Assignments;
- Editorial Calendar;
- Review Queue;
- Media;
- Authors;
- Topics;
- Breaking News;
- Premium;
- **Advertising**;
- AI Desk;
- Audience;
- Newsletter;
- WhatsApp;
- Subscribers;
- Analytics;
- Staff & Roles;
- Settings;
- **Migration Parity**.

## 16. PWA and mobile-app pitch

HealthTimes is installable as a Progressive Web App through `site.webmanifest` and `sw.js`.

The repository also includes:

- `app/twa-manifest.json` — Google Play Trusted Web Activity/Bubblewrap scaffold;
- `capacitor.config.json` — Capacitor native-wrapper configuration scaffold;
- `docs/MOBILE_APP_PACKAGING.md` — Android/iOS build/signing guide;
- `docs/STORE_LISTING_METADATA.md` — store copy and screenshot checklist.

### Google Play

The intended path is a verified TWA around the final production PWA. A real Play submission requires final domain ownership, Digital Asset Links, publisher signing key and Play Console access.

### Apple App Store

The intended path is a Capacitor iOS wrapper. A signed App Store build requires macOS/Xcode, Apple Developer credentials, provisioning/signing and App Store Connect.

No store submission is claimed by this client-review repository.

## 17. UAT and deployment

Client-ready releases must pass:

- JavaScript syntax/static validation;
- local asset/link validation;
- Playwright/Chromium browser UAT;
- phone widths 375 and 430;
- tablet 768;
- 1024 landscape/small laptop;
- desktop 1440;
- wide desktop 1920;
- no horizontal overflow;
- no critical text overlap/clipping;
- stable menu/search/saved sheets;
- reader sign-in/signup/profile;
- theme persistence;
- Premium notice/warning/automatic lock and prompt;
- refresh-resistant per-story preview;
- subscriber bypass;
- advertising visibility/disclosure;
- Newsroom Premium/Advertising/RBAC paths;
- PWA manifest/service worker availability;
- successful GitHub Pages deployment.

The UAT workflow/report is maintained in the repository and Actions.

## 18. Troubleshooting

### Menu/Search/Saved closes immediately

The 2.1 release replaces the earlier delayed hide race with one active-sheet controller. If a sheet still closes without an explicit close/backdrop/Escape event, treat it as a regression.

### Premium preview appears already expired

Premium allowance is deliberately persistent per reader/story. Sign in as the Premium reader to bypass it, or clear the relevant browser test state only when resetting a client-review scenario.

### Premium remains locked after subscribing

Confirm the reader account is active and marked Premium. Production will replace this with server-side entitlements.

### Site request returns 404

Confirm the asset exists at the deployed Pages commit. CI/UAT checks first-party routes and PWA assets.

### `Unchecked runtime.lastError: Could not establish connection`

This frequently comes from a browser extension context. Separate extension-console errors from HealthTimes first-party network/application failures.

### Newsroom control missing

Check the signed-in staff role. Advertising and Premium controls are intentionally role-limited.

## 19. Production transition

Before a real launch, replace local browser state with:

- managed reader/staff authentication and MFA;
- secure sessions and server-side RBAC;
- authoritative CMS/database and revision/audit history;
- payment provider and server/edge Premium entitlement;
- real ad-serving/commercial analytics stack;
- consent-aware subscriber database;
- verified email/WhatsApp delivery;
- privacy-aware analytics;
- server-side AI retrieval/provenance/safety;
- final app icons and native signing;
- backups, monitoring and disaster recovery;
- migration crawl/redirect validation;
- security review and physical-device UAT.

## 20. Reference documents

- `docs/HEALTHTIMES_2_IMPLEMENTATION_PLAN.md`
- `docs/HEALTHTIMES_SOURCE_PARITY_REGISTER.md`
- `docs/MOBILE_APP_PACKAGING.md`
- `docs/STORE_LISTING_METADATA.md`
- browser manual: `manual.html`
