# HealthTimes 2.0 Operations & Work Manual

**Publication:** HealthTimes Zimbabwe  
**Public site:** https://kudzimusar.github.io/htp-zw/  
**Newsroom:** https://kudzimusar.github.io/htp-zw/newsroom.html  
**Version:** 2.0  
**Date:** 2026-09-09

## 1. Purpose of this manual

This manual explains how the HealthTimes 2.0 public publication, Premium experience, Ask HealthTimes, reader preferences and Newsroom administration are intended to work. It is both a client handover record and a future operational reference.

The current hosted build is a frontend demonstration. It intentionally presents as a coherent working product, while production authentication, payments, database persistence, message delivery, analytics and server-enforced permissions remain integration boundaries for the next production phase.

## 2. Public website

### Home

The homepage prioritises:

1. lead reporting;
2. supporting top stories;
3. a concise news brief;
4. latest reporting;
5. most-read presentation;
6. Premium analysis;
7. topic hubs;
8. opinion and analysis;
9. trust and editorial standards;
10. WhatsApp, briefings and Ask HealthTimes.

On mobile and tablet widths, the desktop navigation is replaced by a compact app-style top bar and a five-item bottom navigation: Home, Latest, Ask AI, Saved and More.

### Article pages

Article pages provide:

- headline and standfirst;
- author, beat, published date and reading time;
- updated date;
- reporting context and primary-source cue;
- reading-progress indicator;
- saved-story action;
- native share/copy action;
- WhatsApp-first sharing;
- Facebook, X and LinkedIn sharing;
- direct WhatsApp comment to the HealthTimes desk;
- Ask HealthTimes contextual prompts;
- correction request;
- related coverage.

### Saved reading

Readers can save stories from cards or article pages. Saved story IDs are persisted in browser local storage and can be opened from the mobile bottom navigation or the site menu.

## 3. HealthTimes Premium

### Proposition

HealthTimes Premium is priced at **US$5 per month** in the current commercial proposition.

Premium value includes:

- deeper policy, financing and research analysis;
- Premium archive;
- expanded HealthTimes Intelligence;
- weekly member briefing;
- saved reading and topic-follow tools;
- a calmer, lower-noise reading experience.

### 30-second introductory preview

The first Premium reading session starts a 30-second introductory timer. The start time is stored in browser local storage so refreshing the page does not automatically restart the preview.

When the preview expires:

- the rest of protected Premium content is locked;
- site navigation remains usable;
- public stories, search and Ask HealthTimes remain accessible;
- the reader can open the Premium membership sheet;
- “Not now”, the close control, backdrop click and Escape can dismiss the membership sheet;
- activating the presentation subscription immediately unlocks Premium content for that browser.

### Production replacement

Production must enforce Premium on the server or edge using authenticated membership entitlements. Client-side state must not be treated as secure access control.

## 4. Ask HealthTimes / HealthTimes Intelligence

Ask HealthTimes is a journalism research and discovery assistant.

Supported reader journeys include:

- summarise the open story;
- explain why a story matters;
- explain a story in plain language;
- surface related HealthTimes coverage;
- find recent reporting by topic;
- explain the Premium proposition.

### Health safety boundary

Ask HealthTimes must not:

- diagnose an individual;
- prescribe medication;
- provide medication doses;
- replace a qualified clinician;
- pretend to provide emergency medical care.

Potentially urgent or individual medical requests should direct the user toward qualified health or emergency services.

### Production AI architecture

Replace the static in-browser matching layer with server-side retrieval augmented generation over the authoritative HealthTimes CMS. Production AI should include provenance, source citations, response logging, safety monitoring, access controls and quality review.

## 5. WhatsApp and social engagement

### HealthTimes WhatsApp desk

Primary: **+263 77 628 0754**  
Secondary: **+263 772 679 680**

Article “Comment on WhatsApp” actions pre-fill the article title and URL before opening the publication-level WhatsApp contact. This provides context while avoiding publication of private reporter numbers.

### Other sharing channels

Articles also support:

- WhatsApp share;
- Facebook;
- X;
- LinkedIn;
- native device share when available;
- copy-link fallback.

### Corrections and tips

Editorial corrections and story tips can be sent to **editorial@healthtimes.co.zw**. Corrections should be evaluated by editorial staff and material published changes should be recorded transparently.

## 6. My HealthTimes — reader preferences

Readers can configure:

### Topics

- Breaking Health News
- HIV/AIDS
- Health Policy
- Medical Research
- Mental Health
- Maternal & Child Health
- Medicines
- Health Financing
- Innovation
- Africa Health

### Frequency

- Breaking alerts
- Daily briefing
- Weekly HealthTimes
- Premium weekly intelligence
- Monthly research digest

### Channels

- Email
- WhatsApp
- Browser notifications

The presentation build stores these preferences locally in the browser and previews a briefing from the current HealthTimes article dataset.

Production must add subscriber identity, channel consent, verified destinations, unsubscribe controls and actual delivery providers.

## 7. Newsroom sign-in

Open `newsroom.html` from the site footer or direct URL.

Each presentation account has its own username, password, role and browser session. The Newsroom does not provide an “impersonate user” function. To open another account, sign out and authenticate separately.

### Account isolation

The current frontend demonstrates isolation through:

- one active authenticated username per browser session;
- role-specific modules;
- role-specific actions;
- reporter ownership checks on stories;
- no passwords displayed in the staff directory;
- no account switching without sign-out.

Production must replace this with managed authentication, MFA and server-side authorization.

## 8. Newsroom roles

### Publisher / Owner

