# AG-04 — Phase 1 Migrated Data Custody & Staging State Certification

Date: 2026-09-23  
Repository: `kudzimusar/htp-zw`  
Branch: `recovery/ag04-staging-data-custody`  
Authoritative Phase 0 starting SHA: `5ebca46044d9a973f34bf0a25f0ed48652ab8f68`

## 1. Phase boundary

This document is **read-only custody evidence** for HealthTimes Staging.

No database migration, reset, restore, import, storage cleanup, RLS rewrite, runtime change, staging alias movement, PR merge, or production action was performed.

Phase 2 has not begun.

## 2. Supabase project identity

Project identity was proven before any data query.

- project ref: `gcdohgbmqhqwydgaxrcr`
- name: **HealthTimes Staging**
- region: **ap-northeast-1**
- status: **ACTIVE_HEALTHY**
- API URL: `https://gcdohgbmqhqwydgaxrcr.supabase.co`
- organization: **11-11 Tech**
- organization plan: **free**

A separately visible Supabase project is:

- `ennfiyxlkvlmtkmibltz`
- **Sessions Music**
- ap-northeast-1
- INACTIVE

It was not queried or modified for this phase.

## 3. Live database inventory

### Schemas

Observed schemas:

- `auth`
- `extensions`
- `graphql`
- `graphql_public`
- `public`
- `realtime`
- `storage`
- `supabase_migrations`
- `vault`

### Public schema inventory

- public base tables: **90**
- public base tables with RLS enabled: **90**
- public base tables with RLS disabled: **0**
- public views: **1**
- public functions/RPCs/triggers: **133**
- public RLS policies: **59**
- live Supabase migration-ledger rows: **43**

The single public view is:

- `ag05_url_coverage_status`

### Domain structure counts

- migration/content/CP5 custody tables: **13**
- AG-06 / CA-01 operational tables: **25**
- COM-01 tables: **22**
- other base/analytics/ads/support tables: **30**

### Relevant accepted structures present

Migration/content/CP5 structures include:

- `legacy_sources`
- `authors`
- `media_assets`
- `stories`
- `media_usage`
- `sections`
- `tags`
- `story_tags`
- `legacy_url_mappings`
- `seo_metadata`
- `migration_runs`
- `migration_source_snapshots`
- `ag05_internal_link_audit`

AG-06 / CA-01 structures include newsroom RBAC, staff/session, revision/lifecycle, assignment/review, internal comment, desk/thread/message, announcement, communication-attachment and reader-comment structures.

COM-01 structures include communication channel/account/contact/consent/suppression/thread/message/assignment/template/event/idempotency/attachment, campaign, segment, social, provider-webhook and escalation structures.

## 4. RLS and public-visibility custody

All **90** public base tables currently have RLS enabled.

The `stories` table has AG-06 authenticated newsroom read/update policies. Direct anonymous table access is not the CP5 public delivery mechanism.

CP5 public delivery remains through `SECURITY DEFINER` RPCs. The required CP5 RPCs remain executable by both `anon` and `authenticated`.

No Phase 1 RLS policy was created, removed or modified.

## 5. Expected versus actual migrated corpus

The authoritative migrated WordPress subset was separated from later newsroom-created rows by WordPress legacy provenance.

| Custody item | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| WordPress posts | 5,737 | **5,737** | MATCH |
| WordPress pages | 49 | **49** | MATCH |
| Public migrated objects | 5,786 | **5,786** | MATCH |
| Authors | 3 | **3** | MATCH |
| Categories / sections | 83 | **83** | MATCH |
| Tags | 10,283 | **10,283** | MATCH |
| Media records | 3,277 | **3,277** | MATCH |
| Legitimate canonical media | 3,275 | **3,275** | MATCH |
| Explicit source-media exceptions | 2 | **2** | MATCH |
| Public URL mappings | 5,786 | **5,786** | MATCH |
| Missing canonical media | 0 | **0** | MATCH |
| Stale `wordpress/uploads/...` objects | ~2,430 | **2,430** | MATCH / PRESERVED |

