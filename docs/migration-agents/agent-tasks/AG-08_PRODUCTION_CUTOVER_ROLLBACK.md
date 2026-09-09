# AG-08 — Production Cutover & Rollback

Status: **LOCKED UNTIL EXPLICIT OWNER AUTHORIZATION**

## Mission

Execute the approved final migration only after CP4 has been accepted and the owner explicitly authorizes production cutover.

## Hard prerequisites

All must be true before any production-changing action:

1. AG-07 report says `CP4 ACCEPTED — CUTOVER MAY BE AUTHORIZED`.
2. Owner gives explicit production-cutover authorization after reviewing that report.
3. HealthTimes/client approves a content freeze window.
4. Current production backups/exports are captured and verified.
5. Staging rehearsal has passed.
6. Production destination infrastructure is provisioned and smoke-tested on a temporary URL.
7. DNS/email worksheet is complete and approved.
8. MX/SPF/DKIM/DMARC preservation plan is verified.
9. Rollback criteria and exact rollback values are recorded.
10. On-call/monitoring ownership for the cutover window is defined.

Without all ten, STOP.

## Mandatory reads

- master programme and agent register
- `docs/migration/11_PRODUCTION_CUTOVER_ROLLBACK.md`
- `docs/migration/12_MIGRATION_ACCEPTANCE_LEDGER.md`
- AG-07 final certification receipt
- approved DNS/email worksheet

## Authorized sequence after unlock

1. Announce/finalize editorial content freeze.
2. Capture final WordPress database/WXR snapshot and media delta.
3. Generate checksums and compare to rehearsal source manifest.
4. Run final production import in dry-run mode first.
5. Resolve any delta-only exceptions before real import.
6. Apply production schema migrations using approved migration procedure.
7. Import final content/data/media using idempotent tooling.
8. Import/activate production Newsroom staff identities according to approved list; do not reuse demo passwords as production credentials.
9. Configure verified production Google/Analytics/Search Console/AdSense integrations with secrets stored only in approved secret stores.
10. Serve verified `ads.txt` and `app-ads.txt` as appropriate.
11. Deploy production backend/frontend to temporary/verification URL.
12. Run smoke tests before DNS: homepage, sample old article URLs, Premium, ads, reader/auth, Newsroom Reporter/Editor/Commercial, sitemap, robots, RSS, media, SSL and APIs.
13. Verify email records remain untouched/ready.
14. Reduce TTL only according to the preapproved schedule if not already done.
15. Change only the approved web DNS records. Preserve mail records.
16. Verify public SSL/domain routing.
17. Verify legacy URLs/redirects/canonicals.
18. Verify sitemap/robots/RSS and submit/validate Search Console steps.
19. Verify Analytics pageview/event receipt.
20. Verify AdSense serving/ads.txt and direct campaign placement.
21. Verify Newsroom production login and authorization.
22. Verify Premium/subscriber behaviour according to production readiness.
23. Verify email sending/receiving after web DNS change.
24. Monitor 404, 5xx, latency, client errors, auth errors, ad failures and migration discrepancies continuously through the agreed stabilization window.
25. Keep WordPress protected/read-only as rollback source for at least 60–90 days unless client and owner approve another retention period.

## Rollback triggers

Rollback must be considered immediately if any of the following cannot be resolved within the approved cutover window:

- widespread legacy URL failure;
- material article/media loss;
- production database corruption;
- Newsroom authorization/security failure;
- email interruption caused by DNS change;
- SSL/domain failure;
- critical Premium/subscriber failure;
- AdSense authorization/ads.txt break that threatens monetization materially;
- severe 5xx/availability regression;
- client-approved hard gate fails after DNS switch.

## Rollback sequence

Use the exact pre-recorded values from the runbook/worksheet. At minimum:

1. stop new production writes if necessary;
2. restore previous web DNS target while preserving mail records;
3. verify WordPress availability;
4. restore any required production data from verified backup if the new system was mutated;
5. revalidate SSL/web/email;
6. communicate rollback state;
7. preserve logs/import manifests for root-cause analysis;
8. do not delete failed-new-system evidence;
9. reopen WordPress editing only when explicitly authorized.

## Post-cutover evidence

Create `docs/migration/agent-reports/AG-08_PRODUCTION_CUTOVER_ROLLBACK.md` recording:

- authorization reference/date;
- freeze window;
- final source snapshot/checksum;
- production release SHA;
- import counts;
- DNS changes made (never secrets);
- email verification;
- SSL/URL/SEO verification;
- Analytics/Search Console/AdSense status;
- Newsroom/Premium/ad smoke-test result;
- monitoring period findings;
- rollback invoked: YES/NO;
- WordPress retention/read-only status.

## Absolute prohibitions

Even when unlocked:

- never delete the WordPress source immediately after cutover;
- never alter MX/SPF/DKIM/DMARC casually as part of web routing;
- never commit secrets;
- never fabricate successful metric ingestion;
- never waive a hard gate silently;
- never claim production migration complete until post-DNS verification passes.
