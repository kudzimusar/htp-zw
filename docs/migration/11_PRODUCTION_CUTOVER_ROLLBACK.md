# Production Cutover and Rollback

Status: **PREPARED ONLY — EXECUTION LOCKED**

Updated during AG-07 pre-CP7 readiness on 2026-09-22.

Do **not** execute this runbook until:

1. canonical CP7 has been accepted;
2. COM-01 live provider certification is complete;
3. formal client UAT has no unresolved P0/P1;
4. the owner explicitly authorizes production cutover;
5. the final integrated candidate SHA is frozen and exact-head certified;
6. the DNS/email worksheet has authoritative current values and rollback values;
7. production backups and restore paths have been reverified immediately before the cutover window.

AG-07 prepares this runbook. AG-07 does not authorize AG-08.

## 1. Cutover decision authority

- Technical certification: AG-07 / moderator evidence process.
- Client acceptance: designated HealthTimes stakeholder/client.
- Production authorization: **owner/moderator only**.
- Cutover execution: AG-08 only after explicit authorization.
- Rollback authority during the window: owner/moderator or explicitly delegated AG-08 incident lead.

No technical agent may infer production authorization from a green workflow or CP7 receipt.

## 2. Mandatory pre-cutover record

Record before any production mutation:

- final certified runtime SHA;
- final documentation closure SHA;
- exact Vercel deployment ID and preview URL;
- exact staging Supabase project/migration ledger;
- source snapshot ID/checksums;
- final WordPress delta checkpoint;
- database backup ID/checksum;
- media/storage backup ID/checksum;
- current A/AAAA/CNAME values and TTLs;
- current MX values and TTLs;
- current SPF record;
- current DKIM selectors/records;
- current DMARC record;
- current Cloudflare Email Routing rules;
- current mail-provider verification records;
- production web target values;
- exact DNS rollback values;
- current Search Console property identity;
- GA4 property/stream identity;
- verified AdSense publisher identity;
- COM-01 provider readiness receipt.

Do not store credentials, private keys, provider secrets, subscriber exports or raw sensitive mail in Git.

## 3. Editorial/content freeze and final delta

1. Announce the approved editorial freeze window.
2. Record freeze start time in UTC and Africa/Harare time.
3. Capture the final WordPress database delta using the authoritative source method.
4. Capture the final uploads/media delta.
5. Validate database/archive integrity and checksums.
6. Identify records created or modified since the rehearsal snapshot.
7. Run a final dry-run import into the approved production target or isolated production rehearsal environment as authorized.
8. Reconcile posts, pages, authors, taxonomy, media and URL mappings.
9. Require unexplained reconciliation count = 0.
10. Confirm importer rerun/idempotency before proceeding.

If unexplained content loss, duplicate identities or source-accounting drift appears, stop cutover.

## 4. Production deployment sequence

Only AG-08 may perform these steps after authorization:

1. Verify production database backup and restore route.
2. Verify production storage/media recovery route.
3. Apply the certified database migration set in recorded order.
4. Import the final content/media delta.
5. Deploy the exact certified backend/API runtime.
6. Deploy the exact certified public/mobile runtime.
7. Perform pre-DNS smoke checks using the provider deployment URL.
8. Verify Newsroom authentication and server-backed capability projection.
9. Verify Reporter cannot publish and Commercial cannot publish editorial content.
10. Verify Publisher/Admin session/access revocation.
11. Verify public/private analytics isolation.
12. Verify Premium access behavior.
13. Verify Reader/community boundaries.
14. Verify CA-01 internal communications.
15. Verify COM-01 canonical communications and provider health.
16. Verify migrated article/page rendering, media, canonical URLs and redirects.
17. Verify `/sitemap.xml`, `/robots.txt`, RSS, `/ads.txt` and `/app-ads.txt`.
18. Verify responsive/mobile/PWA shell and Listen.
19. Record pre-DNS smoke result.

Any P0/P1 failure stops the cutover before DNS.

## 5. DNS and email continuity

Web routing changes must not accidentally change mail routing.

Before touching web DNS:

1. capture exact authoritative A/AAAA/CNAME records and TTLs;
2. capture exact MX records and TTLs;
3. capture exact SPF;
4. capture exact DKIM selectors/records;
5. capture exact DMARC;
6. capture Cloudflare Email Routing rules and mail-provider verification records;
7. compare the proposed change set against the worksheet;
8. require that unrelated production organizational mailboxes remain unchanged;
9. require verified COM-01 staging/provider evidence before any provider migration;
10. predefine exact rollback records.