Additional integrity measurements:

- duplicate migrated WordPress source IDs: **0**
- duplicate legacy URL paths: **0**
- `seo_metadata` rows: **5,786**
- `story_tags` relationships: **20,586**
- `media_usage` relationships: **3,298**
- old WordPress upload hotlink stories: **0**
- migrated story bodies referencing stale `wordpress/uploads/...` prefix: **0**
- media records using stale old-prefix storage keys: **0**
- media public URLs using stale old-prefix paths: **0**

### Why `stories` currently contains 5,833 rows

The physical `stories` table has **5,833** rows.

Exactly **5,786** are the authoritative WordPress-migrated post/page corpus.

The additional **47** rows have no WordPress post/page legacy provenance and belong to later newsroom/certification activity:

- 23 currently `publish`
- 24 currently `draft`

This is coexistence, not migrated-source count drift.

All **5,786** WordPress rows remain published and retain WordPress legacy provenance.

## 6. Migration source snapshot and import-run ledger

Live `migration_source_snapshots` contains the authoritative snapshot:

- snapshot key: `cp3-2026-09-21`
- status: `AUTHORITATIVE_REHEARSAL`
- source: `https://healthtimes.co.zw`
- date: 2026-09-21
- posts: 5,737
- pages: 49
- media: 3,277
- categories: 83
- tags: 10,283
- authors: 3
- database SHA-256: `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060`
- uploads SHA-256: `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c`

Live `migration_runs` contains **5** completed AG-04 rehearsal-import rows.

All five carry the same manifest checksum:

`c27369f0f98623fe75c86553fb7c612f9306290ec22c57dc39cd0d7a91821664`

Each run records:

- posts: 5,737
- pages: 49
- authors: 3
- categories: 83
- tags: 10,283
- media: 3,277
- media exceptions: 2
- zero-byte upload files: 7
- executable upload exclusions: 2

No Phase 1 row was inserted into either migration table.

## 7. Representative migrated-content custody

| Case | Source ID | Canonical path | Title / author / date | Body | Featured media |
| --- | --- | --- | --- | --- | --- |
| Old article | `935` | `/2016/02/16/zim-launches-unicef-eli-lilly-initiative-to-fight-pediatric-and-adolescent-ncds/` | Zim launches UNICEF-Eli-Lilly initiative… / Kuda Pembere / 2016-02-16 | present, 4,353 chars | none expected |
| Recent article | `30154` | `/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/` | Who Should Not Take Lenacapavir?… / Michael Gwarisa / 2026-02-12 | present, 4,168 chars | source `29991`, object present |
| Premium-review article | `33190` | `/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/` | Zimbabwe Looks to Strengthen Social Contracting… / Michael Gwarisa / 2026-09-18 | present in custody DB, 10,701 chars; access policy `premium_marker_review` | source `33192`, object present |
| Long article | `4726` | `/2018/10/26/gvt-applauds-un-investment-in-zims-health-sector/` | Gvt Applauds UN Investment… / Michael Gwarisa / 2018-10-26 | present, 37,745 chars | source `4731`, object present |
| Normal page | `1208` | `/research-findings/` | Research & Findings / healthTimesco / 2025-12-09 | present, 14,336 chars | none |
| Elementor-derived | `26888` | dated canonical path retained | Malawi Launches Second Edition… / Michael Gwarisa / 2025-07-08 | present, 5,147 chars | none |
| Gallery | `23604` | dated canonical path retained | Increased Domestic Funding… / Michael Gwarisa / 2024-04-15 | present, 5,543 chars | none |
| Table | `27164` | dated canonical path retained | CWGH Urges Transparency… / Michael Gwarisa / 2025-08-02 | present, 7,689 chars | none |
| Video/embed | `27858` | dated canonical path retained | Zimbabwe’s Intersex Community… / Michael Gwarisa / 2025-09-30 | present, 4,613 chars | none |
| Download/document | `29219` | dated canonical path retained | FDA approves daily pill… / healthTimesco / 2025-12-20 | present, 13,345 chars | source `29220`, object present |

