# AG-07 — PRE-CP7 INTEGRATED PRODUCT/UAT READINESS RECEIPT

Date: 2026-09-22

Repository: `kudzimusar/htp-zw`

## 1. Candidate identity

Preparation branch:

`uat/ag07-pre-cp7-integrated-product`

Tested candidate/runtime SHA:

`5b6fca0fe1dceed5e167b845e023dfc456c47040`

Frozen pre-COM integrated ancestor:

`0112c8802d220d23e20288783536f22e85ea346d`

Ancestry verification:

- `5b6fca0...` is 9 commits ahead of `0112c880...`;
- 0 commits behind;
- merge base is exactly `0112c880...`.

No runtime changes were made on the preparation branch. All AG-07 changes are documentation/evidence only.

## 2. Exact deployment / preview tested

HealthTimes Staging project:

- Vercel project: `healthtimes-staging`
- project ID: `prj_52i0Btvqk2slEnaj5bL0CjOX1AqN`
- team: `Eleven-11-Tech`
- team ID: `team_InL2Jmsg4dbG0rFY8nxriTha`

Exact COM runtime deployment:

- deployment ID: `dpl_6wR4FzNhwsBGogaCogeV6Uvszq5z`
- preview: `https://healthtimes-staging-b9t0k3j4f-11-11.vercel.app`
- state: **READY**
- deployment Git SHA: `5b6fca0fe1dceed5e167b845e023dfc456c47040`

The preview is Vercel-auth protected. Exact-head workflow/browser evidence is therefore the principal UAT evidence for private/live role flows.

The primary alias `healthtimes-staging.vercel.app` was **not reassigned**.

## 3. Critical non-provider integrated defect

ID: **PRECP7-P1-001**

Severity: **P1**

Classification: **cross-lane integration/runtime defect**

The accepted CP5 public-route/SEO runtime is not incorporated into the tested integrated COM candidate.

Accepted CP5 runtime:

`0ba7240d018efa2472a00f56453e9aa8be34e1c5`

Git ancestry result:

- `0ba7240d...` and `5b6fca0...` are **diverged**;
- common merge base: `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`;
- the CP5 side contains 75 commits not present on the tested COM line.

This is materially confirmed by the candidate tree. At `5b6fca0...`, the following accepted CP5 runtime surfaces are absent:

- `api/public.js`;
- `lib/ag05-public-runtime.js`;
- `.github/workflows/ag05-certification.yml`;
- `robots.txt`;
- `robots.production.txt`;
- AG-05 public/SEO migrations;
- AG-05 route/SEO test suites;
- AG-05 Vercel public routing contract.

The tested candidate `vercel.json` contains the AG-06 Newsroom/API security-header rules but not the accepted AG-05 public route table.

The accepted CP5 `vercel.json`, by contrast, routes:

- `/sitemap.xml` to the AG-05 public handler;
- `/feed/` to the AG-05 public handler;
- direct-ad preview to the AG-05 handler;
- public paths to `api/public.js`.

### Disposition

This does **not** reopen CP5. CP5 remains accepted at `0ba7240d...`.

It proves that the subsequent AG-06/CA-01/NM/COM integration lineage omitted CP5's executable public runtime.

The tested COM candidate must therefore **not** become the primary CP7 staging alias.

This defect is too broad to treat as a bounded one-file UAT fix. No silent 75-commit merge or independent AG-05 reimplementation was performed.

Required next technical action is deliberate cross-lane integration of the accepted CP5 runtime semantics into the current AG-06/CA-01/NM/COM lineage, followed by a new candidate SHA and affected exact-head recertification.

## 4. Exact automated workflow results at `5b6fca0...`

| Gate | Run | Exact result |
| --- | ---: | --- |
| Validate HealthTimes 2.0 | `35714484369` | **SUCCESS** |
| Migration Tests | `35714484350` | **SUCCESS — 32 / 32 passed** |
| Chromium UAT | `35714484390` | **SUCCESS — 70 passed / 7 skipped** |
| AG-06 Newsroom Security | `35714484439` | **SUCCESS** |
| CA-01 Communications Security | `35714484423` | **SUCCESS** |
| Native Unified Certification | `35714484445` | **SUCCESS** |
| COM-01 Communications | `35714484683` | **SUCCESS** |
| Vercel commit status | exact SHA | **SUCCESS / READY deployment** |

