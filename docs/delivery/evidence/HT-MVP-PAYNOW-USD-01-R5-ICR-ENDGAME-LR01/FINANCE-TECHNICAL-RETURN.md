# R5 Finance/Provider USD evidence technical return — NOT independent Finance acceptance

**Frozen R4 parent:** `fdb8d0f9e5d636fe047e9e4abf205c130acd25af`.
**R5 engineering SHA:** `28857a86320cabb3ee944d0e43cfc0b180fbaadb`.
**Author:** implementer via GitHub `kudzimusar`, **not** a distinct Finance reviewer.
**Review:** `BLOCKED_INDEPENDENT_FINANCE_ACTOR_NOT_ASSIGNED`.

## FIN-R4-001 — Manually typed names/hashes no longer sufficient in R5 candidate

Undeployed `supabase/migrations/candidates/20261102131000_ht_mvp_paynow_r5_identity_bound_usd_evidence.sql` layers over the R3 LIVE attestation candidate. It introduces private tables for protected provider document bytes, DB-computed SHA-256 of the actual bytes, controlled role enrollments and append-only approvals. `auth.uid()` binds authenticated CAPTURE, SOURCE (provider merchant-account verification), SECURITY and FINANCE actors to their UUIDs. Each actor has one role and cannot independently perform other roles. The reviewer must explicitly confirm the exact computed SHA. The SOURCE reviewer, both reviewers and CAPTURE must be separate identities. Direct data API access is revoked from `anon`, `authenticated` and `service_role`; restricted `SECURITY DEFINER` functions explicitly validate JWT-bound actor identity against owner-controlled role enrollment. R5 replaces the **undeployed** LIVE monetary function with a version requiring the protected artifact and all three approvals matching the existing USD transaction/reference, amount and integration.

A genuine merchant-specific Paynow document is **NOT available**. A signed TEST `Paid`, USD checkout amount, name fields and hashes cannot establish real USD charge or bank settlement. SOURCE must consult the actual merchant/provider account and document provenance under separate Owner authority; fixture reviews in disposable PostgreSQL only exercise role isolation, **not** merchant proof or a real payment. Privileged DB administrators remain a trust boundary, requiring independent audit and change control. No R5 captures/reviews, settlements or approvals have been created in Staging.

**SQL tests:** `tests/migration/paynow-r5-evidence-trust.test.js` tests synthetic bytes, SHA equality, unauthenticated denial, wrong-role denial, wrong hash denial, three distinct JWT-bound reviewer approvals, append-only mutation rejection, zero payment postings. The existing full-schema Finance suite additionally applies the R5 candidate to disposable HealthTimes schema, verifies RPC/table grants, and that historical original `CURRENCY_MISMATCH` remains intact.

## Read-only Staging financial truth, 2 November 2026

5 intents; 4 `PROVIDER_INITIATED`, 1 historical `CURRENCY_MISMATCH`, 1 OPEN exception, 3 historical Paynow webhooks, 0 `PAYMENT_VERIFIED`, 0 new simulator events, 0 Paynow Premium entitlements, 0 Premium reconciliations, 0 Finance Paynow payment rows, 0 reversals. R5 shared-rate RPC/table and LIVE monetary RPC/attestation table **absent**. Premium remains `healthtimes_premium_monthly` priced **USD 5.00/month**. No bank settlement or real Paynow transaction demonstrated.

## Independent Finance review and release blocker

Distinct authenticated Finance reviewer must independently inspect real merchant USD evidence, charge currency vs clearing/settlement, source account, invoice/plan linkage, replay, refunds, reversals/chargebacks, revenue journal and entitlement revocation; verify two-reviewer enrollment custody and provider document hash against the actual controlled merchant statement. **No external verified receipt, source-authenticated artifact or independently attributed Finance approval exists; LIVE USD is NOT CERTIFIED.**

No LIVE monetary migration deployed, public checkout remains disabled, no charge/refund/Production/merge/provider communication authorized.
