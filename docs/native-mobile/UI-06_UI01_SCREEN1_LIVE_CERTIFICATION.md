# UI-06 — UI-01 Screen 1 Live Candidate Certification

**Status:** CERTIFIED

## Exact identities

- Repository: `kudzimusar/htp-zw`
- Certification branch: `test/ui06-ui01-screen1-live-cert`
- Starting SHA: `c462b4cdf10bf0072cac48bbf163bb567428ce77`
- Certification tooling SHA: `8e50ebf2c98054fcb04dfbd4521d7404d047d5fc`
- Target deployment wrapper: `c462b4cdf10bf0072cac48bbf163bb567428ce77`
- Accepted UI-01 executable: `c233377d71a6758d080ee3fffbd7c8731daf333a`
- Public URL: `https://kudzimusar.github.io/htp-zw/`
- Workflow run: `36686490071`
- Evidence artifact: `ui06-ui01-screen1-live-cert`
- Artifact ID: `11084175676`
- Artifact SHA-256: `5bbcaec18b2ad31435e669d993aa668a16c43b450f6685550cc1b5976a3de686`
- Artifact retention: 30 days

The certification tooling SHA is distinct from the target deployment wrapper and the accepted UI-01 application SHA. No application or deployment mutation was required for certification.

## Mutation

Certification branch changes are evidence tooling/documentation only:

- `.github/workflows/ui06-ui01-screen1-live-cert.yml`
- `scripts/ui/ui06-ui01-screen1-live-cert.mjs`
- `docs/native-mobile/UI-06_UI01_SCREEN1_LIVE_CERTIFICATION.md`

Explicit authority preservation:

- apps/mobile changed: **NO**
- Pages workflow changed: **NO**
- deployment changed: **NO**
- DESIGN.md changed: **NO**
- data changed: **NO**
- Premium changed: **NO**
- advertising authority changed: **NO**
- native authority changed: **NO**
- production changed: **NO**

## Browser environment

Final evidence run:

- GitHub runner OS: Ubuntu 24
- Runner image: `20260920.314.1`
- Runner architecture: X64
- Node: `v22.23.2`
- Playwright: `1.55.0`
- Chromium: `140.0.7339.16`
- deviceScaleFactor: `1`

Required exact Web/PWA viewports were used:

- mobile: `390 × 844`
- tablet: `834 × 1112`
- desktop: `1440 × 1000`

Each viewport used a fresh Chromium context, listeners before navigation, initial Home resolution, one reload, final assertions and live screenshots.

## Deployment identity

Live `/build-info.json` was fetched with cache-busting/no-cache handling and returned exactly:

```json
{
  "sha": "c462b4cdf10bf0072cac48bbf163bb567428ce77",
  "presentation": "apps/mobile",
  "service_mode": "source-parity",
  "base_path": "/htp-zw"
}
```

**Deployment identity: PASS**

No custody regression was observed.

## Runtime

| Gate | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| React #418 | 0 | 0 | 0 |
| page errors | 0 | 0 | 0 |
| console errors | 0 | 0 | 0 |
| Home resolves | PASS | PASS | PASS |
| Hero present | PASS | PASS | PASS |
| Top Stories present | PASS | PASS | PASS |
| service-worker controller | PASS | PASS | PASS |

Home left `Loading Home…` within the bounded wait on initial navigation and reload at all three viewports.

**Runtime result: PASS**

## Compact Reader shell

Final measurements:

| Gate | Mobile | Tablet | Desktop |
| --- | ---: | ---: | ---: |
| environment banner visible | NO | NO | NO |
| compact masthead | PASS | PASS | PASS |
| measured masthead height | 58 px | 58 px | 59 px |
| Search visible | PASS | PASS | PASS |
| Alerts visible | PASS | PASS | PASS |
| Edition visible | PASS | PASS | PASS |
| Premium visible | PASS | PASS | PASS |
| duplicate full-width utility row | NO | NO | NO |
| filter count | 5 | 5 | 5 |
| filter line count | 1 | 1 | 1 |

The five controls remained the intended single horizontal treatment: For You, Latest, current edition, World and Health.

**Shell result: PASS**

## Hero media

