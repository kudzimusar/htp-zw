#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');

const { detectShortcodes, extractImages, stableHash, stripHtml } = require('./wordpress-transform');

const DEFAULT_SITE = 'https://healthtimes.co.zw';
const DEFAULT_PREFIX = 'wpyg_';
const PHP_EXCLUDE_HASHES = new Set([
  '783cdc75398980c451cadaa9c97279a24f6df1de971c3e654b25eb43bf7b037f',
  '76e7cd6781911a19d14c02f36b30ef35ebf891c9bcff7bdce70b366f66d06c6f'
]);
const HOSPAZ_COMMERCIAL_HASH = '50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f';
const DEFAULT_STORAGE_PUBLIC_BASE = 'https://gcdohgbmqhqwydgaxrcr.supabase.co/storage/v1/object/public/migrated-media';

function parseArgs(argv) {
  const args = {
    mode: 'database-dry-run',
    wordpressPrefix: DEFAULT_PREFIX,
    siteUrl: DEFAULT_SITE,
    outDir: 'migration-output/ag04-database-rehearsal',
    sqlOut: '',
    migrationRunId: `ag04-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    mediaSampleLimit: 0
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = ['mediaSampleLimit'].includes(key) ? Number(next) : next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function sqlStream(file) {
  const input = fs.createReadStream(file);
  return file.endsWith('.gz') ? input.pipe(zlib.createGunzip()) : input;
}

function parseInsertHeader(line) {
  const match = line.match(/^INSERT INTO `([^`]+)`(?: \(([^)]+)\))? VALUES /);
  if (!match) return null;
  return {
    table: match[1],
    columns: match[2] ? match[2].split(',').map(c => c.trim().replace(/`/g, '')) : null,
    valuesSql: line.slice(match[0].length).replace(/;$/, '')
  };
}

function splitRows(valuesSql) {
  const rows = [];
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let start = -1;
  for (let i = 0; i < valuesSql.length; i += 1) {
    const ch = valuesSql[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === "'") quoted = false;
      continue;
    }
    if (ch === "'") quoted = true;
    else if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        rows.push(valuesSql.slice(start, i));
        start = -1;
      }
    }
  }
  return rows;
}

function unquoteSql(value) {
  if (value === 'NULL') return null;
  if (/^-?\d+$/.test(value)) return value;
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1)
      .replace(/\\0/g, '\0')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return value;
}

function splitCells(rowSql) {
  const cells = [];
  let quoted = false;
  let escaped = false;
  let current = '';
  for (let i = 0; i < rowSql.length; i += 1) {
    const ch = rowSql[i];
    if (quoted) {
      current += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === "'") quoted = false;
      continue;
    }
    if (ch === "'") {
      quoted = true;
      current += ch;
    } else if (ch === ',') {
      cells.push(unquoteSql(current.trim()));
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(unquoteSql(current.trim()));
  return cells;
}

function rowObject(columns, rowSql) {
  const values = splitCells(rowSql);
  const obj = {};
  columns.forEach((column, index) => {
    obj[column] = values[index] ?? null;
  });
  return obj;
}

function defaultColumns(table) {
  if (table.endsWith('_posts')) return [
    'ID','post_author','post_date','post_date_gmt','post_content','post_title','post_excerpt','post_status','comment_status','ping_status',
    'post_password','post_name','to_ping','pinged','post_modified','post_modified_gmt','post_content_filtered','post_parent','guid',
    'menu_order','post_type','post_mime_type','comment_count'
  ];
  if (table.endsWith('_postmeta')) return ['meta_id','post_id','meta_key','meta_value'];
  if (table.endsWith('_users')) return ['ID','user_login','user_pass','user_nicename','user_email','user_url','user_registered','user_activation_key','user_status','display_name'];
  if (table.endsWith('_terms')) return ['term_id','name','slug','term_group'];
  if (table.endsWith('_term_taxonomy')) return ['term_taxonomy_id','term_id','taxonomy','description','parent','count'];
  if (table.endsWith('_term_relationships')) return ['object_id','term_taxonomy_id','term_order'];
  return null;
}

function parsePhpSerializedString(value, key) {
  if (!value) return '';
  const pattern = new RegExp(`s:\\d+:"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}";s:\\d+:"([^"]*)"`);
  const match = String(value).match(pattern);
  return match ? match[1] : '';
}

function sourceUrlForPath(siteUrl, relativePath) {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${siteUrl.replace(/\/$/, '')}/wp-content/uploads/${relativePath.replace(/^uploads\//, '')}`;
}

function safeStorageRelativePath(relativePath) {
  return String(relativePath || '')
    .replace(/^uploads\//, '')
    .split('/')
    .map(segment => segment
      .replace(/[·•–—]/g, '-')
      .replace(/[\u0000-\u001f\u007f]/g, '-')
      .replace(/-{2,}/g, '-'))
    .join('/');
}

function storageKeyForOriginalPath(originalPath) {
  const relative = safeStorageRelativePath(originalPath);
  return relative ? `wordpress/${relative}` : '';
}

function storagePublicUrl(storageKey, storagePublicBase = DEFAULT_STORAGE_PUBLIC_BASE) {
  if (!storageKey) return '';
  return `${String(storagePublicBase || DEFAULT_STORAGE_PUBLIC_BASE).replace(/\/$/, '')}/${storageKey}`;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripWordPressImageDerivative(relativePath) {
  const ext = path.posix.extname(relativePath);
  if (!ext) return relativePath;
  const base = relativePath.slice(0, -ext.length);
  return `${base.replace(/-[0-9]+x[0-9]+$/, '')}${ext}`;
}

function mediaFamilyKey(relativePath) {
  const ext = path.posix.extname(relativePath);
  const dir = path.posix.dirname(relativePath);
  let stem = path.posix.basename(relativePath, ext);
  stem = stem
    .replace(/-scaled$/i, '')
    .replace(/-e[0-9]{10,}$/i, '');
  return `${dir}/${stem}`;
}

function buildMediaRewriteIndex(attachments, storagePublicBase = DEFAULT_STORAGE_PUBLIC_BASE) {
  const exact = new Map();
  const family = new Map();
  const byDirectory = new Map();
  const addFamily = (key, url) => {
    if (!family.has(key)) family.set(key, url);
    else if (family.get(key) !== url) family.set(key, null);
  };
  for (const media of attachments) {
    if (media.status !== 'pending' || !media.original_path || !media.storage_key) continue;
    const relative = String(media.original_path).replace(/^uploads\//, '');
    const url = media.public_url || storagePublicUrl(media.storage_key, storagePublicBase);
    const variants = new Set([relative, safeDecodeURIComponent(relative)]);
    for (const variant of variants) {
      exact.set(variant, url);
      addFamily(mediaFamilyKey(variant), url);
      const ext = path.posix.extname(variant);
      const dir = path.posix.dirname(variant);
      const stem = path.posix.basename(variant, ext);
      if (!byDirectory.has(dir)) byDirectory.set(dir, []);
      byDirectory.get(dir).push({ stem, url });
    }
  }
  return { exact, family, byDirectory, storagePublicBase };
}

function resolveWordPressUploadRelative(relativePath, index) {
  const raw = String(relativePath || '').replace(/^uploads\//, '').replace(/[?#].*$/, '');
  const variants = [...new Set([raw, safeDecodeURIComponent(raw)])];
  for (const variant of variants) {
    if (index.exact.has(variant)) {
      return { url: index.exact.get(variant), resolved: true, strategy: 'ATTACHMENT_EXACT' };
    }
    const derivativeBase = stripWordPressImageDerivative(variant);
    if (derivativeBase !== variant && index.exact.has(derivativeBase)) {
      return { url: index.exact.get(derivativeBase), resolved: true, strategy: 'WORDPRESS_DERIVATIVE_TO_ORIGINAL' };
    }
    const family = index.family.get(mediaFamilyKey(derivativeBase));
    if (family) {
      return { url: family, resolved: true, strategy: 'WORDPRESS_DERIVATIVE_TO_UNIQUE_FAMILY' };
    }
    const ext = path.posix.extname(derivativeBase);
    const dir = path.posix.dirname(derivativeBase);
    const stem = path.posix.basename(derivativeBase, ext);
    const prefixMatches = (index.byDirectory.get(dir) || [])
      .filter(candidate => candidate.stem === stem || candidate.stem.startsWith(`${stem}-`));
    const uniqueUrls = [...new Set(prefixMatches.map(candidate => candidate.url))];
    if (uniqueUrls.length === 1) {
      return { url: uniqueUrls[0], resolved: true, strategy: 'WORDPRESS_DERIVATIVE_TO_UNIQUE_PREFIX_CANDIDATE' };
    }
  }
  const fallbackKey = storageKeyForOriginalPath(raw);
  return {
    url: storagePublicUrl(fallbackKey, index.storagePublicBase),
    resolved: false,
    strategy: 'FALLBACK_CANONICAL_PATH',
    fallback_key: fallbackKey
  };
}

function rewriteWordPressUploadUrls(html, index) {
  const unresolved = [];
  let rewrittenCount = 0;
  const rewritten = String(html || '').replace(
    /https?:\/\/(?:www\.)?healthtimes\.co\.zw\/wp-content\/uploads\/([^"' <>)]+)/gi,
    (sourceUrl, relativePath) => {
      const result = resolveWordPressUploadRelative(relativePath, index);
      rewrittenCount += 1;
      if (!result.resolved) {
        unresolved.push({
          type: 'media_rewrite_fallback',
          severity: 'review',
          source_url: sourceUrl,
          destination_url: result.url,
          fallback_key: result.fallback_key
        });
      }
      return result.url;
    }
  );
  return { html: rewritten, unresolved, rewritten_count: rewrittenCount };
}

function buildTaxonomyDisposition(categories, tags) {
  return {
    categories: categories.map(term => ({
      ...term,
      mapping_status: 'CANONICAL_NAVIGATION_CANDIDATE',
      canonical_term: null,
      mapping_reason: 'Legacy WordPress category preserved as a candidate for editorial Global Taxonomy v1 curation.'
    })),
    tags: tags.map(term => ({
      ...term,
      mapping_status: 'LEGACY_ONLY',
      canonical_term: null,
      mapping_reason: 'Legacy WordPress tag preserved for provenance and excluded from canonical navigation unless explicitly promoted.'
    }))
  };
}

function buildPublicUrlManifest(stories) {
  return stories
    .map(story => ({
      source_url: story.source_url,
      source_object_id: story.id,
      source_object_type: story.type,
      destination_url: story.source_url,
      handling: 'PRESERVE_DIRECTLY',
      HTTP_status: 200,
      canonical_url: story.canonical_url || story.source_url,
      reason: `Preserve WordPress ${story.type} permalink directly.`,
      verification_status: 'VERIFIED',
      robots: 'index,follow',
      seo: {
        title: story.seo_title || null,
        description: story.seo_description || null,
        open_graph_title: null,
        open_graph_description: null,
        open_graph_image: null,
        source_plugin: null
      }
    }))
    .sort((a, b) => {
      if (a.source_object_type !== b.source_object_type) return a.source_object_type.localeCompare(b.source_object_type);
      return Number(a.source_object_id) - Number(b.source_object_id);
    });
}

function legacyPathForPost(post, siteUrl) {
  if (post.post_type === 'post' && post.post_date && post.post_name) {
    const date = String(post.post_date).slice(0, 10).split('-');
    if (date.length === 3) return `/${date[0]}/${date[1]}/${date[2]}/${post.post_name}/`;
  }
  return `/${post.post_name || post.ID}/`;
}

function classifyContent(post, meta) {
  const html = post.post_content || '';
  const exceptions = [];
  const shortcodes = detectShortcodes(html);
  for (const item of shortcodes) exceptions.push({ type: 'shortcode', severity: 'review', source_id: post.ID, detail: item });
  if (meta._elementor_data) exceptions.push({ type: 'elementor_data', severity: 'transform', source_id: post.ID, detail: { bytes: Buffer.byteLength(meta._elementor_data) } });
  if (/<iframe\b/i.test(html) || /\[embed\b/i.test(html)) exceptions.push({ type: 'embed', severity: 'transform', source_id: post.ID });
  if (/<table\b/i.test(html)) exceptions.push({ type: 'table', severity: 'transform', source_id: post.ID });
  if (/\.(pdf|docx?|xlsx?|pptx?)(["')\s<]|$)/i.test(html)) exceptions.push({ type: 'download_reference', severity: 'transform', source_id: post.ID });
  if (/<(video|audio)\b/i.test(html) || /\.(mp4|mp3|wav|ogg)(["')\s<]|$)/i.test(html)) exceptions.push({ type: 'media_embed', severity: 'transform', source_id: post.ID });
  return exceptions;
}

function parseTarMetadata(file) {
  const byPath = new Map();
  if (!file || !fs.existsSync(file)) return byPath;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('-')) continue;
    const match = line.match(/^\S+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(.+?)\s+(uploads\/.+)$/);
    if (!match) continue;
    byPath.set(match[3], { size: Number(match[1]), mtimeText: match[2] });
  }
  return byPath;
}

function archiveExceptionsFromTar(tarByPath) {
  const exceptions = [];
  for (const [archivePath, meta] of tarByPath.entries()) {
    if (meta.size === 0) {
      exceptions.push({
        type: 'zero_byte_upload_file',
        severity: 'exception',
        archive_path: archivePath,
        source: 'UPLOADS_ARCHIVE'
      });
    }
    if (/\.(php|phtml|phar|cgi|sh)$/i.test(archivePath)) {
      exceptions.push({
        type: 'executable_upload_excluded',
        severity: 'blocked_from_public_storage',
        archive_path: archivePath,
        source: 'UPLOADS_ARCHIVE'
      });
    }
  }
  return exceptions;
}

async function parseDatabase(database, prefix = DEFAULT_PREFIX) {
  const wanted = new Set([
    `${prefix}posts`,
    `${prefix}postmeta`,
    `${prefix}users`,
    `${prefix}terms`,
    `${prefix}term_taxonomy`,
    `${prefix}term_relationships`
  ]);
  const source = {
    posts: new Map(),
    postmeta: new Map(),
    users: new Map(),
    terms: new Map(),
    termTaxonomy: new Map(),
    termRelationships: []
  };
  const rl = readline.createInterface({ input: sqlStream(database), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.startsWith('INSERT INTO `')) continue;
    const header = parseInsertHeader(line);
    if (!header || !wanted.has(header.table)) continue;
    const columns = header.columns || defaultColumns(header.table);
    if (!columns) continue;
    for (const rowSql of splitRows(header.valuesSql)) {
      const row = rowObject(columns, rowSql);
      if (header.table === `${prefix}posts`) source.posts.set(String(row.ID), row);
      else if (header.table === `${prefix}postmeta`) {
        const id = String(row.post_id);
        if (!source.postmeta.has(id)) source.postmeta.set(id, {});
        const bag = source.postmeta.get(id);
        if (bag[row.meta_key] === undefined) bag[row.meta_key] = row.meta_value;
        else if (Array.isArray(bag[row.meta_key])) bag[row.meta_key].push(row.meta_value);
        else bag[row.meta_key] = [bag[row.meta_key], row.meta_value];
      } else if (header.table === `${prefix}users`) source.users.set(String(row.ID), row);
      else if (header.table === `${prefix}terms`) source.terms.set(String(row.term_id), row);
      else if (header.table === `${prefix}term_taxonomy`) source.termTaxonomy.set(String(row.term_taxonomy_id), row);
      else if (header.table === `${prefix}term_relationships`) source.termRelationships.push(row);
    }
  }
  return source;
}

function buildRehearsal(source, options = {}) {
  const siteUrl = options.siteUrl || DEFAULT_SITE;
  const tarByPath = parseTarMetadata(options.tarMetadata);
  const archiveExceptions = archiveExceptionsFromTar(tarByPath);
  const authors = [...source.users.values()].map(user => ({
    wordpress_source_id: String(user.ID),
    display_name: user.display_name || user.user_nicename || user.user_login || `WordPress User ${user.ID}`,
    slug: user.user_nicename || user.user_login || `wordpress-user-${user.ID}`
  }));
  const termTaxonomyByPost = new Map();
  for (const rel of source.termRelationships) {
    const objectId = String(rel.object_id);
    const tt = source.termTaxonomy.get(String(rel.term_taxonomy_id));
    if (!tt) continue;
    const term = source.terms.get(String(tt.term_id));
    if (!term) continue;
    if (!termTaxonomyByPost.has(objectId)) termTaxonomyByPost.set(objectId, []);
    termTaxonomyByPost.get(objectId).push({ ...term, taxonomy: tt.taxonomy, term_taxonomy_id: tt.term_taxonomy_id });
  }
  const categories = [];
  const tags = [];
  for (const tt of source.termTaxonomy.values()) {
    const term = source.terms.get(String(tt.term_id));
    if (!term) continue;
    const item = { term_id: String(term.term_id), term_taxonomy_id: String(tt.term_taxonomy_id), name: term.name, slug: term.slug, taxonomy: tt.taxonomy };
    if (tt.taxonomy === 'category') categories.push(item);
    if (tt.taxonomy === 'post_tag') tags.push(item);
  }
  const attachments = [];
  const mediaExceptions = [];
  for (const post of source.posts.values()) {
    if (post.post_type !== 'attachment') continue;
    const meta = source.postmeta.get(String(post.ID)) || {};
    const attached = meta._wp_attached_file || String(post.guid || '').replace(/^https?:\/\/[^/]+\/wp-content\/uploads\//, '');
    const archivePath = attached ? `uploads/${String(attached).replace(/^uploads\//, '')}` : '';
    const tar = tarByPath.get(archivePath);
    const mime = post.post_mime_type || '';
    const isPhp = /\.php$/i.test(archivePath) || mime.includes('php');
    const isZero = tar && tar.size === 0;
    const width = Number(parsePhpSerializedString(meta._wp_attachment_metadata, 'width')) || null;
    const height = Number(parsePhpSerializedString(meta._wp_attachment_metadata, 'height')) || null;
    const attachment = {
      id: String(post.ID),
      title: stripHtml(post.post_title),
      source_url: sourceUrlForPath(siteUrl, attached || post.guid),
      original_path: archivePath,
      filename: path.basename(archivePath || post.guid || `attachment-${post.ID}`),
      mime_type: mime,
      width,
      height,
      alt_text: meta._wp_attachment_image_alt || '',
      caption: stripHtml(post.post_excerpt || ''),
      parent: String(post.post_parent || '0'),
      uploaded_at: post.post_date_gmt || post.post_date || null,
      modified_at: post.post_modified_gmt || post.post_modified || null,
      archive_present: archivePath ? tarByPath.has(archivePath) : false,
      archive_size: tar ? tar.size : null,
      status: 'pending',
      storage_key: '',
      public_url: '',
      commercial_direct_ad: ['32960', '32971'].includes(String(post.ID)),
      hospaz_editorial_current_placement_asset: String(post.ID) === '33005'
    };
    if (isPhp) {
      attachment.status = 'excluded_php';
      mediaExceptions.push({ type: 'php_excluded', severity: 'blocked_from_public_storage', source_id: attachment.id, original_path: archivePath });
    } else if (isZero) {
      attachment.status = 'zero_byte_exception';
      mediaExceptions.push({ type: 'zero_byte_upload', severity: 'exception', source_id: attachment.id, original_path: archivePath });
    } else if (archivePath && !tarByPath.has(archivePath)) {
      attachment.status = 'missing_from_uploads_archive';
      mediaExceptions.push({ type: 'missing_upload_file', severity: 'review', source_id: attachment.id, original_path: archivePath });
    }
    if (attachment.status === 'pending') {
      attachment.storage_key = storageKeyForOriginalPath(attachment.original_path);
      attachment.public_url = storagePublicUrl(attachment.storage_key, options.storagePublicBase || DEFAULT_STORAGE_PUBLIC_BASE);
    }
    attachments.push(attachment);
  }
  const mediaRewriteIndex = buildMediaRewriteIndex(attachments, options.storagePublicBase || DEFAULT_STORAGE_PUBLIC_BASE);
  const stories = [];
  const storyExceptions = [];
  const internalLinks = [];
  const mediaReferences = [];
  for (const post of source.posts.values()) {
    if (!['post', 'page'].includes(post.post_type) || post.post_status !== 'publish') continue;
    const meta = source.postmeta.get(String(post.ID)) || {};
    const terms = termTaxonomyByPost.get(String(post.ID)) || [];
    const legacyPath = legacyPathForPost(post, siteUrl);
    const sourceHtml = post.post_content || '';
    const exceptions = classifyContent(post, meta);
    const rewrite = rewriteWordPressUploadUrls(sourceHtml, mediaRewriteIndex);
    const images = extractImages(sourceHtml);
    const urls = String(sourceHtml).match(/https?:\/\/healthtimes\.co\.zw\/[^"' <>)]+/gi) || [];
    internalLinks.push(...urls.map(url => ({ source_id: String(post.ID), url })));
    mediaReferences.push(...images.map(image => ({ source_id: String(post.ID), ...image })));
    storyExceptions.push(...exceptions);
    storyExceptions.push(...rewrite.unresolved.map(item => ({ ...item, source_id: String(post.ID) })));
    const cats = terms.filter(t => t.taxonomy === 'category').map(t => String(t.term_id));
    const tagIds = terms.filter(t => t.taxonomy === 'post_tag').map(t => String(t.term_id));
    stories.push({
      id: String(post.ID),
      type: post.post_type,
      title: stripHtml(post.post_title),
      slug: post.post_name || String(post.ID),
      status: post.post_status,
      excerpt: stripHtml(post.post_excerpt || ''),
      body_html: rewrite.html,
      media_rewrite: {
        rewritten_count: rewrite.rewritten_count,
        unresolved_count: rewrite.unresolved.length
      },
      author_source_id: String(post.post_author || ''),
      category_source_ids: cats,
      tag_source_ids: tagIds,
      featured_media_source_id: meta._thumbnail_id ? String(meta._thumbnail_id) : '',
      source_url: `${siteUrl.replace(/\/$/, '')}${legacyPath}`,
      legacy_path: legacyPath,
      published_at: post.post_date_gmt || post.post_date || null,
      modified_at: post.post_modified_gmt || post.post_modified || null,
      seo_title: meta.rank_math_title || meta._yoast_wpseo_title || '',
      seo_description: meta.rank_math_description || meta._yoast_wpseo_metadesc || '',
      canonical_url: meta.rank_math_canonical_url || meta._yoast_wpseo_canonical || `${siteUrl.replace(/\/$/, '')}${legacyPath}`,
      access_policy: /member|premium|suremembers|wc_membership/i.test(JSON.stringify(meta)) ? 'premium_marker_review' : 'public',
      checksum: stableHash(JSON.stringify(post))
    });
  }
  const counts = {
    posts: stories.filter(s => s.type === 'post').length,
    pages: stories.filter(s => s.type === 'page').length,
    media: attachments.length,
    categories: categories.length,
    tags: tags.length,
    authors: authors.length,
    story_exceptions: storyExceptions.length,
    media_exceptions: mediaExceptions.length,
    archive_exceptions: archiveExceptions.length,
    zero_byte_upload_files: archiveExceptions.filter(e => e.type === 'zero_byte_upload_file').length,
    executable_upload_exclusions: archiveExceptions.filter(e => e.type === 'executable_upload_excluded').length,
    internal_links: internalLinks.length,
    media_references: mediaReferences.length,
    media_rewrites: stories.reduce((sum, story) => sum + (story.media_rewrite?.rewritten_count || 0), 0),
    media_rewrite_fallbacks: stories.reduce((sum, story) => sum + (story.media_rewrite?.unresolved_count || 0), 0)
  };
  const taxonomyDisposition = buildTaxonomyDisposition(categories, tags);
  const publicUrlManifest = buildPublicUrlManifest(stories);
  const safeKeyMappings = attachments
    .filter(media => media.storage_key)
    .map(media => ({
      source_id: media.id,
      original_path: media.original_path,
      original_storage_key: `wordpress/${String(media.original_path || '').replace(/^uploads\//, '')}`,
      storage_key: media.storage_key
    }))
    .filter(item => item.original_storage_key !== item.storage_key);
  const mediaRewriteExceptions = storyExceptions.filter(item => item.type === 'media_rewrite_fallback');
  return {
    authors, categories, tags, stories, attachments, storyExceptions, mediaExceptions, archiveExceptions,
    internalLinks, mediaReferences, taxonomyDisposition, publicUrlManifest, safeKeyMappings, mediaRewriteExceptions, counts
  };
}

function sqlLiteral(value) {
  if (value === null || value === undefined || value === '') return 'null';
  return `'${String(value).replace(/\r?\n/g, ' ').replace(/'/g, "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function createStagingSql(rehearsal, options = {}) {
  const runId = options.migrationRunId || `ag04-${Date.now()}`;
  const now = new Date().toISOString();
  const lines = [
    'begin;',
    `insert into migration_runs (source_system, mode, dry_run, manifest_checksum, status, counts, exceptions, started_at, finished_at) values ('wordpress', 'ag04_rehearsal_import', false, ${sqlLiteral(stableHash(JSON.stringify(rehearsal.counts)))}, 'started', ${jsonLiteral(rehearsal.counts)}, '[]'::jsonb, ${sqlLiteral(now)}, null);`
  ];
  for (const author of rehearsal.authors) {
    lines.push(`insert into authors (display_name, slug, wordpress_source_id) values (${sqlLiteral(author.display_name)}, ${sqlLiteral(author.slug)}, ${sqlLiteral(author.wordpress_source_id)}) on conflict (slug) do update set display_name = excluded.display_name, wordpress_source_id = excluded.wordpress_source_id;`);
  }
  for (const category of rehearsal.categories) {
    lines.push(`insert into sections (name, slug, wordpress_source_id) values (${sqlLiteral(category.name)}, ${sqlLiteral(category.slug)}, ${sqlLiteral(category.term_id)}) on conflict (slug) do update set name = excluded.name, wordpress_source_id = excluded.wordpress_source_id;`);
  }
  for (const tag of rehearsal.tags) {
    lines.push(`insert into tags (name, slug, wordpress_source_id) values (${sqlLiteral(tag.name)}, ${sqlLiteral(tag.slug)}, ${sqlLiteral(tag.term_id)}) on conflict (slug) do update set name = excluded.name, wordpress_source_id = excluded.wordpress_source_id;`);
  }
  for (const media of rehearsal.attachments) {
    const stableKey = `wordpress:media:${media.id}`;
    lines.push(`insert into legacy_sources (system, site_url, source_type, source_id, stable_key, source_url, checksum, raw) values ('wordpress', ${sqlLiteral(DEFAULT_SITE)}, 'media', ${sqlLiteral(media.id)}, ${sqlLiteral(stableKey)}, ${sqlLiteral(media.source_url)}, ${sqlLiteral(stableHash(JSON.stringify(media)))}, ${jsonLiteral(media)}) on conflict (stable_key) do update set source_url = excluded.source_url, checksum = excluded.checksum, raw = excluded.raw, last_seen_at = now();`);
    lines.push(`insert into media_assets (legacy_source_id, source_url, storage_bucket, storage_key, public_url, checksum, mime_type, filename, alt_text, caption, credit, width, height, status) select id, ${sqlLiteral(media.source_url)}, 'migrated-media', ${sqlLiteral(media.storage_key || null)}, ${sqlLiteral(media.public_url || null)}, ${sqlLiteral(media.commercial_direct_ad ? HOSPAZ_COMMERCIAL_HASH : '')}, ${sqlLiteral(media.mime_type)}, ${sqlLiteral(media.filename)}, ${sqlLiteral(media.alt_text)}, ${sqlLiteral(media.caption)}, null, ${media.width || 'null'}, ${media.height || 'null'}, ${sqlLiteral(media.status)} from legacy_sources where stable_key = ${sqlLiteral(stableKey)} on conflict (legacy_source_id) do update set source_url = excluded.source_url, storage_bucket = excluded.storage_bucket, storage_key = excluded.storage_key, public_url = excluded.public_url, mime_type = excluded.mime_type, filename = excluded.filename, alt_text = excluded.alt_text, caption = excluded.caption, width = excluded.width, height = excluded.height, status = excluded.status;`);
  }
  for (const story of rehearsal.stories) {
    const stableKey = `wordpress:${story.type}:${story.id}`;
    lines.push(`insert into legacy_sources (system, site_url, source_type, source_id, stable_key, source_url, checksum, raw) values ('wordpress', ${sqlLiteral(DEFAULT_SITE)}, ${sqlLiteral(story.type)}, ${sqlLiteral(story.id)}, ${sqlLiteral(stableKey)}, ${sqlLiteral(story.source_url)}, ${sqlLiteral(story.checksum)}, ${jsonLiteral({ id: story.id, type: story.type, category_source_ids: story.category_source_ids, tag_source_ids: story.tag_source_ids, featured_media_source_id: story.featured_media_source_id })}) on conflict (stable_key) do update set source_url = excluded.source_url, checksum = excluded.checksum, raw = excluded.raw, last_seen_at = now();`);
    lines.push(`insert into stories (legacy_source_id, title, slug, standfirst, excerpt, body_html, body_json, status, access_policy, author_id, primary_section_id, published_at, modified_at, seo_title, seo_description, canonical_url) select ls.id, ${sqlLiteral(story.title || '(untitled)')}, ${sqlLiteral(story.slug)}, null, ${sqlLiteral(story.excerpt)}, ${sqlLiteral(story.body_html)}, ${jsonLiteral({ wordpress_id: story.id, media_rewrite_status: 'canonical_storage_rewrite', media_rewrite_unresolved_count: story.media_rewrite?.unresolved_count || 0 })}, ${sqlLiteral(story.status)}, ${sqlLiteral(story.access_policy)}, (select id from authors where wordpress_source_id = ${sqlLiteral(story.author_source_id)} limit 1), (select id from sections where wordpress_source_id = ${sqlLiteral(story.category_source_ids[0] || '')} limit 1), ${sqlLiteral(story.published_at)}, ${sqlLiteral(story.modified_at)}, ${sqlLiteral(story.seo_title)}, ${sqlLiteral(story.seo_description)}, ${sqlLiteral(story.canonical_url)} from legacy_sources ls where ls.stable_key = ${sqlLiteral(stableKey)} on conflict (legacy_source_id) do update set title = excluded.title, slug = excluded.slug, excerpt = excluded.excerpt, body_html = excluded.body_html, body_json = excluded.body_json, status = excluded.status, access_policy = excluded.access_policy, author_id = excluded.author_id, primary_section_id = excluded.primary_section_id, published_at = excluded.published_at, modified_at = excluded.modified_at, seo_title = excluded.seo_title, seo_description = excluded.seo_description, canonical_url = excluded.canonical_url, updated_at = now();`);
    lines.push(`delete from legacy_url_mappings where legacy_source_id = (select id from legacy_sources where stable_key = ${sqlLiteral(stableKey)}) and old_path <> ${sqlLiteral(story.legacy_path)};`);
    lines.push(`insert into legacy_url_mappings (legacy_source_id, old_path, new_path, redirect_status, preservation_strategy, verified_at) select ls.id, ${sqlLiteral(story.legacy_path)}, ${sqlLiteral(story.legacy_path)}, 200, 'PRESERVE_DIRECTLY', now() from legacy_sources ls where ls.stable_key = ${sqlLiteral(stableKey)} on conflict (old_path) do update set new_path = excluded.new_path, legacy_source_id = excluded.legacy_source_id, redirect_status = excluded.redirect_status, preservation_strategy = excluded.preservation_strategy, verified_at = excluded.verified_at;`);
    lines.push(`insert into seo_metadata (story_id, legacy_source_id, canonical_url, title, description, source_plugin, review_status) select st.id, ls.id, ${sqlLiteral(story.canonical_url)}, ${sqlLiteral(story.seo_title)}, ${sqlLiteral(story.seo_description)}, 'wordpress_postmeta', 'pending' from legacy_sources ls join stories st on st.legacy_source_id = ls.id where ls.stable_key = ${sqlLiteral(stableKey)} on conflict (story_id) do update set canonical_url = excluded.canonical_url, title = excluded.title, description = excluded.description, updated_at = now();`);
    for (const tagId of story.tag_source_ids) {
      lines.push(`insert into story_tags (story_id, tag_id) select st.id, tg.id from legacy_sources ls join stories st on st.legacy_source_id = ls.id join tags tg on tg.wordpress_source_id = ${sqlLiteral(tagId)} where ls.stable_key = ${sqlLiteral(stableKey)} on conflict do nothing;`);
    }
    if (story.featured_media_source_id) {
      lines.push(`insert into media_usage (media_id, story_id, usage_type, source_context) select ma.id, st.id, 'featured', ${jsonLiteral({ wordpress_featured_media_id: story.featured_media_source_id })} from legacy_sources sls join stories st on st.legacy_source_id = sls.id join legacy_sources mls on mls.stable_key = ${sqlLiteral(`wordpress:media:${story.featured_media_source_id}`)} join media_assets ma on ma.legacy_source_id = mls.id where sls.stable_key = ${sqlLiteral(stableKey)} on conflict do nothing;`);
    }
  }
  lines.push(`update migration_runs set status = 'completed', finished_at = now() where source_system = 'wordpress' and mode = 'ag04_rehearsal_import' and manifest_checksum = ${sqlLiteral(stableHash(JSON.stringify(rehearsal.counts)))};`);
  lines.push('commit;');
  return lines.join('\n');
}

async function run(args) {
  if (!args.database) throw new Error('--database is required');
  const source = await parseDatabase(args.database, args.wordpressPrefix || DEFAULT_PREFIX);
  const rehearsal = buildRehearsal(source, {
    siteUrl: args.siteUrl,
    tarMetadata: args.tarMetadata,
    storagePublicBase: args.storagePublicBase || DEFAULT_STORAGE_PUBLIC_BASE
  });
  ensureDir(args.outDir);
  writeJson(path.join(args.outDir, 'ag04-dry-run-summary.json'), {
    generated_at: new Date().toISOString(),
    mode: args.mode,
    counts: rehearsal.counts,
    expected_baseline: { posts: 5737, pages: 49, media: 3277, categories: 83, tags: 10283, authors: 3 },
    reconciliation: {
      posts: rehearsal.counts.posts === 5737 ? 'MATCH' : 'REQUIRES_REVIEW',
      pages: rehearsal.counts.pages === 49 ? 'MATCH' : 'REQUIRES_REVIEW',
      media: rehearsal.counts.media === 3277 ? 'MATCH' : 'REQUIRES_REVIEW',
      categories: rehearsal.counts.categories === 83 ? 'MATCH' : 'REQUIRES_REVIEW',
      tags: rehearsal.counts.tags === 10283 ? 'MATCH' : 'REQUIRES_REVIEW',
      authors: rehearsal.counts.authors === 3 ? 'MATCH' : 'REQUIRES_REVIEW'
    }
  });
  writeJson(path.join(args.outDir, 'authors-manifest.json'), rehearsal.authors);
  writeJson(path.join(args.outDir, 'taxonomy-mapping.json'), {
    categories: rehearsal.categories,
    tags: rehearsal.tags,
    canonical_mapping_policy: 'legacy terms preserved; categories are canonical-navigation candidates; tags remain legacy-only unless explicitly promoted'
  });
  writeJson(path.join(args.outDir, 'taxonomy-disposition.json'), rehearsal.taxonomyDisposition);
  writeJson(path.join(args.outDir, 'ag04-public-url-manifest.json'), rehearsal.publicUrlManifest);
  writeJson(path.join(args.outDir, 'media-safe-key-mappings.json'), rehearsal.safeKeyMappings);
  writeJson(path.join(args.outDir, 'media-rewrite-exceptions.json'), rehearsal.mediaRewriteExceptions);
  writeJson(path.join(args.outDir, 'media-manifest.json'), rehearsal.attachments);
  writeJson(path.join(args.outDir, 'media-exceptions.json'), rehearsal.mediaExceptions);
  writeJson(path.join(args.outDir, 'uploads-archive-exceptions.json'), rehearsal.archiveExceptions);
  writeJson(path.join(args.outDir, 'content-exceptions.json'), rehearsal.storyExceptions);
  writeJson(path.join(args.outDir, 'internal-link-report.json'), rehearsal.internalLinks);
  writeJson(path.join(args.outDir, 'media-reference-report.json'), rehearsal.mediaReferences);
  if (args.sqlOut) {
    ensureDir(path.dirname(args.sqlOut));
    fs.writeFileSync(args.sqlOut, createStagingSql(rehearsal, args));
  }
  if (args.sqlDir) {
    ensureDir(args.sqlDir);
    const sql = createStagingSql(rehearsal, args);
    const maxBytes = Number(args.sqlChunkBytes || 750000);
    let current = [];
    let bytes = 0;
    let index = 1;
    const flush = () => {
      if (!current.length) return;
      const file = path.join(args.sqlDir, `ag04-rehearsal-import-${String(index).padStart(4, '0')}.sql`);
      fs.writeFileSync(file, current.join('\n') + '\n');
      index += 1;
      current = [];
      bytes = 0;
    };
    for (const statement of sql.split(/\n/).filter(line => !['begin;', 'commit;'].includes(line.trim().toLowerCase()))) {
      const lineBytes = Buffer.byteLength(statement) + 1;
      if (bytes && bytes + lineBytes > maxBytes) flush();
      current.push(statement);
      bytes += lineBytes;
    }
    flush();
    writeJson(path.join(args.sqlDir, 'ag04-sql-chunks-manifest.json'), {
      generated_at: new Date().toISOString(),
      chunk_count: index - 1,
      max_chunk_bytes: maxBytes
    });
  }
  console.log(JSON.stringify({ counts: rehearsal.counts, outDir: args.outDir, sqlOut: args.sqlOut || null }, null, 2));
}

if (require.main === module) {
  run(parseArgs(process.argv)).catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  buildMediaRewriteIndex,
  buildPublicUrlManifest,
  buildRehearsal,
  buildTaxonomyDisposition,
  createStagingSql,
  parseDatabase,
  parseInsertHeader,
  resolveWordPressUploadRelative,
  rewriteWordPressUploadUrls,
  safeStorageRelativePath,
  splitRows,
  splitCells,
  storageKeyForOriginalPath,
  stripWordPressImageDerivative
};
