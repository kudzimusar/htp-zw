# HealthTimes Native Mobile Master Plan

**Repository:** kudzimusar/htp-zw  
**Document path:** docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md  
**Status:** DRAFT FOR OWNER REVIEW — NOT YET AUTHORIZED FOR IMPLEMENTATION  
**Version:** 0.1  
**Date:** 2026-09-19  
**Programme:** HealthTimes modernization and migration  
**Applies to:** Web/PWA, Android, iOS, HealthTimes Studio, shared backend/platform  
**Primary audience:** Owner, client, migration agents AG-01 through AG-07, future native-mobile agents NM-01 through NM-07, product/design/engineering/QA, future newsroom administrators  
**Production mutation authorized by this document:** NO  

---

## 1. Purpose of this document

This document is the authoritative context paper, product blueprint, implementation guide, agent handoff reference and future operating manual for the HealthTimes native mobile programme.

It exists because HealthTimes is no longer being treated as a website that may later be wrapped for app stores. The target is one HealthTimes platform serving three first-class reader surfaces:

- Web/PWA
- Android
- iOS

and one coordinated staff operating environment:

- HealthTimes Studio / Newsroom

The public PWA already demonstrates the product direction, but the native mobile programme must now be designed as a real Android and iOS product with native navigation, native device capabilities, real mobile monetization, real application analytics, secure identity, offline reading, push notifications, deep links, audio, video, Live coverage, mobile Premium, social attribution and a mobile-capable newsroom workflow.

This paper also defines how the native programme relates to the existing HealthTimes migration programme, especially AG-01 through AG-07. Native development must proceed in parallel with migration and backend work without duplicating infrastructure, inventing a second source of truth or creating incompatible data models.

This document is deliberately comprehensive. Future agents should be able to read it and understand:

1. what HealthTimes is becoming;
2. what the client explicitly wants;
3. how the PWA, Android and iOS products relate;
4. what the consumer app should look like;
5. what HealthTimes Studio should look like;
6. how advertising, analytics, social, SEO, search, AI, Live, video and Premium work;
7. how global editions and currency work;
8. how native apps are developed before the production database is complete;
9. how AG-01 through AG-07 feed the mobile programme;
10. what each native checkpoint must prove;
11. what is prohibited;
12. how testing, security, release and ongoing operations are governed.

Until the owner approves this document, it is a planning artifact only.

---

## 2. Executive decision record

The following decisions are the proposed architectural baseline for owner review.

### 2.1 One platform, three reader clients

HealthTimes will operate as:

    HealthTimes Platform
        |
        +-- Web / PWA
        +-- Android
        +-- iOS
        |
        +-- Shared API, identity, content, media, Premium,
            search, analytics, advertising, social and AI services

The PWA remains important. Native applications do not replace the website. The website remains the canonical public web and SEO surface, while Android and iOS provide richer mobile experiences.

### 2.2 Native means native

The final Android and iOS products will not be Trusted Web Activity or bare WebView wrappers around the PWA.

The proposed mobile framework is:

- React Native
- Expo
- TypeScript
- Expo Router
- EAS Build / EAS Submit or equivalent CI-controlled native build process
- native modules where required

The existing TWA and Capacitor files remain historical packaging scaffolds and may be retained for provenance until formally deprecated, but they are not the proposed final mobile architecture.

### 2.3 One native codebase for Android and iOS

Android and iOS must be developed simultaneously from the same application source wherever possible.

Platform-specific code is permitted when device behaviour genuinely differs, but separate Android and iOS product teams must not independently rebuild the same product.

### 2.4 Reader and Studio are different experiences

HealthTimes serves two very different user groups:

- public readers;
- staff, editors, reporters, commercial staff and administrators.

They should not share one crowded navigation model.

The native programme therefore defines:

1. **HealthTimes Reader** — the public Android/iOS app.
2. **HealthTimes Studio** — the secure staff/admin experience.

They should share domain contracts, design tokens, authentication infrastructure, APIs, media models, analytics vocabulary and selected components, but their information architecture should remain distinct.

The recommended implementation is one mobile workspace capable of producing separate application variants/targets. Reader is the public store app. Studio can begin as an internal/private staff distribution or an authenticated staff application and later be distributed according to owner/client requirements.

### 2.5 Build now; connect real backend progressively

Native work does not wait for AG-01 through AG-07 to finish.

The application will use service/repository contracts and controlled fixtures first, then progressively replace fixture implementations with staging and production services.

Example:

    Reader Screen
        |
        v
    ArticleRepository
        |
        +-- FixtureArticleRepository       [early build]
        +-- StagingArticleRepository       [AG-02 / AG-04]
        +-- ProductionArticleRepository    [after certification/cutover]

Screens must never depend directly on hardcoded PWA localStorage structures or raw WordPress internals.

### 2.6 The article remains the economic centre

The client has explicitly prioritized advertising revenue and full article reading.

Therefore:

- AI must not become a replacement for HealthTimes journalism.
- AI summaries must not become the default consumer product.
- Search and AI should retrieve, organize, rank, clarify navigation and help users discover articles.
- Full journalism should remain the primary destination.
- Advertising opportunities must be created around genuine reading, watching and Live participation rather than by degrading usability.

### 2.7 Global from the data model onward

HealthTimes may currently have a strong Zimbabwe content base, but its product architecture must not be Zimbabwe-only.

The system will support:

- Global;
- Africa;
- African regions;
- country editions;
- multiple followed countries;
- regional and international stories;
- global subject taxonomy;
- country-aware recommendations;
- residence/billing country separate from news edition;
- multi-currency Premium pricing through appropriate platform billing.

---

## 3. Client requirements translated into product rules

The client requirements discussed during HealthTimes modernization are treated as product rules, not optional ideas.

### 3.1 Advertising is a core commercial system

The client wants to maximize advertising revenue, including Google advertising.

Therefore HealthTimes requires:

- strong web/PWA Google monetization;
- native Android/iOS advertising;
- direct-sold campaigns;
- multiple controlled ad placements;
- mobile, desktop and video inventory;
- campaign lifecycle management;
- advertiser/creative/placement reporting;
- app-ads.txt readiness;
- ads.txt continuity;
- explicit separation between editorial ranking and commercial delivery;
- health-sensitive advertising safeguards.

Advertising must be configurable without code deployment.

### 3.2 Google Analytics and first-party intelligence are required

HealthTimes must measure reader behaviour and platform movement across:

- web/PWA;
- Android;
- iOS;
- social referrals;
- newsletters;
- WhatsApp;
- notifications;
- organic search;
- advertising;
- Live;
- video;
- Premium conversion.

GA4 should be retained as a major measurement system, but HealthTimes should also retain first-party event data and aggregates so that operational intelligence is not dependent entirely on a third-party dashboard.

### 3.3 SEO remains first-class

Native apps do not replace SEO.

The PWA/web application remains responsible for:

- canonical article URLs;
- crawlable pages;
- structured data;
- sitemap;
- robots;
- RSS/feeds;
- redirects;
- Search Console;
- metadata;
- Core Web Vitals;
- search authority.

Native apps must link to the same canonical article identity.

### 3.4 Social media must be part of the product loop

HealthTimes must treat Facebook, WhatsApp, Instagram, X, LinkedIn, YouTube and future channels as distribution systems tied back to measurable reader activity.

The system must support:

- social publishing workflow;
- canonical article links;
- automatic campaign attribution;
- app deep linking;
- web fallback;
- referral analytics;
- downstream engagement;
- Premium conversion attribution;
- advertising-revenue context;
- channel-quality analysis.

### 3.5 Live and video are first-class content formats

HealthTimes must support:

- Live blogs;
- Live event feeds;
- Live video;
- scheduled streams;
- on-demand video;
- shorts/vertical clips where justified;
- interviews;
- investigations;
- explainers;
- conferences;
- video advertising;
- Newsroom control of publication and metadata.

### 3.6 Search must be deep

Search is not a simple exact-word field.

