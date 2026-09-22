# COM-01 — Communications, Email & Distribution Certification Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `communications/com-01-email-distribution`  
**PR:** #21 — Draft / Open / Unmerged / Mergeable  
**Frozen pre-COM runtime authority:** `0112c8802d220d23e20288783536f22e85ea346d`  
**Frozen pre-COM documentation closure:** `52e7a84cd44b4b7156bc6b38eda1e1cfd0832c92`  
**COM-01 runtime candidate:** `5b6fca0fe1dceed5e167b845e023dfc456c47040`  
**Production systems modified:** **NO**

## 1. Scope and authority preservation

COM-01 extends the accepted CA-01/CP6 substrate without rebuilding it.

Preserved authorities:

- CP4 content/media/taxonomy;
- CP5 SEO/analytics/monetization;
- CP6 Auth/RBAC/session/audit;
- CA-01 story discussions, Reader comments, Newsroom communication authority, Realtime isolation and internal notifications;
- NM-07 Native architecture.

COM-01 adds the organizational communications domain required before CP7: editorial/commercial/support/privacy queues, canonical external contacts, private external threads/messages, purpose-specific consent/suppressions, provider event normalization, outbound reply preparation, marketing synchronization state, social distribution approval records and isolated external communication attachments.

The delta from `0c1a9b7172fc46929225785226f0ceaaa573e87c` to runtime candidate `5b6fca0...` is one CA-01 certification-harness line only: staging rerun fixture handles now include `runAttempt`. It changes no Newsroom runtime authority and fixes a same-run retry uniqueness collision.

## 2. Runtime implementation inventory

### Schema / migrations

- `supabase/migrations/20260922183500_com01_communications_domain.sql`
- `supabase/migrations/20260922183600_com01_private_attachments.sql`

HealthTimes Staging project:

- project ref: `gcdohgbmqhqwydgaxrcr`
- region: Tokyo / `ap-northeast-1`
- status observed during implementation: `ACTIVE_HEALTHY`
- both COM-01 migrations were applied successfully on staging;
- full disposable Supabase reset from zero is green at exact runtime head.

### Server / provider orchestration

- `api/communications.js`

Implemented fail-closed server behavior for:

- application-managed inbound ingestion;
- opaque reply identities;
- CP6-authenticated reply preparation;
- Resend transactional send adapter;
- raw-body Svix signature verification path for Resend webhooks;
- authenticated Brevo webhook path;
- public explicit-consent signup;
- Brevo contact synchronization adapter;
- provider-health/configuration reporting;
- server-only provider credentials;
- provider-unavailable state recorded as failure rather than fabricated success.

### Staging certification harness

- `supabase/functions/com01-certification-provision/index.ts`
- `tests/com01-contract.spec.js`
- `.github/workflows/com01-communications.yml`

The certification Edge Function accepts only bounded GitHub OIDC for this repository/workflow and cleans temporary staging fixtures after proof execution.

## 3. Canonical schema inventory

Implemented canonical HealthTimes/Supabase source-of-truth objects include:

- `communication_channels`
- `communication_accounts`
- `contact_profiles`
- `contact_consents`
- `communication_suppressions`
- `communication_threads`
- `communication_participants`
- `communication_messages`
- `communication_assignments`
- `communication_templates`
- `provider_webhook_events`
- `communication_events`
- `communication_idempotency_keys`
- `contact_segments`
- `contact_segment_members`
- `audience_campaigns`
- `campaign_recipients`
- `social_accounts`
- `social_posts`
- `social_publication_attempts`
- `communication_attachments`

Private attachment bucket:

- `communications-private`
- private: yes
- max object size: 10 MiB
- bounded allow-list MIME policy;
- dangerous executable/script extensions quarantined;
- extension/MIME mismatch quarantined;
- anonymous direct table/storage access denied.

## 4. CP6 capability integration

COM-01 adds capabilities without replacing CP6 role/session authority.

Key capabilities:

- `communications.view`
- `communications.reply`
- `communications.assign`
- `communications.close`
- `communications.send`
- `communications.manage_templates`
- `communications.manage_contacts`
- `communications.manage_consent`
- `communications.manage_channels`
- `communications.queue.editorial`
- `communications.queue.commercial`
- `communications.queue.support`
- `communications.queue.privacy`
- `marketing.create`
- `marketing.approve`
- `marketing.send`
- `marketing.analytics`
- `social.compose`
- `social.approve`
- `social.publish`
- `social.manage_accounts`

### Exact staging role-boundary proof

| Role | Tips/editorial | Advertising/commercial | Support | Privacy |
| --- | --- | --- | --- | --- |
| Reporter / Journalist | ALLOW | DENY | DENY | DENY |
| Editor-in-Chief | ALLOW | DENY | ALLOW | DENY |
| Commercial Manager | DENY | ALLOW | ALLOW | DENY |
| Publisher / Owner | ALLOW | ALLOW | ALLOW | ALLOW |

Result: **PASS**.

## 5. Live HealthTimes Staging evidence

Exact-head COM-01 workflow:

