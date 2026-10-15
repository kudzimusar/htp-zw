# HT-NR-00 — CANONICAL NEWSROOM SERVER-AUTHORITY RECUSTODY MANIFEST

**Programme:** `HT-NR — HealthTimes Newsroom OS`  
**Phase:** `HT-NR-00C-R1`  
**Role:** Newsroom Canonical Recustody / Convergence Specialist  
**Status:** `AUTHORITATIVE_CONVERGENCE_SPECIFICATION`  
**Target Execution Phase:** `HT-NR-01`

---

## 1. DESTINATION AUTHORITY

- **Canonical Repository:** `kudzimusar/htp-zw`
- **Canonical Destination Branch:** `main`
- **Canonical Destination Commit SHA:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c`
- **Destination Character:** Canonical destination authority representing the unified Reader, Mobile App (`apps/mobile`), Premium Commerce (`api/commerce.js`), and Hospaz monetization features. Current `main` is authoritative for user interface, mobile shell, client business logic, and later accepted product features. It must never be overwritten, rebased away, or regressed.

---

## 2. HISTORICAL SERVER SOURCE AUTHORITY

- **Historical Cumulative Server Source Branch:** `feat/ag06-native-public-context-inline-media`
- **Historical Cumulative Server Source Commit SHA:** `755b7ba7aedaff0d3997a9f540572665c218d7e7`
- **Runtime Authority SHA (PR #40 Runtime Commit):** `ed5e38a4201029c342617aa43f1dbd62161f5b97` (commit `755b7ba7` is exactly one documentation-only commit ahead of `ed5e38a4`).
- **NR-00C Remote Branch Head:** `146e3f0c1abfe90332aaf8f837c6404afafe79f0`
- **Source Character:** The cumulative snapshot encompassing the Newsroom Server Authority: the first 60 live database migrations, the complete Newsroom serverless API (`api/newsroom.js`), the Communications API (`api/communications.js`), the Public context projection API (`api/public.js`), and accompanying local contract test suites. It serves strictly as a **server-source reference**, not a branch to be merged.

---

## 3. 62-MIGRATION CANONICAL LEDGER MANIFEST

The HealthTimes live Staging database (`gcdohgbmqhqwydgaxrcr`) contains exactly **62 migration identities** in its ledger (`supabase_migrations.schema_migrations`).
- **Migrations 1–60:** Present in PR #40 cumulative server source (`755b7ba7aedaff0d3997a9f540572665c218d7e7`).
- **Migrations 61–62:** Present on current canonical `main` (`6994aa18d37e2189dbc1d3f8efc76a638ee0971c`).
- **Total Ledger Authority:** 62 migrations.

### Complete Ledger Register

| # | Version | Filename | Owner / Domain | Source Branch / SHA | Git Blob SHA | Present on Main | Present on Staging | Classification | Replay Semantics | Dependency / Predecessor | HT-NR-01 Action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `20260909000100` | `20260909000100_content_core.sql` | CP1 / Core Schema | PR #40 (`755b7ba7`) | `547da311580e5ddc18454fdf36212501a7961e78` | No | Yes | `RECOVER_EXACT` | Full replay | None (Genesis) | Checkout historical blob |
| 2 | `20260909000200` | `20260909000200_taxonomy_and_geo.sql` | CP1 / Taxonomy | PR #40 (`755b7ba7`) | `a850734c73a1f21686529691266d934f1fa0917e` | No | Yes | `RECOVER_EXACT` | Full replay | `20260909000100` | Checkout historical blob |
| 3 | `20260909000300` | `20260909000300_redirects_and_seo.sql` | CP1 / Redirects | PR #40 (`755b7ba7`) | `78cedc4fc303f9616a25a69c373e783d48be976a` | No | Yes | `RECOVER_EXACT` | Full replay | `20260909000200` | Checkout historical blob |
| 4 | `20260909000400` | `20260909000400_analytics_and_ads.sql` | CP1 / Monetization | PR #40 (`755b7ba7`) | `7d0818a4a1d3e000b4b3b81f42a1e616277c9c47` | No | Yes | `RECOVER_EXACT` | Full replay | `20260909000300` | Checkout historical blob |
| 5 | `20260909000500` | `20260909000500_migration_runs_and_checkpoints.sql` | CP1 / Lineage | PR #40 (`755b7ba7`) | `bdc97f8deff5a2f4e2159b35452a9485b4496006` | No | Yes | `RECOVER_EXACT` | Full replay | `20260909000400` | Checkout historical blob |
| 6 | `20260916030642` | `20260916030642_ag02_staging_security_baseline.sql` | AG-02 / Baseline Security | PR #40 (`755b7ba7`) | `170aff91933e11aae037fe9f936ae7a9813f0387` | No | Yes | `RECOVER_EXACT` | Full replay | `20260909000500` | Checkout historical blob |
| 7 | `20260921232347` | `20260921232347_ag05_seo_analytics_monetization_continuity.sql` | AG-05 / Continuity | PR #40 (`755b7ba7`) | `38e72e8bb5e1c4abc976b60a5cbec8777d2c54d5` | No | Yes | `RECOVER_EXACT` | Full replay | `20260916030642` | Checkout historical blob |
| 8 | `20260922003145` | `20260922003145_ag05_rehearsal_runtime_closure.sql` | AG-05 / Runtime | PR #40 (`755b7ba7`) | `9567eabe7d293773c6ed0a8ca4ce452921af3bbe` | No | Yes | `RECOVER_EXACT` | Full replay | `20260921232347` | Checkout historical blob |
| 9 | `20260922003554` | `20260922003554_ag05_sitemap_xml_rpc.sql` | AG-05 / Sitemap RPC | PR #40 (`755b7ba7`) | `c2155912ebbd9eb33e97816350d92020b44822e8` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922003145` | Checkout historical blob |
| 10 | `20260922003722` | `20260922003722_ag05_url_resolution_ledger.sql` | AG-05 / URL Ledger | PR #40 (`755b7ba7`) | `b38927a3a2a5e995d91dfa63940b3ce2510aa207` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922003554` | Checkout historical blob |
| 11 | `20260922004651` | `20260922004651_ag05_link_ledger_evidence.sql` | AG-05 / Link Evidence | PR #40 (`755b7ba7`) | `4f16d8c4f936d3fb27c058d61bd6469cd7820f84` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922003722` | Checkout historical blob |
| 12 | `20260922005024` | `20260922005024_ag05_materialize_link_audit.sql` | AG-05 / Audit | PR #40 (`755b7ba7`) | `e7add174046c15b763b5bce96de8367ad196280b` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922004651` | Checkout historical blob |
| 13 | `20260922020254` | `20260922020254_ag06_newsroom_auth_rbac.sql` | AG-06 / Newsroom RBAC | PR #40 (`755b7ba7`) | `cc5477f25606cdc64bc17d2e57fe43987347077a` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922005024` | Checkout historical blob |
| 14 | `20260922021319` | `20260922021319_ag06_staging_http_cert_helper.sql` | AG-06 / Ephemeral Helper | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922020254` | Checkout historical marker |
| 15 | `20260922021408` | `20260922021408_ag06_staging_http_cert_helper_cleanup.sql` | AG-06 / Helper Cleanup | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922021319` | Checkout historical marker |
| 16 | `20260922021521` | `20260922021521_ag06_security_advisor_hardening.sql` | AG-06 / Security Hardening | PR #40 (`755b7ba7`) | `cedcdc0abe861810a7eb5103a0c128e3b9cb096a` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922021408` | Checkout historical blob |
| 17 | `20260922023605` | `20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql` | AG-06 / Probe Marker | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922021521` | Checkout historical marker |
| 18 | `20260922030247` | `20260922030247_ag05_context_routes.sql` | AG-05 / Context Routes | PR #40 (`755b7ba7`) | `34ff31581a28116bff8f457869fbfb7b7b317b65` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922023605` | Checkout historical blob |
| 19 | `20260922030729` | `20260922030729_ag05_preserve_direct_handoff_case.sql` | AG-05 / Routing Handoff | PR #40 (`755b7ba7`) | `1b05f8a8b8a56d86cd5e36009d9a4ca0fcb914ed` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922030247` | Checkout historical blob |
| 20 | `20260922031250` | `20260922031250_ag06_newsroom_story_listing_perf.sql` | AG-06 / Query Perf | PR #40 (`755b7ba7`) | `19c2e006f7788fa6ebd968e943109317f5d9bc40` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922030729` | Checkout historical blob |
| 21 | `20260922032244` | `20260922032244_ag06_story_rls_performance.sql` | AG-06 / RLS Perf | PR #40 (`755b7ba7`) | `7e6bac42193b396cb19cf8471aae365fc0b3c64e` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922031250` | Checkout historical blob |
| 22 | `20260922033138` | `20260922033138_ag06_certification_cleanup_35683173735_v2.sql` | AG-06 / Probe Marker | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922032244` | Checkout historical marker |
| 23 | `20260922033157` | `20260922033157_ag06_auth_delete_revocation.sql` | AG-06 / Auth Revocation | PR #40 (`755b7ba7`) | `accac75da4e38ec99cbca49743aff1758817409a` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922033138` | Checkout historical blob |
| 24 | `20260922033542` | `20260922033542_ag06_auth_delete_guard.sql` | AG-06 / Auth Guard | PR #40 (`755b7ba7`) | `f6ba24feca96e57bf3788c5fdee1b90329dd7f97` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922033157` | Checkout historical blob |
| 25 | `20260922035013` | `20260922035013_ag05_normalize_preserve_strategy.sql` | AG-05 / URL Strategy | PR #40 (`755b7ba7`) | `bed63824c9c3d80fb20965adf24368bb6469a395` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922033542` | Checkout historical blob |
| 26 | `20260922035050` | `20260922035050_ag06_cleanup_failed_certification_users.sql` | AG-06 / Cleanup Marker | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922035013` | Checkout historical marker |
| 27 | `20260922035335` | `20260922035335_ag05_nested_category_context.sql` | AG-05 / Taxonomy Tree | PR #40 (`755b7ba7`) | `0ec6d31f38e33882e70adf5f0770620621cced60` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922035050` | Checkout historical blob |
| 28 | `20260922040649` | `20260922040649_ag05_rehearsal_readiness_guard.sql` | AG-05 / Readiness | PR #40 (`755b7ba7`) | `c9411a915681159bf888ddf60e76b37d49fa64f3` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922035335` | Checkout historical blob |
| 29 | `20260922054411` | `20260922054411_ca01_internal_schema_capabilities.sql` | CA-01 / Schema Baseline | PR #40 (`755b7ba7`) | `30151f4a4ff2e917dfbf6b0a360b2343e13b2890` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922040649` | Checkout historical blob |
| 30 | `20260922054415` | `20260922054415_ca01_inbox_story_discussion.sql` | CA-01 / Messaging Core | PR #40 (`755b7ba7`) | `d3920cdaec2487fca7e450ff40d7ddc1040bdb45` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922054411` | Checkout historical blob |
| 31 | `20260922054420` | `20260922054420_ca01_desks_threads_announcements.sql` | CA-01 / Desks & Channels | PR #40 (`755b7ba7`) | `981187617b53b19103563f708b1a769638b6db85` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922054415` | Checkout historical blob |
| 32 | `20260922054424` | `20260922054424_ca01_communication_storage.sql` | CA-01 / Communication Storage | PR #40 (`755b7ba7`) | `025593db521ad316ea51dd56f10058cf1852d25c` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922054420` | Checkout historical blob |
| 33 | `20260922054428` | `20260922054428_ca01_reader_discussion_moderation.sql` | CA-01 / Discussion Moderation | PR #40 (`755b7ba7`) | `63ce29fa77992fe26f2b7a72bb4a3931c1ce3fb2` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922054424` | Checkout historical blob |
| 34 | `20260922054449` | `20260922054449_ca01_realtime_authorization.sql` | CA-01 / Realtime Security | PR #40 (`755b7ba7`) | `0f5632c71291425090af06b493b40d2d0f6e3945` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922054428` | Checkout historical blob |
| 35 | `20260922055517` | `20260922055517_ca01_attachment_access_hardening.sql` | CA-01 / Attachment Security | PR #40 (`755b7ba7`) | `bf39bacd454549750320072ec6b1f4f2ab48ac19` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922054449` | Checkout historical blob |
| 36 | `20260922061142` | `20260922061142_ca01_attachment_access_hardening.sql` | CA-01 / Duplicate Ledger Marker | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922055517` | Checkout historical marker |
| 37 | `20260922061238` | `20260922061238_ca01_desk_member_rls_recursion_fix.sql` | CA-01 / RLS Recursion Fix | PR #40 (`755b7ba7`) | `180ed2142062a8c8dca63a1c9ca0ffa5dc90ac59` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922061142` | Checkout historical blob |
| 38 | `20260922065253` | `20260922065253_ca01_fk_index_hardening.sql` | CA-01 / Index Performance | PR #40 (`755b7ba7`) | `5b18c1068a15f03837586f0150f4bd947621b29b` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922061238` | Checkout historical blob |
| 39 | `20260922065811` | `20260922065811_ca01_fk_index_hardening.sql` | CA-01 / Duplicate Ledger Marker | PR #40 (`755b7ba7`) | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | No | Yes | `LEDGER_ONLY` | No-op (`select 1;`) | `20260922065253` | Checkout historical marker |
| 40 | `20260922070256` | `20260922070256_ca01_realtime_event_emission.sql` | CA-01 / Realtime Triggers | PR #40 (`755b7ba7`) | `d5a3e0a7cbffd3c9719cc21a1f372939ad60435b` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922065811` | Checkout historical blob |
| 41 | `20260922094527` | `20260922094527_com01_communications_domain.sql` | COM-01 / Audience Campaigns | PR #40 (`755b7ba7`) | `a94b093e2ee17fcd690461bd3e631ce60f2e9582` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922070256` | Checkout historical blob |
| 42 | `20260922095013` | `20260922095013_com01_private_attachments.sql` | COM-01 / Private Attachments | PR #40 (`755b7ba7`) | `2f5e5ab5f954724149e9f7fe2aa3d928bd4cf65f` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922094527` | Checkout historical blob |
| 43 | `20260922100851` | `20260922100851_com01_campaign_and_escalation_authority.sql` | COM-01 / Escalation Authority | PR #40 (`755b7ba7`) | `1a15e6d890aa39fa2188fb939c9cba7d9bbf6327` | No | Yes | `RECOVER_EXACT` (Qualifier: `RECONSTRUCTED_EFFECT_AUTHORITY`) | Fresh-database replay only (Never replay on Staging) | `20260922095013` | Checkout historical reconstructed blob |
| 44 | `20260924072830` | `20260924072830_ag06_story_media_request_changes.sql` | AG-06 / Media & Review Workflow | PR #40 (`755b7ba7`) | `837e6a6fb60a24ef4ab072c839893d1344928ca8` | No | Yes | `RECOVER_EXACT` | Full replay | `20260922100851` | Checkout historical blob |
| 45 | `20260924073135` | `20260924073135_ag06_media_listing_performance.sql` | AG-06 / Media Query Perf | PR #40 (`755b7ba7`) | `4bc581702431d7f24a6e0664e528e9c38e277e28` | No | Yes | `RECOVER_EXACT` | Full replay | `20260924072830` | Checkout historical blob |
| 46 | `20260924073537` | `20260924073537_ag06_media_storage_policy_helper.sql` | AG-06 / Storage Security | PR #40 (`755b7ba7`) | `9e2356e0a0b3ea0a0fc2dd060152c06009944dd6` | No | Yes | `RECOVER_EXACT` | Full replay | `20260924073135` | Checkout historical blob |
| 47 | `20260924074219` | `20260924074219_ag06_media_storage_read_helper.sql` | AG-06 / Storage Helper | PR #40 (`755b7ba7`) | `30be71a137ca9dfa700dda7fc18e22b8d554a58f` | No | Yes | `RECOVER_EXACT` | Full replay | `20260924073537` | Checkout historical blob |
| 48 | `20260924103201` | `20260924103201_ag06_cms_public_media_promotion.sql` | AG-06 / Public Promotion | PR #40 (`755b7ba7`) | `4fdeb7ae52f46e0c409bbdaaaf8b709fe0950f3b` | No | Yes | `RECOVER_EXACT` | Full replay | `20260924074219` | Checkout historical blob |
| 49 | `20260924105815` | `20260924105815_ag06_native_reader_release_marker.sql` | AG-06 / Release Marker | PR #40 (`755b7ba7`) | `f271cfd1cd8e94c3c31b4ebee9467aaabe4436ee` | No | Yes | `RECOVER_EXACT` | Full replay | `20260924103201` | Checkout historical blob |
| 50 | `20260925230247` | `20260925230247_ag06_public_story_release_boundary_hardening.sql` | AG-06 / Boundary Security | PR #40 (`755b7ba7`) | `757e23890fd54489af7f9524702f5cbeb33bc97b` | No | Yes | `RECOVER_EXACT` | Full replay | `20260924105815` | Checkout historical blob |
| 51 | `20260927040923` | `20260927040923_ag06_certification_active_binding_cleanup.sql` | AG-06 / Ephemeral Binding | PR #40 (`755b7ba7`) | `dad37819e34109301129cd98711266ffe39fdceb` | No | Yes | `RECOVER_EXACT` | Full replay | `20260925230247` | Checkout historical blob |
| 52 | `20260927091500` | `20260927091500_ag06_canonical_author_section_authority.sql` | AG-06 / Author Authority | PR #40 (`755b7ba7`) | `9e3bffe8b037c0d4c3bbb1aa8a46c0de4e6b3c7f` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927040923` | Checkout historical blob |
| 53 | `20260927093000` | `20260927093000_ag06_native_public_context.sql` | AG-06 / Public Context | PR #40 (`755b7ba7`) | `7399bdf5eb4ce16df5602761f1748b2534c136c7` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927091500` | Checkout historical blob |
| 54 | `20260927094500` | `20260927094500_ag06_inline_body_binding.sql` | AG-06 / Media Placement | PR #40 (`755b7ba7`) | `0a06fa4da0b0054dcd0ab1569898387a1f0cc937` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927093000` | Checkout historical blob |
| 55 | `20260927101500` | `20260927101500_ag06_public_inline_media_promotion.sql` | AG-06 / Media Promotion | PR #40 (`755b7ba7`) | `833636dd97e7b6f37af0db62a5eca37dd91c36b8` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927094500` | Checkout historical blob |
| 56 | `20260927110000` | `20260927110000_ag06_inline_public_storage_authority.sql` | AG-06 / Storage Security | PR #40 (`755b7ba7`) | `795edb25c4cdf8c5ff0d07d90153944bb781c3b7` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927101500` | Checkout historical blob |
| 57 | `20260927113000` | `20260927113000_ag06_certification_author_binding_cleanup.sql` | AG-06 / Ephemeral Cleanup | PR #40 (`755b7ba7`) | `ded107c47e1fc179a558bbbcdcb2f76ece2f02d8` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927110000` | Checkout historical blob |
| 58 | `20260927120000` | `20260927120000_ag06_certification_cleanup_service_role_claim.sql` | AG-06 / Claim Hardening | PR #40 (`755b7ba7`) | `0f739091d05e4e229ef7dc9b54aec9c4a62c6cc0` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927113000` | Checkout historical blob |
| 59 | `20260927121500` | `20260927121500_ag06_audit_feed_performance.sql` | AG-06 / Audit Perf | PR #40 (`755b7ba7`) | `bda9c3f1820a4aaff0d9a880a24ec14a353af3b3` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927120000` | Checkout historical blob |
| 60 | `20260927123000` | `20260927123000_ag06_certification_active_binding_cleanup.sql` | AG-06 / Final Binding Guard | PR #40 (`755b7ba7`) | `d5abed2605f5d60731c23f47bc23ae914e119e5b` | No | Yes | `RECOVER_EXACT` | Full replay | `20260927121500` | Checkout historical blob |
| 61 | `20261002060846` | `20261002060846_ag05_premium_teaser_public_projection.sql` | AG-05 / Premium Teaser | `main` (`6994aa18`) | `d90fe37bbe23000033396ada830e6e718d7b78e6` | Yes | Yes | `KEEP_MAIN` | Preserve existing | `20260927123000` | Keep untouched on `main` |
| 62 | `20261002061027` | `20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql` | AG-05 / Premium Privileges | `main` (`6994aa18`) | `0c1843581edab0f942fd9942b7dc3c3f30e47bf8` | Yes | Yes | `KEEP_MAIN` | Preserve existing | `20261002060846` | Keep untouched on `main` |

