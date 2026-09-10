# HealthTimes Migration Execution Programme

Status: CANONICAL AGENT GOVERNANCE

Repository: `kudzimusar/htp-zw`

Documentation branch: `docs/healthtimes-migration-agents`

Production migration status: **NOT STARTED**

## 1. Programme objective

Move HealthTimes from the existing WordPress estate to the new HealthTimes platform without losing the four assets accumulated by the publication:

1. **Content** — articles, pages, media, authors, taxonomy and editorial history.
2. **Authority** — URLs, search equity, SEO metadata, backlinks, Search Console history and citation potential.
3. **Audience** — analytics history, acquisition channels, country/device/search behaviour, engagement and reader/subscriber continuity.
4. **Revenue** — AdSense identity/configuration, direct advertising, Premium/subscription data and monetization reporting.

The target is not a visual redesign. Migration changes the production architecture underneath the approved HealthTimes experience while preserving the public/mobile/Newsroom product direction.

## 2. Known source facts

Read-only WordPress discovery previously recorded approximately:

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
- current WordPress `app-ads.txt` returns 404
- WooCommerce analytics exists; visible current month showed no orders/sales
- MX currently points to `healthtimes.co.zw`; web DNS cutover can therefore break email if handled incorrectly

These are discovery inputs, not permission to alter production. The AG-03 source snapshot becomes authoritative for rehearsal counts if live editorial activity creates drift.

## 3. Current application facts

The new HealthTimes application already includes a redesigned public publication, mobile/PWA experience, Premium preview/access concepts, advertising, reader accounts, Newsroom OS, editorial roles/capabilities, story lifecycle, assignments, review queue, staff/access management, citations/impact, analytics/trending presentation, AI Desk, media library and commercial surfaces.

The client-review implementation still contains browser-local persistence for important authority. Production migration must replace local authority with real server-backed identity, data and authorization.

Prepared target topology remains subject to evidence-based review:

- GitHub — code source of truth
- Vercel — frontend / server-rendered application / API functions
- Supabase — Postgres, Auth and Storage
- Cloudflare or equivalent — DNS/CDN/WAF where appropriate
- Resend or equivalent — transactional email
- separated development/staging/production environments
- managed backups, monitoring and rollback

## 4. Critical custody state and REC-01

At programme creation, GitHub `main` was `a4f1211e1a36bc16f69cd8211c6482c759eb70a2`.

A local branch/worktree named or expected as:

`migration-preparation-2026-09-09`

was reported to contain substantial migration preparation including `docs/migration/`, importer tooling, Supabase migrations, migration tests, `ads.txt`, `app-ads.txt` and package scripts. That work was not persisted to GitHub.

AG-01 correctly determined that a GitHub-only execution environment cannot certify the original local working tree.

Therefore a recovery precondition now exists:

**REC-01 — Local Migration Custody Recovery**

REC-01 must run with local-terminal access to the original HealthTimes Mac/worktree. Its only job is to locate, preserve, secrets-check, commit and push the authoritative migration preparation. It must not reconstruct missing work from this programme.

Until REC-01 returns:

`RECOVERY COMPLETE — AG-01 may resume CP1 certification from <SHA>`

AG-01 remains blocked and AG-02 through AG-07 remain frozen. AG-08 remains locked.

## 5. Tool and environment governance

Every agent must read:

`docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md`

That matrix is authoritative for environment/tool allocation. Tool availability does not itself authorize an operation.

Key rules:

- REC-01 requires local-terminal access to the original workspace; GitHub-only is insufficient.
- AG-01 requires local/repository execution plus GitHub and browser/test tooling.
- AG-02 owns staging Vercel/Supabase provisioning.
- AG-03 owns read-only source capture and secure client-data transfer; exports do not enter Git.
- AG-04 owns staging rehearsal import.
- AG-05 owns SEO/Google-read/monetization continuity in staging.
- AG-06 owns staging Newsroom backend/Auth/security.
- AG-07 owns integrated certification and receives test/read access, not production write authority.
- DNS/registrar production write capability is allocated only to AG-08 after explicit owner unlock.

