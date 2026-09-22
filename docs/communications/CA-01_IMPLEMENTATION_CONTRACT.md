# CA-01 — Newsroom Internal Communications & Verified Story Discussions
## Implementation Contract

**Programme:** HealthTimes Communications Programme  
**Server branch:** `communications/ca-01-newsroom-internal-communications`  
**Server PR:** #15 — Draft / Open / Unmerged  
**Native integration branch:** `communications/ca-01-native-integration`  
**Native PR:** #16 — Draft / Open / Unmerged  
**Authoritative staff-security parent:** AG-06 CP6 closure `a94955d44b87a40df0f169dbf75cf24a33344554`, descended directly from certified AG-06 runtime `409230e23e2d35b139d33b254ff8ab2250599f78`  
**Production mutation:** NOT AUTHORIZED / NOT PERFORMED  
**Migration discipline:** additive, forward-only; no AG-06 migration rewrites.

This contract records the implemented CA-01 boundaries. Server capabilities are authoritative. Frontend role labels, Reader authentication, local state, route access, Realtime membership and Presence are never authorization primitives.

---

## 1. Security-domain separation

### Private staff domain

Existing AG-06 records remain authoritative:

- `staff_profiles`
- `newsroom_roles`
- `newsroom_capabilities`
- `newsroom_role_capabilities`
- `newsroom_sessions`
- `story_assignments`
- `story_reviews`
- `story_internal_comments`
- `story_corrections`
- `newsroom_notifications`
- `stories`
- `story_revisions`
- `story_lifecycle_events`
- `audit_logs`

CA-01 does not replace `story_internal_comments`. Story discussion remains attached to the canonical story and inherits `newsroom_can_read_story(story_id)`.

General coordination is intentionally separate:

- `newsroom_desks`
- `newsroom_desk_members`
- `newsroom_threads`
- `newsroom_thread_members`
- `newsroom_messages`
- `newsroom_message_mentions`
- `newsroom_announcements`

### Reader domain

Reader discussion never shares staff comment rows or staff write RPCs:

- `reader_comment_profiles`
- `story_comments`
- `story_comment_revisions`
- `story_comment_reports`
- `story_comment_moderation_actions`
- `reader_comment_restrictions`

A shared canonical `stories.id` is the only shared story identifier.

---

## 2. Existing tables extended

### `story_internal_comments`

Existing columns are preserved. CA-01 adds:

| Column | Type / relation | Purpose |
|---|---|---|
| `parent_comment_id` | uuid → `story_internal_comments.id`, SET NULL | one-level/nested reply relationship |
| `edited_at` | timestamptz | current-row edit marker |
| `edited_by` | uuid → `staff_profiles.id`, SET NULL | last editor identity |

The existing `story_id`, `author_staff_id`, `body`, `created_at`, `resolved_at`, and `resolved_by` remain authoritative.

### `newsroom_notifications`

Existing durable Inbox table is extended with:

- `actor_staff_id uuid → staff_profiles.id`
- `category text NOT NULL DEFAULT 'general'`
- `priority text NOT NULL DEFAULT 'normal'`
- `dedupe_key text`
- `requires_ack boolean NOT NULL DEFAULT false`
- `acknowledged_at timestamptz`
- `archived_at timestamptz`
- `expires_at timestamptz`

Categories are constrained to:
`general | mention | assignment | review | urgent | announcement | newsletter | moderation`.

Priority is constrained to:
`normal | high | urgent`.

A unique partial index on `(staff_profile_id,dedupe_key)` prevents duplicate durable fanout where a dedupe key is supplied.

### `stories`

CA-01 adds:

`comment_policy text NOT NULL DEFAULT 'disabled'`

Allowed values:

`disabled | read_only | open`.

The default is intentionally fail-closed.

---

## 3. Additive private communication tables

### `story_internal_comment_revisions`

- `id uuid PK`
- `comment_id uuid NOT NULL → story_internal_comments.id`
- `previous_body text NOT NULL`
- `edited_by uuid NOT NULL → staff_profiles.id`
- `created_at timestamptz NOT NULL DEFAULT now()`

### `story_internal_comment_mentions`

