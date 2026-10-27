# HT-MVP-EXT-01A-PAYNOW-PROTOCOL-01 — Merchant Migration / Protocol Evidence

**Exact parent:** `3f8bb9ee08011f63d53ebeddab7b592755abcb7a`
**Classification:** isolated server-only Paynow protocol candidate; NOT provider transaction authority.
**Unit date:** 28 October 2026.

## Account evidence

The Owner supplied an existing active Paynow merchant profile for MITAP Media / MITAP MEDIA Pvt Ltd, associating HealthTimes digital journalism and the website healthtimes.co.zw with this merchant. The account-active statement is Owner-provided; this unit did not independently log into the merchant portal. No owner identity document numbers, email/login credentials, phone numbers, keys or other personal account information have been copied into source control.

**Important:** A live merchant account is not the same as a LIVE Advanced Integration. Each Paynow Advanced Integration has its own Integration ID, secret Integration Key, enabled channels and TEST/LIVE status. New integrations normally begin in TEST mode even when the merchant's account is already active. Official guidance: https://developers.paynow.co.zw/docs/paynow/integration_generation/ and https://developers.paynow.co.zw/docs/paynow/test_mode/.

## Implemented and testable

- `lib/paynow-protocol.js` implements provider-spec SHA-512 hashing of ordered raw field values plus secret key, upper-case hex, constant-time verification, duplicate/invalid form rejection and strict HTTPS destination validation.
- Validates HealthTimes merchant references, server-calculated two-decimal amounts, URLs, signed initiation reply and signed status updates.
- The helper does not perform network calls, create transactions, change payment status, grant Premium, reconcile invoices, or mutate Finance/GL.
- A provider-signed `Paid` claim is explicitly insufficient to grant entitlements; authoritative provider polling, idempotency, exact amount/reference checks and reconciliation are reserved for a later approved implementation.
- `tests/paynow-protocol.test.js` validates Paynow's public signature vector, tampering, bad keys, reordered/duplicate fields, URL and amount validation, unsafe redirect denial, and fail-closed financial authority. Test fixtures contain no real secrets.
- `api/commerce.js` and `apps/mobile/src/growth/payment-readiness.ts` are unchanged; existing checkout/webhook gates remain disabled.

## Next provider-backed unit

1. In the Paynow merchant portal, inspect `Other Ways To Get Paid → Create/Manage Shopping Carts → Advanced Integration`. Locate or create the **HealthTimes TEST** integration; verify ID, supported methods, active mode and settlement destination.
2. Install `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, `PAYNOW_MODE=test` in the authorized **server-only Vercel Preview** environment of the correct backend. Do NOT paste keys in chat, ship them in client bundles or commit them.
3. Certify transaction initiation, signed callback verification, provider-confirmation polling, replay/idempotency, settlement isolation and exact amount/currency/reference reconciliation against TEST provider evidence.
4. Only after explicit separate Moderator/Owner authority, propose staging checkout activation. No live charges, canonical promotion, Production access, Finance/GL authority change, recurring tokenization or entitlement grant is authorized here.

**Run:** `node --test tests/paynow-protocol.test.js`.
