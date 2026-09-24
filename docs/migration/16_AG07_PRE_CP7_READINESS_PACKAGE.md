# AG-07 — PRE-CP7 READINESS PACKAGE

Date: 2026-09-22

Branch: `uat/ag07-pre-cp7-integrated-product`

Tested runtime: `5b6fca0fe1dceed5e167b845e023dfc456c47040`

Purpose: prepare non-provider CP7 evidence while COM-01 live provider certification is deferred. This document does not execute CP7, authorize production, or unlock AG-08.

## 1. Integrated UAT matrix

### Public product

| Area | Pre-CP7 state | Evidence / next action |
| --- | --- | --- |
| Static homepage shell | PASS | exact-head Chromium responsive tests |
| Mobile/tablet/desktop widths | PASS | 375, 430, 768, 1440, 1920 |
| Premium static UX | PASS | lock, persistence, demo entitlement, Listen boundary |
| Listen | PASS | play/pause/resume and Premium cut-off tests |
| PWA shell | PASS | manifest/service worker + Native PWA export |
| Ad layout shell | PASS | mobile feed/desktop hierarchy tests |
| Source-parity counts | PASS | accepted CP4: 5,737 posts, 49 pages, 5,786 public objects, 3 authors, 83 categories, 10,283 tags |
| Real migrated article/page runtime in tested integrated candidate | FAIL / P1 | accepted CP5 public runtime is absent from `5b6fca0...` |
| Canonical/structured data/legacy redirects in tested candidate | FAIL / P1 | same root cause |
| Sitemap/RSS/robots in tested candidate | FAIL / P1 | same root cause |
| Full migrated-content accessibility/performance retest | FAIL / P1 | cannot certify until a CP5+COM integrated candidate exists |

### Newsroom

| Journey | State |
| --- | --- |
| Reporter create/edit/save/submit | PASS |
| Reporter publish denied | PASS |
| Editor review/publish | PASS |
| Assignments/reviews/corrections authority | PASS |
| Staff Inbox/notifications | PASS |
| General coordination threads/messages | PASS |
| Commercial editorial isolation | PASS |
| Publisher authority/session revoke | PASS |
| stale-session rejection | PASS |
| audit persistence | PASS |

### Reader/community

| Journey | State |
| --- | --- |
| authenticated Reader discussion boundary | PASS |
| anonymous denial | PASS |
| restricted Reader denial | PASS |
| canonical-story-only permanent discussion | PASS |
| staff private Realtime separation | PASS |
| Reader comment Realtime | PASS |
| report/moderation path | PASS |
| private storage/metadata separation | PASS |

### COM-01 provider-independent

| Journey | State |
| --- | --- |
| canonical queues/threads/messages authority | PASS |
| assignments/capabilities | PASS |
| contact/consent/suppression model | PASS |
| private attachments | PASS |
| opaque reply correlation logic | PASS |
| inbound/provider-event replay/idempotency | PASS |
| fail-closed unconfigured provider state | PASS |
| social human approval | PASS |
| internal notification independence | PASS |

## 2. Remaining blocker register

### PRECP7-P1-001 — CP5 executable runtime omitted from integrated COM lineage

Severity: **P1**

Type: **cross-lane integration/runtime defect**

Observed facts:

- accepted CP5 runtime: `0ba7240d018efa2472a00f56453e9aa8be34e1c5`;
- tested COM runtime: `5b6fca0fe1dceed5e167b845e023dfc456c47040`;
- histories diverge at `ea599bf9ed3db9dc8fa7085e25bea20375c28e11`;
- CP5 contributes public runtime files/migrations that are absent at the COM candidate, including:
  - `api/public.js`;
  - `lib/ag05-public-runtime.js`;
  - `.github/workflows/ag05-certification.yml`;
  - AG-05 public/SEO migrations;
  - `robots.txt`;
  - `robots.production.txt`;
  - AG-05 runtime and browser tests;
  - AG-05 Vercel route contract.

This does not reopen CP5. It proves that the later integrated/COM line did not consume CP5's executable product surface.

Required reconciliation:

