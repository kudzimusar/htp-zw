# UI-01 — Screen 1 Home Conformance

## Status

UI-01 bounded implementation is complete at executable candidate:

`c233377d71a6758d080ee3fffbd7c8731daf333a`

This document is the implementation/evidence closure record for Draft PR #42. It does not self-accept the candidate; UI Moderator review remains required.

## Exact identities

- Repository: `kudzimusar/htp-zw`
- Implementation branch: `feat/ui01-home-screen1-conformance`
- Starting/base branch: `deployment/ui-phase0-pages-recovery`
- Starting/base SHA: `e275e53071bbbb519b6e7a4f3805e77038567b54`
- Executable candidate SHA: `c233377d71a6758d080ee3fffbd7c8731daf333a`
- Draft PR: #42 — `UI-01: Screen 1 Home conformance and compact Reader shell`
- Canonical Reader authority: `apps/mobile`
- Design authority: `docs/native-mobile/DESIGN.md` v2
- Approved visual authority: `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`, Screen 1 Home

Pre-mutation branch proof was the exact requested starting SHA `e275e53071bbbb519b6e7a4f3805e77038567b54`.

## Before-state authority

The certified Phase 0 before evidence remains historical and unmodified:

- UI-06 evidence artifact: `ui06-phase0-live-pages-cert`
- Artifact ID: `11020762170`
- Phase 0 deployed recovery SHA: `e275e53071bbbb519b6e7a4f3805e77038567b54`

The baseline Home was functional, but Screen 1 evidence showed the dominant environment banner, a separate mobile Search/Alerts/Premium utility row, wrapping editorial filters, a tall Hero treatment, and optional-slot spacing that could leave excessive blank rhythm.

## Changed files

Executable/runtime and bounded evidence changes from the starting SHA to candidate `c233377...`:

1. `apps/mobile/app/(reader)/index.tsx`
   - single-row horizontally scrollable five-filter treatment;
   - optional Home ad wrappers no longer create section-sized blank gaps when `AdSlot` returns null;
   - Live and Top Stories moved into tighter priority rhythm;
   - later desk presentation varies between compact lists and grids;
   - Premium empty/discovery language is publication-facing;
   - Most Read/Trending is omitted until ranked-data authority exists;
   - edition/opportunity language is publication-facing.

2. `apps/mobile/app/(reader)/_layout.tsx`
   - keeps the same five Reader destinations;
   - reduces mobile/tablet bottom-tab visual weight;
   - preserves desktop tab-bar suppression.

3. `apps/mobile/src/ui/Layout.tsx`
   - removes `EnvironmentBanner` from normal Reader `Page` chrome;
   - preserves the environment component/configuration for operational contexts;
   - consolidates Search, Alerts, Premium and Edition into the compact publication masthead;
   - removes the separate phone utility-card row;
   - preserves 44px-equivalent interaction targets and accessibility labels.

4. `apps/mobile/src/ui/Cards.tsx`
   - introduces hydration-safe responsive Hero composition;
   - phone Hero integrates headline/section/metadata into the image-led composition with a restrained contrast treatment;
   - tablet uses a deliberate split rather than an enlarged phone stack;
   - desktop keeps/refines the image/text split;
   - failed Hero media collapses instead of leaving a permanently broken image surface;
   - compact story thumbnails are denser.

5. `apps/mobile/tests/phase10-visual-conformance.test.mjs`
   - adds UI-01 assertions for compact shell, no normal Reader environment banner, single-row filters, collapsed optional ad wrappers, reader-facing Premium language and Hero media fallback.

6. `apps/mobile/tests/foundation.test.mjs`
   - updates the legacy design-hierarchy assertion to DESIGN.md v2;
   - Most Read/Trending is no longer required when no verified ranking authority exists.

7. `apps/mobile/tests/reader-product.test.mjs`
   - updates the obsolete expectation for the removed `mobileUtilityWrap` and verifies the compact phone action treatment.

8. `.github/workflows/phase10-visual-conformance.yml`
   - narrowly updates the existing evidence harness readiness wait from the deliberately removed environment-banner text to the stable `HealthTimes Home` accessibility label;
   - no competing evidence system was created.

No service/data implementation file changed.

## Screen 1 implementation decisions

