# Migration Acceptance Ledger

Status: **PRE-CP7 READINESS — NOT CP7 ACCEPTANCE**

Updated: 2026-09-22

Preparation branch: `uat/ag07-pre-cp7-integrated-product`

Tested runtime: `5b6fca0fe1dceed5e167b845e023dfc456c47040`

Frozen pre-COM integrated ancestor: `0112c8802d220d23e20288783536f22e85ea346d`

This ledger is the current pre-CP7 readiness view. It does **not** declare CP7 accepted, production ready, or authorize AG-08. Status values are intentionally limited to:

- `PASS`
- `FAIL`
- `DEFERRED — PROVIDER ACCESS`
- `PENDING CLIENT UAT`
- `PENDING PRODUCTION`
- `NOT APPLICABLE`

## 1. Integrated lineage and candidate integrity

| Gate | Status | Evidence |
| --- | --- | --- |
| COM candidate descends from frozen pre-COM integrated runtime | PASS | Git compare: `0112c880...` → `5b6fca0...` = 9 commits ahead, 0 behind; merge base exactly `0112c880...` |
| Accepted CP4 content/source evidence preserved as programme evidence | PASS | AG-04 CP4 receipt: 5,737 posts; 49 pages; 5,786 public objects; 3 authors; 83 categories; 10,283 tags; 3,277 media records |
| Accepted CP5 executable public/SEO runtime present in tested integrated candidate | **FAIL** | `0ba7240d...` and `5b6fca0...` diverge at CP3 base `ea599bf9...`; tested candidate lacks `api/public.js`, `lib/ag05-public-runtime.js`, AG-05 migrations/workflow, `robots.txt`, `robots.production.txt`, and AG-05 Vercel route contract |
| Primary `healthtimes-staging.vercel.app` reassigned to a complete integrated CP7 candidate | PENDING PRODUCTION | Intentionally not reassigned during this pre-CP7 assignment. Current tested COM preview is not eligible because CP5 public runtime is absent |
| Production systems untouched | PASS | No production deployment, database/storage mutation, DNS/MX/email routing, Google-property mutation or provider activation performed |

### Defect PRECP7-P1-001

Severity: **P1 — critical integrated public-product/runtime failure**

Description: the technically certified AG-06/CA-01/NM/COM lineage does not contain the moderator-accepted CP5 public-route/SEO runtime. This is a cross-lane integration omission, not a COM provider problem and not a CP5 component failure.

Impact: the tested COM candidate cannot serve as the canonical migrated public staging candidate for migrated WordPress routes, canonical SEO, sitemap, RSS, robots or deterministic legacy routing. The primary staging alias must not be reassigned to this SHA.

Required remediation: deliberately reconcile the accepted CP5 runtime into a new integrated candidate while preserving AG-06, CA-01, NM-07 and COM-01 authority; resolve `vercel.json` so both public AG-05 routing and Newsroom/API security headers survive; deploy a new preview; rerun affected exact-head gates and public product UAT.

## 2. Source parity / content / media

| Gate | Status | Evidence |
| --- | --- | --- |
| Published posts accounted | PASS | 5,737 / 5,737 in accepted CP4 |
| Published pages accounted | PASS | 49 / 49 in accepted CP4 |
| Public objects accounted | PASS | 5,786 / 5,786; no duplicate public paths/orphan mappings |
| Authors accounted | PASS | 3 / 3 |
| Categories retained | PASS | 83 |
| Legacy tags retained for provenance | PASS | 10,283 |
| Media records accounted | PASS | 3,277 total; 3,275 legitimate canonical objects + 2 explicit source exceptions; missing canonical objects 0 |
| Old WordPress upload hotlinks removed | PASS | accepted CP4 evidence: 0 |
| Unknown shortcode/content-field silent loss guard | PASS | migration transform suite detects shortcodes; CP4 edge cases were certified on accepted AG-05 runtime |
| Import rerun / idempotency | PASS | final CP4 rerun retained 5,786 story/page identities, 3 authors, 83 categories, 10,283 tags, 3,277 media assets, 5,786 URL mappings |
| Stale duplicate storage cleanup | PASS | 2,430 unreferenced `wordpress/uploads/...` objects remain explicitly classified non-blocking staging cleanup debt |

## 3. Public product / SEO / routing

