# Analytics, SEO, Audience And Monetization Inventory

Inspection dates: 2026-09-09 and 2026-09-14. Production data was not modified.

## Migration Position

HealthTimes must migrate four business assets together:

- Content: WordPress articles, pages, authors, media and taxonomy.
- Authority: URLs, SEO metadata, backlinks, Search Console history and citations.
- Audience: Analytics history, acquisition channels, countries, engagement and subscriptions.
- Revenue: AdSense identity/configuration, advertising inventory, direct campaigns and Premium.

Google integrations are not just snippets to copy from WordPress. Google Analytics, Search Console, AdSense and PageSpeed remain external authoritative systems, while HealthTimes should periodically import normalized aggregate metrics into its own backend for Newsroom reporting.

## Confirmed Connected Services

Site Kit shows Search Console, AdSense, Analytics and PageSpeed Insights connected. Google Ads is active as a Site Kit module but setup is not complete: no conversion ID, customer ID or external customer ID is configured.

## Public Identifiers

These identifiers are public page configuration, not passwords:

- Google tag / Site Kit tag: `GT-PLTTGPL`.
- GA4 account ID: `137814020`.
- GA4 property ID: `359235319`.
- GA4 web data stream ID: `4756168788`.
- GA4 measurement ID: `G-S39LN2KX4X`.
- GA4 Google tag account ID: `6077639211`.
- GA4 Google tag container ID: `105185616`.
- Search Console property: `https://healthtimes.co.zw/`.
- AdSense client: `ca-pub-8744434739998394`.
- AdSense publisher in `ads.txt`: `pub-8744434739998394`.
- AdSense slot observed in Ad Inserter block 1: `7971959240`.
- Site Kit version observed in admin: `1.187.0`.
- WooCommerce version metadata observed in admin: `11.1.0`.
- WordPress generator metadata: `7.1`.
- Elementor metadata: Elementor `4.2.4`, Elementor Pro `4.2.3`.

Still unknown until Google account access is granted: verified Google account ownership, GA4 retention settings, referral exclusions, cross-domain rules, historical metrics available through the API, Search Console verified owners, AdSense reporting access/revenue history and any commercially active Google Ads account outside the incomplete Site Kit setup.

## Site Kit Configuration Captured From WordPress Admin

The 2026-09-14 read-only admin capture confirmed:

- Analytics snippet is enabled through Site Kit.
- Analytics tracking is disabled for logged-in WordPress users.
- Analytics custom dimensions for post date, author, categories, post type, event provider and form ID are not currently available.
- Site Kit reports Analytics and Search Console data as available.
- AdSense account status and site status are both `ready`.
- Site Kit's own AdSense snippet is disabled; ad serving currently appears to depend on Ad Inserter and direct ad code placement.
- AdSense ad-blocking recovery snippets are enabled and reported as `tag-placed`.
- Consent mode is disabled; Site Kit lists EU/UK/EEA/Switzerland regions but reports no WP Consent API plugin installed.
- Conversion tracking is enabled in Site Kit.
- Email reporting is enabled in Site Kit.
- Visible GA4 default audiences: `All visitors` and `Purchasers`.

## Data Separation

The production platform must separate external integration configuration, credentials/OAuth secrets, imported historical metrics, newly collected HealthTimes events and dashboard/derived metrics.

Credentials, refresh tokens and service credentials must never be placed in frontend JavaScript or Git. Store only `credential_secret_ref` values that point to a secret manager/provider vault.

## Google Analytics Continuity

Prefer preserving the existing HealthTimes Analytics property if ownership, consent and technical configuration permit it. This keeps traffic trend lines continuous instead of starting from zero.

The existing GA4 property should be preserved if ownership and consent review permit it. Confirmed continuity identifiers are account `137814020`, property `359235319`, stream `4756168788` and measurement ID `G-S39LN2KX4X`.

After Google account access, document account ownership, domains configured, referral exclusions, cross-domain requirements, consent/privacy settings, data retention settings and API-access limits.

