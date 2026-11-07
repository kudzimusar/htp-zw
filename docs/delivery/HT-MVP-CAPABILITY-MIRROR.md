# HealthTimes 2.0 — UDPCS 1.0 Capability Mirror
## 15-Question Rigorous Examination of Core Platform Capabilities

- **Document ID:** `HT-MVP-CAPABILITY-MIRROR`
- **Release Candidate:** `release/ht-mvp-rc02-final-unified-candidate`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech Universal Digital Platform Capability Standard (UDPCS 1.0) Section 13
- **Target Delivery Date:** 24 October 2026

---

## 1. Methodology & Purpose

Under UDPCS 1.0 Section 13, the **Capability Mirror** forces every platform capability to defend its existence and architecture through 15 rigorous operational and governance questions. This prevents superficial features from entering the delivery candidate without clear ownership, operational runbooks, failure modes, security guarantees, and acceptance criteria.

The 6 core platform capabilities examined in this mirror:
1. **Reader Discovery & Offline Context (Experience Plane)**
2. **Editorial Content Workflow & Publishing Desk (Control Plane)**
3. **Double-Entry General Ledger & Accounting (Control Plane)**
4. **Commercial Advertising & Campaign Operations (Control Plane)**
5. **Audience Multi-Channel Distribution (Control Plane)**
6. **First-Owner Authentication & RBAC Security Core (Governance & Platform Plane)**

---

## 2. Core Capability Mirror Assessments

### Capability 1: Reader Discovery, Reading & Offline Context (Experience Plane)

1. **What business problem does this solve?**  
   Provides readers in bandwidth-constrained Zimbabwean and Southern African healthcare environments with instantaneous, low-data access to authoritative health journalism, specialized medical topics, and audio journalism.
2. **Who uses it (personas/roles)?**  
   Anonymous readers, registered healthcare professionals, medical students, and everyday public users on mobile and web devices.
3. **What is the user journey?**  
   Opens Reader app → views curated Hero and latest news feed → filters by Health Category/Author → switches to Listen tab for audio briefing → bookmarks article for offline review in rural clinic setting.
4. **What happens on failure / network loss?**  
   Gracefully degrades to cached AsyncStorage content with visual offline status indicator; queued actions (bookmarks) sync automatically when connection restores.
5. **Where does data live and persist?**  
   PostgreSQL 17.6 on Supabase (`articles`, `categories`, `authors`), cached locally via React Native AsyncStorage and browser localStorage.
6. **How is it secured / authorized?**  
   Row-Level Security (RLS) ensures only published (`status = 'published'`) records are accessible to anon/authenticated roles. Media URLs enforced over HTTPS boundary.
7. **What telemetry/audit trail is generated?**  
   Client-side read telemetry dispatches anonymized page view events with category metadata; no sensitive health PII captured.
8. **What is the operational runbook?**  
   Editorial Desk Curation runbook (`HT-MVP-OPERATIONS-RUNBOOK.md` §3.1) directs editors on pinning top stories and managing topic tags.
9. **What external dependencies exist?**  
   Supabase REST API, Supabase Storage for article imagery and audio streams, CDN edge caching.
10. **What is the recovery/rollback procedure?**  
    If feed API is degraded, static fallback bundle loads last cached editorial digest; CDN stale-while-revalidate shields database.
11. **How is it tested?**  
    Mobile test suite (`tests/ht-nr-reader*.test.mjs`), TypeScript strict compilation, and responsive web browser rehearsals.
12. **What are the known limitations?**  
    Full offline text search requires pre-cached articles; audio download is on-demand streaming rather than pre-downloaded packet in MVP.
13. **What is deferred to v1.1?**  
    Background podcast download queue, personalized reading recommendations based on reader specialty, and SMS fallback.
14. **What are the cost/resource implications?**  
    Extremely lightweight; database queries hit optimized composite indexes (`(status, published_at DESC)`); bandwidth minimized by compressed responsive imagery.
15. **What is the client acceptance criterion?**  
    Reader loads in < 2.0s over 3G network simulation; article reads smoothly with zero UI freezes; offline mode activates without app crash.

---

### Capability 2: Editorial Content Workflow & Publishing Desk (Control Plane)

