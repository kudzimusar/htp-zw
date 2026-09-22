# HealthTimes Native & PWA Design Specification

**Repository:** `kudzimusar/htp-zw`  
**Document:** `docs/native-mobile/DESIGN.md`  
**Status:** APPROVED VISUAL DIRECTION — WIREFRAME BASELINE v1.0  
**Date:** 2026-09-19  
**Applies to:** iOS, Android, mobile PWA, desktop/tablet PWA, HealthTimes Studio/Admin  
**Companion document:** `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`

---

## 1. Purpose

This document translates the owner-approved HealthTimes native wireframe into an explicit implementation specification.

The Master Plan defines **what the product must do**.

This document defines **how the product must look, feel, organize information and behave visually**.

Agents must use both documents together:

```text
MASTER PLAN
= product architecture, capabilities, governance and technical direction

DESIGN.md
= approved visual structure, information hierarchy, layout, component language and UX rules

IMPLEMENTATION
= iOS + Android + rebuilt PWA following both
```

The approved wireframe is now the primary visual reference for HealthTimes Reader, HealthTimes Studio and the redesigned mobile PWA.

The wireframe must not be treated as loose inspiration. It is the design baseline.

Agents may refine implementation details for platform, accessibility, typography, safe areas and responsive behavior, but they must preserve the approved structure and overall visual language unless an explicit owner-approved change is recorded.

---

## 2. Approved wireframe

The approved visual reference is the first HealthTimes wireframe board reviewed by the owner on 2026-09-19.

It contains the following screens:

1. Home
2. Explore
3. Intelligent Search
4. Article Reader
5. Live
6. Watch / Video
7. Listen / Audio
8. Saved / Offline
9. My HealthTimes
10. Country / Edition
11. Premium
12. Advertising placements
13. Notifications
14. Social / Deep-Link flows
15. Analytics / Event view
16. HealthTimes Studio / Admin
17. Role-Based Access
18. Onboarding / Welcome

The visual asset should ultimately be committed to:

`docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`

Until that asset is committed, this document is the textual authority describing the approved wireframe.

---

## 3. Design intent

HealthTimes must feel like:

- a premium global health-news publication;
- serious, trustworthy and editorially disciplined;
- modern without looking generic or overly “AI styled”;
- mobile-first without becoming simplistic;
- content-rich without becoming cluttered;
- commercially capable without looking ad-heavy;
- global without losing regional/local identity;
- native on iOS and Android;
- visually consistent with the PWA.

The product should feel closer to a premium international newsroom application than to a generic responsive website.

---

## 4. Visual design language

### 4.1 Core appearance

Use:

- white and near-white primary surfaces;
- HealthTimes blue as the principal brand/action color;
- deep navy for primary text and Studio navigation;
- restrained cyan/teal accents where appropriate;
- neutral gray for secondary metadata and borders;
- red only for Live, breaking and critical states;
- green only for successful/positive status indicators;
- subtle separators rather than heavy boxes.

### 4.2 Avoid

Do not use:

- glassmorphism-heavy panels;
- excessive gradients;
- neon AI aesthetics;
- over-rounded containers;
- pill-shaped controls everywhere;
- strong shadows on every card;
- decorative animation with no function;
- dense dashboard styling in the public Reader;
- inconsistent platform-specific redesigns.

### 4.3 Surface philosophy

Reader:

- light;
- editorial;
- image-forward;
- calm;
- readable.

Studio:

- darker operational navigation;
- light working canvas;
- denser information;
- clear status and action hierarchy.

---

## 5. Typography

Typography must communicate editorial authority.

### 5.1 Hierarchy

Use a clear hierarchy:

- Publication/brand
- Screen title
- Hero headline
- Story headline
- Standfirst
- Body copy
- Section/topic labels
- Metadata
- Captions
- Utility text

### 5.2 Headline behavior

Headlines should:

- be visually stronger than supporting metadata;
- remain compact enough for mobile;
- wrap predictably;
- never overlap imagery or controls;
- avoid excessive boldness.

### 5.3 Body copy

Article body text must prioritize reading comfort:

- strong line-height;
- controlled line length;
- system text-scaling support;
- dark text on light surface;
- accessible contrast;
- paragraph rhythm suitable for long-form health journalism.

