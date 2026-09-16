# AG-02 — CP2 Staging Platform Receipt

## A. Repository branch and baseline
- Repository: `kudzimusar/htp-zw`
- Accepted CP1 branch: `migration-preparation-2026-09-09`
- Accepted CP1 SHA: `d45034191cb3d34ccd0713e986ce8c1e6df8d4eb`
- AG-02 branch: `migration/ag-02-staging-platform`
- AG-02 checkpoint before hardening: `4512b7d647eda850ec1e70ad440d459fbd1d82d0`
- Scope remains bounded to staging platform hardening; AG-03/AG-04 have not begun.

## B. Provisioned staging platform
### Supabase
- Organization: `11-11 Tech`
- Organization ID: `uhebxpciagmubnprogej`
- Project: `HealthTimes Staging`
- Project ref: `gcdohgbmqhqwydgaxrcr`
- Region: `ap-northeast-1`
- Status verified by Work before final hardening: `ACTIVE_HEALTHY`

### Vercel
- Team: `Eleven-11-Tech`
- Project: `healthtimes-staging`
- Project ID: `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`
- Primary staging URL: `https://healthtimes-staging.vercel.app`
- GitHub linkage: `kudzimusar/htp-zw`
- Branch: `migration/ag-02-staging-platform`

No `healthtimes.co.zw` DNS change is required for staging.

## C. Original CP1 schema application — 5/5
Work verified the original five accepted migrations were applied to staging exactly as certified:
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

Supabase migration history records:
- `20260916030642 ag02_staging_security_baseline`

Repository filename was aligned to the actual applied migration version to avoid migration-history drift.

## E. RLS result and security advisor
Live database verification after the AG-02 migration:
- public application tables: `36`
- RLS enabled: `36`
- RLS disabled: `0`

Required security defect result:
- `rls_disabled_in_public: 0`

Supabase Security Advisor no longer reports `rls_disabled_in_public` errors.

It reports 36 `rls_enabled_no_policy` findings at `INFO`. This is intentional for the AG-02 deny-by-default baseline: no anon/authenticated policies are created on application tables until AG-06 implements verified role/capability access. The absence of policies denies client-role access while service-role/server-side operations remain available where appropriate.

Advisor reference: `https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy`

## F. Storage baseline
Existing buckets were preserved:
- `migrated-media` — public
- `newsroom-private` — private

Post-hardening Storage policies:
- `migrated_media_public_read`: public `SELECT` on `migrated-media` only.
- generic authenticated insert/update/delete on `migrated-media`: REMOVED.
- generic authenticated read/insert/update/delete on `newsroom-private`: REMOVED.

Interim result:
- public migrated media can be read publicly;
- public media mutation is server/service-role only;
- private Newsroom material is server/service-role only;
- AG-06 retains ownership of final staff capability/RBAC policies.

Storage currently contains `0` objects. No full WordPress media archive has been uploaded.

## G. Auth/data isolation
Live staging counts after hardening:
- `auth.users = 0`
- `public.stories = 0`
- `public.subscribers = 0`
- `public.legacy_sources = 0`
- `storage.objects = 0`

Therefore:
- no WordPress content has been imported;
- no subscriber/customer data has been imported;
- no staging user accounts have been created.

The existing Newsroom demo remains frontend/local-state UX; real production-grade Auth/RBAC implementation is owned by AG-06. The staging backend boundary is now deny-by-default rather than client-authoritative.

## H. Secrets/security boundary
Verified boundaries:
- no AG-02 migration contains a Supabase service-role key or database credential;
- the checked public application JavaScript contains no `service_role` token/reference;
- the service-role credential remains server-only and is not intentionally exposed as `NEXT_PUBLIC`/browser configuration;
- CP1 secret hygiene remains the baseline for unchanged product code;
- no production or staging privileged credential was added to Git by AG-02.

Browser-safe Supabase URL/publishable identifiers may be public by design; privileged service-role/database credentials may not.

## I. Backup and restore
Work created a logical staging database dump with:

`supabase db dump --project-ref gcdohgbmqhqwydgaxrcr`

This proves backup extraction, but a dump alone is not a restore test.

Required restore drill status: **NOT YET CERTIFIED** in this execution context.

Reason:
- the Work-created dump file/path is not exposed to this chat runtime or connected file resources;
- the available Supabase connector has no backup-download/restore-to-local operation;
- no evidence was manufactured by replaying migrations and calling that a dump restore.

Required remaining recovery action:
1. restore the exact Work-produced dump into a disposable local Supabase/Postgres instance;
2. verify restore exits without error;
3. verify 36 application tables exist;
4. verify migration history contains the five CP1 migrations plus the AG-02 security baseline where the restored backup was taken after hardening, or the expected five where it predates hardening;
5. verify the source staging database was not overwritten.

PITR is not claimed; staging Free tier PITR is disabled.

## J. Performance advisor disposition
Current Performance Advisor findings:
- 27 unindexed foreign keys — `INFO`
- 8 unused indexes — `INFO`

Disposition:
- no indexes were removed;
- "unused" indexes are retained because this is a brand-new, zero-traffic staging database and usage counters are not meaningful yet;
- the 27 FK indexes are deferred to AG-04/AG-07 performance/reconciliation evidence unless an import/query path demonstrates a specific bottleneck;
- adding all 27 blindly before rehearsal would create schema churn without workload evidence.

Advisor references:
- `https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys`
- `https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index`

## K. Vercel deployment and health
The original Work deployment was `READY` but recorded checkpoint SHA `4512b7d...` with `gitDirty: 1`.

After AG-02 hardening commits, Git-triggered deployments are being produced from the clean committed branch. A clean deployment was observed for commit `62a465ce1ece102d556e9393a17743db7a7abfc8` with:
- source: `git`
- state: `READY`
- branch alias: `healthtimes-staging-git-migration-ag-02-staging-platform-11-11.vercel.app`
- no `gitDirty` metadata.

The final documentation commit must likewise produce a Git-triggered deployment whose `githubCommitSha` equals the final AG-02 branch SHA before CP2 can be accepted.

Runtime log check over the last 24 hours:
- warning/error/fatal entries: `0`

## L. Staging smoke checks
HTTP-level checks against `https://healthtimes-staging.vercel.app`:
- homepage: HTTP 200
- article/reader entry (`/article.html`): HTTP 200
- Newsroom entry (`/newsroom.html`): HTTP 200
- PWA manifest (`/site.webmanifest`): HTTP 200, `application/manifest+json`
- service worker (`/sw.js`): HTTP 200, JavaScript
- `/ads.txt`: HTTP 200, `text/plain`, certified HealthTimes Google seller record
- `/app-ads.txt`: HTTP 200, `text/plain`, certified HealthTimes Google seller record

Database/Auth/Storage checks:
- database reachable: PASS
- RLS state query: PASS
- Auth schema reachable; user count: `0`
- Storage buckets reachable: PASS
- Storage policies reconciled: PASS

Responsive/browser baseline:
- accepted CP1 Chromium UAT remains `31/31` green;
- no frontend product files were changed by AG-02 hardening, only the staging security migration and evidence report;
- this execution runtime did not expose a fresh viewport-controlled browser run against the remote Vercel URL, so CP2 does not claim a new desktop/mobile Playwright run beyond the accepted CP1 responsive baseline and live HTTP checks.

## M. Transactional email
Status: `PENDING`.

This is explicitly non-blocking for CP2 under the moderator order because completing a real sender would require additional email/DNS work.

No changes were made to:
- MX
- SPF
- DKIM
- DMARC

No production subscriber email was sent.

## N. Production safety
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

## O. CP2 decision
All live staging security and deployment hardening gates are materially closed except the required backup restore drill. The exact Work-produced logical dump is not accessible to this execution runtime, so the restore cannot be honestly certified here.

CP2 NOT READY — AG-03 remains blocked
