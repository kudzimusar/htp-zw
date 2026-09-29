# HealthTimes Native, PWA & Desktop Design Specification

**Repository:** `kudzimusar/htp-zw`  
**Canonical document:** `docs/native-mobile/DESIGN.md`  
**Version:** 2.0  
**Status:** OWNER/CLIENT-APPROVED VISUAL AUTHORITY — UI RECOVERY BASELINE  
**Revision date:** 2026-09-29  
**Applies to:** iOS, Android, mobile PWA, tablet PWA, desktop PWA/Web, HealthTimes Studio/Admin  
**Product authority companion:** `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`  
**Canonical Reader implementation:** `apps/mobile`  
**Approved visual asset:** `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`

---

## 1. Purpose and authority

This document is the binding visual and interaction specification for HealthTimes Reader, HealthTimes Studio, native iOS/Android, and the shared PWA/Web product.

It refreshes the original v1 specification after programme review identified material drift between the client-approved wireframe and the product that implementation agents produced.

The governing split is:

```text
OWNER / CLIENT-APPROVED WIREFRAME
= binding visual composition, hierarchy and product emphasis

NATIVE MOBILE MASTER PLAN
= what the product must do, product architecture and capability direction

DESIGN.md
= how those capabilities must look, feel, organize information and behave visually

AG / NM / COM AUTHORITIES
= source, migration, security, content, communications, entitlement and provider truth

apps/mobile
= canonical Reader implementation for Web/PWA/iOS/Android
```

No implementation agent may treat the wireframe as loose inspiration. Agent preference, convenience, generic component defaults, or a new design trend do not outrank this specification.

An intentional material departure requires an explicit owner/client-approved design exception recorded in the repository.

This v2 revision is documentation/governance only. It does not itself authorize broad runtime redesign. Runtime remediation is released sequentially by the UI Moderator.

---

## 2. Approved wireframe custody

The approved board contains 18 numbered surfaces:

1. Home
2. Explore
3. Search (Intelligent)
4. Article Reader
5. Live
6. Watch / Video
7. Listen / Audio
8. Saved / Offline
9. My HealthTimes
10. Country / Edition
11. Premium
12. Advertisements
13. Notifications
14. Social / Deep-Link
15. Analytics (Events View)
16. HealthTimes Studio (Admin)
17. Role-Based Access
18. Onboarding (Welcome)

The image at `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png` is the primary visual reference and is the full-resolution owner-approved board supplied for this UI governance baseline.

The wireframe uses illustrative content, prices, audience counts and advertising examples. The **layout, hierarchy, navigation model, relative emphasis and product identity are authoritative**. Illustrative business facts are not authoritative.

Runtime prices, subscription products, viewer counts, analytics totals, ad destinations, Premium entitlements, media URLs and provider states must come from the owning services.

---

## 3. Why v2 exists — documented regression causes

### 3.1 Approved image was not in repository custody

The original design specification named the wireframe asset path, but the actual board was absent. Agents implemented from prose and memory rather than comparing executable screens against the approved board.

**Rule:** visual certification is invalid if the approved visual asset is absent or not referenced by the task.

### 3.2 Technical conformance was mistaken for visual conformance

Existing tests correctly protected hydration, Hook order, desktop tab suppression, Premium visibility, fail-closed advertising and removal of internal terminology. Those checks are necessary but do not prove that Home looks like Home, Premium looks like Premium, or My HealthTimes has the approved information hierarchy.

**Rule:** static tests are not a substitute for exact-head rendered evidence and screen-by-screen visual comparison.

### 3.3 Shared shell drift affected every screen

The canonical Reader evolved a persistent environment banner, a large shared header and a mobile utility row. Together these added substantial vertical chrome and made most mobile screens structurally different from the approved board.

**Rule:** the phone shell must remain compact. Search, notifications, edition and Premium must be discoverable without creating a second permanent navigation bar.

### 3.4 Generic reusable components flattened product identity

Heavy reuse of `StoryGrid`, `StoryList`, `Chip`, `SectionHeader`, bordered panels and one generic `AdSlot` created implementation consistency but made intentionally different product surfaces look too similar.