| Gate | Status | Evidence |
| --- | --- | --- |
| Static client-review homepage responsive shell | PASS | exact-head Chromium: widths 375/430/768/1440/1920 pass with no horizontal overflow |
| Static Premium UX | PASS | exact-head Chromium: lock, persistence, subscriber demo bypass and Listen/paywall boundary pass |
| Static Listen control | PASS | play/pause/resume and Premium audio boundary pass |
| PWA shell | PASS | manifest + service worker test pass; Native universal PWA export/verification pass |
| Advertising layout shell | PASS | mobile/desktop masthead/feed hierarchy and HOSPAZ presentation tests pass |
| Migrated public article routes on tested integrated runtime | **FAIL** | CP5 public route handler/runtime absent from `5b6fca0...` |
| Category/context routes on tested integrated runtime | **FAIL** | accepted CP5 context-route runtime is absent from candidate |
| Legacy alias/redirect runtime on tested integrated runtime | **FAIL** | accepted CP5 resolver/runtime is absent from candidate |
| Canonical/meta/structured-data runtime on tested integrated runtime | **FAIL** | CP5 server renderer/runtime is absent from candidate |
| `/sitemap.xml` on tested integrated runtime | **FAIL** | AG-05 sitemap route/RPC wiring is absent from candidate |
| `/feed/` on tested integrated runtime | **FAIL** | AG-05 feed route/runtime is absent from candidate |
| `/robots.txt` candidate file/runtime | **FAIL** | root `robots.txt` is absent at tested SHA |
| `ads.txt` seller declaration in candidate | PASS | exact-head test passes; repository line: `google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0` |
| `app-ads.txt` verified-only declaration in candidate | PASS | exact-head test passes; same verified Google seller line |
| Accepted CP5 component evidence | PASS | component runtime `0ba7240d...`: 13/13 live route tests, sitemap 5,786 URLs, robots 200, RSS 50-item sample, deterministic redirects/contexts |

The CP5 component remains accepted. The FAIL rows above describe the **integrated candidate**, not a retroactive reopening of CP5.

## 4. Newsroom / AG-06 product and security

| Gate | Status | Evidence |
| --- | --- | --- |
| AG-06 contract | PASS | exact-head run `35714484439`; contract 6/6 |
| Anonymous bootstrap denied | PASS | live evidence 401 |
| Reporter create/edit-own/submit | PASS | live exact-head journey |
| Reporter publish denied | PASS | 403 |
| Reporter self-role escalation denied | PASS | 403 |
| Reporter ad approval denied | PASS | 403 |
| Commercial editorial edit denied | PASS | 403 |
| Commercial publish denied | PASS | 403 |
| Editor review/publish journey | PASS | final workflow `Published`, final story status `publish` |
| Publisher session revocation | PASS | Reporter session revoked |
| Stale session rejection | PASS | 403 after revocation |
| Direct PostgREST/RLS probes | PASS | exact-head live security suite |
| Audit persistence | PASS | durable `story.published` and `session.revoked` evidence |
| AG-06 cleanup | PASS | 4 temporary Auth users deleted; 0 live certification sessions |

## 5. CA-01 internal communications / Reader-community

| Gate | Status | Evidence |
| --- | --- | --- |
| CA-01 contract | PASS | exact-head run `35714484423`; 7/7 |
| Editorial story discussion authority | PASS | unrelated Reporter and Commercial access each denied 403 |
| Inbox integrity | PASS | forged Inbox insertion denied 403; durable notification path exercised |
| Assignment/coordination integration | PASS | assignment, assignment thread, desk thread and breaking thread exercised |
| Reader anonymous comment denial | PASS | 401 |
| Temporary/noncanonical story discussion denial | PASS | 403 |
| Restricted Reader denial | PASS | 403 |
| Unauthorized account restriction denial | PASS | 403 |
| Staff private Realtime | PASS | `SUBSCRIBED` |
| Reader → private Newsroom Realtime | PASS | `CHANNEL_ERROR` / unauthorized |
| Eligible Reader comment Realtime | PASS | `SUBSCRIBED` |
| Realtime payload minimization | PASS | staff and Reader event payload checks true |
| Private communication storage boundary | PASS | direct private bucket mutation denied; Reader metadata denied |
| CA-01 cleanup | PASS | 9 Auth users, 3 Reader profiles, 1 comment, 1 report removed; 0 live sessions |

CA-01 remains `IMPLEMENTATION COMPLETE / COMPONENT CERTIFIED / INTEGRATED`; no architecture was reopened.

## 6. COM-01 provider-independent behavior