During web cutover:

- change only the authorized web records;
- preserve MX unless the separately approved mail plan explicitly requires a bounded change;
- preserve SPF/DKIM/DMARC unless the separately approved mail plan explicitly requires a bounded change;
- never replace an existing SPF record destructively;
- verify inbound and outbound organizational email after the web change;
- verify transactional and marketing sender health where applicable;
- verify opaque application reply routing if activated.

Mail failure is an immediate rollback trigger.

## 6. SSL/TLS verification

After authorized DNS routing:

- verify apex HTTPS;
- verify `www` HTTPS and intended redirect behavior;
- verify certificate issuance/chain;
- verify no staging/demo hostname leaks into canonical metadata;
- verify HSTS/security behavior according to the approved production configuration.

SSL/certificate failure that prevents normal access is an immediate rollback trigger.

## 7. Post-routing verification

Verify:

- homepage;
- representative recent and old migrated stories;
- long-form/table/gallery/embed/download content;
- institutional pages;
- category/context routes;
- deterministic legacy aliases;
- canonical/meta/structured data;
- sitemap;
- robots;
- RSS;
- `ads.txt`;
- `app-ads.txt`;
- Analytics page views without protected Newsroom leakage;
- Search Console ownership/property continuity before submission;
- AdSense/direct advertising separation;
- Newsroom login and editorial workflow;
- Reader/community boundaries;
- Premium;
- Listen;
- PWA/mobile;
- COM-01 external communication flows;
- application/runtime logs and Web Vitals.

Only after successful production verification may authorized Search Console sitemap actions be performed.

## 8. Rollback triggers

Initiate rollback when any of the following is confirmed and cannot be safely corrected inside the approved cutover window:

- unexplained article/page/media loss;
- database integrity failure;
- duplicate/corrupt migrated identities;
- mass unexplained 404 or canonical failure;
- Newsroom unavailable for critical editorial operations;
- authentication/authorization compromise;
- anonymous access to protected data;
- session/access revocation failure;
- production mail failure;
- COM-01 routing/provider failure that affects required production communications;
- SSL/TLS failure;
- severe Premium entitlement failure;
- severe analytics/SEO/advertising regression likely to damage continuity;
- unrecoverable public frontend outage;
- critical mobile/PWA regression if mobile web is part of the cutover surface.

## 9. Rollback procedure

1. Owner/moderator or delegated incident lead declares rollback.
2. Stop new-platform cutover writes or queue them for reconciliation.
3. Restore the captured previous web DNS values.
4. Restore any separately authorized mail records only from the captured rollback set.
5. Confirm production WordPress origin and SSL.
6. Confirm organizational mail send/receive.
7. Confirm WordPress public routes and critical newsroom/editorial continuity.
8. Preserve failed import manifests, application logs and provider evidence.
9. Do not delete the failed target; isolate it for diagnosis.
10. Record content written during the cutover window for later reconciliation.
11. Confirm Analytics/Search Console/AdSense are not double-counting old and new origins.
12. Communicate rollback state to editorial, commercial and owner stakeholders.
13. Open a defect/incident record with root cause and retest requirements.

## 10. Backup / restore readiness

Accepted staging evidence includes a disposable database restore drill. Production-specific backup identifiers, RPO and RTO must be captured/approved before AG-08.

Required production evidence:

- database backup succeeds;
- restore path documented and operationally accessible;
- media/storage recovery route documented;
- configuration/environment recovery route documented;
- RPO explicitly approved;
- RTO explicitly approved.

No backup evidence = no production cutover.

## 11. WordPress retention

Keep the former WordPress estate available in protected/read-only form for **at least 60–90 days** after successful cutover, longer where subscription/order/audit retention requires it.

Do not decommission WordPress immediately after DNS cutover.

## 12. Current pre-CP7 hold

As of this preparation pass:

- CP7 has not been executed;
- owner production authorization is not granted;
- COM-01 live provider evidence is deferred pending HealthTimes-specific Resend, Brevo and Cloudflare access;
- the tested COM candidate does not contain the accepted CP5 public-route/SEO runtime and therefore is not eligible for primary staging-alias assignment or canonical CP7 product UAT;
- production systems remain untouched.
