# HT-NR-00B — Historical Newsroom Lineage Reconstruction + Deployed-Staging Source Match

**Repository:** `kudzimusar/htp-zw`  
**Programme:** `HT-NR — HealthTimes Newsroom OS`  
**Task:** `HT-NR-00B`  
**Starting authority:** `98a2e4f95a47e8fbf025c3518ad93eeef3a05bbc`  
**Working branch:** `audit/ht-nr00b-lineage-reconstruction`  
**Canonical main inspected:** `6994aa18d37e2189dbc1d3f8efc76a638ee0971c`  
**Live staging:** `gcdohgbmqhqwydgaxrcr` (`ACTIVE_HEALTHY`)  
**Scope:** read-only lineage/schema forensics + documentation only

---

## 1. Executive Finding

**Repository fact:** the exact PR #33 → PR #34 → PR #40 chain is linear:

`11fe434ec5bd25fcd6a963edd9718e42a108adc9`
→ `2849c18cd9f5ed36d62b4bb72d19f55c00ab8b15`
→ `ed5e38a4201029c342617aa43f1dbd62161f5b97`
→ `755b7ba7aedaff0d3997a9f540572665c218d7e7`.

PR #40 head is exactly one documentation-only commit beyond the accepted runtime `ed5e38a…`; runtime/API/migration code is unchanged by that final commit.

**Repository + live fact:** PR #40 head contains exactly **60** migration identities. HealthTimes Staging currently contains **62**. The only live identities absent from PR #40 are the two later Premium teaser migrations already present on canonical main:

- `20261002060846_ag05_premium_teaser_public_projection.sql`
- `20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql`

Therefore the deterministic source set for the deployed database is:

> **PR #40 cumulative source snapshot (first 60 identities) + the two later Premium migrations already on canonical main.**

No separate CA-01 or COM-01 runtime merge is required to reconstruct their code: their code-bearing authority is already contained in the cumulative source spine. Their branch-only tails are documentation/certification custody.

**Important:** this does **not** authorize merging PR #40 wholesale into current main. PR #40 and current main diverge substantially (`main` is 49 commits ahead and PR #40 lineage is 798 commits ahead from merge-base `a4f1211e…`). NR-00C must selectively recustody Newsroom server authority without rolling Reader/UI history backward.

---

## 2. Evidence Labels

- **REPOSITORY FACT** — directly observed from Git ancestry, trees, blobs, commits or PR metadata.
- **LIVE STAGING FACT** — read-only query against `gcdohgbmqhqwydgaxrcr`.
- **HISTORICAL CERTIFICATION EVIDENCE** — previously recorded exact-head certification/PR evidence.
- **INFERENCE** — conclusion from multiple facts; explicitly marked.
- **UNRESOLVED** — source/effect cannot be proven byte-for-byte and is not silently upgraded to fact.

No staging or production mutation was performed.

---

## 3. Branch / PR Ancestry Graph

| Lineage | Current head / accepted runtime | Relationship proven in NR-00B | Disposition for recovery |
|---|---|---|---|
| AG-05 PR #12 `migration/ag-05-seo-analytics-monetization` | `74b22637674c081d97377f930d72913a20e15f0a` | Historical CP5 branch; later `recovery/ag05-cp5-capability-convergence@304d475…` is a separate recovery lineage. | Historical source; do not merge PR #12 wholesale. |
| AG-05 recovery | `304d475ef9e6b42d389c625695b645b0d337e4ec` | **Ancestor of PR #40**: PR #40 is 269 commits ahead / 0 behind from this SHA. | Already contained in cumulative spine. |
| AG-06 PR #13 | `a2d78da6d4969eac7df41cfaa2ebc38024218799` | CA-01 branched from AG-06 closure `a94955d…`; PR #13 head adds 4 later certification-workflow/provision/test commits, not migration/API product changes. | Original historical source; deployed identities later adopted into cumulative spine. |
| CA-01 PR #15 | `5162feb719f066a41a1b1d302f4d8fd33a702fff` | Code merge-base with cumulative lineage: `e8bbbc22661dbd5a755e63742fb53c805d96d5b9`. PR #15 is only **1 documentation closure commit** beyond that base; PR #33 descends from the base. | CA-01 runtime code already in cumulative spine. |
| COM-01 PR #21 | `d6734ee2789ecd54ac96c1945140968072653029` | Code merge-base with PR #33: `5b6fca0fe1dceed5e167b845e023dfc456c47040`. PR #21 adds only **2 commits touching its implementation report** beyond that code base. | COM-01 runtime code already in cumulative spine. |
| COM-01 final provider-cert branch | `71507da195123d5c20b46cfe3d26ac8534cdcede` | Branches from integrated Phase-12 `3ace38e…`; 2 commits ahead and only `COM-01_FINAL_LIVE_PROVIDER_CERTIFICATION.md` differs. PR #40 also descends from `3ace38e…`. | Certification evidence only; no missing runtime code to merge. |
| PR #33 AG-06/CA-01 P1 | `11fe434ec5bd25fcd6a963edd9718e42a108adc9` | Certified migration-identity correction; parent of PR #34. | Cumulative source milestone. |
| PR #34 public media | `2849c18cd9f5ed36d62b4bb72d19f55c00ab8b15` | Exactly 23 commits ahead / 0 behind PR #33. | Cumulative source milestone. |
| PR #40 runtime | `ed5e38a4201029c342617aa43f1dbd62161f5b97` | Exactly 60 commits ahead / 0 behind PR #34. | Accepted code/runtime candidate. |
| PR #40 branch head | `755b7ba7aedaff0d3997a9f540572665c218d7e7` | Exactly 1 commit ahead of runtime; only `AG-06_NM04_CONSUMER_AUTHORITY_HANDOFF.md` changed. | Best cumulative source snapshot; runtime equivalent to `ed5e38a…`. |
| Canonical main | `6994aa18d37e2189dbc1d3f8efc76a638ee0971c` | Diverged from PR #40; contains later Reader/UI and Premium authority. | Destination authority, not a branch to replace. |