Chromium's seven skips are live-environment-gated AG-06/CA-01 journeys. They are not relabelled as passes. The equivalent exact-head live workflows ran separately and passed.

### AG-06 exact-head

Contract:

- **6 / 6 passed**

Live staging:

- **7 / 7 passed**
- anonymous bootstrap: **401**
- Reporter create/edit-own/submit: **PASS**
- Reporter publish: **403**
- Reporter self-escalation: **403**
- Reporter ad approval: **403**
- Commercial editorial edit: **403**
- Commercial publish: **403**
- Editor final workflow: **Published**
- Publisher session revocation: **PASS**
- stale Reporter session: **403**
- direct PostgREST/RLS probes: **PASS**
- cleanup: 4 temporary Auth users deleted; 0 live sessions.

### CA-01 exact-head

Contract:

- **7 / 7 passed**

Live staging:

- **1 / 1 comprehensive live security/journey test passed**
- unrelated Reporter discussion: **403**
- unrelated Commercial discussion: **403**
- forged Inbox insertion: **403**
- anonymous Reader comment: **401**
- temporary/noncanonical story: **403**
- restricted Reader: **403**
- unauthorized restriction: **403**
- staff newsroom Realtime: **SUBSCRIBED**
- Reader → private newsroom Realtime: **CHANNEL_ERROR**
- eligible Reader comment Realtime: **SUBSCRIBED**
- event payload minimization: **PASS**
- direct private storage mutation: **DENIED**
- cleanup: 9 Auth users, 3 Reader profiles, 1 comment and 1 report removed; 0 live sessions.

### COM-01 exact-head provider-independent certification

Contract:

- **4 / 4 passed**

Bounded staging proof confirms:

- inbound first insert: `duplicate=false`;
- inbound replay: `duplicate=true`;
- synthetic provider-event first insert: `duplicate=false`;
- synthetic provider-event replay: `duplicate=true`;
- valid NEWSLETTER consent → eligible;
- no consent → ineligible;
- marketing opt-out → marketing ineligible;
- security/transactional delivery remains eligible after marketing opt-out;
- anonymous private attachment access denied;
- unapproved social publication denied;
- approved social attempt with no provider configured → `unconfigured` fail-closed state;
- bounded fixtures cleaned.

Evidence artifact:

- `com01-staging-evidence`
- artifact ID: `10688477475`.

### Native unified exact-head

The unified workflow passed:

- Expo/TypeScript compatibility;
- NM-01/NM-02 foundation;
- live HealthTimes Staging connectivity;
- NM-03 content contracts;
- NM-04 Reader product;
- NM-05 growth/commercial safety;
- NM-06 identity/Studio security;
- NM-07 readiness;
- read-only Source Parity tests;
- universal web/PWA export;
- PWA output verification.

PWA evidence artifact:

- `healthtimes-native-web-dist`
- artifact ID: `10688277744`.

No Native architecture was rebuilt.

## 5. Public product UAT

### Provider-independent/static product results on exact head

PASS:

- public homepage responsive shell;
- phone 375;
- phone 430;
- tablet 768;
- desktop 1440;
- wide 1920;
- no horizontal overflow in the exact-head responsive checks;
- mobile sheets/navigation;
- Premium preview lock;
- Premium refresh persistence;
- demo Premium reader bypass presentation;
- Listen play/pause/resume;
- Premium Listen lock/cancellation;
- mobile advertising inside editorial feed;
- desktop advertising below primary header;
- HOSPAZ presentation hierarchy;
- source archive taxonomy presentation;
- PWA manifest/service-worker reachability.

### Migrated public product result

**FAIL / P1** for the tested integrated candidate.

Real migrated story/page/category/redirect/SEO behavior cannot be certified on `5b6fca0...` because the accepted CP5 public runtime is missing from that tree.

Therefore this pre-CP7 pass does not fabricate results for:

