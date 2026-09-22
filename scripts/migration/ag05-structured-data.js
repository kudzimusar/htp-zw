'use strict';

const SITE_URL = 'https://healthtimes.co.zw/';
const ORGANIZATION_ID = 'https://healthtimes.co.zw/#organization';

function absoluteHealthTimesUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, SITE_URL);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item == null || item === '') return false;
      if (Array.isArray(item) && item.length === 0) return false;
      return true;
    })
  );
}

function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'HealthTimes',
    url: SITE_URL
  };
}

function personSchema(person) {
  if (!person || !String(person.name || '').trim()) return null;
  return compactObject({
    '@type': 'Person',
    name: String(person.name).trim(),
    url: absoluteHealthTimesUrl(person.url),
    image: absoluteHealthTimesUrl(person.image),
    description: person.bio || null,
    jobTitle: person.role || null,
    sameAs: Array.isArray(person.sameAs)
      ? person.sameAs.map(absoluteHealthTimesUrl).filter(Boolean)
      : []
  });
}

function articleSchema(article) {
  if (!article || !article.headline || !article.canonicalUrl || !article.datePublished) {
    throw new Error('Article structured data requires headline, canonicalUrl and datePublished.');
  }

  const canonicalUrl = absoluteHealthTimesUrl(article.canonicalUrl);
  if (!canonicalUrl) throw new Error('Article canonicalUrl must be an absolute HTTP(S) URL.');

  const schemaType = article.schemaType === 'Article' ? 'Article' : 'NewsArticle';
  const author = personSchema(article.author);
  const images = (Array.isArray(article.images) ? article.images : [article.image])
    .map(absoluteHealthTimesUrl)
    .filter(Boolean);

  return compactObject({
    '@type': schemaType,
    '@id': `${canonicalUrl}#article`,
    headline: article.headline,
    description: article.description || null,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author,
    publisher: { '@id': ORGANIZATION_ID },
    image: images,
    articleSection: article.articleSection || null,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  });
}

function breadcrumbSchema(items) {
  if (!Array.isArray(items) || items.length < 2) {
    throw new Error('BreadcrumbList requires at least two real breadcrumb items.');
  }

  const itemListElement = items.map((item, index) => {
    if (!item?.name || !absoluteHealthTimesUrl(item.url)) {
      throw new Error(`Breadcrumb item ${index + 1} requires name and valid URL.`);
    }
    return {
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteHealthTimesUrl(item.url)
    };
  });

  return {
    '@type': 'BreadcrumbList',
    itemListElement
  };
}

function buildArticleGraph(article, breadcrumbs) {
  const graph = [organizationSchema(), articleSchema(article)];
  const author = personSchema(article.author);
  if (author) graph.push(author);
  if (breadcrumbs) graph.push(breadcrumbSchema(breadcrumbs));
  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

module.exports = {
  SITE_URL,
  ORGANIZATION_ID,
  absoluteHealthTimesUrl,
  organizationSchema,
  personSchema,
  articleSchema,
  breadcrumbSchema,
  buildArticleGraph
};
