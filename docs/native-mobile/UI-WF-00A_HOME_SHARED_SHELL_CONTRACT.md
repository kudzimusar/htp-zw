# UI-WF-00A — Home + Shared Reader Shell Executable Visual Contract

**Repository:** kudzimusar/htp-zw  
**Programme:** UI-WF — HealthTimes Wireframe Fidelity Programme  
**Task:** UI-WF-00A — Home + Shared Reader Shell Executable Visual Contract  
**Status:** DOCUMENTATION / INVESTIGATION CONTRACT — RETURN FOR MODERATOR CERTIFICATION  
**Runtime product code:** FROZEN  
**Implementation authorization:** NOT GRANTED BY THIS DOCUMENT

---

## 1. Authority and exact SHAs

This contract was prepared against the following verified authority:

- Canonical Reader: apps/mobile.
- Canonical main: 46f43e6e4f76ddbc0bdf6cf9b3f1f296ce82d4b8.
- Accepted UI reference head: 4410001f7b4bf6fb7ae9a605378a4fabd1005fc4.
- Current PR #80: Draft / Open / unmerged.
- PR #80 branch: integration/ui-rel04-certified-ui-current-main.
- PR #80 exact head inspected: 6a28b59770b9c293f45c693583b58ffc1a35831a.
- PR #80 handoff head supplied to UI-WF-00A: 15a7f3e0ca0d1b5970e2234c789a4f4246a4241c.
- PR #80 advanced by five commits after the supplied handoff head. Those five commits change only certification/harness files and do not change Home, Layout, Cards, theme, service, domain, advertising, Premium, or backend product authority. Therefore the head advance does not create visual-contract authority ambiguity.
- Design specification inspected: docs/native-mobile/DESIGN.md at canonical main.
- Approved visual asset verified in repository custody: docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png.
- Explicit owner instructions in UI-WF-00A override older DESIGN.md Home labels where the two differ.

Authority order for this contract is:

1. explicit owner instructions in UI-WF-00A;
2. owner-supplied Screen 1 Home wireframe;
3. approved canonical wireframe asset;
4. docs/native-mobile/DESIGN.md;
5. existing functional, security, data, Premium, advertising, analytics and commerce authority;
6. implementation convenience.

The governing design rule is **faithful structure, better polish**.

---

## 2. Purpose

Current production/main is a technically useful baseline, not the finished client-directed Home UI. This contract converts Screen 1 — Home and the shared Reader shell into an executable product/design contract before UI-WF-01A is permitted to reconstruct runtime visuals.

The implementation objective is not to make Home generically prettier. It is to preserve the existing technical platform while making the first viewport and the full Home sequence visibly conform to the HealthTimes composition, editorial hierarchy, product identity, commercial model, responsive behavior and data-truth boundaries.

---

## 3. Owner Home-wireframe interpretation

The required phone hierarchy is:

1. safe area;
2. compact HealthTimes masthead with one Search icon;
3. editorial text tabs: For You / Latest / Zimbabwe / World / Premium;
4. dominant image-led Hero;
5. high-priority commercial inventory when filled;
6. Live Now only when real Live data qualifies;
7. Top Stories;
8. continued editorial modules;
9. fixed native bottom navigation: Home / Explore / Live / Watch / My HT.

The first viewport must communicate:

- HealthTimes identity;
- premium health journalism;
- editorial authority;
- native product quality.

It must not read as a dashboard, utility toolbar, stacked web-container demo, card showcase, or a wrapped responsive website.

The wireframe is authoritative for structure and hierarchy, not for illustrative prices, audience counts, advertisers or example copy.

---

## 4. Current-main visual audit

Current main already contains useful visual groundwork but materially misses the approved Home composition.

### What current main does now

Home currently:

- renders Home data from services.articles.getHome();
- sorts source articles by publishedAt for Latest-like ordering;
- reads services.reader.getPreferences();
- supports For You personalization from primaryEdition, followedCountries and followedTopics;
- renders a responsive HeroStory;
- invokes the current HOSPAZ direct placement after Hero;
- conditionally renders Live Now only when live data contains status=live;
- renders Top Stories, Latest, Features, Public Health, Research, Health Business, HIV/AIDS, Global Health, Watch, Premium, Opportunities, Edition and Further Coverage;
- uses real article accessPolicy for Premium;
- has no Most Read module because no legitimate ranking query authority exists;
- renders additional ad slots fail-closed, with unfilled slots collapsing to zero UI.

### Current visual defects

