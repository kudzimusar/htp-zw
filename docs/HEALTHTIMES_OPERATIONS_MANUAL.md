# HealthTimes Operations & Work Manual

**Publication:** HealthTimes  
**Public site:** https://kudzimusar.github.io/htp-zw/  
**Newsroom:** https://kudzimusar.github.io/htp-zw/newsroom.html  
**Revision:** Newsroom OS client-review release  
**Date:** 2026-09-09

## 1. Purpose

This is the operational reference for the modern HealthTimes publication and its staff operating system. It covers reader accounts, Premium access, article listening, advertising, Ask HealthTimes, audience briefings, newsroom identity, editorial workflow, assignments, review, staff access, security, analytics, citations, mobile app readiness and the production migration boundary.

The client-review release is intentionally semi-working: public and staff workflows behave like the intended product and persist locally in the browser, while production authentication, CMS/database persistence, billing, messaging, analytics and security enforcement remain explicit integration boundaries.

The detailed implementation architecture is recorded in `docs/HEALTHTIMES_NEWSROOM_OS_PLAN.md`.

---

## 2. Public publication

### Desktop

Desktop uses a publication-style editorial system with multi-column hierarchy, wider article context, visible commercial inventory and a full institutional footer.

### Mobile and tablet

Mobile is deliberately a separate native-news presentation rather than a reduced desktop page. It uses:

- compact app masthead;
- smaller story images and headline scale;
- mobile news feed;
- Home / Latest / Ask AI / Saved / More bottom navigation;
- persistent menu/search/saved/profile sheets;
- no desktop footer;
- safe-area spacing and touch targets;
- content-flow advertising rather than ads above app navigation.

---

## 3. Reader accounts

Public readers can sign in, create an account and open a profile. Reader state includes Premium status, saved stories, reading history, briefing preferences and theme preference.

### Presentation Premium reader

- **Email:** `reader@healthtimes.co.zw`
- **Password:** `HealthTimes#Reader26`

Light, Dark and System appearance modes persist in reader state.

Production must replace browser-local reader identity with managed authentication and server sessions.

---

## 4. HealthTimes Premium

Premium is currently positioned at **US$5/month**.

Each Premium story receives a reader-specific preview allowance:

1. Opening a Premium story starts that reader/story timer.
2. A small non-blocking Premium message appears after the first few seconds.
3. The warning becomes stronger around twenty seconds.
4. At thirty seconds protected research locks.
5. The membership sheet opens automatically.
6. Closing the sheet does not unlock research.
7. Public HealthTimes navigation remains available.
8. Refreshing or reopening does not restart the allowance.
9. Premium readers bypass the gate.

Premium research can expose citation tooling, saved reading, related evidence, HealthTimes Intelligence and member briefings. Article listening follows the same entitlement boundary and stops when the Premium allowance expires.

Authorised Newsroom editorial staff can mark mapped stories Public or HealthTimes Premium. That choice is written to the public story-override layer used by the client-review site.

Production must enforce Premium entitlement server-side or at the edge.

---

## 5. Advertising

Advertising remains a HealthTimes revenue product. The source publication's HOSPAZ Annual General Meeting campaign is retained as the first modern campaign record.

Public ad rules:

- no mobile ad above or inside the app masthead;
- mobile home ads enter the editorial feed;
- other public pages place ads after the primary navigation/app chrome;
- desktop may use a prominent post-header masthead placement;
- the full creative must remain visible rather than cropped;
- paid placements are disclosed;
- Premium can reduce advertising interruption.

The Newsroom Advertising workspace provides commercial campaign context while remaining separated from editorial story editing.

---

## 6. Listen to this story

Article pages use a compact speaker control. Tap to play, tap to pause, and tap again to resume. HealthTimes ranks available operating-system/browser English voices and prefers natural/enhanced/premium/neural voices where available.

For Premium stories, narration cannot bypass the paywall. When access expires, narration stops and protected paragraphs are no longer read.

---

## 7. Ask HealthTimes

Ask HealthTimes is a journalism and research assistant. It can summarise the current story, explain why it matters, find related coverage and help readers navigate the HealthTimes archive.

It is not a clinical service. It must not diagnose, prescribe medicine, provide dosage instructions or impersonate a clinician.

Production should use retrieval over the authoritative HealthTimes CMS with provenance and safety monitoring.

---

# Part II — HealthTimes Newsroom OS

