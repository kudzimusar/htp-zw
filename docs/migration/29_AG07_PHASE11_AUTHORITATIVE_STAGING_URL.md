# AG-07 — Phase 11 One Authoritative Staging URL

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

No rebuild or replacement deployment was created.

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
- Vercel deployment created: **NO**
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
