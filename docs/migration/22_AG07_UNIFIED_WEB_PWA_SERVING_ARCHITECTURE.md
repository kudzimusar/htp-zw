# AG-07 — Phase 4 Unified Web/PWA Serving Architecture

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `integration/ag07-phase4-unified-web-pwa`  
**Accepted Phase 3 closure / starting SHA:** `304d475ef9e6b42d389c625695b645b0d337e4ec`  
**Certified Phase 3 runtime:** `b24ff176a5cc3323c21ad299018241dadf316bcc`  
**Certified Phase 4 runtime:** `a13fddf2cea04009701aa5d585b2259083da4474`  
**Status:** `CERTIFIED`

## 1. Authority preserved

Phase 4 preserves the accepted authority split:

- `apps/mobile` is the canonical Web/PWA/iOS/Android Reader presentation.
- `lib/ag05-capability.js` plus `api/public.js` remain the CP5 routing, SEO and public-capability authority.
- AG-06 remains Newsroom/auth/RBAC authority.
- CA-01 remains internal communications authority.
- COM-01 remains communications-domain authority; external provider wiring remains parked.

Phase 4 does not rebuild those subsystems. It connects the already-authoritative Reader presentation to the already-authoritative CP5 public capability boundary.

## 2. Previous split architecture

Before Phase 4, the repository contained two independent truths:

1. the universal Reader under `apps/mobile`, which was already the canonical product/design authority for Web/PWA/iOS/Android; and
2. the root Vercel project, whose default build/output behavior could still serve the preserved legacy root frontend instead of intentionally serving the universal Reader.

Phase 3 had already recovered CP5 route/SEO capability into a presentation-neutral boundary, but intentionally did not activate public Web/PWA routing.

The result was a serving gap: product authority and Vercel public presentation were not intentionally unified.

## 3. New serving topology

Phase 4 makes the Vercel project build and serve the universal Reader export:

```text
Browser request
   |
   v
Vercel deployment
   |
   +-- filesystem/API route exists ------------------------------+
   |                                                             |
   |  apps/mobile/dist static Reader route                       |
   |  /api/public                                                 |
   |  /api/newsroom                                               |
   |  /api/communications                                         |
   |  newsroom.html and copied operational assets                 |
   |                                                             |
   +-------------------------------------------------------------+
   |
   +-- /sitemap.xml --> /api/public?kind=sitemap
   |
   +-- /feed --------> /api/public?kind=feed
   |
   +-- /__ag05/direct-ad-preview --> /api/public?kind=ad
   |
   +-- otherwise ----> /api/web?path=<requested path>
                          |
                          +-- CP5 route decision
                          +-- 301 alias
                          +-- explicit/unknown 404
                          +-- story/context capability
                          +-- server-visible SEO injection
                          +-- universal apps/mobile Reader shell
```

The fallback is deliberately **not** a rewrite to `/index.html`. Unknown public paths therefore do not become homepage HTTP 200 responses.

Vercel's documented routing order evaluates file-system routes before rewrites. This is the platform behavior relied on here: exported Reader routes, static assets and `/api/**` functions are resolved before the bounded public fallback rewrite.

## 4. Build pipeline

`vercel.json` now declares:

- `framework: null`;
- install of root dependencies and `apps/mobile` dependencies;
- `outputDirectory: apps/mobile/dist`;
- Phase 4 build command using the existing source-parity service mode;
- root-origin `HEALTHTIMES_WEB_BASE_URL=`;
- explicit function configuration for `api/web.js`, `api/public.js`, `api/newsroom.js` and `api/communications.js`.

The Phase 4 build is:

```text
npm run native:export:web
  -> Expo Router static Web export from apps/mobile
  -> apps/mobile/dist

node scripts/web/prepare-phase4-vercel.js
  -> verifies required Reader routes/PWA files
  -> rejects /htp-zw dependency
  -> verifies manifest and service-worker scope behavior
  -> preserves required operational Newsroom/static files in dist
  -> writes build-info.json
```

