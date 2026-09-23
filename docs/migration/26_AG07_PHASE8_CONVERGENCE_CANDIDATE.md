# AG-07 — Phase 8 Convergence Candidate

## 1. Disposition

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `integration/ag07-phase8-convergence-candidate`  
**Starting accepted Phase 7 closure:** `3bdeea0d38d9aa62a469279673dde8756603d85d`  
**Accepted Phase 7 runtime:** `fb84b9e254af1f1fa84dab74c97b74ad2614a690`  
**Certified Phase 8 runtime:** `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`  
**Draft PR:** #26 — Draft / Open / Unmerged / Mergeable  
**Documentation closure:** this commit, exactly one documentation-only commit above the certified Phase 8 runtime.

Phase 8 assembled and certified one convergence candidate. It did not expand product scope, perform production cutover, retire the legacy frontend, claim CP7 acceptance, or release Phase 9.

## 2. Namespace and branch custody

Before continuing Phase 8, the remote namespace was inspected.

An existing branch already owned the requested work:

`integration/ag07-phase8-convergence-candidate`

It was therefore preserved rather than duplicated.

Git comparison proved:

- base: `3bdeea0d38d9aa62a469279673dde8756603d85d`;
- Phase 8 runtime: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`;
- status: ahead;
- ahead by: 1;
- behind by: 0;
- merge base: exactly `3bdeea0d38d9aa62a469279673dde8756603d85d`.

The single runtime commit is:

`8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b — ci(ag07): certify Phase 8 convergence exact head`

It changes certification workflow triggers only. No product/runtime subsystem implementation was rewritten in Phase 8.

## 3. Authority inventory

The first Phase 8 operation was read-only ancestry verification. Every required accepted authority is a Git ancestor of the Phase 7 closure. No separately accepted authority remained outside the convergence lineage.

| Authority | Accepted runtime SHA | Present in Phase 7 ancestry? | Content-equivalent proof | Missing delta? | Classification | Integration action | Conflict disposition | Final Phase 8 proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Phase 4 — AG-07 Unified Web/PWA | `a13fddf2cea04009701aa5d585b2259083da4474` | YES — merge base equals accepted runtime; Phase 7 closure 32 commits ahead / 0 behind | direct ancestry; exact-head Phase 4 contract rerun | NO | ALREADY_PRESENT | preserve; enable Phase 8 exact-head run | none | run `35855550782` SUCCESS |
| Phase 5 — AG-04 Migration Lineage | `cbc59463d7e7f2e1cbd72586daf8ac380025781b` | YES — 15 ahead / 0 behind | direct ancestry; 43-entry lineage tests rerun | NO | ALREADY_PRESENT | preserve frozen historical identities | none | Migration Tests `35855550773` SUCCESS |
| Phase 6 — NM-07 Migrated Corpus Reader | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | YES — 7 ahead / 0 behind | direct ancestry; migrated-corpus suite rerun | NO | ALREADY_PRESENT | preserve | none | run `35855550764` SUCCESS |
| Phase 7 — Premium/HOSPAZ | `fb84b9e254af1f1fa84dab74c97b74ad2614a690` | YES — closure exactly 1 docs commit above runtime | direct ancestry; Phase 7 suite rerun | NO | ALREADY_PRESENT | preserve | none | run `35855550835` SUCCESS |
| AG-06 Newsroom/auth/RBAC | `409230e23e2d35b139d33b254ff8ab2250599f78` | YES — 446 ahead / 0 behind | direct ancestry; AG-06 contract/live/disposable gates rerun | NO | ALREADY_PRESENT | preserve server authority | later accepted CA-01/COM-01/lineage changes remain owner-bounded | run `35855550706` SUCCESS |
| CA-01 server communications | `e8bbbc22661dbd5a755e63742fb53c805d96d5b9` | YES — 402 ahead / 0 behind | direct ancestry; CA-01 contract/live/disposable gates rerun | NO | ALREADY_PRESENT | preserve durable server communications | no Phase 8 conflict | run `35855550779` attempt 2 SUCCESS |
| CA-01 Native integration | `f1a9f5f985fcd399dcb6666002ce04d85fdd9ced` | YES — 245 ahead / 0 behind | direct ancestry; unified Native certification rerun | NO | ALREADY_PRESENT | preserve shared Reader integration | no Phase 8 conflict | run `35855550749` SUCCESS |
| COM-01 provider-independent runtime | `5b6fca0fe1dceed5e167b845e023dfc456c47040` | YES — 60 ahead / 0 behind | direct ancestry; COM-01 contract/live/disposable gates rerun | NO | ALREADY_PRESENT | preserve provider-independent domain; keep live providers parked | no Phase 8 conflict | run `35855550810` SUCCESS |

The previously certified cross-lane integration runtime `0112c8802d220d23e20288783536f22e85ea346d` is also an ancestor of the Phase 7 closure: 69 commits ahead / 0 behind.

No `MISSING_ACCEPTED_DELTA`, `CONFLICT_REQUIRES_RECONCILIATION`, or `UNKNOWN — REQUIRES PROOF` authority remained after inventory.

## 4. Conflict disposition

No substantive application conflict required a Phase 8 merge or cherry-pick.

The Phase 7 closure already contains every accepted authority by ancestry. Blind historical cherry-picks would therefore duplicate accepted work and were not performed.

The only Phase 8 runtime changes add `integration/ag07-phase8-convergence-candidate` to the accepted certification lanes so all required authorities can be re-proved on one exact SHA.

Ownership remains:

- Reader presentation: NM-07 / `apps/mobile`;
- public routing/SEO: CP5 + AG-07 serving architecture;
- Newsroom security: AG-06;
- internal newsroom communications: CA-01;
- communications domain: COM-01;
- Premium/HOSPAZ: accepted Phase 7;
- migration history: accepted Phase 5.

No responsibility was flattened into a new subsystem.

## 5. Exact runtime files changed

From Phase 7 closure `3bdeea0d38d9aa62a469279673dde8756603d85d` to Phase 8 runtime `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`:

- `.github/workflows/ag05-nm07-phase7-premium-hospaz.yml`
- `.github/workflows/ag06-security.yml`
- `.github/workflows/ag07-phase4-web-pwa.yml`
- `.github/workflows/ca01-communications.yml`
- `.github/workflows/com01-communications.yml`
- `.github/workflows/migration-tests.yml`
- `.github/workflows/native-certification.yml`
- `.github/workflows/native-mobile.yml`
- `.github/workflows/nm07-phase6-migrated-corpus.yml`
- `.github/workflows/uat.yml`
- `.github/workflows/validate.yml`

No Reader implementation, CP5 implementation, AG-06 runtime, CA-01 runtime, COM-01 runtime, migration SQL, Vercel routing configuration, production configuration, payment/store configuration, or provider configuration changed.

## 6. Staging custody — read-only Phase 8 recheck

A direct read-only HealthTimes Staging query against project `gcdohgbmqhqwydgaxrcr` after exact-head certification reconfirmed:

| Invariant | Phase 8 observation |
| --- | ---: |
| migration ledger rows | 43 |
| posts | 5,737 |
| pages | 49 |
| public migrated objects | 5,786 |
| URL mappings | 5,786 |
| media records | 3,277 |
| canonical media records | 3,275 |
| source media exceptions | 2 |
| migrated-media storage objects | 5,705 |
| preserved stale `wordpress/uploads/...` objects | 2,430 |
| required CP5 functions | 6 / 6 |
| categories | 83 |
| tags | 10,283 |
| authors | 3 |

Snapshot remains:

- key: `cp3-2026-09-21`;
- status: `AUTHORITATIVE_REHEARSAL`.

The two non-canonical media records remain `missing_from_uploads_archive`; 3,275 records remain the canonical migrated-media set.

No re-import, restore, migration replay, staging reset, ledger edit, storage cleanup, or data rewrite was performed.

## 7. Migration-lineage proof

Exact-head Migration Tests:

- workflow: Migration Tests;
- run: `35855550773`;
- job: `107163045136`;
- result: SUCCESS;
- discovered: 54;
- passed: 52;
- skipped: 2 dedicated Phase 4 browser tests outside their serving harness.

Phase 5 lineage assertions passed:

1. migration directory exactly matches adopted live ledger identities;
2. no unexplained duplicate logical migrations;
3. explicit CP5 and COM-01 adoption identities remain preserved.

The 43-entry historical lineage remains frozen. No historical migration was renamed, replayed, repaired, pushed, or applied to staging.

## 8. Public Reader / Web-PWA proof

Exact-head AG-07 Phase 4 workflow:

- run: `35855550782`;
- job `107163066626` — Universal Reader build + contract + browser smoke — SUCCESS;
- job `107163066294` — CP5 read-only staging invariants — SUCCESS.

The same candidate proved:

- CP5 capability contract: 10/10;
- AG-06 contract: 6/6;
- CA-01 contract: 7/7;
- COM-01 contract: 4/4;
- Phase 4 serving contract: 7/7;
- mobile/desktop browser smoke: 2/2.

Representative raw HTTP proof at the exact Phase 8 SHA:

- source: `30154`;
- path: `/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/`;
- HTTP: 200;
- presentation: `apps/mobile`;
- canonical URL: `https://healthtimes.co.zw/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/`;
- title: `Who Should Not Take Lenacapavir? Key Health Conditions to Consider Before the Rollout`;
- robots: `index,follow,max-image-preview:large`;
- Open Graph title: server-visible;
- structured data: server-visible;
- universal Reader bundle: present;
- legacy presentation canonical: false.

