const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const {
  ANALYTICS_CONTINUITY,
  buildStoryCapability,
  buildContextCapability,
  routeDecision,
  storageUrl,
  renderSitemapRows,
  renderFeed,
  buildHospazCapability
} = require('../../lib/ag05-capability');

const publicDoc = {
  source_id: '30154',
  source_type: 'post',
  source_url: 'https://healthtimes.co.zw/2026/02/12/example/',
  handling: 'preserve_directly',
  http_status: 200,
  title: 'Source SEO Title',
  story_title: 'Authoritative Story Title',
  description: 'Source description.',
  canonical_url: 'https://healthtimes.co.zw/2026/02/12/example/',
  robots: 'index,follow,max-image-preview:large',
  open_graph_title: 'Authoritative Story Title',
  open_graph_description: 'Source description.',
  schema_type: 'NewsArticle',
  published_at: '2026-02-12T17:04:57Z',
  modified_at: '2026-02-12T18:04:57Z',
  author: { name: 'Michael Gwarisa', slug: 'mike-gwarisa', bio: null },
  section: { name: 'Health News', slug: 'health-news' },
  access_policy: 'public',
  body_html: '<p>Verified body.</p><script>alert(1)</script>',
  standfirst: 'Verified standfirst.',
  featured_storage_object: 'wordpress/2026/02/example image.jpg',
  featured_alt_text: 'Verified image'
};

test('direct migrated story capability preserves CP5 SEO, OG, structured data and safe body semantics', () => {
  const capability = buildStoryCapability(publicDoc, { supabaseUrl: 'https://example.supabase.co' });
  expect(capability.kind).toBe('story');
  expect(capability.seo.title).toBe('Source SEO Title');
  expect(capability.seo.canonicalUrl).toBe(publicDoc.canonical_url);
  expect(capability.seo.openGraph.title).toBe('Authoritative Story Title');
  expect(capability.seo.openGraph.image).toContain('/storage/v1/object/public/migrated-media/');
  expect(capability.seo.structuredData['@graph'].some(row => row['@type'] === 'NewsArticle')).toBe(true);
  expect(capability.seo.structuredData['@graph'].some(row => row['@type'] === 'Person')).toBe(true);
  expect(capability.seo.structuredData['@graph'].some(row => row['@type'] === 'BreadcrumbList')).toBe(true);
  expect(capability.content.bodyHtml).toContain('Verified body.');
  expect(capability.content.bodyHtml).not.toContain('<script>');
});

test('Premium-review body remains withheld while canonical/SEO authority survives', () => {
  const capability = buildStoryCapability({
    ...publicDoc,
    source_id: '33190',
    access_policy: 'premium_marker_review',
    body_html: '<p>Protected full body.</p>'
  });
  expect(capability.content.bodyProtected).toBe(true);
  expect(capability.content.bodyHtml).toBeNull();
  expect(capability.content.protectedPreview).toContain('Verified standfirst');
  expect(capability.seo.canonicalUrl).toBe(publicDoc.canonical_url);
  expect(capability.seo.robots).toContain('index');
  expect(JSON.stringify(capability)).not.toContain('Protected full body.');
});

test('accepted redirect and explicit 404 decisions fail closed without homepage catch-all', () => {
  expect(routeDecision({
    http_status: 301,
    resolution: 'alias_redirect',
    target_path: '/2025/11/canonical-story/'
  })).toEqual({
    httpStatus: 301,
    resolution: 'alias_redirect',
    targetPath: '/2025/11/canonical-story/'
  });

  expect(routeDecision({
    http_status: 404,
    resolution: 'explicit_404_exception',
    target_path: null
  })).toEqual({
    httpStatus: 404,
    resolution: 'explicit_404_exception',
    targetPath: null
  });

  expect(routeDecision({
    http_status: 301,
    resolution: 'alias_redirect',
    target_path: '/'
  })).toEqual({
    httpStatus: 404,
    resolution: 'invalid_homepage_catchall',
    targetPath: null
  });
});

test('category/tag/author context capability stays noindex and presentation-neutral', () => {
  const capability = buildContextCapability({
    kind: 'category',
    slug: 'health_news',
    name: 'Health News',
    path: '/category/health_news/',
    canonical_url: 'https://healthtimes.co.zw/category/health_news/',
    robots: 'noindex,follow',
    routing_disposition: 'PRESERVE_CONTEXT_NOINDEX',
    items: [{ title: 'Imported story', canonical_url: 'https://healthtimes.co.zw/story/' }]
  });
  expect(capability.seo.robots).toBe('noindex,follow');
  expect(capability.seo.structuredData['@graph'].some(row => row['@type'] === 'CollectionPage')).toBe(true);
  expect(capability.items).toHaveLength(1);
  expect(JSON.stringify(capability)).not.toContain('site-header');
  expect(JSON.stringify(capability)).not.toContain('desktop-nav');
});

