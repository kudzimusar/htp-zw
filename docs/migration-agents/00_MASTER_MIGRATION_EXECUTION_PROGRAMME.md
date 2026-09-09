# HealthTimes Migration Execution Programme

Status: CANONICAL AGENT GOVERNANCE

Repository: `kudzimusar/htp-zw`

Documentation branch: `docs/healthtimes-migration-agents`

Production migration status: **NOT STARTED**

## 1. Programme objective

Move HealthTimes from the existing WordPress estate to the new HealthTimes platform without losing any of the four assets accumulated by the publication:

1. **Content** — articles, pages, media, authors, taxonomy and editorial history.
2. **Authority** — URLs, search equity, SEO metadata, backlinks, Search Console history and citation potential.
3. **Audience** — analytics history, acquisition channels, country/device/search behaviour, engagement and reader/subscriber continuity.
4. **Revenue** — AdSense identity/configuration, direct advertising, Premium/subscription data and monetization reporting.

The target is not a visual redesign. The current HealthTimes product direction is approved. Migration work changes the production architecture underneath it while preserving the client-facing experience.

## 2. Known source facts

Read-only WordPress inventory currently records approximately:

- 5,721 published posts
- 49 published pages
- 3,260 media records
- 83 categories
- 10,238 tags
- 3 public users/authors
- WordPress 7.1
- LiteSpeed
- News24 theme
- Elementor, WooCommerce, Paynow, subscription, advertising and social/plugin stack
- Site Kit connected to Search Console, AdSense, Analytics and PageSpeed Insights
- Google Ads configuration detected but incomplete
- public Google tag `GT-PLTTGPL`
- AdSense client `ca-pub-8744434739998394`
- ads.txt publisher `pub-8744434739998394`
- known AdSense slot `7971959240`
- Ad Inserter currently injects AdSense into post content
- current `app-ads.txt` returns 404 on WordPress
- WooCommerce analytics exists; visible current month showed no orders/sales
- MX currently points to `healthtimes.co.zw`; web DNS cutover can therefore break email if handled incorrectly

These facts are discovery inputs, not permission to alter production.

## 3. Current application facts

The new HealthTimes application already includes a redesigned public publication, mobile/PWA experience, Premium preview/access concepts, advertising, reader accounts, Newsroom OS, editorial roles/capabilities, story lifecycle, assignments, review queue, staff/access management, citations/impact, analytics/trending presentation, AI Desk, media library and commercial surfaces.

The current client-review implementation still uses browser-local persistence for important authority such as Newsroom authentication, RBAC, drafts, reader/Premium state, advertising state and some metrics. Production must replace local authority with a real server-backed architecture.

Recommended production topology prepared during migration planning:

- GitHub — code source of truth
- Vercel — frontend / server-rendered application / API functions
- Supabase — Postgres, Auth and Storage
- Cloudflare — DNS/CDN/WAF where appropriate
- Resend or equivalent — transactional email
- staging and production environments separated
- managed backups, monitoring and rollback

Agents must inspect the actual repository and migration documents before assuming this architecture is final.

## 4. Critical repository-state warning

At the time this programme was created, GitHub `main` was at:

`a4f1211e1a36bc16f69cd8211c6482c759eb70a2`

A local branch named:

`migration-preparation-2026-09-09`

was reported to contain extensive uncommitted/local migration preparation including `docs/migration/`, importer tooling, a Supabase migration and migration tests. That branch was **not visible on GitHub** at programme creation time.

Therefore:

- AG-01 must inspect the local workspace first.
- Do not reset, clean, checkout over, or recreate those files blindly.
- Preserve any local/uncommitted migration preparation.
- Commit and push it to a remote migration-preparation branch before other implementation agents depend on it.
- If the local work is unavailable, AG-01 must STOP and report the missing source rather than manufacture replacements from this document alone.

## 5. Non-negotiable safety boundaries

Until AG-08 is explicitly authorized after acceptance gates:

- no writes to the live WordPress database;
- no production WordPress content deletion;
- no live DNS changes;
- no registrar changes;
- no changing MX/SPF/DKIM/DMARC;
- no production payment credential changes;
- no irreversible subscriber mutations;
- no WordPress decommissioning;
- no secret/API token commits;
- no production import framed as a rehearsal;
- no fabricated analytics, citations, ad performance or revenue.

All source access is read-only unless a later task explicitly authorizes a bounded staging operation.

## 6. Design preservation rule

Do not redesign working HealthTimes public pages or Newsroom merely because migration work is underway.

Preserve:

- professional editorial/publication direction;
- dark navy / HealthTimes teal / warm paper Newsroom palette;
- no AI-gradient or glassmorphism drift;
- mobile and desktop presentation distinctions;
- existing Premium UX intent;
- commercial/editorial separation;
- current public accessibility and article-listening direction.

Migration may change routing, rendering, storage, APIs and backend authority when required for production SEO/security.

## 7. Canonical migration documents

Agents must read the applicable files under `docs/migration/` when available, including:

- `00_MIGRATION_MASTER_PLAN.md`
- `01_CURRENT_STATE_ARCHITECTURE.md`
- `02_WORDPRESS_SOURCE_INVENTORY.md`
- `03_TARGET_PRODUCTION_ARCHITECTURE.md`
- `04_DATA_MODEL_AND_MAPPING.md`
- `05_MEDIA_MIGRATION.md`
- `06_SEO_URL_REDIRECT_PLAN.md`
- `07_NEWSROOM_BACKEND_AUTH_PLAN.md`
- `08_HOSTING_ENVIRONMENTS_DNS.md`
- `09_CLIENT_DATA_ACCESS_REQUEST.md`
- `10_STAGING_REHEARSAL_RUNBOOK.md`
- `11_PRODUCTION_CUTOVER_ROLLBACK.md`
- `12_MIGRATION_ACCEPTANCE_LEDGER.md`
- `13_ANALYTICS_SEO_MONETIZATION_INVENTORY.md`

