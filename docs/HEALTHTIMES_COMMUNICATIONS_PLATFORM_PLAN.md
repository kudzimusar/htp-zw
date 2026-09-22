# HealthTimes Communications Platform Plan

Status: **CANONICAL PRE-CP7 ARCHITECTURE**

Repository: `kudzimusar/htp-zw`

Programme checkpoint: **COM-01 — Communications, Email & Distribution**

## 1. Purpose

HealthTimes communications is a first-class platform domain spanning organizational email, transactional delivery, audience marketing, internal Newsroom notifications and controlled social distribution.

The Communications domain must be proven in staging before AG-07 / CP7 integrated certification starts.

## 2. Provider responsibility model

HealthTimes remains the canonical system of record. External providers are delivery and routing engines.

| Provider / system | Responsibility |
| --- | --- |
| HealthTimes + Supabase | canonical contacts, consent, suppressions, threads, messages, assignments, campaigns, audit, RBAC and provider-event normalization |
| Vercel server/API | application orchestration, authenticated provider calls and webhook ingress |
| Cloudflare | DNS/mail edge, inbound routing, Email Workers where used, WAF/rate limiting and future production mail-routing controls |
| Resend | transactional/system outbound email and app-managed conversation replies |
| Brevo | newsletters, contact segmentation, marketing campaigns and marketing automation |
| Newsroom | internal staff notifications, assignment/review alerts and communications workflow UI |
| Social-provider adapters | outbound social distribution after human approval; inbound support only where provider APIs and account permissions are verified |

Provider-specific data must not become the sole organizational record.

## 3. Communications domains

### Transactional/system

Examples:
- staff invitation;
- email verification;
- password reset;
- security/session alert;
- assignment/review notification;
- subscription/service receipt;
- application-managed reply.

Primary delivery provider: **Resend**.

Transactional delivery must remain independent from marketing opt-out state except where law/policy explicitly requires otherwise.

### Inbound organizational email

Target queues include:
- newsroom;
- tips;
- corrections;
- advertising;
- subscriptions;
- support;
- privacy;
- press.

Inbound transport is routed at the Cloudflare mail edge into a bounded HealthTimes ingestion path. Do not recreate a general-purpose mailbox product; build queue/thread workflow around organizational communication.

### Marketing/audience

Examples:
- newsletters;
- breaking-news subscriptions;
- topical updates;
- event/campaign messaging;
- segmented audience journeys.

Primary provider: **Brevo**.

HealthTimes owns canonical consent/suppression history and synchronizes eligible contacts/segments to Brevo.

### Internal communications

Internal Newsroom events remain server-backed application notifications first. Email is an escalation/delivery channel, not the source of truth.

### Social distribution

Published stories may produce platform-specific drafts. Human approval is mandatory before any external publication. No AI-generated caption may auto-publish without the approved workflow.

## 4. Canonical data model

COM-01 should extend the accepted HealthTimes schema with bounded entities such as:

- `communication_channels`
- `communication_accounts`
- `communication_threads`
- `communication_messages`
- `communication_participants`
- `communication_attachments`
- `communication_assignments`
- `communication_templates`
- `communication_events`
- `provider_webhook_events`
- `contact_profiles`
- `contact_consents`
- `communication_suppressions`
- `contact_segments`
- `audience_campaigns`
- `campaign_recipients`
- `social_accounts`
- `social_posts`
- `social_publication_attempts`
- `communication_idempotency_keys`

Reuse accepted entities including `staff_profiles`, `newsroom_notifications`, `audit_logs`, `stories`, `authors`, subscriber/audience entities and AG-05 analytics/integration records rather than duplicating authority.

## 5. Capability model

Extend the accepted AG-06 capability model with bounded permissions such as:

- `communications.view`
- `communications.reply`
- `communications.assign`
- `communications.close`
- `communications.send`
- `communications.manage_templates`
- `communications.manage_contacts`
- `communications.manage_consent`
- `communications.manage_channels`
- `marketing.create`
- `marketing.approve`
- `marketing.send`
- `marketing.analytics`
- `social.compose`
- `social.approve`
- `social.publish`
- `social.manage_accounts`

Reporter, Editor, Commercial, Social/Distribution and Publisher responsibilities must remain separated. Commercial access must not imply editorial publication authority. Marketing-send authority must not be inferred from ordinary Newsroom access.

## 6. Consent and suppression

Do not use a single generic opt-in boolean.

Canonical consent should be purpose/channel specific, for example:

- NEWSLETTER
- BREAKING_NEWS
- MARKETING
- RESEARCH_UPDATES
- EVENTS
- PARTNER_CONTENT
- SMS
- WHATSAPP
- PUSH

Record at minimum:
- granted/withdrawn timestamps;
- source;
- policy version;
- channel;
- provider-sync state;
- suppression/bounce/complaint reason.

