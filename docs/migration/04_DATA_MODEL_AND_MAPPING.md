# Data Model And Mapping

The schema scaffold lives in `supabase/migrations/20260909120000_healthtimes_migration_core.sql`.

## Principles

- Every migrated record keeps WordPress provenance.
- `legacy_sources.stable_key` is the idempotency key, for example `wordpress:post:33085`.
- Imports are rerunnable and compare checksums before updating.
- Unknown fields and shortcodes are retained in raw source payloads and exception reports.

## Core Entities

- `legacy_sources`
- `stories`
- `story_revisions`
- `story_lifecycle_events`
- `authors`
- `sections`
- `tags`
- `story_tags`
- `media_assets`
- `media_usage`
- `legacy_url_mappings`
- `staff_profiles`
- `newsroom_roles`
- `newsroom_capabilities`
- `newsroom_role_capabilities`
- `advertisers`
- `ad_campaigns`
- `ad_creatives`
- `subscribers`
- `premium_entitlements`
- `analytics_integrations`
- `analytics_ingestion_runs`
- `analytics_daily_metrics`
- `search_console_daily_metrics`
- `seo_metadata`
- `monetization_settings`
- `ad_placements`
- `ad_events`
- `adsense_daily_metrics`
- `web_vitals_daily_metrics`
- `audience_events`
- `citation_references`
- `audit_logs`
- `migration_runs`

## WordPress Mapping

| WordPress | Target |
| --- | --- |
| `wp_posts` post/page/product | `stories` or product/commercial extension table |
| `ID` | `legacy_sources.source_id` |
| `post_name` / REST `slug` | `stories.slug` |
| `post_date_gmt` | `stories.published_at` |
| `post_modified_gmt` | `stories.modified_at` |
| `post_author` | `authors.wordpress_source_id` |
| `post_content` | `stories.body_html` plus transformed structured body |
| categories | `sections` and `story.primary_section_id` |
| tags | `tags` and `story_tags` |
| attachments | `media_assets` |
| `_thumbnail_id` / `featured_media` | `media_usage` |
| permalink | `legacy_url_mappings.old_path` |
| Yoast/SEO metadata | `stories.seo_title`, `seo_description`, `canonical_url` |
| Site Kit settings | `analytics_integrations` |
| GA/Search Console exports | `analytics_daily_metrics`, `search_console_daily_metrics` |
| Ad Inserter/AdSense blocks | `monetization_settings`, `ad_creatives` |
| public meta/canonical/schema | `seo_metadata` |

## Review Tables Still To Add After Client Data

Direct database access may reveal plugin tables for WooCommerce Subscriptions, WooCommerce Memberships, WPForms, ad inserter settings, Elementor templates and redirect/SEO plugins. Add dedicated tables only after confirming active source data.

## Analytics And Revenue Idempotency

- `analytics_ingestion_runs` records source, date range, checkpoint, row counts and errors.
- GA rows are unique by integration, property, date, path, event and dimensions.
- Search Console rows are unique by integration, property, date, query, page, country, device and search appearance.
- AdSense rows are unique by integration, date, publisher/client/slot, path, device and country.
- Direct ad events use event/campaign/creative/placement/story/path/timestamp/actor uniqueness.
- Web Vitals rows are unique by integration, date, path and strategy.
- Citation references are unique by story, reference type, URL/provider and provider reference.

Credential material is not stored in these tables. Use `credential_secret_ref` to point to a secret manager record.
