# AG-07 — Certification, Client UAT & Acceptance Ledger

## Mission

Prove that the staging migration is complete enough to recommend or reject production cutover. AG-07 certifies; it does not authorize cutover.

## Prerequisites

- AG-04 rehearsal content/media/taxonomy lane complete.
- AG-05 SEO/analytics/monetization lane complete.
- AG-06 Newsroom backend/security lane complete.

## Mandatory reads

- master programme and agent register
- `docs/migration/10_STAGING_REHEARSAL_RUNBOOK.md`
- `docs/migration/11_PRODUCTION_CUTOVER_ROLLBACK.md`
- `docs/migration/12_MIGRATION_ACCEPTANCE_LEDGER.md`
- all AG-04/05/06 receipts

## Required work

1. Build/complete the formal migration acceptance ledger using evidence, not narrative confidence.
2. Reconcile posts, pages, media, authors, taxonomies and exceptions against the authoritative source snapshot.
3. Verify representative and edge-case migrated articles visually and structurally: long headlines, galleries, embeds, tables, downloads, unusual shortcodes, old media, Premium content and legacy pages.
4. Run broken-link scan and verify every unexplained internal failure is fixed or explicitly accepted.
5. Verify old URL -> new URL/served-path coverage and redirect behaviour.
6. Verify canonical URLs, metadata, structured data, sitemap, robots.txt and RSS.
7. Verify Search Console property plan and Analytics continuity plan.
8. Verify `ads.txt`, `app-ads.txt`, AdSense placement abstraction and direct HOSPAZ-style campaigns.
9. Verify PageSpeed/Web Vitals baseline, accessibility and layout at required mobile/tablet/desktop widths.
10. Run full Playwright/Chromium UAT against staging including public homepage/article/Premium/archive/preferences/about, mobile navigation, article audio, PWA, Newsroom authentication, Reporter save/submit, Editor review/publish, Commercial isolation, staff invite/revoke and security/session flows.
11. Run authorization/API security tests created by AG-06.
12. Verify no draft/internal Newsroom data is publicly exposed.
13. Verify no secrets/sensitive exports are committed.
14. Verify backup/restore evidence exists before recommending cutover.
15. Prepare a client UAT package that lets Michael compare old WordPress and staging HealthTimes without giving production-control credentials.
16. Record all client findings and resolutions in the acceptance ledger.
17. Prepare an explicit recommendation: `CP4 ACCEPTED — CUTOVER MAY BE AUTHORIZED` or `CP4 BLOCKED`.
18. Create `docs/migration/agent-reports/AG-07_CERTIFICATION_CLIENT_UAT.md`.

## Minimum acceptance gates

- 100% expected published article count accounted for or every exception recorded;
- 100% expected published page count accounted for or every exception recorded;
- all authors mapped or exception-listed;
- all required media accounted for or exception-listed;
- taxonomy provenance retained and canonical mapping accepted;
- no unexplained broken internal links;
- legacy URL coverage near 100%, with every exception documented;
- canonical/meta/structured data verified;
- sitemap/robots/RSS verified;
- Analytics continuity verified or explicit client-approved limitation;
- Search Console property verified or explicit blocker/waiver;
- `ads.txt` HTTP 200 with correct verified seller declaration;
- `app-ads.txt` HTTP 200 before app monetization, with verified content only;
- direct ad and AdSense systems separated;
- no protected Newsroom activity leaking to public analytics;
- PageSpeed baseline recorded;
- no unauthorized Newsroom privilege escalation;
- no public exposure of drafts/internal editorial data;
- no secrets/customer exports in source control;
- backup/restore path verified;
- full Chromium UAT green;
- mobile/PWA smoke test green;
- client UAT findings closed or explicitly accepted.

## DNS/email pre-cutover gate

Before recommending cutover, confirm a complete worksheet exists for:

- current A/AAAA/CNAME/web records;
- MX;
- SPF;
- DKIM;
- DMARC;
- mail-provider verification records;
- TTLs;
- new web targets;
- rollback values.

No DNS change is performed by AG-07.

## Stop conditions

AG-07 must mark CP4 BLOCKED if a hard gate is red, unexplained, fabricated or untested.

## Receipt

Report:
- staging build SHA;
- source snapshot date;
- acceptance ledger summary;
- data reconciliation counts;
- SEO/analytics/ads/performance status;
- Chromium/API/security results;
- client UAT result;
- DNS/email worksheet readiness;
- `CP4 ACCEPTED` or `CP4 BLOCKED`;
- explicit `Production systems modified: NO`.
