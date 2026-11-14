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