HealthTimes Discovery must combine:

- lexical/full-text search;
- semantic retrieval;
- taxonomy;
- geography;
- entities;
- recency;
- editorial importance;
- permissions/access;
- user preferences where appropriate.

AI assists query interpretation and retrieval. It should route readers to journalism rather than make journalism unnecessary.

### 3.7 Premium should be sophisticated but simple to understand

For Premium journalism, a predictable content gate is preferred over a fragile timer-only gate.

Recommended preview:

- headline;
- standfirst;
- author/date metadata;
- first paragraph by default;
- optionally a configurable second paragraph for selected content.

The backend must enforce the entitlement. The client application must not receive the entire protected article and merely hide it visually.

### 3.8 Global edition and currency are required

Users should be able to choose:

- primary news edition;
- followed countries/regions;
- followed topics;
- residence/billing country where relevant;
- platform/store billing currency as provided by Apple/Google or web billing.

News location and billing location are separate concepts.

---

## 4. Current state and starting point

At the time this document is written, HealthTimes already has a developed PWA/client-review product and migration programme.

The current web product includes or plans:

- public Home;
- article reader;
- mobile-specific presentation;
- PWA manifest and service worker;
- reader identity presentation;
- Premium presentation;
- saved/history concepts;
- Ask HealthTimes / HealthTimes Intelligence concepts;
- Newsroom;
- advertising manager;
- audience;
- newsletter;
- WhatsApp;
- analytics;
- staff/roles;
- app-store packaging documentation;
- Android TWA scaffold;
- iOS Capacitor scaffold;
- migration and production architecture documents.

What is not yet a completed native product:

- no production Android native project/binary;
- no production iOS native project/binary;
- no native application CI certification;
- no native push system;
- no final native mobile billing;
- no native secure session implementation;
- no native offline article library;
- no native advertising integration;
- no native device-level certification.

The native programme starts from this product knowledge but does not mechanically copy the PWA DOM/CSS implementation.

---

## 5. Benchmarking principles from successful global news applications

The native design should learn from established news products without copying their brands or interfaces.

Current global publisher apps demonstrate recurring successful patterns:

### 5.1 New York Times

Useful patterns:

- breaking news and Live updates;
- strong article-first reading experience;
- video;
- audio;
- saved/recent activity;
- push alerts;
- global coverage;
- story actions that remain available without overwhelming reading.

HealthTimes implication:

- reading remains central;
- Live, Watch, Listen and Save become native capabilities around the article;
- related major-story coverage can remain accessible as the reader scrolls.

### 5.2 Financial Times

Useful patterns:

- global orientation;
- followed-topic personalization;
- MyFT-style personalized area;
- offline reading;
- video;
- audio;
- strong subscriber identity.

HealthTimes implication:

- My HealthTimes should become a meaningful personal area;
- followed countries/topics should shape discovery;
- global edition architecture should be explicit.

### 5.3 BBC

Useful patterns:

- text, video, podcasts/audio and Live coexist;
- breaking notifications;
- save/follow;
- background audio;
- social sharing;
- global content.

HealthTimes implication:

- Watch and Live must be genuine product surfaces;
- background audio and notification routing are valuable native capabilities.

### 5.4 The Economist

Useful patterns:

- global journalism;
- personalized feed;
- article audio;
- podcasts;
- video;
- offline;
- bookmarks;
- carefully separated formats.

HealthTimes implication:

- personalization should not destroy editorial curation;
- reader-controlled interests can coexist with a strong editorial front page.

### 5.5 General benchmark conclusion

HealthTimes should combine:

- editor-controlled top news;
- personalized discovery;
- strong full-article reading;
- Live;
- video;
- audio;
- offline/save;
- notifications;
- global taxonomy;
- subscriptions;
- measurable social distribution.

It should not become an endless generic social feed.

---

## 6. Product family and information architecture

### 6.1 HealthTimes Reader

Proposed primary bottom navigation:

1. Home
2. Explore
3. Live
4. Watch
5. My HealthTimes

Persistent/top-level actions:

- Search
- Notifications
- Edition/country selector
- Save
- Share
- Listen
- account state

AI is intentionally not a primary bottom tab. AI is embedded in Search/Discovery, related coverage, Newsroom intelligence and selected article utilities.

### 6.2 HealthTimes Studio

Proposed staff navigation:

1. Today
2. Stories
3. Create
4. Audience / Intelligence
5. More

The More area exposes role-authorized operational modules such as:

- Live Desk
- Video Desk
- Media
- Calendar
- Premium
- Advertising
- Search & Growth
- Social Desk
- Analytics & Intelligence
- Newsletter
- WhatsApp
- Subscribers
- Authors
- Staff & Roles
- Platform
- Audit/Security

Desktop Newsroom remains the preferred environment for dense administration. Mobile Studio focuses on action-oriented workflows.

---

## 7. HealthTimes Reader — Home

Home should feel like a mobile publishing product rather than a compressed desktop website.

Recommended hierarchy:

    Header
      HealthTimes logo
      Edition selector
      Search
      Notifications

    Optional breaking alert

    Hero / lead story

    Live Now horizontal carousel

    Advertisement placement

    Top Stories

    For You

    Primary Edition / Country

    Regional coverage

    Watch

    Advertisement placement

    Research & Findings

    Health Business / Pharmaceuticals

    Premium Intelligence

    Global Health

    Most Read / Trending

    Advertisement placement

    Briefings / Follow prompts

### 7.1 Hero

The hero is editor-controlled.

It supports:

- image;
- video preview;
- Live status;
- Premium label;
- breaking/developing status;
- headline;
- standfirst;
- geography/topic metadata.

### 7.2 Live Now carousel

A horizontally scrollable Live rail should appear near the top when Live events exist.

Cards may represent:

- Live blog;
- Live video;
- scheduled stream;
- breaking event;
- ongoing conference;
- continuing public-health event.

Example state:

    LIVE
    Zimbabwe Health Budget
    Updated 2 min ago
    12 updates

The rail must disappear or collapse gracefully when no event is Live.

### 7.3 For You

For You is a controlled recommendation area, not the entire Home page.

Inputs may include:

- primary edition;
- followed countries;
- followed topics;
- recent reading;
- saved stories;
- editorial importance;
- recency;
- format diversity.

Editorial overrides always remain authoritative.

### 7.4 Advertising on Home

Home uses declared placements, not arbitrary injected blocks.

Example placement IDs:

- home_top
- home_after_live
- home_feed_1
- home_feed_2
- home_watch
- home_deep_feed

Ad density must be governed and tested. Maximizing revenue does not mean maximizing interruption.

---

## 8. HealthTimes Reader — Explore and Discovery

Explore consolidates the website's archive/menu/search behaviour into a native discovery centre.

Proposed layout:

    Search HealthTimes

    Trending searches

    Browse by:
      Countries
      Regions
      Topics
      Desks
      Authors
      Formats
      Research
      Live
      Video
      Premium
      Jobs
      Fellowships & Grants
      E-Paper
      Archive

### 8.1 Full taxonomy

Taxonomy becomes foundational platform data.

Every article may have:

- global scope;
- region;
- country/countries;
- subnational geography where useful;
- desk;
- topics;
- content format;
- access level;
- author;
- source/reviewer metadata;
- media relationships;
- Live relationship;
- campaign/sponsorship context where applicable.

### 8.2 Geography model

Minimum hierarchy:

    Global
      Africa
        Southern Africa
        East Africa
        West Africa
        Central Africa
        North Africa
          Country
            optional province/state/city

Geography must support multiple tags. A continental programme may be Global + Africa + multiple countries.

### 8.3 Subject model

Expected major desks/topics include, but are not limited to:

- Public Health
- Health Policy
- Health Systems
- Pharmaceuticals & Medicines
- Research & Science
- Health Financing
- HIV/AIDS
- Communicable Diseases
- Noncommunicable Diseases
- Mental Health
- SRHR / Family Health
- Maternal and Child Health
- Health Technology / Digital Health / AI
- Education & Training
- Health Business
- Community Health
- Investigations
- Opinion & Analysis
- Jobs
- Fellowships & Grants
- Global Health
- Africa
- country-specific coverage

