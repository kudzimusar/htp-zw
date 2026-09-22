const { test, expect } = require('@playwright/test');
const {
  organizationSchema,
  personSchema,
  articleSchema,
  breadcrumbSchema,
  buildArticleGraph
} = require('../../scripts/migration/ag05-structured-data');

test('Organization schema uses only certified publication identity', () => {
  expect(organizationSchema()).toEqual({
    '@type': 'Organization',
    '@id': 'https://healthtimes.co.zw/#organization',
    name: 'HealthTimes',
    url: 'https://healthtimes.co.zw/'
  });
});

test('NewsArticle schema preserves real story authority fields', () => {
  const schema = articleSchema({
    headline: 'Verified story headline',
    canonicalUrl: 'https://healthtimes.co.zw/verified-story/',
    datePublished: '2026-09-18T17:04:57Z',
    dateModified: '2026-09-18T18:00:00Z',
    author: { name: 'Real Author', url: 'https://healthtimes.co.zw/author/real-author/' },
    image: 'https://healthtimes.co.zw/media/story.jpg',
    articleSection: 'Public Health'
  });

  expect(schema['@type']).toBe('NewsArticle');
  expect(schema.headline).toBe('Verified story headline');
  expect(schema.author.name).toBe('Real Author');
  expect(schema.publisher).toEqual({ '@id': 'https://healthtimes.co.zw/#organization' });
  expect(schema.mainEntityOfPage['@id']).toBe('https://healthtimes.co.zw/verified-story/');
});

test('structured data does not fabricate a missing author', () => {
  expect(personSchema({})).toBeNull();

  const schema = articleSchema({
    headline: 'Source story without named author',
    canonicalUrl: 'https://healthtimes.co.zw/no-named-author/',
    datePublished: '2026-09-18T17:04:57Z'
  });

  expect(schema).not.toHaveProperty('author');
});

test('article schema fails rather than inventing required source facts', () => {
  expect(() => articleSchema({
    headline: 'Incomplete source record',
    canonicalUrl: 'https://healthtimes.co.zw/incomplete/'
  })).toThrow('requires headline, canonicalUrl and datePublished');
});

test('Person and BreadcrumbList use supplied real fields only', () => {
  const graph = buildArticleGraph({
    headline: 'Verified story',
    canonicalUrl: 'https://healthtimes.co.zw/verified-story/',
    datePublished: '2026-09-18T17:04:57Z',
    author: {
      name: 'Real Author',
      role: 'Reporter',
      bio: 'Source-provided biography.'
    }
  }, [
    { name: 'Home', url: 'https://healthtimes.co.zw/' },
    { name: 'Public Health', url: 'https://healthtimes.co.zw/topics/public-health/' },
    { name: 'Verified story', url: 'https://healthtimes.co.zw/verified-story/' }
  ]);

  expect(graph['@context']).toBe('https://schema.org');
  expect(graph['@graph'].some(item => item['@type'] === 'Person')).toBe(true);
  expect(graph['@graph'].some(item => item['@type'] === 'BreadcrumbList')).toBe(true);
});

test('BreadcrumbList rejects invented or incomplete crumbs', () => {
  expect(() => breadcrumbSchema([
    { name: 'Home', url: 'https://healthtimes.co.zw/' },
    { name: '', url: '' }
  ])).toThrow('requires name and valid URL');
});