**Rule:** reuse primitives, not whole visual identities. Home, Explore, Live, Watch, Listen, Premium and My HealthTimes must remain recognizably different destinations.

### 3.5 Data richness was not translated into an editorial presentation model

HealthTimes has thousands of migrated public objects, but a bounded feed plus client-side filtering can still produce a lean or repetitive front page.

**Rule:** database volume is not UI richness. Home requires a deliberate editorial projection: lead story, top stories, Live, Premium, desk sections, Watch, opportunities, most-read/trending when verified, and strategic advertising.

### 3.6 Revenue-critical features were protected but under-emphasized

Premium and advertising were correctly kept truthful and fail-closed, but their importance to the client's business was not reflected consistently in the UI.

**Rule:** Premium is a Tier-1 product surface. Advertising is a first-class commercial subsystem. Neither may be hidden, improvised or treated as an afterthought.

### 3.7 Internal architecture language leaked into reader UI

Terms such as authority, canonical, migration, source parity, configuration-required, storage boundary and staging are legitimate engineering concepts but poor reader-facing copy.

**Rule:** preserve the truth while translating it into publication-quality language.

### 3.8 Deployment state and canonical product state diverged

A public URL may serve a stale or different runtime from the SHA certified by programme work.

**Rule:** every UI review records executable SHA, deployment identifier/URL and screenshot evidence. React hydration failures and desktop mobile-nav regressions are release blockers even if an older branch previously passed.

### 3.9 Native/tablet/dark-state evidence was incomplete

Missing evidence was sometimes correctly recorded as unknown, but the overall product still lacked a complete matrix across claimed platforms.

**Rule:** missing evidence is **NOT CAPTURED / NOT CERTIFIED**, never a pass.

---

## 4. Design intent

HealthTimes must feel like:

- a premium global health-news publication;
- serious, trustworthy and editorially disciplined;
- modern without looking generic or overly AI-styled;
- mobile-first without becoming simplistic;
- content-rich without becoming cluttered;
- commercially capable without becoming ad-heavy;
- global without losing regional/local identity;
- native on iOS and Android;
- visually consistent with the PWA while adapting to platform conventions.

The Reader should feel closer to a premium international newsroom application than to a generic responsive website or SaaS dashboard.

Journalism and editorial hierarchy remain visually dominant.

---

## 5. Non-negotiable visual language

### 5.1 Reader

Use:

- white and near-white primary surfaces;
- HealthTimes blue as the principal brand/action color;
- deep navy for primary text;
- restrained cyan/teal accents;
- neutral gray for metadata and borders;
- red only for Live, breaking and critical states;
- green only for successful/positive states;
- gold/amber sparingly for Premium identity, never as proof of entitlement or pricing;
- subtle separators rather than heavy boxes;
- image-forward editorial composition.

Do not drift into:

- glassmorphism;
- excessive gradients;
- neon AI aesthetics;
- every control as a pill;
- heavy shadows on every card;
- decorative animation with no user goal;
- generic dashboard styling in the public Reader;
- stretched-phone desktop layouts;
- duplicate navigation systems;
- technical/staging language in reader surfaces.

### 5.2 Studio

Studio may be denser and more operational:

- deep navy navigation;
- light working canvas;
- strong status/action hierarchy;
- commercial/editorial role separation;
- responsive tablet/desktop composition rather than a phone scale-up.

Studio presentation never changes AG-06 authorization.

---

## 6. Typography, spacing and iconography

### 6.1 Hierarchy

The order must remain unmistakable:

1. HealthTimes publication/brand
2. screen or route title
3. hero/lead story headline
4. story headline
5. standfirst
6. body copy
7. section/topic label
8. metadata
9. caption/credit
10. utility text

Article body text prioritizes long-form reading comfort: controlled line length, strong line height, system text scaling and accessible contrast.

### 6.2 Spacing

The approved board is compact but breathable:

- consistent horizontal gutters;
- compact metadata rows;
- clear section separation;
- limited nested cards;
- touch-safe spacing;
- minimum 44px-equivalent interaction targets where possible.

### 6.3 Icons

