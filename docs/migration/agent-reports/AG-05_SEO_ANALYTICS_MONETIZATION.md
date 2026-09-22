# AG-05 — FINAL CP5 SEO / Analytics / Monetization Continuity Receipt

Date: 2026-09-22  
Repository: `kudzimusar/htp-zw`  
Branch: `migration/ag-05-seo-analytics-monetization`  
Draft PR: #12 — OPEN / DRAFT / UNMERGED  
Certified runtime SHA: `5c4bf4290debc68e8dc313b444c83fc290c74118`  
Certified Vercel preview deployment: `dpl_6NQFyTGwuZudHg2BHvxA3xMGVxQB` — READY  
HealthTimes Staging Supabase ref: `gcdohgbmqhqwydgaxrcr`

This receipt supersedes the earlier pre-AG-04 CP5 NOT READY receipt. It records the completed AG-04 rehearsal import and the final AG-05 runtime certification. Production WordPress, production DNS, Google Analytics, Search Console, AdSense and Google Ads were not modified.

## A. Repository state

- Certified CP3 baseline: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`
- AG-05 continuation preserved the existing runtime lane and did not restart the work.
- Final certified runtime SHA: `5c4bf4290debc68e8dc313b444c83fc290c74118`
- PR #12 remains **Draft / Open / Unmerged**.
- Vercel preview for the exact certified SHA is **READY**.
- AG-04 importer ownership was not taken over by AG-05.
- AG-05 added only forward migrations/runtime/continuity work needed for CP5 closure.

## B. AG-04 rehearsal import consumed

The completed HealthTimes Staging rehearsal contains:

- WordPress public posts: **5,737**
- WordPress public pages: **49**
- total canonical public objects: **5,786**
- `stories`: **5,786**
- `seo_metadata`: **5,786**
- canonical post/page source rows: **5,786**
- migrated media identities present for HOSPAZ source attachments `32960`, `32971`, and `33005`

AG-05 discovered one spurious duplicate mapping for WordPress post `33190`: `/ → /`. Its canonical dated permalink mapping was already present. AG-05 removed only the proven spurious row.

## C. Public URL accounting

Final `ag05_url_coverage_status`:

- expected public objects: **5,786**
- source rows: **5,786**
- mapping rows: **5,786**
- distinct mapped sources: **5,786**
- canonical-object exceptions: **0**
- preserved-direct: **5,786**
- canonical-object redirects: **0**
- noindex/archive objects: **0**
- duplicate mapped sources: **0**
- invalid homepage catch-alls: **0**
- unresolved: **0**
- coverage state: **COVERED**

Every accepted AG-04 public object has one canonical preserved-direct public mapping.

## D. Historical internal-link / alias ledger

AG-05 separately audited historical internal links embedded in migrated bodies. This ledger does not inflate the canonical 5,786-object count.

- preserved-direct internal target paths: **2,325** / **4,473 occurrences**
- deterministic one-hop legacy aliases: **341** / **661 occurrences**
- explicit 404 exception paths: **28** / **66 occurrences**
- valid homepage/fragment target: **1** / **153 occurrences**
- redirect-chain candidates: **0**
- homepage catch-all aliases: **0**

The 341 aliases are created only where the final slug uniquely identifies exactly one imported story. The 28 unmatched or ambiguous historical targets remain explicit 404 exceptions. No homepage fallback was fabricated.

## E. Canonical / redirect policy

- canonical AG-04 public objects: **HTTP 200 preserved-direct**
- uniquely resolvable historical alias: **one-hop HTTP 301**
- no authoritative destination: **explicit HTTP 404**
- redirect chains: **rejected**
- source=destination redirects: **rejected**
- canonical collapse to `/`: **rejected**
- homepage catch-all redirects: **rejected**

Representative alias and explicit-404 behavior were exercised in the final live rehearsal suite.

## F. Initial-HTML SEO

Migrated public routes emit real server-rendered initial HTML from authoritative staging data:

- title
- description where authoritative source/story metadata exists
- canonical URL
- robots/index state
- Open Graph title
- Open Graph description
- Open Graph image where authoritative image data is available
- publication and modified dates
- author and section data where present

Metadata precedence remains conservative: source SEO metadata is used where it actually exists, then authoritative story fields provide fallback. Missing plugin values are not fabricated.

Premium-marker-review stories retain indexable authority metadata while the public renderer withholds their full article body.

## G. Structured data

The final runtime emits authoritative JSON-LD for:

- `NewsArticle`
- `Article`
- `Person` where a real author is available
- `Organization`
- `BreadcrumbList`

The test contract rejects fabricated authors or required article facts.

The final live rehearsal verified a migrated story with `NewsArticle + Person + BreadcrumbList` and a migrated page with `Article + Person + BreadcrumbList`.

## H. Sitemap

`/sitemap.xml` is served by the AG-05 public runtime from completed rehearsal data.

Final live assertion:

- HTTP **200**
- XML response
- **5,786** URL rows
- **5,786 / 5,786** canonical public objects represented

No production Search Console sitemap submission was performed.

## I. robots.txt

Staging `/robots.txt` is present and intentionally blocks indexing.

The production candidate remains separate and protects Newsroom/internal routes. AG-05 did not activate production robots policy.

## J. RSS / feed continuity

`/feed/` is served by the AG-05 public runtime.

Final live assertion:

- HTTP **200**
- RSS/XML response
- current feed sample: **50 items**
- fields are derived from authoritative title, canonical URL, publication date, author and available summary metadata
- historical audience or revenue metrics are not fabricated

## K. Representative legacy routes

The final live rehearsal exercised and passed:

1. preserved-direct Premium-review story;
2. fully public migrated story;
3. migrated page;
4. deterministic historical alias redirect;
5. unmatched historical path returning explicit 404.

## L. Google Analytics

Certified public identities:

- Google tag: `GT-PLTTGPL`
- GA4 account: `137814020`
- GA4 property: `359235319`
- web stream: `4756168788`
- measurement ID: `G-S39LN2KX4X`

Continuity decision: **preserve the existing publication property**.

Account-level evidence still unavailable:

- ownership
- data-retention configuration
- referral exclusions
- cross-domain configuration
- historical API/export range

Staging Google delivery remains disabled and analytics consent defaults to denied.

## M. Analytics events / privacy

The versioned public event contract remains `2026-09-09`, with **24** event definitions.

Protected-data boundaries remain enforced:

- public Analytics excludes Newsroom activity;
- draft content, internal comments, private source documents, staff email, permissions/security detail, payment details, personal contact fields, push tokens and message bodies are prohibited;
- historical analytics figures are not fabricated.

## N. Search Console

Known property: `https://healthtimes.co.zw/`

