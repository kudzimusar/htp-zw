# HealthTimes 2.1 — Client Review, Premium, Newsroom, Audience and App Readiness Plan

**Repository:** `kudzimusar/htp-zw`  
**Public preview:** `https://kudzimusar.github.io/htp-zw/`  
**Programme:** HealthTimes modernization  
**Status:** Approved for implementation and client-review hardening  
**Original plan date:** 2026-09-09  
**Revision:** 2.1 — incorporates the Premium, advertising, parity, mobile, identity, theme, app-store and browser-UAT review

## 1. Purpose

This document is the authoritative implementation reference and client record for the HealthTimes modernization. It supersedes the narrower 2.0 scope while retaining its product principles and governance model.

The objective is to present HealthTimes as a credible semi-working digital publication, subscriber product, advertising platform, AI-assisted research destination and professional newsroom operating system. The public product must be strong enough for client review while the engineering documentation remains explicit about the frontend-only boundaries that must be replaced before production.

The modernization must preserve the original publication's content, commercial inventory, section taxonomy and recognizable brand equity. It must improve the experience without deleting business-critical parts of the existing site.

## 2. Product principles

HealthTimes is guided by six qualities:

1. **Authority** — serious health journalism, disciplined typography, strong sourcing and professional editorial workflows.
2. **Utility** — search, AI explanations, saved reading, citation tools, topic hubs and alerts.
3. **Habit** — email, WhatsApp, notifications and configurable briefings.
4. **Trust** — identifiable authors, editorial standards, corrections, provenance and health-AI safety.
5. **Commercial sustainability** — Premium subscriptions and clearly governed advertising inventory.
6. **Platform readiness** — installable web app plus documented Android and iOS store paths.

The visual system must avoid generic glassmorphism/AI styling. Mobile and desktop must share data and brand language but **must not share one compressed responsive UI**. They are separate presentation systems designed for their devices.

## 3. Mandatory client priorities

### 3.1 Premium research access — highest priority

Premium is the principal commercial requirement.

For every story marked Premium:

- an anonymous or non-subscribed reader receives a reading allowance of **less than 30 seconds**;
- the preview starts only when that specific Premium story is opened;
- preview state is persisted per **reader identity + article**, with a guest identity when signed out;
- refreshing or reopening the story does not reset the allowance;
- after roughly 7–10 seconds a small non-blocking notice states that the reader is viewing Premium research;
- around 20 seconds a clearer countdown/subscribe reminder appears;
- at 30 seconds protected content locks automatically;
- the subscription prompt opens automatically when the allowance expires;
- dismissing the prompt never unlocks protected content, but the reader can navigate elsewhere;
- a paid/subscribed reader bypasses preview restrictions;
- Premium readers should receive fewer advertising interruptions;
- Premium research should expose useful tools such as **Cite this research**, copy citation, save, Ask HealthTimes and related evidence.

The Newsroom must allow authorized editors to mark/unmark a story as Premium. The public reader experience must read the same shared story access state.

**Production boundary:** real paid entitlement and anti-circumvention enforcement must be server/edge-side before launch.

### 3.2 Advertising and commercial inventory

The original HealthTimes site visibly carries paid advertising, including the prominent HOSPAZ banner above the publication masthead. The redesign must preserve and improve this revenue capability.

The Newsroom requires an **Advertising Manager** containing:

- advertiser;
- campaign name;
- creative asset;
- click destination;
- desktop and mobile creative variants;
- placement;
- sponsor/advertisement disclosure label;
- campaign start/end;
- active/paused/scheduled state;
- commercial owner;
- editorial/health-claim review state where appropriate;
- basic presentation metrics for impressions/clicks without fabricating unavailable production analytics.

Initial advertising placements:

- desktop masthead / top leaderboard;
- mobile compact top campaign slot;
- homepage in-feed;
- article sidebar on desktop;
- article mid-story responsive placement;
- topic/section sponsorship;
- newsletter/briefing sponsorship;
- optional Premium-reduced inventory.

