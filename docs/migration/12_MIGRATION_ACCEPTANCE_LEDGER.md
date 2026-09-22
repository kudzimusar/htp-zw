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

## CP5 — SEO / Analytics / Monetization Continuity — FINAL — 2026-09-22

Certified runtime candidate: `5c4bf4290debc68e8dc313b444c83fc290c74118`

| CP5 gate | State | Evidence |
| --- | --- | --- |
| CP3 authoritative public-object baseline | PASS | 5,737 posts + 49 pages = **5,786** |
| Complete migrated public URL accounting | PASS | `ag05_url_coverage_status`: **5,786 / 5,786**, 0 unresolved, 0 duplicate sources, 0 homepage catch-alls |
| Canonical/redirect policy | PASS | 5,786 preserved-direct canonical objects; historical aliases are one-hop only; no redirect-chain candidates; no homepage catch-all aliases |
| Historical internal-link exception ledger | PASS WITH EXPLICIT EXCEPTIONS | 2,325 preserved-direct paths, 341 deterministic aliases, 28 explicit 404 paths, 1 homepage/fragment target |
| Source SEO metadata preservation | PASS WITH SOURCE SPARSITY | Source plugin metadata retained where present; authoritative story fields used only as fallback; no plugin metadata invented |
| Initial-HTML SEO | PASS | Live migrated story/page emit title, description where available, canonical, robots/index state and Open Graph in server HTML |
| Structured data | PASS | Live `NewsArticle`, `Article`, `Person`, `Organization`, `BreadcrumbList`; missing facts are not fabricated |
| Sitemap | PASS | `/sitemap.xml` HTTP 200, **5,786** URLs |
| robots.txt | PASS STAGING | Staging blocks indexing; production candidate remains separate and unactivated |
| RSS/feed continuity | PASS | `/feed/` HTTP 200; 50-item live feed sample |
| Representative legacy routes | PASS | preserved-direct story, public story, page, one-hop alias and explicit 404 all exercised |
| GA4 identity continuity | PASS WITH ACCOUNT EVIDENCE GAPS | tag/account/property/stream/measurement preserved; ownership/settings/history unresolved |
| Staging Analytics isolation | PASS | staging external Google delivery disabled; consent defaults denied |
| Protected Newsroom Analytics boundary | PASS | protected/internal fields excluded |
| Versioned public event contract | PASS | 24 events, version `2026-09-09` |
| Search Console | PASS FOR CONTINUITY / ACCOUNT EVIDENCE GAPS | property known; type/owners/history unresolved; no production mutation |
| AdSense identity | PASS FOR CONTINUITY / ACCOUNT EVIDENCE GAPS | publisher/client/slot preserved; reporting/ownership/history unresolved |
| ads.txt | PASS | verified seller identity retained |
| app-ads.txt | PASS / MOBILE SELLER UNKNOWN | no unverified mobile seller ID invented |
| HOSPAZ direct-ad continuity | PASS FOR PROVENANCE | AG-04 media UUIDs bound; 33005 source provenance remains distinct from placement usage; destination/schedule/conditions remain UNKNOWN |
| Fabricated HOSPAZ client defaults | PASS REMEDIATED | invented destination/dates/approval/fixed-date seed removed |
| Google Ads | EVIDENCE GAP | no active campaign/conversion truth invented |
| WooCommerce historical relevance | PASS SOURCE CLASSIFICATION | 0 orders / 0 subscriptions / 0 payment tokens / 1 membership plan retained |
| Historical metric provenance | PASS | provenance architecture retained; no historical metrics fabricated |
| Citation/backlink architecture | READY / PROVIDER GAP | provider not connected; no backlink coverage invented |
| Browser smoke | PASS | job `106576109129` |
| Live completed-rehearsal runtime | PASS | job `106576109323`: **10 / 10 PASS**, including 375 / 430 / 1440 |
| Migration/continuity tests | PASS | run `35673867068`: **59 / 59 PASS** |
| Validate HealthTimes 2.0 | PASS | run `35673867000` |
| CLS final retest | PASS | Lighthouse job `106576269521`; all tested CLS <= **0.10** |
| AG-05 certification | PASS | run `35673864117` |
| Exact-head Vercel preview | PASS | `dpl_6NQFyTGwuZudHg2BHvxA3xMGVxQB` READY |
| Production systems untouched | PASS | WordPress/DNS/GA/Search Console/AdSense/Google Ads production settings unchanged |

### CP5 final Lighthouse retest

| Page | Strategy | Score | LCP | CLS | INP |
| --- | --- | ---: | ---: | ---: | --- |
| Archive | Desktop | 99 | 1042 ms | 0.0026 | N/A in lab |
| Archive | Mobile | 99 | 1959 ms | 0.0000 | N/A in lab |
| Direct-ad preview | Desktop | 97 | 1293 ms | 0.0000 | N/A in lab |
| Direct-ad preview | Mobile | 100 | 902 ms | 0.0000 | N/A in lab |
| Home | Desktop | 95 | 1471 ms | 0.0546 | N/A in lab |
| Home | Mobile | 90 | 3485 ms | 0.0011 | N/A in lab |
| Migrated story | Desktop | 95 | 1454 ms | 0.0000 | N/A in lab |
| Migrated story | Mobile | 83 | 4478 ms | 0.0000 | N/A in lab |
| Premium | Desktop | 100 | 449 ms | 0.0000 | N/A in lab |
| Premium | Mobile | 98 | 1979 ms | 0.0000 | N/A in lab |

Account-level Google/Search Console/AdSense evidence, Google Ads truth, citation-provider connectivity, HOSPAZ destination/schedule/placement conditions, and lab INP remain explicit downstream evidence gaps. They were not fabricated.

**CP5 ACCEPTED — SEO, authority, audience and monetization continuity are certified for downstream UAT**
