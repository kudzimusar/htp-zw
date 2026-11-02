# HealthTimes 2.0 — PAYNOW-USD-FIRST-OWNER-POLICY-01
## USD-first commercial currency, Paynow TEST simulator classification and LIVE authorization separation

**Owner directive date:** 2 November 2026
**Authority:** Owner's explicit preference to prioritize USD and remove the TEST ZWG/ZiG receipt as a delivery-stalling issue, interpreted consistently with truthful financial reporting and existing no-Production/no-real-money constraints.
**Programme:** HealthTimes 2.0 — Final Unified MVP
**Implementing authority:** Moderator-controlled candidate for review; this document is the explicit Owner USD-first product policy and TEST classification decision. It is **not** a declaration that real USD transactions or settlement have occurred.
**Controlling R1 implementation source:** `bdb2274e9cd145bbbbb114bcaf237ced712e87d8`, Draft PR #125 (unmerged).
**Tracking:** GitHub Issue #124. Independent certifier and Finance review remain mandatory.

## 1. Owner decision: USD is the canonical HealthTimes commercial price currency

1. `healthtimes_premium_monthly` customer price: **USD 5.00 per month** under the existing product-plan authority.
2. All HealthTimes Premium checkout, subscriber agreement, amount matching, entitlement prerequisites, invoice/Finance currency and merchant-facing canonical unit-of-account fields are USD, unless the Owner explicitly adopts a separate currency product later.
3. ZWG/ZiG must **not** silently become the canonical price or an implicit conversion of USD. There is no default FX conversion rate.
4. USD price authority is distinct from provider payment-instrument currency and merchant settlement currency. Each must retain its actual evidence and provenance.
5. No Provider live-money, Production activation or real charge/refund is authorized by this policy.

## 2. Resolution of Paynow TEST simulator ZWG discrepancy

Public Paynow developer docs state TEST mode creates, pays and cancels **simulated** transactions with no money movement:
https://developers.paynow.co.zw/docs/paynow/test_mode/

A Paynow Forum answer dated **10 September 2025** states test transactions use ZiG, **even for USD integrations**, solely to test integration functionality:
https://forums.paynow.co.zw/t/currency-code-rectification/8040

The standard signed callback/poll fields do not require currency:
https://developers.paynow.co.zw/docs/paynow/status_update/
https://developers.paynow.co.zw/docs/paynow/polling_status/

**Rule:** A ZWG/ZiG TEST receipt is permitted as a **Paynow simulator artifact** in an isolated TEST certification lane. It does **not**, by itself, disprove the merchant's USD integration, and it does not independently establish USD charge or settlement.

**Forbidden substitution:** Never relabel ZWG/ZiG as actual USD, substitute currency when signed data omitted it, claim `USD_SETTLED`, mark the historical `CURRENCY_MISMATCH` record `PAYMENT_VERIFIED`, issue commercial entitlements based solely on TEST simulator output, invent FX conversion, or manufacture a provider signature.

For the existing historical provider TEST exception, retain original provider-reported and expected fields, status, hashes, references, audits and exception; append an interpretation of likely simulator behavior as **an explanatory audit annotation**, not a mutation to original transaction truth. Official merchant-specific attribution remains separate.

## 3. Required separate technical states

`PRODUCT_CURRENCY_AUTHORITY=USD_APPROVED` — Owner decision; can be recorded now.

`PAYNOW_TEST_SIMULATOR_CURRENCY_POLICY=ZWG_OR_ZIG_EXPECTED_SOME_TEST_INTEGRATIONS` — general documented Paynow simulator behavior, not merchant-specific proof.

`PAYNOW_TEST_TRANSPORT_SECURITY=ENGINEERING_CANDIDATE_REVIEWED` — 54/54 R1 tests and exact SHA CI are independently source-verified; final security/Finance certification pending.

`PAYNOW_TEST_PHYSICAL_END_TO_END=NOT_YET_CERTIFIED` — must establish a provider-simulated success with signed callback/poll parity, exact references/amount, idempotency and no real money.