---

## 6. Spacing and density

The approved wireframe uses compact but breathable spacing.

Use:

- consistent horizontal page gutters;
- compact metadata rows;
- clear section separation;
- limited card nesting;
- touch-safe control spacing;
- minimum 44px equivalent touch targets where possible.

Mobile should not feel like a desktop website compressed into a narrow viewport.

---

## 7. Navigation model

### 7.1 Reader bottom navigation

Adopt the wireframe’s five-destination model.

Recommended labels:

1. Home
2. Explore
3. Live
4. Watch
5. My HT

The exact last label may display as `My HT`, `My HealthTimes` or `More` depending on final width, but the destination remains the personal/account hub.

### 7.2 Persistent top actions

Where relevant:

- HealthTimes brand
- search
- notifications
- profile/account
- country/edition selector

### 7.3 Active state

Active tabs use:

- HealthTimes blue;
- icon + label;
- no ambiguous icon-only navigation.

### 7.4 Native vs PWA

Native:

- native bottom tabs;
- native navigation stack;
- native transitions/sheets.

PWA:

- visually equivalent bottom navigation on mobile;
- browser routing;
- responsive desktop adaptation.

---

## 8. Home

Home is the primary editorial front page.

### 8.1 Structure

The approved composition is:

```text
Header
  HealthTimes
  Search
  Profile / Notifications

Editorial filters
  For You
  Latest
  National / Edition
  World
  Health

Hero Story

LIVE NOW
  horizontal carousel

Top Stories
  compact story rows

Additional editorial sections

Advertising placements as configured
```

### 8.2 Hero story

The hero must support:

- large editorial image or video preview;
- Live badge where relevant;
- Premium badge where relevant;
- headline overlay or carefully placed below image;
- timestamp / section metadata;
- tap-through to full story.

The hero should not become a rotating auto-carousel by default.

### 8.3 Live Now rail

Live Now is a horizontally scrollable rail directly below the hero when active Live content exists.

Each card may contain:

- thumbnail;
- red Live badge;
- short event title;
- update time/viewers where data exists.

Tapping routes to:

- Live Blog;
- Live Video;
- Event page.

When no Live content exists, the rail should collapse cleanly rather than show empty placeholders.

### 8.4 Top Stories

Top Stories use compact list rows:

- thumbnail;
- headline;
- age/time;
- section/topic.

This section favors scanning over large images.

---

## 9. Explore

Explore is the taxonomy gateway.

It is not simply another article feed.

### 9.1 Structure

```text
Explore

Search action

Primary topic shortcuts

More Categories

Taxonomy list/grid

Optional trending / recommended taxonomy
```

### 9.2 Suggested visible categories

Initial examples include:

- Health
- Science
- Wellness
- Pharma
- Nutrition
- Mental Health
- Diseases & Conditions
- Global Health
- Policy & Law
- Education
- Technology
- Environment
- Opinion
- Lifestyle
- Business & Health
- Research

The final list must use the canonical HealthTimes taxonomy from the Master Plan and migration programme.

### 9.3 Interaction

Category cards should be:

- compact;
- icon-supported;
- clearly labeled;
- easy to scan;
- consistent in size.

---

## 10. Intelligent Search

Search must feel like a dedicated product.

### 10.1 Layout

```text
Search field

Content filters:
  All
  Articles
  Videos
  Audio
  Authors

Suggested / trending searches

Intelligent Search explanation

Search results
```

### 10.2 Search behavior

The visual design should communicate that search is deeper than exact matching.

Suggested explanatory copy:

> Find relevant HealthTimes reporting using topics, countries, people and meaning — not only exact keywords.

### 10.3 AI design rule

Do not design AI as a chat-first replacement for journalism.

Search should return:

- article cards;
- video cards;
- author cards;
- related coverage;
- filters.

AI may improve ranking and interpretation behind the scenes.

---

## 11. Article Reader

The Article Reader is the central editorial experience.

### 11.1 Structure

```text
Back / navigation controls

Topic / section

Headline

Author
Date
Reading time

Hero image

Article body

Declared ad placement

Continuation

Sources / references

Related coverage

Save / share / listen
```