### Ancestry conclusion

The historical PRs are **not** seven peer branches that should be merged together. The recoverable runtime authority has already been composed into the later integrated lineage. The operative source spine is the cumulative PR #40 tree, with current-main-only later authority preserved.

---

## 4. Live Migration Ledger Reconstruction

**LIVE STAGING FACT:** staging contains **62 total migrations**.

**REPOSITORY FACT:** PR #40 contains **60/60** of the staging identities that existed through its accepted lineage. The current additional two are the October Premium migrations on main.

For the Newsroom-related AG-05 / AG-06 / CA-01 / COM-01 scope there are **56 live migrations**.

### SQL-body verification method

NR-00B read `supabase_migrations.schema_migrations.statements` without mutation and compared applied SQL with repository source.

- **Exact** — stored applied SQL is byte-for-byte the repository source.
- **Equivalent** — PostgreSQL/Supabase statement splitting, comments or whitespace differ, but the SQL token stream matches after removing comments, whitespace and statement separators.
- **Unresolved** — the exact historical body is intentionally not represented by the current file (transient/duplicate no-op adoption marker), or was reconstructed from live effects rather than recovered byte-for-byte.

The repository's existing `supabase/migration-lineage/healthtimes-staging-adoption.json` independently records historical identity drift and Git blob fingerprints for the adopted pre-media ledger.

### Per-migration source map

