# NM-07 Phase 6 — Migrated Corpus → Canonical Reader Integration

## Disposition

**PHASE 6 COMPLETE — MIGRATED HEALTH TIMES STAGING CORPUS IS THE CANONICAL STAGED READER SOURCE**

Phase 6 converges the accepted AG-04 migrated HealthTimes corpus into the canonical universal Reader without reopening migration custody, CP5 routing/SEO, AG-06 authorization, CA-01 communications, COM-01 communications, or the accepted Reader presentation architecture.

This phase does **not** authorize production deployment, production release, App Store submission, Play Store submission, production backend switching, provider activation, storage cleanup, or Phase 7 work.

---

## 1. Lineage

Starting authority:

- Repository: `kudzimusar/htp-zw`
- Phase 5 runtime: `cbc59463d7e7f2e1cbd72586daf8ac380025781b`
- Phase 5 documentation closure: `7a1f569d92b895d1bd39208f2603996eb515d089`
- Phase 5 PR: #23 — Draft / Open / Unmerged

Phase 6:

- Branch: `integration/nm07-phase6-migrated-corpus-reader`
- Draft PR: #24 — Draft / Open / Unmerged
- Certified Phase 6 runtime candidate: `b05a734744b6691bd267d2d01e972d2adf00cbd5`
- Phase 6 documentation closure: this commit
- Production systems modified: **NO**
- Phase 5 custody branch rewritten: **NO**
- Phase 7 started: **NO**

The Phase 6 branch is directly descended from the accepted Phase 5 closure.

---

## 2. Canonical Reader data boundary

For **HealthTimes Staging**, Reader article/page surfaces now use the accepted migrated corpus through the existing CP5 public read capabilities:

- `ag05_public_feed_rows`
- `ag05_public_story_document`
- `ag05_public_context_document`
- `ag05_resolve_public_path`

The universal Reader continues to consume the existing domain/service contracts. Screens do not query Supabase directly.

The central adapter is implemented in:

- `apps/mobile/src/services/migrated-corpus.ts`
- `apps/mobile/src/services/migrated-corpus-mapper.ts`
- `apps/mobile/src/services/index.ts`

Staging service mode is now explicitly:

- `APP_ENV=staging`
- `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=staging`

WordPress/source-parity remains a development bridge and media/publication fallback where already accepted; it is no longer the canonical staging article repository.

---

## 3. Mapping rules

The migrated Reader adapter preserves the accepted migrated truth and maps CP5 public story documents into existing `ArticleDetail` contracts.

Rules:

- `story_id` is preserved as `canonicalStoryId`.
- Reader navigation identity uses the canonical migrated slug/path.
- title / story title map directly from the accepted public document.
- body HTML is passed through only when the CP5 document authorizes a public body.
- `premium_marker_review` and other non-public markers map fail-closed with `bodyHtml = null`.
- author/byline and section are mapped only when exposed by the accepted public document.
- published/modified timestamps are preserved.
- canonical URL is preserved.
- canonical migrated-media storage objects are preferred for hero media.
- source-media fallback is retained only when the accepted public document exposes it and the canonical migrated-media object is absent.
- geography, tags and other taxonomy fields not exposed by the accepted public Reader contract remain empty rather than inferred.
- source provenance retains WordPress source ID/type and canonical legacy path.

No new database schema, RPC, table, migration or storage rewrite was introduced for Phase 6.

---

## 4. Accepted migration invariants reverified read-only

HealthTimes Staging project:

`gcdohgbmqhqwydgaxrcr`

Read-only recheck at Phase 6 closure:

| Invariant | Result |
| --- | ---: |
| migration ledger rows | 43 |
| migrated posts | 5,737 |
| migrated pages | 49 |
| total migrated public objects | 5,786 |
| URL mappings | 5,786 |
| media records in `migrated-media` | 3,277 |
| canonical media objects represented by records | 3,275 |
| explicit `missing_from_uploads_archive` media exceptions | 2 |
| storage objects in `migrated-media` | 5,705 |
| preserved stale storage objects | 2,430 |