1. Home tabs are For You / Latest / dynamic Edition / World / Health rather than For You / Latest / Zimbabwe / World / Premium.
2. Tabs are Chip controls with bordered/pill-like styling rather than editorial text tabs with a restrained underline.
3. Phone masthead permanently exposes Edition, Search, Alerts and Premium text controls.
4. Search is a text action rather than one professional icon.
5. Top Stories uses the eyebrow EDITOR'S DESK although the data is derived from feed ordering, not a verified editor-curation workflow.
6. Home still relies heavily on generic StoryGrid / StoryList / Section / EmptyState patterns, flattening editorial rhythm.
7. Bottom-nav iconography is hand-built from View borders/shapes.
8. Generic bordered containers remain in areas such as opportunity cards and some media/commercial surfaces.
9. Most Read has no truthful runtime source and must not be fabricated.
10. Current non-HOSPAZ Home ad positions are architecturally present but normally return source=none in staging/source-parity.
11. HOSPAZ is represented by a campaign-specific placement key, hospaz-header-direct, which is valid current operational authority but not the desired permanent inventory architecture.

---

## 5. Accepted UI-head visual audit

The accepted UI reference head 4410001f7b4bf6fb7ae9a605378a4fabd1005fc4 is a technical and visual-reference input, not final visual authority.

Blob comparison shows:

- apps/mobile/app/(reader)/index.tsx is identical between accepted head and canonical main.
- apps/mobile/app/(reader)/_layout.tsx is identical.
- apps/mobile/src/theme/tokens.ts is identical.
- accepted Layout.tsx contains additional narrow-phone, focus and loading accessibility refinements not present on canonical main.
- accepted Cards.tsx contains additional media/accessibility and dark-mode Premium refinements not present on canonical main.
- accepted AppearanceProvider.tsx adds palette-aware Premium/success values.

Therefore the accepted head improves quality/certification details but preserves the same underlying Home visual defects: utility-heavy masthead, chip tabs, dynamic Edition + Health tabs, current Top Stories semantics and hand-built nav icons.

Accepted technical lineage must not be confused with Screen 1 visual acceptance.

---

## 6. PR #80 comparison

PR #80 exact head inspected: 6a28b59770b9c293f45c693583b58ffc1a35831a.

PR #80 restores/converges accepted UI quality changes onto current main. Relevant findings:

- Home index.tsx remains blob-identical to canonical main and accepted UI head.
- Reader _layout.tsx remains blob-identical.
- Layout.tsx changes narrow-phone wrapping, focus treatment, accessibility labels/hints and LoadingBlock semantics, but does not remove the permanent phone Edition/Search/Alerts/Premium utility model.
- Cards.tsx improves video behavior, media fallback, audio unavailable presentation and Premium badge palette handling, but does not change the Home structural contract.
- AppearanceProvider adds Premium/success palette support.
- The five commits after the supplied PR #80 handoff head modify only certification/harness files, so they do not alter this visual investigation.

PR #80 is therefore useful salvage/reference material for UI-WF-01A but must not be merged by UI-WF-00A.

---

## 7. What the existing product already does well

Preserve these foundations:

- canonical Reader ownership in apps/mobile;
- source-backed article service and migrated-corpus adapters;
- article fields for title, byline, publication date, geography, taxonomy, Hero media and accessPolicy;
- Premium body protection and explicit teaser authority;
- reader preference persistence;
- Edition persistence;
- responsive breakpoints and hydration-safe width handling;
- Hero media fallback without invented stock imagery;
- conditional Live rendering;
- real video/publication profile consumption;
- fail-closed advertising decisions;
- fail-closed HOSPAZ destination/schedule/placement-condition handling;
- ad impression/click event validation;
- accessibility labels on major story/media actions;
- five-destination Reader navigation and desktop suppression of mobile tab bar;
- dark-mode infrastructure;
- Saved/Offline foundations and reading-history persistence;
- current deep Home taxonomy sections where real data qualifies.

---

## 8. What the current product gets wrong visually

The central problem is composition, not missing backend capability.

- permanent utility controls compete with journalism above the fold;
- Home editorial navigation uses the wrong labels and wrong visual language;
- Hero does not yet sit inside a sufficiently publication-led first-viewport composition;
- sections are too uniformly componentized;
- Top Stories semantics overstate curation;
- ad inventory architecture exposes current advertiser naming in a permanent product placement;
- hand-built icons reduce native polish;
- tablet and desktop reuse responsive primitives but still require an explicit publication composition;
- current empty states can occupy visual attention where a module should simply collapse;
- Most Read has no ranking source and therefore cannot be truthfully rendered.

---

## 9. Home editorial navigation contract

The permanent Home tabs are exactly:

**For You | Latest | Zimbabwe | World | Premium**

Do not use National. Do not use Health. Do not use dynamic Edition as the third Home tab.

### For You

Data authority: services.reader.getPreferences() plus source-backed articles.

Use only:

- primaryEdition;
- followedCountries;
- followedTopics.

Do not invent behavioral personalization.

