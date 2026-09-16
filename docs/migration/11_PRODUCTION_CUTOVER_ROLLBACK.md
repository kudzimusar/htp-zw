# Production Cutover And Rollback

Do not execute this runbook until staging has passed and the client has approved cutover.

## Cutover

1. Confirm backups and restore route.
2. Announce editorial content freeze.
3. Export final WordPress delta.
4. Sync final media delta.
5. Run final production dry-run import.
6. Run production import.
7. Deploy backend/API.
8. Deploy frontend.
9. Smoke-test production on temporary URL.
10. Verify Newsroom login, RBAC, Premium, ads and media.
11. Verify sitemap, robots, RSS, canonical, structured data, `ads.txt`, `app-ads.txt` and redirects.
12. Change DNS.
13. Verify SSL and canonical redirects.
14. Submit sitemap/Search Console checks.
15. Confirm Analytics page views, Search Console property, AdSense serving and direct ad event collection.
16. Monitor logs, uptime, analytics, Web Vitals, revenue and editorial reports.

## Rollback

1. Keep WordPress hosting active and protected.
2. If critical failure occurs, restore previous DNS records.
3. Confirm SSL on WordPress origin.
4. Pause new platform writes or queue reconciliation.
5. Preserve failed import manifests/logs for diagnosis.
6. Communicate rollback state to editorial/commercial stakeholders.
7. Confirm Analytics/Search Console/AdSense reporting is not double-counting both old and new origins.

## Retention

Keep WordPress available in protected/read-only form for at least 60-90 days after launch, longer if subscriptions/orders require audit retention.