Use a coherent icon language for navigation and article actions. Do not replace every icon with a text button. Icon-only controls require accessible labels.

---

## 7. Global shell and responsive model

### 7.1 Mobile shell

The default mobile shell is:

```text
system status/safe area
compact HealthTimes/page header
optional local tabs/filters for the current surface
content
five-destination Reader bottom navigation
```

A permanent environment banner must not dominate client-facing mobile builds. Staging identity may be exposed discreetly.

### 7.2 Five Reader destinations

1. Home
2. Explore
3. Live
4. Watch
5. My HT / My HealthTimes

Bottom navigation is a mobile/tablet Reader pattern. Desktop must not show the mobile five-tab bar.

### 7.3 Persistent utilities

Search, Notifications, Edition and Premium remain discoverable. On phone they must not create a second permanent full-width navigation row on every screen.

### 7.4 Tablet

Tablet should use additional width deliberately. Do not simply enlarge the phone layout. Avoid redundant top and bottom navigation where one clear model is sufficient.

### 7.5 Desktop / PWA

Desktop is a publication composition:

- masthead/header;
- desktop navigation;
- responsive editorial columns;
- wider but controlled content measure;
- appropriate side/inline commercial inventory;
- no mobile bottom tab bar.

### 7.6 Hydration and responsive correctness

React hydration mismatch/regeneration, structurally different server/client shells and desktop mobile-tab regressions are P0/P1 release issues.

Responsive changes must be deterministic and exact-head tested.

---

# 8. Primary Reader/commercial screen contracts

Screens 1-12 are the first client-facing conformance set.

## 8.1 Screen 1 — Home

Approved composition:

```text
compact HealthTimes header
editorial filters: For You / Latest / Edition / World / Health
image-led hero with strong headline treatment
LIVE NOW horizontal rail when active
Top Stories compact rows
additional editorial modules
Premium highlights
Watch
strategic ads
```

Requirements:

- the above-fold experience must immediately read as a newsroom front page;
- hero is visually dominant;
- Live collapses when no verified Live item exists;
- Top Stories favors scanning;
- Premium reporting is clearly identified;
- desktop expands the same hierarchy into an editorial grid rather than stretching the phone.

Home should consume a deliberate presentation contract such as:

```text
lead_story
top_stories
live_now
latest
premium_highlights
editorial_sections
watch_highlights
opportunities
most_read_or_trending_when_verified
ad_inventory
```

Do not create 15 equal-weight repeated grids from one small feed window and call that data richness.

## 8.2 Screen 2 — Explore

Approved composition:

- prominent Explore title;
- search affordance;
- visually recognizable primary topic shortcuts;
- clean two-column category tiles on phone;
- additional taxonomy behind progressive disclosure.

Avoid dumping the full taxonomy into the initial view. Explore is discovery, not an administrative taxonomy browser.

## 8.3 Screen 3 — Intelligent Search

Initial state:

- search field;
- compact format tabs: All / Articles / Videos / Audio / Authors where supported;
- suggested/example searches;
- concise intelligent-search explanation.

Country/topic/desk filters should use progressive disclosure rather than occupy most of the initial mobile screen.

Search ranking and results must remain source-backed. Raw sensitive health searches must not be copied into analytics.

## 8.4 Screen 4 — Article Reader

Approved composition:

- minimal back/action toolbar;
- hero media;
- section/Premium identity;
- strong headline;
- byline, publication time and reading-time treatment;
- clean long-form body;
- inline media/captions/credits;
- Save / Listen / Share / text controls as compact actions;
- responsive in-article advertising;
- related coverage.

Large rows of text buttons should not dominate the top of the article.

### Premium preview

For Premium articles, anonymous/non-entitled readers may receive only the authorized preview payload.

Do **not** send the full protected body and hide it with a timer.

The desired journey is:

```text
Premium headline
-> standfirst / approved preview portion
-> short timed or limited preview
-> paywall transition
-> Go Premium / member sign-in
-> full body only after authoritative entitlement
```

Preview duration/limit should be configurable by authorized product/commercial policy rather than silently hard-coded.

## 8.5 Screen 5 — Live

Approved composition:

