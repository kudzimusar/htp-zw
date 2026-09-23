'use strict';

/**
 * AG-05 Phase 3 presentation-neutral capability recovery.
 *
 * Provenance: accepted CP5 runtime 0ba7240d018efa2472a00f56453e9aa8be34e1c5,
 * principally lib/ag05-public-runtime.js and analytics.js.
 *
 * This module deliberately contains no HealthTimes page/header/archive renderer.
 * Phase 4 owns product presentation through apps/mobile.
 */

const SITE_URL = 'https://healthtimes.co.zw/';
const ORG_ID = SITE_URL + '#organization';
const CAPABILITY_VERSION = 'cp5-phase3-v1';
const FEED_LIMIT = 50;

const ANALYTICS_CONTINUITY = Object.freeze({
  eventVersion: '2026-09-09',
  googleTagId: 'GT-PLTTGPL',
  ga4MeasurementId: 'G-S39LN2KX4X',
  ga4AccountId: '137814020',
  ga4PropertyId: '359235319',
  ga4WebStreamId: '4756168788'
});

function stripTags(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeHtml(value) {
  return String(value ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/\bjavascript\s*:/gi, '');
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[ch]));
}

function cdata(value) {
  return String(value ?? '').replace(/]]>/g, ']]]]><![CDATA[>');
}

function normalizePath(value) {
  let path = String(value || '/').trim();
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/\/{2,}/g, '/');
  return path || '/';
}

function storageUrl(supabaseUrl, objectName) {
  if (!supabaseUrl || !objectName) return null;
  const base = String(supabaseUrl).replace(/\/$/, '');
  const key = String(objectName).split('/').map(encodeURIComponent).join('/');
  return base + '/storage/v1/object/public/migrated-media/' + key;
}

function resolvedImage(doc, supabaseUrl) {
  if (doc?.featured_storage_object) {
    return storageUrl(supabaseUrl, doc.featured_storage_object);
  }
  if (doc?.open_graph_image && !String(doc.open_graph_image).startsWith('/storage/')) {
    return String(doc.open_graph_image);
  }
  return doc?.featured_source_url ? String(doc.featured_source_url) : null;
}

function structuredGraph(doc, image) {
  const canonical = String(doc?.canonical_url || doc?.source_url || SITE_URL);
  const title = String(doc?.story_title || doc?.title || 'HealthTimes');
  const author = doc?.author?.name ? {
    '@type': 'Person',
    '@id': SITE_URL + 'author/' + encodeURIComponent(doc.author.slug || doc.author.name) + '/#person',
    name: doc.author.name,
    ...(doc.author.bio ? { description: doc.author.bio } : {})
  } : null;

  const article = {
    '@type': doc?.schema_type === 'Article' ? 'Article' : 'NewsArticle',
    '@id': canonical + '#article',
    headline: title,
    ...(doc?.description ? { description: doc.description } : {}),
    ...(doc?.published_at ? { datePublished: doc.published_at } : {}),
    ...(doc?.modified_at ? { dateModified: doc.modified_at } : {}),
    ...(author ? { author: { '@id': author['@id'] } } : {}),
    publisher: { '@id': ORG_ID },
    ...(image ? { image: [image] } : {}),
    ...(doc?.section?.name ? { articleSection: stripTags(doc.section.name) } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
  };

  const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }];
  if (doc?.section?.name && doc?.section?.slug) {
    crumbs.push({
      '@type': 'ListItem',
      position: crumbs.length + 1,
      name: stripTags(doc.section.name),
      item: SITE_URL + 'category/' + encodeURIComponent(doc.section.slug) + '/'
    });
  }
  crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: title, item: canonical });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': ORG_ID, name: 'HealthTimes', url: SITE_URL },
      article,
      ...(author ? [author] : []),
      { '@type': 'BreadcrumbList', itemListElement: crumbs }
    ]
  };
}

