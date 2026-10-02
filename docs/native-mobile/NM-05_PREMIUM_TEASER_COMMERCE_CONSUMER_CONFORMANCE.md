# NM-05 Premium Teaser + Commerce Consumer Conformance

## Disposition

**Implementation candidate:** `a09a1003e475f272ab36bbf190de7e9ffb9d3266`

**Branch:** `feat/nm05-premium-teaser-commerce-consumer-conformance`

**Required base:** `e4d366b41f77b018b16b2094afa87e5d6653a668`

**AG-05 certified runtime preserved:** `af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`

**Status:** COMPLETE — bounded consumer/platform convergence only.

No provider was activated. No staging migration or teaser privilege was changed. UI-03 presentation work was not started.

---

## 1. Frozen product and content authority

The implementation preserves the owner policy:

- Premium teaser paragraphs: **1**
- Premium teaser duration: **20 seconds**

Anonymous/non-entitled Premium delivery remains:

- public metadata;
- Hero media;
- exactly one explicitly authorized public teaser paragraph when bounded authority is available;
- `bodyHtml = null`.

The Reader never derives the teaser from the WordPress protected body.

The implementation did not modify:

- `ag05_public_story_teaser_document(text)`;
- `ag05_first_editorial_paragraph_html(text)`;
- grants for either RPC;
- the AG-05 staging migration;
- HOSPAZ authority;
- Communications;
- Studio.

---

## 2. Source-parity convergence

### Previous gap

Source parity already suppressed Premium WordPress content, but its deterministic snapshot carried no authorized teaser. Therefore Pages/source-parity could only render the immediate paywall.

### Implemented authority path

New module:

`apps/mobile/src/services/premium-teaser-authority.ts`

Source-parity Premium detail now resolves in this order:

1. current public source-parity metadata;
2. bounded AG-05 public teaser projection:
   `ag05_public_story_teaser_document`;
3. access-policy decision;
4. WordPress detail request with content allowed **only** when the final decision remains public;
5. Premium mapping with:
   - `bodyHtml = null`;
   - bounded `premiumTeaserHtml` or null.

The bounded teaser authority is consulted **before** the WordPress detail-content decision.

If the teaser RPC is unavailable or no teaser is returned:

- Premium classification is preserved;
- `premiumTeaserHtml = null`;
- full WordPress content remains disallowed;
- the Reader falls directly to the Premium paywall.

### AG-05 reference classification

The source-parity snapshot now records only the already-certified access classification for source `33190` so an RPC outage cannot downgrade that story to public.

No protected story paragraph was copied into the repository.

---

## 3. Migrated-corpus behavior

The accepted migrated-corpus path remains unchanged:

`ag05_public_story_teaser_document`
→ fail-closed fallback
→ `ag05_public_story_document`

The mapper continues to enforce:

- public article: `bodyHtml = doc.body_html`;
- Premium article: `bodyHtml = null`;
- Premium teaser: `premium_teaser_html` only.

The fallback does not fetch or reconstruct a protected body.

---

## 4. Web/PWA commerce consumer boundary

New service contract:

`PremiumCommerceService`

Implemented by:

`apps/mobile/src/growth/premium-commerce.ts`

Web/PWA flow:

Reader
→ `PremiumCommerceService`
→ configured HealthTimes server commerce authority
→ future provider checkout

The server endpoint is configuration-driven through:

`EXPO_PUBLIC_HEALTHTIMES_COMMERCE_AUTHORITY_URL`

No merchant hostname or provider secret is embedded in Reader UI.

When no server commerce endpoint is configured, Web/PWA reports:

- status: `configuration-required`;
- provider: null;
- price: null;
- currency: null;
- productPlanId: null;
- checkoutUrl: null;
- entitlementGranted: false.

The current `api/commerce.js` remains unchanged and fail closed.

A checkout redirect is never treated as Premium entitlement. Even a future successful checkout response is normalized to:

`entitlementGranted = false`

until authoritative entitlement is verified through `PremiumService.hasEntitlement()`.

---

## 5. iOS / Android commerce separation

Native commerce remains owned by:

`PremiumStoreService`

The new web commerce adapter explicitly refuses native use.

Required platform split is preserved:

- Web/PWA → server commerce authority;
- iOS → App Store / `PremiumStoreService`;
- Android → Google Play / `PremiumStoreService`.

