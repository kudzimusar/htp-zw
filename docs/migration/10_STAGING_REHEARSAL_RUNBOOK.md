# Staging Rehearsal Runbook

## Inputs

- WordPress REST snapshot, admin settings capture, WXR/WP-CLI export and/or database export.
- Media archive.
- Plugin/theme inventory.
- DNS/email worksheet.
- Google Analytics, Search Console, AdSense and PageSpeed access or exports.
- Ad Inserter export and current `ads.txt`.
- WooCommerce/subscriber/payment exports where relevant.

## Source Capture Commands

Run the stable read-only WordPress admin capture to preserve settings and Google/Site Kit identifiers:

```bash
WP_USER=... WP_PASS=... npm run migration:wp-admin-capture -- --wxr none --timeout-ms 8000
```

The script writes to `migration-output/`, which is ignored by Git. It redacts OAuth access tokens and email addresses from saved admin HTML. Do not commit captured admin HTML, WXR/XML, database dumps or media archives.

The live WordPress admin WXR export path stalled during automated capture. Treat admin WXR as optional. Prefer hosting/WP-CLI/cPanel/phpMyAdmin exports for the authoritative staging snapshot.

## Steps

1. Provision staging frontend, API, database and object storage.
2. Apply database schema migrations.
3. Run REST inventory: `node scripts/migration/wordpress-importer.js --mode rest-inventory --out-dir migration-output`.
4. Run read-only WordPress admin capture for source settings/Site Kit/ad configuration.
5. Run dry import sample: `node scripts/migration/wordpress-importer.js --mode rest --limit 100 --out-dir migration-output`.
6. Run full dry import in staging only from the best available source: REST for public rehearsal, then database/WP-CLI/WXR export for authoritative rehearsal.
7. Upload media to staging storage and generate media manifest.
8. Generate redirect manifest and sitemap.
9. Render representative migrated stories.
10. Run reconciliation checks.
11. Import historical aggregate Analytics/Search Console/AdSense/PageSpeed data if available.
12. Validate `ads.txt`, `app-ads.txt`, canonical metadata, structured data and ad placement layout.
13. Review exception report with HealthTimes.

## Automated Comparisons

- Published article count.
- Page count.
- Author mapping.
- Category/tag mapping.
- Published and modified dates.
- Featured and inline images.
- Internal links.
- SEO title/description/canonical.
- Premium/access states.
- Advertising material.
- Legacy URL coverage.
- GA/Search Console/AdSense/PageSpeed metric provenance.
- GA4 continuity identifiers: account `137814020`, property `359235319`, stream `4756168788`, measurement ID `G-S39LN2KX4X`.
- Search Console property `https://healthtimes.co.zw/`.
- `ads.txt` and `app-ads.txt` HTTP 200 validation.
- Direct campaign and AdSense placement separation.

## Quality Checks

- Playwright public smoke tests.
- Newsroom RBAC tests.
- Mobile/tablet/desktop responsive checks.
- Accessibility checks for migrated article templates.
- Broken-link scan.
- Performance check on representative heavy articles.
- PageSpeed/Web Vitals baseline.
- Public analytics event smoke test without private Newsroom data.
- AdSense layout-shift check.