1. create a new cross-lane integration candidate;
2. preserve `5b6fca0...` COM/AG-06/CA-01/NM ancestry;
3. deliberately consume the accepted CP5 runtime semantics and migrations;
4. resolve `vercel.json` so AG-05 public routing and AG-06/CA-01 private-route headers both survive;
5. preserve COM-01 server routes and migrations;
6. deploy an exact candidate preview;
7. run AG-05 route/SEO certification plus the complete integrated exact-head matrix;
8. rerun migrated public product UAT, performance and accessibility;
9. only then consider primary staging alias reassignment.

No broad merge is performed by this pre-CP7 UAT branch.

## 3. Staging routing plan

Current primary alias reclassification remains:

`CP7 INTEGRATED STAGING CANDIDATE / PLATFORM ROUTING REQUIREMENT`

Do **not** point `healthtimes-staging.vercel.app` at `5b6fca0...`.

Procedure after PRECP7-P1-001 is remediated and the new candidate is exact-head green:

1. record candidate SHA and Vercel deployment ID;
2. verify preview directly before aliasing:
   - homepage;
   - old and recent migrated story;
   - Premium story;
   - page/context route;
   - one-hop historical alias;
   - explicit historical 404;
   - sitemap;
   - robots;
   - RSS;
   - ads.txt/app-ads.txt;
   - Newsroom;
   - Reader/community;
   - COM provider-independent health;
3. verify no staging test residue;
4. require COM-01 live provider certification before canonical CP7 primary-alias certification;
5. reassign the staging alias only under the moderator-authorized CP7 execution;
6. immediately repeat the route/UAT matrix against the alias;
7. retain the prior alias target as a rollback reference until CP7 closes.

This is a procedure only. No alias was changed.

## 4. DNS and email worksheet

Known historical DNS inventory from the migration package, observed 2026-09-09:

| Record | Last known value | Pre-cutover requirement | Current pre-CP7 disposition |
| --- | --- | --- | --- |
| Apex A | `192.250.239.56` | refresh authoritative value immediately before cutover; record rollback value | PENDING PRODUCTION |
| `www` | Cloudflare-proxied | refresh exact CNAME/A target and TTL | PENDING PRODUCTION |
| Nameservers | `raegan.ns.cloudflare.com`, `neil.ns.cloudflare.com` | verify current authority | PENDING PRODUCTION |
| MX | priority 10 and 20 → `healthtimes.co.zw` | preserve until separately approved; apex dependency is a mail risk | PENDING PRODUCTION |
| SPF | includes hosting IP + `spf.mysecurecloudhost.com` | capture exact TXT and preserve/merge safely | PENDING PRODUCTION |
| DKIM | unknown in repository evidence | capture all selectors/current values | PENDING PRODUCTION |
| DMARC | unknown in repository evidence | capture current policy/value | PENDING PRODUCTION |
| Cloudflare Email Routing | not account-level verified in this pass | capture exact production rules before any mail change | PENDING PRODUCTION |
| transactional sender records | HealthTimes-specific staging not yet wired | prove Resend staging identity first | DEFERRED — PROVIDER ACCESS |
| marketing sender records | HealthTimes-specific staging not yet wired | prove Brevo staging identity first | DEFERRED — PROVIDER ACCESS |
| inbound/reply mail edge | HealthTimes-specific staging not yet wired | prove Cloudflare inbound/reply routing first | DEFERRED — PROVIDER ACCESS |

Safety rule: because MX historically points at the apex, changing the apex A record without a verified mail plan can break email. AG-08 must not change web DNS until the current mail dependency and rollback values are known.

No DNS, MX, SPF, DKIM, DMARC or Cloudflare Email Routing record was modified.

## 5. Rollback worksheet

| Item | Evidence / required value | State |
| --- | --- | --- |
| old WordPress retained | runbook: keep protected/read-only 60–90 days | PASS |
| staging backup/restore drill | accepted AG-02 disposable restore proof | PASS |
| production DB backup ID/checksum | capture immediately before cutover | PENDING PRODUCTION |
| production media/storage backup | capture immediately before cutover | PENDING PRODUCTION |
| previous web DNS values | refresh authoritative values and TTLs | PENDING PRODUCTION |
| mail rollback values | MX/SPF/DKIM/DMARC + mail routing | PENDING PRODUCTION |
| rollback authority | owner/moderator or delegated AG-08 incident lead | PREPARED |
| rollback triggers | content loss, mass 404, Newsroom/auth, mail, SSL, DB, Premium, severe SEO/ad outage | PREPARED |
| RPO | explicit owner/infrastructure approval required | PENDING PRODUCTION |
| RTO | explicit owner/infrastructure approval required | PENDING PRODUCTION |

