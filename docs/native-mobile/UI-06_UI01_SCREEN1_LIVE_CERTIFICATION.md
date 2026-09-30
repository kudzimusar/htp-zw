# UI-06 — UI-01 Screen 1 Live Candidate Certification

## Final disposition

**CERTIFIED — UI-01 Screen 1 Home live candidate passed the required deployment-identity, runtime, responsive, media, hierarchy, Premium-discovery, overflow, service-worker and live evidence gates.**

This is certification evidence only. No product implementation, deployment, data, Premium, advertising, native, or production authority was changed.

## Exact identities

- Repository: `kudzimusar/htp-zw`
- Certification branch: `test/ui06-ui01-screen1-live-cert`
- Certification branch starting SHA: `c462b4cdf10bf0072cac48bbf163bb567428ce77`
- Certification tooling SHA: `f1e4245e25a7142732a3b2ac27dbb3bf1c994b6e`
- Target deployment wrapper SHA: `c462b4cdf10bf0072cac48bbf163bb567428ce77`
- Accepted UI-01 executable SHA: `c233377d71a6758d080ee3fffbd7c8731daf333a`
- Public URL: `https://kudzimusar.github.io/htp-zw/`
- Final workflow run: `36684558679`
- Workflow job: `109787310221`
- Evidence artifact: `ui06-ui01-screen1-live-cert`
- Artifact ID: `11083551263`
- Artifact digest: `sha256:67b4215fb507d71ad1637f8c3635c98616a11fd23781f49444f5fe231d32432a`
- Artifact retention: through 2026-10-30

## Evidence-tooling mutation

Only certification evidence files were added/changed on this branch:

- `.github/workflows/ui06-ui01-screen1-live-cert.yml`
- `scripts/ui/ui06-ui01-screen1-live-cert.mjs`
- `docs/native-mobile/UI-06_UI01_SCREEN1_LIVE_CERTIFICATION.md`

The browser harness reused the proven Phase 0 approach and was hardened in-bounds to:

1. distinguish browser `net::ERR_ABORTED` image requests from an actual failed HTTP response;
2. wait for Hero intrinsic dimensions before media certification;
3. capture the entire React Native Web internal Home scroll surface, rather than only the browser viewport;
4. bound Top Stories counting to the actual section.

No `apps/mobile/**` file was changed.

## Browser environment

- GitHub-hosted Ubuntu runner: `ubuntu24`
- Runner image version: `20260920.314.1`
- Runner OS/arch: `Linux / X64`
- Node: `v22.23.2`
- Playwright: `1.55.0`
- Chromium: `140.0.7339.16`
- Device scale factor: `1`

Required viewport assertions were executed at:

- mobile: `390 × 844`
- tablet: `834 × 1112`
- desktop: `1440 × 1000`

The final full Home evidence expands the internal RN-Web scroll surface and produced:

- mobile `home.png`: `390 × 10897`
- tablet `home.png`: `834 × 9093`
- desktop `home.png`: `1440 × 6207`

Focused exact-viewport evidence remains available as `mobile/above-fold.png`, `tablet/hero-topstories.png` and `desktop/hero-topstories.png`.

## Deployment identity

Live `/build-info.json` returned exactly:

```json
{
  "sha": "c462b4cdf10bf0072cac48bbf163bb567428ce77",
  "presentation": "apps/mobile",
  "service_mode": "source-parity",
  "base_path": "/htp-zw"
}
```

Result: **PASS — no deployment custody regression.**

The live deployment wrapper and accepted UI-01 executable remain separate identities.

## Runtime

Across mobile, tablet and desktop, on initial load and post-reload:

- React #418: **0**
- uncaught page errors: **0**
- console errors: **0**
- Home left `Loading Home…`: **PASS**
- `Top Stories` resolved: **PASS**
- fatal router failure: **NONE**
- fatal service-worker failure: **NONE**

Console warnings: `9`, all the known non-blocking Expo Web notification-listener warning.

Result: **PASS.**

## Compact Reader shell

All three viewports:

- environment banner visible: **NO**
- compact HealthTimes masthead: **PASS**
- Search discoverable: **PASS**
- Alerts discoverable: **PASS**
- Edition discoverable: **PASS**
- Premium discoverable: **PASS**
- duplicate/full-width Search–Alerts–Premium utility row: **ABSENT**

Masthead measured approximately `58–59px` high.

Result: **PASS.**

## Editorial filters

All three viewports rendered exactly five controls:

1. For You
2. Latest
3. current edition (`Global` during evidence)
4. World
5. Health

Measured filter-line count: **1** on mobile, tablet and desktop.

No filter wrapping was observed.

Result: **PASS.**

## Hero and live media evidence

### Mobile — 390 × 844

Hero story:

`Zimbabwe Looks to Strengthen Social Contracting as HIV Donor Funding Shrinks`

Hero media:

`https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg`

Evidence:

- HTTP response: `200`
- intrinsic size: `1200 × 665`
- rendered element: **visible**
- accessible Hero link: **PASS**
- headline/image overlap: **PASS**
- source post ID: `33190`
- featured-media ID: `33192`

### Tablet / desktop

The source-parity live context resolved:

`HIPH graduates challenged to turn qualifications into health solutions`

Hero media:

`https://healthtimes.co.zw/wp-content/uploads/2026/09/IMG-20260904-WA0019.jpg`

Evidence at both responsive surfaces:

- HTTP response: `200`
- intrinsic size: `1124 × 750`
- rendered element: **visible**
- accessible Hero link: **PASS**

The source-parity environment may resolve live-refresh content or the deterministic source snapshot depending on request timing; the certification gate is that the chosen source-authoritative Hero is image-led, valid, reachable and rendered. Both observed Hero records met that requirement.

A browser-aborted request was observed before a later successful HTTP/rendered image response at each viewport. Per the certification contract, this is **NON-BLOCKING / P4** and is not treated as an HTTP/media failure.

Result: **PASS — live Hero media is valid and visibly rendered.**

## Optional Live / advertising slots

During the certification run:

- verified Live module rendered: **NO**
- HOSPAZ header placement rendered: **NO**
- `home_after_live` placement rendered: **NO**

No fabricated Live item appeared.

No empty Live/ad panel appeared.

Measured Hero → Top Stories gap:

- mobile: `41px`
- tablet: `41px`
- desktop: `41px`

No unexplained section-sized blank interval exists.

Result: **PASS — truthful fail-closed optional content with compact rhythm.**

## Top Stories hierarchy

`Top Stories` rendered at all three viewports.

The heading follows the Hero with a consistent `41px` measured interval. Mobile uses a dense/scannable list rather than another Hero-sized stack. Source-parity content availability varied across clean contexts, but the section and its source-backed story rows were present.

Result: **PASS.**

## Above-the-fold comparison against Phase 0

Official before artifact: `11020762170`.

Phase 0 mobile visibly contained:

- the engineering/environment banner;
- a separate full-width Search / Alerts / Premium card row;
- wrapped filters, with `Health` dropping to a second row;
- a tall Hero stack in which headline/standfirst consumed most of the first screen;
- Top Stories below the first viewport.

The UI-01 live candidate now shows:

- no engineering banner;
- Search, Alerts, Edition and Premium compactly integrated into the masthead;
- all five filters in one horizontal row;
- an image-led mobile Hero with headline overlay;
- Top Stories beginning within the same initial viewport.

This is a material above-the-fold hierarchy improvement and visibly aligns Home more closely with the Screen 1 publication model.

## Responsive results

### Mobile

- five-tab bottom navigation: **PASS**
- tab count: `5`
- destinations: Home / Explore / Live / Watch / My HT
- horizontal overflow: **NONE**

### Tablet

- Hero split treatment: **PASS**
- compact top utilities: **PASS**
- five-tab bottom navigation retained: **YES**
- content obscured by tabs: **NO**
- redundant large secondary navigation system: **NO**
- horizontal overflow: **NONE**

Tablet bottom tabs remain an allowed **P3 refinement**, not a certification blocker.

### Desktop