## 8. What the Newsroom is

The Newsroom is a dedicated staff application. It is not a public page with administrative controls attached.

The application flow is:

```text
Newsroom URL
   ↓
Authentication gateway
   ↓
Persistent staff session
   ↓
Current staff identity
   ↓
Role + capabilities
   ↓
Role-shaped working environment
```

When a staff user is not authenticated, only the Newsroom sign-in gateway is visible. After successful sign-in, the gateway disappears completely and the working application replaces it. Refresh preserves the active staff session.

There is no impersonation shortcut. To use another account, sign out and authenticate separately.

---

## 9. Newsroom presentation credentials

| Workspace | Username | Password |
| --- | --- | --- |
| Publisher / Owner | `publisher` | `HealthTimes#Publisher26` |
| Editor-in-Chief | `editor` | `HealthTimes#Editor26` |
| Reporter / Journalist | `reporter` | `HealthTimes#Reporter26` |
| Newsletter / Audience | `audience` | `HealthTimes#Audience26` |
| Commercial Manager | `commercial` | `HealthTimes#Commercial26` |

The presentation accounts deliberately expose different workspaces and authority levels.

---

## 10. Newsroom visual system

The staff application uses a restrained work-oriented design:

- dark ink/navy navigation;
- warm paper/off-white work surfaces;
- HealthTimes teal for active state and primary signals;
- muted blue for informational state;
- restrained amber for attention/review;
- brick red for overdue/security actions;
- green for ready/published/healthy state;
- compact professional typography;
- dense tables and work queues;
- no glassmorphism;
- no decorative AI gradients.

The goal is to make every staff role feel like they have a working desk, not a handful of presentation links.

---

## 11. Newsroom navigation

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

Modules are shown only when the current role has the required capability.

---

## 12. Role-shaped workspaces

### Reporter / Journalist

The reporter opens **My Newsroom** and sees real work context:

- active assignments;
- due-today work;
- drafts;
- submissions waiting for editor;
- personal stories;
- editorial calendar items;
- notifications;
- personal publishing inventory.

Reporters can create, write, autosave, manually save, reopen and submit their own stories. They cannot unrestrictedly publish, manage advertising or change staff access.

### Editor-in-Chief / editorial leadership

Editors see:

- Review Queue;
- Ready to publish;
- overdue assignments;
- corrections;
- desk activity;
- editorial calendar;
- trending topics;
- publication pulse;
- Premium editorial controls.

They can open submitted stories, comment, move work through review stages and publish where authorised.

### Newsletter / Audience

Audience staff see recurring editions, WhatsApp distribution, social distribution, reader-interest context and briefing deadlines.

### Commercial Manager

Commercial staff see campaign inventory, advertising, Premium commercial operations and subscriber tooling. Editorial story-editing navigation is intentionally unavailable.

### Publisher / Owner

Publisher receives organisation-level editorial, staff, commercial, security and audit context.

---

## 13. Full role model

The configured role system includes:

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

Roles are collections of granular capabilities rather than one hard-coded `admin` flag.

Examples include:

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

---

## 14. Story lifecycle

HealthTimes models the complete editorial lifecycle:

**Pitch → Approved → Assigned → Reporting → Draft → Submitted → Fact check → Health / Science review → Copy edit → Editor review → Ready → Scheduled → Published → Updated / Corrected → Archived**

Each story can carry:

- headline;
- standfirst;
- working body copy;
- source/reference notes;
- internal reporting notes;
- section;
- desk;
- topic;
- country;
- region;
- reporter;
- editor;
- fact checker;
- deadline;
- status;
- Public/Premium access;
- SEO title;
- meta description;
- slug;
- homepage/breaking/newsletter/WhatsApp/push distribution;
- advertising setting;
- publish schedule;
- version history;
- internal comments.

---

## 15. Writing and saving stories

Open **New story** or choose **Open** from an authorised story row.

The editor workspace is structured like a working document tool rather than a dashboard card.

### Main canvas

- headline;
- standfirst;
- story body;
- source/reference area;
- internal reporting notes;
- insert controls for source, pull quote, table and media;
- editorial discussion.

### Inspector

- workflow state;
- deadline;
- reporter;
- editor;
- fact checker;
- desk;
- section;
- country;
- region;
- Public/Premium;
- SEO;
- distribution;
- scheduling;
- advertising setting;
- versions.

### Autosave