Still unresolved account-level evidence:

- property type
- verified owners/users
- historical range/export availability

No production Search Console changes or sitemap submission occurred.

## O. AdSense / ads.txt / app-ads.txt

Preserved AdSense identities:

- publisher: `pub-8744434739998394`
- client: `ca-pub-8744434739998394`
- known slot: `7971959240`

`ads.txt` remains reconciled to:

`google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0`

`app-ads.txt` remains limited to verified seller truth. No mobile/AdMob seller ID was invented.

Still unresolved:

- AdSense reporting access
- historical reporting range
- ownership/admin proof

No production AdSense settings were changed.

## P. HOSPAZ direct-ad continuity

HOSPAZ remains a **direct advertisement**, separate from AdSense and Ad Inserter.

AG-04 migrated media identities bound by AG-05:

- `32960` → `6a6c15b7-2874-40ad-977b-a92015663c24`
- `32971` → `c4a3ee5c-d73a-44cc-9011-f9f94487b8c1`
- `33005` → `5952595d-76c0-4fb3-9d9a-3a0821596137`

Provenance remains separate:

- `32960` / `32971`: historical commercial creative identities
- `33005`: source asset provenance retained independently from direct-ad placement usage
- placement key: `hospaz-header-direct`
- placement status: `bound_rehearsal`

Commercial facts still unknown and therefore not activated or fabricated:

- destination URL: **UNKNOWN**
- schedule: **UNKNOWN**
- placement conditions: **UNKNOWN**

The old client-side fabricated HOSPAZ destination, dates, active/approval state and fixed date logic were removed. The noindex rehearsal preview contains no invented click target.

## Q. Performance / CLS final retest

Final AG-05 Certification run: `35673864117` — **SUCCESS**  
Lighthouse retest job: `106576269521` — **SUCCESS**  
CLS threshold: **0.10**  
CLS gate: **PASS**

