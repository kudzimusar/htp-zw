# NM-04 — Phase 12 Product Visual Audit

**Repository:** `kudzimusar/htp-zw`  
**Canonical Reader:** `apps/mobile`  
**Executable runtime audited:** `f36d6336c65c598191ea2841952a8c9f18bcf57e`  
**Phase 12 documentation closure used for reporting:** `3ace38e48e8f4fc2acb014c1c9e08acab03a8bba`  
**Audit branch:** `docs/nm04-phase12-product-visual-audit`  
**Application code changed:** **NO**  
**Production systems modified:** **NO**

## 1. Audit disposition

Phase 12 dual-UI/convergence recovery remains closed. This audit reviews only the canonical `apps/mobile` Reader across the evidence that exists for the exact certified executable runtime.

This is not a redesign and does not reopen the retired root Reader.

The product is materially implemented. The audit does **not** classify HealthTimes as “not built”. The current product already has a coherent publication shell, real migrated stories, Watch content, Premium structure, My HealthTimes, Saved/Offline, Edition, Search, Explore and first-class Live/Listen routes.

The strongest findings are instead:

1. native runtime divergence on the exact Phase 12 build;
2. a long, section-heavy Home architecture that risks becoming repetitive below the fold;
3. multiple secondary surfaces that are technically real but visually dominated by empty/unavailable states;
4. incomplete native/tablet screenshot coverage, which prevents an honest full cross-platform visual certification;
5. some reader-facing surfaces still expose implementation or staging language that reads more like engineering diagnostics than a finished publication.

## 2. Evidence used

All screenshot evidence below corresponds to executable SHA:

`f36d6336c65c598191ea2841952a8c9f18bcf57e`

### Exact-runtime workflow evidence

- **Phase 10 Candidate Visual Conformance** — run `35949140627` — SUCCESS
  - Web/PWA screenshots artifact: `phase10-candidate-web-pwa-screenshots`
  - Artifact ID: `10787428883`
  - iOS screenshots artifact: `phase10-candidate-ios-screenshots`
  - Artifact ID: `10788677718`
  - Android screenshots artifact: `phase10-candidate-android-screenshots`
  - Artifact ID: `10788651920`
- **Phase 10 Web/PWA Evidence** — run `35949140654` — SUCCESS
  - Final Web/PWA screenshot artifact: `phase10-final-web-pwa-screenshots`
  - Artifact ID: `10787614511`
- **Chromium UAT — Canonical Reader** — run `35949140664` — SUCCESS
  - Artifact: `phase12-canonical-reader-uat`
  - Artifact ID: `10788536112`
- **Native Binary Certification** — run `35949140673` — SUCCESS
  - Android APK artifact ID: `10787923545`
  - iOS Simulator app artifact ID: `10788351624`

Artifact names retain older “phase10” wording, but their recorded `head_sha` is the Phase 12 executable runtime above.

## 3. Execution environments

### PWA

Exact screenshot viewport matrix:

- Desktop: `1440 × 1000`
- Tablet: `834 × 1112`
- Mobile: `390 × 844`

Browser evidence used Chromium `140.0.7339.16` via Playwright build `v1187`.

The final screenshot manifest records HTTP 200 for the captured Reader routes and zero hydration-regeneration warnings.

### iOS

Available exact-runtime native evidence:

- Xcode: `26.6`
- iPhone Simulator SDK: `26.5`
- Simulator device: **iPhone 17 Pro**
- Captured app: `HealthTimesStaging.app`
- Bundle: `zw.co.healthtimes.app.staging`
- Screenshot size: `1206 × 2622`

**Missing environment:** no iPad-sized Phase 12 native screenshot run exists in the available evidence. This audit does not fabricate iPad results.

### Android

Available exact-runtime native evidence:

- Android Emulator system image: `android-35;google_apis;x86_64`
- AVD name: `phase10candidate`
- Screenshot size: `320 × 640`
- Captured staging package: `zw.co.healthtimes.app.staging`

The workflow does not record a reliable named hardware profile beyond the AVD/system image, so this report does not invent one.

**Missing environment:** no Android-tablet Phase 12 screenshot run exists in the available evidence.

## 4. Evidence coverage matrix

