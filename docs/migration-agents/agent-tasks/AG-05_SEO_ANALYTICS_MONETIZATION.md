# AG-05 — SEO, Authority, Analytics & Monetization Continuity

## Mission

Preserve HealthTimes search equity, analytics continuity, audience intelligence and monetization infrastructure during staging migration.

## Prerequisites

- AG-02 staging platform accepted.
- AG-03 Google/integration/source access resolved as far as possible.
- AG-04 may run in parallel only if URL/content ownership boundaries are coordinated.

## Mandatory reads

- master programme and agent register
- `docs/migration/06_SEO_URL_REDIRECT_PLAN.md`
- `docs/migration/13_ANALYTICS_SEO_MONETIZATION_INVENTORY.md`
- AG-03 integration inventory

## Required work — SEO and authority

1. Inventory WordPress permalink patterns and every migrated public URL.
2. Prefer serving stable legacy article paths directly in production when technically reasonable.
3. Produce explicit old-URL -> new-URL mapping and rule-based redirect manifests with exception handling.
4. Preserve/map SEO title, meta description, canonical URL, Open Graph metadata, index/noindex and legacy URL provenance.
5. Detect and map Yoast/RankMath/other SEO plugin metadata if present; do not silently drop it.
6. Implement/test server-rendered structured data for appropriate `NewsArticle`, `Article`, `Person`, `Organization` and `BreadcrumbList` entities.
7. Generate/verify sitemap, robots.txt and RSS/feed strategy.
8. Prepare 404 monitoring and Search Console post-cutover verification.

## Required work — Analytics and audience

9. Resolve the GA4 property/stream/measurement identity associated with public Google tag `GT-PLTTGPL`; do not assume the tag is the property identity.
10. Prefer continuity of the existing HealthTimes Analytics property where ownership/architecture permit.
11. Implement/document versioned public events including article depth/completion, listen, save/share/WhatsApp, search, citation/reference, Premium preview/lock/conversion, newsletter and push events.
12. Do not send protected Newsroom/editorial activity into public analytics without a separate approved internal-analytics design.
13. Build server-side ingestion/checkpoint support for Analytics aggregates where available.
14. Import useful historical aggregate metrics where APIs/exports permit and retain source/property/date/import provenance.
15. Build Search Console ingestion for page/query/date/country/device/search appearance/clicks/impressions/CTR/position.
16. Verify global country/region reporting can be supported after integration.

## Required work — AdSense/direct ads

17. Verify AdSense publisher/account mapping for `pub-8744434739998394` / `ca-pub-8744434739998394` and known slot `7971959240`.
18. Do not recreate WordPress Ad Inserter as arbitrary snippets inside migrated body HTML. Use the new placement abstraction.
19. Preserve direct HOSPAZ-style campaigns separately from AdSense inventory.
20. Verify production/staging `ads.txt` strategy against actual authorized seller records.
21. Verify `app-ads.txt` serves HTTP 200 in staging/readiness, but include only verified seller declarations; do not invent AdMob configuration.
22. Design/import AdSense aggregate metrics where reporting APIs allow: impressions, clicks, estimated earnings, RPM, CPC, viewability as available.
23. Keep Google metrics separate from HealthTimes direct-ad `ad_impression` / `ad_click` event data.

## Required work — performance/citations

24. Establish PageSpeed/Core Web Vitals staging baseline for mobile and desktop: LCP, INP, CLS and available performance scoring.
25. Check ad placements and migrated media for layout shift/performance regressions.
26. Prepare citation/backlink/reference ingestion model and empty-state dashboards; do not claim external coverage before a provider/data source exists.
27. Classify Google Ads as active/incomplete/legacy based on evidence; it must not block migration unless client confirms commercial use.
28. Determine WooCommerce's historical commercial role and preserve only required financial/subscriber records according to plan.
29. Create `docs/migration/agent-reports/AG-05_SEO_ANALYTICS_MONETIZATION.md`.

## Acceptance gates

- legacy URL map covers all migrated public URLs or explicit exceptions;
- canonical/meta/structured data verified on staging;
- sitemap/robots/RSS verified;
- GA property continuity decision recorded;
- Search Console property verified or blocker recorded;
- imported historical metrics retain provenance;
- `ads.txt` HTTP 200 and verified seller identity in staging/readiness;
- `app-ads.txt` HTTP 200 before app monetization, with verified content only;
- direct ads and AdSense are separate;
- no analytics secrets in frontend/Git;
- no protected Newsroom data leaking to public analytics;
- PageSpeed baseline recorded;
- no fabricated audience/revenue/citation metrics.

## Stop conditions

STOP if continuity would require guessing property IDs, seller IDs, historical metrics or violating Google/client access scope.

## Receipt

Report:
- URL coverage;
- metadata/structured-data status;
- GA/Search Console identities;
- historical import range/limitations;
- AdSense/ads.txt/app-ads.txt status;
- direct-ad status;
- performance baseline;
- citation readiness;
- unresolved integration blockers;
- `Production systems modified: NO`.