If preference matching yields no stories, use a truthful source-backed fallback to the available Home feed without claiming personalization confidence.

### Latest

Use published source-backed stories ordered by real publication chronology. Do not derive popularity from array position.

### Zimbabwe

Use verified story geography/taxonomy. Current source-parity geography inference includes explicit category handling plus Zimbabwe/place-name inference from source content. This is usable but not equivalent to a dedicated newsroom geography field; UI-WF-01A must consume existing geography truth and not add new guesses.

### World

Use verified global/international geography authority. Do not classify merely from presentation context.

### Premium

Use ArticleSummary.accessPolicy === premium.

The Premium tab remains visible even if no Premium article qualifies. If empty, route/present a truthful Premium proposition state rather than fabricated stories, prices, membership or entitlement.

### Visual treatment

- text tabs, not chips;
- no filled pill background;
- active tab uses text emphasis plus a 2px-equivalent underline;
- row minimum interactive height: 44px;
- phone type target: 13–14px semibold/bold;
- horizontal overflow scrolls without wrapping at narrow widths;
- selected state is announced to assistive technology;
- keyboard focus on Web/PWA is visible.

---

## 10. Masthead contract

### Phone

Required anatomy:

- safe area;
- one compact row;
- HealthTimes wordmark/identity left;
- Search icon right;
- no permanent Edition control;
- no permanent Alerts text control;
- no permanent Premium masthead button.

Recommended executable geometry:

- content row minimum height: 52–58px excluding OS safe area;
- horizontal gutter: existing 16px mobile token;
- Search interactive target: minimum 44x44;
- Search icon optical size: approximately 20–24px;
- no secondary utility row.

Search must retain accessibilityLabel equivalent to “Search HealthTimes”.

Notifications remain discoverable from My HealthTimes/contextual surfaces. Edition remains a first-class destination. Premium remains visible through the Premium Home tab, story badging, Premium section, article paywalls, My HealthTimes and Premium route.

### Tablet

Keep a restrained masthead. Do not duplicate a phone utility toolbar. Tablet may expose additional navigation only when it remains one coherent navigation model.

### Desktop/PWA

Use publication masthead + desktop navigation. Desktop may expose Search and selected utilities in a publication-appropriate manner, but must not duplicate mobile bottom navigation.

---

## 11. Hero contract

Hero is the dominant editorial object immediately below Home tabs.

### Data

Use only:

- real article title;
- real Hero media when available;
- real primary section;
- real author/date when displayed;
- real accessPolicy;
- real article route.

### Phone

- full content width inside the 16px Home gutter;
- media-led default;
- target image ratio approximately 4:3;
- headline overlays media when contrast can be made accessible;
- restrained dark scrim permitted for readability;
- headline target: roughly 28–34px depending on Dynamic Type and width;
- metadata is secondary;
- no heavy outer bordered card/shadow.

### No-image fallback

Render a deliberate text-led Hero on the publication surface. Do not invent media. Preserve the same typographic dominance and route behavior.

### Tablet

Use a wider Hero with image/text split or wide media composition; do not simply scale the phone card.

### Desktop

Use a publication lead-story composition, generally image + headline/standfirst column or equivalent editorial grid. Hero remains the primary visual weight.

---

## 12. Advertising inventory / business contract

HealthTimes owns inventory. Advertisers, campaigns, creatives and bookings are transient.

Define these stable commercial positions in the product contract:

| Inventory | Semantic target | Role |
| --- | --- | --- |
| HOME-A | reader.home.hero_after | premium high-prominence inventory near Hero |
| HOME-B | reader.home.early_feed | early-feed inventory around Live / Top Stories / Latest |
| HOME-C | reader.home.mid_feed | mid-feed inventory around Public Health / Research / Health Business |
| HOME-D | reader.home.media | media-adjacent inventory around Live / Watch |
| HOME-E | reader.home.deep_feed | deep-feed inventory around Further Coverage / Most Read |

These semantic names are future architecture only. UI-WF-00A does not rename current operational AdPlacementKey values.

### Filled placement

If services.advertising.getDecision() returns a verified active creative, render it with clear ADVERTISEMENT disclosure.

### Unfilled placement

If the decision is none or has no authorized creative:

- render nothing;
- consume zero blank ad space;
- show no placeholder;
- show no fake advertiser.

### Multiple campaigns

The Home system must support independent decisions per inventory position. Inventory definition does not require all positions to be filled.

### Trust

Advertising must be visually distinguishable from editorial journalism. Never style paid creative as a HealthTimes recommendation.

---

## 13. Current HOSPAZ compatibility mapping

Current verified staging authority is specific and must be preserved:

- current operational placement key: hospaz-header-direct;
- Home currently requests it immediately after Hero;
- staging migrated-corpus AdvertisingService handles only this placement specially;
- the service invokes ag05_hospaz_direct_ad_preview;
- projectCp5HospazCapability() projects returned direct-ad fields;
- directDecisionFromHospazCapability() requires the returned placement key to match the requested key and requires a creative;
- destination, schedule and placement conditions remain fail-closed and are never inferred;
- any unverified destination is omitted rather than invented;
- non-HOSPAZ positions currently delegate to source-parity advertising, which returns source=none.

Compatibility mapping:

**hospaz-header-direct → current operational realization of future HOME-A / reader.home.hero_after**

UI-WF-01A must keep the current paid HOSPAZ booking operational at that position unless a separately authorized advertising migration changes the placement authority. The Reader must not hard-code HOSPAZ branding into the permanent visual component.

No advertiser, dates, terms, pricing, creative or contract state may be invented.

---

## 14. Ad Manager operational requirements

A future/connected Ad Manager must control, outside Reader layout code:

### Placement inventory

- surface/page;
- semantic position;
- commercial tier;
- supported aspect ratios/dimensions;
- device variants;
- allowed creative formats.

### Campaign

- advertiser;
- campaign identity;
- active dates when authoritative;
- status;
- assigned inventory;
- priority;
- booking/order reference where authority exists.

### Creative

- approved media;
- mobile/tablet/desktop variants;
- verified destination;
- disclosure;
- accessibility text;
- approval state.

### Delivery

- placement allocation;
- schedule;
- permitted geography/edition constraints;
- device class;
- rotation/priority;
- frequency rules where supported.

### Reporting

- impressions;
- clicks;
- delivery;
- campaign performance;
- placement performance.

Pricing and rate cards are not Reader concerns and must not be hard-coded in apps/mobile.

---

## 15. Live conditional-module contract

Live remains part of Home product design.

Data authority: services.live.list().

Current migrated/source-parity service exposes no Live records because migratedCorpusServices inherits sourceParityServices.live, which returns an empty list.

Rules:

- when one or more real qualifying items have status=live, show Live Now automatically;
- when no real Live item exists, render nothing and consume zero Home space;
- do not invent streams, programmes, hosts, viewer counts, events or titles;
- the module must activate without a visual redesign when service data becomes available.

Phone: horizontal rail following HOME-A when present.  
Tablet: wider rail or compatible side-by-side commercial composition if it improves clarity.  
Desktop: editorial media rail/column integrated into publication grid.

---

## 16. Most Read conditional-module contract

Most Read remains an approved Home module but is currently not renderable truthfully.

Current analytics authority provides AnalyticsService.track(event) only. Public event names include article_view and completion milestones, but the fixture/staging analytics adapter validates event shape and intentionally emits no production analytics provider stream. There is no Reader ranking/query service and no verified ranking window.

Therefore:

- current UI-WF-01A must not fabricate Most Read;
- no date-order, array-order or manual popularity proxy is allowed;
- no invented view counts;
- the module collapses to zero space until a verified ranking authority exists;
- suggested activation threshold: at least 3 unique currently published ranked stories, unless the future analytics authority defines a stronger legitimate rule;
- ranking window must come from that authority, not this visual contract.

---

## 17. Top Stories truth / semantics

Current Top Stories is derived from the selected Home feed after Hero, not from a verified editor-curation service.

Therefore:

- keep the user-facing label Top Stories;
- remove/stop using the eyebrow EDITOR'S DESK unless a real newsroom curation authority is later introduced;
- use compact editorial rows;
- on phone, favor scan density with thumbnail + section + headline + restrained metadata;
- do not imply editor selection, ranking or popularity that is not present in the source.

---

## 18. Home deep-feed hierarchy

Preserve this overall sequence, allowing only small responsive rhythm changes:

1. Home tabs
2. Hero
3. HOME-A when filled
4. Live Now when real
5. Top Stories
6. HOME-B when filled
7. Latest
8. Features
9. Public Health
10. Research
11. HOME-C when filled
12. Health Business
13. HIV/AIDS
14. Global Health
15. Watch
16. HOME-D when filled
17. Premium
18. Opportunities
19. Edition
20. Further Coverage
21. Most Read when real ranking authority qualifies
22. HOME-E when filled

Deduplicate aggressively across the immediate sequence. A story consumed by Hero should not immediately reappear in Top Stories/Latest. Top Stories consumed stories should be skipped by the next adjacent module where sufficient alternatives exist.

Latest remains semantically Latest; it is never a replacement label for an empty ad slot.

---

## 19. Bottom-navigation contract

Exactly five permanent mobile/tablet Reader destinations:

1. Home
2. Explore
3. Live
4. Watch
5. My HT

Do not rename My HT to More.

Phone/tablet bottom navigation:

