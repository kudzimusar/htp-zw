# UI-06 Phase 0 Live Pages Home Certification

**Repository:** `kudzimusar/htp-zw`  
**Certification branch:** `test/ui06-phase0-live-pages-cert`  
**Starting SHA:** `e275e53071bbbb519b6e7a4f3805e77038567b54`  
**Certification tooling SHA:** `148e412b3241fb2152641d358035ffa7c97aa7ae`  
**Target deployed SHA:** `e275e53071bbbb519b6e7a4f3805e77038567b54`  
**Underlying accepted Reader SHA:** `f36d6336c65c598191ea2841952a8c9f18bcf57e`  
**Public URL:** `https://kudzimusar.github.io/htp-zw/`  
**Final workflow run:** `36541291313`  
**Evidence artifact:** `ui06-phase0-live-pages-cert` / ID `11020762170`  
**Artifact digest:** `sha256:d039456e2e3db44ef849c29fe899066bef78786a5decfa4e15524ca3dd05292a`

## Scope and mutation boundary

This certification tested the already deployed GitHub Pages Reader. It did not build, publish, replace, or mutate the deployed product.

Changed certification files before the evidence run:

- `.github/workflows/ui06-phase0-live-pages-cert.yml`
- `scripts/ui/ui06-phase0-live-pages-cert.mjs`

This report is the only documentation closure added after evidence existed.

Explicit freeze:

```text
apps/mobile changed: NO
Pages workflow changed: NO
deployment changed: NO
DESIGN.md changed: NO
data changed: NO
production changed: NO
```

## Deployment identity

The live identity gate returned:

```json
{
  "sha": "e275e53071bbbb519b6e7a4f3805e77038567b54",
  "presentation": "apps/mobile",
  "service_mode": "source-parity",
  "base_path": "/htp-zw"
}
```

Result: **PASS — exact deployment custody confirmed before browser certification.**

## Browser environment

- Runner: GitHub-hosted `ubuntu-latest` (Ubuntu 24.04 family)
- Node.js: `22.23.2`
- Playwright: `1.55.0`
- Chromium: `140.0.7339.16` (Playwright build v1187)
- Device scale factor: `1`

## Viewport matrix

| Surface | Exact viewport | Home resolved | Hero | Top Stories | Horizontal overflow |
| --- | ---: | --- | --- | --- | --- |
| Mobile | 390 × 844 | PASS | PASS | PASS | PASS — 0 px |
| Tablet | 834 × 1112 | PASS | PASS | PASS | PASS — 0 px |
| Desktop | 1440 × 1000 | PASS | PASS | PASS | PASS — 0 px |

All three contexts were fresh browser contexts. Home was loaded, allowed to resolve, reloaded, allowed to resolve again, and then captured.

## Runtime checks

- React #418: **PASS — 0**
- Uncaught page errors: **PASS — 0**
- Console errors: **PASS — 0**
- Home exits `Loading Home…`: **PASS at all three viewports**
- Hero lead region: **PASS at all three viewports**
- Hero image: **present at all three viewports**
- Top Stories: **PASS at all three viewports**
- Service worker: **supported, controlled and active at all three viewports**
- Fatal service-worker error: **none proven**

The initial tooling run `36540876238` at tooling SHA `82a3e525f0edee9ce0eaf4cf583a5d8d80b01dc4` produced a false-negative Hero result because the harness assumed a specific React Native Web link representation. Its screenshot visibly contained the Hero. UI-06 corrected only that certification selector, preserved the failed run, and recertified at exact tooling SHA `148e412b3241fb2152641d358035ffa7c97aa7ae`. No Reader code was changed.

## Responsive checks

### Mobile — 390 × 844

Bottom Reader navigation: **PASS**

Recorded destinations:

1. Home
2. Explore
3. Live
4. Watch
5. My HT

`mobile_tabbar_present = true`, `tab_count = 5`.

### Tablet — 834 × 1112

Observation:

- bottom five-tab navigation: **present**
- top Search / Alerts / Premium utility navigation: **present**
- both models visible: **yes**

This is recorded as visual/product debt rather than a Phase 0 runtime failure.

### Desktop — 1440 × 1000

