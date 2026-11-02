# HT-MVP-PAYNOW-USD-01-R4-FIN — Finance/schema evidence, NOT an independent certification

Date 2026-11-02; frozen R3 SHA `8f93c30fe53308aae2d1ef2bfef172576efe50ea`; R4 PR #138.

**Finance review actor:** NOT APPOINTED. Must be different from the implementer AND Security reviewer. **Status: `BLOCKED_INDEPENDENT_FINANCE_REVIEW`.**

## Staging read-only financial truth

```text
PAYNOW_INTENTS=5
PROVIDER_INITIATED=4
ORIGINAL_CURRENCY_MISMATCH=1
OPEN_PAYMENT_EXCEPTIONS=1
PAYMENT_VERIFIED=0
PAYNOW_WEBHOOKS=3
R2_R3_R4_NEW_TEST_SIMULATED_EVENTS=0
PAYNOW_PREMIUM_ENTITLEMENTS=0
PREMIUM_RECONCILIATIONS=0
FINANCE_PAYNOW_PAYMENT_ROWS=0
REVERSALS=0
LIVE_MONETARY_RPC_DEPLOYED=0
LIVE_USD_ATTESTATION_TABLE_DEPLOYED=0
CANONICAL_PREMIUM_PLAN=healthtimes_premium_monthly;USD_5.00;month;active
```

Existing `Paid` Paynow TEST is **CURRENCY_MISMATCH**, NOT USD paid: checkout USD, simulator receipt ZWG, signed status has no guaranteed currency. Historical exception and audit remain unchanged. The TEST Edge records only `NO_VERIFICATION_AUTHORITY` events. No new Paynow money, Premium entitlement, accounting posting, settlement, reversal or refund was created by R4.

## Full-schema parity exercise

The existing 12-test Finance suite includes a full disposable PostgreSQL database applying the HealthTimes Finance and payment schema, payment test authority, and the historical currency-evidence remediation. R4 **appends the undeployed candidate LIVE migration to that exact disposable database**, verifies function and attestation table creation, absence of `service_role` attestation insertion and public function execution, preservation of historical mismatch and exception, and refusal to promote a connectivity transaction without LIVE evidence. Prior R3 2-test simplified disposable database checks concurrent idempotent callback/poll. Neither test applies a LIVE SQL change to Staging or Production.

## Critical evidence limitation — FIN-R4-001

The R3 LIVE attestation candidate contains textual `security_reviewer`/`finance_reviewer` names and a 64-character provider evidence hash, but **no independently authenticated reviewer-signature verification or protected provider document retrieval is implemented**. A privileged database actor could populate names and arbitrary hashes without demonstrating that the merchant-specific Paynow receipt or settlement statement is authentic. These fields are therefore **not by themselves independent provider evidence**. Treat as a **High commercial release blocker**, not as proof of real USD settlement. Do not set `PAYNOW_LIVE_MONETARY_RPC_CERTIFIED` or any LIVE authorization flag on this basis; no LIVE SQL deployment authorized.

Provider receipt, charge currency, verified USD collection, bank settlement, clearing account and general-ledger posting are separate facts; a signed TEST `Paid` cannot establish any of them. Refund, dispute, chargeback and entitlement revocation require separately approved evidence and procedures.

## Required distinct Finance reviewer

The independent Finance actor must authenticate provider evidence from an approved merchant-bound source, inspect the actual protected artifact and verify its hash, bind identifiable two-person review approvals, run malicious currency/provenance/replay/amount cases against the actual schema and review refund and accountant policy. Return `FINANCE_ACCEPTED|REMEDIATE|BLOCKED` with identity, final SHA, SQL and ledger evidence. **No sign-off has been received.**