---

## 4. API RECUSTODY MANIFEST

### 4.1 `api/newsroom.js`
- **Classification:** `RECOVER_EXACT`
- **Source SHA:** `755b7ba7aedaff0d3997a9f540572665c218d7e7` (blob `f3520094832ad255d4e5a325430b2e51296af64f`, 1100 lines)
- **Role & Capabilities:** Central Newsroom OS serverless handler. Provides session auth, staff listing, story lifecycle (`create_story`, `update_story`, `submit_story`, `request_changes`, `publish_story`), media upload and promotion (`list_media`, `upload_media`), advertising campaign management (`list_campaigns`, `create_campaign`), and immutable audit logging (`audit_events`).
- **Dependencies:** Node built-in `crypto`, global `fetch`. Zero external npm packages required.
- **Environment Variables:**
  - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `NEWSROOM_SIGNING_SECRET` (optional HMAC fallback)
- **Database / RPC Dependencies:** Calls stored procedures `ag06_newsroom_story_create`, `ag06_newsroom_story_update`, `ag06_newsroom_story_submit`, `ag06_newsroom_request_changes`, `ag06_newsroom_story_publish`, `ag06_newsroom_media_upload`, `ag06_newsroom_audit_log`.
- **Conflicts with Main:** None. File does not exist on `main`.
- **Certification Test:** `npm run test:ag06:contract`.