`desktop_mobile_tabbar_present = false`

Result: **PASS — mobile bottom navigation is suppressed on desktop.**

## Premium reachability

Desktop certification:

- user-facing Premium entry visible: **PASS**
- `/premium` reached through the Reader UI: **PASS**
- Premium page errors during navigation: **0**

This certifies reachability only. It does not certify pricing, store products, entitlement state, or Screen 11 visual conformance.

## Horizontal overflow

| Viewport | document scroll width | body scroll width | viewport width | Result |
| --- | ---: | ---: | ---: | --- |
| Mobile | 390 | 390 | 390 | PASS |
| Tablet | 834 | 834 | 834 | PASS |
| Desktop | 1440 | 1440 | 1440 | PASS |

No material document-level horizontal overflow was observed.

## Media and network observations

- HTTP responses `>= 400`: **0**
- observed `maxresdefault.jpg` failures: **0**
- `requestfailed`: **68**
  - 67 image requests
  - 1 source-feed fetch
  - every failure was browser-level `net::ERR_ABORTED`
  - no corresponding HTTP 4xx/5xx response was recorded
  - no failed core Home journey was proven from these aborts

No media/data blocker is established by this run.

## Non-blocking warnings

Browser console warnings: **6**, all the known Expo notifications Web warning:

```text
[expo-notifications] Listening to push token changes is not yet fully supported on web.
```

This did not break Home, navigation, Premium, or service-worker operation.

The GitHub Actions runner also emitted action-runtime deprecation notices for actions currently targeting Node 20 and being forced to Node 24. Those are CI/tooling maintenance warnings, not Reader browser failures.

## Screen 1 — Home gap register

The exact live screenshots were reviewed against the approved Screen 1 composition and the binding v2 design authority. These are **visual design gaps**, not Phase 0 runtime defects:

### P2 — mobile shell remains too tall

The persistent environment banner plus the full-width Search / Alerts / Premium utility row consume substantial vertical space before editorial content. Screen 1 calls for a compact HealthTimes header and the v2 shell authority explicitly says phone utilities must remain discoverable without becoming a second permanent full-width navigation row.

### P2 — tablet navigation is redundant

At 834 × 1112 the runtime exposes both the five-tab bottom navigation and the top utility navigation. The v2 tablet authority says additional width should be used deliberately and redundant top/bottom navigation should be avoided.

### P3 — environment/status copy remains visually dominant

The development/source-parity/migration-status banner is highly visible on mobile, tablet and desktop. This is useful staging truth but reads as engineering/status language rather than publication chrome.

### P3 — vertical rhythm before Top Stories is loose

Tablet and desktop evidence show a large blank interval between the Hero and Top Stories when no visible Live/direct-ad content occupies that interval. Root cause is not assigned in this certification lane; later UI conformance work should preserve provider/data truth while tightening composition.

### Conforming Screen 1 observations

- editorial filters are present;
- Hero is image-led and visually dominant;
- Top Stories is present;
- the five Reader destinations are present on mobile;
- desktop uses desktop navigation and suppresses the mobile tab bar;
- Premium remains discoverable;
- no document-level overflow is present;
- no active Live rail was required when no verified Live item was rendered.

The approved wireframe asset remains in repository custody at `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`. This Phase 0 lane records gaps only; no redesign was performed.

## Evidence

Artifact root:

`artifacts/ui06/phase0-live-pages/`

Required screenshots:

- `mobile-home.png` — 390 × 844
- `tablet-home.png` — 834 × 1112
- `desktop-home.png` — 1440 × 1000

Nested browser receipts:

- `mobile/browser.json`
- `tablet/browser.json`
- `desktop/browser.json`

Shared evidence:

- `build-info.json`
- `console.json`
- `page-errors.json`
- `network-errors.json`
- `maxresdefault.json`
- `service-worker.json`
- `manifest.json`
- `certification-summary.md`

## Final certification disposition

`UI-06 PHASE 0 HOME BASELINE CERTIFIED — EXACT LIVE PAGES RUNTIME HEALTHY / READY FOR UI-01 HOME CONFORMANCE`

UI-06 stops here and returns control to the UI Moderator. No UI-01 implementation is authorized by this certification.