- `comment_id uuid NOT NULL → story_internal_comments.id`
- `mentioned_staff_id uuid NOT NULL → staff_profiles.id`
- `created_at timestamptz NOT NULL DEFAULT now()`
- PK: `(comment_id,mentioned_staff_id)`

### `newsroom_desks`

- `id uuid PK`
- `key text UNIQUE NOT NULL`
- `name text NOT NULL`
- `description text`
- `created_by uuid NOT NULL → staff_profiles.id`
- `created_at`, `updated_at`
- `archived_at`

### `newsroom_desk_members`

- `desk_id uuid → newsroom_desks.id`
- `staff_profile_id uuid → staff_profiles.id`
- `member_role: member | lead`
- `added_by uuid → staff_profiles.id`
- `joined_at`
- `left_at`
- PK: `(desk_id,staff_profile_id)`

### `newsroom_threads`

- `id uuid PK`
- `thread_type: assignment | desk | breaking | general`
- `title text`
- optional `assignment_id → story_assignments.id`
- optional `desk_id → newsroom_desks.id`
- `created_by → staff_profiles.id`
- `priority: normal | high | urgent`
- `status: open | closed | archived`
- `opened_at`, `closed_at`, `expires_at`, `created_at`, `updated_at`

Context constraints prevent an assignment thread from also becoming a desk thread and preserve typed semantics.

### `newsroom_thread_members`

- `thread_id → newsroom_threads.id`
- `staff_profile_id → staff_profiles.id`
- `member_role: owner | member | observer`
- `joined_at`, `left_at`, `last_read_at`
- PK: `(thread_id,staff_profile_id)`

### `newsroom_messages`

- `id uuid PK`
- `thread_id → newsroom_threads.id`
- `author_staff_id → staff_profiles.id`
- optional `parent_message_id → newsroom_messages.id`
- `body text`
- `created_at`

### `newsroom_message_mentions`

- `message_id → newsroom_messages.id`
- `mentioned_staff_id → staff_profiles.id`
- `created_at`
- PK: `(message_id,mentioned_staff_id)`

### `newsroom_announcements`

- `id uuid PK`
- `title`, `body`
- `audience_scope: all_staff | desk`
- optional `desk_id`
- `priority: normal | high | urgent`
- `requires_ack boolean`
- `created_by`
- `published_at`, `expires_at`, `archived_at`, `created_at`

Scope constraint requires `desk_id` only for desk-scoped announcements.

### `newsroom_communication_attachments`

- exactly one parent: `story_internal_comment_id` OR `newsroom_message_id`
- `uploaded_by → staff_profiles.id`
- bucket defaults to `newsroom-communications-private`
- unique `storage_path`
- `filename`, `mime_type`, `byte_size`, optional `sha256`
- `status: pending | ready | deleted`
- `created_at`, `ready_at`, `deleted_at`
- maximum size: 10 MiB

Private Storage bucket:
`newsroom-communications-private`, `public=false`.

Allowed MIME types:
PDF, text/plain, JPEG, PNG, WebP and DOCX.

---

## 4. Additive reader discussion tables

### `reader_comment_profiles`

- `id uuid PK`
- `auth_user_id uuid UNIQUE NOT NULL`
- `display_name text NOT NULL`
- `state: active | disabled`
- `created_at`, `updated_at`, `last_comment_at`

This is intentionally separate from staff profiles and from the staff-admin `subscribers` table.

### `story_comments`

- `id uuid PK`
- `story_id uuid NOT NULL → stories.id`
- `author_profile_id uuid NOT NULL → reader_comment_profiles.id`
- optional `parent_comment_id → story_comments.id`
- `body text`
- `state: PENDING | PUBLISHED | HELD | REJECTED | HIDDEN | REMOVED`
- `risk_flags text[]`
- `created_at`, `updated_at`, `edited_at`, `published_at`, `removed_by_author_at`

### `story_comment_revisions`

- `id uuid PK`
- `comment_id → story_comments.id`
- `actor_auth_user_id uuid`
- `revision_type: edit | withdraw`
- `previous_body`
- `created_at`

### `story_comment_reports`

- `id uuid PK`
- `comment_id → story_comments.id`
- `reporter_profile_id → reader_comment_profiles.id`
- `reason_code: spam | harassment | impersonation | phishing | health_misinformation | privacy | other`
- optional `details`
- `status: open | resolved | dismissed`
- `created_at`, `resolved_at`
- optional `resolved_by_staff_id → staff_profiles.id`
- unique reporter/comment pair

