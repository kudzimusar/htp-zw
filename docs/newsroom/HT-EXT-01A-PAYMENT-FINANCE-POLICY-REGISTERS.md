# HealthTimes External Revenue & Communications Activation
## HT-MVP-EXT-01A-RDY-01 — Payment + Finance Business Transparency Foundation & Policy Registers

- **Unit ID:** `HT-MVP-EXT-01A-RDY-01`
- **Repository:** `kudzimusar/htp-zw`
- **Source Authority:** `a41f7be33b59a6d4d3a8244b0d5d1644fe0b1699`
- **Disposition:** `AUTHORIZED — PROVIDER-INDEPENDENT PAYMENT / FINANCE READINESS`
- **Provider Authority State:** `HT-MVP-EXT-01A-PROVIDER-AUTHORITY-R3-R1 = BLOCKED_OWNER_PROVIDER_EVIDENCE`

---

## 1. End-to-End Financial Traceability Chain

Every unit of money across HealthTimes is traceable through an explicit, non-collapsible chain:

```text
business purpose (PREMIUM_SUBSCRIPTION | ADVERTISING_INVOICE | PROVIDER_CONNECTIVITY_TEST)
  → customer / subscriber (finance_customers | subscribers)
  → canonical plan / payable invoice (premium_plans | finance_invoices)
  → HealthTimes server payment intent (payment_transactions: CREATED, HT-PREM/INV/CONN-<ULID>)
  → provider transaction (PROVIDER_INITIATED / PROVIDER_PENDING)
  → provider webhook event (provider_webhook_events: UNIQUE(provider, provider_event_id))
  → verified payment (PAYMENT_VERIFIED / RECONCILIATION_PENDING)
  → business reconciliation (RECONCILED: premium_entitlement_reconciliations | finance_payments)
  → Finance entry (method=paynow | bank_transfer, provider_channel, provider_reference)
  → provider settlement (provider_settlements + provider_settlement_lines)
  → bank settlement (RECONCILED_TO_BANK)
  → provider fee (recorded from settlement evidence only, never invented at callback)
  → General Ledger (configurable provider clearing model awaiting accountant account-code sign-off)
```

---

## 2. Canonical Premium Plan Authority

Frozen in `public.premium_plans` (`supabase/migrations/20261027000000_ht_ext01a_payment_finance_readiness.sql`), `lib/ag05-premium-commerce.js`, and `apps/mobile/src/growth/payment-readiness.ts`:

```text
plan_key         = healthtimes_premium_monthly
version          = 1
name             = HealthTimes Premium
amount           = 5.00
currency         = USD
billing_interval = month
status           = active
effective_from   = 2026-01-01T00:00:00.000Z
effective_to     = null
```

---

## 3. Accountant Policy Register (Section 26 — Unresolved Pending Accountant Authority)

None of the following accounting policies are silently assumed or hardcoded into live General Ledger postings. Each item is explicitly held in `public.finance_provider_clearing_config` and `ACCOUNTANT_POLICY_REGISTER`:

| # | Policy Key | Unresolved Policy Question | Exact Implementation Consequence |
| :--- | :--- | :--- | :--- |
| 1 | `paynow_clearing_account_number` | What Chart of Accounts code should be assigned to the Paynow Provider Clearing asset account? | `finance_provider_clearing_config.accountant_approved` defaults to `false` and `provider_clearing_account_code` is `null`. Verified Paynow payments are tracked in `provider_clearing_pending_settlement` without posting unapproved GL codes. |
| 2 | `fee_expense_account` | What Chart of Accounts code should be assigned to Paynow merchant transaction/settlement fee expenses? | `provider_fee_expense_account_code` remains `null` until accountant assignment; fees are recorded on `provider_settlements` from settlement evidence only and never invented on payment callbacks. |
| 3 | `premium_revenue_recognition_timing` | Should monthly Premium subscription receipts (`$5.00 USD`) be recognized immediately upon verification or ratably over the 1-month service window? | `premium_entitlement_reconciliations` records exact `new_starts_at` and `new_ends_at` timestamps so either point-in-time or ratable recognition can be executed once authorized. |
| 4 | `deferred_revenue_treatment` | Do unearned subscription or pre-paid advertising balances require a dedicated Deferred Revenue liability account? | `finance_provider_clearing_config.deferred_revenue_account_code` remains `null` until accountant sign-off. |
| 5 | `vat_treatment` | What is the statutory VAT applicability and rate treatment on digital reader subscriptions vs commercial advertising invoices? | Invoices maintain explicit `subtotal` and `tax_total` columns; the `$5.00 USD` Premium plan does not fabricate tax splits until tax/accountant sign-off. |
| 6 | `fiscalization` | What ZIMRA FDMS fiscal device/receipt integration is required for online digital collections? | Business receipts (`payment_get_business_receipt`) issue canonical HealthTimes references (`HT-PREM-<ULID>`, `HT-INV-<ULID>`, `PAY-YYYY-NNNN`) without fabricating ZIMRA fiscal signatures. |
| 7 | `refund_accounting` | Should confirmed customer refunds be posted as contra-revenue or direct revenue reversals, and how are non-refundable provider fees treated? | `payment_reversals` records `REFUND_REQUESTED` / `REFUND_CONFIRMED` with `accounting_action = 'PENDING_ACCOUNTANT_POLICY'` and opens a `REFUND_REVIEW` exception in `payment_exceptions`. |
| 8 | `chargeback_accounting` | How should disputed payments, chargeback losses, and provider dispute fees be posted in the General Ledger? | `payment_reversals` records `DISPUTE_OPENED` / `DISPUTE_RESOLVED` with `accounting_action = 'PENDING_ACCOUNTANT_POLICY'` and opens a `DISPUTE_REVIEW` exception in `payment_exceptions`. |

---

## 4. Owner Policy Register (Section 27 — Unresolved Pending Owner Authority)

None of the following commercial/product policies are invented. Each item is explicitly preserved as unresolved in `OWNER_POLICY_REGISTER`:

| # | Policy Key | Unresolved Policy Question | Exact Implementation Consequence |
| :--- | :--- | :--- | :--- |
| 1 | `auto_renew` | Do monthly Premium memberships auto-renew via recurring token or require explicit monthly renewal checkout? | Each verified and reconciled payment grants `+1 billing month` from `max(now, current_end)`; no background recurring charge is scheduled or assumed. |
| 2 | `grace_period` | How many post-expiry grace days (if any) apply before Premium article access locks? | Entitlement checks enforce strict `ends_at > now()` with zero assumed grace days. |
| 3 | `cancellation_effective_date` | Does subscriber-initiated cancellation take effect at period end or immediately? | Paid entitlements remain valid through their reconciled `ends_at` timestamp unless explicitly modified by authorized staff with an audit reason. |
| 4 | `refund_eligibility` | Under what conditions does a Premium subscriber or commercial advertiser qualify for a refund? | Refund requests transition to `REFUND_REQUESTED` and open a `REFUND_REVIEW` operational exception for human review. |
| 5 | `dispute_entitlement_effect` | Does opening a payment dispute or confirming a refund immediately revoke active Premium entitlement? | `payment_reversals` sets `entitlement_action = 'PENDING_OWNER_POLICY'` and preserves full payment and entitlement audit history without destructive deletion. |
| 6 | `subscription_pause` | May subscribers pause active monthly memberships? | No pause state is exposed or assumed. |
| 7 | `retry_policy` | What dunning and payment retry cadence applies to failed or expired renewal attempts? | Failed or expired transactions terminate in `FAILED` or `EXPIRED`; any subsequent checkout creates a fresh idempotent payment intent. |
