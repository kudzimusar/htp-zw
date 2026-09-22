# AG-05 — CP5 POST-AG04 CONTINUITY RECEIPT

Date: 2026-09-22  
Repository: kudzimusar/htp-zw  
Branch: migration/ag-05-seo-analytics-monetization  
PR: #12 — DRAFT / OPEN / UNMERGED

## 1. Resume lineage

Moderator-supplied resume SHA: dc92d367d2f36bca3ce9c7a4fb4d1eb21570e640  
Moderator-supplied prior certified runtime: 1546639cce38028b8daac9fa620ac89b8a0a3cc9  
AG-04 handoff consumed: a600a68091ab89fdb3a0c779d56c431fc9f25d6e  
Post-AG04 runtime candidate certified in this continuation: 0ba7240d018efa2472a00f56453e9aa8be34e1c5

The branch had already advanced beyond the moderator-supplied AG-05 SHA when this continuation began. Existing certified AG-05 work was preserved; the lane was not reset.

## 2. Canonical AG-04 URL handoff

Authoritative public objects:

- posts: 5,737
- pages: 49
- total: 5,786

Final staging coverage after the completed AG-04 rerun:

- source rows: 5,786
- URL mapping rows: 5,786
- distinct mapped sources: 5,786
- PRESERVE_DIRECTLY / HTTP 200: 5,786
- canonical-object 301 redirects: 0
- canonical-object archive/noindex dispositions: 0
- canonical-object exceptions: 0
- duplicate mapped sources: 0
- invalid homepage catch-alls: 0
- unresolved canonical public objects: 0
- coverage status: COVERED

The AG-04 rerun temporarily rebuilt legacy_url_mappings while AG-05 certification was running. AG-05 added an explicit rehearsal-readiness guard so certification waits for an idle, complete 5,786-object snapshot instead of certifying against a partial in-flight import.

Source SEO metadata remains sparse and truthful:

- source SEO titles non-empty: 2
- source SEO descriptions non-empty: 1,973

No missing plugin metadata was manufactured.

## 3. Preserved-route implementation

AG-05 serves migrated post/page routes through the existing imported story/source identities and the canonical URL map.

The runtime preserves:

- source URL/path
- source WordPress identity
- canonical URL
- published/modified timestamps
- author where present
- access policy
- migrated body content where public

Unknown paths remain real 404s. No homepage catch-all and no generic-article fallback were introduced.

A case-normalization defect was found after consuming the authoritative AG-04 handoff: AG-04 stores PRESERVE_DIRECTLY in uppercase while an AG-05 historical-alias resolver had compared against lowercase preserve_directly. The resolver and materialized link audit now normalize the contract value. The resulting historical-link ledger is again deterministic.

## 4. Representative HTTP/runtime results

The guarded live rehearsal handler exercised the real HealthTimes Staging Supabase corpus and passed 13 / 13:

- old 2016 migrated story: HTTP 200, preserved-direct, historical canonical retained
- recent Premium-review story: HTTP 200, preserved-direct, source ID 33190
- public 2026 story: HTTP 200, preserved-direct, source ID 30154, migrated body present in initial HTML
- long-form 2018 story: HTTP 200, preserved-direct, authoritative long body present
- migrated page /global-health/: HTTP 200 with Article structured data
- nested category context: HTTP 200, noindex,follow
- legacy tag /tag/cpu/: HTTP 200, noindex,follow
- deterministic unique-slug historical story alias: one-hop HTTP 301
- unresolved historical path: HTTP 404
- unverifiable historical author alias: HTTP 404
- HOSPAZ preview: HTTP 200, no invented click target
- no horizontal overflow at 375 / 430 / 1440
- CLS smoke on home/story/direct-ad preview passed

Important deployment distinction:

The exact AG-05 Vercel preview for runtime SHA 0ba7240d018efa2472a00f56453e9aa8be34e1c5 is READY:

- deployment: dpl_DiC5U13hXBfgotJo921KqoqoXPrq
- preview host: healthtimes-staging-gjuanyuzs-11-11.vercel.app

However the named primary rehearsal alias healthtimes-staging.vercel.app still points to AG-02:

- deployment: dpl_4xmfSenLQtJTQbNMpK7g3boFboaK
- SHA: 4512b7d647eda850ec1e70ad440d459fbd1d82d0
- branch: migration/ag-02-staging-platform

Fresh checks on that primary alias still return HTTP 404 for:

- /robots.txt
- /sitemap.xml
- /feed/
- /2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
- /global-health/

Therefore the moderator-requested primary rehearsal alias gate is not closed.

## 5. Initial-HTML SEO

For migrated story/page routes the AG-05 server renderer emits:

- title
- description from source SEO metadata where present, otherwise permitted authoritative story fallback
- canonical URL
- robots/index state
- Open Graph title/description
- Open Graph image only when authoritative image evidence exists
- Twitter card metadata
- publication and modified dates
- author identity where present
- section identity where present

Premium-marker-review content preserves public authority metadata while withholding the full body.

The renderer does not invent source-plugin SEO fields.

## 6. Structured data

Authoritative JSON-LD includes:

- NewsArticle for posts
- Article for pages
- Person only where a real imported author exists
- Organization publisher relationship
- BreadcrumbList
- CollectionPage for compatibility context routes

Tests continue to fail closed when required facts are absent.

## 7. Sitemap / robots / feed

On the guarded AG-05 rehearsal runtime backed by the completed staging corpus:

- /sitemap.xml: HTTP 200, 5,786 URL entries
- /robots.txt: HTTP 200, staging indexing blocked
- /feed/: HTTP 200, 50-item current RSS sample

The production robots candidate remains separate and unactivated.

The primary alias healthtimes-staging.vercel.app still returns HTTP 404 for all three because it is pinned to the older AG-02 deployment. No production Search Console submission was made.

## 8. Internal-link destination contract supplied to AG-04

AG-04 owns body-link rewriting. AG-05 owns destination routing policy.

Documented contract:

docs/migration/15_AG05_AG04_INTERNAL_LINK_DESTINATION_POLICY.md

Current deterministic story-link audit:

- preserved-direct paths: 2,325 / 4,473 occurrences
- unique-story-slug aliases: 341 / 661 occurrences
- explicit 404 exception paths: 28 / 66 occurrences
- homepage/fragment target: 1 path / 153 occurrences
- redirect-chain candidates: 0
- homepage catch-all aliases: 0

AG-04's separately reported unmapped absolute-link classes are assigned as follows:

- 661 unique-story-slug occurrences → canonical story destination / one-hop compatibility 301
- 429 category occurrences across 36 distinct source paths → preserved context route, HTTP 200, noindex,follow
- 25 home occurrences → /
- 1 tag occurrence → preserved legacy context, HTTP 200, noindex,follow
- 7 historical author occurrences → explicit exception until authoritative author-alias evidence exists
- 68 historical/malformed occurrences → explicit exception / 404 unless deterministic source evidence supplies a destination

Every one of the 36 observed category paths has a final category slug matching exactly one imported section identity, including nested historical paths. No display-name-only inference is used.

## 9. HOSPAZ

HOSPAZ remains a direct-ad abstraction, separate from AdSense and Ad Inserter.

Bound migrated identities:

- 32960 → media UUID 6a6c15b7-2874-40ad-977b-a92015663c24
- 32971 → media UUID c4a3ee5c-d73a-44cc-9011-f9f94487b8c1
- 33005 → media UUID 5952595d-76c0-4fb3-9d9a-3a0821596137

Current canonical staging storage objects exist for all three identities.

Commercial provenance remains truthful:

- 32960 / 32971 shared checksum: 50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f
- current placement source attachment: 33005
- Elementor template: 21
- destination URL: UNKNOWN
- schedule: UNKNOWN
- placement conditions: UNKNOWN
- HOSPAZ Ad Inserter placement: none

The preview does not invent a click target, dates, approval state, or placement conditions.

## 10. AG-04 media boundary

AG-05 does not claim AG-04 content/media parity.

The moderator-provided CP4 media/content blockers remain AG-04-owned unless AG-04 publishes a superseding closure receipt. AG-05 route and SEO logic tolerates explicit missing-media states and does not fabricate valid assets.