function contextStructuredGraph(doc) {
  const name = stripTags(doc?.name || doc?.slug || 'Archive');
  const canonical = String(
    doc?.canonical_url || (SITE_URL + normalizePath(doc?.path || '/').replace(/^\//, ''))
  );
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': ORG_ID, name: 'HealthTimes', url: SITE_URL },
      {
        '@type': 'CollectionPage',
        '@id': canonical + '#collection',
        name,
        url: canonical,
        isPartOf: { '@id': SITE_URL }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name, item: canonical }
        ]
      }
    ]
  };
}

function routeDecision(resolution) {
  const status = Number(resolution?.http_status || 404);
  const resolutionName = String(resolution?.resolution || 'explicit_404_exception');

  if (status === 301 && resolution?.target_path) {
    const targetPath = normalizePath(resolution.target_path);
    if (targetPath === '/') {
      return {
        httpStatus: 404,
        resolution: 'invalid_homepage_catchall',
        targetPath: null
      };
    }
    return {
      httpStatus: 301,
      resolution: resolutionName,
      targetPath
    };
  }

  if (status === 200 && resolutionName !== 'explicit_404_exception') {
    return {
      httpStatus: 200,
      resolution: resolutionName,
      targetPath: null
    };
  }

  return {
    httpStatus: 404,
    resolution: resolutionName === 'explicit_404_exception'
      ? resolutionName
      : 'explicit_404_exception',
    targetPath: null
  };
}

function buildStoryCapability(doc, { supabaseUrl = '' } = {}) {
  if (!doc) return null;

  const title = String(doc.title || doc.story_title || 'HealthTimes');
  const storyTitle = String(doc.story_title || title);
  const description = stripTags(doc.description || doc.standfirst || doc.excerpt || '').slice(0, 320);
  const canonicalUrl = String(doc.canonical_url || doc.source_url || SITE_URL);
  const robots = String(doc.robots || 'index,follow,max-image-preview:large');
  const image = resolvedImage(doc, supabaseUrl);
  const accessPolicy = String(doc.access_policy || '').toLowerCase();
  const bodyProtected = accessPolicy !== 'public';
  const bodyHtml = bodyProtected ? null : sanitizeHtml(doc.body_html || '');
  const preview = stripTags(doc.standfirst || doc.excerpt || doc.description || '');

  return {
    capabilityVersion: CAPABILITY_VERSION,
    kind: 'story',
    routing: {
      sourceId: doc.source_id == null ? null : String(doc.source_id),
      sourceType: doc.source_type || null,
      sourceUrl: doc.source_url || null,
      handling: doc.handling || null,
      canonicalUrl,
      httpStatus: Number(doc.http_status || 200)
    },
    seo: {
      title,
      description,
      canonicalUrl,
      robots,
      openGraph: {
        type: 'article',
        siteName: 'HealthTimes',
        title: String(doc.open_graph_title || title),
        description: stripTags(doc.open_graph_description || description),
        url: canonicalUrl,
        image
      },
      twitterCard: image ? 'summary_large_image' : 'summary',
      structuredData: structuredGraph(doc, image)
    },
    content: {
      storyTitle,
      standfirst: doc.standfirst || null,
      excerpt: doc.excerpt || null,
      publishedAt: doc.published_at || null,
      modifiedAt: doc.modified_at || null,
      author: doc.author || null,
      section: doc.section || null,
      accessPolicy: doc.access_policy || null,
      bodyProtected,
      bodyHtml,
      protectedPreview: bodyProtected ? preview : null,
      featuredMedia: image ? {
        publicUrl: image,
        sourceUrl: doc.featured_source_url || null,
        storageObject: doc.featured_storage_object || null,
        altText: doc.featured_alt_text || null
      } : null
    }
  };
}