- run: `35714484683`
- runtime SHA: `5b6fca0fe1dceed5e167b845e023dfc456c47040`
- contract job: SUCCESS
- disposable schema job: SUCCESS
- live staging contract job: SUCCESS
- evidence artifact: `com01-staging-evidence`
- artifact digest: `sha256:0e07bee104ab262f99930746faf5757e4e4362ad5202443146b6c86082962486`

### Canonical inbound / idempotency proof

- first bounded inbound event: `duplicate=false`
- replay of same provider event: `duplicate=true`
- replay did not create a second canonical message/thread;
- reply using the canonical opaque reply token resolved to the same existing thread;
- staging result: **PASS**.

### Provider-event normalization logic

Bounded certification used a synthetic provider event after canonical send-state preparation:

- first normalized event: `duplicate=false`
- replay: `duplicate=true`
- normalized event count: exactly `1`

Result: **logic/idempotency PASS**.

Important limitation: this proof is explicitly marked `synthetic_only=true`; it is **not** evidence of a live signed Resend/Brevo provider webhook.

### Consent / suppression proof

- explicit NEWSLETTER consent -> marketing eligible: `true`
- no consent -> marketing eligible: `false`
- marketing opt-out -> marketing eligible: `false`
- security/transactional eligibility after marketing-only opt-out: `true`
- bounce -> canonical `email_delivery / bounce` suppression;
- complaint -> canonical `email_delivery / complaint` suppression.

Result: **PASS** for canonical HealthTimes state semantics.

### Privacy / attachment proof

- anonymous private communications access denied: `true`
- dangerous executable attachment status: `quarantined`

Result: **PASS**.

### Social approval / fail-closed proof

- unapproved social publication denied: `true`
- approved attempt with no configured social provider: `status=unconfigured`
- provider ready: `false`
- result/provenance record written: `true`

Result: **PASS** for mandatory human approval and fail-closed provenance behavior.

### Certification cleanup

The exact-head live staging run removed its bounded fixtures:

- temporary auth users: 4
- temporary staff profiles: 4
- temporary contacts: 5
- temporary threads: 1
- temporary messages: 3

No production data was used or modified.

## 6. Exact-head regression/certification matrix

All exact-head workflows at `5b6fca0...` are green:

| Workflow | Run | Result |
| --- | ---: | --- |
| COM-01 Communications | 35714484683 | SUCCESS |
| CA-01 Communications Security | 35714484423 | SUCCESS |
| AG-06 Newsroom Security | 35714484439 | SUCCESS |
| Validate HealthTimes 2.0 | 35714484369 | SUCCESS |
| Migration Tests | 35714484350 | SUCCESS |
| Chromium UAT | 35714484390 | SUCCESS |
| Native Mobile Foundation + Staging + Contracts + Reader + Growth + Security + Certification | 35714484445 | SUCCESS |

The earlier CA-01 rerun collision was a certification-fixture uniqueness issue, not a communications-runtime failure. The handle was made attempt-specific and the fresh exact-head CA-01 run is green.

## 7. Provider inventory and current evidence state

### HealthTimes / Supabase

Role: canonical state, consent, suppressions, threads/messages, assignments, provider events, social attempts, audit.

Status:

- staging schema/runtime implemented;
- canonical logic proof green;
- no source-of-truth responsibility delegated to Resend or Brevo.

### Vercel staging

Project:

- `healthtimes-staging`

Exact-head deployment observed:

- branch: `communications/com-01-email-distribution`
- SHA: `5b6fca0fe1dceed5e167b845e023dfc456c47040`
- deployment state: `READY`

The preview is protected by Vercel SSO. External unauthenticated webhook probes were intercepted by deployment protection before the COM endpoint, so they are not provider-route proof.

### Resend

Connected Resend account inventory observed during COM-01 work:

- one verified domain: `updates.wewed.pro`
- sending: enabled
- receiving: disabled
- configured webhook endpoint belongs to `wewed.pro`
- API-key names observed: `Wewed Production Sender`, `Onboarding`

These are unrelated to HealthTimes and were **not reused**.

HealthTimes-specific Resend evidence still missing:

- verified HealthTimes staging sender identity;
- scoped HealthTimes staging API credential installed server-side;
- HealthTimes staging webhook secret installed server-side;
- HealthTimes staging webhook endpoint registered with Resend;
- real authorized COM reply accepted by Resend;
- real signed delivery/failure event received and normalized exactly once.

### Brevo

COM-01 includes the canonical synchronization adapter and consent/suppression semantics, but no HealthTimes Brevo account/list/webhook proof was available in this certification lane.

Still missing:

- HealthTimes staging API credential;
- approved list/segment IDs for required marketing purposes;
- real eligible contact synchronization;
- real Brevo unsubscribe/bounce/complaint event into canonical HealthTimes state;
- webhook authentication proof.

Brevo remains a delivery system only; HealthTimes/Supabase remains canonical.

### Cloudflare

COM-01 defines Cloudflare as the bounded inbound mail edge and accepts authenticated inbound events into the canonical domain.

