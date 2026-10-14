# HealthTimes Newsroom OS — Recovery, Convergence & Professional Newsroom Plan

**Programme:** HealthTimes Modernization (`HT-NR — HealthTimes Newsroom OS`)  
**Repository:** `kudzimusar/htp-zw`  
**Canonical Reader:** `apps/mobile`  
**Revision:** Newsroom OS 2.0 (supersedes Newsroom OS 1.0 of 2026-09-09 while preserving its institutional operating model and design language)  
**Date:** 2026-10-14  
**Status:** PROGRAMME BASELINE — DOWNSTREAM IMPLEMENTATION OWNER / MODERATOR GATED  
**Current Canonical Main Baseline:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c`

---

## 1. Programme Objective

HealthTimes must operate as an integrated **Newsroom Operating System**, not as a publication with an administrative CMS attached to it.

The finished experience must scale HealthTimes from a Zimbabwe-focused publication into a global health newsroom with a strong African reporting advantage, supporting the complete institutional lifecycle of journalism:

```text
PLANNING
   ↓
COMMISSIONING / ASSIGNMENT
   ↓
REPORTING + SOURCES + EVIDENCE
   ↓
STORY / LIVE / VIDEO / DATA PRODUCTION
   ↓
EDITORIAL REVIEW
   ↓
MEDIA + RIGHTS + PRESENTATION
   ↓
PUBLICATION AUTHORITY
   ↓
WEB / PWA / IOS / ANDROID / NEWSLETTER / WHATSAPP / SOCIAL / PUSH
   ↓
AUDIENCE + IMPACT + COMMERCIAL PERFORMANCE
   ↓
NEWSROOM INTELLIGENCE
   ↓