### `story_comment_moderation_actions`

- `id uuid PK`
- `comment_id`
- `actor_staff_id`
- `action`
- `previous_state`
- `new_state`
- `reason_code`
- optional `notes`
- `created_at`

### `reader_comment_restrictions`

- `id uuid PK`
- `reader_profile_id`
- `kind: pre_moderation | comment_block | link_block`
- `reason_code`, optional `notes`
- `starts_at`, optional `ends_at`
- `created_by_staff_id`, `created_at`
- optional `lifted_at`, `lifted_by_staff_id`

---

## 5. New capabilities

Canonical CA-01 capabilities:

- `communication.desk.manage`
- `communication.breaking.manage`
- `communication.announce`
- `comment.configure`
- `comment.moderate`
- `comment.restrict`
- `comment.audit`

AG-06 security vocabulary remains canonical:
`security.view_sessions`, `security.revoke_session`, `security.view_audit`.

CA-01 does not create a generic story-chat capability. Story discussion access is stronger: it follows canonical story authorization.

An `Audience Moderator` role is additive and receives reader-comment moderation/restriction/audit authority without editorial publication authority.

---

## 6. RPC contract and execution roles

### Story discussion / Inbox — authenticated only

- `newsroom_add_internal_comment(story_id,body,parent_comment_id,mention_staff_ids)`
- compatibility wrapper `newsroom_add_comment(story_id,body)`
- `newsroom_edit_internal_comment(comment_id,body,mention_staff_ids)`
- `newsroom_set_internal_comment_resolved(comment_id,resolved)`
- `newsroom_list_inbox(filter,limit,before)`
- `newsroom_inbox_summary()`
- `newsroom_mark_notification_read(notification_id,read)`
- `newsroom_ack_notification(notification_id)`
- `newsroom_archive_notification(notification_id)`
- `newsroom_update_notification_preferences(preferences)`

Every private RPC performs server session/story/capability checks internally. Merely being an authenticated Reader does not grant access.

### Desks / typed coordination — authenticated only

- `newsroom_create_desk(key,name,description)`
- `newsroom_set_desk_member(desk_id,staff_id,member_role,active)`
- `newsroom_create_thread(thread_type,title,assignment_id,desk_id,priority,expires_at)`
- `newsroom_set_thread_member(thread_id,staff_id,active)`
- `newsroom_post_thread_message(thread_id,body,parent_message_id,mention_staff_ids)`
- `newsroom_mark_thread_read(thread_id)`
- `newsroom_close_thread(thread_id)`
- `newsroom_publish_announcement(title,body,audience_scope,desk_id,priority,requires_ack,expires_at)`
- `newsroom_archive_announcement(announcement_id)`

### Attachments — authenticated metadata RPCs plus server-signed Storage

- `newsroom_prepare_communication_attachment(...)`
- `newsroom_finalize_communication_attachment(attachment_id)`
- `newsroom_mark_communication_attachment_deleted(attachment_id)`
- `newsroom_get_communication_attachment(attachment_id)`

The web server performs signed upload/download/delete operations. Service-role credentials are never returned to the browser.

### Reader RPCs

Authenticated only:

- `reader_register_comment_profile(display_name)`
- `reader_comment_eligibility(story_id)`
- `reader_submit_story_comment(story_id,body,parent_comment_id)`
- `reader_edit_story_comment(comment_id,body)`
- `reader_withdraw_story_comment(comment_id)`
- `reader_report_story_comment(comment_id,reason_code,details)`

Public/authenticated minimized read:

- `reader_public_story_comments(story_id,limit,before)`

Staff moderation/configuration, authenticated but capability checked internally:

- `newsroom_set_story_comment_policy(story_id,policy)`
- `newsroom_list_comment_moderation_queue(state,limit)`
- `newsroom_moderate_story_comment(comment_id,action,reason_code,notes)`
- `newsroom_restrict_reader_comments(reader_profile_id,kind,reason_code,ends_at,notes)`
- `newsroom_lift_reader_comment_restriction(restriction_id,notes)`

---

## 7. RLS and grants

