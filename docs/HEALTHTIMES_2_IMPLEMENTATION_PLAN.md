# HealthTimes 2.0 — Product, Newsroom and Audience Platform Implementation Plan

**Repository:** `kudzimusar/htp-zw`  
**Public preview:** `https://kudzimusar.github.io/htp-zw/`  
**Programme:** HealthTimes 2.0 modernization  
**Status:** Approved for implementation  
**Date:** 2026-09-09

## 1. Purpose

This document is the implementation reference and client record for the second major HealthTimes modernization pass. The objective is to evolve the first responsive frontend into a credible digital health-news product with a premium reader experience, native-feeling mobile shell, AI-assisted discovery, WhatsApp-first audience engagement, subscriber communications and a newsroom administration experience that demonstrates professional editorial governance.

The build remains a client-facing frontend demonstration. Where backend services would normally enforce identity, permissions, subscriptions, payments, delivery and auditability, the demo will use bounded browser-local state and clearly separated interfaces so those capabilities can later be replaced by production services without redesigning the product.

## 2. Product principles

HealthTimes 2.0 is guided by four qualities:

1. **Authority** — the visual system, metadata, source treatment and newsroom workflows should resemble a serious professional publication.
2. **Utility** — search, topic hubs, AI explanations, saved reading and briefings should help readers understand health reporting rather than merely browse headlines.
3. **Habit** — email, WhatsApp and configurable briefings should create reasons to return.
4. **Trust** — author identity, editorial roles, review state, source context, correction patterns and health-AI safety should be visible in the product.

The design must avoid generic AI/glassmorphism aesthetics. It should feel editorial, premium, calm, precise and distinctly HealthTimes.

## 3. Scope and acceptance gates

### P0 — Interaction integrity and defect remediation

**Deliverables**
- Repair all non-functional CTAs and navigation targets.
- Replace fragmented overlays with predictable dismissible dialog/sheet behavior.
- Ensure Premium entitlement activation immediately removes locked states.
- Ensure “Not now”, close controls, backdrop click and Escape behave consistently where dismissal is allowed.
- Remove dead `#` links or replace them with meaningful actions/pages.
- Identify and eliminate first-party 404 requests from the Pages build.
- Keep browser-extension runtime errors separate from first-party defects.

**Acceptance gate**
- No critical CTA is visually interactive without a working action.
- Premium can be entered, dismissed, activated and revisited without trapping the reader.
- Main user journeys do not produce first-party 404s.

### P1 — Native-feeling mobile and tablet shell

**Deliverables**
- Compact sticky mobile top bar with menu, centered brand, search/account affordances.
- App-style bottom navigation at phone and tablet breakpoints.
- Recommended primary tabs: Home, Latest, Ask AI, Saved, More.
- Native-feeling mobile menu/bottom sheets, not compressed desktop dropdowns.
- Swipeable/scrollable topic rail, safe-area support and minimum 44px touch targets.
- Tablet-specific layout behavior instead of a stretched phone layout.

**Acceptance gate**
- Smartphone and tablet views read as deliberate mobile products, not responsive desktop pages.

### P2 — Public editorial quality, trust and discovery

**Deliverables**
- Stronger premium editorial hierarchy on the homepage.
- Expanded story metadata: author, published/updated time, reading time, beat, source/reviewer treatment where appropriate.
- Author/beat cards and clearer newsroom trust signals.
- Topic hubs and richer category discovery.
- Developing-story treatment, corrections link, methodology/source cues and reader tip/correction pathways.
- Better article utility: reading progress, save, share, related coverage, article actions and context panels.
- Refined footer with working product, newsroom, trust and audience links.

**Acceptance gate**
- Homepage, article and topic experiences are coherent enough for client presentation without explanation.

### P3 — Ask HealthTimes / HealthTimes Intelligence

**Deliverables**
- Make AI a primary navigation feature, especially on mobile.
- Article-level “Ask about this story” prompts.
- Site-level questions across the bundled HealthTimes dataset.
- Prompt shortcuts for summary, significance, timeline, related coverage and policy/research explanation.
- Provenance language that distinguishes HealthTimes reporting, source claims and general information.
- Medical-safety boundary: no diagnosis, prescribing or medication dosing; emergency redirection.
- Premium positioning for deeper intelligence while preserving useful free discovery.

**Acceptance gate**
- AI demonstrably helps readers understand and navigate HealthTimes journalism rather than acting as a generic chatbot.

### P4 — WhatsApp, social sharing and reader conversation

**Deliverables**
- WhatsApp-first article sharing.
- Facebook, X, LinkedIn, copy-link and native share support.
- “Discuss on WhatsApp” path using a publication-level destination with article context.
- Reader feedback module: useful/not useful, correction, story tip, expert response.
- Avoid exposing private journalist phone numbers.

**Acceptance gate**
- Every article has a clear mobile share/discussion path and all social actions are functional.

### P5 — Premium 2.0

**Deliverables**
- Keep the US$5/month proposition.
- Retain a 30-second introductory Premium preview, but make the timer unobtrusive and content-centric.
- Lock protected content rather than trapping the whole interface.
- Add meaningful Premium value: deep analysis, intelligence, archive/saved tools, alerts, briefings and fewer distractions.
- Persistent browser-local entitlement for presentation.
- Clear internal separation between demo entitlement logic and future production billing/security.

**Acceptance gate**
- Premium feels like a product with benefits rather than only a paywall.

