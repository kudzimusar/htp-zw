# UI-06 UI-03 Phase 2 Live Commercial Reader Certification

## Exact identities

- Repository: `kudzimusar/htp-zw`
- Certification branch: `test/ui06-ui03-phase2-live-cert`
- Certification starting wrapper: `8611beb08a9cc43accc9109457ed48901c3daaf1`
- Certification tooling SHA: `2ea2a6bb82b89a01c58fdef397f83a438a941e7a`
- Documentation closure SHA: `db9eebb7fef6b8ee9f3d784d14f1f5394a234499`
- Live deployment wrapper: `8611beb08a9cc43accc9109457ed48901c3daaf1`
- Underlying accepted UI-03 executable: `6cbfcaa9ee6c06e25f59c99eb21bf86211990605`
- Workflow run: `36941182772`
- Evidence artifact: `ui06-ui03-phase2-live-cert`

## Deployment identity

- build-info SHA: `8611beb08a9cc43accc9109457ed48901c3daaf1`
- public URL: `https://kudzimusar.github.io/htp-zw`

## Browser environment

- Browser: chromium 140.0.7339.16
- Playwright: 1.55.0
- Node: v22.23.3
- Runner: GitHub Actions 1000111394
- OS: linux 6.17.0-1022-azure
- Device scale factor: 1

## Article

| Viewport | Hero | Intrinsic | Rendered | #418 | Page errors | Overflow | Screenshot |
|---|---|---|---|---:|---:|---|---|
| mobile | PASS | 1200×665 | 358×201 | 0 | 0 | PASS | `article/mobile-public.png` |
| tablet | PASS | 1200×665 | 786×442 | 0 | 0 | PASS | `article/tablet-public.png` |
| desktop | PASS | 1200×665 | 1116×628 | 0 | 0 | PASS | `article/desktop-public.png` |

## Premium security and live commercial behavior

### mobile

- anonymous: `true`
- entitlement_state: `false`
- paywall_visible: `true`
- protected_body_present_in_dom: `false`
- protected_body_network_retrieval: `false`
- preview_timer_active: `false`
- preview_duration_observed: `0`
- preview_configuration_state: `fail-closed`

### desktop

- anonymous: `true`
- entitlement_state: `false`
- paywall_visible: `true`
- protected_body_present_in_dom: `false`
- protected_body_network_retrieval: `false`
- preview_timer_active: `false`
- preview_duration_observed: `0`
- preview_configuration_state: `fail-closed`

- commercial_preview_duration_configured: `false`
- commercial_preview_policy_status: `owner-duration-not-configured`

## Premium landing

- mobile: stories=3, store_state=`membership-options-unavailable`, price_visible=`false`, restore=`true`, member_sign_in=`true`, screenshot=`premium/mobile.png`
- tablet: stories=3, store_state=`membership-options-unavailable`, price_visible=`false`, restore=`true`, member_sign_in=`true`, screenshot=`premium/tablet.png`
- desktop: stories=3, store_state=`membership-options-unavailable`, price_visible=`false`, restore=`true`, member_sign_in=`true`, screenshot=`premium/desktop.png`

## Dark appearance

- dark_article: viewport=mobile, #418=0, page_errors=0, overflow=false, screenshot=`dark/article-mobile.png`
- premium_article: viewport=mobile, #418=0, page_errors=0, overflow=false, screenshot=`dark/premium-paywall-mobile.png`
- premium_landing: viewport=mobile, #418=0, page_errors=0, overflow=false, screenshot=`dark/premium-landing-mobile.png`

## Advertising / HOSPAZ

- mobile: advertising_source=`none`, HOSPAZ_present=`false`, ad_gap_present=`false`, screenshot=`advertising/mobile-source-parity.png`
- tablet: advertising_source=`none`, HOSPAZ_present=`false`, ad_gap_present=`false`, screenshot=`advertising/tablet-source-parity.png`
- desktop: advertising_source=`none`, HOSPAZ_present=`false`, ad_gap_present=`false`, screenshot=`advertising/desktop-source-parity.png`

## Runtime

- React #418 count: `0`
- Page error count: `0`
- Console error count: `1`
- HTTP resource error count: `1`
- Service worker registered: `true`
- Service worker controlling: `true`

## Findings

- **P4 / advertising** — HOSPAZ NOT PRESENT ON PUBLIC SOURCE-PARITY RUNTIME
- **P3 / watch-media** — Watch media/resource debt remains outside UI-03
- **P2 / commercial-activation** — COMMERCIAL ACTIVATION GAP — NON-ZERO PREMIUM PREVIEW DURATION NOT CONFIGURED ON PUBLIC CERTIFICATION BUILD

## Authority preservation

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

## Final disposition

UI-06 PHASE 2 LIVE COMMERCIAL READER TECHNICALLY CERTIFIED — PREMIUM SECURITY / ARTICLE / PREMIUM UI PASS, BUT NON-ZERO COMMERCIAL PREVIEW DURATION IS NOT CONFIGURED