While a journalist writes, the Newsroom displays **Saving…** and then **Saved**. A manual Save option is also provided. Save events create a local version record so the presentation can demonstrate recovery/history behavior.

A journalist can close the editor, return to My Stories and reopen the saved work.

Production must move revision history to the authoritative CMS/database.

---

## 16. Assignment Desk

Editorial staff with assignment authority can create an assignment containing:

- story/topic;
- reporter;
- desk;
- deadline;
- priority;
- assigned editor;
- reporting notes.

A reporter sees the assignment inside My Assignments and can advance the work through:

**Assigned → Accepted → Reporting → Drafting → Submitted → Complete**

Overdue work is identified separately from active work.

---

## 17. Review Queue

Review Queue contains work in stages such as:

- Submitted;
- Fact check;
- Health / Science review;
- Copy edit;
- Editor review;
- Ready.

Appropriate editors can open a story, inspect evidence, leave internal discussion comments and advance the workflow.

A Ready story can be published only by a role with `story.publish`.

Internal comments do not appear on the public article.

---

## 18. Editorial Calendar

The Newsroom calendar/agenda demonstrates:

- editorial conferences;
- story deadlines;
- review deadlines;
- scheduled publication;
- newsletters;
- WhatsApp briefings;
- interviews/campaigns;
- major global-health dates.

This is intended to evolve into a database-backed editorial planning calendar.

---

## 19. Global newsroom taxonomy

HealthTimes is prepared to move from a Zimbabwe-defined publication toward a global health publication with Africa as its strongest reporting authority.

Configured desks/regions include:

- Global Health;
- Africa;
- Southern Africa;
- East Africa;
- West Africa;
- Central Africa;
- North Africa;
- Zimbabwe;
- Research;
- Policy;
- Investigations;
- Health Business.

Staff profiles can contain desk, beat, country and region.

---

## 20. Analytics and Trending

The Newsroom avoids fabricating live production numbers.

Metrics that can be derived from the current local editorial dataset include:

- story inventory;
- published count;
- review count;
- desk mix;
- current publishing pipeline;
- assignments and deadline state.

The interface also defines where production analytics will display:

- reads;
- engaged time;
- completion;
- shares;
- saves;
- Premium conversions;
- country;
- referral source;
- search acquisition.

Those values require a real analytics/event pipeline before launch.

Trending provides topic-attention presentation for editorial prioritisation.

---

## 21. Citations & Impact

Citations & Impact supports the client's goal of making HealthTimes research globally citable.

The Newsroom records citation-ready research based on existing story/source metadata and provides integration points for:

- backlinks;
- academic citations;
- government references;
- NGO/institutional references;
- media citations;
- Wikipedia references;
- top-cited HealthTimes research.

External counts are not fabricated in the client-review build. Production should connect backlink/citation monitoring services.

---

## 22. AI Desk

The AI Desk is assistive, not autonomous publishing.

Planned/represented tools include:

- source-document summary;
- evidence-gap detection;
- missing citation suggestions;
- HealthTimes archive matches;
- SEO/headline alternatives;
- interview-question generation;
- claim/source checking.

AI output must always remain reviewable by staff and cannot bypass publication authority.

---

## 23. Media Library

The Media workspace tracks editorial and commercial assets with metadata including:

- filename;
- type;
- caption;
- credit;
- copyright;
- source;
- uploader;
- usage;
- date.

The initial catalogue includes editorial images/documents and the HOSPAZ campaign creative.

---

## 24. Premium newsroom operations

The Premium workspace shows Premium/public access alongside editorial state and source readiness.

Staff with `premium.assign` can change mapped stories between Public and HealthTimes Premium. That action is audited and synchronized to the public access override.

Reporters do not independently acquire Premium/publishing authority simply because they authored the story.

---

## 25. Advertising newsroom operations

The Advertising workspace contains advertiser, campaign, placement, dates, status and review state. The HOSPAZ campaign remains visible as the initial paid inventory example.

Commercial roles can operate advertising without receiving editorial story-editing access.

Production should add ad-event collection, campaign billing, creative upload/storage and approval workflow.

---

## 26. Staff & Access

The staff directory includes:

- name;
- email;
- role;
- desk;
- beat;
- account status;
- last login;
- MFA readiness;
- permitted actions.

Depending on capability, leadership can:

- invite staff;
- change role;
- revoke active sessions;
- revoke access.