### P6 — HealthTimes Newsroom administration and role governance

**Deliverables**
- Add a dedicated newsroom sign-in and administration surface.
- Role model:
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
- Role-aware navigation, permissions and action availability.
- Staff accounts remain isolated: no account impersonation and no cross-account password/state access.
- Reporter boundaries: own/assigned drafts, submit for review, no unrestricted publishing.
- Editorial/commercial separation.
- Demonstrate story lifecycle: Idea → Assignment → Draft → Source verification → Fact check → Health/science review where needed → Copy edit → Ready/Scheduled → Published → Correction/Update → Archive.
- Story audit/version timeline and approval status.
- Dashboard modules for stories, assignments, calendar, review queue, media, authors, topics, breaking news, Premium, AI desk, audience, newsletters, WhatsApp, subscribers, analytics, staff/roles and settings.

**Acceptance gate**
- At least three distinct staff roles can sign in and see materially different permissions and workflows.
- A reporter cannot publish or administer users; editorial leadership can review/publish; commercial/subscriber functions cannot silently edit editorial copy.

### P7 — Audience preferences, email and WhatsApp briefings

**Deliverables**
- “My HealthTimes” preference centre.
- Topic preferences including Breaking Health News, HIV/AIDS, Health Policy, Medical Research, Mental Health, Maternal & Child Health, Medicines, Health Financing, Innovation, Africa Health and Global Health.
- Frequency preferences: breaking, daily, weekly, Premium weekly intelligence and monthly research digest.
- Channel preferences: email, WhatsApp and browser notification presentation.
- Frontend-only subscription/preferences persistence.
- Weekly briefing preview generated from published/approved bundled stories.

**Acceptance gate**
- Users can configure, save and revisit communication preferences and preview what a briefing would contain.

### P8 — Analytics, data and operational polish

**Deliverables**
- Newsroom dashboard cards for publishing pipeline, Premium conversion, audience channels and top topics.
- Demonstration data visualizations or compact trend indicators without fabricating clinical claims.
- Data journalism section/hub where suitable.
- Saved stories and reading-history state.
- Consistent empty/loading/success/error states.

**Acceptance gate**
- Admin and public surfaces share one design language and consistent state handling.

### P9 — UAT, accessibility and deployment certification

**Deliverables**
- Update GitHub Actions validation to cover new required pages/modules and critical behavior markers.
- Verify all pages reference valid local assets.
- Verify no `href="#"` placeholder interactions remain in primary UI.
- Keyboard accessibility for dialogs, menus and forms.
- Responsive checks for representative phone, tablet, laptop and wide desktop dimensions.
- GitHub Pages workflow remains deployable from `main`.
- Update README with architecture, credentials and production replacement notes.

**Acceptance gate**
- CI green and Pages deployment green on the final implementation head.

## 4. Proposed information architecture

### Public publication
- Home
- Latest
- Zimbabwe
- Africa
- Research
- Policy
- Health Business / Financing
- Opinion
- Data
- Premium
- Saved
- My HealthTimes
- Ask HealthTimes

### Newsroom
- Overview
- Stories
- Assignments
- Editorial Calendar
- Review Queue
- Media
- Authors
- Topics
- Breaking News
- Premium
- AI Desk
- Audience
- Newsletter
- WhatsApp
- Subscribers
- Analytics
- Staff & Roles
- Settings

## 5. Demo data and identity approach

No production database is required for this implementation. The demonstration will use structured in-repository data plus `localStorage` for browser-persistent presentation state.

The public UI will not be labelled with terms such as “demo account”, “fake database” or “client preview”. It will present as a coherent semi-working product. Technical documentation will remain explicit that authentication, permissions, payments, messaging delivery and entitlement enforcement are not production-secure until backed by real server-side services.

Staff credentials supplied to the owner will be presentation credentials only. They will use role-oriented usernames and isolated browser-local sessions.

## 6. Production replacement boundaries

Before production launch, replace:

- local staff credential checks → managed authentication / SSO / MFA
- browser-local RBAC → server-side authorization and policy enforcement
- local story data → CMS/database with revision history
- local Premium entitlement → payment provider + server-side entitlements
- client preview timer → server/edge enforcement
- newsletter/WhatsApp preferences → consent-aware subscriber store
- simulated email/WhatsApp sends → verified providers and templates
- static AI retrieval → server-side RAG over the authoritative CMS, with logging and safety controls
- local analytics → privacy-aware analytics/event pipeline

## 7. Reference patterns from contemporary health publishing

The implementation should borrow product principles, not copy layouts. Current health publishing patterns support:

- plain-language medical communication, credentialed authors and immediate trust signals;
- subscriber value beyond a paywall, including newsletters, alerts, archives and data tools;
- topic/author-specific alerts;
- curated AI/health-tech topic experiences;
- strong separation between reported journalism and marketing/vendor claims.

## 8. Documentation deliverables

The repository will contain:

1. This implementation plan and client record.
2. An operations/work manual covering public-site use, newsroom roles, story workflow, Premium, AI, audience channels, account behavior, troubleshooting and production transition.
3. A browser-readable manual page with a downloadable source document.
4. README architecture and deployment notes.

## 9. Final owner handoff

At completion, the owner should receive:

- live GitHub Pages URL;
- final commit/deployment status;
- newsroom login URL;
- presentation credentials for multiple roles;
- major implemented journeys;
- known frontend-only boundaries;
- manual/documentation links;
- recommended next production phase.
