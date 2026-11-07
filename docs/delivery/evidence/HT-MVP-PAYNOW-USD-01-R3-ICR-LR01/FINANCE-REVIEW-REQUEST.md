# R3 Finance — Non-Implementing Reviewer Assignment and Evidence

**Unit:** HT-MVP-PAYNOW-USD-01-R3-ICR-LR01-FIN  
**Frozen R2 parent:** `0f24b9f6d26b773276a14717760ca749e13c862c`  
**Candidate implementation tested:** `3e687c97974fdfee0895c699442fa3b6d80d551e`  
**Review actor:** NOT ASSIGNED. This is source-and-Staging analysis for independent review, not a Finance acceptance.  
**Disposition:** `BLOCKED_INDEPENDENT_FINANCE_REVIEWER`.

## Staging accounting truth, independent read-only source query (2 November 2026)

```text
PAYNOW_INTENTS=5
PROVIDER_INITIATED=4
HISTORIC_CURRENCY_MISMATCH=1
PAYMENT_VERIFIED=0
OPEN_PAYMENT_EXCEPTIONS=1
PREMIUM_ENTITLEMENT_RECONCILIATIONS=0
PAYNOW_PREMIUM_ENTITLEMENTS=0
PAYNOW_WEBHOOKS=3
TEST_SIMULATED_EVENTS_CREATED_IN_R2_R3=0
PAYMENT_REVERSALS=0
LIVE_MONETARY_RPC_DEPLOYED=0
LIVE_ATTESTATION_TABLE_DEPLOYED=0
PREMIUM_PLAN=healthtimes_premium_monthly;USD_5.00;MONTHLY;ACTIVE
```

The original Paynow TEST `Paid` record was `CURRENCY_MISMATCH`: checkout USD, provider receipt ZWG, signed status currency absent. This is retained **unchanged**, not real USD settlement. Existing ledger still has zero monetary Premium entitlement/reconciliation records. No R3 monetary charge, refund, provider settlement or journal posting was executed.

## Finance trust and authority

- Canonical USD 5.00 plan is unchanged; ZWG/ZiG TEST simulator is not financial receipt or FX conversion.
- R2 signed TEST callback results `TEST_SIMULATED_*` carry `NO_VERIFICATION_AUTHORITY` and are excluded from money ledger and commercial entitlement RPC.
- R3 LIVE adapter contract requires an **externally verified provider USD attestation** with independent Security and Finance approvals matching merchant reference, amount, provider reference, integration identity and charge/settlement currency. A signed `Paid` callback that omits currency is insufficient by itself.
- The R3 candidate SQL is **undeployed** under `supabase/migrations/candidates/20261102090000_ht_mvp_paynow_r3_live_usd_attested_contract.sql`. Its attestation table has RLS, forbids app service-role INSERT, and an UPDATE/DELETE immutability trigger. It requires two distinct reviewer names and evidence digest. It does not post to GL or settle bank cash.
- The disposable PostgreSQL test uses a **synthetic** `PAYNOW_PROVIDER_STATEMENT` fixture inserted by test DBA identity. It proves the SQL path, denial when proof is missing, explicit ZWG rejection, wrong amount/ref, refund/nonpaid refusal, separate integration mismatch and concurrent duplicate replay. It **does not** prove a real merchant provider statement, paid USD or entitlement activation.
- The existing `premium_entitlement_reconciliations.transaction_id` and provider event uniqueness controls must be independently reconfirmed; refund/chargeback, accountant reconciliation and bank settlement remain separately authorized processes. The LIVE RPC returns `bank_settled=false` and never treats a provider `Refunded` message as an automatically reversed accounting entry.

## Outstanding independent Finance acceptance checks

A **different non-implementing Finance reviewer** must inspect source and SQL, verify amounts, plan authority, all staging ledger and audit rows (without printing secrets/PII), test unique event and reconciliation protections, confirm accountant status/clearing/settlement/reversal treatment and return `ACTOR`, `SHA`, `EVIDENCE`, `FINDINGS`, `FINANCE_ACCEPTED|REMEDIATE|BLOCKED`. External provider/merchant USD charge-and-settlement evidence and explicit future real-money approval are separate gates. No reviewer signature has been supplied.
