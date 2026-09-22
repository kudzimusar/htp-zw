# Visual Conformance — Web / PWA

**Programme lane:** AG-07 — PRE-CP7 visual conformance checkpoint  
**Repository:** `kudzimusar/htp-zw`  
**Audit date:** 2026-09-22  
**Runtime code modified:** NO  
**Ordinary CP7 UAT resumed:** NO

## 1. Authority and exact baseline

Design authority read:

- `docs/native-mobile/DESIGN.md`
- `docs/native-mobile/HEALTHTIMES_NATIVE_MOBILE_MASTER_PLAN.md`

`DESIGN.md` states that the approved wireframe is the primary visual reference and **must not be treated as loose inspiration**.

Frozen integrated runtime:

`0112c8802d220d23e20288783536f22e85ea346d`

Later COM-01 runtime:

`5b6fca0fe1dceed5e167b845e023dfc456c47040`

Git comparison confirms COM-01 is 9 commits ahead / 0 behind and changed only COM workflow/API/migrations/tests plus package scripts. It changed **no `apps/mobile/**`, design, or PWA visual file**. Therefore the certified `0112c880...` PWA artifact remains the correct current visual baseline for this audit.

Exact integrated Vercel deployment:

- URL: `https://healthtimes-staging-g16tpmyug-11-11.vercel.app`
- deployment ID: `dpl_DHnC2eR7JkTmA8Lm2r9HBL3MbFHc`
- Git branch: `integration/ag07-nm07-crosslane-candidate`
- Git SHA: `0112c8802d220d23e20288783536f22e85ea346d`
- deployment state: `READY`

Exact PWA build artifact:

- workflow: `Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification`
- run: `35703008559`
- artifact: `healthtimes-native-web-dist`
- artifact ID: `10683071767`
- digest: `sha256:e7122881de30fbda4f04a526b5f62d89ae17af17f3384cc6eb88cf75a7c5e156`

## 2. Wireframe custody

Expected approved asset:

`docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`

Result:

- absent from the exact integrated `0112c880...` tree;
- `docs/native-mobile/assets/` is not present at that SHA;
- repository search on the default branch finds no file named `HEALTHTIMES_NATIVE_WIREFRAME_V1.png`.

**VISUAL GOVERNANCE DEFECT — APPROVED WIREFRAME IMAGE NOT UNDER REPOSITORY CUSTODY**

Per `DESIGN.md`, the textual design specification remains the current visual authority until the approved image is recovered and committed. No replacement was invented.

## 3. Screenshot evidence and capture limitation

Requested evidence directory:

`docs/migration/agent-reports/visual-conformance/web/`

Screenshot matrix prepared from the exact `0112c880...` exported PWA artifact:

| Evidence | Viewport | Evidence class |
| --- | ---: | --- |
| `desktop-home-above-fold.webp` | 1440 × 1000 | PRE-HYDRATION ONLY |
| `desktop-home-full.webp` | 1440 × 1000 | PRE-HYDRATION ONLY |
| `tablet-home.webp` | 768 × 1024 | PRE-HYDRATION ONLY |
| `mobile-home.webp` | 390 × 844 | PRE-HYDRATION ONLY |
| `article.webp` | 1440 × 1000 | PRE-HYDRATION ONLY |
| `premium.webp` | 1440 × 1000 | STATIC EXPORT RENDERED |
| `explore.webp` | 1440 × 1000 | STATIC EXPORT RENDERED |
| `search.webp` | 1440 × 1000 | STATIC EXPORT RENDERED |
| `watch.webp` | 1440 × 1000 | STATIC EXPORT RENDERED |
| `my-healthtimes.webp` | 1440 × 1000 | STATIC EXPORT RENDERED |
| `studio-landing.webp` | 1440 × 1000 | STATIC EXPORT RENDERED |

### Capture constraint

The execution environment's managed Chromium has an enforced `URLBlocklist: ["*"]`, which blocks both localhost and external URL navigation. An isolated Playwright Chromium download could not be obtained because the runtime has no outbound DNS.

No navigation restriction was bypassed.

For screens whose static export contains complete server-rendered UI (Premium, Explore, Search, Watch, My HealthTimes, Studio), the screenshots are direct compiled-artifact renders with no synthetic content.

Home and Article static exports intentionally contain loading shells until client hydration. Their screenshots therefore prove the actual pre-hydration shell only and **must not be treated as final hydrated visual proof**. The hydrated Home/Article hierarchy is evaluated below from the exact runtime components and service decisions, not from invented screenshots.

This is an audit evidence limitation, not a claim that the deployed application itself remains permanently on the loading screen.

## 4. Home visual hierarchy — exact runtime structure

The current Home component renders, in order:

