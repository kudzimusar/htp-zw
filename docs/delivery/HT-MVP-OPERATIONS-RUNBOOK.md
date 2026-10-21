# HealthTimes 2.0 — Standard Operations Runbook (SOP)
## 24-Surface Operating Model, Newsroom Procedures, Support Tiers & SRE Guidelines

- **Document ID:** `HT-MVP-OPERATIONS-RUNBOOK`
- **Release Candidate:** `release/ht-mvp-rc02-final-unified-candidate`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 22–24, 31–33
- **Target Delivery Date:** 24 October 2026

---

## 1. 24-Surface Operating Inventory

Under UDPCS 1.0 Section 22, HealthTimes operates across **24 distinct user-facing and operational surfaces**, grouped across the 5 platform planes:

| # | Surface Name | Operating Plane | Target Audience | Primary Technical Route / Component | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **01** | Reader Home & Top Stories | Experience | Public / Readers | `apps/mobile/src/screens/HomeScreen.tsx` | **ACTIVE** |
| **02** | Reader Category & Topics Feed | Experience | Healthcare Staff | `apps/mobile/src/screens/CategoryScreen.tsx` | **ACTIVE** |
| **03** | Reader Article Detail & Byline | Experience | Public / Readers | `apps/mobile/src/screens/ArticleDetailScreen.tsx` | **ACTIVE** |
| **04** | Reader Audio / Podcast Player | Experience | Commuters / Doctors | `apps/mobile/src/screens/ListenScreen.tsx` | **ACTIVE** |
| **05** | Reader Video & Live Stream | Experience | Public / Viewers | `apps/mobile/src/screens/WatchScreen.tsx` | **ACTIVE** |
| **06** | Reader Search & Topic Discovery | Experience | Public / Readers | `apps/mobile/src/screens/SearchScreen.tsx` | **ACTIVE** |
| **07** | Reader Saved & Offline Library | Experience | Rural Clinic Staff | `apps/mobile/src/screens/BookmarksScreen.tsx` | **ACTIVE** |
| **08** | Reader In-App Notifications | Experience | Public / Readers | `apps/mobile/src/screens/NotificationsScreen.tsx` | **ACTIVE** |
| **09** | Reader Profile & Theme Settings | Experience | Public / Readers | `apps/mobile/src/screens/SettingsScreen.tsx` | **ACTIVE** |
| **10** | Reader Author Archive Surface | Experience | Researchers | `apps/mobile/src/screens/AuthorProfileScreen.tsx` | **ACTIVE** |
| **11** | Reader Static Pages (About/Privacy)| Experience | General Public | `apps/mobile/src/screens/StaticPageScreen.tsx` | **ACTIVE** |
| **12** | Reader Newsletter Subscribe Bar | Experience | Readers / Subscribers | `apps/mobile/src/components/NewsletterModal.tsx` | **ACTIVE** |
| **13** | Newsroom Staff Auth & Bootstrap | Control | Internal Staff | `apps/mobile/src/components/newsroom/StaffAuthModal.tsx` | **ACTIVE** |
| **14** | Newsroom Editorial Drafting Desk | Control | Staff Journalists | `apps/mobile/src/components/newsroom/EditorialDraftDesk.tsx`| **ACTIVE** |
| **15** | Newsroom Review & Publish Queue | Control | Copy & Desk Editors | `apps/mobile/src/components/newsroom/ReviewQueueDesk.tsx` | **ACTIVE** |
| **16** | Newsroom Media Library & Upload | Control | Photo / Media Staff | `apps/mobile/src/components/newsroom/MediaLibraryDesk.tsx` | **ACTIVE** |
| **17** | Newsroom Homepage Curation Desk | Control | Managing Editor | `apps/mobile/src/components/newsroom/HomepageCurationDesk.tsx`| **ACTIVE** |
| **18** | Newsroom Commercial Ad Desk | Control | Ad Ops / Sales | `apps/mobile/src/components/newsroom/CommercialDesk.tsx` | **ACTIVE** |
| **19** | Newsroom Audience & WhatsApp | Control | Audience Specialist | `apps/mobile/src/components/newsroom/AudienceDesk.tsx` | **ACTIVE** |
| **20** | Newsroom Finance & GL Ledger | Control | Finance Officer | `apps/mobile/src/components/newsroom/FinanceAccountingDesk.tsx`| **ACTIVE** |
| **21** | Newsroom Staff & RBAC Admin | Control | Executive Publisher | `apps/mobile/src/components/newsroom/StaffSettingsDesk.tsx`| **ACTIVE** |
| **22** | Newsroom Security Audit Log | Governance | SecOps / Publisher | `apps/mobile/src/components/newsroom/AuditLogDesk.tsx` | **ACTIVE** |
| **23** | Supabase Cloud Database Console | Platform | Lead DevOps / DBA | Supabase Admin Dashboard (`gcdohgbmqhqwydgaxrcr`) | **ACTIVE** |
| **24** | GitHub CI/CD & Deploy Pipeline | Operations | Engineering Team | GitHub Actions Workflow Runner | **ACTIVE** |

