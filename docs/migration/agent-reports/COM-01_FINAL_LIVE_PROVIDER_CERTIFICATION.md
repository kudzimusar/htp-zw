# COM-01 — Final Live Provider Certification / Pre-CP7 Clearance

**Repository:** `kudzimusar/htp-zw`  
**Certification lane:** `communications/com01-final-live-provider-certification`  
**Authoritative Phase 12 certified runtime:** `f36d6336c65c598191ea2841952a8c9f18bcf57e`  
**Authoritative Phase 12 documentation closure / lane parent:** `3ace38e48e8f4fc2acb014c1c9e08acab03a8bba`  
**Phase 12 PR:** #29 — Draft / Open / Unmerged / Mergeable  
**Historical COM-01 component head:** `d6734ee2789ecd54ac96c1945140968072653029`  
**Historical COM-01 PR:** #21 — provenance only; not used as the runtime continuation point  
**Production systems modified:** **NO**

## 1. Scope

This lane descends from the accepted Phase 12 integrated lineage. The canonical Reader remains `apps/mobile`. No Phase 0–12 frontend/convergence authority was reopened.

The provider-independent COM-01 implementation is already accepted on the Phase 12 runtime. This continuation is limited to live external-provider wiring and certification.

No COM architecture, CP4, CP5, CP6, CA-01, AG-06, NM-07, migration, Premium, HOSPAZ, Pages authority or Reader authority was redesigned.

## 2. Starting integrated authority verified

The HealthTimes staging Vercel project is `healthtimes-staging`.

Observed READY deployments:

- runtime `f36d6336c65c598191ea2841952a8c9f18bcf57e`
  - deployment: `dpl_FTzbVeYbBdGS3d3mYfErJkFXxUHF`
  - source branch: `integration/ag07-phase12-legacy-retirement-precp7`
  - target: preview / non-production
- documentation closure `3ace38e48e8f4fc2acb014c1c9e08acab03a8bba`
  - deployment: `dpl_4Nb7PTQ9tLMoeCwqFChaEJMDFdeF`
  - source branch: `integration/ag07-phase12-legacy-retirement-precp7`
  - target: preview / non-production

No production deployment was performed by this lane.

## 3. Authoritative historical provider-hold continuation

The latest operational COM-01 state is newer than the documentation present at historical GitHub head `d6734ee...`.

The provider-hold continuation supplied to the moderator records:

- certified COM runtime remained `5b6fca0fe1dceed5e167b845e023dfc456c47040`;
- runtime code changed: **NO**;
- further provider wiring: **DEFERRED**;
- production DNS/mail touched: **NO**;
- paid plans/add-ons/trials accepted: **NO**;
- checkpoint wording: `COM-01 IMPLEMENTATION COMPLETE / LIVE PROVIDER CERTIFICATION DEFERRED`;
- remaining dependency: `EXTERNAL_PROVIDER_WIRING — DEFERRED PENDING AUTHORITATIVE DNS ACCESS`.

That provider-hold state is historical component evidence. Its implementation has since been consumed into and provider-independently recertified on Phase 12. The live provider work itself was not completed.

### Historical Resend staging state

The provider-hold continuation records that a HealthTimes staging Resend webhook had already been created:

- endpoint: `https://healthtimes-staging.vercel.app/api/communications?action=resendWebhook`
- webhook ID: `fa26ffcb-7979-4ab7-b77c-7b941f34c048`
- status at creation: enabled
- subscribed scope: email lifecycle events
- signing secret: created and kept masked; not exposed or committed

Outstanding at that checkpoint:

- install the signing secret server-side as `COM01_RESEND_WEBHOOK_SECRET`;
- complete Resend sender-domain verification through authoritative Cloudflare DNS;
- perform one real HealthTimes staging transactional/system send;
- receive one genuine signed Resend webhook;
- prove signature authentication, exact-once normalization and replay idempotency.

### Historical Brevo staging state

The provider-hold continuation records:

- Brevo staging domain/sender preparation had already occurred;
- the Brevo Lists UI path was blocked in that session;
- API key: **not yet created**;
- dedicated folder/list: **not yet created**;
- certification contact: **not yet added**;
- webhook: **not yet created**;
- no production audience contacted;
- no paid-plan/add-on/trial accepted.

The intended next bounded staging setup was:

- API key name: `HealthTimes COM-01 Staging`;
- folder: `HealthTimes Staging`;
- list: `HealthTimes COM-01 Certification`;
- add only the designated certification address;
- create the required staging webhook;
- exercise genuine consent-eligible synchronization and one real unsubscribe/bounce/complaint event.

No claim is made here that those later steps were completed.

### Historical Cloudflare/DNS state

The provider-hold explicitly records authoritative DNS access as the remaining dependency.

No production MX, SPF, DKIM, DMARC, nameserver, cPanel mail, production mailbox or production Cloudflare mail-routing change had been made.

