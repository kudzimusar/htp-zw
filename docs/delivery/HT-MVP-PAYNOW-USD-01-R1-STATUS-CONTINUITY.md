# HT-MVP-PAYNOW-USD-01-R1 — Payment Authority, USD Evidence & Continuity Checkpoint

**Programme:** HealthTimes 2.0 — Final Unified MVP  
**Unit:** HT-MVP-PAYNOW-USD-01-R1  
**Starting exact source:** `c6abb2f11aa3d0deffd1b512d795e5b2da8b306d`  
**Implementation branch:** `fix/ht-mvp-paynow-usd01-r1-provider-certification`  
**Staging Supabase:** `bzuvntbkevvuhfhqhkua`  
**Governance:** 11-11-GM-GC-001 v1.0 procedural candidate; NOT formally adopted by this unit  
**Production, real charge, refund, merge and public checkout authorization:** NONE.

## Baseline and custody

There is no approved numerical Paynow USD work-package baseline in the inspected programme records. Therefore `ACCEPTANCE_PERCENT=NOT_BASELINED`. The following reviewable baseline is proposed, not represented as approved:

| ID | Specialist lane / deliverable | Disposition |
| --- | --- | --- |
| USD01-SRC | Verify exact source, existing ledger/RPC, historical draft PR #122 and active callback | EVIDENCE_REVIEWED |
| USD01-PROT | Existing provider signing, callback/poll parity, malformed/replay/currency/amount contract tests | EXISTING FOUNDATION; candidate exact-head re-certification |
| USD01-SAFE | Prevent ambiguous initiation timeouts becoming duplicate provider requests | CANDIDATE REMEDIATION; independent verification required |
| USD01-USD | Authenticate merchant's USD provider/receipt/settlement authority | BLOCKED_PROVIDER_USD_AUTHORITY |
| USD01-PREM | Premium USD 5.00 authenticated payment → verified reconciliation → exactly-once entitlement | DETERMINISTIC_CONTRACT_ONLY; physical USD event unavailable |
| USD01-FIN | Finance and reversal provenance with no double posting | EXISTING LEDGER; further independent audit required |
| USD01-STG | Staging-only physical Paynow TEST USD payment, approval of release gates | NOT_AUTHORIZED / BLOCKED_PROVIDER_USD_AUTHORITY |
| USD01-ICR | Independent provider-security and financial acceptance by non-implementing specialist | NOT_YET_CERTIFIED |

The Moderator retains acceptance/merge/release authority. Programme controller must allocate one independent provider-security specialist and a separate Finance reviewer before a final acceptance claim. Never award an invented percentage.

## Source review (2 November 2026)

- Modern source authority includes `lib/paynow-runtime.js`, `lib/paynow-protocol.js`, `api/commerce.js`, `supabase/functions/paynow-test-callback/index.ts`, shared protocol and payment migrations. Historical PR #122 remains draft/unmerged; its old code must not be blindly merged.
- Paynow staging Edge Function `paynow-test-callback` was listed ACTIVE, version 23, with `verify_jwt=false`; it performs its own signature and provider polling verification. This unit has not redeployed it.
- Paynow Vercel environment-key metadata (values were NOT read): `PAYNOW_MODE`, `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY` target Preview and the Vercel project's Production target; `PAYNOW_TEST_OPERATOR_TOKEN` targeted the project's Production environment only. Neither `PAYNOW_PROVIDER_AUTHORITY_CERTIFIED`, `PAYNOW_CHECKOUT_IMPLEMENTATION_VERIFIED`, nor `PAYNOW_CHECKOUT_PUBLIC` appeared among that project's configured variable names. Vercel's project environment label must not be confused with HealthTimes Production authorization.
- The existing runtime allows only `PAYNOW_MODE=test` and requires separate certified/verified/public readiness flags for checkout. Their values were not changed. No secrets were exposed.

## Read-only live staging ledger receipt

A read-only SQL aggregate on staging reported:

