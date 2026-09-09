# AG-04 — Content, Media, Taxonomy & Rehearsal Import

## Mission

Complete the importer and run the first full WordPress-to-HealthTimes rehearsal migration in staging.

## Prerequisites

- AG-02 staging platform accepted.
- AG-03 secure source package captured.

## Mandatory reads

- master programme and agent register
- `docs/migration/04_DATA_MODEL_AND_MAPPING.md`
- `docs/migration/05_MEDIA_MIGRATION.md`
- `docs/migration/10_STAGING_REHEARSAL_RUNBOOK.md`
- AG-01 taxonomy freeze and importer-gap report
- AG-03 source manifest

## Required work

1. Complete WordPress import support for the source paths actually available: REST, WXR and database reconciliation as applicable.
2. Keep importer operations dry-run capable, restartable and idempotent.
3. Preserve stable WordPress provenance for posts, pages, authors, terms, media and relationships.
4. Import/reconcile all expected published posts and pages.
5. Preserve publication date, modified date, author/byline, slug, excerpt/standfirst, body, featured media and source identifiers.
6. Detect and transform Elementor/WordPress HTML, shortcodes, galleries, embeds, tables, pull quotes, video/audio/download references safely.
7. Unknown shortcodes/fields must enter an exceptions ledger rather than disappear.
8. Transfer media to staging object storage; preserve captions, credits, alt text, copyright/source metadata and attachment provenance.
9. Rewrite content media references to staging/new storage without permanent hotlink dependence on old WordPress.
10. Generate media checksum/source-destination manifest and orphan/broken-reference report.
11. Preserve all legacy categories/tags internally, then map them to Global Taxonomy v1. Do not surface all legacy tags as canonical public navigation.
12. Reconcile authors and bylines; every published article must resolve to a mapped author or explicit exception.
13. Preserve any Premium/access marker discovered in source data without fabricating subscription state.
14. Preserve relevant WooCommerce/Premium historical records only according to the mapping plan; do not reproduce WooCommerce unnecessarily.
15. Produce before/after counts for posts, pages, media, authors and terms.
16. Run representative rendered-content comparisons, then full automated reconciliation where practical.
17. Run broken internal link checks against migrated staging content.
18. Rerun until importer errors are deterministic, documented and the acceptance ledger contains every exception.
19. Create `docs/migration/agent-reports/AG-04_REHEARSAL_CONTENT_MEDIA_TAXONOMY.md`.

## Core reconciliation target

Expected source baseline currently known:

- 5,721 published posts
- 49 published pages
- 3,260 media records
- 83 categories
- 10,238 tags
- 3 public authors

Use the actual AG-03 source snapshot as authoritative if counts differ. Explain every difference.

## Acceptance gates

- 100% expected published posts/pages accounted for or explicit exception-listed;
- all authors mapped or explicit exception-listed;
- required media accounted for or explicit exception-listed;
- taxonomy provenance retained and canonical mapping produced;
- no silent shortcode/custom-field loss;
- no unexplained broken internal links;
- importer rerun does not duplicate records;
- source IDs/checksums/provenance retained;
- staging only; production untouched.

## Stop conditions

STOP if the importer would require destructive WordPress writes, source exports are incomplete/corrupt without client clarification, or data loss cannot be explained.

## Receipt

Report:
- source snapshot ID/date;
- importer version/SHA;
- before/after counts;
- media reconciliation;
- taxonomy mapping summary;
- exception counts;
- broken-link result;
- idempotent rerun result;
- readiness for AG-07;
- `Production systems modified: NO`.