test('sitemap and feed preserve CP5 canonical authority semantics', () => {
  const sitemap = renderSitemapRows([
    { canonical_url: 'https://healthtimes.co.zw/a/', modified_at: '2026-09-18T00:00:00Z' },
    { canonical_url: 'https://healthtimes.co.zw/b/', modified_at: null }
  ]);
  expect((sitemap.match(/<url>/g) || [])).toHaveLength(2);
  expect(sitemap).toContain('<loc>https://healthtimes.co.zw/a/</loc>');
  expect(sitemap).toContain('<lastmod>2026-09-18</lastmod>');

  const feed = renderFeed([{
    title: 'Story',
    canonical_url: 'https://healthtimes.co.zw/story/',
    published_at: '2026-09-18T00:00:00Z',
    author_name: 'Michael Gwarisa',
    description: 'Summary'
  }]);
  expect(feed).toContain('<title>Story</title>');
  expect(feed).toContain('Michael Gwarisa');
  expect(feed).not.toMatch(/impressions|revenue|clicks/i);
});

test('migrated-media URL is deterministic and path-safe', () => {
  expect(storageUrl(
    'https://gcdohgbmqhqwydgaxrcr.supabase.co',
    'wordpress/2026/08/HOSPAZ image.jpeg'
  )).toBe(
    'https://gcdohgbmqhqwydgaxrcr.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/08/HOSPAZ%20image.jpeg'
  );
});

test('HOSPAZ capability preserves provenance and keeps unsupported commercial facts UNKNOWN/null', () => {
  const capability = buildHospazCapability({
    advertiser: 'HOSPAZ',
    placement_key: 'hospaz-header-direct',
    current_source_attachment_id: '33005',
    current_storage_object: 'wordpress/2025/11/HOSPAZ.jpeg',
    destination_url_state: 'UNKNOWN',
    destination_url: 'https://example.invalid/invented',
    schedule_state: 'UNKNOWN',
    schedule: 'invented',
    placement_conditions_state: 'UNKNOWN',
    placement_conditions: 'invented'
  }, { supabaseUrl: 'https://example.supabase.co' });

  expect(capability.provenance.currentSourceAttachmentId).toBe('33005');
  expect(capability.creativeUrl).toContain('/migrated-media/');
  expect(capability.destination).toEqual({ state: 'UNKNOWN', url: null });
  expect(capability.schedule).toEqual({ state: 'UNKNOWN', value: null });
  expect(capability.placementConditions).toEqual({ state: 'UNKNOWN', value: null });
  expect(capability.failClosed.clickTargetInvented).toBe(false);
});

test('accepted analytics identities match canonical apps/mobile growth configuration', () => {
  const growthConfig = fs.readFileSync('apps/mobile/src/growth/config.ts', 'utf8');
  expect(ANALYTICS_CONTINUITY.eventVersion).toBe('2026-09-09');
  expect(growthConfig).toContain(ANALYTICS_CONTINUITY.googleTagId);
  expect(growthConfig).toContain(ANALYTICS_CONTINUITY.ga4MeasurementId);
  expect(growthConfig).toContain(ANALYTICS_CONTINUITY.ga4AccountId);
  expect(growthConfig).toContain(ANALYTICS_CONTINUITY.ga4PropertyId);
  expect(growthConfig).toContain(ANALYTICS_CONTINUITY.ga4WebStreamId);
});

test('robots policies recover accepted staging protection and production candidate without activation', () => {
  const staging = fs.readFileSync('robots.txt', 'utf8');
  const production = fs.readFileSync('robots.production.txt', 'utf8');
  expect(staging).toContain('Disallow: /');
  expect(production).toContain('Allow: /');
  expect(production).toContain('Disallow: /newsroom');
  expect(production).toContain('Sitemap: https://healthtimes.co.zw/sitemap.xml');
});

test('Phase 3 does not activate the legacy CP5 Vercel page catch-all or legacy renderer', () => {
  const vercel = fs.readFileSync('vercel.json', 'utf8');
  const api = fs.readFileSync('api/public.js', 'utf8');
  const shim = fs.readFileSync('lib/ag05-public-runtime.js', 'utf8');
  expect(vercel).not.toContain('/(.*)');
  expect(vercel).not.toContain('kind=page');
  expect(api).not.toContain('renderStoryPage');
  expect(api).not.toContain('renderContextPage');
  expect(shim).not.toContain('<header');
  expect(shim).not.toContain('styles.css');
});
