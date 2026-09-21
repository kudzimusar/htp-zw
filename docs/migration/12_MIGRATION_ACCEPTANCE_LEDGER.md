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


## CP5 — SEO / Analytics / Monetization Continuity — 2026-09-22

Certified runtime candidate: `1546639cce38028b8daac9fa620ac89b8a0a3cc9`

| CP5 gate | State | Evidence |
| --- | --- | --- |
| CP3 authoritative public-object baseline | PASS STAGING | `cp3-2026-09-21`: 5,737 posts + 49 pages = 5,786 |
| Complete migrated public URL coverage | BLOCKED | Staging `ag05_url_coverage_status`: 0 mapped / 0 exceptions / 5,786 unresolved; AG-04 content import not yet available |
| Canonical/redirect policy | PASS STAGING (tooling) / BLOCKED (content) | Exact-count validator rejects gaps, duplicate URLs, redirect chains, source=destination redirects and homepage catch-alls; final manifest awaits AG-04 |
| Source SEO metadata preservation | BLOCKED | Rank Math observed inactive, but historical plugin/postmeta must be consumed from AG-04 where actually present; no imported content rows yet |
| Initial-HTML SEO | PARTIAL | Home authority metadata implemented. Generic article shell is fail-closed `noindex`; per-story server-rendered metadata awaits imported content/routing |
| Structured data | PARTIAL | Organization/WebSite emitted on home; NewsArticle/Article/Person/BreadcrumbList builders are tested but cannot be emitted for missing migrated stories |
| Sitemap | BLOCKED | Generator is ready but requires complete AG-04 manifest; current primary staging `/sitemap.xml` returns 404 |
| robots.txt | PASS BRANCH / PENDING STAGING PROMOTION | Branch staging policy is `Disallow: /`; production candidate protects Newsroom/internal routes. Current primary staging `/robots.txt` returns 404 |
| RSS/feed continuity | BLOCKED | Preserve-`/feed/` strategy is generated only after complete manifest/content handoff; current primary staging `/feed/` returns 404 |
| Legacy permalink sample | BLOCKED | Representative WordPress post-name path returns 404 on current primary staging |
| GA4 identity continuity | PARTIAL | Account `137814020`, property `359235319`, stream `4756168788`, measurement `G-S39LN2KX4X`, tag `GT-PLTTGPL` recorded; account ownership/settings/history still pending |
| Staging Analytics isolation | PASS BRANCH | Public adapter sends to Google only on production HealthTimes host after analytics consent; staging external delivery is disabled |
| Protected Newsroom Analytics boundary | PASS | Newsroom does not load public analytics; event sanitizer prohibits draft/internal/staff/private/payment/contact/token fields |
| Versioned public event contract | PASS STAGING | 24 event definitions at version `2026-09-09` stored in staging and exercised by tests |
| Search Console identity | PARTIAL | Property `https://healthtimes.co.zw/` known; property type, owners/users and historical availability remain account-level pending |
| AdSense identity | PARTIAL | Publisher/client/slot preserved; Site Kit source status ready; reporting/account ownership/history pending |
| ads.txt | PASS STAGING | HTTP 200, text/plain, exact verified Google seller line |
| app-ads.txt | PASS STAGING / MOBILE SELLER PENDING | HTTP 200, text/plain, verified existing seller declaration only; no AdMob/mobile seller ID invented |
| HOSPAZ direct-ad continuity | PASS STAGING DATA MODEL | Direct-ad provenance stored separately from AdSense; 32960/32971 byte-identical creative identities preserved; 33005 remains editorial source asset/current placement usage; destination/schedule/conditions UNKNOWN |
| Google Ads | PARTIAL | Site Kit module present but setup incomplete; no active spend inferred |
| WooCommerce historical relevance | PASS SOURCE CLASSIFICATION | 0 orders / 0 subscriptions / 0 payment tokens / 1 membership plan; no subscriber entitlement fabricated |
| Historical metric provenance architecture | PASS STAGING | Integration/run/source-property/date provenance schema is present; no historical metrics fabricated |
| Citation/backlink architecture | PARTIAL | Citation model ready; provider not connected |
| Browser smoke | PASS | AG-05 workflow run `35668045741`: 8/8 pass at 375, 430 and 1440 plus SEO/Newsroom/seller checks |
| Migration/continuity tests | PASS | Migration Tests run `35668048273`: 50/50 pass in 4.1s; Validate run `35668048259`: SUCCESS |
| Staging Lighthouse baseline | PASS WITH PERFORMANCE FINDINGS | Run `35668045741`; artifact `10670690414`; INP unavailable in lab and not fabricated |
| Production systems untouched | PASS | WordPress/DNS/GA/Search Console/AdSense/Google Ads production settings were not modified |

### CP5 Lighthouse baseline — current primary staging

| Page | Strategy | Score | LCP | CLS | INP |
| --- | --- | ---: | ---: | ---: | --- |
| Home | Mobile | 95 | 2856 ms | 0.000 | N/A in lab |
| Home | Desktop | 82 | 1200 ms | 0.301 | N/A in lab |
| Article sample | Mobile | 87 | 2965 ms | 0.173 | N/A in lab |
| Article sample | Desktop | 88 | 1050 ms | 0.208 | N/A in lab |
| Premium | Mobile | 95 | 1151 ms | 0.110 | N/A in lab |
| Premium | Desktop | 89 | 1051 ms | 0.201 | N/A in lab |
| Archive | Mobile | 97 | 1138 ms | 0.103 | N/A in lab |
| Archive | Desktop | 83 | 1131 ms | 0.290 | N/A in lab |

CP5 remains **NOT READY** until AG-04 supplies complete canonical URL/content handoff, final per-story metadata can be emitted in initial HTML, sitemap/RSS/legacy paths work on the rehearsal runtime, and the observed layout-shift regressions are remediated/retested.