If a required environment/tool is unavailable, the agent stops and reports the missing capability rather than manufacturing evidence.

## 6. Non-negotiable safety boundaries

Until AG-08 is explicitly authorized after CP7 acceptance:

- no writes to the live WordPress database;
- no production WordPress content deletion;
- no live DNS or registrar changes;
- no changing MX/SPF/DKIM/DMARC;
- no production payment credential changes;
- no irreversible subscriber mutations;
- no WordPress decommissioning;
- no secret/API token commits;
- no production import framed as rehearsal;
- no fabricated analytics, citations, ad performance or revenue.

All source access is read-only unless a later task explicitly authorizes a bounded staging operation.

## 7. Design preservation rule

Do not redesign working HealthTimes public pages or Newsroom merely because migration is underway.

Preserve:

- professional editorial/publication direction;
- dark navy / HealthTimes teal / warm paper Newsroom palette;
- no AI-gradient or glassmorphism drift;
- distinct mobile and desktop presentation;
- existing Premium UX intent;
- commercial/editorial separation;
- current public accessibility and article-listening direction.

Migration may change routing, rendering, storage, APIs and backend authority where required for production SEO/security.

## 8. Canonical migration documents

Agents must read the applicable files under `docs/migration/` once REC-01 has restored them, including:

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

Agent task files are execution briefs; `docs/migration/` is the detailed implementation/migration specification. If they materially conflict, STOP and surface the conflict.

## 9. Canonical checkpoint map

### REC-01 — Custody Recovery Precondition

Not a numbered migration checkpoint. It exists only because the authoritative preparation was stranded locally.

Exit: authoritative migration work is found, protected, safe to publish, committed, pushed and remote SHA verified.

### CP1 — AG-01 Preparation Closure

Exit requirements:

- recovered migration work committed/pushed;
- importer/schema reviewed truthfully;
- schema applies from zero to a disposable safe database/project;
- migration tests green;
- normal validation green;
- Chromium UAT green with no unexplained failures;
- global taxonomy v1 frozen;
- secrets scan clean;
- ads.txt/app-ads.txt strategy validated;
- CP1 receipt accepted.

### CP2 — AG-02 Production-style Staging Platform

Exit requirements:

- staging frontend/API online;
- staging database/Auth/Storage online;
- environment secrets outside Git;
- backup/restore path and observability established;
- production-style application smoke-tested;
- no live DNS/WordPress mutation.

### CP3 — AG-03 Client Data Package & Source Capture

Exit requirements:

- secure source snapshot/manifest captured;
- WXR/database/media validated or precise blockers recorded;
- source IDs/provenance established;
- Analytics/Search Console/AdSense identities resolved as far as authorized access permits;
- commerce/subscriber/ad/newsletter source status classified;
- no sensitive exports committed.

### CP4 — AG-04 Content, Media, Taxonomy & Rehearsal Import

Exit requirements:

- full staging rehearsal import performed;
- all expected content/pages/authors/media accounted for or exception-listed;
- taxonomy provenance retained and canonical mapping produced;
- no silent shortcode/custom-field loss;
- internal links reconciled;
- importer idempotency and resume/restart proven;
- production untouched.

### CP5 — AG-05 SEO, Authority, Analytics & Monetization Continuity

Exit requirements:

- legacy URL map/canonical/redirect strategy verified;
- metadata/structured data/sitemap/robots/RSS verified;
- Analytics/Search Console continuity resolved or precisely blocked;
- AdSense/direct ads/ads.txt/app-ads.txt handled truthfully;
- PageSpeed/Web Vitals baseline recorded;
- no protected Newsroom data leaks into public analytics;
- no fabricated metrics.

### CP6 — AG-06 Newsroom Backend, Auth & Security

Exit requirements:

- server-backed staff identity/session/persistence;
- capability-based server authorization;
- Reporter publish denial and Commercial/editorial isolation proven with direct API tests;
- drafts/revisions/assignments/reviews/comments/audit persisted;
- session/account revocation proven;
- public cannot read draft/internal data;
- no privileged secrets exposed.

