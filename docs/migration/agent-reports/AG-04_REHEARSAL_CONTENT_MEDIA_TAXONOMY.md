# AG-04 — Rehearsal Content, Media & Taxonomy Final Certification Report

Date: 2026-09-22

Branch: `migration/ag-04-rehearsal-content-media-taxonomy`

Accepted CP3 start SHA: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`

Interrupted-work remote checkpoint: `8f71ae5d502346bbc2fbe707a59df20ecf1d1429`

Pre-final bounded certification HEAD: `0552733fb001718b34e646ab56a5ffde93a1aeb1`

Certified AG-05 routing runtime consumed by this closure:

- runtime SHA: `0ba7240d018efa2472a00f56453e9aa8be34e1c5`
- Vercel deployment: `dpl_DiC5U13hXBfgotJo921KqoqoXPrq`
- deployment state: **READY**
- routing policy: `docs/migration/15_AG05_AG04_INTERNAL_LINK_DESTINATION_POLICY.md`

## Decision

**CP4 ACCEPTED.**

The AG-04 content/media reconciliation is complete and the remaining route/link gates have now been closed by consuming the certified AG-05 routing contract rather than creating a second routing implementation.

The 2,430 stale `wordpress/uploads/...` objects are explicitly classified as **non-blocking staging cleanup debt** because they are unreferenced by canonical media records, public media URLs and migrated story bodies.

## 1. Final source/content baseline

| Source object | Final count |
| --- | ---: |
| Published posts | 5,737 |
| Published pages | 49 |
| Public objects | 5,786 |
| Authors | 3 |
| Categories | 83 |
| Tags | 10,283 |
| Media records | 3,277 |

Authoritative source checksums remain:

- database SHA-256: `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060`
- uploads SHA-256: `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c`
- WordPress prefix: `wpyg_`

Private source artifacts remain outside Git.

## 2. Public URL handoff

Final canonical URL accounting:

- posts: **5,737**
- pages: **49**
- public objects: **5,786 / 5,786**
- `PRESERVE_DIRECTLY` / HTTP 200: **5,786**
- self-301s: **0**
- duplicate public paths: **0**
- orphan public mappings: **0**

The former 5,787-row staging observation was a stale pre-remediation mapping row and no longer creates public-object ambiguity.

AG-04 continues to own source/content identity and body correctness. AG-05 owns runtime route resolution, aliases, context routes, canonical/SEO behavior and compatibility routing.

## 3. Final media reconciliation

Accepted final media state:

- legitimate canonical media: **3,275 / 3,275**
- explicit source media exceptions: **2**
- missing canonical objects: **0**
- old WordPress upload hotlinks: **0**
- safe-key mappings: **3**
- zero-byte exceptions: **7**
- PHP exclusions: **2**
- final repaired staging rerun: **completed**

The two explicit missing-from-source-package attachment exceptions remain:

- WordPress media ID `29309`
- WordPress media ID `29314`

### Safe-key mappings

The three storage-invalid source filenames remain deterministically mapped while preserving original source paths:

- source `1129`: `DALL·E...` → safe `DALL-E...`
- source `5098`: bullet-character filename → safe normalized key
- source `5409`: en-dash filename → safe hyphen key

### Stale storage cleanup debt

Staging still contains **2,430** stale duplicate objects under:

`wordpress/uploads/...`

They are proven unreferenced by:

- `media_assets.storage_key`
- `media_assets.public_url`
- migrated story bodies

Disposition:

**NON-BLOCKING STAGING CLEANUP DEBT**

They must be deleted later only through supported Supabase Storage operations. AG-04 does not bypass Storage protections.

## 4. HOSPAZ provenance

WordPress source IDs `32960` and `32971` remain byte-identical source identities with checksum:

`50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`

Editorial-source attachment `33005` is currently the HOSPAZ rehearsal source attachment bound by AG-05.

Current canonical object:

`wordpress/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg`

Storage existence: **YES**

Commercial facts remain intentionally unresolved:

- destination: `UNKNOWN`
- schedule: `UNKNOWN`
- placement conditions: `UNKNOWN`

No click target, schedule or commercial condition was fabricated.

## 5. Internal HealthTimes link reconciliation

The earlier AG-04 raw scan measured **5,667** absolute HealthTimes occurrences.

That figure is superseded by the post-rerun AG-05 destination audit. The final routing corpus is:

**5,662 absolute internal-link occurrences**

The five-occurrence delta is recorded as a post-rerun/normalization change and is not forced back to the older raw count.

Final destination dispositions:

| Destination class | Occurrences | Distinct paths | Runtime disposition |
| --- | ---: | ---: | --- |
| Canonical preserved public links | 4,473 | 2,325 | direct HTTP **200** |
| Unique-story historical aliases | 661 | 341 | deterministic one-hop HTTP **301** to canonical story |
| Category contexts | 429 | 36 | compatibility HTTP **200**, `noindex,follow` |
| Home | 25 | 1 | HTTP **200** at `/` |
| Historical author paths | 7 | 2 | explicit justified HTTP **404** |
| Legacy tag context | 1 | 1 | compatibility HTTP **200**, `noindex,follow` |
| Historical / malformed paths | 66 | 28 | explicit justified HTTP **404** |

Total:

`4,473 + 661 + 429 + 25 + 7 + 1 + 66 = 5,662`

### Route integrity

AG-05's materialized audit proves:

- deterministic alias paths: **341**
- deterministic alias occurrences: **661**
- redirect-chain candidates: **0**
- homepage catch-all aliases: **0**
- explicit historical/malformed 404 paths: **28**
- explicit historical/malformed 404 occurrences: **66**

The two historical author paths remain deliberately unresolved because their historical aliases do not exactly match imported author slugs:

- `/author/michael-gwarisa/`
- `/author/Healthtimes/`

They are not guessed from display-name similarity.

The observed tag path `/tag/cpu/` is preserved as a noindex compatibility context and the tag remains `LEGACY_ONLY`.

Therefore:

**unexplained internal-link failures = 0**

A link is reconciled when its runtime behavior is a deliberate direct 200, one-hop 301, compatibility-context 200, or explicit justified 404.

## 6. Rendered-content certification

The old AG-04 404 conclusion is superseded by the certified AG-05 route layer.

AG-05's certified runtime uses:

1. `ag05_resolve_public_path()` for canonical/alias resolution;
2. `ag05_public_story_document()` for authoritative staging story data;
3. `renderStoryPage()` for server-rendered migrated content;
4. `ag05_public_context_document()` for category/tag/author compatibility context.

For public stories/pages the runtime passes authoritative `body_html` into the server-rendered article body. For non-public/Premium-review content, `ag05_public_story_document()` returns a null body and the renderer emits the access-review/paywall surface instead.

The exact AG-05 live rehearsal suite certifies preserved-direct content, Premium-review body protection, long-form rendering, migrated page rendering, context routes, one-hop aliases and explicit 404 behavior on the live staging runtime.

### Representative cases

| Case | Source / path | Expected runtime | Certification result |
| --- | --- | --- | --- |
| Old article | `935` — `/2016/02/16/zim-launches-unicef-eli-lilly-initiative-to-fight-pediatric-and-adolescent-ncds/` | preserved direct **200** | **PASS** — live AG-05 suite verifies source ID, title and historical canonical route; source byline Kuda Pembere, date 16 Feb 2016, 4,353-char migrated body |
| Recent public article | `30154` — Lenacapavir story | preserved direct **200** | **PASS** — live AG-05 suite verifies migrated body, title and source ID; byline Michael Gwarisa, date 12 Feb 2026 |
| Premium-review article | `33190` — social-contracting story | preserved direct **200** with protected body withheld | **PASS** — live AG-05 suite verifies authority metadata and access-review surface; full migrated body is not exposed |
| Long-form article | `4726` — `/2018/10/26/gvt-applauds-un-investment-in-zims-health-sector/` | preserved direct **200** | **PASS** — live AG-05 suite verifies authoritative body exceeds 20,000 rendered chars; source body is 37,745 chars |
| Normal page | `1208` — `/research-findings/` | preserved direct **200** | **PASS** — canonical page mapping with 14,336-char migrated body; generic certified renderer consumes authoritative page body |
| Elementor-derived content | `26888` | preserved direct **200** | **PASS** — canonical public route, 5,147-char migrated body, Elementor marker retained, correct title/byline/date |
| Gallery content | `23604` | preserved direct **200** | **PASS** — canonical public route, 5,543-char migrated body, gallery/image structure retained |
| Table content | `27164` | preserved direct **200** | **PASS** — canonical public route, 7,689-char migrated body, table markup retained |
| Embedded/video content | `27858` | preserved direct **200** | **PASS** — canonical public route, 4,613-char migrated body, embed/video marker retained and one migrated-storage body reference present |
| Download content | `29219` | preserved direct **200** | **PASS** — canonical public route, 13,345-char migrated body, download/document reference retained |
| Featured media | public story `30154` | migrated canonical storage | **PASS** — `wordpress/2026/02/len-HealthTimes.jpg` exists in `migrated-media` |
| HOSPAZ editorial attachment | media `33005` | canonical migrated asset / AG-05 preview provenance | **PASS** — canonical object exists; AG-05 live preview verifies `33005` without inventing destination or schedule |

Additional featured-media object checks passed for representative long/download/Premium cases:

- story `4726` → `wordpress/2018/10/edited-b.jpg`: **exists**
- story `29219` → `wordpress/2025/12/jumping-pills-1296x728-header-1024x575-1.avif`: **exists**
- story `30154` → `wordpress/2026/02/len-HealthTimes.jpg`: **exists**
- story `33190` → `wordpress/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg`: **exists**

All representative source bodies inspected during this bounded certification have:

- old WordPress upload dependency count: **0**
- canonical URL mapping: **PRESERVE_DIRECTLY / 200**
- source title/byline/publication date retained
- authoritative body retained when access policy is public

The certified renderer is not a generic shell: it emits source-specific title, byline, dates, structured data, body content and migrated featured media from the staging corpus.

### Vercel protection note

The exact certified deployment is Vercel-auth protected for ad-hoc connector fetches and currently redirects fresh unauthenticated tool requests to Vercel SSO.

Those Vercel SSO 302s are not HealthTimes content redirects and are not used as CP4 route evidence.

CP4 consumes the already-certified AG-05 live browser suite and the exact certified runtime/deployment authorized by the moderator.

## 7. Cross-lane ownership

AG-04 remains authoritative for:

- source object identity;
- migrated body correctness;
- migrated media correctness;
- taxonomy provenance;
- internal-link reconciliation.

AG-05 remains authoritative for:

- runtime route resolution;
- deterministic historical aliases;
- category/tag compatibility routes;
- canonical/SEO behavior;
- server-rendered public route behavior.

No AG-05 routing code was duplicated into AG-04.

## 8. Idempotency

Final repaired staging rerun: **completed**

Final staging identity counts remain:

- stories/pages: **5,786**
- authors: **3**
- categories: **83**
- tags: **10,283**
- media assets: **3,277**
- public URL mappings: **5,786**

No duplicate story/source, story-tag, media-usage or public URL identity regression was introduced.

## 9. Tests and certification

Accepted local continuation evidence:

- `npm run test:migration`: **38 / 38 PASS**
- `npm run test:uat`: **64 / 64 PASS**

Certified AG-05 runtime evidence consumed:

- runtime SHA: `0ba7240d018efa2472a00f56453e9aa8be34e1c5`
- deployment: `dpl_DiC5U13hXBfgotJo921KqoqoXPrq`
- deployment state: **READY**
- exact AG-05 SHA Migration Tests: **SUCCESS**
- exact AG-05 SHA Validate HealthTimes 2.0: **SUCCESS**
- exact AG-05 SHA Vercel status: **SUCCESS**
- AG-05 live rehearsal route suite: **certified PASS**

PR #14 remains:

**Draft / Open / Unmerged**

## 10. Safety and custody

Private source artifacts committed to Git: **NO**

Production WordPress modified: **NO**

Production database modified: **NO**

Production storage modified: **NO**

Production DNS/email modified: **NO**

Production systems modified: **NO**

## 11. Remaining non-blocking debt

The only remaining AG-04 cleanup item is:

- **2,430** stale unreferenced `wordpress/uploads/...` staging objects.

This is integrated staging cleanup debt, not a CP4 acceptance blocker.

No CP4 hard blocker remains.

---

**CP4 ACCEPTED**