The certified build exported **81 static routes**. The required Reader equivalents are present as actual Expo Router routes:

- Home: `/`
- Explore: `/explore`
- Live: `/live`
- Watch: `/watch`
- Search: `/search`
- Premium: `/premium`
- My HealthTimes: `/my`
- Article Reader: `/article/[id]`, with migrated canonical paths entering through the CP5 fallback and the universal Reader article component.

No route name was invented for Phase 4.

## 5. Route-decision flow

For a path not already satisfied by the file system or an API route:

1. Vercel rewrites it to `api/web.js`.
2. `api/web.js` normalizes the requested path.
3. Category/tag/author paths use the accepted `ag05_public_context_document` read-only capability.
4. Other public paths use `ag05_resolve_public_path`.
5. Accepted aliases return one-hop HTTP 301 with the accepted target.
6. Explicit exceptions and unknown routes return HTTP 404.
7. Accepted story paths load `ag05_public_story_document`.
8. `buildStoryCapability()` produces the CP5 presentation-neutral story/SEO object.
9. The capability is injected into the Expo `+not-found.html` universal Reader shell.
10. `apps/mobile/app/+not-found.tsx` consumes the injected capability and renders the canonical Reader presentation.
11. Public migrated stories reuse the existing `ArticleReader`; Premium-review stories receive no full body.

This boundary does not add direct database calls to Reader components. Database access remains behind the existing CP5 capability service/RPC boundary.

## 6. Server-visible SEO mechanism

The critical SEO gate is implemented in `api/web.js`.

Before client hydration, the server removes generic managed head tags from the exported Reader shell and injects the CP5 capability's:

- HTTP status;
- title;
- description;
- canonical URL;
- robots;
- Open Graph metadata;
- Twitter card;
- structured data.

The same capability is injected as `window.__HTP_PHASE4_CAPABILITY__` so the hydrated universal Reader renders the same authoritative story/context rather than restoring legacy CP5 HTML.

### Certified live raw-HTTP evidence

The exact runtime SHA ran a normal HTTP server around the exact `api/web.js` handler while reading HealthTimes Staging through the accepted browser-safe, read-only CP5 RPC boundary.

Representative migrated article:

`/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/`

Observed:

- source ID: `30154`;
- HTTP: **200**;
- presentation header: `apps/mobile`;
- canonical URL: `https://healthtimes.co.zw/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/`;
- title: **Who Should Not Take Lenacapavir? Key Health Conditions to Consider Before the Rollout**;
- description: server-visible and equal to the live CP5 capability value;
- robots: `index,follow,max-image-preview:large`;
- Open Graph title: server-visible and equal to the live CP5 capability value;
- structured data: server-visible;
- universal Reader web bundle: present;
- legacy root/CP5 presentation: not canonical.

The raw-HTTP evidence was observed at `2026-09-23T04:29:05.207Z`.

## 7. Route certification matrix

| Surface / path | Certified result |
| --- | --- |
| `/` | universal Reader static export; mobile + desktop browser smoke PASS |
| `/explore` | direct load/reload PASS |
| `/live` | direct load/reload PASS |
| `/watch` | direct load/reload PASS |
| `/search` | direct load/reload PASS |
| `/premium` | direct load/reload PASS |
| `/my` | direct load/reload PASS |
| representative migrated article | HTTP 200; raw SEO PASS; universal Reader article presentation PASS |
| accepted alias | HTTP 301 to `/2025/12/06/policy-capture-at-cop11-what-it-signals-for-global-health-governance/` |
| accepted explicit exception | HTTP 404 |
| unknown route | HTTP 404; no homepage 200 fallback |
| `/category/health_news/` | HTTP 200; `PRESERVE_CONTEXT_NOINDEX`; `noindex,follow` |
| `/tag/cpu/` | HTTP 200; `LEGACY_CONTEXT_NOINDEX`; `noindex,follow` |
| `/author/mike-gwarisa/` | HTTP 200; `PRESERVE_CONTEXT_NOINDEX`; `noindex,follow` |
| Premium-review article source `33190` | HTTP 200; `bodyProtected=true`; `bodyHtml=null`; full body not exposed |
| `/sitemap.xml` | CP5 public API; **5,786** URLs |
| `/feed` | CP5 public API; **50** items |
| `/robots.txt` | staging policy preserved: blocked |
| HOSPAZ | advertiser/source/creative provenance preserved; destination/schedule/placement conditions remain `UNKNOWN/null` |
| `/api/public` | file-system API function; not swallowed by fallback |
| `/api/newsroom` | AG-06 API preserved; not swallowed by fallback |
| `/api/communications` | COM-01 API preserved; not swallowed by fallback |
| `newsroom.html` | preserved operational surface with AG-06 security headers |