## HealthTimes Event Specification

Event version: `2026-09-09`.

| Event | Required Parameters |
| --- | --- |
| `page_view` | path, title, referrer, device |
| `article_view` | story_id, legacy_wp_id, section, author, premium_state |
| `article_25_percent` | story_id, scroll_depth |
| `article_50_percent` | story_id, scroll_depth |
| `article_75_percent` | story_id, scroll_depth |
| `article_complete` | story_id, read_time_seconds |
| `listen_started` | story_id, premium_state |
| `listen_completed` | story_id, listen_seconds |
| `story_saved` | story_id, reader_state |
| `story_shared` | story_id, channel |
| `whatsapp_share` | story_id, page_path |
| `search_performed` | query, result_count |
| `topic_followed` | topic_id, topic_name |
| `citation_copied` | story_id, access_state |
| `reference_opened` | story_id, reference_url_host |
| `premium_preview_started` | story_id, reader_state |
| `premium_warning_shown` | story_id, seconds_elapsed |
| `premium_locked` | story_id, seconds_elapsed |
| `subscription_started` | plan_key, source_path |
| `subscription_completed` | plan_key, provider, value |
| `newsletter_signup` | source_path, consent_version |
| `push_opt_in` | source_path, consent_version |
| `ad_impression` | campaign_id, creative_id, placement, provider, story_id_or_path |
| `ad_click` | campaign_id, creative_id, placement, provider, story_id_or_path |

Do not send private Newsroom/editorial activity into public analytics. Internal staff analytics needs its own security and consent design.

## Historical Analytics Import

Prepare GA4 Data API or export ingestion for aggregate historical metrics by page/article, date, users, sessions, views, source/medium/campaign, device, country/region and engagement where available. Every imported row must retain source system, original property, metric date, dimensional grain, import run/checkpoint and safe raw source payload.

Do not claim historical data where Google's retention/API no longer exposes it.

## Search Console Integration

Server-side ingestion should retrieve and normalize page, query, date, country, device, search appearance, clicks, impressions, CTR and average position.

The Newsroom SEO Desk should eventually show total clicks/impressions, ranking changes, top search stories, top queries, search opportunities, country growth, page CTR opportunities, pages ranking positions 8-20 and newly rising topics. Global country/region reporting is first-class.

## SEO Identity

For every migrated story, preserve SEO title, meta description, canonical URL, Open Graph title, Open Graph description, Open Graph image, index/noindex, structured-data type, legacy WordPress URL, redirect status and SEO review status/date.

Preserve WordPress SEO/plugin metadata when available. Do not silently drop Yoast, RankMath or plugin metadata if discovered.

## Structured Data

Production pages should server-render schema.org JSON-LD for `NewsArticle`, `Article`, `Person`, `Organization`, `BreadcrumbList` and other genuinely relevant types discovered in source content. HealthTimes authorship, publication dates, update times, citations, canonical URL and publisher identity must remain explicit.

## AdSense Continuity

Preserve publisher `pub-8744434739998394`, client `ca-pub-8744434739998394` and known slot `7971959240`.

Do not reproduce WordPress Ad Inserter as hardcoded HTML fragments scattered through story content. The new platform should use an advertising-placement abstraction where each placement can serve a direct HealthTimes campaign, AdSense, house promotion or empty/no-ad policy. Current direct HOSPAZ advertising must continue in this same inventory model.

## ads.txt And app-ads.txt

`/ads.txt` is a hard cutover gate and currently contains:

```text
google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0
```

The repository includes the same production equivalent in `ads.txt`.

`/app-ads.txt` currently returns the WordPress 404 page. The repository includes `app-ads.txt` with only the verified seller declaration above. If AdMob or another app-ad provider is later configured, update this file only from verified account data.

The official HealthTimes website hosts `ads.txt` and `app-ads.txt`; app-store listings should point to that website; AdSense/AdMob/mobile ad providers validate seller authorization from that domain. No AdMob identifier is currently confirmed.