Current native state remains `configuration-required` because approved Apple/Google product IDs do not exist.

No native request is routed through the Web checkout endpoint automatically.

No Apple or Google product was created or activated.

---

## 6. Preview ledger and 20-second semantics

Existing persistent preview identity remains based on:

- local anonymous preview scope;
- stable story ID;
- `startedAt`;
- computed `expiresAt`;
- `remainingSeconds`.

The ledger does not reset on refresh.

New one-shot prompt transition state is persisted through:

`ReaderRepository.requestPremiumPreviewPrompt(stableStoryId)`

This records the first prompt request for a preview session and returns false on repeated attempts.

At expiry:

- preview becomes locked;
- remaining seconds becomes zero;
- the inline paywall remains;
- UI-03 prompt eligibility is requested once;
- no additional protected-content request occurs.

Clearing local persistence may allow rereading the already-public teaser, but cannot expose paragraph 2 because the protected body remains withheld server-side.

---

## 7. UI-03 handoff contract

New state helper:

`apps/mobile/src/growth/premium-consumer.ts`

UI-03 can consume:

```text
premiumPreview = {
  state: "available" | "warning" | "expired" | "unavailable",
  remainingSeconds,
  teaserAvailable,
  commerceAvailable,
  commerceStatus,
  promptRequested
}
```

UI-03 does not need to reconstruct:

- entitlement;
- timer state;
- teaser availability;
- commerce readiness;
- expiry transition.

Popup dismissal is presentation-only. It does not change entitlement, restart the preview, or expose protected content.

NM-05 did not implement the popup/card/modal/bottom-sheet.

---

## 8. Exact source-parity browser/network evidence

Certified workflow:

`NM-05 Premium Teaser + Commerce Consumer Conformance`

Certified run for implementation candidate:

`36977078583`

Exact checkout SHA:

`a09a1003e475f272ab36bbf190de7e9ffb9d3266`

Genuine Premium reference:

- source ID: `33190`;
- access policy: `premium_marker_review`.

Live bounded teaser proof:

- anonymous `body_html` null: **PASS**;
- teaser paragraph count: **1**;
- teaser length: **321**;
- teaser SHA-256:
  `f44b8953d51c5eb2484b9d207ba634a0335c1780dff3cc2c3b16f3bb688fa1cd`.

Protected teaser text is intentionally not recorded in this report.

Chromium source-parity network result:

```text
bounded_teaser_rpc_requests = 1
wordpress_requests = 3
wordpress_content_field_requests = 0
commerce_requests = 0
premium_preview_visible = true
expired_to_inline_paywall = true
expiry_additional_wordpress_requests = 0
```

Therefore the tested Premium browser path used metadata plus the bounded public teaser authority and did not request WordPress `content.rendered`.

The 20-second expiry also caused no additional WordPress request.

---

## 9. Required test matrix

All required preservation and new convergence gates passed on the certified implementation candidate.

### Reader / product gates

- `npm run native:check` — PASS
- `npm --prefix apps/mobile run test:reader-product` — 10/10 PASS
- `npm --prefix apps/mobile run test:reader-fidelity` — 4/4 PASS
- `npm --prefix apps/mobile run test:source-parity` — 28/28 PASS
- `npm --prefix apps/mobile run test:premium-hospaz` — 12/12 PASS
- `npm --prefix apps/mobile run test:growth-commercial` — 9/9 PASS
- `npm --prefix apps/mobile run test:ui03` — 11/11 PASS
- `npm --prefix apps/mobile run test:migrated-corpus` — 14/14 PASS

### New NM-05 gates

- `npm --prefix apps/mobile run test:nm05-premium-consumer` — 7/7 PASS
- `npm --prefix apps/mobile run test:nm05-premium-live` — 2/2 PASS
- Chromium Premium source-parity network/expiry proof — PASS

### AG-05 protection gate

- `tests/migration/ag05-premium-commerce-teaser.spec.js` — 9/9 PASS

Node contract total in the workflow:

**97/97 PASS**

AG-05 Playwright protection suite:

**9/9 PASS**

Plus:

- TypeScript/Expo check — PASS
- source-parity Web/PWA export — PASS
- static commerce fail-closed output verification — PASS
- Chromium browser/network proof — PASS

