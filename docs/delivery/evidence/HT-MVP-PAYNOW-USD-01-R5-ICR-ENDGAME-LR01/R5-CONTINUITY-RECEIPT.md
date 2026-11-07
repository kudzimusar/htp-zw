# HT-MVP-PAYNOW-USD-01-R5-ICR-ENDGAME-LR01 — Continuity / Moderator custody

## Authority
Repository `kudzimusar/htp-zw`. Issue #140. Exact frozen R4 parent `fdb8d0f9e5d636fe047e9e4abf205c130acd25af`, existing Draft PR #138 retained. R5 branch `cert/ht-mvp-paynow-usd01-r5-icr-endgame`; dedicated Draft PR #142, never merge without separate Owner authority. R5 engineering SHA `28857a86320cabb3ee944d0e43cfc0b180fbaadb`. Verify the eventual append-only evidence SHA and exact-head CI at Issue #140; this document intentionally does not invent a self-referential final SHA.

## Implemented technical safeguards
1. Removed process-local rate limiter and implemented PostgreSQL atomic HMAC-based shared limit; candidate table/RPC **not deployed** to Staging or LIVE. Missing RPC/secret denies rate-gated operations, never falls back to Map. Vercel trusted IP handling; legitimate signed callback/poll paths never suppressed by shared IP buckets. Requires approved staging activation and environment variable `PAYNOW_RATE_HMAC_KEY`.
2. Introduced **undeployed** document-byte SHA-256 and JWT-bound distinct CAPTURE/SOURCE/SECURITY/FINANCE role approval layer for LIVE USD. R3 manual reviewer names/hashes no longer suffice when R5 candidate is applied. Real Paynow source authenticity and external auditor verification remain unavailable.
3. Preserved R4 77 passing contracts and added atomic multi-process rate, evidence identity and authentic Node HTTP socket tests (mocked Supabase authentication, not real accounts). Preserve signed SHA-512 protocol, R3 reference ownership and noncommercial TEST isolation.
4. Operator TEST callbacks remain v24 ACTIVE in Staging; no staged schema changes. No historical transaction changed.

## What cannot be falsely certified
- `REAL_SUBSCRIBER_OWNER_STATUS_HTTP=BLOCKED_NO_AUTHORIZED_REAL_SUBSCRIBER_SESSIONS`. R5 sends HTTP socket requests with two synthetic identities. No customer cookies/credential dumps are requested.
- `PHYSICAL_PAYNOW_TEST=BLOCKED_MERCHANT_TEST_SESSION`. Browser connector requires originating connected browser; the Owner must sign into the integration-owning Paynow TEST account in a controlled session. Zero new provider intents/receipts/callbacks/replays in this R5 return.
- `SECURITY_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED`; `FINANCE_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED`. No named nonimplementing Security reviewer and separate Finance reviewer supplied. No self-review approvals.
- `LIVE_MERCHANT_USD_CERTIFIED=NO`; external provider USD proof not delivered. Human SOURCE review cannot invent an authentic merchant proof.
- `SHARED_RATE_STAGING_ACTIVE=NO` until separately authorized migration and server-only HMAC provisioning. R5 Preview not suitable for authenticated protected status until these dependencies are available.

## Owner decisions (compact)
1. **Authorize Staging rate-control candidate** after independent engineering review, plus securely provision a dedicated server-only `PAYNOW_RATE_HMAC_KEY` (no secret in GitHub/chat).
2. **Designate distinct real Security and Finance reviewers** with GitHub permission and bound Supabase identities. Separately govern capture/source verifier enrollment, evidence storage/retention and audit.
3. **Open an Owner-controlled browser in the originating connected context** and log into the Paynow merchant TEST integration. Approve one TESTING: Faked Success only, with receipt/replay readback; don't share passwords.
4. Obtain actual Paynow merchant-specific USD charging/settlement records; authorize LIVE migration and money only through an entirely separate release gate.

## Nonactivation receipts
```text
TEST_MODE_AND_NONCOMMERCIAL_ISOLATION=PRESERVED
HISTORICAL_CURRENCY_MISMATCH_OPEN=YES
PREMIUM_RECONCILIATIONS=0
LIVE_RATE_SQL_DEPLOYED=NO
LIVE_MONETARY_RPC_DEPLOYED=NO
PUBLIC_CHECKOUT=DISABLED
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
REAL_MONEY=0
EXTERNAL_PROVIDER_MESSAGES=0
MODERATOR_REVIEW_REQUIRED=YES
```