1. editorial filters: For You / Latest / Edition / World / Health;
2. Hero Story;
3. conditional Live Now rail;
4. advertising slot `home_after_live`;
5. Top Stories;
6. Latest;
7. Features;
8. Public Health;
9. Research & Findings;
10. Health Financing & Health Business;
11. HIV/AIDS;
12. Global Health;
13. Watch;
14. Premium Intelligence;
15. advertising slot `home_watch`;
16. Opportunities;
17. Edition;
18. Further Coverage;
19. Most Read / Trending;
20. advertising slot `home_deep_feed`.

This is fundamentally an editorial structure rather than a generic corporate landing page.

However, several important client-facing elements are not prominent enough or do not render with real inventory.

## 5. Premium CTA audit

### Desktop header

Current desktop navigation is:

- Home
- Explore
- Live
- Watch
- My HealthTimes

Utility actions:

- Search
- Alerts

**Premium header CTA: MISSING**

There is no `Premium`, `Subscribe`, `Join Premium` or equivalent desktop header action.

### Mobile header / bottom navigation

Mobile keeps:

- Search
- Alerts
- Home
- Explore
- Live
- Watch
- My HT

**Premium mobile header/nav CTA: MISSING**

Premium is discoverable through My HealthTimes, but not from the primary mobile navigation.

### Homepage first viewport

The Home component places Premium only after Hero, conditional Live, Top Stories, multiple editorial sections and Watch.

A Premium badge may appear when an individual Hero/Story is actually premium, but that is content-dependent and not a reliable product entry point.

**Dedicated Premium CTA in first viewport: MISSING**

### Homepage deeper content

A dedicated section exists:

- heading: `Premium Intelligence`
- eyebrow: `MEMBER REPORTING`
- action: `View Premium`
- up to three Premium stories when source metadata resolves.

**Status: MATCHES structurally, but placement is too deep for primary paid-product discovery.**

### Article

Premium article logic includes:

- Premium badge;
- protected-body lock;
- copy explaining member access;
- `View Premium` CTA.

**Status: MATCHES for Premium-gated article context.**

### Premium page

The public Premium screen has a strong headline:

`Deeper health intelligence. Full reporting. One clear membership.`

But the current rendered staging screen also shows:

- `No Premium stories available`;
- `Native storefront configuration required`;
- no verified plan/price;
- no working primary join/purchase CTA until storefront configuration exists.

It does include:

- Benefits;
- Restore purchases;
- Sign in as existing member.

**Status: PARTIAL**

The screen explains Premium, but a new reader cannot complete a clear join journey from the rendered state.

### My HealthTimes

The profile header contains `Go Premium` for non-premium users.

**Status: MATCHES**

### Premium conclusion

**Can a new reader tell from the first screen that HealthTimes has a paid Premium product and immediately understand how to join?**

**NO.**

Reason:

- no Premium/Subscribe CTA in desktop header;
- no Premium CTA in mobile primary navigation;
- dedicated Premium homepage section is below substantial editorial content;
- Premium page currently exposes configuration/empty-state language and lacks a working primary join action.

This is a genuine client-facing product hierarchy gap.

## 6. HOSPAZ direct-ad audit

Accepted source-parity campaign reference is present:

- campaign name: `HOSPAZ September AGM`;
- source article reference is preserved;
- commercial source type: direct;
- reconciliation: requires review.

The current runtime also explicitly records:

- `creativeVerified: false`;
- exact approved creative/destination are not rendered until source-verified.

Current ad service behavior in Source Parity mode:

- returns `source: "none"`;
- preserves HOSPAZ source context;
- does not fabricate delivery.

`AdSlot` returns `null` whenever `source === "none"`.

Intended PWA placement surfaces exist:

Home:

- `home_after_live`
- `home_watch`
- `home_deep_feed`

Article:

- `article_after_intro`
- `article_end`

Current rendered disposition:

| Question | Result |
| --- | --- |
| HOSPAZ campaign/data present | **YES — source reference only** |
| Exact HOSPAZ creative present in current PWA inventory | **NO** |
| Placement abstractions present | **YES** |
| Rendered on current Home | **NO** |
| Rendered on current Article | **NO** |
| Rendered in masthead | **NO** |
| Destination/schedule/conditions invented | **NO** |

Reason for absence:

**The current Source Parity advertising adapter deliberately fails closed because the exact HOSPAZ creative and commercial destination/schedule remain unverified. The UI therefore removes the ad slot rather than showing the approved-looking HOSPAZ campaign.**

This is safe technically, but it does not satisfy the current client visual expectation that the accepted HOSPAZ placement remain visibly represented.

## 7. Wireframe conformance matrix

