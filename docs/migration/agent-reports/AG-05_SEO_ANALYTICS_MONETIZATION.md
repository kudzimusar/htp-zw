# AG-05 — CP5 SEO / Analytics / Monetization Continuity Receipt

Date: 2026-09-22  
Repository: `kudzimusar/htp-zw`  
Lane: AG-05 — SEO, Authority, Analytics & Monetization Continuity

## A. Repository state

- Certified starting SHA: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`
- Starting certified branch: `migration/ag-03-source-data-capture`
- AG-05 branch: `migration/ag-05-seo-analytics-monetization`
- Runtime candidate SHA: `1546639cce38028b8daac9fa620ac89b8a0a3cc9`
- Documentation ledger SHA: `8be541fb40b95eedef5b690658e5a8b633e29ac0`
- Final report commit: see Git history for this file; moderator receipt records the final branch tip.
- Draft PR: #12, base `migration/ag-03-source-data-capture`
- Vercel commit status on runtime candidate: SUCCESS
- Staging Supabase ref: `gcdohgbmqhqwydgaxrcr`
- Applied AG-05 staging migration: `ag05_seo_analytics_monetization_continuity`

No AG-04 importer code was modified.

## B. URL coverage

Authoritative CP3 public-object baseline:

- posts: **5,737**
- pages: **49**
- total: **5,786**

Current staging coverage view:

- source post/page rows imported: **0**
- canonical mapping rows: **0**
- explicit URL exceptions: **0**
- unresolved: **5,786**
- state: **BLOCKED**

AG-04 branch existed at launch but still pointed at the accepted CP3 SHA with no rehearsal-import commits. AG-05 therefore did not invent a competing URL map.

Implemented cross-lane contract:

`docs/migration/14_AG04_AG05_URL_CONTINUITY_CONTRACT.md`

Implemented validator/generator:

`scripts/migration/ag05-url-continuity.js`

It hard-fails on missing public objects, duplicate source URLs, invalid preserve status, redirect chains, source=destination redirects, catch-all homepage redirects, and canonical collapse to the homepage.

A representative legacy post-name path currently returns **404** on the primary staging runtime. Therefore preserved-direct, 301, archive/noindex and exception totals cannot yet be truthfully certified.

## C. SEO metadata

Source findings retained:

- WordPress permalink structure: `/%postname%/`
- Rank Math SEO observed inactive in the CP3 source capture.
- Historical Rank Math/other SEO metadata is **not assumed absent** and must be preserved wherever AG-04 exposes it.

Implemented:

- homepage canonical, robots, Open Graph and Twitter metadata in initial HTML;
- homepage Organization/WebSite JSON-LD in initial HTML;
- generic article shell changed to fail-closed `noindex,follow` until real migrated story metadata is server-rendered;
- URL-manifest contract carries source SEO title, description, canonical, Open Graph, robots and plugin provenance.

Final per-story SEO title/description/canonical/Open Graph/index-state coverage: **BLOCKED pending AG-04 imported content**.

## D. Structured data

Implemented and tested:

- `Organization`
- `NewsArticle`
- `Article`
- `Person`
- `BreadcrumbList`

The builder in `scripts/migration/ag05-structured-data.js` refuses to fabricate required article facts or missing authors.

Runtime state:

- Organization/WebSite: emitted on branch homepage.
- NewsArticle/Article/Person/BreadcrumbList per migrated story: **BLOCKED pending imported content and final story route/server-rendered HTML**.

## E. Sitemap / robots / RSS

Current primary staging checks:

- `/robots.txt`: **404**
- `/sitemap.xml`: **404**
- `/feed/`: **404**

Branch implementation:

- `robots.txt`: staging policy blocks all indexing.
- `robots.production.txt`: production candidate allows public crawl and blocks Newsroom/internal routes.
- complete-manifest generator emits `sitemap.xml`, redirect manifest, production robots candidate and RSS feed policy only after all 5,786 public objects are accounted for.
- RSS strategy preserves the existing `/feed/` route and requires title, URL, date, author and policy-permitted summary/content.

State: **BLOCKED for CP5 runtime certification until AG-04 handoff and staging promotion**.

## F. Google Analytics

Certified public identifiers:

- Google tag: `GT-PLTTGPL`
- GA4 account: `137814020`
- GA4 property: `359235319`
- web stream: `4756168788`
- measurement ID: `G-S39LN2KX4X`

Continuity decision: **PRESERVE EXISTING PUBLICATION PROPERTY**, subject to account-level ownership/consent review.

Still unresolved:

- account ownership;
- data-retention settings;
- referral exclusions;
- cross-domain settings;
- historical API/export range.

Staging isolation:

- Google delivery is disabled unless hostname is `healthtimes.co.zw` or `www.healthtimes.co.zw`;
- analytics consent must be explicitly granted;
- default consent is denied;
- staging does not send public GA events.

## G. Analytics events

Event version: `2026-09-09`

**24** event definitions are stored in staging and mirrored by the browser adapter, including page/article engagement, listening, save/share, search/follow, citations/references, Premium, subscription, newsletter/push, and direct-ad events.

Protected Newsroom boundary is enforced:

- `newsroom.html` does not load the public analytics adapter;
- public analytics rejects Newsroom routes;
- prohibited fields include draft content, internal comments, private source documents, staff email, permissions/security detail, payment details, customer/email/phone values, push tokens and message bodies.

## H. Search Console

- Known property: `https://healthtimes.co.zw/`
- Site Kit source state: data reported available.
- Property type: **UNKNOWN / not account-level verified**
- Verified owners/users: **PENDING**
- Historical range/export availability: **PENDING**
- Server-side ingestion schema/checkpoint model: **READY**
- OAuth credentials in browser/Git: **NO**