1. **What business problem does this solve?**  
   Eliminates chaotic, unstructured article submissions by providing an end-to-end editorial pipeline: journalist drafting, peer review, editor approval, and scheduled publishing.
2. **Who uses it (personas/roles)?**  
   Journalists, Beat Reporters, Copy Editors, Desk Editors, Managing Editors, and Publisher.
3. **What is the user journey?**  
   Journalist logs in → writes draft in Editorial Desk → assigns Category/Tags and uploads hero image → submits to Review Queue → Copy Editor reviews and adds revisions → Managing Editor approves → published to Reader instantly.
4. **What happens on failure / network loss?**  
   Local draft auto-saves to memory every 30 seconds; unsaved banner warns journalist if network drops during edit.
5. **Where does data live and persist?**  
   `articles` table, `article_revisions` history, `newsroom_audit_log` audit trail in Supabase database.
6. **How is it secured / authorized?**  
   Role-Based Access Control (RBAC) enforced in UI and database RLS: journalists can only edit own drafts; only Editors, Managing Editors, and Publisher can transition state to `published`.
7. **What telemetry/audit trail is generated?**  
   Every state change (`draft` → `in_review` → `published`) generates an immutable audit record with author ID, timestamp, and previous state.
8. **What is the operational runbook?**  
   Newsroom Daily Editorial Runbook (`HT-MVP-OPERATIONS-RUNBOOK.md` §2.2) defines shift responsibilities and review SLAs.
9. **What external dependencies exist?**  
   Supabase Database, Supabase Storage for article attachments.
10. **What is the recovery/rollback procedure?**  
    Articles can be instantly retracted (`published` → `archived` or `draft`) by Editor/Publisher via one-click unpublish control.
11. **How is it tested?**  
    Unit tests in `tests/ht-nr-editorial.test.mjs`, state transition integration tests, and manual persona walkthroughs.
12. **What are the known limitations?**  
    Simultaneous multi-user collaborative cursor editing (Google Docs style) is not present; uses optimistic locking and revision history.
13. **What is deferred to v1.1?**  
    Real-time collaborative cursor co-authoring, AI copy-editing assistant integration, and automated legal risk scanner.
14. **What are the cost/resource implications?**  
    Database storage scales linearly with article count and revisions; storage bucket lifecycle policies archive old drafts after 1 year.
15. **What is the client acceptance criterion?**  
    A story submitted by a journalist can be edited, reviewed, approved, and viewed on the Reader within 60 seconds of approval.

---

### Capability 3: Double-Entry General Ledger & Financial Core (Control Plane)

1. **What business problem does this solve?**  
   Provides HealthTimes management with institutional-grade financial integrity, ensuring every dollar received from advertising or subscriptions is accounted for under standard double-entry accounting rules.
2. **Who uses it (personas/roles)?**  
   Finance Officer, Managing Editor, Executive Publisher, External Auditor.
3. **What is the user journey?**  
   Finance Officer opens Finance Desk → selects Chart of Accounts → posts balanced Journal Entry (e.g., Cash Dr, Advertising Revenue Cr) → views real-time Trial Balance, Balance Sheet, and Income Statement.
4. **What happens on failure / network loss?**  
   Transaction fails atomically if network drops; unposted entries remain in client draft; no unbalanced journal entry can ever be committed to the database.
5. **Where does data live and persist?**  
   PostgreSQL tables: `gl_accounts`, `gl_journal_entries`, `gl_journal_lines`, and `gl_fiscal_periods` (Migration 95).
6. **How is it secured / authorized?**  
   RLS policies strictly restrict read/write access to `publisher`, `managing_editor`, and `finance_officer`. Database triggers reject unbalanced transactions (`sum(debits) != sum(credits)`) and prevent modification of posted entries.
7. **What telemetry/audit trail is generated?**  
   Immutable ledger lines with UUID timestamps, user attribution, and transaction references; modification of posted entries is blocked at database engine level.
8. **What is the operational runbook?**  
   Financial Operations & Month-End Close Runbook (`HT-MVP-OPERATIONS-RUNBOOK.md` §4.1).
9. **What external dependencies exist?**  
   None; fully self-contained in Supabase PostgreSQL core.