Routing remains:

- accepted alias: HTTP 301, one hop;
- explicit accepted exception: HTTP 404;
- unknown route: HTTP 404;
- category: HTTP 200 / `PRESERVE_CONTEXT_NOINDEX`;
- tag: HTTP 200 / `LEGACY_CONTEXT_NOINDEX`;
- author: HTTP 200 / `PRESERVE_CONTEXT_NOINDEX`;
- sitemap: 5,786;
- feed: 50.

Home, Explore, Search, article Reader, category/author/context flows, real migrated content, canonical migrated media, redirect/404 behavior and server-visible SEO are therefore preserved on the one candidate.

## 9. Migrated-corpus Reader proof

Exact-head NM-07 Phase 6 workflow:

- run: `35855550764`;
- job `107163128440` — Migrated corpus Reader convergence — SUCCESS;
- job `107163128819` — Read-only staging corpus and CP5 invariants — SUCCESS.

The exact candidate passed all 14 migrated-corpus assertions, including:

- staging Reader resolves to the accepted migrated corpus;
- Reader screens contain no direct Supabase/database shortcut;
- recent and historical migrated articles map into the Reader domain model;
- Premium source `33190` remains publicly body-protected;
- long-form body is not truncated;
- migrated WordPress pages use the same ArticleDetail contract;
- hero and inline media retain canonical migrated-media authority;
- Search/Explore/category/author paths use migrated authoritative records;
- Premium bodies remain unavailable to offline persistence;
- CP5 canonical/301/404 semantics survive;
- Web/PWA/iOS/Android share the same migrated-corpus Reader contract.

