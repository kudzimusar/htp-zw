# UI-06 UI-03 Phase 2 Live Commercial Reader Certification

## 1. Exact identities

- Repository: `kudzimusar/htp-zw`
- Role: UI-06 Visual Evidence / Live Runtime Certification
- Certification branch: `test/ui06-ui03-phase2-live-cert`
- Carrier PR: `#46 — UI-06: Phase 2 live commercial Reader certification`
- PR state at closure: Open / Unmerged
- Certification starting wrapper: `8611beb08a9cc43accc9109457ed48901c3daaf1`
- Live deployment wrapper: `8611beb08a9cc43accc9109457ed48901c3daaf1`
- Underlying accepted UI-03 executable: `6cbfcaa9ee6c06e25f59c99eb21bf86211990605`
- UI-03 documentation closure: `db9eebb7fef6b8ee9f3d784d14f1f5394a234499`
- Controlling certification tooling SHA: `5d8630a1d7049746f86a1592787b83cac2f8ae98`
- Controlling workflow run: `36941182772` — SUCCESS
- Controlling job: `110632782378 — certify-live-commercial-reader` — SUCCESS
- Evidence artifact: `ui06-ui03-phase2-live-cert`
- Artifact ID: `11199609201`
- Artifact SHA-256: `c23576b7083abde2b68f00d371ab637d8d958ba887bca6d1ec2c4fe5e15c5330`

The certification tooling SHA above is the exact PR head checked out and proven by the workflow. A prior generated report incorrectly printed GitHub's synthetic pull-request merge SHA in that field; this documentation closure corrects that identity from the machine-readable artifact manifest. No runtime evidence is reassigned across SHAs.

## 2. Deployment identity

Live `/build-info.json` matched the authorized wrapper exactly:

```json
{
  "sha": "8611beb08a9cc43accc9109457ed48901c3daaf1",
  "presentation": "apps/mobile",
  "service_mode": "source-parity",
  "base_path": "/htp-zw"
}
```

Public certification surface:

`https://kudzimusar.github.io/htp-zw/`

Deployment custody did not move during certification.

## 3. Browser environment

- Runner: `GitHub Actions 1000111394`
- OS: `linux 6.17.0-1022-azure`
- Node: `v22.23.3`
- Playwright: `1.55.0`
- Chromium: `140.0.7339.16`
- Device scale factor: `1`
- Mobile viewport: `390 × 844`
- Tablet viewport: `834 × 1112`
- Desktop viewport: `1440 × 1000`

The harness exercised the live GitHub Pages deployment directly. It did not rebuild the Reader locally.

## 4. Public Article

Route:

`/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks`

| Viewport | HTTP / resolved | Hero intrinsic | Hero rendered | Toolbar | React #418 | Page errors | Overflow | Screenshot |
|---|---|---:|---:|---|---:|---:|---|---|
| Mobile 390×844 | 200 / YES | 1200×665 | 358×201 | PASS | 0 | 0 | NO | `article/mobile-public.png` |
| Tablet 834×1112 | 200 / YES | 1200×665 | 786×442 | PASS | 0 | 0 | NO | `article/tablet-public.png` |
| Desktop 1440×1000 | 200 / YES | 1200×665 | 1116×628 | PASS | 0 | 0 | NO | `article/desktop-public.png` |

Certified Hero:

`https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg`

At all three viewports:

- Hero completed with non-zero intrinsic and rendered dimensions;
- Back, Text size, Save article, Listen to article, Share article and Offline were semantically discoverable;
- Offline remained secondary to the primary toolbar;
- reader-facing copy guard passed: no source-parity / fixture / canonical / migration implementation language leaked into the Article surface;
- Article hierarchy resolved with section identity, headline, standfirst/byline/publication metadata and body;
- document-level horizontal overflow was absent;
- service worker was registered, active and controlling;
- desktop did not expose the mobile bottom navigation.

## 5. Premium Article security and paywall

Route:

`/article/source-us-embassy-challenges-zimbabwe-rejected-health-mou`

Fresh anonymous / non-entitled browser contexts were used.

