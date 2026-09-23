# AG-05 — Phase 3 CP5 Capability Recovery

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `recovery/ag05-cp5-capability-convergence`  
**Phase 2 accepted start:** `1f51a62aa339dedae710fad22ef35d6df2ecf624`  
**Accepted CP5 runtime provenance:** `0ba7240d018efa2472a00f56453e9aa8be34e1c5`  
**Frozen integrated runtime used as architectural evidence:** `0112c8802d220d23e20288783536f22e85ea346d`  
**CP5 / integrated merge base:** `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`  
**Phase 3 runtime candidate:** `b24ff176a5cc3323c21ad299018241dadf316bcc`  
**Phase 2 authority report:** `docs/migration/20_AG07_NM07_FRONTEND_AUTHORITY_RECONCILIATION.md`

## 1. Phase 3 disposition

Phase 3 recovered accepted CP5 **platform capability** into the convergence lineage without restoring the superseded CP5/root presentation as product authority.

The recovered boundary is presentation-neutral:

- canonical route decisions;
- one-hop 301 alias semantics;
- explicit 404 semantics with no homepage catch-all;
- migrated story and context capability documents;
- canonical URL / SEO / Open Graph / structured-data semantics;
- sitemap and RSS/feed behavior;
- staging and production-candidate robots policy;
- migrated-media canonical URL resolution;
- accepted analytics continuity identities;
- HOSPAZ direct-ad provenance and fail-closed unknown handling;
- Premium-review body protection.

The canonical Reader presentation remains `apps/mobile`. Phase 3 did not modify its visual system.

No Vercel page catch-all was activated. The existing Phase 2 `vercel.json` remains unchanged.

## 2. Recovered unchanged

| Capability | Accepted CP5 provenance | Phase 3 disposition |
| --- | --- | --- |
| Staging robots protection | `0ba7240d...:robots.txt` | Recovered unchanged as `robots.txt`: `User-agent: * / Disallow: /` |
| Production robots candidate | `0ba7240d...:robots.production.txt` | Recovered unchanged as inactive candidate; allows public indexing while blocking Newsroom/internal paths and names the production sitemap |
| Analytics event version and Google identities | `0ba7240d...:analytics.js` | Values recovered unchanged in the neutral capability layer and cross-checked against the existing canonical `apps/mobile/src/growth/config.ts` |
| Feed limit | `0ba7240d...:api/public.js` | Preserved at 50 items |
| Existing database capability | accepted live CP5 RPCs | Consumed read-only; no migration replay or recreation |

Accepted analytics identities preserved:

- event version: `2026-09-09`
- Google tag: `GT-PLTTGPL`
- GA4 measurement ID: `G-S39LN2KX4X`
- GA4 account: `137814020`
- GA4 property: `359235319`
- GA4 web stream: `4756168788`

## 3. Ported / refactored

### 3.1 Presentation-neutral capability layer

New canonical Phase 3 adapter:

`lib/ag05-capability.js`

Source provenance:

- `0ba7240d...:lib/ag05-public-runtime.js`
  - `storageUrl`
  - `resolvedImage`
  - `structuredGraph`
  - sitemap/feed semantics
  - Premium body-withholding semantics
  - HOSPAZ provenance semantics
- `0ba7240d...:api/public.js`
  - RPC selection
  - route/redirect/404 decision flow
  - feed limit
  - sitemap/feed content types and cache intent
- `0ba7240d...:analytics.js`
  - accepted event version and Google continuity identities

Recovered functions now return data/capability objects rather than legacy HealthTimes HTML.

### 3.2 Route semantics

`routeDecision()` preserves:

- HTTP 200 for accepted canonical migrated routes;
- HTTP 301 for accepted aliases with a concrete target;
- HTTP 404 for explicit exceptions;
- fail-closed rejection of a 301 target of `/` as an invalid homepage catch-all.

The live accepted alias remains one hop:

`/policy-capture-at-cop11-what-it-signals-for-global-health-governance/`

→ HTTP 301

→ `/2025/12/06/policy-capture-at-cop11-what-it-signals-for-global-health-governance/`

The accepted explicit exception remains HTTP 404:

`/2017/04/04/gwinji-appeals-funding-health-sector/`