- fixed;
- respects bottom safe area;
- content height target approximately 56–66px plus safe-area inset;
- each destination has minimum 44px interaction target;
- active state uses brand color plus coherent active icon treatment;
- inactive state uses muted ink with sufficient contrast.

Desktop/PWA at desktop breakpoint must not show mobile bottom navigation.

---

## 20. Iconography contract

Current nav icons are hand-constructed with View borders/shapes. Classify this as a visual-quality defect.

UI-WF-01A must use one coherent Expo-compatible vector icon family, subject to repository/package review.

Requirements:

- consistent stroke language;
- active/inactive state;
- optical sizing approximately 20–24px;
- aligned baselines;
- accessible labels;
- no emoji icons;
- no mixed unrelated icon families.

UI-WF-00A does not add a package dependency.

---

## 21. Real-data mapping

| Module | Authority | Fields | Current availability | Empty behavior | Limitation |
| --- | --- | --- | --- | --- | --- |
| Hero / Home feed | services.articles.getHome() | id, title, section, author, publishedAt, heroMedia, geography, topics, accessPolicy | available in migrated/source-backed modes | text-led Hero or no Hero if feed empty | presentation feed is not explicit newsroom curation |
| For You | services.reader.getPreferences() + Home articles | primaryEdition, followedCountries, followedTopics | available | source-backed Home fallback | no behavioral personalization authority |
| Latest | Home articles | publishedAt | available | collapse if no stories | depends on source date quality |
| Zimbabwe | ArticleSummary.geography / source mapping | geography name/slug | available but partly inferred in source-parity mapping | truthful empty state/zero results | geography inference is not a dedicated editorial geography service |
| World | ArticleSummary.geography | global/international geography | available | truthful empty | same mapping limitation |
| Premium tab/section | ArticleSummary.accessPolicy | public/premium | available | Premium proposition destination | no invented products/prices |
| Live Now | services.live.list() | status, title, media, updateCount | currently empty in migrated/source-parity | zero space | no current real Live feed |
| Watch | services.video.list() | title, sourceUrl, thumbnail, duration, publishedAt | source-backed video records available | concise unavailable/empty state | some provider thumbnail URLs may be unverified |
| Opportunities | services.publication.getProfile() sourceLinks | key, label, url | available where source links qualify | collapse | not editorial story content |
| Current HOSPAZ | services.advertising.getDecision(hospaz-header-direct) | AdDecision + CP5 capability | staging capability path exists | zero space/fail closed | advertiser-specific operational key |
| Other Home ads | services.advertising.getDecision(other key) | AdDecision | normally source=none | zero space | no general Ad Manager allocation yet |
| Most Read | no ranking query authority | none | unavailable | zero space | AnalyticsService is track-only |
| Edition section | reader preferences + geography-filtered Home stories | primaryEdition, geography | available | truthful edition-empty state | current feed may not contain enough edition-specific stories |

---

## 22. Loading / empty / partial / error / offline states

### Loading

Use restrained skeletons/progress semantics. Do not render fake article copy.

### Empty Home feed

Show a publication-quality unavailable state with retry/explore action where appropriate. Do not fabricate stories.

### Partial data

Render valid modules independently. Missing Live, Most Read or advertising must not block valid journalism.

### Error

Use concise reader-facing language, preserve retry when technically safe, and avoid internal service/authority terminology.

### Offline

Preserve offline-capable saved content foundations. Home may show a concise offline state rather than stale/fabricated current-news claims.

### Premium locked

Show only authorized preview/teaser and route to Premium/sign-in. Never expose full protected body.

### Advertising unfilled

Render nothing and consume zero layout height.

### Live unavailable

Render nothing on Home.

### Most Read unavailable

Render nothing on Home.

### Image unavailable

Use the intentional text-led Hero/story fallback; do not substitute stock imagery.

---

## 23. Accessibility requirements

UI-WF-01A must integrate accessibility during construction.

Minimum requirements:

- VoiceOver and TalkBack labels for icon-only controls;
- semantic links/buttons;
- selected state for Home tabs and bottom navigation;
- meaningful heading hierarchy;
- minimum approximately 44px interaction targets;
- keyboard navigation and visible focus for Web/PWA;
- accessible contrast in light and dark mode;
- Dynamic Type/system text scaling without clipping;
- reduced-motion respect;
- image alt text from authoritative media metadata where available;
- ad disclosure exposed to assistive technology;
- Search icon label “Search HealthTimes” or equivalent;
- no critical meaning communicated by color alone.

---

## 24. Phone composition

Target reference: 390x844 plus supported native phones.

### Geometry

- safe-area top: platform managed;
- masthead: 52–58px excluding safe area;
- Home gutter: 16px;
- editorial tabs: minimum 44px interaction height, horizontally scrollable;
- active underline: ~2px;
- Hero: full available content width; ~4:3 media on phone;
- Hero headline: ~28–34px with scalable line height;
- section spacing: based on existing 40px section token, reduced only where tighter editorial continuity is intentional;
- compact Top Stories rows: approximately 96–116px media width when media exists;
- bottom nav: ~56–66px plus bottom safe area;
- bottom content inset must prevent obscuration by nav.

