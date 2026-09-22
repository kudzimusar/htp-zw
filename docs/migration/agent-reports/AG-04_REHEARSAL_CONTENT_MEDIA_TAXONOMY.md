# AG-04 Rehearsal Content, Media and Taxonomy Report

Date: 2026-09-22

Branch: `migration/ag-04-rehearsal-content-media-taxonomy`

Starting SHA: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`

## Boundary

AG-04 used the accepted CP3 private source package only. The production WordPress site, production database, DNS, email, Google configuration and payment systems were not modified.

Private WordPress artifacts stayed outside the repository.

Target environment used for rehearsal writes:

- Supabase project: HealthTimes Staging / `gcdohgbmqhqwydgaxrcr`
- Storage bucket: `migrated-media`

## Source Revalidation

The AG-03 validator was rerun against the authoritative private database and uploads package.

- Validator version: `1.2.0`
- Database checksum: `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060`
- Uploads checksum: `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c`
- Database status: `VALID`
- Prefix: `wpyg_`
- Uploads status: `VALID_REQUIRES_REVIEW`
- Known CP3 review carry-forward: 7 zero-byte files and 2 PHP files excluded from public media migration
- Revalidation status this run: `ARTIFACT_VALID_RECONCILIATION_INCOMPLETE`
- Hard gates: none

The reconciliation review state is attributable to live read-only source drift/unavailable public author evidence during this run. AG-04 used the certified CP3 snapshot baseline supplied in the task.

## Importer Work

Added a database-source rehearsal importer:

- `scripts/migration/wordpress-database-rehearsal.js`
- `tests/migration/wordpress-database-rehearsal.test.js`

Capabilities added:

- Parses authoritative WordPress SQL exports without committing source data.
- Preserves WordPress source IDs through `legacy_sources`.
- Imports authors, sections/categories, tags, media records, posts, pages, URL mappings, SEO metadata, featured media usage and story-tag relationships.
- Produces dry-run manifests and exception ledgers outside Git.
- Generates idempotent SQL chunks for staging execution.
- Detects shortcodes, Elementor metadata, embeds, tables, downloads, media embeds, internal links and media references.
- Carries forward PHP and zero-byte media exceptions.
- Preserves HOSPAZ media provenance markers for AG-04 asset ownership while leaving placement reconstruction to AG-05.

## Dry-Run Baseline

Dry-run parsed the authoritative source snapshot as:

| Record type | Count |
| --- | ---: |
| Published posts | 5,737 |
| Published pages | 49 |
| Media attachments | 3,277 |
| Categories | 83 |
| Tags | 10,283 |
| Authors | 3 |
| Content transform/review entries | 1,725 |
| Media record exceptions | 2 |
| Upload archive exceptions | 9 |
| Zero-byte upload files | 7 |
| Executable/PHP upload exclusions | 2 |
| Internal URL references detected | 7,908 |
| Inline media references detected | 1,380 |

## Staging Database Rehearsal

The first import was executed in 101 ordered SQL chunks after a single-file request was rejected by the Supabase API request-size limit.

The mandatory idempotency rerun was then executed against the same staging target using regenerated chunks after fixing legacy URL path derivation.

Final staging counts after rerun:

| Target table | Count |
| --- | ---: |
| `authors` | 3 |
| `sections` | 83 |
| `tags` | 10,283 |
| `media_assets` | 3,277 |
| `stories` | 5,786 |
| `story_tags` | 20,586 |
| `media_usage` | 3,298 |
| `legacy_sources` | 9,063 |
| `legacy_url_mappings` | 5,787 |
| `seo_metadata` | 5,786 |
| `migration_runs` | 2 |

Story/page reconciliation:

- Posts: 5,737 imported
- Pages: 49 imported
- Total published content: 5,786 imported

Duplicate checks after rerun:

- Duplicate story legacy source IDs: 0
- Duplicate media legacy source IDs: 0
- Duplicate author WordPress IDs: 0
- Duplicate section WordPress IDs: 0
- Duplicate tag WordPress IDs: 0
- Duplicate story-tag relationships: 0
- Duplicate media-usage relationships: 0
- Duplicate legacy URL paths: 0

## Taxonomy

All legacy categories and tags were preserved for staging reconciliation:

- Categories: 83
- Tags: 10,283

The importer keeps legacy tag inventory separate from canonical navigation. Global Taxonomy v1 curation remains a later editorial/product mapping step.

## Media

Media records imported:

- WordPress media attachments: 3,277
- Pending legitimate media binaries identified for transfer: 3,275
- Missing-from-uploads media records: 2
- Zero-byte upload files: 7 archive-level exceptions
- PHP upload files: 2 archive-level exclusions

HOSPAZ media handling:

- Commercial creative WordPress attachment IDs: 32960 and 32971
- Logical binary treatment: one commercial creative, two preserved WordPress source identities
- Creative SHA-256: `50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`
- Attachment 33005 remains ordinary editorial media and was kept in the normal media path.
- Placement reconstruction is intentionally not performed by AG-04.

Storage transfer result:

- Extracted legitimate attachment files into a private, non-web-served transfer directory.
- Initial storage upload stopped on an object key rejected by Supabase storage.
- Three object-key exceptions were isolated in the private transfer copy; the source archive was not modified.
- A resumed upload was interrupted after it stopped making observable progress.
- Staging storage currently contains objects under two prefixes:
  - `wordpress`: 927 objects
  - `wordpress/uploads`: 2,430 objects
- Current importer `media_assets.storage_key` values match 927 stored objects.

Media storage is therefore not CP4-clean yet. The next AG-04 action should normalize the storage destination strategy, either by uploading each year/month folder directly to `wordpress/YYYY/MM/...` or by updating `media_assets.storage_key` and content rewrite rules to the confirmed `wordpress/uploads/...` convention. The three invalid object keys must be kept as explicit exceptions or mapped to safe destination keys with provenance.

## Content Quality

The importer generated private ledgers for:

- Unsupported/review shortcodes
- Elementor metadata
- Embeds
- Tables
- Downloads
- Media embeds
- Internal HealthTimes URL references
- Inline media references
- Missing media files
- Archive-level media exceptions

No unsupported structure is silently discarded; unresolved structures remain in the exception ledgers.

Rendered-content verification and broken-link scanning were not fully completed because media storage remains inconsistent. CP4 should not be accepted until storage keys and rendered migrated pages are verified against representative migrated content.

## Tests

Migration tests:

- `npm run test:migration`
- Result: 35 passed

The suite includes AG-04 database rehearsal importer coverage for:

- mysqldump row parsing
- source-counted rehearsal manifest generation
- idempotent staging SQL/provenance key generation

## Remaining CP4 Blockers

1. Media storage prefix mismatch: stored objects are split between `wordpress/...` and `wordpress/uploads/...`.
2. Only 927 media records currently match their expected `storage_key`.
3. Three media object keys contain storage-invalid characters and need explicit safe-key mapping or exception disposition.
4. Rendered-content verification is still pending.
5. Broken-link verification is still pending.
6. Content media URL rewrite from WordPress URLs to staging storage URLs is still pending.

## Safety Statements

Private source artifacts committed to Git: NO

Production WordPress modified: NO

Production database modified: NO

Production DNS/email modified: NO

Production systems modified: NO

Source data imported to production: NO
