const { test, expect } = require('@playwright/test');
const { detectShortcodes, extractImages, normalizeWpPost } = require('../../scripts/migration/wordpress-transform');

test('detects shortcodes so unknown content is not silently discarded', () => {
  const found = detectShortcodes('<p>Intro</p>[gallery ids="1,2"]<p>More</p>[caption]Image[/caption]');
  expect(found.map(item => item.shortcode)).toEqual(['gallery', 'caption']);
});

test('extracts inline image source metadata for media remapping', () => {
  const images = extractImages('<figure><img src="https://healthtimes.co.zw/wp-content/uploads/2026/09/photo.jpg" alt="Clinic" title="Clinic opening"></figure>');
  expect(images).toHaveLength(1);
  expect(images[0].src).toContain('/wp-content/uploads/');
  expect(images[0].alt).toBe('Clinic');
  expect(images[0].sourceTagHash).toHaveLength(64);
});

test('normalizes WordPress post provenance and redirect preservation data', () => {
  const normalized = normalizeWpPost({
    id: 33085,
    type: 'post',
    status: 'publish',
    slug: 'zika-mosquito-breeds-london-climate-change',
    link: 'https://healthtimes.co.zw/zika-mosquito-breeds-london-climate-change/',
    date_gmt: '2026-09-09T08:56:05',
    modified_gmt: '2026-09-09T09:00:00',
    author: 1,
    featured_media: 9,
    categories: [12, 34],
    tags: [56],
    title: { rendered: 'Zika-Carrying Mosquito Breeds in London' },
    excerpt: { rendered: '<p>By Michael Gwarisa A mosquito capable...</p>' },
    content: { rendered: '<p>Body</p>[embed]https://example.com[/embed]' },
    yoast_head_json: { title: 'SEO title', description: 'SEO description', canonical: 'https://healthtimes.co.zw/zika-mosquito-breeds-london-climate-change/' },
    plugin_private_field: true
  });
  expect(normalized.source.stableKey).toBe('wordpress:post:33085');
  expect(normalized.source.legacyPath).toBe('/zika-mosquito-breeds-london-climate-change/');
  expect(normalized.story.authorSourceId).toBe('1');
  expect(normalized.story.categorySourceIds).toEqual(['12', '34']);
  expect(normalized.story.seo.description).toBe('SEO description');
  expect(normalized.exceptions.map(item => item.type)).toEqual(['shortcode', 'unknown_field']);
});