Still missing:

- HealthTimes staging inbound mail hostname/subdomain;
- Cloudflare Email Routing/Worker binding for that staging identity;
- bounded worker-to-COM webhook secret installed on both sides;
- real inbound email reaching exactly one canonical thread;
- real reply email routing through the opaque reply identity to the existing thread.

No production Cloudflare mail routing was changed.

## 8. Required acceptance matrix

| Moderator requirement | State |
| --- | --- |
| inbound message -> exactly one canonical thread | PASS — bounded staging canonical ingestion |
| replayed inbound -> no duplicate | PASS |
| authorized reply -> provider send succeeds | **NOT PROVEN — real HealthTimes Resend send missing** |
| reply -> correct existing thread | PASS — opaque-token canonical threading |
| transactional delivery/failure webhook -> exactly one normalized event | LOGIC PASS / **LIVE PROVIDER PROOF MISSING** |
| marketing signup -> canonical consent + eligible Brevo sync | canonical consent PASS / **Brevo sync proof missing** |
| no-consent marketing send denied | PASS — eligibility fail-closed |
| unsubscribe/bounce/complaint -> canonical suppression | canonical semantics PASS / **real provider webhook proof missing** |
| marketing opt-out does not disable security/transactional | PASS |
| anonymous/private communications denied | PASS |
| Reporter/Editor/Commercial/Publisher boundaries | PASS |
| private attachment anonymous access denied | PASS |
| webhook auth and replay/idempotency | contract/replay logic PASS / **real signed provider event missing** |
| unapproved social publish denied | PASS |
| approved social attempt result/provenance | PASS — fail-closed `unconfigured` result recorded |
| provider unavailable/unconfigured -> fail closed | PASS |

## 9. CP7 DNS / mail-routing worksheet

**This is a worksheet only. No production DNS/mail mutation is authorized or performed.**

| Item | Intended responsibility | Pre-CP7 value to capture | CP7 candidate value | TTL plan | Rollback value |
| --- | --- | --- | --- | --- | --- |
| inbound staging hostname | Cloudflare | capture before change | dedicated non-production mail identity | record current TTL before change | restore captured record |
| inbound route / Email Worker | Cloudflare | capture existing route set | bounded HealthTimes staging worker -> COM endpoint | N/A / provider config | restore prior route set |
| transactional sender | Resend | none proven for HealthTimes | verified HealthTimes staging sender | DNS-dependent | disable sender + remove staging route |
| transactional DKIM | Resend/DNS | capture authoritative DNS | provider-issued staging DKIM records | low TTL during rehearsal only | restore captured records |
| transactional SPF | DNS | capture authoritative SPF | merge provider authorization without destructive replacement | low TTL during rehearsal only | restore captured SPF |
| marketing sender | Brevo | none proven for HealthTimes | distinct approved marketing sender/subdomain | DNS-dependent | disable sender + restore records |
| marketing DKIM | Brevo/DNS | capture authoritative DNS | provider-issued DKIM records | low TTL during rehearsal only | restore captured records |
| MX | Cloudflare/mail host | **must capture; production untouched** | no production change under COM-01 | preserve existing | exact captured MX |
| DMARC | DNS | **must capture** | preserve policy unless moderator authorizes CP7 change | preserve existing | exact captured DMARC |
| production organizational mailboxes | existing mail provider | preserve | preserve | N/A | no change |

Required before any CP7 DNS execution:

1. authoritative current MX/SPF/DKIM/DMARC values;
2. TTLs;
3. current Cloudflare Email Routing rules;
4. staging sender/domain ownership;
5. exact rollback records;
6. provider verification receipts.

## 10. Remaining blockers

The implementation is code-complete enough for integration review, and all exact-head repository/security/staging logic gates are green. COM-01 still fails the moderator's **live external-provider** acceptance requirement.

Blocking evidence not yet obtained:

1. a HealthTimes-specific Resend staging sender and server-side credential;
2. a real authorized outbound reply accepted by Resend;
3. a real signed Resend delivery/failure webhook normalized once;
4. HealthTimes-specific Brevo account/list credentials and a real eligible signup sync;
5. a real Brevo unsubscribe/bounce/complaint webhook updating canonical state;
6. a HealthTimes staging Cloudflare Email Routing/Worker path proving real inbound mail and real reply-thread routing.

The existing connected Resend domain/webhook belong to another project and are intentionally not reused.

## 11. Production boundary

- production MX modified: **NO**
- production SPF modified: **NO**
- production DKIM modified: **NO**
- production DMARC modified: **NO**
- production Cloudflare mail routing modified: **NO**
- production sender domains modified: **NO**
- existing live organizational mailboxes modified: **NO**
- production deployment authorized: **NO**

**Production systems modified: NO**

## 12. Disposition

**COM-01 NOT READY — HealthTimes-specific live external-provider evidence is still missing: no verified Resend staging sender/send/signed-webhook proof, no Brevo staging synchronization/webhook proof, and no Cloudflare staging inbound Email Worker route proof.**