The current HOSPAZ AGM creative should be represented as the first recognizable real campaign from the source site.

### 3.3 Original-site parity

The client-review build must demonstrate that migration, not feature rediscovery, is the next step. A parity register must map the official site into the redesigned product.

Required taxonomy and products include at minimum:

- Home
- Breaking News
- Feature / Features
- Epidemics
- Abortion Compendium
- Academic & Research
- Global Health
- Community Development
- Communicable Diseases
- Noncommunicable Diseases
- HIV/AIDS
- Policy
- Public Health
- Jobs
- Opinion & Analysis
- Fellowships & Grants
- Research & Findings
- BARAZA E-PAPER
- HealthTimes Premium
- Family Health / SRHR where represented
- Mental Health
- Health Financing
- Africa
- Health Technology / Science & Innovation where represented
- Videos / YouTube playlist
- About Us
- Contact Us
- editorial policies and corrections
- advertising/commercial inventory
- authors and newsroom identity
- social/WhatsApp contact points

Current official stories and imagery visible on the source site's principal editorial surfaces must be represented in the local story/content catalogue or parity register with redesigned destinations. No source feature should silently disappear; anything intentionally deferred must be explicitly recorded.

## 4. Device-specific UX systems

### 4.1 Desktop editorial system

Desktop should behave as a premium newsroom website:

- disciplined multi-column editorial grids;
- top advertising inventory;
- stronger but bounded serif headlines;
- sidebars for trending, related context and advertising;
- explicit reader sign-in/profile affordance;
- full footer and institutional navigation;
- desktop-specific article rail and research context;
- no overlapping headings, metadata or sections.

### 4.2 Mobile/tablet native-news system

Phone and tablet must render a separate native-feeling news UI:

- compact sticky masthead;
- stable menu, search and profile controls;
- bottom app navigation;
- compact lead story rather than a desktop hero scaled down;
- smaller images with intentional mobile crops;
- list-style news cards with strong scanability;
- smaller mobile typography and spacing;
- bottom sheets that remain open until deliberately dismissed;
- no desktop footer on mobile/tablet — its destinations move into **More**;
- safe-area support;
- minimum 44px touch targets;
- no hover dependency;
- tablet-specific density rather than stretched phone cards.

The current sheet flicker must be eliminated by replacing stale asynchronous close timers with one authoritative active-sheet controller.

## 5. Reader identity and onboarding

The public publication requires a visible **Sign in / Create account / Profile** journey, completely distinct from Newsroom staff authentication.

Reader state includes:

- name and email;
- reader ID;
- Premium/subscriber status;
- saved stories;
- followed topics;
- reading history;
- email/WhatsApp/browser-alert preferences;
- theme preference;
- sign out.

Frontend-local identity is acceptable for this client-review release. Production must move identity, passwords, sessions, subscription status and consent to secure managed/server-side systems.

## 6. Theme and accessibility

Add complete **Light / Dark / System** theme support with persistent reader preference.

Theme coverage must include:

- desktop publication;
- mobile publication;
- articles;
- Premium;
- sheets/modals;
- AI;
- reader account/profile;
- preferences;
- Newsroom/admin;
- advertising cards;
- manual.

The dark theme must be designed rather than produced by simple inversion.

Accessibility requirements include keyboard-operable dialogs, visible focus, meaningful labels, accessible social icons and sufficient contrast.

## 7. Public editorial quality and trust

Required public journalism features:

- author, beat, date, update date and reading time;
- source/reviewer/context metadata;
- source links;
- correction route;
- reader feedback;
- developing-story treatment where relevant;
- save/share/WhatsApp discussion;
- related coverage;
- topic hubs;
- author/team information;
- standards and contact pages;
- cite/copy citation on research-heavy and Premium stories.

## 8. Ask HealthTimes / HealthTimes Intelligence

AI remains a major HealthTimes differentiator.

