const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

test('staging robots blocks indexing while production candidate protects internal routes', () => {
  const staging = read('robots.txt');
  const production = read('robots.production.txt');

  expect(staging).toContain('Disallow: /');
  expect(production).toContain('Allow: /');
  expect(production).toContain('Disallow: /newsroom/');
  expect(production).toContain('Disallow: /api/internal/');
  expect(production).toContain('Sitemap: https://healthtimes.co.zw/sitemap.xml');
});

test('home emits initial HTML authority metadata', () => {
  const html = read('index.html');
  expect(html).toContain('<link rel="canonical" href="https://healthtimes.co.zw/"');
  expect(html).toContain('property="og:title"');
  expect(html).toContain('name="twitter:card"');
  expect(html).toContain('"@type": "Organization"');
  expect(html).toContain('"@type": "WebSite"');
  expect(html).toContain('src="analytics.js"');
});

test('generic article shell cannot be indexed as if it were migrated story metadata', () => {
  const html = read('article.html');
  expect(html).toContain('name="robots" content="noindex,follow,max-image-preview:large" data-seo-fallback');
  expect(html).toContain('Migrated articles must replace this fallback with server-rendered story metadata');
});

test('public analytics is production-host and consent gated', () => {
  const js = read('analytics.js');
  expect(() => new Function(js)).not.toThrow();
  expect(js).toContain("new Set(['healthtimes.co.zw', 'www.healthtimes.co.zw'])");
  expect(js).toContain("const MEASUREMENT_ID = 'G-S39LN2KX4X'");
  expect(js).toContain("const TAG_ID = 'GT-PLTTGPL'");
  expect(js).toContain("analytics_storage: 'denied'");
  expect(js).toContain("if (!PUBLIC_HOSTS.has(location.hostname)) return false");
  expect(js).toContain("if (!readConsent().analytics) return false");
});

test('public analytics has explicit Newsroom and private-data boundaries', () => {
  const js = read('analytics.js');
  const newsroom = read('newsroom.html');

  expect(newsroom).not.toContain('src="analytics.js"');
  expect(js).toContain("document.body?.dataset?.page === 'newsroom'");
  for (const prohibited of [
    'draft_content',
    'internal_comments',
    'private_source_document',
    'staff_email',
    'permission_details',
    'payment_details',
    'phone_number',
    'push_token'
  ]) {
    expect(js).toContain(`'${prohibited}'`);
  }
});

test('analytics event contract contains the required public continuity events', () => {
  const js = read('analytics.js');
  for (const eventName of [
    'page_view',
    'article_view',
    'article_25_percent',
    'article_50_percent',
    'article_75_percent',
    'article_complete',
    'listen_started',
    'listen_completed',
    'story_saved',
    'story_shared',
    'whatsapp_share',
    'search_performed',
    'topic_followed',
    'citation_copied',
    'reference_opened',
    'premium_preview_started',
    'premium_warning_shown',
    'premium_locked',
    'subscription_started',
    'subscription_completed',
    'newsletter_signup',
    'push_opt_in',
    'ad_impression',
    'ad_click'
  ]) {
    expect(js).toContain(`'${eventName}'`);
  }
  expect(js).toContain("const EVENT_VERSION = '2026-09-09'");
});

test('HOSPAZ continuity remains direct-ad provenance with unknown fields preserved', () => {
  const sql = read('supabase/migrations/20260922081500_ag05_seo_analytics_monetization_continuity.sql');
  expect(sql).toContain("'32960'");
  expect(sql).toContain("'32971'");
  expect(sql).toContain("'33005'");
  expect(sql).toContain('50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f');
  expect(sql).toContain("null, 'UNKNOWN'");
  expect(sql).toContain('ad_inserter_placement = false');
  expect(sql).toContain("array['direct','none']");
});
