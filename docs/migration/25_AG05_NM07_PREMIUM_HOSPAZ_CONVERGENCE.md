# AG-05 + NM-07 Phase 7 — Premium + HOSPAZ Product Convergence

## Disposition

**PHASE 7 COMPLETE — PREMIUM + HOSPAZ PRODUCT CONVERGENCE EXACT-HEAD CERTIFIED**

- Certified runtime: fb84b9e254af1f1fa84dab74c97b74ad2614a690
- Branch: integration/ag05-nm07-phase7-premium-hospaz
- Starting authority: c38c1a47f0feaed001a14e207ed573e8860489c3
- Draft PR: #25 — Draft / Open / Unmerged
- Documentation closure: this commit, exactly one documentation-only commit above the certified runtime

Phase 7 does not authorize production deployment, production backend switching, App Store submission, Play Store submission, production payment/store activation, production advertising activation, provider activation, database migration replay, storage cleanup, primary staging alias movement, DNS/MX changes, PR merge, or Phase 8 work.

## 1. Authority boundary

Phase 7 converges two established product capabilities into the canonical universal Reader:

1. Premium discovery and entitlement-gated Reader behavior.
2. HOSPAZ direct-ad presentation using the accepted CP5 provenance capability.

The accepted authority split is preserved:

- apps/mobile remains the canonical Reader presentation for Web/PWA/iOS/Android.
- CP5 remains routing, SEO and public-capability authority.
- AG-04 remains migration/media/taxonomy custody authority.
- AG-06 remains Newsroom/auth/RBAC authority.
- CA-01 remains internal communications authority.
- COM-01 remains communications/provider authority.

No parallel commerce system, ad campaign registry, entitlement database, payment provider, subscription provider, or advertising provider was created.

## 2. Runtime lineage

The Phase 7 branch was created exactly from c38c1a47f0feaed001a14e207ed573e8860489c3.

Certified runtime lineage is five commits ahead and zero behind:

1. 5a40a160e8c5551f6f7006cb2281785267b7e0e1 — feat(phase7): converge Premium and HOSPAZ Reader semantics
2. 06d962ef2d152dea8bb7f3ecceddcb940fd18aab — fix(phase7): match accepted CP5 HOSPAZ capability metadata
3. ae9857dae8c853d3afbe34f3f9fc0f799f35bb31 — fix(phase7): complete Premium lock action styles
4. b9208c955e5c7befc2a58b11263ff4a60aad9429 — fix(phase7): preserve Phase 6 Premium offline contract
5. fb84b9e254af1f1fa84dab74c97b74ad2614a690 — fix(phase7): preserve accepted Reader Premium contract copy

Earlier candidates were intentionally superseded after CI exposed bounded compatibility defects. No failed candidate is used as acceptance evidence.

## 3. Files changed in the certified runtime

Exactly 11 files differ from the accepted Phase 6 closure:

- .github/workflows/ag05-nm07-phase7-premium-hospaz.yml
- apps/mobile/app/(reader)/index.tsx
- apps/mobile/app/article/[id].tsx
- apps/mobile/app/premium.tsx
- apps/mobile/package.json
- apps/mobile/src/domain/models.ts
- apps/mobile/src/growth/direct-ad.ts
- apps/mobile/src/services/migrated-corpus.ts
- apps/mobile/src/services/reader-persistence.ts
- apps/mobile/src/ui/Cards.tsx
- apps/mobile/tests/premium-hospaz-convergence.test.mjs

No Supabase migration file changed. No AG-06, CA-01, or COM-01 runtime file changed. No Vercel routing/configuration file changed. No production configuration or provider configuration changed.

## 4. Premium convergence

### Discovery

Premium visibility remains driven by the authoritative Reader accessPolicy signal. Phase 7 preserves Premium badges on Premium stories, Premium discovery on Home, and Premium landing-page story discovery. No independent Premium content registry was introduced.

### Entitlement handling

The Reader continues to consume the existing PremiumService boundary:

- hasEntitlement()
- getProtectedArticle(articleId)

The Article Reader requests protected Premium content only after hasEntitlement() === true.

If entitlement is absent or unresolved:

- the public Premium story remains body-protected;
- no protected body is requested;
- the Reader presents a member-access path;
- no subscriber/payment state is inferred.

The current staging service does not fabricate subscriber entitlement. Phase 7 does not claim live paid-member commerce.

### Premium reference record

Read-only staging recheck for WordPress source 33190:

- access policy: premium_marker_review
- source/newsroom body preserved: 10,701 characters
- CP5 public body: null
- Reader public body exposure: none
- protection status: PRESERVED

