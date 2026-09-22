# AG-06 — Newsroom Backend, Auth & Security Report

**Programme:** HealthTimes migration  
**Repository:** `kudzimusar/htp-zw`  
**Branch:** `migration/ag-06-newsroom-backend-security`  
**Draft PR:** #13  
**Accepted start SHA:** `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`  
**Implementation candidate SHA:** `701c3fd53ef0ad12193f2e3ed8e54e932964a304`  
**HealthTimes Staging Supabase ref:** `gcdohgbmqhqwydgaxrcr`  
**HealthTimes Staging Vercel project:** `healthtimes-staging` / `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`  
**Production systems modified:** **NO**

## 1. CP6 status

**Implementation status:** COMPLETE.  
**Repository/static/disposable certification:** PASS.  
**Live HealthTimes Staging role certification:** BLOCKED by missing staging-only test identities in GitHub Actions.

The branch does not claim CP6 acceptance yet because the required Reporter / Editor / Commercial / Publisher staging credentials have not been provisioned to the live-security workflow. The live job now fails closed instead of silently skipping.

The first missing configuration proved by workflow run `35671784796`, job `106569648464`, is:

`AG06_REPORTER_EMAIL`

No production account, production credential, or Sessions Music project was used as a substitute.

## 2. Scope and ownership

AG-06 started from the accepted CP3 SHA exactly and preserves AG-04 ownership of content-ingestion semantics.

AG-06 changed only the Newsroom/auth/security lane:
- Newsroom staff identity and authorization;
- server-backed session authority;
- Newsroom persistence and editorial workflow state;
- staff invitation/recovery/revocation foundations;
- audit history;
- Newsroom RLS and private storage policies;
- Vercel server API and security headers;
- direct API security tests and Newsroom Playwright journeys.

The five CP1 migrations and the AG-02 security-baseline migration were not rewritten.

## 3. Forward migration

New migration:

`supabase/migrations/20260922080100_ag06_newsroom_auth_rbac.sql`

The migration applies cleanly from zero after:
1. `20260909000100_content_core.sql`
2. `20260909000200_taxonomy_and_geo.sql`
3. `20260909000300_redirects_and_seo.sql`
4. `20260909000400_analytics_and_ads.sql`
5. `20260909000500_migration_runs_and_checkpoints.sql`
6. `20260916030642_ag02_staging_security_baseline.sql`
7. `20260922080100_ag06_newsroom_auth_rbac.sql`

Disposable Supabase proof at exact implementation schema:
- workflow: **AG-06 Newsroom Security**
- prior exact-schema run: `35669703622`
- job: `106563176935`
- `supabase db reset --local`: **PASS**
- AG-06 migration applied without SQL error
- zero-state migration chain: **PASS**

The migration file is unchanged between the successful zero-reset SHA `0fa7eb59ba4ec8f4204919a25f97680334875281` and implementation candidate `701c3fd53ef0ad12193f2e3ed8e54e932964a304`; the later four commits modify only AG-06 workflow/test configuration.

## 4. New persisted Newsroom entities

AG-06 adds:
- `newsroom_staff_invitations`
- `newsroom_staff_capability_overrides`
- `newsroom_sessions`
- `story_autosaves`
- `story_assignments`
- `story_reviews`
- `story_internal_comments`
- `story_corrections`
- `newsroom_notifications`

Existing Newsroom/content tables are extended rather than replaced. In particular, `staff_profiles` gains staff/security metadata and `stories` gains server-owned workflow, assignment, reviewer, deadline, distribution, access and optimistic-locking fields.

## 5. Server authorization primitive

Capabilities—not frontend role labels—are the server authorization primitive.

Preserved capability classes:
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

Role collections remain for administration/presentation:
- Publisher / Owner
- Editor-in-Chief
- Managing Editor
- Section Editor
- News Editor
- Reporter / Journalist
- Health / Science Editor
- Fact Checker
- Copy Editor
- Multimedia Editor
- Social Editor
- Newsletter Editor
- Commercial Manager
- Subscriber Manager
- Analyst

Important enforced defaults:
- Reporter has `story.create`, `story.edit_own`, `story.submit`; Reporter does **not** have `story.publish`.
- Commercial Manager has advertising/subscriber/Premium operational capabilities; Commercial does **not** have `story.publish` or `story.edit_all`.
- Publishing and protected workflow transitions execute only through capability-checked RPCs.
- Staff self-role escalation is explicitly rejected.
- Direct story INSERT is not granted to authenticated clients; creation is RPC-only so ownership derives from authenticated staff identity.
- Campaign approval/status authority is RPC-only and audited.

## 6. RLS / policies

AG-06 adds 27 named RLS policies across Newsroom/editorial/staff/commercial/private-storage surfaces.