| Check | Mobile | Desktop |
|---|---|---|
| HTTP / resolved | 200 / YES | 200 / YES |
| Anonymous | true | true |
| Entitled | false | false |
| Paywall visible | true | true |
| Protected body present in DOM | false | false |
| Protected body network retrieval | false | false |
| Protected content requests | 0 | 0 |
| Preview timer active | false | false |
| Preview duration observed | 0 seconds | 0 seconds |
| Preview configuration | fail-closed | fail-closed |
| React #418 | 0 | 0 |
| Page errors | 0 | 0 |
| Horizontal overflow | NO | NO |

Screenshots:

- `premium-article/mobile-live-state.png`
- `premium-article/desktop-live-state.png`
- `premium-article/mobile-paywall.png`
- `premium-article/desktop-paywall.png`

The anonymous security boundary passes. Full member content was neither rendered nor obtained through the normal anonymous network journey.

The paywall rendered the Premium identity and conversion/member paths without inventing price, currency, trial, discount, product ID or entitlement state.

## 6. Premium live commercial behavior

Observed live state:

```text
preview_timer_active = false
preview_duration_observed = 0
preview_configuration_state = fail-closed
commercial_preview_duration_configured = false
commercial_preview_policy_status = owner-duration-not-configured
```

This is **not a security defect**. It is the expected fail-closed behavior when the public Pages build has no configured non-zero preview duration.

It is, however, a material commercial activation gap relative to the requested journey of a short preview before the paywall.

**P2 — COMMERCIAL ACTIVATION GAP: NON-ZERO PREMIUM PREVIEW DURATION NOT CONFIGURED ON PUBLIC CERTIFICATION BUILD.**

UI-06 did not inject, infer or change a preview duration.

## 7. Premium landing

Route:

`/premium`

| Viewport | Resolved | Premium stories | Store reader state | Price visible | Restore | Member sign-in | Overflow |
|---|---|---:|---|---|---|---|---|
| Mobile | YES | 3 | `membership-options-unavailable` | false | true | true | NO |
| Tablet | YES | 3 | `membership-options-unavailable` | false | true | true | NO |
| Desktop | YES | 3 | `membership-options-unavailable` | false | true | true | NO |

Screenshots:

- `premium/mobile.png`
- `premium/tablet.png`
- `premium/desktop.png`

The landing page showed clear Premium identity, source-backed Premium journalism, truthful unavailable-offer state, and member sign-in/restore affordances.

Reader-facing UI did not expose `configuration-required`, `on this build`, `approved store` or `secure member service`.

No unverified price, discount, trial or recommended-plan claim was rendered.

## 8. Dark appearance

Dark mode was selected through the actual HealthTimes `/appearance` control before each dark-state journey.

Certified mobile screenshots:

- `dark/article-mobile.png`
- `dark/premium-paywall-mobile.png`
- `dark/premium-landing-mobile.png`

Results:

- Article resolved in dark appearance;
- Hero and toolbar resolved;
- Discussion was explicitly brought into evidence and `discussion_fixed_light = false`;
- Premium paywall resolved dark with protected body absent;
- Premium landing resolved dark with 3 Premium stories and truthful no-offer state;
- React #418 = 0;
- page errors = 0;
- document-level horizontal overflow = false.

## 9. Advertising / HOSPAZ

Public Pages source-parity state was truthful at all three viewports:

| Viewport | advertising_source | Ad visible | HOSPAZ present | Blank/dead ad gap |
|---|---|---|---|---|
| Mobile | `none` | false | false | false |
| Tablet | `none` | false | false | false |
| Desktop | `none` | false | false | false |

Evidence:

- `advertising/mobile-source-parity.png`
- `advertising/tablet-source-parity.png`
- `advertising/desktop-source-parity.png`

**P4 — HOSPAZ NOT PRESENT ON PUBLIC SOURCE-PARITY RUNTIME.**

This is not a rendering failure. The certification contract explicitly permits truthful `source: none` collapse. No advertiser state, destination, campaign, targeting or performance data was fabricated.

The accepted staging HOSPAZ authority remains unchanged and was not reconfigured by UI-06.

