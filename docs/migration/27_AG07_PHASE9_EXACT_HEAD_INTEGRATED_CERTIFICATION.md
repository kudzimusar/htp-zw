# AG-07 — Phase 9 Exact-Head Integrated Certification

## 1. Disposition

**Repository:** `kudzimusar/htp-zw`  
**Phase 9 branch:** `certification/ag07-phase9-integrated-exact-head`  
**Accepted Phase 8 runtime:** `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`  
**Accepted Phase 8 documentation closure:** `774107b049e69140a9adf4c9bcc6e480a096ee22`  
**Phase 8 branch:** `integration/ag07-phase8-convergence-candidate`  
**Phase 8 PR:** #26 — Draft / Open / Unmerged / Mergeable  
**Final Phase 9 certified runtime:** `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

Phase 9 reused the accepted Phase 8 runtime unchanged.

No executable repository change was required. No historical branch was merged or cherry-picked. No application code, migration SQL, staging data, storage, deployment routing, provider configuration, payment/store configuration, or native release configuration was changed.

This document is the Phase 9 documentation-only closure on a certification branch created from the accepted Phase 8 documentation closure.

## 2. Phase 9 purpose and scope

Phase 9 is the final exact-head integrated certification gate for the assembled convergence candidate.

It is not:

- another integration implementation phase;
- feature development;
- visual redesign;
- primary staging alias movement;
- production cutover;
- CP7 acceptance;
- Phase 10 release.

The one runtime under certification remains:

`8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

## 3. Namespace and runtime preservation

Before Phase 9 work:

- no existing Phase 9 branch was present;
- no existing Phase 9 PR was present;
- Phase 8 runtime `8fef4c2e...` to Phase 8 closure `774107b...` was exactly one documentation-only commit;
- the only file in that closure delta was `docs/migration/26_AG07_PHASE8_CONVERGENCE_CANDIDATE.md`.

Because the accepted runtime already carried all required authorities and all eleven accepted Phase 8 certification lanes could be independently revalidated at the same SHA, no new runtime candidate was created.

The Phase 9 branch was created from:

`774107b049e69140a9adf4c9bcc6e480a096ee22`

This preserves Phase 8 documentation custody while keeping `8fef4c2e...` explicitly identified as the certified executable runtime.

## 4. Required authority set

The exact Phase 9 runtime simultaneously preserves:

- canonical `apps/mobile` Reader;
- unified Web/PWA serving;
- CP5 route/SEO/canonical capability;
- accepted 43-migration lineage;
- migrated staging corpus;
- AG-06 Newsroom/auth/RBAC;
- CA-01 internal newsroom communications;
- COM-01 communications domain;
- Phase 7 Premium;
- Phase 7 HOSPAZ direct-ad semantics;
- Reader offline/persistence protections;
- universal iOS/Android shared source.

No subsystem substitutes for another authority.

## 5. Revalidation of the eleven accepted exact-head gates

Every counted workflow is a completed success whose GitHub run head is exactly:

`8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

Every counted job was independently reopened and its log revalidated during Phase 9.

Every counted job logs:

`EXPECTED_SHA=8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

and:

`CHECKED_OUT_SHA=8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

No synthetic merge SHA and no later branch head is used as Phase 9 runtime evidence.

| Gate | Workflow | Run | Counted jobs | Final result |
| --- | --- | ---: | --- | --- |
| 1 | Validate HealthTimes 2.0 | `35855550711` | `107163044766` | SUCCESS |
| 2 | Chromium UAT | `35855550807` | `107163145072` | SUCCESS — 90 passed / 9 expected skips |
| 3 | AG-07 Phase 4 Unified Web/PWA | `35855550782` | `107163066626`, `107163066294` | SUCCESS |
| 4 | NM-07 Phase 6 Migrated Corpus Reader | `35855550764` | `107163128440`, `107163128819` | SUCCESS |
| 5 | AG-05 + NM-07 Phase 7 Premium + HOSPAZ | `35855550835` attempt 2 | `107164277047`, `107164275807` | SUCCESS |
| 6 | Native Mobile unified certification | `35855550749` | `107163046055` | SUCCESS |
| 7 | Native Binary Certification | `35855550864` | `107163045655`, `107163045244`, `107163045581` | SUCCESS |
| 8 | AG-06 Newsroom Security | `35855550706` | `107163044226`, `107163044435`, `107163044561`, `107163044565` | SUCCESS |
| 9 | CA-01 Communications Security | `35855550779` attempt 2 | `107164699151`, `107164697498`, `107164699018` | SUCCESS |
| 10 | COM-01 Communications | `35855550810` | `107163044935`, `107163267323`, `107163044689` | SUCCESS |
| 11 | Migration Tests | `35855550773` | `107163045136` | SUCCESS — 52 passed / 2 dedicated-harness skips |

### Transient provenance retained

Two historical first-attempt staging transients are retained rather than hidden.

**Phase 7 attempt 1:** read-only Premium/HOSPAZ staging authority encountered HTTP 500 from `ag05_public_sitemap_xml`. The convergence job itself succeeded. The same exact runtime was rerun without code change and the full workflow passed on attempt 2.

**CA-01 attempt 1:** the live staging security job timed out waiting for Realtime broadcast `newsroom_message.created`. Cleanup completed, including zero live certification sessions remaining. The same exact runtime was rerun without code change and passed on attempt 2.

Neither transient is classified as a product fix.

## 6. Gate 12 — PWA and offline integrity

Phase 9 determines that this gate is adequately covered by accepted exact-head tests and requires no new runtime or test commit.

Evidence at `8fef4c2e...`:

### PWA contract

Unified Native job `107163046055`:

- `apps/mobile/tests/foundation.test.mjs`;
- subtest `PWA contract is installable, subpath-safe and static-export ready`;
- PASS;
- foundation suite: 6/6.

Phase 4 serving contract:

- run `35855550782`;
- `tests/migration/ag07-phase4-unified-web.spec.js`;
- root-origin PWA source configuration remains base-path neutral;
- PASS;
- serving contract: 7/7.

Phase 4 build also emitted the installable root-origin Reader with `manifest.json`, `sw.js`, static assets and 81 static routes.

### Offline public Reader behavior

Unified Native Reader-product suite:

- `ReaderRepository exposes deterministic persistent Reader capabilities` — PASS;
- device persistence separates saved, downloads, progress, history and appearance — PASS;
- Article Reader restores progress and blocks unauthorized Premium offline body — PASS;
- Saved and Offline library keeps bookmarks, downloads and history distinct — PASS.

Phase 6 migrated-corpus suite:

- offline persistence accepts migrated records while Premium bodies remain unavailable — PASS;
- Web/PWA/iOS/Android share one migrated-corpus Reader contract — PASS.

Phase 7:

- offline persistence rejects Premium articles independently of screen behavior — PASS;
- protected Premium content remains entitlement-gated.

**Gate 12 disposition: PASS — adequately covered by accepted exact-head tests.**

## 7. Gate 13 — route / redirect / explicit-404 integrity

Phase 9 determines that this gate is adequately covered.

At the exact runtime, Phase 4 raw HTTP verification proved:

- representative migrated article: HTTP 200;
- canonical URL: correct;
- title/description/robots/Open Graph: server-visible;
- structured data: server-visible;
- universal Reader bundle: present;
- legacy presentation canonical: false;
- accepted alias: HTTP 301, one hop;
- explicit accepted exception: HTTP 404;
- unknown route: HTTP 404;
- category context: HTTP 200 / `PRESERVE_CONTEXT_NOINDEX`;
- tag context: HTTP 200 / `LEGACY_CONTEXT_NOINDEX`;
- author context: HTTP 200 / `PRESERVE_CONTEXT_NOINDEX`.

The Phase 6 migrated-corpus suite independently passed:

`CP5 path resolution preserves canonical direct 301 alias and explicit 404 semantics`.

Sitemap and feed authority remain preserved.

**Gate 13 disposition: PASS — adequately covered by accepted exact-head tests.**

## 8. Gate 14 — accessibility baseline

No programme-approved WCAG conformance level or separate formal accessibility audit target exists for this phase. Phase 9 therefore certifies the bounded accessibility guarantees already present in the accepted Reader; it does not claim WCAG conformance.

### Exact-head automated assertions

Unified Native job `107163046055` reran `apps/mobile/tests/reader-product.test.mjs`.

The 10/10 Reader-product suite includes:

- `appearance, accessibility and tablet density are wired into Reader UI` — PASS;
- `responsive Reader shell keeps mobile native and desktop editorial navigation aligned` — PASS.

The accessibility subtest verifies:

- selected-state accessibility semantics on Reader navigation;
- minimum interaction target token `touchMin: 44`;
- appearance/system/light/dark wiring;
- tablet/desktop density breakpoints.

The responsive subtest verifies the shared Reader shell retains:

- Home;
- Explore;
- Live;
- Watch;
- My HT;
- mobile native navigation;
- desktop editorial navigation;
- mobile utility controls;
- responsive breakpoint behavior.

### Exact runtime semantic inventory

Phase 9 independently inspected the canonical Reader source at `8fef4c2e...`.

`apps/mobile/src/ui/Layout.tsx` provides:

- Search: `accessibilityRole="button"` + `accessibilityLabel="Search HealthTimes"`;
- Notifications: button role + label;
- HealthTimes Home: button role + label;
- Edition control: button role + descriptive edition/change label;
- desktop navigation: link role + visible label + selected-state semantics;
- section actions: button role;
- loading state: polite accessibility live region.

`apps/mobile/src/ui/Cards.tsx` provides:

- article hero/story cards: link role + article-title label + article-opening hint;
- article/media images: accessible alt/title labels;
- video cards: explicit disabled property plus `accessibilityState={{disabled:!destination}}`;
- unavailable video: explicit unavailable label;
- direct-ad disclosure/placement labels;
- verified-destination ad link role only when a destination is available.

`apps/mobile/app/article/[id].tsx` provides:

- article action buttons with button role and explicit labels;
- Offline action label: `Download article for offline reading`;
- action status as a polite live region;
- author/source links with link roles;
- hero and inline article images with accessibility labels.

### Browser and responsive operation

Canonical Phase 4 browser smoke passed on:

- 390×844 mobile;
- 1440×1000 desktop.

Each run exercised direct route loading and reloads through the canonical Web/PWA serving path.

The wider Chromium UAT passed 90 tests with 9 expected skips across its accepted browser regression matrix.

### Keyboard scope

There is no separate approved keyboard focus-order or full tab-traversal contract in the accepted programme baseline. The canonical Web Reader uses semantic React Native `Pressable` controls with explicit button/link roles and labels, and browser operation is covered by exact-head Chromium smoke. Phase 9 does **not** elevate this evidence into a claim of formal keyboard-accessibility or WCAG conformance.

No accepted accessibility contract regressed, and no UI redesign is required for this bounded certification gate.

**Gate 14 disposition: PASS — bounded accepted Reader accessibility baseline preserved; formal WCAG/focus-order audit not claimed.**

## 9. Gate 15 — performance baseline

No approved numeric production performance budget, Core Web Vitals target, bundle-size ceiling, or response-time SLA exists in the programme baseline.

Phase 9 therefore records reproducible exact-head observations and does not invent retrospective thresholds.

### Web build observations

Phase 4 exact-head build:

- Metro server render bundle: **30,448 ms**, 998 modules;
- Web bundle: **31,075 ms**, 950 modules;
- emitted Web JS entry: **1.8 MB**;
- static routes emitted: **81**;
- Home static route: **42 KB**;
- Explore: **54 KB**;
- Search: **35 KB**;
- Premium: **37 KB**;
- Article route: **31 KB**;
- export completed successfully to `dist`.

### Representative HTTP and browser observations

The live read-only raw HTTP verifier began at approximately `11:38:34.599Z` and emitted its completed evidence at approximately `11:38:38.650Z`, about **4.05 seconds** for the verifier's live staging CP5 evidence sequence. This is a CI observation, not an end-user SLA.

Canonical browser smoke:

- mobile scenario: **3.3 s**;
- desktop scenario: **3.6 s**;
- complete two-scenario Playwright run: **8.9 s**.

These scenarios include multiple route loads/reloads and therefore are not claimed as single-page load metrics.

### Staging connectivity observations

Unified Native exact-head staging connectivity recorded:

- Auth endpoint reachability: about **371 ms**;
- minimized public story projection/security check: about **2.67 s**;
- public migrated-media reachability: about **393 ms**;
- complete three-test staging connectivity suite: about **3.48 s**.

These are CI observations against staging and not production SLAs.

### Vercel preview build observation

The accepted exact-head Vercel deployment:

`dpl_D2nLbrVsn3NoMbq1nTzvW1EGBoBH`

was created at Vercel timestamp `1790163402888` and became ready at `1790163475325`, an observed deployment-ready interval of approximately **72.437 seconds**.

This is deployment pipeline timing, not Reader request latency.

### Regression disposition

Phase 9 introduces **zero executable changes** relative to the accepted Phase 8 runtime. Therefore Phase 9 itself cannot introduce a bundle, build, route or runtime performance regression after Phase 8.

The exact runtime continues to:

- build successfully;
- emit all 81 routes;
- load representative Reader routes in Chromium;
- resolve representative migrated story HTTP/SEO evidence;
- generate accepted sitemap/feed evidence;
- complete native and Web certification.

**Gate 15 disposition: PASS — observable exact-head baseline recorded; no invented production SLA or retrospective threshold.**

## 10. Integrated Reader proof

On `8fef4c2e...`, accepted exact-head evidence proves:

- Home;
- Explore;
- Search;
- Article Reader;
- category/author/context paths;
- real migrated content;
- canonical migrated media;
- long-form content;
- WordPress pages;
- canonical redirects;
- explicit 404;
- server-visible SEO;
- PWA build;
- offline public article behavior;
- Premium offline denial;
- shared Web/mobile/desktop Reader contract.

Representative raw HTTP article proof:

- source ID: `30154`;
- path: `/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/`;
- HTTP: 200;
- presentation: `apps/mobile`;
- canonical URL preserved;
- robots: `index,follow,max-image-preview:large`;
- Open Graph title: server-visible;
- structured data: server-visible;
- universal Reader bundle: true;
- legacy presentation canonical: false.

## 11. Fresh Phase 9 staging custody verification

A fresh direct **read-only** query against HealthTimes Staging project `gcdohgbmqhqwydgaxrcr` was performed at:

`2026-09-23T12:29:58.664944+00:00`

It reconfirmed:

| Invariant | Phase 9 observation |
| --- | ---: |
| migration ledger | 43 |
| posts | 5,737 |
| pages | 49 |
| public migrated objects | 5,786 |
| URL mappings | 5,786 |
| media records | 3,277 |
| canonical media | 3,275 |
| source media exceptions | 2 |
| migrated-media storage objects | 5,705 |
| preserved stale objects | 2,430 |
| categories | 83 |
| tags | 10,283 |
| authors | 3 |
| CP5 functions | 6 / 6 |

Snapshot remains:

- `cp3-2026-09-21`;
- `AUTHORITATIVE_REHEARSAL`.

No staging database or storage mutation was performed.

## 12. Migration-lineage proof

Migration Tests run `35855550773`, job `107163045136`:

- exact SHA equality: PASS;
- 52 passed;
- 2 dedicated Phase 4 browser tests skipped outside their serving harness.

Accepted Phase 5 lineage assertions remain green:

- repository migration directory matches adopted live ledger identities;
- no unexplained duplicate logical migrations;
- CP5 and COM-01 adoption identities remain preserved.

The 43-entry historical migration lineage remains frozen.

No migration replay, reset, repair, rename, ledger edit or staging push occurred.

## 13. Premium invariant

Fresh Phase 9 read-only database evidence reconfirmed source `33190`:

- source body: **10,701 characters**;
- access policy: `premium_marker_review`;
- current staging subscribers: **0**;
- current staging Premium entitlements: **0**.

A fresh direct call to the public CP5 story boundary reconfirmed:

- source ID: `33190`;
- HTTP status: 200;
- access policy: `premium_marker_review`;
- public `body_html`: **null**.

Exact-head Phase 7 tests additionally prove:

- public body exposed: false;
- protected content is requested only after authoritative entitlement;
- Premium offline persistence remains blocked;
- storefront remains `configuration-required`;
- offers remain `[]`;
- no price or product identity is invented;
- subscription success is not fabricated.

No price, product, subscriber, entitlement, payment, renewal or purchase state was fabricated.

## 14. HOSPAZ invariant

A fresh direct read-only call to `ag05_hospaz_direct_ad_preview` reconfirmed:

- advertiser: `HOSPAZ`;
- campaign label: `HOSPAZ source continuity`;
- placement: `hospaz-header-direct`;
- current source attachment: `33005`;
- placement status: `bound_rehearsal`;
- destination URL: null;
- destination state: `UNKNOWN`;
- schedule state: `UNKNOWN`;
- placement conditions state: `UNKNOWN`;
- standalone campaign register found: false.

The underlying placement provenance independently remains:

- schedule: null;
- destination URL: null;
- placement conditions: null.

Exact-head Phase 7 tests prove:

- accepted creative may render;
- click emission remains behind verified-destination validation;
- the current UNKNOWN/null destination therefore remains non-clickable;
- advertising remains non-personalized in sensitive-health context;
- sensitive advertising analytics are not introduced.

`bound_rehearsal` is not a production-active campaign claim.

## 15. AG-06 Newsroom security

Workflow:

`AG-06 Newsroom Security`

Run:

`35855550706`

Exact-head jobs:

- `107163044226` contract — SUCCESS — 6/6;
- `107163044435` local newsroom gateway — SUCCESS — 1 passed / 5 environment skips;
- `107163044561` live staging security — SUCCESS — 7/7;
- `107163044565` disposable Supabase schema — SUCCESS.

Server-authoritative Newsroom security remains intact. Reader code does not substitute for AG-06 authority.

## 16. CA-01 internal communications

Workflow:

`CA-01 Communications Security`

Run:

`35855550779`

Final successful attempt:

2.

Exact-head jobs:

- `107164699151` contract — SUCCESS — 7/7;
- `107164697498` live staging security — SUCCESS;
- `107164699018` disposable Supabase schema — SUCCESS.

The historical attempt-1 Realtime timeout remains recorded as transport instability, not a product correction.

Durable internal newsroom communications and private Realtime authorization remain CA-01 authority.

## 17. COM-01 communications boundary

Workflow:

`COM-01 Communications`

Run:

`35855550810`

Exact-head jobs:

- `107163044935` contract — SUCCESS — 4/4;
- `107163267323` live staging contract — SUCCESS;
- `107163044689` disposable Supabase schema — SUCCESS.

Provider-independent behavior remains intact:

- synthetic provider-event normalization remains idempotent;
- consent/suppression boundaries pass;
- anonymous private access remains denied;
- dangerous attachment handling remains quarantined;
- unapproved social publish remains denied;
- provider attempt remains unconfigured;
- provider ready remains false.

External provider proof deliberately remains unresolved:

- real Resend transactional send: false;
- real signed Resend webhook: false;
- live Brevo sync: false;
- real Cloudflare inbound routing: false.

Phase 9 does not activate external communications providers.

## 18. Native evidence

### Unified Native Mobile

Workflow:

`Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification`

Run:

`35855550749`

Job:

`107163046055` — SUCCESS.

The exact runtime preserves:

- one shared Reader source;
- Web/PWA/native service contracts;
- migrated staging corpus authority;
- offline Reader behavior;
- Premium offline denial;
- responsive Reader shell;
- Android/iOS shared-source certification.

### Native Binary Certification

Run:

`35855550864`

Jobs:

- readiness `107163045655` — SUCCESS;
- Android debug binary `107163045244` — SUCCESS;
- iOS Simulator binary `107163045581` — SUCCESS.

These remain development/certification binaries only.

No App Store submission occurred.

No Play Store submission occurred.

No production-release binary claim is made.

## 19. Revalidated exact-head artifacts

All listed artifacts remain available and unexpired.

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

## 20. Vercel exact-head boundary

The accepted exact-head Vercel preview was independently rechecked during Phase 9.

Deployment:

`dpl_D2nLbrVsn3NoMbq1nTzvW1EGBoBH`

Deployment URL:

`https://healthtimes-staging-mbs2621sm-11-11.vercel.app`