Key policy boundaries:
- authenticated story visibility goes through `newsroom_can_read_story(id)`;
- authenticated story edits go through `newsroom_can_edit_story(id)`;
- revisions and lifecycle rows require story access;
- assignments are visible to the assigned reporter or assignment-management capability;
- review/comments/corrections require story access;
- staff records are self/staff-admin bounded;
- audit history requires `security.view_audit`;
- session registry is self/security-admin bounded;
- ad/subscriber access is capability-specific;
- `newsroom-private` storage requires an authorized Newsroom session and media capability for mutation;
- anonymous grants are explicitly revoked from staff, draft, comment, audit and Newsroom-security tables.

Public article access is exposed through the minimized `newsroom_public_published_stories(text)` RPC. It returns only public/published story fields and does not expose internal notes, owner IDs, lock versions, comments or review data.

## 7. Privileged RPC boundary

Security-definer functions implement server authority including:
- session registration/current context;
- capability lookup;
- story read/edit checks;
- create/save/transition story;
- assignment create/progress;
- internal comment;
- invitation;
- role change;
- staff revocation;
- session revocation;
- editorial review recording;
- revision restore;
- campaign creation/approval;
- Public/Premium access change.

Protected functions revoke default execution from `public` / `anon` and are granted only where required to `authenticated`.

Trigger guards prevent direct mutation of protected story, staff and campaign authority fields outside approved RPC execution.

## 8. Authentication and session behavior

Runtime server entry:

`api/newsroom.js`

The browser no longer owns Newsroom authentication state.

Implemented behavior:
- Supabase Auth email/password login;
- HttpOnly Secure SameSite=Lax access/refresh cookies;
- CSRF cookie + `X-HTP-CSRF` integrity check on protected POST operations;
- same-origin enforcement;
- access-token validation and refresh-token rotation path;
- Newsroom session registration keyed to provider JWT `session_id`;
- DB-backed session registry;
- session revocation;
- account suspension/revocation;
- sign-out revokes current session;
- rate limits for login/recovery/invite/transition/role/revoke/high-risk operations;
- no service-role/database credential in browser JavaScript;
- service role is referenced server-side only for staff invitation delivery.

The client Newsroom shell preserves current UX but its in-memory state is only a presentation cache. The browser cannot create authority by changing role labels/state.

## 9. Invite / activation / recovery

Implemented foundations:
- capability-gated staff invitation record;
- Supabase Auth invite request from the server;
- invitation ID carried as provider user metadata;
- Auth trigger maps a valid unexpired invite to `staff_profiles`;
- email-confirmation state controls activation;
- password recovery request;
- provider callback adoption into HttpOnly server session;
- password reset form and minimum-length enforcement.

Invitation delivery requires the configured server-side Supabase service-role key and a working staging Auth email configuration. No credential is committed to Git.

## 10. MFA policy and limitation

Schema/runtime carries:
- `mfa_required`
- `mfa_enrolled_at`
- privileged-role security UI/state.

**Limitation:** this implementation does not yet enforce JWT AAL2 at the database boundary; no `aal2` claim gate is present in the migration. Therefore MFA is **capability/policy ready but not certified as mandatory** for privileged staging accounts.

Required closure policy before production readiness:
- enroll Publisher/Owner, Editor-in-Chief and security-capable staff in provider MFA;
- enforce AAL2 for privileged session registration/privileged RPC execution;
- add staging tests for AAL1 rejection and AAL2 acceptance.

This is a documented limitation, not a production-readiness claim.

## 11. Demo/localStorage deprecation

Legacy hardcoded Newsroom demo credentials were removed from runtime code.

AG-06 validation rejects:
- `localStorage` as Newsroom authority;
- legacy `HealthTimes#Publisher...`, `HealthTimes#Editor...`, `HealthTimes#Reporter...`, `HealthTimes#Commercial...` credential literals in runtime surfaces.

Demo/local browser records are not migrated into Auth and never become production credentials.

Strategy:
1. create real staging-only Auth users;
2. create/link matching `staff_profiles`;
3. use server-backed persisted Newsroom state;
4. keep historical demo state non-authoritative and disposable;
5. do not copy demo passwords into staging/production.

## 12. Direct API attack coverage

`tests/ag06-live-security.spec.js` drives the API directly, bypassing UI controls.

Mandatory live API attacks include:
- anonymous bootstrap denied;
- Reporter creates/edits/submits own story;
- Reporter publish request denied;
- Reporter self-role escalation denied;
- Reporter ad-approval request denied;
- Commercial editorial save denied;
- Commercial publish denied;
- Editor performs allowed review/publish progression;
- Publisher revokes the Reporter session;
- revoked Reporter session is subsequently rejected;
- durable audit contains publication/revocation events.

Supplemental direct PostgREST probes are also implemented for:
- anonymous draft/comment/audit reads;
- Reporter direct `staff_profiles` role escalation;
- Reporter direct story publication PATCH;
- Commercial direct editorial PATCH.

Those supplemental PostgREST probes run when the staging publishable key is supplied to CI. They are not treated as a substitute for the mandatory app-API attacks.

## 13. Playwright Newsroom journeys