The editorial taxonomy must be controlled. Legacy WordPress tags remain preserved for provenance/aliases but should not all become public canonical navigation.

---

## 9. Search architecture

Search must be treated as a product system.

### 9.1 User expectations

A reader searching for:

    medicine shortages zimbabwe

should find relevant coverage even when articles use terms such as:

- pharmaceutical supply;
- NatPharm;
- essential medicines;
- drug availability;
- hospital supplies;
- procurement.

### 9.2 Hybrid retrieval

Proposed ranking pipeline:

    Query
      |
      +-- lexical/full-text retrieval
      +-- semantic retrieval
      +-- taxonomy/geography/entity matches
      +-- recency
      +-- editorial authority
      +-- user edition/interests where appropriate
      +-- access policy
      |
      v
    ranked HealthTimes results

Initial implementation can use PostgreSQL/Supabase full-text search plus vector/semantic capability if validated against the final production schema. A dedicated search service can be introduced later behind the same SearchService contract if scale or relevance requires it.

### 9.3 AI role in consumer search

AI may:

- understand natural-language intent;
- correct spelling;
- infer synonyms;
- identify countries/regions;
- infer date ranges;
- identify people/organizations/topics;
- improve ranking;
- group related stories;
- generate coverage timelines;
- explain why a result matches;
- suggest better searches.

AI should not default to producing a replacement summary of the journalism.

Example:

    User:
    Find HealthTimes reporting on hospital medicine shortages in Zimbabwe this year.

    Desired response:
    17 relevant HealthTimes reports found.
    Show ranked article cards, dates, desks and filters.

The user should enter the article to consume the journalism.

### 9.4 Zero-result intelligence

Reader search behaviour should inform the newsroom.

Example:

    Query: yellow fever Zimbabwe
    Searches this week: 427
    Results: 0

Studio can surface:

    Create Assignment

This converts search demand into editorial intelligence.

---

## 10. Article Reader

The Article Reader is the most important screen in HealthTimes Reader.

### 10.1 Core layout

    Back

    Desk / Topic / Geography

    Headline

    Standfirst

    Author
    Published / Updated
    Reading time
    Premium / Developing / Live status

    Featured media

    Listen

    Article body

    Inline media / evidence / quotes / tables

    Declared ad placements

    Sources / references where appropriate

    Corrections / update information

    Related HealthTimes coverage

    More from topic/country

### 10.2 Native capabilities

Native Article Reader should support:

- native share sheet;
- bookmark/save;
- offline download;
- reading-position persistence;
- font-size controls;
- system accessibility text scaling;
- dark/light/system themes;
- haptics where useful;
- audio/background playback;
- deep link entry;
- notification entry;
- related-coverage navigation;
- image viewer;
- video playback;
- external source opening with clear boundaries.

### 10.3 Advertising placements

Potential article placements:

- article_after_intro
- article_mid_1
- article_mid_2 for sufficiently long articles
- article_end
- article_related

Ad placement must consider length. Short articles should not receive the same ad density as long-form investigations.

### 10.4 Sensitive health context

Advertising may be contextual, but HealthTimes must not build advertiser audiences from inferred sensitive health conditions. Reader behaviour around HIV, mental health, reproductive health or other sensitive subjects must not be transformed into prohibited personalized health-ad targeting.

---

## 11. Live

Live must be a first-class content model.

### 11.1 Live content model

A Live event should include:

- ID;
- title;
- slug;
- status: scheduled/live/paused/ended;
- summary/standfirst;
- hero media;
- geography;
- topics;
- desks;
- start/end timestamps;
- reporters/editors;
- stream provider/URL where relevant;
- timestamped updates;
- related articles;
- Premium policy;
- ad policy;
- push-notification policy;
- social-promotion state.

### 11.2 Reader Live screen

Live may contain:

- Live Now;
- Live Video;
- Breaking Live Blogs;
- Scheduled;
- Recently Ended;
- followed Live events.

A text Live feed presents reverse-chronological or controlled chronological updates with timestamps, media, links and corrections.

### 11.3 Live lifecycle

Studio controls:

    scheduled -> live -> paused if needed -> ended -> archived

A finished Live event remains discoverable and indexable according to editorial policy.

### 11.4 Live notifications

Users may choose:

- notify when event starts;
- follow updates;
- breaking only;
- unfollow event.

Notification frequency must be governed to prevent spam.

---

## 12. Watch — video product

HealthTimes Watch is a dedicated native product surface.

### 12.1 Reader Watch structure

    Live stream / featured video

    Latest Videos

    Shorts / vertical video where appropriate

    Interviews

    Investigations

    Explainers

    Conferences

    Research

    Health Policy

    Africa

    Country playlists

### 12.2 Video metadata

Each video should carry:

- title;
- description;
- slug;
- thumbnail/poster;
- provider;
- provider asset ID;
- duration;
- transcript;
- captions;
- author/presenter;
- geography;
- topics;
- desk;
- publication time;
- Premium/free state;
- Live/recorded state;
- ad policy;
- social metadata;
- related articles.

Do not model video as arbitrary iframe HTML.

### 12.3 Provider independence

Initial content may use YouTube or another provider, but the platform model must permit future hosting/streaming changes without redesigning the client.

### 12.4 Video advertising

Video is commercial inventory.

Potential placements:

- pre-roll;
- mid-roll for eligible longer video;
- post-roll;
- native/display around video lists;
- sponsored programme placements where clearly disclosed.

Google Interactive Media Ads / Ad Manager-compatible video advertising should be considered when final ad operations are configured.

---

## 13. Audio / Listen

Listen should be a native capability, not only a button.

Desired behaviour:

- article narration;
- background playback;
- lock-screen controls;
- progress persistence;
- playback speed;
- mini-player while browsing;
- expanded player;
- optional sleep timer;
- queue for saved audio where product scope supports it.

Audio availability should be represented in article metadata.

AI-generated narration, if ever used, must be clearly governed for quality, pronunciation, rights and disclosure.

---

## 14. My HealthTimes

My HealthTimes is the reader's personal hub.

Proposed sections:

- Profile
- Membership / Premium
- Saved
- Downloads
- Reading History
- Following
  - Countries
  - Regions
  - Topics
  - Authors
- Briefings
- Notifications
- Edition
- Appearance
- Audio preferences
- Data/privacy controls
- Security
- Devices/sessions where supported
- Help
- Editorial standards
- Corrections/contact
- About HealthTimes
- Sign out

This replaces website-style footer dependency on mobile.

---

## 15. Saved, offline and reading history

Native should materially improve saved reading.

### 15.1 Saved

A bookmark syncs to the reader account when authenticated.

### 15.2 Downloads

Downloaded articles should include the article data and required media subject to rights/storage policy.

### 15.3 Reading history

History can support:

- Continue Reading;
- Recently Read;
- resume position;
- local privacy controls;
- delete history.

### 15.4 Offline behaviour

The app should distinguish:

- online;
- temporarily offline;
- downloaded content available;
- stale cached data;
- queued user action pending sync.

Offline actions such as bookmark changes should sync safely when connectivity returns.

---

## 16. Notifications and briefings

Native notifications are a major advantage over the PWA.

Reader preferences may include:

- Breaking News
- Primary Edition
- followed countries
- followed topics
- Research
- Premium
- Live event starts
- major Live updates
- Daily Briefing
- Weekly Briefing
- Premium Weekly
- selected video/live programming

Notification centre should preserve recent notifications and deep-link to their destination.

Notification event tracking must distinguish:

- delivered where provider data exists;
- opened;
- article opened;
- follow-on reading;
- Premium conversion.

---

## 17. Global edition model

HealthTimes must separate three concepts.

### 17.1 Primary news edition

