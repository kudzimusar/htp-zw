# UI-03 Phase 2 Commercial Reader Conformance — Moderator Closure

## Exact identities

- Repository: `kudzimusar/htp-zw`
- Lane: `UI-03 — Article / Premium / Advertising`
- Branch: `feat/ui03-article-premium-advertising-conformance`
- PR: `#43 — UI-03: Article, Premium and responsive advertising conformance`
- PR state at closure: Draft / Open / Unmerged
- Accepted Phase-1 base: `4038f1536b1611b2ee6d9082f90d5d78457ab676`
- Accepted Phase-2 executable candidate: `6cbfcaa9ee6c06e25f59c99eb21bf86211990605`
- Pre-moderator-fix evidence candidate: `33ac595433740f6abbdda717d11970a8d32566f1`
- Successful exact-head UI-03 run: `36811702772`
- Evidence artifact: `ui03-commercial-reader-conformance`
- Artifact ID: `11139134587`
- Artifact SHA-256: `aedede25e2d6f2e35862f887a32b62f7ffba79795fa53098645c59550d8a3ca0`

The executable identity remains `6cbfcaa9...`. This report is documentation-only and must not be substituted for the executable candidate in visual/runtime certification.

## Moderator disposition

**ACCEPTED — UI-03 PHASE 2 COMMERCIAL READER CONFORMANCE CLOSED FOR EXACT-HEAD IMPLEMENTATION / READY FOR BOUNDED CANDIDATE DEPLOYMENT AND LIVE UI-06 CERTIFICATION.**

Acceptance covers the shared Reader/Web-PWA Article, Premium and advertising presentation implemented in this lane. It does not merge PR #43, alter public Pages, activate commerce providers, or close unrelated native/staging programme debt.

## Scope closed

Phase 2 closes the approved wireframe targets:

- Screen 4 — Article Reader;
- Screen 11 — Premium;
- Screen 12 — responsive advertising language.

Screen 1 Home remains the previously accepted UI-01 authority and was only smoke-tested for regression.

## Article Reader

The accepted candidate provides:

- compact icon-led Article toolbar;
- Back, text size, Save, Listen and Share as primary actions;
- Offline retained as a secondary action;
- accessible labels and minimum touch-target contract preserved;
- source-backed Hero media with deterministic readiness evidence;
- section/Premium identity;
- publication-quality headline/standfirst/byline hierarchy;
- controlled reading width and body rhythm;
- reading-time derivation only where authorized body content exists;
- Save, Listen, Share, Offline, reading-history, read-position, related coverage and discussion capabilities preserved;
- internal source-bridge media provenance filtered from reader-facing credit;
- reader-facing Discussion fallback copy that does not expose source-parity/canonical/migration implementation terminology;
- ReaderDiscussion presentation bound to the active appearance palette rather than fixed light-only colors.

## Premium security and preview

The protected-content boundary is preserved:

- public/source-parity Premium delivery keeps protected `bodyHtml` unavailable;
- anonymous/non-entitled readers do not request `getProtectedArticle()`;
- anonymous protected body is not rendered in DOM;
- entitlement-verified protected delivery remains the only route to the full member body.

Premium preview behavior:

- explicit configuration through the existing Phase-2 preview configuration;
- fail-closed behavior when preview duration is invalid/unavailable;
- evidence uses 4 seconds only as CI certification configuration;
- the 4-second value is **not** accepted as final commercial policy;
- duplicate standfirst/excerpt preview copy is suppressed;
- preview transitions to the dedicated Premium paywall;
- Premium lifecycle analytics retain configured elapsed-time semantics.

Evidence records:

- `protected_body_requested: false`;
- `protected_body_present_in_dom: false`;
- `anonymous_full_protected_body_received: false`;
- `anonymous_full_protected_body_rendered: false`.

## Premium landing

The accepted Premium landing:

- separates loading, error, populated and true-empty Premium journalism states;
- resolves source-backed Premium journalism before evidence capture;
- recorded 3 source-backed Premium stories in the accepted source-parity evidence;
- uses reader-facing commercial copy rather than build/provider terminology;
- preserves real storefront state;
- does not expose `configuration-required` as reader copy;
- recorded `offer_count: 0`;
- recorded `invented_price: false`;
- does not invent price, product IDs, trial, discount, currency or recommended-plan claims;
- preserves restore and existing-member sign-in paths;
- retains benefits only within implemented/authorized product capabilities.

## Advertising / HOSPAZ

The accepted responsive advertising implementation preserves:

- service decision authority;
- source-none/no-creative collapse without giant empty placeholders;
- clear Advertisement disclosure;
- responsive mobile/tablet/desktop presentation;
- creative aspect-ratio preservation;
- verified-HTTPS destination requirement;
- no click event before destination verification;
- `consentForPersonalizedAds:false` in sensitive-health contexts.

HOSPAZ exact accepted evidence:

- advertiser: HOSPAZ;
- placement: `hospaz-header-direct`;
- creative complete: true;
- creative natural dimensions: 1200 × 400;
- destination verified: false;
- clickable: false;
- personalization: none;
- sensitive-health context preserved.