Staging editorial mode was not returned to fixtures or source-parity article authority.

## 10. Premium invariant

Read-only Phase 8 staging evidence for source `33190`:

- source body preserved: **10,701 characters**;
- access policy: `premium_marker_review`;
- public CP5 `body_html`: null;
- raw/public body protected: true;
- raw/public body exposed: false.

Exact-head Phase 7 tests additionally prove:

- protected content is requested only after authoritative entitlement;
- offline persistence rejects Premium bodies independently of screen behavior;
- storefront remains `configuration-required`;
- offers remain `[]`;
- no invented price or product identity is introduced;
- Premium discovery remains access-policy driven.

Read-only database recheck observed:

- `premium_entitlements`: 0 rows;
- `subscribers`: 0 rows.

No subscriber, entitlement, price, product ID, payment, renewal or purchase state was fabricated.

## 11. HOSPAZ invariant

Exact-head read-only Phase 7 evidence proves:

- advertiser: `HOSPAZ`;
- placement: `hospaz-header-direct`;
- current source attachment: `33005`;
- accepted migrated-media creative: present;
- destination state: `UNKNOWN`;
- destination URL: null;
- schedule state: `UNKNOWN`;
- schedule value: null;
- placement conditions state: `UNKNOWN`;
- placement conditions value: null.