Marketing unsubscribe/bounce/complaint events must update HealthTimes canonical state. Transactional security/service messages remain separately classified.

## 7. Inbound thread model

Application-managed replies should use opaque thread identities; never expose sequential database IDs in addresses.

Conceptual flow:

```text
external sender
  → Cloudflare mail edge
  → bounded inbound worker/API
  → validation/quarantine
  → communication_thread + communication_message
  → staff queue/assignment
  → Resend outbound reply
  → opaque Reply-To identity
  → subsequent inbound reply re-attached to same thread
```

## 8. Private attachments and safety

Communication bodies and attachments are private by default.

Required controls:
- private storage bucket;
- MIME/type/size validation;
- dangerous-extension rejection;
- malware/quarantine integration where available;
- sanitized HTML rendering;
- link-safety handling;
- no anonymous access;
- audited staff access;
- explicit retention/deletion policy.

## 9. Webhook security and reliability

Every provider webhook must have:
- provider signature/authentication verification where supported;
- Cloudflare WAF/rate limiting where applicable;
- payload/schema validation;
- idempotency/deduplication;
- replay-safe processing;
- bounded raw-payload retention;
- normalized `communication_events`;
- audit evidence for privileged mutations.

Provider secrets must remain server-side and outside Git/browser bundles.

## 10. Staging-domain strategy

Do not mutate current production HealthTimes MX/DNS during COM-01.

Use isolated staging/test sender/routing identities and, where provider/domain setup is authorized, bounded subdomain patterns such as:

- `notify.healthtimes.co.zw` for transactional/system sender identity;
- `reply.healthtimes.co.zw` for application-managed inbound/replies;
- `news.healthtimes.co.zw` for marketing/newsletter reputation separation.

Exact production records must be captured in the CP7 DNS/email worksheet before any AG-08 production action.

## 11. Communications UI

The Newsroom should expose a bounded Communications workspace containing:
- Overview
- Inbox
- Assigned to me
- Sent
- Scheduled
- Campaigns
- Newsletter
- Social
- Contacts
- Templates
- Analytics
- Provider health
- Settings

A conversation should show external messages, internal notes, assignment, status, linked story/contact and audit history.

Examples:
- tip → story lead → assignment;
- correction → linked article → editorial correction workflow;
- advertiser enquiry → Commercial queue → campaign;
- subscriber/support enquiry → assigned support workflow.

## 12. Analytics boundary

Provider events are normalized into HealthTimes intelligence but must not fabricate unavailable metrics.

Examples:
- send/delivery/failure/bounce/complaint;
- open/click where provider evidence exists;
- unsubscribe/suppression;
- inbound queue volume;
- response time;
- campaign/list growth;
- social publication result/referral attribution where verified.

Protected staff/editorial content must not leak into public analytics.

## 13. Production DNS/email safety

Production email continuity remains a hard release gate.

COM-01 may produce the proposed production topology and DNS worksheet but may not change:
- production MX;
- production SPF;
- production DKIM;
- production DMARC;
- production Cloudflare mail routing;
- production sender domains;
- live organizational mailboxes.

Only owner-unlocked AG-08 may execute production DNS/mail changes after CP7 acceptance.

## 14. COM-01 hard acceptance gates

COM-01 is not accepted until staging proves:

1. inbound message creates exactly one canonical thread/message;
2. authorized staff can reply through the transactional provider;
3. reply correlation returns to the correct thread;
4. transactional provider delivery/failure webhook path is verified;
5. newsletter signup creates canonical consent and eligible provider sync;
6. unsubscribe/bounce/complaint updates canonical suppression/consent state;
7. marketing send is denied without valid consent;
8. transactional security/service delivery remains separate from marketing suppression;
9. internal Newsroom notifications operate independently of external email;
10. Reporter/Editor/Commercial/Publisher communications capabilities are enforced without privilege leakage;
11. communication attachments remain private and unsafe objects are rejected/quarantined;
12. social distribution requires human approval and records provider result;
13. no provider secret is committed or browser-exposed;
14. webhook ingestion is authenticated, idempotent and replay-safe;
15. staging uses isolated identities/domains/accounts and does not alter production MX;
16. provider-health/configuration empty states fail closed when evidence is missing;
17. a production DNS/MX/SPF/DKIM/DMARC/rollback worksheet is produced for CP7.

## 15. Programme placement

Canonical sequence:

```text
CP1 → CP2 → CP3
          ↓
   CP4 + CP5 + CP6
          ↓
COM-01 Communications, Email & Distribution
          ↓
AG-07 / CP7 Integrated Certification + Client UAT
          ↓
EXPLICIT OWNER PRODUCTION AUTHORIZATION
          ↓
AG-08 / CP8 Production Cutover + Rollback
```

AG-07 is blocked until COM-01 is moderator-accepted.