| Live migration | Branch / owner | Repository filename | Current-identity introduction | Git blob | SQL body confidence | Historical identity | Supersession / final source |
|---|---|---|---|---|---|---|---|
| `20260921232347` / `ag05_seo_analytics_monetization_continuity` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260921232347_ag05_seo_analytics_monetization_continuity.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `38e72e8bb5e1c4abc976b60a5cbec8777d2c54d5` | Exact | 20260922081500_ag05_seo_analytics_monetization_continuity.sql | — Final source: `20260921232347_ag05_seo_analytics_monetization_continuity.sql` |
| `20260922003145` / `ag05_rehearsal_runtime_closure` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922003145_ag05_rehearsal_runtime_closure.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `9567eabe7d293773c6ed0a8ca4ce452921af3bbe` | Exact | 20260922094000_ag05_rehearsal_runtime_closure.sql | — Final source: `20260922003145_ag05_rehearsal_runtime_closure.sql` |
| `20260922003554` / `ag05_sitemap_xml_rpc` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922003554_ag05_sitemap_xml_rpc.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `c2155912ebbd9eb33e97816350d92020b44822e8` | Exact | 20260922095000_ag05_sitemap_xml_rpc.sql | — Final source: `20260922003554_ag05_sitemap_xml_rpc.sql` |
| `20260922003722` / `ag05_url_resolution_ledger` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922003722_ag05_url_resolution_ledger.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `b38927a3a2a5e995d91dfa63940b3ce2510aa207` | Exact | 20260922096000_ag05_url_resolution_ledger.sql | — Final source: `20260922003722_ag05_url_resolution_ledger.sql` |
| `20260922004651` / `ag05_link_ledger_evidence` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922004651_ag05_link_ledger_evidence.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `4f16d8c4f936d3fb27c058d61bd6469cd7820f84` | Exact | 20260922097000_ag05_link_ledger_evidence.sql | — Final source: `20260922004651_ag05_link_ledger_evidence.sql` |
| `20260922005024` / `ag05_materialize_link_audit` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922005024_ag05_materialize_link_audit.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `e7add174046c15b763b5bce96de8367ad196280b` | Exact | 20260922098000_ag05_materialize_link_audit.sql | — Final source: `20260922005024_ag05_materialize_link_audit.sql` |
| `20260922020254` / `ag06_newsroom_auth_rbac` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 | `20260922020254_ag06_newsroom_auth_rbac.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `cc5477f25606cdc64bc17d2e57fe43987347077a` | Exact | 20260922080100_ag06_newsroom_auth_rbac.sql | Core create/save/transition definitions later superseded by `20260927091500` / `20260927101500`; RBAC/assignment/context functions remain authoritative. Final source: `20260922020254_ag06_newsroom_auth_rbac.sql` |
| `20260922021319` / `ag06_staging_http_cert_helper` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 certification | `20260922021319_ag06_staging_http_cert_helper.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | historical live-only transient certification migration | Transient certification ledger identity; explicit no-op adoption marker; do not replay historical operation. Final source: `20260922021319_ag06_staging_http_cert_helper.sql` |
| `20260922021408` / `ag06_staging_http_cert_helper_cleanup` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 certification | `20260922021408_ag06_staging_http_cert_helper_cleanup.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | historical live-only transient certification cleanup | Transient certification ledger identity; explicit no-op adoption marker; do not replay historical operation. Final source: `20260922021408_ag06_staging_http_cert_helper_cleanup.sql` |
| `20260922021521` / `ag06_security_advisor_hardening` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 | `20260922021521_ag06_security_advisor_hardening.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `cedcdc0abe861810a7eb5103a0c128e3b9cb096a` | Equivalent | 20260922112000_ag06_security_advisor_hardening.sql | — Final source: `20260922021521_ag06_security_advisor_hardening.sql` |
| `20260922023605` / `ag06_staging_confirm_reporter_probe_35679759314` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 certification | `20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | historical live-only transient certification probe | Transient certification ledger identity; explicit no-op adoption marker; do not replay historical operation. Final source: `20260922023605_ag06_staging_confirm_reporter_probe_35679759314.sql` |
| `20260922030247` / `ag05_context_routes` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922030247_ag05_context_routes.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `34ff31581a28116bff8f457869fbfb7b7b317b65` | Exact | 20260922120500_ag05_context_routes.sql | — Final source: `20260922030247_ag05_context_routes.sql` |
| `20260922030729` / `ag05_preserve_direct_handoff_case` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922030729_ag05_preserve_direct_handoff_case.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `1b05f8a8b8a56d86cd5e36009d9a4ca0fcb914ed` | Exact | 20260922121500_ag05_preserve_direct_handoff_case.sql | — Final source: `20260922030729_ag05_preserve_direct_handoff_case.sql` |
| `20260922031250` / `ag06_newsroom_story_listing_perf` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 | `20260922031250_ag06_newsroom_story_listing_perf.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `19c2e006f7788fa6ebd968e943109317f5d9bc40` | Equivalent | 20260922080200_ag06_newsroom_story_listing_perf.sql | — Final source: `20260922031250_ag06_newsroom_story_listing_perf.sql` |
| `20260922032244` / `ag06_story_rls_performance` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 | `20260922032244_ag06_story_rls_performance.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `7e6bac42193b396cb19cf8471aae365fc0b3c64e` | Equivalent | 20260922080300_ag06_story_rls_performance.sql | — Final source: `20260922032244_ag06_story_rls_performance.sql` |
| `20260922033138` / `ag06_certification_cleanup_35683173735_v2` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 certification | `20260922033138_ag06_certification_cleanup_35683173735_v2.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | historical live-only certification cleanup | Transient certification ledger identity; explicit no-op adoption marker; do not replay historical operation. Final source: `20260922033138_ag06_certification_cleanup_35683173735_v2.sql` |
| `20260922033157` / `ag06_auth_delete_revocation` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 | `20260922033157_ag06_auth_delete_revocation.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `accac75da4e38ec99cbca49743aff1758817409a` | Equivalent | 20260922080400_ag06_auth_delete_revocation.sql | — Final source: `20260922033157_ag06_auth_delete_revocation.sql` |
| `20260922033542` / `ag06_auth_delete_guard` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 | `20260922033542_ag06_auth_delete_guard.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `f6ba24feca96e57bf3788c5fdee1b90329dd7f97` | Equivalent | 20260922080500_ag06_auth_delete_guard.sql | — Final source: `20260922033542_ag06_auth_delete_guard.sql` |
| `20260922035013` / `ag05_normalize_preserve_strategy` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922035013_ag05_normalize_preserve_strategy.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `bed63824c9c3d80fb20965adf24368bb6469a395` | Exact | 20260922122000_ag05_normalize_preserve_strategy.sql | — Final source: `20260922035013_ag05_normalize_preserve_strategy.sql` |
| `20260922035050` / `ag06_cleanup_failed_certification_users` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-06 certification | `20260922035050_ag06_cleanup_failed_certification_users.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | historical live-only certification cleanup | Transient certification ledger identity; explicit no-op adoption marker; do not replay historical operation. Final source: `20260922035050_ag06_cleanup_failed_certification_users.sql` |
| `20260922035335` / `ag05_nested_category_context` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922035335_ag05_nested_category_context.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `0ec6d31f38e33882e70adf5f0770620621cced60` | Exact | 20260922122500_ag05_nested_category_context.sql | — Final source: `20260922035335_ag05_nested_category_context.sql` |
| `20260922040649` / `ag05_rehearsal_readiness_guard` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: AG-05/CP5 | `20260922040649_ag05_rehearsal_readiness_guard.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `c9411a915681159bf888ddf60e76b37d49fa64f3` | Exact | 20260922131000_ag05_rehearsal_readiness_guard.sql | — Final source: `20260922040649_ag05_rehearsal_readiness_guard.sql` |
| `20260922054411` / `ca01_internal_schema_capabilities` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922054411_ca01_internal_schema_capabilities.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `30151f4a4ff2e917dfbf6b0a360b2343e13b2890` | Exact | 20260922140000_ca01_internal_schema_capabilities.sql | — Final source: `20260922054411_ca01_internal_schema_capabilities.sql` |
| `20260922054415` / `ca01_inbox_story_discussion` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922054415_ca01_inbox_story_discussion.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `d3920cdaec2487fca7e450ff40d7ddc1040bdb45` | Exact | 20260922140100_ca01_inbox_story_discussion.sql | — Final source: `20260922054415_ca01_inbox_story_discussion.sql` |
| `20260922054420` / `ca01_desks_threads_announcements` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922054420_ca01_desks_threads_announcements.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `981187617b53b19103563f708b1a769638b6db85` | Exact | 20260922140200_ca01_desks_threads_announcements.sql | — Final source: `20260922054420_ca01_desks_threads_announcements.sql` |
| `20260922054424` / `ca01_communication_storage` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922054424_ca01_communication_storage.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `025593db521ad316ea51dd56f10058cf1852d25c` | Exact | 20260922140300_ca01_communication_storage.sql | — Final source: `20260922054424_ca01_communication_storage.sql` |
| `20260922054428` / `ca01_reader_discussion_moderation` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922054428_ca01_reader_discussion_moderation.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `63ce29fa77992fe26f2b7a72bb4a3931c1ce3fb2` | Exact | 20260922140400_ca01_reader_discussion_moderation.sql | — Final source: `20260922054428_ca01_reader_discussion_moderation.sql` |
| `20260922054449` / `ca01_realtime_authorization` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922054449_ca01_realtime_authorization.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `0f5632c71291425090af06b493b40d2d0f6e3945` | Exact | 20260922140500_ca01_realtime_authorization.sql | — Final source: `20260922054449_ca01_realtime_authorization.sql` |
| `20260922055517` / `ca01_attachment_access_hardening` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922055517_ca01_attachment_access_hardening.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `bf39bacd454549750320072ec6b1f4f2ab48ac19` | Exact | 20260922140600_ca01_attachment_access_hardening.sql | — Final source: `20260922055517_ca01_attachment_access_hardening.sql` |
| `20260922061142` / `ca01_attachment_access_hardening` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922061142_ca01_attachment_access_hardening.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | duplicate live application; durable effect owned by 20260922055517 | Duplicate logical attachment-hardening application; durable effect owned by `20260922055517`. Final source: `20260922061142_ca01_attachment_access_hardening.sql` |
| `20260922061238` / `ca01_desk_member_rls_recursion_fix` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922061238_ca01_desk_member_rls_recursion_fix.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `180ed2142062a8c8dca63a1c9ca0ffa5dc90ac59` | Exact | 20260922140700_ca01_desk_member_rls_recursion_fix.sql | — Final source: `20260922061238_ca01_desk_member_rls_recursion_fix.sql` |
| `20260922065253` / `ca01_fk_index_hardening` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922065253_ca01_fk_index_hardening.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `5b18c1068a15f03837586f0150f4bd947621b29b` | Exact | 20260922140800_ca01_fk_index_hardening.sql | — Final source: `20260922065253_ca01_fk_index_hardening.sql` |
| `20260922065811` / `ca01_fk_index_hardening` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922065811_ca01_fk_index_hardening.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a960626806c8ac5b10fcfa7cf77bff2944d552f0` | Unresolved | duplicate live application; durable effect owned by 20260922065253 | Duplicate logical FK-index application; durable effect owned by `20260922065253`. Final source: `20260922065811_ca01_fk_index_hardening.sql` |
| `20260922070256` / `ca01_realtime_event_emission` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: CA-01 | `20260922070256_ca01_realtime_event_emission.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `d5a3e0a7cbffd3c9719cc21a1f372939ad60435b` | Exact | 20260922140900_ca01_realtime_event_emission.sql | — Final source: `20260922070256_ca01_realtime_event_emission.sql` |
| `20260922094527` / `com01_communications_domain` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: COM-01 | `20260922094527_com01_communications_domain.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `a94b093e2ee17fcd690461bd3e631ce60f2e9582` | Equivalent | 20260922183500_com01_communications_domain.sql | — Final source: `20260922094527_com01_communications_domain.sql` |
| `20260922095013` / `com01_private_attachments` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: COM-01 | `20260922095013_com01_private_attachments.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `2f5e5ab5f954724149e9f7fe2aa3d928bd4cf65f` | Equivalent | 20260922183600_com01_private_attachments.sql | — Final source: `20260922095013_com01_private_attachments.sql` |
| `20260922100851` / `com01_campaign_and_escalation_authority` | `feat/ag06-native-public-context-inline-media` cumulative adoption (historical owner retained below); owner: COM-01 | `20260922100851_com01_campaign_and_escalation_authority.sql` | `3820f48ea1670bc9e8be387524cabc52a2bfb0c8` — live-ledger identity adopted into cumulative source without replay | `1a15e6d890aa39fa2188fb939c9cba7d9bbf6327` | Unresolved | reconstructed from live schema/function definitions | Historical SQL body absent from repository; current file reconstructs live schema/function effects. Treat as effect authority, not byte-for-byte history. Final source: `20260922100851_com01_campaign_and_escalation_authority.sql` |
| `20260924072830` / `ag06_story_media_request_changes` | `fix/ag06-ca01-newsroom-p1-product` → PR #34 → PR #40; owner: AG06 | `20260924072830_ag06_story_media_request_changes.sql` | `11fe434ec5bd25fcd6a963edd9718e42a108adc9` — PR #33; renamed from 20260924152000 with zero SQL delta; logical origin 4a1e50c, later hardened through 8584d6e | `837e6a6fb60a24ef4ab072c839893d1344928ca8` | Exact | same identity | — Final source: `20260924072830_ag06_story_media_request_changes.sql` |
| `20260924073135` / `ag06_media_listing_performance` | `fix/ag06-ca01-newsroom-p1-product` → PR #34 → PR #40; owner: AG06 | `20260924073135_ag06_media_listing_performance.sql` | `11fe434ec5bd25fcd6a963edd9718e42a108adc9` — PR #33; renamed from 20260924154500; logical origin b289506 | `4bc581702431d7f24a6e0664e528e9c38e277e28` | Exact | same identity | — Final source: `20260924073135_ag06_media_listing_performance.sql` |
| `20260924073537` / `ag06_media_storage_policy_helper` | `fix/ag06-ca01-newsroom-p1-product` → PR #34 → PR #40; owner: AG06 | `20260924073537_ag06_media_storage_policy_helper.sql` | `11fe434ec5bd25fcd6a963edd9718e42a108adc9` — PR #33; renamed from 20260924160000; logical origin e762664 | `9e2356e0a0b3ea0a0fc2dd060152c06009944dd6` | Exact | same identity | — Final source: `20260924073537_ag06_media_storage_policy_helper.sql` |
| `20260924074219` / `ag06_media_storage_read_helper` | `fix/ag06-ca01-newsroom-p1-product` → PR #34 → PR #40; owner: AG06 | `20260924074219_ag06_media_storage_read_helper.sql` | `11fe434ec5bd25fcd6a963edd9718e42a108adc9` — PR #33; renamed from 20260924161500; logical origin db14fe2 | `30be71a137ca9dfa700dda7fc18e22b8d554a58f` | Exact | same identity | — Final source: `20260924074219_ag06_media_storage_read_helper.sql` |
| `20260924103201` / `ag06_cms_public_media_promotion` | `feat/ag06-cms-public-media-promotion` → PR #40 cumulative spine; owner: AG06 | `20260924103201_ag06_cms_public_media_promotion.sql` | `2a3eef51a840f754e62ae6c0d7005c7ac133a5d5` — PR #34 | `4fdeb7ae52f46e0c409bbdaaaf8b709fe0950f3b` | Equivalent | same identity | `newsroom_transition_story`, public story document and promotion functions later superseded by `20260927101500`. Final source: `20260924103201_ag06_cms_public_media_promotion.sql` |
| `20260924105815` / `ag06_native_reader_release_marker` | `feat/ag06-cms-public-media-promotion` → PR #40 cumulative spine; owner: AG06 | `20260924105815_ag06_native_reader_release_marker.sql` | `81e23c29a366b0845e9c4b845984535b6945ad64` — PR #34 | `f271cfd1cd8e94c3c31b4ebee9467aaabe4436ee` | Equivalent | same identity | — Final source: `20260924105815_ag06_native_reader_release_marker.sql` |
| `20260925230247` / `ag06_public_story_release_boundary_hardening` | `feat/ag06-cms-public-media-promotion` → PR #40 cumulative spine; owner: AG06 | `20260925230247_ag06_public_story_release_boundary_hardening.sql` | `79ce9a0c3073d2c90c61b370849f63d74c49817a` — PR #34 | `757e23890fd54489af7f9524702f5cbeb33bc97b` | Equivalent | same identity | — Final source: `20260925230247_ag06_public_story_release_boundary_hardening.sql` |
| `20260927040923` / `ag06_certification_active_binding_cleanup` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927040923_ag06_certification_active_binding_cleanup.sql` | `e81cf415f80d6b4a57b5845f270a77f3aabe1ce7` — PR #40 adoption marker; later replay-safe correction 3afe2b0; applied body exact-matches durable 20260927123000 source | `dad37819e34109301129cd98711266ffe39fdceb` | Exact (cross-identity source) | same identity | Historical cleanup identity retained as no-op marker; applied SQL is byte-identical to repository `20260927123000` durable cleanup source. Final source: `20260927123000_ag06_certification_active_binding_cleanup.sql` |
| `20260927091500` / `ag06_canonical_author_section_authority` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927091500_ag06_canonical_author_section_authority.sql` | `c471a14f24f310eb9265b3a3519b2c8a04c6a8c5` — PR #40 | `9e3bffe8b037c0d4c3bbb1aa8a46c0de4e6b3c7f` | Equivalent | same identity | Final `newsroom_create_story` / `newsroom_save_story` canonical author/section authority. Final source: `20260927091500_ag06_canonical_author_section_authority.sql` |
| `20260927093000` / `ag06_native_public_context` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927093000_ag06_native_public_context.sql` | `fb688a8c6299671f1f3d90466d9f61354c8c0125` — PR #40 | `7399bdf5eb4ce16df5602761f1748b2534c136c7` | Equivalent | same identity | — Final source: `20260927093000_ag06_native_public_context.sql` |
| `20260927094500` / `ag06_inline_body_binding` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927094500_ag06_inline_body_binding.sql` | `48ab10f78262d1b50d4ebd77c7375029367fc231` — PR #40 | `0a06fa4da0b0054dcd0ab1569898387a1f0cc937` | Equivalent | same identity | — Final source: `20260927094500_ag06_inline_body_binding.sql` |
| `20260927101500` / `ag06_public_inline_media_promotion` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927101500_ag06_public_inline_media_promotion.sql` | `8a46d99442ae9466c78f0bb856031cd3f6210d2b` — PR #40; later corrected by 46a3081 | `833636dd97e7b6f37af0db62a5eca37dd91c36b8` | Equivalent | same identity | Final Reader-bound promotion, `newsroom_transition_story`, and public story projection authority. Final source: `20260927101500_ag06_public_inline_media_promotion.sql` |
| `20260927110000` / `ag06_inline_public_storage_authority` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927110000_ag06_inline_public_storage_authority.sql` | `4f86de3c99e777b101dd322979c9d1e745ec3f0b` — PR #40 | `795edb25c4cdf8c5ff0d07d90153944bb781c3b7` | Equivalent | same identity | — Final source: `20260927110000_ag06_inline_public_storage_authority.sql` |
| `20260927113000` / `ag06_certification_author_binding_cleanup` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927113000_ag06_certification_author_binding_cleanup.sql` | `184438b055753a69a4fa6366732c091d0f837c6c` — PR #40 | `ded107c47e1fc179a558bbbcdcb2f76ece2f02d8` | Equivalent | same identity | — Final source: `20260927113000_ag06_certification_author_binding_cleanup.sql` |
| `20260927120000` / `ag06_certification_cleanup_service_role_claim` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927120000_ag06_certification_cleanup_service_role_claim.sql` | `4d9c249fdb1ab9b3b5a523b35d72bfb3ab6e8719` — PR #40 | `0f739091d05e4e229ef7dc9b54aec9c4a62c6cc0` | Equivalent | same identity | — Final source: `20260927120000_ag06_certification_cleanup_service_role_claim.sql` |
| `20260927121500` / `ag06_audit_feed_performance` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927121500_ag06_audit_feed_performance.sql` | `9b2ad988ad98704b40e3e7095118a660e3c92191` — PR #40 | `bda9c3f1820a4aaff0d9a880a24ec14a353af3b3` | Equivalent | same identity | — Final source: `20260927121500_ag06_audit_feed_performance.sql` |
| `20260927123000` / `ag06_certification_active_binding_cleanup` | `feat/ag06-native-public-context-inline-media` (PR #40 cumulative spine); owner: AG06 | `20260927123000_ag06_certification_active_binding_cleanup.sql` | `87af6ae1e78aee8ca353368137c1d08912d90899` — PR #40 | `d5abed2605f5d60731c23f47bc23ae914e119e5b` | Equivalent | same identity | — Final source: `20260927123000_ag06_certification_active_binding_cleanup.sql` |
| `20261002060846` / `ag05_premium_teaser_public_projection` | `main` / Premium accepted lineage; owner: AG05 | `20261002060846_ag05_premium_teaser_public_projection.sql` | `9afa03a32d7e1187c1a2cc383411bcfed3d3ea2a` — current-main Premium convergence | `d90fe37bbe23000033396ada830e6e718d7b78e6` | Exact | same identity | — Final source: `20261002060846_ag05_premium_teaser_public_projection.sql` |
| `20261002061027` / `ag05_premium_teaser_helper_privilege_hardening` | `main` / Premium accepted lineage; owner: AG05 | `20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql` | `9afa03a32d7e1187c1a2cc383411bcfed3d3ea2a` — current-main Premium convergence | `0c1843581edab0f942fd9942b7dc3c3f30e47bf8` | Exact | same identity | — Final source: `20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql` |

### Migration reconciliation totals

- Live Newsroom-related migrations: **56**
- Identity mapped to repository source: **56/56**
- Direct same-file SQL Exact/Equivalent: **47/56**
- Cross-identity exact source: **1** (`20260927040923` applied body = repository `20260927123000`)
- Intentionally unresolved historical-body rows: **8**
  - 7 are transient/duplicate certification/adoption identities that must not be replayed.
  - 1 is `20260922100851_com01_campaign_and_escalation_authority`, whose repository file is an effect reconstruction rather than the original applied SQL.
- Live migration identities absent from all inspected repository sources: **0**
- Repository-only identities relative to live staging within the PR #40 60-migration ledger: **0**
- Current live staging-only identities relative to PR #40: **2**, both expected later Premium migrations already on current main.

---

## 5. Rename / Collision / No-Replay Register

### PR #33 four pure identity corrections

At `11fe434…`, Git records zero-SQL-delta renames:

- `20260924152000_ag06_story_media_request_changes.sql` → `20260924072830_ag06_story_media_request_changes.sql`
- `20260924154500_ag06_media_listing_performance.sql` → `20260924073135_ag06_media_listing_performance.sql`
- `20260924160000_ag06_media_storage_policy_helper.sql` → `20260924073537_ag06_media_storage_policy_helper.sql`
- `20260924161500_ag06_media_storage_read_helper.sql` → `20260924074219_ag06_media_storage_read_helper.sql`

These align repository identity with the already-applied staging ledger. They are not new migrations.

### Explicit duplicate / transient identities

Do not replay historical operations represented by no-op adoption markers:

- `20260922021319_ag06_staging_http_cert_helper`
- `20260922021408_ag06_staging_http_cert_helper_cleanup`
- `20260922023605_ag06_staging_confirm_reporter_probe_35679759314`
- `20260922033138_ag06_certification_cleanup_35683173735_v2`
- `20260922035050_ag06_cleanup_failed_certification_users`
- `20260922061142_ca01_attachment_access_hardening` — duplicate effect owned by `20260922055517`
- `20260922065811_ca01_fk_index_hardening` — duplicate effect owned by `20260922065253`

### Active-binding cleanup identity collision

Live `20260927040923_ag06_certification_active_binding_cleanup` stored SQL is byte-identical to the durable repository source `20260927123000_ag06_certification_active_binding_cleanup.sql`. The reconstructed repository deliberately keeps `20260927040923` as a no-op historical identity while `20260927123000` carries replayable durable source.

### COM-01 reconstructed live effect

`20260922100851_com01_campaign_and_escalation_authority` is the only material historical-body provenance gap:

- live migration identity and applied statements exist;
- repository adoption metadata explicitly classifies the original repository file as missing;
- the current repository migration was reconstructed from live schema/function definitions;
- current live campaign/escalation functions exist with the reconstructed signatures;
- the cumulative line was historically from-zero certified.

**NR-00C rule:** retain this as reconstructed effect authority; never claim byte-for-byte historical recovery and never rewrite staging migration history.

---

## 6. API Lineage Reconstruction

| API | First/major source evolution | Current cumulative blob | Finding |
|---|---|---|---|
| `api/newsroom.js` | First secure API `6e9121f…`; CA-01 actions added through `ded24fc…`; signed story media `220b407…`; public-media promotion `4175fbd…`; canonical author/section bootstrap `f0813c5…`; Reader-bound media generalization `f71b19e…` | `f3520094832ad255d4e5a325430b2e51296af64f` at PR #40 | Most-complete authoritative candidate. Blob evolves PR #33 `486041e…` → PR #34 `6c328a1…` → PR #40 `f352009…`. |
| `api/communications.js` | Introduced by `2c7e48f19343b43bf318c8f5ad8b4f8b74ee5f09` | `d09ef467bea7435a1aee9e941d3a4e810c5de348` | Byte-identical on COM-01, PR #33, PR #34, PR #40 and later integrated certification lineages. No competing implementation. |
| `api/public.js` | Introduced by AG-05 recovery commit `b24ff176a5cc3323c21ad299018241dadf316bcc` | `2354d14094aafb0ab92429caa87bd31e00871127` | Byte-identical on AG-05 recovery and PR #33/#34/#40 cumulative lineages. |

### Runtime dependencies

`api/newsroom.js` depends on Supabase URL/publishable/service-role server configuration plus bounded invite/recovery redirect configuration. It exposes authoritative actions for auth/bootstrap, stories, workflow, assignments, discussion, desks/threads, moderation, media, staff/session administration, Premium and ad campaigns.

`api/communications.js` depends on Supabase server authority plus Resend/Brevo/COM-01 provider configuration. Its API surface includes inbound mail, Resend webhook, signup/consent, provider health and replies. Provider configuration status is external/runtime authority and is not inferred from code presence.

`api/public.js` is presentation-neutral public read authority over AG-05 public story/context/feed/sitemap/path/ad RPCs.

---

## 7. Server Function Redefinition / Final Authority Map

| Function / family | Live signature / state | Initial source | Final repository source |
|---|---|---|---|
| `newsroom_create_story` | `p_story jsonb` | `20260922020254` | **Final:** `20260927091500_ag06_canonical_author_section_authority.sql` @ `c471a14…` |
| `newsroom_save_story` | `p_story_id uuid, p_expected_version integer, p_patch jsonb, p_reason text` | `20260922020254` | **Final:** `20260927091500`; autosave selected by `p_reason='Autosave'`, not a separate boolean parameter |
| `newsroom_transition_story` | `p_story_id uuid, p_next_status text, p_reason text` | `20260922020254` | Public-media version at `20260924103201`; **final Reader-bound media authority:** `20260927101500` |
| `newsroom_create_assignment` | `p_payload jsonb` | `20260922020254` | Core AG-06 definition remains final |
| `newsroom_progress_assignment` | `p_assignment_id uuid` | `20260922020254` | Core AG-06 definition remains final |
| `newsroom_record_review` | `p_story_id uuid, p_review_type text, p_status text, p_notes text` | `20260922020254` | Core AG-06 definition remains final |
| `newsroom_request_story_changes` | `p_story_id uuid, p_reason text` | `20260924072830` | Same migration remains final |
| `newsroom_prepare_story_media` | story/file/MIME/size/checksum/metadata/usage arguments | `20260924072830` | Same migration remains final |
| `newsroom_finalize_story_media` | `p_media_id uuid, p_story_id uuid, p_usage_type text, p_checksum text` | `20260924072830` | Same migration remains final |
| `newsroom_stage_story_media_promotion` | story/media/public-key/checksum | `20260924103201` | **Final:** `20260927101500` |
| `newsroom_story_media_promotion_plan` | `p_story_id uuid` | `20260924103201` | **Final:** `20260927101500` |
| `newsroom_validate_inline_body_bindings` | `p_story_id uuid` | `20260927094500` | Same migration remains final |
| `newsroom_public_story_document` | `p_path text` | `20260924103201` | **Final:** `20260927101500` |
| `newsroom_public_context_document` | `p_path text` | `20260927093000` | Same migration remains final |
| `newsroom_current_context` | no args | `20260922020254` | Core AG-06 definition remains final |
| `newsroom_has_capability` | `p_capability text` | `20260922020254` | Core AG-06 definition remains final |
| COM-01 contact/consent/reply/inbound/social | Live signatures independently verified | `20260922094527_com01_communications_domain.sql` | Same source remains final |
| COM-01 attachment functions | Live prepare/finalize/access functions independently verified | `20260922095013_com01_private_attachments.sql` | Same source remains final |
| COM-01 campaign/escalation functions | Live create/approve/prepare/result functions independently verified | live `20260922100851` | Repository source is **effect reconstruction** `20260922100851_com01_campaign_and_escalation_authority.sql`; historical body unresolved |

Because the applied migration bodies above are Exact/Equivalent to the repository source for final AG-06 definitions, and no later migration redefines those functions after the listed final source, the deployed function authority is reproducible from the cumulative source lineage.

---

## 8. Resolution of the Seven NR-00A Unknown Domains

| Domain | NR-00B state | Evidence |
|---|---|---|
| Homepage / presentation | **PARTIAL** | Live `stories.distribution jsonb` is server-authoritative and `newsroom_save_story` gates distribution changes through `distribution.manage` / `story.edit_all`. The prototype uses `distribution.homepage`, but live schema has no dedicated front-page placement/ranking table or RPC. |
| Editorial editions | **MISSING** | Reader `/edition.tsx` is preference state only. Live table/function keyword inspection found no edition authority; Newsroom API has no edition action; prototype references newsletter “editions” but no server editorial-edition manager. |
| Public live-blog authority | **PARTIAL** | CA-01 live `newsroom_threads` supports `thread_type='breaking'` with Realtime authorization; no public live-blog table/RPC/public projection exists. Internal command collaboration exists; public live publishing authority does not. |
| Video/audio production | **MISSING** | `media_assets` is generic, but authoritative `newsroom_prepare_story_media` only permits JPEG/PNG/WebP, PDF, text and DOCX; video/audio MIME types are explicitly unsupported. Reader Watch/Listen does not establish Newsroom production authority. |
| WhatsApp Newsroom distribution | **PARTIAL** | Live `contact_consents` explicitly supports channel `whatsapp` and purpose `WHATSAPP`; however `communication_channels.channel_type` is limited to email/internal/social and there is no WhatsApp briefing/send RPC or first-class distribution object. |
| Push authoring / dispatch | **PARTIAL** | Live consent schema supports channel `push` / purpose `PUSH`, and Reader device registration exists on main; no server Newsroom push composer/campaign/dispatch authority was found. |
| Citations / impact | **PARTIAL** | Live `public.citation_references` exists from base migration `20260909000300_redirects_and_seo.sql` and RLS is enabled. No Newsroom citation service/UI, ingestion workflow or verified impact-provider automation exists. |

Result: the seven unknowns are now **0 UNKNOWN**: 5 `PARTIAL`, 2 `MISSING`.

---

## 9. Candidate Convergence Lineage for HT-NR-00C

### Deterministic source order

`AG-05 recovery@304d475…`
→ integrated CA-01/COM-01 code-bearing spine
→ `PR #33@11fe434…`
→ `PR #34@2849c18…`
→ `PR #40 runtime@ed5e38a…`
→ `PR #40 head@755b7ba…` (documentation-only tail)
+ preserve current-main `20261002060846` / `20261002061027` Premium authority.