- mobile bottom tab bar: **ABSENT**
- publication navigation visible: Home / Explore / Live / Watch / My HealthTimes
- desktop Hero split: **PASS**
- stretched-phone presentation: **NOT OBSERVED**
- horizontal overflow: **NONE**

Result: **PASS.**

## Premium discovery

At all three responsive surfaces:

- Home/shared-shell Premium entry: **visible**
- `Premium Intelligence` Home module: **visible**
- navigation to `/premium`: **successful**
- Premium-navigation page errors: `0`

This certifies Home Premium discovery only. Pricing, subscription, entitlement and paywall behavior remain outside UI-01.

Result: **PASS.**

## Later Home feed

The full-scroll evidence confirms a publication-style feed with varied list/grid/media treatments, including source-backed sections such as Features, Health Financing & Health Business, HIV/AIDS, Global Health, Watch, Premium Intelligence, Opportunities, Edition and Further Coverage where source data supports them.

No fabricated Most Read/Trending ranking block was present.

Reader-facing internal migration/source-authority terminology violations: **0**.

The mobile Home is still long (`10,897px` internal scroll height) because it carries a broad publication feed. The alternation of dense lists, image-led sections, video, Premium and opportunity modules avoids the previous single-card repetition. This remains a **P3 future compaction/refinement opportunity**, not a Screen 1 blocker.

## Network / media

Final run evidence:

- browser-level `requestfailed`: `50`
- HTTP responses `>=400`: `0`
- actual `maxresdefault.jpg` HTTP failures: `0`
- visible broken Hero asset: **NO**
- core journey failure attributable to network: **NO**

The request failures were browser-level cancellations during reload/navigation/resource replacement and are kept separate from HTTP failures as required.

Result: **PASS with non-blocking network-cancellation evidence preserved.**

## Service worker

All three viewports:

- `navigator.serviceWorker` supported: **YES**
- controller present: **YES**
- registration state: **active**
- active script: `https://kudzimusar.github.io/htp-zw/sw.js`
- fatal service-worker error: **NO**

Result: **PASS.**

## Screen 1 wireframe comparison

The live candidate materially reflects the approved Screen 1 hierarchy:

- compact publication masthead;
- one-row editorial filters;
- dominant image-led Hero;
- truthful absence of optional Live/advertising modules when no decision exists;
- Top Stories immediately following the lead hierarchy;
- Premium discoverability preserved;
- dense mobile bottom navigation;
- desktop-specific navigation without mobile tabs;
- publication-like later-feed alternation.

It is not a pixel-for-pixel reproduction and no subjective score is assigned.

Remaining non-blocking gaps:

- **P3:** tablet retains the five-tab bottom navigation; usable and explicitly allowed by the certification contract.
- **P3:** mobile full feed remains long; future phase may further compact/de-prioritize deep sections without changing Screen 1 acceptance.
- **P4:** Expo Web notification-listener warning persists.
- **P4:** browser-aborted Hero requests can occur during refresh, but successful `200` image responses and non-zero rendered dimensions are independently proven.

No P0, P1 or P2 blocker remains in this certification.

## Before / after evidence

Before:

- Phase 0 artifact ID: `11020762170`

After/live candidate:

- UI-01 artifact ID: `11083551263`
- digest: `sha256:67b4215fb507d71ad1637f8c3635c98616a11fd23781f49444f5fe231d32432a`

Historical artifacts were not overwritten.

## Authority preservation

```
apps/mobile changed: NO
Pages workflow changed: NO
deployment changed: NO
DESIGN.md changed: NO
data changed: NO
Premium changed: NO
advertising authority changed: NO
native authority changed: NO
production changed: NO
main changed: NO
PR #42 merged: NO
```

## Final certification statement

`UI-06 UI-01 SCREEN 1 LIVE CANDIDATE CERTIFIED — DEPLOYMENT c462b4cdf10bf0072cac48bbf163bb567428ce77 / EXECUTABLE c233377d71a6758d080ee3fffbd7c8731daf333a / HOME READY FOR UI MODERATOR FINAL CLOSURE`
