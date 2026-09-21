# AG-03 — Source Data Capture Report

Status: **CP3 ACCEPTED — authoritative source capture and continuity evidence certified**

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

The capture was produced read/export-only from the authenticated hosting environment and retained outside Git. The repaired unified validator was executed against the authoritative database with explicit WordPress prefix `wpyg_` selected from `wp-config.php` evidence. Database validation result: **VALID**. Prefix selection source: **WP_CONFIG_EXPLICIT**.

### Uploads/media archive

- Complete `wp-content/uploads/` package received: **YES**
- Source snapshot date: **2026-09-21**
- Archive format: **tar.gz**
- Archive SHA-256: `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c`
- Archive size: **2,863,789,110 bytes**
- Archive entries: **23,262**
- Extracted files: **23,141**
- Archive integrity: **PASS**
- Zero-byte files: **7**
- Unreadable files: **0**
- Symlink findings: **0**
- Hardlink findings: **0**
- Validator result: **VALID_REQUIRES_REVIEW**
- Automated review finding: `UNEXPECTED_EXECUTABLE_OR_SCRIPT_IN_UPLOADS`
- Human security disposition: **COMPLETED — review gate dispositioned, not bypassed**
- Source media uploaded to Supabase/staging: **NO**
- Private media package committed to Git: **NO**

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

Core source drift classification for the captured snapshot is **MATCH**. Unified validator reconciliation result: **RECONCILED**; core: **CORE_CONTENT_RECONCILED**; authors: **AUTHOR_COUNT_RECONCILED**. No historical count was silently substituted.

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
- Advertising stack observed: Ad Inserter plus AdSense code; HOSPAZ direct-ad continuity is separately reconstructed from WordPress/Elementor source evidence. Ad Inserter is AdSense-oriented and is **not** the HOSPAZ placement mechanism.
- SEO plugin state: Rank Math SEO observed inactive; no assumption is made that all historical SEO metadata is absent

## G. Provenance identifiers

Unified database/source validation reached **PROVENANCE_READY**.

The selected authoritative prefix `wpyg_` supports the required source identity/provenance relationships for:

- post/page IDs;
- attachment/media IDs;
- user/author IDs;
- term IDs and term_taxonomy IDs;
- postmeta relationships including featured media;
- permalink structure evidence;
- commerce/source table classification under the selected live prefix.

The validator did not derive source counts from the competing WordPress-looking prefix family.

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

Classification: **DIRECT_AD_CONTINUITY_CAPTURED**

### HOSPAZ commercial creative

The authenticated private-source investigation reconstructed one logical HOSPAZ commercial creative from first-party WordPress source evidence.

- Logical commercial creative count: **1**
- WordPress attachment IDs: `32960`, `32971`
- Byte relationship: **byte-identical source files**
- SHA-256: `50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`
- Dimensions: **1200x400**
- MIME: `image/jpeg`
- Classification: `DIRECT_AD_COMMERCIAL_CREATIVE`

Both WordPress attachment IDs must be preserved as provenance even where checksum-aware storage avoids creating duplicate stored binaries.

### Separate current AGM asset

A separate HOSPAZ AGM media asset exists at WordPress attachment `33005`.

Its source and placement provenance are intentionally distinct:

- `ASSET_SOURCE_PROVENANCE = EDITORIAL`
- `PLACEMENT_USAGE_PROVENANCE = DIRECT_AD / HEADER_PLACEMENT`

Attachment `33005` remains a legitimate WordPress media asset and must follow the normal AG-04 media/content migration path. AG-05 must separately preserve the fact that the current commercial/header placement references that asset.

### Placement relationship

Direct HOSPAZ placement was reconstructed from the published Elementor/header-footer source:

- Elementor/header-footer template post: `21`
- post type: `elementor-hf`
- title: `main`
- status: `publish`
- historical revisions referencing the August commercial banner: `32974`, `32975`, `32976`, `32977`, `32979`, `32980`
- current published placement attachment: `33005`
- destination URL: **UNKNOWN**
- schedule: **UNKNOWN**
- placement conditions: **UNKNOWN**