### Operational interpretation

For NR-00C, **do not merge those historical branches sequentially**.

Use `755b7ba7…` as the cumulative server-source reference for the first 60 staging identities and authoritative Newsroom APIs, then selectively reconcile that server authority into the current-main architecture while preserving all later current-main Reader/UI/Premium work.

No separate CA-01/COM-01 cherry-pick is expected unless NR-00C discovers a file-level omission, because their runtime blobs are already present in the cumulative source.

---

## 10. Residual Conflict / Stop Assessment

There is **no source-selection blocker** preventing NR-00C.

One evidence caveat remains:

> `20260922100851_com01_campaign_and_escalation_authority` does not have the original applied SQL body in repository history. The repository file is explicitly reconstructed from live schema/function effects.

This is not permission to rewrite or repair staging history. NR-00C must preserve it as a reconciled migration effect and prove from-zero/current-schema compatibility before any eventual integration candidate can be accepted.

No live migration identity is currently unaccounted for.

---

## 11. Acceptance-Gate Evidence

1. Major branch ancestry documented — **PASS**.
2. All 56 live AG-05/AG-06/CA-01/COM-01 migrations mapped or explicitly classified — **PASS**.
3. Rename/duplicate/transient collisions explained — **PASS**.
4. Final privileged function definitions traced to source candidates — **PASS**, with COM-01 historical-body caveat recorded.
5. `api/newsroom.js`, `api/communications.js`, `api/public.js` lineage resolved — **PASS**.
6. Seven unknown domains investigated — **PASS**.
7. Historical migrations rewritten — **NO**.
8. Staging mutation — **NO**.
9. Product code changed — **NO**.
10. Deterministic source candidate identified for NR-00C — **PASS**.

**HT-NR-00B stops here. No convergence, merge, deployment or HT-NR-00C implementation was performed.**
