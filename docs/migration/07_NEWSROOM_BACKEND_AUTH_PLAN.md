# Newsroom Backend And Auth Plan

## Objective

Preserve the current Newsroom UX while replacing browser-local persistence with real authentication, database storage, server-side permissions and audit history.

## Authentication

- Staff invitations.
- Email verification.
- Password reset.
- MFA readiness.
- Session storage and revocation.
- Account revocation.
- Separate reader and staff authentication surfaces.

## Authorization

Keep granular capabilities. Do not collapse to coarse labels. Server endpoints must check capabilities such as `story.create`, `story.edit_own`, `story.publish`, `premium.manage`, `ads.approve`, `staff.revoke` and `security.manage`.

## Critical Rule

A Reporter may create, save and submit stories, but cannot publish by changing frontend state. Commercial users must not gain editorial publishing privileges.

## Storage

Persist stories, revisions, lifecycle events, assignments, reviews, fact checks, health/science reviews, copy edits, internal comments, schedules, audit logs and security events in Postgres.

## Security Tests

Add server/API tests that attempt privilege escalation by submitting unauthorized status, owner, Premium and role changes. The API must reject them even if the frontend is modified.