## AdSense Reporting

Prepare AdSense reporting ingestion for aggregate ad impressions, clicks, estimated earnings, page RPM, ad RPM, CPC and viewability where available. Keep Google-owned revenue reporting separate from HealthTimes direct campaign delivery metrics.

## Direct Campaign Metrics

For direct campaigns such as HOSPAZ, HealthTimes should collect `ad_impression` and `ad_click` with campaign, creative, placement, article/page, device, timestamp and geography where lawful and appropriate. Do not fabricate historical direct-ad performance.

## Commercial Intelligence Dashboard

Production Commercial should show active campaigns, campaign delivery, direct campaign impressions/clicks, AdSense reporting, revenue trend, placement performance, geographic performance and Premium conversion interaction. Commercial analytics must not grant commercial staff editorial modification privileges.

## PageSpeed And Web Vitals

Recreate Site Kit's useful performance reporting through scheduled PageSpeed Insights and Core Web Vitals ingestion where APIs provide it. Track LCP, INP, CLS, performance score, mobile vs desktop, expensive media/assets and advertising placements associated with poor performance.

Performance regression is a migration acceptance criterion.

## Global Audience Dashboard

The production dashboard should answer which countries generate traffic, which African topics attract international users, which stories acquire US/UK/European/diaspora readers, which content performs through search, which content produces repeat readers and which Premium stories convert.

Do not fabricate country metrics. Until integrations are connected, use integration-required empty states.

## Citations, Backlinks And Research Impact

Integrate Citations & Impact with SEO and audience intelligence. Normalize backlinks, media citations, academic citations, institutional references and government/NGO references.

Potential future providers include Search Console link data, Ahrefs, Semrush, Moz, Crossref, OpenAlex and manual editorial verification. Do not claim coverage until connected.

## WooCommerce Analysis

WooCommerce should be audited for its real historical purpose: Premium subscriptions, one-time sales, e-paper purchases, advertising purchases or abandoned historical functionality. Preserve financially or legally relevant records. Do not automatically reproduce WooCommerce if the new platform can use a cleaner subscriber/payment layer.

## Google Ads

Google Ads is detected but incomplete in Site Kit: conversion ID, customer ID, external customer ID and account overview URL are blank. If commercially active elsewhere, request configuration for conversion tracking, paid acquisition, remarketing where lawful and campaign attribution. This should not block migration unless HealthTimes confirms active spend/dependence.

## Consent And Privacy

Global expansion requires regional consent handling, cookie preferences, script enable/disable by consent state, non-personalized ads where required, separation of staff/internal analytics from public reader analytics and retention/deletion processes.

Do not assume one consent regime applies globally.

## Scheduled Ingestion

Server jobs should cover Analytics, Search Console, AdSense, PageSpeed and future citations/backlinks. Jobs must be restartable, idempotent, observable, rate-limit aware and credential-safe. Store checkpoints and errors.

## Dashboards By Role

- Reporter: own story performance, search queries driving their stories, citations/mentions.
- Editor: desk performance, trending topics, search opportunities, update opportunities, global geography.
- Audience: traffic sources, newsletters, WhatsApp, social and repeat audience.
- Commercial: AdSense, direct campaigns, Premium conversion and advertiser performance.
- Publisher: consolidated editorial, audience, SEO and commercial intelligence.

## Remaining Unknowns

- Google account ownership for GA4/Search Console/AdSense.
- GA4 retention, referral exclusion, cross-domain and enhanced measurement settings.
- Search Console verified property owner and historical export availability.
- AdSense account ownership and revenue history.
- Whether Ad Inserter Pro or free tracking has historical impression/click reports.
- Whether WooCommerce has historical orders/subscriptions worth migrating.
- Whether existing Premium users are in WooCommerce Memberships, Subscriptions, SureDash/SureCart, another system, or only planned.
- Consent/privacy setup for analytics, ads, email and WhatsApp.