| Surface | PWA desktop/mobile/tablet | iPhone | Android phone | iPad | Android tablet |
| --- | --- | --- | --- | --- | --- |
| Home | Captured | Captured, fails | Captured, remains loading | Not captured | Not captured |
| Explore | Captured | Not captured | Not captured | Not captured | Not captured |
| Search | Captured | Not captured | Not captured | Not captured | Not captured |
| Article | Captured too early; loading only | Not captured | Not captured | Not captured | Not captured |
| Live | Captured | Not captured | Not captured | Not captured | Not captured |
| Watch | Captured | Capture obstructed by system deep-link prompt | Captured | Not captured | Not captured |
| Listen | Captured | Not captured | Not captured | Not captured | Not captured |
| Premium | Captured | Capture obstructed by system deep-link prompt; Home error remains behind prompt | Captured | Not captured | Not captured |
| My HealthTimes | Captured | Not captured | Not captured | Not captured | Not captured |
| Saved / offline | Captured | Not captured | Not captured | Not captured | Not captured |
| Edition | Captured | Not captured | Not captured | Not captured | Not captured |
| Account/member access | Implemented; no final visual artifact in screenshot matrix | Not captured | Not captured | Not captured | Not captured |
| Dark mode | Not captured | Not captured | Not captured | Not captured | Not captured |
| Loading state | Captured | Error state captured | Captured | Not captured | Not captured |
| Empty state | Multiple captured | Not captured | Watch/Premium partly | Not captured | Not captured |
| Network/failure | PWA shell contract tested; no dedicated visual screenshot | SecureStore failure captured | No dedicated failure capture | Not captured | Not captured |

The missing cells are evidence gaps, not inferred failures.

## 5. Home visual audit

### What is working

The upper Home presentation is recognizably publication-like rather than a component catalogue.

Desktop has:

- a clear HealthTimes masthead;
- edition control;
- primary navigation;
- Search / Alerts / Premium utility actions;
- editorial filter chips;
- a dominant image-led hero;
- category and Premium context;
- strong headline scale;
- standfirst/byline/date hierarchy;
- Top Stories beginning immediately below the hero/ad area.

Mobile preserves the same editorial identity rather than collapsing into a generic app dashboard. The hero image and headline remain dominant, and the bottom navigation establishes a consistent native/PWA product vocabulary.

The HOSPAZ direct creative is visually bounded beneath the hero on desktop and does not overpower the headline. Its destination remains fail-closed and non-clickable when authority is unknown.

### Structural concern

The Home implementation contains, in order:

- hero;
- HOSPAZ;
- Live;
- another ad placement;
- Top Stories;
- Latest;
- Features;
- Public Health;
- Research & Findings;
- Health Financing & Health Business;
- HIV/AIDS;
- Global Health;
- Watch;
- Premium Intelligence;
- another ad placement;
- Opportunities;
- Edition;
- Further Coverage;
- Most Read placeholder;
- another ad placement.

That is a substantial editorial sequence. It is real implementation, but its current structure creates a **P2 risk of excessive feed length and repeated StoryGrid rhythm** once most sections are populated.

The existing screenshot mechanism captures the upper internal ScrollView viewport rather than a reliable entire Home journey, so the lower-page visual rhythm cannot be declared good or bad from screenshots alone. The structural repetition is nevertheless present in the executable Reader.

### Header observations

- Desktop header is coherent and publication-like.
- Mobile utility actions consume a significant amount of vertical space before content on every surface.
- The persistent staging environment banner further increases chrome height.
- Tablet combines top utility actions with bottom tabs, which is functional but visually redundant.

**Finding:** P3 — mobile/tablet chrome is heavier than the editorial content warrants.

## 6. Article Reader audit

The Phase 12 visual artifact is **not sufficient for a visual Article judgment**.

The candidate/final PWA screenshots were captured only about 1.2 seconds after navigation and show the Article loading skeleton at mobile, tablet and desktop sizes.

Separately, canonical Chromium UAT at the same exact runtime proves that:

- a recent migrated story renders;
- an older migrated story renders;
- Save is present;
- Download/offline is present;
- Listen is present;
- Share is present;
- Original publication information is present;
- the Premium migrated story remains protected;
- Premium body content is not publicly exposed.

That is functional evidence, not visual evidence.