What geography the reader wants prioritized.

Examples:

- Global;
- Africa;
- Zimbabwe;
- Kenya;
- South Africa.

### 17.2 Followed geographies

Additional countries/regions the reader wants included.

Example:

    Residence: Japan
    Primary edition: Zimbabwe
    Follow: South Africa, Global Health

This is valid and must be supported.

### 17.3 Residence / billing country

This exists for billing, tax, compliance or account operations and must not automatically redefine editorial preferences.

### 17.4 Home-ranking inputs

Proposed recommendation inputs:

    editorial priority
    + freshness
    + edition match
    + followed geographies
    + followed topics
    + story importance
    + reader history
    + format diversity
    - repetition/already consumed

Public-health urgency and editor pinning may override personalization.

The ranking system must be explainable enough to audit and tune.

---

## 18. Premium and subscriptions

Premium should be sophisticated but understandable.

### 18.1 Recommended content gate

For a Premium article, a free reader receives:

- headline;
- standfirst;
- article metadata;
- first paragraph by default.

The policy may permit configurable additional preview paragraphs.

The reader then sees:

    Continue with HealthTimes Premium

    Subscribe
    Sign in

### 18.2 Server enforcement

Prohibited design:

    API sends full Premium article
    client visually hides the remainder

Required design:

    request
      |
      v
    server checks entitlement
      |
      +-- entitled -> full article
      +-- not entitled -> preview payload only

### 18.3 Entitlement source

Premium state must eventually be server-authoritative and reconciled from:

- Apple subscription transactions;
- Google Play subscription transactions;
- web billing/provider transactions;
- institutional/admin entitlement where supported.

The entitlement service should expose one normalized reader entitlement to Web, Android and iOS.

### 18.4 Currency

Native stores should use storefront/localized subscription pricing provided by Apple/Google rather than an invented in-app FX conversion.

Web checkout may implement its own supported multi-currency billing provider.

### 18.5 Premium advertising policy

The platform must support configuration such as:

- full ads for anonymous/free readers;
- reduced ads for registered readers;
- reduced or ad-free Premium;
- institutional policy.

This is a business decision, not hardcoded behaviour.

---

## 19. Advertising architecture

Advertising is a first-class commercial subsystem.

### 19.1 Cross-platform model

Recommended architecture:

    Google Ad Manager / commercial control plane
      |
      +-- Web/PWA inventory
      |     +-- AdSense / Google demand as applicable
      |     +-- direct campaigns
      |
      +-- Android inventory
      |     +-- Google Mobile Ads / Ad Manager
      |     +-- Google demand/backfill as configured
      |     +-- direct campaigns
      |
      +-- iOS inventory
      |     +-- Google Mobile Ads / Ad Manager
      |     +-- Google demand/backfill as configured
      |     +-- direct campaigns
      |
      +-- Video inventory
            +-- direct/video demand
            +-- Google-supported video ads

Web AdSense should not be treated as the native app SDK. Native apps require mobile-app advertising technology.

### 19.2 Commercial objects

Advertising Manager should model:

    Advertiser
      -> Campaign
        -> Order/Line/Placement rule
          -> Creative
            -> Delivery
              -> Reporting

Campaign metadata includes:

- advertiser;
- campaign;
- commercial owner;
- start/end;
- status;
- countries/regions;
- platforms;
- eligible placements;
- creative variants;
- click destination;
- disclosure;
- editorial/health-claim review state where required;
- pacing/budget metadata where available;
- reporting metrics.

### 19.3 Initial inventory registry

Suggested inventory IDs:

- home_top
- home_after_live
- home_feed_1
- home_feed_2
- home_watch
- section_feed
- country_feed
- topic_feed
- article_after_intro
- article_mid_1
- article_mid_2
- article_end
- live_feed
- watch_preroll
- watch_midroll
- watch_feed
- premium_cross_sell
- newsletter_sponsor

Every placement must be documented with:

- platform;
- supported format;
- minimum content context;
- frequency/density rules;
- Premium behaviour;
- allowed campaign type.

### 19.4 Direct campaigns and Google demand

Direct campaigns such as HOSPAZ-style advertising must remain distinct from Google programmatic inventory in data and reporting.

Commercial staff need to know whether a delivery/metric belongs to:

- direct HealthTimes campaign;
- Google/Ad Manager demand;
- house campaign;
- sponsorship.

### 19.5 ads.txt and app-ads.txt

Web must serve verified ads.txt.

Native monetization requires verified app-ads.txt and store/developer-site relationships.

No seller IDs may be invented.

### 19.6 Health-sensitive ad safeguards

HealthTimes covers sensitive topics.

Do not create advertiser-curated audiences based on inferred reader health conditions or sensitive health interests.

Prefer:

- contextual placement;
- broad geography where lawful;
- approved broad audience products;
- direct campaign rules;
- publication section sponsorship;
- non-sensitive signals.

Commercial optimization must remain compliant with Google policy and applicable privacy law.

---

## 20. Analytics and intelligence architecture

### 20.1 GA4 streams

One logical HealthTimes analytics property should support separate streams for:

- Web;
- iOS;
- Android;

subject to the final AG-05 continuity decision and current client account ownership.

### 20.2 First-party event vocabulary

Events should use a versioned common vocabulary across platforms.

Core events:

Content:
- article_impression
- article_open
- article_read_25
- article_read_50
- article_read_75
- article_complete
- related_article_open
- article_save
- article_share
- article_download
- article_listen

Search:
- search
- search_filter
- search_result_open
- search_no_results
- search_refine

Video:
- video_impression
- video_start
- video_25
- video_50
- video_75
- video_complete

Live:
- live_impression
- live_open
- live_follow
- live_update_interaction

Reader:
- edition_change
- country_follow
- topic_follow
- briefing_subscribe
- notification_open

Premium:
- premium_preview
- premium_gate
- premium_offer_open
- premium_checkout_start
- premium_purchase
- premium_restore
- premium_cancel_signal where law/provider allows

Advertising:
- ad_impression
- ad_click
- ad_error
- direct_campaign_impression
- direct_campaign_click

Social/distribution:
- social_share
- social_referral_open
- newsletter_referral_open
- whatsapp_referral_open
- push_referral_open

### 20.3 First-party intelligence

HealthTimes should store normalized aggregates/checkpoints needed for operational dashboards.

Do not rely on fabricated client-side counters.

### 20.4 GIBC terminology note

The client/owner has referenced “GIBC.” No canonical module with that exact acronym currently exists in the repository.

Until the acronym is formally expanded, this plan preserves the requirement as a provisional umbrella under:

**Analytics & Intelligence / Google and Business Intelligence capability.**

The capability covers:

- GA4;
- Search Console;
- advertising reporting;
- social attribution;
- content performance;
- audience performance;
- Premium conversion;
- revenue intelligence;
- channel movement.

Future agents must not invent a formal expansion of GIBC without owner/client confirmation.

---

## 21. Social distribution and intelligence

Social is part of the acquisition loop.

### 21.1 Closed-loop model

    HealthTimes story
      |
      +-- Facebook
      +-- WhatsApp
      +-- Instagram
      +-- X
      +-- LinkedIn
      +-- YouTube
      +-- Newsletter
      |
      v
    canonical HealthTimes link
      |
      +-- app installed -> native destination
      +-- no app -> PWA/web
      |
      v
    reading/watch/live engagement
      |
      v
    ads / repeat reading / registration / Premium
      |
      v
    analytics and newsroom intelligence

### 21.2 UTM governance

Official social publishing links should be generated by the system with normalized attribution.

Minimum campaign parameters:

- source;
- medium;
- campaign;
- content/creative identifier where needed;
- campaign ID where needed.

Staff should not manually invent inconsistent parameter names.

### 21.3 Deep linking

Canonical HealthTimes HTTPS URLs must serve both the website and native apps.

Android:

- verified App Links;
- Digital Asset Links;
- assetlinks.json;
- signing-certificate verification.

iOS:

- Universal Links;
- Associated Domains;
- apple-app-site-association;
- validated route handling.

If the app is absent, the same link opens on the web.

### 21.4 Social Intelligence dashboard

HealthTimes Studio should report not only clicks but quality.

Example metrics by source:

- visits;
- engaged sessions/readers;
- article completion;
- next-story rate;
- articles/session;
- total engaged time;
- saved stories;
- registrations;
- newsletter subscriptions;
- Premium starts/conversions;
- advertising impressions/revenue where reconcilable.

This allows the newsroom to distinguish high-volume low-quality referral traffic from smaller but more valuable audiences.

---

## 22. SEO and Search & Growth

SEO remains web-first, but mobile Studio should expose SEO intelligence.

### 22.1 Canonical identity

Every public story has a canonical web URL.

That canonical identity is used by:

- Google Search;
- social sharing;
- newsletters;
- native deep links;
- citations;
- analytics;
- redirects.

### 22.2 Search & Growth Studio module

Staff capabilities may include:

- Search Console overview;
- top queries;
- rising queries;
- impressions;
- clicks;
- CTR;
- position;
- articles ranking 8–20;
- metadata quality;
- canonical status;
- structured-data status;
- sitemap;
- broken URLs;
- redirects;
- internal-link opportunities;
- Core Web Vitals/PageSpeed status;
- zero-result HealthTimes searches;
- demand/content gaps.

### 22.3 Newsroom workflow integration

Search demand should be actionable.

Example:

    Rising query:
    cholera vaccine Zimbabwe

    Existing coverage:
    1 weak match

    Action:
    Create assignment

Search intelligence may inform journalism, but it must not override editorial standards or encourage low-quality keyword farming.

---

## 23. HealthTimes Studio — Today

Today is an action dashboard.

It should answer:

- what requires attention now;
- what is breaking;
- what is assigned to me;
- what is waiting for review;
- what is scheduled;
- what campaigns are changing;
- what audience/search signals are rising.

Example cards:

- 2 Live stories active;
- 7 stories awaiting review;
- 4 assignments due;
- 6 stories scheduled today;
- 2 campaigns ending;
- 3 rising search topics;
- one major social spike.

The dashboard must be role-aware.

---

## 24. HealthTimes Studio — Stories

Stories consolidates:

- Ideas;
- Assignments;
- Drafts;
- My Stories;
- Review Queue;
- Fact Check;
- Health/Science Review;
- Copy Edit;
- Ready;
- Scheduled;
- Published;
- Breaking;
- Premium;
- Corrections;
- Archive.

Workflow remains:

    Idea
      -> Assignment
      -> Draft
      -> Source verification
      -> Fact check
      -> Health/science review where needed
      -> Copy edit
      -> Ready/Scheduled
      -> Published
      -> Correction/Update
      -> Archive

Authorization remains server-side.

---

## 25. HealthTimes Studio — mobile story editor

Mobile editing should focus on legitimate on-the-go newsroom actions rather than reproducing a desktop page builder.

Supported mobile actions:

- create story;
- edit headline;
- edit standfirst;
- edit article blocks;
- add/update media;
- add sources;
- apply taxonomy;
- set geography;
- set Premium/free;
- set breaking/developing;
- save draft;
- submit for review;
- review/comment;
- schedule;
- approve/publish if capability allows;
- correct/update if capability allows.

Dense page-layout administration may remain desktop-first.

---

## 26. HealthTimes Studio — Live & Video Desk

### 26.1 Live Desk

Capabilities:

- Start Live Story
- Schedule Live Event
- End Live Event
- Add update
- Pin update
- Add media
- send alert according to permissions
- attach related article
- configure Live advertising
- publish social link

### 26.2 Video Desk

Capabilities:

- Upload Video
- Add provider video
- Schedule Live Stream
- Set thumbnail
- Add caption/transcript
- assign presenter/reporter
- assign country/topic
- set Premium/free
- enable eligible advertising
- push alert
- social promotion
- publish/unpublish

---

## 27. HealthTimes Studio — Advertising Manager

Advertising Manager is a major commercial module.

Views:

- Overview
- Advertisers
- Campaigns
- Creatives
- Placements
- Scheduled
- Active
- Paused
- Review
- Performance
- app-ads.txt / ads.txt readiness
- Google integration status
- Direct campaign reporting

Commercial staff should not receive editorial publish permission merely because they can manage ads.

---

## 28. HealthTimes Studio — Audience

Audience should cover:

- readers;
- registered readers;
- Premium members;
- newsletter audience;
- WhatsApp audience;
- notifications;
- followed topics;
- followed countries;
- retention/returning readers;
- acquisition channels;
- privacy/consent-aware aggregate reporting.

Private personal data access must be minimized by role.

---

## 29. HealthTimes Studio — Social Desk

Social Desk should make distribution measurable.

Functions:

- select published story;
- prepare platform-specific copy;
- select destination channels;
- generate attributed canonical links;
- schedule;
- record publishing outcome where integration exists;
- show referral quality;
- compare channels;
- identify high-performing stories;
- identify weak traffic quality;
- create follow-up action.

Initial channels:

- WhatsApp
- Facebook
- Instagram
- X
- LinkedIn
- YouTube
- email/newsletter

Direct automated posting depends on provider APIs, permissions and account access. Where posting APIs are unavailable or unsuitable, Studio can manage a publishing queue and tracked link generation.

---

## 30. HealthTimes Studio — Analytics & Intelligence

Dashboards should be decision-oriented.

Top-level:

- Today
- Content
- Audience
- Search
- Social
- Premium
- Advertising
- Revenue
- Geography
- Video
- Live
- Platform

Example content metrics:

- readers;
- views;
- completion;
- engaged time;
- return rate;
- saves;
- shares;
- Listen;
- video completion;
- source mix.

Example business metrics:

- Premium starts;
- paid conversion;
- direct-campaign performance;
- ad impressions;
- ad clicks;
- estimated Google revenue where imported;
- app/web breakdown.

Metrics must retain source/provenance.

---

## 31. HealthTimes Studio — AI Desk

AI is primarily an editorial/product assistance system.

Potential capabilities:

- query interpretation;
- taxonomy suggestions;
- country/topic/entity tagging;
- duplicate-story detection;
- related HealthTimes coverage discovery;
- timeline assembly;
- source-document assistance;
- headline alternatives;
- SEO metadata suggestions;
- social-copy assistance;
- briefing draft assistance;
- transcription assistance;
- caption suggestions;
- internal search;
- content-gap analysis.

AI must not:

- silently publish;
- silently change facts;
- invent sources;
- invent analytics;
- diagnose;
- prescribe;
- replace mandatory editorial review.

Consumer-facing article summarization is not the default product direction because the client wants readers to consume full journalism.

---

## 32. HealthTimes Studio — remaining modules

### 32.1 Media

- images;
- video;
- audio;
- documents;
- recent;
- upload;
- capture from mobile;
- captions;
- credits;
- alt text;
- rights/source metadata;
- attach to story.

### 32.2 Calendar

- editorial calendar;
- assignments;
- scheduled publication;
- Live events;
- video events;
- campaign dates.

### 32.3 Premium

- Premium content;
- preview policy;
- membership configuration;
- entitlement support operations;
- product analytics.

### 32.4 Newsletter

- daily briefing;
- weekly briefing;
- Premium briefing;
- breaking mail;
- sponsor slot;
- schedule;
- delivery/performance where provider supports.

### 32.5 WhatsApp

- briefing/alert workflow;
- publication channel;
- tip/contact routing;
- campaign attribution;
- engagement metrics where supported.

### 32.6 Subscribers

- reader/member lookup by authorized staff;
- entitlement status;
- support state;
- account status;
- privacy-safe operational tools.

### 32.7 Authors

- profile;
- beat;
- bio;
- social links;
- published work;
- role;
- image.

### 32.8 Staff & Roles

- invitations;
- access status;
- role;
- capabilities;
- sessions;
- revoke;
- audit.

