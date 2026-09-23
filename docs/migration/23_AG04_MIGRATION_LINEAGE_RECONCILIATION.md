# AG-04 — Phase 5 Migration-Lineage Reconciliation

## 1. Disposition

**Candidate runtime:** `c7b4639122992810ac08827b5f7d9ed4fa0bc87f`

**Branch:** `recovery/ag04-phase5-migration-lineage-reconciliation`

**Starting SHA:** `fc2498fc6552b3a1ebd109bba4f90c7fe58d9855`

**Starting accepted runtime:** `a13fddf2cea04009701aa5d585b2259083da4474`

**Draft PR:** #23 — open, unmerged.

This phase reconciles repository migration history to the already-established HealthTimes Staging migration ledger without replaying already-live DDL and without mutating the live migration ledger.

HealthTimes Staging:

- project ref: `gcdohgbmqhqwydgaxrcr`
- region: Tokyo / `ap-northeast-1`
- authoritative live migration ledger: **43 rows**
- ledger fingerprint before reconciliation evidence: `1c312d83d8f3fc34c70f2dd8f2237ca8`
- ledger fingerprint after exact-head certification: `1c312d83d8f3fc34c70f2dd8f2237ca8`

Therefore no staging migration-ledger change occurred.

## 2. Reconciliation rule

The authoritative repository sequence now adopts the **historical live staging identities** already recorded in `supabase_migrations.schema_migrations`.

Rules used:

1. Existing durable SQL was reused byte-for-byte where the logical migration already existed in repository history under a later/divergent timestamp.
2. CP5 migrations that were live but absent from the Phase 4 convergence tree were restored to the repository under their historical live identities.
3. Transient AG-06 certification migrations that have no durable surviving schema authority are retained as explicit no-op historical adoption markers.
4. Duplicate CA-01 historical applications are retained as explicit no-op duplicate markers; their durable DDL remains owned by the first authoritative historical identity.
5. The live-only COM-01 `com01_campaign_and_escalation_authority` effect is represented as a forward-replay migration reconstructed from authoritative live schema/function definitions.
6. No live ledger row was inserted, updated, deleted, repaired or rewritten.
7. No historical migration was replayed against staging.

The machine-readable mapping is:

`supabase/migration-lineage/healthtimes-staging-adoption.json`

## 3. Repository migration inventory and live ledger disposition

At the Phase 4 closure the repository contained **24 migration files** while staging contained **43 ledger rows**.

After Phase 5 reconciliation the repository contains **exactly 43 SQL migration files**, one per live staging ledger version.