CP4 remains not accepted in the supplied handoff.

## 11. Performance / Lighthouse

AG-05 Certification run: 35685656455 — SUCCESS  
Lighthouse job: 106612369495 — SUCCESS  
CLS threshold: 0.10  
CLS gate: PASS

| Page | Strategy | Score | LCP | CLS | TBT | INP |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Archive | Desktop | 98 | 1047 ms | 0.0026 | 0 ms | N/A in lab |
| Archive | Mobile | 98 | 2029 ms | 0.0631 | 11.5 ms | N/A in lab |
| Direct-ad preview | Desktop | 100 | 708 ms | 0.0000 | 0 ms | N/A in lab |
| Direct-ad preview | Mobile | 100 | 1007 ms | 0.0000 | 0 ms | N/A in lab |
| Home | Desktop | 92 | 1805 ms | 0.0561 | 0 ms | N/A in lab |
| Home | Mobile | 89 | 3750 ms | 0.0000 | 86 ms | N/A in lab |
| Migrated story | Desktop | 100 | 752 ms | 0.0000 | 0 ms | N/A in lab |
| Migrated story | Mobile | 91 | 3469 ms | 0.0000 | 0 ms | N/A in lab |
| Premium | Desktop | 100 | 449 ms | 0.0026 | 0 ms | N/A in lab |
| Premium | Mobile | 98 | 1981 ms | 0.0000 | 85 ms | N/A in lab |

INP is null/unavailable in these lab measurements and is not fabricated.

## 12. Tests / CI

Runtime SHA: 0ba7240d018efa2472a00f56453e9aa8be34e1c5

- Migration Tests run 35685659947: SUCCESS — 60 / 60 PASS in 3.8 s
- Validate HealthTimes 2.0 run 35685659694: SUCCESS
- AG-05 Certification run 35685656455: SUCCESS
- Browser smoke job 106611789132: SUCCESS
- Live AG-04 rehearsal runtime job 106611789406: SUCCESS — 13 / 13 PASS
- Lighthouse job 106612369495: SUCCESS
- exact-head Vercel preview dpl_DiC5U13hXBfgotJo921KqoqoXPrq: READY

PR #12 remains Draft / Open / Unmerged.

## 13. Google / account-level evidence gaps

Known identities and continuity contracts remain preserved, but the following evidence is still unavailable and therefore remains explicit:

- GA4 account ownership/settings/history
- Search Console property type/owners/history
- AdSense account ownership/reporting/history
- incomplete Google Ads campaign/conversion truth
- external citation/backlink provider connectivity

No account-level fact was fabricated and no production Google property was modified.

## 14. Remaining CP5 blocker

One acceptance gate remains red:

Primary rehearsal alias deployment.

healthtimes-staging.vercel.app still serves the AG-02 deployment and returns the 404 shell for required migrated routes and discovery artifacts. AG-05's exact-head implementation is READY and fully certified against the completed staging corpus, but the named rehearsal alias has not been promoted/repointed to it.

The connected Vercel actions available in this execution environment expose deployment inspection and preview access but not an alias-promotion operation. PR #12 must also remain unmerged. AG-05 therefore does not mutate another lane or bypass deployment governance to force the alias.

Once the primary staging alias is promoted to an AG-05-capable deployment, the required closure check is bounded:

- verify old / recent / long / page / Premium / context routes
- verify /sitemap.xml = 5,786
- verify staging /robots.txt
- verify /feed/
- verify alias 301 and explicit 404 behavior
- verify HOSPAZ noindex preview
- confirm no production system was modified

Google/account and HOSPAZ commercial unknowns remain evidence gaps, not invented blockers.

## 15. Decision

CP5 NOT ACCEPTED — implementation and exact-runtime certification are green, but the moderator-required primary HealthTimes Staging alias still serves the older AG-02 deployment and returns 404 for the required migrated routes/artifacts.

Production WordPress modified: NO  
Production DNS modified: NO  
Production Analytics modified: NO  
Production Search Console modified: NO  
Production AdSense modified: NO  
Production Google Ads modified: NO  
Production systems modified: NO