Because the approved PNG is missing, classifications are against the textual design authority. Pixel-level/board-level comparison is additionally marked as unavailable.

| Surface / element | Classification | Finding |
| --- | --- | --- |
| Wireframe board image | **CANNOT VERIFY — SOURCE WIREFRAME IMAGE MISSING** | Required PNG absent from repository custody |
| Reader five-tab navigation | **MATCHES** | Home / Explore / Live / Watch / My HT exactly implemented |
| Header brand | **MATCHES** | HealthTimes brand retained |
| Edition selector | **MATCHES** | visible and routed |
| Search | **MATCHES** | primary utility action + dedicated Search screen |
| Notifications | **MATCHES** | primary utility action |
| Home editorial filters | **MATCHES** | For You / Latest / Edition / World / Health |
| Hero | **CANNOT VERIFY — HYDRATED SCREENSHOT UNAVAILABLE** | Hero component and image-forward treatment exist in exact runtime |
| Live rail | **PARTIAL** | component exists and collapses correctly with no live inventory; current source parity provides no Live items |
| Top Stories | **CANNOT VERIFY — HYDRATED SCREENSHOT UNAVAILABLE** | exact runtime includes compact StoryList |
| Editorial density | **PARTIAL** | Home source hierarchy is strongly editorial, but owner-facing hydrated visual proof is unavailable in this environment |
| Premium in first-screen/header hierarchy | **MISSING** | no persistent Premium/Subscribe CTA |
| Premium section | **PARTIAL** | deep Home section exists; public Premium page is visually strong but operationally empty/config-oriented |
| Premium story badges | **MATCHES** | Story/Hero cards render Premium badges when access policy is premium |
| Advertising placement abstraction | **MATCHES** | Home/article ad slots defined |
| Actual HOSPAZ rendering | **MISSING** | fail-closed adapter renders no creative |
| Watch destination | **PARTIAL** | first-class screen exists; current static render is dominated by no-video empty state |
| Explore structure | **PARTIAL** | taxonomy gateway is present, but current screen is dominated by empty/system states |
| Intelligent Search | **MATCHES / PARTIAL DATA** | dedicated product structure exists; current static render has no article results before data hydration |
| My HealthTimes structure | **MATCHES** | clean list, membership state, Go Premium, subscriptions, saved/settings/security |
| My HealthTimes normal-reader copy | **EXTRA / DESIGN DRIFT** | `Growth & Commercial Readiness` and direct Studio entry expose implementation/operations language to ordinary Reader surface |
| Premium normal-reader copy | **EXTRA / DESIGN DRIFT** | `Native storefront configuration required` and provider-configuration explanation are implementation-facing |
| Explore normal-reader copy | **EXTRA / DESIGN DRIFT** | terms such as `canonical`, `legacy publication categories`, and multiple technical empty states dominate the current experience |
| Environment banner | **EXTRA / STAGING-APPROPRIATE** | clearly labels DEVELOPMENT / READ-ONLY PUBLIC SOURCE PARITY / NOT MIGRATION COMPLETE; acceptable for staging evidence but not a production Reader design |
| Studio visual distinction | **PARTIAL** | operational/dense surface is distinct, but current screen is very programme/status-heavy compared with an owner-facing production Studio |
| Article Premium CTA | **MATCHES** | Premium body lock links to Premium options |
| Article ad placement | **PARTIAL** | positions exist but no actual direct campaign renders |

## 8. Serious-publication / generic-product drift assessment

The Home runtime itself is **not structurally a generic marketing page**. It is journalism-led: hero, Top Stories, vertical editorial sections, Watch and Premium are all explicit.

The stronger visual drift appears on secondary public surfaces:

- Premium shows provider/store configuration language to normal readers;
- Explore exposes migration/taxonomy implementation concepts;
- Watch currently leads quickly to empty-state messaging;
- My HealthTimes exposes `Growth & Commercial Readiness`;
- Studio exposes programme checkpoint language prominently.

This makes the current staging product feel more like an implementation/certification build than a polished publication when users move beyond the Home source hierarchy.

That staging truthfulness is technically appropriate, but it should not be confused with owner/client visual conformance.

## 9. Current Devex public-pattern comparison

Devex was inspected only as a **product-pattern reference**, not a template.

Current Devex public site visibly exposes:

- dense headline-led journalism on the homepage;
- a primary `Subscribe` action in the header;
- `Try Devex Pro` inside news navigation;
- clear Jobs and Funding top-level commercial/professional products;
- multiple editorial rails such as Latest, Funding, Careers, Top News, opinion, events, podcasts and trends;
- paid Pro/Pro Funding positioning as a normal part of the publication rather than a hidden account setting.