- migrated old/recent story rendering;
- long-form migrated rendering;
- gallery/table/embed/download rendering on the integrated candidate;
- canonical route response;
- one-hop alias response;
- category/tag context response;
- sitemap response;
- RSS response;
- staging robots response;
- integrated initial-HTML metadata/structured data.

Accepted CP4/CP5 component evidence remains valid, but component evidence is not substituted for integrated-candidate execution.

## 6. Content / media / source-parity evidence

Accepted authoritative source snapshot:

- snapshot date: **2026-09-21**
- published posts: **5,737**
- published pages: **49**
- public objects: **5,786**
- authors: **3**
- categories: **83**
- tags: **10,283**
- media records: **3,277**

Accepted CP4 media state:

- legitimate canonical media: **3,275 / 3,275**
- explicit missing-source-package media exceptions: **2**
- missing canonical objects: **0**
- old WordPress upload hotlinks: **0**
- zero-byte exceptions: **7**
- PHP exclusions: **2**
- stale unreferenced staging duplicates: **2,430**, retained as non-blocking cleanup debt.

Accepted CP4 URL/link state:

- canonical public mappings: **5,786 / 5,786**
- direct public link occurrences: **4,473**
- deterministic historical alias occurrences: **661**
- category context occurrences: **429**
- home: **25**
- historical author exceptions: **7**
- legacy tag context: **1**
- historical/malformed explicit 404 occurrences: **66**
- unexplained internal migration-broken links: **0**
- redirect chains: **0**.

Accepted CP4 representative content covered old/recent/Premium/long-form/page/Elementor/gallery/table/embed/video/download cases.

Import rerun/idempotency retained the authoritative identities/counts.

No re-import or migration restart was performed in this assignment.

## 7. Newsroom product UAT

Provider-independent exact-head outcome: **PASS**

Verified through exact-head live workflow evidence:

- Reporter create;
- Reporter edit own;
- Reporter save/reload/resume;
- Reporter submit;
- Reporter cannot publish;
- Editor receives review authority;
- Editor publish;
- Commercial isolation;
- Publisher session authority;
- session revoke;
- stale-session rejection;
- durable audit.

Assignments, story discussions, operational notifications and typed coordination remain within their accepted CA-01 authority domains.

No CA-01 architecture was redesigned.

## 8. CA-01 internal communications product verification

Disposition remains:

`IMPLEMENTATION COMPLETE / COMPONENT CERTIFIED / INTEGRATED`

Verified provider-independently:

- `story_internal_comments` remains editorial discussion;
- assignments remain `story_assignments`;
- reviews remain `story_reviews`;
- corrections remain `story_corrections`;
- operational Inbox remains `newsroom_notifications`;
- general coordination remains `newsroom_threads/messages`;
- forged Inbox rows are denied;
- unrelated staff discussion access is denied;
- Reader discussion remains a separate security domain;
- staff/private and Reader Realtime boundaries remain distinct.

No concrete CA-01 regression was found.

## 9. Reader / community UAT

Provider-independent outcome: **PASS**

Verified:

- authenticated Reader comment path;
- anonymous denial;
- temporary/noncanonical story denial;
- restricted Reader denial;
- moderation/report path;
- staff-private Realtime separation;
- Reader-comment Realtime permission;
- minimized Realtime payload;
- private storage boundary.

No protected Reader/Newsroom authority was inferred from frontend role labels.

## 10. Provider-independent COM-01 verification

Outcome: **PASS**

Verified:

- canonical thread/message domain;
- permissions/capability boundary;
- assignments;
- contact/consent/suppression semantics;
- private attachments;
- opaque reply correlation logic;
- synthetic inbound idempotency;
- synthetic provider-event idempotency;
- marketing consent enforcement;
- transactional-vs-marketing separation;
- fail-closed provider-unavailable state;
- human approval before social publication;
- internal notification independence.

## 11. Exact deferred COM-01 provider gates

The following remain exactly:

**DEFERRED — LIVE PROVIDER EVIDENCE**

