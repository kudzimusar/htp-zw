# HealthTimes Migration Master Plan

Status: preparation only. Production migration is not executed by this package.

## Objective

Prepare HealthTimes Premium / HealthTimes 2.1 so client-supplied WordPress, hosting, DNS and business data can be migrated first into staging, then into production with reversible cutover controls.

## Guardrails

- Do not change live DNS.
- Do not modify or delete the live WordPress database.
- Do not import production data into the public repository.
- Do not commit credentials, customer records, private exports or payment data.
- All import operations must support dry run, restart, stable source IDs and exception reporting.

## Current Finding

The repository is a client-review static/PWA platform with a strong public publication, Premium preview UX and Newsroom OS frontend. It is not yet a production CMS/backend. GitHub Pages is suitable for demonstration, not for the final operational architecture.

## Migration Phases

1. Repository and source audit.
2. Client access request and data-handling setup.
3. Staging infrastructure build.
4. WordPress snapshot export and dry-run import.
5. Automated reconciliation: counts, authors, taxonomies, media, URLs, SEO, analytics, ads, monetization and rendering.
6. Editorial/business review of exceptions.
7. Production freeze and final incremental export.
8. Production import and smoke testing.
9. DNS cutover.
10. Post-launch monitoring with WordPress retained read-only for rollback.

## Prepared Assets

- `docs/migration/*` planning package.
- `scripts/migration/wordpress-importer.js` dry-run importer scaffold.
- `scripts/migration/wordpress-transform.js` transformation and exception helpers.
- `tests/migration/wordpress-transform.test.js` migration transformation tests.
- `supabase/migrations/20260909120000_healthtimes_migration_core.sql` production schema scaffold.

## Gates

Production migration may begin only after staging import is green, DNS/email records are verified, WordPress backups are restorable, all material source exceptions are triaged, and Newsroom backend authorization has server-side enforcement.

## Business Asset Lanes

The migration programme preserves four HealthTimes assets:

- Content: articles, pages, authors, media and taxonomy.
- Authority: URLs, SEO metadata, structured data, Search Console history, backlinks and citations.
- Audience: Analytics history, acquisition channels, country/region growth, engagement and subscriber signals.
- Revenue: AdSense identity/configuration, `ads.txt`, `app-ads.txt`, direct campaigns, HOSPAZ, WooCommerce history where relevant and Premium conversion.

Each lane is included in staging rehearsal and production cutover gates.
