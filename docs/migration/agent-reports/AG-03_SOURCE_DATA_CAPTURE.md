# AG-03 — Source Data Capture Report

Status: **CP3 NOT READY — authoritative private source package still required**

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

- Received: **NO / NOT AVAILABLE TO AG-03 EXECUTION CONTEXT**
- Validated: **NO**
- Checksum: unavailable
- Table count/prefix/schema: unavailable
- Provenance-key verification from database: pending

**WORK ASSISTANCE REQUIRED**

- Service: HealthTimes hosting / cPanel / Plesk / SFTP / WP-CLI / database administration layer
- Required action: create a read-only or export-only WordPress database snapshot using hosting backup, `wp db export`, phpMyAdmin/MySQL dump or equivalent
- Access needed: temporary least-privilege export access; no credential sharing in Git/docs
- Expected artifact: compressed SQL/database export stored in the secure source package workspace
- Security boundary: private customer/order/member/plugin values must remain outside Git; report only checksum, size, schema metadata, counts and validation state

### Uploads/media archive

- Complete `wp-content/uploads/` archive received: **NO / NOT AVAILABLE TO AG-03 EXECUTION CONTEXT**
- Validated: **NO**
- File count/bytes/MIME distribution: pending authoritative archive

**WORK ASSISTANCE REQUIRED**

- Service: HealthTimes hosting / SFTP / cPanel / Plesk
- Required action: export the complete `wp-content/uploads/` tree without changing production files
- Access needed: read-only file access or hosting backup export
- Expected artifact: complete uploads archive stored in the secure source package workspace
- Security boundary: archive must remain outside Git and must not be uploaded to staging; AG-04 owns media migration

### WXR

- Built-in WordPress export endpoint: available
- Reliable all-content WXR received: **NO**
- Previous result: all-content and split admin exports stalled on the live production host
- Disposition: WXR is supplementary; database + uploads are the authoritative source path

## E. Current WordPress inventory baseline

Read-only public/admin capture dated 2026-09-09 and 2026-09-14 records:

| Object | Verified baseline |
| --- | ---: |
| Published posts | 5,721 |
| Published pages | 49 |
| Media records | 3,260 |
| Categories | 83 |
| Tags | 10,238 |
| Public users/authors | 3 |

Admin listing additionally recorded 5,800 total posts with 5,721 published, 9 drafts, 2 pending and 2 trash.

These figures are **historical baseline evidence**, not current authoritative snapshot reconciliation. They must not be hard-coded as current counts. The AG-03 reconciler now performs a fresh read-only REST inventory when source validation runs and records its own capture timestamp. A fresh count was not substituted during this checkpoint because the available external REST access path did not return usable inventory envelope data. Editorial publishing remains live, so differences in the eventual database snapshot must be classified by the reconciler rather than automatically treated as migration failure.

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

Observed stack confirms commerce capability exists, including WooCommerce, Memberships, Subscriptions, PayPal and Paynow. The visible WooCommerce analytics screen for early September 2026 showed no month-to-date orders/sales.

Current classification: **UNVERIFIED — authoritative private database/export history required**.

Pending database/export evidence must determine:

- whether historical orders exist;
- whether subscriptions/memberships are active;
- whether Premium/e-paper/advertising/donation or other commerce depends on WooCommerce;
- active payment-provider relationships;
- payment historical relevance: **UNVERIFIED** until authoritative records arrive;
- legally/accounting-relevant retention requirements;
- current entitlement model.

No customer/payment rows may be copied into Git or this report.

## M. Newsletter / WhatsApp / audience

Public product and admin evidence show audience/distribution capability, but authoritative provider/account/export evidence is not yet captured.

- Newsletter provider/list storage: **UNVERIFIED / access pending**
- Subscriber export availability: **UNVERIFIED / access pending**
- WhatsApp distribution model/provider: **UNVERIFIED / access pending**
- Personal phone/email lists committed to Git: **NO**

## N. Direct advertising

- HOSPAZ is a specifically known direct-campaign source that must be preserved.
- Authoritative advertiser register, campaign dates, creative originals, approvals and destination URLs: **NOT YET RECEIVED**.
- Historical impressions/clicks are not fabricated.

Expected private package: advertiser/campaign spreadsheet or system export plus original creative files in the secure source package workspace.

## O. PageSpeed / Web Vitals

Site Kit confirms PageSpeed Insights integration. Account/source configuration is known, but no historical score series is claimed. AG-05 owns continuity implementation and performance baselining after account/source capture.

## P. Missing-input ledger

### HARD BLOCKERS

1. Authoritative WordPress database export — blocks database/schema/provenance reconciliation and AG-04 content rehearsal.
2. Complete `wp-content/uploads/` archive — blocks authoritative media reconciliation and AG-04 media rehearsal.

### SOFT BLOCKERS