## 8. PWA root-origin evidence

The certified build proved:

- Web export is rooted at the Vercel origin;
- no hard dependency on `/htp-zw/`;
- `manifest.json` is present;
- manifest `start_url`, `scope` and `id` remain relative/root-origin neutral;
- `sw.js` is present;
- service-worker registration uses the configured Expo base URL and derives scope correctly;
- `healthtimes-icon.svg` is present;
- Expo static assets are present under `/_expo/static/js/web/`;
- Home/Explore/Live/Watch/Search/Premium/My HealthTimes direct load and reload pass;
- browser smoke passed at **390x844** and **1440x1000**;
- no offline scope expansion was introduced.

## 9. Protected operational surfaces

Phase 4 does not use an indiscriminate SPA homepage catch-all.

The deployment preserves these file-system/API authorities ahead of the public fallback:

- `/api/public`;
- `/api/newsroom`;
- `/api/communications`;
- existing additional `/api/**` functions;
- `newsroom.html` and its operational assets.

Exact-head contract results:

- AG-06 security contract: **6/6 PASS**;
- CA-01 implementation contract: **7/7 PASS**;
- COM-01 contract: **4/4 PASS**;
- CP5 Phase 3 capability contract: **10/10 PASS**;
- Phase 4 serving contract: **7/7 PASS**;
- Phase 4 browser smoke: **2/2 PASS**.

The COM-01 provider hold remains unchanged. No provider wiring was performed.

## 10. CP5 live read-only invariants

Exact-head read-only HealthTimes Staging verification against project `gcdohgbmqhqwydgaxrcr` observed:

- sitemap URL count: **5,786**;
- feed item count: **50**;
- direct source `30154`: HTTP 200, public body available;
- Premium-review source `33190`: HTTP 200, body protected, body not exposed;
- accepted alias: HTTP 301, one hop;
- accepted explicit exception: HTTP 404;
- category/tag/author compatibility: preserved;
- unverifiable `/author/michael-gwarisa/`: no authority / 404;
- HOSPAZ source attachment: `33005`;
- HOSPAZ creative: canonical `migrated-media` URL;
- HOSPAZ destination: `UNKNOWN/null`;
- HOSPAZ schedule: `UNKNOWN/null`;
- HOSPAZ placement conditions: `UNKNOWN/null`.

No source drift was evidenced, so the accepted 5,786 / 50 expectations remain unchanged.

## 11. Exact-head certification

### GitHub Actions

Workflow:

`AG-07 Phase 4 Unified Web/PWA`

Run:

`35818431962` — **SUCCESS**

Jobs:

- `107044909181` — Universal Reader build + contract + browser smoke — **SUCCESS**
- `107044909337` — CP5 read-only staging invariants — **SUCCESS**

Artifacts:

- `ag07-phase4-browser-http-evidence`
  - ID: `10731584459`
  - SHA-256: `09126e0dede328396a97d3761e55175ec849dec3732112ef038148c67364da9a`
- `ag07-phase4-readonly-staging-evidence`
  - ID: `10732436841`
  - SHA-256: `fd94cde5e796ccf175e29c6006abef24ac27ccdcf428f0efd281e4f85838f374`

