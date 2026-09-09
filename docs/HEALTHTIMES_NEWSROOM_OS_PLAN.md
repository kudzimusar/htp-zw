# HealthTimes Newsroom OS — Editorial Operating System Plan

**Programme:** HealthTimes modernization  
**Repository:** `kudzimusar/htp-zw`  
**Revision:** Newsroom OS 1.0  
**Date:** 2026-09-09  
**Status:** Implementation reference for client-review release

## 1. Objective

The Newsroom must operate as a dedicated staff application, not as an administrative page attached to the publication. After authentication, staff enter a persistent workspace shaped by their role, assignments, deadlines, review responsibilities, distribution duties and security permissions.

The finished experience should communicate that HealthTimes already has the operating model required to scale from a Zimbabwe-focused publication into a global health newsroom with a strong African reporting advantage.

The design language is deliberately non-generic: dark ink/navy navigation, warm paper work surfaces, HealthTimes teal, muted blue, restrained amber, brick red and green for operational status. No glassmorphism, decorative AI gradients or oversized empty dashboard cards.

## 2. Application architecture

```text
Authentication gateway
        ↓
Persistent staff session
        ↓
Current staff identity
        ↓
Role + capability resolution
        ↓
Newsroom application shell
        ↓
Role-specific modules and work queues
```

Unauthenticated staff see only the Newsroom sign-in gateway. Successful authentication removes the sign-in view entirely and opens the application. Refresh preserves the active staff session. Sign out returns to the gateway.

## 3. Role model

The application supports the following newsroom roles:

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

Presentation accounts cover a useful subset of these roles while the full capability model remains visible in Staff & Access and Roles & Permissions.

## 4. Granular capabilities

Roles are composed from capabilities rather than hard-coded page access alone.

Core capabilities include:

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

## 5. Newsroom shell

The authenticated application contains:

### My Newsroom
- Overview
- My assignments
- My stories
- Saved

### Editorial
- Stories
- Assignments
- Review Queue
- Editorial Calendar
- Breaking News
- Corrections

### Content
- Media Library
- Authors
- Topics
- Countries & regions
- Research / Sources
- Archive

### Distribution
- Homepage
- Newsletters
- WhatsApp
- Social
- Push alerts

### Intelligence
- Analytics
- Trending
- SEO
- Citations & Impact
- AI Desk

### Commercial
- Premium
- Subscribers
- Advertising

### Organisation
- Staff & Access
- Roles & Permissions
- Audit Log

### System
- Settings
- Integrations
- Security

Only modules allowed by the signed-in user's capabilities are shown.

## 6. Role-specific landing dashboards

### Reporter
The reporter dashboard prioritises active work: assignments, due today, drafts, stories waiting for editorial review, editorial calendar events, notifications and personal publishing/performance context.

### Editor
The editor dashboard prioritises review and decision work: submitted stories, fact-check queue, ready-to-publish work, overdue assignments, corrections, breaking stories, desk status and trending topics.

### Audience / Newsletter
The audience dashboard prioritises briefings, WhatsApp, social distribution, scheduled editions, audience preferences and distribution readiness.

### Commercial
The commercial dashboard prioritises active ad campaigns, upcoming inventory, subscriber/Premium operational context and campaign review status, without editorial story-editing authority.

### Publisher
The publisher dashboard presents organisation-wide editorial, commercial, staff, security and publication-readiness context.

## 7. Story lifecycle

The persistent story model supports:

Pitch → Approved → Assigned → Reporting → Draft → Submitted → Fact check → Health / Science review → Copy edit → Editor review → Ready → Scheduled → Published → Updated / Corrected → Archived

Each story records at minimum:

- headline
- standfirst
- body / working copy
- section
- desk
- country
- region
- topic
- access: Public / Premium
- owner / reporter
- assigned editor
- fact checker
- reviewer
- status
- deadline
- publication schedule
- SEO title
- meta description
- slug
- source / reference notes
- distribution selections
- advertising setting
- version history
- internal editorial comments
- timestamps

## 8. Story editor

The story workspace must feel like a professional document editor.

Required behaviour:

- autosave
- manual Save
- Saving / Saved indicator
- draft recovery
- version history
- unsaved-change protection
- Preview
- Submit for review
- Request changes
- specialist review / fact-check handoff
- schedule / publish where permitted

The inspector includes assignment, workflow state, desk/topic/geography, Public/Premium, SEO, distribution, schedule and advertising settings.