### First viewport target

At 390x844, the reader should see the brand, tabs and a substantial Hero immediately. Utility chrome must not consume a second row.

### Dark mode

Use palette-aware surfaces/text, no hard-coded white text except when intentionally over dark media/scrim, and palette-aware Premium identity.

### Dynamic text

At larger text sizes, masthead must preserve Search access and brand identity; tabs may horizontally scroll; Hero headline may take additional lines rather than clip essential meaning.

---

## 25. Tablet composition

Target: 834x1112, including iPad and Android tablet.

Rules:

- preserve the Home hierarchy;
- use 24px tablet gutter;
- do not merely enlarge phone components;
- Hero may use a wider image/text split;
- story modules may use two columns where scan quality improves;
- Live can expose more items;
- commercial inventory may sit beside compatible editorial/media modules only when disclosure and reading order remain clear;
- keep one coherent navigation system;
- retain My HT brand destination;
- preserve touch targets and native safe areas.

If Live and commercial inventory are simultaneously available, a side-by-side arrangement is allowed only where it improves hierarchy and commercial value without making advertising visually dominant.

---

## 26. Desktop / PWA composition

Target: 1440x1000.

Use existing desktop breakpoint 1100 and maximum content width 1180 as starting technical constraints.

Desktop must be a genuine publication layout:

- publication masthead;
- coherent desktop navigation;
- no mobile bottom tab bar;
- Hero expanded into a lead-story grid;
- Top Stories / Latest use editorial columns rather than one stretched feed;
- strategic ad inventory adapts to wide units or compatible column placements;
- Live / Watch may become rails or media columns;
- Premium remains visible but not banner-heavy;
- deep feed groups sections with varied rhythm;
- content remains centered with approximately 32px desktop outer gutter and max content width 1180.

Do not stretch a phone feed to 1440px and do not duplicate navigation systems.

---

## 27. Permanent / conditional / commercial classification

### Permanent product controls

- masthead;
- Search;
- Home editorial tab row;
- Premium Home tab;
- bottom navigation on phone/tablet;
- My HT;
- desktop publication navigation.

### Conditional real-data modules

- Live Now;
- Most Read;
- any future module whose meaning depends on unavailable real source truth.

### Commercial inventory

- HOME-A;
- HOME-B;
- HOME-C;
- HOME-D;
- HOME-E.

Inventory positions exist in the product contract even when no campaign is filled. Unfilled positions render nothing.

---

## 28. Preserve / Remove / Modify / Introduce / Conditional analysis

### PRESERVE

- apps/mobile canonical ownership — protects one Reader implementation.
- article service/source integration — real data already exists.
- Premium security/teaser authority — visual work must not weaken protected content.
- reader preferences — required for For You.
- Edition persistence — remains first-class even though it leaves the permanent phone masthead.
- advertising decision authority — fail-closed behavior is correct.
- analytics event validation — preserves privacy/truth boundaries.
- Saved/Offline foundations.
- five-destination nav identities.
- valid deep Home taxonomy sections.
- Hero real-media/text fallback behavior.

### REMOVE / STOP USING

- permanent phone Edition utility control — too much first-viewport chrome.
- permanent phone Alerts text control — notifications move to contextual/My HT access.
- permanent phone Premium masthead button — Premium stays prominent through editorial/product surfaces.
- phone Search text button — replace with professional icon.
- chip/pill treatment for Home editorial navigation.
- hand-built View-based nav icons.
- unnecessary generic bordered containers.
- EDITOR'S DESK claim without curation authority.
- Health as a Home tab.
- dynamic Edition as the third Home tab.

### MODIFY

- AppHeader — compact, publication-led shell.
- Reader shell responsive navigation.
- Home filter model — Zimbabwe and Premium.
- Hero presentation — stronger editorial dominance.
- StoryList — denser Top Stories composition.
- StoryGrid/section rhythm — reduce repeated component feel.
- LiveRail — integrate into hierarchy and responsive layouts.
- AdSlot usage — map positions to HealthTimes-owned inventory.
- bottom-navigation styling.
- responsive tablet/desktop composition.
- section deduplication behavior.

### INTRODUCE

- professional vector icon family.
- editorial tab primitive.
- explicit Home commercial inventory map.
- responsive inventory presentation rules.
- reusable conditional-module rule.
- stronger Home Hero visual primitive where needed.
- visual acceptance evidence matrix.

### CONDITIONAL / DEFER

