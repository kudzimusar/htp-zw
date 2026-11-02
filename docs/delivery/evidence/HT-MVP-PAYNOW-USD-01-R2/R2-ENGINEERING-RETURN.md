# HT-MVP-PAYNOW-USD-01-R2 — Exact-source engineering return and external certification gates

**Evidence recorded:** 2026-11-02 (Asia/Tokyo).  
**R1 frozen parent:** `bdb2274e9cd145bbbbb114bcaf237ced712e87d8`.  
**R2 earlier tested engineering SHA (NOT final accepted R2 authority):** `ab20258ec98108640299aefa980ce2b6c24f4de3`.  
**R2 implementation branch:** `fix/ht-mvp-paynow-usd01-r2-test-simulator-closure`.  
**R2 Draft PR:** https://github.com/kudzimusar/htp-zw/pull/131  
**Tracking:** https://github.com/kudzimusar/htp-zw/issues/128  
**Owner policy candidate:** https://github.com/kudzimusar/htp-zw/pull/129 (Draft/unmerged).

## 1. Exact-head evidence

- **CI run:** https://github.com/kudzimusar/htp-zw/actions/runs/41387448673 — `completed/success`, 49/49 Paynow protocol/callback/TEST simulation/LIVE gate tests and 12/12 Finance/Premium/disposable PostgreSQL tests. Total **61/61 passed**, no skipped tests in these two suites. Server syntax checks, static no-activation and TEST/LIVE segregation checks passed.
- **Earlier CI run:** 41387331475 — same application test suites 61/61 passed but an R2 CI-only regular-expression syntax error failed the static gate. Corrected in the tested SHA. Do not conflate early failure with a product regression.
- **Vercel isolated Preview:** https://healthtimes-staging-r6nvfq790-11-11.vercel.app ; deployment ID `dpl_6iG3FVS9knpFoKMfqCQqMqX6631E`, exact Git SHA `ab20258ec98108640299aefa980ce2b6c24f4de3`, `target=null`, `READY`. No canonical Staging alias change or Production deployment.
- **Preview physical HTTP GET:** `/api/commerce?action=readiness` returned HTTP 200, `mode=test`, `credentials_present=true`, `checkout_available=false`, `checkout_behavior=CHECKOUT_FAILS_CLOSED`, `test_simulator_only=true`, `live_code_capable=true`, `live_authority_ready=false`, `provider_authority_certified=false`.
- **Staging TEST callback deployment:** Supabase project `bzuvntbkevvuhfhqhkua`, `paynow-test-callback` **version 24**, `ACTIVE`, `verify_jwt=false` (existing webhook protocol mode; mandatory SHA-512 + provider polling validation remains). Post-deploy function source matches the tested application SHA byte for byte.
- **Staging migration:** No new R2 database migration. R1 prior safety migration retained with service_role-only claim/release RPC. No historical table updates performed.

## 2. Live staging source-of-truth readback after R2 Edge deployment

```text
TEST_INTENTS=5
PROVIDER_INITIATED=4
HISTORIC_CURRENCY_MISMATCH=1
PAYMENT_VERIFIED=0
OPEN_PAYMENT_EXCEPTIONS=1
PREMIUM_RECONCILIATIONS=0
PAYNOW_PREMIUM_ENTITLEMENTS=0
PROVIDER_WEBHOOK_EVENTS=3
NEW_R2_TEST_SIMULATED_EVENTS=0
PAYMENT_REVERSALS=0
CLAIM_RPC_SERVICE_ONLY=TRUE
RELEASE_RPC_SERVICE_ONLY=TRUE
PROVIDER_EVENT_UNIQUE_INDEX=PRESENT
PREMIUM_RECONCILIATION_UNIQUE_INDEX=PRESENT
FINANCE_ACCOUNTANT_APPROVED=FALSE
CLEARING_CONFIGURED=FALSE
PLAN=healthtimes_premium_monthly;USD_5.00;monthly;active
```

This is a read-only snapshot. The historic `Paid`/`CURRENCY_MISMATCH` row, provider reference, signed event metadata and ZWG receipt facts remain unaltered.

## 3. What the tests certify, and what they cannot

**Certified engineering candidate:** signature validation, trusted poll and callback agreement, amount/ref verification, noncommercial simulator outcome/replay, failure/cancellation isolation, ambiguous initiation retry prohibition, USD canonical price, LIVE config non-fallback, auth/operator negative gates, payment-ledger and Premium reconciliation regression contracts. All tests used deterministic/synthetic signatures and disposable PostgreSQL.

**Existing real provider evidence:** staging already held five genuine prior Paynow TEST initiations and signed `Paid` events, including two `NO_VERIFICATION_AUTHORITY` ignored callbacks marked poll-verified. Their evidence supports previous TEST connectivity only. Their original amounts were USD-oriented, receipts included ZWG, signed status currency was missing. This does not prove USD settlement. Their original Paynow references are securely retained in Staging, not copied into broadly visible GitHub documentation.

