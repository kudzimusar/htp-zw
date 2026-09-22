# COM-01 — Communications, Email & Distribution

## Mission

Implement and certify the HealthTimes Communications domain in staging before AG-07 / CP7 integration.

COM-01 converts the accepted CP4/CP5/CP6 foundations into a coherent communication system for inbound/outbound email, audience marketing, internal notifications and controlled social distribution.

## Prerequisites

- CP4 / AG-04 accepted.
- CP5 / AG-05 accepted.
- CP6 / AG-06 accepted.
- Moderator authorization.
- Read `docs/HEALTHTIMES_COMMUNICATIONS_PLATFORM_PLAN.md` in full.

## Authoritative inherited contracts

COM-01 must preserve:
- CP4 content/media/taxonomy and internal-link authority;
- CP5 audience/analytics/monetization and provenance contracts;
- CP6 server-backed Auth/RBAC/session/audit architecture.

Do not rebuild those domains or create parallel authority.

## Provider responsibilities

- Cloudflare: DNS/mail edge, inbound routing, Email Workers where used, WAF/rate limiting.
- Resend: transactional/system outbound email and application-managed replies.
- Brevo: newsletters, segmentation, marketing campaigns and automation.
- HealthTimes/Supabase: canonical threads, messages, contacts, consent, suppressions, campaigns, assignments, audit and normalized provider events.
- Social providers: outbound distribution only through verified adapters and human approval.

## Required environment/tools

Read `03_TOOL_ENVIRONMENT_MATRIX.md` first.

COM-01 requires:
- GITHUB;
- SUPABASE staging;
- VERCEL staging;
- RESEND staging/sandbox;
- CLOUDFLARE-EMAIL staging/test routing capability where available;
- BREVO staging/test marketing capability where available;
- BROWSER-UAT;
- direct API/webhook/RLS/security test tooling.

If a provider cannot be connected in staging, fail closed and report the exact blocker. Do not fabricate delivery, account, domain or campaign evidence.

## Required implementation

1. Add the canonical communications schema and migrations.
2. Implement private communication threads/messages/participants/attachments.
3. Extend CP6 capability enforcement for communications/marketing/social scopes.
4. Build inbound organizational-email ingestion with normalized queue/thread routing.
5. Build transactional/system sending through Resend.
6. Implement opaque application-managed Reply-To/thread correlation.
7. Implement signed/authenticated webhook ingestion with idempotency/replay protection.
8. Implement contact, consent, suppression and provider-sync state.
9. Integrate Brevo for eligible marketing/newsletter contacts, campaigns and provider events.
10. Keep marketing consent separate from transactional/security/service delivery.
11. Integrate Newsroom internal notifications with external-email escalation only where policy requires.
12. Build Communications workspace: Inbox, assignment, internal notes, contacts, campaigns/newsletter, social, templates, analytics/provider health.
13. Implement private attachment storage and bounded validation/quarantine behavior.
14. Implement social distribution drafts/approval/publication-attempt records; no auto-publish without human approval.
15. Normalize provider events into HealthTimes `communication_events`.
16. Add provider configuration/readiness surfaces that fail closed when evidence is missing.
17. Produce the CP7 production DNS/email worksheet covering MX/SPF/DKIM/DMARC, sender/routing subdomains, TTLs, new targets and rollback values.
18. Create `docs/migration/agent-reports/COM-01_COMMUNICATIONS_EMAIL_DISTRIBUTION.md`.

## Staging safety

COM-01 must not:
- alter production MX/DNS/mail routing;
- activate production sender domains;
- create production staff/marketing identities;
- send bulk marketing to production audiences;
- expose provider API keys to browser code;
- commit subscriber/contact exports or secrets;
- bypass CP6 capability/RLS controls.

Use staging/test identities and domains only.

## Mandatory certification scenarios

### Inbound
- one inbound message creates exactly one thread/message;
- duplicate/replayed inbound event does not duplicate the thread;
- queue classification and assignment are auditable;
- unsafe attachment handling fails closed.

### Transactional outbound
- authorized staff/system send succeeds in staging;
- unauthorized role send is denied;
- provider delivery/failure webhook is recorded once;
- reply returns to the correct existing thread.

### Consent/marketing
- signup records purpose/channel/source/policy version;
- eligible consent synchronizes to Brevo;
- no-consent marketing send is denied;
- unsubscribe/bounce/complaint updates canonical suppression;
- transactional security/service mail is not accidentally suppressed by marketing opt-out.

### Internal communications
- accepted CP6 Newsroom notifications remain authoritative;
- email escalation does not replace or weaken audit/history;
- Reporter/Commercial/Editor/Publisher boundaries remain enforced.

### Social distribution
- story creates platform draft;
- human approval is required;
- unapproved publish attempt is denied;
- approved provider attempt records result/provenance;
- unsupported/unconnected platform fails closed.

### Security
- anonymous cannot read communications/contact/attachment data;
- provider webhook authentication enforced;
- webhook replay/idempotency proven;
- service/provider secrets absent from browser/Git;
- private attachments inaccessible anonymously;
- audit logs persist privileged sends/consent/approval/security events.

## COM-01 acceptance gates

All gates in `docs/HEALTHTIMES_COMMUNICATIONS_PLATFORM_PLAN.md` section 14 are mandatory.

COM-01 must return `COM-01 NOT READY` if any required staging proof is unavailable, fabricated, red or dependent on a production mutation.

## CP7 handoff

COM-01 must provide:
- final runtime SHA;
- schema/migration list;
- provider/configuration inventory;
- staging sender/routing identities;
- RBAC capability matrix;
- inbound/outbound thread evidence;
- consent/suppression evidence;
- webhook/idempotency evidence;
- attachment/privacy evidence;
- internal-notification evidence;
- social-approval evidence;
- exact test/CI results;
- production DNS/email worksheet;
- unresolved provider/account evidence gaps;
- explicit `Production systems modified: NO`.

Successful final line:

`COM-01 ACCEPTED — AG-07 / CP7 integration dependency is CLEAR`

Otherwise:

`COM-01 NOT READY — <exact remaining blocker>`