Destination, schedule and conditions are preserved as unknown. They are not inferred from AGM dates, upload dates, article dates or revision dates.

### Ad Inserter distinction

- `HOSPAZ_AD_INSERTER_PLACEMENT: NO`
- inspected Ad Inserter configuration is AdSense-oriented;
- HOSPAZ must not be reconstructed as an Ad Inserter/AdSense placement;
- HOSPAZ belongs to the direct-ad/commercial placement abstraction, separate from AdSense.

### Campaign-register truth

- `NO_STANDALONE_CAMPAIGN_REGISTER_FOUND_IN_CAPTURED_SOURCE`
- no standalone advertiser contract/approval record was found in the captured WordPress/cPanel source;
- this absence is **not classified as lost data**, because there is no evidence such records existed in those source systems;
- no destination URL, approval date, campaign start/end date, pricing, impressions, clicks or revenue is fabricated.

The absence of a separate campaign spreadsheet/register is not a CP3 blocker because the actual first-party WordPress/Elementor source relationship is sufficient to reproduce the known placement safely in staging. Client-supplied commercial records may later enrich this metadata without changing the source-continuity classification.

## O. PageSpeed / Web Vitals

Site Kit confirms PageSpeed Insights integration. Account/source configuration is known, but no historical score series is claimed. AG-05 owns continuity implementation and performance baselining after account/source capture.

## P. Missing-input ledger

### HARD BLOCKERS

**NONE.** The final direct-ad/HOSPAZ source-continuity blocker was resolved by authenticated private-source reconstruction from WordPress/Elementor evidence.

### SOFT / DOWNSTREAM EVIDENCE GAPS

1. Reliable WXR export — supplementary only; database + uploads remain the authoritative source path.
2. GA4 account-level ownership/settings/history evidence — AG-05 continuity evidence where account access remains unavailable.
3. Search Console property type/owners/history evidence — AG-05 SEO continuity evidence.
4. AdSense account-level reporting/authorized-site/history evidence — AG-05 monetization continuity evidence.
5. Paynow/PayPal provider operational evidence — historical activity remains unverified outside the authoritative zero-order/subscription/payment-token WooCommerce snapshot.
6. Newsletter/subscriber platform evidence — WPForms structures/logs are known, but subscriber population is not inferred.
7. WhatsApp distribution/provider evidence — provider/list model remains unverified.
8. Google Ads account evidence — only required if HealthTimes later establishes commercially active spend/dependence.
9. Client-supplied HOSPAZ contracts/approvals/schedule/destination/pricing/history — optional enrichment only; not required for CP3 source continuity because the WordPress/Elementor placement relationship is now reconstructed.

### NON-BLOCKING / DEFERRED

- Production DNS/registrar write access.
- MX/SPF/DKIM/DMARC mutation.
- Production cutover approval.
- Final content-freeze snapshot.
- Final delta media sync.

These belong to later production lanes and are not prerequisites for CP3 acceptance.

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

Current real-source remediation SHA: `4eabf518492ef025551d22e69b5b17ec27de4916`.

Real-source validator version: **1.2.0**.

Required command `npm run test:migration`: **32/32 PASS** on that remediation SHA.

CI at that remediation SHA:

- Validate HealthTimes 2.0: **SUCCESS**
- Migration Tests: **SUCCESS**

Real-source validation outcome:

- database: **VALID**
- uploads: **VALID_REQUIRES_REVIEW**
- provenance: **PROVENANCE_READY**
- reconciliation: **RECONCILED**
- core reconciliation: **CORE_CONTENT_RECONCILED**
- author reconciliation: **AUTHOR_COUNT_RECONCILED**
- hard gates: **0**
- automated unified state: **ARTIFACT_VALID_RECONCILIATION_INCOMPLETE** solely because the uploads executable/script review gate required human disposition

No failing migration test was waived or reclassified.

