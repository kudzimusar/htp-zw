# Target Production Architecture

## Recommendation

Use GitHub as source control, Vercel for frontend/API hosting, Supabase for Postgres/Auth/Storage, Cloudflare for DNS/CDN/WAF, and a transactional email provider such as Resend. This gives HealthTimes staging/production separation, managed SSL, server-side API enforcement, Postgres provenance, object storage, backups and operational monitoring without a heavy custom infrastructure team.

## Topology

- Frontend: Vercel project with staging previews and production domain.
- Backend/API: Next.js or equivalent server functions on Vercel, with service-role access only on the server.
- Database: Supabase Postgres with row-level security and point-in-time backup tier.
- Auth: Supabase Auth or compatible managed auth for readers and staff, with MFA readiness.
- Media: Supabase Storage or S3-compatible object storage behind CDN.
- DNS/CDN/WAF: Cloudflare.
- Email: Resend or provider selected by client, preserving current MX.
- Analytics: privacy-aware web analytics plus Google Search Console.
- Monitoring: Vercel logs/analytics, Supabase logs, uptime checks and error reporting.

## Analytics And Revenue Data Architecture

The new platform should not depend on WordPress Site Kit as the long-term data layer. Recreate the valuable parts directly:

- Server-rendered metadata for every story and section.
- First-class analytics integration settings for GA4, Search Console, AdSense and PageSpeed.
- Event tracking for article views, scroll depth, Premium locks, subscription starts, ad impressions/clicks, saved stories, search, share actions and newsletter/WhatsApp signups.
- Daily rollups in Postgres for editorial/commercial dashboards.
- Server-side ad placement definitions instead of hardcoded snippets.
- `ads.txt` and `app-ads.txt` generated from configuration.
- Privacy/consent strategy before sending analytics or ad personalization events.
- Scheduled ingestion for GA4, Search Console, AdSense, PageSpeed and future citation/backlink providers.
- Integration health, checkpoints and errors visible to Publisher/System roles.

Core KPIs to recreate:

- Visits/users/sessions.
- Bounce rate or GA4 equivalent engagement rate.
- Top content and traffic sources.
- Search queries, impressions, CTR and average position.
- AdSense revenue, impressions, clicks, CTR and RPM.
- Premium conversion funnel.
- Newsletter/WhatsApp signup conversion.
- Returning-reader and saved-story engagement.

## Intelligence Dashboards

- SEO Desk: search queries, ranking movement, CTR opportunities, countries, pages ranking 8-20 and rising topics.
- Audience Desk: traffic sources, repeat readers, newsletter/WhatsApp/social performance and global geography.
- Commercial Desk: AdSense revenue, direct campaign delivery, placement performance and Premium conversion without editorial edit authority.
- Publisher: combined editorial, audience, SEO, performance and revenue intelligence.

## Why Not GitHub Pages For Production

GitHub Pages cannot enforce private drafts, server-side RBAC, Premium entitlement, secure staff sessions, audit logs, transactional email, protected media, backend APIs, backups or migration jobs.

## Environment Strategy

- Local: fixtures only, never production exports.
- Staging: imported WordPress snapshot, test credentials, no production DNS.
- Production: controlled cutover after staging sign-off.

## Backups And Recovery

- Supabase PITR or scheduled logical backups.
- Object storage versioning or daily media manifest snapshots.
- Deployment rollback through Vercel.
- WordPress retained read-only for 60-90 days after launch.