Required behavior:

- central mobile action;
- article-level grounded prompts;
- site-level retrieval across the local HealthTimes catalogue;
- summary, significance, plain-language explanation and related coverage;
- provenance language distinguishing HealthTimes reporting, source claims and general information;
- no diagnosis, prescribing or medication dosing;
- emergency redirection;
- deeper Premium positioning without making useful discovery completely paid.

## 9. WhatsApp, social and audience relationship

Use recognizable accessible icons for:

- WhatsApp
- Facebook
- X
- LinkedIn
- Instagram
- YouTube
- email
- share
- bookmark
- search
- menu
- profile
- theme

WhatsApp is a first-class channel for comments, article sharing, tips and briefings. Reader/private journalist phone numbers must not be exposed by default; publication-level destinations are used.

## 10. Newsroom administration and governance

Preserve and expand the role model:

- Publisher / Owner
- Editor-in-Chief
- Managing Editor
- Section Editor
- News Editor
- Reporter / Journalist
- Health / Science Editor
- Fact Checker
- Copy Editor
- Multimedia Editor
- Social Editor
- Newsletter Editor
- Commercial Manager
- Subscriber Manager
- Analyst

Required modules:

- Overview
- Stories
- Assignments
- Editorial Calendar
- Review Queue
- Media
- Authors
- Topics / Sections
- Breaking News
- Premium
- **Advertising Manager**
- AI Desk
- Audience
- Newsletter
- WhatsApp
- Subscribers / Reader Accounts
- Analytics
- Staff & Roles
- Settings
- Parity / Migration Register

Workflow remains:

Idea → Assignment → Draft → Source verification → Fact check → Health/science review where needed → Copy edit → Ready/Scheduled → Published → Correction/Update → Archive.

Commercial staff may manage campaigns, sponsorship and subscriber operations but cannot silently modify editorial copy. Reporters cannot unrestrictedly publish or administer accounts.

## 11. Audience preferences and briefings

“My HealthTimes” must support:

- followed topics;
- breaking, daily, weekly, Premium weekly and monthly research frequencies;
- email;
- WhatsApp;
- browser notification presentation;
- persisted preferences;
- briefing preview built from published stories.

## 12. App readiness: PWA, Google Play and Apple App Store

### 12.1 PWA baseline

The public app must be installable as a Progressive Web App with:

- web manifest;
- standalone display mode;
- service worker;
- installable/offline shell;
- app icons;
- theme/background colors;
- start URL and scope;
- shortcuts where suitable;
- mobile meta tags;
- documented privacy/support URLs.

### 12.2 Google Play

Prepare a pitch-ready Android path using a web-first wrapper such as Trusted Web Activity/Bubblewrap (or an equivalent justified wrapper) around the production HTTPS/PWA surface.

Repository deliverables should include:

- Android package/application ID proposal;
- Bubblewrap/TWA manifest/config scaffold or equivalent;
- Digital Asset Links production instructions;
- store listing metadata draft;
- icon/screenshot requirements;
- release/signing checklist;
- testing checklist;
- instructions to generate/upload an Android App Bundle once final signing credentials are available.

No claim of actual Play submission is made without signing/account access.

### 12.3 Apple App Store

Prepare the PWA for iOS installation and document a Capacitor/WKWebView-style App Store wrapper path where appropriate.

Repository deliverables should include:

- iOS bundle ID proposal;
- Capacitor/App configuration scaffold;
- app metadata draft;
- icon/splash/screenshot checklist;
- privacy/support requirements;
- macOS/Xcode signing and App Store Connect steps;
- clear note that an actual signed App Store build requires Apple Developer credentials and Xcode signing.

## 13. Content and brand assets

Use official public HealthTimes branding/assets where accessible and appropriate, including:

- recognizable HealthTimes logo/brand treatment;
- official article images;
- HOSPAZ paid creative;
- existing social/YouTube destinations;
- e-paper/document products;
- current public newsroom contact information.

