# HealthTimes Migration Agent Register

This register assigns execution ownership for the migration programme. Every agent must read `00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md` before acting.

## AG-01 — Preparation Closure & Baseline Governance

Task file: `agent-tasks/AG-01_PREPARATION_CLOSURE.md`

Owns:
- preserving and pushing local migration preparation;
- reviewing migration docs/tooling/schema;
- closing baseline Chromium failures;
- disposable schema application;
- secrets hygiene;
- global taxonomy v1 freeze;
- CP1 acceptance receipt.

Cannot:
- provision production;
- request/modify live DNS;
- import live production data.

## AG-02 — Staging Platform & Production Architecture

Task file: `agent-tasks/AG-02_STAGING_PLATFORM.md`

Prerequisite: AG-01 accepted.

Owns:
- staging Vercel/Supabase-style topology;
- staging environment variables/secrets design;
- database/Auth/Storage provisioning;
- backup/observability baseline;
- staging deployment and smoke test.

Cannot:
- touch live WordPress data;
- switch production DNS.

## AG-03 — Client Data Package & Source Capture

Task file: `agent-tasks/AG-03_SOURCE_DATA_CAPTURE.md`

Prerequisite: AG-01 accepted; staging destination known.

Owns:
- precise client access/data checklist;
- secure source snapshot receipt;
- WordPress WXR/database/media/source exports;
- Google Analytics/Search Console/AdSense read-only integration inventory;
- WooCommerce/subscription/payment/ad/newsletter source capture;
- source checksums and provenance.

Cannot:
- alter WordPress production;
- change Google account configuration unless separately authorized.

## AG-04 — Content, Media, Taxonomy & Rehearsal Import

Task file: `agent-tasks/AG-04_REHEARSAL_CONTENT_MEDIA_TAXONOMY.md`

Prerequisites: AG-02 staging ready; AG-03 source package captured.

Owns:
- importer completion;
- WXR/REST/database reconciliation;
- article/page/author/media import;
- taxonomy normalization and legacy preservation;
- media transfer and reference rewriting;
- staging rehearsal discrepancy ledger.

Cannot:
- perform production import.

## AG-05 — SEO, Authority, Analytics & Monetization Continuity

Task file: `agent-tasks/AG-05_SEO_ANALYTICS_MONETIZATION.md`

Prerequisites: AG-02 staging ready; AG-03 integration/source access available.

Owns:
- legacy URL preservation/redirects;
- metadata/canonical/structured data/sitemap/RSS/robots;
- Search Console and Analytics continuity;
- historical metric import where available;
- AdSense configuration/reporting mapping;
- ads.txt/app-ads.txt verification;
- PageSpeed/Web Vitals baseline;
- citation/backlink model readiness.

Cannot:
- fabricate unavailable historical metrics;
- publish unverified seller IDs.

## AG-06 — Newsroom Backend, Auth & Security

Task file: `agent-tasks/AG-06_NEWSROOM_BACKEND_SECURITY.md`

Prerequisite: AG-02 staging backend available.

Owns:
- replacing localStorage authority with server-side auth/data controls;
- staff invitations/session management/MFA readiness;
- granular RBAC enforcement;
- story draft/revision/review/assignment persistence;
- audit/security event persistence;
- commercial/editorial privilege isolation.

Cannot:
- weaken existing role boundaries for convenience.

## AG-07 — Certification, Client UAT & Acceptance Ledger

Task file: `agent-tasks/AG-07_CERTIFICATION_CLIENT_UAT.md`

Prerequisites: AG-04, AG-05 and AG-06 staging lanes complete.

Owns:
- full migration acceptance ledger;
- data reconciliation evidence;
- Playwright/Chromium certification;
- SEO/analytics/monetization verification;
- accessibility/performance checks;
- client UAT package;
- explicit CP4 recommendation.

Cannot:
- authorize production cutover itself.

## AG-08 — Production Cutover & Rollback

Task file: `agent-tasks/AG-08_PRODUCTION_CUTOVER_ROLLBACK.md`

Status: **LOCKED**

Prerequisites:
- AG-07 CP4 accepted;
- explicit owner authorization in writing;
- content freeze approved;
- DNS/email worksheet approved;
- backups and rollback tested.

Owns only after authorization:
- final delta export/import;
- production deployment;
- smoke tests;
- web DNS cutover while preserving mail;
- Search Console/analytics/ads verification;
- monitored rollback window;
- WordPress protected read-only retention.

## Coordination rules

1. Agents must work on dedicated branches unless the master programme or repo governance says otherwise.
2. Do not edit the same schema/importer files concurrently without an explicit merge plan.
3. Every agent leaves a repository report under a suitable `docs/migration/agent-reports/` path once that migration branch is available.
4. Red tests block checkpoint acceptance unless explicitly proven unrelated and accepted by the owner. The preferred state is fully green before handoff.
5. Production remains untouched through AG-07.