| Gate | Status | Evidence |
| --- | --- | --- |
| COM-01 contract | PASS | exact-head run `35714484683`; 4/4 |
| Canonical communications schema / authority boundaries | PASS | contract + disposable from-zero schema job |
| Inbound canonical idempotency | PASS | first event `duplicate=false`; replay `duplicate=true` |
| Opaque reply-token canonical threading logic | PASS | bounded staging proof resolves to existing thread |
| Synthetic provider-event normalization / replay | PASS | first false; replay true; exactly-once normalized state logic |
| Purpose-specific consent model | PASS | NEWSLETTER grant eligible; no-consent ineligible |
| Marketing suppression separation | PASS | marketing opt-out ineligible; security/transactional remains eligible |
| Private attachment boundary | PASS | anonymous private access denied; dangerous object quarantined |
| Provider unavailable fail-closed | PASS | approved social attempt records `unconfigured`; no fabricated success |
| Human approval before social publication | PASS | unapproved publish denied |
| Internal notification independence | PASS | CA-01/COM canonical authority remains server-backed; external provider not source of truth |
| Real Resend staging transactional send | **DEFERRED — PROVIDER ACCESS** | HealthTimes-specific Resend account/sender unavailable |
| Genuine signed Resend webhook normalized exactly once | **DEFERRED — PROVIDER ACCESS** | HealthTimes-specific webhook/signing secret unavailable |
| Brevo real eligible contact synchronization | **DEFERRED — PROVIDER ACCESS** | HealthTimes Brevo access unavailable |
| Brevo real unsubscribe/bounce/complaint event | **DEFERRED — PROVIDER ACCESS** | HealthTimes Brevo webhook access unavailable |
| Cloudflare real inbound staging email | **DEFERRED — PROVIDER ACCESS** | HealthTimes zone / Email Routing access unavailable |
| Cloudflare opaque-reply routing to existing thread | **DEFERRED — PROVIDER ACCESS** | staging mail edge not available |

## 7. Automated exact-head matrix at `5b6fca0...`

| Gate | Status | Evidence |
| --- | --- | --- |
| Validate HealthTimes 2.0 | PASS | run `35714484369` |
| Migration Tests | PASS | run `35714484350`; 32/32 |
| Chromium UAT | PASS | run `35714484390`; 70 passed / 7 skipped |
| AG-06 Newsroom Security | PASS | run `35714484439`; contract + disposable schema + local gateway + live staging all success |
| CA-01 Communications Security | PASS | run `35714484423`; contract + disposable schema + live staging all success |
| COM-01 Communications provider-independent certification | PASS | run `35714484683`; contract + disposable schema + bounded staging proof all success |
| Native unified certification | PASS | run `35714484445`; foundation/staging/contracts/Reader/growth/security/source-parity/PWA export all success |
| AG-05 integrated public-route certification | **FAIL** | workflow/runtime does not exist at this candidate SHA because accepted CP5 lineage was not integrated |
| Live external-provider certification | **DEFERRED — PROVIDER ACCESS** | exact six provider gates listed above |

Chromium's seven skipped live-environment tests are not treated as passes; their AG-06/CA-01 equivalents ran in their dedicated exact-head live workflows and passed.

## 8. Performance / accessibility / responsive readiness

| Gate | Status | Evidence |
| --- | --- | --- |
| Responsive static publication shell | PASS | 375 / 430 / 768 / 1440 / 1920 exact-head Chromium |
| Mobile/desktop ad placement | PASS | exact-head Chromium |
| Listen control accessible labeling | PASS | exact-head reader tests validate changing ARIA labels for listen/pause/resume |
| Full integrated accessibility pass over migrated AG-05 routes | **FAIL** | cannot be performed against current candidate because migrated public runtime is absent |
| Accepted CP5 Lighthouse baseline | PASS | Archive 98/98; direct-ad 100/100; Home 92 desktop/89 mobile; migrated story 100/91; Premium 100/98; all tested CLS ≤ 0.0631 |
| INP | NOT APPLICABLE | unavailable in accepted lab evidence; not fabricated |
| Fresh integrated Lighthouse on complete CP5+COM candidate | **FAIL** | requires remediated integrated candidate |

## 9. Backup / DNS / rollback / client

