# Hosting, Environments And DNS

## DNS Inventory

Observed on 2026-09-09:

- Apex `healthtimes.co.zw` A record: `192.250.239.56`.
- `www.healthtimes.co.zw` resolves through Cloudflare IPs.
- Nameservers: `raegan.ns.cloudflare.com`, `neil.ns.cloudflare.com`.
- MX records: priority 10 and 20 both point to `healthtimes.co.zw`.
- SPF includes the hosting IP and `spf.mysecurecloudhost.com`.
- Google site verification TXT exists.

## Email Risk

Because MX points to the apex domain, changing the apex A record could break mail if mail service depends on that host. Before web cutover, create a mail-specific hostname such as `mail.healthtimes.co.zw`, point MX to it if appropriate, and confirm SPF/DKIM/DMARC with the client.

## DNS Worksheet

| Record | Current | Proposed | Owner | Cutover Action |
| --- | --- | --- | --- | --- |
| Apex A/ALIAS | `192.250.239.56` | Production frontend | Cloudflare | Change only after staging sign-off |
| `www` | Cloudflare proxied | Production frontend | Cloudflare | Verify redirect/canonical |
| MX | `healthtimes.co.zw` | Preserve or move to mail host | Client/mail host | Confirm before any A change |
| SPF | current TXT | preserve and update only if email provider changes | Client/mail host | Do not remove |
| DKIM | unknown | request records | Client/mail host | Verify before cutover |
| DMARC | unknown | request/add policy | Client/mail host | Start conservative |

## Cutover Strategy

1. Lower web TTL 24-48 hours before cutover.
2. Do not lower or alter mail records unless mail migration is explicitly planned.
3. Pre-provision SSL for apex and `www`.
4. Verify staging with production-like env.
5. Keep rollback records documented.
6. Change web record.
7. Verify HTTP, HTTPS, canonical, redirects, sitemap, RSS and email delivery.

## Monetization Endpoints

- `/ads.txt` must return HTTP 200 and the confirmed AdSense seller line before DNS cutover.
- `/app-ads.txt` must return HTTP 200 before app monetization or store-linked mobile ads.
- Do not add AdMob or other app-ad identifiers until the client verifies provider account details.