## 4. Current-session reconciliation

The current connected Resend account was inspected without mutation.

Observed current account inventory:

- only visible verified domain: `updates.wewed.pro`;
- only visible webhook endpoint: `https://wewed.pro/api/webhooks/resend`;
- visible API-key names are unrelated Wewed/onboarding credentials.

A direct lookup of historical HealthTimes webhook ID `fa26ffcb-7979-4ab7-b77c-7b941f34c048` returned:

- `404 Webhook endpoint not found`

This does **not** invalidate the prior provider-hold record. It proves only that the presently connected Resend account/team does not expose that historical HealthTimes webhook.

Correct interpretation:

**CURRENT RESEND ACCOUNT CONTEXT DOES NOT MATCH OR DOES NOT EXPOSE THE HISTORICAL HEALTHTIMES STAGING RESEND RESOURCE.**

The unrelated Wewed account/resources were not reused or altered.

Current connector availability also shows:

- Brevo account actions: unavailable in this certification environment;
- Cloudflare account/zone actions: unavailable in this certification environment.

Therefore the existing partial HealthTimes provider setup cannot presently be completed or independently re-inspected end-to-end from this lane.

## 5. Six required live-provider gates

| Gate | Current result | Precise state |
| --- | --- | --- |
| Resend genuine HealthTimes staging transactional/system send | **PENDING** | Historical HealthTimes webhook exists in provider-hold evidence, but current Resend account context does not expose the HealthTimes resource; sender-domain DNS verification was still pending |
| Resend genuine signed webhook authenticated and normalized exactly once with replay-safe idempotency | **PENDING** | Historical webhook ID known; signing secret still required server-side and current account context cannot inspect that webhook |
| Brevo genuinely consent-eligible HealthTimes staging contact synchronization | **PENDING** | Domain/sender were prepared historically; API key/list/contact setup had not yet been completed |
| Brevo real unsubscribe/bounce/complaint updates canonical HealthTimes state | **PENDING** | Brevo staging webhook had not yet been created |
| Cloudflare real inbound external staging email creates exactly one canonical thread/message | **PENDING** | Authoritative Cloudflare/DNS access was the recorded provider-hold blocker |
| Cloudflare opaque Reply-To response correlates to same canonical thread | **PENDING** | Staging mail routing cannot be completed/proven without authoritative Cloudflare routing access |

The accepted Phase 12 provider-independent COM-01 gates are not repeated as substitutes for these six live proofs.

## 6. Exact remaining live-provider work

### Resend

Required before the Resend gate can close:

1. reconnect/select the Resend account/team that contains the HealthTimes staging resources, or otherwise restore authorized visibility to the historical HealthTimes staging resource;
2. confirm the historical webhook `fa26ffcb-7979-4ab7-b77c-7b941f34c048` still exists, or document a legitimate staging-only replacement if the provider resource was removed;
3. obtain/use the webhook signing secret server-side only;
4. install `COM01_RESEND_WEBHOOK_SECRET` in HealthTimes staging;
5. complete staging sender-domain verification through authoritative DNS;
6. perform one real staging transactional/system send;
7. capture the provider send/message ID safely;
8. capture a genuine signed webhook event ID safely;
9. verify signature authentication;
10. verify exactly one canonical normalized event;
11. replay and prove no duplicate canonical event.

No Wewed sender/domain/webhook may be used.

### Brevo

Required before the Brevo gate can close:

1. restore/establish HealthTimes Brevo account access;
2. preserve the already-prepared staging sender/domain where still valid;
3. create or supply the staging-only API credential;
4. create the dedicated staging folder/list if still absent;
5. add only the bounded certification contact;
6. configure the staging webhook;
7. synchronize one genuinely consent-eligible contact;
8. prove a no-consent contact is not marketing-synchronized;
9. generate one genuine unsubscribe, bounce or complaint event;
10. prove the canonical HealthTimes suppression/consent update;
11. confirm transactional/security delivery remains distinct from marketing suppression.

No production audience may be contacted.

### Cloudflare

Required before Cloudflare inbound/reply gates can close:

1. obtain authoritative access to the account/zone serving `healthtimes.co.zw`;
2. inspect current DNS, MX, SPF, DKIM, DMARC, TTLs and Email Routing state read-only first;
3. establish only a staging mail identity/routing path;
4. complete any staging-only sender-domain DNS verification required by Resend/Brevo;
5. bind the staging Email Worker/Email Routing path to the existing COM ingestion endpoint;
6. install only the staging worker-to-COM secret;
7. receive one real inbound external email;
8. prove exactly one canonical thread/message;
9. prove replay/idempotency;
10. send one authorized application reply using the opaque Reply-To correlation;
11. receive the external response through Cloudflare;
12. prove same-thread correlation;
13. confirm private content/attachments remain anonymous-inaccessible.

