# AG-07 — PHASE 12 LEGACY RETIREMENT + PRE-CP7 INTEGRATED UAT

Date: 2026-09-24

Repository: `kudzimusar/htp-zw`

Branch: `integration/ag07-phase12-legacy-retirement-precp7`

PR: `#29 — DRAFT / OPEN / UNMERGED`

Starting accepted Phase 11 runtime: `1da9aa95ed60e25a145c8446b23d0670d608fb52`

Starting Phase 11 documentation closure: `a2878abbacb8e5d108e023d828269efabc2219e4`

Phase 12 certified runtime: `f36d6336c65c598191ea2841952a8c9f18bcf57e`

Controlled Vercel preview: `dpl_FTzbVeYbBdGS3d3mYfErJkFXxUHF`

Preview URL: `https://healthtimes-staging-fkp5mx6uu-11-11.vercel.app`

Preview state: **READY / target:null / exact Git SHA matched**

## 1. Final disposition

`PHASE 12 COMPLETE — LEGACY PUBLIC UI RETIRED FROM ACTIVE SERVING/CERTIFICATION / SINGLE READER AUTHORITY PROVEN / PRE-CP7 INTEGRATED UAT GREEN`

This closes the technical Phase 0–12 frontend/convergence recovery programme only. It does not execute CP7, release AG-08, authorize production, merge PR #29, activate communications providers or submit native applications.

## 2. Public Reader authority

Canonical public presentation authority is:

`apps/mobile`

for Web, PWA, iOS and Android.

Vercel remains:

`"outputDirectory": "apps/mobile/dist"`

GitHub Pages now uploads only:

`apps/mobile/dist`

A repository-wide audit of all 17 workflow YAML files at the certified runtime found:

- active `path: .` publication: **0**
- active root `node --check app.js` product validation: **0**
- active direct invocation of `tests/uat.spec.js`, `tests/reader.spec.js` or `tests/mobile-quality.spec.js` as canonical UAT: **0**

Default product UAT is now:

`playwright test tests/phase12-canonical-uat.spec.js`

## 3. Legacy evidence retirement

The following root public presentation assets remain in the repository for historical/provenance evidence and are classified:

**LEGACY / SUPERSEDED / NON-SERVING EVIDENCE**

- `index.html`
- `article.html`
- `premium.html`
- `preferences.html`
- `about.html`
- `archive.html`
- `app.js`
- `reader.js`
- `v21.js`
- `styles.css`
- `v21.css`

They were not bulk-deleted.

Retirement action:

- repository evidence retained;
- root publication through Pages removed;
- root implementation validation removed from current product authority;
- old Playwright suites explicitly labeled legacy evidence and removed from default UAT;
- Phase 12 regression tests fail closed if root publication or canonical root-UI UAT returns.

Protected operational surfaces remain intentionally distinct:

- `newsroom.html`
- `newsroom.js`
- `newsroom.css`
- `api/newsroom.js`
- `api/discussion.js`
- `api/communications.js`

`prepare-phase4-vercel.js` copies Newsroom/protected operational assets but does not copy root `app.js`, `reader.js` or `v21.js` into canonical public output.

## 4. Exact files changed in runtime

- `.github/workflows/ag05-nm07-phase7-premium-hospaz.yml`
- `.github/workflows/ag06-security.yml`
- `.github/workflows/ag07-phase4-web-pwa.yml`
- `.github/workflows/ca01-communications.yml`
- `.github/workflows/migration-tests.yml`
- `.github/workflows/native-certification.yml`
- `.github/workflows/native-mobile.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/phase10-visual-conformance.yml`
- `.github/workflows/uat.yml`
- `.github/workflows/validate.yml`
- `apps/mobile/app/article/[id].tsx`
- `apps/mobile/package.json`
- `apps/mobile/tests/phase12-authority.test.mjs`
- `package.json`
- `scripts/web/phase12-live-smoke-server.js`
- `scripts/web/phase4-smoke-server.js`
- `tests/ag06-security-contract.spec.js`
- `tests/migration/ag07-phase12-dual-serving.spec.js`
- `tests/mobile-quality.spec.js`
- `tests/phase12-canonical-uat.spec.js`
- `tests/reader.spec.js`
- `tests/uat.spec.js`

