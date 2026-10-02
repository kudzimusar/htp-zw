# UI-06 Live 20-Second Premium Teaser + Subscription Prompt Certification

## 1. Exact identities

- Repository: `kudzimusar/htp-zw`
- Role: `UI-06 — Independent Visual / Runtime / Security Certification`
- Certification branch: `test/ui06-premium-prompt-live-cert`
- Carrier PR: `#51 — UI-06: Live 20-second Premium teaser + prompt certification`
- PR state at certification closure: Open / Unmerged
- Starting/live wrapper: `35a20817257a743e4c98412ea349df47887b80da`
- Underlying accepted UI-03 executable: `31d3cce2edfa37761a9cff21db0024842773058d`
- UI-03 documentation closure: `ae1bb67bb75098a6e1799bb6adc5f2cf93bdb766`
- NM-05 executable: `a09a1003e475f272ab36bbf190de7e9ffb9d3266`
- AG-05 teaser runtime: `af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`
- Controlling certification tooling SHA: `95317f60e1e0d665c6ff680f5567dabdced941a5`
- Controlling workflow run: `37006159076`
- Controlling job: `110834817291 — certify-live-premium-prompt`
- Evidence artifact: `ui06-premium-prompt-live-cert`
- Artifact ID: `11225519774`
- Artifact SHA-256: `e125ea29cb4a0964d7becaf390ee8a48a8c0721afe1ec6a929defeab1ec7f8d7`

The workflow intentionally failed at the first proven live certification blocker. Failure is the expected workflow result for a failed certification; it is not a certification-tooling crash.

## 2. Live build identity

Live `/build-info.json` matched the authorized deployment exactly:

```json
{
  "sha": "35a20817257a743e4c98412ea349df47887b80da",
  "presentation": "apps/mobile",
  "service_mode": "source-parity",
  "base_path": "/htp-zw"
}
```

The live deployment did not move during certification.

## 3. Browser environment

- Public URL: `https://kudzimusar.github.io/htp-zw/`
- Runner: GitHub Actions
- OS: Linux / Azure runner
- Node: `v22.23.3`
- Playwright: `1.55.0`
- Chromium: `140.0.7339.16`
- Device scale factor: `1`
- First certified viewport: `390 × 844`

The browser exercised the live GitHub Pages app. No local application rebuild was used.

## 4. Premium reference

Certified route:

`/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks`

Expected authoritative source identity:

`33190`

The live Article rendered with Premium identity visible.

## 5. First proven blocker

### P1 — authorized Premium teaser does not enter the live 20-second preview

The controlling blocker-only browser run recorded:

```text
document_status = 200
premium_badge_visible = true
initial_state = paywall
preview_visible = false
paywall_visible = true
teaser_visible = false
```

Required live behavior was a fresh anonymous teaser state with:

- one authorized teaser paragraph;
- `PREMIUM PREVIEW`;
- a non-zero countdown;
- no inline paywall before expiry;
- no popup before expiry.

That required state was not reached.

The browser instead resolved the Article directly to the inline Premium paywall.

Evidence screenshot:

`premium-prompt/live-mobile-initial-state.png`

Because the first mandatory Premium state failed, UI-06 stopped the remaining commercial journey as required.

## 6. Teaser authority evidence

The browser did make the bounded teaser authority request:

`ag05_public_story_teaser_document`

Observed response:

```text
HTTP status = 200
response_shape = object
row_count = 1
source_id = ""
access_policy = ""
body_html_null = false
teaser_length = 0
teaser_paragraph_count = 0
teaser_digest = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

Important interpretation:

- `body_html_null = false` here does **not** prove protected body exposure.
- It means the HTTP-200 response object did not expose the expected top-level `body_html` field to the diagnostic consumer.
- No protected body was observed in DOM.
- No full WordPress content-field request occurred.
- No protected-article request occurred.

Therefore the first proven defect is an unusable/missing teaser projection at the live Reader boundary, resulting in fail-closed paywall presentation.

This is **P1 commercial Reader journey failure**, not P0 protected-content exposure.

## 7. Network security

For the controlling initial-state journey:

```text
wordpress_content_field_requests = 0
protected_article_requests = 0
```

The WordPress requests observed before the blocker were metadata-only requests. No anonymous request for the WordPress `content` field was observed.

No protected member body was demonstrated crossing the browser network boundary.

Security posture therefore remained fail-closed at the first blocker.

## 8. 20-second timing

Not certified.

The required live teaser never became visible, so the following could not legitimately be measured:

- `preview_started_at`;
- non-zero initial remaining seconds;
- countdown decrement;
- warning transition;
- `preview_expired_at`;
- approximately 20-second elapsed duration.

UI-06 did not inject or simulate a timer.

## 9. Warning state

Not certified.

`Your Premium preview is ending soon` was never reached because the teaser state itself did not start.

No warning screenshot was fabricated.

## 10. Popup trigger / one-shot rule

Not certified.

Because the authorized 20-second preview did not begin, UI-06 did not proceed to certify:

- popup appearing only after expiry;
- `popup_open_count = 1`;
- popup absence before expiry.

No downstream popup result is claimed.

## 11. Popup content / commerce truth

Not executed after the P1 stop boundary.

The certification harness did not activate commerce or alter the deployed commerce configuration.

No Paynow, PayPal or storefront authority was activated.

No price or entitlement was created by UI-06.

## 12. Explore Premium / Member sign-in

Not executed after the P1 stop boundary.

Therefore UI-06 does not claim live certification in this run for:

- `Explore Premium → /premium`;
- `Member sign in → /account-access`;
- zero checkout request after Explore Premium.

These remain downstream evidence requirements after the teaser boundary is remediated.

## 13. Dismissal / refresh persistence

Not executed after the P1 stop boundary.

UI-06 therefore does not claim evidence for:

- Not now;
- visible Close;
- Escape;
- inline paywall after dismissal;
- no teaser restart on reload;
- no popup reopen after reload.

The persistent NM-05 ledger was not mutated manually.

## 14. Accessibility

Not executed after the P1 stop boundary.

The following live accessibility checks remain pending after remediation:

- independently accessible Close;
- Explore Premium;
- Member sign in;
- Not now;
- no duplicate hidden Close;
- heading semantics;
- keyboard Tab/Focus/Escape.

No source-level acceptance is substituted for the missing live evidence.

## 15. Responsive presentation

The mandatory live popup did not become reachable, so tablet/desktop popup presentation is not certified.

Pending after remediation:

- mobile bottom-anchored sheet;
- tablet centered bounded card;
- desktop centered bounded card;
- no horizontal overflow;
- desktop mobile tabs absent.

## 16. Dark mode

Not executed after the P1 stop boundary.

UI-06 did not fabricate dark popup evidence.

The required real HealthTimes `/appearance` Dark journey remains pending after the teaser blocker is repaired.

## 17. Public comparison Article

Not executed after the P1 stop boundary.

No claim is made in this certification run about the Fiji public comparison route.

The stop rule prevented continuing unrelated downstream certification after the Premium journey became unusable.

## 18. Premium landing

Not executed after the P1 stop boundary.

No payment/provider activation was attempted.

## 19. Home / shared-shell / other-route regression

Not executed after the P1 stop boundary.

Existing Watch media debt was not investigated or modified.

## 20. Service worker

Not fully certified in this run because the journey stopped before the service-worker evidence checkpoint.

Live build identity was nevertheless verified directly before the Premium journey and matched the authorized wrapper.

## 21. Console / runtime

At the proven blocker:

- React `#418`: `0`;
- page errors: `0`;
- console errors: `0`;
- known Expo notifications Web warning may appear and is non-blocking.

The failure was not caused by a React crash or page exception.

## 22. Certification-tooling history

### Non-controlling run — `37004653635`

Tooling head:

`582be57c8b7f3c7b98cc63d138910168539bc34f`

The initial harness checked Hero readiness before the Article had resolved and produced a false certification blocker. That harness timing issue was corrected; it is not a product defect.

### Non-controlling run — `37004969723`

Tooling head:

`e2881841a82a506a8aa2b572d8dc4c956b7f0c5a`