## I. AdSense

- Publisher: `pub-8744434739998394`
- Client: `ca-pub-8744434739998394`
- Known slot: `7971959240`
- Site Kit source account status: `ready`
- Site Kit source site status: `ready`
- Site Kit AdSense snippet: disabled in captured source
- Account-level reporting access/history/owner evidence: **PENDING**

No production AdSense configuration was changed.

## J. ads.txt

Primary staging:

- HTTP status: **200**
- content type: **text/plain**
- exact seller line: `google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0`
- reconciliation: **MATCH**

## K. app-ads.txt

Primary staging:

- HTTP status: **200**
- content type: **text/plain**
- content is limited to the existing verified Google seller declaration.
- confirmed AdMob/mobile seller ID: **NONE**
- mobile monetization seller verification: **PENDING**

No mobile seller identifier was invented.

## L. Direct advertising

HOSPAZ classification: `DIRECT_AD_CONTINUITY_CAPTURED`

Staging direct-ad model records:

- advertiser: HOSPAZ
- commercial source attachment IDs: `32960`, `32971`
- commercial creative SHA-256: `50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`
- byte identity: 32960 and 32971 retained as separate source identities for one byte-identical creative
- current placement asset: `33005`
- 33005 asset-source provenance: **EDITORIAL**
- placement usage provenance: **DIRECT AD**
- Elementor template/post: `21`, title `main`
- historical revisions: `32974`, `32975`, `32976`, `32977`, `32979`, `32980`
- destination URL: **UNKNOWN**
- schedule: **UNKNOWN**
- placement conditions: **UNKNOWN**
- `HOSPAZ_AD_INSERTER_PLACEMENT: NO`
- standalone campaign register found: **NO**

HOSPAZ is separate from AdSense/Ad Inserter. Its runtime placement remains `awaiting_migrated_asset` until AG-04 supplies the migrated media identity.

## M. Performance

Workflow: `35668045741` — **SUCCESS**  
Lighthouse artifact: `10670690414`

Actual Google Lighthouse lab results against `https://healthtimes-staging.vercel.app`:

| Page | Strategy | Performance | LCP | CLS | INP |
| --- | --- | ---: | ---: | ---: | --- |
| Home | Mobile | 95 | 2856 ms | 0.000 | unavailable |
| Home | Desktop | 82 | 1200 ms | 0.301 | unavailable |
| Article sample | Mobile | 87 | 2965 ms | 0.173 | unavailable |
| Article sample | Desktop | 88 | 1050 ms | 0.208 | unavailable |
| Premium | Mobile | 95 | 1151 ms | 0.110 | unavailable |
| Premium | Desktop | 89 | 1051 ms | 0.201 | unavailable |
| Archive | Mobile | 97 | 1138 ms | 0.103 | unavailable |
| Archive | Desktop | 83 | 1131 ms | 0.290 | unavailable |

INP was not available from these Lighthouse lab runs and is **not fabricated**.

Performance blocker: significant CLS is visible on multiple desktop surfaces, especially Home `0.301` and Archive `0.290`, and Article mobile LCP is approximately `2.97 s`. These require remediation/retest after migrated media/direct-ad placement integration.