---

## 2. Daily Editorial & Operations Workflow

### 2.1 Editorial Shift Timetable (Central Africa Time - CAT)
- **06:30 – 07:00:** Managing Editor logs into Newsroom OS; reviews incoming health news wires, overnight emergency alerts, and updates Homepage Hero Lead.
- **07:00 – 08:30:** Beat Journalists draft morning reports in Editorial Desk; submit completed articles to Review Queue.
- **08:30 – 09:30:** Copy Editors review submissions, verify medical sources, and approve stories for publication.
- **09:30 – 10:00:** Audience Engagement Specialist composes Morning Health Bulletin on WhatsApp Desk and queues daily broadcast.
- **12:00 – 13:00:** Midday news cycle update; commercial banners verified in Commercial Desk.
- **16:00 – 17:00:** Evening wrap-up; finance officer reconciles daily advertising invoices and posts journal entries.
- **17:00 – 17:30:** Audit log review and staging backup verification.

### 2.2 Story Publication & Retraction Procedure
1. **Standard Publication:**
   - Journalist submits draft (`status = 'in_review'`).
   - Editor verifies medical factual accuracy, libel/defamation clearance, and image copyright.
   - Editor clicks 'Approve & Publish' (`status = 'published'`).
   - Story appears on Reader within 5 seconds via Supabase Realtime channel.
2. **Emergency Retraction / Correction:**
   - If an error or legal issue is reported: Editor or Publisher opens story in Review Desk.
   - Click 'Unpublish / Retract'.
   - Story status transitions to `archived` or `draft`; instantly removed from Reader public feed.
   - Retraction rationale recorded in `newsroom_audit_log` with editor identity.

---

## 3. Customer Support & CRM Model

### 3.1 Reader Feedback & Correction Reporting
- **Inbound Channel:** In-app 'Send Feedback / Report Error' button located on every article footer.
- **Email Gateway:** `editor@healthtimes.co.zw` and `corrections@healthtimes.co.zw`.
- **Triage Protocol:**
  - **Tier 1 (Typographical / Formatting):** Addressed by Duty Copy Editor within 2 hours.
  - **Tier 2 (Factual Dispute / Scientific Clarification):** Escalated to Beat Reporter and Managing Editor; formal correction note appended to article if verified.
  - **Tier 3 (Legal / Defamation / Copyright Complaint):** Escalated to Publisher and Legal Counsel within 30 minutes; temporary retraction applied if credible risk exists.

---

## 4. Trust & Safety, Moderation & Editorial Integrity

### 4.1 Medical Misinformation Protocol
HealthTimes adheres to the WHO and Zimbabwean Ministry of Health guidelines. All articles referencing clinical treatments, medications, or vaccines must cite:
- Peer-reviewed research, or
- Registered medical practitioner statements, or
- Official public health ministry bulletins.
Unverified herbal or alternative cures without clinical trial backing are prohibited from publication.

### 4.2 Commercial Boundary & Sponsored Content
- All sponsored articles or paid advertisements must carry the prominent badge: **'SPONSORED'** or **'ADVERTISEMENT'**.
- Editorial staff maintain complete independence; commercial advertisers have zero review privileges over news coverage.

---

## 5. Release & Deployment Runbook

### 5.1 Release Staging to Production Checklist
1. Verify git working directory clean on release candidate branch.
2. Run read-only preflight script: `node scripts/release/ht-mvp-preflight.mjs`.
3. Verify test suite passes: `node --test tests/ht-nr*.test.mjs` (466 passing).
4. Verify TypeScript compilation: `npx tsc --noEmit` (0 errors).
5. Verify staging Supabase migration tip matches latest version.
6. Trigger GitHub Actions production build workflow.

### 5.2 Emergency Rollback Procedure
If a production deployment introduces a critical regression:
1. Revert git commit on main to previous stable release tag: `git revert HEAD --no-edit && git push origin main`.
2. Supabase Database Rollback: Database migrations are additive; rollback is achieved via targeted inverse migration script without data destruction.
3. CDN Purge: Trigger Cloudflare/Vercel edge cache purge to flush cached bundle.
4. Notify newsroom staff via emergency WhatsApp operations channel.

---

## 6. Service Level Objectives (SLOs) & Monitoring

| Metric | Target SLO | Measurement Tool | Breach Escalation |
| :--- | :---: | :--- | :--- |
| **Reader Uptime Availability** | 99.5% | Supabase Health Status & UptimeRobot | Alert sent to DevOps on 2 min outage |
| **Reader Cold Load Time (3G)** | < 2.5s | Chrome DevTools Lighthouse Audit | Performance review of image optimization |
| **API Response Time (p95)** | < 350ms | Supabase REST Telemetry | Index optimization and query tuning |
| **Publishing to Live Propagation**| < 10s | Realtime Channel Latency | Realtime connection pool restart |
| **Ledger Transaction Processing**| < 100ms | PostgreSQL Query Log | Review lock contention on `gl_journal_entries` |