Changing a mapped public story to Premium updates the shared public story override so its reader access contract follows the existing 30-second Premium rules.

## 9. Assignments Desk

Editors with permission can create assignments containing:

- story / topic
- reporter
- desk
- deadline
- priority
- notes
- assigned editor

Reporters can accept assignments and move them through Assigned → Reporting → Drafting → Submitted.

The system surfaces due-today and overdue work.

## 10. Review Queue and editorial discussion

Editors can open submitted stories, leave internal comments, request changes, assign specialist review, resolve comments, mark verification stages complete and approve publication.

Internal discussion never appears on the public article.

## 11. Editorial Calendar

The calendar/agenda contains:

- story deadlines
- scheduled publication
- interviews
- editorial conferences
- newsletters
- WhatsApp briefings
- campaigns
- major global-health dates

## 12. Intelligence and newsroom performance

The client-review build must distinguish real structural metrics from presentation-only engagement examples in engineering documentation.

Newsroom intelligence includes:

- story inventory by state
- desk mix
- publishing velocity
- review queue age
- due / overdue assignments
- trending topic presentation
- story intelligence presentation: reads, engaged time, completion, shares, saves, Premium joins
- acquisition/referral placeholders for production analytics integration

## 13. Citations & Impact

Because HealthTimes is moving toward global research authority, the Newsroom includes citation and impact tooling for:

- external backlinks
- academic citations
- institutional references
- government/NGO mentions
- media mentions
- top cited HealthTimes research

The client-review data demonstrates the intended experience. Production requires analytics/backlink/citation integrations.

## 14. Staff & Access

Authorised staff can manage a structured staff directory containing:

- name
- email
- role
- desk
- beat
- country / region
- status
- assigned editor
- last login
- account/security state

Supported presentation actions:

- invite staff
- change role
- change desk
- suspend
- deactivate
- require password change
- revoke sessions
- revoke Newsroom access

Revocation requires explicit confirmation and creates an audit entry.

## 15. Security

The Newsroom presentation includes:

- current session
- other sessions
- last login
- session revocation
- password/security state
- MFA readiness/status
- audit history

Production must replace browser-local credentials and RBAC with managed identity, MFA, server-side sessions, server-side authorisation and immutable security audit logging.

## 16. AI Desk

HealthTimes AI assists staff but cannot publish.

Intended tools include:

- source-document summaries
- evidence-gap detection
- missing citation suggestions
- internal archive matches
- headline / SEO alternatives
- interview question generation
- claim/source checks

Every AI output remains reviewable editorial assistance.

## 17. Media Library

The Media Library tracks:

- filename
- type
- caption
- credit
- copyright
- source
- uploader
- usage
- upload date

## 18. Premium and Advertising

### Premium
The Newsroom shows Premium stories by status, publishing stage and access. Appropriate editors can assign Premium status; reporters cannot independently bypass editorial authority.

### Advertising
Commercial staff can manage campaign inventory, dates, placements, status and review state. Existing HOSPAZ inventory remains represented. Commercial staff cannot silently edit editorial copy.

## 19. Global newsroom readiness

The operational taxonomy supports:

- Global Health
- Africa
- Southern Africa
- East Africa
- West Africa
- Central Africa
- North Africa
- Zimbabwe
- Research
- Policy
- Investigations
- Health Business

Staff profiles can include primary desk, beat and region.

## 20. Client-review acceptance criteria

The Newsroom is ready for presentation when:

1. successful login completely replaces the sign-in gateway with the Newsroom shell;
2. session persists on refresh;
3. each presentation role receives materially different working queues and navigation;
4. reporter can create/save/autosave/reopen/submit a story but cannot publish;
5. editor can review, comment, advance and publish appropriately;
6. staff administration supports invite, role/desk change, session/access revocation and audit entries;
7. commercial role sees commercial operations but no editorial story editor;
8. Premium controls remain connected to the public access contract;
9. Newsroom navigation is dense enough to represent day-to-day work across editorial, distribution, intelligence, commercial and organisation operations;
10. Chromium/Playwright verifies login gateway, session persistence, story save/submit, RBAC, staff access actions and layout integrity.

## 21. Production replacement boundary

This release is a client-review frontend operating model. Production migration must replace local persistence with an authoritative database/CMS and server-side services for authentication, RBAC, revision history, workflow, media, analytics, subscriber billing, advertising events, messaging and audit trails.
