# Workstream B: native mobile compliance

**Status:** prepared on 2026-11-14 on local branch `local/g2g4g6-parallel-close-01` (base `4fa9768`).
- No migration was applied.
- No live account was deleted.
- No binary was built.
- The Expo dependency set is unchanged.

**Audience:** mobile engineer, DBA, legal reviewer, HealthTimes Owner.

This document extends the accepted G5 and G6 packs; it does not replace them:
- `docs/delivery/HT-MVP-G5-NEWSLETTER-AND-ACCOUNT-DELETION.md`
- `docs/delivery/HT-MVP-G6-STORE-SUBMISSION-PACK.md`

## 1. Account deletion: end-to-end design

```
Reader (app or web)            Supabase (contract, RLS)               Operator job (server-only)
───────────────────            ────────────────────────               ──────────────────────────
type DELETE MY ACCOUNT
+ current password ──reauth──▶ auth.signInWithPassword
                    ──rpc────▶ account_request_deletion  → requested (24 h window)
see status / cancel ─rpc────▶ account_deletion_request_status / account_cancel_deletion_request
                                                                      after the window:
                                account_deletion_process  ◀────────── 1. erase and anonymise → data_erased
                                auth.admin.deleteUser     ◀────────── 2. Auth identity removed
                                account_deletion_mark_identity_deleted ◀ 3. → completed (refused while identity exists)
```

| Property | How it is enforced | Evidence |
|---|---|---|
| Only the signed-in reader can request | `auth.uid()` in the contract; anonymous callers are refused | Contract test 1 |
| Reauthentication | The client re-verifies the current password before the RPC (patch B1). An unlocked, stolen session alone cannot start deletion. | Patch B1 test (ordering assertions) |
| Deliberate confirmation | The typed phrase is checked on the client and again on the server | Contract and patch B1 |
| Cancellation window | 24 hours (Owner decision D-05). Processing refuses earlier. | Contract test; operator `SKIPPED_WINDOW_OPEN` |
| Staff cannot self-delete | Refused at request and at processing; staff leave through Newsroom offboarding | Contract test; operator test |
| Payment records retained | Kept, linked only to the anonymised subscriber | Contract test |
| No partial "completed" state | `mark_identity_deleted` refuses while `auth.users` still has the row | Operator end-to-end test 4 |
| Resumable after any failure | `data_erased` requests are picked up at step 2 on the next run; erasure is never repeated | Operator unit tests 6–7; end-to-end test 3 |
| Auditability | The request row keeps a pseudonymous user ID, timestamps, processor name and an erasure count summary. Operator logs carry a one-way `sub_…` reference and never the email or raw ID. | Operator unit test 9 |
| Dry run by default | `--execute` is required to act | Operator unit test 1; end-to-end test 1 |
| Service key containment | Used only by the operator script and never by the app; the app test asserts there is no `service_role` and no `admin.deleteUser` in client code | Patch B1 test |

### Deliverables

| File | What |
|---|---|
| `scripts/account/process-account-deletions.mjs` | Operator job with REST adapters (service role). Not scheduled anywhere. |
| `tests/account/process-account-deletions.test.mjs` | 11 failure-mode tests |
| `tests/database/account-deletion-operator.test.mjs` | 5 end-to-end tests: the job against the **real candidate contract** on a fresh Postgres 16 cluster |
| `patches/B1-in-app-account-deletion.patch` | In-app pathway (7 files). It applies cleanly at `4fa9768`. With it applied: `tsc --noEmit` is clean, and the updated identity, policy, route-metadata, ownership and personalization tests pass. |
| Section 2 below | Web deletion page copy (Google Play) |

**Mutation checks.** Each of these deliberate breakages fails at least one test:
- swallowing Auth errors;
- trusting a non-`completed` mark;
- logging the raw user ID;
- acting in dry-run mode;
- deleting a rejected staff identity.

**Pre-existing failure, not caused by this work.** `identity-security` test 13 fails with HTTP 402. That is the staging egress restriction, and the test fails identically without the patch.

### Findings for the G5 contract owner (handover H-3)