### CP7 — AG-07 Integrated Certification & Client UAT

Exit requirements:

- one integrated frozen staging candidate SHA;
- cross-lane reconciliation and full acceptance ledger;
- full relevant Chromium/UAT/security/API suite green;
- performance/accessibility/mobile/PWA checks complete;
- backup/rollback evidence verified;
- DNS/email worksheet complete;
- client UAT P0/P1 closed;
- technical/client readiness recommendation recorded;
- AG-07 does **not** grant production authorization.

### CP8 — AG-08 Production Cutover & Rollback

Status: **LOCKED**.

AG-08 may start only after:

- CP7 accepted;
- explicit owner production authorization;
- content freeze approved;
- current backups/exports verified;
- DNS/email worksheet approved;
- rollback values/triggers confirmed.

AG-08 executes final delta/import/deployment/DNS verification and monitored rollback protection.

## 10. Global taxonomy requirement

HealthTimes is being positioned as a global health publication with Africa as its strongest editorial authority. Migration must preserve WordPress taxonomy for provenance while mapping it into a controlled canonical structure.

Canonical dimensions should include geography, desks and normalized health topics. Do not expose all 10,238 legacy WordPress tags as the new public taxonomy without normalization.

## 11. URL/SEO principle

Every existing public WordPress URL is valuable until proven otherwise. Prefer preserving stable legacy article paths directly where technically reasonable. Hard gates include old-URL mapping, canonical continuity, redirect coverage, sitemap/robots/RSS correctness, structured data, Search Console continuity and 404 monitoring.

## 12. Analytics/monetization principle

Do not recreate Site Kit as a plugin imitation and do not merely paste Google snippets. Google services remain authoritative external sources while HealthTimes stores normalized, provenance-preserving reporting data for role-specific Intelligence dashboards.

Keep external integration configuration, secrets/OAuth, ingestion state, historical metrics, HealthTimes events, direct-ad metrics and AdSense metrics separate. Public analytics must not capture protected Newsroom/editorial activity.

## 13. Monetization continuity gates

- preserve verified AdSense publisher identity;
- serve valid `ads.txt` at HTTP 200;
- keep `app-ads.txt` limited to verified seller declarations;
- do not invent AdMob identifiers;
- keep HOSPAZ/direct campaigns distinct from AdSense;
- do not fabricate historical direct-ad performance;
- avoid ad-related layout shift.

## 14. Email/DNS principle

Email continuity is a hard release gate. Before web DNS cutover capture and approve all web and mail records, including apex/www, MX, SPF, DKIM, DMARC, TTLs, new targets and rollback values. AG-07 verifies the worksheet; only owner-unlocked AG-08 may execute production DNS changes.

## 15. Evidence and receipts

Each agent must leave a receipt containing start/end SHA, files changed, commands/tests, evidence, gates passed/failed, unresolved issues, next authorized checkpoint, and an explicit production-modification statement.

No agent may report a checkpoint complete with unexplained red tests.

## 16. Canonical order

```text
REC-01 Local Custody Recovery (only while custody blocker exists)
        ↓
AG-01 / CP1 Preparation Closure
        ↓
AG-02 / CP2 Staging Platform
        ↓
AG-03 / CP3 Source Capture
        ↓
┌──────────────────┬──────────────────┬──────────────────┐
│ AG-04 / CP4      │ AG-05 / CP5      │ AG-06 / CP6      │
│ Content / Media  │ SEO / Analytics  │ Newsroom / Auth  │
│ / Taxonomy       │ / Monetization   │ / Security       │
└──────────────────┴──────────────────┴──────────────────┘
        ↓
AG-07 / CP7 Integrated Certification + Client UAT
        ↓
EXPLICIT OWNER PRODUCTION AUTHORIZATION
        ↓
AG-08 / CP8 Production Cutover + Rollback
```

AG-04/05/06 may overlap only after prerequisites are green and schema/file ownership is coordinated.