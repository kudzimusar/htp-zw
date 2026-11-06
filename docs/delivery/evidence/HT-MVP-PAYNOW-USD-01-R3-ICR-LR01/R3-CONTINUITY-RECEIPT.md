# HT-MVP-PAYNOW-USD-01-R3-ICR-LR01 — Consolidated Certification and Continuity

**Date:** 2 November 2026 (Asia/Tokyo).  
**Starting R2 exact SHA:** `0f24b9f6d26b773276a14717760ca749e13c862c`.  
**R3 execution branch:** `cert/ht-mvp-paynow-usd01-r3-icr-lr01-security-finance`  
**R3 candidate:** Draft PR #133, based directly on R2; PR #131 stays Draft/unmerged.  
**R3 implementation source tested:** `3e687c97974fdfee0895c699442fa3b6d80d551e` and precursor `5da62ba8cf17ecc74b9936c6396402d7cae2e426`.  
**R3 evidence commit:** the commit containing this file (to be independently fetched from GitHub).  
**Authorization:** no merge, Production, LIVE flags or LIVE SQL deployment, real-money charge/refund, public checkout, Paynow support message or synthetic paid entitlement.

## Evidence classes

1. **Engineering CI**: 68/68 tests PASS (54 Paynow/negative including subscriber ownership + 2 disposable LIVE USD SQL + 12 Finance/Premium), failure 0, skipped 0, run https://github.com/kudzimusar/htp-zw/actions/runs/41399720386 on earlier precursor. Final R3 implementation added merchant integration identity checking and concurrent replay tests; obtain final exact-head CI before any candidate acceptance.
2. **Staging readback**: Paynow 5 intents / 4 initiated / 1 historic `CURRENCY_MISMATCH` / 0 verified / 1 open exception / 3 webhook events / 0 simulated R2 events / 0 premium reconciliations / 0 Paynow entitlements / 0 reversals. Plan `healthtimes_premium_monthly` USD 5 monthly active. `payment_record_paynow_live_status` RPC absent; LIVE attestation table absent. No R3 Staging SQL mutation.
3. **Staging TEST Edge**: existing `paynow-test-callback` v24 preserved; no R3 redeployment, no fabricated webhook replay or real receipt.
4. **Provider physical TEST**: **BLOCKED_MERCHANT_TEST_SESSION**. Attempt to list connected browser tabs from current desktop origin returned `Browser access requires the originating browser context. Open ChatGPT in the browser with the connected extension and try again.` Merchant-authenticated Paynow session not supplied. No fresh R3 TEST intent, provider reference or `TEST_SIMULATED_PAID` event. Historic Paynow signed TEST evidence remains separate and not re-labelled.
5. **LIVE USD**: The proposed SQL monetary RPC and attestation are implemented **as an undeployed candidate and disposable test only**. No provider-issued merchant-specific USD settlement record, provider-authorized source API/statement or Finance authority exists in this task. **LIVE_MERCHANT_USD_CERTIFIED=NO** and `LIVE_SETTLEMENT=NOT_CERTIFIED`.
6. **Independent acceptance**: Security and Finance require two distinct non-implementing actors. The implementing GitHub actor `kudzimusar` cannot approve its own code. No reviews found on draft PR #131 or other reviewed candidates. `SECURITY_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED`; `FINANCE_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED`.

## Corrective changes and custody

- SEC-R3-001 High: unauthenticated payment status read by bearer reference fixed in `api/commerce.js` and `lib/paynow-runtime.js`; add subscriber-owner / TEST operator checks. Validation in `tests/migration/paynow-r3-status-authorization.test.js`.
- LIVE architecture: `currency` optional in Paynow signed protocol; candidate SQL uses separately approved USD provider evidence rather than assuming currency. Two reviewer identities, USD charge/settlement record, merchant integration, event payload digest, amount and reference must match. No source allows public TEST monetization.
- R2 anti-duplicate safety migration and existing financial schema stay frozen. R2 continuation file receives append-only correction identifying final controlling R2 SHA and earlier intermediate head.
- No real provider event was invented, no source secrets included, no bank settlement or refunded money.

## Owner / provider action register

1. **Owner merchant TEST**: open ChatGPT from the authorized browser with connected extension, authenticate **directly** to the Paynow merchant account that owns the TEST integration, and make one explicit TEST-only `TESTING: Faked Success` transaction with approved operator/test credentials protected server-side. Preserve receipt screenshot/provider ref, signed callback+poll parity and ensure exactly one noncommercial event. Never paste passwords in chat.
2. **Independent reviewers**: nominate a distinct Security specialist and Finance reviewer who did not implement R3; request GitHub reviews on final draft PR #133 or formally attributed reports. Neither may sign for the other or for the implementation actor.
3. **Paynow provider**: provide merchant-specific LIVE USD enabled payment methods/integration and authoritative USD charge/receipt source, settlement account/bank currency and independent evidence interface. Standard signed callbacks may omit currency; generic forum guidance is not merchant-specific settlement proof. No support email sent.
4. **Owner/Finance**: separately approve LIVE monetary migration and execution plan, accountant policy, refunds/reversals and an explicit real-money amount/environment. None authorized now.

## Final gates

```text
R3_TEST_ENGINEERING=PASS_CANDIDATE_SUBJECT_TO_FINAL_HEAD_CI
R3_NEW_PHYSICAL_PROVIDER_TEST=BLOCKED_MERCHANT_TEST_SESSION
SECURITY_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
FINANCE_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
LIVE_MONETARY_RPC=DESIGNED_AND_DISPOSABLE_TESTED_NOT_DEPLOYED
LIVE_MERCHANT_USD_CERTIFIED=NO
LIVE_SETTLEMENT=NOT_CERTIFIED
PUBLIC_CHECKOUT=DISABLED
REAL_MONEY=0
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
MODERATOR_REVIEW_REQUIRED=YES
```
