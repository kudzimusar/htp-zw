# AG-07 + NM-07 Phase 10 — Visual / Product Conformance

## Final moderator disposition

**PHASE 10 ACCEPTED — VISUAL / PRODUCT CONFORMANCE COMPLETE / EXACT-HEAD CERTIFIED.**

The previous blocked receipt is superseded. The bounded Web/PWA hydration blocker, exact-head visual evidence blocker, and native visual/binary certification blocker are all resolved on one executable SHA.

This closure does **not** release Phase 11 and does **not** authorize a PR merge, production deployment, primary staging alias movement, database/storage mutation, provider activation, App Store/Play Store submission, or legacy-root retirement.

## 1. Authority and certified candidate

- Repository: `kudzimusar/htp-zw`
- Phase 9 certified executable baseline: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- Phase 9 documentation closure: `86df1f08e0b3e578348227c30248e32437687352`
- Phase 10 branch: `integration/ag07-nm07-phase10-visual-conformance`
- Phase 10 certified executable runtime: `e6895043aa00fa0272a79cdc1347e2460f08dfac`
- Phase 10 PR: #28 — Draft / Open / Unmerged / Mergeable
- Design authority: `docs/native-mobile/DESIGN.md`
- Expected approved wireframe PNG: `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`
- Wireframe repository custody: **ABSENT**
- Wireframe reconstructed or invented: **NO**

The certified runtime is a direct descendant of the accepted Phase 9 closure. The Phase 10 work remains bounded to Reader presentation, responsive/hydration behavior, visual evidence, regression certification, and certification harnesses.

## 2. Before-state evidence

### Web/PWA

Frozen executable `8fef4c2e...` was checked out directly for baseline capture.

- Run `35862974220`
- Job `107187504110`
- Result: **SUCCESS**
- Artifact: `phase10-before-web-pwa-screenshots`
- Artifact ID: `10750654475`
- Digest: `sha256:62f600bd3f0971ce1c5d5d49eef0526a53f1afe5ac1d3dc4593904bb2174b0a2`

The pack contains representative mobile 390×844, tablet 834×1112, and desktop 1440×1000 captures across the shared Reader surfaces.

A second frozen-baseline Web capture also succeeded:

- Run `35862974381`
- Job `107187477046`
- Artifact ID: `10750239377`
- Digest: `sha256:7e8d16722a3a370d2bc643f544f6437cccc991dff66489a1e8b577e75d85a3a7`

### Native baseline

- iOS Simulator baseline job `107187476871`: **SUCCESS**
- iOS baseline artifact ID: `10751801648`
- iOS baseline digest: `sha256:42ce499381cf59dc8dbfa8c21a5d73e3e6bb48b54e93c4a3e460afc28b81c436`

The earlier Android baseline evidence harness had an ADB/PATH preparation defect. That was a harness defect rather than an application-runtime failure and is superseded by the exact-head Android evidence below.

## 3. Remediation completed

Phase 10 resolved the accepted visual/product gaps without changing domain authority:

- repaired the Home React Hook-order defect so the hydrated editorial Home renders;
- stabilized Web hydration before responsive structural changes in the Reader shell and Studio;
- suppressed the mobile five-tab bar on desktop while preserving the five Reader destinations;
- added restrained Premium discovery to the shared Reader utility header;
- restored the provenance-backed `hospaz-header-direct` Reader placement without inventing a destination;
- removed migration/internal taxonomy terminology from public Article and Explore presentation;
- removed unsupported/internal My HealthTimes entries and environment wording;
- converted Premium, Listen, and Notifications copy to publication-facing language without changing underlying authority;
- rendered onboarding without full Reader utility chrome;
- preserved Studio server-authorized capability boundaries;
- hardened exact-head Web/PWA, iOS Simulator, Android emulator, and native-binary evidence harnesses.

## 4. Hydration blocker — resolved

The earlier candidate emitted React minified error #418 because server-rendered responsive structure could differ from the initial Web client structure.

The certified runtime now defers Web responsive structural switching until after hydration in the shared Reader shell, tab layout, and Studio shell.

Exact-head evidence at `e6895043...` is fail-closed:

- Web/PWA evidence throws on any React #418 hydration-regeneration warning;
- it also throws on any other page error;
- Home must render `Top Stories`;
- desktop Reader routes must have zero mobile tab roles;
- mobile Reader routes must retain the five-destination tab bar;
- onboarding must omit Reader utility chrome;
- Article must omit migration-internal taxonomy labels.

Both exact-head Web evidence workflows completed successfully. Therefore the previous hydration blocker is closed.

## 5. Exact-head certification matrix

Every required workflow below certified `EXPECTED_SHA=e6895043aa00fa0272a79cdc1347e2460f08dfac` and `CHECKED_OUT_SHA=e6895043aa00fa0272a79cdc1347e2460f08dfac`.

