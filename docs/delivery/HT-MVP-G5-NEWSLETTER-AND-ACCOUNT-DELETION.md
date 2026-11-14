# HealthTimes G5: newsletter sign-up and account deletion

**Status:** prepared on 2026-11-14 on the local G5 branch. Neither feature is active.
**Audience:** HealthTimes Owner, legal reviewer, audience editor, engineering.

## 1. Newsletter sign-up

### Decision for launch

**Launch exclusion by default.** The public form renders nothing unless both of these are true:
1. The web build sets `EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP=true`.
2. The Privacy Policy in `apps/mobile/src/legal/policy-drafts.ts` is `approved` with a non-draft version.

Consent is therefore never recorded against a draft policy.

### What already exists

- **Studio:** a newsletter desk exists. Canonical UAT case A03 is blocked because there are no contact segments.
- **Server path:** `POST /api/communications?action=signup` (accepted COM-01 code). It runs these checks in order:
  1. Same-origin check.
  2. Explicit `consent: true` and a policy version are required.
  3. The consent is recorded (`communications_record_consent`).
  4. Marketing eligibility is checked (`communications_marketing_eligible`).
  5. The contact is synced to the Brevo newsletter list, and the sync state is recorded.
  6. Rate limit: 20 sign-ups per hour per client.
- **Reader readiness:** readers had no way to subscribe until this change, apart from preference toggles in My HealthTimes.

### What this change adds

- `apps/mobile/src/growth/newsletter-signup.ts` builds the request (purpose `NEWSLETTER`, source `healthtimes-web-reader`).
- `NewsletterSignup` (in `src/ui/Layout.tsx`), shown on About. It has an email field, an explicit consent switch and a result message.
- **Tests:**
  - Client gating and validation: `apps/mobile/tests/g5-newsletter-signup.test.mjs`.
  - An offline contract against the real server handler, with Supabase and Brevo stubbed: `tests/g5-newsletter-contract.test.mjs`. The Reader's request records consent against the approved policy version and syncs list 7 in the test. Without consent it returns 400; from another origin, 403. Neither case records anything.

### Activation checklist (all required)

1. **Legal:** approve the Privacy Policy, and the consent sentence (`NEWSLETTER_CONSENT_LABEL`) with it.
2. **Owner:** decide whether to use double opt-in. Brevo can send a confirmation email; if chosen, the server sync must switch to Brevo's double-opt-in endpoint, which is not built.
3. **Server environment** (production project, never `EXPO_PUBLIC_*`):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` (the handler requires it even for service calls)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BREVO_API_KEY`
   - `COM01_BREVO_LIST_NEWSLETTER`
   - `COM01_BREVO_WEBHOOK_TOKEN` (unsubscribe and bounce webhooks)
4. **Web build:** set `EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP=true`.
5. **Verification:** subscribe a test address, confirm the consent row and the Brevo list entry, then unsubscribe through Brevo and confirm the webhook updates the record.

## 2. Account deletion

### Why it is required

- **Both stores require it.** Apple (App Store Review Guideline 5.1.1(v)) and Google Play require apps that create accounts to let users start account deletion inside the app. Google also requires a web link for deletion requests.
- **Today it is a stub.** `requestAccountDeletion()` returns `server-required` (`apps/mobile/src/services/staging.ts`) and nothing is deleted.

### Where personal data lives

The schema was replayed on a disposable database on 2026-11-14 to find every place reader data is stored.

| Data | Table | Contract action |
|---|---|---|
| Reader account | `auth.users` | Deleted through the Supabase Auth Admin API after data erasure. Existing AG-06 triggers then revoke any staff profile and sessions. |
| Subscriber profile | `subscribers` (email unique, not null) | Anonymised: email set to `deleted+<id>@account-deleted.invalid`, name cleared, Auth link removed, status `deleted` |
| Premium access | `premium_entitlements` | Ended now. Rows kept for finance. |
| Payments | `payment_transactions` (cannot be deleted; references the subscriber) | Kept unchanged, linked only to the anonymised subscriber |
| Push devices | `reader_push_devices` | Deleted (they would also cascade with the Auth identity) |
| Discussion | `reader_comment_profiles`, `story_comments`, `story_comment_revisions` | Profile renamed "Former reader", disabled, and moved to a random unlinkable ID. Comment text and earlier revisions replaced with `[removed at account deletion]` |
| Newsletter and marketing contacts | `contact_profiles`, `contact_consents` (linked by email) | **Counted for manual review, not changed.** Erasing consent evidence is a legal decision. |
| Staff identities | `staff_profiles`, `newsroom_sessions` | **Refused.** Staff leave through Newsroom offboarding, which keeps the editorial and audit trail intact. |

### Contract

The contract is in `supabase/migrations/candidates/20261114120000_ht_mvp_g5_account_deletion_contract.sql`. It is not applied anywhere.

| Function | Who may call it | What it does |
|---|---|---|
| `account_request_deletion('DELETE MY ACCOUNT')` | Signed-in reader | Opens one request. Idempotent. Refuses staff. A 24-hour cancellation window starts. |
| `account_cancel_deletion_request()` | Signed-in reader | Cancels the request, only within the window |
| `account_deletion_request_status()` | Signed-in reader | Returns the reader's own latest request |
| `account_deletion_process(request_id, processed_by)` | `service_role` only | After the window: erases and anonymises as in the table above, records a count summary, then returns `DELETE_AUTH_IDENTITY_VIA_ADMIN_API` |
| `account_deletion_mark_identity_deleted(request_id)` | `service_role` only | Completes the request only if the Auth identity no longer exists |

The requests table has row-level security: readers can see only their own rows, and no role can insert or update it directly. Each request keeps the pseudonymous user ID, timestamps and the count summary as evidence of deletion.

**Tests** (`tests/database/account-deletion-contract.test.mjs`): 7/7 pass on a fresh Postgres 16 cluster, and 54/54 pass together with the existing suites in CI's parallel invocation. Three deliberate mutations were each caught:
- granting processing to readers;
- removing the staff refusal;
- removing the cancellation window.

### Integration steps (separately authorized)

1. **Owner:** approve the retention decisions:
   - the length of the cancellation window;
   - whether comment text is removed or kept anonymously;
   - how long payment records and deletion records are kept;
   - whether newsletter consent evidence is erased.
2. **DBA:** apply the migration on staging after the G2 backup-and-restore proof. Then, under a later production authority, apply it to production.
3. **Reader app:** have `requestAccountDeletion()` call `account_request_deletion` with the confirmation phrase typed by the reader. Show status and cancellation in Devices and Sessions.
4. **Operator:** run a server-only job holding the service-role key, as a scheduled script. It must process due requests, call `auth.admin.deleteUser`, then confirm with `account_deletion_mark_identity_deleted`. A failure at any step leaves the request in a resumable state; no partial "completed" state is possible.
5. **Web deletion page** (Google Play): publish a page explaining how to delete an account, with a contact route for readers who cannot sign in.