10. **What is the recovery/rollback procedure?**  
    Errors in posted entries must be corrected by issuing an offsetting reversing journal entry; database prevents destructive delete/update.
11. **How is it tested?**  
    Mathematical validation tests in `tests/ht-nr-finance.test.mjs` verifying zero-sum invariance, account tree depth, and role gates.
12. **What are the known limitations?**  
    Multi-currency automated exchange rate feeds are manual entry in MVP; tax compliance calculations (ZIMRA VAT) are supported via configured tax accounts.
13. **What is deferred to v1.1?**  
    Automated bank reconciliation via Open Banking APIs, automated ZIMRA tax return generation, and payroll module.
14. **What are the cost/resource implications?**  
    Minimal computational overhead; database transactions execute in sub-millisecond timeframes with standard B-tree indexing.
15. **What is the client acceptance criterion?**  
    Posting a journal entry creates mathematically balanced debits and credits; Trial Balance net equals exactly zero; unauthorized roles cannot access the desk.

---

### Capability 4: Commercial Advertising & Campaign Operations (Control Plane)

1. **What business problem does this solve?**  
   Monetizes HealthTimes through direct brand sponsorships, pharmaceutical awareness campaigns, and programmatic display ad placements.
2. **Who uses it (personas/roles)?**  
   Commercial Specialist, Ad Operations Manager, Managing Editor, Publisher.
3. **What is the user journey?**  
   Commercial Specialist creates advertiser profile → sets campaign flight dates and budget → uploads ad banners → assigns target zones (Hero, In-Article, Sidebar) → monitors impressions and CTR.
4. **What happens on failure / network loss?**  
   Campaign settings cache locally; impression counter uses buffered dispatch to prevent metric loss under intermittent connectivity.
5. **Where does data live and persist?**  
   `advertisers`, `ad_campaigns`, `ad_creatives`, `ad_impressions` tables in Supabase.
6. **How is it secured / authorized?**  
   Commercial staff can manage ads; readers have read-only access to active creatives via public RPC without direct table exposure.
7. **What telemetry/audit trail is generated?**  
   Hourly aggregate impression and click counters, campaign activation/pause logs.
8. **What is the operational runbook?**  
   Ad Operations & Creative Governance Runbook (`HT-MVP-OPERATIONS-RUNBOOK.md` §5.1) including medical advertisement compliance guidelines.
9. **What external dependencies exist?**  
   Supabase Storage for banner assets; optional integration with Google Ad Manager in future phases.
10. **What is the recovery/rollback procedure?**  
    Offending or expired creatives can be deactivated immediately via one-click toggle, removing them from Reader rotation in real time.
11. **How is it tested?**  
    Automated tests in `tests/ht-nr-commercial.test.mjs` validating date boundaries, budget constraints, and impression tracking.
12. **What are the known limitations?**  
    Direct-sold sponsorship campaigns are primary; programmatic RTB (real-time bidding) exchanges are not integrated in MVP.
13. **What is deferred to v1.1?**  
    Self-service advertiser portal, programmatic Prebid.js adapter, and automated PDF invoice generation.
14. **What are the cost/resource implications?**  
    High impression volume handled via asynchronous aggregation rather than single-row inserts per impression.
15. **What is the client acceptance criterion?**  
    Creating and activating a campaign immediately renders the creative on targeted Reader placements within its scheduled date window.

---

### Capability 5: Audience Multi-Channel Distribution (Control Plane)

1. **What business problem does this solve?**  
   Expands readership reach beyond the native app by distributing breaking health news and daily bulletins via WhatsApp, email newsletters, and push notifications.
2. **Who uses it (personas/roles)?**  
   Audience Engagement Specialist, Social Media Editor, Managing Editor, Publisher.
3. **What is the user journey?**  
   Audience Specialist selects published article → formats WhatsApp broadcast / newsletter digest → previews mobile layout → triggers broadcast dispatch queue.
4. **What happens on failure / network loss?**  
   Dispatches are queued in database; background worker retries failed dispatches with exponential backoff.
5. **Where does data live and persist?**  
   `broadcast_dispatches`, `newsletter_campaigns`, `push_campaigns`, `audience_subscribers` tables.