No destination, schedule, campaign condition, targeting or performance data was invented.

## Dark-mode evidence

Dark mode is certified through the actual HealthTimes Appearance preference, not browser color-scheme emulation alone.

Accepted evidence includes:

- resolved dark public Article;
- resolved dark Premium paywall;
- resolved dark Premium landing;
- `appearance_preference: dark`;
- no loading-only screenshots accepted;
- React #418: 0;
- page errors: 0;
- document-level horizontal overflow: false on certified targets.

The final moderator patch also made ReaderDiscussion use the active appearance palette so the Article surface does not revert to a fixed white Discussion panel below the initial viewport.

## Media readiness evidence

Public Article Hero readiness is proven at:

- mobile 390×844;
- tablet 834×1112;
- desktop 1440×1000.

Accepted Hero source:

`https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg`

Recorded intrinsic dimensions:

`1200 × 665`

All three certified viewports record:

- `hero_media_present: true`;
- `hero_media_complete: true`;
- non-zero intrinsic dimensions;
- non-zero rendered bounds.

HOSPAZ creative capture likewise waits for completed intrinsic media rather than screenshotting an empty creative shell.

## Exact-head programme receipts at 6cbfcaa9

- UI-03 Commercial Reader Conformance — run `36811702772` — SUCCESS
- Chromium UAT — run `36811702828` — SUCCESS
- Validate Canonical Reader + Protected Operations — run `36811702823` — SUCCESS
- NM-07 Phase 6 Migrated Corpus Reader — run `36811703009` — SUCCESS
- Phase 10 Web/PWA Evidence — run `36811702957` — SUCCESS
- Native Mobile umbrella — run `36811702766` — SUCCESS

AG-05 + NM-07 Premium/HOSPAZ run `36811702779` has a successful `Premium + HOSPAZ convergence and regression matrix` job, but the separate read-only staging-authority job failed at `ag05_public_sitemap_xml` with HTTP 500. That staging RPC failure is not caused by the UI-03 executable and is not remediated in this lane.

## Evidence artifact contents

Artifact `11139134587` contains:

### Article

- `article/mobile-public.png`
- `article/tablet-public.png`
- `article/desktop-public.png`
- `article/mobile-premium-preview.png`
- `article/desktop-premium-preview.png`
- `article/mobile-premium-paywall.png`
- `article/desktop-premium-paywall.png`

### Premium

- `premium/mobile.png`
- `premium/tablet.png`
- `premium/desktop.png`

### Dark

- `dark/article-mobile.png`
- `dark/premium-paywall-mobile.png`
- `dark/premium-landing-mobile.png`

### Advertising

- `advertising/mobile-hospaz-direct.png`
- `advertising/tablet-hospaz-direct.png`
- `advertising/desktop-hospaz-direct.png`

### Structured evidence

- `manifest.json`
- `premium-preview.json`
- `advertising.json`
- `accessibility.json`
- `summary.md`

## Remaining findings / programme debt

### P0

None proven.

### P1

None proven in the accepted UI-03 Article/Premium/advertising candidate.

### P2

None remaining within the certified UI-03 surfaces.

### P3

- Production Premium preview duration remains a commercial-policy decision; only the configurable mechanism is accepted.
- Store products/pricing remain unavailable until authoritative commerce configuration exists.
- A Watch-route media/resource 404 remains visible in UI-03 cross-route smoke evidence; it is outside the Article/Premium/advertising conformance lane and should be routed with the later media/Watch work if still reproducible live.

### External programme issue

The read-only staging Premium/HOSPAZ authority run currently fails because `ag05_public_sitemap_xml` returned HTTP 500. This is a staging/public-authority problem and must not be repaired by weakening UI-03, Premium security or advertising logic.

## Authority preservation

- Premium security weakened: NO
- protected body sent to anonymous Reader: NO
- protected body rendered anonymously: NO
- Premium service contract changed: NO
- store prices invented: NO
- store product IDs invented: NO
- trial invented: NO
- discount invented: NO
- advertising provider activated: NO
- HOSPAZ destination inferred: NO
- migration/data authority changed: NO
- COM changed: NO
- Studio changed: NO
- production changed: NO
- public Pages deployment changed: NO
- Screen 1 Home materially redesigned: NO
- PR #43 merged: NO

## Next programme step

Do not begin UI-04 or merge PR #43 from this closure.

The next authorized progression is:

1. AG-02 — bounded deployment of accepted UI-03 executable `6cbfcaa9...` to the GitHub Pages certification surface using executable-equivalent wrapper custody;
2. UI-06 — independent live-browser certification of Article / Premium / HOSPAZ against that wrapper;
3. only after live certification, UI Moderator final commercial-journey closure and release of the next UI phase.

## Completion statement

`ACCEPTED — UI-03 PHASE 2 COMMERCIAL READER CONFORMANCE CLOSED AT EXECUTABLE 6cbfcaa9ee6c06e25f59c99eb21bf86211990605 / READY FOR BOUNDED DEPLOYMENT + UI-06 LIVE CERTIFICATION`