## 6. COM-01 evidence still waiting

All six are **DEFERRED — LIVE PROVIDER EVIDENCE**:

1. one real HealthTimes staging Resend transactional send;
2. one genuine signed Resend webhook reaching COM-01 and normalizing exactly once;
3. one Brevo sync of a genuinely consent-eligible HealthTimes staging contact;
4. one real Brevo unsubscribe, bounce or complaint event updating canonical state;
5. one real Cloudflare inbound HealthTimes staging email reaching exactly one canonical thread/message;
6. one real Cloudflare reply using an opaque application Reply-To identity and returning to the same canonical thread.

These are provider-access dependencies, not application-runtime failures.

## 7. Final production-readiness checklist

Before canonical CP7 can be executed:

- [ ] PRECP7-P1-001 reconciled into a new integrated runtime.
- [ ] New candidate exact-head ancestry documented.
- [ ] AG-05 public-route/SEO tests green at the new integrated SHA.
- [ ] Validate HealthTimes 2.0 green.
- [ ] Migration Tests green.
- [ ] Chromium UAT green.
- [ ] AG-06 Newsroom Security green.
- [ ] CA-01 Communications Security green.
- [ ] COM-01 provider-independent certification green.
- [ ] Native unified certification green.
- [ ] Required Native binary regression disposition recorded.
- [ ] Migrated public content UAT performed on real candidate preview.
- [ ] Fresh accessibility and Lighthouse/responsive evidence on the complete integrated candidate.
- [ ] COM-01 six live provider gates complete.
- [ ] Primary staging alias reassigned only after candidate + provider acceptance.
- [ ] Formal Michael Gwarisa client UAT completed.
- [ ] Client unresolved P0/P1 = 0.
- [ ] DNS/email worksheet refreshed with authoritative values.
- [ ] Production backup/restore evidence and RPO/RTO approved.
- [ ] Owner explicitly authorizes production.
- [ ] AG-08 unlocked separately.

## 8. Current preparation conclusion

Non-provider readiness is **not complete** because PRECP7-P1-001 prevents serious migrated public-product UAT on the COM candidate.

The provider hold remains independently deferred.

Production systems modified: **NO**

Owner production authorization: **NOT GRANTED**

## 9. Phase 12 current reconciliation — 2026-09-24

This package's earlier `PRECP7-P1-001` finding is retained above as historical evidence of the 2026-09-22 candidate and is **no longer current**.

Phase 12 exact runtime:

`f36d6336c65c598191ea2841952a8c9f18bcf57e`

Current technical state:

- CP5 migrated public routing/SEO authority: **PASS**
- canonical `apps/mobile` Web/PWA Reader: **PASS**
- root legacy public Reader active serving authority: **RETIRED**
- root legacy public Reader active certification authority: **RETIRED**
- historical root files: **RETAINED — LEGACY / SUPERSEDED / NON-SERVING EVIDENCE**
- Newsroom/API protected operational surfaces: **PRESERVED**
- canonical Chromium UAT: **PASS**
- Premium/HOSPAZ fail-closed: **PASS**
- AG-06: **PASS**
- CA-01: **PASS**
- COM-01 provider-independent: **PASS**
- Unified Native: **PASS**
- Native Binary: **PASS**
- unresolved technical convergence P0/P1: **0 / 0**

The six live COM provider gates remain **DEFERRED — EXTERNAL PROVIDER**. Formal Michael Gwarisa UAT remains **PENDING CLIENT UAT**. Production DNS, backups, RPO/RTO, SSL/cutover and owner authorization remain **PENDING PRODUCTION**.

No production deployment, production database/storage mutation, DNS/MX change, provider activation, app-store submission, programme PR merge, AG-08 release or CP7 acceptance occurred in Phase 12.