### Offline protection

Phase 7 protects Premium offline content at two layers:

1. the Article screen refuses Premium offline download;
2. reader-persistence.ts independently refuses persistence of any accessPolicy === "premium" article.

The accepted Phase 6 user-facing contract text remains present for compatibility.

### Storefront truth boundary

The existing Premium Store boundary remains fail-closed:

- storefront state: configuration-required
- offers: []
- iOS monthly product ID: null
- iOS yearly product ID: null
- Android monthly product ID: null
- Android yearly product ID: null

No price, product identifier, successful subscription, renewal, payment, subscriber state, or provider configuration is invented. The UI withholds plan/price/product information until a platform returns verified products.

## 5. HOSPAZ direct-ad convergence

### Accepted source of truth

Phase 7 consumes the already-live CP5 function ag05_hospaz_direct_ad_preview. It does not create a second HOSPAZ campaign registry.

A portable Reader projection in apps/mobile/src/growth/direct-ad.ts is tested for structural equivalence to the accepted CP5 buildHospazCapability semantics.

### Live read-only HOSPAZ facts

HealthTimes Staging returns:

- advertiser: HOSPAZ
- campaign label: HOSPAZ source continuity
- placement key: hospaz-header-direct
- placement status: bound_rehearsal
- current source attachment: 33005
- current media ID: 5952595d-76c0-4fb3-9d9a-3a0821596137
- current migrated-media storage object: wordpress/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg
- source URL: https://healthtimes.co.zw/wp-content/uploads/2025/11/HOSPAZ-hospice-and-palliative-care-assosciation-of-zimbabwe-annual-general-meeting-25-september-2026.jpeg
- default source: direct
- allowed sources: direct, none
- destination URL: null
- destination state: UNKNOWN
- schedule state: UNKNOWN
- placement-conditions state: UNKNOWN
- Ad Inserter placement: false
- standalone campaign register found: false

### Reader presentation behavior

The canonical shared AdSlot now:

- renders the accepted migrated creative when a verified CP5 direct-ad capability exists;
- identifies the placement as advertising/direct advertising;
- remains non-personalized;
- does not infer schedule or placement conditions;
- creates a link only when a verified HTTPS destination is present;
- emits ad_click only behind that verified destination guard;
- emits only non-sensitive placement-level ad analytics metadata.

Because the current HOSPAZ destination state is UNKNOWN and destination URL is null, the current HOSPAZ creative is non-clickable.

The fixed HOSPAZ placement is demonstrated in staging Reader Home. This is a staging product-convergence proof, not production campaign activation.

## 6. Sensitive-health advertising boundary

The accepted health-ad safety behavior remains intact:

- sensitive-health context is passed to the advertising service;
- personalized advertising remains disabled for this path;
- Phase 7 analytics contain placement/surface/source metadata only;
- no diagnosis, disease, medication, patient, prescription, symptom, or medical-record attribute is introduced into ad analytics;
- no targeting profile or inferred health segment is created.

## 7. Read-only staging custody recheck

Project: gcdohgbmqhqwydgaxrcr

| Invariant | Result |
| --- | ---: |
| migration ledger rows | 43 |
| migrated published posts | 5,737 |
| migrated published pages | 49 |
| total migrated public objects | 5,786 |
| URL mappings | 5,786 |
| migrated-media records | 3,277 |
| canonical media records with storage key | 3,275 |
| storage objects in migrated-media | 5,705 |
| preserved stale wordpress/uploads/... objects | 2,430 |
| required CP5 public functions | 6 / 6 |

A broad unmatched-storage query returns 2,431 because the bucket also contains the folder marker wordpress/. The accepted stale-object invariant is specifically the 2,430 preserved wordpress/uploads/... objects; there is no custody drift.

No database mutation, migration replay, storage mutation, stale-object deletion, or cleanup occurred.

## 8. Phase 7 dedicated exact-head certification

Workflow: **AG-05 + NM-07 Phase 7 Premium + HOSPAZ**

Run 35850716451 — **SUCCESS**

Certified SHA: fb84b9e254af1f1fa84dab74c97b74ad2614a690

| Job | Job ID | Result |
| --- | ---: | --- |
| Premium + HOSPAZ convergence and regression matrix | 107147485692 | SUCCESS |
| Read-only Premium + HOSPAZ staging authority | 107147486011 | SUCCESS |

Both jobs proved:

EXPECTED_SHA=fb84b9e254af1f1fa84dab74c97b74ad2614a690

CHECKED_OUT_SHA=fb84b9e254af1f1fa84dab74c97b74ad2614a690

