# Client Data And Access Request

Send this to Michael Gwarisa / HealthTimes before staging migration.

## Access Needed Before Staging

| Item | What It Is | Why We Need It | Safest Delivery |
| --- | --- | --- | --- |
| WordPress administrator access | Temporary admin account | Already available for read-only inspection; keep available for final source verification | Keep temporary access active only through migration, then revoke or rotate credentials |
| WXR export or WP-CLI export | WordPress XML export | Content baseline for staging import, including non-public records where allowed | Prefer hosting/WP-CLI/cPanel export because live admin WXR export stalled during capture; share via private cloud link |
| Full media archive | `wp-content/uploads` | Avoid production hotlinking | ZIP or SFTP read-only access |
| Database export | MySQL dump or phpMyAdmin export | Preserve plugin metadata, Elementor data, SEO, memberships and WooCommerce | Encrypted archive or controlled database export; never commit to Git |
| Hosting/SFTP/cPanel/Plesk | Hosting file/database access | Get theme/plugin files and backups | Temporary read-only or backup export access |
| Plugin inventory/licences | Elementor Pro, WooCommerce extensions, News24 theme/plugin details | Rebuild staging accurately and confirm licensing | Written list plus vendor account handoff if needed |
| Analytics/Search Console | Google Analytics/Site Kit/Search Console | Confirm ownership and preserve measurement/search continuity | Grant account access, not passwords |
| AdSense account access or exports | AdSense publisher, revenue, slot and performance data | Preserve monetization reporting and recreate ad dashboards | Add our Google account with limited access or share exports through private cloud |
| GA4 export | Historical traffic, source, engagement and bounce/engagement metrics | Baseline performance and validate post-migration traffic | Account access or CSV/API export |
| Search Console export | Queries, pages, impressions, clicks, CTR and rankings | Protect search traffic and monitor URL migration | Account access or CSV/API export |
| PageSpeed/Core Web Vitals access | Field/lab performance data | Benchmark new site before cutover | Account access or report export |
| Ad Inserter export | Ad code blocks, placements, conditions and schedules | Recreate monetization without copying settings manually | Plugin export file via private link |
| Newsletter/WhatsApp provider | Current subscriber capture and messaging tools | Migrate consent/preferences | Account invite or export |
| Premium/subscriber/member data | Memberships, subscriptions, entitlements | Determine Premium migration truth | Secure export from payment/member provider |
| Payment providers | Paynow, PayPal, WooCommerce subscriptions | Migrate products without exposing secrets | Provide test credentials first; production keys only through provider dashboard/secret manager |
| Advertising records | Advertisers, campaigns, creatives, dates, contracts | Preserve HOSPAZ and other paid commitments | Spreadsheet plus source creatives in private folder |
| Site Kit configuration | WordPress connection state for Google services | WordPress admin capture has confirmed IDs; Google account access is still needed for ownership, retention and historical exports | Account invite only; no passwords or OAuth tokens |
| Google Ads access if active | Ads account and conversion setup | Preserve paid-acquisition attribution and conversion tags if commercially used | Read-only account invite first |
| Existing `ads.txt` source | Authorized digital seller declarations | Avoid revenue loss from seller misconfiguration | DNS/file manager screenshot or current file export |
| WooCommerce exports | Products, orders, subscriptions and customers where legally relevant | Determine whether commerce history maps to Premium/e-paper/ads or is abandoned | Secure export with private data handling agreement |

## Access Needed Before Production Cutover

| Item | What It Is | Why We Need It | Safest Delivery |
| --- | --- | --- | --- |
| Domain registrar/Cloudflare access | DNS management | Cut over website records and protect email | Invite named admin with least privilege where possible |
| Email DNS details | MX/SPF/DKIM/DMARC and mail host | Prevent breaking HealthTimes email | Screenshot/export from mail host and DNS zone |
| Production staff list | Names, emails, roles, desks, MFA needs | Create real Newsroom accounts | Spreadsheet without passwords |
| Final content freeze approval | Editorial sign-off | Prevent missed final posts | Written approval and freeze window |
| Backup/restore approval | Current hosting backup | Rollback safety | Confirm backup file and restoration route |
| Production Google OAuth/API approval | Permission to connect GA/Search Console/AdSense/PageSpeed APIs | Enable scheduled production ingestion jobs | OAuth consent/account invite; never share refresh tokens manually |

Do not send passwords in GitHub, documentation, email threads or source files.

## WordPress Access Update

WordPress admin access is currently available and has been used only for read-only capture. The stable capture command saved settings, plugin, Site Kit, Ad Inserter, users and public ad-file evidence locally. The built-in admin WXR export path was not reliable on the production host, so staging should not depend on a single all-content export from `Tools > Export`.

For the authoritative staging snapshot, request one of:

- hosting/cPanel backup export containing database and `wp-content/uploads`;
- WP-CLI `wp export` split by post type/date plus `wp db export`;
- phpMyAdmin/MySQL dump plus uploads archive.

These should be transferred privately and never committed to the repository.
