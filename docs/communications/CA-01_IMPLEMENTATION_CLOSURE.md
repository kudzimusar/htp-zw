# CA-01 — Implementation Closure Receipt

Status: IMPLEMENTATION COMPLETE / COMPONENT CERTIFIED / INTEGRATION PENDING  
Programme: HealthTimes Communications Programme  
Agent: CA-01 — Newsroom Internal Communications & Verified Story Discussions

## Certified implementation heads

### Server / Newsroom communications lane
- Branch: `communications/ca-01-newsroom-internal-communications`
- Runtime SHA: `e8bbbc22661dbd5a755e63742fb53c805d96d5b9`
- Base: `migration/ag-06-newsroom-backend-security`
- PR: #15
- PR state: Draft / Open / Unmerged

Exact-head workflows:
- Validate HealthTimes 2.0 — run `35699751225` — SUCCESS
- Migration Tests — run `35699751128` — SUCCESS
- Chromium UAT — run `35699751277` — SUCCESS
- AG-06 Newsroom Security — run `35699751161` — SUCCESS
- CA-01 Communications Security — run `35699751127` — SUCCESS

CA-01 Communications Security jobs:
- contract — SUCCESS
- live-staging-security — SUCCESS
- disposable-supabase-schema — SUCCESS

AG-06 Newsroom Security jobs:
- local-newsroom-gateway — SUCCESS
- live-staging-security — SUCCESS
- disposable-supabase-schema — SUCCESS
- contract — SUCCESS

### Native / Studio integration lane
- Branch: `communications/ca-01-native-integration`
- Certified SHA: `f1a9f5f985fcd399dcb6666002ce04d85fdd9ced`
- Base: `feat/native-mobile-nm07-native-certification`
- PR: #16
- PR state: Draft / Open / Unmerged

Exact-head workflows:
- Validate HealthTimes 2.0 — run `35699343009` — SUCCESS
- Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification — run `35699342946` — SUCCESS
- Native Binary Certification — run `35699343090` — SUCCESS

Native Binary Certification jobs:
- readiness — SUCCESS
- iOS simulator binary — SUCCESS
- Android debug binary — SUCCESS

## Scope delivered

### CA01-A — Internal communications foundations
Implemented additively on top of AG-06.

Preserved authoritative specialized records:
- `story_assignments`
- `story_reviews`
- `story_internal_comments`
- `story_corrections`
- `newsroom_notifications`
- `newsroom_sessions`
- `staff_profiles`
- `newsroom_roles`
- `newsroom_capabilities`
- `audit_logs`

Implemented communication foundations:
- story comment replies, mentions, revisions and resolution behavior without replacing `story_internal_comments`
- typed Newsroom desks
- desk membership
- typed assignment / desk / breaking coordination threads
- durable Newsroom messages
- message mentions and receipts/read state
- announcements and acknowledgement
- escalations / notification preferences
- communication attachment metadata with private Storage authorization
- additive capabilities:
  - `communication.desk.manage`
  - `communication.breaking.manage`
  - `communication.announce`
  - `comment.configure`
  - `comment.moderate`
  - `comment.restrict`
  - `comment.audit`

### CA01-B — Inbox and Realtime
`newsroom_notifications` is the operational Inbox source; no competing Inbox database was introduced.

Implemented:
- notification-producing workflow events
- Inbox list / summary / read / acknowledge / archive RPCs
- assignment, mention, review, moderation and announcement notification fanout
- private Realtime authorization
- minimal server-originated Realtime events using `realtime.send`
- no message/comment body in Realtime payloads

Certified live Realtime behavior:
- authorized staff private `newsroom:*` channel: SUBSCRIBED
- unauthorized Reader joining `newsroom:*`: CHANNEL_ERROR
- eligible Reader story-comment private channel: SUBSCRIBED
- staff and Reader Realtime events contained only invalidation identifiers/state/timestamps

### CA01-C — Verified Reader discussion
Implemented as a separate security domain from Newsroom communications.

Reader-side records include:
- reader comment profile / eligibility state
- `story_comments`
- comment revisions
- reports
- moderation actions
- Reader comment restrictions

Security model:
- anonymous comment creation denied
- authenticated Reader account required
- verified email required
- comment eligibility/account state required
- canonical published HealthTimes story identity required
- per-story comment policy required
- throttling / duplicate / abuse checks
- restriction history enforced
- moderation state machine enforced
- public projection excludes private moderation/account fields
- Reader accounts cannot access Newsroom discussion data or `newsroom:*` Realtime topics

