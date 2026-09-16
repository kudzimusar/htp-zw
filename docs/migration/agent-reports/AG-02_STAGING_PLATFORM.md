# AG-02 — CP2 Staging Platform Receipt

## A. Repository branch and baseline
- Repository: `kudzimusar/htp-zw`
- Accepted CP1 branch: `migration-preparation-2026-09-09`
- Accepted CP1 SHA: `d45034191cb3d34ccd0713e986ce8c1e6df8d4eb`
- AG-02 branch: `migration/ag-02-staging-platform`
- AG-02 pre-closure SHA: `421301219b53e8ef0959af8099ffc4a0484d8455`
- Scope remained bounded to staging platform hardening and certification; AG-03/AG-04 were not begun.

## B. Provisioned staging platform
### Supabase
- Organization: `11-11 Tech`
- Organization ID: `uhebxpciagmubnprogej`
- Project: `HealthTimes Staging`
- Project ref: `gcdohgbmqhqwydgaxrcr`
- Region: `ap-northeast-1`
- PostgreSQL: `17.6.1.166`
- Live status independently reverified at CP2 closure: `ACTIVE_HEALTHY`

### Vercel
- Team: `Eleven-11-Tech`
- Project: `healthtimes-staging`
- Project ID: `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`
- Primary staging URL: `https://healthtimes-staging.vercel.app`
- GitHub linkage: `kudzimusar/htp-zw`
- Branch: `migration/ag-02-staging-platform`

No `healthtimes.co.zw` DNS change was required for staging.

## C. Original CP1 schema application — 5/5
The original five accepted migrations were applied to staging exactly as certified:
1. `20260909000100_content_core.sql`
2. `20260909000200_taxonomy_and_geo.sql`
3. `20260909000300_redirects_and_seo.sql`
4. `20260909000400_analytics_and_ads.sql`
5. `20260909000500_migration_runs_and_checkpoints.sql`

Result:
- `5/5 applied`
- `0 errors`
- `manual SQL: NO`

AG-02 did not edit, rewrite, consolidate, rename or redesign those five migrations.

## D. AG-02 staging security baseline migration
A new forward migration was added and applied without changing the five CP1 migrations:

`20260916030642_ag02_staging_security_baseline.sql`

Purpose:
- enable RLS on all 36 application tables in `public`;
- establish deny-by-default access until AG-06 introduces final capability policies;
- remove generic authenticated write/delete access from public migrated media;
- remove generic authenticated read/write/delete access from private Newsroom storage.

Live and restored migration history both record:
1. `20260909000100 content_core`
2. `20260909000200 taxonomy_and_geo`
3. `20260909000300 redirects_and_seo`
4. `20260909000400 analytics_and_ads`
5. `20260909000500 migration_runs_and_checkpoints`
6. `20260916030642 ag02_staging_security_baseline`

Repository filename matches the actual applied migration version, so no migration-history drift remains.

## E. RLS result and security advisor
Live closure verification:
- public application tables: `36`
- RLS enabled: `36`
- RLS disabled: `0`

Required security outcome:
- `rls_disabled_in_public: 0`

Supabase Security Advisor no longer reports `rls_disabled_in_public` errors.

It reports `rls_enabled_no_policy` findings at `INFO`. This is intentional for the AG-02 deny-by-default baseline: no anon/authenticated policies are created on application tables until AG-06 implements verified role/capability access. The absence of client policies denies client-role access while service-role/server-side operations remain available where appropriate.

## F. Storage baseline
Buckets:
- `migrated-media` — public
- `newsroom-private` — private

Post-hardening policies:
- `migrated_media_public_read`: public `SELECT` on `migrated-media` only.
- generic authenticated insert/update/delete on `migrated-media`: REMOVED.
- generic authenticated read/insert/update/delete on `newsroom-private`: REMOVED.

Interim least-privilege result:
- public migrated media may be read publicly;
- public media mutation is server/service-role only;
- private Newsroom material is server/service-role only;
- AG-06 retains ownership of final staff capability/RBAC policies.

Storage currently contains `0` objects. No full WordPress media archive has been uploaded.

## G. Auth/data isolation
Live closure counts:
- `auth.users = 0`
- `public.stories = 0`
- `public.subscribers = 0`
- `public.legacy_sources = 0`
- `storage.objects = 0`

Therefore:
- no WordPress content has been imported;
- no subscriber/customer data has been imported;
- no staging user accounts have been created;
- no migrated media objects have been uploaded.

The existing Newsroom demo remains frontend/local-state UX; real production-grade Auth/RBAC implementation is owned by AG-06. The staging backend boundary is deny-by-default rather than client-authoritative.

## H. Secrets/security boundary
Verified boundaries:
- no AG-02 migration contains a Supabase service-role key or database credential;
- checked public application JavaScript contains no `service_role` token/reference;
- service-role credentials remain server-only and are not intentionally exposed as `NEXT_PUBLIC`/browser configuration;
- no production or staging privileged credential was added to Git by AG-02.

Browser-safe Supabase URL/publishable identifiers may be public by design; privileged service-role/database credentials may not.

## I. Backup and restore — PASS
Work completed and supplied a full restore drill, which was independently reconciled against live staging state and migration history.