1. real HealthTimes staging Resend transactional send;
2. genuine signed Resend webhook reaching COM-01 and normalized exactly once;
3. Brevo live synchronization of a consent-eligible HealthTimes staging contact;
4. Brevo real unsubscribe/bounce/complaint event updating canonical state;
5. Cloudflare real inbound HealthTimes staging email producing exactly one canonical message/thread;
6. Cloudflare real opaque Reply-To response routing back to the same canonical thread.

These are not counted as application runtime defects.

## 12. Performance / accessibility / responsive findings

### Responsive

PASS on exact-head static/product shell:

- 375
- 430
- 768
- 1440
- 1920.

### Accessibility-critical evidence

PASS:

- Listen control exposes state-appropriate ARIA labels;
- keyboard/browser UAT suite is green for tested shell flows;
- private/public authority does not depend on hidden UI controls.

Not certified on the integrated candidate:

- full accessibility pass over real migrated CP5-rendered stories/pages, because that runtime is missing.

This is downstream of PRECP7-P1-001 rather than recorded as a second independent defect.

### Accepted CP5 performance baseline

| Page | Desktop score | Mobile score | Desktop LCP | Mobile LCP | Max recorded CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Archive | 98 | 98 | 1047 ms | 2029 ms | 0.0631 |
| Direct-ad preview | 100 | 100 | 708 ms | 1007 ms | 0 |
| Home | 92 | 89 | 1805 ms | 3750 ms | 0.0561 |
| Migrated story | 100 | 91 | 752 ms | 3469 ms | 0 |
| Premium | 100 | 98 | 449 ms | 1981 ms | 0.0026 |

INP was unavailable in the accepted lab evidence and is not fabricated.

A fresh integrated performance/accessibility run is required after CP5 reconciliation.

## 13. Defect counts

Current technical/product defect register from this preparation pass:

- P0: **0**
- P1: **1**
- P2: **0**
- P3: **0**
- P4: **0**

P1:

- `PRECP7-P1-001` — accepted CP5 executable public-route/SEO runtime absent from the tested integrated COM lineage.

Provider-access deferrals are tracked separately and are not application defects.

Formal client UAT has not begun, so client defect counts are not fabricated.

## 14. Runtime fixes

Runtime fixes in this assignment:

**NONE**

Reason:

PRECP7-P1-001 is a broad cross-lane integration omission. Fixing it correctly requires deliberate integration of an accepted component runtime and migration lineage, not a bounded UAT patch.

Documentation/evidence only was changed on the preparation branch.

## 15. Acceptance-ledger readiness

Updated:

- `docs/migration/12_MIGRATION_ACCEPTANCE_LEDGER.md`

The pre-CP7 ledger now separates:

- PASS;
- FAIL;
- DEFERRED — PROVIDER ACCESS;
- PENDING CLIENT UAT;
- PENDING PRODUCTION;
- NOT APPLICABLE.

It does not collapse provider deferrals into PASS.

It does not claim CP7 acceptance.

## 16. CP7 preparation completeness

Prepared:

- integrated UAT matrix;
- current acceptance ledger;
- remaining blocker register;
- staging routing plan;
- DNS/email worksheet;
- rollback runbook and worksheet;
- final production-readiness checklist;
- exact COM-01 live-provider evidence list;
- client UAT package.

Files:

- `docs/migration/11_PRODUCTION_CUTOVER_ROLLBACK.md`
- `docs/migration/12_MIGRATION_ACCEPTANCE_LEDGER.md`
- `docs/migration/16_AG07_PRE_CP7_READINESS_PACKAGE.md`
- `docs/migration/17_AG07_CLIENT_UAT_PACKAGE.md`
- this receipt.

Formal client UAT remains pending until PRECP7-P1-001 is remediated.

The primary staging alias remains untouched.

## 17. DNS / email readiness

Last repository-observed DNS baseline from 2026-09-09:

- apex A: `192.250.239.56`;
- `www`: Cloudflare-proxied;
- nameservers: `raegan.ns.cloudflare.com`, `neil.ns.cloudflare.com`;
- MX priority 10/20 → `healthtimes.co.zw`;
- SPF includes hosting IP and `spf.mysecurecloudhost.com`;
- DKIM: not established in repository evidence;
- DMARC: not established in repository evidence.