- Most Read visibility until ranking authority exists.
- Live visibility until real items exist.
- unbooked advertising.
- new Ad Manager/runtime allocation schema.
- new analytics ranking API.
- backend schema changes.
- pricing/rate-card behavior.

---

## 29. Allowed deviations

Allowed inside the approved composition:

- improved typography and line length;
- refined media crop;
- subtle scrims for readability;
- professional iconography;
- accessibility improvements;
- better spacing/rhythm;
- responsive tablet/desktop expansion;
- restrained motion/transitions;
- professional advertiser-neutral creative framing.

A low-resolution wireframe does not require literal shadow/border reproduction.

---

## 30. Forbidden deviations

Do not:

- restore large persistent utility chrome;
- make Home tabs pills;
- turn every section into a bordered card;
- create dashboard styling;
- visually disguise advertisements as editorial;
- hard-code HOSPAZ as permanent product branding;
- invent advertisers/campaigns/prices/terms/creatives;
- use decorative AI-neon or glassmorphism;
- add a sixth bottom tab;
- rename My HT to More;
- remove Zimbabwe;
- restore Health as a Home tab;
- remove Premium from Home tabs;
- fabricate Live/Most Read/full modules for screenshot completeness;
- weaken Premium entitlement/security;
- add backend changes under UI-WF-01A without separate authority.

---

## 31. UI-WF-01A implementation file map

### Shared-shell changes

Likely:

- apps/mobile/src/ui/Layout.tsx
- apps/mobile/app/(reader)/_layout.tsx
- apps/mobile/src/theme/tokens.ts
- apps/mobile/src/theme/AppearanceProvider.tsx only where palette support is justified

Responsibilities:

- compact masthead;
- desktop publication nav;
- editorial tab primitive or shared primitive support;
- vector icon integration;
- responsive shell;
- focus/accessibility.

### Home-only changes

Likely:

- apps/mobile/app/(reader)/index.tsx
- apps/mobile/src/ui/Cards.tsx

Responsibilities:

- exact tab labels/data behavior;
- Hero composition;
- Top Stories semantics;
- deduplication;
- section rhythm;
- conditional module placement;
- Home ad inventory usage.

### Advertising-system future work

Do not include unless separately authorized:

- domain placement-key migration;
- Ad Manager allocation;
- campaign schema/config;
- pricing/rate cards;
- HOSPAZ booking mutation.

### Analytics / Most Read future work

Do not include unless separately authorized:

- ranking query service;
- aggregation pipeline;
- ranking windows;
- view-count exposure.

Scope must stay smallest-change: shared shell + Home visual reconstruction only.

---

## 32. Visual evidence requirements

UI-WF-01A must return exact-head rendered evidence arranged as:

**REFERENCE WIREFRAME | CURRENT CANONICAL MAIN | CANDIDATE iOS PHONE | CANDIDATE ANDROID PHONE | CANDIDATE TABLET | CANDIDATE DESKTOP/PWA**

Minimum captures:

### Web/PWA

- 390x844
- 834x1112
- 1440x1000

### Native

- iPhone
- Android phone
- iPad
- Android tablet

Where applicable:

- light mode;
- dark mode;
- loading;
- empty;
- offline;
- Premium locked;
- ad filled;
- ad unfilled;
- Live available;
- Live unavailable;
- Most Read available only when a real ranking authority is supplied;
- Most Read unavailable.

Every evidence receipt must record exact executable SHA and environment/deployment identity.

---

## 33. Acceptance checklist

The moderator/owner must be able to answer YES to all applicable items:

- Does the first viewport visibly resemble the approved Home composition?
- Is HealthTimes immediately recognizable?
- Is journalism more dominant than utility chrome?
- Is the phone masthead compact?
- Is Search icon-only, accessible and discoverable?
- Are tabs exactly For You / Latest / Zimbabwe / World / Premium?
- Are tabs editorial text tabs with a restrained active indicator?
- Is Hero visually dominant and source-backed?
- Does no-image Hero remain intentional without fabricated imagery?
- Is HOSPAZ still honored through current paid-placement authority?
- Is the architecture advertiser-neutral beyond the current HOSPAZ compatibility key?
- Do unfilled ad positions consume zero space?
- Does Live appear automatically only with real data?
- Does absent Live consume zero space?
- Is Most Read retained in the product contract but absent without ranking authority?
- Does Top Stories avoid false editor-curation claims?
- Are repeated generic bordered containers substantially reduced?
- Are bottom-nav icons professional and coherent?
- Is My HT retained?
- Does tablet use its width deliberately?
- Does desktop look like a publication rather than stretched mobile?
- Does desktop omit mobile bottom navigation?
- Are light/dark states accessible?
- Do dynamic text and keyboard/focus states remain usable?
- Is every visible article, ad, Live item, ranking and commercial fact truthful?

Passing tests alone is not visual acceptance.