### Shared shell

The normal Reader no longer renders the full-width engineering environment banner. HealthTimes identity, Edition, Search, Alerts and Premium now occupy one compact masthead. Environment truth itself was not deleted.

### Editorial filters

For You, Latest, current Edition, World and Health remain functional and accessible in one horizontal row. The row can scroll horizontally if needed and does not wrap into a second standard-phone row.

### Hero

The Hero remains source-backed. Phone presentation removes the long standfirst from the initial Hero composition and integrates the headline with the media area when usable media exists. Tablet and desktop retain deliberate split layouts. Image-load failure is handled without fabricating replacement media.

### Live

Home continues to show only items with `status === "live"`. If no verified Live content exists, the module is absent and contributes no empty vertical block.

### Advertising / HOSPAZ

The Home layout no longer wraps nullable ad decisions in unconditional `Section` spacing. Advertising authority, placement keys, provider decisions, targeting and HOSPAZ destination truth were not changed.

Exact staging evidence confirms HOSPAZ remains:

- advertiser: `HOSPAZ`
- placement: `hospaz-header-direct`
- source attachment: `33005`
- destination: UNKNOWN / null
- schedule: UNKNOWN / null
- placement conditions: UNKNOWN / null
- clickable: NO

### Top Stories and later feed

Top Stories follows the Hero/actually-rendered priority modules materially earlier. It remains a compact story list and becomes two-column at desktop through the existing responsive primitive. Later Home desks intentionally alternate between compact lists and image-led grids rather than repeating one grid pattern throughout.

### Premium

Premium Intelligence remains first-class and routes to `/premium`. Existing source-backed Premium stories retain their badge/access policy. When no Premium stories are present in the bounded Home feed, reader-facing discovery copy and a truthful Premium CTA replace engineering language. No offer, price, trial, product or entitlement was invented.

## Responsive result

### Mobile PWA — 390 × 844

Exact candidate evidence shows:

- no dominant environment banner;
- compact HealthTimes masthead;
- Search, Alerts, Edition and Premium discoverable;
- no three-card utility row;
- all five editorial filters in one row;
- Hero dominant with reduced metadata journey;
- no optional Live/ad dead gap in source-parity state;
- Top Stories begins within the initial journey;
- persistent five-destination bottom navigation present;
- no React #418 regeneration error or page error in the exact-head capture.

Screenshot: `phase10-evidence/after/web/mobile-home.png`.

### Tablet PWA — 834 × 1112

Exact candidate evidence shows:

- compact shared masthead without environment banner;
- no duplicate top utility-card row;
- deliberate Hero split;
- Top Stories follows without the previous large optional-slot gap;
- Premium remains in the shell;
- five Reader destinations remain available through the tablet bottom navigation;
- no React #418 regeneration error or page error.

Screenshot: `phase10-evidence/after/web/tablet-home.png`.

### Desktop PWA — 1440 × 1000

Exact candidate evidence shows:

- coherent publication masthead + desktop Reader navigation;
- no mobile bottom tab bar;
- compact Search/Alerts/Premium utilities;
- no environment engineering banner;
- Hero remains editorially dominant;
- no large optional-slot blank gap before Top Stories;
- dense two-column Top Stories;
- no React #418 regeneration error or page error.

Screenshot: `phase10-evidence/after/web/desktop-home.png`.

## Exact-head evidence

### UI-01 candidate visual workflow

- Workflow run: `36674235083`
- Executable SHA: `c233377d71a6758d080ee3fffbd7c8731daf333a`
- Web/PWA candidate job: PASS
- Artifact: `phase10-candidate-web-pwa-screenshots`
- Artifact ID: `11079043796`
- SHA-256: `ff53a177517c273c7e908ccc832e153daf902bda3bf63cf687092a3a91de50b9`

The manifest covers mobile 390×844, tablet 834×1112 and desktop 1440×1000 across Home and the required shared Reader smoke routes. All captured routes returned HTTP 200 and recorded zero React #418 hydration-regeneration warnings.

### Final Web/PWA evidence workflow

- Workflow run: `36674235074`
- Result: PASS
- Exact executable SHA: `c233377d71a6758d080ee3fffbd7c8731daf333a`

### Chromium UAT

