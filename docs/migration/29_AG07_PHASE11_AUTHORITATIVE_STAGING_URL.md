> **Continuation note — 2026-09-24:** Sections 1–14 preserve the original Phase 11 blocked checkpoint as historical evidence. Sections 15 onward record the independent continuation audit, bounded correction, replacement exact-head candidate, and current blocker. The original Phase 10 deployment `dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T` is superseded for Phase 11 cutover because the continuation audit found a deployment-mode defect; no alias was moved to it.\n# AG-07 — Phase 11 One Authoritative Staging URL

## Disposition

**PHASE 11 BLOCKED — the connected Vercel action surface does not expose alias reassignment or existing-deployment promotion, while its only deployment write action would create a new deployment, which Phase 11 explicitly forbids.**

No staging alias movement was performed.

No application runtime, migration, database row, storage object, Premium state, HOSPAZ authority, production configuration, DNS/MX record, provider configuration, native release state, or PR merge was changed.

## 1. Authority

Repository: `kudzimusar/htp-zw`

Phase 10 certified runtime:

`e6895043aa00fa0272a79cdc1347e2460f08dfac`

Phase 10 documentation closure:

`07540f5119b9a4259aa165d1cd59c424491ebf9d`

Phase 10 PR:

`#28 — DRAFT / OPEN / UNMERGED / MERGEABLE / CLEAN`

Phase 11 branch:

`deployment/ag07-phase11-authoritative-staging`

This branch was created from the Phase 10 documentation closure. Phase 10 runtime remains the only authorized executable target for the canonical staging alias.

## 2. Vercel project identity

Team:

- name: `Eleven-11-Tech`
- slug: `11-11`
- team ID: `team_InL2Jmsg4dbG0rFY8nxriTha`

Project:

- name: `healthtimes-staging`
- project ID: `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`

## 3. Alias mapping immediately before attempted cutover

Canonical staging URL:

`healthtimes-staging.vercel.app`

Observed serving deployment:

`dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`

Observed serving SHA:

`4512b7d647eda850ec1e70ad440d459fbd1d82d0`

Observed deployment metadata:

- state: `READY`
- ready state: `READY`
- Git branch: `migration/ag-02-staging-platform`
- source: `cli`
- target: `production`
- deployment URL: `healthtimes-staging-ot3mes8su-11-11.vercel.app`
- aliases:
  - `healthtimes-staging.vercel.app`
  - `healthtimes-staging-11-11.vercel.app`
- alias error: `null`

This deployment remains the rollback destination.

## 4. Authorized target verification

Authorized existing deployment:

`dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`

Exact certified SHA:

`e6895043aa00fa0272a79cdc1347e2460f08dfac`

Observed target metadata:

- state: `READY`
- ready state: `READY`
- Git branch: `integration/ag07-nm07-phase10-visual-conformance`
- Git commit SHA: `e6895043aa00fa0272a79cdc1347e2460f08dfac`
- Git commit message: `ci(phase10): fix Android AVD custody for visual proof`
- source: `git`
- target: `null`
- deployment URL: `healthtimes-staging-lgil8ggk2-11-11.vercel.app`
- current branch-preview alias: `healthtimes-staging-git-integration-ag07-nm07-phas-fbb8ec-11-11.vercel.app`
- alias error: `null`

The target therefore matches the Phase 11 release instruction exactly.

## 5. Exact platform blocker

Vercel supports assigning an alias directly to an already-built deployment through the alias assignment API:

`POST /v2/deployments/{id}/aliases`

Vercel also documents promotion of an existing deployment without rebuilding it.

However, the connected Vercel actions available in this execution context expose deployment reads, logs, protected-URL fetches, project discovery, and a deploy action, but they do **not** expose either:

- alias assignment to an existing deployment; or
- promotion of an existing deployment.

The available deployment write action would create a new deployment. Phase 11 explicitly requires stopping rather than silently creating or certifying a different deployment/SHA if direct reuse of `dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T` cannot be performed.

Therefore the cutover failed closed before any alias mutation.

### Movement time

**NOT PERFORMED.**

There is no movement timestamp because the authoritative alias was not changed.

## 6. Alias state after blocked attempt

Canonical staging URL:

`healthtimes-staging.vercel.app`

Actual deployment after the blocked attempt:

`dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`

Actual serving SHA after the blocked attempt:

