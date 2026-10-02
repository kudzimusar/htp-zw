# UI-03 — Premium Subscription Prompt Conformance

## Status

**Implementation disposition:** `IMPLEMENTATION COMPLETE — EXACT-HEAD EVIDENCE GREEN`

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/ui03-premium-subscription-prompt-conformance`  
**Draft PR:** `#50 — UI-03: Premium 20-second teaser and subscription prompt`  
**Stacked base branch:** `feat/nm05-premium-teaser-commerce-consumer-conformance`

## Exact identities

- NM-05 certified executable: `a09a1003e475f272ab36bbf190de7e9ffb9d3266`
- NM-05 documentation closure / UI-03 base: `d30014da648eaf257513ad904b2878eab33a811d`
- UI-03 executable candidate: `4b1f175376ca3147b18561404aaf58a2eb3932e1`
- UI-03 exact-head certification run: `36981783966`
- UI-03 evidence artifact ID: `11215666754`
- UI-03 evidence artifact digest: `sha256:d63318d2dac66517dea20c64e46f28080398288f3819cea7124f5e7554ac4167`
- Documentation closure SHA: **the commit that adds this report; its exact hash is recorded in the final PR #50 closure receipt because a Git commit cannot embed its own SHA without changing that SHA.**

No merge or deployment is part of this closure.

---

## Frozen owner policy

The implementation preserves the accepted product policy without test shortening:

- teaser body paragraphs: **1**
- preview duration: **20 seconds**
- source reference: **33190**
- source article: `source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks`

The browser evidence ran the real 20-second policy. It did not substitute a shorter CI duration.

---

## Architecture

UI-03 remains a presentation consumer.

### Preserved AG-05 authority

UI-03 does not modify or duplicate:

`ag05_public_story_teaser_document`

The accepted live authority is consumed as bounded public teaser evidence only.

### Preserved NM-05 authority

UI-03 consumes the existing Article-level `premiumPreview` result:

```text
state
remainingSeconds
teaserAvailable
commerceAvailable
commerceStatus
promptRequested
```

The popup does not calculate its own expiration time, create a second preview ledger, persist a second prompt-consumption flag, or fetch protected content.

### New UI component

`apps/mobile/src/ui/PremiumSubscriptionPrompt.tsx`

Responsibilities are intentionally presentation-only:

- responsive modal/bottom-sheet/card presentation;
- HealthTimes Premium visual identity;
- acquisition CTA;
- existing-member sign in;
- Not now / close / Escape / native modal-back dismissal;
- dark-mode theming through the accepted appearance palette.

The existing inline `PremiumPaywall` remains the Article lock after expiry.

---

## Trigger semantics

The popup can open only when all of the following are true:

```text
non-entitled Premium article
AND premiumPreview.state === "expired"
AND premiumPreview.promptRequested === true
```

The Article also keeps an in-memory session key so the mounted screen does not reopen the popup repeatedly on rerender.

The popup does not open:

- during the preview;
- for public stories;
- for entitled members;
- when teaser authority is unavailable and NM-05 has not requested a prompt;
- merely because commerce authority resolves.

---

## One-shot and dismissal semantics

NM-05 remains the persistence authority for one-shot prompt eligibility.

Within the mounted Article screen:

1. NM-05 requests the prompt once after expiry.
2. UI-03 opens the presentation once for that preview session.
3. `Not now`, close, Escape or native back sets only the local popup visibility to closed.
4. The inline `PremiumPaywall` remains.
5. The authorized teaser remains expired.
6. Entitlement remains unchanged.

Browser refresh evidence proves:

- teaser restarted: **false**
- popup reopened after consumed one-shot request: **false**
- inline paywall after refresh: **true**

---

## First-paragraph preview presentation

Before expiry the authorized teaser paragraph is rendered as normal Article prose, not as a quote or summary card.

The preview state below the paragraph uses the NM-05 supplied `remainingSeconds`:

```text
Premium preview · 20 seconds remaining
```

The warning state uses restrained publication language:

```text
Your Premium preview is ending soon
```

The one-second countdown itself is not a live region. Only the warning transition is exposed as a polite live-region change, avoiding screen-reader announcement spam.

At expiry the teaser paragraph and preview notice disappear and the inline Premium paywall remains.

---

## Acquisition CTA behavior

### Current fail-closed state

Current commerce authority is still:

`configuration-required`

Therefore the current popup does not show a price and does not pretend checkout is available.

When `premiumPreview.commerceAvailable === false`:

- primary copy is `Explore Premium`;
- Web/PWA and native route to `/premium`;
- no commerce request is generated merely by opening the popup;
- no entitlement is granted.

### Future ready Web state

If authoritative Web commerce later reports `commerceAvailable === true`, the Article-level explicit CTA handler can call:

`services.premiumCommerce.startCheckout(...)`

Only an explicit user action can do so.

A redirect is followed only when:

- result status is `redirect-required`;
- the returned checkout URL is verified HTTPS.

