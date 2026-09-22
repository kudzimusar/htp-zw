# AG-07 — CA-01 Certified Candidate Reconciliation

Date: 2026-09-22

Repository: `kudzimusar/htp-zw`

Integration candidate branch:

`integration/ag-07-ca01-certified-candidate`

## Purpose

This branch starts programme integration from the moderator-accepted CA-01 server runtime:

`e8bbbc22661dbd5a755e63742fb53c805d96d5b9`

The existing AG-07 branch `migration/ag-07-integrated-certification` had diverged from the current programme line and contained exactly one unique commit:

`9a128b1c713180426a323c9f8c63b9cd082e955c`

That unique commit was documentation-only:

`docs/migration/agent-reports/AG-07_CERTIFICATION_CLIENT_UAT.md`

Its historical blocker receipt is preserved unchanged in this candidate. It is not rewritten or retroactively reinterpreted.

## Reconciliation decision

The historical AG-07 branch was created from remote `main` at `a4f1211e1a36bc16f69cd8211c6482c759eb70a2`, before the accepted AG-01 through AG-06 evidence and runtime work were available remotely.

Current reconciliation showed:

- AG-07 branch: one unique documentation commit
- CA-01 certified server runtime: 169 programme commits ahead of the common historical base
- no competing AG-07 runtime implementation to preserve
- no AG-07 schema/runtime conflict requiring manual semantic selection

Therefore the safe forward integration rule is:

1. use the moderator-accepted CA-01 server runtime as the executable candidate base;
2. preserve the historical AG-07 blocker receipt unchanged;
3. certify the resulting AG-07 candidate at its exact head;
4. do not move or merge frozen CA-01 PR #15;
5. do not claim CP7 accepted until the full AG-07 matrix and moderator integrated acceptance are complete.

## Certified component input

CA-01 server component:

`e8bbbc22661dbd5a755e63742fb53c805d96d5b9`

CA-01 documentation closure:

`5162feb719f066a41a1b1d302f4d8fd33a702fff`

CA-01 disposition:

`IMPLEMENTATION COMPLETE / COMPONENT CERTIFIED / READY FOR AG-07 + NM-07 INTEGRATION`

The documentation closure is not used as executable runtime authority. The certified runtime SHA above is the runtime input.

## Preserved invariants

The integrated candidate must preserve:

- AG-06 server capability authority
- `story_internal_comments` as editorial story-discussion authority
- `story_assignments` as assignment authority
- `story_reviews` as review authority
- `story_corrections` as correction authority
- `newsroom_notifications` as operational Inbox authority
- typed `newsroom_threads/messages` for general coordination only
- separate Reader discussion tables/RPCs/RLS/Realtime domain
- Realtime as transport/invalidation rather than authority
- canonical `public.stories.id` for permanent Reader discussion
- production mutation = NO until separately authorized

## Candidate state

This reconciliation creates an AG-07 technical candidate only.

It does not by itself establish:

- CP7 acceptance
- client UAT acceptance
- production cutover readiness
- merge authorization
- production deployment authorization

The next required action is exact-head AG-07 certification against this candidate, followed by the NM-07 certified Native candidate and cross-lane staging/UAT/regression.

## Native input queued after AG-07 candidate

Moderator-accepted CA-01 Native SHA:

`f1a9f5f985fcd399dcb6666002ce04d85fdd9ced`

This Native candidate must be consumed by NM-07 after the AG-07 technical candidate is frozen; it must not be rebuilt independently.

Production systems modified by this reconciliation: **NO**.
