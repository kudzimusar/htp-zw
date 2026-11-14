# HealthTimes G4 commercial readiness pack

**Status:** prepared on 2026-11-14 on the local G5 branch. **G4 is not certified.** No payment has been made, no credential was touched, and commerce stays disabled.
**Audience:** HealthTimes Owner, Finance reviewer, Security reviewer, customer support lead.

**Evidence base:** the Paynow USD R1–R5 work (Draft PR #142, Issue #140) and its sealed receipt, `docs/delivery/evidence/HT-MVP-PAYNOW-USD-01-R5-ICR-ENDGAME-LR01/R5-CONTINUITY-RECEIPT.md`. Its key status lines are:

```
LIVE_MERCHANT_USD_CERTIFIED=NO
SECURITY_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
FINANCE_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
PHYSICAL_PAYNOW_TEST=BLOCKED_MERCHANT_TEST_SESSION
SHARED_RATE_STAGING_ACTIVE=NO
HISTORICAL_CURRENCY_MISMATCH_OPEN=YES
PUBLIC_CHECKOUT=DISABLED
```

## 1. Commerce-disabled launch configuration (Reader-only launch)

The default configuration takes G4 off the G5 critical path, if the Owner agrees to a Reader-only scope (issue #147 allows this).

| Layer | Setting | Effect |
|---|---|---|
| Web build | Leave `EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED` **unset** | The Premium page shows no offer. The article prompt says "Explore Premium". No checkout URL is ever opened (`apps/mobile/src/growth/purchase-policy.ts`). |
| Android and iOS | Fixed in code | Never open an external checkout. Selling in the apps would need store billing, which is not built. |
| Server | Leave every `PAYNOW_*` variable unset | `POST /api/commerce?action=checkout` returns 503 `configuration-required`, with `checkoutUrl: null` and `entitlementGranted: false`. No Paynow request is made. |
| Library | `lib/ag05-premium-commerce.js` | `checkoutImplementationReady = false` (hard-coded) |
| Premium articles | Unchanged | Bodies stay protected; readers see the approved one-paragraph or 20-second teaser |

**Verification:**
- `tests/g5-commerce-disabled.test.mjs`
- `apps/mobile/tests/g5-commerce-launch-guard.test.mjs`
- Manual check: `/premium` shows no price or button, and a Premium article shows the teaser and "Explore Premium".

## 2. What enabling commerce requires (in order)

1. **Named, independent reviewers.** A Security reviewer and a separate Finance reviewer, neither of them the implementer (section 6).
2. **Rate-limit control.**
   - Owner-authorized staging migration `supabase/migrations/candidates/20261102130000_ht_mvp_paynow_r5_shared_rate.sql`.
   - A server-only `PAYNOW_RATE_HMAC_KEY`.
3. **Merchant TEST session (section 3).** The Owner, in their own browser on the Paynow merchant TEST account, runs one "Faked Success" payment, then reads back the receipt, callback and replay.
4. **Merchant USD and settlement evidence from Paynow (section 3).** Resolve the historical currency mismatch.
5. **Refund handling (section 4).** Approved and implemented.
6. **Production domain live.** Live mode accepts only `PAYNOW_LIVE_CALLBACK_URL = https://healthtimes.co.zw/api/commerce?action=callback` and the return origin `https://healthtimes.co.zw` (`lib/paynow-runtime.js`).
7. **Live gates, each set only after its approval:**
   - `PAYNOW_MODE=live`
   - `PAYNOW_LIVE_INTEGRATION_ID` and `PAYNOW_LIVE_INTEGRATION_KEY` (Owner-held; never in chat or the repository)
   - `PAYNOW_LIVE_CODE_ENABLED`
   - `PAYNOW_LIVE_OWNER_AUTHORIZED`
   - `PAYNOW_LIVE_SECURITY_APPROVED`
   - `PAYNOW_LIVE_FINANCE_APPROVED`
   - `PAYNOW_LIVE_MERCHANT_USD_CERTIFIED`
   - `PAYNOW_LIVE_SETTLEMENT_CURRENCY_EVIDENCE_CONFIRMED`
   - `PAYNOW_LIVE_PAYMENT_EXECUTION_AUTHORIZED`
   - `PAYNOW_LIVE_MONETARY_RPC_CERTIFIED`
   - `PAYNOW_PROVIDER_AUTHORITY_CERTIFIED`
   - the `PAYNOW_CHECKOUT_*` flags
8. **Web build.** `EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED=true`, with approved Subscription Terms (`/subscription-terms`).
9. **Exact-SHA certification.** CI plus both independent reviews on the final commit.

## 3. Merchant certification requirements (Paynow)

| Evidence | Who | Notes |
|---|---|---|
| Merchant account able to charge **USD**, and the settlement currency and account | Owner, with Paynow | A written confirmation from Paynow; screenshots of the merchant portal are acceptable if dated |
| TEST integration session | Owner (own browser) | One "Faked Success" payment. Record the merchant reference (`HT-PREM-…`), the Paynow reference, the callback receipt and the poll result. Repeat the callback to prove replay is ignored. |
| Status mapping | Engineering + Finance | Cancelled, failed, disputed and refunded statuses map to the documented internal states. Unknown statuses open a `RECONCILIATION_FAILED` exception. |
| Callback integrity | Security reviewer | SHA-512 hash check (timing-safe), callback-to-poll match, duplicate suppression |
| Live keys custody | Owner | Stored only as Vercel production environment variables; rotation procedure written down |

## 4. Refund handling specification (not implemented)

**What exists.** Schema states only, in `supabase/migrations/20261027000000_ht_ext01a_payment_finance_readiness.sql`:
- `REFUND_REQUESTED` and `REFUND_CONFIRMED`;
- `REVERSAL_REQUIRED`, `REVERSED` and `REVERSAL_JOURNAL_POSTED`;
- a `REFUND_REVIEW` exception;
- refunds summed in the transparency report.

There is no refund API, no provider call and no test.

**Proposed process** (Finance must approve the policy text; engineering builds it after approval):
1. **Request.** The reader contacts support with the merchant reference. Support opens a refund request; nothing is promised to the reader yet.
2. **Decision.** A Finance reviewer applies the approved refund policy (eligibility, pro-rating, time limits). Every decision is recorded with the reviewer's name.
3. **Execution.** Confirm with Paynow whether refunds can be made by API or only in the merchant portal. Do not assume an API. Record the provider refund reference.
4. **Records.** Mark the transaction refunded (`REFUND_CONFIRMED`) and post the reversal journal. End the entitlement from the refund date. The original transaction is never deleted.
5. **Reader message.** Send a confirmation stating the amount, currency and expected timing, using approved template wording.
6. **Disputes and chargebacks.** Route to `REFUND_REVIEW`. Finance owns the outcome.

## 5. Payment support procedure (draft for the support lead)

**Never ask a reader for card numbers, mobile-money PINs, passwords or one-time codes.** Ask only for the merchant reference (`HT-PREM-…`), the date, the amount and the Paynow reference shown on their receipt.

| Case | First step | Escalate to |
|---|---|---|
| Paid but no Premium access | Look up the transaction status. Access is granted only after verified provider confirmation, never because a reader returned from the checkout page. If verified but not reconciled, raise a reconciliation exception. | Finance, the same day |
| Charged twice | Find both references. Confirm whether both were verified. | Finance (refund process) |
| Payment failed or cancelled | Explain that no access was granted and no money was taken unless Paynow shows otherwise | Finance only if the reader shows a debit |
| Cancel my membership | Record the request. Access ends as the approved Subscription Terms state. | — |
| Refund request | Open a refund request (section 4) | Finance |
| Suspected fraud | Do not discuss details. Preserve the references. | Security reviewer and Owner |

Log every contact: date, reference, case, action and owner. Response targets are a client decision.

## 6. Independent reviewer responsibilities

| Reviewer | Must not be | Reviews | Signs off on |
|---|---|---|---|
| **Security** | The implementing engineer or agent | Commerce API and runtime, secret handling, callback verification, replay and rate control, CSP and `connect-src` for Paynow, entitlement grant path, logging of personal data | The exact commit SHA and the deployed configuration |
| **Finance** | The Security reviewer or the implementer | Plan, price and currency; USD settlement evidence; reconciliation against a real Paynow statement; daily clearing; refund policy; accounting postings | The exact commit SHA, the settlement evidence and the policy texts |

The reviewer requests and the recorded blockers are in `docs/delivery/evidence/HT-MVP-PAYNOW-USD-01-R3-ICR-LR01/` and `docs/delivery/evidence/HT-MVP-PAYNOW-USD-01-R4-FINAL-ICR-LR01/`.

## 7. Advertising controls (gaps)

- **Exists:** direct advertising with placements, campaigns, creatives (review status defaults to `pending`), and advertising invoice reconciliation.
- **Missing:**
  - an approved ad-review workflow (who approves creatives, and against which standards);
  - frequency limits;
  - a decision on whether Premium readers see ads;
  - labelling rules for sponsored content (Terms of Use draft).
- **Owner and product decisions are needed before G4.**

## 8. G4 status

**Not ready.** Blocking items:
1. Named independent reviewers.
2. The merchant TEST session.
3. USD and settlement evidence.
4. The historical currency mismatch.
5. Refund policy and implementation.
6. The rate-limit migration and its key.
7. The production domain.
8. Approved Subscription Terms.

The Reader-only configuration in section 1 is ready and tested.