The final live run proved authoritative, rendered Hero media at every viewport.

### Mobile — 390 × 844

- Hero article link: present and accessible
- media URL: `https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg`
- HTTP status observed: `200`
- intrinsic dimensions: `1200 × 665`
- visible render: PASS
- mobile headline/image integration: PASS

### Tablet — 834 × 1112

- Hero article link: present and accessible
- media URL: `https://healthtimes.co.zw/wp-content/uploads/2026/09/IMG-20260904-WA0019.jpg`
- HTTP status observed: `200`
- intrinsic dimensions: `1124 × 750`
- visible render: PASS

### Desktop — 1440 × 1000

- Hero article link: present and accessible
- media URL: `https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg`
- HTTP status observed: `200`
- intrinsic dimensions: `1200 × 665`
- visible render: PASS

Independent browser contexts may resolve a different current source-backed lead story while live source-parity refresh is active. No blank Hero-media region reproduced.

Duplicate/speculative Hero image requests sometimes emitted `net::ERR_ABORTED`; in every recorded Hero case the same image subsequently returned HTTP 200 and rendered at non-zero intrinsic dimensions. These are retained as non-blocking P4 browser-cancellation evidence, not misclassified as media failure.

**Hero media result: PASS**

## Optional Live / advertising and Hero → Top Stories rhythm

Final evidence at all three viewports:

- verified Live module rendered: NO
- HOSPAZ rendered: NO
- `home_after_live` advert rendered: NO
- fabricated Live content: NO
- fabricated advertising: NO
- unexplained optional-slot placeholder: NO
- measured Hero → Top Stories gap: `41 px`

Because no authoritative Live/HOSPAZ decision was available, the modules remained fail-closed without leaving section-sized dead space.

**Optional-module rhythm: PASS**

## Top Stories

`Top Stories` rendered at mobile, tablet and desktop. During the exact final run the immediately bounded story-row observation varied with the independently refreshed live source, while the section itself remained present and directly followed the Hero with a 41 px measured gap. The screenshots preserve the rendered rows/thumbnails from each exact browser context.

The treatment remains denser and more scannable than a second Hero-sized card stack.

**Top Stories hierarchy: PASS**

## Responsive behavior

### Mobile — 390 × 844

- five-tab navigation present: PASS
- tab count: 5
- destinations: Home, Explore, Live, Watch, My HT
- filter row: single line
- horizontal overflow: NONE
- full-feed evidence: captured
- above-fold evidence: captured

### Tablet — 834 × 1112

- compact top utilities: PASS
- split Hero: PASS
- Top Stories: PASS
- five-tab bottom navigation retained: YES
- layout remains usable/unobscured
- horizontal overflow: NONE

Tablet retaining the five-tab bottom navigation is recorded as **P3 — meaningful refinement**, explicitly allowed by the current certification contract when the page remains usable and non-redundant.

### Desktop — 1440 × 1000

- publication navigation visible: PASS
- Home / Explore / Live / Watch / My HealthTimes: visible
- mobile bottom tab bar present: **NO**
- compact utilities: PASS
- Hero uses desktop width intentionally: PASS
- horizontal overflow: NONE

**Responsive result: PASS**

## Above-the-fold improvement against Phase 0

Official before evidence: Phase 0 artifact `11020762170`.

Phase 0 mobile showed:

- full engineering/source-parity banner;
- separate three-card Search / Alerts / Premium utility row;
- wrapped filter treatment with Health on a second line;
- tall, separated Hero image/headline/standfirst composition;
- Top Stories below the first viewport.

The UI-01 live candidate shows:

- no engineering banner in the normal Reader shell;
- compact integrated masthead/utilities;
- one-row five-filter treatment;
- image-led Hero with integrated mobile headline treatment;
- Top Stories materially earlier and directly after the Hero.

**Above-the-fold improvement: VERIFIED**

## Later Home feed

The full-feed captures preserve the source-backed Home composition beyond the first viewport, including later editorial/list/grid treatments where source data exists. The candidate reads as a publication feed rather than the former repeated generic-card shell.