Canonical identity:
- permanent comments reference canonical `public.stories.id`
- fixture / WordPress Source Parity identities remain `canonicalStoryId = null`
- Native discussion remains fail-closed when canonical story identity is unavailable

### CA01-D — Desktop / Native integration
Desktop Newsroom:
- Inbox
- Desks
- Breaking
- Moderation
- story discussion / assignment coordination surfaces
- existing AG-06 authority retained

Native:
- canonical AG-06 capability vocabulary used:
  - `security.view_sessions`
  - `security.revoke_session`
  - `security.view_audit`
- no third capability naming dialect
- server capability projection now resolves through:
  - `newsroom_register_session`
  - `newsroom_current_context`
- authenticated Reader without staff mapping becomes `authenticated-no-staff-authority`
- backend/projection failures remain `server-policy-unavailable`
- authorized Studio state is emitted only from server context
- no local `user.role` authorization path exists
- Newsroom Inbox / assignments / story discussion / desks / breaking / moderation adapters implemented
- Source Parity and fixture stories cannot create permanent Reader comment authority
- iOS simulator and Android debug binaries certified

### CA01-E — Component certification
Completed for the CA-01 server and Native lanes.

Direct attack / live proof includes:
- unrelated Reporter story discussion denied: 403
- unrelated Commercial story discussion denied: 403
- forged Inbox insertion denied: 403
- anonymous Reader comment denied: 401
- temporary/noncanonical story ID denied
- restricted Reader comment denied: 403
- Health-review staff account restriction attempt denied: 403
- Reader Newsroom Realtime join denied
- direct private communication bucket mutation denied
- authorized staff private Realtime subscription allowed
- eligible Reader comment Realtime subscription allowed
- durable staging identity cleanup successful

Latest live evidence from CA-01 run `35699751127`:
- test identities deleted: 9
- live certification sessions remaining: 0

Final staging residue verification:
- CA-01 temporary Auth users: 0
- CA-01 live test sessions: 0
- CA-01 test Reader comments: 0

## Fix-forward history retained

The implementation preserved migration discipline:
- no applied migration was rewritten
- attachment hardening added by forward migration
- recursive desk-member RLS defect fixed by forward migration
- foreign-key covering indexes added by forward migration
- Realtime event emission added by forward migration

Key final migrations:
- `20260922140000_ca01_internal_schema_capabilities.sql`
- `20260922140100_ca01_inbox_story_discussion.sql`
- `20260922140200_ca01_desks_threads_announcements.sql`
- `20260922140300_ca01_communication_storage.sql`
- `20260922140400_ca01_reader_discussion_moderation.sql`
- `20260922140500_ca01_realtime_authorization.sql`
- `20260922140600_ca01_attachment_access_hardening.sql`
- `20260922140700_ca01_desk_member_rls_recursion_fix.sql`
- `20260922140800_ca01_fk_index_hardening.sql`
- `20260922140900_ca01_realtime_event_emission.sql`

## Authority and security invariants preserved

- Server capabilities remain authoritative.
- Frontend role labels are not authority.
- No second staff identity system was created.
- `story_internal_comments` remains authoritative for story editorial discussion.
- Assignment, review, correction and communication records remain semantically distinct.
- Internal Newsroom communication and Reader discussion remain separate security domains.
- Reader accounts cannot access unpublished stories, internal editorial discussion, staff notifications, private attachments or Newsroom Realtime.
- Realtime is transport/invalidation only; persisted rows + RLS/RPC authorization remain authoritative.
- Reader comments cannot attach to temporary Source Parity identifiers.
- Production mutation was not performed.
- Production/store readiness is not claimed.

## Remaining programme dependency

CA-01 is component-certified, but integrated programme certification is still required.

Required next path:
```
CA-01 certified server + Native candidates
        ↓
AG-07 integrated candidate
        ↓
NM-07 integrated Native candidate
        ↓
cross-lane staging UAT / regression
        ↓
explicit moderator acceptance
        ↓
production/store authorization, if separately granted
```

Until that integration occurs:
- PR #15 remains Draft / Open / Unmerged
- PR #16 remains Draft / Open / Unmerged
- no production readiness claim
- no production mutation
- no store release claim

## Moderator disposition requested

CA-01 implementation may now be treated as:

`IMPLEMENTATION COMPLETE / COMPONENT CERTIFIED / READY FOR AG-07 + NM-07 INTEGRATION`

This receipt does not authorize merging, production deployment, DNS changes, store submission, or production data mutation.