Because MX historically points at the apex, changing the apex web record without authoritative mail verification can break mail.

Current values, TTLs, DKIM, DMARC, Cloudflare Email Routing and exact rollback records must be refreshed before production.

No DNS/mail record was changed.

## 18. Rollback readiness

Prepared runbook now explicitly covers:

- decision authority;
- content freeze/final delta;
- pre-DNS smoke;
- web deployment;
- Newsroom/Reader/Premium/COM checks;
- DNS/email preservation;
- SSL;
- sitemap/robots/RSS/ads;
- rollback triggers;
- rollback authority/procedure;
- backup/restore evidence;
- 60–90 day protected WordPress retention.

Accepted staging database restore evidence remains available from AG-02.

Production backup identifiers, RPO and RTO remain **PENDING PRODUCTION** and are not fabricated.

## 19. Client UAT

Prepared:

`docs/migration/17_AG07_CLIENT_UAT_PACKAGE.md`

Client:

Michael Gwarisa

Formal UAT status:

**PENDING CLIENT UAT**

The package intentionally does not instruct Michael to accept the incomplete COM preview. The formal staging URL/candidate SHA must be filled after the non-provider P1 is remediated and a complete candidate is exact-head green.

## 20. Production safety

Production WordPress modified: **NO**

Production database modified: **NO**

Production storage modified: **NO**

Production DNS modified: **NO**

Production email DNS modified: **NO**

Production Analytics modified: **NO**

Production Search Console modified: **NO**

Production AdSense modified: **NO**

Production Auth modified: **NO**

Production provider configuration modified: **NO**

Production systems modified: **NO**

Owner production authorization: **NOT GRANTED**

PR #20 merge: **NOT PERFORMED**

COM component PR merge: **NOT PERFORMED**

AG-08: **NOT STARTED**

## 21. Pre-CP7 disposition

The provider hold is still outstanding, but a separate non-provider P1 was discovered during the serious integrated product review.

Minimum non-provider remediation:

1. integrate accepted CP5 public/SEO runtime into the current AG-06/CA-01/NM/COM lineage without overwriting accepted authority;
2. produce a new runtime SHA;
3. deploy a preview;
4. rerun AG-05 public/SEO certification at the new exact head;
5. rerun all affected integrated exact-head gates;
6. rerun migrated public-product, performance and accessibility UAT;
7. only after those pass proceed toward the remaining COM live-provider evidence and canonical CP7 execution.

**AG-07 PRE-CP7 READINESS BLOCKED — accepted CP5 public-route/SEO runtime is absent from the COM/integrated candidate lineage**

## 22. Phase 12 superseding technical reconciliation — 2026-09-24

This report remains the authoritative record of the 2026-09-22 discovery of `PRECP7-P1-001`. It must not be read as the current runtime state after Phase 12.

Phase 12 exact runtime:

`f36d6336c65c598191ea2841952a8c9f18bcf57e`

The previously missing CP5 public/SEO lineage is now present and exact-head certified together with AG-06, CA-01, NM and COM provider-independent authority.

Current exact-head results include:

- Validate: `35949140626` — SUCCESS
- Migration Tests: `35949140649` — SUCCESS
- Canonical Chromium UAT: `35949140664` — SUCCESS
- AG-07 Phase 4 Web/PWA/CP5: `35949140675` — SUCCESS
- NM-07 migrated corpus: `35949140630` — SUCCESS
- Premium/HOSPAZ: `35949140644` — SUCCESS
- AG-06: `35949140670` — SUCCESS
- CA-01: `35949140684` — SUCCESS
- COM-01 provider-independent: `35949140642` — SUCCESS
- Unified Native: `35949140709` — SUCCESS
- Native Binary: `35949140673` — SUCCESS
- Phase 10 exact-head Web/PWA visual evidence: `35949140654` — SUCCESS

`PRECP7-P1-001`: **RESOLVED**.

Current unresolved technical convergence defect count:

- P0: **0**
- P1: **0**

External provider, formal client UAT, physical-device/store and production-cutover items remain deferred under their existing authority boundaries. CP7 and AG-08 remain locked.
