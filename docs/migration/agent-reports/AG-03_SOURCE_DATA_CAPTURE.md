# AG-03 — Source Data Capture Report

Status: **CP3 NOT READY — authoritative source captured; frozen validator execution still required**

## A. Repository state

- Accepted CP2 branch: `migration/ag-02-staging-platform`
- Accepted CP2 SHA: `587dc3bf964e58827a1735770cc5383ad5f7320d`
- AG-03 branch: `migration/ag-03-source-data-capture`
- AG-03 start SHA: `587dc3bf964e58827a1735770cc5383ad5f7320d`
- Report commit: see Git history for this file; the moderator receipt records the final branch tip.
- Capture timezone: Asia/Tokyo (JST)
- Source snapshot type: rehearsal
- Content freeze status: `NOT_FROZEN`

## B. Staging destination inherited from accepted CP2

- Supabase project: `HealthTimes Staging`
- Supabase project ref: `gcdohgbmqhqwydgaxrcr`
- Vercel project: `healthtimes-staging`
- Staging URL: `https://healthtimes-staging.vercel.app`
- Staging storage buckets: `migrated-media` (public read; server/service-role mutation only) and `newsroom-private` (server/service-role only)
- Source records imported during AG-03: **0**
- Media uploaded during AG-03: **0**

## C. Secure source handling implementation

AG-03 added `scripts/migration/source-package-manifest.js` and `tests/migration/source-package-manifest.spec.js`.

The generator:

- refuses to treat a directory inside the Git repository as the private source package root;
- recursively computes SHA-256 checksums;
- records size, format, source-system class, received timestamp and sensitivity;
- emits only repository-safe artifact identifiers;
- deliberately omits private filenames and local filesystem paths;
- marks the snapshot as `rehearsal` and `NOT_FROZEN`;
- never reads source rows into the report.

Defensive ignore rules were added for common private source-package directory names. The existing `migration-output/` capture directory remains ignored.

Expected private workspace is referred to only as **secure source package workspace**.

## D. Current authoritative-source state

### Database export

- Received: **YES**
- Source snapshot date: **2026-09-21**
- Source database identity: `healthtimesco_wp551`
- Database host class: local hosting database (`localhost`)
- Engine/version: **MariaDB 10.6.28**
- Export format: **SQL.GZip**
- Export size: **18,680,797 bytes**
- SHA-256: `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060`
- Gzip integrity: **PASS**
- SQL readability: **PASS**
- WordPress table prefix: `wpyg_`
- Prefix table count: **132**
- Total database table count: **146**
- Site identity verified from `siteurl` and `home`: `https://healthtimes.co.zw`
- Private database rows committed to Git: **NO**

The capture was produced read/export-only from the authenticated hosting environment and retained outside Git. The frozen AG-03 branch contains the required `migration:validate-source` script; the Work checkout that reported the script missing was therefore stale or not on the frozen AG-03 branch. CP3 certification remains pending only until the exact frozen validator is executed against the private artifacts and its sanitized result is recorded.

### Uploads/media archive

- Complete `wp-content/uploads/` package received: **YES**
- Source snapshot date: **2026-09-21**
- Archive format: **tar.gz**
- Archive SHA-256: `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c`
- Archive entries reported by capture: **23,262**
- Capture-side validation: **COMPLETED**
- Source media uploaded to Supabase/staging: **NO**
- Private media package committed to Git: **NO**
- Frozen-validator archive/tree metrics (byte size, year/month distribution, MIME distribution, zero-byte/unreadable/duplicate/script/link findings): **PENDING EXACT AG-03 VALIDATOR RUN**

### WXR

- Built-in WordPress export endpoint: available
- Reliable all-content WXR received: **NO**
- Previous result: all-content and split admin exports stalled on the live production host
- Disposition: WXR is supplementary; database + uploads are the authoritative source path

## E. Authoritative WordPress rehearsal snapshot

Authoritative database snapshot and fresh live REST/admin reconciliation on 2026-09-21:

| Object | Database snapshot | Fresh live source | Reconciliation |
| --- | ---: | ---: | --- |
| Published posts | 5,737 | 5,737 | MATCH |
| Published pages | 49 | 49 | MATCH |
| Media/attachments | 3,277 | 3,277 | MATCH |
| Categories | 83 | 83 | MATCH |
| Tags | 10,283 | 10,283 | MATCH |
| Users | 3 | 3 (admin-captured) | MATCH |
| Authors with published posts | 3 | 3 | MATCH |