No Devex branding, proprietary component, typography or exact layout is proposed for copying.

| DEVEX PATTERN | HEALTHTIMES CURRENT | GAP |
| --- | --- | --- |
| Subscription visible in primary header | no persistent Premium/Subscribe action | **Major Premium discoverability gap** |
| Premium integrated into news navigation | Premium is a deep Home section + My HT action | Premium is not part of persistent publication hierarchy |
| Dense story-led homepage | HealthTimes Home source has strong editorial sections | Structurally close; hydrated visual proof still required for owner review |
| Commercial products visible at top level (Jobs/Funding) | Opportunities exist deep on Home; source product links exist in My HT/publication profile | Commercial hierarchy is less obvious |
| News content dominates page | Home source does; Explore/Premium/Watch currently show substantial empty/system copy | Secondary surfaces feel less publication-ready |
| Premium value proposition + direct trial/join path | Premium page has value proposition but no live join/storefront action | Clear conversion path missing |
| Sponsored/commercial content can coexist with editorial content | HealthTimes has governed AdSlot model but no HOSPAZ creative renders | Commercial continuity invisible |
| Strong professional-publication identity | HealthTimes typography/structure are restrained and editorial | Internal programme/configuration language weakens polish |

## 10. Defect register

### P0

**0**

No security/data-loss/cutover-impossible visual defect identified.

### P1

**3**

#### VIS-P1-001 — Premium is not prominent in primary publication navigation

Desktop/mobile primary navigation lacks a Premium/Subscribe CTA. A new reader cannot infer the paid product and join path from the first screen reliably.

#### VIS-P1-002 — Premium conversion surface is incomplete

Premium page is visible and branded, but its current rendered state says `Native storefront configuration required` and provides no primary join/purchase action.

#### VIS-P1-003 — Accepted HOSPAZ campaign does not render anywhere in current PWA

Source/campaign reference and placement abstractions exist, but the exact creative is unverified and the service returns `source:none`, so Home/Article/masthead show no HOSPAZ ad.

### P2

**3**

#### VIS-P2-001 — Approved wireframe image is not under repository custody

Textual design authority exists, but the approved board cannot be independently rechecked pixel-for-pixel.

#### VIS-P2-002 — Public Reader surfaces expose implementation terminology

Premium and Explore display configuration/migration-oriented language that normal readers should not need to interpret.

#### VIS-P2-003 — Secondary publication surfaces lack content density

Explore and Watch current rendered states are dominated by empty states, reducing the serious editorial-publication feel expected by the client.

### P3

**1**

#### VIS-P3-001 — My HealthTimes exposes internal product/programme affordances

`Growth & Commercial Readiness` and a prominent direct Studio entry are extra operational concepts on the ordinary Reader account surface.

### P4

**0**

No enhancement-only item is required to explain the current visual conformance gap.

### Severity totals

- P0: **0**
- P1: **3**
- P2: **3**
- P3: **1**
- P4: **0**

## 11. Recommended bounded remediation — NOT AUTHORIZED BY THIS AUDIT

No fixes were made.

For moderator/owner disposition, the bounded remediation candidates are:

1. recover and commit the owner-approved wireframe PNG;
2. make Premium persistently visible in desktop and mobile publication navigation;
3. replace reader-facing provider/configuration text with publication-facing membership states while preserving fail-closed pricing truth;
4. reconcile the verified HOSPAZ creative into the governed direct-ad inventory once exact creative/destination authority is available;
5. keep the existing AdSlot authority model rather than hardcoding HOSPAZ;
6. replace migration/canonical/legacy terminology in normal Reader UI with editorial language;
7. preserve the strong existing Home editorial hierarchy while reducing implementation-status copy;
8. keep five-tab Reader navigation and Studio/Reader authority separation unchanged;
9. obtain a true hydrated screenshot pass in a browser-capable environment before visual acceptance.

## 12. Visual checkpoint disposition

The application contains a substantial amount of the approved textual design structure, including the exact five-tab Reader navigation, editorial Home hierarchy, Premium page, Watch, Explore, Search, My HealthTimes and Studio/Reader separation.

The client concern is nevertheless supported by evidence:

- Premium is not sufficiently visible in the primary publication hierarchy;
- Premium currently lacks an obvious working join journey;
- HOSPAZ is not visually rendered;
- important secondary screens expose staging/implementation language and empty states;
- the actual approved wireframe image is missing from repository custody;
- a fully hydrated screenshot proof of Home/Article still requires browser-capable capture.

Ordinary PRE-CP7 UAT remains paused pending moderator visual review.

**Production systems modified: NO**

**Runtime code modified: NO**

**CP7 acceptance: NOT EXECUTED**

**AG-08: NOT STARTED**
