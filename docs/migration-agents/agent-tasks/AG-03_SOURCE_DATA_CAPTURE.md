# AG-03 — Client Data Package & Source Capture

## Mission

Turn client access and exports into a secure, complete, provenance-preserving source package for staging rehearsal.

## Prerequisites

- AG-01 CP1 accepted.
- AG-02 staging destination/architecture known.

## Mandatory reads

- master programme and agent register
- `docs/migration/02_WORDPRESS_SOURCE_INVENTORY.md`
- `docs/migration/09_CLIENT_DATA_ACCESS_REQUEST.md`
- `docs/migration/13_ANALYTICS_SEO_MONETIZATION_INVENTORY.md`

## Stage-A client package

Request only what is needed for rehearsal, preferably temporary/read-only access where possible:

- WordPress Administrator access;
- WXR export;
- database export;
- WordPress uploads/media archive;
- hosting/SFTP/cPanel/Plesk access sufficient for inspection/export;
- Google Analytics read access;
- Search Console read access;
- AdSense read/reporting access;
- Site Kit configuration details where needed to map properties;
- WooCommerce export/history;
- Premium/subscription/payment provider configuration and exports where applicable;
- newsletter and WhatsApp provider details;
- current advertiser/campaign records;
- plugin/theme licence list and confirmation of which services are operationally active.

Do not request live DNS/registrar control merely for rehearsal.

## Required work

1. Produce a clean client-facing access checklist with reason, timing and secure delivery method for each item.
2. Receive exports outside Git and store them in an approved encrypted/local/private workspace.
3. Generate checksums and a source manifest for every received file/archive.
4. Record WordPress source version, export timestamp, timezone, permalink structure and active plugin/theme inventory.
5. Verify WXR readability and counts without importing to production.
6. Verify database export readability/schema/version without exposing credentials in reports.
7. Verify media archive integrity and file counts/size.
8. Identify source author IDs, post IDs, taxonomy IDs and media attachment IDs used for provenance.
9. Resolve current Analytics property, GA4 stream/measurement ID and relation to public tag `GT-PLTTGPL`.
10. Resolve Search Console property type and ownership/read access.
11. Verify AdSense account/publisher mapping to `pub-8744434739998394` / `ca-pub-8744434739998394`; capture authorized seller configuration for later `ads.txt` verification.
12. Identify whether Google Ads is commercially active or merely incomplete legacy configuration.
13. Determine historical WooCommerce purpose and whether orders/subscriptions have legal/accounting relevance.
14. Inventory historical/direct advertising campaigns including HOSPAZ and source creatives.
15. Identify newsletter/subscriber/audience platforms and export capabilities.
16. Record all unavailable data explicitly; do not infer it.
17. Create `docs/migration/agent-reports/AG-03_SOURCE_DATA_CAPTURE.md` without embedding secrets or sensitive exports.

## Data handling rules

- Never commit database dumps, WXR files containing sensitive information, media archives, subscriber exports, OAuth tokens, passwords, cookies or payment data to the public repo.
- Reports may reference secure local/private paths abstractly but should not leak secrets.
- Prefer read-only account roles for Google integrations.
- Do not change WordPress configuration to make export easier unless explicitly authorized.

## Acceptance gates

- source package manifest complete;
- checksums recorded;
- WXR/database/media exports validated;
- Analytics/Search Console/AdSense property identities resolved or blocker recorded;
- subscriber/payment/WooCommerce status classified;
- direct-ad source records captured;
- no production mutation performed;
- missing inputs are listed precisely.

## Stop conditions

STOP if source capture requires destructive production changes, password sharing in Git/docs, or access beyond the authorized scope.

## Receipt

Report:
- source package date;
- source counts;
- checksum/manifest location;
- integrations resolved;
- unavailable inputs;
- security handling confirmation;
- readiness for AG-04/AG-05;
- `Production systems modified: NO`.
