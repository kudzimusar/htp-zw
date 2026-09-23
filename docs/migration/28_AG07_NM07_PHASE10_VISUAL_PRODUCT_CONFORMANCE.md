# AG-07 + NM-07 Phase 10 — Visual / Product Conformance

## Final lane disposition

**PHASE 10 BLOCKED — final exact-head visual/native certification is incomplete**

The bounded visual/product remediation is complete, but Phase 10 is not marked accepted because the final executable candidate did not obtain the full exact-head evidence matrix required by the moderator assignment.

## 1. Authority and final candidate

- Repository: `kudzimusar/htp-zw`
- Certified Phase 9 executable baseline: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- Accepted Phase 9 closure: `86df1f08e0b3e578348227c30248e32437687352`
- Phase 9 PR #27: Draft / Open / Unmerged / Mergeable
- Phase 10 branch: `integration/ag07-nm07-phase10-visual-conformance`
- Final executable Phase 10 candidate: `8de6e4d62278b100cf9b93655841ec28ebdc059b`
- Phase 10 PR #28: Draft / Open / Unmerged / Mergeable
- Design authority: `docs/native-mobile/DESIGN.md`
- Expected wireframe: `docs/native-mobile/assets/HEALTHTIMES_NATIVE_WIREFRAME_V1.png`
- Wireframe repository custody: **ABSENT**
- Reconstructed/invented wireframe: **NO**

Interpretation priority remained security/authorization → accessibility → Master Plan → `DESIGN.md` → wireframe if later supplied → platform conventions → implementation judgment.

## 2. Before evidence captured before product remediation

### Web/PWA baseline

Primary source-parity baseline:

- run `35862974220`
- job `107187504110`
- result: **SUCCESS**
- checkout: `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`
- artifact: `phase10-before-web-pwa-screenshots`
- artifact ID: `10750654475`
- digest: `sha256:62f600bd3f0971ce1c5d5d49eef0526a53f1afe5ac1d3dc4593904bb2174b0a2`

Required responsive views included approximately 390×844 mobile, 834×1112 tablet and 1440×1000 desktop.

Secondary staging-service Web baseline:

- run `35862974381`
- job `107187477046`
- result: **SUCCESS**
- artifact ID: `10750239377`
- digest: `sha256:7e8d16722a3a370d2bc643f544f6437cccc991dff66489a1e8b577e75d85a3a7`

### iOS baseline

- run `35862974381`
- job `107187476871`
- result: **SUCCESS**
- artifact ID: `10751801648`
- digest: `sha256:42ce499381cf59dc8dbfa8c21a5d73e3e6bb48b54e93c4a3e460afc28b81c436`

### Android baseline

- run `35862974381`
- job `107187477151`
- result: **FAILURE during emulator preparation**
- artifact ID: `10752580996`
- digest: `sha256:51be63ed40e1eb31f43f165ac1ec2a08c12660482e3e7002f9b7c4abda720af4`

The Android failure occurred before the HealthTimes application could be visually evaluated.

## 3. Material gaps found and bounded remediation

| Gap | Baseline finding | Final Phase 10 remediation |
| --- | --- | --- |
| Home hydration | Home could render blank after async hydration because Hook order changed across loading/data states. | Removed the conditional Hook-order hazard in `apps/mobile/app/(reader)/index.tsx`. |
| Desktop navigation | Desktop masthead and mobile bottom tabs appeared together. | Desktop suppresses the mobile tab bar while preserving the five-destination mobile/native IA. |
| Premium discovery | Premium was not sufficiently discoverable in shared Reader chrome. | Added restrained Premium access in shared Reader header utilities. |
| Article taxonomy copy | Public article UI exposed migration-internal labels. | Removed migration-internal taxonomy labels while preserving source/domain data. |
| My HealthTimes | Reader exposed unsupported/internal readiness entries and Payment Methods. | Removed unsupported/internal controls and environment wording. |
| Onboarding | Full Reader chrome weakened the focused welcome composition. | Onboarding now renders with focused chrome disabled while preserving safe area/accessibility. |
| Explore language | Reader exposed `TAXONOMY GATEWAY`, `CANONICAL`, `LEGACY` and migration-facing headings. | Reworded to reader-facing editorial desks/topics/categories without changing taxonomy authority. |
| Listen language | Public UI described internal playback adapter/lane state. | Reworded unavailable/offline states for readers without inventing playback capability. |
| Notifications language | Public UI used “Notification authority” wording. | Reworded the public explanatory copy; notification authority itself is unchanged. |
| Premium public copy | Public screen exposed implementation/store configuration language. | Reworded to reader-facing membership/access copy while preserving configuration-required storefront truth. |

No unrelated feature work was added.

## 4. Exact files changed for product conformance

Executable/shared Reader changes:

- `apps/mobile/app/(reader)/index.tsx`
- `apps/mobile/app/(reader)/_layout.tsx`
- `apps/mobile/src/ui/Layout.tsx`
- `apps/mobile/app/article/[id].tsx`
- `apps/mobile/app/(reader)/my.tsx`
- `apps/mobile/app/onboarding.tsx`
- `apps/mobile/app/(reader)/explore.tsx`
- `apps/mobile/app/listen.tsx`
- `apps/mobile/app/notifications.tsx`
- `apps/mobile/app/premium.tsx`

Evidence/certification support:

- `apps/mobile/tests/phase10-visual-conformance.test.mjs`
- `.github/workflows/phase10-home-diagnostic.yml`
- `.github/workflows/phase10-visual-conformance.yml`
- `.github/workflows/phase10-visual-evidence.yml`
- `docs/migration/evidence/phase10/00_BASELINE_VISUAL_GAP_REGISTER.md`

