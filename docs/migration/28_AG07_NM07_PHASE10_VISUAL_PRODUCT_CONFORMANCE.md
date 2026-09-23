# AG-07 + NM-07 Phase 10 — Visual / Product Conformance

## Final lane disposition

**PHASE 10 BLOCKED — the bounded visual/product remediation is implemented, but the Web/PWA still has an unresolved React hydration-regeneration warning and the final exact-head Native/visual certification matrix is not green.**

This receipt closes the active Phase 10 implementation lane for moderator/owner review. It does **not** release Phase 11.

## 1. Authority and exact candidate

- Repository: `kudzimusar/htp-zw`
- Phase 9 certified executable baseline: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- Phase 9 documentation closure: `86df1f08e0b3e578348227c30248e32437687352`
- Phase 10 branch: `integration/ag07-nm07-phase10-visual-conformance`
- Phase 10 final executable/test candidate: `56e6809b358b30d13a3d6813e7f17464ac136a6e`
- Phase 10 PR: #28 — Draft / Open / Unmerged
- Design authority: `docs/native-mobile/DESIGN.md`
- Expected approved wireframe PNG: `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`
- Wireframe repository custody: **ABSENT**
- Wireframe reconstructed or invented: **NO**

The Phase 10 candidate is a direct descendant of the accepted Phase 9 closure. No migration, database, storage, production, DNS/MX, provider, payment, store-submission or PR-merge authority was exercised.

## 2. Before evidence

### Web/PWA

Frozen executable `8fef4c2e...` was checked out directly for baseline capture.

- Run `35862974220`
- Job `107187504110 — Before — certified Web/PWA visual baseline`
- Result: **SUCCESS**
- Artifact: `phase10-before-web-pwa-screenshots`
- Artifact ID: `10750654475`
- Digest: `sha256:62f600bd3f0971ce1c5d5d49eef0526a53f1afe5ac1d3dc4593904bb2174b0a2`

The pack contains representative mobile 390×844, tablet 834×1112 and desktop 1440×1000 captures across Home, Explore, Search, Live, Watch, My HT, Premium, Saved, Edition, Notifications, Listen, Onboarding and Studio.

A second frozen-baseline Web capture also succeeded:

- Run `35862974381`
- Job `107187477046`
- Artifact ID `10750239377`
- Digest `sha256:7e8d16722a3a370d2bc643f544f6437cccc991dff66489a1e8b577e75d85a3a7`

### Native baseline

- iOS Simulator job `107187476871`: **SUCCESS**
- iOS artifact ID `10751801648`
- iOS digest `sha256:42ce499381cf59dc8dbfa8c21a5d73e3e6bb48b54e93c4a3e460afc28b81c436`

Android baseline build succeeded but emulator preparation failed because `adb` was not on PATH in the evidence harness. That was a harness defect, not an application-runtime failure. The Phase 10 workflow was subsequently hardened to export Android platform-tools explicitly.

## 3. Baseline visual/product gaps

| Surface | Baseline finding | Phase 10 action |
| --- | --- | --- |
| Home | Blank after async hydration because Home changed React Hook order after loading. | **Remediated in code.** |
| Desktop navigation | Desktop masthead and mobile bottom tabs rendered together. | **Remediated in code.** |
| Premium discovery | No persistent Premium utility entry in the shared Reader shell. | **Remediated in code.** |
| Explore | Reader-facing screen exposed migration/domain vocabulary such as canonical/legacy taxonomy labels. | **Remediated in copy/presentation.** |
| Article | Public article presentation exposed migration-internal taxonomy labels. | **Remediated in presentation.** |
| My HealthTimes | Unsupported/internal entries such as Payment Methods and commercial/system readiness were exposed. | **Remediated in presentation.** |
| Premium page | Commerce truth was fail-closed, but public copy exposed platform/store implementation language. | **Remediated in public copy; commerce authority unchanged.** |
| Listen / Notifications | Public copy exposed implementation/authority terminology. | **Remediated in public copy.** |
| Onboarding | Full Reader chrome weakened the focused welcome composition. | **Remediated in presentation.** |
| HOSPAZ | Direct-ad authority existed but needed visible Reader placement without inventing destination/schedule truth. | **Verified direct placement restored; remains non-clickable without verified destination.** |
| Search / Live / Watch / Saved / Edition / Studio | Existing structure was acceptable within source authority. | **Preserved.** |

## 4. Bounded implementation completed

The Phase 10 branch changed only the shared Reader presentation, visual certification tests/workflows and Phase 10 evidence/docs.

Product-facing changes include:

- repaired Home Hook ordering so the hydrated editorial Home can render;
- suppressed the mobile bottom tab bar on desktop while preserving the same five Reader destinations;
- added restrained Premium discovery to the shared Reader utility header;
- restored the provenance-backed `hospaz-header-direct` Reader placement without inventing a destination;
- removed public `Canonical desk` / `Legacy source taxonomy` article labels;
- renamed Explore taxonomy presentation to reader-facing editorial desks, topics and categories;
- removed unsupported/internal My HealthTimes entries and environment wording;
- converted Premium, Listen and Notifications copy from implementation-facing language to publication-facing language;
- rendered onboarding without full Reader utility chrome;
- preserved accessibility roles, labels, selected/disabled states and minimum-touch-target conventions.