Therefore headline hierarchy, body line length, long-story rhythm, inline media, related-reading presentation, bottom-of-story experience and desktop article width remain **visually unverified** in this audit.

**Finding:** P2 — Article visual review is blocked by inadequate screenshot timing/coverage even though functional UAT is green.

This should be corrected in the next evidence run before a Reader redesign task is scoped.

## 7. Explore

Explore is structurally clean and readable, but the current source state leaves large portions of the screen as:

- “No countries available”;
- “No regions available”;
- “No editorial desks available”;
- sparse topic/category content.

The route is real and usable, but visually it currently communicates data absence more strongly than discovery.

**Finding:** P2 — Explore is technically implemented but visually under-populated and does not yet feel like a rich discovery destination.

## 8. Search

Search has a clear title, input, action button and media-type filters. Desktop spacing is calm, and mobile remains readable.

The initial state is dominated by “No article results” until the reader searches. That is truthful, but visually sparse.

**Finding:** P3 — preserve the search structure; refine initial/discovery affordances later without inventing results.

## 9. Live

Live has a clear first-class route and dedicated identity, including:

- Live Now;
- Live Blog;
- Upcoming;
- an explicit “Live is a first-class format” explanation.

At the captured runtime there is no active coverage. The page therefore becomes a large empty state with only a small explanatory accent block.

**Finding:** P2 — Live is technically first-class but visually underdeveloped when no event is active.

## 10. Watch

Watch is the strongest media surface in the current visual evidence.

It has:

- clear route identity;
- format filters;
- a large featured video;
- real HealthTimes imagery;
- duration and play treatment;
- supporting metadata;
- additional video cards below.

The design reads as a publication media destination rather than a placeholder.

On mobile the featured video remains usable and appropriately prominent.

**Finding:** KEEP, with P3 refinement later for density, related-article context and native ergonomics after broader native evidence exists.

## 11. Listen

Listen has coherent route identity and filter structure, but no verified audio is available in the captured source state.

The page is dominated by:

- “No featured audio”;
- “No audio yet”.

The surface is honest, but it does not currently feel like a mature publication format.

**Finding:** P2 — technically implemented, visually underdeveloped because there is no media corpus to demonstrate the player/product hierarchy.

Do not invent audio URLs to solve this.

## 12. Premium

### Strengths

The Premium landing hero is one of the clearest visual propositions in the app:

> Deeper health intelligence. Full reporting. One clear membership.

The hierarchy is strong on desktop, tablet and mobile.

Premium also visibly includes:

- member-status area;
- existing-member access;
- Premium story section;
- membership options section;
- restore purchase path;
- sign-in path;
- benefits.

No fabricated price or trial appears.

### Weakness

At the exact runtime:

- no store membership offers are available;
- no Premium stories are visible in the captured landing state;
- the membership section therefore becomes another truthful unavailable state.

The page is secure and honest, but the gap between a strong hero and multiple unavailable states makes the commercial product feel unfinished.

**Finding:** P2 — Premium is functionally structured and visually credible at the top, but the offer/content state materially weakens the product impression.

## 13. Advertising and HOSPAZ

### HOSPAZ

The desktop HOSPAZ placement is directly evidenced beneath the hero.

Positive:

- clearly labeled `ADVERTISEMENT`;
- clearly labeled `Direct advertising · HOSPAZ`;
- creative is visually contained;
- editorial hero remains more dominant;
- unknown destination remains non-clickable.

The explanatory copy:

> Provenance-backed direct placement. Destination, schedule, placement conditions remain unverified and are not inferred.

is accurate but reads as implementation/governance language rather than reader-facing advertising language.

**Finding:** P3 — preserve fail-closed click behavior; refine disclosure copy only in a later growth/advertising task.

### Other advertising

The Home source contains repeated ad slots after Live, around Watch and deep in the feed. Most are unconfigured and therefore do not render visible fake content.

This is correct behavior, but once providers are activated the number and rhythm of placements should be visually reviewed against populated editorial sections.

**Finding:** P3 — advertising density is not currently visually harmful, but the configured placement count creates future feed-rhythm risk.

## 14. My HealthTimes

My HealthTimes is structurally mature.

It has:

- reader identity;
- membership;
- account;
- country/topic interests;
- subscription entry;
- privacy;
- Saved;
- Downloads;
- Reading history;
- Notifications;
- appearance/settings paths;
- publication/institutional information;
- Studio entry.

The page reads more like a real account/settings product than a placeholder.

However, several labels and supporting explanations still feel operational or engineering-oriented, especially around security, sessions, system state and the Studio boundary.

The Studio card itself is appropriately separated and should not be redesigned in this lane.

**Finding:** P3 — keep the information architecture but refine reader-facing language and grouping in a dedicated Reader settings task.

## 15. Saved / Offline

Saved & Offline clearly separates:

- saved articles;
- offline content;
- recent reads;
- article/video/audio/offline/history tabs.

That semantic separation is valuable and should remain.

At the captured state every count is zero, so the product appears sparse.

The “Reader storage boundary” explanation is useful for development but is not ideal reader-facing language.

**Finding:** P3 — keep the state model; refine copy and populated-state presentation later.

## 16. Edition

Edition is visually straightforward and understandable:

- edition search;
- primary edition;
- followed countries/regions;
- content preferences.

The statement separating edition from billing country is accurate but feels policy/system-oriented in the primary Reader flow.

**Finding:** P3 — keep the workflow, refine explanatory language later.

## 17. Account/member access

The account-access implementation contains real sign-in, registration, password recovery and reset states, with accessible fields and validation.

However, the screenshot matrix does not contain a dedicated final account-access capture.

The current explanatory copy includes:

> Reader identity is not Studio authority

and other capability-language that is correct but reads as engineering/security architecture rather than consumer identity messaging.

**Finding:** P3 — functional structure is credible; language needs later consumer-product refinement.

## 18. Dark mode

Dark mode is implemented through the Appearance surface, with System / Light / Dark states.

No Phase 12 screenshot artifact demonstrates the actual Reader in dark mode.

**Finding:** evidence gap — do not certify dark-mode visual quality from implementation alone.

A later visual task should capture Home, Article, Premium, Watch and My HealthTimes in dark mode on at least PWA and one native phone.

## 19. Loading, empty and failure states

### Loading

The loading block is clean and understandable.

However, exact-runtime Android Home remained at “Loading Home…” after the workflow deliberately waited **20 seconds** before capture.

**Finding:** **P1 — Android core Home journey did not resolve in the exact-runtime emulator evidence.**

This is not classified as styling.

### iOS failure

The exact-runtime iPhone 17 Pro screenshot shows Home failing with:

`FunctionCallException`

caused by:

`KeyChainException: A required entitlement isn't present`

from `ExpoSecureStore`.

The error is exposed directly inside the Reader UI.

**Finding:** **P1 — iOS core Reader Home is broken in the exact Phase 12 Simulator evidence because SecureStore access fails.**

The visual workflow itself was green because the build/capture job succeeded; that does not mean the rendered app was healthy.

Premium and Watch screenshot attempts were additionally obscured by the iOS system confirmation dialog:

`Open in "HealthTimes Staging"?`

That dialog is an evidence-capture artifact from `simctl openurl`, not by itself a product defect. The underlying SecureStore failure remains present behind it.

### Empty states

HealthTimes uses consistent empty-state styling and generally tells the truth rather than fabricating content.

The cumulative product issue is that Explore, Live, Listen, Premium, Search and Saved can all present substantial empty/unavailable states in the same source window.

**Finding:** P2 — individual empty states are acceptable; the aggregate product currently feels less complete than its implementation depth actually is.

## 20. Cross-platform comparison

### Intended adaptations that work

- Desktop uses full top navigation and no bottom tab bar.
- Mobile uses persistent bottom tabs.
- Tablet uses larger content width and multi-column potential.
- Story/image proportions are generally consistent between mobile/tablet/desktop.
- Headline scale responds sensibly.
- Touch controls appear to preserve the shared 44-point minimum in implementation.

### Unintended divergence

1. **P1 — iOS:** Home renders a SecureStore entitlement exception instead of editorial content.
2. **P1 — Android:** Home remains in loading state after 20 seconds while Watch and Premium render.
3. **P2 — native evidence:** iPhone and Android screenshots cover only Home/Watch/Premium; major Reader journeys cannot be visually compared with PWA.
4. **P2 — tablets:** no native iPad or Android tablet evidence exists, so tablet parity cannot be certified.
5. **P3 — chrome:** phone PWA/native presentation spends substantial vertical space on environment banner + masthead + three utility cards before content.
6. **P3 — tablet navigation:** tablet combines top utility actions and bottom tabs, producing more navigation chrome than desktop or phone need.