function buildContextCapability(doc) {
  if (!doc) return null;
  const name = stripTags(doc.name || doc.slug || 'Archive');
  const canonicalUrl = String(
    doc.canonical_url || (SITE_URL + normalizePath(doc.path || '/').replace(/^\//, ''))
  );

  return {
    capabilityVersion: CAPABILITY_VERSION,
    kind: 'context',
    contextKind: doc.kind || null,
    slug: doc.slug || null,
    name,
    path: normalizePath(doc.path || '/'),
    routingDisposition: doc.routing_disposition || null,
    seo: {
      title: name + ' — HealthTimes',
      canonicalUrl,
      robots: doc.robots || 'noindex,follow',
      openGraph: {
        type: 'website',
        siteName: 'HealthTimes',
        title: name + ' — HealthTimes',
        url: canonicalUrl
      },
      twitterCard: 'summary',
      structuredData: contextStructuredGraph(doc)
    },
    items: Array.isArray(doc.items) ? doc.items : []
  };
}

function renderSitemapRows(rows) {
  const urls = (rows || []).map(row => {
    const lastmod = row.modified_at
      ? '<lastmod>' + xmlEscape(String(row.modified_at).slice(0, 10)) + '</lastmod>'
      : '';
    return '  <url><loc>' + xmlEscape(row.canonical_url) + '</loc>' + lastmod + '</url>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls + '\n</urlset>\n';
}

function renderFeed(rows) {
  const items = (rows || []).map(row => {
    const published = row.published_at
      ? '<pubDate>' + xmlEscape(new Date(row.published_at).toUTCString()) + '</pubDate>'
      : '';
    const author = row.author_name
      ? '<dc:creator><![CDATA[' + cdata(row.author_name) + ']]></dc:creator>'
      : '';
    const description = row.description
      ? '<description><![CDATA[' + cdata(row.description) + ']]></description>'
      : '';
    return '<item><title>' + xmlEscape(row.title) + '</title>' +
      '<link>' + xmlEscape(row.canonical_url) + '</link>' +
      '<guid isPermaLink="true">' + xmlEscape(row.canonical_url) + '</guid>' +
      published + author + description + '</item>';
  }).join('');

  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    '<channel><title>HealthTimes</title><link>' + SITE_URL + '</link>' +
    '<description>HealthTimes health and science journalism</description>' +
    items + '</channel></rss>';
}

function state(value) {
  const normalized = String(value || 'UNKNOWN').trim().toUpperCase();
  return normalized || 'UNKNOWN';
}

function provenValue(stateValue, value) {
  return state(stateValue) === 'KNOWN' && value != null && String(value).trim()
    ? value
    : null;
}

function buildHospazCapability(ad, { supabaseUrl = '' } = {}) {
  if (!ad) return null;

  const creativeUrl = ad.current_storage_object
    ? storageUrl(supabaseUrl, ad.current_storage_object)
    : (ad.current_source_url || null);

  const destinationState = state(ad.destination_url_state);
  const scheduleState = state(ad.schedule_state);
  const placementConditionsState = state(ad.placement_conditions_state);

  return {
    capabilityVersion: CAPABILITY_VERSION,
    kind: 'direct-ad',
    advertiser: ad.advertiser || 'HOSPAZ',
    placementKey: ad.placement_key || null,
    creativeUrl,
    provenance: {
      currentSourceAttachmentId: ad.current_source_attachment_id == null
        ? null
        : String(ad.current_source_attachment_id),
      currentSourceUrl: ad.current_source_url || null,
      currentStorageObject: ad.current_storage_object || null,
      checksumSha256: ad.checksum_sha256 || null,
      sourceTemplateId: ad.source_template_id == null ? null : String(ad.source_template_id)
    },
    destination: {
      state: destinationState,
      url: provenValue(destinationState, ad.destination_url)
    },
    schedule: {
      state: scheduleState,
      value: provenValue(scheduleState, ad.schedule)
    },
    placementConditions: {
      state: placementConditionsState,
      value: provenValue(placementConditionsState, ad.placement_conditions)
    },
    failClosed: {
      clickTargetInvented: false,
      scheduleInvented: false,
      placementConditionsInvented: false
    }
  };
}

module.exports = {
  SITE_URL,
  ORG_ID,
  CAPABILITY_VERSION,
  FEED_LIMIT,
  ANALYTICS_CONTINUITY,
  stripTags,
  sanitizeHtml,
  normalizePath,
  storageUrl,
  resolvedImage,
  structuredGraph,
  contextStructuredGraph,
  routeDecision,
  buildStoryCapability,
  buildContextCapability,
  renderSitemapRows,
  renderFeed,
  buildHospazCapability
};