---

## 10. Changed implementation files

Compared with the required base, the certified runtime candidate changes these implementation/certification paths:

1. `.github/workflows/nm05-premium-teaser-commerce-consumer.yml`
2. `.github/workflows/pages.yml`
3. `apps/mobile/app/article/[id].tsx`
4. `apps/mobile/app/premium.tsx`
5. `apps/mobile/package.json`
6. `apps/mobile/src/domain/contracts.ts`
7. `apps/mobile/src/domain/models.ts`
8. `apps/mobile/src/growth/premium-commerce.ts`
9. `apps/mobile/src/growth/premium-consumer.ts`
10. `apps/mobile/src/services/fixtures.ts`
11. `apps/mobile/src/services/migrated-corpus.ts`
12. `apps/mobile/src/services/premium-teaser-authority.ts`
13. `apps/mobile/src/services/reader-persistence.ts`
14. `apps/mobile/src/services/source-parity.ts`
15. `apps/mobile/src/source-parity/snapshot.ts`
16. `apps/mobile/tests/nm05-premium-browser-network.mjs`
17. `apps/mobile/tests/nm05-premium-consumer.test.mjs`
18. `apps/mobile/tests/nm05-premium-live.test.mjs`
19. `apps/mobile/tests/source-parity.test.mjs`
20. `apps/mobile/tests/ts-module-loader.mjs`
21. `tests/migration/ag05-premium-commerce-teaser.spec.js`

The Pages workflow was prepared to load the existing public teaser configuration during a future authorized source-parity build. This branch is **not** a Pages deployment branch and no Pages deployment was performed.

---

## 11. Remaining provider blockers

Still unresolved and intentionally not guessed:

- Paynow merchant identity/configuration/mode;
- PayPal merchant identity/configuration/mode;
- current price;
- currency;
- billing interval;
- product/plan ID;
- provider webhook/payment-verification authority;
- Apple App Store Premium product IDs;
- Google Play Premium product IDs.

These remain P3 provider/platform configuration blockers, not consumer-contract blockers.

---

## 12. Platform matrix

### Web/PWA

- authorized teaser available through bounded public authority: PASS
- one paragraph: PASS
- 20-second timer: PASS
- refresh does not reset: PASS
- expiry to inline paywall: PASS
- expiry does not fetch protected body: PASS
- commerce unavailable/configuration-required state: PASS
- no server commerce call while endpoint unconfigured: PASS

### iOS

- same teaser/timer contract through shared Reader: PASS by contract
- native storefront remains configuration-required: PASS
- automatic web-checkout bypass: BLOCKED BY IMPLEMENTATION / zero web calls in native commerce service test
- physical-device store UAT: NOT PERFORMED because products remain unconfigured

### Android

- same teaser/timer contract through shared Reader: PASS by contract
- native storefront remains configuration-required: PASS
- automatic web-checkout bypass: BLOCKED BY IMPLEMENTATION / zero web calls in native commerce service test
- physical-device store UAT: NOT PERFORMED because products remain unconfigured

No physical-device commerce success is claimed.

---

## 13. Authority preservation receipt

```text
Premium protected body exposed anonymously: NO
AG-05 teaser RPC weakened: NO
teaser paragraph count changed: NO
teaser duration changed: NO
commerce provider activated: NO
price invented: NO
product invented: NO
native storefront activated: NO
HOSPAZ changed: NO
COM changed: NO
Studio changed: NO
Pages deployed: NO
production changed: NO
main changed: NO
```

---

## 14. Finding disposition

- P0 protected-body/payment-security exposure: **NONE PROVEN**
- P1 teaser/entitlement core journey broken: **RESOLVED for consumer contract**
- P2 required cross-platform consumer path incomplete: **RESOLVED at contract level**
- P3 provider/platform configuration outstanding: **REMAINS**
- P4 refinement: deferred to later presentation/platform work as authorized

---

## Completion

`NM-05 PREMIUM TEASER + COMMERCE CONSUMER CONVERGENCE COMPLETE — SOURCE-PARITY / MIGRATED-CORPUS / WEB / IOS / ANDROID CONTRACT READY FOR UI-03 SUBSCRIPTION PROMPT IMPLEMENTATION`

Control returns to the moderator. UI-03 implementation has not started.