### 11.2 Visual treatment

Keep the screen clean.

Avoid:

- excess chrome;
- stacked cards around every paragraph;
- floating AI boxes over body text;
- intrusive sticky ads covering content.

### 11.3 Actions

Top or article-level actions may include:

- text size;
- save;
- share;
- Listen;
- more.

### 11.4 Advertising

Ad blocks shown in the wireframe represent reserved inventory positions.

They are not literal gray placeholders in production.

Each position must map to a defined placement in the AdvertisingService.

---

## 12. Live

Live must be visually distinct.

### 12.1 Top tabs

Suggested:

- Live Now
- Live Blog
- Upcoming

### 12.2 Main Live item

Use a large featured card:

- video/image;
- Live badge;
- title;
- publisher/source;
- viewer/update metadata.

### 12.3 Secondary Live coverage

Use compact rows for other active events.

### 12.4 Color

Red is reserved for:

- Live;
- breaking;
- urgent warnings.

Do not use red as a general accent color.

---

## 13. Watch / Video

Watch is a first-class media destination.

### 13.1 Structure

```text
Watch

Latest
Popular
Series
Live
Shorts

Featured video

Video list
```

### 13.2 Video cards

Each card should show:

- thumbnail;
- play icon;
- duration;
- headline;
- view count where available;
- age/date.

### 13.3 Style

Watch should be more visual than Explore or Search.

Large imagery is appropriate.

---

## 14. Listen / Audio

Listen is a distinct audio destination.

### 14.1 Structure

```text
Listen

Latest
Podcasts
Articles
Offline

Featured programme

Large Play control

Progress

Episode metadata

Related series/episodes
```

### 14.2 Native behavior

Native builds should support:

- background audio;
- lock-screen controls;
- persistent progress;
- playback speed;
- mini-player;
- expanded player.

The PWA should mirror the visual treatment while using web-supported audio capabilities.

---

## 15. Saved / Offline

Saved content should be simple and functional.

### 15.1 Tabs

- Articles
- Videos
- Audio
- Offline

### 15.2 Content rows

Each item should show:

- thumbnail;
- headline/title;
- saved/downloaded state;
- read/watch/listen duration or age;
- overflow menu if needed.

### 15.3 Offline state

Downloaded content must be visually distinguishable from merely bookmarked content.

---

## 16. My HealthTimes

My HealthTimes is the personal control center.

### 16.1 Header

Show:

- avatar/profile;
- name;
- membership state;
- Premium CTA if applicable.

### 16.2 Menu

Include:

- My Profile
- Countries & Interests
- Saved
- Downloads
- Reading History
- Notifications
- My Subscriptions
- Payment Methods
- Appearance / Theme
- Privacy
- Security
- Devices / Sessions where supported
- Settings
- Help & Support
- Sign Out

### 16.3 Design

Use a clean list, not a card grid.

---

## 17. Country / Edition Selection

The approved wireframe establishes the global edition model.

### 17.1 Structure

```text
Select Your Edition

Search country

Popular

Country list with flags

Show More Countries

Content preferences

Save Preferences
```

### 17.2 Important distinction

The final implementation must distinguish:

- Primary Edition
- Followed Countries / Regions
- Residence / Billing Country

These are separate concepts.

### 17.3 Content preferences

Possible toggles:

- Global
- Regional
- National

The exact terms may evolve with taxonomy.

---

## 18. Premium

Premium should look simple, premium and trustworthy.

### 18.1 Structure

```text
Go Premium

Short value proposition

Monthly / Yearly toggle

Plan cards

Benefits

Primary CTA

Currency / storefront note

Sign in for existing members
```

### 18.2 Visual hierarchy

The recommended plan may be emphasized with:

- blue outline;
- “Most Popular” label;
- stronger CTA.

### 18.3 Important rule

Prices shown in wireframes are placeholders.

Production pricing comes from:

- App Store / Google Play storefronts for native;
- approved web billing provider for web.

---

## 19. Advertising Placements

The wireframe demonstrates how advertising appears in the Reader.

### 19.1 Principles

Advertising must:

- be clearly labeled;
- reserve space to prevent layout shift;
- fit the content hierarchy;
- never masquerade as journalism;
- respect Premium policy;
- respect health-sensitive targeting rules.