Additional post-state evidence from the authoritative database:

- archived: **68**
- drafts: **11**
- pending: **2**
- trash: **2**
- latest published post ID: **33190**
- latest published post date: **2026-09-18 17:04:57 GMT**

Core source drift classification for the captured snapshot is **MATCH**. No historical count was silently substituted.

## F. WordPress configuration provenance

- WordPress URL: `https://healthtimes.co.zw/`
- WordPress version: `7.1`
- Server: LiteSpeed
- Site timezone: `Africa/Harare`
- Permalink structure: post-name (`/%postname%/`)
- Active theme: News24
- Other installed theme observed: Twenty Twenty-Five
- Site Kit connected modules observed: Search Console, AdSense, Analytics, PageSpeed Insights; Google Ads module present but incomplete
- Commerce stack observed: WooCommerce, WooCommerce Memberships, WooCommerce Subscriptions, WooCommerce PayPal Payments, Paynow Zimbabwe, Google for WooCommerce and other channel plugins
- Advertising stack observed: Ad Inserter plus AdSense code; HOSPAZ remains a known direct-campaign source requirement
- SEO plugin state: Rank Math SEO observed inactive; no assumption is made that all historical SEO metadata is absent

## G. Provenance identifiers

The current REST/import tooling already preserves stable WordPress source identities such as post ID, author ID, category/tag IDs, featured-media ID and legacy URL/path. Authoritative database verification remains pending for:

- post/page IDs;
- attachment/media IDs;
- user/author IDs;
- term IDs and term_taxonomy IDs;
- comment IDs where relevant;
- WooCommerce order/subscription/member identifiers where relevant.

## H. Google Analytics

Confirmed from read-only Site Kit/admin capture:

- Google tag: `GT-PLTTGPL`
- GA4 account: `137814020`
- GA4 property: `359235319`
- Web stream: `4756168788`
- Measurement ID: `G-S39LN2KX4X`

Still pending account-level read access:

- verified account ownership;
- retention settings;
- referral exclusions;
- cross-domain/enhanced-measurement state;
- earliest historical API/export availability.

**WORK ASSISTANCE REQUIRED** if the connected Google account cannot be opened from AG-03's execution environment. Required output is read-only account/property/stream evidence or exports; no OAuth tokens or credentials may be committed.

## I. Search Console

- Known property identifier: `https://healthtimes.co.zw/`
- Site Kit reports Search Console data as available.
- Actual property type (Domain vs URL-prefix): **NOT ACCOUNT-LEVEL VERIFIED**
- Verified owners/users: pending
- Historical export availability: pending

No ownership or verification changes are authorized.

## J. AdSense and seller authorization

Confirmed source identities:

- Publisher: `pub-8744434739998394`
- Client: `ca-pub-8744434739998394`
- Known slot: `7971959240`
- Site Kit account status: `ready`
- Site Kit site status: `ready`
- Site Kit AdSense snippet: disabled; current serving is associated with Ad Inserter/direct code placement
- Authorized seller line expected in production and repository: `google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0`

Account-level reporting access, historical revenue availability and authorized-site/account-owner evidence remain pending.

### app-ads.txt

- Legacy WordPress `/app-ads.txt`: previously observed as 404
- New-platform infrastructure: file prepared with the verified Google seller line
- Verified AdMob/mobile seller authorization: **NOT YET AVAILABLE**
- Classification: infrastructure READY; mobile seller authorization NOT YET AVAILABLE

## K. Google Ads

Site Kit contains a Google Ads module, but the captured configuration has no conversion ID, customer ID or external customer ID.

Classification: **INCOMPLETE / commercial activity not verified**.

Do not infer active spend from module presence alone. Account-level evidence is required to reclassify as ACTIVE or LEGACY.

## L. WooCommerce / Premium / subscriptions / payments

Authoritative database evidence now establishes the following rehearsal truth:

