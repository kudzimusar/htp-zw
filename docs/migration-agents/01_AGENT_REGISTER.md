# HealthTimes Migration Agent Register

This register assigns execution ownership for the migration programme. Every agent must read:

- `00_MASTER_MIGRATION_EXECUTION_PROGRAMME.md`
- `02_AGENT_LAUNCH_INSTRUCTIONS.md`
- `03_TOOL_ENVIRONMENT_MATRIX.md`
- its own task file

Tool availability is not permission. Production mutation remains locked until AG-08 is explicitly authorized by the owner after CP7 acceptance.

## REC-01 — Local Migration Custody Recovery

Task file: `agent-tasks/REC-01_LOCAL_CUSTODY_RECOVERY.md`

Status: **ACTIVE ONLY WHILE LOCAL-CUSTODY BLOCKER EXISTS**

Required tools/environment:
- LOCAL-TERMINAL access to the original HealthTimes Mac/worktree;
- Git;
- GITHUB for remote persistence/verification;
- local secrets/checksum tooling as available.

Owns only:
- locating the original migration preparation;
- preserving modified/untracked work;
- classifying custody A/B/C/D/E;
- preventing private exports/secrets from being pushed;
- committing and pushing the authoritative `migration-preparation-2026-09-09` branch.

Cannot:
- reconstruct the migration package from governance docs;
- certify CP1;
- provision staging;
- modify production.

Successful handoff:
`RECOVERY COMPLETE — AG-01 may resume CP1 certification from <SHA>`

## AG-01 — Preparation Closure & Baseline Governance

Task file: `agent-tasks/AG-01_PREPARATION_CLOSURE.md`

Prerequisite while custody blocker exists: REC-01 complete.

Required tools/environment:
- LOCAL-TERMINAL/repository execution;
- GITHUB;
- BROWSER-UAT/Playwright;
- disposable/local/staging-safe database tooling for schema-from-zero.

Owns:
- certifying the recovered migration preparation;
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

Prerequisite: CP1 accepted.

Required tools/environment:
- GITHUB;
- VERCEL staging;
- SUPABASE staging;
- BROWSER-UAT;
- RESEND/transactional-email sandbox where available.

Owns:
- staging frontend/API topology;
- staging environment variables/secrets design;
- database/Auth/Storage provisioning;
- backup/observability baseline;
- staging deployment and smoke test;
- CP2 receipt.

Cannot:
- touch live WordPress data;
- switch production DNS;
- use production secrets as staging shortcuts.

## AG-03 — Client Data Package & Source Capture

Task file: `agent-tasks/AG-03_SOURCE_DATA_CAPTURE.md`

Prerequisite: CP2 accepted.

Required tools/environment:
- WORDPRESS-READ;
- CLIENT-SECURE-TRANSFER/private workspace;
- GOOGLE-READ;
- GITHUB only for non-sensitive reports/manifests;
- local checksum/source-inspection tooling.

Owns:
- precise client access/data checklist;
- secure source snapshot receipt;
- WXR/database/media/source exports;
- Analytics/Search Console/AdSense read-only inventory;
- WooCommerce/subscription/payment/ad/newsletter source classification;
- checksums and provenance;
- CP3 receipt.

Cannot:
- commit exports/credentials;
- alter WordPress production;
- change Google account configuration;
- request production DNS write access merely for rehearsal.

## AG-04 — Content, Media, Taxonomy & Rehearsal Import

Task file: `agent-tasks/AG-04_REHEARSAL_CONTENT_MEDIA_TAXONOMY.md`

Prerequisites: CP2 and CP3 accepted; moderator authorization.

Required tools/environment:
- LOCAL-TERMINAL;
- GITHUB;
- SUPABASE staging;
- secure AG-03 source package;
- BROWSER-UAT.

Owns:
- importer completion;
- WXR/REST/database reconciliation;
- article/page/author/media import;
- taxonomy normalization and legacy preservation;
- media transfer/reference rewriting;
- idempotency/resume testing;
- CP4 receipt.

Cannot:
- perform production import;
- write to live WordPress.

## AG-05 — SEO, Authority, Analytics & Monetization Continuity