| Live version | Logical migration | Owner | Classification | Authoritative reconciled file | Deterministic content fingerprint |
| --- | --- | --- | --- | --- | --- |
| `20260909000100` | `content_core` | CP1/base | EXACT_MATCH | `20260909000100_content_core.sql` | `547da311580e5ddc18454fdf36212501a7961e78` |
| `20260909000200` | `taxonomy_and_geo` | CP1/base | EXACT_MATCH | `20260909000200_taxonomy_and_geo.sql` | `a850734c73a1f21686529691266d934f1fa0917e` |
| `20260909000300` | `redirects_and_seo` | CP1/base | EXACT_MATCH | `20260909000300_redirects_and_seo.sql` | `78cedc4fc303f9616a25a69c373e783d48be976a` |
| `20260909000400` | `analytics_and_ads` | CP1/base | EXACT_MATCH | `20260909000400_analytics_and_ads.sql` | `7d0818a4a1d3e000b4b3b81f42a1e616277c9c47` |
| `20260909000500` | `migration_runs_and_checkpoints` | CP1/base | EXACT_MATCH | `20260909000500_migration_runs_and_checkpoints.sql` | `bdc97f8deff5a2f4e2159b35452a9485b4496006` |
| `20260916030642` | `ag02_staging_security_baseline` | AG-02 | EXACT_MATCH | `20260916030642_ag02_staging_security_baseline.sql` | `170aff91933e11aae037fe9f936ae7a9813f0387` |
| `20260921232347` | `ag05_seo_analytics_monetization_continuity` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260921232347_ag05_seo_analytics_monetization_continuity.sql` | `38e72e8bb5e1c4abc976b60a5cbec8777d2c54d5` |
| `20260922003145` | `ag05_rehearsal_runtime_closure` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922003145_ag05_rehearsal_runtime_closure.sql` | `9567eabe7d293773c6ed0a8ca4ce452921af3bbe` |
| `20260922003554` | `ag05_sitemap_xml_rpc` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922003554_ag05_sitemap_xml_rpc.sql` | `c2155912ebbd9eb33e97816350d92020b44822e8` |
| `20260922003722` | `ag05_url_resolution_ledger` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922003722_ag05_url_resolution_ledger.sql` | `b38927a3a2a5e995d91dfa63940b3ce2510aa207` |
| `20260922004651` | `ag05_link_ledger_evidence` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922004651_ag05_link_ledger_evidence.sql` | `4f16d8c4f936d3fb27c058d61bd6469cd7820f84` |
| `20260922005024` | `ag05_materialize_link_audit` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922005024_ag05_materialize_link_audit.sql` | `e7add174046c15b763b5bce96de8367ad196280b` |
| `20260922020254` | `ag06_newsroom_auth_rbac` | AG-06 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922020254_ag06_newsroom_auth_rbac.sql` | `cc5477f25606cdc64bc17d2e57fe43987347077a` |
| `20260922021319` | `ag06_staging_http_cert_helper` | AG-06 certification | SUPERSEDED | `20260922021319_ag06_staging_http_cert_helper.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922021408` | `ag06_staging_http_cert_helper_cleanup` | AG-06 certification | SUPERSEDED | `20260922021408_ag06_staging_http_cert_helper_cleanup.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922021521` | `ag06_security_advisor_hardening` | AG-06 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922021521_ag06_security_advisor_hardening.sql` | `cedcdc0abe861810a7eb5103a0c128e3b9cb096a` |
| `20260922023605` | `ag06_staging_confirm_reporter_probe_35679759314` | AG-06 certification | SUPERSEDED | `20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922030247` | `ag05_context_routes` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922030247_ag05_context_routes.sql` | `34ff31581a28116bff8f457869fbfb7b7b317b65` |
| `20260922030729` | `ag05_preserve_direct_handoff_case` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922030729_ag05_preserve_direct_handoff_case.sql` | `1b05f8a8b8a56d86cd5e36009d9a4ca0fcb914ed` |
| `20260922031250` | `ag06_newsroom_story_listing_perf` | AG-06 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922031250_ag06_newsroom_story_listing_perf.sql` | `19c2e006f7788fa6ebd968e943109317f5d9bc40` |
| `20260922032244` | `ag06_story_rls_performance` | AG-06 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922032244_ag06_story_rls_performance.sql` | `7e6bac42193b396cb19cf8471aae365fc0b3c64e` |
| `20260922033138` | `ag06_certification_cleanup_35683173735_v2` | AG-06 certification | SUPERSEDED | `20260922033138_ag06_certification_cleanup_35683173735_v2.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922033157` | `ag06_auth_delete_revocation` | AG-06 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922033157_ag06_auth_delete_revocation.sql` | `accac75da4e38ec99cbca49743aff1758817409a` |
| `20260922033542` | `ag06_auth_delete_guard` | AG-06 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922033542_ag06_auth_delete_guard.sql` | `f6ba24feca96e57bf3788c5fdee1b90329dd7f97` |
| `20260922035013` | `ag05_normalize_preserve_strategy` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922035013_ag05_normalize_preserve_strategy.sql` | `bed63824c9c3d80fb20965adf24368bb6469a395` |
| `20260922035050` | `ag06_cleanup_failed_certification_users` | AG-06 certification | SUPERSEDED | `20260922035050_ag06_cleanup_failed_certification_users.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922035335` | `ag05_nested_category_context` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922035335_ag05_nested_category_context.sql` | `0ec6d31f38e33882e70adf5f0770620621cced60` |
| `20260922040649` | `ag05_rehearsal_readiness_guard` | AG-05/CP5 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922040649_ag05_rehearsal_readiness_guard.sql` | `c9411a915681159bf888ddf60e76b37d49fa64f3` |
| `20260922054411` | `ca01_internal_schema_capabilities` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922054411_ca01_internal_schema_capabilities.sql` | `30151f4a4ff2e917dfbf6b0a360b2343e13b2890` |
| `20260922054415` | `ca01_inbox_story_discussion` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922054415_ca01_inbox_story_discussion.sql` | `d3920cdaec2487fca7e450ff40d7ddc1040bdb45` |
| `20260922054420` | `ca01_desks_threads_announcements` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922054420_ca01_desks_threads_announcements.sql` | `981187617b53b19103563f708b1a769638b6db85` |
| `20260922054424` | `ca01_communication_storage` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922054424_ca01_communication_storage.sql` | `025593db521ad316ea51dd56f10058cf1852d25c` |
| `20260922054428` | `ca01_reader_discussion_moderation` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922054428_ca01_reader_discussion_moderation.sql` | `63ce29fa77992fe26f2b7a72bb4a3931c1ce3fb2` |
| `20260922054449` | `ca01_realtime_authorization` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922054449_ca01_realtime_authorization.sql` | `0f5632c71291425090af06b493b40d2d0f6e3945` |
| `20260922055517` | `ca01_attachment_access_hardening` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922055517_ca01_attachment_access_hardening.sql` | `bf39bacd454549750320072ec6b1f4f2ab48ac19` |
| `20260922061142` | `ca01_attachment_access_hardening` | CA-01 | DUPLICATE_LOGICAL_MIGRATION | `20260922061142_ca01_attachment_access_hardening.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922061238` | `ca01_desk_member_rls_recursion_fix` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922061238_ca01_desk_member_rls_recursion_fix.sql` | `180ed2142062a8c8dca63a1c9ca0ffa5dc90ac59` |
| `20260922065253` | `ca01_fk_index_hardening` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922065253_ca01_fk_index_hardening.sql` | `5b18c1068a15f03837586f0150f4bd947621b29b` |
| `20260922065811` | `ca01_fk_index_hardening` | CA-01 | DUPLICATE_LOGICAL_MIGRATION | `20260922065811_ca01_fk_index_hardening.sql` | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` |
| `20260922070256` | `ca01_realtime_event_emission` | CA-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922070256_ca01_realtime_event_emission.sql` | `d5a3e0a7cbffd3c9719cc21a1f372939ad60435b` |
| `20260922094527` | `com01_communications_domain` | COM-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922094527_com01_communications_domain.sql` | `a94b093e2ee17fcd690461bd3e631ce60f2e9582` |
| `20260922095013` | `com01_private_attachments` | COM-01 | LIVE_EQUIVALENT / REPO_VERSION_DRIFT | `20260922095013_com01_private_attachments.sql` | `2f5e5ab5f954724149e9f7fe2aa3d928bd4cf65f` |
| `20260922100851` | `com01_campaign_and_escalation_authority` | COM-01 | LIVE_EFFECT / REPO_FILE_MISSING | `20260922100851_com01_campaign_and_escalation_authority.sql` | `1a15e6d890aa39fa2188fb939c9cba7d9bbf6327` |

### Duplicate logical identities

The only repeated logical names in the reconciled historical sequence are the two already-known CA-01 duplicate applications:

- `ca01_attachment_access_hardening`
  - durable effect: `20260922055517`
  - duplicate historical application: `20260922061142`
- `ca01_fk_index_hardening`
  - durable effect: `20260922065253`
  - duplicate historical application: `20260922065811`

The duplicate historical identities remain represented because they exist in the authoritative live ledger. They are explicit no-op adoption markers rather than replays of the same DDL.

## 4. Adopted historical mappings

Important repository-version drift mappings include:

- AG-05/CP5 `20260922081500` → live `20260921232347`
- AG-05 `20260922094000` → live `20260922003145`
- AG-05 `20260922095000` → live `20260922003554`
- AG-05 `20260922096000` → live `20260922003722`
- AG-05 `20260922097000` → live `20260922004651`
- AG-05 `20260922098000` → live `20260922005024`
- AG-05 `20260922120500` → live `20260922030247`
- AG-05 `20260922121500` → live `20260922030729`
- AG-05 `20260922122000` → live `20260922035013`
- AG-05 `20260922122500` → live `20260922035335`
- AG-05 `20260922131000` → live `20260922040649`
- AG-06 `20260922080100` → live `20260922020254`
- AG-06 `20260922112000` → live `20260922021521`
- AG-06 `20260922080200` → live `20260922031250`
- AG-06 `20260922080300` → live `20260922032244`
- AG-06 `20260922080400` → live `20260922033157`
- AG-06 `20260922080500` → live `20260922033542`
- CA-01 repository versions `20260922140000`–`20260922140900` → live historical versions `20260922054411`–`20260922070256`
- COM-01 `20260922183500` → live `20260922094527`
- COM-01 `20260922183600` → live `20260922095013`
- COM-01 `20260922100851_com01_campaign_and_escalation_authority.sql` was added as the authoritative repository representation of the existing live effect.

## 5. Repository changes

Runtime/schema-authority candidate:

`c7b4639122992810ac08827b5f7d9ed4fa0bc87f`

Changes are repository-only:

- migration identities reconciled to historical live versions;
- CP5 migration files restored into convergence lineage;
- explicit historical no-op markers added for transient AG-06 and duplicate CA-01 ledger entries;
- COM-01 campaign/escalation migration reconstructed from live definitions;
- migration adoption manifest added;
- Phase 5 lineage test added;
- AG-06, CA-01 and COM-01 contract tests updated to read adopted migration filenames;
- Migration Tests workflow made sensitive to migration-lineage paths and provisioned with Chromium;
- Phase 4 browser test bound to its dedicated serving harness;
- Phase 4 certification workflow enabled for Phase 5 lineage PR changes.

No Reader implementation, CP5 runtime implementation, AG-06 runtime, CA-01 runtime, COM-01 runtime, Phase 4 serving implementation, production configuration, DNS/MX, provider configuration or primary staging alias was changed.

## 6. Staging ledger operation

**NONE.**

No call equivalent to migration repair, migration push, reset, replay, insert/delete/update of `supabase_migrations.schema_migrations`, restore or import was executed.

Repository-only adoption was sufficient.

## 7. Proof no DDL/data/storage replay occurred

Final read-only staging capture:

- captured: `2026-09-23T06:22:46.8761+00:00`
- migration ledger rows: **43**
- migration ledger fingerprint: `1c312d83d8f3fc34c70f2dd8f2237ca8`
- migrated WordPress public objects: **5,786**
- URL mappings: **5,786**
- sitemap URLs: **5,786**
- feed rows: **50**
- canonical migrated media present: **3,275**
- total `migrated-media` storage objects: **5,705**
- preserved stale `wordpress/uploads/...` objects: **2,430**

These match the accepted custody state.

## 8. CP5 preservation

All already-live CP5 functions remained present throughout reconciliation:

- `ag05_resolve_public_path`
- `ag05_public_story_document`
- `ag05_public_context_document`
- `ag05_public_sitemap_xml`
- `ag05_public_feed_rows`
- `ag05_hospaz_direct_ad_preview`

No CP5 migration was replayed.

Read-only exact-head Phase 4 CP5 staging certification succeeded:

- workflow: **AG-07 Phase 4 Unified Web/PWA**
- run: **35825881130**
- job: **107067964662 — CP5 read-only staging invariants — SUCCESS**

## 9. Premium and HOSPAZ truth preservation

Premium-review representative article:

- access policy: `premium_marker_review`
- public `body_html`: **null**
- protection: **PRESERVED**

HOSPAZ:

- destination URL: **null**
- destination URL state: `UNKNOWN`
- schedule state: `UNKNOWN`
- placement conditions state: `UNKNOWN`

No unsupported commercial fact was invented.

## 10. Exact-head validation

Certified candidate:

`c7b4639122992810ac08827b5f7d9ed4fa0bc87f`

### GitHub Actions matrix

| Workflow | Run | Jobs / result |
| --- | ---: | --- |
| Validate HealthTimes 2.0 | **35825881163** | `107067368778` validate — SUCCESS |
| Migration Tests | **35825881144** | `107067367958` migration-tests — SUCCESS |
| Chromium UAT | **35825881229** | `107067368890` playwright — SUCCESS |
| AG-06 Newsroom Security | **35825881115** | `107067368194` contract — SUCCESS; `107067368397` local gateway — SUCCESS; `107067368418` live staging security — SUCCESS; `107067368473` disposable schema — SUCCESS |
| CA-01 Communications Security | **35825881181** | `107068456796` contract — SUCCESS; `107068455776` live staging security — SUCCESS; `107068480009` disposable schema — SUCCESS |
| COM-01 Communications | **35825881199** | `107067368597` contract — SUCCESS; `107067435293` live staging contract — SUCCESS; `107067368358` disposable schema — SUCCESS |
| AG-07 Phase 4 Unified Web/PWA | **35825881130** | `107067965951` Reader build/contract/browser — SUCCESS; `107067964662` CP5 read-only staging invariants — SUCCESS |

### Exact test counts observed

Migration Tests:

- **54 discovered**
- **52 passed**
- **2 skipped**
- the two skipped tests are the Phase 4 deployment-specific browser smoke tests when the dedicated serving harness is absent; the same tests execute in the dedicated Phase 4 workflow.

Chromium UAT:

- **99 discovered**
- **90 passed**
- **9 skipped**

AG-06 contract:

- **6/6 passed**

AG-06 live staging:

- **7/7 passed**

CA-01 contract:

- **7/7 passed**

COM-01 contract:

- **4/4 passed**

Dedicated Phase 4 job:

- CP5 capability contract: **10/10 passed**
- AG-06 contract: **6/6 passed**
- CA-01 contract: **7/7 passed**
- COM-01 contract: **4/4 passed**
- Phase 4 serving contract: **7/7 passed**
- Phase 4 mobile/desktop browser smoke: **2/2 passed**

Disposable Supabase schema jobs for AG-06, CA-01 and COM-01 all completed successfully against the reconciled migration directory.

## 11. Validation commands

Commands exercised by certification workflows include:

`npm run test:migration`

`npm run test:uat`

`npm run test:ag06:contract`

`npm run test:ca01:contract`

`npm run test:com01:contract`

`npm run test:ag05:capability`

`npm run verify:ag05:readonly`

`npm run native:check`

`npm run test:phase4:web`

`npm run build:phase4:web`

`npm run verify:phase4:http`

`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4174 npm run test:phase4:browser`

The dedicated disposable-schema jobs additionally exercised the reconciled Supabase migration sequence on disposable test projects.

## 12. Before / after lineage state

### Before

- repository migration SQL files: **24**
- live staging ledger rows: **43**
- CP5 live effects not represented in Phase 4 convergence migration directory;
- AG-06/CA-01/COM-01 repository timestamps diverged from live ledger identities;
- two CA-01 logical names occurred twice in live history without repository disposition;
- COM-01 campaign/escalation authority had durable live effects without authoritative repository migration lineage.

### After

- repository migration SQL files: **43**
- live staging ledger rows: **43**
- every live ledger identity has an explicit repository file and disposition;
- every repository migration identity is a live historical identity;
- CP5 migration family is represented without replay;
- transient AG-06 ledger identities are explicit `SUPERSEDED` markers;
- CA-01 duplicate applications are explicit `DUPLICATE_LOGICAL_MIGRATION` markers;
- COM-01 campaign/escalation authority is explicitly represented;
- migration-lineage tests reject unexplained identities/duplicates;
- clean disposable-schema certification succeeds.

## 13. Residual risks / unknowns

1. Historical staging migration SQL text is not stored by Supabase's migration ledger itself. For drifted migrations, equivalence is established by repository ancestry, durable live schema/function inspection, existing contract suites and disposable-schema reconstruction, not by a byte-for-byte historical SQL archive from the ledger.
2. The reconstructed COM-01 campaign/escalation migration is derived from the authoritative live schema/function definitions and validated by COM-01 live/contract/disposable-schema gates. It is an adoption artifact; it must not be replayed against the current staging database.
3. The two CA-01 duplicate ledger identities remain part of historical truth. They are not deleted or rewritten.
4. AG-06 transient certification ledger entries remain historically represented as no-op markers because their temporary helper/probe effects are not current durable schema authority.

None of these residual items requires a staging mutation for Phase 5.

## 14. Mutation receipt

- `supabase db reset`: **NO**
- database restore: **NO**
- source re-import: **NO**
- historical migration replay on staging: **NO**
- staging migration-ledger mutation: **NO**
- table/column drop: **NO**
- live function removal: **NO**
- RLS policy removal: **NO**
- migrated article-data mutation by Phase 5: **NO**
- migrated-media storage mutation: **NO**
- stale storage cleanup: **NO**
- production change: **NO**
- DNS/MX change: **NO**
- provider activation: **NO**
- primary Vercel staging alias movement: **NO**
- PR merge: **NO**
- AG-08 invoked: **NO**

Note: existing AG-06/CA-01 live security certification workflows create and clean bounded synthetic certification state under their previously accepted test contracts. Phase 5 itself performed no migration/data replay and the authoritative migrated corpus/storage invariants remained unchanged.

## 15. Candidate and closure

Candidate runtime:

`c7b4639122992810ac08827b5f7d9ed4fa0bc87f`

Documentation closure SHA:

**TO BE FILLED BY DOCUMENTATION-ONLY CLOSURE COMMIT**

The documentation closure must be exactly one documentation-only commit above the certified candidate.

## 16. Phase 5 disposition

**PHASE 5 CERTIFIED — MIGRATION LINEAGE RECONCILED / READY FOR MODERATOR AUDIT**
