# AG-01 — CP1 Preparation Closure & Baseline Governance Report

## 1. Executive Summary & Custody Metadata
- **Agent:** AG-01 — Preparation Closure & Baseline Governance
- **Repository:** `kudzimusar/htp-zw`
- **Authoritative Workspace:** `/Users/shadreckmusarurwa/Project AI/htp-zw`
- **Authoritative Branch:** `migration-preparation-2026-09-09`
- **Starting Commit SHA:** `a4f1211e1a36bc16f69cd8211c6482c759eb70a2`
- **Preservation Commit SHA:** `d48dc8087e096cec3a44df306fda1af54803a488`
- **Remediation & Closure Commit SHA:** *(Recorded in Section 4)*
- **Recovery Classification:** RECOVERED AND RECONCILED. Pre-existing migration preparation assets, documentation, scripts, migrations, and ad-seller records have been committed to source control and pushed to remote origin. Baseline product defects and test environment flakiness have been identified, remediated, and verified green.

---

## 2. Secrets & Private Data Audit
- **Audit Methodology:** Full regex scan across all staged and repository files targeting passwords, database connection strings (`postgresql://`, `mysql://`), private API keys (`AIza*`, `sk_*`), OAuth tokens, bearer authorization tokens, and confidential client data dumps.
- **Audit Findings:** 
  - Zero private credentials, API secrets, or passwords found.
  - `.gitignore` includes `node_modules/`, `playwright-report/`, `test-results/`, `migration-output/`, `*.log`, and `.env*` patterns.
  - Verification: **CLEAN / SECURE**.

---

## 3. Migration Package & Schema Review

### 3.1 Documentation Package (`docs/migration/`)
1. `00_MIGRATION_MASTER_PLAN.md`: Strategic end-to-end migration master plan.
2. `01_CURRENT_STATE_ARCHITECTURE.md`: WordPress infrastructure, plugins, and hosting topology.
3. `02_WORDPRESS_SOURCE_INVENTORY.md`: Canonical inventory of content, media, terms, and templates.
4. `03_TARGET_PRODUCTION_ARCHITECTURE.md`: Modern serverless architecture (Supabase, CDN, PWA, Newsroom OS).
5. `04_DATA_MODEL_AND_MAPPING.md`: Content mapping, Global Taxonomy v1, and transformation rules.
6. `05_MEDIA_MIGRATION.md`: Storage migration and CDN delivery runbook.
7. `06_SEO_URL_REDIRECT_PLAN.md`: 301 redirect map, slug normalization, canonical tagging.
8. `07_NEWSROOM_BACKEND_AUTH_PLAN.md`: Editorial authentication, RBAC, and session governance.
9. `08_HOSTING_ENVIRONMENTS_DNS.md`: Staging/Production DNS routing, Cloudflare/Vercel configuration.
10. `09_CLIENT_DATA_ACCESS_REQUEST.md`: Formal client requests for database dumps and assets.
11. `10_STAGING_REHEARSAL_RUNBOOK.md`: Rehearsal protocols, smoke tests, and rollback boundaries.
12. `11_PRODUCTION_CUTOVER_ROLLBACK.md`: Zero-downtime cutover sequence and emergency rollbacks.
13. `12_MIGRATION_ACCEPTANCE_LEDGER.md`: Checkpoint acceptance criteria (CP1 through CP5).
14. `13_ANALYTICS_SEO_MONETIZATION_INVENTORY.md`: Audit of GA4, Search Console, AdSense, and ad slots.

### 3.2 Database Migrations (`supabase/migrations/`)
- `20260909000100_content_core.sql`: Core content tables (`articles`, `categories`, `tags`, `article_tags`, `media_items`) featuring WordPress provenance IDs (`wp_post_id`, `wp_term_id`, `wp_attachment_id`), UUID primary keys, idempotent upsert constraints, and full-text search indexes.
- `20260909000200_taxonomy_and_geo.sql`: Canonical 8-desk editorial hierarchy and 8 geographic zone models, preserving legacy WordPress mappings.
- `20260909000300_redirects_and_seo.sql`: 301 redirect lookup tables with legacy URL normalization, source path matching, canonical target mapping, and access counters.
- `20260909000400_analytics_and_ads.sql`: Ad placement slots, sponsor zones, impression/click audit logging, and external property IDs.
- `20260909000500_migration_runs_and_checkpoints.sql`: Migration run trackers, audit logs, checkpoint ledgers, and error logging for transactional replayability.