1. **No due-request listing function.** The operator lists due requests by reading `account_deletion_requests` over REST. That relies on Supabase's default `service_role` table grant; the migration grants nothing explicitly. Recommended: add `account_deletion_due_requests(p_limit int)`, granted only to `service_role`.
2. **Patch B1 hand-edits the generated types** (`database.types.ts`). Regenerate the types once the migration is applied.
3. **Readers who cannot sign in** (lost password, compromised account) have no in-contract route. The web page sends them to support. Support must then verify ownership (a password reset to the account email is enough) before a staff-assisted request. That needs a support-initiated function, or a reset followed by the reader's own request. The second option needs no new code.

## 2. Web deletion request page: draft copy (Google Play)

Publish at `https://healthtimes.co.zw/account/delete` (route to be added by the G5 web owner). Placeholders in [brackets] are Owner and legal decisions; do not publish them unfilled.

> **Delete your HealthTimes account**
>
> **In the app:** open My HealthTimes → Devices & Sessions → Delete account. Type DELETE MY ACCOUNT, enter your password and confirm. You can cancel within [24 hours].
>
> **Without the app:** email [support address — Owner to confirm] from the address on your account, with the subject "Delete my account". If you cannot sign in, we will first send a password-reset link to that address to confirm the account is yours.
>
> **What is deleted:** your sign-in, profile and name, notification devices, and reading preferences. Your comments are replaced with "[removed at account deletion]" [or: kept without your name — decision D-05].
>
> **What is kept, and for how long:** payment and invoice records, without your name or email, for [N years — Finance/legal], as tax law requires. A record that the deletion happened (no email address) for [N years]. Newsletter consent records: [decision D-05].
>
> Deletion is completed within [30 days] of the request.

## 3. Commerce-disabled first release (native)

**Already in place and tested.** Run on 2026-11-14 at `4fa9768`:

| Control | Where | Tests |
|---|---|---|
| Purchases off unless `EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED` is exactly `true` | `apps/mobile/src/growth/purchase-policy.ts` | `g5-commerce-launch-guard` and `ht-ext01a-payment-finance-readiness`: 18/18 |
| Native never opens an external checkout, regardless of the flag | `purchaseChannels`, `mayOpenCheckoutUrl` | same |
| No "Restore purchases" without store billing | accepted G4–G6 change `b0a0b53` | same |
| Server refuses checkout without Paynow readiness | `api/commerce.js` | `tests/g5-commerce-disabled.test.mjs` 1/1 |
| Existing subscribers keep access: sign-in → entitlement → full body; others see the approved teaser | Premium consumer path | `nm05-premium-consumer`, `ui-wf02c-premium-landing`, `ui03-premium-subscription-prompt`: 17/17 |

**Anti-steering scan.** I grepped every Reader surface for copy that pairs subscribe, buy or join with the website, and for prices. There were no hits on Reader surfaces. The only prices are in Owner Preview sample data and in finance notes.

**Remaining native commerce risk (G6-R1).** Owner Preview and Studio code ship in the Reader bundle, including sample financial figures and sample staff email addresses (see the Reader-bundle note in the G3/G5 record). A consumer store binary should be a Reader-only build. Apple guideline 2.3.1 (hidden features) and reviewer confusion are the risks.

That build change is owned by the G3/G5 candidate and must not be made here. It is listed in the integration handover (H-5).

## 4. Store readiness: additions to the G6 pack

The G6 pack already covers accounts, metadata corrections, draft assets, privacy answers, permissions and reviewer instructions. Additions from this workstream:

| Item | Status | Owner |
|---|---|---|
| Reviewer path to deletion | Changes to: My HealthTimes → Devices & Sessions → **Delete account** (typed phrase + password). Update the G6 review-notes template. | Mobile engineer |
| Google Play "Delete account URL" field | `/account/delete` (section 2), once published | G5 web owner + Owner |
| Data safety form: "users can request deletion" | Answer **Yes** only after the migration, the operator job and patch B1 are live in production | DBA + Owner |
| Apple App Privacy: data retained after deletion | Payment records (not linked to identity after anonymisation). Declare per the legal decision D-05. | Legal |
| Brand assets | Draft renders exist (`scripts/native/render-store-assets.mjs`); **brand approval is pending (D-10)**. No imagery invented here. | Owner / brand |
| Reader-only binary | G6-R1 above | G3/G5 → mobile |
| Review account | Create in production after G5 live. Credentials only in App Store Connect / Play Console. Give it no Premium unless the Owner wants Premium reviewed. | Owner |
