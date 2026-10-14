# HT-NR-00 — Newsroom Authority & Lineage Baseline (`HT-NR-00A`)

**Repository:** `kudzimusar/htp-zw`  
**Programme:** `HT-NR — HealthTimes Newsroom OS`  
**Task:** `HT-NR-00A — Custody Isolation + Newsroom OS 2.0 Baseline + Live Authority Snapshot`  
**Date:** `2026-10-14`  
**Disposition:** `READ-ONLY FORENSICS + DOCUMENTATION BASELINE`

---

## 1. Isolated Custody Record

- **Canonical `main` SHA:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c` (`Merge pull request #80 from kudzimusar/integration/ui-rel04-certified-ui-current-main`)
- **Primary Worktree (`/Users/shadreckmusarurwa/Project AI/htp-zw`):** Left completely untouched on `main` so unrelated in-progress Android/Expo packaging mutations remain isolated in their own lane.
- **HT-NR-00 Isolated Worktree Path:** `/tmp/ht-nr00-authority-reconstruction`
- **HT-NR-00 Branch:** `audit/ht-nr00-authority-reconstruction`
- **Starting `HEAD` & Merge-Base Against `main`:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c`
- **Pre-Edit Worktree Status (`git status --short`):** Clean (`Working tree clean. No changes.`)

---

## 2. Repository Authority on Canonical `main` (`6994aa18d37e2189dbc1d3f8efc76a638ee0971c`)

### 2.1 Canonical Studio Routes & UI Components (`apps/mobile`)
Canonical `main` contains the Expo Router `/studio` shell and partial `CA-01` / `AG-06` client integration:

- `apps/mobile/app/studio/index.tsx`: Studio `Today` landing screen. Displays `StudioPlaceholder` (`owner="AG-06 / AG-05"`), authority status strip (`services.authorization.getSnapshot()`), read-only public source-parity story summary (`services.articles.getHome()`), 12 module navigation cards, and programme dependency gate banners (`AG-04`, `AG-05`, `AG-06`, `CA-01`, `AG-07`).
- `apps/mobile/app/studio/[module].tsx`: Dynamic route handler for 20 module slugs (`inbox`, `assignments`, `stories`, `create-edit`, `live-desk`, `video-desk`, `desks`, `breaking`, `moderation`, `media`, `advertising`, `premium`, `social`, `audience`, `search-growth`, `analytics`, `subscribers`, `authors`, `staff-roles`, `settings`).
  - Wraps modules in `StudioAccessGate` (when a specific `HealthTimesCapability` is configured) or `StudioAuthorityGate` (for general server-authorized staff modules).
  - Renders live functional panels **only** for `CA-01` communication/moderation surfaces:
    - `inbox` → `<StudioInboxPanel />`
    - `assignments` → `<StudioAssignmentsPanel />` / `<StudioAssignmentDiscussionPanel />`
    - `stories` (only when `storyId` param is supplied) → `<StudioStoryDiscussionPanel />`
    - `desks` → `<StudioDesksPanel />` / `<StudioDeskThreadsPanel />` / `<StudioThreadPanel />`
    - `breaking` → `<StudioBreakingPanel />` / `<StudioThreadPanel />`
    - `moderation` → `<StudioModerationPanel />`
  - All other 14 modules (`create-edit`, `stories` list/workspace, `live-desk`, `video-desk`, `media`, `advertising`, `premium`, `social`, `audience`, `search-growth`, `analytics`, `subscribers`, `authors`, `staff-roles`, `settings`) render only `<StudioPlaceholder />` and static readiness bullet lists.
- `apps/mobile/src/ui/Studio.tsx`: Implements `StudioShell`, `StudioAuthorityGate`, `StudioAccessGate`, and `StudioPlaceholder`.
- `apps/mobile/src/ui/StudioInbox.tsx`: Implements `<StudioInboxPanel />` backed by `services.newsroomCommunication`.
- `apps/mobile/src/ui/StudioCommunications.tsx`: Implements `<StudioAssignmentsPanel />`, `<StudioAssignmentDiscussionPanel />`, `<StudioStoryDiscussionPanel />`, `<StudioDesksPanel />`, `<StudioDeskThreadsPanel />`, `<StudioBreakingPanel />`, `<StudioThreadPanel />`, and `<StudioModerationPanel />`.
- `apps/mobile/src/ui/ReaderDiscussion.tsx`: Implements the public Reader verified-comment discussion component backed by `services.readerDiscussion`.

### 2.2 Canonical Client Services & Security Contracts on `main`
- `apps/mobile/src/security/capabilities.ts`: Defines the 38-capability `HEALTH_TIMES_CAPABILITIES` tuple, `AuthorizationSnapshot`, and `hasServerCapability()`.
- `apps/mobile/src/domain/contracts.ts` & `apps/mobile/src/domain/models.ts`: Defines `HealthTimesServices`. Includes `AuthorizationService`, `ReaderDiscussionService`, `NewsroomCommunicationService`, and `CommentModerationService`, but **lacks** `NewsroomStoryService`, `NewsroomWorkflowService`, `NewsroomPlanningService`, `NewsroomAssignmentService` (write/lifecycle operations), `NewsroomMediaService`, `NewsroomPresentationService`, `NewsroomLiveService`, `NewsroomDistributionService`, `NewsroomEvidenceService`, `NewsroomIntelligenceService`, `NewsroomSearchService`, `NewsroomStaffService`, and `NewsroomCommercialService`.
- `apps/mobile/src/services/index.ts`: Wires `stagingAuthService`, `stagingAuthorizationService`, `stagingDeviceSecurityService`, `stagingReaderDiscussionService`, `stagingNewsroomCommunicationService`, `stagingCommentModerationService`, and `stagingPlatformService` when `appEnvironment === "staging"`, combined with `migratedCorpusServices` when `editorialDataMode === "staging"`.
- `apps/mobile/src/services/security.ts`: Calls `newsroom_register_session` and `newsroom_current_context` RPCs on staging Supabase to project server-verified staff identity and capabilities.
- `apps/mobile/src/services/communications.ts`: Calls `CA-01` RPCs (`reader_register_comment_profile`, `reader_comment_eligibility`, `reader_public_story_comments`, `reader_submit_story_comment`, `reader_edit_story_comment`, `reader_withdraw_story_comment`, `reader_report_story_comment`, `newsroom_list_inbox`, `newsroom_inbox_summary`, `newsroom_mark_notification_read`, `newsroom_ack_notification`, `newsroom_archive_notification`, `newsroom_add_internal_comment`, `newsroom_edit_internal_comment`, `newsroom_set_internal_comment_resolved`, `newsroom_create_thread`, `newsroom_post_thread_message`, `newsroom_mark_thread_read`, `newsroom_list_comment_moderation_queue`, `newsroom_moderate_story_comment`, `newsroom_set_story_comment_policy`, `newsroom_restrict_reader_comments`, `newsroom_lift_reader_comment_restriction`) and table selects (`story_assignments`, `story_internal_comments`, `newsroom_desks`, `newsroom_threads`, `newsroom_messages`, `newsroom_announcements`).
- `apps/mobile/src/services/migrated-corpus.ts`: Consumes `AG-05` public Reader RPCs (`ag05_resolve_public_path`, `ag05_public_story_teaser_document`, `ag05_public_story_document`, `ag05_public_context_document`, `ag05_public_feed_rows`, `ag05_hospaz_direct_ad_preview`).
- `apps/mobile/src/generated/database.types.ts`: 55 KB generated TypeScript schema file (useful secondary corroboration of `CA-01` and `AG-06` table/RPC signatures, but **not** live schema authority).

### 2.3 Migrations & API Endpoints Actually Present on `main`
- `supabase/migrations/`: Contains **only two** SQL migration files on `main`:
  1. `supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql`
  2. `supabase/migrations/20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql`
  All earlier `AG-02`, `AG-04`, `AG-05`, `AG-06`, `CA-01`, and `COM-01` migrations are **absent** from `supabase/migrations/` on canonical `main`.
- `api/`: Contains **only one** file on `main`:
  1. `api/commerce.js`
  Serverless/API handlers from specialist branches (`api/newsroom.js`, `api/communications.js`, `api/public.js`) are **absent** from `api/` on canonical `main`.

### 2.4 Historical Prototype & Unmerged Specialist Branches in Repository
- **Browser-Local Product Prototype (on `main` root)**:
  - `newsroom.html` (12 KB), `newsroom.js` (86 KB), `newsroom.css` (23 KB), `newsroom-v21.js` (15 KB), `newsroom-v21.css` (5 KB), and Playwright suite `tests/newsroom-os.spec.js` (6 KB).
  - Expresses the original 35+ module UX and editorial operating model (`PRODUCT_PROTOTYPE`), but relies on browser `localStorage` and client-side mock state.
- **Unmerged Specialist Branches Present in Local `.git` Object Store**:
  - `remotes/origin/migration/ag-06-newsroom-backend-security` (`a2d78da`) — PR #13 (`AG-06` Newsroom Backend/Auth/RBAC)
  - `remotes/origin/communications/ca-01-newsroom-internal-communications` (`5162feb`) — PR #15 (`CA-01` internal communications & reader moderation)
  - `remotes/origin/communications/ca-01-native-integration` (`f1a9f5f`) — `CA-01` native Studio integration
  - `communications/com-01-email-distribution` (`d6734ee`) & `remotes/origin/communications/com01-final-live-provider-certification` (`71507da`) — PR #21 (`COM-01` multi-channel communications, email, consent, campaigns, social)
  - `remotes/origin/fix/ag06-ca01-newsroom-p1-product` (`11fe434`) & `remotes/origin/audit/ag06-ca01-newsroom-product-ux` (`d9c593b`) — PR #33 (`AG-06` / `CA-01` Newsroom P1 product closure & staging ledger alignment)
  - `remotes/origin/feat/ag06-cms-public-media-promotion` (`2849c18`) — PR #34 (`AG-06` CMS public media promotion & release boundary hardening)
  - `feat/ag06-native-public-context-inline-media` (`755b7ba`) — PR #40 (`AG-06` canonical author/section authority, native public context, inline media binding & public storage authority)
  - `remotes/origin/migration/ag-05-seo-analytics-monetization` (`74b2263`) & `remotes/origin/recovery/ag05-cp5-capability-convergence` (`304d475`) — PR #12 (`AG-05` SEO, analytics, monetization, CP5 capability convergence)
  - `remotes/origin/migration/ag-02-staging-platform`, `migration/ag-03-source-data-capture`, `migration/ag-04-rehearsal-content-media-taxonomy`, `remotes/origin/recovery/ag04-phase5-migration-lineage-reconciliation`

---

## 3. Live Staging Authority Snapshot (`MODERATOR_VERIFIED`)

> **Verification Provenance:** The live Supabase staging facts below are recorded as `MODERATOR_VERIFIED` from the Moderator's independent read-only inspection of the connected staging authority. No direct live-database queries or mutations were executed by the specialist during `HT-NR-00A`.

### 3.1 Connected Staging Project Identity
- **Project Name:** `HealthTimes Staging`
- **Project Reference:** `gcdohgbmqhqwydgaxrcr`
- **Region:** `ap-northeast-1`
- **Operational Status:** `ACTIVE_HEALTHY`

### 3.2 Verified Live Staging Migration Ledger Families
The live staging database migration ledger (`supabase_migrations.schema_migrations`) contains the deployed `AG-06`, `CA-01`, `COM-01`, later `AG-06` media/context, and `AG-05` teaser lineages, including:

1. **AG-06 Core Auth, RBAC, Story Lifecycle & Performance**:
   - `20260922020254_ag06_newsroom_auth_rbac`
   - `20260922031250_ag06_newsroom_story_listing_perf`
   - `20260922032244_ag06_story_rls_performance`
   - `20260922033157_ag06_auth_delete_revocation`
   - `20260922033542_ag06_auth_delete_guard`
2. **CA-01 Internal Communications, Desks, Threads, Moderation & Realtime**:
   - `20260922054411_ca01_internal_schema_capabilities`
   - `20260922054415_ca01_inbox_story_discussion`
   - `20260922054420_ca01_desks_threads_announcements`
   - `20260922054424_ca01_communication_storage`
   - `20260922054428_ca01_reader_discussion_moderation`
   - `20260922054449_ca01_realtime_authorization`
   - `20260922070256_ca01_realtime_event_emission`
3. **COM-01 Organisational Communications, Consent, Campaigns & Social**:
   - `20260922094527_com01_communications_domain`
   - `20260922095013_com01_private_attachments`
   - `20260922100851_com01_campaign_and_escalation_authority`
4. **Later AG-06 Media Custody, Public Promotion, Canonical Context & Inline Media**:
   - `20260924072830_ag06_story_media_request_changes`
   - `20260924073135_ag06_media_listing_performance`
   - `20260924103201_ag06_cms_public_media_promotion`
   - `20260925230247_ag06_public_story_release_boundary_hardening`
   - `20260927091500_ag06_canonical_author_section_authority`
   - `20260927093000_ag06_native_public_context`
   - `20260927094500_ag06_inline_body_binding`
   - `20260927101500_ag06_public_inline_media_promotion`
   - `20260927110000_ag06_inline_public_storage_authority`
   - `20260927121500_ag06_audit_feed_performance`
5. **AG-05 Public Projections & Premium Teaser Hardening**:
   - Earlier `AG-05` SEO/analytics/monetization migrations through `20261002060846_ag05_premium_teaser_public_projection` and `20261002061027_ag05_premium_teaser_helper_privilege_hardening`.

### 3.3 Verified Live Server RPC / Function Families (`MODERATOR_VERIFIED`)
- **Identity & Authority**: `newsroom_register_session`, `newsroom_current_context`, `newsroom_has_capability`, `newsroom_session_authorized`, `newsroom_staff_directory`, `newsroom_change_staff_role`, `newsroom_revoke_staff`, `newsroom_revoke_session`
- **Editorial & Story Lifecycle**: `newsroom_create_story`, `newsroom_save_story`, `newsroom_list_stories`, `newsroom_transition_story`, `newsroom_restore_revision`, `newsroom_record_review`, `newsroom_request_story_changes`
- **Assignments**: `newsroom_create_assignment`, `newsroom_progress_assignment`
- **Internal Collaboration**: `newsroom_add_internal_comment`, `newsroom_edit_internal_comment`, `newsroom_create_desk`, `newsroom_create_thread`, `newsroom_post_thread_message`, `newsroom_publish_announcement` (plus inbox/thread read/ack/archive/resolve helpers wired in `communications.ts`)
- **Media & Public Promotion**: `newsroom_prepare_story_media`, `newsroom_finalize_story_media`, `newsroom_attach_story_media`, `newsroom_detach_story_media`, `newsroom_list_media`, `newsroom_stage_story_media_promotion`, `newsroom_story_media_promotion_plan`, `newsroom_validate_inline_body_bindings`
- **Audience Moderation & Discussion**: `newsroom_set_story_comment_policy`, `newsroom_list_comment_moderation_queue`, `newsroom_moderate_story_comment`, `newsroom_restrict_reader_comments` (plus `reader_*` comment RPCs and `newsroom_lift_reader_comment_restriction`)
- **Premium & Commercial**: `newsroom_set_story_access`, `newsroom_create_campaign`, `newsroom_approve_campaign`
- **Organisational Communications (`COM-01`)**: Live `communications_*` functions covering contacts, consent, replies, campaign approval/sending, social publication, provider webhook/delivery results, and communication attachments.

### 3.4 Verified Live RLS Policy Families (`MODERATOR_VERIFIED`)
Active row-level security policies are enforced in live staging across:
- Core Editorial & Staff: `stories`, `staff_profiles`, `story_assignments`, `story_autosaves`, `story_revisions`, `story_reviews`, `story_lifecycle_events`, `story_corrections`, `story_internal_comments`, `newsroom_roles`, `newsroom_capabilities`, `newsroom_sessions`, `newsroom_notifications`
- Collaboration & Community: `newsroom_desks`, `newsroom_threads`, `newsroom_messages`, `newsroom_announcements`, reader comments, and moderation tables
- Commercial & Audience: Premium entitlements, subscribers, and advertising tables
- Multi-Channel Communications (`COM-01`): `communication_channels`, `contact_profiles`, `contact_consents`, `communication_suppressions`, `communication_threads`, `communication_messages`, `communication_assignments`, `communication_templates`, `audience_campaigns`, `campaign_recipients`, `social_accounts`, `social_posts`, `social_publication_attempts`
- Storage Buckets: Private Newsroom Storage (`newsroom-private` / communication attachments) and public Newsroom media Storage.

---

## 4. Proven Authority Divergence Statement

> **The live staging database (`gcdohgbmqhqwydgaxrcr`) contains significant accepted Newsroom authority—spanning `AG-06`, `CA-01`, `COM-01`, and later `AG-06` media/publication/context migrations, RPCs, and RLS policies—that is absent from `supabase/migrations/`, `api/`, and `apps/mobile/src/services/` on canonical `main` (`6994aa18d37e2189dbc1d3f8efc76a638ee0971c`).**

Specifically:
1. **Database Migration Custody Gap on `main`**: Canonical `main` holds only 2 `AG-05` SQL migrations (`20261002060846` and `20261002061027`), whereas live staging holds 25+ `AG-06`, `CA-01`, and `COM-01` migrations alongside the earlier `AG-02`/`AG-04`/`AG-05` foundation.
2. **Server API Custody Gap on `main`**: Canonical `main` holds only `api/commerce.js`, whereas `api/newsroom.js`, `api/communications.js`, and `api/public.js` reside in unmerged specialist branches.
3. **Client Service & Studio UI Gap on `main`**: Canonical `main` integrates `CA-01` inbox, desks, breaking rooms, internal comments, assignment read-list, and comment moderation (`apps/mobile/src/services/communications.ts`) plus `AG-06` session/capability projection (`apps/mobile/src/services/security.ts`), but leaves 14 of 20 `/studio` modules as placeholders without typed client services for story creation/editing, workflow transitions, media upload/promotion, staff administration, `COM-01` campaigns/newsletters/WhatsApp/social, or operational analytics.

*(Note: Per `HT-NR-00A` rules, this baseline records the factual divergence only. Exact branch-to-staging reconciliation and merge/rebase/reconstruction strategy are deferred to `HT-NR-00B` and `HT-NR-00C`.)*