No fabricated Most Read/Trending ranking was observed. No prohibited reader-facing programme terminology such as source parity, bounded source, migration authority, canonical, configuration-required, or migration complete/incomplete was exposed as normal Home copy.

The mobile feed remains long because the live source populates many editorial sections; this is retained as a possible future P3 density/page-length refinement rather than a UI-01 blocker.

## Premium discovery

At every viewport:

- Home/shared-shell Premium entry visible: PASS
- `/premium` navigation: PASS
- browser exception during Premium navigation: NONE

This certification covers Home Premium discoverability/reachability only. Storefront pricing, subscriptions, timed paywall and entitlement behavior were not certified.

**Premium discovery: PASS**

## Horizontal overflow

| Viewport | inner width | document scroll width | Result |
| --- | ---: | ---: | --- |
| mobile | 390 | 390 | PASS |
| tablet | 834 | 834 | PASS |
| desktop | 1440 | 1440 | PASS |

No unintended document-level horizontal overflow was observed.

## Service worker

At all three viewports:

- `navigator.serviceWorker`: supported
- controller: present
- registration state: active
- controller script: `/htp-zw/sw.js`
- fatal service-worker errors: 0

**Service-worker runtime: PASS**

## Console and network

Final run:

- page errors: `0`
- console errors: `0`
- console warnings: `9` total / `3` per viewport
- warnings were the known Expo Web notification-listener warning
- HTTP responses `>=400`: `0`
- browser `requestfailed`: `64`
- all `requestfailed` errors: `net::ERR_ABORTED`
- proven `maxresdefault.jpg` HTTP errors: `0`

Four YouTube `maxresdefault.jpg` URLs had duplicate browser-aborted requests in some contexts, but the exact same URLs also returned service-worker HTTP 200 and were visibly rendered with source-backed images. They are therefore **NON-BLOCKING WARNING / P4**, not a proven media/data defect.

No visible broken core asset or core journey failure was proven.

## Live screenshots and wireframe comparison

Final artifact contains:

- `mobile/home.png` — full Home feed, `390 × 13779`
- `mobile/above-fold.png` — exact `390 × 844`
- `tablet/home.png` — full Home feed, `834 × 9093`
- `tablet/hero-topstories.png`
- `desktop/home.png` — full Home feed, `1440 × 6207`
- `desktop/hero-topstories.png`

For React Native Web, the full-feed evidence expands the internal scroll container on an auxiliary evidence page; fixed bottom navigation is intentionally omitted from that flattened capture so it does not relocate over the long image. Navigation presence/suppression is certified separately against the untouched live page. The exact above-fold/focused images retain normal live composition.

Comparison against Screen 1 confirms the intended hierarchy is materially present:

- compact HealthTimes masthead;
- one-row editorial filter treatment;
- image-led dominant Hero;
- truthful absence of Live when no verified event exists;
- Top Stories directly following the lead hierarchy;
- Premium discoverability preserved;
- fail-closed advertising without dead space;
- publication-like content density;
- mobile five-tab navigation preserved;
- desktop mobile-tab suppression preserved.

This is material Screen 1 conformance, not pixel-for-pixel replication and not a numeric aesthetic score.

## Remaining findings

### P0

None.

### P1

None.

### P2

None.

### P3

- Tablet retains five-tab bottom navigation alongside compact top utilities. This is usable and explicitly allowed as a later refinement under the current UI-01 contract.
- The live mobile feed remains long when many editorial sections are source-populated; future density refinement may be considered outside UI-01.

### P4 / non-blocking

- Known Expo Web notification-listener warning.
- Browser `net::ERR_ABORTED` duplicate/speculative image requests where successful HTTP 200 rendered responses were independently proven.
- Runner/action deprecation warnings belong to CI/tooling maintenance and did not affect the product runtime.

## Final disposition

All required UI-01 live certification gates passed on the exact Pages wrapper. No product mutation was required.

`UI-06 UI-01 SCREEN 1 LIVE CANDIDATE CERTIFIED — DEPLOYMENT c462b4cdf10bf0072cac48bbf163bb567428ce77 / EXECUTABLE c233377d71a6758d080ee3fffbd7c8731daf333a / HOME READY FOR UI MODERATOR FINAL CLOSURE`
