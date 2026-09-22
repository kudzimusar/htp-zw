const crypto = require('crypto');

const SHORTCODE_PATTERN = /\[([a-zA-Z0-9_-]+)(?:\s[^\]]*)?\](?:[\s\S]*?\[\/\1\])?/g;

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugFromLink(link) {
  try {
    const url = new URL(link);
    return url.pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';
  } catch {
    return '';
  }
}

function detectShortcodes(html) {
  const found = [];
  const input = String(html || '');
  for (const match of input.matchAll(SHORTCODE_PATTERN)) {
    found.push({ shortcode: match[1], raw: match[0].slice(0, 500) });
  }
  return found;
}

function extractImages(html) {
  const images = [];
  const input = String(html || '');
  const imgPattern = /<img\b[^>]*>/gi;
  for (const match of input.matchAll(imgPattern)) {
    const tag = match[0];
    const attr = name => {
      const m = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
      return m ? m[1] : '';
    };
    images.push({
      src: attr('src'),
      alt: attr('alt'),
      title: attr('title'),
      sourceTagHash: stableHash(tag)
    });
  }
  return images;
}

function normalizeWpPost(post, context = {}) {
  const content = post.content?.rendered || post.content || '';
  const title = stripHtml(post.title?.rendered || post.title || '');
  const excerpt = stripHtml(post.excerpt?.rendered || post.excerpt || '');
  const sourceUrl = post.link || post.guid?.rendered || '';
  const legacyPath = sourceUrl ? new URL(sourceUrl).pathname : `/${post.slug || slugFromLink(sourceUrl)}/`;
  const shortcodes = detectShortcodes(content);
  const images = extractImages(content);
  const unknownFields = Object.keys(post).filter(key => ![
    'id','date','date_gmt','guid','modified','modified_gmt','slug','status','type','link',
    'title','content','excerpt','author','featured_media','comment_status','ping_status',
    'sticky','template','format','meta','categories','tags','_links','yoast_head','yoast_head_json'
  ].includes(key));

  return {
    source: {
      system: 'wordpress',
      siteUrl: context.siteUrl || 'https://healthtimes.co.zw',
      type: post.type || 'post',
      id: String(post.id),
      stableKey: `wordpress:${post.type || 'post'}:${post.id}`,
      sourceUrl,
      legacyPath,
      checksum: stableHash(JSON.stringify(post))
    },
    story: {
      title,
      slug: post.slug || slugFromLink(sourceUrl),
      status: post.status || 'publish',
      excerpt,
      html: content,
      authorSourceId: post.author ? String(post.author) : '',
      categorySourceIds: (post.categories || []).map(String),
      tagSourceIds: (post.tags || []).map(String),
      featuredMediaSourceId: post.featured_media ? String(post.featured_media) : '',
      publishedAt: post.date_gmt || post.date || null,
      modifiedAt: post.modified_gmt || post.modified || null,
      seo: {
        title: post.yoast_head_json?.title || '',
        description: post.yoast_head_json?.description || '',
        canonical: post.yoast_head_json?.canonical || sourceUrl
      }
    },
    mediaReferences: images,
    exceptions: [
      ...shortcodes.map(item => ({ severity: 'review', type: 'shortcode', detail: item })),
      ...unknownFields.map(field => ({ severity: 'review', type: 'unknown_field', detail: { field } }))
    ]
  };
}

function normalizeWpMedia(media, context = {}) {
  const sourceUrl = media.source_url || media.guid?.rendered || '';
  return {
    source: {
      system: 'wordpress',
      siteUrl: context.siteUrl || 'https://healthtimes.co.zw',
      type: 'media',
      id: String(media.id),
      stableKey: `wordpress:media:${media.id}`,
      sourceUrl,
      checksum: stableHash(JSON.stringify(media))
    },
    media: {
      filename: sourceUrl.split('/').pop() || media.slug || `media-${media.id}`,
      mimeType: media.mime_type || '',
      altText: media.alt_text || '',
      caption: stripHtml(media.caption?.rendered || ''),
      credit: media.media_details?.image_meta?.credit || '',
      width: media.media_details?.width || null,
      height: media.media_details?.height || null,
      uploadedAt: media.date_gmt || media.date || null,
      modifiedAt: media.modified_gmt || media.modified || null
    },
    exceptions: []
  };
}

module.exports = {
  detectShortcodes,
  extractImages,
  normalizeWpMedia,
  normalizeWpPost,
  stableHash,
  stripHtml
};