A separate direct read-only staging query at `2026-09-23T12:15:15.637393+00:00` reconfirmed the same source attachment and UNKNOWN/null commercial fields.

Exact-head Phase 7 tests prove:

- the portable Reader projection matches accepted CP5 HOSPAZ semantics;
- staging advertising consumes the CP5 HOSPAZ RPC rather than a Reader fixture;
- shared `AdSlot` renders the accepted creative;
- click emission remains behind verified-destination validation;
- Home uses only the accepted fixed HOSPAZ placement identity;
- sensitive-health advertising/analytics remain non-personalized and non-sensitive.

The current creative therefore remains non-clickable. No schedule, destination, targeting rule, campaign date, or production-active claim was inferred.

## 12. Newsroom / internal communications / COM-01 preservation

### AG-06

Workflow: AG-06 Newsroom Security  
Run: `35855550706`

Jobs:

- `107163044226` contract — SUCCESS — 6/6;
- `107163044435` local-newsroom-gateway — SUCCESS — 1 pass / 5 environment skips;
- `107163044561` live-staging-security — SUCCESS — 7/7;
- `107163044565` disposable-supabase-schema — SUCCESS.

AG-06 remains server-authoritative. Reader changes do not recreate Newsroom authorization.

### CA-01

Workflow: CA-01 Communications Security  
Run: `35855550779`  
Final successful attempt: 2.

Jobs:

- `107164699151` contract — SUCCESS — 7/7;
- `107164697498` live-staging-security — SUCCESS;
- `107164699018` disposable-supabase-schema — SUCCESS.

Attempt 1 failed only on a Realtime broadcast timeout for `newsroom_message.created`; cleanup completed and no runtime change was made. The same exact candidate SHA was rerun and passed. This is recorded as transient staging transport evidence, not hidden as a product fix.

CA-01 durable server communications remain authoritative.

### COM-01

Workflow: COM-01 Communications  
Run: `35855550810`

Jobs:

- `107163044935` contract — SUCCESS — 4/4;
- `107163267323` live-staging-contract — SUCCESS;
- `107163044689` disposable-supabase-schema — SUCCESS.

Provider-independent behavior remains intact:

- synthetic provider event normalization count: 1;
- replay duplicate: true;
- consent/suppression boundaries: PASS;
- anonymous private access denied: true;
- dangerous attachment quarantined;
- unapproved social publish denied;
- approved provider attempt remains `unconfigured`;
- provider ready: false.

External provider proof remains deliberately false:

- Resend send: false;
- Resend signed webhook: false;
- Brevo sync: false;
- Cloudflare edge route: false.

No live provider was activated or fabricated.

## 13. Universal Reader / native proof

### Unified Native Mobile

Workflow:

`Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification`

Run: `35855550749`  
Job: `107163046055` — `universal-build` — SUCCESS.

The exact candidate proves:

- required Reader and Studio routes exist;
- Reader repository and persistent Reader capabilities remain intact;
- unauthorized Premium offline body is blocked;
- Phase 6 staging Reader uses the accepted migrated corpus;
- approved unified Reader/PWA design authority remains in use;
- responsive mobile/native/desktop Reader shell remains aligned;
- Search and taxonomy services remain contract-based;
- NM-07 compiles Android and iOS from the same branch;
- source-parity remains a controlled development/preview bridge, not canonical staging article authority.

### Native Binary Certification

Workflow: Native Binary Certification  
Run: `35855550864`