`4512b7d647eda850ec1e70ad440d459fbd1d82d0`

Desired but unapplied target:

`dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`

Desired exact SHA:

`e6895043aa00fa0272a79cdc1347e2460f08dfac`

No rebuild or replacement deployment was created **for the alias cutover**.

After the documentation-only commit `c08e558856caac77d1b92da8d8c6d120e79c4738`, Vercel Git integration automatically started a normal branch-preview deployment:

- deployment: `dpl_5phToufSVJhJcoS3vYDMp4zSxa7k`
- commit: `c08e558856caac77d1b92da8d8c6d120e79c4738`
- branch: `deployment/ag07-phase11-authoritative-staging`
- observed state: `BUILDING`
- target: `null`
- purpose: automatic Git-integration preview of the documentation branch only

This automatic preview was not manually invoked, was not used to establish `healthtimes-staging.vercel.app`, does not replace the certified target deployment, and is not Phase 11 runtime evidence. Additional documentation-only commits on this Git-integrated branch may produce equivalent `target: null` previews; they remain non-authoritative and must not be promoted or substituted for `dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`.

## 7. Read-only staging custody verification

Fresh read-only capture:

`2026-09-23T22:19:45.538238+00:00`

Equivalent Japan time:

`2026-09-24T07:19:45.538238+09:00`

HealthTimes Staging project:

`gcdohgbmqhqwydgaxrcr`

Observed custody:

| Invariant | Observed |
| --- | ---: |
| migration ledger | 43 |
| WordPress posts | 5,737 |
| WordPress pages | 49 |
| public migrated objects | 5,786 |
| URL mappings | 5,786 |
| media records | 3,277 |
| canonical media | 3,275 |
| migrated-media storage objects | 5,705 |
| preserved stale objects | 2,430 |
| categories | 83 |
| tags | 10,283 |
| authors | 3 |
| CP5 functions | 6 / 6 |

Authoritative source snapshot remains:

- snapshot key: `cp3-2026-09-21`
- status: `AUTHORITATIVE_REHEARSAL`
- posts: 5,737
- pages: 49
- media: 3,277
- categories: 83
- tags: 10,283
- authors: 3

No database or storage mutation was performed.

## 8. Read-only route / Premium / HOSPAZ authority checks

Because the authoritative alias was not moved, these are **pre-cutover authority checks**, not post-move UAT.

Representative direct article:

`/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/`

- source ID: `30154`
- resolution: `preserved_direct`
- HTTP authority: `200`
- canonical target: same path

Accepted legacy alias:

`/policy-capture-at-cop11-what-it-signals-for-global-health-governance/`

- resolution: `alias_redirect`
- HTTP authority: `301`
- one-hop target: `/2025/12/06/policy-capture-at-cop11-what-it-signals-for-global-health-governance/`

Explicit exception:

`/2017/04/04/gwinji-appeals-funding-health-sector/`

- HTTP authority: `404`

Unknown route:

`/phase4-no-authoritative-healthtimes-route/`

- HTTP authority: `404`

### Premium

Source `33190` remains:

- access policy: `premium_marker_review`
- source body in custody DB: 10,701 characters
- public CP5 `body_html`: `null`
- public HTTP authority: `200`

Premium therefore remains fail-closed at the public boundary.

### HOSPAZ

Read-only CP5 direct-ad authority remains:

- advertiser: `HOSPAZ`
- campaign: `HOSPAZ source continuity`
- placement: `hospaz-header-direct`
- current source attachment: `33005`
- placement state: `bound_rehearsal`
- destination URL: `null`
- destination state: `UNKNOWN`
- schedule state: `UNKNOWN`
- placement conditions state: `UNKNOWN`
- standalone campaign register found: `false`

With no verified destination, the accepted HOSPAZ capability remains non-clickable.

### Sitemap and feed

- sitemap URL count: **5,786**
- feed row count at the public CP5 boundary: **50**

## 9. Server-visible canonical / SEO status

The exact Phase 10 runtime retains the accepted Phase 4 server-side presentation contract in `api/web.js`, including server-injected:

- title;
- description;
- robots;
- canonical URL;
- Open Graph metadata;
- JSON-LD structured data.

The live CP5 direct document for source `33190` continues to expose canonical and SEO authority while withholding the protected body.

A true **post-alias-move** HTTP/SEO verification was not performed because the alias was not moved.