The goal remains one HealthTimes product with appropriate platform adaptation; the current PWA achieves that more convincingly than the available native evidence.

## 21. Accessibility observations

### Positive

- interactive controls are generally implemented with semantic button/link roles;
- shared controls use at least 44-point/minimum touch targets in the canonical layout system;
- mobile/tab navigation has selected-state semantics;
- Premium lock actions are exposed to accessibility at the certified runtime;
- image cards carry accessibility labels where media metadata exists;
- layouts showed no horizontal overflow in canonical Chromium UAT at mobile/tablet/desktop sizes;
- text remains high-contrast in the captured light theme.

### Needs evidence/refinement

- no dark-mode contrast evidence;
- no high Dynamic Type screenshot evidence;
- no iPad orientation evidence;
- no Android tablet orientation evidence;
- no keyboard/focus visual evidence in the final screenshot artifact;
- Article body text scaling/line-length cannot be visually assessed because Article screenshots were captured while loading.

**Finding:** P3 — accessibility implementation is materially present, but visual accessibility evidence is incomplete.

## 22. Findings register

| Priority | Finding |
| --- | --- |
| **P1** | iOS Phase 12 Simulator Home fails with ExpoSecureStore / KeyChain entitlement exception instead of rendering the Reader. |
| **P1** | Android Phase 12 emulator Home remains in Loading Home after a deliberate 20-second wait. |
| **P2** | Article visual review is blocked because PWA screenshots capture only the loading state; native Article was not captured. |
| **P2** | Native cross-platform evidence is incomplete: no iPad, Android tablet, native Explore/Search/Article/Live/Listen/My/Saved/Edition/account/dark/failure journey matrix. |
| **P2** | Home architecture is very long and repeats StoryGrid-style sections; lower-feed visual rhythm needs a dedicated evidence/design pass before refinement. |
| **P2** | Explore, Live and Listen are implemented but visually under-populated in the current source state. |
| **P2** | Premium has a strong landing proposition but multiple unavailable/empty commercial states make it feel incomplete. |
| **P2** | The aggregate volume of truthful empty states across major surfaces weakens perceived product completeness. |
| **P3** | Mobile/tablet top chrome is vertically heavy before editorial content. |
| **P3** | My HealthTimes, Saved, Edition and Account Access expose some implementation/security language that should be rewritten for readers. |
| **P3** | HOSPAZ governance/disclosure copy is accurate but developer-oriented; keep non-clickable behavior. |
| **P3** | Future populated advertising density needs feed-rhythm review once providers are actually configured. |
| **P3** | Dark mode, high text scale, keyboard focus and native tablet orientation lack visual evidence. |
| **P4** | Onboarding is clean and consistent but visually minimal; enhancement can wait until core journeys/native runtime are sound. |

No P0 issue was found in this visual audit. Premium fail-closed behavior remains intact in functional UAT.

## 23. Technical defects vs visual/product defects

### Technical defects

- **P1 iOS SecureStore failure** on exact runtime.
- **P1 Android Home unresolved loading** on exact runtime.
- Article screenshot timing/evidence harness is too early for a valid visual Article audit.
- Native device matrix does not yet capture the required audit journeys.
- Native tablet evidence is absent.

### Visual/product defects

- Home feed structure is too long/repetitive to approve without a focused hierarchy pass.
- Several routes feel empty or unfinished despite technically correct state handling.
- Premium’s strong hero is not supported by enough visible commercial/content substance.
- mobile/tablet chrome is heavy.
- settings/account/storage copy sometimes sounds like implementation architecture.
- current evidence does not demonstrate dark-mode polish.

## 24. Proposed priorities

### Immediate moderator follow-up

1. Treat iOS SecureStore failure as a bounded native-runtime defect, not a visual redesign task.
2. Treat Android Home 20-second loading as a bounded native data/runtime defect.
3. Re-run native visual evidence after those defects are corrected.
4. Add iPad and Android-tablet evidence before authorizing tablet visual refinement.
5. Fix Article screenshot capture to wait for the actual Article Reader, including recent, older and Premium-protected stories.