6. **How is it secured / authorized?**  
   Restricted to authorized newsroom roles (`audience_specialist`, `editor`, `publisher`). Subscriber PII (phone numbers, emails) encrypted at rest.
7. **What telemetry/audit trail is generated?**  
   Dispatch history with sent timestamp, recipient count, delivery success rate, and error logs.
8. **What is the operational runbook?**  
   Audience Broadcast & Social Operations Runbook (`HT-MVP-OPERATIONS-RUNBOOK.md` §6.1).
9. **What external dependencies exist?**  
   Meta WhatsApp Cloud API / Twilio, Brevo (Sendinblue) Email API, Apple APNs, Google FCM.
10. **What is the recovery/rollback procedure?**  
    Scheduled broadcasts can be aborted while in `queued` state; failed batches flagged for manual retry or recipient list scrub.
11. **How is it tested?**  
    Payload validation and queue management tested in `tests/ht-nr-audience.test.mjs`.
12. **What are the known limitations?**  
    In MVP staging, dispatches are placed in verified database queues; live external transmission depends on client-supplied production API credentials.
13. **What is deferred to v1.1?**  
    Two-way WhatsApp interactive chatbot for health inquiries, subscriber automated segmentation, and A/B subject line testing.
14. **What are the cost/resource implications?**  
    WhatsApp message tier costs scale with subscriber volume; Brevo free/starter tier covers initial MVP publication dispatches.
15. **What is the client acceptance criterion?**  
    Composing and queueing a broadcast completes with 100% data integrity; preview renders correctly; staging queue records dispatch intent.

---

### Capability 6: First-Owner Authentication & RBAC Security Core (Governance & Platform Plane)

1. **What business problem does this solve?**  
   Guarantees that only verified, authorized newsroom personnel can access administrative and editorial functions, preventing unauthorized takeover or privilege escalation.
2. **Who uses it (personas/roles)?**  
   All internal staff; specifically verified Executive Owner (`kudzimusar@gmail.com`).
3. **What is the user journey?**  
   Owner enters email in Newsroom Shell → receives magic link → confirms email in inbox → logs in → system securely links confirmed identity to Publisher profile → unlocks all 7 operational desks.
4. **What happens on failure / network loss?**  
   Session restored from secure local storage; token expiry prompts re-authentication; unconfirmed accounts rejected with explicit alert.
5. **Where does data live and persist?**  
   `auth.users` in Supabase Auth, `newsroom_staff` in database schema, verified via Migration 96.
6. **How is it secured / authorized?**  
   Migration 96 strictly enforces:
   - Caller must have active authenticated session (`auth.uid() IS NOT NULL`)
   - Caller email in JWT must exactly match `kudzimusar@gmail.com`
   - `auth.users.email_confirmed_at` MUST NOT BE NULL
   - Idempotent success returned if already active
   - Database triggers on `auth.users` auto-link on email confirmation
7. **What telemetry/audit trail is generated?**  
   `newsroom_audit_log` records every login, role assignment, and failed escalation attempt with IP and timestamp.
8. **What is the operational runbook?**  
   Owner Authentication & Identity Administration Runbook (`HT-MVP-OPERATIONS-RUNBOOK.md` §1.1).
9. **What external dependencies exist?**  
   Supabase Auth service, SMTP provider for magic link delivery.
10. **What is the recovery/rollback procedure?**  
    If Owner loses access, database administrator can verify account via SQL CLI or reset credentials in Supabase Dashboard.
11. **How is it tested?**  
    Comprehensive transactional SQL test suite `supabase/tests/ht_nr_rc01_owner_auth_assurance_tests.sql` covering all 6 attack/edge states.
12. **What are the known limitations?**  
    Hardware WebAuthn / FIDO2 security keys deferred to future phase; MVP relies on verified email magic links and passwords.
13. **What is deferred to v1.1?**  
    Multi-Factor Authentication (TOTP / SMS), Enterprise SAML / Okta SSO integration, and session concurrent IP anomaly detection.
14. **What are the cost/resource implications?**  
    Included in core Supabase Auth tier; zero incremental software licensing cost.
15. **What is the client acceptance criterion?**  
    Unconfirmed accounts cannot gain Publisher authority; verified Owner email activates seamlessly and unlocks full Newsroom OS.