### 3.3 Story capability

`buildStoryCapability()` preserves:

- source identity;
- source and canonical URLs;
- accepted handling/status data;
- SEO title/description;
- robots policy;
- Open Graph metadata;
- Twitter-card intent;
- NewsArticle / Article semantics;
- Person only when a real author exists;
- Organization publisher identity;
- BreadcrumbList;
- section identity where present;
- migrated-media canonical URL;
- public migrated body when access policy is public;
- fail-closed Premium-review body protection.

The returned capability contains no root header, navigation, archive, paywall UI, stylesheet dependency, or product layout.

### 3.4 Context capability

`buildContextCapability()` preserves category/tag/author source-context semantics and `noindex,follow` behavior with CollectionPage + BreadcrumbList structured data.

No display-name alias inference was introduced.

### 3.5 HOSPAZ capability

`buildHospazCapability()` preserves accepted creative/provenance fields and intentionally exposes commercial values only when their corresponding state is `KNOWN`.

Current live accepted state remains:

- advertiser: HOSPAZ;
- placement: `hospaz-header-direct`;
- current source attachment: `33005`;
- migrated creative: canonical `migrated-media` storage URL;
- destination: `UNKNOWN` / `null`;
- schedule: `UNKNOWN` / `null`;
- placement conditions: `UNKNOWN` / `null`.

No click target, schedule, or placement conditions were invented.

### 3.6 API adapter

`api/public.js` was recovered in refactored form.

It now exposes presentation-neutral capabilities only:

- `kind=resolve` — route decision plus story/context capability;
- `kind=sitemap` — existing accepted sitemap RPC output;
- `kind=feed` — accepted feed rows rendered as RSS;
- `kind=ad` — HOSPAZ provenance capability.

It does **not** call `renderStoryPage`, `renderContextPage`, or the CP5 legacy ad-preview HTML renderer.

The endpoint is not wired as a public-site catch-all in Phase 3.

### 3.7 Compatibility path

`lib/ag05-public-runtime.js` now exists only as a compatibility export to `lib/ag05-capability.js`.

It contains no HTML renderer and no root stylesheet/header/navigation dependency.

## 4. Intentionally not recovered because it is legacy presentation

The following accepted-CP5 implementation details were deliberately excluded from convergence presentation authority:

- `renderStoryPage()` legacy HTML composition;
- `renderContextPage()` legacy HTML composition;
- `renderAdPreview()` legacy preview HTML;
- old root site header;
- old root navigation;
- `styles.css`, `v21.css`, `v21-fixes.css`, `reader.css`, `quality-pass.css` dependencies from the CP5 renderer;
- old article page composition;
- old context/archive page composition;
- old Premium/paywall visual composition;
- old homepage/archive presentation;
- legacy direct-ad preview layout.

Those remain historical/test-oracle provenance only.

## 5. Deferred to Phase 4

Phase 4 owns product-serving convergence with the canonical `apps/mobile` Web/PWA architecture.

Deferred by design:

- wiring legacy public article paths to the canonical Web/PWA renderer;
- emitting final server-visible HTML using the recovered SEO/OG/structured-data capability object;
- final Web/PWA sitemap/feed route activation if required by the selected serving architecture;
- final Vercel route integration;
- any primary staging alias reassignment;
- final visual rendering of migrated stories, contexts, Premium states, or direct ads.

Phase 3 does not activate the old CP5 catch-all as a substitute.

## 6. Database effect already live / no migration replay

Phase 1 established these accepted CP5 functions as already live in HealthTimes Staging:

- `ag05_resolve_public_path`
- `ag05_public_story_document`
- `ag05_public_context_document`
- `ag05_public_sitemap_xml`
- `ag05_public_feed_rows`
- `ag05_hospaz_direct_ad_preview`

Phase 3 consumed those functions read-only.

No AG-05 migration was recreated, copied, replayed, repaired, or pushed.

### Repository/live migration-ledger divergence

At runtime candidate `b24ff176a5cc3323c21ad299018241dadf316bcc`, repository directory `supabase/migrations` contains **zero AG-05 migration files**, while the six accepted CP5 RPC capabilities are live in staging.

