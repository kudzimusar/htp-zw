# AG-06 — Newsroom Backend, Auth & Security

## Mission

Replace browser-local Newsroom authority with production-grade server-backed identity, persistence and authorization while preserving the approved Newsroom UX.

## Prerequisite

AG-02 staging backend accepted.

## Mandatory reads

- master programme and agent register
- `docs/migration/07_NEWSROOM_BACKEND_AUTH_PLAN.md`
- current Newsroom OS plan/operations manual
- current role/capability implementation

## Required work

1. Implement real staff identities in staging using the selected auth provider.
2. Support secure invite/activation flow, password setup/reset and email verification as appropriate.
3. Prepare/enable MFA capability and document enforcement policy for privileged roles.
4. Replace frontend/localStorage session authority with server-backed sessions/tokens.
5. Enforce granular capabilities server-side for every protected operation.
6. Preserve role collections but treat capabilities as the authorization primitive.
7. Enforce reporter boundaries: create/save/edit-own/submit as allowed, but no publish via client-state manipulation.
8. Enforce editor/publisher publish/review capabilities according to policy.
9. Keep Commercial advertising/subscriber access isolated from editorial modification/publishing unless separately granted.
10. Persist drafts, autosave state, revisions/version history and story lifecycle transitions in the database.
11. Persist assignments, review queue, fact check, health/science review, copy edit and internal comments.
12. Persist staff invitations, access status, last-login/security metadata, session revocation and account revocation.
13. Persist audit events for privileged changes and editorial publication decisions.
14. Ensure draft/internal editorial data cannot be fetched anonymously/publicly.
15. Ensure tenant/public API policies do not permit privilege escalation through direct API requests.
16. Preserve the current visual Newsroom application shell and role-specific workspaces.
17. Provide migration strategy for locally seeded demo users/data without treating demo credentials as production accounts.
18. Add automated authorization tests for representative direct API attempts, not only UI visibility tests.
19. Run Newsroom Playwright journeys against staging server-backed state.
20. Create `docs/migration/agent-reports/AG-06_NEWSROOM_BACKEND_SECURITY.md`.

## Minimum capability classes to preserve

- `story.create`
- `story.edit_own`
- `story.edit_all`
- `story.submit`
- `story.fact_check`
- `story.health_review`
- `story.copy_edit`
- `story.publish`
- `story.correct`
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
- security/session administration capabilities as required.

## Acceptance gates

- refresh persists valid authenticated session without exposing credentials;
- frontend role switching cannot create authority;
- direct API privilege-escalation tests fail safely;
- reporter cannot publish;
- editor/publisher can perform allowed review/publish flows;
- Commercial cannot edit/publish editorial stories by default;
- drafts/revisions/assignments/reviews/comments persist server-side;
- revoke session/access works;
- audit events persist;
- public/anonymous access cannot read draft/internal content;
- no service secrets exposed to browser/Git;
- Newsroom UAT green.

## Stop conditions

STOP if meeting the UI requirement would require weakening server-side authorization, sharing production accounts, or exposing privileged keys client-side.

## Receipt

Report:
- auth/backend implementation SHA;
- roles/capabilities enforced;
- direct API authorization tests;
- Newsroom journey results;
- audit/session revocation evidence;
- known MFA/email limitations;
- readiness for AG-07;
- `Production systems modified: NO`.