- strong Live identity and red semantics;
- Live Now / Live Blog / Upcoming tabs;
- dominant featured Live item;
- thumbnail/headline list below;
- verified update/viewer metadata only where available.

Remove engineering explanations from the primary reader experience. When no Live item exists, show a polished truthful state.

## 8.6 Screen 6 — Watch / Video

Approved composition:

- Latest / Popular / Series / Live / Shorts tabs where supported;
- large featured player/card;
- play icon and verified duration;
- compact video list below.

Use dedicated featured-video and video-row components rather than one generic story grid.

Do not invent view counts.

## 8.7 Screen 7 — Listen / Audio

Approved composition:

- Latest / Podcasts / Articles / Offline;
- prominent audio-player identity;
- title/episode/programme metadata;
- progress/duration;
- clear play/pause control;
- programme/series rows.

The UI can be visually ready before the corpus is rich, but it must not invent podcasts, audio URLs or episodes.

## 8.8 Screen 8 — Saved / Offline

Approved composition:

- Articles / Videos / Audio / Offline tabs;
- thumbnail-rich personal library;
- clear offline availability;
- Watch Later or equivalent only when supported;
- concise empty states.

Do not expose implementation language such as "Reader storage boundary" to readers.

## 8.9 Screen 9 — My HealthTimes

Approved hierarchy:

1. reader identity/profile
2. membership state
3. prominent Go Premium / Premium status
4. My Profile
5. Countries & Interests
6. Saved
7. Downloads
8. Reading History
9. Notifications
10. My Subscriptions
11. Payment/commerce route only when authoritative
12. Settings
13. Help & Support
14. Sign Out

Each meaningful row should represent an intentional destination/flow. Multiple unrelated rows should not all collapse into one generic page.

Institutional/publication links belong in About/Help unless the design explicitly calls for them.

HealthTimes Studio should appear only to authorized staff and must not dominate the consumer account hub.

## 8.10 Screen 10 — Country / Edition

Approved composition:

- search country/region;
- concise Popular list first;
- flags or clear country identity where feasible;
- radio-style primary edition selection;
- Show More Countries;
- small set of content preference controls;
- strong Save Preferences CTA.

Do not render every country/region/topic as a giant initial chip cloud.

Edition preference is not billing country.

## 8.11 Screen 11 — Premium

Premium is a flagship client/business surface.

Approved composition:

- clear Premium identity/crown;
- concise value proposition;
- monthly/yearly or equivalent product selector when authoritative products exist;
- attractive plan cards;
- benefits with check treatment;
- recommended/most-popular emphasis only when approved;
- prominent conversion CTA;
- existing-member sign-in/restore path;
- Premium journalism visible as part of the value proposition.

### Truth boundary

Wireframe prices such as $4.99/$9.99 are illustrative. Runtime price, currency, trial and product identifiers must come from StoreKit/Google Play/web billing authority.

### Cross-product prominence

Premium discovery should be visible in Home, Article, My HealthTimes and appropriate Search/Explore/Notifications surfaces without turning the publication into a sales funnel.

## 8.12 Screen 12 — Advertising

Advertising is a designed inventory system, not one generic rectangle.

Placement families should include device-appropriate variants such as:

- mobile top/banner unit;
- 300x250-style in-article/mobile rectangle where appropriate;
- mobile bottom/in-feed banner;
- desktop leaderboard/wide header unit;
- desktop/tablet in-content unit;
- direct HOSPAZ placement;
- Watch/Live/feed placements where approved.

Rules:

- always clearly labelled;
- reserve layout space to reduce layout shift;
- do not overpower editorial hierarchy;
- creative dimensions adapt to viewport and placement;
- sensitive-health advertising remains non-personalized where required;
- no clickable destination without verified destination authority;
- no fabricated campaign, schedule, targeting or performance.

---

# 9. Secondary screen contracts

## 9.1 Screen 13 — Notifications

Clear filters and compact notification rows. Marketing, breaking/live, subscription and system notices must respect consent/eligibility authority.

## 9.2 Screen 14 — Social / Deep-Link

Native/system share flows, verified attributed URLs, app/deep-link behavior and graceful web fallback. Do not invent unavailable channels.