| Gate | Status | Evidence |
| --- | --- | --- |
| Staging database backup/restore drill | PASS | accepted AG-02 evidence: disposable restore succeeded; 36/36 tables; current six-migration CP2 baseline restored; production not used |
| Production RPO/RTO approval | PENDING PRODUCTION | values must be explicitly agreed for cutover; not fabricated |
| Current authoritative A/AAAA/CNAME capture | PENDING PRODUCTION | must be captured immediately before authorized cutover |
| MX/SPF/DKIM/DMARC capture and rollback values | PENDING PRODUCTION | required worksheet prepared; no DNS/mail mutation permitted here |
| Email continuity verification | **DEFERRED — PROVIDER ACCESS** | provider-specific staging evidence required before canonical CP7 |
| SSL/TLS cutover verification | PENDING PRODUCTION | execute only after authorized production routing |
| WordPress rollback retention | PASS | runbook requires protected/read-only 60–90 day retention |
| Formal Michael Gwarisa UAT | PENDING CLIENT UAT | package prepared; do not run against incomplete `5b6fca0...` public candidate |
| Client P0/P1 count | PENDING CLIENT UAT | no client acceptance fabricated |
| Owner production authorization | PENDING PRODUCTION | explicitly not granted by AG-07 |

## 10. Current defect counts

Technical/readiness defects recorded in this preparation pass:

- P0: **0**
- P1: **1** — PRECP7-P1-001, accepted CP5 public/SEO runtime absent from integrated COM candidate
- P2: **0**
- P3: **0**
- P4: **0**

Provider-access deferrals are tracked separately and are **not** counted as application runtime defects.

## 11. Pre-CP7 disposition

The communications provider hold is still real, but it is **not the only remaining issue**. Before canonical CP7 can execute, the non-provider P1 integration omission must be remediated and a new exact-head integrated candidate must be certified.

**CP7 has not been executed or accepted. AG-08 remains locked.**

## 12. Phase 12 superseding reconciliation — 2026-09-24

**CURRENT AUTHORITY NOTICE:** Sections 1–11 above preserve the 2026-09-22 pre-CP7 snapshot for audit history. Where those sections refer to runtime `5b6fca0...` or `PRECP7-P1-001` as current, they are superseded by this section.

Current Phase 12 runtime:

`f36d6336c65c598191ea2841952a8c9f18bcf57e`

Starting accepted Phase 11 runtime / closure:

- `1da9aa95ed60e25a145c8446b23d0670d608fb52`
- `a2878abbacb8e5d108e023d828269efabc2219e4`

Current reconciliation:

| Gate | Current status | Evidence |
| --- | --- | --- |
| Accepted CP5 executable public/SEO authority present in integrated candidate | PASS | exact-head AG-07 Phase 4 run `35949140675`; sitemap 5,786; feed 50; migrated source 30154 public; Premium source 33190 body-protected |
| `PRECP7-P1-001` | **RESOLVED** | Phase 4–12 convergence integrated CP5 public routing/SEO with AG-06/CA-01/NM/COM authority; no longer a current P1 |
| Single public Reader authority | PASS | `apps/mobile`; Vercel output `apps/mobile/dist`; repository workflow audit found zero active root-dot uploads, root `app.js` product checks or active legacy UAT invocation |
| Canonical Chromium UAT | PASS | run `35949140664`; 7/7 Phase 12 UAT tests |
| AG-06 / CA-01 / COM-01 provider-independent | PASS | runs `35949140670`, `35949140684`, `35949140642` |
| Unified Native / Native Binary | PASS | runs `35949140709`, `35949140673`; iOS simulator and Android debug binaries produced |
| Current technical convergence P0/P1 | **0 / 0** | no unresolved Phase 12 convergence blocker |
| Formal client UAT | PENDING CLIENT UAT | not fabricated; moderator must release the client test entry point |
| Live Resend/Brevo/Cloudflare provider evidence | DEFERRED — EXTERNAL PROVIDER | six COM-01 live-provider gates remain outside Phase 12 |
| Physical-device/store signing/push/billing/native-ad provider evidence | DEFERRED — PHYSICAL DEVICE / EXTERNAL PROVIDER | does not restore or justify legacy Web UI |
| Production cutover, DNS/MX, backups, RPO/RTO, owner authorization | PENDING PRODUCTION | Phase 12 does not execute CP7 or AG-08 |

The primary staging alias remains on accepted Phase 11 because Phase 12 did not receive a separate alias-movement authorization. The Phase 12 controlled preview is `target:null` and exists only for exact-candidate proof.

**CP7 has not been executed or accepted. AG-08 remains locked.**