## 10. Home / responsive / Reader UAT status

A true Phase 11 post-move UAT was **not executed**, because the mandatory alias mutation could not be performed safely.

Accordingly, Phase 11 does not claim new post-move proof for:

- Home;
- React #418 absence on the canonical staging alias;
- mobile navigation;
- desktop mobile-tab suppression;
- Explore;
- Search;
- representative migrated Article rendering;
- HOSPAZ visual rendering on the canonical staging alias.

Those behaviors remain certified by Phase 10 exact-head evidence, but Phase 11 requires them to be re-proven specifically after canonical alias movement before completion can be declared.

## 11. Runtime-log observation

Target deployment:

`dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`

Queried window:

`2026-09-23T20:20:06.887Z → 2026-09-23T22:20:06.887Z`

Observation:

**No runtime logs found for the target deployment in that window.**

This is consistent with the target not being the authoritative staging alias. It is not substituted for post-move runtime evidence.

## 12. Rollback readiness

Rollback deployment remains:

`dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`

Because no alias mutation occurred, rollback execution was not necessary. The rollback destination is already the current authoritative staging deployment.

No rollback test was performed by deliberately moving the alias away and back; such a test would have required the same unavailable alias-assignment capability.

## 13. Mutation receipt

- Phase 11 branch created: **YES**
- Phase 11 documentation file created: **YES**
- application/runtime code changed: **NO**
- manual/new Vercel deployment created for cutover: **NO**
- automatic Git-integration preview from documentation branch: **YES** — first observed `dpl_5phToufSVJhJcoS3vYDMp4zSxa7k`, `target: null`, non-authoritative
- authoritative staging alias moved: **NO**
- rollback alias mutation: **NO**
- migration ledger changed: **NO**
- migrated corpus changed: **NO**
- Supabase schema changed: **NO**
- storage objects changed/deleted: **NO**
- stale media changed/deleted: **NO**
- Premium entitlement/subscriber state changed: **NO**
- HOSPAZ authority changed: **NO**
- production deployment: **NO**
- production DNS/MX change: **NO**
- production provider activation: **NO**
- iOS/Android submission: **NO**
- PR #28 merge: **NO**
- historical PR merge: **NO**
- AG-08 invoked: **NO**
- CP7 accepted: **NO**
- Phase 12 released: **NO**

## 14. Required continuation

Phase 11 remains blocked until an authorized Vercel action surface can directly assign:

`healthtimes-staging.vercel.app`

to the **existing** deployment:

`dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`

without creating a replacement deployment.

After that exact mutation is available, the full post-move UAT/HTTP/SEO/runtime-log matrix must be executed before Phase 11 can be declared complete.

**PHASE 11 BLOCKED — CONNECTED VERCEL TOOLING CANNOT REASSIGN THE AUTHORITATIVE ALIAS TO THE EXISTING CERTIFIED DEPLOYMENT WITHOUT FALLING BACK TO A NEW DEPLOYMENT.**


---

## 15. Phase 11 continuation — independent code review and bounded runtime remediation

This section records the continuation after the original blocked checkpoint above. The original blocker evidence is retained as historical evidence and has not been erased.

### 15.1 Independently verified deployment-mode defect

Independent moderator review of the actual Phase 10 runtime code found a concrete deployment-specific defect:

- `vercel.json` built the Web/PWA artifact with `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=source-parity`;
- in `apps/mobile/src/services/source-parity.ts`, advertising resolves to `source: "none"`;
- accepted HOSPAZ runtime authority exists in `apps/mobile/src/services/migrated-corpus.ts`, which is selected only in `staging` service mode;
- the Phase 10 HOSPAZ visual proof rebuilt locally with `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=staging`, so that proof did not prove that the actual Vercel deployment built in `source-parity` mode would render HOSPAZ.

Therefore the previously authorized Phase 10 deployment:

`dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`

at:

`e6895043aa00fa0272a79cdc1347e2460f08dfac`

was not cut over. Its Phase 10 certification remains historical Phase 10 evidence, but it is superseded for Phase 11 staging-cutover purposes because it cannot satisfy the Phase 11 HOSPAZ canonical-Home gate as deployed.

No canonical staging alias mutation occurred before this defect was found.

### 15.2 Bounded remediation

The remediation remained inside the Phase 11 deployment-specific authority:

1. `vercel.json` was changed so the authoritative staging Web/PWA build uses:
   `APP_ENV=staging EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=staging`.