Task file: `agent-tasks/AG-05_SEO_ANALYTICS_MONETIZATION.md`

Prerequisites: CP2 and CP3 accepted; moderator authorization.

Required tools/environment:
- GITHUB;
- VERCEL staging;
- SUPABASE staging;
- GOOGLE-READ;
- BROWSER-UAT;
- PageSpeed/structured-data validation tooling as available.

Owns:
- legacy URL preservation/redirects;
- metadata/canonical/structured data/sitemap/RSS/robots;
- Search Console and Analytics continuity;
- historical metric import where available;
- AdSense configuration/reporting mapping;
- ads.txt/app-ads.txt verification;
- PageSpeed/Web Vitals baseline;
- citation/backlink model readiness;
- CP5 receipt.

Cannot:
- fabricate unavailable historical metrics;
- publish unverified seller IDs;
- change production Google/AdSense configuration.

## AG-06 — Newsroom Backend, Auth & Security

Task file: `agent-tasks/AG-06_NEWSROOM_BACKEND_SECURITY.md`

Prerequisite: CP2 accepted; CP3 source/staff context available as required; moderator authorization.

Required tools/environment:
- GITHUB;
- SUPABASE staging;
- VERCEL staging;
- RESEND/email sandbox;
- BROWSER-UAT;
- direct API/RLS/security test tooling.

Owns:
- replacing localStorage authority with server-side auth/data controls;
- staff invitations/session management/MFA readiness;
- granular capability enforcement;
- story draft/revision/review/assignment persistence;
- audit/security event persistence;
- commercial/editorial privilege isolation;
- CP6 receipt.

Cannot:
- weaken role boundaries for convenience;
- create production staff accounts;
- expose privileged keys client-side.

## AG-07 — Integrated Certification, Client UAT & Acceptance Ledger

Task file: `agent-tasks/AG-07_CERTIFICATION_CLIENT_UAT.md`

Prerequisites: CP4, CP5 and CP6 accepted.

Required tools/environment:
- GITHUB;
- BROWSER-UAT;
- read/test access to integrated staging Vercel/Supabase;
- GOOGLE-READ;
- performance/accessibility/security test tooling.

Owns:
- one integrated frozen certification candidate;
- full migration acceptance ledger;
- data/URL/SEO/analytics/monetization/security reconciliation;
- Playwright/Chromium certification;
- accessibility/performance checks;
- client UAT package/findings;
- DNS/email worksheet verification;
- CP7 recommendation.

Cannot:
- authorize production cutover itself;
- receive production DNS write authority;
- treat a moving SHA as certified.

## AG-08 — Production Cutover & Rollback

Task file: `agent-tasks/AG-08_PRODUCTION_CUTOVER_ROLLBACK.md`

Status: **LOCKED**

Prerequisites:
- CP7 accepted;
- explicit owner authorization in writing;
- content freeze approved;
- production backups/exports verified;
- DNS/email worksheet approved;
- rollback values/triggers verified.

Tools/environment allocated only after unlock:
- GITHUB;
- approved production VERCEL/SUPABASE;
- secure final-source transfer;
- production monitoring/backup tooling;
- DNS-CONTROL;
- production Google/Search Console/AdSense verification access;
- production transactional-email configuration as approved.

Owns after authorization:
- final delta export/import;
- production deployment;
- pre/post-DNS smoke tests;
- approved web DNS cutover while preserving mail;
- Search Console/Analytics/ads verification;
- monitored rollback window;
- protected read-only WordPress retention;
- CP8/post-cutover receipt.

## Coordination rules

1. REC-01 is a custody-recovery prerequisite only; it is not a replacement for AG-01.
2. Agents work on dedicated branches unless repository governance explicitly says otherwise.
3. Do not edit the same schema/importer files concurrently without an explicit merge plan.
4. Every implementation/certification agent leaves a non-sensitive report under `docs/migration/agent-reports/` once the migration branch exists.
5. Red tests block checkpoint acceptance unless explicitly proven unrelated and accepted under programme governance; green is the preferred handoff state.
6. Production remains untouched through AG-07.
7. Required-tool unavailability is a blocker, not permission to simulate evidence.