**New R2 provider physical payment:** `BLOCKED_MERCHANT_TEST_SESSION`. Paynow's TEST "Faked Success" flow requires the account that created the integration to authenticate. The implementation had no authenticated Paynow merchant browser session or authorized operator header from the connected services; it intentionally did **not** create a further TEST intent or fabricate a provider callback. New R2 simulator evidence count remained zero.

**LIVE code:** `PARTIAL_CANDIDATE_MONETARY_RPC_PENDING`. Separate LIVE secrets, callback/return host, production/non-staging environment, authorizations and `payment_record_paynow_live_status` hook are implemented. The separate LIVE monetary RPC is **not yet implemented or deployed**, and merchant-specific USD currency/settlement evidence is not available. Do not set `PAYNOW_LIVE_MONETARY_RPC_CERTIFIED=1` or `PAYNOW_MODE=live`. Historical TEST RPC must never be reused as LIVE verification. `LIVE_MERCHANT_USD_CERTIFIED=NO`. `PUBLIC_CHECKOUT=DISABLED`.

## 4. Independent reviewers — mandatory assignments, not fictitious approvals

- **Security specialist R2-ICR-SEC:** independently verify exact SHA, staging v24 callback source, malicious signatures/duplicate and mixed-currency cases, trusted URLs, amount/ref/poll integrity, noncommercial TEST-only events, CSRF/operator and LIVE flags, no cross-environment fallback and no direct monetary RPC.
- **Finance specialist R2-ICR-FIN:** independently verify SQL ledger aggregate and event audit, historical exception integrity, Premium USD 5 plan, unique provider-event/entitlement indexes, exactly-once genuine-money reconciliation, no TEST simulation posting, clearing authority pending, refund/reversal treatment and no synthetic Paid-to-membership path.
- **Owner/Moderator:** decide ACCEPT/REMEDIATE/BLOCK only after these separate reviewers return evidence. The implementation specialist does not independently approve the candidate.

## 5. External Owner/provider action register

1. Owner, authenticated Paynow merchant console: complete **one** explicitly authorized *TEST-only* Faked Success against the current TEST integration; securely preserve provider transaction reference, charge/receipt display and poll hashes/screenshots. No real money. Confirm no duplicate merchanttrace or ambiguous re-initiation.
2. Paynow support: supply merchant-specific evidence of the LIVE USD integration and enabled payment channels, settlement currency/bank account, and authoritative USD payment status/statement API. Paynow forum ZiG TEST policy is generic only.
3. Security/Finance independent reviewers: return signed exact-SHA results and establish the separate LIVE monetary-RPC design/migration gate, without Production deployment or real-money execution.
4. Owner: separately authorize any LIVE monetary test, its amount, settlement/refund treatment and environment. No current approval.

## 6. Controlling disposition

```text
ENGINEERING_CANDIDATE=PASS_61_OF_61
STAGING_TEST_EDGE=DEPLOYED_VERSION_24
GATEWAY_TEST_END_TO_END_R2=BLOCKED_MERCHANT_TEST_SESSION
LIVE_CODE_READY=PARTIAL_CANDIDATE_MONETARY_RPC_PENDING
LIVE_MERCHANT_USD_CERTIFIED=NO
LIVE_USD_SETTLEMENT=NOT_CERTIFIED
PUBLIC_CHECKOUT=DISABLED
REAL_MONEY_THIS_UNIT=0
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
SECURITY_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
FINANCE_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
MODERATOR_REVIEW_REQUIRED=YES
```

## 7. R3 continuity correction — 2 November 2026 (append-only)

**Final Moderator-accepted R2 engineering source:** `0f24b9f6d26b773276a14717760ca749e13c862c` on `fix/ht-mvp-paynow-usd01-r2-test-simulator-closure`, Draft PR #131 (unmerged). **Final exact-head CI:** [41388004933](https://github.com/kudzimusar/htp-zw/actions/runs/41388004933), 49/49 Paynow plus 12/12 Finance/Premium = **61/61 PASS**. **Final exact-head READY Preview:** `dpl_Gqyghyswj3iVZqBqm7HPK6ey92J9` at `https://healthtimes-staging-6caqpb6tw-11-11.vercel.app`.

The earlier `ab20258ec98108640299aefa980ce2b6c24f4de3` preview and automated results are historical intermediate engineering evidence, **not** the controlling R2 accepted SHA. Historical SQL evidence, R2 TEST callback v24, USD policy and all pending external gates remain unchanged. This addendum corrects only the continuity interpretation; it does not retroactively certify the physical merchant TEST session or LIVE USD settlement.