Jobs:

- `107163045655` readiness — SUCCESS;
- `107163045244` Android debug binary — SUCCESS;
- `107163045581` iOS Simulator binary — SUCCESS.

These remain development/certification binaries only. No App Store or Play Store submission occurred.

## 14. Chromium integrated product UAT

Workflow: Chromium UAT  
Run: `35855550807`  
Job: `107163145072` — SUCCESS.

Result:

- 90 passed;
- 9 expected skips.

This is the integrated browser regression on the same exact Phase 8 candidate.

## 15. Exact-head checkout proof

Every workflow counted for Phase 8 acceptance checked out:

`8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

and every relevant job logged equality:

`EXPECTED_SHA=8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

`CHECKED_OUT_SHA=8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

No counted workflow certified a synthetic PR merge SHA.

| Workflow | Run | Jobs | Result |
| --- | ---: | --- | --- |
| Validate HealthTimes 2.0 | `35855550711` | `107163044766` | SUCCESS |
| Chromium UAT | `35855550807` | `107163145072` | SUCCESS |
| AG-07 Phase 4 Unified Web/PWA | `35855550782` | `107163066626`, `107163066294` | SUCCESS |
| NM-07 Phase 6 Migrated Corpus Reader | `35855550764` | `107163128440`, `107163128819` | SUCCESS |
| AG-05 + NM-07 Phase 7 Premium + HOSPAZ | `35855550835` | `107164277047`, `107164275807` | SUCCESS |
| Unified Native Mobile | `35855550749` | `107163046055` | SUCCESS |
| Native Binary Certification | `35855550864` | `107163045655`, `107163045244`, `107163045581` | SUCCESS |
| AG-06 Newsroom Security | `35855550706` | `107163044226`, `107163044435`, `107163044561`, `107163044565` | SUCCESS |
| CA-01 Communications Security | `35855550779` attempt 2 | `107164699151`, `107164697498`, `107164699018` | SUCCESS |
| COM-01 Communications | `35855550810` | `107163044935`, `107163267323`, `107163044689` | SUCCESS |
| Migration Tests | `35855550773` | `107163045136` | SUCCESS |

## 16. Exact-head artifacts

| Workflow | Artifact | ID | SHA-256 |
| --- | --- | ---: | --- |
| Chromium UAT | `healthtimes-playwright-report` | `10746689272` | `03f255f548c1160f2fedc04f49e3b9bbe79970648219b612559bdc2c885c7d7f` |
| Phase 4 | `ag07-phase4-readonly-staging-evidence` | `10747596269` | `27a05db32d40372a6cf2d9371c9903418eceef3d8c8d90c701f066f17eeb1322` |
| Phase 4 | `ag07-phase4-browser-http-evidence` | `10747072355` | `da913b363fffe61791f841ffa6d9326f3d9c67b88c5c18659b831c883e7d2a29` |
| Phase 6 | `nm07-phase6-readonly-staging-evidence` | `10747915277` | `c151c7db135270e0145fdecb453b19f54edc29f541d8ac7574127b6f747289c3` |
| Phase 6 | `nm07-phase6-reader-evidence` | `10746534581` | `61b0e0df1befa3e9a420face583dcedbe0a2528f344f9149275634ec9ab3cb2d` |
| Phase 7 | `phase7-premium-hospaz-readonly-evidence` | `10747830668` | `e5268a4328cb083b4ed5dc8a85243c85dac7e2190215ed17142bf1c2ad074349` |
| Phase 7 | `phase7-premium-hospaz-reader-evidence` | `10747072455` | `e2b64217df8b93ffec4bb0496267005989dc0a8b46f814fbae07dcc78b38f524` |
| Unified Native | `healthtimes-native-web-dist` | `10746944534` | `80289757f2876f974166e9d931e6c2f769277bbd3bd6efa1ae92775d67b70023` |
| Native Binary | `healthtimes-android-debug-apk` | `10748013372` | `9bf66538fc51fe5666fe8bd7b19659b57a1cfa8f28c2911d5751de12e7a9a199` |
| Native Binary | `healthtimes-ios-simulator-app` | `10747283639` | `87676425b0f5503b85b49d8affafe2ee9616a09866770c7c9fc23d98f5dea4e8` |
| Native Binary | `healthtimes-native-config-matrix` | `10746769037` | `d894fb86f24a085a9d4216689e99d7c7c78876b3736d613a33659b8803f2f51b` |
| CA-01 | `ca01-live-evidence` | `10747951312` | `42d14cacb6d3b92038b8546ca0ecccc7f90b4663167797bb5f89a7113c9cea12` |
| COM-01 | `com01-staging-evidence` | `10746449891` | `3fa87aafdeade1ee55ab34073f6b8a9ce34e03c88ef4af199a66e6af99087cd4` |

## 17. Vercel exact-head preview

Automatic Git-integration preview for the certified runtime:

- deployment ID: `dpl_D2nLbrVsn3NoMbq1nTzvW1EGBoBH`;
- URL: `https://healthtimes-staging-mbs2621sm-11-11.vercel.app`;
- state: READY;
- ready state: READY;
- source: git;
- target: null;
- branch: `integration/ag07-phase8-convergence-candidate`;
- exact deployment SHA: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`;
- framework: null.

The preview remains protected by Vercel Authentication. Phase 8 did not weaken deployment protection.

The primary staging alias was independently rechecked and remains unchanged:

- alias: `healthtimes-staging.vercel.app`;
- deployment: `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`;
- SHA: `4512b7d647eda850ec1e70ad440d459fbd1d82d0`;
- branch: `migration/ag-02-staging-platform`.

No primary staging alias movement occurred.

## 18. Mutation receipt

Phase 8 performed no:

- production deployment;
- primary staging alias movement;
- production database mutation;
- staging `db reset`;
- staging restore;
- migration replay/import/repair/push;
- migration-ledger edit;
- destructive schema change;
- staging data rewrite;
- storage mutation;
- deletion of the 2,430 stale `wordpress/uploads/...` objects;
- production DNS/MX change;
- production communication-provider activation;
- production sender activation;
- production broadcast;
- invented payment/store product configuration;
- App Store submission;
- Play Store submission;
- legacy root frontend retirement;
- Phase 5/6/7/8 PR merge;
- AG-08 invocation;
- CP7 acceptance claim.

The AG-06, CA-01 and COM-01 exact-head live certification workflows created only bounded staging certification fixtures and executed their accepted cleanup paths. They did not change the accepted migrated corpus or migration ledger.

Automatic Git-integration Vercel previews with `target:null` are the only deployment activity counted in Phase 8.

## 19. Residual and deferred issues

The following remain deliberately outside Phase 8:

1. COM-01 real external provider evidence remains parked:
   - Resend real send;
   - signed Resend webhook;
   - Brevo live sync/provider events;
   - Cloudflare real inbound edge routing.
2. Production payment/store product IDs, prices and purchase validation remain unconfigured.
3. Premium offline-entitlement policy remains deferred; Premium body persistence therefore stays fail-closed.
4. HOSPAZ destination, schedule and placement conditions remain UNKNOWN/null.
5. Primary staging alias movement remains moderator-controlled and was not performed.
6. Production cutover remains unauthorized.
7. Legacy root frontend retirement remains deferred.
8. Phase 9 is not released by this report.
9. CP7 is not accepted by this report.

## 20. Phase 8 conclusion

The Phase 8 candidate is one coherent lineage carrying the accepted Web/PWA, migration, migrated-corpus Reader, Premium/HOSPAZ, AG-06, CA-01, COM-01 and native authorities.

All required acceptance lanes converged on exact runtime:

`8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

with explicit `EXPECTED_SHA == CHECKED_OUT_SHA` proof.

This report is the documentation-only closure immediately above that certified runtime.

**PHASE 8 CERTIFIED — CONVERGENCE CANDIDATE ASSEMBLED / READY FOR MODERATOR AUDIT**