```text
PAYNOW_TEST_INTENTS=5
PROVIDER_INITIATED=4
CURRENCY_MISMATCH=1
PAYMENT_VERIFIED=0
PREMIUM_ENTITLEMENT_RECONCILIATIONS=0
PAYNOW_PREMIUM_ENTITLEMENTS=0
OPEN_PAYMENT_EXCEPTIONS=1
PREMIUM_PLAN=healthtimes_premium_monthly / USD 5.00 monthly
```

The sole open `CURRENCY_MISMATCH` exception reads: checkout/expected **USD**, provider TEST receipt **ZWG**, status **Paid**, signed callback/poll currency **OMITTED**. Preserve all five historic rows, event hashes, exception, reconciliation records and audits. No status rewriting, direct entitlement SQL, backfilled USD evidence, or synthetic successful provider event.

## USD provider protocol authority

Official source:
- https://developers.paynow.co.zw/docs/paynow/status_update/
- https://developers.paynow.co.zw/docs/paynow/polling_status/
- https://developers.paynow.co.zw/docs/paynow/test_mode/
- https://developers.paynow.co.zw/docs/paynow/initiate_transaction/

Paynow's documented standard status + poll fields include `reference`, `paynowreference`, `amount`, `status`, `pollurl`, `hash`; **currency is not guaranteed**. SHA-512 verification can authenticate these fields, but cannot independently certify USD when currency is absent. The Paynow initiation form in existing code likewise sends an amount and descriptive text, not a provider-specified ISO currency field. Merely mentioning "USD" in HealthTimes description/checkout copy does not prove Paynow settlement currency. The ZWG TEST receipt could result from provider merchant configuration, TEST behavior or channel rules; **the specific cause is NOT PROVEN** without Paynow integration/transaction evidence. Do not change the currency guard to accept absent currency.

## Source defect remediated in candidate

The original `payment_claim_paynow_initiation` SQL reopened `PROVIDER_PENDING` intents after five minutes. The Vercel initiation runtime also released a claim on any fetch/verification error. A timeout or lost signed reply does not prove the provider rejected the transaction: those behaviors could cause duplicate provider initiations for the same merchant reference.

Candidate remediation:
1. The server may release `PROVIDER_PENDING` only on an explicitly cryptographically verified Paynow `Status=Error`, never timeout, HTTP failure, bad signature or post-response database failure.
2. The database removes automatic five-minute reclaim and restricts release to `PAYNOW_INITIATION_REJECTED`; other ambiguous states remain pending until explicit merchanttrace investigation.
3. Applied the exact, non-destructive candidate migration to Staging Supabase `bzuvntbkevvuhfhqhkua` only; migration returned `success=true`. Post-migration read-only function and privilege inspection verified no five-minute claim reset, ambiguous release guard present, and both RPCs service-role-only. No historical payment row state or aggregate count changed.
4. `tests/migration/paynow-usd01-r1.spec.js` adds deterministic, network-free failure/replay tests; no merchant credentials or provider transactions.

Provider merchanttrace recovery is a **separate bounded authority decision**, not permission to initiate another transaction while the prior attempt is ambiguous.

## Exact-source engineering & Staging certification (2 November 2026)