2. `tests/migration/ag07-phase4-unified-web.spec.js` now fails if the Vercel build regresses to `source-parity`.
3. A web-only exact-head Phase 11 certification workflow was added:
   `.github/workflows/phase11-staging-runtime.yml`.
4. No Reader product screen was redesigned.
5. No iOS/Android rebuild or native implementation change was introduced.

Remediation commits after the prior blocked documentation head `d1c2fdc397dd0bd1878a182970cf71a83993ee4f`:

- `c6477dd38b439b2de82764f4b83ed7472494f9bb` — Vercel staging-mode correction;
- `fe3aa79f239b5c18928555120b82925a4e1fa023` — serving-contract regression assertion;
- `cad71a298ffd1b55455879dda11f235478c1a4be` — Phase 11 web-only exact-head certification lane;
- `dc923416aeccd292e7db88440cd0f013ced05394` — certification-harness selector correction.

The first candidate run at `cad71a298ffd1b55455879dda11f235478c1a4be` failed only because the browser harness used the ambiguous selector `getByLabel("Search HealthTimes")`, which matched both the global Search button and the Search textbox. All preceding gates had passed. The harness was corrected to select the Search textbox by role; this did not alter application runtime behavior.

### 15.3 Exact-head certified replacement candidate

Authoritative Phase 11 replacement runtime candidate:

`dc923416aeccd292e7db88440cd0f013ced05394`

GitHub Actions:

- workflow: `AG-07 Phase 11 Staging Runtime Candidate`
- run: `35935813192`
- job: `107432475409`
- conclusion: **SUCCESS**
- exact checkout:
  - `EXPECTED_SHA=dc923416aeccd292e7db88440cd0f013ced05394`
  - `CHECKED_OUT_SHA=dc923416aeccd292e7db88440cd0f013ced05394`
- completed: `2026-09-23T23:55:56Z`

Evidence artifact:

- name: `ag07-phase11-staging-runtime-candidate`
- artifact ID: `10782064608`
- SHA-256: `374fda3517922316f2c48bef7f21d35beb84aa49656278aa0cb0bdf5e9c2e9a9`

Packaged `build-info.json` proves:

- SHA: `dc923416aeccd292e7db88440cd0f013ced05394`
- presentation: `apps/mobile`
- capability: `cp5-phase3-v1`
- base path: `/`
- service mode: `staging`

The workflow passed:

- Phase 4 serving contract;
- Phase 10 visual/product contract;
- Premium/HOSPAZ convergence contract;
- universal Reader typecheck;
- fresh CP5 read-only staging invariants;
- exact staging-mode Web/PWA build;
- packaged SHA/service-mode identity;
- raw HTTP route/SEO/Premium fail-closed proof;
- Chromium install;
- staging-mode mobile/desktop browser proof.

### 15.4 Browser evidence at replacement candidate

Captured at:

`2026-09-23T23:55:39.681Z`

Mobile `390×844`:

- Home HTTP: `200`
- Explore HTTP: `200`
- Search HTTP: `200`
- React `#418`: `0`
- Reader tabs: `5`
- HOSPAZ: rendered
- HOSPAZ destination: not available
- HOSPAZ clickable: **NO**
- console errors: none recorded by the proof

Desktop `1440×1000`:

- Home HTTP: `200`
- Explore HTTP: `200`
- Search HTTP: `200`
- React `#418`: `0`
- mobile Reader tabs: `0`
- HOSPAZ: rendered
- HOSPAZ destination: not available
- HOSPAZ clickable: **NO**
- console errors: none recorded by the proof

HOSPAZ disclosure observed in both viewport proofs:

`Direct advertising · HOSPAZ`

The runtime explicitly stated that destination, schedule and placement conditions remain unverified and are not inferred.

### 15.5 Raw route / SEO / Premium evidence at replacement candidate

Observed at:

`2026-09-23T23:55:16.657Z`

Representative source `30154`:

- HTTP: `200`
- presentation: `apps/mobile`
- canonical URL: preserved
- server-visible title: preserved
- server-visible description: preserved
- robots: `index,follow,max-image-preview:large`
- Open Graph title: preserved
- JSON-LD: present
- universal Reader bundle: present
- legacy presentation canonical: **NO**

Accepted alias:

- HTTP: `301`
- one-hop target: `/2025/12/06/policy-capture-at-cop11-what-it-signals-for-global-health-governance/`

Explicit exception:

- HTTP: `404`

Unknown route:

- HTTP: `404`

Premium source `33190`:

- HTTP: `200`
- body protected: **YES**
- public body exposed: **NO**

Fresh CP5 read-only evidence also retained:

- sitemap: `5,786`
- feed: `50`
- HOSPAZ advertiser: `HOSPAZ`
- placement: `hospaz-header-direct`
- source attachment: `33005`
- destination: `UNKNOWN / null`
- schedule: `UNKNOWN / null`
- placement conditions: `UNKNOWN / null`

### 15.6 Replacement Vercel deployment

Exact Git-integration preview for the certified replacement candidate:

- deployment: `dpl_9v22L3jtNnPR6UWqiacKqvwYrRy1`
- URL: `healthtimes-staging-jzumc1sx9-11-11.vercel.app`
- project: `healthtimes-staging`
- project ID: `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`
- Git branch: `deployment/ag07-phase11-authoritative-staging`
- Git SHA: `dc923416aeccd292e7db88440cd0f013ced05394`
- state: `READY`
- ready state: `READY`
- target: `null`
- source: `git`
- alias error: `null`

This is now the only Phase 11 runtime candidate eligible for cutover. The superseded `dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T` must not be used for Phase 11.

### 15.7 Fresh full staging custody after remediation

Fresh read-only capture:

`2026-09-23T23:57:43.017941Z`

Equivalent Japan time:

`2026-09-24T08:57:43.017941+09:00`

Observed:

| Invariant | Observed |
| --- | ---: |
| migration ledger | 43 |
| posts | 5,737 |
| pages | 49 |
| public migrated objects | 5,786 |
| URL mappings | 5,786 |
| media records | 3,277 |
| canonical media | 3,275 |
| migrated-media objects | 5,705 |
| stale objects | 2,430 |
| categories | 83 |
| tags | 10,283 |
| authors | 3 |
| CP5 functions | 6 / 6 |
| subscribers | 0 |
| Premium entitlements | 0 |

Source snapshot remains:

- key: `cp3-2026-09-21`
- status: `AUTHORITATIVE_REHEARSAL`
- posts: 5,737
- pages: 49
- media: 3,277
- categories: 83
- tags: 10,283
- authors: 3

No database or storage mutation was performed.

### 15.8 Final pre-cutover state after remediation

Canonical alias rechecked after exact-head certification:

`healthtimes-staging.vercel.app`

still resolves to:

- deployment: `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`
- SHA: `4512b7d647eda850ec1e70ad440d459fbd1d82d0`
- state: `READY`
- alias error: `null`

Certified replacement target remains:

- deployment: `dpl_9v22L3jtNnPR6UWqiacKqvwYrRy1`
- SHA: `dc923416aeccd292e7db88440cd0f013ced05394`
- state: `READY`
- target: `null`
- alias error: `null`

PR #28 remains:

`DRAFT / OPEN / UNMERGED / MERGEABLE`

No operator drift exists on the canonical alias.

### 15.9 Remaining alias-assignment blocker

The corrected runtime and its replacement Vercel deployment are certified. The remaining blocker is now exclusively the alias mutation surface.

Authenticated/available surfaces checked in this continuation:

1. **Connected Vercel integration:** authenticated reads are available for projects, deployments and logs, and the only deployment write exposed is `deploy_to_vercel`. It exposes no operation to assign an alias to an existing deployment and no existing-deployment promotion operation.
2. **Connected GitHub integration:** can patch and certify repository code/workflows, but repository source contains no Vercel API credential or authenticated alias mechanism. Secret APIs are intentionally not exposed through this connector, so no credential is guessed or invented.
3. **Local/container execution:** no authenticated Vercel CLI/API session is available to this execution context. A fresh login/token cannot be fabricated.
4. **Computer/Work handoff:** no authenticated desktop/browser execution surface was made available in this session.

The available Vercel `deploy_to_vercel` write was **not** invoked because it would create another deployment, violating the Phase 11 existing-deployment cutover requirement.

Therefore no alias mutation has been performed.

### 15.10 Current continuation disposition

**PHASE 11 BLOCKED — AUTHENTICATED VERCEL ALIAS-ASSIGNMENT CAPABILITY STILL UNAVAILABLE**