- Workflow run: `36674235147`
- Result: PASS

### Reader / Premium / HOSPAZ regression workflows

- AG-05 + NM-07 Phase 7 Premium + HOSPAZ run `36674235137`: PASS
- NM-07 Phase 6 Migrated Corpus Reader run `36674235078`: PASS
- Validate canonical Reader + protected operations run `36674235064`: PASS

## Required tests

At exact executable candidate `c233377...`:

- `npm run native:check` — PASS in the successful Reader/Premium regression workflows; TypeScript/expo dependency check green.
- `npm --prefix apps/mobile run test:reader-product` — PASS.
- `npm --prefix apps/mobile run test:reader-fidelity` — PASS.
- `npm --prefix apps/mobile run test:source-parity` — PASS.
- `npm --prefix apps/mobile run test:premium-hospaz` — PASS.
- `node --test apps/mobile/tests/phase10-visual-conformance.test.mjs` — PASS in the candidate Web/PWA visual job.
- `npm run native:export:web` — PASS; exact-head static Web/PWA export and screenshot evidence completed.

The broader Native Mobile workflow also executes a live staging-connectivity test. On this candidate it reported an external current-staging projection assertion failure: the expected minimized public story projection was not exposed at that moment. Auth reachability and migrated-media reachability passed. UI-01 did not change staging/service/data authority, and this task is not authorized to repair that external service state.

## Cross-surface regression result

Exact-head Web/PWA evidence and Chromium UAT exercised Home, Explore, Search, Article, Live, Watch, Listen, Saved, My HealthTimes, Edition, Premium, Notifications, Onboarding and Studio. The UI-01 task did not redesign those non-Home surfaces.

Desktop mobile-tab suppression remained enforced; mobile tab routes retained at least five tabs.

## Authority preservation

```
migration/data authority changed: NO
Premium security changed: NO
advertising provider authority changed: NO
HOSPAZ destination inferred: NO
COM changed: NO
Studio changed: NO
production changed: NO
public Pages deployment changed: NO
```

No `source-parity.ts`, `migrated-corpus.ts`, staging service implementation, Supabase RPC, Premium entitlement, billing, COM, Studio implementation, `.github/workflows/pages.yml`, DNS or production deployment mutation was made.

## Accessibility / hydration

- Hero remains an accessible article link.
- Search, Notifications, Edition and Premium retain explicit accessible labels.
- Editorial filters retain selected-state semantics through `Chip`.
- Compact header controls retain the shared minimum touch-target contract.
- Responsive Hero logic uses a web hydration gate before structural viewport adaptation.
- Exact-head Playwright evidence records zero React #418 regeneration warnings.

## Remaining findings

### P0

None proven.

### P1

None proven in the UI-01 Home/shared-shell candidate.

### P2 — source-backed Hero media presentation

Exact source-parity screenshots show the current Hero media surface as a neutral/blank source-backed region on tablet/desktop rather than a visible editorial photograph. UI-01 now collapses explicit image-load failures, but it does not fabricate or substitute imagery when the authoritative media source itself does not yield a useful image. Media/service authority is outside this bounded UI task and should be reviewed by the relevant AG/NM media authority if the moderator confirms the source asset is invalid.

### P3

Tablet retains the five-destination bottom tab bar while also exposing compact top utilities. The previous redundant utility-card row is removed, but a later native/tablet adaptation lane may refine navigation further if authorized.

### External programme CI finding — not a UI-01 mutation

The Native Mobile umbrella/readiness workflow currently reports the live staging minimized-public-projection assertion described above. The dedicated UI/Reader/Premium/HOSPAZ/Chromium evidence gates required for this candidate are otherwise green. UI-01 did not alter or weaken that staging test.

## Production/deployment mutation statement

UI-01 did not deploy the candidate to the public GitHub Pages surface. The certified Phase 0 public baseline remains unchanged pending UI Moderator review and a separately authorized candidate deployment/certification step.

## Implementation disposition

`UI-01 SCREEN 1 HOME CONFORMANCE IMPLEMENTATION COMPLETE — EXACT-HEAD MOBILE / TABLET / DESKTOP EVIDENCE READY FOR UI MODERATOR REVIEW`

This is an implementation handback, not moderator acceptance and not release of the next UI phase.