### 4.2 `api/communications.js`
- **Classification:** `RECOVER_EXACT`
- **Source SHA:** `755b7ba7aedaff0d3997a9f540572665c218d7e7` (blob `d09ef467bea7435a1aee9e941d3a4e810c5de348`, 474 lines)
- **Role & Capabilities:** Editorial newsroom communication and escalation handler. Manages inbox threads (`inbox_list`, `thread_messages`, `send_message`), desk channels (`desks_list`), announcements, and notification escalation to external dispatch providers.
- **Dependencies:** Node built-in `crypto`, global `fetch`.
- **Environment Variables:**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `COMMUNICATIONS_SECRET`
- **Database / RPC Dependencies:** Calls `ca01_send_internal_message`, `ca01_escalate_notification`, tables `communication_messages`, `communication_channels`, `communication_threads`.
- **Conflicts with Main:** None. File does not exist on `main`.
- **Certification Test:** `npm run test:ca01:contract` and `npm run test:com01:contract`.

### 4.3 `api/public.js`
- **Classification:** `RECOVER_EXACT`
- **Source SHA:** `755b7ba7aedaff0d3997a9f540572665c218d7e7` (blob `2354d14094aafb0ab92429caa87bd31e00871127`, 418 lines)
- **Scope & Role:** Public projection handler for reader surfaces. Serves public story projection, context projection, RSS/Atom feed, sitemap XML, path resolution, and HOSPAZ direct-ad preview. (It is strictly a public reader projection handler, **not** an editorial Edition API).
- **Dependencies:** Requires `./lib/ag05-capability.js` (present on canonical `main`!) and Node built-in `crypto`.
- **Environment Variables:**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- **Database / RPC Dependencies:** Calls stored procedures:
  - `ag05_hospaz_direct_ad_preview`
  - `ag05_public_context_document`
  - `ag05_public_feed_rows`
  - `ag05_public_sitemap_xml`
  - `ag05_public_story_document`
  - `ag05_resolve_public_path`