Certification changes include:

- `apps/mobile/tests/phase10-visual-conformance.test.mjs`;
- updated existing Reader and growth-commercial tests so they continue asserting authority semantics without requiring internal UI wording;
- exact-candidate responsive screenshot workflow;
- frozen-baseline visual evidence workflow;
- Android evidence PATH hardening;
- Phase 10 workflow concurrency so later runs supersede obsolete Phase 10 evidence runs.

## 5. Authority invariants preserved

### Premium

Still fail-closed:

- storefront state remains configuration-driven;
- no invented product IDs;
- no invented prices;
- no invented payment/subscriber state;
- entitlement remains server-authoritative;
- protected body rules remain unchanged;
- Premium offline body persistence remains unchanged.

### HOSPAZ

Still provenance-bound:

- advertiser: HOSPAZ;
- placement: `hospaz-header-direct`;
- source attachment: `33005`;
- destination: `null` / UNKNOWN;
- schedule: UNKNOWN;
- placement conditions: UNKNOWN;
- no verified destination means the direct ad remains non-clickable.

### Other authorities

Unchanged:

- migrated-corpus mapping and Reader data authority;
- CP5 route/SEO/public capability authority;
- NM-03 taxonomy/geography/provenance authority;
- AG-06 authorization/security;
- CA-01 internal communications;
- COM-01 communications/provider hold;
- database migration ledger;
- storage custody.

## 6. Regression evidence obtained

On intermediate Phase 10 candidate `d5b28fe1b96c08a8ec710754b8d79d67bcfdd5ca`, the following exact-head PR workflows were green:

- Validate HealthTimes 2.0 — run `35866192979` — **SUCCESS**
- Chromium UAT — run `35866192946` — **SUCCESS**
- NM-07 Phase 6 Migrated Corpus Reader — run `35866193260` — **SUCCESS**
- AG-05 + NM-07 Phase 7 Premium + HOSPAZ — run `35866193415` — **SUCCESS**
- Unified Native certification — run `35866192840` — **SUCCESS**

That candidate also proved the original Home Hook-order crash was removed far enough for the browser to reach the hydrated Home and locate `Top Stories`.

The final runtime/test candidate `56e6809b...` contains only bounded follow-on public-copy/test corrections plus the same visual remediation architecture.

Exact final candidate Vercel preview creation is Git-integrated and target-null. The immediately preceding app-equivalent candidate `eec230f0af5a0afaf06c1ec579bb64be54906ac9` reached **READY** as deployment `dpl_EmNRWkCXaEivtFNRXP3n7Q2DavVJ`, target `null`. The primary staging alias remains unchanged on deployment `dpl_4xmfSenLQtJTQbNMpK7g3boFboaK`, SHA `4512b7d647eda850ec1e70ad440d459fbd1d82d0`.

## 7. Specific blocker

Two required gates are not green, so Phase 10 must not be marked complete:

1. **Web/PWA hydration:** exact-candidate browser evidence reached the repaired Home but emitted React minified error #418, meaning the server-rendered tree did not exactly match the initial client tree and React regenerated it. The Phase 10 evidence workflow now records this warning rather than disguising it as the original blank-Home crash, but the underlying hydration mismatch is not proven resolved.

2. **Final exact-head Native/visual matrix:** final-SHA runs for `56e6809b...` were queued/in progress when this lane was closed. The earlier exact candidate Native Binary run `35866193445` did not complete successfully; readiness passed but iOS/Android binary jobs were cancelled. A later unified Native run exposed stale test wording after the public-copy remediation; that test contract was corrected at `56e6809b...`, but the exact final matrix has not yet returned green.

Current final-SHA runs initiated for `56e6809b...` include:

- Phase 10 Candidate Visual Conformance — `35867494406`
- Phase 10 Visual Evidence — `35867494907`
- Validate HealthTimes 2.0 — `35867503361`
- Native Binary Certification — `35867503363`
- Unified Native Certification — `35867503393`
- NM-07 Phase 6 Migrated Corpus Reader — `35867503574`
- AG-05 + NM-07 Phase 7 Premium + HOSPAZ — `35867503607`
- Chromium UAT — `35867503652`

These runs are evidence-in-flight, not accepted certification receipts.

## 8. Safety / mutation receipt

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

## 9. Moderator handoff

The active implementation lane is closed. Re-open only for the bounded certification blocker:

- resolve or formally remediate the Web/PWA hydration mismatch;
- obtain green exact-head Phase 10 visual evidence plus Native Binary/Unified Native certification on one executable SHA;
- then update this receipt with the successful exact-head run/artifact IDs.

Do not redesign the Reader, reopen migration, alter Premium/HOSPAZ authority, move the primary staging alias, merge PR #28, or release Phase 11 as part of that certification remediation.

**PHASE 10 BLOCKED — Web/PWA hydration mismatch remains unresolved and final exact-head Native/visual certification is not green**