## 5. What passed before the final executable changes

Candidate `d5b28fe1b96c08a8ec710754b8d79d67bcfdd5ca` had these exact-head successes:

- Validate HealthTimes 2.0 — run `35866192979` — **SUCCESS**
- Chromium UAT — run `35866192946` — **SUCCESS**
- NM-07 Phase 6 Migrated Corpus Reader — run `35866193260` — **SUCCESS**
- AG-05 + NM-07 Phase 7 Premium + HOSPAZ — run `35866193415` — **SUCCESS**
- Unified Native Mobile — run `35866192840` — **SUCCESS**

However, later executable/public-copy changes advanced the candidate from `d5b28fe1...` to `8de6e4d6...`. Those earlier successes therefore cannot be represented as exact-head certification of the final candidate.

## 6. Final-candidate exact-head status

Final executable candidate:

`8de6e4d62278b100cf9b93655841ec28ebdc059b`

Runs triggered for this SHA:

| Workflow | Run | Final observed state |
| --- | --- | --- |
| Validate HealthTimes 2.0 | `35867132588` | **SUCCESS** |
| Chromium UAT | `35867132563` | **CANCELLED** |
| Native Mobile unified | `35867132539` | **CANCELLED** |
| NM-07 Phase 6 Migrated Corpus Reader | `35867132560` | queued / not certified before closure |
| AG-05 + NM-07 Phase 7 Premium + HOSPAZ | `35867132585` | queued / not certified before closure |
| Native Binary Certification | `35867132660` | **CANCELLED** |
| Phase 10 Candidate Visual Conformance | `35867125460` | **CANCELLED** |
| Phase 10 Visual Evidence | `35867125494` | **CANCELLED** |

Because executable code changed after the previously green candidate, Phase 10 cannot reuse the earlier exact-head successes as final certification.

## 7. Web hydration issue found during candidate evidence

On the immediately preceding candidate `d5b28fe1...`, the exact-candidate Phase 10 Web visual job reached the remediated Home and found `Top Stories`, proving the original blank-Home Hook crash was no longer the same failure mode.

The job nevertheless reported:

- React minified error `#418`
- server/client hydration mismatch

That browser job did not finish a green exact-candidate screenshot matrix. The final `8de6e4d6...` candidate changed additional public Reader surfaces afterward and did not obtain a completed replacement visual run before closure.

Therefore the owner-facing exact-candidate evidence package is incomplete.

## 8. Authority invariants preserved

Phase 10 did not alter:

- migrated-corpus ownership;
- CP5 routing/SEO/public capability authority;
- Premium entitlement/protected-body authority;
- Premium storefront configuration truth;
- HOSPAZ provenance or commercial unknown-state semantics;
- AG-06 authorization;
- CA-01 communications;
- COM-01 communications;
- migration lineage;
- database schema;
- storage custody.

Premium remains fail-closed:

- no invented prices;
- no invented product IDs;
- no invented payment/subscriber state;
- protected body/offline rules unchanged.

HOSPAZ remains fail-closed:

- advertiser: `HOSPAZ`
- placement: `hospaz-header-direct`
- source attachment: `33005`
- destination: `null`
- destination state: `UNKNOWN`
- schedule: `UNKNOWN`
- placement conditions: `UNKNOWN`
- fabricated clickable destination: **NO**

## 9. Accessibility

The bounded changes preserve the accepted accessibility baseline:

- 44px-equivalent shared touch targets where applicable;
- semantic button/link roles;
- accessible labels;
- selected/disabled navigation state;
- existing live regions;
- legible shared palette/typography;
- no formal WCAG certification claim.

## 10. Deferred / unresolved product and evidence gaps

1. Approved wireframe PNG remains absent from repository custody.
2. Android baseline emulator screenshot capture failed during emulator preparation.
3. Final-candidate Web/PWA visual evidence is not green.
4. Final-candidate Native Binary certification is not green.
5. Final-candidate iOS/Android screenshot evidence is not complete.
6. A Web hydration mismatch (#418) remains to be independently reproduced/accepted or remediated.
7. No unavailable Live/audio/storefront/commercial data was invented.
8. Physical-device owner UAT remains outside this CI evidence.

## 11. Deployment / mutation receipt

- Production deployment: **NO**
- Primary staging alias movement: **NO**
- `healthtimes-staging.vercel.app` movement: **NO**
- Production database mutation: **NO**
- Migration replay/reset/ledger mutation: **NO**
- Storage cleanup: **NO**
- DNS/MX change: **NO**
- External communications-provider activation: **NO**
- Fake storefront configuration: **NO**
- App Store submission: **NO**
- Play Store submission: **NO**
- Legacy-root retirement: **NO**
- PR merge: **NO**
- AG-08: **NO**
- CP7 acceptance: **NO**
- Phase 11 release: **NO**

## 12. Closure decision

The product changes are bounded and evidence-backed, but the assignment explicitly requires the final executable candidate to have the integrated regression and visual/native evidence needed for owner acceptance.

That condition is not met.

Authoritative Phase 10 disposition:

`PHASE 10 BLOCKED — final exact-head visual/native certification is incomplete`

Moderator next action is limited:

1. re-run the required exact-head regression matrix against `8de6e4d62278b100cf9b93655841ec28ebdc059b`;
2. resolve or explicitly accept the React hydration mismatch after independent reproduction;
3. capture/accept the final Web/PWA + iOS + Android evidence;
4. only then return:
   `PHASE 10 VISUAL CONFORMANCE COMPLETE — READY FOR MODERATOR / OWNER REVIEW`.

**Phase 11 is not released.**