## N. Citations / backlinks

Existing `citation_references` model remains available. AG-05 records the external-citations integration as `provider_not_connected`.

No automated backlink, academic, government, NGO or media-reference coverage is claimed without a provider.

## O. Google Ads

Classification: **INCOMPLETE**

Site Kit module was detected, but conversion/customer/external-customer identifiers are absent. No active spend or campaign dependency is inferred.

## P. WooCommerce / monetization history

Authoritative source truth:

- WooCommerce orders: **0**
- subscriptions: **0**
- payment tokens: **0**
- membership plans: **1**

Commerce capability exists, but no subscriber entitlement state was fabricated and WooCommerce was not unnecessarily rebuilt.

## Q. Privacy / consent

Implemented public tracking posture:

- essential operation remains separate from analytics/advertising;
- analytics default: denied;
- advertising default: denied;
- Google script loads only after analytics consent on production HealthTimes host;
- ad consent is represented separately;
- protected Newsroom activity is excluded;
- staging public Analytics delivery is disabled;
- no OAuth/service credentials were placed in frontend code or Git.

Regional consent-policy content remains a production/legal configuration task.

## R. Integration health

| Integration | State |
| --- | --- |
| Analytics | PARTIAL — IDs verified; account settings/history pending |
| Search Console | PARTIAL — property known; type/owners/history pending |
| AdSense | PARTIAL — publisher/client/slot known; reporting/history pending |
| PageSpeed/Lighthouse | CONNECTED FOR LAB BASELINE |
| Google Ads | PARTIAL / INCOMPLETE |
| Citations | READY FOR CREDENTIALS / provider not connected |
| HOSPAZ direct ads | PARTIAL — provenance ready; migrated runtime asset pending |

## S. Tests / CI

Runtime candidate: `1546639cce38028b8daac9fa620ac89b8a0a3cc9`

- Validate HealthTimes 2.0 run `35668048259`: **SUCCESS**
- Migration Tests run `35668048273`: **50/50 PASS** in 4.1s
- AG-05 Certification run `35668045741`: **SUCCESS**
- Browser smoke: **8/8 PASS** in 7.2s
  - 375px
  - 430px
  - 1440px
  - initial-HTML SEO checks
  - Premium/archive overflow checks
  - Newsroom analytics exclusion
  - ads.txt/app-ads.txt exact authorization
- Browser artifact: `10669766060`
- Lighthouse artifact: `10670690414`
- Vercel commit deployment status: **SUCCESS**

## T. Production safety

Production WordPress modified: NO  
Production DNS modified: NO  
Production Analytics modified: NO  
Production Search Console modified: NO  
Production AdSense modified: NO  
Production Google Ads modified: NO  
Production systems modified: NO

## U. Downstream readiness

SEO/authority lane readiness for AG-07: **BLOCKED**

Reason: 5,786 public URLs remain unresolved until AG-04 imports the canonical content/URL handoff; current primary staging legacy permalink, sitemap and feed return 404; per-story initial-HTML SEO is not yet certifiable.

Audience/Analytics lane readiness for AG-07: **BLOCKED**

Reason: runtime/privacy contract is implemented and tested, but final rehearsal integration and account-level Google evidence remain incomplete.

Monetization lane readiness for AG-07: **BLOCKED**

Reason: ads.txt passes and direct-ad provenance is preserved, but HOSPAZ migrated runtime asset/placement verification and post-integration CLS retest are outstanding; AdSense reporting access remains pending.

### Minimum remediation to close CP5

1. AG-04 completes the rehearsal import and supplies the canonical 5,786-record public URL/content manifest.
2. AG-05 reruns `npm run migration:ag05-url` and proves 5,786/5,786 coverage with no unexplained exceptions or redirect chains.
3. Deploy/verify legacy paths, per-story initial-HTML metadata, sitemap, production-candidate robots behavior and `/feed/` on the rehearsal runtime.
4. Bind HOSPAZ placement to the migrated AG-04 media identity while keeping source-vs-placement provenance separate.
5. Remediate/retest the observed CLS regressions and verify media/ad slot stability.
6. Record Google account-level ownership/history/settings where access becomes available, or carry the exact unresolved evidence gaps forward without inventing facts.

## V. CP5 decision

**CP5 NOT READY — continuity lane remains blocked**