The Article resolved and reached the teaser RPC, but the harness timed out waiting for `PREMIUM PREVIEW` without sufficiently classifying the initial live state.

### Diagnostic run — `37005736881`

Tooling head:

`194624caab31c4087e07b52620949dd52a233418`

A bounded initial-state diagnostic independently observed:

```text
initial_state = paywall
preview_visible = false
paywall_visible = true
teaser_visible = false
wordpress_content_field_requests = 0
protected_article_requests = 0
```

### Controlling blocker-only run — `37006159076`

Tooling head:

`95317f60e1e0d665c6ff680f5567dabdced941a5`

This run added response-shape metadata, scrolled the paywall into the viewport, captured the blocker screenshot, and intentionally failed immediately. The downstream full matrix was skipped.

This is the controlling certification evidence.

## 23. Evidence manifest

Controlling artifact:

- name: `ui06-premium-prompt-live-cert`;
- artifact ID: `11225519774`;
- digest: `sha256:e125ea29cb4a0964d7becaf390ee8a48a8c0721afe1ec6a929defeab1ec7f8d7`;
- run: `37006159076`;
- exact tooling head: `95317f60e1e0d665c6ff680f5567dabdced941a5`.

The artifact contains at least:

- `identity/build-info.json`;
- `premium-prompt/initial-state.json`;
- `premium-prompt/live-mobile-initial-state.png`;
- workflow/runtime evidence generated before the stop boundary.

No downstream screenshot is claimed when its required state was not legitimately reached.

## 24. Findings

### P0 — protected-content/payment-security exposure

**None proven.**

Protected WordPress content-field requests: `0`.

Protected article requests: `0`.

No protected member body was demonstrated in anonymous DOM or network evidence.

### P1 — live teaser/paywall/popup journey unusable

**PROVEN.**

The authorized Premium reference opens directly to the inline paywall instead of entering the required one-paragraph 20-second preview.

The teaser RPC returns HTTP 200 but does not expose the expected usable teaser projection to the live consumer.

### P2

Not assessed beyond the P1 stop boundary.

Accessibility/responsive popup checks were not legitimately reachable.

### P3 — provider activation debt

Operational Paynow/PayPal absence remains expected provider/configuration debt.

UI-06 did not activate any provider.

### P4

Known Expo notifications Web listener warning remains non-blocking.

## 25. Authority preservation

- apps/mobile changed: NO
- Pages workflow changed: NO
- deployment changed: NO
- AG-05 teaser authority changed: NO
- NM-05 consumer authority changed: NO
- 20-second policy changed: NO
- paragraph-count policy changed: NO
- commerce authority configured: NO
- Paynow activated: NO
- PayPal activated: NO
- price invented: NO
- native store products activated: NO
- Supabase mutated: NO
- HOSPAZ changed: NO
- COM changed: NO
- Studio changed: NO
- main changed: NO
- PR #49 merged: NO
- PR #50 merged: NO
- production changed: NO

UI-06 mutated only bounded certification assets and this report.

## 26. Recommended moderator disposition

Return this as a **P1 remediation task** to the authority/consumer lane responsible for translating the live `ag05_public_story_teaser_document` response into the Reader's bounded teaser projection.

The remediation must preserve the already-proven fail-closed security boundary:

- no WordPress full-content request for anonymous Premium;
- no protected body in anonymous DOM;
- no entitlement grant;
- no provider/payment activation.

After the teaser projection is corrected and a new authorized wrapper is deployed, UI-06 should rerun the full 20-second journey from a fresh context, including warning, expiry timing, one-shot popup, CTA routing, dismissal, refresh persistence, accessibility, responsive, dark, public comparison and shell regression evidence.

Do not treat the present direct-paywall result as acceptable commercial activation because the owner-approved 20-second teaser policy is the specific live behavior under certification.

## Final disposition

UI-06 LIVE PREMIUM JOURNEY NOT CERTIFIED — AUTHORIZED PREMIUM TEASER RPC RETURNS NO USABLE TEASER PROJECTION; ARTICLE OPENS DIRECTLY TO INLINE PAYWALL INSTEAD OF ONE-PARAGRAPH 20-SECOND PREVIEW