NEXT EDITORIAL DECISION
```

HealthTimes Newsroom OS combines three institutional qualities:

1. **NYT-class editorial production discipline**: Deep writing, editing, versioning, planning, media custody, publication authority, and semantic presentation control.
2. **Bloomberg-like information workflow**: Fast breaking-news coordination, alerts, institutional monitoring, structured information, powerful retrieval, and operational intelligence alongside journalism.
3. **HealthTimes-specific health intelligence**: Evidence provenance, specialist health/science review, research, citations, geographic intelligence, public-health monitoring, and strict protection of sensitive-health audience data.

The target is therefore not simply a CMS or admin panel—it is **HealthTimes Newsroom OS: a health journalism, publishing, and intelligence platform**.

### Preserved Design & Experience Language (from Newsroom OS 1.0)

After authentication, staff enter a persistent workspace shaped by their role, assignments, deadlines, review responsibilities, distribution duties, and security permissions. Unauthenticated users see no local role-switching bypass; server-verified authentication and capability resolution govern entry and module visibility.

The visual language remains deliberately non-generic: dark ink/navy navigation, warm paper work surfaces, HealthTimes teal, muted blue, restrained amber, brick red, and green for operational status—with no glassmorphism, decorative AI gradients, or oversized empty dashboard cards.

---

## 2. Why Newsroom OS 2.0 Is Required

Newsroom OS 1.0 (`2026-09-09`) established the original staff application intent, 35+ module taxonomy, role definitions, and capability vocabulary for client review. However, it was written before subsequent programme tracks created substantial server-side authority across the live staging database and specialist repository lineages.

The repository and live staging environment now contain multiple layers of Newsroom implementation:

| Layer | Current Significance |
| :--- | :--- |
| **Original `newsroom.html` / `newsroom.js` application** | Richest expression of original product/UX intent (`My Newsroom → Editorial → Content → Distribution → Intelligence → Commercial → Organisation → System`); browser-local prototype, **not** production authority |
| **AG-06** | Production-grade staff identity, capability-based RBAC, sessions, workflow transitions, optimistic locking, revisions, assignments, audit, and publishing authority |
| **CA-01** | Newsroom inbox, desks, internal story discussion, breaking rooms, realtime authorization/invalidation, reader comments, and moderation |
| **COM-01** | Organisational communications, contacts, consent, suppression, email, campaigns, private attachments, and social publication domain |
| **AG-05** | Privacy-safe analytics taxonomy, SEO/URL continuity, public story/teaser/context projections, and advertising/monetisation authority |
| **Later AG-06 Media & Context Work** | Private media custody (`newsroom-private`), checksum/alt-text/provenance enforcement, publication promotion, inline body media bindings (`<figure data-healthtimes-media-id="UUID">`), and canonical author/section/public-context authority |
| **Current `apps/mobile/app/studio`** | Canonical staff application shell on `main`, currently exposing only a fraction of the available backend (`CA-01` inbox/desks/breaking/moderation/assignments and `AG-06` session/capability gate) |

The programme problem is therefore no longer *"replace the prototype with a future production backend."*

The problem is:

> **Recover what already exists across repository lineages and live staging, determine its exact authority, converge it onto canonical `main`, expose it through coherent typed domain services, and build the professional Newsroom experience over that authority without duplicating or weakening it.**

---

## 3. Governing Principles

### 3.1 One Authoritative Newsroom
HealthTimes must not operate separate competing newsroom systems. The final architecture establishes one canonical authority for staff identity, capabilities, story lifecycle, assignments, reviews, revisions, media, presentation, distribution, audience/community, commercial operations, analytics, and audit. Historical implementations inform product design but never act as parallel production authorities.

### 3.2 Server Authority Over Privileged State
The client requests actions; the server decides whether they are authorised. Protected authority includes:
- publishing and workflow transitions;
- role changes, capability overrides, and staff/session revocation;
- Premium access policy (`public | premium`);
- advertising campaign approval;
- media promotion from private custody to public publication;
- distribution and campaign send approvals;
- security and platform settings.

No local role selector, `localStorage` flag, or presentation-only control may ever become production authority.

### 3.3 Reader and Newsroom Remain Decoupled
The canonical Reader remains `apps/mobile`. The Newsroom publishes authoritative content and semantic presentation decisions; the Reader renders those decisions. The Reader must not become the CMS, and the CMS must not depend on a single presentation platform. One editorial decision must drive Web, PWA, iOS, Android, newsletters, WhatsApp, social, push, and feeds.

### 3.4 Recover Before Rebuilding
Before any Newsroom feature is implemented, existing `AG-06`, `CA-01`, `COM-01`, `AG-05`, and associated branches plus the live staging schema must be classified. No capability may be rebuilt until the programme proves that an authoritative implementation does not already exist.

### 3.5 Faithful Institutional Workflow, Cohesive Product Experience
The system represents how professional journalism actually works without flattening editorial distinctions (such as separating informal comments from formal review decisions, or separating editorial copy authority from commercial ad operations). Rather than recreating 35+ disconnected admin screens, related capabilities converge into cohesive workspaces around real journalistic jobs.

---

## 4. Authority Recovery Model

Phase `HT-NR-00` classifies every Newsroom capability across three truths (`repository lineage` ↔ `live staging schema` ↔ `canonical client integration`) using these states:

| State | Meaning |
| :--- | :--- |
| `CANONICAL_MAIN` | Present and authoritative on current `main` (`6994aa18d37e2189dbc1d3f8efc76a638ee0971c`) |
| `LIVE_STAGING` | Proven in the live staging infrastructure/database (`gcdohgbmqhqwydgaxrcr`) |
| `ACCEPTED_UNMERGED` | Certified work in repository branches outside `main` requiring convergence |
| `HISTORICAL_SOURCE` | Valuable implementation/reference in git history but not current authority |
| `PRODUCT_PROTOTYPE` | Valid product/UX intent (`newsroom.html` / `newsroom.js`) but not security/data authority |
| `PARTIAL` | Split across layers (e.g., live in staging and partially wired in client, or backend complete with UI stubbed) |
| `SUPERSEDED` | Replaced by later accepted work |
| `UNKNOWN` | Not yet verified by repository or live-schema forensics (preferred over unsupported inference) |
| `MISSING` | Proven to have no authoritative implementation in `main`, staging, or historical branches |

Recovery forensics must trace at minimum:
- **PR #13 (`AG-06`)**: Newsroom backend, auth, RBAC, sessions, stories, workflow, revisions, assignments, audit (`remotes/origin/migration/ag-06-newsroom-backend-security`)
- **PR #15 (`CA-01`)**: Newsroom communications, inbox, desks, breaking threads, reader comments/moderation (`remotes/origin/communications/ca-01-newsroom-internal-communications`, `remotes/origin/communications/ca-01-native-integration`)
- **PR #21 (`COM-01`)**: Organisational communications, contacts, consent, campaigns, social publication (`communications/com-01-email-distribution`, `remotes/origin/communications/com01-final-live-provider-certification`)
- **PR #33 (`AG-06 / CA-01 P1`)**: Newsroom product convergence lineage (`remotes/origin/fix/ag06-ca01-newsroom-p1-product`, `remotes/origin/audit/ag06-ca01-newsroom-product-ux`)
- **PR #34 (`AG-06 Media`)**: CMS public media promotion and release-boundary hardening (`remotes/origin/feat/ag06-cms-public-media-promotion`)
- **PR #40 (`AG-06 Native Context & Inline Media`)**: Canonical author/section authority, native public context, inline body media binding and promotion (`feat/ag06-native-public-context-inline-media`)
- **PR #12 (`AG-05`)**: SEO, analytics, monetization, and CP5 capability convergence (`remotes/origin/migration/ag-05-seo-analytics-monetization`, `remotes/origin/recovery/ag05-cp5-capability-convergence`)

---

## 5. Newsroom Recovery Matrix Contract

Across `HT-NR-00A` (high-level domain skeleton in `docs/newsroom/HT-NR-00_RECOVERY_MATRIX.md`) and `HT-NR-00B`/`HT-NR-00C` (full capability-by-capability convergence matrix), the programme tracks:

| Field | Purpose |
| :--- | :--- |
| `Capability / Domain` | Canonical capability or domain identifier (e.g., `story.publish`, `media`, `RBAC`) |
| `Product domain` | Planning / Editorial / Evidence / Media / Live / Presentation / Distribution / Audience / Commercial / Intelligence / Organisation |
| `Original implementation` | Prototype or initial source (`newsroom.js`, `AG-06`, etc.) |
| `Current Main` / `Current code location` | Presence and exact file/service/API paths on `main` |
| `Live Staging` / `Database objects` | Tables, RPC functions, triggers, storage buckets, and RLS policies in staging (`gcdohgbmqhqwydgaxrcr`) |
| `Historical Lineage` / `PR lineage & SHA` | Originating branch/PR and exact commit SHA custody |
| `Canonical Client Integration` | Integration state in `apps/mobile` (`yes` / `no` / `partial`) |
| `Current test evidence` | Playwright / contract / migration test suites covering the capability |
| `Status` | Authority state classification (`CANONICAL_MAIN`, `LIVE_STAGING`, `ACCEPTED_UNMERGED`, `PARTIAL`, etc.) |
| `Superseded by` | Later migration or branch authority that replaces an earlier version |
| `Recovery action` / `Next Investigation` | Concrete forensic step (`HT-NR-00B`/`00C`) or convergence action (`adopt` / `rebase` / `rebuild` / `retire`) |
| `Final canonical owner` | Target module and `Newsroom*Service` contract |

---

## 6. Target Newsroom Architecture

The target system consists of four principal layers:

```text
┌─────────────────────────────────────────────┐
│             NEWSROOM EXPERIENCE             │
│ Planning / Story / Live / Presentation etc. │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│          CANONICAL NEWSROOM SERVICES        │
│ Story / Workflow / Media / Distribution     │
│ Staff / Intelligence / Commercial / Search  │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│             SERVER AUTHORITY LAYER          │
│ RPC/API + RLS + capabilities + audit        │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                DATA AUTHORITY               │
│ Supabase/Postgres + Storage + integrations  │
└─────────────────────────────────────────────┘
```

The Studio client must never invoke an ad-hoc collection of raw database RPC names directly from UI components; all operations pass through typed domain services.

---

## 7. Canonical Newsroom Service Domains

`HealthTimesServices` (`apps/mobile/src/domain/contracts.ts`) will expand to expose fifteen coherent Newsroom service families:

| Service | Responsibility |
| :--- | :--- |
| `NewsroomStoryService` | Story creation, loading, structured editing, autosave, optimistic concurrency (`lock_version`), revisions, and version branches |
| `NewsroomWorkflowService` | Workflow transitions (`newsroom_transition_story`), specialist reviews, change requests, corrections, and publication approval |
| `NewsroomPlanningService` | News Budget, diary, pitches, coverage items, embargoes, and editorial packages |
| `NewsroomAssignmentService` | Commissioning, assignment lifecycle (`Assigned → Complete`), and package-linked tasks |
| `NewsroomMediaService` | Private asset intake (`newsroom-private`), rights/captions/alt-text/provenance, inline bindings, crops/variants, and public promotion |
| `NewsroomPresentationService` | Homepage curation, section fronts, semantic story priority, and regional editorial editions |
| `NewsroomLiveService` | Breaking-news events, command rooms, live blogs, verified facts vs. unconfirmed claims, and update streams |
| `NewsroomDistributionService` | Newsletter Editions, WhatsApp briefings/alerts, push alerts, and social publication workflows |
| `NewsroomEvidenceService` | Source registry, confidential-source isolation, documents, datasets, citations, and verification state |
| `NewsroomIntelligenceService` | Editorial operational analytics, privacy-safe audience metrics, trends, SEO health, and citation/impact tracking |
| `NewsroomSearchService` | Permission-aware institutional search across stories, sources, media, assignments, staff, archive, and audit |
| `NewsroomStaffService` | Staff directory, roles, granular capabilities (`HEALTH_TIMES_CAPABILITIES`), overrides, invitations, sessions, and revocation |
| `NewsroomCommercialService` | Premium commissioning/entitlements, subscriber support, and advertising campaigns/placements/approvals |
| `NewsroomCommunicationService` | Newsroom inbox, desks, threads, internal story comments, and announcements |
| `NewsroomCommunityService` | Verified-reader comment moderation, story comment policies, reader restrictions, and community intake |

---

## 8. HealthTimes Newsroom Product Domains

Rather than 35+ disconnected admin screens, the Newsroom is organised around eleven institutional desks (preserving every capability from Newsroom OS 1.0):

1. **Planning Desk**: News Budget, diary, pitches, planned coverage, press conferences, research publication dates, health observances, interviews, embargoes, deadlines, editorial conferences, commissioning, coverage gaps, and multi-output packages.
2. **Editorial Desk**: Stories, the 5-layer Story Workspace, assignments, specialist reviews, corrections, versions, internal editorial conversation, approval, and publication.
3. **Evidence & Research Desk**: Human and confidential source records, institutional sources, documents, research papers, datasets, citations, factual claims, verification state, and prior HealthTimes coverage.
4. **Media Desk**: Photography, documents, video, audio, graphics, captions, credits, copyright/licensing, alt text, crop variants, focal points, provenance, and private-to-public publication custody.
5. **Live Desk**: Breaking-news events, command rooms, live blogs, live updates, confirmed facts vs. unverified claims, reporter/editor coordination, alert decisions, multimedia intake, and next-update deadlines.
6. **Presentation Desk**: Homepage, Hero/Lead, Top Stories, section fronts, regional editions (Zimbabwe, Africa, Global Health), Premium/live/breaking prominence, scheduled front-page changes, and cross-platform preview.
7. **Distribution Desk**: Newsletter Editions, WhatsApp briefings/alerts, social drafts/scheduling, push alerts, channel-specific copy, approvals, and delivery state.
8. **Audience & Community Desk**: Verified-reader comments, human moderation queue, story comment policies, reader restrictions, reader tips, and corrections intake.
9. **Commercial Desk**: Premium editorial products, subscriber operations/support, advertising campaigns, creatives, placements (including HOSPAZ governance), and campaign approvals—strictly separated from editorial copy authority.
10. **Intelligence Desk**: Editorial operational metrics, privacy-safe audience analytics, trending topics, SEO workbench, Search Console performance, citation/impact intelligence, and AI-assisted research.
11. **Organisation Desk**: Staff directory, desks, roles, capability overrides, active session registry, MFA/security state, integrations, platform health, and immutable audit logs.

---

## 9. Core Editorial Object Model

The architecture supports the progression from pre-story planning to multi-channel distribution:

```text
COVERAGE ITEM
     ↓