The 3,277 media records are intentionally composed of 3,275 canonical media records plus 2 accepted missing-from-archive exceptions.

No destructive storage cleanup occurred.


CP5 public capability verification remains **6 / 6 PASS**.

HOSPAZ remains explicitly non-inferred:

- destination URL: `null`
- destination state: `UNKNOWN`
- schedule: `UNKNOWN`
- placement conditions: `UNKNOWN`

The read-only evidence mutation receipt remains:

- database mutation: **false**
- storage mutation: **false**
- deployment mutation: **false**
- production mutation: **false**

No staging migration replay, ledger mutation, database reset, storage cleanup, stale-object deletion, primary staging alias movement, DNS/MX change, provider activation, store submission, or PR merge occurred.


---

## 5. Representative migrated records validated

The Phase 6 live integration suite uses real migrated records through the CP5 public read boundary.

| Case | Source ID | Canonical path | Result |
| --- | --- | --- | --- |
| recent public story | `30154` | `/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/` | PASS |
| historical story | `935` | `/2016/02/16/zim-launches-unicef-eli-lilly-initiative-to-fight-pediatric-and-adolescent-ncds/` | PASS |
| Premium-review story | `33190` | `/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/` | PASS — public body protected |
| long-form story | `4726` | `/2018/10/26/gvt-applauds-un-investment-in-zims-health-sector/` | PASS — body > 30k chars preserved |
| migrated WordPress page | `1208` | `/research-findings/` | PASS |
| inline migrated-media story | `29578` | `/2025/12/24/novorapid-vial-practical-guidance-for-mealtime-insulin-use/` | PASS |

For source `33190`:

- source/newsroom body remains preserved in staging;
- source body length reverified at **10,701 characters**;
- access policy remains `premium_marker_review`;
- CP5 public document returns `body_html = null`;
- Reader maps this fail-closed and does not expose the protected body.

---

## 6. Phase 6 acceptance matrix

The dedicated Phase 6 live suite passed **14 / 14**:

1. staging Reader resolves to accepted migrated corpus — PASS
2. Reader screens contain no direct Supabase/database shortcut — PASS
3. recent migrated story maps to Reader domain model — PASS
4. historical story loads independently of recent-window feed assumptions — PASS
5. source `33190` remains body-protected — PASS
6. long-form body is not truncated by the adapter — PASS
7. migrated WordPress page maps through the same Reader contract — PASS
8. hero/inline media preserve canonical migrated-media authority — PASS
9. byline/date/section provenance survive without invented taxonomy — PASS
10. Search/Explore/category/author flows use migrated authoritative records — PASS
11. unknown values remain empty/null rather than fabricated — PASS
12. offline persistence accepts migrated records while Premium body remains unavailable — PASS
13. CP5 direct/301/404 route semantics remain intact — PASS
14. Web/PWA/iOS/Android share the same migrated-corpus Reader contract — PASS

---

## 7. Route / SEO / Web-PWA preservation

Phase 6 does not replace CP5 route authority.

The serving chain remains:

`api/web.js` → CP5 route/document/context capability → `apps/mobile` universal Reader shell.

Reverified:

- direct canonical migrated story → HTTP 200
- known alias/legacy path → HTTP 301 to canonical target
- unknown path → explicit HTTP 404
- category/tag/author context remains CP5-owned
- raw canonical/SEO/OG/structured-data decisions remain server-side before hydration
- no SPA-homepage catch-all was introduced
- Web/PWA still uses the accepted `apps/mobile` presentation

Phase 4 Web/PWA contract regression: **7 / 7 PASS**

Browser smoke:

- mobile viewport — PASS
- desktop viewport — PASS

---

## 8. Reader / offline / media preservation

Existing Reader responsibilities remain intact and were reverified:

- article rendering — PASS
- structured body fidelity — PASS
- unsafe script/embed handling — PASS
- Reader persistence separation — PASS
- saved/download/history separation — PASS
- offline article persistence — PASS
- Premium body offline protection — PASS
- accessibility/tablet-density source contracts — PASS
- media/publication service boundaries — PASS
- production service mode remains fail-closed — PASS

Phase 6 did not redesign Reader screens or recreate NM-01 through NM-06.

---

## 9. Security regression results

Phase 6 changes Reader data wiring only. It does not modify AG-06, CA-01, COM-01, database RLS, Auth schemas, Newsroom APIs, communications APIs, or certification provisioners.

Exact-head `b05a734744b6691bd267d2d01e972d2adf00cbd5` regressions inside the Phase 6 convergence workflow:

- CP5 capability suite: **10 / 10 PASS**
- AG-06 security contract: **6 / 6 PASS**
- CA-01 communications/security contract: **7 / 7 PASS**
- COM-01 communications contract: **4 / 4 PASS**

The previously accepted live-staging AG-06 / CA-01 / COM-01 security architecture is unchanged by the Phase 6 diff.

No service-role key, privileged database credential, production credential, or provider credential was introduced into Reader runtime code.

---

## 10. Exact-head certification

The earlier Phase 6 implementation candidate `475b9927...` was product-correct, but the unified Native Mobile workflow used GitHub's synthetic pull-request merge checkout. The moderator independently confirmed that the synthetic merge introduced zero changed files relative to the implementation candidate; this was a provenance defect, not a product regression.

The remediation changed only `.github/workflows/native-mobile.yml` to:

- check out `${{ github.event.pull_request.head.sha || github.sha }}` with `fetch-depth: 1`;
- log `EXPECTED_SHA` and `CHECKED_OUT_SHA` immediately after checkout;
- fail closed when the two SHAs differ.

The certification-only remediation commit is exactly one commit above the prior documentation closure `c1bd6db5d0f5d77b373f60a512692efc70571c1b` and changes only `.github/workflows/native-mobile.yml` (+13 / -0).

Final certified candidate:

`b05a734744b6691bd267d2d01e972d2adf00cbd5`

Complete final acceptance matrix:

| Workflow | Run | Result |
| --- | ---: | --- |
| Validate HealthTimes 2.0 | `35842889061` | SUCCESS |
| Chromium UAT | `35842889006` | SUCCESS |
| Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification | `35842889065` | SUCCESS |
| NM-07 Phase 6 Migrated Corpus Reader | `35842889008` | SUCCESS |
| Native Binary Certification | `35842889003` | SUCCESS |

Every final job proved exact checkout equality:

| Workflow | Job | Job ID | EXPECTED_SHA | CHECKED_OUT_SHA | Result |
| --- | --- | ---: | --- | --- | --- |
| Validate HealthTimes 2.0 | validate | `107121945825` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| Chromium UAT | playwright | `107121946090` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| Native Mobile unified certification | universal-build | `107121946003` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| NM-07 Phase 6 | Read-only staging corpus and CP5 invariants | `107121960834` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| NM-07 Phase 6 | Migrated corpus Reader convergence | `107121961117` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| Native Binary Certification | readiness | `107121946231` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| Native Binary Certification | ios-simulator-binary | `107121945958` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |
| Native Binary Certification | android-debug-binary | `107121946211` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | `b05a734744b6691bd267d2d01e972d2adf00cbd5` | PASS |

No final certification job used the synthetic merge commit as its checked-out runtime.

---

## 11. Evidence artifacts

Exact-head Phase 6 artifacts:

- `nm07-phase6-reader-evidence`
  - artifact ID: `10741772942`
  - digest: `sha256:1b679cf5958587a8fc50b9a2abbadbe76f967f7f2a98f6486dfe5faf3b52b971`

- `nm07-phase6-readonly-staging-evidence`
  - artifact ID: `10742103118`
  - digest: `sha256:1b61c78ad2484c51c1543fa326be5f4c65877a6aa6f8a53c5752df10e7866b89`

