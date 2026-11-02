# HT-MVP-PAYNOW-USD-01-R2 — USD-FIRST TEST SIMULATOR & LIVE GATES

**Assignment:** Issue #128, 2 November 2026.  
**Exact parent:** `bdb2274e9cd145bbbbb114bcaf237ced712e87d8` (R1 Draft PR #125).  
**Owner USD-first policy:** Draft PR #129, head `65e1b10183209dd7d9dccc10a6272a0866d69e4f`; reference/decision recognized, not merged into source or represented as formally adopted.  
**Implementation:** `fix/ht-mvp-paynow-usd01-r2-test-simulator-closure` (Draft, no merge).

## Classification contract

| Independent authority | Required fact | R2 behavior |
| --- | --- | --- |
| Product | `healthtimes_premium_monthly` USD 5.00/month | Unchanged canonical plan; no FX conversion |
| Provider TEST | Signed Paynow status + fresh authenticated poll + identity/amount agreement | Non-monetary `TEST_SIMULATED_PAID/FAILED/CANCELLED/PENDING` evidence only |
| TEST receipt currency | Actual signed `currency` if present or separately documented receipt, never inferred | `reported_currency` from signed status, or NULL; `simulator_receipt_currency=NULL` unless independently attested |
| LIVE USD | Approved merchant account, USD payment methods, verified payment/settlement currency | Explicit independent gates; no payment without all |
| Premium | Paid real transaction must reconcile exactly once and meet amount/currency/RBAC rules | TEST cannot call `payment_record_paynow_status`, monetary reconciliation or entitlement grant |
| Finance | Provider receipt/clearing/settlement/reversal provenance | No TEST ledger posting or refund; all historical facts retained |
| Production | Explicit Owner authorization only | NONE; checkout stays closed |

The Paynow TEST-only Edge callback remains pinned to Staging project `bzuvntbkevvuhfhqhkua`. It verifies SHA-512 signatures, strictly approved poll URLs, matching reference/provider reference/amount, poll-response signatures, and event hash idempotency. It writes **existing** `provider_webhook_events` with `verification_authority=NO_VERIFICATION_AUTHORITY`, `status=ignored`, `error=TEST_SIMULATED_*`, sanitized provenance, and zero monetary reconciliation eligibility. No new table or override of the original ledger is necessary. Signed TEST `Paid` is not `PAYMENT_VERIFIED`.

R2 Vercel TEST callback/poll routes forward signed status to the separate Staging TEST Edge function rather than making a direct monetary status-RPC call; the TEST Premium operator path is authenticated and requires the existing independent operator token, CSRF, a valid subscriber and Staging/TEST configuration. Public checkout is deliberately **never enabled** in TEST, regardless of readiness flags. Readback exposes `test_outcome` alongside `payment_verified=false` without modifying financial status.

## Independent LIVE engineering gate

LIVE-capable source validation uses distinct `PAYNOW_LIVE_INTEGRATION_ID` / `PAYNOW_LIVE_INTEGRATION_KEY`, exact approved public callback and return origins, `VERCEL_ENV=production`, a non-Staging Supabase project, `PAYNOW_MODE=live`, plus explicit server approvals:

`PAYNOW_LIVE_CODE_ENABLED`, `PAYNOW_LIVE_OWNER_AUTHORIZED`, `PAYNOW_LIVE_SECURITY_APPROVED`, `PAYNOW_LIVE_FINANCE_APPROVED`, `PAYNOW_LIVE_MERCHANT_USD_CERTIFIED`, `PAYNOW_LIVE_SETTLEMENT_CURRENCY_EVIDENCE_CONFIRMED`, `PAYNOW_LIVE_PAYMENT_EXECUTION_AUTHORIZED`, `PAYNOW_LIVE_MONETARY_RPC_CERTIFIED`, `PAYNOW_PROVIDER_AUTHORITY_CERTIFIED`, `PAYNOW_CHECKOUT_IMPLEMENTATION_VERIFIED`, and `PAYNOW_CHECKOUT_PUBLIC`. All must explicitly equal `1`.

The LIVE status path intentionally calls the **separate, not-yet-deployed** `payment_record_paynow_live_status` contract and refuses absent/non-USD signed currency. **LIVE merchant monetary RPC and currency settlement evidence have NOT been certified**; the historic `payment_record_paynow_status` remains TEST-specific and is forbidden as a LIVE substitute. Do not set `PAYNOW_LIVE_MONETARY_RPC_CERTIFIED=1` until a separate independently reviewed LIVE database migration provides true USD financial authority, merchant evidence and audit. These gates are OFF in the current environment and no LIVE call was made. Claim `LIVE_CODE_READY=PARTIAL_CANDIDATE_MONETARY_RPC_PENDING`, not LIVE settlement.

## Historic provider TEST evidence (read-only)

The Staging database (query executed 2 Nov 2026) contained five Paynow `PROVIDER_CONNECTIVITY_TEST` intents, four `PROVIDER_INITIATED`, one `CURRENCY_MISMATCH`, no `PAYMENT_VERIFIED`, no Paynow Premium entitlements, no Premium reconciliations and one open exception. The mismatch row has provider status `Paid`, `expected_amount=1.00`, `reported_amount=1.00`, `currency=USD`, a provider reference and a stored poll target, plus `currency_source=PROVIDER_CURRENCY_DISPUTED`. The receipt is ZWG, signed status currency absent. Three Paynow webhook events showed signed `Paid` evidence, two with `NO_VERIFICATION_AUTHORITY` and poll-verified metadata. These are historical real provider TEST artifacts, **not a newly executed R2 physical payment, not proof of USD money movement**. Original provider references/hashes are retained in Staging and intentionally not copied into unrestricted documentation.

Physical Paynow TEST mode requires the actual merchant login for simulated checkout (per official Paynow Developer Hub), and the connected GitHub/Supabase/Vercel read-only evidence path does not provide that merchant browser session or disclose TEST operator credentials. Therefore **a new R2 authenticated provider-simulator checkout and receipt is BLOCKED_MERCHANT_TEST_SESSION**. No fabricated signed status or forced USD-currency overwrite is permissible.

## Test and certification evidence (append-only)

- Starting R1: 42/42 signed protocol/callback/recovery/Premium fixture tests, 12/12 Finance/Premium disposable Postgres tests, exact-head CI 41365118289 SUCCESS.
- R2 deterministic suite: full historical R1 tests plus R2 TEST/LIVE separation and failure-path tests. Exact results must be captured from the R2 candidate GitHub Actions run, not inferred.
- R2 Preview must be exact-source VERIFIED, not canonical Staging.
- Staging SQL must read back unchanged financial facts and existing service-only RPC privileges; no migration, historic event rewrite, entitlement insertion or refund authorized.
- Formal independent provider security and Finance specialists must separately certify final SHA before ACCEPT; implementing specialist cannot self-accept.
- Provider-specific LIVE USD bank settlement method and customer currency not proven by forum discussion.

## Safe merchant TEST operator runbook (not executed by this candidate)

1. Confirm preview exact SHA, current TEST credentials, merchant owner login and test operator token in its protected environment; use only Staging test project and the approved merchant account.
2. Create exactly one controlled TEST connectivity intent through existing operator-only route. Use the merchant account to select **TESTING: Faked Success**; capture provider-created reference, receipt display currency and status/poll hash metadata *securely*.
3. Verify new provider event is `TEST_SIMULATED_PAID`, `verification_authority=NO_VERIFICATION_AUTHORITY`, `payment_verified=false`, no Premium entitlement/reconciliation/journal, and repeat callback yields no second event.
4. Run controlled cancellation/retry safety only where required and authorized; never rerun ambiguous provider initiation without merchanttrace recovery evidence. No actual funds, refund or Production operation.

## Pending external decisions

**Owner:** securely provide merchant-bound TEST checkout session/receipt; confirm future LIVE USD merchant integration and enabled payment methods, settlement account, Finance and independent-review authorities.  
**Paynow provider:** confirm actual LIVE merchant currency and signed field or authoritative USD settlement evidence path; clarify ZiG/ZWG TEST receipt contract.  
**Independent security:** verify no signature/currency spoofing, HTTP bypass, replay, token exposure, SSRF, or TEST-to-LIVE transition.  
**Independent Finance:** verify TEST event creates zero money ledger rows, zero Premium entitlements, zero postings/refunds, and no change to original exception.

**Release gates:** `PUBLIC_CHECKOUT=DISABLED`; `REAL_MONEY=0`; `PRODUCTION_TOUCHED=NO`; `MERGE_PERFORMED=NO`; `LIVE_USD_SETTLEMENT=NOT_CERTIFIED`.
