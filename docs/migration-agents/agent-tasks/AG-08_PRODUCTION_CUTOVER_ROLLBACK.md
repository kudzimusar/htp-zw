# AG-08 — Production Cutover & Rollback

Status: **LOCKED UNTIL EXPLICIT OWNER AUTHORIZATION**

## Mission

Execute the approved final migration only after CP7 has been accepted and the owner explicitly authorizes production cutover.

AG-08 is the only migration agent allocated production DNS-control and production deployment mutation authority, and only after unlock.

## Required environment/tools after unlock

Read `docs/migration-agents/03_TOOL_ENVIRONMENT_MATRIX.md` first.

Only after all prerequisites are met may AG-08 receive/use:
- GITHUB;
- approved production VERCEL/SUPABASE credentials;
- CLIENT-SECURE-TRANSFER for final source/delta material;
- WORDPRESS read/final-export access;
- DNS-CONTROL/registrar or Cloudflare write capability;
- production transactional-email configuration as approved;
- production Analytics/Search Console/AdSense verification access;
- monitoring/backup/rollback tooling.

Tool availability before unlock does not authorize use.

## Hard prerequisites

All must be true before any production-changing action:

1. AG-07 receipt says: `CP7 ACCEPTED — integrated staging migration is certified; AG-08 remains LOCKED pending explicit owner authorization`.
2. Owner gives explicit production-cutover authorization after reviewing the CP7 receipt.
3. HealthTimes/client approves a content-freeze window.
4. Current production backups/exports are captured and verified.
5. Staging rehearsal/integrated certification has passed.
6. Production destination infrastructure is provisioned and smoke-tested on a temporary/pre-DNS target.
7. DNS/email worksheet is complete and approved.
8. MX/SPF/DKIM/DMARC preservation plan is verified.
9. Rollback criteria and exact rollback values are recorded.
10. On-call/monitoring ownership for the cutover/stabilization window is defined.

Without all ten, STOP.

## Mandatory reads

- master programme, agent register, launch instructions and tool matrix;
- `docs/migration/11_PRODUCTION_CUTOVER_ROLLBACK.md`;
- `docs/migration/12_MIGRATION_ACCEPTANCE_LEDGER.md`;
- AG-07 CP7 certification receipt;
- approved DNS/email worksheet;
- approved owner authorization record.

## Authorized sequence after unlock

1. Announce/finalize editorial content freeze.
2. Capture final WordPress database/WXR snapshot and media delta using secure handling.
3. Generate checksums and compare with rehearsal source manifest.
4. Run final production import in dry-run mode first.
5. Resolve delta-only exceptions before real import.
6. Apply approved production schema migrations.
7. Import final content/data/media using idempotent tooling.
8. Activate production Newsroom staff identities according to the approved list; never reuse demo passwords as production credentials.
9. Configure verified production Google/Analytics/Search Console/AdSense integrations with secrets stored only in approved secret stores.
10. Serve verified `ads.txt` and verified-only `app-ads.txt` as appropriate.
11. Deploy production backend/frontend to a pre-DNS verification target.
12. Run pre-DNS smoke tests: homepage, representative old article URLs, Premium, ads, reader/auth, Newsroom Reporter/Editor/Commercial, sitemap, robots, RSS, media, SSL and APIs.
13. Re-verify mail records and rollback values before web DNS mutation.
14. Apply any preapproved TTL change only according to the runbook.
15. Change only approved web DNS records; preserve mail records.
16. Verify public SSL/domain routing.
17. Verify legacy URLs/redirects/canonicals.
18. Verify sitemap/robots/RSS and perform approved Search Console post-cutover steps.
19. Verify Analytics event receipt without double-tagging.
20. Verify AdSense/ads.txt and direct-campaign placement.
21. Verify Newsroom production authentication/authorization.
22. Verify Premium/subscriber behavior according to approved production entitlement scope.
23. Verify email sending/receiving after web DNS change.
24. Monitor 404, 5xx, latency, client errors, auth errors, ad failures and migration discrepancies through the agreed stabilization window.
25. Keep WordPress protected/read-only as rollback source for at least 60–90 days unless client/owner explicitly approve a different retention period.

## Rollback triggers

Rollback must be considered immediately if any cannot be resolved within the approved cutover window:

- widespread legacy URL failure;
- material article/media loss;
- production database corruption;
- Newsroom authorization/security failure;
- email interruption caused by DNS change;
- SSL/domain failure;
- critical Premium/subscriber failure;
- material AdSense authorization/ads.txt break;
- severe 5xx/availability regression;
- any owner-approved hard gate fails after switch.

## Rollback sequence

Use the exact pre-recorded values from the runbook/worksheet:

1. stop new production writes if necessary;
2. restore previous web DNS target while preserving mail records;
3. verify WordPress availability;
4. restore required production data from verified backup if the new system was mutated;
5. revalidate SSL/web/email;
6. communicate rollback state;
7. preserve logs/import manifests for root-cause analysis;
8. do not delete failed-new-system evidence;
9. reopen WordPress editing only when explicitly authorized.

## Post-cutover evidence

Create `docs/migration/agent-reports/AG-08_PRODUCTION_CUTOVER_ROLLBACK.md` recording:

- owner authorization reference/date;
- freeze window;
- final source snapshot/checksum;
- production release SHA;
- import counts and exception disposition;
- DNS changes made, excluding secrets;
- email verification;
- SSL/URL/SEO verification;
- Analytics/Search Console/AdSense status;
- Newsroom/Premium/ad smoke-test results;
- monitoring period findings;
- rollback invoked: YES/NO;
- WordPress retention/read-only status.

The final post-cutover checkpoint is CP8.

## Absolute prohibitions

Even when unlocked:

- never delete WordPress immediately after cutover;
- never alter MX/SPF/DKIM/DMARC casually as part of web routing;
- never commit secrets/client exports;
- never fabricate successful metric ingestion;
- never silently waive a hard gate;
- never claim production migration complete until post-DNS verification passes.
