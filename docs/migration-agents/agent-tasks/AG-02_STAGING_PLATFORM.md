# AG-02 — Staging Platform & Production Architecture

## Mission

Provision and prove a production-style HealthTimes staging platform without touching the live WordPress estate or live HealthTimes DNS.

## Prerequisite

AG-01 CP1 must be accepted.

## Mandatory reads

- master programme and agent register
- `docs/migration/03_TARGET_PRODUCTION_ARCHITECTURE.md`
- `docs/migration/04_DATA_MODEL_AND_MAPPING.md`
- `docs/migration/07_NEWSROOM_BACKEND_AUTH_PLAN.md`
- `docs/migration/08_HOSTING_ENVIRONMENTS_DNS.md`
- `docs/migration/10_STAGING_REHEARSAL_RUNBOOK.md`

## Required work

1. Re-evaluate the prepared Vercel + Supabase + Cloudflare + transactional-email recommendation against the actual repo. Keep it unless evidence supports a better fit.
2. Provision a staging-only frontend/API environment.
3. Provision a staging-only Postgres/Auth/Storage environment.
4. Apply all migration/schema files from zero.
5. Establish staging environment variables and secrets outside source control.
6. Configure least-privilege server credentials; never expose service-role/database secrets to browser code.
7. Connect Newsroom server-side identity/session baseline required by AG-06, or leave a clearly documented interface if AG-06 owns final implementation.
8. Configure staging media/object storage and public/private bucket policy.
9. Configure transactional email sandbox/staging sender if available. Do not send production subscriber mail.
10. Configure observability/error reporting and basic health checks.
11. Establish backup policy and perform at least one staging backup/restore verification or documented provider restore drill if direct restore is not available yet.
12. Deploy the current public HealthTimes application against staging infrastructure while preserving client-facing design.
13. Provide a temporary staging URL that does not require changing `healthtimes.co.zw` DNS.
14. Run smoke tests for public pages, PWA/service worker, Newsroom entry, database/API health and storage.
15. Record low/medium traffic cost assumptions and which services are compulsory vs optional.
16. Create `docs/migration/agent-reports/AG-02_STAGING_PLATFORM.md`.

## Architecture constraints

- GitHub remains code source of truth.
- Staging and production must be separate.
- Production credentials must not be reused in staging unless unavoidable and explicitly documented.
- Public article rendering must support strong SEO; prefer server-rendered/static-generated production routes rather than depending on client-side-only article assembly.
- Existing visual design should remain intact even if rendering/routing implementation changes.

## Acceptance gates

- staging frontend/API online;
- staging DB/Auth/Storage online;
- schema applies cleanly;
- secrets are not committed or browser-exposed;
- backup/restore path documented and tested as far as provider capabilities permit;
- health checks/observability active;
- public app smoke test green;
- staging is independent of production WordPress and production DNS;
- no production data has been imported.

## Stop conditions

STOP if provisioning requires modifying the live domain, live MX/email records, live WordPress database, or using production secrets in source control.

## Receipt

Report:
- branch/SHA;
- services provisioned;
- staging URLs/identifiers excluding secrets;
- schema version;
- backup result;
- smoke-test result;
- monthly cost categories;
- unresolved architecture issues;
- `Production systems modified: NO`.