Organisation-wide governance, business oversight and final administrative authority.

### Editor-in-Chief

Editorial policy, final publication authority, corrections and newsroom standards.

### Managing Editor

Daily newsroom operations, assignments, calendar and production coordination.

### Section Editor

Editorial authority over an assigned section.

### News Editor

Daily news desk and breaking-news coordination.

### Reporter / Journalist

Creates stories, edits own or assigned drafts, develops sources and submits for review. Reporters do not have unrestricted publishing authority.

### Health / Science Editor

Reviews medical claims, research interpretation and evidence context.

### Fact Checker

Verifies material facts and supporting sources. Fact checkers do not directly publish.

### Copy Editor

Reviews language, structure, headlines and house style.

### Multimedia Editor

Manages photography, video, audio, captions, credits and visual assets.

### Social Editor

Prepares and distributes approved/published content to social channels.

### Newsletter Editor

Builds email and WhatsApp editions from approved/published stories.

### Commercial Manager

Manages commercial inventory and sponsorship. This role must remain separated from editorial-copy authority.

### Subscriber Manager

Supports membership and subscriber service without editorial-copy authority.

### Analyst

Read-only operational and performance analysis.

## 9. Editorial workflow

The target editorial lifecycle is:

**Idea → Assignment → Draft → Source verification → Fact check → Health/science review when needed → Copy edit → Ready → Scheduled → Published → Correction/Update → Archived**

The current presentation compresses some states for practical demonstration while preserving the governance principle.

### Creating a story

1. Sign into Newsroom with a role permitted to create stories.
2. Select **New story**.
3. Enter headline, section, type, Premium/public status, assigned editor, standfirst and reporting notes.
4. Save.
5. New stories begin as Draft.

### Reporter submission

A reporter can edit a story only when they own it or it is assigned to their presentation account. From Draft they can submit it for editorial review.

### Editorial review

Editorial leadership can move submitted work into fact check and then Ready once verification is complete.

### Publishing

Only roles with publish authority can move a Ready or Scheduled story to Published. Publishing requires a confirmation step.

### Corrections

Published stories can move into Correction/Update and then be republished, preserving the action in the Newsroom audit record.

## 10. Newsroom modules

### Overview

Shows story workflow counts, current review queue and recent account actions.

### Stories

Master editorial inventory with search, workflow filters and permitted actions.

### Assignments

Shows story ownership, assigned editors and workflow state.

### Editorial Calendar

Weekly planning view for active and scheduled coverage.

### Review Queue

Stories requiring editorial, verification or final approval.

### Media

Presentation of image, video and source-document management.

### Authors

Public accountability profiles for editorial staff.

### Topics

Beat and topic-hub management supporting navigation, alerts and AI retrieval.

### Breaking News

Developing coverage workflow with an explicit verification-first standard.

### Premium

Premium editorial inventory and product proposition.

### AI Desk

Governance of reader-facing AI capabilities and production safety requirements.

### Audience

Reader topic/frequency/channel preference model.

### Newsletter

Briefing desk for selecting approved/published stories and previewing editions.

### WhatsApp

Publication-level reader contact, comments and briefing distribution patterns.

### Subscribers

Future membership identity, entitlement and preferences model. It is separated from editorial-copy controls.

### Analytics

Current editorial-mix analytics are derived from the local newsroom dataset. Production reach, scroll depth, conversion and delivery metrics must come from a real analytics pipeline rather than fabricated figures.

### Staff & Roles

Role matrix and active presentation accounts. Passwords are not shown in the directory.

### Settings

Current account identity, role boundary and production security requirements.

## 11. Editorial/commercial separation

Commercial and subscriber operations should never silently alter editorial copy or bypass the editorial workflow.

Commercial sponsorship must be visibly distinguished from independent journalism. Production authorization should encode this separation server-side.

## 12. Deployment

The repository includes GitHub Actions for validation and GitHub Pages deployment.

A production-quality change should not be considered ready until:

- JavaScript syntax validation passes;
- required pages and assets exist;
- critical product markers are present;
- placeholder primary links are absent;
- Pages deployment succeeds.

## 13. Troubleshooting

### A page returns 404

Confirm the requested path exists in the repository and that GitHub Pages deployed the latest `main` commit. The build includes a custom 404 page and explicit favicon/manifest assets to avoid common missing-asset requests.

### `Unchecked runtime.lastError: Could not establish connection`

This message is commonly produced by browser extensions trying to communicate with an extension context that is not present. Confirm first-party site requests separately before treating it as a HealthTimes application error.

### Premium remains locked after activation

Confirm the browser permits local storage. The presentation subscription is stored under the HealthTimes Premium local state and should unlock immediately after activation.

### A staff action is disabled

Confirm the signed-in role. Disabled actions are an intentional RBAC demonstration, not necessarily a UI failure.

## 14. Production transition checklist

Before live operations, implement:

- managed user authentication;
- MFA for staff;
- server-side RBAC and tenancy/security policies;
- authoritative CMS/database;
- revision and audit history;
- server-side Premium entitlements;
- payment provider;
- email and WhatsApp delivery providers;
- consent and unsubscribe management;
- privacy-aware analytics;
- AI retrieval over the authoritative CMS;
- AI provenance, safety and monitoring;
- backup, recovery and operational observability;
- security review and UAT.

## 15. Source references

HealthTimes public contact and editorial standards are based on the publication’s current public About and Contact information. The 2.0 product adds a presentation layer for modern editorial governance, Premium, AI and audience operations without changing the underlying principle that HealthTimes remains accountable for its journalism.