## 9.3 Screen 15 — Analytics / Events View

Analytics UI may show only source-backed values. Never fabricate page views, active users, revenue, traffic sources or growth percentages to match the mockup.

## 9.4 Screen 16 — HealthTimes Studio

Dark operational navigation + light working canvas, clear Today/tasks/activity composition and role-specific modules. Preserve AG-06/CA-01 authority.

## 9.5 Screen 17 — Role-Based Access

Role presentation is explanatory UI, not authorization. Actual capabilities come from AG-06/server authority. Local labels must never self-escalate a user.

## 9.6 Screen 18 — Onboarding

Short, focused, brand-led welcome without full Reader chrome. Global News / Trusted Journalism / HealthTimes value, Get Started and existing-account sign-in should be obvious.

---

# 10. Premium commercial journey

The client considers Premium a central business tool. UI work must measure the complete path:

```text
Home Premium discovery
-> Premium story badge
-> Premium article preview
-> secure timed/limited paywall
-> Premium landing / product selection
-> store/web checkout authority
-> entitlement verification
-> full protected article access
-> My HealthTimes membership status
```

A failure anywhere in this path is a product defect even if the underlying service exists.

The UI must never imply successful payment/subscription before provider/server confirmation.

---

# 11. Reader-facing language

Reader UI should sound like a publication, not a migration tool.

Avoid reader-facing phrases such as:

- canonical authority;
- legacy source taxonomy;
- migration source;
- configuration-required;
- staging authority;
- Reader storage boundary;
- certification state;
- provider-independent proof.

Translate them while retaining truth.

Example:

```text
Internal: Native storefront products are not configured.
Reader: Membership options are not available here yet. Already a member? Sign in.
```

---

# 12. Accessibility and interaction quality

Accessibility is a shipping requirement.

Preserve or improve:

- semantic roles;
- accessible labels/hints;
- selected/disabled announcements;
- minimum touch targets;
- keyboard/focus behavior on Web/Desktop;
- sufficient contrast;
- dynamic/system text scaling;
- reduced-motion respect;
- useful loading announcements/live regions;
- logical focus/navigation order;
- alt text/captions/credits where authoritative data exists.

A visually prettier change that removes accessibility semantics is a regression.

---

# 13. Loading, empty, offline, error and restricted states

Every major surface must be intentionally designed for applicable states:

- loading;
- populated;
- empty;
- offline;
- transient network failure;
- permission restricted;
- anonymous/authenticated;
- Premium preview/locked/entitled;
- media unavailable;
- provider/configuration unavailable.

Empty states should be concise and useful. Do not fill them with engineering explanations or fake content.

---

# 14. Runtime, deployment and evidence invariants

Every UI acceptance receipt records:

- repository and branch;
- exact executable SHA;
- base/starting SHA;
- deployment ID/URL or binary artifact ID;
- viewport/device matrix;
- before/after evidence where remediation occurred;
- relevant console/runtime errors;
- exact tests/workflows;
- unresolved evidence gaps;
- production-modification statement.

## 14.1 P0 UI blockers

Examples:

- app/page fails to load;
- React hydration mismatch/regeneration;
- navigation unusable;
- public route crash;
- protected content exposed;
- severe overflow preventing use.

## 14.2 P1 UI blockers

Examples:

- desktop shows mobile bottom navigation;
- major approved navigation absent;
- Premium route/entry point absent;
- screen composition materially contradicts the wireframe;
- essential content unreachable;
- critical native phone/tablet divergence.

## 14.3 P2

Material product-quality gap that does not completely block workflow: poor information architecture, repetitive feed rhythm, weak empty state, underdeveloped secondary surface.

## 14.4 P3

Copy, spacing, density or polish issue that does not materially block the workflow.

---

# 15. Exact-head visual certification matrix

Minimum shared Reader matrix:

| Environment | Required evidence |
| --- | --- |
| Mobile Web/PWA | 390x844 or current standard phone viewport |
| Tablet Web/PWA | approximately 834x1112 |
| Desktop Web/PWA | approximately 1440x1000 or larger |
| iOS phone | current supported iPhone simulator/device |
| Android phone | current supported emulator/device |