Production mail routing must remain unchanged.

## 7. Webhook/authentication/idempotency status

Provider-independent authentication/idempotency logic remains accepted from Phase 12.

Live provider evidence remains pending:

- real Resend signature authentication: **PENDING**
- real Resend exact-once normalization: **PENDING**
- real Resend replay no duplicate: **PENDING**
- real Brevo provider event authentication: **PENDING**
- real Brevo suppression/consent update: **PENDING**
- real Cloudflare inbound exact-once proof: **PENDING**
- real opaque reply same-thread proof: **PENDING**

No synthetic proof is being promoted to live-provider proof.

## 8. Secrets / browser-bundle safety

This continuation made no runtime/configuration code change.

Confirmed:

- no provider API key value committed;
- no webhook signing secret committed;
- no subscriber data committed;
- no sensitive mail content committed;
- no provider secret moved into browser code;
- Wewed credentials/resources not reused;
- no production DNS/mail mutation.

The historical Resend signing secret is referenced only as an existing masked server-side credential requirement; its value is not recorded here.

## 9. Exact-head certification status

No new runtime SHA exists from this lane.

Therefore the executable authority remains:

`f36d6336c65c598191ea2841952a8c9f18bcf57e`

The Phase 12 exact-head provider-independent certification remains the accepted baseline.

A new COM/security/integrated certification matrix is required only after:

- live provider wiring changes staging configuration materially enough to require proof; or
- genuine provider execution reveals a bounded COM/provider boundary defect and code is changed.

Any such runtime change must stay on this Phase-12-descended lane and certify exact:

`EXPECTED_SHA=<final candidate>`

`CHECKED_OUT_SHA=<final candidate>`

## 10. CP7 communications worksheet status

No production DNS/mail mutation was performed.

| Item | Historical/current staging evidence | Production current value | Proposed production target | Rollback |
| --- | --- | --- | --- | --- |
| Resend webhook | Historical HealthTimes staging webhook ID `fa26ffcb-7979-4ab7-b77c-7b941f34c048`; current connected Resend account cannot see it | N/A | staging live proof required before CP7 | disable/remove staging webhook |
| Resend webhook secret | Created historically, masked; server-side install still required | N/A | server-side only | remove staging env secret |
| Resend sender/domain | Prepared historically; DNS verification still pending | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | exact staging DNS rollback values required |
| Brevo staging sender/domain | Prepared historically | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | disable staging sender / remove staging records |
| Brevo API key | Not created at provider-hold checkpoint | N/A | staging-only credential | revoke/delete staging key |
| Brevo staging list | Not created at provider-hold checkpoint | N/A | `HealthTimes COM-01 Certification` if still required | delete staging list |
| Cloudflare staging inbound/reply identity | Not completed; authoritative DNS access pending | UNKNOWN / PENDING PRODUCTION | staging-only identities | remove staging route/records |
| MX | Not changed | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | exact pre-change values required |
| SPF | Not changed | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | exact pre-change values required |
| DKIM | Not changed | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | exact pre-change values required |
| DMARC | Not changed | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | exact pre-change values required |
| TTLs | Not authoritatively captured in this lane | UNKNOWN / PENDING PRODUCTION | UNKNOWN / PENDING PRODUCTION | exact pre-change values required |

Unknown production values remain `UNKNOWN / PENDING PRODUCTION`; nothing is invented.

## 11. Production boundary

- production MX changed: **NO**
- production SPF changed: **NO**
- production DKIM changed: **NO**
- production DMARC changed: **NO**
- production Cloudflare mail routing changed: **NO**
- production HealthTimes sender domain activated: **NO**
- production organizational mailbox changed: **NO**
- bulk marketing sent: **NO**
- `wewed.pro` reused: **NO**
- PR #21 merged: **NO**
- PR #29 merged: **NO**
- production moved: **NO**
- AG-08 started: **NO**
- CP7 claimed accepted: **NO**
- native applications submitted: **NO**

**Production systems modified: NO**

## 12. Current blocker

The correct continuation blocker is **not** “no HealthTimes provider work exists.”

It is:

1. authoritative Cloudflare/DNS access remains required to complete sender-domain verification and staging inbound/reply routing;
2. the currently connected Resend account/team does not expose the historical HealthTimes staging webhook/resource recorded in the provider-hold continuation, so the correct HealthTimes Resend account context must be restored/selected;
3. Brevo staging setup was only partially completed historically: domain/sender prepared, but API key/list/contact/webhook/live event proof remained outstanding.

No code change is justified by these external provider/account/DNS blockers.

## 13. Disposition

**COM-01 NOT READY — live provider certification remains deferred pending authoritative Cloudflare/DNS access, restoration/selection of the Resend account context containing the historical HealthTimes staging webhook, and completion of the outstanding Brevo staging API/list/contact/webhook live evidence.**