This is a real convergence-history divergence caused by the CP5 side lineage not being wholesale merged.

Disposition:

**recorded for the later migration-ledger reconciliation phase; not repaired in Phase 3.**

## 7. Certification

GitHub Actions run:

`35815112404` — **SUCCESS**

Exact runtime:

`b24ff176a5cc3323c21ad299018241dadf316bcc`

### Presentation-neutral capability contract

Job:

`107034870736` — **SUCCESS**

Result:

**10 / 10 PASS**

Covered:

1. direct story SEO/OG/structured data/safe body;
2. Premium-review body withholding;
3. 301 + explicit 404 + no homepage catch-all;
4. category/tag/author presentation-neutral context;
5. sitemap/feed semantics;
6. migrated-media URL construction;
7. HOSPAZ provenance + UNKNOWN/null fail-closed behavior;
8. analytics continuity with canonical `apps/mobile` growth configuration;
9. staging/production-candidate robots semantics;
10. proof that Phase 3 did not activate the legacy Vercel catch-all or legacy HTML renderers.

### Read-only HealthTimes Staging verification

Job:

`107034870840` — **SUCCESS**

Project:

`gcdohgbmqhqwydgaxrcr`

Artifact:

- name: `ag05-phase3-readonly-staging-evidence`
- artifact ID: `10731575209`
- artifact SHA-256: `7195dcfc7fe03905cd13c6e4d25c44b4cc51b2e4815807ed0d513bae03821bbe`

Observed at:

`2026-09-23T03:38:21.541Z`

Read-only evidence:

| Behavior | Observed result |
| --- | --- |
| Sitemap public-object count | **5,786** — no drift |
| Feed rows | **50** — no drift |
| Direct migrated article | source `30154`, HTTP 200, accepted canonical URL, public body available |
| Premium-review article | source `33190`, HTTP 200, canonical retained, `bodyProtected=true`, full body not exposed |
| Accepted legacy alias | HTTP 301, one-hop non-home target |
| Accepted explicit exception | HTTP 404, no target |
| Category context | `/category/health_news/`, `noindex,follow`, `PRESERVE_CONTEXT_NOINDEX` |
| Tag context | `/tag/cpu/`, `noindex,follow`, `LEGACY_CONTEXT_NOINDEX` |
| Author context | `/author/mike-gwarisa/`, `noindex,follow`, `PRESERVE_CONTEXT_NOINDEX` |
| Unverifiable author alias | `/author/michael-gwarisa/` → no authority / 404 |
| HOSPAZ source attachment | `33005` |
| HOSPAZ creative | canonical migrated-media storage URL |
| HOSPAZ destination | `UNKNOWN` / `null` |
| HOSPAZ schedule | `UNKNOWN` / `null` |
| HOSPAZ placement conditions | `UNKNOWN` / `null` |

No accepted historical count required silent expectation changes.

## 8. Exact runtime files changed

From Phase 2 accepted start `1f51a62a...` to runtime candidate `b24ff176a5cc3323c21ad299018241dadf316bcc`:

- `.github/workflows/ag05-certification.yml`
- `api/public.js`
- `lib/ag05-capability.js`
- `lib/ag05-public-runtime.js`
- `package.json`
- `robots.production.txt`
- `robots.txt`
- `scripts/migration/ag05-capability-readonly-check.js`
- `tests/migration/ag05-capability-recovery.spec.js`

Not changed:

- `vercel.json`
- `apps/mobile/**`
- `supabase/migrations/**`
- storage configuration/content;
- deployment configuration;
- production systems.

## 9. CP5 capability matrix