Expanded release matrix where applicable:

- iPad;
- Android tablet;
- dark mode on Home, Article, Premium, Watch and My HealthTimes;
- representative loading/empty/error/offline states;
- Premium preview/locked state;
- each responsive advertising class.

Missing evidence is **NOT CAPTURED / NOT CERTIFIED**.

---

# 16. UI Moderator operating model

The UI Moderator is a programme controller/certifier, not merely a designer and not the default primary implementation agent.

```text
specialist implementation
-> moderator independently inspects code/runtime/evidence
-> identify first proven defect/root cause
-> bounded moderator fix when safe
-> exact-head recertification
-> ACCEPT / REMEDIATE / BLOCK
-> next progressive bounded task
```

The UI Moderator preserves accepted architecture. A later visual defect does not rewrite another lane's historical technical acceptance.

---

# 17. UI specialist lanes

## UI-01 — Reader Shell / Home / Discovery / Web-PWA

Owns:

- global Reader shell;
- Home;
- Explore;
- Intelligent Search presentation;
- Live/Watch/Listen public presentation where not revenue-specific;
- mobile/tablet/desktop PWA composition;
- responsive/hydration shell correctness.

First priority after this design freeze: runtime/deployment/hydration recovery and shell fidelity.

## UI-02 — Native iOS / Android

Owns native realization of accepted shared design:

- safe areas;
- phone/tablet ergonomics;
- native navigation;
- keyboard/system UI interactions;
- iOS/Android device parity without creating separate product identities.

## UI-03 — Article / Premium / Advertising

Owns:

- Article Reader composition;
- secure timed Premium preview/paywall presentation;
- Premium landing/product presentation;
- responsive advertising inventory;
- inline media presentation.

May not invent prices, entitlements, campaigns, destinations, audience data or provider state.

## UI-04 — My HealthTimes / Account / Studio IA

Owns:

- My HealthTimes information architecture;
- Saved/Offline presentation;
- Edition/preferences presentation;
- profile/account/security/help flows;
- Studio presentation without changing AG-06 authorization.

## UI-05 — Accessibility / States / Responsive Quality

Cross-cutting specialist for:

- accessibility;
- dark mode;
- loading/error/empty/offline states;
- long text/unusual data;
- responsive overflow;
- focus/keyboard/touch behavior;
- device-edge regressions.

## UI-06 — Independent Visual Certification / Client UAT

Primarily evidence/certification and should not normally redesign the screen being certified.

Owns:

- exact-head screenshot packs;
- wireframe comparison;
- device matrix;
- before/after evidence;
- conformance register;
- client-UAT support;
- objective ACCEPT / REMEDIATE / BLOCK evidence for the UI Moderator.

---

# 18. Relationship to AG, NM and COM

UI consumes functional authority; it does not replace it.

### AG / Migration

AG remains authoritative for source/migration custody, SEO/public capability, Newsroom/security and integrated certification. UI controls presentation of those truths.

### NM

NM remains authoritative for native foundation, connectivity, content contracts, Reader capability, growth/security and native certification. UI governs whether those capabilities form the approved product experience.

### COM

COM remains authoritative for consent, eligibility, provider configuration, communications, newsletters, social/WhatsApp and delivery state. UI translates those states without changing their meaning.

### Conflict rule

When UI preference conflicts with security/source/provider authority, authority wins and UI solves the experience another way.

Examples:

- no full Premium body to anonymous users for a smoother timer;
- no clickable HOSPAZ creative without a verified destination;
- no fake Live event to avoid an empty state;
- no invented subscription price to match the mockup.

---

# 19. Sequential UI recovery programme

UI agents must not rewrite shared components concurrently.

## Phase 0 — Visual authority + runtime recovery

Exit requirements:

- approved wireframe under repository custody;
- v2 `DESIGN.md` accepted;
- canonical UI starting SHA recorded;
- actual public/staging deployment SHA known;
- React #418/hydration blocker eliminated;
- desktop mobile-tab regression eliminated;
- Home loads real source-backed content;
- Premium route visibly reachable;
- mobile/tablet/desktop exact-head baseline screenshots captured.

