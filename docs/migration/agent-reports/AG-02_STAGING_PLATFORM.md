# AG-02 — CP2 Staging Platform Receipt

## A. Repository branch and start/end SHA
- Repository: `kudzimusar/htp-zw`
- Accepted CP1 branch: `migration-preparation-2026-09-09`
- Accepted CP1 SHA: `d45034191cb3d34ccd0713e986ce8c1e6df8d4eb`
- AG-02 branch: `migration/ag-02-staging-platform`
- Branch created directly from accepted CP1 SHA: YES
- Scope: staging platform only; no AG-03/AG-04 migration work begun.

## B. Staging frontend/API
- Prepared architecture retained: GitHub source -> Vercel frontend/API runtime -> Supabase backend, with Cloudflare reserved for final DNS/CDN/WAF.
- Connected Vercel team available: `Eleven-11-Tech` (`team_InL2Jmsg4dbG0rFY8nxriTha`).
- Existing Vercel projects inspected: no HealthTimes/`htp-zw` project was present.
- The available deployment action is bound to a current project context and no safe action was available in this execution context to create/link a new Vercel project to `kudzimusar/htp-zw` without manufacturing a target.
- Temporary staging URL: NOT PROVISIONED.

REQUIRED TOOL/ENVIRONMENT: Vercel project/link target for `kudzimusar/htp-zw`
AVAILABLE: connected Vercel team and project/deployment inspection; existing unrelated projects only
WHY: CP2 requires a real independent staging deployment and URL; reusing an unrelated project would violate environment isolation
SAFE FALLBACK: create/link a dedicated HealthTimes staging Vercel project, then deploy this AG-02 branch with staging-only variables
CHECKPOINT IMPACT: BLOCKS CP2

## C. Staging Supabase project
- Connected Supabase account inspected.
- Only visible project: `Sessions Music` (`ennfiyxlkvlmtkmibltz`), region `ap-northeast-1`, organization `bqodusxkqsffqqpvlmur`.
- `Sessions Music` is unrelated to HealthTimes and was not modified or reused.
- No HealthTimes staging Supabase project was present.
- Creating a new Supabase project requires an explicit organization selection and cost confirmation. No HealthTimes organization choice was supplied in the AG-02 execution order, therefore no project was created by assumption.

REQUIRED TOOL/ENVIRONMENT: explicit Supabase organization selection for HealthTimes staging and cost confirmation
AVAILABLE: Supabase project creation capability; connected organization currently visible as `bqodusxkqsffqqpvlmur`
WHY: project creation must not assume billing/ownership organization; existing Sessions Music project is unrelated
SAFE FALLBACK: owner/moderator names the Supabase organization; then create dedicated `HealthTimes Staging` project in the selected region and continue zero-state apply
CHECKPOINT IMPACT: BLOCKS CP2

## D. Schema application — 5/5
The accepted CP1 branch contains exactly these five certified migration files:
1. `20260909000100_content_core.sql`
2. `20260909000200_taxonomy_and_geo.sql`
3. `20260909000300_redirects_and_seo.sql`
4. `20260909000400_analytics_and_ads.sql`
5. `20260909000500_migration_runs_and_checkpoints.sql`

CP1 evidence records a disposable from-zero result of 5/5 applied, 0 errors, no hidden/manual SQL. AG-02 did not rename, consolidate, recreate or redesign those migrations.

CP2 staging result: NOT RUN because a dedicated HealthTimes staging database has not yet been provisioned. CP1 evidence is not substituted for the required staging execution.

## E. Auth baseline
- Target remains Supabase Auth with separate reader/staff identity surfaces, session revocation, verification/reset flow and MFA readiness.
- Server-side authorization must remain capability-based; browser state cannot be final authority for `story.publish`, Premium, staff or commercial privileges.
- Real staging Auth tenant: NOT PROVISIONED because the staging Supabase project is blocked above.