`PAYNOW_LIVE_USD_CHARGE_SETTLEMENT=BLOCKED_PROVIDER_EVIDENCE` — requires specific merchant integration/payment methods plus provider/payment-channel USD proof and an explicitly authorized real-world validation plan.

`PUBLIC_CHECKOUT=DISABLED` and `PRODUCTION_ACTIVATION=NOT_AUTHORIZED`.

No flag, label or document can turn one state into another.

## 4. Safe TEST-only implementation contract (next specialist assignment)

1. Acknowledge **test-only simulator receipt classification**, distinctly from a verified monetary payment. Store original observed provider receipt currency when known, canonical USD product price, mode, integration identity (non-secret), source, event hash and provider references in provenance.
2. Only a clearly isolated Staging/Paynow TEST context using the configured TEST integration can enter the simulated lane. Enforce explicit mode checks and project/environment isolation. No LIVE/Production fallback, no public browser override.
3. Require cryptographic validation of provider messages, server-side poll agreement, merchant reference, exact amount, trusted provider endpoints, idempotency/replay protection and timeout ambiguity controls. Never weaken the existing R1 safety migration.
4. Because standard status/poll messages omit currency, cryptographic validation establishes **status/amount/reference authenticity**, not monetary currency. A TEST simulator receipt classification is a different fact, not a synthetic USD signature.
5. Use a *separate non-commercial verification outcome* (for example `TEST_SIMULATED_PAID`) and test-only entitlement/readback if needed, isolated from paid subscriptions and Finance monetary reconciliation. No production-capable `PAYMENT_VERIFIED` or real `premium_entitlement_reconciliations` row may be created from simulator ambiguity. If an existing schema cannot separate these states safely, return an explicit blocker and migration proposal for independent review.
6. Preserve all five historical Paynow TEST intents, the historical `CURRENCY_MISMATCH` event and open exception. Do not delete or rewrite any historical financial row to obtain green status.
7. Re-certify deterministic contract suites, complete the governed Paynow TEST payment lifecycle if Owner TEST-account authority is available, verify zero real money and test-only access, and obtain separate independent security and Finance reviews.
8. Report authenticated provider TEST evidence separately from simulated local fixtures. Never substitute synthetic success for actual provider TEST response.
9. Check actual Paynow merchant integration payment methods for intended USD support (including card and other configured USD channels), account bank/settlement currency, and explain TEST versus LIVE status. Use Owner-console/protected provider evidence; no secret keys in GitHub.

## 5. LIVE USD remains an independent, explicitly authorized commercial release gate

A later LIVE USD enablement requires: merchant-specific integration/payment-method confirmation; designated USD settlement account/channel; independently verifiable payment currency/settlement evidence; valid signed status/poll, amount/reference parity and anti-replay controls; exactly-once entitlement and Finance reconciliation; refund/reversal policy; separate approval by Owner, independent security specialist and Finance reviewer. A small real charge/refund test is **not authorized** here. No public checkout is allowed until the independent gate is formally accepted.

## 6. R1 disposition and R2 closure criteria

**R1 engineering:** Source and CI candidate substantively accepted for progression — NOT public release acceptance. Fail-safe ambiguous initiation is retained.

**Next task:** `HT-MVP-PAYNOW-USD-01-R2-TEST-SIMULATOR-CLOSURE`, scoped to the TEST-only simulation interpretation, genuine Paynow TEST lifecycle, negative security/Finance tests, independent evidence and exact SHA closure.

**LIVE USD:** separate pending provider authority, not grounds to repeatedly reopen completed R1 protocol engineering.

**Owner-visible message:** HealthTimes prices in USD. Paynow TEST may display ZWG/ZiG because of Paynow simulator behavior; no real funds move. LIVE USD settlement cannot be represented as certified until separately verified.

**Audit principle:** Resolve the stalling TEST *classification* without bypassing the financial truth of the original receipt.