## Phase 1 — Shell + Home

Compact shell, five-tab behavior, desktop navigation, typography/tokens, Home hierarchy and data-rich front-page composition.

## Phase 2 — Commercial reader journey

Article Reader, Premium discovery, secure timed preview/paywall, Premium landing and responsive advertising.

## Phase 3 — Discovery

Explore and Intelligent Search.

## Phase 4 — Media

Live, Watch and Listen.

## Phase 5 — Reader ownership

Saved/Offline, My HealthTimes and Edition/preferences.

## Phase 6 — Full cross-device certification

Native adaptation, accessibility/states, dark mode, tablets and final exact-head client-UAT evidence.

Each phase starts from the moderator-cleaned accepted state of the prior phase.

---

# 20. Agent execution contract requirements

Every UI task must state:

- repository;
- branch;
- exact starting SHA;
- design authority version;
- specific screen/component ownership;
- required current-state inspection;
- authorized changes;
- forbidden changes;
- upstream AG/NM/COM authority to preserve;
- required viewports/devices;
- required data/states;
- screenshots/evidence;
- exact tests/workflows;
- rollback/stop conditions;
- final receipt format.

Vague tasks such as "make the app beautiful" or "redesign everything" are prohibited.

---

# 21. Manual-build checklist

A developer rebuilding a screen manually should follow this order:

1. Read the relevant Master Plan capability section.
2. Open the approved wireframe and locate the exact screen number.
3. Read the screen contract in this document.
4. Identify upstream source/security/provider authority.
5. Inventory the real data states available.
6. Build mobile composition first.
7. Implement loading/empty/error/restricted/populated states.
8. Add accessibility semantics before visual sign-off.
9. Adapt to tablet without stretching the phone.
10. Adapt to desktop/PWA as a publication layout.
11. Capture exact-head screenshots against the wireframe.
12. Run visual/hydration/regression/authority-preservation tests.
13. Return evidence to the UI Moderator; do not self-accept.

---

# 22. Design exception process

A material departure from the board is allowed only when one of these applies:

- platform convention materially requires adaptation;
- accessibility requires adaptation;
- verified data/capability is unavailable;
- security/provider authority forbids the illustrated behavior;
- desktop/tablet requires responsive expansion;
- owner/client explicitly approves a new direction.

Every material exception records:

- affected screen;
- wireframe behavior;
- proposed deviation;
- reason;
- supporting authority;
- before/after evidence where relevant;
- owner/moderator disposition.

Silent design drift is not permitted.

---

# 23. Acceptance statement

A HealthTimes UI screen is conformant only when:

- its hierarchy visibly corresponds to the approved board;
- source-backed data is represented truthfully;
- Premium/security/role/provider authority is preserved;
- accessibility is intact;
- required responsive widths/devices behave correctly;
- loading/empty/restricted states are intentionally designed;
- reader-facing copy is publication-quality;
- evidence comes from the exact executable SHA;
- the UI Moderator issues explicit acceptance.

Passing a unit test alone is not visual acceptance. Looking attractive in one screenshot alone is not product acceptance.

---

# 24. Version history

### v2.0 — 2026-09-29

- restores repository custody of the client-approved wireframe;
- records discovered UI regression causes;
- makes visual comparison an explicit certification requirement;
- elevates Premium to Tier-1 client/revenue priority;
- defines secure timed Premium preview/paywall behavior;
- defines responsive advertising placement families;
- protects compact mobile shell and desktop publication behavior;
- defines all 18 screen contracts, with Screens 1-12 as the primary Reader/commercial acceptance set;
- establishes UI-01 through UI-06 specialist lanes;
- defines the relationship to AG/NM/COM authorities;
- establishes sequential UI recovery phases and exact-head evidence requirements.

### v1.0 — 2026-09-19

Initial textual translation of the owner-approved HealthTimes native wireframe.

---

**UI GOVERNANCE FREEZE:** Until the UI Moderator releases Phase 0 implementation, this document and the approved wireframe define the target. This documentation revision alone does not authorize broad runtime redesign.