- **CI source head**: `b286d5088abbcac4cff8f62f8174b04d9e11fd69`, [GitHub Actions run 41364684074](https://github.com/kudzimusar/htp-zw/actions/runs/41364684074), completed SUCCESS.
- **Protocol/Edge callback/ambiguous-recovery suite**: 36/36 passing. This includes valid and invalid signatures, duplicate fields, callback/poll disagreement, currency missing or mismatched, wrong amount/reference, timeout, authenticated Error release, and repeated-initiation prevention.
- **Payment readiness, Finance, Premium contract suite**: 12/12 passing, including the disposable PostgreSQL migration and entitlement-replay test. No real provider/merchant money movement was performed.
- **Vercel/API syntax**: Node syntax checks PASS; a separated preview deployment of CI head was requested, subject to independent runtime inspection. Public checkout activation was not requested.
- **Staging RPC implementation**: new TEST-only migration deployed without business-row changes; post-apply read-only audit: `no_stale_claim=true`, `rejects_ambiguous_release=true`, `claim_service_only=true`, `release_service_only=true`.
- **Post-apply ledger integrity**: 5 intents; 4 provider initiated; 1 currency mismatch; 0 payment verified; 1 open exception; 0 Premium reconciliations and Paynow entitlements.
- **Evidence classification**: deterministic CI PASS + Staging DDL/RPC inspection PASS. Provider USD charge/settlement physical certification **NOT DONE**. Public checkout **DISABLED**. Independent security/financial acceptance **PENDING**.

## Premium / Finance control

- Price/plan authority: `healthtimes_premium_monthly`, USD 5.00 monthly.
- Only a verified, currency-matched, amount-matched provider result may invoke the existing Premium reconciliation RPC.
- `premium_entitlement_reconciliations.transaction_id` and ledger idempotency must ensure exactly-once grants; callbacks without USD currency evidence, ZWG receipts, rejected signatures, wrong amounts or cancellations cannot grant access.
- No synthetic paid rows, no real refunds or bank settlement tests. Refunds/disputes and accountant policy remain governed by the existing Finance registers, including `PENDING_ACCOUNTANT_AUTHORITY` where applicable.
- Distinguish a provider-issued refund and provider settlement from an internal ledger reversal. No production settlement proof is present.

## Provider-support request (draft only; NOT sent)

**Subject:** HealthTimes / MITAP Media — Paynow Advanced Integration USD TEST currency authority and receipt discrepancy

Dear Paynow Technical Support,

We are migrating an existing HealthTimes digital-content merchant integration and require clarification before enabling any USD checkout. A controlled Paynow TEST initiation displayed USD at checkout, yet the Paynow TEST receipt displayed ZWG. The SHA-512 signed status/poll response reported `Paid`, reference and amount, but did not include a currency field.

Please identify, for the specific merchant integration and TEST transaction to be supplied through your secure support channel:

1. Is this Advanced Integration configured for USD acceptance, ZWG acceptance or both? Is that enforced per integration or per payment method?
2. What currency does the provider TEST simulator actually report/receipt, and is the ZWG TEST receipt a simulator behavior, channel-specific conversion or merchant configuration defect?
3. What was the transaction's original charge currency, displayed checkout currency, payment channel currency, receipt currency and expected settlement currency?
4. Where can we obtain independently verifiable **USD transaction-currency evidence** if standard signed callback and polling messages omit the currency field? Please confirm whether there is a signed API field, merchant report, provider statement or additional authorized service for this.
5. Can Paynow provide a safe merchanttrace/transaction lookup and exact reference-matched TEST sample showing authoritative USD payment and settlement metadata, without transferring actual money?
6. Which USD payment channels are enabled, and what changes are required before an Owner-authorized LIVE USD merchant activation?

We can provide the integration ID, TEST reference, screenshot and signed status metadata only through a secure support process. No passwords, secret Integration Keys or access tokens should be emailed.

Kind regards,  
11-11 Tech — HealthTimes Engineering

## Owner action register

| Authority | Required action | Current state |
| --- | --- | --- |
| Paynow merchant / Owner | Confirm specific TEST Advanced Integration identity, permitted USD currency/channel, and match Paynow ZWG receipt to merchant TEST transaction | PENDING |
| Paynow provider | Give authoritative USD evidence path and explain omitted signed currency | BLOCKED_EXTERNAL_PROVIDER |
| Owner / accountant | Approve billing currency, merchant settlement account, refund, deferred revenue, VAT/fiscalization treatment before LIVE payment | PENDING_POLICY |
| Owner / Moderator | Authorize any future real charge, amount, merchant and refund/settlement protocol explicitly | NOT_AUTHORIZED |
| Independent certifier | Re-run exact-head provider, financial, migration and Premium contracts; certify evidence separately | NOT_YET_CERTIFIED |

**Gate:** `BLOCKED_PROVIDER_USD_AUTHORITY` for real USD settlement + physical Premium entitlement acceptance. `CHECKOUT_PUBLIC=DISABLED`. This document does not approve a release or merge.