Assets should be locally referenced when appropriate for deployment reliability, or explicitly documented when retained as source-hosted migration placeholders.

## 14. Data model for the client-review build

No production database is required. The client-review release may use:

- repository-owned structured story/category/campaign data;
- `localStorage` for reader identity, preferences, story overrides, Premium preview state and presentation analytics;
- shared local story override state so Newsroom Premium toggles influence the public experience in the same browser;
- clear adapters/interfaces for later CMS/backend replacement.

Public UI must avoid obvious labels such as “fake database” or “demo account.” Technical documentation must remain accurate about frontend-only security/payment/messaging limitations.

## 15. UAT and release certification

The release cannot be considered client-ready until browser UAT is complete.

### 15.1 Required Playwright/Chromium viewports

At minimum:

- 375px phone
- 430px phone
- 768px tablet
- 1024px small laptop/tablet landscape
- 1440px desktop
- 1920px wide desktop

### 15.2 Automated assertions

Playwright/Chromium must test:

- no horizontal overflow;
- no overlapping/stacked text blocks;
- no clipped primary content;
- mobile and desktop render different presentation systems;
- mobile sheets remain open after click and close only deliberately;
- search, saved and More work repeatedly without flicker;
- Sign in, Create account, Profile and Sign out;
- reader state persistence;
- Light/Dark/System persistence;
- Premium per-story preview start;
- early Premium notice;
- countdown reminder;
- automatic lock at 30 seconds;
- automatic subscription prompt;
- refresh does not reset Premium preview;
- subscriber bypass;
- citation action;
- WhatsApp/social links;
- ad rendering and correct disclosures;
- Newsroom Premium toggle;
- Advertising Manager access;
- reporter/editor/commercial RBAC boundaries;
- local asset requests do not return 404;
- core Pages routes load;
- PWA manifest/service worker are reachable.

### 15.3 Review after every phase

After each major phase:

1. run syntax/static validation;
2. inspect the affected public/admin UI;
3. compare implementation against this plan;
4. fix discrepancies before starting the next phase.

At completion:

1. run the full Playwright/Chromium suite;
2. inspect screenshots/artifacts;
3. compare against this plan and the parity register;
4. fix failures/gaps;
5. rerun until green;
6. deploy through GitHub Pages;
7. verify Actions and deployment success.

## 16. Documentation deliverables

The repository must contain and maintain:

1. This implementation/client record.
2. `HEALTHTIMES_SOURCE_PARITY_REGISTER.md`.
3. Updated Operations Manual.
4. Browser-readable manual with downloadable source.
5. README architecture/deployment/credentials notes.
6. PWA and mobile-store packaging guide.
7. UAT checklist/certification record.
8. Store listing metadata draft.
9. Production replacement/security notes.

## 17. Production replacement boundaries

Before production launch, replace:

- local reader/staff credentials → managed identity, MFA/session controls;
- browser-local RBAC → server-side authorization;
- local story data/overrides → authoritative CMS/database and revision history;
- local Premium state → payment provider + server/edge entitlement;
- client preview timing → server/edge access enforcement;
- local ad state/metrics → ad server or controlled commercial CMS/event pipeline;
- local preferences → consent-aware subscriber database;
- simulated sends → verified email/WhatsApp providers;
- static AI retrieval → server-side RAG over the authoritative CMS with safety/logging;
- local analytics → privacy-aware analytics/event pipeline;
- wrapper scaffolds → signed, audited Android/iOS release builds.

## 18. Final owner/client handoff

At completion the owner should receive:

- live GitHub Pages URL;
- final commit and Actions status;
- public reader account instructions/credentials;
- Newsroom credentials for multiple roles;
- Premium test instructions;
- Advertising Manager test instructions;
- app/PWA install instructions;
- Android and iOS packaging/readiness documentation;
- source parity register;
- operations manual;
- UAT certification evidence;
- known production-only boundaries;
- recommended migration/production phase.
