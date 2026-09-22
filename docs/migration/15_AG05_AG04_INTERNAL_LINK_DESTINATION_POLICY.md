# AG-05 → AG-04 Internal Link Destination Policy

Status: **ACTIVE POST-AG04 CONTINUITY CONTRACT**  
Date: 2026-09-22  
AG-04 URL handoff: `a600a68091ab89fdb3a0c779d56c431fc9f25d6e`

AG-04 owns migrated body-link rewriting. AG-05 owns destination routing policy.

This contract supplies routing classifications only. It does not claim that AG-04 media/content parity is complete.

## Canonical content objects

Accepted AG-04 URL handoff:

- posts: **5,737**
- pages: **49**
- total: **5,786**
- disposition: **PRESERVE_DIRECTLY**
- effective HTTP: **200**
- source-to-self 301: **0**
- duplicate public paths: **0**
- orphan mappings: **0**

AG-04 body links that already match these canonical public paths remain unchanged.

## Absolute HealthTimes link occurrence accounting

At handoff `a600a680...`, AG-04 measured **5,667** absolute HealthTimes occurrences: **4,476** already mapped and **1,191** outside the canonical 5,786-object map:

| Class | Occurrences | AG-05 destination policy |
| --- | ---: | --- |
| Unique story slug matching one imported story | 661 | One-hop **301** to that story's canonical preserved-direct path |
| Category archive | 429 | Preserve the exact imported category context path as **HTTP 200**, `noindex,follow` until taxonomy curation |
| Home | 25 | Preserve `/` as **HTTP 200** |
| Author archive | 7 | **EXPLICIT EXCEPTION** unless the historical author path exactly matches an imported author slug or authoritative source alias evidence is supplied |
| Tag archive | 1 | Preserve exact imported tag context as **HTTP 200**, `noindex,follow`; tag remains `LEGACY_ONLY` |
| Historical / malformed | 68 | **EXPLICIT EXCEPTION / 404** unless independently mapped by deterministic source evidence |

No class may be redirected to the homepage as a fallback.

### Post-rerun reconciliation

After the subsequent AG-04 rehearsal run completed at **2026-09-22 04:09:31 UTC**, AG-05 measured the current migrated bodies as:

- absolute HealthTimes occurrences: **5,662**
- canonically mapped: **4,473** / **2,325** distinct paths
- unique imported-story aliases: **661** / **341** paths
- category archives: **429** / **36** paths
- home: **25** / **1** path
- author archives: **7** / **2** paths
- tag archives: **1** / **1** path
- historical/malformed: **66** / **28** paths
- current non-canonical total: **1,189**

The five-occurrence delta from the handoff total is retained as a post-rerun body-state change. AG-05 does not invent destinations merely to reproduce the earlier count.


## Deterministic story aliases

The existing AG-05 materialized link audit contains:

- **341 distinct** deterministic alias paths;
- **661 occurrences**;
- **0 redirect-chain candidates**;
- **0 homepage catch-all aliases**.

The alias rule is valid only when the final path slug matches exactly one imported story.

AG-04 may rewrite those body links directly to the canonical story path. AG-05 runtime may keep the historical alias as a one-hop 301 compatibility route.

## Category archives

AG-04 found **429** category occurrences across **36 distinct paths**.

The corpus includes both flat and historical nested category paths. For every observed path, the final category slug matches exactly one imported `sections.slug` identity in HealthTimes Staging. No category destination is inferred from display-name similarity alone.

Disposition:

`PRESERVE_CONTEXT_NOINDEX`

Runtime:

- source path retained exactly, including historical nested forms such as `/category/special_projects/tobacco_harm_reduction/`;
- HTTP 200;
- server-rendered from existing imported section/story identities;
- canonical remains the same historical category path;
- robots: `noindex,follow`;
- no second taxonomy store is created.

This is a compatibility route. It does not assert that all 83 imported categories have completed Global Taxonomy v1 editorial curation.

## Tag archive

Observed path:

`/tag/cpu/`

Imported tag slug `cpu` exists.

Disposition:

`LEGACY_CONTEXT_NOINDEX`

Runtime:

- HTTP 200;
- canonical historical tag path retained;
- robots: `noindex,follow`;
- tag remains `LEGACY_ONLY`.

AG-04 may preserve or rewrite this exact path according to body-link normalization, but must not promote the tag into canonical navigation.

## Author archives

Observed historical body-link paths:

- `/author/michael-gwarisa/` — 4 occurrences
- `/author/Healthtimes/` — 3 occurrences

Imported authors currently use:

- `mike-gwarisa`
- `healthtimesco`
- `kuda-pembere`

The two historical source paths do **not** exactly match imported author slugs.

Disposition:

`AUTHOR_ALIAS_SOURCE_EVIDENCE_REQUIRED`

AG-05 does not infer that `michael-gwarisa → mike-gwarisa` or `Healthtimes → healthtimesco` merely from display-name similarity.

Until AG-04/source custody supplies authoritative author-nicename/alias evidence:

- these historical paths remain explicit exceptions;
- runtime returns a real 404;
- AG-04 must not silently rewrite them.

Exact current imported-author slug routes may render as noindex author context pages.

## Historical / malformed paths

At handoff AG-04 reported **68** occurrences. The completed post-rerun corpus contains **66** occurrences across **28** distinct paths. They are not silently rewritten.

Disposition:

`EXPLICIT_EXCEPTION`

Default HTTP:

**404**

A path may move out of this class only with deterministic source evidence establishing one authoritative destination.

## Media boundary

This link-destination contract does not certify AG-04 media parity.

At handoff `a600a680...`, AG-04 remained authoritative for:

- 46 canonical media-object gaps;
- 41 media-usage-linked missing objects;
- 1,826 exact migrated-body missing-object occurrences;
- 1,156 deterministically repairable occurrences;
- 670 unresolved occurrences after safe repair rules;
- source-package missing attachments `29309` and `29314`;
- zero-byte and PHP exclusions.

The subsequent AG-04 rerun is not reclassified here as CP4 acceptance. AG-04 remains authoritative for final media/content-parity certification.

AG-05 routing must tolerate missing media explicitly and must not fabricate valid asset URLs.

## HOSPAZ

AG-05 direct-ad routing remains separate from body-link rewriting.

Current canonical staging objects exist for:

- `32960` → `wordpress/2026/08/HOSPAZ.jpg`
- `32971` → `wordpress/2026/08/HOSPAZ-1.jpg`
- `33005` → `wordpress/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg`

Commercial destination, schedule and placement conditions remain **UNKNOWN**.

## Prohibited behavior

AG-04 and AG-05 must not:

- redirect unresolved paths to `/`;
- rewrite malformed links without a recorded disposition;
- create a second story/content store;
- infer historical author aliases from names alone;
- promote legacy tags into canonical navigation without governance;
- treat a missing media object as a successful migrated asset;
- manufacture source SEO metadata.