### Final real-source validation and security disposition

- Large-archive handling: **REMEDIATED AND TESTED** — archive listing/member inspection no longer fails through child-process output buffering on large media packages.
- Explicit WordPress prefix: **SUPPORTED AND USED** — authoritative prefix `wpyg_`, selection source `WP_CONFIG_EXPLICIT`.
- Database validator: **VALID**.
- Uploads validator: **VALID_REQUIRES_REVIEW**.
- Provenance: **PROVENANCE_READY**.
- Reconciliation: **RECONCILED**.
- Automated review gate: `UNEXPECTED_EXECUTABLE_OR_SCRIPT_IN_UPLOADS`.
- Review gate status: **HUMAN-REVIEWED AND DISPOSITIONED — NOT BYPASSED**.

Two PHP artifacts were reviewed without execution:

| Review ID | SHA-256 | Classification | Media attachment reference | Content reference | Disposition |
| --- | --- | --- | --- | --- | --- |
| `PHP-UPLOAD-001` | `783cdc75398980c451cadaa9c97279a24f6df1de971c3e654b25eb43bf7b037f` | `BENIGN_INERT_PLACEHOLDER` | NO | NO | `EXCLUDE_FROM_PUBLIC_MEDIA_MIGRATION` |
| `PHP-UPLOAD-002` | `76e7cd6781911a19d14c02f36b30ef35ebf891c9bcff7bdce70b366f66d06c6f` | `BENIGN_PLUGIN_GENERATED` | NO | NO | `EXCLUDE_FROM_PUBLIC_MEDIA_MIGRATION` |

`PUBLIC_MEDIA_MIGRATION_IMPACT: NONE`

AG-04 carry-forward requirements:

1. exclude both reviewed PHP artifacts from the public `migrated-media` bucket;
2. retain their hashes/dispositions only in private source custody/provenance;
3. carry all **7 zero-byte upload files** into the AG-04 exception/reconciliation ledger rather than silently discarding them.

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

## S. Downstream readiness and dispatch contracts

CP3 source capture is accepted. AG-03 itself does not start downstream execution.

### AG-04 dispatch contract — content/media rehearsal

AG-04 may proceed and must:

1. migrate the August HOSPAZ commercial creative as commercial/direct-ad media;
2. retain WordPress attachment provenance for both `32960` and `32971`;
3. avoid duplicate stored binaries unnecessarily where checksum deduplication is supported, while preserving both source attachment identifiers;
4. preserve attachment `33005` through the ordinary WordPress media/content migration path because its source provenance is editorial;
5. preserve source identifiers and the distinction between asset-source provenance and placement-usage provenance;
6. carry all **7 zero-byte upload files** in the AG-04 exception/reconciliation ledger;
7. exclude `PHP-UPLOAD-001` and `PHP-UPLOAD-002` from public `migrated-media`;
8. never serve executable PHP through `migrated-media`.

### AG-05 dispatch contract — SEO/analytics/monetization/direct ads

AG-05 may proceed with the following direct-ad evidence:

- advertiser: **HOSPAZ**
- classification: `DIRECT_AD_CONTINUITY_CAPTURED`
- logical commercial creative count: **1**
- commercial creative attachment IDs: `32960`, `32971`
- commercial creative SHA-256: `50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f`
- current placement attachment: `33005`
- Elementor/header-footer template: `21`
- historical revisions: `32974`, `32975`, `32976`, `32977`, `32979`, `32980`
- destination URL: **UNKNOWN**
- schedule: **UNKNOWN**
- placement conditions: **UNKNOWN**
- `HOSPAZ_AD_INSERTER_PLACEMENT: NO`
- `NO_STANDALONE_CAMPAIGN_REGISTER_FOUND_IN_CAPTURED_SOURCE`

AG-05 must implement HOSPAZ through the new **direct-ad placement abstraction**, separate from AdSense. It must preserve current-versus-historical asset relationships and must not invent missing campaign metadata.