- `healthtimes-native-web-dist`
  - artifact ID: `10741894053`
  - digest: `sha256:fea8b2b9602549a4ada842dded4af921507a1f48c96d41f07b279755e99508ff`

- `healthtimes-playwright-report`
  - artifact ID: `10741922430`
  - digest: `sha256:e154c6a6a645bf71733b2cfc7c19ee1ebd09b098d5cb95bbc5817b646aceaacc`

Native binary/config artifacts:

- `healthtimes-ios-simulator-app`
  - artifact ID: `10741869718`
  - digest: `sha256:4148f60a006ceedd165948865aee93b1fdd728c06fcd5f2174ed083cdcb87091`

- `healthtimes-android-debug-apk`
  - artifact ID: `10742887276`
  - digest: `sha256:1d321984a248e1a58617d16f4cd0a353151f49dfbf122c51b425978601c0ace7`

- `healthtimes-native-config-matrix`
  - artifact ID: `10741752736`
  - digest: `sha256:c5f6c22c8716d0dabbf43cde0832514addf86d9173acf5971f95272a82f20bc2`

The Android debug APK and iOS Simulator app are development-profile native build evidence only. They are **not** staging-configured release binaries and are not store-submission artifacts.

The staging service configuration is separately proven by the native config matrix and Phase 6 staging integration suite: `EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=staging`. No App Store or Play Store submission occurred.

---

## 12. Files changed in Phase 6

Runtime / configuration:

- `apps/mobile/src/services/migrated-corpus-mapper.ts`
- `apps/mobile/src/services/migrated-corpus.ts`
- `apps/mobile/src/services/index.ts`
- `apps/mobile/src/platform/config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/app/system-status.tsx`

Tests / certification:

- `apps/mobile/tests/migrated-corpus-integration.test.mjs`
- `apps/mobile/tests/foundation.test.mjs`
- `apps/mobile/tests/reader-product.test.mjs`
- `apps/mobile/tests/native-certification.test.mjs`
- `apps/mobile/tests/source-parity.test.mjs`
- `apps/mobile/package.json`
- `.github/workflows/nm07-phase6-migrated-corpus.yml`
- `.github/workflows/native-certification.yml`
- `.github/workflows/native-mobile.yml` — exact-head provenance remediation only

No Supabase migration, CP5 server implementation, AG-06 runtime, CA-01 runtime, COM-01 runtime, production environment, DNS, storage cleanup, or provider configuration file changed.

---

## 13. Known deferred items

The following are **not Phase 6 defects** and remain deferred:

- physical iPhone / iPad / Android device UAT;
- App Store signing/submission;
- Play Store signing/submission;
- EAS project/provider identity where not already authorized;
- push provider credentials;
- mobile advertising provider identifiers;
- store product identifiers;
- COM-01 live provider wiring;
- production backend activation;
- production deployment;
- Phase 7 migrated-media / media-player convergence beyond the preservation already verified here.

These items do not invalidate Phase 6 migrated-corpus → Reader convergence.

---

## 14. Final Phase 6 disposition

- Migrated WordPress staging corpus is the canonical staged Reader article/page source: **YES**
- Fixture editorial mode used for HealthTimes Staging: **NO**
- Source-parity still canonical for staging article content: **NO**
- CP5 route/SEO authority preserved: **YES**
- Reader UI contract preserved: **YES**
- Web/PWA/mobile universal Reader preserved: **YES**
- Premium-review bodies fail closed: **YES**
- Offline contract preserved: **YES**
- Search/Explore use migrated records: **YES**
- Canonical migrated-media authority preserved: **YES**
- AG-04 custody invariants preserved: **YES**
- AG-06 / CA-01 / COM-01 contracts regressed: **NO**
- Production modified: **NO**
- PR #24 merged: **NO**
- Phase 7 started: **NO**

**PHASE 6 FINAL EXACT-HEAD CERTIFIED — READY FOR MODERATOR RE-AUDIT.**