## F. Storage baseline
Required staging boundaries remain:
- public migrated editorial media;
- private/internal Newsroom source material;
- provenance-safe object naming tied to source IDs/checksums;
- no full WordPress upload archive during AG-02.

Real staging buckets/policies: NOT PROVISIONED because the staging Supabase project is blocked above.

## G. Secrets/security
- CP1 secrets audit is recorded clean.
- No Supabase service-role key, DB credential, Google credential, Resend key, Cloudflare token, WordPress credential or production secret was added by AG-02.
- Existing unrelated Supabase/Vercel projects were not repurposed.
- Production credentials were not placed in Git or frontend code.

## H. Backup/restore evidence
- Prepared policy remains Supabase PITR or scheduled logical database backup, object/media manifest/version strategy, and Vercel deployment rollback.
- Actual staging backup/restore test: NOT RUN because no HealthTimes staging database/storage exists yet.
- CP2 cannot treat a documented procedure as an executed restore test.

## I. Observability/health
Planned staging checks:
- frontend reachability;
- API/database reachability;
- Auth initialization;
- Storage reachability;
- application/API critical-error logging;
- Vercel deployment/runtime monitoring;
- Supabase logs/advisors after schema apply.

Actual staging health/observability activation: NOT RUN because the required staging services are not yet provisioned.

## J. Email sandbox status
- Target remains Resend or another justified transactional provider using sandbox/test configuration.
- No production subscriber mail sent.
- No live MX/SPF/DKIM/DMARC modified.
- Sandbox sender: NOT CONFIGURED in this execution because the core staging environment is not yet provisioned and no sender-domain DNS mutation is authorised.

## K. Smoke-test results
Repository baseline evidence from accepted CP1:
- `npm run test:migration`: 5 passed.
- Full Chromium UAT: 31/31 passed after accepted CP1 remediation.
- From-zero disposable local schema: 5/5 migrations, 0 errors, no hidden/manual SQL.

Required CP2 staging smoke tests were NOT run because there is no HealthTimes staging URL/database/Auth/Storage yet. Specifically unverified at staging level:
- desktop public site;
- mobile public site;
- article/reader surfaces;
- PWA manifest/service worker;
- Newsroom entry;
- database connectivity;
- Auth connectivity;
- Storage connectivity;
- `/ads.txt`;
- `/app-ads.txt`.

## L. Cost categories
### Compulsory / launch
- frontend/API hosting (Vercel or equivalent);
- managed Postgres/Auth/Storage (Supabase);
- backup/recovery capability;
- transactional email baseline if account workflows send mail;
- DNS/CDN/WAF at production cutover (Cloudflare or equivalent).

### Optional / scale-dependent
- enhanced error monitoring/observability;
- higher email volume/dedicated sender capabilities;
- higher database compute/PITR tier;
- advanced WAF/bot management;
- paid image transformation/CDN;
- paid citation/backlink providers;
- additional AI services.

### Usage-sensitive
- database compute/storage/egress;
- object storage/egress/image transformation;
- serverless invocation/runtime usage;
- email volume;
- monitoring event volume;
- analytics/third-party ingestion API usage.

No exact provider price is asserted in this receipt because account/region/tier selection has not yet been finalised.

## M. Remaining blockers
1. Explicit Supabase organization selection and cost confirmation for a dedicated HealthTimes staging project.
2. Dedicated Vercel HealthTimes staging project/link target and deployment capability for `kudzimusar/htp-zw`.
3. Once provisioned: apply the accepted five migrations to the new staging DB and record 5/5 evidence.
4. Configure Auth and public/private Storage boundaries.
5. Configure staging environment variables/secrets outside Git.
6. Activate health/observability and run security advisors after DDL.
7. Perform backup/restore drill.
8. Configure sandbox transactional email if available without live DNS change.
9. Run staging smoke/UAT, including `/ads.txt`, `/app-ads.txt`, PWA, Newsroom, DB/Auth/Storage and responsive public surfaces.

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
- AG-03 begun: NO
- AG-04 begun: NO

CP2 NOT READY — AG-03 remains blocked