1. Reliable WXR export — supplementary because database + uploads are the preferred authoritative path.
2. GA4 account-level ownership/settings/history evidence — affects AG-05 continuity validation.
3. Search Console property type/owners/history evidence — affects AG-05 SEO continuity validation.
4. AdSense account-level reporting/authorized-site/history evidence — affects AG-05 monetization continuity.
5. WooCommerce/order/subscription/member export — required to classify commerce migration scope correctly.
6. Payment-provider operational evidence — needed to classify Paynow/PayPal migration relevance.
7. Newsletter/subscriber platform evidence — needed for audience continuity.
8. WhatsApp distribution/provider evidence — needed for audience continuity.
9. Direct advertiser/campaign/creative package including HOSPAZ — needed for commercial continuity.
10. Google Ads account evidence — needed only if HealthTimes confirms commercially active spend/dependence.

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
- `scripts/migration/validate-wordpress-uploads.js` — validates `.tar.gz`, `.zip`, or extracted uploads directories; records file/byte/type/year-month distributions, zero-byte files, duplicate hashes, unreadable/malformed entries, symlinks, unexpected executable/script extensions and archive integrity without emitting filenames or absolute paths.
- `scripts/migration/reconcile-source-inventory.js` — compares a fresh read-only REST inventory with authoritative database counts using `MATCH`, `EXPECTED_SOURCE_DRIFT`, `REQUIRES_REVIEW`, `MISSING_FROM_DATABASE`, and `DATABASE_ONLY`.
- `scripts/migration/validate-provenance-readiness.js` — emits only `PROVENANCE_READY` or `PROVENANCE_GAPS` plus a sanitized gap list.
- `scripts/migration/validate-source-package.js` — unified read-only CP3 validator.

Unified command:

```bash
npm run migration:validate-source -- --root /PRIVATE/OUTSIDE-GIT/WORKSPACE
```

Optional explicit artifact overrides are supported with `--database` and `--uploads`. Optional `--live-inventory` can be used for a sanitized captured REST inventory; otherwise the reconciler attempts a fresh read-only HealthTimes REST inventory.

Unified exit-state semantics:

- exit 2 / `ARTIFACT_MISSING`
- exit 3 / `ARTIFACT_INVALID`
- exit 4 / `ARTIFACT_VALID_RECONCILIATION_INCOMPLETE`
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
- unexpected script file signal;
- malformed media path;
- provenance READY/GAPS;
- all required source-drift classifications;
- manifest privacy;
- rejection of source workspace inside Git;
- unified missing-vs-valid source package outcomes;
- output checks that private fixture filenames and absolute paths are not emitted.

Required command `npm run test:migration`: **PASS** on AG-03 runtime SHA `04c7c789403f3883230c9a0d9936fd70249d34f1`.

CI at that runtime SHA:

- Validate HealthTimes 2.0: **SUCCESS**
- Migration Tests: **SUCCESS**

No failing migration test was waived or reclassified.

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

- AG-04 content/media rehearsal readiness: **BLOCKED** — authoritative database export and complete uploads archive are missing.
- AG-05 SEO/analytics/monetization readiness: **BLOCKED for certification** — core public/Site Kit identities are known, but account-level ownership/history evidence remains pending.
- AG-06 Newsroom backend readiness: **READY from CP2 architecture perspective**; AG-03 has not modified its staging backend boundary.

## T. CP3 closure template — placeholders only

Do not populate these fields until the actual private artifacts have been received and validated.

| Closure field | Value |
| --- | --- |
| Database SHA-256 | `PENDING_PRIVATE_ARTIFACT` |
| Database size | `PENDING_PRIVATE_ARTIFACT` |
| Database table count | `PENDING_PRIVATE_ARTIFACT` |
| WordPress table prefix | `PENDING_PRIVATE_ARTIFACT` |
| Database validation result | `PENDING_PRIVATE_ARTIFACT` |
| Uploads SHA-256 / tree SHA-256 | `PENDING_PRIVATE_ARTIFACT` |
| Uploads total bytes | `PENDING_PRIVATE_ARTIFACT` |
| Uploads file count | `PENDING_PRIVATE_ARTIFACT` |
| Uploads archive integrity | `PENDING_PRIVATE_ARTIFACT` |
| Authoritative published-post count | `PENDING_PRIVATE_ARTIFACT` |
| Authoritative page count | `PENDING_PRIVATE_ARTIFACT` |
| Authoritative media count | `PENDING_PRIVATE_ARTIFACT` |
| Authoritative category count | `PENDING_PRIVATE_ARTIFACT` |
| Authoritative tag count | `PENDING_PRIVATE_ARTIFACT` |
| Authoritative author/user count | `PENDING_PRIVATE_ARTIFACT` |
| Drift reconciliation | `PENDING_PRIVATE_ARTIFACT` |
| Provenance readiness | `PENDING_PRIVATE_ARTIFACT` |
| WooCommerce/subscriptions classification | `UNVERIFIED` |
| Newsletter/audience classification | `UNVERIFIED` |
| Payment historical relevance | `UNVERIFIED` |
| Unresolved source items | `PENDING_PRIVATE_ARTIFACT_REVIEW` |

## U. CP3 decision

The pre-source validation toolchain is implemented and tested, but the actual authoritative private database and uploads package has not yet been received. CP3 therefore remains open.

**CP3 NOT READY — downstream migration remains blocked**
