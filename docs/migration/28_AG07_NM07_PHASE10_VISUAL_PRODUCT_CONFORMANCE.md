# AG-07 + NM-07 Phase 10 — Visual / Product Conformance

## Final lane disposition

**PHASE 10 BLOCKED — BOUNDED PRODUCT REMEDIATION COMPLETE; FINAL EXACT-HEAD VISUAL/NATIVE EVIDENCE NOT GREEN**

This is the final Phase 10 closure receipt for moderator / owner re-audit. The Reader/product remediation is complete and frozen. The lane is closed as **BLOCKED**, rather than falsely claiming visual acceptance, because the exact-candidate Web/PWA visual harness still reports a React hydration mismatch and the final Native Binary/native-screenshot evidence did not complete cleanly before branch closure.

Phase 11 remains **NOT RELEASED**.

## 1. Authority and final runtime

- Repository: `kudzimusar/htp-zw`
- Accepted Phase 9 executable baseline: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- Accepted Phase 9 documentation closure: `86df1f08e0b3e578348227c30248e32437687352`
- Phase 9 PR #27: **Draft / Open / Unmerged / Mergeable**
- Phase 10 branch: `integration/ag07-nm07-phase10-visual-conformance`
- **Final Phase 10 Reader/product runtime:** `2c8b64ec835d998c9fa37a80b651a02dab4087cc`
- Later commits above `2c8b64ec...` changed only Phase 10 CI/evidence/tests/docs; they did **not** change Reader/product runtime.
- Phase 10 PR #28: **Draft / Open / Unmerged / Mergeable**
- Design authority: `docs/native-mobile/DESIGN.md`
- Expected wireframe: `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`
- Wireframe repository custody: **ABSENT**
- Missing wireframe reconstructed or inferred: **NO**

Interpretation order remains:

security / authorization → accessibility → Master Plan functionality → `DESIGN.md` → approved wireframe if later recovered → platform conventions → implementation judgment.

## 2. Before evidence captured before remediation

The baseline evidence jobs checked out the frozen Phase 9 executable directly, so Phase 10 changes could not contaminate the “before” state.

### Web/PWA baseline

- Workflow: `Phase 10 Visual Evidence`
- Run: `35862974220`
- Job: `107187504110 — Before — certified Web/PWA visual baseline`
- Result: **SUCCESS**
- Exact checkout: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- Artifact: `phase10-before-web-pwa-screenshots`
- Artifact ID: `10750654475`
- Digest: `sha256:62f600bd3f0971ce1c5d5d49eef0526a53f1afe5ac1d3dc4593904bb2174b0a2`

The artifact contains representative Reader captures at:

- mobile: 390 × 844
- tablet: 834 × 1112
- desktop: 1440 × 1000

and includes Home, Explore, Search, Live, Watch, My HT, Premium, Saved, Edition, Notifications, Listen, Onboarding and Studio.

### Secondary staging-service Web baseline

- Run: `35862974381`
- Job: `107187477046 — Baseline Web PWA visual capture`
- Result: **SUCCESS**
- Artifact ID: `10750239377`
- Digest: `sha256:7e8d16722a3a370d2bc643f544f6437cccc991dff66489a1e8b577e75d85a3a7`

### iOS baseline

- Run: `35862974381`
- Job: `107187476871 — Baseline iOS Simulator visual capture`
- Result: **SUCCESS as CI job**
- Artifact ID: `10751801648`
- Digest: `sha256:42ce499381cf59dc8dbfa8c21a5d73e3e6bb48b54e93c4a3e460afc28b81c436`

The captured simulator image showed the Expo/React Native “No script URL provided” screen because the debug simulator app was launched without a packager/embedded JS bundle. Therefore this artifact is evidence of the **capture-harness limitation**, not valid Reader visual acceptance.

### Android baseline

- Run: `35862974381`
- Job: `107187477151 — Baseline Android emulator visual capture`
- Result: **FAILURE during emulator preparation**
- Artifact ID: `10752580996`
- Digest: `sha256:51be63ed40e1eb31f43f165ac1ec2a08c12660482e3e7002f9b7c4abda720af4`

The Android failure occurred before application visual review and is not evidence of a Reader runtime defect.

## 3. Baseline gaps and bounded disposition