### Exact-head Vercel preview

Certified runtime:

`a13fddf2cea04009701aa5d585b2259083da4474`

Automatic Git-integration preview:

- deployment ID: `dpl_7xy7ucBiz6bT7oEEYeBZXybS2zJP`;
- URL: `https://healthtimes-staging-dovqnxwz3-11-11.vercel.app`;
- state: **READY**;
- ready state: **READY**;
- source: `git`;
- target: **null**;
- branch: `integration/ag07-phase4-unified-web-pwa`;
- exact deployment SHA: `a13fddf2cea04009701aa5d585b2259083da4474`;
- Vercel GitHub commit status: **success**.

The preview remains protected by Vercel Authentication. No deployment-protection exception or public exposure was introduced. Route behavior was therefore certified at the same exact SHA through the CI-built universal Reader, normal raw HTTP execution of the exact `api/web.js` handler against live read-only staging CP5 data, and mobile/desktop Chromium smoke. The protected preview itself was not made anonymous merely to satisfy testing.

### Primary staging alias

The primary alias was not moved.

`healthtimes-staging.vercel.app` still resolves to:

- deployment: `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`;
- SHA: `4512b7d647eda850ec1e70ad440d459fbd1d82d0`.

Phase 4 did not assign the primary staging alias.

## 12. Legacy UI disposition

The legacy root evidence remains present and was not deleted:

- `index.html`;
- `app.js`;
- `v21.js`;
- legacy CSS/assets.

It is no longer the Vercel public build output for the Phase 4 unified runtime.

No legacy CP5/root header, navigation or page renderer was restored as canonical presentation.

## 13. Phase 5 and Phase 6 deferrals

Phase 4 intentionally does not resolve:

### Phase 5

Migration-ledger reconciliation remains deferred. Phase 4 does not:

- replay/import/repair/push migrations;
- reset or restore Supabase;
- reconcile repository migration files with already-live CP5 RPC effects.

### Phase 6

Full migrated-corpus → Reader domain/service integration remains deferred.

Phase 4 only consumes CP5 capability where required for:

- public path resolution;
- server-visible metadata;
- canonical redirect/404 behavior;
- public migrated article/context shell behavior.

It does not bypass Reader domain/service contracts with direct database calls.

## 14. Exact runtime files changed

From Phase 3 closure `304d475ef9e6b42d389c625695b645b0d337e4ec` to certified Phase 4 runtime `a13fddf2cea04009701aa5d585b2259083da4474`:

- `.github/workflows/ag07-phase4-web-pwa.yml`
- `api/web.js`
- `apps/mobile/app/+not-found.tsx`
- `apps/mobile/app/article/[id].tsx`
- `apps/mobile/src/services/public-web.ts`
- `package.json`
- `scripts/web/phase4-live-http-check.js`
- `scripts/web/phase4-smoke-server.js`
- `scripts/web/prepare-phase4-vercel.js`
- `tests/migration/ag07-phase4-browser.spec.js`
- `tests/migration/ag07-phase4-unified-web.spec.js`
- `vercel.json`

No legacy root frontend file was deleted.

## 15. Mutation receipt

Phase 4 performed no:

- `supabase db reset`;
- database restore;
- migration replay/import/repair/push;
- destructive schema change;
- database data rewrite;
- storage mutation;
- deletion of the 2,430 stale objects;
- production deployment;
- `vercel --prod`;
- primary staging alias assignment;
- production domain change;
- production database mutation;
- production DNS/MX/email change;
- COM-01 provider wiring;
- deployment deletion;
- PR merge;
- AG-08 action;
- legacy root frontend deletion.

Authorized automatic Git-integration previews with `target:null` were created by branch pushes.

**PHASE 4 COMPLETE — UNIFIED WEB/PWA SERVING ARCHITECTURE CERTIFIED / READY FOR PHASE 5**