| Page | Strategy | Performance | LCP | CLS | TBT | INP |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Archive | Desktop | 99 | 1042 ms | 0.0026 | 0 ms | N/A in lab |
| Archive | Mobile | 99 | 1959 ms | 0.0000 | 0 ms | N/A in lab |
| Direct-ad preview | Desktop | 97 | 1293 ms | 0.0000 | 0 ms | N/A in lab |
| Direct-ad preview | Mobile | 100 | 902 ms | 0.0000 | 0 ms | N/A in lab |
| Home | Desktop | 95 | 1471 ms | 0.0546 | 0 ms | N/A in lab |
| Home | Mobile | 90 | 3485 ms | 0.0011 | 103 ms | N/A in lab |
| Migrated story | Desktop | 95 | 1454 ms | 0.0000 | 0 ms | N/A in lab |
| Migrated story | Mobile | 83 | 4478 ms | 0.0000 | 0 ms | N/A in lab |
| Premium | Desktop | 100 | 449 ms | 0.0000 | 0 ms | N/A in lab |
| Premium | Mobile | 98 | 1979 ms | 0.0000 | 78 ms | N/A in lab |

INP is unavailable from these Lighthouse lab runs and is not fabricated.

The earlier CLS regressions are remediated. Migrated-story mobile LCP remains a performance optimization target, but the final CP5 CLS gate passes.

## R. Browser certification

Final live rehearsal job: `106576109323` — **SUCCESS**.

Live completed-rehearsal suite: **10 / 10 PASS**, including:

- robots / sitemap / feed
- 5,786-entry sitemap
- Premium-review authority metadata without full-body leakage
- public migrated story body
- migrated page structured data
- one-hop historical alias
- explicit 404 exception
- HOSPAZ preview with unknown commercial fields preserved
- no horizontal overflow at **375 px**
- no horizontal overflow at **430 px**
- no horizontal overflow at **1440 px**
- CLS remediation on home, migrated story and direct-ad preview

Separate browser smoke job `106576109129`: **SUCCESS**.

## S. Repository tests / CI

Exact certified runtime SHA: `5c4bf4290debc68e8dc313b444c83fc290c74118`

- Validate HealthTimes 2.0 run `35673867000`: **SUCCESS**
- Migration Tests run `35673867068`: **59 / 59 PASS** in 4.1 s
- AG-05 Certification run `35673864117`: **SUCCESS**
- Browser smoke job `106576109129`: **SUCCESS**
- Live AG-04 rehearsal runtime job `106576109323`: **SUCCESS**
- Lighthouse retest job `106576269521`: **SUCCESS**
- exact-head Vercel preview `dpl_6NQFyTGwuZudHg2BHvxA3xMGVxQB`: **READY**

## T. Remaining evidence gaps carried forward

These remain explicitly unresolved because account/provider or commercial-source evidence is unavailable:

- GA4 account ownership/settings/history
- Search Console type/owners/history
- AdSense ownership/reporting/history
- Google Ads campaign/conversion truth
- external citation/backlink provider connectivity
- HOSPAZ destination URL
- HOSPAZ schedule
- HOSPAZ placement conditions
- INP from Lighthouse lab runs

These are downstream UAT / production-cutover evidence requirements. No value was invented to close them.

## U. Production safety / downstream readiness

Production WordPress modified: **NO**  
Production DNS modified: **NO**  
Production Analytics modified: **NO**  
Production Search Console modified: **NO**  
Production AdSense modified: **NO**  
Production Google Ads modified: **NO**  
Production systems modified: **NO**

Downstream status:

- SEO / authority continuity: **READY FOR DOWNSTREAM UAT**
- audience / analytics continuity: **READY FOR DOWNSTREAM UAT WITH ACCOUNT-LEVEL EVIDENCE GAPS**
- monetization continuity: **READY FOR DOWNSTREAM UAT WITH ACCOUNT-LEVEL / HOSPAZ COMMERCIAL EVIDENCE GAPS**

This is not production cutover authorization. AG-08 retains production DNS/cutover authority.

## V. CP5 decision

**CP5 ACCEPTED — SEO, authority, audience and monetization continuity are certified for downstream UAT**