### Backup artifacts
Original pre-hardening dump:
- path: `/tmp/staging_db_backup.sql`
- command: `supabase db dump --project-ref gcdohgbmqhqwydgaxrcr -f /tmp/staging_db_backup.sql`
- created: `2026-09-16 11:52:20 JST`
- size: `46,095 bytes`
- MD5: `fd72018ad229a2dd300a0244f067a4fd`
- scope: certified 5/5 CP1 schema before AG-02 security hardening.

Fresh post-hardening dump:
- path: `/tmp/fresh_staging_backup.sql`
- command: `supabase db dump --project-ref gcdohgbmqhqwydgaxrcr -f /tmp/fresh_staging_backup.sql`
- created: `2026-09-16 12:46:49 JST`
- size: `48,464 bytes`
- MD5: `4e1b2a97bd00b62943e4fe4f73160099`
- scope: current staging state including the five CP1 migrations and `20260916030642_ag02_staging_security_baseline`.

### Disposable restore environment
- image: `public.ecr.aws/supabase/postgres:17.6.1.167`
- port: `54322`
- database: `disposable_restore_drill`
- zero-state public tables before restore: `0`
- environment isolated from cloud Supabase and production networks.

### Restore execution
Original dump:
- command: `psql -U postgres -d disposable_restore_drill -v ON_ERROR_STOP=1 < /tmp/staging_db_backup.sql`
- exit code: `0`
- errors: `0`
- warnings: none
- duration: `0.598s`

Fresh post-hardening dump:
- command: `psql -U postgres -d disposable_restore_drill -v ON_ERROR_STOP=1 < /tmp/fresh_staging_backup.sql`
- exit code: `0`
- errors: `0`
- warnings: none
- duration: `0.419s`

### Restore verification
- public application tables restored: `36/36`
- post-hardening restored RLS enabled: `36/36`
- migration-history rows: `6`, matching live staging exactly
- pre-hardening dump correctly restored CP1 baseline with RLS `0/36`
- post-hardening dump correctly restored AG-02 baseline with RLS `36/36`
- source staging overwritten: `NO`
- production database used: `NO`
- disposable restore database dropped after verification
- local Supabase/Docker runtime stopped after verification
- backup files were not committed to Git

PITR is not claimed; staging Free tier PITR is disabled.

Backup/restore gate: **PASS**.

## J. Performance advisor disposition
Current Performance Advisor findings:
- 27 unindexed foreign keys — `INFO`
- 8 unused indexes — `INFO`

Disposition:
- no indexes were removed;
- unused-index findings are retained because this is a new, zero-traffic staging database;
- 27 FK indexes are deferred to AG-04/AG-07 performance/reconciliation evidence unless import/query workload demonstrates a specific bottleneck;
- no speculative index churn was introduced during CP2 closure.

## K. Vercel deployment and health
The original Work deployment at checkpoint SHA `4512b7d...` was `READY` but recorded `gitDirty: 1`.

Subsequent Git-triggered deployments are clean and carry no `gitDirty` metadata.

The Git-triggered deployment for pre-closure SHA:

`421301219b53e8ef0959af8099ffc4a0484d8455`

was independently reverified as:
- state: `READY`
- source: `git`
- GitHub branch: `migration/ag-02-staging-platform`
- GitHub commit SHA: `421301219b53e8ef0959af8099ffc4a0484d8455`
- alias error: none

The final CP2 closure documentation commit must also receive a Git-triggered `READY` deployment before CP2 acceptance is issued.

Runtime log check over the previous 24 hours during hardening:
- warning/error/fatal entries: `0`

## L. Staging smoke checks
HTTP-level checks against `https://healthtimes-staging.vercel.app`:
- homepage: HTTP 200
- article/reader entry (`/article.html`): HTTP 200
- Newsroom entry (`/newsroom.html`): HTTP 200
- PWA manifest (`/site.webmanifest`): HTTP 200
- service worker (`/sw.js`): HTTP 200
- `/ads.txt`: HTTP 200, `text/plain`, certified HealthTimes Google seller record
- `/app-ads.txt`: HTTP 200, `text/plain`, certified HealthTimes Google seller record

Backend checks:
- database connectivity: PASS
- Supabase project health: ACTIVE_HEALTHY
- RLS state: PASS, `36/36`
- Auth schema reachable: PASS
- Auth user count: `0`
- Storage buckets reachable: PASS
- Storage least-privilege policies: PASS
- migration history: PASS, six expected migrations

Responsive/browser baseline:
- accepted CP1 Chromium UAT remains `31/31` green;
- AG-02 changed no frontend product files, only staging security migration/evidence;
- staging HTTP surfaces were independently rechecked during CP2 hardening.

## M. Transactional email
Status: `PENDING`.

This remains explicitly non-blocking for CP2 because completing a real sender requires additional email/DNS work.

No changes were made to:
- MX
- SPF
- DKIM
- DMARC

No production subscriber email was sent.

## N. Production safety
- Production systems modified: NO
- Production WordPress modified: NO
- Production DNS modified: NO
- Production email DNS modified: NO
- Production subscriber/customer data imported: NO
- WordPress database imported: NO
- Full `wp-content/uploads` archive uploaded: NO
- Historical GA4/Search Console/AdSense metrics imported: NO
- Production Google services modified: NO
- Production secrets committed: NO
- Sessions Music Supabase project modified: NO
- AG-03 begun: NO
- AG-04 begun: NO

## O. CP2 closure
All infrastructure, schema, RLS, Storage, backup/restore, deployment, health and staging-isolation gates are closed subject only to verifying the Git-triggered deployment for this final closure-documentation commit reaches `READY`.