Every representative URL mapping remains:

- HTTP `200`
- `PRESERVE_DIRECTLY`

No representative body or relationship was modified during Phase 1.

## 8. Storage/media custody

### Buckets

| Bucket | Public | Objects |
| --- | --- | ---: |
| `migrated-media` | YES | **5,705** |
| `newsroom-private` | NO | 0 |
| `newsroom-communications-private` | NO | 0 |
| `communications-private` | NO | 0 |

### `migrated-media`

- canonical objects under `wordpress/...` excluding old prefix: **3,275**
- canonical media records with a matching object: **3,275**
- canonical media records missing an object: **0**
- explicit `missing_from_uploads_archive` records: **2**
- stale `wordpress/uploads/...` objects: **2,430**
- stale old-prefix objects referenced by media records: **0**
- stale old-prefix objects referenced by media public URLs: **0**
- stale old-prefix objects referenced by migrated story bodies: **0**
- old WordPress upload hotlinks in bodies: **0**

The 2,430 stale objects remain preserved. No object was deleted or moved.

### Media status

- `pending`: **3,275**
- `missing_from_uploads_archive`: **2**

## 9. HOSPAZ custody

Source media identities remain:

### `32960`

- object: `wordpress/2026/08/HOSPAZ.jpg`
- storage object exists: **YES**
- checksum: `50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`

### `32971`

- object: `wordpress/2026/08/HOSPAZ-1.jpg`
- storage object exists: **YES**
- checksum: `50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`

### `33005`

- object: `wordpress/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg`
- storage object exists: **YES**
- remains current rehearsal source attachment for `hospaz-header-direct`

Commercial truth remains:

- destination: **UNKNOWN**
- schedule: **UNKNOWN**
- placement conditions: **UNKNOWN**
- placement state: `bound_rehearsal`

No commercial value was inferred or changed.

## 10. CP5 database capabilities

| Capability | State | Notes |
| --- | --- | --- |
| `ag05_resolve_public_path(text)` | **PRESENT** | `SECURITY DEFINER`; anon/authenticated EXECUTE |
| `ag05_public_story_document(text)` | **PRESENT** | `SECURITY DEFINER`; anon/authenticated EXECUTE |
| `ag05_public_context_document(text)` | **PRESENT** | `SECURITY DEFINER`; anon/authenticated EXECUTE |
| `ag05_public_sitemap_xml()` | **PRESENT** | `SECURITY DEFINER`; anon/authenticated EXECUTE |
| `ag05_public_feed_rows(integer)` | **PRESENT** | `SECURITY DEFINER`; anon/authenticated EXECUTE |
| `ag05_hospaz_direct_ad_preview()` | **PRESENT** | `SECURITY DEFINER`; anon/authenticated EXECUTE |

Observed function-definition custody fingerprints:

- `ag05_resolve_public_path`: `67aedde1f53c6ac16bade49b462fb30c`
- `ag05_public_story_document`: `fd5cca5af13b67e2727f15cd186dd49d`
- `ag05_public_context_document`: `7f662c46681122e9ca91e393d591a00a`
- `ag05_public_sitemap_xml`: `077a38cb96cc138586dfaa86a0076836`
- `ag05_public_feed_rows`: `4e55dc5158262cee9524d560741b2f71`
- `ag05_hospaz_direct_ad_preview`: `c3ef51e1fdf90b7389964e5388af63ca`

No missing CP5 database capability was detected.

## 11. Relevant Edge Functions

Active staging Edge Functions:

| Function | Version | Status | verify_jwt |
| --- | ---: | --- | --- |
| `ag06-certification-provision` | 7 | ACTIVE | false |
| `ca01-certification-provision` | 5 | ACTIVE | false |
| `com01-certification-provision` | 1 | ACTIVE | false |

No Edge Function was deployed, updated or deleted during Phase 1.

## 12. AG-06 / CA-01 / COM-01 coexistence

Later systems are present alongside the migrated corpus.

Observed later-state examples:

- newsroom roles: **16**
- staff profiles: **374**
- newsroom sessions: **571**
- story reviews: **92**
- communication channels: **9**
- COM-01 communication messages: **0**
- COM-01 communication threads: **0**
- audience campaigns: **0**
- provider webhook events: **0**

Coexistence result:

- WordPress migrated story/page identities remain **5,786**
- duplicate migrated source IDs remain **0**
- URL mappings remain **5,786**
- categories remain **83**
- tags remain **10,283**
- media records remain **3,277**
- canonical media matches remain **3,275 / 3,275**
- public migration/SEO RPCs remain present

The later schemas add operational rows and capabilities but no migrated-corpus loss was observed.

## 13. Live migration ledger reconciliation matrix

Important: repository migration timestamps and live applied versions diverge across AG-05, AG-06, CA-01 and COM-01. Future convergence must **not replay schema effects merely because file-version timestamps differ**.

| Migration | Repository lineage | Live DB applied | Schema effect present | Future convergence action |
| --- | --- | --- | --- | --- |
| `content_core` | Phase 0 + AG-05, repo/live version `20260909000100` | YES | YES | `NOT REQUIRED` |
| `taxonomy_and_geo` | Phase 0 + AG-05, repo/live version `20260909000200` | YES | YES | `NOT REQUIRED` |
| `redirects_and_seo` | Phase 0 + AG-05, repo/live version `20260909000300` | YES | YES | `NOT REQUIRED` |
| `analytics_and_ads` | Phase 0 + AG-05, repo/live version `20260909000400` | YES | YES | `NOT REQUIRED` |
| `migration_runs_and_checkpoints` | Phase 0 + AG-05, repo/live version `20260909000500` | YES | YES | `NOT REQUIRED` |
| `ag02_staging_security_baseline` | Phase 0 + AG-05, repo/live version `20260916030642` | YES | YES | `NOT REQUIRED` |
| `ag05_seo_analytics_monetization_continuity` | AG-05 repo `20260922081500`; absent Phase 0 | YES as live `20260921232347` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_rehearsal_runtime_closure` | AG-05 `20260922094000`; absent Phase 0 | YES as `20260922003145` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_sitemap_xml_rpc` | AG-05 `20260922095000`; absent Phase 0 | YES as `20260922003554` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_url_resolution_ledger` | AG-05 `20260922096000`; absent Phase 0 | YES as `20260922003722` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_link_ledger_evidence` | AG-05 `20260922097000`; absent Phase 0 | YES as `20260922004651` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_materialize_link_audit` | AG-05 `20260922098000`; absent Phase 0 | YES as `20260922005024` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_context_routes` | AG-05 `20260922120500`; absent Phase 0 | YES as `20260922030247` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_preserve_direct_handoff_case` | AG-05 `20260922121500`; absent Phase 0 | YES as `20260922030729` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_normalize_preserve_strategy` | AG-05 `20260922122000`; absent Phase 0 | YES as `20260922035013` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_nested_category_context` | AG-05 `20260922122500`; absent Phase 0 | YES as `20260922035335` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag05_rehearsal_readiness_guard` | AG-05 `20260922131000`; absent Phase 0 | YES as `20260922040649` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_newsroom_auth_rbac` | Phase 0 `20260922080100` | YES as `20260922020254` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_newsroom_story_listing_perf` | Phase 0 `20260922080200` | YES as `20260922031250` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_story_rls_performance` | Phase 0 `20260922080300` | YES as `20260922032244` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_auth_delete_revocation` | Phase 0 `20260922080400` | YES as `20260922033157` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_auth_delete_guard` | Phase 0 `20260922080500` | YES as `20260922033542` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_security_advisor_hardening` | Phase 0 `20260922112000` | YES as `20260922021521` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ag06_staging_http_cert_helper` | live-only certification migration | YES `20260922021319` | NO persistent helper object remains | `NOT REQUIRED` |
| `ag06_staging_http_cert_helper_cleanup` | live-only certification cleanup | YES `20260922021408` | NO persistent helper object remains | `NOT REQUIRED` |
| `ag06_staging_confirm_reporter_probe_35679759314` | live-only certification probe | YES `20260922023605` | NO durable schema object identified | `NOT REQUIRED` |
| `ag06_certification_cleanup_35683173735_v2` | live-only certification cleanup | YES `20260922033138` | NO durable schema object identified | `NOT REQUIRED` |
| `ag06_cleanup_failed_certification_users` | live-only certification cleanup | YES `20260922035050` | NO durable schema object identified | `NOT REQUIRED` |
| `ca01_internal_schema_capabilities` | Phase 0 `20260922140000` | YES as `20260922054411` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_inbox_story_discussion` | Phase 0 `20260922140100` | YES as `20260922054415` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_desks_threads_announcements` | Phase 0 `20260922140200` | YES as `20260922054420` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_communication_storage` | Phase 0 `20260922140300` | YES as `20260922054424` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_reader_discussion_moderation` | Phase 0 `20260922140400` | YES as `20260922054428` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_realtime_authorization` | Phase 0 `20260922140500` | YES as `20260922054449` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_attachment_access_hardening` | Phase 0 `20260922140600` | YES twice: `20260922055517`, `20260922061142` | YES | `SCHEMA EFFECT PRESENT — LEDGER RECONCILIATION REQUIRED` |
| `ca01_desk_member_rls_recursion_fix` | Phase 0 `20260922140700` | YES as `20260922061238` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `ca01_fk_index_hardening` | Phase 0 `20260922140800` | YES twice: `20260922065253`, `20260922065811` | YES | `SCHEMA EFFECT PRESENT — LEDGER RECONCILIATION REQUIRED` |
| `ca01_realtime_event_emission` | Phase 0 `20260922140900` | YES as `20260922070256` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `com01_communications_domain` | Phase 0 / COM-01 `20260922183500` | YES as `20260922094527` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `com01_private_attachments` | Phase 0 / COM-01 `20260922183600` | YES as `20260922095013` | YES | `ALREADY APPLIED — ADOPT INTO UNIFIED LEDGER` |
| `com01_campaign_and_escalation_authority` | no file found at Phase 0, AG-05 or current COM-01 migration directory | YES `20260922100851` | YES — campaign approval + notification escalation functions/table exist | `SCHEMA EFFECT PRESENT — LEDGER RECONCILIATION REQUIRED` |

### Migration-ledger conclusions

- Base/CP1 and AG-02 versions align directly between repository and live DB.
- AG-05/CP5 schema effects are fully live but the AG-05 migration files are absent from the Phase 0 starting tree.
- AG-06, CA-01 and COM-01 repository filenames use different timestamp versions than the live applied ledger even where migration names match.
- CA-01 has duplicate live ledger entries for two migration names.
- COM-01 has one persistent live migration, `com01_campaign_and_escalation_authority`, not found in the inspected repository migration lineages.
- Several AG-06 certification-only migrations are live ledger history without a durable helper schema object.
- No migration was applied or replayed during Phase 1.
- No destructive schema conflict was observed. Future reconciliation must be forward-only and must recognize already-applied effects.

## 14. Custody fingerprints

Captured read-only at:

`2026-09-23T01:07:27.05965Z`

Fingerprints are evidence summaries, **not a restorable database backup**.

- migrated content fingerprint: `0b7068e8221cd556aef039f4a9cdf1a7`
- media-record fingerprint: `e45f1ebd8ddd02ee2f5d7f0ec017ecef`
- taxonomy fingerprint: `4b6bc276622b95144dc9a021ede33c38`
- URL-mapping fingerprint: `380ef9c85359b64373ed056ebdd42d56`
- `migrated-media` manifest rows: **5,705**
- `migrated-media` manifest fingerprint: `174b4f3faea00e4df15880448204b41a`
- public schema/function fingerprint: `720f7bf8d1f250352f8cc6e34fdcfff2`
- Supabase migration-ledger rows: **43**
- migration-ledger fingerprint: `1c312d83d8f3fc34c70f2dd8f2237ca8`

The storage manifest fingerprint covers object name, recorded size, MIME type and eTag for every object in `migrated-media`.

No storage bytes were downloaded or changed.

## 15. Pre-convergence backup/export status

**BLOCKED IN THIS EXECUTION ENVIRONMENT.**

A fresh restorable staging database dump/export was **not created**.

Reason:

1. HealthTimes Staging belongs to a Supabase **Free** organization.
2. Current Supabase documentation states Free projects should create off-site logical backups using `supabase db dump`.
3. The connected Supabase tooling available to this execution exposes project/schema/query/migration/function operations but **does not expose a backup/export creation action**.
4. No local terminal with the project DB credentials is available in this execution context.
5. Creating a pseudo-backup by pulling private operational rows through chat, committing a dump to public Git, or bypassing Supabase controls would not be a safe substitute.

Required preservation action before Phase 2:

- run a read-only logical export with the authenticated Supabase CLI / `pg_dump` from a secure local environment;
- store it outside Git in the approved private backup location;
- calculate SHA-256;
- record timestamp, project ref, secure location, dump checksum, and this migration-ledger fingerprint;
- do **not** restore it.

Backup location: **NOT CREATED**  
Backup SHA-256: **N/A — NOT CREATED**

This is the only hard Phase 1 completion blocker found by this custody audit.

## 16. Authoritative source archive checksum status

Requested local source paths:

- `/Users/shadreckmusarurwa/Work/source/wordpress/database/healthtimes-live-authoritative-2026-09-21.sql.gz`
- `/Users/shadreckmusarurwa/Work/source/wordpress/uploads/healthtimes-uploads-rehearsal-2026-09-21.tar.gz`

Those Mac-local files are not mounted or available in this execution environment, and no matching conversation/Library files were found.

Therefore the physical local archive files could not be freshly re-hashed here.

However the live authoritative `migration_source_snapshots` custody record contains exact accepted values:

- database: `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060` — **MATCHES ACCEPTED VALUE**
- uploads: `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c` — **MATCHES ACCEPTED VALUE**

Local-file re-hash status: **CANNOT VERIFY IN CURRENT ENVIRONMENT**

No archive was extracted or re-imported.

## 17. Variances

1. Physical `stories` row count is **5,833**, not 5,786, because 47 later non-WordPress newsroom/certification rows coexist with the migrated corpus. The WordPress-migrated subset remains exactly **5,786**.
2. Live migration ledger contains **43** rows and includes migration-version divergence from repository filenames.
3. CA-01 has duplicate live ledger names for:
   - `ca01_attachment_access_hardening`
   - `ca01_fk_index_hardening`
4. `com01_campaign_and_escalation_authority` is live with persistent schema effects but no migration file was found in the inspected Phase 0 / AG-05 / COM-01 migration directories.
5. AG-05/CP5 migrations are live but absent from the Phase 0 migration directory.
6. Three active certification Edge Functions have `verify_jwt=false`; they were observed only and not changed.
7. The required fresh pre-convergence restorable database export could not be created with available tooling.
8. Mac-local authoritative source archives could not be freshly re-hashed in this environment; their accepted hashes are preserved in the live source-snapshot ledger.

None of the observed variances is evidence that migrated WordPress content/media has been lost.

## 18. Phase 1 safety receipt

Data-loss evidence: **NO**

Runtime changed: **NO**

Database mutated: **NO**

Storage mutated: **NO**

Stale objects deleted: **NO**

Production modified: **NO**

Private dumps committed to Git: **NO**

Phase 2 started: **NO**

## 19. Phase 1 disposition

The migrated corpus, canonical media, URL mapping, source checksum ledger, CP5 functions, later AG-06/CA-01/COM-01 coexistence, storage residue and migration-ledger divergence are now documented and fingerprinted.

The one unresolved mandatory preservation gate is the creation of a fresh restorable staging database backup/export outside Git.

**PHASE 1 BLOCKED — fresh pre-convergence HealthTimes Staging database backup/export could not be created because the connected Free-plan Supabase tooling exposes no dump/backup creation action and no secure local CLI database-export environment is available in this execution context.**