### After native correctness is proven

- issue a bounded Reader/Home hierarchy task;
- issue a bounded Premium/advertising/growth visual task;
- keep Newsroom/Studio for its separate AG-06/CA-01 UX lane.

## 25. KEEP

- Canonical `apps/mobile` publication shell.
- HealthTimes masthead and edition identity.
- Desktop editorial navigation.
- Mobile bottom navigation.
- dominant image-led Home hero.
- Watch visual identity and real media presentation.
- Premium fail-closed boundary.
- Premium hero/value-proposition hierarchy.
- Saved vs Offline semantic separation.
- My HealthTimes information architecture.
- truthful empty-state philosophy.
- HOSPAZ non-clickable behavior while destination authority is unknown.
- responsive PWA breakpoints and no-horizontal-overflow behavior.

## 26. REFINE

- mobile/tablet header and utility-action vertical density;
- Search initial-state presentation;
- Premium unavailable-store presentation;
- Live empty-state presentation;
- Listen empty-state/player presentation once verified audio exists;
- Saved/Offline reader-facing language;
- Edition explanatory language;
- Account/member security copy;
- HOSPAZ disclosure language;
- dark-mode visual evidence and polish;
- accessibility evidence at high text scale/focus states;
- ad-feed rhythm once real providers are configured.

## 27. RESTRUCTURE

These are candidates for separate bounded design tasks, **not implementation in this audit**:

- **Home editorial hierarchy:** reduce repetitive section rhythm and establish stronger prioritization for a long publication feed.
- **Native visual certification workflow:** build a real cross-platform journey matrix rather than phone-only Home/Watch/Premium captures.
- **Article evidence workflow:** capture fully rendered recent/older/Premium stories across desktop/mobile/native before redesigning the Reader.
- **Premium commercial journey:** after genuine offers/content exist, review hierarchy from value proposition through member state, store state, benefits and locked story conversion.

## 28. Evidence references

### Web/PWA

Artifact `10787614511` — `phase10-final-web-pwa-screenshots`

Representative paths:

- `phase10-evidence/final/web/desktop-home.png`
- `phase10-evidence/final/web/mobile-home.png`
- `phase10-evidence/final/web/tablet-home.png`
- `phase10-evidence/final/web/desktop-explore.png`
- `phase10-evidence/final/web/desktop-search.png`
- `phase10-evidence/final/web/desktop-article.png`
- `phase10-evidence/final/web/desktop-live.png`
- `phase10-evidence/final/web/desktop-watch.png`
- `phase10-evidence/final/web/desktop-listen.png`
- `phase10-evidence/final/web/desktop-premium.png`
- `phase10-evidence/final/web/desktop-my-ht.png`
- `phase10-evidence/final/web/desktop-saved.png`
- `phase10-evidence/final/web/desktop-edition.png`
- corresponding `mobile-*` and `tablet-*` captures.

HOSPAZ evidence:

Artifact `10787428883`

- `phase10-evidence/after/staging/desktop-home-hospaz.png`
- `phase10-evidence/after/staging/mobile-home-hospaz.png`

### iOS

Artifact `10788677718` — `phase10-candidate-ios-screenshots`

- `home.png`
- `premium.png`
- `watch.png`
- `manifest.json`

### Android

Artifact `10788651920` — `phase10-candidate-android-screenshots`

- `phase10-evidence/after/android/home.png`
- `phase10-evidence/after/android/premium.png`
- `phase10-evidence/after/android/watch.png`
- `phase10-evidence/after/android/manifest.json`

### Functional UAT supporting visual interpretation

Artifact `10788536112` — `phase12-canonical-reader-uat`

The exact-runtime UAT proves recent/older Article journeys and the Premium lock even though the visual Article screenshot was captured too early.

---

## Completion statement

**NM-04 PHASE 12 PRODUCT VISUAL AUDIT COMPLETE — PWA / IOS / ANDROID PRODUCT EVIDENCE READY FOR OWNER REVIEW**

Control returns to the moderator.

No Reader/Home redesign, Premium/advertising redesign, Newsroom/Studio redesign or production change has been implemented in this lane.