Metadata:

- state: READY;
- ready state: READY;
- source: git;
- target: null;
- branch: `integration/ag07-phase8-convergence-candidate`;
- SHA: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`;
- created: `1790163402888`;
- ready: `1790163475325`.

The deployment remains protected. Phase 9 did not weaken preview authentication.

### Primary staging alias

The primary staging alias was independently rechecked during Phase 9 and remains unchanged.

Alias:

`healthtimes-staging.vercel.app`

Deployment:

`dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`

SHA:

`4512b7d647eda850ec1e70ad440d459fbd1d82d0`

Branch:

`migration/ag-02-staging-platform`

Source:

`cli`

No primary staging alias movement occurred.

## 21. Mutation receipt

Phase 9 performed no:

- executable runtime change;
- historical merge;
- historical cherry-pick;
- production deployment;
- primary staging alias movement;
- production database mutation;
- staging reset;
- staging restore;
- migration replay;
- migration import/repair/push;
- migration-ledger alteration;
- destructive schema change;
- migrated-corpus rewrite;
- storage mutation;
- stale-media deletion;
- production DNS/MX change;
- production Resend activation;
- production Brevo activation;
- production Cloudflare activation;
- production sender activation;
- production broadcast;
- payment/store product invention;
- App Store submission;
- Play Store submission;
- legacy frontend retirement;
- Phase 5/6/7/8/9 PR merge;
- AG-08 invocation;
- CP7 acceptance claim;
- Phase 10 release.

Phase 9 staging database operations were read-only.

The only repository mutation is this Phase 9 documentation closure on the dedicated certification branch.

## 22. Deferred matters

The following remain outside Phase 9:

1. real Resend transactional send;
2. real signed Resend webhook;
3. live Brevo sync;
4. real Cloudflare inbound routing;
5. production payment/store product IDs and prices;
6. production purchase validation;
7. Premium offline-entitlement policy beyond the current fail-closed denial;
8. HOSPAZ destination, schedule and placement conditions;
9. primary staging alias movement;
10. production cutover;
11. legacy frontend retirement;
12. formal WCAG conformance/focus-order audit beyond the bounded accepted accessibility baseline;
13. production performance SLA/Core Web Vitals acceptance thresholds;
14. CP7 acceptance;
15. owner-facing Phase 10 visual/product conformance.

## 23. Phase 9 conclusion

All eleven accepted authority lanes were independently revalidated against one exact runtime.

PWA/offline integrity and route/redirect/explicit-404 integrity are already covered by accepted exact-head tests.

The accepted Reader accessibility baseline was inventoried and revalidated without redesign. The evidence proves semantic roles/labels, disabled-state semantics, responsive operation and existing accessibility contracts; no broader WCAG claim is made.

A reproducible performance baseline was recorded from exact-head build, browser, staging and deployment observations without inventing a production SLA.

Fresh read-only staging verification reconfirmed the accepted migrated corpus, migration ledger, Premium source `33190`, HOSPAZ UNKNOWN/null semantics, subscribers/entitlements, and CP5 function set.

The final Phase 9 certified runtime remains unchanged:

`8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`

**PHASE 9 CERTIFIED — FULL CONVERGENCE EXACT-HEAD CERTIFICATION COMPLETE / READY FOR MODERATOR AUDIT**
