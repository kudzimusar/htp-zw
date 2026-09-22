# AG-04 — Rehearsal Content, Media & Taxonomy Final Certification Report

Date: 2026-09-22

Branch: `migration/ag-04-rehearsal-content-media-taxonomy`

Accepted CP3 start SHA: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`

Interrupted-work remote checkpoint: `8f71ae5d502346bbc2fbe707a59df20ecf1d1429`

Repository implementation candidate before this report: `7fc2d6f537985c0f0b24d9bd80cada3f18b9f35d`

## Decision

**CP4 NOT READY.**

The full content corpus is present and idempotent at the database identity layer, the canonical public URL inventory is now exactly 5,786/5,786, taxonomy provenance is complete, and the reconstructed importer implementation is covered by green migration tests.

CP4 cannot be accepted because the real staging candidate still has unresolved migrated-media references, missing canonical media objects, unresolved internal links, and the representative preserved public routes return the HealthTimes 404 page instead of migrated content.

This report deliberately distinguishes a successful bulk import from a certified migration.

## 1. Authoritative source baseline

Source snapshot: **2026-09-21**

| Source object | Authoritative count |
| --- | ---: |
| Published posts | 5,737 |
| Published pages | 49 |
| Media records | 3,277 |
| Categories | 83 |
| Tags | 10,283 |
| Authors | 3 |

Authoritative database SHA-256:

`16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060`

WordPress table prefix:

`wpyg_`

Authoritative uploads SHA-256:

`4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c`

Private database/uploads artifacts remained outside Git.

## 2. Repository remediation reconstructed after interrupted Work session

The pushed checkpoint `8f71ae5d...` did not contain all repository-safe changes already reflected in parts of staging.

The continuation reconstructed and committed the missing implementation contract in:

- `scripts/migration/wordpress-database-rehearsal.js`
- `tests/migration/wordpress-database-rehearsal.test.js`
- `docs/migration/14_AG04_AG05_URL_CONTINUITY_CONTRACT.md`
- `.github/workflows/migration-tests.yml`

The reconstructed importer now contains:

- `PRESERVE_DIRECTLY` / HTTP `200` semantics for unchanged public paths;
- no source-to-self 301 generation;
- exactly one AG-05 manifest row per published post/page;
- deterministic safe media storage keys under `wordpress/YYYY/MM/...`;
- source-path retention in provenance even when a safe storage key differs;
- WordPress body media URL rewriting;
- deterministic image derivative/original resolution;
- deterministic unique edited/scaled attachment-family resolution;
- explicit unresolved media fallback ledger entries rather than silent loss;
- taxonomy disposition output;
- categories classified as canonical-navigation candidates;
- tags classified as `LEGACY_ONLY`;
- generated `ag04-public-url-manifest.json`;
- generated safe-key and media-rewrite exception manifests.

No private source export was committed while reconstructing these changes.

## 3. Final live staging database state

Target:

- Supabase project: **HealthTimes Staging**
- project ref: `gcdohgbmqhqwydgaxrcr`

Measured staging counts:

| Target | Count |
| --- | ---: |
| Stories/pages total | 5,786 |
| WordPress posts represented | 5,737 |
| WordPress pages represented | 49 |
| Authors | 3 |
| Sections/categories | 83 |
| Tags | 10,283 |
| Media assets | 3,277 |
| Story-tag relationships | 20,586 |
| Media-usage relationships | 3,298 |
| Legacy sources | 9,063 |
| Legacy URL mappings | 5,786 |
| SEO metadata rows | 5,786 |
| WordPress migration-run rows | 4 |

Duplicate checks:

- duplicate story source IDs: **0**
- duplicate story stable keys: **0**
- duplicate story-tag relationships: **0**
- duplicate media-usage relationships: **0**
- duplicate URL paths: **0**
- orphan public URL mappings: **0**

All four WordPress migration-run rows are marked `completed`. They share the same manifest checksum and converge to the same logical record counts.

This proves database-level idempotency for the already-executed rehearsal/reruns.

## 4. Public URL continuity and AG-05 handoff

Current staging URL accounting:

- posts: **5,737**
- pages: **49**
- total: **5,786 / 5,786**
- `PRESERVE_DIRECTLY` + HTTP 200 records: **5,786**
- self-301 records: **0**
- distinct mapped source identities: **5,786**
- mappings joining a migrated story/page: **5,786**
- duplicate old paths: **0**
- orphan mappings: **0**
- non-empty canonical URL values: **5,786**
- non-empty robots policy values: **5,786**
- source URL values: **5,786**
- source-derived SEO title values currently non-empty: **2**
- source-derived SEO description values currently non-empty: **1,973**
- measured sanitized manifest fingerprint (MD5 over ordered handoff fields): `ef2f5b3b04b1e823ea071672941d599f`

The public handoff schema is defined by:

`docs/migration/14_AG04_AG05_URL_CONTINUITY_CONTRACT.md`

and the importer emits:

`migration-output/ag04-public-url-manifest.json`

with source ID/type, source URL, destination URL, handling, HTTP status, canonical URL, robots, verification status and available source SEO fields.

### Former 5,787-row observation

The earlier report observed **5,787** `legacy_url_mappings` rows while only 5,786 public objects existed.

That was a stale pre-remediation mapping row left by the earlier path strategy; it was not an additional source content object.

The corrected per-source reconciliation now proves:

- current mapping rows: **5,786**
- distinct mapped source identities: **5,786**
- migrated public objects: **5,786**
- duplicate paths: **0**
- orphan mappings: **0**

Therefore the former extra row no longer creates public-object ambiguity.

The **URL manifest itself is ready for AG-05 consumption**, but this does not constitute CP4 acceptance because runtime route/media certification remains red.

## 5. Taxonomy

Exact source taxonomy accounting:

`83 + 10,283 = 10,366` legacy terms.

Current staging:

- categories/sections: **83**
- tags: **10,283**
- duplicate WordPress category IDs: **0**
- duplicate WordPress tag IDs: **0**

Disposition:

- 83 categories → `CANONICAL_NAVIGATION_CANDIDATE`
- 10,283 tags → `LEGACY_ONLY`

No claim is made that all 83 categories have completed editorial Global Taxonomy v1 curation.

No claim is made that the 10,283 tags should be exposed as canonical navigation.

## 6. Media reconciliation

Media source records:

- total WordPress media records: **3,277**
- records with a canonical storage key: **3,275**
- explicit `missing_from_uploads_archive` records: **2**
- media records whose canonical key currently matches a staging object: **3,229**
- canonical-key media records currently missing their staging object: **46**
- of those 46, records with a `media_usage` relationship: **41**

The two explicit source-package missing-media exceptions are WordPress attachment IDs:

- `29309`
- `29314`

The 46 canonical-object gaps are not silently converted into success. They remain unresolved staging media objects.

### Canonical storage accounting

Storage bucket `migrated-media` currently contains:

- total objects: **5,658**
- canonical `wordpress/... ` objects excluding old prefix: **3,228**
- stale `wordpress/uploads/...` objects: **2,430**
- executable PHP/PHTML/PHAR objects: **0**
- zero-sized storage objects: **0**

There are **3,229** media-record→canonical-object matches against **3,228** distinct canonical objects because one canonical object key is intentionally shared by two source media records:

- storage key: `wordpress/2025/12/prof-matope.jpg`
- source IDs: `29306`, `29547`

That difference is therefore source-identity reuse, not an unexplained missing object.

### Stale old-prefix objects

The 2,430 `wordpress/uploads/...` objects are classified as **staging-only orphan duplicate residue**:

- referenced by `media_assets.storage_key`: **0**
- referenced by `media_assets.public_url`: **0**
- referenced by migrated story bodies: **0**

They are not used to mask missing canonical objects.

They should be removed only through supported Supabase Storage operations. AG-04 did not bypass protected storage metadata/API controls.

## 7. Safe-key dispositions

Exactly three source filenames required deterministic safe destination keys while retaining the original path in provenance.

1. WordPress media source ID `1129`
   - original contains `DALL·E`
   - safe canonical key uses `DALL-E`
   - canonical object exists: **YES**

2. WordPress media source ID `5098`
   - original contains the bullet character `•`
   - safe canonical key removes/replaces the invalid punctuation
   - canonical object exists: **YES**

3. WordPress media source ID `5409`
   - original contains the en dash `–`
   - safe canonical key uses a storage-safe hyphen
   - canonical object exists: **YES**

The original paths remain in legacy source provenance.

## 8. Mandatory source-media exceptions

### Zero-byte uploads

Exactly **7** zero-byte upload files remain explicit archive-level exceptions.

They were not silently treated as successfully migrated binaries.

### PHP exclusions

The following two reviewed PHP artifacts remain excluded from public `migrated-media`:

- `783cdc75398980c451cadaa9c97279a24f6df1de971c3e654b25eb43bf7b037f`
- `76e7cd6781911a19d14c02f36b30ef35ebf891c9bcff7bdce70b366f66d06c6f`

Current public storage executable-PHP count: **0**.

## 9. HOSPAZ provenance

WordPress source identities:

- `32960`
- `32971`

Both retain checksum:

`50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`

This proves one byte-identical commercial creative with two retained WordPress source identities.

Current staging storage keys are:

- `wordpress/2026/08/HOSPAZ.jpg`
- `wordpress/2026/08/HOSPAZ-1.jpg`

The source identities and byte identity are preserved. Physical object-key deduplication is not claimed.

Attachment `33005` remains ordinary editorial-source WordPress media with canonical key:

`wordpress/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg`

Its canonical storage object exists.

`ASSET_SOURCE_PROVENANCE` remains separate from `PLACEMENT_USAGE_PROVENANCE`. AG-05 retains ownership of placement reconstruction.

## 10. WordPress media hotlinks and broken migrated-media references

Old source dependency check:

- migrated story bodies still containing `healthtimes.co.zw/wp-content/uploads/`: **0**
- old-prefix `wordpress/uploads/...` body references: **0**

Therefore:

**unexplained old WordPress upload hotlinks = 0**

However, replacing a source hotlink with a non-existent staging URL is not migration success.

Current migrated-body storage scan:

- migrated-media URL occurrences: **2,260**
- distinct migrated-media keys referenced: **1,194**
- occurrences whose exact storage object is missing: **1,826**
- distinct missing exact keys before deterministic reconciliation: **1,039**
- affected stories before deterministic reconciliation: **451**

Read-only analysis proved that:

- **1,051** broken occurrences resolve to an existing canonical original after deterministic WordPress `-WIDTHxHEIGHT` derivative normalization;
- a further **105** occurrences resolve to one unambiguous existing edited/scaled attachment-family candidate;
- **670** occurrences remain unresolved after those safe rules;
- the unresolved remainder affects **267** stories and **476** distinct keys.

The reconstructed importer now contains both safe deterministic rules so a future authorized rerun cannot reproduce the earlier broken fallback behavior.

The available Supabase execution connection is read-only. The attempted bounded staging repair failed closed with:

`ERROR 25006: cannot execute UPDATE in a read-only transaction`

No protected database/storage control was bypassed.

## 11. Internal HealthTimes link verification

Absolute HealthTimes links found in migrated story bodies:

- total occurrences: **5,667**
- occurrences resolving to a current public content mapping: **4,476**
- currently unmapped occurrences: **1,191**
- currently unmapped distinct URLs: **444**
- stories containing at least one unmapped absolute HealthTimes URL: **397**

Unmapped occurrence classification:

| Classification | Occurrences |
| --- | ---: |
| Unique slug matching exactly one imported story | 661 |
| Category archive | 429 |
| Home | 25 |
| Author archive | 7 |
| Tag archive | 1 |
| Other historical/malformed internal path | 68 |

The 661 unique-story-slug occurrences demonstrate that a material portion is repairable/reconcilable, but the current staging body still contains the unresolved path form.

These findings are not silently reclassified as valid.

## 12. Rendered-content certification

Representative source records were selected from live staging data for:

- old article;
- recent/Premium-marked article;
- long-form article;
- Elementor-like content;
- gallery content;
- table content;
- embedded/video content;
- download content.

The real Vercel staging deployment was then fetched at each preserved legacy path.

Result for every tested migrated legacy path:

**HTTP 404 — HealthTimes “Page not found” shell**

Representative routes included:

- a 2016 old article;
- the 2026-09-18 recent/Premium-marked article;
- a 52k-character long-form article;
- a 2025 Elementor-like story;
- a gallery story;
- a table story;
- an embedded-video story;
- the `/baraza-e-paper/` download page.

Therefore title/byline/date/body/media/link parity cannot be certified on rendered staging routes yet.

The base deployment is live, but migrated legacy routes are not currently serving migrated content.

This is a hard CP4 acceptance failure.

## 13. Idempotency and restartability

Evidence from the already-executed staging rehearsal:

- WordPress migration-run rows: **4**
- all four: `completed`
- shared manifest checksum: **same**
- final stories/pages: **5,786**
- duplicate story source IDs: **0**
- duplicate story-tag relationships: **0**
- duplicate media-usage relationships: **0**
- duplicate URL paths: **0**
- current URL mapping count: **5,786**, exactly one per public object.

This proves core import idempotency for the executed staging package and confirms the interrupted final rerun completed.

A final staging rerun of the **newly reconstructed media-repair implementation** cannot be certified in this runtime because staging write access is unavailable/read-only. That final repair-rerun gate remains open.

## 14. Tests and CI

Repository implementation certification at `e850dcf8cceb2d508f8863e57b35aa810ac904b6`:

- `npm run test:migration`: **38 / 38 PASS**
- GitHub Actions Migration Tests run: `35680604617` — **SUCCESS**
- GitHub Actions migration-tests job: `106596544932` — **SUCCESS**
- normal HealthTimes validation run: `35680604603` — **SUCCESS**
- validate job: `106596544000` — **SUCCESS**
- Vercel deployment status: **READY**

The migration workflow was additionally updated so final AG-04 report/continuity-contract changes themselves trigger migration certification on the draft PR.

PR:

- **#14**
- state: **Draft / Open / Unmerged**
- base: accepted CP3 branch
- production merge: **NO**

## 15. WooCommerce / Premium truth

Authoritative source state remains:

- WooCommerce orders: **0**
- subscriptions: **0**
- payment tokens: **0**
- membership plans: **1**

No subscriber entitlement population was fabricated.

Historic source markers that triggered `premium_marker_review` remain review markers, not invented subscriber entitlement.

## 16. Production and custody safety

Private source artifacts committed to Git: **NO**

Production WordPress modified: **NO**

Production database modified: **NO**

Production storage modified: **NO**

Production DNS modified: **NO**

Production email modified: **NO**

Production systems modified: **NO**

## 17. Downstream readiness

### AG-05 URL/SEO handoff

The canonical **5,786 / 5,786** source-content URL accounting is ready for AG-05 consumption.

AG-05 must not interpret that as proof that staging routes currently serve those URLs. The real staging route probes are still 404.

### AG-07

**NOT READY.**

AG-07 must not treat CP4 as accepted while the media/link/render gates above remain red.

## 18. Exact remaining CP4 blockers

1. **46** legitimate media records have canonical storage keys but no corresponding canonical staging object; **41** are referenced through `media_usage`.
2. Migrated story bodies contain **1,826** migrated-media URL occurrences whose exact object is absent. Deterministic analysis resolves 1,156 of those to existing canonical objects, but that repair cannot be applied with the available read-only staging connection; **670** occurrences remain unresolved after the safe rules.
3. **1,191** internal HealthTimes link occurrences remain outside the current public-object mapping; **661** of these are unique-story-slug links that should reconcile to imported stories.
4. Representative migrated legacy routes on real HealthTimes Staging return **HTTP 404**, preventing rendered-content parity certification.
5. A final staging rerun of the reconstructed repair implementation cannot be performed/certified through the available read-only staging connection.

The stale `wordpress/uploads/...` duplicate objects are **not** themselves a CP4 runtime blocker because they are unreferenced by media records, public media URLs and migrated bodies.

---

**CP4 NOT READY — media object/rewrite integrity, internal-link reconciliation, migrated-route rendering, and final repaired staging rerun remain unclosed.**
