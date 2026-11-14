# Workstream C: G4 commercial certification and operations

**Status:** prepared on 2026-11-14. **G4 is not certified.**
- Checkout, refunds and every live commercial operation stay disabled.
- No payment was made and no credential was touched.

**Audience:** HealthTimes Owner, Finance reviewer, Security reviewer, customer support lead.

This continues `docs/delivery/HT-MVP-G4-COMMERCIAL-READINESS-PACK.md` (accepted). It does not redesign payments.

## 1. Reader-only launch vs commercial launch

| | Reader-only first release | Fully commercial release |
|---|---|---|
| Who can read | Everyone (public); existing Premium members sign in for Premium bodies | Same |
| Can anyone buy Premium | **No** (web and apps) | Web: yes, via Paynow. Apps: only with store billing (not built), or not at all. |
| G4 required | **No.** Only the tested commerce-off configuration. | **Yes.** Every item in section 2. |
| Server settings | All `PAYNOW_*` unset; `EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED` unset | The live gates in the G4 pack, each set after its own approval |
| Legal pages | Privacy, Terms | Privacy, Terms, **Subscription Terms**, refund policy |
| Support | Reader and account support; deletion requests | Plus payment support, refunds, disputes |
| Finance | None (no revenue) | Daily reconciliation, refunds, journals, settlement evidence |
| Store listing | "For existing HealthTimes Premium members" | Store billing decision first (decision D-08) |
| Risk if rushed | Low | Charging without refunds or reconciliation; store rejection for steering |

**Recommendation:** launch Reader-only. Run G4 certification in parallel and enable web commerce as a separate, later release (decision D-09).

## 2. Certification matrix

**Status key.** "Covered" means a test exists and passed on 2026-11-14 at `4fa9768`. "Gap" means there is no test, or the thing is not built.

| # | Requirement | Covered by | Status |
|---|---|---|---|
| C-1 | Checkout refused while not certified; no Paynow request; no entitlement | `tests/g5-commerce-disabled.test.mjs`; mobile launch guard | **Covered** (1 + 18) |
| C-2 | Callback signature (SHA-512, timing-safe); duplicate fields; unsafe URL; oversized body | `tests/migration/paynow-edge-callback.test.mjs` | **Covered** (17) |
| C-3 | Webhook **replay**: the same event is recorded once and reported `duplicate` | same file (replay and duplicate tests) | **Covered** |
| C-4 | Callback must match poll (amount, reference, transaction identity) before anything is granted | same file; `paynow-r3-status-authorization` | **Covered** (17 + 5) |
| C-5 | Premium entitlement contract: granted only after verified provider confirmation, never on return-page arrival | `paynow-usd01-premium-contract` | **Covered** (6) |
| C-6 | Subscriber isolation: one reader cannot see or act on another's transaction | `paynow-usd01-r2-isolation`; `paynow-r5-http-auth` | **Covered** (7 + 1) |
| C-7 | Shared rate limiting | `paynow-r5-shared-rate` | **Covered** (3), but the candidate migration is unapplied |
| C-8 | Live USD attestation / evidence trust | `paynow-r3-live-usd-attestation`; `paynow-r5-evidence-trust` | **Covered in code** (2 + 1). **The physical merchant evidence is missing.** |
| C-9 | Failed and cancelled payments map to no entitlement | Status mapping in the protocol tests | Partly covered. **Gap:** no single test walks every Paynow terminal status to its entitlement outcome. |
| C-10 | Entitlement transitions over time: active → renewal due → lapsed → ended | — | **Gap.** Renewal is not specified. Decision D-08 sets monthly or annual, and whether it auto-renews. |
| C-11 | Refund → entitlement ends at the refund date; reversal journal | Schema states only (`REFUND_REQUESTED`, `REFUND_CONFIRMED`, `REVERSAL_*`) | **Gap. Not built.** The policy needs Finance approval first. |
| C-12 | Dispute or chargeback → `REFUND_REVIEW` | Schema state only | **Gap** |
| C-13 | Unknown provider status → `RECONCILIATION_FAILED` exception | Protocol tests | Covered for the mapping; **gap** for the exception workflow (who clears it) |
| C-14 | Daily revenue reconciliation against a real Paynow statement | — | **Gap.** Needs a real statement (Owner + Paynow). |
| C-15 | Advertising consent, labelling and frequency | — | **Gap** (decision D-11) |
| C-16 | Newsletter consent recorded against an approved policy version; no consent → nothing recorded | `tests/g5-newsletter-contract.test.mjs` (accepted) | **Covered.** Inactive until the Privacy Policy is approved. |
| C-17 | Independent Security review of the exact SHA | — | **Gap.** Reviewer not named (D-12). |
| C-18 | Independent Finance review of the exact SHA and the settlement evidence | — | **Gap.** Reviewer not named (D-12). |

**Totals.** Covered: 43 root commerce tests plus 18 mobile commerce tests, all passing; the evidence file has the exact runs.

**Gaps that block a commercial launch:**
- C-8 physical evidence;
- C-9 completion;
- C-10 and C-11 (they need product and Finance policy first);
- C-12 through C-15;
- C-17 and C-18.

## 3. Entitlement state model (for Finance approval, then implementation)

| From | Event | To | Entitlement |
|---|---|---|---|
| — | Checkout created | `PENDING` | None |
| `PENDING` | Callback verified **and** poll matches `Paid` | `PAID` | Granted until period end |
| `PENDING` | `Cancelled` / `Failed` / timeout | `CANCELLED` / `FAILED` | None |
| `PENDING` | Unknown status | `RECONCILIATION_FAILED` | None until cleared by Finance |
| `PAID` | Period ends, no renewal | `LAPSED` | Ends at period end |
| `PAID` | Refund confirmed | `REFUND_CONFIRMED` + reversal journal | Ends at the refund date |
| `PAID` | Dispute | `REFUND_REVIEW` | Finance decides; default: kept until decided |
| any | Replayed callback | unchanged | unchanged (reported `duplicate`) |
| any | Account deleted | unchanged (anonymised) | Ended at deletion (G5 contract) |

The deletion row is already implemented and tested. Every other row is a specification until Finance approves it.

## 4. Operational procedures (drafts for the support lead and Finance)

**Payment support and refunds.** The procedures in sections 4–5 of the G4 pack stand. Additions:
- **Webhook failure** (callback never arrives). The reader's return triggers a poll; the poll result alone never grants access unless the signature-verified poll matches. If neither arrives within [1 hour], open a reconciliation exception, and do **not** grant access manually without Finance approval.
- **Webhook replay or duplicates.** No action. The system records the event once. Support never re-sends a callback.
- **Daily reconciliation** (Finance). Compare `payment_transactions` in `PAID` with the Paynow merchant statement, by merchant reference and amount in USD.
  - Unmatched on our side → exception.
  - Unmatched at Paynow → investigate before any refund.
  - Record the reviewer's name and date.
- **Month-end.** Run the transparency report, and confirm the refunds and reversals posted that month.

## 5. Certification sequence

1. Owner decisions D-08, D-09 and D-12 (product, scope, reviewers).
2. Finance approves the state model (section 3) and the refund policy.
3. Engineering builds C-9 to C-13, test-first, on a branch cut after G3/G5 certification.
4. Owner runs the merchant TEST session; Paynow supplies USD and settlement evidence (C-8).
5. Security and Finance review the exact SHA (C-17, C-18).
6. Owner sets the live gates one by one, with approval records. This is a separate production authority.
