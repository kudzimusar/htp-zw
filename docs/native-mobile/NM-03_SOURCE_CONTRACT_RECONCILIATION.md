# NM-03 — Source Contract & AG-04 Migration Handoff Reconciliation

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm03-source-contract-reconciliation`  
**Authoritative base:** `81cf766531a614e4abaa2246a2552974f3df58cc`  
**Scope:** content contracts, taxonomy/geography authority, Source Parity → AG-04 repository seam  
**Production systems modified:** **NO**

## Contract decisions

### Geography compatibility rule

`geographyRefs` is the detailed canonical geography representation and `geography` is its Reader-facing `TaxonomyRef[]` projection.

Both Source Parity and AG-04/staging mapping must build these fields through the same `normalizeCanonicalGeography()` helper. Repository choice must not alter Reader behavior because one repository populated only `geography` and another populated only `geographyRefs`.

Text-derived signals such as Zimbabwe, Harare, Bulawayo, Mutare, Masvingo or Midlands are **not canonical assignments**. They are retained in `geographyResolution.inferredRequiresReview`. Exact public WordPress taxonomy signals are retained in `geographyResolution.observedSource`. Only reviewed/certified assignments enter `geographyResolution.canonicalApproved` and therefore the Reader-facing geography fields.

The deterministic Source Parity snapshot carries explicitly curated geography assignments as its certified fallback contract; newly published fallbackless posts do not inherit canonical geography from title/excerpt inference.

### Taxonomy authority rule

Article taxonomy now separates:

1. `taxonomyResolution.observedWordPress` — source-observed WordPress categories/tags, including WordPress term identity where available.
2. `taxonomyResolution.approvedCanonical` — explicit mappings into the AG-01 canonical desk/topic vocabulary.
3. `taxonomyResolution.inferredRequiresReview` — reserved for mappings that are not approved and must not masquerade as canonical.

`legacyTaxonomy` uses `LegacyTaxonomyRef` and retains source authority, source system, WordPress term ID when known, slug, name and category/tag kind.

The canonical desk mapper has no generic Public Health fallback. A source label becomes a canonical desk only through an explicit alias in the audited mapping table.

### Provenance continuity

`mapSourceProvenance()` now understands the AG migration transform shape documented by `wordpress-transform.js` and preserves, when present:

- WordPress post/page source ID;
- author source ID;
- featured-media source ID;
- category source IDs;
- tag source IDs;
- legacy path;
- stable key;
- source URL;
- checksum;
- capture timestamp;
- shortcode/custom-field migration exceptions.

AG-04 may also supply explicit migration exceptions through `StoryRelations.migrationExceptions`.

## Source Parity bounded-feed contract

The live public bridge remains GET-only with `credentials: "omit"` and a five-minute cache.

The refresh request remains intentionally bounded to `per_page=50`. It is explicitly modeled as:

- mode: `bounded-public-feed`;
- requested page size: `50`;
- corpus completeness: `false`.

The bridge reads `X-WP-Total` and `X-WP-TotalPages` headers when available for diagnostics but does not paginate/crawl the historical corpus. The deterministic real-publication snapshot remains the fallback.

This bridge is a continuity/readability layer, **not** evidence that AG-03 capture or AG-04 migration is complete.

## AG dependency matrix

| Dependency | NM-03 consumes | Still missing / required |
| --- | --- | --- |
| **AG-01 → NM-03** | Global Taxonomy v1: eight canonical desks; Global/Africa/African-region/Zimbabwe geography hierarchy; country expansion model; rule that legacy WordPress tags remain preserved as aliases/provenance rather than automatically becoming canonical navigation. | Any future approved extension/mapping must be added explicitly rather than inferred. |
| **AG-03 → NM-03** | Public/rest source identity model; reconciliation classifications; known WordPress post/author/media/category/tag identities; requirement to preserve source provenance and exceptions. | CP3 remains blocked: authoritative private WordPress database export, complete `wp-content/uploads/` archive, provenance verification against those artifacts, and content freeze are not yet certified. |
| **AG-04 → NM-03** | Target `legacy_sources`, `stories`, authors, sections/tags, media, stable-key/checksum/raw exception model; requirement for idempotent import, canonical mapping, preserved legacy taxonomy and explicit exceptions. | A certified rehearsal import does not yet exist. Staging editorial mode therefore remains locked. |

## Exact AG-04 replacement gate

The WordPress Source Parity bridge may be replaced by an AG-04 Supabase `ArticleRepository` only when all of the following are evidenced on one staging candidate:

1. AG-03 has an accepted authoritative source package: database export plus complete uploads archive, with provenance validation.
2. AG-04 accounts for every expected published post/page, author, required media item and source term, or records a deterministic explicit exception.
3. Imported stories preserve canonical URL, publication/modified dates, author/byline, access policy, body/standfirst/excerpt, media relationships and stable WordPress provenance.
4. Legacy WordPress categories/tags remain queryable for reconciliation and canonical mappings are explicit; no inferred/review mapping is exposed as canonical.
5. Canonical geography relationships are available to the repository and map through the same `geographyRefs → geography` compatibility rule.
6. `legacy_sources` retains stable key, source ID, source URL, checksum/raw source context and migration exceptions needed by the mobile mapper.
7. Public staging read policies expose only the required published/public Reader data and media to the publishable client; Premium protected bodies remain fail-closed and no privileged key is shipped to the app.
8. Representative and full reconciliation show no unexplained content loss or broken required media/links.
9. NM-03 content-contract/source-parity tests and the native TypeScript/build suite pass against the candidate.
10. Only after those conditions are certified may the separate staging editorial-data lock in `src/services/index.ts` be changed. Production adapter activation remains separately prohibited until production certification.

## Scope handoff

No Reader visual/layout change was made for NM-04. No advertising/analytics implementation was changed for NM-05. No authorization/session implementation was changed for NM-06.

If later UI work wants to display review-state geography or taxonomy evidence, that is an NM-04 presentation decision; the NM-03 contract now exposes the state without forcing UI changes.