EDITORIAL PACKAGE
     ↓
CONTENT ENTITY
     ↓
EDITORIAL VERSION(S)
     ↓
PUBLICATION VARIANT(S)
     ↓
DISTRIBUTION OUTPUT(S)
```

- **Coverage Item**: A planned or breaking event before any story exists (e.g., WHO report release, Parliament hearing, outbreak announcement).
- **Editorial Package**: Groups multiple outputs around one event (breaking alert, main article, analysis, live blog, video, newsletter block, social post).
- **Content Entity**: The durable conceptual story or multimedia object.
- **Editorial Version**: Working branches/revisions (`story_revisions`, `story_autosaves`), supporting `Published v1` alongside an in-progress `Update Draft v2` or `Correction Draft`.
- **Publication Variant**: Approved representation for a specific context or audience (`public` vs. `premium` / teaser projection).
- **Distribution Output**: Channel-specific manifestations (homepage placement, push alert, newsletter edition slot, WhatsApp briefing, social post).

---

## 10. Professional Story Workspace & Lifecycle

### 10.1 Story Lifecycle & Server Transitions
`newsroom_transition_story()` enforces capability-gated server transitions across:

`Pitch → Approved → Assigned → Reporting → Draft → Submitted → Fact Check → Health/Science Review → Copy Edit → Editor Review → Ready → Scheduled → Published → Updated/Corrected → Archived`

Protected authority fields cannot be mutated directly by client table updates; database triggers and RPC checks enforce role and capability boundaries.

### 10.2 Five-Layer Story Workspace
The Story Workspace converges `Stories + Create/Edit + Sources + Review + Media + SEO + Distribution` into five coherent layers:

| Layer | Capabilities |
| :--- | :--- |
| **Writing** | Headline, standfirst, structured article body, quotes, links, embeds, tables, headings, callouts, data/graphic embeds |
| **Reporting** | Linked sources, research documents, interview notes, factual claims, verification state, reporting notes, deadlines |
| **Production** | Featured media, inline media (`<figure data-healthtimes-media-id="UUID">`), supporting documents, captions, credits, rights, alt text, multimedia |
| **Editorial** | Owner/reporter, assigned editor, fact checker, health/science reviewer, copy editor, threaded internal comments, formal review decisions (`approve` / `request_changes`), version comparison |
| **Publication** | Section, taxonomy, geography, canonical author/byline, `access_policy` (`public` / `premium`), SEO title/description/slug, schedule, `ad_setting`, homepage/edition eligibility, newsletter/social/push selections, exact Reader preview, and publish/correct actions |

### 10.3 Concurrency, Autosave, Revisions & Corrections
- `newsroom_save_story()` enforces optimistic concurrency via `lock_version`, returning `VERSION_CONFLICT` on stale writes.
- Working drafts persist to `story_autosaves`; manual saves and workflow milestones record immutable `story_revisions` with restoration via `newsroom_restore_revision()`.
- Corrections (`story_corrections`) record durable editorial events with reason, actor, previous revision, replacement revision, and timestamp.

---

## 11. Specialist Domain Specifications

### 11.1 News Budget, Planning & Assignments (`HT-NR-03`)
- **News Budget**: Tracks working title, coverage type, date/time, desk, geography, assigned reporter/editor, expected outputs, source documents, embargo timestamp, interviews, deadline, priority, homepage expectation, and status—answering what is happening today/tomorrow, what is late, and what is unassigned.
- **Assignments**: Preserves the `Assigned → Accepted → Reporting → Drafting → Submitted → Complete` lifecycle (`newsroom_create_assignment`, `newsroom_progress_assignment`) while linking assignments to News Budget coverage items and multi-output packages.

### 11.2 Review, Evidence & Health Intelligence Graph (`HT-NR-02` / `HT-NR-07`)
- **Specialist Review**: Distinguishes informal internal comments (`story_internal_comments`) from required change requests (`newsroom_request_story_changes`) and formal specialist review records (`newsroom_record_review` across fact check, health/science review, copy edit, and editor review).
- **Evidence Desk**: Elevates sources from free-text notes into structured records distinguishing human sources, confidential sources, public institutions, documents, datasets, peer-reviewed research, and prior HealthTimes reporting. Confidential-source metadata is strictly isolated from public Reader output, analytics, unrestricted AI indexes, and general staff search.
- **Health Intelligence Graph**: Connects diseases, outbreaks, drugs/treatments, hospitals, ministries, agencies, NGOs, experts, policies, budgets, countries/regions, indicators, studies, datasets, and HealthTimes stories to surface institutional memory during reporting.

### 11.3 Media Production & Public Custody (`HT-NR-02` / `HT-NR-05`)
- Retains `AG-06` private staging (`newsroom-private`), MIME/size validation, alt-text and provenance enforcement, SHA-256 checksums, usage roles (`featured`, `inline`, `supporting_document`), promotion planning (`newsroom_stage_story_media_promotion`, `newsroom_story_media_promotion_plan`), and fail-closed inline HTML binding validation (`newsroom_validate_inline_body_bindings`).
- Expands the Media Desk to support editorial crops, focal points, responsive device/social derivatives, license expiry, photo-desk approval, video/audio metadata, transcripts, captions/subtitles, and graphics.

### 11.4 Front Page, Presentation Engine & Edition Authority (`HT-NR-04`)
- Replaces recency-only Reader Home sorting with semantic editorial priorities (`Hero / Lead`, `Top Story`, `Major`, `Standard`, `Secondary`, `Breaking`, `Live`, `Premium priority`, `Pin`, `Hold`, `Suppress from Home`).
- Separates **Editorial Edition Authority** (Newsroom control over Zimbabwe, Africa, and Global Health edition leads, section order, regional priorities, schedules, and alert strategies) from **Reader Edition Personalisation** (`/edition.tsx` user preferences).

### 11.5 Breaking & Live Command Desk (`HT-NR-05`)
- Builds on `CA-01` `newsroom_threads` (`thread_type = 'breaking'`, scoped Realtime `newsroom:thread:<uuid>` invalidation, and restrained Presence) to provide a Live Command Desk tracking event lead, assigned team, confirmed facts, unconfirmed claims, sources contacted, update stream, multimedia intake, next-update deadline, and cross-channel alert status.

### 11.6 Distribution OS & Organisational Communications (`HT-NR-06`)
- Converts `COM-01` tables (`communication_channels`, `contact_profiles`, `contact_consents`, `communication_suppressions`, `communication_threads`, `communication_messages`, `communication_templates`, `contact_segments`, `audience_campaigns`, `campaign_recipients`, `social_accounts`, `social_posts`, `social_publication_attempts`) into operational workflows for:
  - **Newsletter Editions**: First-class edition objects (HealthTimes Weekly, Premium Intelligence, daily briefings) with subject, preheader, intro, selected stories, custom blurbs, Premium/sponsor slots, segment targeting, approval, preview, scheduling, and delivery telemetry.
  - **WhatsApp Operations**: Briefings, breaking alerts, reader tips, corrections, and story distribution with strict consent/suppression custody and phone-number privacy.
  - **Social & Push**: Channel-specific drafts, editorial approval, scheduled publication, retry visibility, and story/topic/edition push alerts.
  - **Organisational Inboxes**: Preserves dedicated channels for `Newsroom`, `Tips`, `Corrections`, `Advertising`, `Subscriptions`, `Support`, `Privacy`, and `Press`.

### 11.7 Audience, Community, Premium & Commercial Governance (`HT-NR-08`)
- **Audience & Community**: Operates over `CA-01` verified-reader comment identity, staff-impersonation safeguards, moderation queues (`newsroom_list_comment_moderation_queue`, `newsroom_moderate_story_comment`), story comment policies (`newsroom_set_story_comment_policy`), and reader restrictions (`newsroom_restrict_reader_comments`).
- **Premium & Subscribers**: Preserves `access_policy` capability gating (`premium.assign`, `premium.manage`, `newsroom_set_story_access`) and 30-second teaser/entitlement separation while adding Premium commissioning, series/trackers, conversion analytics, and subscriber support without copying raw payment secrets into Newsroom storage.
- **Advertising Operations**: Preserves `AG-05`/`AG-06` campaign, creative, placement, provenance, checksum, and HOSPAZ direct-ad governance (`newsroom_create_campaign`, `newsroom_approve_campaign`) while maintaining a strict firewall between commercial operations and editorial copy.

### 11.8 Intelligence, Search, Citations, SEO & AI Governance (`HT-NR-09`)
- **Privacy-Safe Operational & Audience Analytics**: Tracks editorial velocity, assignment age, review-queue age, desk workload, article engagement/completion, Premium conversion, and campaign delivery while strictly prohibiting sensitive health keys (`diagnosis`, `disease`, `condition`, `medication`, `prescription`, `symptom`, `patient`, `medical record`, `health profile`).
- **SEO, Citations & Institutional Search**: Provides metadata/canonical/redirect health, academic/institutional/policy citation tracking, and permission-aware universal Newsroom search enforced inside server retrieval.
- **AI Desk**: Strictly reviewable editorial assistance (summaries, archive retrieval, evidence/citation gap checks, interview questions, headline/SEO options). AI can never publish, alter editorial/staff/commercial authority, or fabricate sources/citations.

---

## 12. Roles, Granular Capabilities, Security & Audit (`HT-NR-10`)

### 12.1 Supported Institutional Roles
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
- Audience Moderator

### 12.2 Canonical Capability Catalogue (`HEALTH_TIMES_CAPABILITIES`)
Roles are server-side collections of capabilities with support for staff-specific overrides (`staff_profiles`, `newsroom_roles`, `newsroom_capabilities`):
- Editorial & Workflow: `story.create`, `story.edit_own`, `story.edit_all`, `story.submit`, `story.fact_check`, `story.health_review`, `story.copy_edit`, `story.publish`, `story.correct`
- Assignments: `assignment.create`, `assignment.manage`
- Media & Distribution: `media.manage`, `distribution.manage`
- Collaboration & Community: `communication.desk.manage`, `communication.breaking.manage`, `communication.announce`, `comment.configure`, `comment.moderate`, `comment.restrict`, `comment.audit`
- Commercial & Subscribers: `premium.assign`, `premium.manage`, `ads.view`, `ads.create`, `ads.approve`, `subscriber.view`, `subscriber.manage`
- Organisation, Intelligence & Security: `staff.view`, `staff.invite`, `staff.change_role`, `staff.revoke`, `analytics.view`, `settings.manage`, `security.manage`, `security.view_sessions`, `security.revoke_session`, `security.view_audit`

### 12.3 Role-Sensitive Newsroom Home
`/studio` evolves from a static integration-status page into a role-sensitive command centre:
- **Editor-in-Chief / Managing Editor**: Breaking/live activity (`Now`), stories awaiting approval (`Needs decision`), `News Budget` (today/tomorrow/week), `Deadline risk`, `Front Page` hierarchy, `Coverage map`, `Intelligence` trends, `Distribution` queues, and `Quality` alerts.
- **Reporter / Journalist**: Active assignments, deadlines, working drafts, editor/reviewer comments, source tasks, upcoming coverage events, saved research, and Newsroom inbox messages.
- **Audience / Newsletter / Commercial / Publisher**: Role-scoped operational queues matching each team's capability boundary.

---

## 13. Programme Sequence & Phase Gates

| Phase | Title | Purpose & Gate Acceptance |
| :--- | :--- | :--- |
| **HT-NR-00** | **Newsroom Authority & Lineage Reconstruction** | **Gate 0 (Read-Only Forensics)**: Inspect repository lineages, `main`, and live staging (`gcdohgbmqhqwydgaxrcr`); enumerate migrations, RPCs, RLS policies, and tests; produce `HT-NR-00_AUTHORITY_BASELINE.md`, `HT-NR-00_RECOVERY_MATRIX.md`, and the `HT-NR-01` dispatch package. No product implementation before Gate 0 passes. |
| **HT-NR-01** | **Newsroom Kernel Convergence** | **Gate 1**: Reconcile accepted migrations and API/RPC authority onto canonical architecture; implement typed `Newsroom*Service` contracts; preserve fail-closed RLS and exact-head test pass without destabilising the Reader. |
| **HT-NR-02** | **Professional Story Workspace** | **Gate 2**: Deliver the 5-layer Story Workspace (create, edit, autosave, `lock_version` conflict handling, revisions, internal discussion, media, sources, reviews, SEO, Premium, distribution, schedule, preview, publish). |
| **HT-NR-03** | **Planning / News Budget** | **Gate 3**: Deliver planning items, diary, pitches, embargoes, editorial packages, and connected assignment commissioning. |
| **HT-NR-04** | **Presentation / Front Page / Editions** | **Gate 4**: Deliver semantic Front Page curation, section fronts, regional editorial editions (Zimbabwe, Africa, Global Health), scheduled presentation, and cross-platform preview. |
| **HT-NR-05** | **Live, Breaking and Multimedia** | **Gate 5**: Deliver breaking command centre, live-event objects/streams, realtime invalidation, and video/audio/transcript/caption workflows. |
| **HT-NR-06** | **Distribution** | **Gate 6**: Deliver operational Newsletter Editions, WhatsApp briefings, push alerts, social publishing, templates, segments, consent/suppression, and delivery telemetry. |
| **HT-NR-07** | **Health Intelligence & Evidence** | **Gate 7**: Deliver first-class source/evidence registry, confidential-source access isolation, citations, and the Health Intelligence entity graph. |
| **HT-NR-08** | **Audience, Premium and Commercial Operations** | **Gate 8**: Deliver full Audience/Community moderation workspace, Subscriber operations, Premium editorial product tooling, and Advertising Operations with strict editorial firewall. |
| **HT-NR-09** | **Search, Analytics, SEO and Impact** | **Gate 9**: Deliver permission-aware universal Newsroom search, editorial/audience/commercial analytics (preserving sensitive-health privacy), SEO workbench, and citation impact tracking. |
| **HT-NR-10** | **Organisation, Security and Operational Closure** | **Gate 10**: Deliver complete staff administration, MFA/session UX, audit explorer, integration health, runbooks, and full production readiness. |

---

## 14. Cross-Phase Engineering Rules

1. **Exact-Head Custody**: All tests and certification evidence must correspond to the exact commit SHA under review.
2. **Forward-Only Migration Discipline**: Never rewrite accepted staging migration history for convenience; reconcile repository migration custody deterministically with the live staging ledger.
3. **Fail-Closed Authority**: Unavailable security, publishing, media, or commercial authority must never fall back to client-side assumptions.
4. **No Fake Operational Truth**: Never populate canonical Newsroom screens with fabricated analytics, subscriber counts, revenue, or simulated activity presented as real operational truth.
5. **No Product/Evidence Conflation**: Never weaken product security or authority contracts to make a test pass.
6. **Reader Protection**: Newsroom convergence and feature delivery must not regress or destabilise the certified Reader in `apps/mobile`.

---

## 15. Global Acceptance Criteria

HealthTimes Newsroom OS reaches operational readiness when all twenty criteria hold:

1. All major Newsroom authority has one canonical implementation.
2. Server capability checks govern every privileged action.
3. Reporters can plan, report, write, source, revise, and submit through authoritative services.
4. Editors can commission, review, request changes, approve, and publish.
5. Specialist health/science and fact-check review remains durable and enforced.
6. Media moves from private editorial custody (`newsroom-private`) to verified public publication with fail-closed validation.
7. Editorial presentation controls the Reader hierarchy across Hero, Top Stories, and sections.
8. Regional editorial editions and section fronts are editorially controllable.
9. Breaking and live operations support coordinated real-time newsroom work over durable state.
10. Newsletters, WhatsApp, social, and push operate from canonical publication and consent authority.
11. Sources, evidence, and research operate as permissioned institutional knowledge.
12. Reader community discussion is safely moderated with verified identities and audit history.
13. Premium, subscriber, and advertising authority is commercially operable while structurally separated from editorial authority.
14. Universal Newsroom search enforces permissions during server-side retrieval.
15. Analytics use verified data and strictly preserve HealthTimes' sensitive-health privacy rules.
16. Staff identity, RBAC, active sessions, and immutable audit trails are server-authoritative.
17. Exact Reader previews exist for editorial publication and presentation decisions.
18. Web, PWA, iOS, and Android consume the same published editorial truth.
19. No historical prototype (`newsroom.js`) or unmerged branch silently acts as competing production authority.
20. Day-to-day publication operations run without developers manually manipulating database state.