| Surface | Baseline finding | Final Phase 10 disposition |
| --- | --- | --- |
| Home | Blank after hydration; conditional Hook-order defect | **REMEDIATED** |
| Desktop navigation | Desktop masthead plus mobile five-tab bar both visible | **REMEDIATED** |
| Shared Reader shell | Premium discovery too weak | **REMEDIATED** |
| Explore | Reader-facing structure existed but exposed internal taxonomy language | **REMEDIATED** |
| Intelligent Search | Dedicated search, filters, no fabricated AI answer UI | **PRESERVED** |
| Article Reader | Migration/internal taxonomy labels visible | **REMEDIATED** |
| Live | Honest no-Live state; no fabricated inventory | **PRESERVED** |
| Watch | First-class image-forward surface when authoritative media is present | **PRESERVED** |
| Listen | Dedicated surface, but no authoritative playback/audio inventory | **COPY REMEDIATED; PLAYBACK DEFERRED** |
| Saved / Offline | Saved/download/history distinct; Premium offline body protected | **PRESERVED** |
| My HealthTimes | Internal/readiness and unsupported payment affordances exposed | **REMEDIATED** |
| Country / Edition | Edition and followed geography distinct | **PRESERVED** |
| Premium | Commerce fail-closed; reader copy/discovery needed polish | **DISCOVERY/COPY REMEDIATED; COMMERCE PRESERVED** |
| HOSPAZ | Direct-ad placement governed; destination null/UNKNOWN | **PRESERVED** |
| Notifications | Lightweight list/filter surface; implementation wording present | **COPY REMEDIATED** |
| Onboarding | Full Reader chrome weakened welcome flow | **REMEDIATED** |
| Studio/Admin | Operationally distinct; server authorization preserved | **PRESERVED** |

## 4. Bounded runtime changes

Final Reader/product runtime `2c8b64ec835d998c9fa37a80b651a02dab4087cc` contains only the Phase 10 visual/product remediation set.

### Home / navigation

- `apps/mobile/app/(reader)/index.tsx`
  - removes the conditional React Hook-order hazard that caused blank Home after async hydration;
  - retains the accepted editorial/data/source authority.

- `apps/mobile/app/(reader)/_layout.tsx`
  - suppresses the mobile bottom tab bar at desktop width;
  - preserves Home / Explore / Live / Watch / My HT on mobile/native.

- `apps/mobile/src/ui/Layout.tsx`
  - adds restrained Premium discovery in shared Reader chrome;
  - permits focused chrome suppression for onboarding;
  - preserves shared responsive/accessibility primitives.

### Reader-facing language / hierarchy

- `apps/mobile/app/(reader)/explore.tsx`
  - removes migration/domain-model terminology from ordinary Reader presentation while retaining accepted taxonomy data.

- `apps/mobile/app/article/[id].tsx`
  - removes public migration-internal taxonomy labels without changing article/provenance/Premium authority.

- `apps/mobile/app/(reader)/my.tsx`
  - removes unsupported Payment Methods and internal readiness/system entries from ordinary Reader UI;
  - keeps truthful membership/account/security controls.

- `apps/mobile/app/premium.tsx`
  - makes unavailable/member-access states publication-facing;
  - retains fail-closed commerce and never invents price/product/payment state.

- `apps/mobile/app/listen.tsx`
  - removes implementation-adapter wording while retaining truthful playback unavailability.

- `apps/mobile/app/notifications.tsx`
  - removes implementation/authority wording from normal Reader copy.

- `apps/mobile/app/onboarding.tsx`
  - presents the welcome flow without full Reader utility chrome.

No migrated-corpus, database, storage, Premium entitlement, HOSPAZ commercial, AG-06, CA-01, COM-01 or Studio authorization semantics were redesigned.

## 5. Certification evidence obtained

An exact-candidate certification wave against `d5b28fe1b96c08a8ec710754b8d79d67bcfdd5ca` completed the following successfully before the later reader-copy-only refinements:

| Workflow | Run | Result |
| --- | --- | --- |
| Validate HealthTimes 2.0 | `35866192979` | **SUCCESS** |
| Chromium UAT | `35866192946` | **SUCCESS** |
| Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification | `35866192840` | **SUCCESS** |
| NM-07 Phase 6 Migrated Corpus Reader | `35866193260` | **SUCCESS** |
| AG-05 + NM-07 Phase 7 Premium + HOSPAZ | `35866193415` | **SUCCESS** |

Those runs prove that the core Phase 10 Home/navigation/remediation set did not break the accepted Reader, migrated-corpus, CP5, AG-06/CA-01/COM-01 contract coverage, Premium/HOSPAZ convergence or universal Native source.

After `d5b28fe...`, the remaining executable changes through final product runtime `2c8b64ec...` were bounded reader-facing copy/label changes in Explore, Premium, Listen and Notifications plus conformance-test expansion. CI was repeatedly cancelled/restarted by subsequent evidence-workflow commits, so there is **no single all-green exact-head workflow matrix at `2c8b64ec...`**. This is the certification blocker and is not hidden.