Runtime delta from Phase 11 closure:

- ahead: 35
- behind: 0
- runtime files changed: 23

## 5. Bounded defects found and repaired

Phase 12 did not merely rename tests. Independent certification surfaced and corrected these bounded defects:

1. `scripts/web/phase4-smoke-server.js` live-CP5 mode called `webHandler` without importing it. The exact handler import was added.
2. Initial Pages simplification removed accepted source-parity safeguards. Exact-head deployment proof, CORS/source probe and deep-link fallback verification were restored without restoring root serving.
3. AG-06 Newsroom header certification depended on JSON whitespace. It now parses `vercel.json` structurally and verifies the header map.
4. Canonical Premium lock actions were visually present but not exposed as semantic buttons. `accessibilityRole="button"` and labels were added to “View Premium access” and “Member sign in”.

No Reader redesign was performed.

## 6. Dual-serving regression proof

Test:

`tests/migration/ag07-phase12-dual-serving.spec.js`

Exact-head Chromium UAT run `35949140664` passed the gate before browser UAT.

It proves:

1. Vercel output is `apps/mobile/dist`;
2. Pages cannot publish root `.`;
3. canonical validation does not execute root `app.js`;
4. canonical browser navigation does not use legacy root pages;
5. legacy root files remain present only as provenance;
6. Newsroom remains distinct and protected.

Historical URLs `/index.html`, `/article.html?...`, `/premium.html` and `/archive.html` are separately checked so they cannot leak `app.js`/`v21.js` or the retired legacy shell.

## 7. Canonical browser/UAT result

Canonical Chromium UAT:

- run: `35949140664`
- job: `107473665670`
- result: **SUCCESS — 7 / 7**
- EXPECTED_SHA: `f36d6336c65c598191ea2841952a8c9f18bcf57e`
- CHECKED_OUT_SHA: `f36d6336c65c598191ea2841952a8c9f18bcf57e`
- artifact: `10788536112 — phase12-canonical-reader-uat`
- digest: `sha256:1705faa110c726e8c3e9ceade41d0d697608d4ab31332588532808a0c2d79322`

Verified:

- Home at mobile 390×844, tablet 834×1112 and desktop 1440×1000;
- responsive overflow guard;
- mobile navigation present and desktop duplicated mobile tabs absent;
- HOSPAZ visible and non-clickable;
- Explore;
- Search;
- Live;
- Watch;
- Premium;
- My HealthTimes;
- recent migrated article;
- historical 2016 migrated article;
- Premium protected article;
- accepted one-hop legacy alias;
- category/context noindex behavior;
- explicit historical 404;
- unknown 404;
- PWA manifest;
- service-worker offline/failure shell contract;
- historical `.html` paths do not expose the retired root implementation.

The earlier UAT failure at candidate `d4cb447...` correctly exposed the missing Premium CTA accessibility role. The final runtime fixed the product, not the test.

## 8. CP5 / migrated corpus / SEO / Premium / HOSPAZ

AG-07 Phase 4 exact-head run:

- `35949140675` — **SUCCESS**
- read-only artifact `10788281105`, digest `sha256:63d72dc877b9a0fddf910d57206fdd09fdb9b838fb6ed433484f6bff64677782`
- browser/HTTP artifact `10788296615`, digest `sha256:7b0c5a7d8777e415441284edda3644bd6a952c158737cf11e97da178459beade`

NM-07 migrated-corpus run:

- `35949140630` — **SUCCESS**
- read-only artifact `10788425864`
- Reader artifact `10787129923`

Current exact-head invariants:

- sitemap URLs: **5,786**
- feed items: **50**
- representative public source: **30154 / public body available**
- Premium source: **33190 / bodyProtected=true / bodyExposed=false**
- HOSPAZ advertiser: **HOSPAZ**
- placement: `hospaz-header-direct`
- source attachment: **33005**
- destination: **UNKNOWN / null**
- schedule: **UNKNOWN / null**
- placement conditions: **UNKNOWN / null**

Premium/HOSPAZ run `35949140644`: **SUCCESS**.

Artifacts:

- `10788406063 — phase7-premium-hospaz-readonly-evidence`
- `10788490916 — phase7-premium-hospaz-reader-evidence`

## 9. Visual conformance

Phase 10 final Web/PWA evidence:

- run `35949140654`: **SUCCESS**
- artifact `10787614511`
- digest `sha256:ca08eaaeec6f6b77d0c33afd38366ebabafe8dcebe99cdb5c3e44ccec6f2f483`

Phase 10 candidate visual workflow `35949140627`:

- Web/PWA conformance job `107473760148`: **SUCCESS**
- artifact `10787428883`
- digest `sha256:3faf36547051486cf752ae4d33d82f6ccf2ddc7da6ed8704b9dc9fe8764a8e91`
- iOS simulator screenshot job: **SUCCESS**
- iOS screenshot artifact `10788677718`

The Web/PWA visual job proves mobile/tablet/desktop hydration, navigation separation and HOSPAZ non-clickability at the exact runtime. Native build authority is separately certified by Native Binary below.

## 10. Newsroom / security / communications

AG-06 Newsroom Security:

- run `35949140670`: **SUCCESS**
- contract: 6/6
- live staging: 7/7
- anonymous bootstrap: 401
- Reporter publish/escalation/ad-approval denials: 403
- Commercial editorial/publish denials: 403
- Editor final workflow: Published
- Publisher session revocation: PASS
- stale Reporter: 403
- cleanup: 4 temporary Auth users deleted; live sessions remaining 0

CA-01 Communications Security:

- run `35949140684`: **SUCCESS**
- initial live job cancellation was concurrency-only; the same exact-head live job was rerun after AG-06 cleanup
- contract: 7/7
- live staging: 1/1 comprehensive journey
- unrelated staff discussion: 403
- forged Inbox insert: 403
- anonymous Reader: 401
- restricted Reader: 403
- staff private Realtime: SUBSCRIBED
- Reader to private Newsroom: CHANNEL_ERROR / unauthorized
- eligible Reader comments: SUBSCRIBED
- cleanup: 9 Auth users, 3 Reader profiles, 1 comment and 1 report removed; live sessions remaining 0
- artifact `10788222446`
- digest `sha256:270f7e7c6e05184eb7bae95ff8b10d467aa50233826723e139b597f20d998b77`

COM-01 provider-independent:

- run `35949140642`: **SUCCESS**
- contract: 4/4
- disposable schema: PASS
- bounded staging contract: PASS
- inbound first/replay duplicate: false / true
- synthetic provider event first/replay: false / true
- NEWSLETTER consent eligible: true
- no-consent eligible: false
- marketing opted-out eligible: false
- security/transactional after marketing opt-out: true
- approved provider attempt with no provider configured: `unconfigured` fail-closed
- artifact `10787872542`
- digest `sha256:b3492685dbb85bb8b4e145e75993c06f54ea04a119b53076cd7cdd067a7e9a93`

No production Resend, Brevo or Cloudflare infrastructure was activated.

## 11. Native exact-head result

Unified Native Certification:

- run `35949140709`: **SUCCESS**
- EXPECTED_SHA = CHECKED_OUT_SHA = `f36d6336c65c598191ea2841952a8c9f18bcf57e`
- foundation/content/Reader/growth/security/source-parity/PWA export all green
- artifact `10787803347 — healthtimes-native-web-dist`
- digest `sha256:5762512d18ea8c2992d0f4bf34f885b8615cc537b0abf933f4293929e19634c7`

Native Binary Certification:

- run `35949140673`: **SUCCESS**
- readiness: PASS
- iOS simulator binary: PASS
- Android debug APK: PASS
- config artifact `10787733371`
- iOS artifact `10788351624`, digest `sha256:664ae62200ae11da5d1fb30134a3bf1562fa800ab62f91e6a4c1423886afaf96`
- Android artifact `10787923545`, digest `sha256:3a3048d0d864e70614c2f5b37dab3a01bfc5e988b61d09351d0ee33173a77c49`
- Android Gradle result: **BUILD SUCCESSFUL**

No NM-01 through NM-06 architecture was rebuilt.

## 12. Vercel candidate proof

Deployment:

`dpl_FTzbVeYbBdGS3d3mYfErJkFXxUHF`