### 32.9 Platform

- publication settings;
- taxonomy;
- integrations;
- email;
- Google;
- social;
- advertising;
- analytics;
- search;
- AI;
- storage;
- security;
- audit;
- system health.

---

## 33. Permissions and governance

Server-side capabilities remain the authorization primitive.

Existing minimum editorial/security capabilities from AG-06 should be preserved and extended for mobile operations.

Examples:

- story.create
- story.edit_own
- story.edit_all
- story.submit
- story.fact_check
- story.health_review
- story.copy_edit
- story.publish
- story.correct
- premium.assign
- premium.manage
- ads.view
- ads.create
- ads.approve
- subscriber.view
- subscriber.manage
- staff.view
- staff.invite
- staff.change_role
- staff.revoke
- analytics.view
- settings.manage

Additional possible mobile/media capabilities:

- live.create
- live.update
- live.publish
- live.end
- video.create
- video.publish
- social.prepare
- social.publish
- notifications.send
- media.upload
- search_growth.view

UI visibility is not authority. Direct API requests must be checked server-side.

---

## 34. Mobile technical architecture

### 34.1 Proposed stack

- React Native
- Expo
- TypeScript
- Expo Router
- EAS build/release tooling
- Supabase-compatible backend contracts
- selected native modules for secure storage, media, notifications, ads, audio/video and deep links
- automated testing appropriate to React Native plus backend/security tests

### 34.2 Proposed application identity

Reader production:

- Android application ID: zw.co.healthtimes.app
- iOS bundle identifier: zw.co.healthtimes.app

Proposed variants:

- zw.co.healthtimes.app.dev
- zw.co.healthtimes.app.staging
- zw.co.healthtimes.app

If Studio is separately packaged, proposed identities:

- zw.co.healthtimes.studio.dev
- zw.co.healthtimes.studio.staging
- zw.co.healthtimes.studio

Final names/IDs require owner confirmation before store registration if not already reserved.

### 34.3 Environment separation

Required environments:

1. local;
2. development;
3. staging;
4. production.

Non-production builds must be visually distinguishable.

Example:

    HealthTimes Staging
    STAGING

Production endpoints/keys must never be reused casually in development.

---

## 35. Proposed repository organization

Do not reorganize the current web application destructively merely to create mobile.

Proposed additive structure:

    htp-zw/
      current web/PWA files
      mobile/
        app/
        src/
          features/
            reader/
            studio/
          services/
          repositories/
          components/
          navigation/
          hooks/
          state/
        assets/
        app.config.ts
        eas.json
        package.json
        tsconfig.json
      shared/
        contracts/
        design-tokens/
        analytics-events/
        taxonomy/
      supabase/
      docs/
        native-mobile/
          HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md
          agent-tasks/             [created after owner approval]
          agent-reports/           [created during execution]

If workspace/monorepo tooling is introduced, it must be justified by implementation needs and must not destabilize migration scripts or current PWA validation.

---

## 36. Data/service abstraction

Screens must not query infrastructure directly whenever a stable service/repository boundary is appropriate.

Core interfaces may include:

- ArticleRepository
- SearchService
- AuthService
- ReaderRepository
- BookmarkRepository
- DownloadRepository
- PremiumService
- EntitlementService
- NotificationService
- AnalyticsService
- AdvertisingService
- VideoService
- LiveService
- SocialAttributionService
- MediaService
- HealthTimesIntelligenceService

Early implementations:

- fixtures;
- local controlled mocks.

Later:

- staging API/Supabase;
- production API.

This allows native UI work to start before data migration completes.

---

## 37. Initial shared domain contracts

### 37.1 Article

Expected fields include:

- id;
- slug;
- canonical URL;
- title;
- standfirst;
- body blocks;
- preview body where Premium;
- author/byline;
- publication/update timestamps;
- reading time;
- featured media;
- topics;
- desks;
- geographies;
- format;
- Premium state;
- breaking/developing state;
- audio availability;
- video relationship;
- Live relationship;
- source/reviewer metadata;
- correction metadata;
- related coverage.

### 37.2 Reader

- id;
- name;
- email;
- account state;
- entitlement;
- primary edition;
- followed geographies;
- followed topics;
- followed authors;
- saved stories;
- preferences;
- notification settings;
- theme;
- consent/privacy settings.

### 37.3 LiveEvent

Defined in section 11.

### 37.4 Video

Defined in section 12.

### 37.5 Campaign

- advertiser;
- campaign;
- creative;
- placement;
- platform;
- geography;
- date range;
- status;
- click destination;
- disclosure;
- review state;
- source/provider;
- reporting identifiers.

Contracts must be reconciled against AG-03/AG-04 source reality before being frozen.

---

## 38. Relationship to AG-01 through AG-07

AG-01 through AG-07 remain the migration/platform/certification spine.

Native adds a parallel NM lane.

### 38.1 AG-01 -> NM-01

AG-01 provides:

- canonical baseline;
- taxonomy freeze;
- schema evidence;
- secrets hygiene;
- validated PWA baseline;
- migration truth.

NM-01 uses this to build:

- native workspace;
- app identities;
- navigation;
- design system;
- fixtures;
- contracts;
- iOS/Android development builds.

### 38.2 AG-02 -> NM-02

AG-02 provides:

- staging API/frontend platform;
- staging database;
- Auth;
- Storage;
- environment/secrets pattern;
- health checks;
- backup path.

NM-02 connects native development builds to staging.

### 38.3 AG-03 -> NM-03

AG-03 provides the actual source inventory:

- articles;
- pages;
- authors;
- media;
- taxonomy;
- Premium history;
- subscribers/payment state;
- ads/integrations;
- Google property identities.

NM-03 reconciles native contracts with real source data.

### 38.4 AG-04 -> NM-04

AG-04 migrates real content/media/taxonomy into staging.

NM-04 replaces article/content fixtures with real staging content and certifies reader behaviour over realistic scale.

### 38.5 AG-05 -> NM-05

AG-05 resolves:

- GA4;
- Search Console;
- SEO;
- AdSense/Ad Manager context;
- ads.txt/app-ads.txt;
- direct campaigns;
- performance;
- historical metrics.

NM-05 implements mobile analytics, ads, social attribution, deep links and mobile monetization against those decisions.

### 38.6 AG-06 -> NM-06

AG-06 establishes server-backed identity, sessions, authorization, persistence and auditing.

NM-06 replaces mock reader/staff authority with real secure identity, device/session handling, push registration and mobile security.

### 38.7 AG-07 -> NM-07

AG-07 certifies one integrated staging candidate.

NM-07 must certify Android and iOS binaries against the same frozen backend/content candidate.

Any post-freeze change affecting certified behaviour requires appropriate recertification.

---

## 39. Native checkpoints NM-01 through NM-07

### NM-01 — Native Foundation

Mission:

Create the real Android/iOS foundation without depending on unfinished migration data.

Deliverables:

- mobile workspace;
- React Native/Expo TypeScript app;
- Reader navigation;
- Studio navigation shell;
- design tokens;
- fixtures;
- service interfaces;
- environment profiles;
- iOS Simulator run;
- Android Emulator run;
- first development builds;
- baseline automated tests.

Acceptance:

- same source commit runs Android and iOS;
- no PWA WebView architecture;
- no production secrets;
- Home and Article fixture journeys work;
- non-production environment is visible;
- app IDs/config documented.

### NM-02 — Staging Connectivity

Mission:

Connect development/staging mobile builds to AG-02 staging.

Deliverables:

- environment-specific API clients;
- Auth connectivity;
- Storage/media;
- network/error handling;
- staging health;
- token/session integration baseline.

Acceptance:

- no service-role/database secret in app;
- staging only;
- API failures are handled;
- Android/iOS connect to same staging contract.

### NM-03 — Content Contracts and Global Taxonomy

Mission:

Reconcile app domain models with AG-03 source truth.

Deliverables:

- Article;
- Author;
- Media;
- Live;
- Video;
- taxonomy;
- geography;
- Premium;
- ad/commercial contracts;
- source provenance handling.

Acceptance:

- contracts account for real source fields/exceptions;
- global edition model is represented;
- no hardcoded Zimbabwe-only schema.

### NM-04 — Native Reader Product

Mission:

Build the production-quality reader experience over AG-04 staging content.

Deliverables:

- Home;
- Explore;
- Search;
- Article;
- Live;
- Watch;
- Listen;
- Saved;
- Downloads/offline;
- My HealthTimes;
- edition selection;
- themes;
- accessibility;
- tablet density.

Acceptance:

- migrated content renders;
- long/edge-case stories render;
- media works;
- search returns real data;
- offline/read-position behaviour is deterministic;
- layout passes phone/tablet testing.

### NM-05 — Growth, Advertising, Social and Premium

Mission:

Implement commercial/growth systems.

Deliverables:

- GA4 mobile streams/events;
- first-party event emission;
- Google mobile ads/Ad Manager integration as approved;
- direct-ad placement abstraction;
- ads.txt/app-ads.txt readiness checks;
- deep links;
- social attribution;
- Search & Growth client surfaces;
- Premium store integration baseline;
- server entitlement integration.

Acceptance:

- ad test inventory never uses fabricated production seller data;
- event naming is consistent;
- deep links work;
- Premium full body is server-protected;
- social referrals can be attributed;
- sensitive health targeting rules documented/tested.

### NM-06 — Identity, Push and Studio Security

Mission:

Complete secure reader/staff identity and device services.

Deliverables:

- reader registration/sign-in;
- secure session storage;
- password reset/verification as backend supports;
- social sign-in if approved;
- account deletion path;
- push device registration;
- notification preferences;
- staff Studio sign-in;
- role/capability checks;
- revoke/session handling;
- audit-compatible operations.

Acceptance:

- local role switching cannot create authority;
- revoked sessions fail safely;
- direct unauthorized API attempts fail;
- no privileged keys in mobile binary/source;
- Studio respects AG-06 capabilities.

### NM-07 — Native Integrated Certification

Mission:

Certify actual native binaries against the frozen integrated staging candidate.

Minimum matrix:

- Android phone;
- Android tablet;
- iPhone;
- iPad.

Core UAT:

- install;
- first launch;
- upgrade;
- cold/warm launch;
- onboarding;
- edition selection;
- login/logout;
- session persistence;
- Home;
- Search;
- article;
- Premium gate;
- purchase sandbox/test path;
- save;
- offline;
- Listen;
- video;
- Live;
- share;
- deep link;
- notification routing;
- dark mode;
- text scaling;
- network loss/recovery;
- expired/revoked session;
- staff workflows as applicable;
- advertising test delivery;
- analytics event validation;
- accessibility;
- security.

NM-07 certification does not authorize production release by itself.

---

## 40. Branching and agent execution rules

Mobile agents should work capability-first, not Android-vs-iOS-first.

Preferred lanes:

- mobile/native-foundation
- mobile/design-system
- mobile/home
- mobile/article-reader
- mobile/explore-search
- mobile/live
- mobile/watch
- mobile/audio
- mobile/saved-offline
- mobile/my-healthtimes
- mobile/premium
- mobile/advertising
- mobile/analytics
- mobile/social-attribution
- mobile/notifications
- mobile/studio
- mobile/security

Each feature should be demonstrated on both iOS and Android before integration unless it is explicitly platform-specific.

Do not create two independent implementations of the same business rule.

---

## 41. CI/CD and build strategy

Target build profiles:

- development;
- staging/internal;
- production.

A single candidate SHA should be traceable to:

- Android build;
- iOS build;
- backend schema/migration version;
- staging API build;
- test results.

Desired release evidence:

    candidate SHA
    Android build ID
    iOS build ID
    backend/schema version
    API deployment ID
    UAT report
    security report
    analytics/ad validation
    store metadata version

Production signing credentials must be protected and never committed.

---

## 42. Testing strategy

Testing must go beyond browser viewport simulation.

### 42.1 Unit/domain tests

- ranking helpers;
- taxonomy;
- access policy client handling;
- event payloads;
- route parsing;
- fixture/service contract consistency.

### 42.2 Component tests

- article rendering;
- Premium gate;
- ads;
- search filters;
- Live update card;
- video card;
- error/loading/empty states.

### 42.3 Integration tests

- API;
- Auth;
- Storage;
- bookmarks;
- entitlements;
- deep links;
- push registration;
- analytics;
- advertising.

### 42.4 Native end-to-end

Use suitable native E2E/device tooling decided during NM-01. Browser-only Playwright is insufficient for native certification.

### 42.5 Security tests

- auth bypass;
- role manipulation;
- direct API unauthorized access;
- Premium bypass;
- deep-link parameter validation;
- token leakage;
- storage inspection;
- revoked sessions;
- sensitive draft access.

### 42.6 Accessibility

- screen reader labels;
- dynamic text;
- contrast;
- focus order;
- touch targets;
- reduced motion where relevant;
- captions/transcripts;
- orientation/tablet behaviour.

---

## 43. Performance expectations

Native performance budgets should be defined during NM-01/NM-04 and measured, not guessed.

Focus areas:

- first meaningful Home render;
- article-open latency;
- image/video loading;
- feed scrolling;
- memory pressure;
- offline database/cache size;
- startup time;
- search response;
- ad impact;
- analytics overhead.

Advertising and analytics must not make the product visibly unstable.

---

## 44. Security and privacy

### 44.1 Secrets

Allowed in app:

- public/publishable client configuration intended for mobile use.

Not allowed:

- service-role keys;
- database passwords;
- privileged API secrets;
- payment-provider private keys;
- Google server credentials;
- staff export secrets.

### 44.2 Session storage

Use platform-appropriate secure storage for sensitive tokens where required by the selected auth architecture.

### 44.3 Draft/internal newsroom data

Anonymous/public clients must never retrieve draft/internal data.

### 44.4 Health data sensitivity

HealthTimes is primarily a journalism product, not a clinical record product, but reader activity may reveal sensitive interests.

Treat health-interest behavioural data carefully.

Do not use inferred sensitive health interests for prohibited personalized advertising.

### 44.5 Deep links

Validate all route parameters.

Deep links must not perform destructive or privileged actions merely because a URL was opened.

---

## 45. Store readiness

### 45.1 Android

Requirements include:

- final application ID;
- signing;
- Play Console;
- store listing;
- privacy policy;
- data safety declaration;
- developer website;
- app-ads.txt;
- internal testing;
- closed/open testing as required;
- production release;
- deep-link association;
- billing products;
- notification setup;
- advertising app registration.

### 45.2 iOS

Requirements include:

- Apple Developer membership;
- bundle ID;
- signing/provisioning;
- App Store Connect;
- privacy labels;
- review metadata;
- screenshots;
- support/privacy URLs;
- Associated Domains;
- StoreKit subscription products;
- TestFlight;
- App Review;
- advertising/privacy configuration.

No store-readiness claim should be made before the actual required steps are completed.

---

## 46. Manual and operational use after launch

This document is intended to evolve into a manual.

Operationally, staff should be able to answer:

- How do I publish a story?
- How do I start a Live event?
- How do I upload/schedule a video?
- How do I create a campaign?
- How do I see whether Facebook or WhatsApp traffic is valuable?
- How do I see search demand?
- How do I mark a story Premium?
- How do I change a country's edition priority?
- How do I send a breaking alert?
- How do I investigate an ad-placement problem?
- How do I revoke a staff session?
- How do I inspect a failed publish?
- How do I see app health?

As implementation is completed, agent reports should add exact operational steps and screenshots/links where appropriate.

---

## 47. Explicit anti-patterns and prohibited shortcuts

Agents must not:

- wrap the PWA in a WebView and call it finished native;
- create independent Android/iOS business logic unnecessarily;
- hardcode production secrets;
- make localStorage the production identity/entitlement authority;
- send full Premium content to unauthorized clients;
- invent advertising seller IDs;
- invent analytics/revenue numbers;
- use protected Newsroom activity as public analytics without approved design;
- use health-sensitive inferred reader interests for prohibited ad targeting;
- let AI silently publish;
- let AI summaries replace full journalism as the default consumer flow;
- build Zimbabwe-only geography assumptions into permanent schemas;
- embed arbitrary provider-specific video iframe HTML as the permanent video model;
- allow Commercial roles to gain editorial publish authority by default;
- certify native quality using only Chromium responsive widths;
- claim App Store/Play release before real signed builds and store processes are completed.

---

## 48. Decisions requiring owner/client confirmation

This plan makes recommendations but preserves several decisions for explicit approval.

1. **Studio packaging**
   - recommended: separate Reader and Studio app targets from one shared mobile workspace;
   - alternative: one binary with heavily gated staff area.

2. **Final public app name**
   - proposed: HealthTimes Zimbabwe initially, with global positioning in product copy;
   - possible future simplification: HealthTimes.

3. **Premium advertising**
   - ad-free;
   - reduced ads;
   - standard ads with Premium content access.

4. **Premium plans**
   - monthly;
   - annual;
   - institutional;
   - promotional trial/intro offers.

5. **Exact preview depth**
   - default proposal: first paragraph;
   - configurable by content/product policy.

6. **Final edition launch list**
   - platform supports global hierarchy;
   - editorial team must decide which editions are active at launch.

7. **GIBC terminology**
   - owner/client to define the intended acronym/name.

8. **Video provider strategy**
   - YouTube-first;
   - dedicated streaming;
   - hybrid.

9. **Social publishing integrations**
   - direct API automation where authorized;
   - managed queue/tracked links where not.

10. **Premium billing provider for web**
    - to be finalized separately from Apple/Google native billing.

These items do not prevent NM-01 foundation work after owner approval unless specifically identified as blocking.

---

## 49. Recommended implementation sequence

After owner approves this document:

### Step 1 — Freeze this plan

- change status from Draft to Approved;
- tag version;
- record approval date;
- record owner decisions.

### Step 2 — Create native agent task set

Create:

- NM-01 Native Foundation
- NM-02 Staging Connectivity
- NM-03 Content Contracts
- NM-04 Native Reader
- NM-05 Growth/Ads/Social/Premium
- NM-06 Identity/Push/Studio Security
- NM-07 Native Certification

Each task must define scope, branch, required reads, acceptance gates, stop conditions and receipt format.

### Step 3 — Start NM-01 immediately

NM-01 does not wait for the database migration.

It builds:

- native workspace;
- iOS;
- Android;
- navigation;
- design system;
- fixtures;
- repository/service contracts;
- Home;
- Article;
- environment separation.

### Step 4 — Connect AG outputs progressively

- AG-02 gives real staging;
- AG-03 refines contracts;
- AG-04 supplies real migrated content;
- AG-05 supplies Google/SEO/ads/analytics truth;
- AG-06 supplies real identity/security;
- AG-07 supplies frozen integrated certification candidate.

### Step 5 — Native certification

NM-07 certifies actual signed/internal-test binaries against the integrated staging candidate.

### Step 6 — Store release programme

Only after technical certification and owner authorization:

- final legal/privacy;
- store assets;
- billing;
- app-ads.txt;
- store analytics;
- TestFlight/Play testing;
- review;
- controlled production launch.

---

## 50. Definition of the target product

The target HealthTimes ecosystem is:

    HEALTH TIMES NEWSROOM / STUDIO
          |
          +-- journalism
          +-- Live
          +-- video
          +-- media
          +-- taxonomy
          +-- social
          +-- advertising
          +-- Premium
          +-- search/SEO
          +-- audience/analytics
          |
          v
    HEALTH TIMES PLATFORM
          |
          +-- PWA/Web
          +-- Android
          +-- iOS
          |
          v
    READ / WATCH / LISTEN / LIVE
          |
          +-- Search
          +-- Google
          +-- Social
          +-- WhatsApp
          +-- Newsletter
          +-- Push
          |
          v
    ENGAGEMENT
          |
          +-- article reading
          +-- ad impressions
          +-- video
          +-- Live
          +-- saves
          +-- follow
          +-- registration
          +-- Premium
          |
          v
    ANALYTICS & INTELLIGENCE
          |
          +-- newsroom decisions
          +-- search opportunities
          +-- social performance
          +-- product decisions
          +-- commercial decisions
          |
          +-----------------------> back to Studio

The operating loop is:

**Publish -> distribute -> acquire -> read/watch/listen/live -> monetize -> measure -> learn -> publish better.**

---

## 51. Success criteria

HealthTimes Native succeeds when:

- Android and iOS feel purpose-built rather than wrapped web pages;
- the PWA remains a strong canonical web/SEO product;
- all three reader surfaces consume the same authoritative content/identity/entitlement platform;
- users can find articles quickly through taxonomy and intelligent search;
- AI increases discovery without replacing full journalism;
- Live and Watch are real newsroom-controlled formats;
- advertising is commercially powerful but governed;
- social traffic is measurable from source to meaningful outcome;
- GA4 and first-party analytics give a consistent cross-platform view;
- the product supports global editions without Zimbabwe-only assumptions;
- Premium is easy to understand and hard to bypass;
- staff can act from Studio without compromising editorial governance;
- native tests prove actual device/app behaviour;
- future agents can read this document and understand why the product is built this way.

---

## 52. External implementation references

These links are implementation references and must be rechecked by agents at execution time because SDK, store and advertising rules change.

### Expo / React Native build

- Expo EAS Build:
  https://docs.expo.dev/build/introduction/
- Expo build setup:
  https://docs.expo.dev/build/setup/

### Supabase / React Native

- Supabase Auth with React Native:
  https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase Expo React Native quickstart:
  https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native

### Google Analytics

- GA4 website/app setup:
  https://support.google.com/analytics/answer/14183469
- Data streams:
  https://support.google.com/analytics/answer/9355659
- Campaign/UTM collection:
  https://support.google.com/analytics/answer/10917952

### Google advertising

- Ad Manager apps overview:
  https://support.google.com/admanager/answer/6238688
- Implement mobile apps in Ad Manager:
  https://support.google.com/admanager/answer/6238692
- Google Mobile Ads SDK:
  https://developers.google.com/ad-manager/mobile-ads-sdk/
- Native ads overview:
  https://support.google.com/admob/answer/6239795
- ads.txt / app-ads.txt:
  https://support.google.com/admanager/answer/7544382
- Health in personalized advertising:
  https://support.google.com/adspolicy/answer/16701855

### Android App Links

- Android App Links:
  https://developer.android.com/training/app-links/about

### Apple Universal Links

- Supporting associated domains:
  https://developer.apple.com/documentation/xcode/supporting-associated-domains
- Universal links:
  https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content/

### Subscriptions and regional pricing

- Apple subscriptions:
  https://developer.apple.com/app-store/subscriptions/
- Google Play multi-currency:
  https://support.google.com/googleplay/android-developer/answer/1169947

### Benchmark publisher applications

Benchmark observations were taken from current publisher/store descriptions and public product behaviour for:

- The New York Times
- Financial Times
- BBC
- The Economist
- other established global news products as implementation research continues

These are benchmarks, not templates to copy.

---

## 53. Approval gate

This document is currently:

**DRAFT FOR OWNER REVIEW**

No native-mobile agent should treat it as implementation authorization until the owner explicitly approves it.

After approval, the next governance action is:

1. update this document to **APPROVED — NATIVE MOBILE PROGRAMME BASELINE**;
2. preserve the approved SHA;
3. create NM-01 through NM-07 task files;
4. assign branch and checkpoint governance;
5. begin NM-01.

Until then:

**Native implementation authorization: NOT GRANTED BY THIS DOCUMENT.**
