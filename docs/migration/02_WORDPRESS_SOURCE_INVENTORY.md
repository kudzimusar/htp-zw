# WordPress Source Inventory

Inspection dates: 2026-09-09 and 2026-09-14. Methods: public REST API, sitemaps, RSS, robots.txt, DNS, and read-only admin capture. Production data was not modified.

The 2026-09-14 admin capture is stored locally under `migration-output/wordpress-admin-2026-09-14T13-30-39-397Z/`. This folder is intentionally ignored by Git because admin HTML and export evidence can contain sensitive operational data.

## Confirmed Public Counts

| Source | Count |
| --- | ---: |
| Published posts | 5,721 |
| Published pages | 49 |
| Media records | 3,260 |
| Categories | 83 |
| Tags | 10,238 |
| Public users/authors | 3 |

Admin listing also showed all posts at 5,800 with 5,721 published, 9 drafts, 2 pending and 2 trash.

## Confirmed Site Metadata

- Site name: HealthTimes.
- Description: Zimbabwe's Leading Health and Science News Publication.
- Timezone: Africa/Harare.
- Homepage is a WordPress page, public REST page ID 12.
- Generator in RSS: WordPress 7.1.
- Server: LiteSpeed.
- Robots: `User-agent: *` and `Allow: /`.
- RSS feed: `/feed/`.
- Sitemap index: `/wp-sitemap.xml` and `/sitemap.xml`.

## Confirmed Sitemap Families

- `wp-sitemap-posts-post-*.xml`
- `wp-sitemap-posts-page-1.xml`
- `wp-sitemap-posts-product-1.xml`
- `wp-sitemap-posts-elementor-hf-1.xml`
- `wp-sitemap-taxonomies-category-1.xml`
- `wp-sitemap-taxonomies-post_tag-*.xml`
- `wp-sitemap-taxonomies-product_cat-1.xml`
- `wp-sitemap-users-1.xml`

## Confirmed WordPress Routes And Services

REST namespaces include WordPress core, WooCommerce, Elementor, Elementor Pro, Paynow, PayPal, Pinterest, Google for WooCommerce, Site Kit, WPForms, Ad Inserter and Smash Balloon related services.

## Analytics, SEO And Monetization Metadata

Confirmed read-only admin/public findings:

- Site Kit connected services: Search Console, AdSense, Analytics and PageSpeed Insights.
- Google Ads setup is visible but incomplete.
- Site Kit dashboard categories: key metrics, traffic, content, speed and monetization.
- Site Kit email reports can be subscribed to the WordPress admin email shown in admin.
- Public Google tag loaded by Site Kit: `GT-PLTTGPL`.
- GA4 account ID: `137814020`.
- GA4 property ID: `359235319`.
- GA4 web data stream ID: `4756168788`.
- GA4 measurement ID: `G-S39LN2KX4X`.
- GA4 snippet is enabled through Site Kit and disabled for logged-in users.
- Search Console property: `https://healthtimes.co.zw/`.
- Public AdSense client used in ad code: `ca-pub-8744434739998394`.
- Site Kit AdSense account ID: `pub-8744434739998394`.
- Site Kit AdSense account and site status are `ready`; Site Kit's own AdSense snippet is disabled while Ad Inserter injects ad code.
- Public `ads.txt`: `google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0`.
- `app-ads.txt` currently returns the WordPress 404 page and should be created before app monetization.
- Site Kit consent mode is disabled; configured EU/UK/EEA/Switzerland region list is present but no WP Consent API plugin is installed.
- Site Kit conversion tracking and email reporting are enabled.
- Site Kit Analytics audiences visible in configuration: `All visitors` and `Purchasers`.
- Public pages include canonical links, WordPress shortlinks, generator metadata and Site Kit AdSense platform metadata.
- Sample articles inject AdSense blocks inside article content through Ad Inserter block 1.
- Ad Inserter block 1 uses AdSense slot `7971959240` and appears in posts, homepage and category contexts.
- WooCommerce analytics exists; month-to-date Sep 1-9, 2026 overview showed no sales/orders data in the visible admin screen.
- Reading settings expose many page products including Subscribe, Shop, My Account, Cart, Checkout, Premium, Jobs, E-paper, Training & Courses and policy/section pages.
- Permalink settings expose the post-name structure pattern: `https://healthtimes.co.zw/sample-post/`.

## Confirmed Theme And Plugins From Read-Only Admin

- Active theme: News24.
- Other installed theme: Twenty Twenty-Five.
- Active plugins include Ad Inserter, Angie, Classic Editor, Element Pack Lite, Elementor, Elementor Pro, FSM Custom Featured Image Caption, Google for WooCommerce, Image Optimization, Paynow Zimbabwe, Pinterest for WooCommerce, Reddit for WooCommerce, Site Kit, Smash Balloon Facebook/X feeds, Snapchat for WooCommerce, Ultimate Addons for Elementor, Ultimate Post Kit, WooCommerce, WooCommerce Memberships, WooCommerce PayPal Payments, WooCommerce Subscriptions, Wordfence Security, WP Mail SMTP and WPForms Lite.
- Inactive plugins include News Element, News Element Pro, News24 Demo, Pro Pack for WP Job Openings and Rank Math SEO.
- Admin reported 12 plugin updates available and a Site Health critical issue.

## WordPress Admin Export Findings

The built-in WordPress export screen is available, but full WXR export through the live admin page was unreliable during automated capture. The initial all-content export hung, and split export attempts also stalled on the production host. For staging, use the public REST importer for rehearsal and request a hosting-level/WP-CLI/cPanel/phpMyAdmin export for the authoritative snapshot. This avoids overloading the live WordPress dashboard and preserves drafts, plugin meta, WooCommerce, memberships and Elementor data that public REST cannot fully expose.

## Content To Preserve

Posts, pages, products, Elementor header/footer content, categories, tags, authors, media, captions, alt text, credits, excerpts, dates, modified dates, comments if required, SEO fields, redirects, Premium/membership state, product/subscription data if active, jobs, e-papers, videos, downloads, forms and advertising material.

## Intrinsic Data Value To Recreate In The Custom Platform

- Analytics configuration: Site Kit Google tag `GT-PLTTGPL`, GA4 account `137814020`, property `359235319`, stream `4756168788`, measurement ID `G-S39LN2KX4X`, Search Console property `https://healthtimes.co.zw/`, PageSpeed reporting and dashboard goals.
- Content performance data: page views, users, sessions, engagement, bounce rate, top content, source/medium, device, country and time series.
- Search performance data: queries, pages, clicks, impressions, CTR and average position.
- Monetization data: AdSense publisher ID, slots, ad placements, revenue, impressions, clicks, RPM/CTR and invalid-traffic safeguards.
- SEO data: canonical URLs, titles, descriptions, robots settings, social metadata, schema, shortlinks and URL history.
- Commercial data: advertisers, campaigns, creatives, start/end dates, placements, disclosure labels and reporting.
- Subscriber and Premium data: entitlement source, product, plan, member state, order/subscription references and consent.
- Audience capture: newsletter, WhatsApp, account preferences, forms/submissions and consent records.

## Not Publicly Discoverable

Full drafts, pending posts, private content, orders, subscribers, memberships, payment settings, plugin private options, complete Elementor templates/settings, forms/submissions, email SMTP settings, Google historical metrics/revenue/query exports, redirect plugins, hosting backups, raw uploads, database records, DNS registrar state and any hidden Premium accounts.