- **Conflicts with Main:** None. File does not exist on `main`.
- **Certification Test:** `npm run test:ag05:capability`.

### 4.4 `api/discussion.js`
- **Classification:** `HISTORICAL_EVIDENCE_ONLY`
- **Historical Source Blob:** `385897f3293740394baeb16df724ae6097da1dae` (312 lines)
- **Re-evaluation Finding:** Inspection of canonical destination `apps/mobile/src/services/communications.ts` proves that current reader and studio discussion calls Supabase RPCs directly (`reader_register_comment_profile`, `reader_comment_eligibility`, `reader_public_story_comments`, `reader_submit_story_comment`). There is **no canonical consumer** requiring an HTTP `/api/discussion` endpoint.
- **HT-NR-01 Action:** **EXCLUDED from HT-NR-01 mutation set.** Preserved as historical evidence only.

### 4.5 `api/commerce.js`
- **Classification:** `KEEP_MAIN`
- **Authority Commit SHA:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c` (blob `ff899e65f2fe60f3c1563f2a55581c511ab44214`, 387 lines)
- **Role & Capabilities:** Hospaz monetization, Paynow payment integration, and reader premium access enforcement.
- **HT-NR-01 Action:** Must remain 100% authoritative and unmodified.

---

## 5. SUPPORTING-FILE DEPENDENCY CLOSURE

| File Path | Git Blob SHA | Source Authority | Classification | Description & Rationale |
|---|---|---|---|---|
| `supabase/migration-lineage/healthtimes-staging-adoption.json` | `dff360eaf3c001db25d23fbe5a5e604db2d17f70` | PR #40 (`755b7ba7`) | `RECOVER_EXACT` | Authoritative 60-migration adoption ledger mapping live Staging timestamps to local schema. |
| `scripts/ag06/newsroom-test-server.js` | `6ecbd47456c7eadc24ba43cbf497ca225060e6b2` | PR #40 (`755b7ba7`) | `RECOVER_EXACT` | Standalone local Node HTTP server wrapping `api/newsroom.js` for Playwright contract tests. Operates on local port 4173; does not contact Staging. |
| `scripts/ca01/communications-test-server.js` | `fdf32c0c8419b613c851822859fed0df994b4c5b` | PR #40 (`755b7ba7`) | `RECOVER_EXACT` | Standalone local Node HTTP server wrapping `api/communications.js` for local contract test runs. Operates on local port 4173; does not contact Staging. |
| `scripts/ag06/provision-staging-signups.mjs` | `3926dfefed99659a3fb3622296624a119c44a5a2` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Staging-mutating script. **EXCLUDED from HT-NR-01 runtime recustody.** |
| `supabase/functions/ag06-certification-provision/index.ts` | `d9500337779a505933a3d69942701d331c99dd62` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Ephemeral test provisioning function. **EXCLUDED from HT-NR-01 runtime recustody.** |
| `supabase/functions/ca01-certification-provision/index.ts` | `3a3ed38a2ed7e4025dcbf43b0fb53e6878a3ba57` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Ephemeral test provisioning function. **EXCLUDED from HT-NR-01 runtime recustody.** |
| `supabase/functions/com01-certification-provision/index.ts` | `8ec49e3e44bc18263b41a47f36fdf9c6035bbdce` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Ephemeral test provisioning function. **EXCLUDED from HT-NR-01 runtime recustody.** |
| `newsroom.html` | `39e551fbfa5c317ad4ea96f13b6324fa43c683b5` | `main` (`6994aa18`) | `KEEP_MAIN` | Legacy prototype on `main` preserved as-is. Historical PR #40 version (`bfa6f333`) is `HISTORICAL_EVIDENCE_ONLY`. **EXCLUDED from HT-NR-01.** |
| `newsroom.js` | `bc111e14be2dcddb0bcf4753ba758da43577d2a5` | `main` (`6994aa18`) | `KEEP_MAIN` | Legacy prototype on `main` preserved as-is. Historical PR #40 version (`bf02b6be`) is `HISTORICAL_EVIDENCE_ONLY`. **EXCLUDED from HT-NR-01.** |
| `newsroom.css` | `a65a4c58f000b21a00a2ee3da580b0bb11ba6fe9` | `main` (`6994aa18`) | `KEEP_MAIN` | Legacy prototype on `main` preserved as-is. Historical PR #40 version (`54c598d1`) is `HISTORICAL_EVIDENCE_ONLY`. **EXCLUDED from HT-NR-01.** |
| `vercel.json` | None on `main` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Serving configuration from PR #40 is historical evidence. **EXCLUDED from HT-NR-01.** Serving authority is not altered during kernel recustody. |

---

## 6. `KEEP_MAIN` / DO-NOT-REPLACE REGISTER

The following directories and files on `main` represent post-PR#40 accepted architecture and must remain **strictly untouched**:

1. **Mobile Application & Mobile Workspace:**
   - `apps/mobile/**` (All React Native / Expo screens, components, services, and native assets).
   - Specifically: `apps/mobile/app/**`, `apps/mobile/src/ui/**`, `apps/mobile/src/services/**`, `apps/mobile/src/security/**`.
   - **Canonical Future Newsroom UI:** Lives at `apps/mobile/app/studio/**` and its supporting components. It must never be regressed or replaced by historical web prototypes.
2. **Premium Hospaz & Monetization:**
   - `api/commerce.js`
   - `lib/ag05-premium-commerce.js`
   - `lib/ag05-public-runtime.js`
   - `lib/ag05-capability.js` (Contains `sanitizePremiumTeaserHtml` and `premiumTeaserHtml` required by Hospaz).
   - `supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql`
   - `supabase/migrations/20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql`
3. **Reader Web UI & Navigation:**
   - Reader UI components and web pages generated for static distribution.
4. **Legacy Newsroom Web Prototype:**
   - `newsroom.html`, `newsroom.js`, `newsroom.css` on `main` remain untouched as reference prototypes.
5. **Root Package Configuration:**
   - `package.json` (Scripts and devDependencies on `main` already define all necessary ag06/ca01/com01 contract commands).

---

## 7. GENERATED-TYPE DECISION

- **Classification:** `REGENERATE`
- **Target File:** `apps/mobile/src/generated/database.types.ts`
- **Generation Source:** Live read-only Staging database (`gcdohgbmqhqwydgaxrcr`).
- **Safety Policy:**
  - Database introspection is strictly read-only; **zero database mutation occurs**.
  - Type regeneration must only take place during `HT-NR-01` execution if that phase remains authorized to do so.
  - Testing against `apps/mobile`: `npm --prefix apps/mobile run typecheck` passes with **0 errors**.
  - No change made in `HT-NR-00C-R1`.

---

## 8. TEST RECUSTODY MANIFEST

| Test File Path | Git Blob SHA | Source Authority | Classification | Associated Target API | Run Command |
|---|---|---|---|---|---|
| `tests/ag06-security-contract.spec.js` | `bbf4cea369b0a410335c71c8aa88b3605f0f345b` | PR #40 (`755b7ba7`) | `RECOVER_EXACT` | `/api/newsroom` (Local Server) | `npm run test:ag06:contract` |
| `tests/ca01-contract.spec.js` | `5f1c1be3c5685020fd58a39136a74b7672252d52` | PR #40 (`755b7ba7`) | `RECOVER_EXACT` | `/api/communications` (Local Server) | `npm run test:ca01:contract` |
| `tests/com01-contract.spec.js` | `6e3d08b6977b40cf5589d9276aa9d80feeff36c0` | PR #40 (`755b7ba7`) | `RECOVER_EXACT` | `/api/communications` (Local Server) | `npm run test:com01:contract` |
| `tests/ag06-live-security.spec.js` | `bbb8f501ad77535a49c98210fdb9e54a2c5d2476` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Mutates live staging; **EXCLUDED from HT-NR-01**. | N/A |
| `tests/ca01-live-security.spec.js` | `92edc922fb204b8c16f979ccc388d8f36064cced` | PR #40 (`755b7ba7`) | `HISTORICAL_EVIDENCE_ONLY` | Mutates live staging; **EXCLUDED from HT-NR-01**. | N/A |
| `tests/newsroom-os.spec.js` | `75a2eb43d587b1952257b186cd0b18d6a8d44f58` | `main` (`6994aa18`) | `KEEP_MAIN` | Legacy prototype test on `main` preserved as-is. | `npm test` |

---

## 9. CONFIGURATION / RUNTIME DEPENDENCIES

### 9.1 `vercel.json`
`vercel.json` does not exist on `main`. In PR #40 it routed all paths to obsolete Phase 4 SSR shell `api/web.js`. Kernel recustody in HT-NR-01 does **not** alter deployment or serving infrastructure. `vercel.json` is classified as `HISTORICAL_EVIDENCE_ONLY` and is **excluded from HT-NR-01**.

### 9.2 `package.json`
`package.json` on `main` is authoritative and already defines all necessary scripts (`test:ag06:contract`, `test:ca01:contract`, `test:com01:contract`, `native:check`). No changes required (`KEEP_MAIN`).

---

## 10. KNOWN CONFLICTS, LEDGER MARKERS & FROM-ZERO REPLAY STATUS

### 10.1 Reconstructed COM-01 Migration (`20260922100851`)
- **Classification:** `RECOVER_EXACT` with qualifier:
  > `RECONSTRUCTED_EFFECT_AUTHORITY — repository blob is the canonical reconstructed source, not the byte-for-byte original historical SQL.`
- **Source Blob:** `1a15e6d890aa39fa2188fb939c9cba7d9bbf6327`
- **Replay Semantics:** Never replay against live Staging `gcdohgbmqhqwydgaxrcr` (it is already recorded in the staging ledger). It is part of the canonical clean-database sequence.

### 10.2 Transient / Adoption Markers (The 7 No-Op Migrations)
Seven migration identities in Staging ledger share git blob `a960626806c8ac5b10fcfa7cf77bff2944d552f0` containing `select 1;`:
1. `20260922021319_ag06_staging_http_cert_helper.sql`
2. `20260922021408_ag06_staging_http_cert_helper_cleanup.sql`
3. `20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql`
4. `20260922033138_ag06_certification_cleanup_35683173735_v2.sql`
5. `20260922035050_ag06_cleanup_failed_certification_users.sql`
6. `20260922061142_ca01_attachment_access_hardening.sql`
7. `20260922065811_ca01_fk_index_hardening.sql`

Classification: `LEDGER_ONLY`. They must be checked out byte-for-byte to satisfy `supabase db status` ledger verification, but execute zero DDL/DML.

### 10.3 From-Zero Disposable Database Replay Status
- **Status:** `BLOCKED — DISPOSABLE REPLAY NOT AVAILABLE`
- **Gate Disposition:** `CONFLICT_REQUIRES_MODERATOR`
- **Forensic Evidence:**
  - Docker daemon is not running on the local host (`failed to connect to the docker API at unix:///Users/shadreckmusarurwa/.docker/run/docker.sock: connect: no such file or directory`).
  - `supabase start` and `supabase db reset --local` cannot execute without Docker.
  - Plain local PostgreSQL 16 on `/tmp:5432` lacks the prerequisite Supabase platform schemas (`auth.users`, `storage.buckets`, `storage.objects`) and RBAC roles (`anon`, `authenticated`, `service_role`).
  - No disposable database replay can be executed without either starting Docker or pointing to a live project (which is strictly prohibited for Staging and Production).
  - Clean replay is therefore **unproven locally** and blocked pending moderator resolution.

---

## 11. EXACT PROPOSED HT-NR-01 MUTATION SET

When HT-NR-01 executes, it will apply additions and modifications strictly to the following **70 files**:

```
# Server APIs (3 files)
A  api/communications.js
A  api/newsroom.js
A  api/public.js

# Database Migrations (60 files)
A  supabase/migrations/20260909000100_content_core.sql
A  supabase/migrations/20260909000200_taxonomy_and_geo.sql
A  supabase/migrations/20260909000300_redirects_and_seo.sql
A  supabase/migrations/20260909000400_analytics_and_ads.sql
A  supabase/migrations/20260909000500_migration_runs_and_checkpoints.sql
A  supabase/migrations/20260916030642_ag02_staging_security_baseline.sql
A  supabase/migrations/20260921232347_ag05_seo_analytics_monetization_continuity.sql
A  supabase/migrations/20260922003145_ag05_rehearsal_runtime_closure.sql
A  supabase/migrations/20260922003554_ag05_sitemap_xml_rpc.sql
A  supabase/migrations/20260922003722_ag05_url_resolution_ledger.sql
A  supabase/migrations/20260922004651_ag05_link_ledger_evidence.sql
A  supabase/migrations/20260922005024_ag05_materialize_link_audit.sql
A  supabase/migrations/20260922020254_ag06_newsroom_auth_rbac.sql
A  supabase/migrations/20260922021319_ag06_staging_http_cert_helper.sql
A  supabase/migrations/20260922021408_ag06_staging_http_cert_helper_cleanup.sql
A  supabase/migrations/20260922021521_ag06_security_advisor_hardening.sql
A  supabase/migrations/20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql
A  supabase/migrations/20260922030247_ag05_context_routes.sql
A  supabase/migrations/20260922030729_ag05_preserve_direct_handoff_case.sql
A  supabase/migrations/20260922031250_ag06_newsroom_story_listing_perf.sql
A  supabase/migrations/20260922032244_ag06_story_rls_performance.sql
A  supabase/migrations/20260922033138_ag06_certification_cleanup_35683173735_v2.sql
A  supabase/migrations/20260922033157_ag06_auth_delete_revocation.sql
A  supabase/migrations/20260922033542_ag06_auth_delete_guard.sql
A  supabase/migrations/20260922035013_ag05_normalize_preserve_strategy.sql
A  supabase/migrations/20260922035050_ag06_cleanup_failed_certification_users.sql
A  supabase/migrations/20260922035335_ag05_nested_category_context.sql
A  supabase/migrations/20260922040649_ag05_rehearsal_readiness_guard.sql
A  supabase/migrations/20260922054411_ca01_internal_schema_capabilities.sql
A  supabase/migrations/20260922054415_ca01_inbox_story_discussion.sql
A  supabase/migrations/20260922054420_ca01_desks_threads_announcements.sql
A  supabase/migrations/20260922054424_ca01_communication_storage.sql
A  supabase/migrations/20260922054428_ca01_reader_discussion_moderation.sql
A  supabase/migrations/20260922054449_ca01_realtime_authorization.sql
A  supabase/migrations/20260922055517_ca01_attachment_access_hardening.sql
A  supabase/migrations/20260922061142_ca01_attachment_access_hardening.sql
A  supabase/migrations/20260922061238_ca01_desk_member_rls_recursion_fix.sql
A  supabase/migrations/20260922065253_ca01_fk_index_hardening.sql
A  supabase/migrations/20260922065811_ca01_fk_index_hardening.sql
A  supabase/migrations/20260922070256_ca01_realtime_event_emission.sql
A  supabase/migrations/20260922094527_com01_communications_domain.sql
A  supabase/migrations/20260922095013_com01_private_attachments.sql
A  supabase/migrations/20260922100851_com01_campaign_and_escalation_authority.sql
A  supabase/migrations/20260924072830_ag06_story_media_request_changes.sql
A  supabase/migrations/20260924073135_ag06_media_listing_performance.sql
A  supabase/migrations/20260924073537_ag06_media_storage_policy_helper.sql
A  supabase/migrations/20260924074219_ag06_media_storage_read_helper.sql
A  supabase/migrations/20260924103201_ag06_cms_public_media_promotion.sql
A  supabase/migrations/20260924105815_ag06_native_reader_release_marker.sql
A  supabase/migrations/20260925230247_ag06_public_story_release_boundary_hardening.sql
A  supabase/migrations/20260927040923_ag06_certification_active_binding_cleanup.sql
A  supabase/migrations/20260927091500_ag06_canonical_author_section_authority.sql
A  supabase/migrations/20260927093000_ag06_native_public_context.sql
A  supabase/migrations/20260927094500_ag06_inline_body_binding.sql
A  supabase/migrations/20260927101500_ag06_public_inline_media_promotion.sql
A  supabase/migrations/20260927110000_ag06_inline_public_storage_authority.sql
A  supabase/migrations/20260927113000_ag06_certification_author_binding_cleanup.sql
A  supabase/migrations/20260927120000_ag06_certification_cleanup_service_role_claim.sql
A  supabase/migrations/20260927121500_ag06_audit_feed_performance.sql
A  supabase/migrations/20260927123000_ag06_certification_active_binding_cleanup.sql

# Migration Lineage Manifest (1 file)
A  supabase/migration-lineage/healthtimes-staging-adoption.json

# Local Test Server Harnesses (2 files)
A  scripts/ag06/newsroom-test-server.js
A  scripts/ca01/communications-test-server.js

# Standalone Local Contract Test Suites (3 files)
A  tests/ag06-security-contract.spec.js
A  tests/ca01-contract.spec.js
A  tests/com01-contract.spec.js

# Generated TypeScript Schema (1 file)
M  apps/mobile/src/generated/database.types.ts
```

---

## 12. EXACT PROPOSED HT-NR-01 CERTIFICATION COMMANDS (GATES 1–9)

```bash
# Gate 1: Baseline Verification
git status --porcelain
npm --prefix apps/mobile run typecheck

# Gate 2: Ledger Recustody Verification
git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- supabase/migrations/
git checkout 6994aa18d37e2189dbc1d3f8efc76a638ee0971c -- supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql
git checkout 6994aa18d37e2189dbc1d3f8efc76a638ee0971c -- supabase/migrations/20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql
ls -1 supabase/migrations/*.sql | wc -l # Must equal exactly 62

# Gate 3: Lineage Manifest Recustody
git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- supabase/migration-lineage/healthtimes-staging-adoption.json

# Gate 4: API Recustody & Syntax Smoke Check
git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- api/newsroom.js api/communications.js api/public.js
node -e "require('./api/newsroom.js'); require('./api/communications.js'); require('./api/public.js'); console.log('APIs syntax OK');"

# Gate 5: Local Test Harness & Contract Suite Recustody
git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- scripts/ag06/newsroom-test-server.js scripts/ca01/communications-test-server.js
git checkout 755b7ba7aedaff0d3997a9f540572665c218d7e7 -- tests/ag06-security-contract.spec.js tests/ca01-contract.spec.js tests/com01-contract.spec.js

# Gate 6: Local Contract Suite Certification
npm run test:ag06:contract
npm run test:ca01:contract
npm run test:com01:contract

# Gate 7: Generated Types Verification
supabase gen types typescript --project-id gcdohgbmqhqwydgaxrcr > apps/mobile/src/generated/database.types.ts
npm --prefix apps/mobile run typecheck

# Gate 8: Mobile Quality Safety Gate
npm --prefix apps/mobile run lint
npm --prefix apps/mobile run typecheck

# Gate 9: Live Staging Read-Only Verification (Zero Mutations)
# Verify project gcdohgbmqhqwydgaxrcr status is ACTIVE_HEALTHY and matches 62 migration ledger.

# Gate 10: Commit and Push
git add \
  api/communications.js \
  api/newsroom.js \
  api/public.js \
  apps/mobile/src/generated/database.types.ts \
  scripts/ag06/newsroom-test-server.js \
  scripts/ca01/communications-test-server.js \
  supabase/migration-lineage/healthtimes-staging-adoption.json \
  supabase/migrations/ \
  tests/ag06-security-contract.spec.js \
  tests/ca01-contract.spec.js \
  tests/com01-contract.spec.js
git commit -m "feat(newsroom): canonical server-authority recustody (HT-NR-01)"
```

---

## 13. EXPLICIT FILES THAT MUST NOT BE RECOVERED

1. `newsroom.html`, `newsroom.js`, `newsroom.css`: Legacy web prototype. Canonical future Newsroom UI is `apps/mobile/app/studio/**`.
2. `vercel.json`: Deployment/serving configuration; not part of kernel source recustody.
3. `api/discussion.js`: Redundant endpoint; mobile communications calls Supabase RPCs directly.
4. `api/web.js`: Obsolete Phase 4 SSR shell.
5. `scripts/ag06/provision-staging-signups.mjs`: Staging-mutating script.
6. `supabase/functions/**` (`ag06-certification-provision`, `ca01-certification-provision`, `com01-certification-provision`): Ephemeral test-provisioning edge functions.
7. `tests/ag06-live-security.spec.js` and `tests/ca01-live-security.spec.js`: Staging-mutating test suites.
8. Historical Reader UI files in PR #40 root (`index.html`, `article.html`, `category.html`, etc.).

---

## 14. STOP CONDITIONS

HT-NR-01 execution must halt immediately if:
1. Any file under `apps/mobile/app/`, `apps/mobile/src/ui/`, or `apps/mobile/src/services/` is modified or experiences typecheck errors.
2. Migration 61 or 62 (`20261002060846` or `20261002061027`) is overwritten, removed, or modified.
3. Any DDL or DML write operation is executed against Staging project `gcdohgbmqhqwydgaxrcr`.
4. Any historical commit is merged directly into `main` rather than selective blob recustody.
5. Contract tests fail against local mock/test servers.
6. An unproven claim of clean from-zero database replay is made without a running disposable database instance.

---
**AUTHORIZATION:** This manifest is complete, deterministic, and safe for execution in `HT-NR-01` upon moderator resolution of from-zero replay testing.