The result still does not grant Premium entitlement.

### Native state

iOS and Android do not call the Web checkout path.

Native prompt acquisition routes to `/premium`, where the existing `PremiumStoreService` remains platform purchase authority.

No App Store or Google Play product was fabricated or activated.

---

## Existing member action

`Member sign in` closes the prompt and routes to:

`/account-access`

Authentication authority is unchanged.

---

## Responsive presentation

### Mobile — 390×844

Presentation is a bottom-anchored sheet/card with:

- rounded upper corners;
- explicit close control;
- scroll-safe content container;
- full-width primary and secondary actions;
- separate restrained `Not now` action.

### Tablet — 834×1112

Presentation becomes a centered bounded card.

### Desktop — 1440×1000

Presentation remains centered with a maximum width of 600px.

It does not span the desktop viewport.

---

## Dark mode

Evidence was captured through the HealthTimes appearance authority rather than browser-only color emulation.

Certified popup screenshots include:

- dark mobile;
- dark desktop.

The popup uses the current appearance palette for paper, ink, muted ink, borders and primary action treatment. It does not force a white card in Dark.

---

## Accessibility

The implementation preserves:

- React Native `Modal` semantics;
- `accessibilityViewIsModal`;
- meaningful modal label;
- explicit close button;
- `Explore Premium` / future `Become Premium`;
- `Member sign in`;
- `Not now`;
- minimum `layout.touchMin` action targets;
- Web Escape dismissal;
- native `onRequestClose`;
- logical action order;
- non-spamming preview announcements.

The unsupported React Native `accessibilityRole="dialog"` experiment was removed after exact-head typecheck proved that role is not accepted by the canonical React Native `View` type. Supported `Modal` / `accessibilityViewIsModal` semantics remain.

---

## Security proof

Exact-head artifact evidence for source `33190` confirms:

```text
accepted source_id = 33190
access_policy = premium_marker_review
body_html_is_null = true
teaser_paragraphs = 1
teaser_length = 321
teaser_sha256 = f44b8953d51c5eb2484b9d207ba634a0335c1780dff3cc2c3b16f3bb688fa1cd
```

The report records the teaser digest and length rather than reproducing the teaser body.

Certified browser behavior:

```text
protected body present = false
paragraph 2 present = false
WordPress content-field requests = 0
protected article requests = 0
automatic commerce requests on popup open = 0
```

The popup does not hide a body already present behind it. The DOM/network remain safe without relying on the modal as a security boundary.

---

## 20-second timing evidence

### Mobile

- preview started: `2026-10-02T08:06:14.788Z`
- preview expired: `2026-10-02T08:06:35.086Z`
- elapsed: **20.298 seconds**

### Tablet

- preview started: `2026-10-02T08:06:38.730Z`
- warning observed: `2026-10-02T08:06:54.072Z`
- preview expired: `2026-10-02T08:06:58.871Z`
- elapsed: **20.141 seconds**

### Desktop

- preview started: `2026-10-02T08:06:59.496Z`
- warning observed: `2026-10-02T08:07:14.847Z`
- preview expired: `2026-10-02T08:07:19.651Z`
- elapsed: **20.155 seconds**

### Dark mobile

- elapsed: **20.157 seconds**

### Dark desktop

- elapsed: **20.153 seconds**

This is direct product-policy evidence, not a shortened test timer.

---

## Network evidence

Primary mobile expiry/dismissal journey:

```text
bounded teaser RPC requests before refresh = 1
WordPress requests before refresh = 3
WordPress content requests = 0
protected article requests = 0
commerce requests before CTA = 0
automatic commerce requests on popup open = 0
```

Current fail-closed `Explore Premium` acquisition journey:

```text
destination = /premium
commerce requests before CTA = 0
commerce requests after CTA = 0
```

The popup itself performs no automatic commerce call.

The exact-head NM-05 workflow independently re-proved its accepted browser contract on the same executable SHA.

---

## Required journey evidence

Artifact:

`ui03-premium-subscription-prompt-conformance`

Artifact ID:

`11215666754`

Artifact digest:

`sha256:d63318d2dac66517dea20c64e46f28080398288f3819cea7124f5e7554ac4167`

Files:

```text
premium-prompt/mobile-preview-start.png
premium-prompt/mobile-preview-warning.png
premium-prompt/mobile-popup-open.png
premium-prompt/mobile-popup-dismissed-paywall.png
premium-prompt/tablet-popup-open.png
premium-prompt/desktop-popup-open.png

dark/mobile-popup-open.png
dark/desktop-popup-open.png

manifest.json
network.json
build-info.json
```

The screenshots were generated from the exact executable SHA.

---

## Exact-head tests and workflows

### Dedicated UI-03 prompt certification

Workflow:

`UI-03 Premium Subscription Prompt Conformance`

Run:

`36981783966`

Result:

**SUCCESS**

It passed:

```text
npm run native:check
npm --prefix apps/mobile run test:reader-product
npm --prefix apps/mobile run test:reader-fidelity
npm --prefix apps/mobile run test:source-parity
npm --prefix apps/mobile run test:premium-hospaz
npm --prefix apps/mobile run test:growth-commercial
npm --prefix apps/mobile run test:ui03
npm --prefix apps/mobile run test:nm05-premium-consumer
npm --prefix apps/mobile run test:nm05-premium-live
npx playwright test tests/migration/ag05-premium-commerce-teaser.spec.js
npm run native:export:web
```

and the exact-head prompt browser evidence.

### Adjacent exact-head gates

At executable SHA `4b1f175...`:

- AG-05 Premium Commerce + Teaser Authority — **SUCCESS**
- NM-05 Premium Teaser + Commerce Consumer Conformance — **SUCCESS**
- UI-03 Commercial Reader Conformance — **SUCCESS**
- Chromium UAT — Canonical Reader — **SUCCESS**
- Validate HealthTimes Canonical Reader + Protected Operations — **SUCCESS**
- AG-05 + NM-07 Phase 7 Premium + HOSPAZ — **SUCCESS**
- NM-07 Phase 6 Migrated Corpus Reader — **SUCCESS**
- Phase 10 Web/PWA Evidence — **SUCCESS**

The generic Native Mobile umbrella still fails only at the previously known live staging bounded-public-projection assertion:

`Current staging should expose canonical published public stories only through the bounded projection`

with:

`false !== true`

That staging PostgREST state is outside this UI-03 presentation task and was not modified.

---

## Legacy UI-03 evidence reconciliation

The older commercial-reader evidence previously treated source `33190` as its public Article reference and shortened preview timing through a four-second evidence environment value.

This was no longer compatible with accepted authority.

The harness was corrected so that:

- source `33190` is Premium;
- a different canonical public story is used for public Article evidence;
- Premium evidence uses the accepted source `33190`;
- the UI-03 evidence duration is 20 seconds;
- the supplementary prompt is dismissed before certifying that the inline paywall remains;
- current branch metadata is recorded rather than the retired PR #43 branch.

No product authority was changed to satisfy the old harness.

---

## Changed files in the executable candidate

```text
.github/workflows/ui03-commercial-reader-conformance.yml
.github/workflows/ui03-premium-subscription-prompt-conformance.yml

apps/mobile/app/article/[id].tsx
apps/mobile/package.json
apps/mobile/src/ui/PremiumSubscriptionPrompt.tsx

apps/mobile/tests/ui03-commercial-reader-evidence.mjs
apps/mobile/tests/ui03-commercial-reader.test.mjs
apps/mobile/tests/ui03-premium-subscription-prompt-evidence.mjs
apps/mobile/tests/ui03-premium-subscription-prompt.test.mjs
```

No frozen AG-05/NM-05 service or migration file is present in the base→executable diff.

---

## Provider dependencies

Current commercial provider activation remains intentionally incomplete.

UI-03 depends only on the existing governed consumer surfaces:

- AG-05 bounded teaser authority;
- NM-05 preview/prompt/commerce consumer state;
- `PremiumCommerceService` for future explicit Web checkout;
- `PremiumStoreService` for native store authority;
- existing entitlement authority.

Outstanding provider configuration is a separate provider-authority lane.

UI-03 does not activate:

- Paynow;
- PayPal;
- Apple products;
- Google Play products;
- merchant credentials;
- price;
- currency;
- billing interval.

---

## Authority preservation receipt

```text
AG-05 teaser authority changed: NO
NM-05 consumer authority changed: NO
teaser paragraph count changed: NO
teaser duration changed: NO
protected body exposed: NO
Paynow activated: NO
PayPal activated: NO
price invented: NO
currency invented: NO
native products activated: NO
HOSPAZ changed: NO
COM changed: NO
Pages deployed: NO
main changed: NO
```

Also:

```text
PR #49 merged: NO
PR #50 merged: NO
production changed: NO
Pages workflow changed: NO
```

---

## Moderator handoff

The executable is frozen at:

`4b1f175376ca3147b18561404aaf58a2eb3932e1`

The moderator should independently verify:

1. PR #50 remains Draft/Open/Unmerged and stacked on the NM-05 branch.
2. The executable SHA is an exact descendant of `d30014da...`.
3. No frozen authority file changed.
4. Run `36981783966` is exact-head SUCCESS.
5. Artifact `11215666754` matches digest `sha256:d63318d...`.
6. Mobile timing is approximately 20 seconds and the popup is absent before expiry.
7. Not now closes only the popup and leaves the inline paywall.
8. Refresh does not restart the teaser or reopen the consumed one-shot prompt.
9. Source `33190` remains Premium and its public authority returns no body.
10. Current commerce remains fail-closed with no automatic request or fabricated commercial fact.
11. The staging bounded-public-projection failure remains separately classified rather than being patched through UI-03.

No deployment or merge should occur as part of UI-03 closure.
