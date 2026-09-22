# AG-06 — Newsroom Backend, Auth & Security Report

**Programme:** HealthTimes migration  
**Repository:** `kudzimusar/htp-zw`  
**Branch:** `migration/ag-06-newsroom-backend-security`  
**Draft PR:** #13 — OPEN / DRAFT / UNMERGED  
**PR base:** `migration/ag-03-source-data-capture`  
**Accepted CP3 start SHA:** `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`  
**Original implementation candidate:** `701c3fd53ef0ad12193f2e3ed8e54e932964a304`  
**Final certified runtime SHA:** `409230e23e2d35b139d33b254ff8ab2250599f78`  
**HealthTimes Staging Supabase ref:** `gcdohgbmqhqwydgaxrcr`  
**HealthTimes Staging Vercel project:** `healthtimes-staging` / `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`  
**Production systems modified:** **NO**

## 1. CP6 status

**Implementation:** COMPLETE.  
**Cloud staging migration:** PASS.  
**Live role/API/RLS certification:** PASS.  
**Browser Newsroom staging journeys:** PASS.  
**Ephemeral certification cleanup:** PASS.  
**CP6:** **ACCEPTED.**

AG-06 now has real server-backed staging identity, sessions, persistence and capability authorization. Browser/localStorage role switching is not an authorization primitive.

## 2. Scope and ownership

AG-06 started from the accepted CP3 SHA and preserves AG-04 ownership of migration/content-ingestion semantics.

AG-06 owns:
- Newsroom staff identity and authorization;
- server-backed sessions;
- Newsroom persistence/editorial workflow;
- staff invitation/recovery/revocation foundations;
- audit history;
- Newsroom RLS/private storage policy;
- Vercel server API/security headers;
- direct API/RLS attack tests;
- server-backed Newsroom Playwright journeys.

AG-06 does not change production or AG-04 content-ingestion semantics.

## 3. Cloud migrations

Primary Newsroom/Auth/RBAC migration:

`supabase/migrations/20260922080100_ag06_newsroom_auth_rbac.sql`

The exact repository migration was applied to HealthTimes Staging. The cloud migration ledger records it as:

- `20260922020254 — ag06_newsroom_auth_rbac`

Subsequent AG-06 hardening is also present in staging:

- `20260922031250 — ag06_newsroom_story_listing_perf`
- `20260922032244 — ag06_story_rls_performance`
- `20260922033157 — ag06_auth_delete_revocation`
- `20260922033542 — ag06_auth_delete_guard`

Repository forward migrations are ordered after the core AG-06 schema:

- `20260922080200_ag06_newsroom_story_listing_perf.sql`
- `20260922080300_ag06_story_rls_performance.sql`
- `20260922080400_ag06_auth_delete_revocation.sql`
- `20260922080500_ag06_auth_delete_guard.sql`
- `20260922112000_ag06_security_advisor_hardening.sql`

The story-listing/RLS hardening preserves authorization semantics while avoiding per-row capability expansion across the migrated corpus.

Exact-head disposable schema proof:

- workflow: **AG-06 Newsroom Security**
- run: `35684372002`
- job: `106607952640`
- `supabase start`: PASS
- apply all migrations from zero: PASS
- teardown: PASS

## 4. Persisted Newsroom entities

AG-06 persists:
- `newsroom_staff_invitations`
- `newsroom_staff_capability_overrides`
- `newsroom_sessions`
- `story_autosaves`
- `story_assignments`
- `story_reviews`
- `story_internal_comments`
- `story_corrections`
- `newsroom_notifications`

Existing `staff_profiles` and `stories` are extended for staff/security metadata, editorial state, ownership, reviewers, deadlines, distribution, access policy and optimistic locking.

## 5. Authorization model

Capabilities—not frontend role labels—are authoritative.

Key capability classes include:
- `story.create`
- `story.edit_own`
- `story.edit_all`
- `story.submit`
- `story.fact_check`
- `story.health_review`
- `story.copy_edit`
- `story.publish`
- `story.correct`
- `assignment.create`
- `assignment.manage`
- `premium.assign`
- `premium.manage`
- `ads.view`
- `ads.create`
- `ads.approve`
- `subscriber.view`
- `subscriber.manage`
- `staff.view`
- `staff.invite`
- `staff.change_role`
- `staff.revoke`
- `analytics.view`
- `settings.manage`
- `security.manage`
- `security.view_sessions`
- `security.revoke_session`
- `security.view_audit`
- `distribution.manage`
- `media.manage`

Live-certified role collections:
- Reporter / Journalist
- Editor-in-Chief
- Commercial Manager
- Publisher / Owner

