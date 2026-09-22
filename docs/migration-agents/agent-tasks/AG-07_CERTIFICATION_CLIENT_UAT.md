# AG-07 — Integrated Certification, Client UAT & Acceptance Ledger

## Mission

Prove whether the integrated staging migration is complete enough for the owner to consider authorizing production cutover. AG-07 certifies; it does not authorize cutover.

## Prerequisites

- CP4 / AG-04 accepted.
- CP5 / AG-05 accepted.
- CP6 / AG-06 accepted.
- COM-01 / Communications, Email & Distribution accepted.
- Moderator authorizes integration/certification.

## Required environment/tools

Read `docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md` first.

AG-07 requires:
- GITHUB;
- BROWSER-UAT/Playwright/Chromium;
- read/test access to the integrated staging Vercel/Supabase environment;
- GOOGLE-READ for continuity evidence where access exists;
- accessibility/performance/security validation tooling as available.

AG-07 is not allocated production mutation credentials or DNS-CONTROL.

## Mandatory reads

- master programme, agent register, launch instructions and tool matrix;
- `docs/migration/10_STAGING_REHEARSAL_RUNBOOK.md`;
- `docs/migration/11_PRODUCTION_CUTOVER_ROLLBACK.md`;
- `docs/migration/12_MIGRATION_ACCEPTANCE_LEDGER.md`;
- all AG-04/05/06 reports/receipts;
- COM-01 report/receipt and `docs/HEALTHTIMES_COMMUNICATIONS_PLATFORM_PLAN.md`.

## Integrated-candidate rule

AG-07 must certify one actual integrated staging candidate, not isolated agent branches. Record the AG-04/05/06 and COM-01 source SHAs, resolve integration conflicts deliberately, then freeze a certification-candidate SHA. Any fix after freeze creates a new candidate SHA and requires affected recertification.

Before integrated UAT starts, the designated integrated candidate must own the primary rehearsal routing surface. The stale `healthtimes-staging.vercel.app` assignment remains a **CP7 INTEGRATED STAGING CANDIDATE / PLATFORM ROUTING REQUIREMENT** and must be reassigned from the old AG-02 deployment to the frozen integrated candidate before primary-alias certification.

## Required work

1. Build/complete the formal migration acceptance ledger using evidence rather than narrative confidence.
2. Reconcile posts, pages, media, authors, taxonomy and exceptions against the authoritative AG-03 source snapshot.
3. Verify representative/edge-case migrated content including long headlines, galleries, embeds, tables, downloads, unusual shortcodes, old media, Premium content and legacy pages.
4. Run broken-link scan and require every unexplained migration failure to be fixed or explicitly dispositioned.
5. Verify legacy URL coverage and redirect behavior.
6. Verify canonical URLs, metadata, structured data, sitemap, robots.txt and RSS.
7. Verify Analytics continuity, Search Console plan, staging isolation and public/internal analytics privacy boundary.
8. Verify `ads.txt`, `app-ads.txt`, AdSense/direct-ad separation and HOSPAZ-style direct campaign handling.
9. Verify PageSpeed/Web Vitals baseline, accessibility and layout at required mobile/tablet/desktop widths.
10. Run full Playwright/Chromium UAT against server-backed staging: public pages, Premium, Listen, PWA, Newsroom authentication, Reporter save/submit, Editor review/publish, Commercial isolation, staff invite/revoke and session/security flows.
11. Run AG-06 direct API/RLS authorization tests.
12. Verify anonymous/public access cannot read drafts/internal Newsroom data.
13. Verify no secrets/sensitive exports are committed or browser-exposed.
14. Verify backup/restore evidence and AG-04 importer idempotency/resume evidence.
15. Verify COM-01 communications integration end-to-end: inbound thread creation, transactional outbound/replies, consent/suppression, private attachments, webhook authentication/idempotency, internal notifications, human-approved social distribution and provider-secret isolation.
16. Verify complete DNS/email pre-cutover worksheet covering A/AAAA/CNAME, MX, SPF, DKIM, DMARC, sender/routing subdomains, TTLs, new targets and rollback values.
17. Reassign and verify `healthtimes-staging.vercel.app` against the frozen integrated candidate before primary-alias UAT.
18. Prepare a client UAT package for Michael Gwarisa using staging-only access.
19. Record client findings in the acceptance ledger with severity and retest status.
20. Separate technical readiness, client acceptance and owner authorization; AG-07 can only certify the first two.
21. Create `docs/migration/agent-reports/AG-07_CERTIFICATION_CLIENT_UAT.md`.

## Minimum hard gates

- 100% expected published articles/pages accounted for or exception-listed;
- authors and required media accounted for or exception-listed;
- taxonomy provenance retained and canonical mapping accepted;
- no silent shortcode/custom-field loss;
- no unexplained migration-broken internal links;
- legacy URL accountability near 100% with explicit exceptions;
- canonical/meta/structured data, sitemap, robots and RSS verified;
- Analytics continuity/Search Console identity resolved or precisely blocked/owner-dispositioned;
- `ads.txt` HTTP 200 with verified seller declaration;
- `app-ads.txt` HTTP 200 with verified-only content before app monetization;
- direct ads and AdSense separate;
- no protected Newsroom activity leaking to public analytics;
- performance baseline recorded and no release-blocking accessibility/responsive defect;
- Reporter cannot publish; Commercial cannot publish editorial content; anonymous cannot read drafts/internal data;
- session/access revocation and audit persistence proven;
- COM-01 inbound/outbound email, consent/suppression, webhook, attachment-privacy, internal-notification and human-approved social-distribution gates proven;
- no secrets/customer exports in source control;
- backup/restore path verified;
- importer idempotency/resume verified;
- full relevant Chromium UAT green;
- client UAT has no unresolved P0/P1;
- DNS/email worksheet and rollback plan credible;
- primary `healthtimes-staging.vercel.app` alias serves the frozen integrated CP7 candidate before integrated UAT;
- production systems untouched.

## Client UAT severity

- P0 — security/data-loss/cutover impossible;
- P1 — critical workflow/content failure;
- P2 — significant defect requiring explicit disposition;
- P3 — minor defect/polish;
- P4 — post-migration enhancement.

CP7 cannot pass with unresolved P0/P1.

## Stop conditions

AG-07 must return `CP7 BLOCKED` if a hard gate is red, unexplained, fabricated or untested. Missing production-only actions may be recorded as `PENDING PRODUCTION` where appropriate, but they must not be represented as already executed.

## Receipt

Return `# AG-07 — CP7 Integrated Certification & Client UAT Receipt` containing:

- AG-04/05/06 and COM-01 source SHAs;
- integrated branch and frozen candidate SHA;
- staging URL/build identifier;
- authoritative source snapshot and reconciliation counts;
- content/media/taxonomy/URL/SEO evidence;
- Analytics/Search Console/AdSense/direct-ad status;
- performance/accessibility/mobile/PWA evidence;
- public and Newsroom UAT;
- direct API/security results;
- exact test pass/fail counts;
- backup/restore/idempotency evidence;
- Communications/Email/Distribution certification evidence;
- primary staging-alias routing evidence;
- DNS/email/rollback readiness;
- client UAT findings and remaining severity counts;
- acceptance-ledger status counts;
- explicit `Production systems modified: NO`;
- `Owner production authorization: NOT GRANTED BY AG-07`.

End with exactly one:

`CP7 ACCEPTED — integrated staging migration is certified; AG-08 remains LOCKED pending explicit owner authorization`

or

`CP7 BLOCKED — production cutover must not be authorized`