This blocker is now independent of application correctness: the deployment-mode defect was found, patched and recertified.

When an authenticated alias-write surface is available, the only eligible cutover is:

`healthtimes-staging.vercel.app`

→

`dpl_9v22L3jtNnPR6UWqiacKqvwYrRy1`

→

`dc923416aeccd292e7db88440cd0f013ced05394`

After that mutation, the full Phase 11 canonical-alias post-cutover smoke, routing/SEO, Premium, HOSPAZ, custody and runtime-log matrix must still be executed before Phase 11 can be accepted.

No Phase 12 / AG-08 / CP7 release is authorized.
\n---\n\n## 15. Continuation audit — concrete deployment defect\n\nThe continuation independently rechecked repository code and live Vercel state before any alias mutation. The canonical alias still served `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK` at SHA `4512b7d647eda850ec1e70ad440d459fbd1d82d0`. The original Phase 10 target `dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T` remained `READY`, `target: null`, `aliasError: null`, SHA `e6895043aa00fa0272a79cdc1347e2460f08dfac`. No operator drift was present.\n\nCode review found a deployment-specific defect: `vercel.json` built the Web/PWA deployment with `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=source-parity`. In that mode the Reader advertising service returns no direct HOSPAZ placement. The accepted `hospaz-header-direct` implementation exists in the `staging` migrated-corpus adapter and resolves `ag05_hospaz_direct_ad_preview`. Phase 10 HOSPAZ evidence had separately rebuilt locally in `staging` mode, so it did not prove the actual Vercel target would render HOSPAZ.\n\nDisposition of the original target: **SUPERSEDED FOR PHASE 11 CUTOVER — bounded deployment-specific correction required.** No alias mutation was attempted against it.\n\n## 16. Bounded correction\n\n- `vercel.json` changed the authoritative staging Web/PWA build from `source-parity` to `staging`; commit `c6477dd38b439b2de82764f4b83ed7472494f9bb`.\n- `tests/migration/ag07-phase4-unified-web.spec.js` now requires `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=staging` and rejects `source-parity`; commit `fe3aa79f239b5c18928555120b82925a4e1fa023`.\n- `.github/workflows/phase11-staging-runtime.yml` added a Web/PWA-only exact-head certification lane; initial commit `cad71a298ffd1b55455879dda11f235478c1a4be`.\n- The first browser run correctly failed because the Search locator matched both the header Search button and Search textbox. This was a harness-only defect. The selector was narrowed to the textbox role; final candidate `dc923416aeccd292e7db88440cd0f013ced05394`.\n\nNo Reader product redesign and no iOS/Android rebuild was performed.\n\n## 17. Replacement exact-head certification\n\nFinal candidate: `dc923416aeccd292e7db88440cd0f013ced05394`.\n\n- GitHub Actions run: `35935813192` — **SUCCESS**.\n- Completion: `2026-09-23T23:55:56Z`.\n- Exact checkout: `EXPECTED_SHA = CHECKED_OUT_SHA = dc923416aeccd292e7db88440cd0f013ced05394`.\n- Artifact: `ag07-phase11-staging-runtime-candidate`, ID `10782064608`.\n- Artifact digest: `sha256:374fda3517922316f2c48bef7f21d35beb84aa49656278aa0cb0bdf5e9c2e9a9`.\n- Packaged `build-info.json`: SHA `dc923416...`, presentation `apps/mobile`, capability `cp5-phase3-v1`, base path `/`, service mode `staging`.\n\nAll workflow gates passed: serving/product contracts, Premium/HOSPAZ convergence, Reader checks, fresh CP5 read-only invariants, staging-mode build, packaged runtime identity, raw HTTP routing/SEO/Premium proof, Chromium browser proof, and evidence upload.\n\n## 18. Replacement Vercel candidate\n\n- deployment: `dpl_9v22L3jtNnPR6UWqiacKqvwYrRy1`\n- URL: `healthtimes-staging-jzumc1sx9-11-11.vercel.app`\n- Git SHA: `dc923416aeccd292e7db88440cd0f013ced05394`\n- project: `healthtimes-staging`\n- source: `git`\n- target: `null`\n- state / ready state: `READY / READY`\n- alias error: `null`\n- created: `2026-09-23T23:53:34.930Z`\n- ready: `2026-09-23T23:54:41.564Z`\n\nThis is the only corrected Phase 11 cutover candidate.\n\n## 19. Candidate Web/PWA / Premium / HOSPAZ / SEO evidence\n\nBrowser evidence captured `2026-09-23T23:55:39.681Z`:\n\n| Surface | Mobile 390×844 | Desktop 1440×1000 |\n| --- | --- | --- |\n| Home | 200 | 200 |\n| Explore | 200 | 200 |\n| Search + interaction | 200 / PASS | 200 / PASS |\n| React #418 | 0 | 0 |\n| Reader mobile tabs | 5 | 0 |\n| HOSPAZ rendered | YES | YES |\n| HOSPAZ clickable | NO | NO |\n| page errors | 0 | 0 |\n\nRaw HTTP evidence at `2026-09-23T23:55:16.657Z` confirms source `30154` HTTP 200 with canonical URL, title, description, robots, Open Graph, server-visible structured data, universal Reader bundle, and no legacy canonical presentation. The accepted historical alias remains one-hop 301; explicit exception and unknown route are 404. Premium source `33190` is HTTP 200 with `bodyProtected=true` and body not exposed.\n\nFresh CP5 evidence confirms sitemap `5,786`, feed `50`, HOSPAZ advertiser `HOSPAZ`, placement `hospaz-header-direct`, source attachment `33005`, destination `UNKNOWN/null`, schedule `UNKNOWN/null`, and placement conditions `UNKNOWN/null`.\n\n## 20. Fresh staging custody after correction\n\nRead-only capture: `2026-09-23T23:57:31.242162Z` / `2026-09-24T08:57:31.242162+09:00`.\n\n| Invariant | Observed |\n| --- | ---: |\n| migration ledger | 43 |\n| posts | 5,737 |\n| pages | 49 |\n| public migrated objects | 5,786 |\n| URL mappings | 5,786 |\n| media records | 3,277 |\n| canonical media | 3,275 |\n| migrated-media storage objects | 5,705 |\n| stale objects | 2,430 |\n| categories | 83 |\n| tags | 10,283 |\n| authors | 3 |\n| CP5 public functions | 6 / 6 |\n| subscribers | 0 |\n| Premium entitlements | 0 |\n\nNo staging database or storage mutation occurred.\n\n## 21. Current alias state and authenticated cutover blocker\n\nAfter exact-head certification, the canonical alias was independently re-read. It still resolves to `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK` at SHA `4512b7d647eda850ec1e70ad440d459fbd1d82d0`. The corrected candidate `dpl_9v22L3jtNnPR6UWqiacKqvwYrRy1` / `dc923416...` is READY but unapplied.\n\nAuthenticated surfaces checked:\n\n1. **Connected Vercel surface:** authenticated reads verify project/deployment/alias state, but the available action catalog exposes no alias-assignment or existing-deployment promotion write. Its deployment write path would create a deployment and is not an authorized substitute.\n2. **Connected GitHub surface:** authenticated repository/workflow access is available, but sensitive Actions-secret endpoints are intentionally unsupported. Existing repository workflows contain no evidenced Vercel-token alias path. A token-backed alias workflow was therefore not guessed or created.\n3. **Work/local browser/CLI surface:** a handoff was attempted for authenticated dashboard/CLI execution, but the user chose to remain in this chat execution context. No authenticated local Vercel CLI/dashboard session is available here.\n\nNo direct alias mutation was attempted without a proven credential. Because the canonical alias has not moved, canonical-URL post-cutover UAT and post-smoke target runtime-log observation cannot truthfully be claimed.\n\nRollback remains `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK` / `4512b7d647eda850ec1e70ad440d459fbd1d82d0`.\n\n## 22. Continuation mutation receipt\n\n- bounded deployment configuration corrected: **YES**\n- regression guard added: **YES**\n- exact-head Web/PWA certification: **SUCCESS**\n- corrected Vercel candidate READY: **YES**\n- Reader redesign: **NO**\n- native rebuild/submission: **NO**\n- staging DB/storage mutation: **NO**\n- production mutation: **NO**\n- canonical alias moved: **NO**\n- PR #28 merged: **NO**\n- AG-08 released: **NO**\n- CP7 accepted: **NO**\n- next programme phase released: **NO**\n\n**PHASE 11 BLOCKED — AUTHENTICATED VERCEL ALIAS-ASSIGNMENT CAPABILITY STILL UNAVAILABLE**\n