## 6. Required gates not green

### Web/PWA visual exact-candidate gate

The dedicated Phase 10 candidate Web capture reached the remediated Home and found `Top Stories`, proving the original blank-Home Hook failure was removed. It then reported:

- React minified hydration warning `#418`
- server/client hydration mismatch

This is not the original Home crash, but it remains an unresolved Web/PWA conformance signal. Phase 10 does not silently waive it.

### Native Binary / native screenshot gate

A Native Binary run on an intermediate exact candidate had:

- readiness: **SUCCESS**
- iOS Simulator binary: **CANCELLED**
- Android debug binary: **CANCELLED**

The cancellation was caused by branch/head churn while evidence-workflow commits were being added, not by a recorded binary-build failure. Nevertheless, it is not a green exact-head binary receipt.

Native screenshot evidence is also not acceptable as final visual proof:

- baseline iOS screenshot harness launched a debug app without a script URL;
- baseline Android emulator preparation failed;
- later candidate native visual jobs were repeatedly cancelled/restarted by workflow-only commits.

Accordingly, Phase 10 does **not** claim native visual acceptance.

## 7. Premium / HOSPAZ truth preserved

Premium remains fail-closed:

- storefront authority: configuration-required
- offers: none unless platform returns verified products
- invented product IDs: **NO**
- invented prices: **NO**
- invented subscriber/payment state: **NO**
- protected Premium body relaxation: **NO**
- unauthorized Premium offline persistence: **NO**

HOSPAZ remains fail-closed:

- advertiser: `HOSPAZ`
- placement: `hospaz-header-direct`
- source attachment: `33005`
- destination: `null`
- destination state: `UNKNOWN`
- schedule: `UNKNOWN`
- placement conditions: `UNKNOWN`
- fabricated click destination: **NO**

## 8. Accessibility and responsive preservation

The bounded work preserves the accepted accessibility baseline:

- shared minimum touch-target token retained;
- semantic button/link roles retained;
- header actions remain labeled;
- navigation selected/disabled state ownership retained;
- existing live-region behavior retained;
- no formal WCAG certification is claimed.

Responsive intent remains:

- mobile: five-destination bottom navigation;
- tablet: expanded density/gutters without desktop duplication;
- desktop: editorial masthead/navigation without mobile bottom tabs.

The missing approved wireframe PNG prevents pixel-level owner-board comparison and remains a repository-custody gap, not something Phase 10 may reconstruct.

## 9. Deferred / unresolved items

The following remain explicitly unresolved rather than fabricated:

1. approved wireframe PNG is absent from repository custody;
2. React hydration warning #418 needs moderator disposition or focused framework remediation;
3. one clean Native Binary exact-head run is still required for technical certification;
4. one valid native visual capture path is still required if native screenshot evidence is mandatory;
5. authoritative audio/playback inventory remains unavailable;
6. Live inventory remains unavailable;
7. storefront product/price/payment state remains unavailable;
8. HOSPAZ destination/schedule/placement conditions remain UNKNOWN/null;
9. physical-device owner UAT remains outside this CI lane.

## 10. Mutation / deployment receipt

- Production deployment: **NO**
- Primary staging alias movement: **NO**
- Production database mutation: **NO**
- Staging migration replay/reset/ledger mutation: **NO**
- Storage cleanup: **NO**
- DNS/MX change: **NO**
- Communications-provider activation: **NO**
- Fake storefront configuration: **NO**
- App Store submission: **NO**
- Play Store submission: **NO**
- Legacy-root retirement: **NO**
- PR #27 merge: **NO**
- PR #28 merge: **NO**
- AG-08: **NO**
- CP7 acceptance: **NO**
- Phase 11 released: **NO**

## 11. Moderator handoff

The product remediation itself is complete and should **not** be reopened wholesale.

Moderator re-audit should focus only on:

1. the React hydration #418 disposition;
2. one clean Native Binary exact-head run;
3. native screenshot evidence only if the moderator still requires CI-native visual proof;
4. confirmation that the final Reader/product runtime remains `2c8b64ec835d998c9fa37a80b651a02dab4087cc` with later commits limited to tests/docs/evidence automation.

Final lane disposition:

`PHASE 10 BLOCKED — BOUNDED PRODUCT REMEDIATION COMPLETE; FINAL EXACT-HEAD VISUAL/NATIVE EVIDENCE NOT GREEN`

**Phase 11 is not released.**