`tests/newsroom-os.spec.js` now tests server-backed Newsroom behavior.

Implemented journeys:
- unauthenticated gateway remains closed;
- Reporter autosave persists across browser refresh;
- Reporter can resume and submit but does not receive Publish;
- Editor receives review authority and submitted story;
- Commercial sees commercial workspace without editorial story workspace;
- Publisher can inspect staff, sessions and durable audit;
- Newsroom remains usable at 1440 / 1024 / 768 admin widths.

## 14. CI evidence

### Exact implementation candidate `701c3fd53ef0ad12193f2e3ed8e54e932964a304`

Vercel:
- HealthTimes Staging project deployment: **READY**
- deployment SHA matches `701c3fd53ef0ad12193f2e3ed8e54e932964a304`
- production project/cutover: not used.

Validate HealthTimes 2.0:
- run `35671784750`
- result: **SUCCESS**

Migration Tests:
- run `35671784809`
- result: **SUCCESS**
- tests: **32 passed**

Chromium UAT:
- run `35671784720`
- test step: **SUCCESS**
- tests: **58 passed / 6 skipped**
- the six skips are credential-gated live AG-06 journeys/attack coverage, not static/local failures.

AG-06 Newsroom Security:
- run `35671784796`
- `contract`: **SUCCESS**
- `local-newsroom-gateway`: **SUCCESS**
- `live-staging-security`: **FAIL-CLOSED / BLOCKED**
- blocker from job `106569648464`: `Missing required staging secret: AG06_REPORTER_EMAIL`
- disposable schema job was still executing when the live configuration blocker was recorded; the same migration blob already has a prior successful zero-reset proof in run `35669703622`.

Static AG-06 contract proof on the unchanged implementation includes:
- **5/5 passed**
- server authority/RLS contract
- protected function execution grants
- HttpOnly/CSRF/server-secret boundary
- Newsroom route analytics/header isolation
- demo/localStorage authority removal.

## 15. Required live-certification inputs

The live gate deliberately requires staging-only identities:
- `AG06_REPORTER_EMAIL`
- `AG06_REPORTER_PASSWORD`
- `AG06_EDITOR_EMAIL`
- `AG06_EDITOR_PASSWORD`
- `AG06_COMMERCIAL_EMAIL`
- `AG06_COMMERCIAL_PASSWORD`
- `AG06_PUBLISHER_EMAIL`
- `AG06_PUBLISHER_PASSWORD`

Optional supplemental direct-PostgREST coverage:
- `AG06_STAGING_SUPABASE_PUBLISHABLE_KEY`

Non-secret endpoints are fixed to the accepted CP2 environment:
- `https://healthtimes-staging.vercel.app`
- `https://gcdohgbmqhqwydgaxrcr.supabase.co`

The connected Supabase tool in this session exposes only the separate Sessions Music organization/project. It was not used or modified.

## 16. Remaining live certification steps

CP6 acceptance requires all of the following on the accepted HealthTimes Staging environment:
1. apply/confirm migration `20260922080100_ag06_newsroom_auth_rbac.sql` in cloud staging;
2. provision staging-only Reporter, Editor, Commercial and Publisher Auth users mapped to the corresponding real role collections;
3. configure the eight role-test GitHub secrets above;
4. run `AG-06 Newsroom Security / live-staging-security`;
5. require all direct API attack assertions and Newsroom live journeys to pass;
6. capture audit + session revocation proof from that run;
7. document Auth email delivery behavior;
8. enroll/test MFA for privileged roles if CP6 acceptance is to include MFA enforcement rather than readiness only.

Do not use production staff accounts for this certification.

## 17. AG-07 readiness

**Code/schema readiness for AG-07:** YES.  
**CP6 acceptance dependency for AG-07:** NOT YET CLOSED.

AG-07 may review/integrate against the AG-06 branch and migration contract, but must not represent CP6 as accepted until live HealthTimes Staging identity/authorization certification is green.

## 18. Receipt

- Auth/backend implementation candidate: `701c3fd53ef0ad12193f2e3ed8e54e932964a304`
- Migration: `20260922080100_ag06_newsroom_auth_rbac.sql`
- Capability authorization: IMPLEMENTED
- Server-backed sessions: IMPLEMENTED
- persisted drafts/autosave/revisions/assignments/reviews/comments: IMPLEMENTED
- staff invitation/recovery/revocation foundations: IMPLEMENTED
- audit events: IMPLEMENTED
- RLS/private Newsroom boundaries: IMPLEMENTED
- direct API authorization suite: IMPLEMENTED
- staging-backed Newsroom Playwright suite: IMPLEMENTED
- Vercel exact-head deployment: READY
- static/disposable/local CI: PASS
- live role-token certification: **BLOCKED — staging role test credentials not configured**
- MFA enforcement: **NOT YET AAL2-ENFORCED**
- production systems modified: **NO**

**CP6 final state: IMPLEMENTATION COMPLETE / LIVE CERTIFICATION BLOCKED.**