Dedicated acceptance counts:

- Phase 7 Premium + HOSPAZ: 12 / 12 PASS
- live read-only Premium + HOSPAZ: 12 / 12 PASS
- inherited Phase 6 migrated-corpus matrix: 14 / 14 PASS
- Phase 7 browser smoke: 2 / 2 PASS

The convergence job also passed all Reader/growth/native contract groups, CP5/adjacent security contracts, Web/PWA build, and raw HTTP/SEO proof.

Artifacts:

- phase7-premium-hospaz-reader-evidence
  - artifact ID: 10745695772
  - digest: sha256:023762505258d0f0015abb79da480924f5ea0b596792ccb086a851a851b3883f
- phase7-premium-hospaz-readonly-evidence
  - artifact ID: 10745615344
  - digest: sha256:24113fa663b1d5a073bb982c3dd42636eb06203ea28e85b5bcea534845b2d930

## 9. Required regression matrix at the same exact head

Every acceptance workflow below checked out and certified fb84b9e254af1f1fa84dab74c97b74ad2614a690.

### Validate HealthTimes 2.0

- run: 35850716480
- job: 107147471679
- result: SUCCESS
- exact-head proof: PASS

### Chromium UAT

- run: 35850716460
- job: 107147552346
- result: SUCCESS
- exact-head proof: PASS
- Chromium: 90 PASS, with the repository expected skip set unchanged
- artifact: healthtimes-playwright-report
- artifact ID: 10745207768
- digest: sha256:131783db8fada8fbfcf036e3462f74f03bbb8317b25efa1aeff5c8a1b9db7203

### Native Mobile unified certification

- run: 35850716456
- job: 107147471466
- result: SUCCESS
- exact-head proof: PASS

The unified native job passed:

- NM-01/NM-02 foundation integrity
- live HealthTimes Staging connectivity
- NM-03 content contracts
- NM-04 Reader product hardening
- NM-05 growth/commercial safety
- NM-06 identity/Studio security
- NM-07 certification readiness
- read-only source-parity bridge
- universal Web/PWA export and PWA verification

Artifact:

- healthtimes-native-web-dist
- artifact ID: 10745411882
- digest: sha256:8731c94f46979178821b01437740dc656526e02adce1b6aecba45846ed1a8f16

### NM-07 Phase 6 migrated-corpus regression

- run: 35850716457
- result: SUCCESS
- 107147471544 — Read-only staging corpus and CP5 invariants — SUCCESS
- 107147471808 — Migrated corpus Reader convergence — SUCCESS
- exact-head proof: PASS in both jobs
- Phase 6 migrated-corpus suite: 14 / 14 PASS
- Phase 6 browser smoke: 2 / 2 PASS

Artifacts:

- nm07-phase6-reader-evidence
  - ID: 10745387195
  - digest: sha256:fe8c1482aadf7d54156850c1a31e51c22d3ebfffca9dcfba75cdf3927eebc228
- nm07-phase6-readonly-staging-evidence
  - ID: 10744868364
  - digest: sha256:a70308abe1d032e4f6c81876acbbd1ee964f21d822294e15e3144319bdd3aaa9

### Native Binary Certification

- run: 35850716548
- result: SUCCESS
- 107147564167 — readiness — SUCCESS
- 107147564487 — Android debug binary — SUCCESS
- 107147564542 — iOS Simulator binary — SUCCESS
- exact-head proof: PASS in all three jobs
- Android: BUILD SUCCESSFUL
- iOS: BUILD SUCCEEDED

Artifacts:

- healthtimes-native-config-matrix
  - ID: 10744734138
  - digest: sha256:f2fff433bac0a4f9a56fc70ec42942ddc4154900f50d54caadea2127938b7483
- healthtimes-android-debug-apk
  - ID: 10745863840
  - digest: sha256:4ddc22f9f1cdb52510461342765e1b8d779e8d85a9bb45a8b2fc4caafc0a0aa7
- healthtimes-ios-simulator-app
  - ID: 10746122811
  - digest: sha256:955f031a611c9f7db940b494ad7a35b8a11b2cade55f2083ae2fae5f60a21e89

The debug APK and simulator app are certification artifacts only. They are not store-submission or production-release artifacts.

## 10. Remediation history

Phase 7 was not declared complete on first implementation.

### Initial candidate 5a40a160...

CI exposed:

- missing Article Reader styles;
- portable HOSPAZ projection missing accepted CP5 metadata fields.

These were fixed without weakening tests.

### Candidate ae9857da...

