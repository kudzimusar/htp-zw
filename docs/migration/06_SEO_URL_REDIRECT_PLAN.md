# SEO URL Redirect Plan

## Gate

SEO preservation is a hard migration gate. Production cannot cut over until legacy URL coverage is near-complete and unexplained internal broken links are resolved.

## Current WordPress URL Pattern

Observed article URLs are root-level slugs, for example:

- `/zika-mosquito-breeds-london-climate-change/`
- `/parliament-probes-natpharm-zimbabwe-medicine-supply-chain/`

The new frontend should support these historical paths directly wherever practical instead of forcing unnecessary new article URLs.

## Required Outputs

- `redirect-manifest.json`.
- Canonical URL map.
- Sitemap generation.
- RSS compatibility route.
- `robots.txt`.
- `ads.txt` and `app-ads.txt`.
- Open Graph and Twitter metadata.
- Schema.org `NewsArticle`, `Article`, `Organization`, `Person` and breadcrumb data.
- Automated HTTP validation for `robots.txt`, sitemap, `ads.txt`, `app-ads.txt`, canonical URLs and representative redirects.

## Current SEO/Ad Metadata To Preserve

- `max-image-preview:large` robots policy.
- Root post-name permalinks.
- WordPress shortlink provenance for source IDs.
- Canonical links matching legacy public URLs.
- Site Kit Google tag `GT-PLTTGPL`.
- AdSense publisher `pub-8744434739998394` / client `ca-pub-8744434739998394`.
- Current `ads.txt` seller line.
- `app-ads.txt` missing/404 state must be corrected before app ad monetization.

## Structured Data Validation

Representative migrated stories must emit server-rendered JSON-LD containing publisher, author, headline, canonical URL, publish date, modified date, image and article section. Validate `NewsArticle`, `Article`, `Person`, `Organization` and `BreadcrumbList` during staging rehearsal.

## Redirect Strategy

- Preserve article paths for published posts where possible.
- Redirect changed section/tag/archive paths with 301s.
- Keep `/feed/` RSS compatibility or publish a permanent equivalent.
- Keep old media redirects only as fallback after media migration.
- Do not redirect to the homepage for missing stories; exception-list them.

## Search Console

Before cutover, verify production domain, submit staging sitemap for validation where allowed, then submit production sitemap after DNS cutover and monitor coverage/indexing.