The staff invitation workflow asks for name, email, role, desk, country and assigned editor.

Revoking access requires a confirmation step and writes an audit entry.

---

## 27. Security

Security shows staff session and account-security context.

The presentation model includes:

- current session;
- session revocation;
- role state;
- password-change state;
- MFA readiness;
- access status;
- audit history.

Production requirements:

- managed staff identity;
- unique accounts;
- MFA;
- secure password/reset process;
- server-side sessions;
- server-side RBAC;
- session/device revocation;
- login throttling;
- immutable security audit records.

No production system should rely on the browser-local presentation credentials embedded in this client-review build.

---

## 28. Audit Log

Operational actions such as sign-in, story creation/save/state changes, Premium changes, staff invitations and access revocation create local audit entries.

Production must implement an immutable server-side audit log with actor, timestamp, entity, action and before/after state where appropriate.

---

## 29. Recommended client demonstration

### 1. Reporter

Sign in as `reporter`.

- Show My Newsroom.
- Open My Assignments.
- Create a story.
- Type headline/body.
- Show Saving → Saved.
- Close and reopen the story.
- Submit for review.
- Point out absence of Publish and commercial tools.

### 2. Editor-in-Chief

Sign out and use `editor`.

- Open Review Queue.
- Review a submitted story.
- Add an internal comment.
- Move it through review.
- Open Premium and show access control.
- Publish a Ready story.
- Show Trending, Calendar and Citations & Impact.

### 3. Commercial

Sign out and use `commercial`.

- Show commercial dashboard.
- Open Advertising.
- Show HOSPAZ campaign.
- Open Premium/subscriber operations.
- Confirm Stories/editorial editing is unavailable.

### 4. Publisher

Sign out and use `publisher`.

- Open Staff & Access.
- Invite a staff member.
- Change role if desired.
- Revoke sessions.
- Revoke access with confirmation.
- Open Audit Log and Security.

This sequence demonstrates that HealthTimes is becoming a publishing operating system, not merely a redesigned website.

---

## 30. PWA, Google Play and App Store

HealthTimes is configured as an installable PWA with `site.webmanifest` and `sw.js`.

Repository mobile packaging material includes:

- `app/twa-manifest.json` — Android Trusted Web Activity/Bubblewrap scaffold;
- `capacitor.config.json` — native wrapper configuration;
- `docs/MOBILE_APP_PACKAGING.md` — packaging/signing guide;
- `docs/STORE_LISTING_METADATA.md` — store metadata and screenshot checklist.

Actual Play/App Store submission requires publisher accounts, final domain ownership, signing credentials and the production privacy/auth/billing stack.

---

## 31. UAT and release gates

The release must pass static validation and Playwright/Chromium UAT.

Public tests cover:

- 375, 430, 768, 1440 and 1920 presentation;
- no horizontal overflow;
- stable mobile sheets;
- Premium automatic lock/prompt;
- Premium preview persistence;
- subscriber bypass/citation;
- HOSPAZ hierarchy;
- source archive parity;
- PWA assets;
- article listening and Premium audio boundary.

Newsroom tests cover:

- authentication gateway;
- login view removed after successful authentication;
- persistent session on refresh;
- reporter create/autosave/reopen/submit;
- reporter cannot publish;
- editor Review Queue and publish path;
- publisher staff invite/session revoke/access revoke/audit;
- commercial/editorial separation;
- responsive Newsroom shell without horizontal overflow.

---

## 32. Production transition

Before real launch, replace local browser state with authoritative production services for:

- public reader authentication;
- staff identity and MFA;
- sessions and server-side RBAC;
- CMS/database story persistence;
- assignments;
- revision history;
- comments/review state;
- media storage;
- Premium billing and entitlement;
- ad management/events;
- analytics;
- citations/backlink monitoring;
- subscriber consent and messaging;
- email/WhatsApp delivery;
- AI retrieval/provenance/safety;
- audit logs;
- monitoring/backups/disaster recovery;
- signed mobile releases.

---

## 33. Reference documents

- `docs/HEALTHTIMES_NEWSROOM_OS_PLAN.md`
- `docs/HEALTHTIMES_2_IMPLEMENTATION_PLAN.md`
- `docs/HEALTHTIMES_SOURCE_PARITY_REGISTER.md`
- `docs/MOBILE_APP_PACKAGING.md`
- `docs/STORE_LISTING_METADATA.md`
- browser manual: `manual.html`
