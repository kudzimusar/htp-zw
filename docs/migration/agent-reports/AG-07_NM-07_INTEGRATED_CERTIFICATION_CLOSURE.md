# AG-07 / NM-07 — Integrated Candidate Certification Closure

Date: 2026-09-22

Status: TECHNICAL INTEGRATION COMPLETE / EXACT-HEAD CERTIFIED / MODERATOR INTEGRATED ACCEPTANCE PENDING

## Integrated candidate

Branch:

`integration/ag07-nm07-crosslane-candidate`

Certified runtime SHA:

`0112c8802d220d23e20288783536f22e85ea346d`

Draft PR:

`#20 — AG-07 + NM-07: certified cross-lane integration candidate`

PR state at certification:

`DRAFT / OPEN / UNMERGED / MERGEABLE`

No merge authorization is implied by this closure.

## Certified inputs

AG-07 server technical parent:

`971571480d0295661556631e000aaef4d490b8b3`

This parent was constructed from the moderator-accepted CA-01 server runtime:

`e8bbbc22661dbd5a755e63742fb53c805d96d5b9`

plus preserved AG-07 documentation provenance.

CA-01 / NM-07 Native certified parent:

`f1a9f5f985fcd399dcb6666002ce04d85fdd9ced`

The cross-lane integration history is a descendant of both certified inputs.

## Exact-head certification matrix

All required workflows are green at:

`0112c8802d220d23e20288783536f22e85ea346d`

| Gate | Run | Result |
|---|---:|---|
| Validate HealthTimes 2.0 | `35703008460` | SUCCESS |
| Migration Tests | `35703008484` | SUCCESS |
| Chromium UAT | `35703008495` | SUCCESS |
| AG-06 Newsroom Security | `35703008456` | SUCCESS |
| CA-01 Communications Security | `35703008500` | SUCCESS |
| Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification | `35703008559` | SUCCESS |
| Native Binary Certification | `35703008445` | SUCCESS |

### AG-06 Newsroom Security jobs

- `contract` — SUCCESS
- `disposable-supabase-schema` — SUCCESS
- `local-newsroom-gateway` — SUCCESS
- `live-staging-security` — SUCCESS

The integrated live run executed the existing AG-06 direct authorization journey and reported:

- anonymous bootstrap denied: 401
- Reporter create/edit-own/submit: PASS
- Reporter publish denied: 403
- Reporter self-role escalation denied: 403
- Reporter ad approval denied: 403
- Commercial editorial edit denied: 403
- Commercial publish denied: 403
- Editor final workflow: Published
- Publisher reporter-session revoke: PASS
- stale Reporter session rejected: 403
- direct PostgREST probes: PASS

Cleanup:

- temporary AG-06 Auth users deleted: 4
- retained synthetic staff profiles: revoked/inert
- live AG-06 sessions remaining: 0

### CA-01 Communications Security jobs

- `contract` — SUCCESS
- `disposable-supabase-schema` — SUCCESS
- `live-staging-security` — SUCCESS

Integrated CA-01 live evidence includes:

- unrelated Reporter story discussion denied: 403
- unrelated Commercial story discussion denied: 403
- forged Inbox insertion denied: 403
- anonymous Reader comment denied: 401
- temporary/noncanonical story identifier denied: 403
- restricted Reader comment denied: 403
- Health-review account-restriction attempt denied: 403
- direct private communication bucket mutation denied
- staff `newsroom:*` private Realtime: SUBSCRIBED
- Reader → `newsroom:*` private Realtime: CHANNEL_ERROR
- eligible Reader comment private Realtime: SUBSCRIBED
- staff event payload minimal: true
- Reader comment event payload minimal: true

Cleanup:

- temporary CA-01 Auth users deleted: 9
- Reader profiles deleted: 3
- test comments deleted: 1
- test reports deleted: 1
- live CA-01 sessions remaining: 0

## Native integrated certification

Unified Native certification:

Run `35703008559` — SUCCESS

Native Binary Certification:

Run `35703008445` — SUCCESS

Jobs:

- `readiness` — SUCCESS
- `ios-simulator-binary` — SUCCESS
- `android-debug-binary` — SUCCESS

Binary evidence artifacts:

### iOS Simulator app

Artifact:

`healthtimes-ios-simulator-app`

Artifact id:

`10683997342`

Digest:

`sha256:f69d7ff5f5bcb320dad79a9ee4a9662d690a56a76db16f29118684de4b39b8ab`

### Android debug APK

Artifact:

`healthtimes-android-debug-apk`

Artifact id:

`10683667389`

Digest:

`sha256:061396b9d8e16c6610e0cefd37193926d6f2d497c42dfd4b8f1017a32559e204`

### Resolved Native configuration

Artifact:

`healthtimes-native-config-matrix`

Artifact id:

`10683156554`

Digest:

`sha256:7a27ad811314a1ad40162bb56c30adead1cea42355f91798bd2860ce2e3e3d04`

## Cross-lane reconciliation defects resolved

Two integration-only defects were discovered and corrected before certification.

### 1. Pages workflow authority conflict

Initial combined tree preserved the server-side `.github/workflows/pages.yml` wholesale.

NM-07 readiness correctly rejected this because the certified Native lane requires the feature-branch PWA preview behavior.

Fix:

- preserve static Pages validation/deploy behavior for `main`
- preserve NM-07 PWA preview build/deploy/verification for `feat/native-mobile-nm07-native-certification`
- do not let one lane silently erase the other's deployment contract

The corrected workflow passed Native readiness and the full exact-head matrix.

### 2. Shared staging security-suite interference

AG-06 and CA-01 live-security workflows initially ran concurrently against the same HealthTimes Staging project.

This produced two distinct fixture-level failures:

- one AG-06 direct authorization journey failed while CA-01 was simultaneously mutating shared staging certification state
- an isolated rerun then exposed an AG-06 synthetic `staff_profiles.handle` collision because handles were keyed by `run_id` but not `run_attempt`

Fix:

- serialize AG-06 and CA-01 live staging jobs with shared GitHub Actions concurrency group:
  `healthtimes-staging-security-live`
- make AG-06 synthetic certification handles attempt-specific

The updated staging-only AG-06 certification provisioner was deployed to HealthTimes Staging.

After the fix:

1. AG-06 live security ran first and passed.
2. CA-01 live security ran after AG-06 and passed.
3. both cleanup routines reported zero live sessions.

These are certification-harness corrections. They do not change production Newsroom authority or the frozen CA-01 component architecture.

## Final staging residue

Direct HealthTimes Staging inspection after the integrated run confirmed:

- AG-06 temporary Auth users: 0
- CA-01 temporary Auth users: 0
- AG-06 live certification sessions: 0
- CA-01 live certification sessions: 0
- CA-01 test Reader comments: 0

## Preserved component invariants

The integrated tree preserves the moderator-accepted CA-01 contract:

- `story_internal_comments` → editorial story-discussion authority
- `story_assignments` → assignment authority
- `story_reviews` → review authority
- `story_corrections` → correction authority
- `newsroom_notifications` → operational Inbox authority
- typed `newsroom_threads/messages` → general coordination only
- Reader discussion → separate tables, RPCs, RLS and Realtime domain
- Realtime → transport/invalidation, never authority
- server capability state → authority
- frontend role labels → never authority
- permanent Reader discussions → canonical `public.stories.id` only
- Source Parity / fixture identities → no permanent discussion authority

Native authority continues to use the canonical AG-06 server capability vocabulary and fail-closed authorization projection.

## Frozen component PRs

At integrated certification:

- PR #15 — Draft / Open / Unmerged
- PR #16 — Draft / Open / Unmerged
- PR #18 — Draft / Open / Unmerged
- PR #19 — Draft / Open / Unmerged
- PR #20 — Draft / Open / Unmerged

No component PR was merged as part of integration certification.

## Production / release boundary

Production mutation: NO

Production deployment: NO

Production DNS/email changes: NO

App Store submission: NO

Play Store submission: NO

Merge authorization: NO

Production-ready claim: NO

## Requested programme disposition

This candidate may now be presented to the moderator as:

`AG-07 + NM-07 TECHNICAL INTEGRATION COMPLETE / EXACT-HEAD CERTIFIED / READY FOR MODERATOR INTEGRATED ACCEPTANCE`

The technical certification does not by itself authorize merge or production rollout.

Any subsequent runtime change requires a new exact-head certification matrix.