Private CA-01 tables have RLS enabled. Direct mutation grants are not given to Reader clients. Where authenticated SELECT is granted, RLS predicates still require the appropriate Newsroom story, desk, thread, announcement or own-Inbox relationship.

Key predicates:

- story comment revisions / mentions → canonical `newsroom_can_read_story`
- desk rows/membership → `newsroom_can_read_desk`
- typed thread rows/messages/members/mentions → `newsroom_can_read_thread`
- announcements → `newsroom_can_read_announcement`
- private attachment metadata / Storage → `newsroom_can_read_communication_attachment`
- Inbox rows → current authorized staff profile only

The desk-members policy is fix-forward hardened to avoid recursive RLS evaluation.

Reader tables are separately RLS protected:

- own profile visible to owner or authorized moderation staff
- published public comments exposed through minimized projection
- own nonpublic comment state remains owner-bounded
- reports/restrictions/moderation records are restricted to owner/moderation authority as applicable
- no anonymous reader-comment write RPC is executable

---

## 8. Notification producer matrix

| Event | Durable recipient rule | Category |
|---|---|---|
| internal story mention | mentioned staff must already have story access | mention |
| internal story reply | parent author, unless self/already explicitly mentioned | mention |
| assignment created | assigned Reporter; assigned Editor when present | assignment |
| assignment status change | assigned Editor / assigner as applicable | assignment |
| story enters Submitted / Fact check / Health-Science review / Copy edit / Editor review | authoritative assignee for that workflow state | review |
| review recorded | story owner, assigned editor and related reporter where applicable | review |
| thread mention/reply | target must already have thread access | mention |
| announcement published | all authorized staff or active members of targeted desk | announcement |
| reader report created | staff holding comment moderation authority | moderation |

Notification fanout is durable and written in the same authoritative database domain. Push/digests may be asynchronous later, but correctness does not depend on Queue/Cron delivery.

Inbox filters:
All, Mentions, Assignments, Reviews, Urgent, Announcements, Newsletter, Moderation.

Read, acknowledgement and archive are per-recipient operations.

---

## 9. Reader eligibility and moderation

Reader commenting requires:

1. authenticated Supabase Auth user;
2. confirmed email;
3. active `reader_comment_profile`;
4. canonical published public story;
5. story `comment_policy='open'`;
6. no active `comment_block`;
7. rate/duplicate/link/content checks in the write path;
8. moderation state assignment;
9. restriction history.

New/low-history accounts and `pre_moderation` restrictions produce pre-moderated submissions.

A verified Reader is not treated as a trusted, real-world-verified, medically reliable or unrestricted person.

Moderation states:
`PENDING → PUBLISHED/HELD/REJECTED`, with controlled transitions to `HIDDEN`, `REMOVED` or re-publication where the RPC permits it.

Every moderation action is durably recorded. Health-misinformation reports route to human moderation; automated classification is not treated as medical truth.

---

## 10. Canonical story identity dependency

Permanent reader discussion references only `public.stories.id`.

Native domain models expose:

`canonicalStoryId: string | null`.

Rules:

- canonical Supabase story mapper: `canonicalStoryId = row.id`
- WordPress Source Parity: `canonicalStoryId = null`
- fixture stories: `canonicalStoryId = null`

The Native discussion adapter rejects writes when no valid canonical UUID is available. No WordPress slug, WordPress post ID, Source Parity synthetic ID or fixture ID can become permanent comment authority.

---

## 11. Realtime contract

Private staff topics:

- `newsroom:story:<story_id>`
- `newsroom:assignment:<assignment_id>`
- `newsroom:thread:<thread_id>`
- `newsroom:desk:<desk_id>`
- `newsroom:inbox:<staff_profile_id>`

Reader topic:

- `reader:story-comments:<story_id>`

Authorization uses private Realtime RLS over `realtime.messages` and server predicates. Readers are never authorized for `newsroom:*`.

Presence is permitted only for open, nonexpired Breaking threads whose member has thread access.

Broadcast is event transport only. Protected message bodies and authorization decisions remain in persisted rows/RPCs; clients refetch authoritative state after an event.

---

## 12. Desktop implementation

Existing Newsroom shell is extended rather than replaced.

Implemented surfaces:

- Inbox
- nested story discussion: reply, mention, edit, resolve/reopen
- assignment discussion
- Desks
- Breaking rooms
- announcements via server API
- Reader moderation queue and restrictions
- reader-comment policy control
- private attachment server actions

`api/newsroom.js` bootstraps durable notifications and CA-01 communication state and exposes bounded actions. Expected SQLSTATEs are mapped to HTTP semantics instead of surfacing authorization-safe absence as 500.

`api/discussion.js` is the separate Reader discussion gateway.

---

## 13. Native / NM integration contract

Native integration is isolated in Draft PR #16 based on NM-07; it does not rewrite the CA-01 server history.

Services:

- `ReaderDiscussionService`
- `NewsroomCommunicationService`

Studio modules:

- Inbox
- Desks
- Breaking
- Moderation

Authority:

- Inbox/Desk/Breaking use `StudioAuthorityGate`: requires a server-origin `authorized` snapshot.
- Moderation additionally requires `comment.moderate`.
- current staging authorization intentionally remains `server-policy-unavailable` until the AG-06 capability projection is integrated.
- no `if (user.role === ...)` authorization exists.

Reader article screen includes a discussion panel. It stays visibly unavailable when `canonicalStoryId` is null.

---

## 14. Direct-attack certification matrix

CA-01 live certification proves, with disposable staging identities:

- anonymous Newsroom access denied;
- Reporter denied unrelated story discussion before assignment;
- Commercial denied editorial story/thread access;
- assignment grants the Reporter the expected story/assignment relationship;
- mentions fan out only to staff already authorized for story/thread;
- cross-user Inbox operations denied;
- direct forged Inbox inserts denied;
- Reader accounts cannot enumerate internal story comments, threads, Inbox or Newsroom Realtime;
- unverified Reader cannot become eligible;
- anonymous comment creation denied;
- temporary/noncanonical story UUID cannot become comment history;
- verified Reader comment enters required moderation path;
- published projection omits private author/risk internals;
- Reader report creates moderation work;
- Health Editor can moderate but cannot inherit restriction authority unless capability grants it;
- restricted Reader comment creation denied;
- direct private Storage mutation denied;
- Reader attachment metadata access denied;
- desktop Editor session renders Inbox, Desks, Breaking and Moderation under server authority;
- AG-06 exact-head security workflow remains independently green.

---

## 15. Migration and rollback contract

Migrations are forward-only and ordered after AG-06. Applied-migration files are never rewritten to repair defects; fix-forward migrations are used.

Implemented fix-forwards:

- attachment access hardening
- desk-member RLS recursion fix
- foreign-key covering-index hardening

Operational rollback is fail-closed:

- Reader discussion defaults to `comment_policy='disabled'`.
- Native noncanonical stories cannot activate discussion.
- Draft PRs remain unmerged.
- Production remains untouched.

No destructive down-migration is part of the CA-01 acceptance path.

---

## 16. Certification gates

### Server / database

1. all migrations reset from zero on disposable Supabase;
2. migration tests green;
3. CA-01 contract tests green;
4. CA-01 live staging security/attack journey green;
5. inherited AG-06 exact-head security workflow green;
6. existing Chromium UAT green;
7. Validate HealthTimes 2.0 green;
8. Supabase advisor reviewed: no CA-01 security ERROR; no CA-01 unindexed foreign-key findings.

### Native

1. Validate HealthTimes 2.0 green;
2. universal Native foundation/staging/contracts/Reader/growth/security/CA-01 tests green;
3. Android debug binary build green;
4. iOS simulator binary build green;
5. Native Binary Certification readiness green;
6. no physical-device, signed-store or production-cutover claim.

### Programme boundary

PR #15 and PR #16 remain Draft / Open / Unmerged until moderator accepts the certified candidates and the wider AG-07/NM-07 integration sequence authorizes convergence.

---

## 17. Non-goals

Not part of CA-01:

- bulk newsletter delivery;
- transactional email provider implementation;
- WhatsApp / Telegram / Facebook / Instagram / LinkedIn / X / TikTok / YouTube distribution integrations;
- production DNS/MX mutation;
- reader-to-reader private messages;
- public attachment uploads;
- E2E encrypted chat;
- fully automated medical/health truth adjudication;
- production or store-readiness declaration.