## 10. Home / shared-shell regression and route smoke

The live regression smoke covered:

- `/`
- `/explore`
- `/search`
- `/live`
- `/watch`
- `/my`
- `/appearance`

All routes resolved HTTP 200 with no React #418, no page error and no document-level horizontal overflow.

Home regression evidence:

- `home/mobile-regression.png`
- `home/desktop-regression.png`

The harness required Top Stories to resolve, mobile five-tab navigation to remain present, and desktop mobile tabs to remain absent.

One out-of-scope Watch media defect remains:

**P3 — Watch media/resource debt**

`https://img.youtube.com/vi/8K9nxwmj-1k/maxresdefault.jpg`

returned HTTP `404`.

The Watch route itself remained HTTP 200, without React #418, pageerror or document overflow. UI-06 did not alter Watch.

## 11. Console, network and service worker

Controlling certification results:

- React #418 count across certified primary results: `0`;
- pageerror count: `0`;
- primary Article/Premium/Premium-landing console errors: `0`;
- aggregate console error count: `1`, attributable to the out-of-scope Watch thumbnail HTTP 404;
- aggregate HTTP resource error count: `1`, the same Watch thumbnail;
- service worker registered: `true`;
- service worker controlling: `true`;
- service worker state on certified primary surfaces: `active`.

Known non-blocking warning repeated on Web:

`[expo-notifications] Listening to push token changes is not yet fully supported on web. Adding a listener will have no effect.`

Live WordPress refresh requests also produced bounded `net::ERR_ABORTED` observations while the deterministic source-parity runtime still resolved the certified content and critical media. They did not produce a certified-surface page error, React #418, overflow or missing critical Hero in the controlling run.

## 12. Certification history / transient non-controlling run

Earlier tooling/run:

- tooling SHA: `43f13ab29cf46e8fea043f2fabf48a414db178a9`;
- run: `36940443644`;
- result: stopped on a transient Article Hero media failure where the external image endpoint returned HTTP 415.

That run is **not** the controlling certification result.

The later exact-head controlling run `36941182772` at tooling SHA `5d8630a1...` successfully loaded the same Hero at all three required viewports with intrinsic dimensions `1200×665` and zero Article HTTP resource errors. The transient observation is retained as history but is not promoted to a final P1 defect.

## 13. Evidence manifest

Controlling artifact:

- name: `ui06-ui03-phase2-live-cert`;
- artifact ID: `11199609201`;
- size: `3,184,072 bytes`;
- digest: `sha256:c23576b7083abde2b68f00d371ab637d8d958ba887bca6d1ec2c4fe5e15c5330`;
- workflow run: `36941182772`;
- exact head: `5d8630a1d7049746f86a1592787b83cac2f8ae98`.

Artifact includes:

- `identity/build-info.json`;
- `manifest.json`;
- `summary.md`;
- `console.json`;
- `network.json`;
- `service-worker.json`;
- `premium-security.json`;
- `premium-commercial-policy.json`;
- `advertising.json`;
- all required Article, Premium Article, Premium landing, dark and Home regression screenshots.

## 14. Findings by severity

### P0

None proven.

Premium protected content remained withheld from anonymous DOM and normal anonymous network retrieval.

### P1

None proven in the controlling exact-head run.

Article, Premium Article/paywall, Premium landing, dark appearance and the shared shell remained usable without React #418 or page errors.

### P2

**Commercial activation gap — non-zero Premium preview duration is not configured on the public certification build.**

Security/runtime passes fail-closed, but the requested short-preview-then-paywall commercial behavior is not live.

### P3

**Watch media/resource debt** — `maxresdefault.jpg` for YouTube ID `8K9nxwmj-1k` returns HTTP 404. Outside UI-03 ownership.

### P4

- HOSPAZ absent on public source-parity runtime with clean no-ad collapse.
- Known Expo notifications Web listener warning.

## 15. Authority preservation