- WooCommerce tables: **PRESENT**
- historical WooCommerce orders: **0**
- WooCommerce subscriptions: **0**
- WooCommerce payment tokens: **0**
- WooCommerce membership plans: **1**
- SureMembers-related tables: **PRESENT**
- active/historical member entitlement population: **NOT ESTABLISHED BY THE HANDOFF EVIDENCE**
- WPForms payment rows: **0**
- Paynow/PayPal plugin capability: previously observed; historical transaction relevance remains **UNVERIFIED unless represented by authoritative provider/account evidence outside WooCommerce**

Plugin/table presence is not treated as proof of active commerce. The authoritative database currently supports the classification: **commerce capability present; no WooCommerce order/subscription/payment-token history in the captured snapshot**.

No customer/payment rows are included in this report.

## M. Newsletter / WhatsApp / audience

Authoritative database inspection found:

- WPForms/audience-related structures: **PRESENT**
- WPForms log rows: **15**
- WPForms payment rows: **0**
- newsletter subscriber population: **NOT YET AUTHORITATIVELY CLASSIFIED FROM THE SUPPLIED HANDOFF**
- WhatsApp provider/list model: **UNVERIFIED / access pending**
- personal phone/email rows committed to Git: **NO**

The presence of WPForms structures/logs is not treated as proof of a subscriber list. Any subscriber/customer classification remains conservative until the frozen validator/report evidence identifies the relevant authoritative structures and sanitized counts.

## N. Direct advertising

- HOSPAZ is a specifically known direct-campaign source that must be preserved.
- Authoritative advertiser register, campaign dates, creative originals, approvals and destination URLs: **NOT YET RECEIVED**.
- Historical impressions/clicks are not fabricated.

Expected private package: advertiser/campaign spreadsheet or system export plus original creative files in the secure source package workspace.

## O. PageSpeed / Web Vitals

Site Kit confirms PageSpeed Insights integration. Account/source configuration is known, but no historical score series is claimed. AG-05 owns continuity implementation and performance baselining after account/source capture.

## P. Missing-input ledger

### HARD BLOCKERS

1. **Exact frozen AG-03 validator execution against the captured private database and uploads artifacts.** The authoritative artifacts now exist, but the prior Work attempt ran from a checkout where `migration:validate-source` was absent. At frozen SHA `866912999857b363170b60cdf65e2f47119287a3`, that script is present in `package.json`.
2. **Frozen-validator uploads disposition output.** The capture reports the uploads package as already validated, but CP3 still requires the exact AG-03 validator's sanitized archive/tree metrics and any executable/link review disposition.

### SOFT BLOCKERS

1. Reliable WXR export — supplementary because database + uploads are the preferred authoritative path.
2. GA4 account-level ownership/settings/history evidence — affects AG-05 continuity validation.
3. Search Console property type/owners/history evidence — affects AG-05 SEO continuity validation.
4. AdSense account-level reporting/authorized-site/history evidence — affects AG-05 monetization continuity.
5. Payment-provider operational evidence — needed to classify Paynow/PayPal historical relevance outside the zero WooCommerce order/subscription/payment-token snapshot.
6. Newsletter/subscriber platform evidence — needed for audience continuity beyond the observed WPForms structures/logs.
7. WhatsApp distribution/provider evidence — needed for audience continuity.
8. Direct advertiser/campaign/creative package including HOSPAZ — needed for commercial continuity.
9. Google Ads account evidence — needed only if HealthTimes confirms commercially active spend/dependence.

### NON-BLOCKING / DEFERRED

- Production DNS/registrar write access.
- MX/SPF/DKIM/DMARC mutation.
- Production cutover approval.
- Final content-freeze snapshot.
- Final delta media sync.

These belong to later production lanes and must not be requested merely to complete rehearsal source capture.

## Q. Pre-source validation tooling and test state

AG-03 now includes the complete preparatory validation path required before private artifacts arrive:

- `scripts/migration/validate-wordpress-database.js` — validates private `.sql` / `.sql.gz` outside Git, checks gzip/SQL integrity, detects the WordPress prefix, enumerates core/plugin/commerce/audience tables, computes sanitized row-count metadata, detects essential core gaps, classifies WooCommerce/subscription/membership/payment signals, and emits provenance capabilities without exposing row values.
- `scripts/migration/validate-wordpress-uploads.js` — validates `.tar.gz`, `.zip`, or extracted uploads directories; records file/byte/type/year-month distributions, zero-byte files, duplicate hashes, unreadable/malformed entries, symlinks/hardlinks, unexpected executable/script extensions and archive integrity without emitting filenames or absolute paths. PHP/PHTML/PHAR/CGI/shell/script/executable findings are `VALID_REQUIRES_REVIEW`; archive symlink/hardlink members are rejected before extraction. Path traversal remains blocking and extraction is constrained to a disposable directory.
- `scripts/migration/reconcile-source-inventory.js` — compares a fresh read-only REST inventory with authoritative database counts using `MATCH`, `EXPECTED_SOURCE_DRIFT`, `REQUIRES_REVIEW`, `MISSING_FROM_DATABASE`, and `DATABASE_ONLY`. Posts/pages/media/categories/tags are collected independently of `/users`; a blocked `/users` endpoint yields `CORE_CONTENT_RECONCILED` plus `AUTHOR_COUNT_REQUIRES_PRIVATE_OR_ADMIN_EVIDENCE` when the five core metrics reconcile.
- `scripts/migration/validate-provenance-readiness.js` — emits only `PROVENANCE_READY` or `PROVENANCE_GAPS` plus a sanitized gap list.
- `scripts/migration/validate-source-package.js` — unified read-only CP3 validator.

Unified command:

```bash
npm run migration:validate-source -- --root /PRIVATE/OUTSIDE-GIT/WORKSPACE
```

Optional explicit artifact overrides are supported with `--database` and `--uploads`. When more than one database or uploads candidate is discovered, the unified validator now returns `ARTIFACT_AMBIGUOUS` with safe candidate counts/source roles only and requires explicit selection. Optional `--live-inventory` can be used for a sanitized captured REST inventory; otherwise the reconciler attempts a fresh read-only HealthTimes REST inventory. `--admin-user-count <n>` may provide an explicitly sanitized admin-captured author/user count when the public `/users` endpoint is unavailable.

Unified exit-state semantics:

- exit 2 / `ARTIFACT_MISSING`
- exit 3 / `ARTIFACT_INVALID`
- exit 4 / `ARTIFACT_VALID_RECONCILIATION_INCOMPLETE`
- exit 5 / `ARTIFACT_AMBIGUOUS`
- exit 0 / `SOURCE_VALIDATION_READY`

The source-package manifest is schema `2.0` and preserves outside-Git enforcement while adding artifact role, validator version, capture/export timestamp placeholder, validation timestamp/status, content type/format, size, SHA-256, source class, snapshot relationship and authoritative/supplementary classification. Filenames and absolute private paths remain omitted.

Synthetic fixture coverage includes:

- plain `.sql`;
- `.sql.gz`;
- corrupted gzip;
- alternate WordPress prefix;
- missing essential WordPress core tables;
- WooCommerce present/absent;
- subscriptions present/absent;
- memberships/payment/audience/custom table classification;
- uploads directory and `.tar.gz` archive;
- zero-byte asset;
- duplicate asset hash;
- unexpected script file review gate;
- tar symlink rejection;
- tar hardlink rejection;
- ZIP symlink rejection when supported by the runner;
- malformed media path;
- provenance READY/GAPS;
- all required source-drift classifications;
- manifest privacy;
- rejection of source workspace inside Git;
- unified missing-vs-valid source package outcomes;
- explicit `ARTIFACT_AMBIGUOUS` behavior and safe candidate metadata;
- `/users` HTTP 401 fallback with core REST metrics preserved;
- explicit sanitized admin user-count override;
- cPanel/phpMyAdmin/mysqldump-style SQL containing comments, `DROP TABLE IF EXISTS`, `CREATE TABLE`, `LOCK TABLES`, extended multi-row `INSERT INTO`, MySQL version directives and `UNLOCK TABLES`;
- output checks that private fixture filenames, absolute paths and fake row contents are not emitted.

Current frozen-tooling runtime SHA: `c33c56fb0f75b993d5751103cbcd56e96f6c5375`.

Required command `npm run test:migration`: **PASS** on that runtime SHA.

CI at that runtime SHA:

- Validate HealthTimes 2.0: **SUCCESS**
- Migration Tests: **SUCCESS**

No failing migration test was waived or reclassified.