The agent task files in this branch are execution briefs. The migration package is the detailed technical specification. If they conflict, STOP and surface the conflict rather than choosing silently.

## 8. Programme checkpoints

### CP1 — Preparation Closure

Goal: make the migration preparation durable, reviewable and green.

Exit requirements:

- local migration work committed and pushed;
- importer and schema reviewed;
- migration tests green;
- normal validation green;
- Chromium UAT green with no unexplained baseline failures;
- disposable database schema apply proven from zero;
- global taxonomy v1 frozen;
- secrets scan clean;
- ads.txt/app-ads.txt strategy validated;
- migration baseline receipt published.

### CP2 — Production-style Staging Platform

Goal: run HealthTimes on the target backend/infrastructure without touching the production WordPress estate or live domain.

Exit requirements:

- staging frontend/API online;
- staging database/Auth/Storage online;
- server-side auth/RBAC baseline functional;
- environment secrets outside Git;
- backups and observability configured;
- empty production-style application smoke-tested;
- no live DNS changes.

### CP3 — Source Capture and Rehearsal Migration

Goal: import a client-supplied WordPress snapshot and connected data into staging.

Exit requirements:

- WordPress exports captured securely;
- content/media/author/taxonomy reconciliation complete;
- URL/SEO manifest generated;
- Analytics/Search Console/AdSense configuration mapped;
- historical metric import performed where available;
- exceptions ledger complete;
- no unexplained data loss.

### CP4 — Client UAT and Acceptance

Goal: prove the staging migration to HealthTimes stakeholders.

Exit requirements:

- public content parity accepted;
- mobile/desktop/PWA UAT green;
- Newsroom workflow green;
- Premium and advertising green;
- SEO/redirect/structured-data gates green;
- analytics/monetization continuity gates green or explicitly waived with reason;
- email/DNS worksheet approved;
- cutover decision explicitly recorded.

### CP5 — Production Cutover

Goal: execute the approved migration with rollback protection.

This checkpoint is **locked** until AG-08 receives explicit authorization after CP4 acceptance.

## 9. Global taxonomy requirement

The new HealthTimes strategy is a global health publication with Africa as its strongest editorial authority. Migration must preserve WordPress taxonomy for provenance while mapping it into a controlled canonical structure.

Canonical dimensions should include at least:

- geography: Global, Africa, regions and countries;
- desks: Global Health, Africa, Research, Policy, Investigations, Public Health, Health Systems, Health Business;
- health topics: normalized disease, public-health, policy, financing and health-system topics.

Do not expose all 10,238 legacy WordPress tags as the new public taxonomy without normalization.

## 10. URL and SEO principle

Every existing public WordPress URL is valuable until proven otherwise.

Prefer serving legacy article paths directly when technically reasonable. Do not default to routing all migrated content through demo-style query URLs such as `article.html?id=...` if stable production permalinks can be preserved.

Hard migration gates include:

- old URL mapping;
- canonical continuity;
- redirect coverage;
- sitemap/robots/RSS correctness;
- structured data;
- Search Console continuity;
- 404 monitoring.

## 11. Analytics and monetization principle

Do not recreate Site Kit as a plugin imitation and do not merely paste Google snippets.

Build a native HealthTimes Intelligence layer where Google services remain authoritative external sources and HealthTimes stores normalized, provenance-preserving reporting data for role-specific Newsroom dashboards.

Separate:

- external integration configuration;
- secrets/OAuth credentials;
- ingestion state;
- historical imported metrics;
- new HealthTimes audience events;
- direct-ad metrics;
- Google AdSense metrics;
- derived dashboards.

Public analytics and internal Newsroom analytics must not leak protected editorial activity.

## 12. Monetization continuity gates

- preserve verified AdSense publisher identity;
- serve valid `ads.txt` at HTTP 200;
- create `app-ads.txt` readiness for app monetization, using only verified seller declarations;
- do not assume AdMob identifiers that are not confirmed;
- direct campaigns such as HOSPAZ remain distinct from AdSense inventory;
- do not fabricate historical direct-ad performance;
- avoid layout shift from ad placements.

## 13. Email/DNS principle

Email continuity is a hard release gate.

Before any web DNS cutover:

- capture all current DNS records;
- identify apex/www routing;
- preserve MX;
- preserve SPF;
- preserve DKIM;
- preserve DMARC;
- verify mail before and after web cutover;
- maintain rollback values.

## 14. Evidence and receipts

Each agent must leave a receipt containing:

- branch and start SHA;
- end SHA;
- files changed;
- commands/tests run;
- evidence generated;
- acceptance gates passed/failed;
- unresolved issues;
- next authorized agent/checkpoint;
- explicit statement of whether any production system was modified.

No agent may report a checkpoint as complete with unexplained red tests.

## 15. Agent order

Use `01_AGENT_REGISTER.md` for ownership and sequencing.

Default order:

AG-01 -> AG-02 -> AG-03 -> AG-04/AG-05/AG-06 in coordinated staging lanes -> AG-07 -> explicit owner authorization -> AG-08.

Some middle agents may operate in parallel only after their prerequisites are green and they do not modify the same files/schema surfaces concurrently.