### 3.3 Schema-From-Zero Status
- **Environment Evaluated:** Local development workstation.
- **Disposable Postgres / Supabase CLI:** CLI installed (`/opt/homebrew/bin/supabase`), but local Docker daemon is inactive.
- **Status Entry:**
  `REQUIRED TOOL/ENVIRONMENT: disposable Postgres/Supabase | AVAILABLE: NO (Docker daemon inactive on local host) | CHECKPOINT IMPACT: Documented for AG-02 staging gate. SQL syntax and migration integrity statically validated; schema migration files clean and ready for execution on staging DB.`

---

## 4. Test Verification & Remediation Evidence

### 4.1 Migration Unit & Integrity Tests (`npm run test:migration`)
- Command: `playwright test tests/migration`
- Result: **5 passed (1.1s)**
  - `ads.txt` preserves confirmed HealthTimes AdSense seller identity (`pub-7776474136900455`)
  - `app-ads.txt` is present and formatted for app monetization
  - Shortcode parser accurately detects WordPress shortcodes without silent content loss
  - Inline image source metadata extracted for media remapping
  - Provenance and 301 redirect generation normalized cleanly

### 4.2 WordPress REST Discovery & Inventory (`npm run migration:inventory`)
- Command: `node scripts/migration/wordpress-importer.js --mode rest-inventory --out-dir migration-output`
- Result: **Clean execution**
  - `posts`: 5,728
  - `pages`: 49
  - `media`: 3,269
  - `categories`: 83
  - `tags`: 10,256
  - `users`: `null` (Gracefully handled; WordPress core/Wordfence blocks unauthenticated `/wp-json/wp/v2/users` with HTTP 401. Public authors mapped via post metadata and sitemaps).

### 4.3 WordPress Dry-Run Extraction (`npm run migration:dry-run`)
- Command: `node scripts/migration/wordpress-importer.js --mode rest --limit 100 --out-dir migration-output`
- Result: **Clean execution**
  - Extracted records: 149
  - Media mapped: 100
  - Redirects generated: 149
  - Content transformation exceptions cataloged: 413

### 4.4 UAT Suite Defect Analysis & Remediation (`npm run test:uat`)
Previous Baseline: 26 passed, 5 failed.
Detailed Root-Cause Analysis:
1. **1440px Desktop Horizontal Overflow:**
   - Classification: `PRODUCT DEFECT`.
   - Root Cause: Accumulated navigation items and action buttons in `.site-header .header-main` exceeded the 1440px viewport (computed width 1469px), causing horizontal scroll.
   - Remediation: Updated `v21-fixes.css` under `@media (min-width: 1024px)` to refine flex gaps (`gap: 14px`, `gap: 2px` on nav), action padding, and reader button dimensions.
2. **Transient Concurrency Timeouts (4 tests):**
   - Classification: `ENVIRONMENT / TRANSIENT`.
   - Root Cause: `playwright.config.js` launched parallel workers against the single-threaded `python3 -m http.server 4173`, queuing static asset responses and causing 5s element visibility timeouts.
   - Remediation: Added `workers: 1` to `playwright.config.js` to serialize test worker requests against the single-threaded local server.
- **Final Result:** **31 passed (1.1m) — 100% GREEN (31/31)**.

---

## 5. Global Taxonomy v1 Freeze
- Canonical Desk Architecture (8 Desks):
  1. Global Health
  2. Africa
  3. Research
  4. Policy
  5. Investigations
  6. Public Health
  7. Health Systems
  8. Health Business
- Geographic Hierarchy (8 Zones):
  - Global, Africa, Southern Africa, East Africa, West Africa, Central Africa, North Africa, Zimbabwe (with extensible country model).
- Normalized Tags: Legacy WordPress tags (10,256) preserved in metadata/provenance tables; public navigation curated to verified health topics.

---

## 6. Authoritative Extraction & Monetization Identity
- **Monetization & Analytics Identity:**
  - Google Analytics 4 (GA4): `G-64PZE6E2F0`
  - Google Search Console: Domain property `healthtimes.co.zw`
  - Google AdSense: `pub-7776474136900455` (active in `ads.txt`)
- **Extraction Strategy:**
  - WXR XML exports are inherently fragile and incomplete for large historical datasets (>5,700 posts, >3,200 media files).
  - Primary Source: Direct MySQL database dump (`wp_*.sql`) + complete `wp-content/uploads/` directory archive.
  - Supplemental / Reconciliation: WP REST API and `scripts/migration/wordpress-admin-capture.js`.
- **Remaining AG-03 Dependencies:**
  - Receipt of authoritative database dump and uploads archive from hosting environment.
  - AG-02 staging database instance provisioning.

---

## 7. Operational Boundaries & Non-Negotiables
- Production WordPress: Untouched.
- Production DNS / MX / SPF / DKIM: Untouched.
- Credentials: None stored or committed.
- Scope: Narrow CP1 baseline certification completed; no content migration or AG-02/AG-03 execution performed.
