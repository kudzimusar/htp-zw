# HT-MVP-PAYNOW-USD-01-R4 — Payment Return and Merchant TEST Evidence

**Frozen source:** R3 `8f93c30fe53308aae2d1ef2bfef172576efe50ea`; R4 `fix/ht-mvp-paynow-usd01-r4-physical-cert-closure`, Draft PR #138.
**Scope:** Public customer payment return UI / privileged status boundary / nonmonetary TEST evidence.

## Proven defect and bounded fix

At frozen R3, `apps/mobile/app/payment/return.tsx` polled `GET /api/commerce?action=status` for all references, including `HT-CONN-` provider connectivity tests with no subscriber owner. The R3 protected endpoint correctly refuses anonymous/foreign users. Returning connectivity testers therefore received an unsuccessful status attempt and eventually a misleading generic pending message. Adding an operator token to the browser would violate the Security boundary.

R4 now **does not issue a browser status request** for `HT-CONN-`. Instead it displays the explicit controlled TEST operator-only message and acknowledges that no money or Premium entitlement is granted. The operator's protected service-side status remains separate. Authenticated subscriber `HT-PREM-` returns can poll only with secure first-party credentials; HTTP 401 shows Sign In, 403/404 shows a privacy-preserving unavailable notice, HTTP 429 stops repeated requests, and manual retry rechecks only from the authenticated customer browser.

## Actual executable browser contract

`tests/browser/paynow-r4-return.browser.cjs` launches real headless Chromium against **the actual Expo web export**, not a standalone mock component. It intercepts only the backend commerce status response to exercise frontend branches. These responses are deterministic **transport fixtures, not Paynow-issued events**.

Required independently distinguishable scenarios:
1. Controlled connectivity return, **0 browser status calls**.
2. Premium return with 401 (expired/missing session), sign-in action visible.
3. Premium return with 404 (foreign subscriber), no details exposed.
4. Premium signed TEST simulated Paid, message states no money/no membership.
5. Cancelled, no entitlement.
6. Failed, no entitlement.
7. Rate limit, no unbounded polling.

Any test failure must be recorded as a browser engineering defect or harness blocker; never claim the scenario passed merely because source assertions passed. The test run is in GitHub Actions `ht-mvp-paynow-usd01-r4.yml`. Expo web dependencies are installed in the GitHub runner without altering the pre-existing out-of-sync mobile lockfile; isolated Playwright Chromium is installed separately.

## Actual merchant physical test

**`BLOCKED_MERCHANT_TEST_SESSION`**. A connected Browser session could not be acquired: `Browser access requires the originating browser context. Open ChatGPT in the browser with the connected extension and try again.` The Owner must sign into the **Paynow merchant account that owns the TEST integration** in an approved protected browser. The implementation has intentionally generated **zero new physical R4 Paynow intents, receipts, signed provider callbacks or simulated Paid database rows** and has made no charges or refunds. Historical signed provider TEST evidence cannot be reused as proof of a new R4 exercise.

When the Owner browser session is available, conduct exactly one authorized TESTING: Faked Success, record actual merchant reference, displayed receipt currency, verified poll/callback and one noncommercial `TEST_SIMULATED_PAID` event, replay exactly once, and independently read back that `PAYMENT_VERIFIED`, Premium, Finance payment, journal and reversals remain zero. Never send or paste merchant secrets in chat.

## Verified R4 execution receipt — exact source `154457dacb7f9353bbc20b0c06188ddee72378ed`

GitHub Actions [41425750385](https://github.com/kudzimusar/htp-zw/actions/runs/41425750385): **COMPLETED SUCCESS**. Browser step ran an actual Expo web export loaded in Chromium; all **9/9** scenarios passed. Per-case HTTP status read counts were 0 for protected `HT-CONN`; 1 for signed-out, nonowner, simulated Paid, cancelled, failed, and rate-limited; 2 for pending/manual retry and simulated Paid browser refresh. The original engineering suite remained **54/54 Paynow + 2/2 disposable LIVE USD SQL + 12/12 Finance/Premium = 68/68**, failed 0, skipped 0. Total covered scenarios/tests: 77 (68 Node + 9 Chromium). A fixture response is not a real provider response, and Browser-authenticated Paynow merchant session is still unavailable.

This receipt is from the **R4 implementation source SHA**, prior to the append-only evidence commit. The Moderator must reverify the final evidence HEAD and associated CI before certifying engineering.