Verified deployment metadata:

- project: `healthtimes-staging`
- Git branch: `integration/ag07-phase12-legacy-retirement-precp7`
- Git SHA: `f36d6336c65c598191ea2841952a8c9f18bcf57e`
- state: **READY**
- readyState: **READY**
- target: `null`
- source: `git`
- aliasError: `null`

The connected protected-preview fetch surface returns Vercel SSO 302 responses even when using generated share links, so direct body responses are **not fabricated**. Application behavior is instead independently proved against the exact exported runtime bundle wired to live read-only CP5 in the exact-head Chromium/Phase 4 workflows.

The primary staging alias remains on accepted Phase 11 deployment `dpl_27C7FyCLkwqm5CvEA8QaJuyuYHMv`. No Phase 12 alias movement was authorized or performed.

## 13. Fresh staging custody / cleanup

Post-certification read-only observation:

`2026-09-24 03:10:14.855919 UTC`

Observed:

- posts: **5,737**
- pages: **49**
- URL mappings: **5,786**
- media records: **3,277**
- sections: **83**
- tags: **10,283**
- authors: **3**
- migrated-media objects: **5,705**
- subscribers: **0**
- Premium entitlements: **0**
- Reader profiles: **0**
- story comments: **0**
- story comment reports: **0**
- communication threads/messages: **0 / 0**
- provider webhook events: **0**
- contact profiles/consents/suppressions: **0 / 0 / 0**

Phase 12 did not replay migrations, reset staging, rewrite the migration ledger or delete the accepted 2,430 stale migrated-media cleanup-debt objects.

AG-06/CA-01/COM-01 certification used their already accepted bounded staging fixtures and explicitly cleaned them. No migration/corpus/storage mutation was introduced by the Phase 12 convergence implementation.

## 14. Pre-CP7 gap reconciliation

Historical defect `PRECP7-P1-001` is **RESOLVED**.

It remains in older documents only as historical discovery evidence and must not be treated as current.

Current technical convergence defect count:

- P0: **0**
- P1: **0**
- P2: **0 new Phase 12 blockers**
- P3: **0 new Phase 12 blockers**
- P4: **0 new Phase 12 blockers**

Remaining non-convergence items:

### DEFERRED — EXTERNAL PROVIDER

- real HealthTimes staging Resend transactional send;
- genuine signed Resend webhook;
- Brevo real consent-eligible sync;
- Brevo unsubscribe/bounce/complaint;
- Cloudflare real inbound staging email;
- Cloudflare opaque Reply-To round trip;
- push provider;
- billing/provider;
- native advertising provider evidence.

### DEFERRED — PHYSICAL DEVICE / STORE

- physical-device UAT;
- store signing and store submission evidence.

### PENDING CLIENT UAT

- formal Michael Gwarisa client acceptance;
- client P0/P1 count.

### PENDING PRODUCTION / OWNER

- production backups;
- RPO/RTO;
- authoritative DNS/MX/SPF/DKIM/DMARC refresh;
- SSL/cutover proof;
- production routing;
- owner production authorization;
- AG-08 release;
- CP7 execution.

These deferred items are not reasons to restore the retired legacy Web UI.

## 15. Mutation receipt

Production deployment: **NO**

Production database/storage mutation: **NO**

Staging migration replay/reset: **NO**

Migration ledger rewrite: **NO**

Stale-media deletion: **NO**

Production DNS/MX: **NO**

Provider activation: **NO**

App-store submission: **NO**

PR merge: **NO**

AG-08: **NOT STARTED**

CP7: **NOT EXECUTED / NOT ACCEPTED**

Phase 12 runtime changes were bounded to serving/certification authority, test infrastructure and the discovered accessibility/import/header-test defects listed above.

## 16. Final programme state

One public Reader authority remains: `apps/mobile`.

The root legacy public UI is retained only as inspectable historical evidence and cannot independently become current Reader authority through the active Vercel, Pages, Validate or default UAT paths.

The special Phase 0–12 convergence recovery programme is technically complete at runtime `f36d6336c65c598191ea2841952a8c9f18bcf57e`.

Next programme work requires moderator release. Phase 12 does not independently begin CP7, AG-08, provider activation or production preparation.