- apps/mobile changed: NO
- Pages workflow changed: NO
- deployment changed: NO
- DESIGN.md changed: NO
- Premium service changed: NO
- Premium preview configuration changed: NO
- store products/pricing changed: NO
- HOSPAZ authority changed: NO
- advertising provider activated: NO
- staging changed: NO
- COM changed: NO
- Studio changed: NO
- main changed: NO
- PR #42 merged: NO
- PR #43 merged: NO
- production changed: NO

UI-06 changed only its bounded certification workflow/script and this certification report.

## 16. Recommended moderator disposition

The controlling live evidence supports **technical/security certification** of the deployed Phase-2 commercial Reader experience:

- Article responsive runtime passes;
- critical Hero media resolves;
- toolbar/accessibility contract passes;
- Premium anonymous security boundary passes;
- fail-closed paywall works;
- Premium landing is truthful and populated;
- dark appearance passes;
- advertising state is truthful;
- Home/shared-shell regression smoke passes;
- React #418 and page errors are absent.

Do **not** reopen UI-03 implementation on the basis of this certification.

Do **not** claim the complete requested timed commercial journey is activated yet. The next bounded owner/moderator decision is to select/authorize a non-zero Premium preview duration if the desired commercial policy remains “short preview, then paywall.”

Return the separate Watch thumbnail 404 to the appropriate Watch/media lane; it does not invalidate UI-03 Article/Premium certification.

## Final disposition

UI-06 PHASE 2 LIVE COMMERCIAL READER TECHNICALLY CERTIFIED — PREMIUM SECURITY / ARTICLE / PREMIUM UI PASS, BUT NON-ZERO COMMERCIAL PREVIEW DURATION IS NOT CONFIGURED

---

## 17. UI Moderator advertising-evidence recertification addendum

During independent moderator inspection of artifact `11199609201`, the original `advertising/*-source-parity.png` captures were found to have been taken before Home resolved: the screenshots still displayed `Loading Home…`. The original harness also wrote `ad_gap_present:false` without actually measuring that state. This was an evidence-harness defect, not a Reader implementation defect.

A bounded moderator correction was applied only to:

`scripts/ui/ui06-ui03-phase2-live-cert.mjs`

Moderator tooling SHA:

`be755592987e5d947ba6a3a5031b4f1a83a671be`

The correction requires:

- live Home to resolve;
- `Top Stories` to be visibly present;
- `Loading Home…` to be absent;
- advertising/HOSPAZ presence to be assessed only after resolution;
- the resolved `Top Stories` position to be recorded;
- no fabricated `ad_gap_present:false` value.

Superseding exact-head certification run:

`36945899530` — **SUCCESS**

Job:

`110647838922` — **SUCCESS**

Superseding evidence artifact:

`11202605291`

Artifact digest:

`sha256:828e99f26273e41b90f5b22b5fdae143ddc3f4a4deb7b82a44b03bcc32e33541`

The resolved advertising evidence records:

| Viewport | Home resolved | Top Stories visible | Top Stories top | advertising_source | HOSPAZ | HTTP resource errors |
|---|---|---|---:|---|---|---:|
| 390×844 | true | true | 438px | `none` | false | 0 |
| 834×1112 | true | true | 535px | `none` | false | 0 |
| 1440×1000 | true | true | 621px | `none` | false | 0 |

The screenshots now show resolved editorial Home content rather than the loading skeleton. No Advertisement disclosure, HOSPAZ unit, or empty advertisement placeholder is present on the public source-parity runtime.

This addendum supersedes only the original advertising evidence identity. It does not change the already-certified Article, Premium security, Premium landing, Dark, Home regression, service-worker, Watch-media or commercial-preview-policy findings.

### Final technical certification after moderator recertification

The live Phase-2 Reader remains technically/security certified at deployment wrapper:

`8611beb08a9cc43accc9109457ed48901c3daaf1`

underlying executable:

`6cbfcaa9ee6c06e25f59c99eb21bf86211990605`

with the following unresolved commercial-policy finding:

**P2 — the public build has no configured non-zero Premium preview duration.**

The secure fail-closed immediate paywall remains active. This is not a security defect, but it means the requested `short preview → paywall` commercial policy is not yet activated on the live certification build.