| CP5 capability | Phase 3 state | Source provenance | Evidence |
| --- | --- | --- | --- |
| Canonical migrated-story resolution | RECOVERED | CP5 `api/public.js` + live `ag05_resolve_public_path` / `ag05_public_story_document` | source 30154 HTTP 200 |
| Accepted legacy alias | RECOVERED | CP5 `api/public.js` route semantics | live one-hop HTTP 301 |
| Explicit 404 | RECOVERED | CP5 `api/public.js` route semantics | live explicit 404 |
| Category context | RECOVERED | CP5 `renderContextPage` data semantics + context RPC | live noindex category |
| Tag context | RECOVERED | CP5 context route behavior | live noindex tag |
| Author context | RECOVERED | CP5 context route behavior | live real author; unverifiable alias remains absent |
| Canonical URL | RECOVERED | CP5 `renderStoryPage` metadata semantics | live direct + Premium canonical URLs |
| SEO metadata | RECOVERED | CP5 `renderStoryPage` | neutral `seo` object |
| Open Graph metadata | RECOVERED | CP5 `renderStoryPage` | neutral `seo.openGraph` |
| Structured data | RECOVERED | CP5 `structuredGraph` | NewsArticle/Article/Person/Organization/BreadcrumbList/CollectionPage |
| Sitemap | RECOVERED | CP5 `api/public.js` + live sitemap RPC | 5,786 URLs |
| RSS/feed | RECOVERED | CP5 `renderFeed` + live feed RPC | 50 items |
| Staging robots | RECOVERED UNCHANGED | CP5 `robots.txt` | `Disallow: /` |
| Production robots candidate | RECOVERED UNCHANGED / INACTIVE | CP5 `robots.production.txt` | candidate retained, not activated |
| Migrated-media URLs | RECOVERED | CP5 `storageUrl` / `resolvedImage` | deterministic storage URL + HOSPAZ live creative |
| Analytics continuity | RECOVERED / RECONCILED | CP5 `analytics.js` | identities match existing `apps/mobile` growth config |
| HOSPAZ provenance | RECOVERED | CP5 direct-ad preview semantics + live RPC | attachment 33005 + migrated creative |
| HOSPAZ commercial unknowns | RECOVERED FAIL-CLOSED | CP5 direct-ad semantics | destination/schedule/conditions UNKNOWN/null |
| Premium-review body protection | RECOVERED | CP5 `articleBody` semantics | source 33190 body not exposed |
| Legacy CP5 page HTML | INTENTIONALLY NOT RECOVERED | CP5 `renderStoryPage` / `renderContextPage` | superseded presentation |
| Public route activation in canonical Web/PWA | DEFERRED TO PHASE 4 | Phase 2 architecture authority | no catch-all activated |

## 10. Unresolved variance

### 10.1 Migration-ledger convergence

There is one intentional convergence-history variance requiring later governance:

**Repository AG-05 migration history is absent while accepted AG-05 RPC effects are live in staging.**

Phase 3 does not resolve this because migration replay/import/repair was expressly prohibited.

No accepted runtime behavior tested in the authorized Phase 3 capability scope failed to preserve.

### 10.2 Automatic Vercel preview deployment side effect

No Vercel deploy action was invoked by Phase 3 and no alias or production target was moved.

However, final platform verification found that the repository's existing Vercel Git integration automatically created preview deployments when the Phase 3 branch commits were pushed.

Observed previews:

- runtime `b24ff176...` → `dpl_HfVWCS1ymuaWsqoQSaRnmWPbfMoD` — `target: null`
- documentation `b037d8cd...` → `dpl_85CttE5PTkGUfZMCExfJF9wx1y3o` — `target: null`

This is not a production deployment and did not move `healthtimes-staging.vercel.app`, but it means the strict statement **"no deployment occurred" cannot be made**. The previews were an automatic repository-integration side effect, not an authorized/manual deployment action.

Because Phase 3 explicitly prohibited deployment, this remains a governance blocker for final Phase 3 acceptance unless the moderator accepts automatic unaliased previews as an allowed branch-push side effect.

## 11. Mutation receipt

Phase 3 performed no:

- database migration;
- database reset;
- database restore;
- database write/repair;
- storage mutation;
- stale-object cleanup/deletion;
- **manual or explicitly requested Vercel deployment**;
- primary staging alias movement;
- production deployment;
- production database change;
- DNS/MX/email/provider change;
- COM-01 provider action;
- PR merge;
- AG-08 action;
- legacy root frontend deletion;
- `apps/mobile` redesign/replacement.

Staging verification used browser-safe publishable credentials and only the accepted read-only CP5 RPC interfaces.

The runtime candidate is technically certified. The only remaining Phase 3 governance issue is the automatic, unaliased Vercel preview deployment side effect recorded above.