Google Analytics, Search Console and AdSense account-level evidence gaps remain downstream AG-05 continuity tasks where access is unavailable; their identities already recorded in this report are not reclassified as fully verified.

### AG-06 dispatch

AG-06 remains **READY from the accepted CP2 architecture perspective**. AG-03 made no staging backend changes.

## T. CP3 certification summary

| Closure field | Value |
| --- | --- |
| Database SHA-256 | `16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060` |
| Database size | `18,680,797 bytes` |
| Database table count | `146 total / 132 wpyg_ prefix` |
| WordPress table prefix | `wpyg_` |
| Prefix selection source | `WP_CONFIG_EXPLICIT` |
| Database validation result | `VALID` |
| Uploads SHA-256 | `4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c` |
| Uploads size | `2,863,789,110 bytes` |
| Uploads archive entries | `23,262` |
| Uploads extracted files | `23,141` |
| Uploads archive integrity | `PASS` |
| Zero-byte files | `7 — carry to AG-04 exception ledger` |
| Unreadable files | `0` |
| Symlink/hardlink findings | `0 / 0` |
| Uploads validation result | `VALID_REQUIRES_REVIEW` |
| Automated review finding | `UNEXPECTED_EXECUTABLE_OR_SCRIPT_IN_UPLOADS` |
| Human security review | `COMPLETED / DISPOSITIONED, NOT BYPASSED` |
| Public media migration impact | `NONE` |
| Authoritative published-post count | `5,737` |
| Authoritative page count | `49` |
| Authoritative media count | `3,277` |
| Authoritative category count | `83` |
| Authoritative tag count | `10,283` |
| Authoritative author/user count | `3` |
| Reconciliation | `RECONCILED` |
| Core reconciliation | `CORE_CONTENT_RECONCILED` |
| Author reconciliation | `AUTHOR_COUNT_RECONCILED` |
| Provenance readiness | `PROVENANCE_READY` |
| WooCommerce/subscriptions classification | `STRUCTURES PRESENT; 0 orders; 0 subscriptions; 0 payment tokens; 1 membership plan; SureMembers structures present` |
| Newsletter/audience classification | `WPForms structures present; 15 log rows; WPForms payments 0; subscriber population unverified` |
| Payment historical relevance | `Paynow/PayPal capability observed; historical provider activity unverified` |
| GA4 classification | `IDs verified from Site Kit; account ownership/settings/history pending for AG-05 where access is unavailable` |
| Search Console classification | `property identity known; property type/owners/history not account-level verified` |
| AdSense classification | `publisher/client/slot known; account-level reporting/history/owner evidence pending for AG-05` |
| Direct-ad/HOSPAZ classification | `DIRECT_AD_CONTINUITY_CAPTURED — first-party WordPress/Elementor creative + placement relationship reconstructed; destination/schedule/conditions UNKNOWN; no standalone campaign register found in captured source` |
| Private source custody | `DATABASE/UPLOADS/PHP SOURCE ARTIFACTS REMAIN OUTSIDE GIT` |

## U. CP3 decision

The authoritative database and uploads package are captured outside Git. Database validation is **VALID**; uploads validation reached **VALID_REQUIRES_REVIEW**; the sole executable/script review gate was human-reviewed and dispositioned without bypass; provenance is **PROVENANCE_READY**; source reconciliation is **RECONCILED** with both core and author counts reconciled.

The final previously recorded source-continuity blocker is now resolved. HOSPAZ direct-ad continuity has been reconstructed from first-party WordPress/Elementor evidence, including the logical commercial creative, duplicate attachment provenance, separate current AGM asset, current and historical placement relationships, direct-ad versus AdSense distinction, and explicit preservation of unknown campaign fields.

No CP3 hard blockers remain. Remaining Google/account-level, audience/provider and optional client commercial-record gaps are documented as downstream/soft evidence gaps and are not converted into fabricated facts.

**CP3 ACCEPTED — AG-04 / AG-05 / AG-06 may proceed**