| Gate | Run | Job(s) | Result |
| --- | --- | --- | --- |
| Phase 10 Candidate Visual Conformance | `35921182845` | Web `107385236314`; Android `107385236578`; iOS `107385236720` | **SUCCESS** |
| Phase 10 Web/PWA Evidence | `35921182638` | `107385235814` | **SUCCESS** |
| Validate HealthTimes 2.0 | `35921182890` | `107385235645` | **SUCCESS** |
| Chromium UAT | `35921182568` | `107385246971` | **SUCCESS** |
| AG-07 Phase 4 Unified Web/PWA | `35921182581` | `107385251724`, `107385251954` | **SUCCESS** |
| NM-07 Phase 6 Migrated Corpus Reader | `35921182856` | `107385235903`, `107385236098` | **SUCCESS** |
| AG-05 + NM-07 Phase 7 Premium + HOSPAZ | `35921182855` | `107385236026`, `107385236284` | **SUCCESS** |
| Unified Native Certification | `35921182629` | `107385235765` | **SUCCESS** |
| Native Binary Certification | `35921182876` | iOS `107385236726`; Android `107385237126`; readiness `107385237155` | **SUCCESS** |
| AG-06 Newsroom Security | `35921182567` | `107385235001`, `107385235163`, `107385235307`, `107385235364` | **SUCCESS** |
| CA-01 Communications Security | `35921182851` | `107389196168`, `107389198148`, `107389252660` | **SUCCESS** |
| COM-01 Communications | `35921182846` | `107385235504`, `107385235806`, `107385567582` | **SUCCESS** |
| Migration Tests | `35921182864` | `107385235840` | **SUCCESS** |

The Phase 10 static visual contract itself reports **9 passed / 0 failed** on the exact runtime.

## 6. Exact-head visual and native artifacts

### Final Web/PWA evidence

- Run: `35921182638`
- Artifact: `phase10-final-web-pwa-screenshots`
- Artifact ID: `10776973249`
- Digest: `sha256:ec1eb52695d344245defc53f511485d9b84e8e707255f71bd0e3b34d3f5c539b`

### Candidate responsive + HOSPAZ evidence

- Run: `35921182845`
- Web/PWA artifact: `phase10-candidate-web-pwa-screenshots`
- Artifact ID: `10777366929`
- Digest: `sha256:c5eac844769c5e3202f5556e3ba6046970055d87a254bb4c5733b56f674834f1`
- iOS artifact: `phase10-candidate-ios-screenshots`
- Artifact ID: `10777884848`
- Digest: `sha256:f36c4e488e84fea435bf454eb909e51eef80a71a53fb7075201f2e4efcc76246`
- Android artifact: `phase10-candidate-android-screenshots`
- Artifact ID: `10777954244`
- Digest: `sha256:9ce38e895f1c6bf3a3da076cb3980337d260014fa10e0b6dfd0f613898af1f48`

### Native binary artifacts

- iOS Simulator app artifact ID: `10778296642`
- Digest: `sha256:ac6e1eb7d24dc9a49dee22c2d74fda9c5f5f5db5b8e2ee7da1a1119c31ebb8e5`
- Android debug APK artifact ID: `10778246778`
- Digest: `sha256:a627ea5f6ba6d4d3f25cb0e88988855280728fe8587a6bb3accc160578995a41`
- Native config matrix artifact ID: `10777097637`
- Digest: `sha256:62165ace5227a62e506ab3c81f77d7f49f62829c620145d0bdbac3f537bb72cb`

## 7. Premium and HOSPAZ authority preserved

### Premium

Still fail-closed:

- storefront remains configuration-driven;
- no invented product IDs;
- no invented prices;
- no invented payment/subscriber state;
- entitlement remains server-authoritative;
- protected body and Premium offline rules remain unchanged.

### HOSPAZ

Still provenance-bound:

- advertiser: HOSPAZ;
- placement: `hospaz-header-direct`;
- source attachment: `33005`;
- destination: `null` / UNKNOWN;
- schedule: UNKNOWN;
- placement conditions: UNKNOWN;
- no verified destination means the direct ad remains non-clickable.

The exact-head Phase 10 Web job independently re-read the staging HOSPAZ authority and failed closed if any of these invariants changed.

## 8. Preview / hosting receipt

The exact certified runtime produced a Git-integrated Vercel preview:

- deployment: `dpl_9Bd8n5GMpaBWMZTNHd4SPXQjeH2T`;
- commit SHA: `e6895043aa00fa0272a79cdc1347e2460f08dfac`;
- state: **READY**;
- target: `null`.

This is a branch preview only. No production deployment or primary staging alias movement is authorized or claimed.

## 9. Safety / mutation receipt

- production deployment: **NO**
- primary staging alias movement: **NO**
- production database mutation: **NO**
- staging destructive database mutation: **NO**
- migration replay/reset/repair/push: **NO**
- migration-ledger mutation: **NO**
- storage cleanup or stale-object deletion: **NO**
- production DNS/MX change: **NO**
- external provider activation: **NO**
- invented Premium price/product/payment state: **NO**
- invented HOSPAZ destination/schedule/placement condition: **NO**
- App Store / Play Store submission: **NO**
- legacy root frontend retirement: **NO**
- PR merge: **NO**
- CP7 acceptance: **NO**
- Phase 11 release: **NO**

Non-blocking toolchain deprecation warnings were present in native/Web build logs, but all required exact-head jobs completed successfully. They do not alter this Phase 10 disposition.

## 10. Closure

The previous Phase 10 blockers are resolved on one exact executable SHA with Web/PWA, responsive visual, iOS Simulator, Android emulator, native binary, security, communications, migration, and prior-phase regression evidence all green.

PR #28 remains **Draft / Open / Unmerged**.

**PHASE 10 ACCEPTED — VISUAL / PRODUCT CONFORMANCE COMPLETE / EXACT-HEAD CERTIFIED.**

No subsequent phase is released by this receipt.