---

## 34. Known unresolved data limitations

1. **Most Read:** no ranking query/service exists in current Reader authority.
2. **Analytics provider:** current public AnalyticsService is track-only; fixture implementation validates and intentionally emits no production provider stream.
3. **Live:** migrated/source-parity service currently returns no real Live items.
4. **General Home advertising:** only HOSPAZ has a current staging direct-ad capability path; other Home placements normally fail closed.
5. **HOSPAZ placement naming:** hospaz-header-direct is operationally valid but campaign-specific; semantic inventory migration needs separate authority.
6. **Zimbabwe geography:** source-parity geography is partly inferred from source taxonomy/text; UI must consume existing geography truth rather than add new guesses.
7. **Top Stories:** no explicit editor-curation authority was found; current semantics are ordered feed selection.
8. **Wireframe business facts:** example prices, ad details and counts are illustrative and must not become runtime truth.

None of these limitations requires product-code or backend mutation to complete UI-WF-00A.

---

# Comparative audit

| Element | Owner wireframe | Current main | Accepted UI 4410001f | Current PR #80 | Final UI-WF-00A contract | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Masthead | compact identity + Search | brand + Edition + Search + Alerts + Premium | same model with quality refinements | same model with narrow-phone/accessibility refinements | compact identity + one Search icon on phone | MODIFY |
| Search | icon | text button | text button | text button | professional icon, 44px target | MODIFY |
| Edition access | capability retained, not dominant | permanent masthead control | same | same | My HT/context/Edition route, not permanent phone masthead | MODIFY |
| Notifications | capability retained | Alerts text control | same | same | My HT/contextual discovery | MODIFY |
| Premium access | permanent Home tab + product surfaces | masthead button + section | same | same | Home tab + badges + section + paywall + My HT | MODIFY |
| Editorial tabs | text tabs | Chip controls | Chip controls | Chip controls | editorial text + underline | MODIFY |
| Zimbabwe | required | absent as fixed tab | absent | absent | fixed third tab | INTRODUCE |
| Hero | dominant image-led | responsive HeroStory | same core | same core | stronger first-viewport editorial Hero | MODIFY |
| Advertising | advertiser-neutral inventory | several placement keys; HOSPAZ direct key | same | same | HOME-A..E semantic inventory; keep HOSPAZ compatibility | MODIFY |
| Live | conditional | conditional live list | same | same | automatic real-data module, zero-space absent | KEEP |
| Top Stories | compact rows | compact list + EDITOR'S DESK | same | same | compact list, no false curation eyebrow | MODIFY |
| Latest | real chronology | publishedAt ordering but may repeat adjacent stories | same | same | chronological + sequence dedup | MODIFY |
| Most Read | conditional approved module | absent | absent | absent | retain contract, zero-space until ranking authority | CONDITIONAL |
| Story-card language | editorial | generic reusable patterns | similar | media refinements | varied editorial density by module | MODIFY |
| Generic containers | restrained | repeated shared bordered patterns | similar | similar | reduce nonessential containers | MODIFY |
| Bottom navigation | 5 destinations | 5 destinations | 5 destinations | 5 destinations | same labels, improved visual system | KEEP/MODIFY |
| My HT | required | My HT label | same | same | retain exactly | KEEP |
| Icon quality | professional | View-shape icons | same | same | coherent vector family | INTRODUCE |
| Spacing | compact editorial rhythm | token-consistent but generic | similar | minor quality refinements | module-specific editorial rhythm | MODIFY |
| Mobile adaptation | native publication | functional responsive shell | improved narrow-phone behavior | improved narrow-phone behavior | wireframe-faithful composition | MODIFY |
| Tablet adaptation | uses width deliberately | responsive primitives | similar | similar | explicit tablet composition | MODIFY |
| Desktop adaptation | publication layout | desktop nav + responsive content | similar | similar | genuine publication grid, no bottom nav | MODIFY |

---

# Contract conclusion

UI-WF-00A finds no need to rebuild the working backend. The existing Reader already has the technical primitives required for the Home reconstruction: source-backed articles, preferences, geography/taxonomy, Premium access policy, responsive layout, conditional Live, advertising decisions, HOSPAZ provenance, media and Reader navigation.

UI-WF-01A should therefore be a bounded visual reconstruction of Home + shared Reader shell, not a platform rewrite.

The key transformation is:

**utility-heavy generic shell → compact HealthTimes publication shell**  
**chip filters → editorial Home tabs**  
**campaign-shaped ad placement → HealthTimes-owned inventory model while preserving current HOSPAZ booking**  
**generic repeated sections → deliberate editorial rhythm**  
**technical conformance only → exact-head visual conformance**

This specialist does not issue ACCEPT. Return to the HealthTimes UI Moderator for independent disposition.