### Final pre-source hardening disposition

- Public REST fallback: **HARDENED** — five core content counts survive a blocked public `/users` endpoint; author count remains explicit and separately classified.
- Sanitized admin author-count fallback: **SUPPORTED** via explicit input only; no stale count is silently substituted.
- Upload executables/scripts: **VALID_REQUIRES_REVIEW**; never auto-deleted.
- Tar/ZIP link handling: **BLOCKING** — symlink/hardlink archive members are rejected before extraction; extracted-tree links are also blocking findings.
- Artifact ambiguity: **EXPLICIT** — multiple database/uploads candidates return `ARTIFACT_AMBIGUOUS`; filenames/paths are not exposed.
- cPanel/phpMyAdmin/mysqldump compatibility: **PASS** on synthetic realistic dump fixture.
- Pre-source tooling scope: **FROZEN after final-tip CI**. No additional pre-source features should be added before the authoritative cPanel artifacts arrive.

## R. Security / production safety

- Private exports committed to Git: **NO**
- Credentials committed to Git: **NO**
- OAuth tokens committed to Git: **NO**
- Subscriber/customer data committed to Git: **NO**
- Payment data committed to Git: **NO**
- Source data imported to Supabase: **NO**
- WordPress media uploaded to staging: **NO**
- Production WordPress modified: **NO**
- Production DNS modified: **NO**
- Production email DNS modified: **NO**
- Production Google configuration modified: **NO**
- Production AdSense modified: **NO**
- Production commerce modified: **NO**
- Production systems modified: **NO**

## S. Downstream readiness

- AG-04 content/media rehearsal readiness: **BLOCKED only on CP3 certification** — authoritative database and uploads artifacts are now captured, but the frozen unified validator has not yet been executed from the correct checkout.
- AG-05 SEO/analytics/monetization readiness: **BLOCKED for certification** — core public/Site Kit identities are known, but account-level ownership/history evidence remains pending.
- AG-06 Newsroom backend readiness: **READY from CP2 architecture perspective**; AG-03 has not modified its staging backend boundary.

## T. CP3 closure template — placeholders only

Do not populate these fields until the actual private artifacts have been received and validated.

| Closure field | Value |
| --- | --- |
| Database SHA-256 | `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060` |
| Database size | `18,680,797 bytes` |
| Database table count | `146 total / 132 wpyg_ prefix` |
| WordPress table prefix | `wpyg_` |
| Database validation result | `CAPTURE-SIDE PASS; FROZEN UNIFIED VALIDATOR PENDING` |
| Uploads SHA-256 / tree SHA-256 | `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c` archive SHA-256; frozen tree hash pending |
| Uploads total bytes | `PENDING_FROZEN_VALIDATOR_OUTPUT` |
| Uploads file count | `23,262 archive entries reported by capture` |
| Uploads archive integrity | `CAPTURE-SIDE VALIDATED; FROZEN VALIDATOR OUTPUT PENDING` |
| Authoritative published-post count | `5,737` |
| Authoritative page count | `49` |
| Authoritative media count | `3,277` |
| Authoritative category count | `83` |
| Authoritative tag count | `10,283` |
| Authoritative author/user count | `3 users / 3 published authors` |
| Drift reconciliation | `MATCH on all five public core metrics; admin user count 3` |
| Provenance readiness | `PENDING FROZEN VALIDATOR CERTIFICATION` |
| WooCommerce/subscriptions classification | `TABLES PRESENT; 0 orders; 0 subscriptions; 0 payment tokens` |
| Newsletter/audience classification | `WPForms structures present; 15 log rows; subscriber population unverified` |
| Payment historical relevance | `NO WooCommerce order/subscription/payment-token history; external/provider history UNVERIFIED` |
| Unresolved source items | `FROZEN_VALIDATOR_RUN; uploads review disposition; Google/account-level soft blockers; newsletter/WhatsApp/direct-ad evidence` |

## U. CP3 decision

The authoritative database and uploads package have now been captured outside Git, and the live database/core REST counts reconcile. However, the exact frozen unified validator has not yet been executed against those private artifacts from the correct AG-03 checkout. CP3 therefore remains open until that final certification command succeeds and any uploads review finding is dispositioned.

**CP3 NOT READY — downstream migration remains blocked**