Enforced defaults:
- Reporter can create/edit-own/submit and cannot publish.
- Reporter cannot self-escalate role.
- Reporter cannot approve advertising.
- Commercial can use permitted commercial operations and cannot edit/publish editorial stories.
- Editor can perform the permitted review/publish path.
- Publisher can inspect/revoke sessions.
- direct story authority changes remain RPC/capability controlled.

## 6. Authentication/session behavior

Runtime server entry:

`api/newsroom.js`

Implemented:
- Supabase Auth email/password login;
- HttpOnly + Secure + SameSite=Lax access/refresh cookies;
- CSRF nonce + `X-HTP-CSRF`;
- same-origin enforcement;
- access-token validation/refresh;
- Newsroom session registry keyed to provider session ID;
- session and account revocation;
- audited privileged actions;
- rate limiting on high-risk operations;
- no service-role/database credential in browser code.

The Newsroom browser state is presentation/cache only. Backend authorization is authoritative.

## 7. Staging-only role identities

Final certification used four run-scoped, staging-only Auth identities for run `35684372002`:

- Reporter → `Reporter / Journalist`
- Editor → `Editor-in-Chief`
- Commercial → `Commercial Manager`
- Publisher → `Publisher / Owner`

The workflow no longer requires persistent role passwords in repository/GitHub secrets. Instead, the staging-only `ag06-certification-provision` helper uses GitHub Actions OIDC claims for repository/workflow/run-bound provisioning. Passwords exist only for the current job and are masked.

The staging publishable key is used for supplemental direct PostgREST tests; no service-role key is exposed to browser/Git.

After certification:
- 4 current-run Auth users deleted;
- 4 staff profiles retained as revoked historical/audit records;
- 0 current-run live sessions remain.

A final residue cleanup removed five older bounded test identities from failed certification attempts.

Final staging residue proof:
- AG-06 Auth test users: **0**
- active AG-06 staff profiles: **0**
- live AG-06 sessions: **0**
- temporary AG-06 database helper functions: **0**
- temporary AG-06 database helper triggers: **0**

The staging-only certification Edge Function remains versioned in the repository and requires GitHub OIDC claim validation.

## 8. Final live authorization proof

Workflow:

**AG-06 Newsroom Security**

Run:

`35684372002`

Live job:

`106607952205`

Result:

**SUCCESS**

Live suite:

**7 passed**

Direct API/RLS evidence emitted by the run:

- anonymous bootstrap: **401 DENIED**
- Reporter create/edit-own/submit: **PASS**
- Reporter publish: **403 DENIED**
- Reporter self-role escalation: **403 DENIED**
- Reporter ad approval: **403 DENIED**
- Commercial editorial edit: **403 DENIED**
- Commercial publish: **403 DENIED**
- Editor final workflow state: **Published**
- Editor final story status: **publish**
- Publisher Reporter-session revocation: **PASS**
- stale/revoked Reporter session: **403 DENIED**
- direct PostgREST probes: **ENABLED / PASS**

Certified story:

`e355f201-df16-4b63-9c99-b8497bd27421`

Durable audit proof from the same run includes:

- `story.published` at `2026-09-22T03:47:41.536605+00:00`
- `session.revoked` at `2026-09-22T03:47:50.344504+00:00`

The supplemental direct PostgREST assertions also passed for:
- anonymous draft access;
- anonymous internal-comment access;
- anonymous audit access;
- Reporter direct role escalation;
- Reporter direct story publication;
- Commercial direct editorial mutation.

## 9. Newsroom Playwright live journeys

Live Newsroom journeys in the same job passed:

1. gateway closed without provider session;
2. Reporter save/reload/resume/submit;
3. Editor receives review authority and Reporter submission;
4. Commercial sees commercial operations without editorial story workspace;
5. Publisher/Admin inspects staff, sessions and durable audit;
6. Newsroom usable at laptop/tablet admin widths.

Together with the direct API test, live job total is **7 passed**.

## 10. CI evidence at certified runtime

Certified runtime SHA:

`409230e23e2d35b139d33b254ff8ab2250599f78`

### Validate HealthTimes 2.0

- run `35684371939`
- job `106607951937`
- **SUCCESS**
- Newsroom OS validation passed.

### Migration Tests

- run `35684372028`
- job `106607952749`
- **32 passed**

### Chromium UAT

- run `35684371964`
- job `106607952776`
- **58 passed / 6 skipped**
- skips are the live environment-gated AG-06 tests; those were executed separately and passed in `live-staging-security`.
- Playwright report artifact ID: `10676336521`

### AG-06 Newsroom Security

- run `35684372002`
- contract job `106607952611`: **SUCCESS**
- local gateway job `106607952607`: **SUCCESS**
- disposable Supabase schema job `106607952640`: **SUCCESS**
- live staging security job `106607952205`: **SUCCESS**

## 11. Vercel staging proof

Project:

`healthtimes-staging`

Exact certified SHA deployment:

`409230e23e2d35b139d33b254ff8ab2250599f78`

Deployment state:

**READY**

No production Vercel project/cutover was used.

## 12. Auth invite / recovery / email behavior

The staging certification helper exercised Supabase Auth invite/recovery APIs.

Observed during final run:

- invite API accepted: **NO**
- recovery API accepted: **NO**
- provider response: **email rate limit exceeded**
- mailbox delivery confirmed: **NO**

This is recorded as a staging email-provider/rate-limit limitation, not an authorization failure. The Newsroom invite/recovery implementation exists, but external delivery is **not certified by CP6**.

Pre-production requirement:
- configure/verify production-grade Auth SMTP/email delivery;
- verify invite activation and password recovery against controlled mailboxes;
- retain rate limits/abuse controls.

## 13. MFA classification

**MFA CAPABILITY/POLICY READY — AAL2 NOT YET ENFORCED**

Schema/runtime carries:
- `mfa_required`
- `mfa_enrolled_at`

Privileged-role policy readiness is present, but JWT AAL2 is not enforced at the database boundary.

Pre-production requirement:
- enroll privileged staff;
- enforce AAL2 for privileged session/RPC operations;
- add explicit AAL1-denied / AAL2-accepted staging tests.

No AAL2 enforcement was added merely to close CP6.

## 14. Security headers / browser-secret boundary

Validated:
- Newsroom CSP;
- `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff`;
- no-store/private caching;
- restricted permissions policy;
- no public analytics script on private Newsroom route;
- HttpOnly session tokens;
- CSRF checks;
- service-role key absent from browser runtime;
- repository secret-pattern guard passes.

## 15. Supabase advisor notes

A post-certification Supabase advisor scan was executed.

Relevant AG-06 observations:
- `newsroom_staff_capability_overrides` has RLS enabled with no direct policy; this is an intentional deny-by-default table used through capability functions rather than direct client access.
- `newsroom_public_published_stories(text)` is intentionally callable by anonymous users as the minimized public story projection; live tests verified internal fields are not exposed.
- authenticated SECURITY DEFINER warnings correspond to capability-checked Newsroom RPCs and are expected by this architecture.
- two `staff_profiles` RLS initialization-plan performance warnings remain; they do not alter the certified authorization result and can be optimized in a later performance-hardening lane.

The advisor also reports AG-05/public-content findings outside AG-06 ownership, including the `ag05_url_coverage_status` security-definer view and AG-05 public RPC advisories. AG-06 did not modify AG-05 ownership surfaces.

Reference:
`https://supabase.com/docs/guides/database/database-linter`

## 16. PR state

PR #13:

- state: **OPEN**
- draft: **YES**
- base: `migration/ag-03-source-data-capture`
- head: `migration/ag-06-newsroom-backend-security`
- mergeable state at certification: **clean**
- unmerged: **YES**

## 17. Remaining limitations / pre-production hardening

These do **not** block CP6 staging acceptance:

1. **MFA:** AAL2 is not yet enforced.
2. **Email delivery:** invite/recovery API calls were rate-limited in staging; external delivery remains unverified.
3. **Performance:** two staff-profile RLS init-plan warnings remain.
4. **Certification helper:** `ag06-certification-provision` is staging-only and OIDC-gated; it must not be deployed to production.
5. **Production:** no production cutover, DNS, production database or production staff identity was modified.

## 18. AG-07 readiness

**AG-07 dependency:** CLEAR.

AG-07 may consume the certified AG-06 branch/schema/API contract subject to normal integration/rebase coordination.

## 19. Final receipt

- cloud Newsroom/Auth/RBAC migration: **APPLIED**
- Reporter role identity: **CERTIFIED**
- Editor role identity: **CERTIFIED**
- Commercial role identity: **CERTIFIED**
- Publisher role identity: **CERTIFIED**
- Reporter create/edit-own/submit: **PASS**
- Reporter publish denial: **PASS**
- Reporter self-role escalation denial: **PASS**
- Reporter ad-approval denial: **PASS**
- Commercial editorial edit/publish denial: **PASS**
- Editor review/publish path: **PASS**
- Publisher session revocation: **PASS**
- stale session rejection: **PASS**
- durable publication/revocation audit: **PASS**
- anonymous draft/comment/audit isolation: **PASS**
- supplemental direct PostgREST attacks: **PASS**
- browser/service secret exposure guard: **PASS**
- exact-head Vercel staging deployment: **READY**
- exact-head zero-state migration reset: **PASS**
- live certification cleanup/residue: **PASS**
- MFA: **MFA CAPABILITY/POLICY READY — AAL2 NOT YET ENFORCED**
- Auth email delivery: **RATE-LIMITED / NOT DELIVERY-CERTIFIED**
- production systems modified: **NO**

**CP6 ACCEPTED**