### 19.2 Example surfaces

- top banner;
- in-feed ad;
- article inline;
- article end;
- Watch/video;
- Live;
- sponsored topic/section.

### 19.3 Visual treatment

Ads should visually belong to the layout while remaining identifiable as advertising.

---

## 20. Notifications

Notifications use a lightweight list.

### 20.1 Suggested filters

- All
- Breaking
- Live
- Topics
- Premium
- System

### 20.2 Notification row

Include:

- icon/state;
- concise title;
- secondary description;
- time;
- unread indicator.

Tapping routes directly to the relevant native/web destination.

---

## 21. Social / Deep-Link Flow

The approved wireframe uses a share sheet with article preview.

### 21.1 Destinations

- WhatsApp
- Facebook
- Instagram
- X
- LinkedIn
- Email
- Copy Link
- More / OS share sheet

### 21.2 App opening

Where a canonical HealthTimes link is opened:

```text
App installed -> open exact native destination
No app -> open PWA/web destination
```

### 21.3 Visual rule

The share UI should feel native and lightweight.

Do not create a large standalone “social page” when the platform share sheet can do the job.

---

## 22. Analytics / Event View

This screen establishes the Studio analytics visual language.

### 22.1 Style

Use:

- KPI cards;
- compact charts;
- ranked content;
- source breakdowns;
- restrained color.

### 22.2 Example metrics

- Page Views
- Active Users
- Article Reads
- Video Views
- New Signups
- Premium Starts
- Ad Revenue
- Social Referrals

Actual values must come from real services.

The wireframe numbers are visual placeholders only.

---

## 23. HealthTimes Studio / Admin

Studio is visually different from Reader.

### 23.1 Layout

Tablet/desktop:

- dark navy left navigation rail;
- light content workspace;
- compact KPI panels;
- recent activity;
- action-oriented modules.

Phone:

- collapsible drawer;
- full-width workspace;
- bottom or top actions as appropriate.

### 23.2 Suggested navigation

- Today
- Stories
- Live Desk
- Video Desk
- Media Library
- Calendar
- Advertising
- Premium
- Social Desk
- Audience
- Search & Growth
- Analytics & Intelligence
- Subscribers
- Authors
- Staff & Roles
- Settings

### 23.3 Visual distinction

Reader:

- editorial;
- image-forward;
- calm.

Studio:

- operational;
- denser;
- status-driven;
- action-oriented.

---

## 24. Role-Based Access

The wireframe visually lists roles.

Examples:

- Administrator
- Editor
- Journalist
- Video Producer
- Advertising Manager
- Analyst
- Subscriber Support

### 24.1 Security rule

The screen must never allow users to grant themselves authority.

Production behavior must reflect server-assigned roles/capabilities.

The role UI is a workspace indicator, not an authorization selector.

---

## 25. Onboarding

Onboarding should be short.

Recommended flow:

1. Welcome
2. Select Edition
3. Select Interests
4. Notification preferences
5. Home

### 25.1 Welcome screen

Use:

- HealthTimes logo;
- global health visual;
- short value proposition;
- one primary CTA;
- existing-account sign-in.

Do not create a long tutorial carousel.

---

## 26. Shared design system

Build the design system before independently styling every screen.

### 26.1 Core tokens

Define shared:

- color tokens;
- typography tokens;
- spacing;
- corner radius;
- elevation/shadow;
- breakpoints;
- icon sizes;
- touch-target sizes;
- status colors;
- ad spacing;
- safe-area spacing.

### 26.2 Shared components

At minimum:

- AppHeader
- BottomNavigation
- SectionTabs
- HeroStory
- StoryRow
- StoryCard
- LiveCard
- LiveRail
- VideoCard
- AudioCard
- TopicTile
- SearchField
- FilterChip
- AdSlot
- PremiumBadge
- LiveBadge
- AuthorRow
- MetadataRow
- EmptyState
- ErrorState
- Skeleton
- NotificationRow
- SettingsRow
- KPIStat
- ChartCard
- StudioSidebar
- RoleBadge
- EditionSelector

---

## 27. PWA adoption

The current PWA must be rebuilt to use the same visual system.