The new Phase 7 suite passed, but inherited Phase 6 rejected a changed exact Premium offline warning phrase.

The accepted Phase 6 text contract was restored while the stronger persistence-level Premium rejection remained.

### Candidate b9208c95...

Phase 6 was restored, but NM-04 Reader hardening rejected changed accepted Premium member copy.

The accepted Reader phrase was restored without removing the entitlement-gated protected-body path.

### Final candidate fb84b9e254af1f1fa84dab74c97b74ad2614a690

All dedicated and inherited certification gates passed.

No failing candidate is represented as certified.

## 11. Vercel / deployment boundary

No Phase 7 code changed Vercel configuration and no primary staging alias was moved.

The primary alias healthtimes-staging.vercel.app remained on:

- deployment: dpl_4xmfSenLQtJTQbNMpK7g3boFboaK
- branch: migration/ag-02-staging-platform
- SHA: 4512b7d647eda850ec1e70ad440d459fbd1d82d0
- target: production within the staging project

The existing Vercel Git integration automatically created unaliased preview deployments for Phase 7 branch pushes. The final runtime preview for fb84b9e254af1f1fa84dab74c97b74ad2614a690 is:

- deployment: dpl_4CBFJ659dubnCsATFA6WZJ1tuhYS
- target: null
- URL: healthtimes-staging-doi9ik3ey-11-11.vercel.app

This did not move the primary staging alias and is not a production deployment.

## 12. Governance / mutation receipt

Phase 7 did not:

- replay, repair, import, push, reset, or mutate migrations;
- mutate HealthTimes Staging database content;
- mutate or clean storage;
- delete the 2,430 preserved stale wordpress/uploads/... objects;
- change CP5 database functions;
- change AG-06 authority;
- change CA-01 authority;
- change COM-01 authority;
- configure live payment/subscription products;
- configure live advertising provider accounts;
- invent HOSPAZ destination, schedule, placement conditions, targeting, or campaign dates;
- invent Premium price, product IDs, entitlement, payment, subscriber, renewal, or purchase state;
- move healthtimes-staging.vercel.app;
- deploy production;
- merge PR #25;
- start Phase 8.

## 13. PR state

Phase 7 PR #25 targets integration/nm07-phase6-migrated-corpus-reader.

At runtime certification:

- Draft: YES
- Open: YES
- Merged: NO
- Runtime head: fb84b9e254af1f1fa84dab74c97b74ad2614a690
- Base: c38c1a47f0feaed001a14e207ed573e8860489c3

The documentation closure intentionally advances the PR head by one documentation-only commit while preserving fb84b9e254af1f1fa84dab74c97b74ad2614a690 as the certified runtime parent.

## 14. Deferred / explicitly unresolved

Premium:

- live product identifiers;
- live prices;
- App Store / Play Store subscription product configuration;
- payment-provider wiring;
- authoritative live subscriber/entitlement backend beyond the existing fail-closed service boundary;
- Premium offline entitlement policy;
- production purchase/restore validation.

HOSPAZ:

- destination URL;
- campaign schedule;
- placement conditions;
- targeting rules;
- production activation decision;
- standalone campaign register.

Programme:

- production deployment;
- production backend switch;
- production provider activation;
- physical-device owner UAT where separately required;
- store submission;
- Phase 8.

## 15. Final acceptance matrix

- starts exactly from accepted Phase 6 closure: YES
- canonical apps/mobile Reader preserved: YES
- Premium discovery improved: YES
- entitlement-gated protected-body request implemented: YES
- public Premium body remains fail-closed: YES
- Premium offline persistence protected: YES
- no invented prices/product IDs/subscriber/payment state: YES
- CP5 HOSPAZ capability reused: YES
- accepted HOSPAZ creative shown in shared Reader: YES
- destination remains null/UNKNOWN: YES
- schedule remains UNKNOWN: YES
- placement conditions remain UNKNOWN: YES
- ad click impossible without verified destination: YES
- non-personalized sensitive-health ad boundary preserved: YES
- Phase 6 migrated-corpus regression green: YES
- CP5/AG-06/CA-01/COM-01 contract regression green: YES
- Web/PWA browser smoke green: YES
- unified native certification green: YES
- Chromium UAT green: YES
- Android binary certification green: YES
- iOS Simulator binary certification green: YES
- exact-head proof across acceptance jobs: YES
- database/storage mutation: NO
- primary staging alias moved: NO
- production deployed: NO
- PR merged: NO

**PHASE 7 FINAL EXACT-HEAD CERTIFIED — READY FOR MODERATOR / DOWNSTREAM AGENT CONTINUATION.**
