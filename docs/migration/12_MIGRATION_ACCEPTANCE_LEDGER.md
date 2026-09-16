# Migration Acceptance Ledger

| Gate | Status | Evidence |
| --- | --- | --- |
| Repository inspected | Prepared | README, docs, source and tests reviewed |
| Baseline Chromium UAT run | Partial | 23 passed, 3 pre-existing failures |
| WordPress public inventory | Prepared | REST counts, sitemap, RSS, robots, DNS |
| Production architecture chosen | Prepared | Vercel + Supabase + Cloudflare recommendation |
| Production schema scaffold | Prepared | Supabase migration added |
| Idempotent provenance model | Prepared | `legacy_sources.stable_key` and importer checksum |
| REST importer dry run | Prepared | `scripts/migration/wordpress-importer.js` |
| WXR/database ingestion | Scaffolded | Mode placeholders and mapping plan |
| Media migration plan | Prepared | Manifest and storage plan |
| SEO/redirect plan | Prepared | Preserve legacy root slugs where practical |
| Newsroom backend/auth plan | Prepared | Server-side capability enforcement plan |
| Client access request | Prepared | Access request document added |
| Staging rehearsal runbook | Prepared | Runbook added |
| Production cutover runbook | Prepared | Runbook added, not executed |
| Rollback runbook | Prepared | Runbook added |
| Migration transform tests | Prepared | Playwright test file added |
| Analytics/SEO/monetization lane | Prepared | Dedicated document 13 plus schema extensions |
| ads.txt scaffold | Prepared | Confirmed publisher identity added and tested |
| app-ads.txt scaffold | Prepared | Future app monetization file added and tested |
| Final full UAT | Pending | Run after migration prep changes |

## Minimum Production Gates

- All expected published articles accounted for.
- All authors mapped.
- Taxonomies mapped or exception-listed.
- Required media accounted for.
- No unexplained broken internal links.
- Near-complete legacy URL coverage.
- Metadata/SEO verified.
- No Newsroom privilege escalation.
- No public exposure of drafts/internal data.
- No secrets committed.
- Backups tested.
- Restore procedure documented.
- Chromium UAT green or pre-existing failures explicitly accepted.
- Mobile/PWA/public smoke testing green.

## Analytics, SEO, Audience And Revenue Gates

- Existing Google Analytics continuity verified.
- Search Console property verified.
- Production pages emit expected analytics pageviews.
- Canonical URLs verified.
- Structured data passes validation.
- Sitemap accepted.
- `robots.txt` correct.
- `ads.txt` returns HTTP 200 and correct publisher identity.
- `app-ads.txt` returns HTTP 200 before app monetization.
- AdSense placements render without layout shift.
- Direct ads are distinguished from AdSense.
- Analytics do not capture protected Newsroom data.
- PageSpeed baseline recorded.
- No monetization secrets exist in client JavaScript.
- Historical imported metrics retain provenance.
- Global country reporting becomes available after integration.