### 27.1 Mobile PWA

Mobile web should closely resemble native:

- same header;
- same bottom-nav structure;
- same Home hierarchy;
- same Live rail;
- same cards;
- same Premium treatment;
- same Watch/Explore language.

### 27.2 Desktop PWA

Desktop must not simply stretch the mobile screen.

It should expand into:

- wider editorial grid;
- multiple columns;
- desktop sidebars;
- wider advertising placements;
- richer navigation;
- desktop Newsroom density.

But it must preserve:

- colors;
- typography;
- story-card language;
- status treatment;
- Live/Watch identity;
- Premium style;
- shared icons.

---

## 28. Native-specific behavior

Native apps may use platform-native interactions while preserving the same visual design.

Examples:

- native share sheet;
- native push;
- haptics;
- secure storage;
- background audio;
- picture-in-picture where supported;
- offline database/cache;
- native navigation transitions;
- app links / universal links.

These are enhancements, not reasons to redesign screens.

---

## 29. Responsive/tablet behavior

Tablet is not a stretched phone.

Tablet may use:

- 2-column story layouts;
- split-view Explore;
- persistent sidebar in Studio;
- wider Live rails;
- richer Watch grids.

The same visual hierarchy must remain recognizable.

---

## 30. Placeholder versus authoritative content

### 30.1 Placeholder only

The following wireframe details are not production truth:

- sample names;
- example article headlines;
- sample viewer counts;
- sample analytics;
- sample ad campaigns;
- sample Premium prices;
- example countries shown;
- example role names if inconsistent with RBAC;
- example dates.

### 30.2 Authoritative design

The following are approved:

- page hierarchy;
- navigation model;
- layout relationships;
- screen composition;
- content density;
- visual language;
- Live placement;
- Watch placement;
- Premium layout;
- My HealthTimes layout;
- Explore taxonomy presentation;
- Search composition;
- Studio/Reader visual distinction;
- ad-slot treatment.

---

## 31. Accessibility

Design refinement is permitted when required for accessibility.

Must support:

- dynamic text;
- screen readers;
- accessible labels;
- sufficient contrast;
- visible focus;
- minimum touch targets;
- reduced motion where applicable;
- captions/transcripts;
- safe areas;
- keyboard navigation on web;
- landscape/tablet where appropriate.

Accessibility improvement is not considered a deviation from the wireframe.

---

## 32. Animation and motion

Motion should be restrained.

Appropriate:

- tab transitions;
- loading skeletons;
- bottom sheets;
- save confirmation;
- Live update arrival;
- media player transition;
- pull-to-refresh.

Avoid:

- decorative bouncing;
- autoplay motion in article feeds;
- excessive parallax;
- animations that delay navigation.

---

## 33. Loading, empty and error states

Every major screen must have designed states.

### Loading

Use skeletons instead of blank screens where appropriate.

### Empty

Examples:

- no saved stories;
- no downloads;
- no Live event;
- no notifications;
- no search result.

### Error

Provide:

- short explanation;
- retry;
- offline guidance where relevant.

Do not use raw server messages.

---

## 34. Advertising and layout stability

AdSlot components must reserve layout height before the ad arrives.

This prevents:

- content jumping;
- accidental taps;
- Core Web Vitals regression on PWA;
- poor reading experience.

Ad rendering must be centrally managed.

---

## 35. Image and media behavior

Images should:

- use consistent aspect ratios by component;
- crop intentionally;
- never stretch;
- lazy-load on web;
- use optimized native loading;
- preserve captions/credits;
- support full-screen view where appropriate.

Video thumbnails should consistently show duration and play state.

---

## 36. Design interpretation hierarchy

Agents must interpret the approved design using this priority order:

1. Security and authorization rules
2. Accessibility
3. Master Plan functionality
4. DESIGN.md visual rules
5. Approved wireframe image
6. Platform-native conventions
7. Agent implementation judgment

If a conflict exists, agents must document it rather than silently redesigning the product.

---

## 37. Mandatory preservation rules

Agents must preserve:

- Home hierarchy;
- Live horizontal rail;
- five-destination Reader navigation;
- Explore as taxonomy gateway;
- intelligent Search layout;
- clean Article Reader;
- dedicated Live screen;
- dedicated Watch screen;
- dedicated Listen treatment;
- Saved/Offline grouping;
- My HealthTimes list architecture;
- global edition selector;
- simple Premium pricing architecture;
- declared ad positions;
- lightweight notifications;
- native social/deep-link flow;
- KPI-first analytics;
- dark Studio navigation;
- Reader/Studio visual separation.

---

## 38. Allowed refinement

Agents may refine:

- exact padding;
- exact corner radius;
- icon library;
- type scale;
- loading states;
- tablet layouts;
- accessibility sizing;
- platform-native controls;
- animation timing;
- skeletons;
- empty states;
- dark mode specifics;
- image crops;
- bottom-sheet behavior.

Refinements must preserve the approved design intent.

---

## 39. Prohibited redesigns

Do not:

- replace the five-tab navigation with a hamburger-only app;
- move Live/Watch deep into menus;
- convert Home into an infinite generic feed;
- make AI a dominant chat tab;
- replace editorial typography with dashboard typography;
- introduce glassmorphism as the primary visual system;
- remove global edition controls;
- collapse Studio into Reader;
- make ads indistinguishable from stories;
- make the PWA visually unrelated to native;
- build iOS and Android with different information architectures.

---

## 40. Implementation sequence

Recommended design implementation order:

### Phase 1 — Tokens

- color;
- typography;
- spacing;
- radius;
- icons;
- layout grid.

### Phase 2 — Shared primitives

- headers;
- navigation;
- cards;
- labels;
- buttons;
- tabs;
- list rows;
- sheets;
- ad slots.

### Phase 3 — Core Reader

- Home;
- Explore;
- Search;
- Article;
- Live;
- Watch.

### Phase 4 — Reader utilities

- Listen;
- Saved;
- Offline;
- My HealthTimes;
- Notifications;
- Edition;
- Premium.

### Phase 5 — Studio

- Today;
- Stories;
- Live Desk;
- Video Desk;
- Advertising;
- Analytics;
- Audience;
- Social;
- Search & Growth;
- roles/settings.

### Phase 6 — PWA alignment

Rebuild the mobile PWA around the same design system, then expand into the desktop editorial layout.

---

## 41. Visual acceptance checklist

A screen is not visually complete unless:

- it resembles the approved wireframe structure;
- spacing is consistent;
- hierarchy is obvious;
- typography is legible;
- active navigation is clear;
- states are present;
- touch targets are usable;
- images are correctly cropped;
- ad slots are properly labeled/reserved;
- content is not obstructed;
- it works in light/dark mode where required;
- it works on both iOS and Android;
- the corresponding mobile PWA view remains visually aligned.

---

## 42. Design sign-off rule

Any significant deviation from the approved design requires one of:

1. an accessibility necessity;
2. a platform limitation;
3. a security requirement;
4. an explicitly documented owner-approved change.

Agents must not redesign the product because another pattern is personally preferred.

---

## 43. Agent instruction summary

When implementing HealthTimes:

> Treat the approved HealthTimes wireframe as the visual source of truth. Recreate its page hierarchy, navigation, spacing, component relationships, card density, typography hierarchy, Live/Watch presentation, Premium presentation, advertising slots, Studio/Admin distinction and premium editorial character.

> Treat placeholder headlines, users, prices, analytics values, campaigns and viewer counts only as examples. Replace them through the service/data contracts defined in the Master Plan.

> Android, iOS and the mobile PWA must unmistakably look like the same HealthTimes product. Use native platform capabilities without changing the approved information architecture.

---

## 44. Final design definition

The adopted HealthTimes design can be summarized as:

**Premium global health journalism with a clean editorial Reader, prominent Live and Watch experiences, deep taxonomy and intelligent Search, controlled advertising, simple Premium conversion, global edition personalization, and a visually distinct operational HealthTimes Studio.**

The design system is shared across:

```text
HealthTimes Design System
        |
        +-- iOS
        +-- Android
        +-- Mobile PWA
        +-- Tablet
        +-- Desktop PWA
        +-- HealthTimes Studio
```

The Reader experience remains editorial.

The Studio experience remains operational.

The product remains one HealthTimes platform.

