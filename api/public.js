'use strict';

const {
  CAPABILITY_VERSION,
  FEED_LIMIT,
  normalizePath,
  routeDecision,
  buildStoryCapability,
  buildContextCapability,
  renderFeed,
  buildHospazCapability
} = require('../lib/ag05-capability');

function config() {
  const url = (process.env.SUPABASE_URL || process.env.HEALTHTIMES_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY ||
    '';
  return { url, key };
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-AG05-Capability-Version', CAPABILITY_VERSION);
}

function send(res, status, body, type, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  setSecurityHeaders(res);
  res.end(body);
}

function sendJson(req, res, status, value, cache = 'no-store') {
  const body = req.method === 'HEAD' ? '' : JSON.stringify(value);
  return send(res, status, body, 'application/json; charset=utf-8', cache);
}

async function rpc(name, args = {}) {
  const { url, key } = config();
  if (!url || !key) {
    const error = new Error('HealthTimes public capability runtime is not configured.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(url + '/rest/v1/rpc/' + encodeURIComponent(name), {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    redirect: 'manual'
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error = new Error('Public capability RPC failed (' + response.status + ')');
    error.status = response.status;
    error.backend = data;
    throw error;
  }
  return data;
}

function requestedPath(url) {
  return normalizePath(url.searchParams.get('path') || '/');
}

// ---------------------------------------------------------------------------
// G5 public web edge: robots.txt and server-rendered legacy/public page shells.
// Only the canonical HealthTimes hosts are indexable; every other host (Vercel
// previews, staging aliases) receives a disallow-all robots policy.
// ---------------------------------------------------------------------------

const CANONICAL_HOSTS = new Set(['healthtimes.co.zw', 'www.healthtimes.co.zw']);
const CANONICAL_ORIGIN = 'https://healthtimes.co.zw';
const PAGE_PATH_PARAM = 'htpPath';
const MAX_PAGE_PATH_LENGTH = 400;
const BLOCKED_PAGE_PREFIXES = [
  '/api/', '/_expo/', '/_htp/', '/assets/', '/studio', '/owner-preview',
  '/wp-admin', '/wp-login', '/wp-json', '/wp-includes', '/xmlrpc', '/cgi-bin'
];
const ROBOTS_DISALLOW = [
  '/studio', '/owner-preview', '/api/', '/account-access', '/devices-sessions',
  '/payment/', '/system-status', '/growth-status', '/onboarding', '/notification-settings',
  '/notifications', '/appearance', '/saved', '/my', '/_htp/'
];

// Only the Host header: Vercel documents x-forwarded-host as identical to it, so
// trusting the forwarded copy adds nothing and would make robots.txt (CDN-cached)
// depend on a header a client or intermediate proxy could supply.
function requestHost(req) {
  const raw = String(req.headers.host || '').trim().toLowerCase();
  return /^[a-z0-9.-]+(:\d{1,5})?$/.test(raw) ? raw : '';
}

function isCanonicalHost(host) {
  return CANONICAL_HOSTS.has(String(host || '').split(':')[0]);
}

function robotsText(host) {
  if (!isCanonicalHost(host)) return 'User-agent: *\nDisallow: /\n';
  return 'User-agent: *\n' +
    ROBOTS_DISALLOW.map(path => 'Disallow: ' + path).join('\n') +
    '\nAllow: /\n\nSitemap: ' + CANONICAL_ORIGIN + '/sitemap.xml\n';
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON that is safe inside a <script> element: no "</script>", no HTML comment
// openers and no line separators that older parsers treat as newlines.
function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function pagePathFrom(url) {
  const values = url.searchParams.getAll(PAGE_PATH_PARAM);
  if (values.length !== 1) return null;
  const raw = values[0];
  if (!raw || raw.length > MAX_PAGE_PATH_LENGTH || /[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  const path = normalizePath(raw);
  if (path === '/' || path.includes('..')) return null;
  const lower = path.toLowerCase();
  if (BLOCKED_PAGE_PREFIXES.some(prefix => {
    const base = prefix.replace(/\/$/, '');
    return lower === base || lower.startsWith(base + '/');
  })) return null;
  // File-like requests (.php, .env, .jpg, ...) never resolve to an article page.
  if (path.split('/').some(segment => segment.includes('.'))) return null;
  return path;
}

function headTags(capability, status) {
  if (!capability || !capability.seo) {
    const title = status === 404 ? 'Page not found — HealthTimes' : 'HealthTimes';
    return {
      title,
      tags: '<meta data-rh="true" name="robots" content="noindex,follow"/>'
    };
  }
  const seo = capability.seo;
  const og = seo.openGraph || {};
  const tags = [];
  if (seo.description) tags.push('<meta data-rh="true" name="description" content="' + escapeHtml(seo.description) + '"/>');
  tags.push('<meta data-rh="true" name="robots" content="' + escapeHtml(seo.robots || 'index,follow') + '"/>');
  if (seo.canonicalUrl) tags.push('<link data-rh="true" rel="canonical" href="' + escapeHtml(seo.canonicalUrl) + '"/>');
  if (og.type) tags.push('<meta data-rh="true" property="og:type" content="' + escapeHtml(og.type) + '"/>');
  tags.push('<meta data-rh="true" property="og:site_name" content="' + escapeHtml(og.siteName || 'HealthTimes') + '"/>');
  if (og.title) tags.push('<meta data-rh="true" property="og:title" content="' + escapeHtml(og.title) + '"/>');
  if (og.description) tags.push('<meta data-rh="true" property="og:description" content="' + escapeHtml(og.description) + '"/>');
  if (og.url) tags.push('<meta data-rh="true" property="og:url" content="' + escapeHtml(og.url) + '"/>');
  if (og.image) tags.push('<meta data-rh="true" property="og:image" content="' + escapeHtml(og.image) + '"/>');
  if (seo.twitterCard) tags.push('<meta data-rh="true" name="twitter:card" content="' + escapeHtml(seo.twitterCard) + '"/>');
  if (seo.structuredData) tags.push('<script data-rh="true" type="application/ld+json">' + jsonForScript(seo.structuredData) + '</script>');
  return { title: seo.title || 'HealthTimes', tags: tags.join('') };
}

function noscriptSummary(capability) {
  const content = capability && capability.kind === 'story' ? capability.content || {} : {};
  const title = capability && capability.kind === 'story'
    ? (content.storyTitle || (capability.seo && capability.seo.title) || 'HealthTimes')
    : (capability && capability.name) || 'HealthTimes';
  const summary = (capability && capability.seo && capability.seo.description) || '';
  return '<noscript><main><h1>' + escapeHtml(title) + '</h1>' +
    (summary ? '<p>' + escapeHtml(summary) + '</p>' : '') +
    '<p><a href="/">HealthTimes</a></p></main></noscript>';
}

function renderPage(shell, capability, status, path = '') {
  const head = headTags(capability, status);
  const data = capability && path
    ? '<script type="application/json" id="htp-public-capability" data-path="' + escapeHtml(path) + '">' +
      jsonForScript(capability) + '</script>'
    : '';
  if (!shell || !shell.includes('</head>') || !shell.includes('</body>')) {
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"/>' +
      '<title data-rh="true">' + escapeHtml(head.title) + '</title>' + head.tags +
      '</head><body>' + noscriptSummary(capability).replace(/^<noscript>|<\/noscript>$/g, '') + '</body></html>';
  }
  let html = shell;
  html = html.replace(/<meta name="description"[^>]*>/i, '');
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, '<title data-rh="true">' + escapeHtml(head.title) + '</title>');
  } else {
    html = html.replace('</head>', '<title data-rh="true">' + escapeHtml(head.title) + '</title></head>');
  }
  html = html.replace('</head>', head.tags + data + '</head>');
  html = html.replace('</body>', noscriptSummary(capability) + '</body>');
  return html;
}

let shellLoaderOverride = null;

// The page shell is the exported +not-found.html, embedded at build time by
// scripts/web/prepare-phase4-vercel.js into lib/generated/reader-shell.js and
// bundled with this function (traced through the literal require below). No
// network fetch, no cookie forwarding and no host trust are involved.
function loadShell() {
  if (shellLoaderOverride) return { html: shellLoaderOverride(), source: 'override' };
  const file = process.env.HEALTHTIMES_PAGE_SHELL_FILE;
  if (file) {
    try { return { html: require('node:fs').readFileSync(file, 'utf8'), source: 'file' }; } catch { return { html: null, source: 'minimal' }; }
  }
  try {
    const html = require('../lib/generated/reader-shell.js');
    if (typeof html === 'string' && html.includes('</head>')) return { html, source: 'bundled' };
  } catch {}
  return { html: null, source: 'minimal' };
}

function shellPage(capability, status, path) {
  const shell = loadShell();
  return { html: renderPage(shell.html, capability, status, path), source: shell.html ? shell.source : 'minimal' };
}

function sendPage(req, res, status, page, cache, extraHeaders = {}) {
  const html = typeof page === 'string' ? page : page.html;
  if (page && typeof page === 'object') res.setHeader('X-HTP-Shell', page.source);
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-AG05-Capability-Version', CAPABILITY_VERSION);
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.end(req.method === 'HEAD' ? '' : html);
}

async function handlePage(req, res, url) {
  const path = pagePathFrom(url);
  if (!path) {
    return sendPage(req, res, 404, shellPage(null, 404),
      'public, max-age=60, s-maxage=3600', { 'X-HTP-Page': 'not-a-page' });
  }

  try {
    if (/^\/(category|tag)\//i.test(path)) {
      const context = await rpc('ag05_public_context_document', { p_path: path });
      if (!context) {
        return sendPage(req, res, 404, shellPage(null, 404),
          'public, max-age=60, s-maxage=600', { 'X-HTP-Page': 'context-missing' });
      }
      const capability = buildContextCapability(context);
      return sendPage(req, res, 200, shellPage(capability, 200, path),
        'public, max-age=0, s-maxage=300, stale-while-revalidate=600', { 'X-HTP-Page': 'context' });
    }

    const resolution = await rpc('ag05_resolve_public_path', { p_path: path });
    const decision = routeDecision(resolution);

    if (decision.httpStatus === 301 && decision.targetPath) {
      res.setHeader('Location', decision.targetPath);
      return sendPage(req, res, 301, '', 'public, max-age=300, s-maxage=3600', { 'X-HTP-Page': 'redirect' });
    }

    if (decision.httpStatus !== 200) {
      return sendPage(req, res, 404, shellPage(null, 404),
        'public, max-age=60, s-maxage=600', { 'X-HTP-Page': 'not-found' });
    }

    const doc = await rpc('ag05_public_story_document', { p_path: path });
    if (!doc) {
      return sendPage(req, res, 404, shellPage(null, 404),
        'public, max-age=60, s-maxage=600', { 'X-HTP-Page': 'document-missing' });
    }
    const capability = buildStoryCapability(doc, { supabaseUrl: config().url, mediaBaseUrl: process.env.HEALTHTIMES_MEDIA_BASE_URL });
    return sendPage(req, res, 200, shellPage(capability, 200, path),
      'public, max-age=0, s-maxage=300, stale-while-revalidate=600', { 'X-HTP-Page': 'story' });
  } catch {
    return sendPage(req, res, 503, shellPage(null, 503),
      'no-store', { 'Retry-After': '300', 'X-HTP-Page': 'backend-unavailable' });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(req, res, 405, { capabilityVersion: CAPABILITY_VERSION, error: 'METHOD_NOT_ALLOWED' });
  }

  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  const kind = String(url.searchParams.get('kind') || 'resolve');

  if (kind === 'robots') {
    return send(res, 200, req.method === 'HEAD' ? '' : robotsText(requestHost(req)),
      'text/plain; charset=utf-8', 'public, max-age=3600');
  }

  if (kind === 'page') {
    return handlePage(req, res, url);
  }

  try {
    if (kind === 'sitemap') {
      const xml = await rpc('ag05_public_sitemap_xml', {});
      const body = typeof xml === 'string' ? xml : String(xml || '');
      const count = (body.match(/<url>/g) || []).length;
      res.setHeader('X-AG05-Sitemap-URL-Count', String(count));
      return send(
        res,
        200,
        req.method === 'HEAD' ? '' : body,
        'application/xml; charset=utf-8',
        'public, max-age=300, s-maxage=1800'
      );
    }

    if (kind === 'feed') {
      const rows = await rpc('ag05_public_feed_rows', { p_limit: FEED_LIMIT });
      const list = Array.isArray(rows) ? rows : [];
      res.setHeader('X-AG05-Feed-Item-Count', String(list.length));
      return send(
        res,
        200,
        req.method === 'HEAD' ? '' : renderFeed(list),
        'application/rss+xml; charset=utf-8',
        'public, max-age=120, s-maxage=600'
      );
    }

    if (kind === 'ad') {
      const ad = await rpc('ag05_hospaz_direct_ad_preview', {});
      const capability = buildHospazCapability(ad, { supabaseUrl: config().url, mediaBaseUrl: process.env.HEALTHTIMES_MEDIA_BASE_URL });
      return sendJson(req, res, capability ? 200 : 404, capability || {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'direct-ad',
        resolution: 'not-found'
      });
    }

    if (kind !== 'resolve') {
      return sendJson(req, res, 400, {
        capabilityVersion: CAPABILITY_VERSION,
        error: 'unsupported-capability-kind'
      });
    }

    const path = requestedPath(url);

    if (/^\/(category|tag|author)\//i.test(path)) {
      const context = await rpc('ag05_public_context_document', { p_path: path });
      if (!context) {
        res.setHeader('X-AG05-Resolution', 'context_alias_evidence_missing');
        return sendJson(req, res, 404, {
          capabilityVersion: CAPABILITY_VERSION,
          kind: 'route',
          path,
          routing: {
            httpStatus: 404,
            resolution: 'context_alias_evidence_missing',
            targetPath: null
          }
        }, 'public, max-age=60');
      }

      const capability = buildContextCapability(context);
      res.setHeader('X-AG05-Resolution', String(context.routing_disposition || 'context'));
      return sendJson(req, res, 200, capability, 'public, max-age=60, s-maxage=300');
    }

    const resolution = await rpc('ag05_resolve_public_path', { p_path: path });
    const decision = routeDecision(resolution);
    res.setHeader('X-AG05-Resolution', decision.resolution);

    if (decision.httpStatus === 301) {
      if (url.searchParams.get('redirect') === 'json') {
        // In-app navigation: fetch() would silently follow a real 301 into a
        // static 404 page, so the Reader asks for the decision as data.
        return sendJson(req, res, 200, {
          capabilityVersion: CAPABILITY_VERSION,
          kind: 'route',
          path,
          routing: decision
        }, 'public, max-age=300, s-maxage=3600');
      }
      res.setHeader('Location', decision.targetPath);
      return sendJson(req, res, 301, {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path,
        routing: decision
      }, 'public, max-age=300, s-maxage=3600');
    }

    if (decision.httpStatus !== 200) {
      return sendJson(req, res, 404, {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path,
        routing: decision
      }, 'public, max-age=60');
    }

    const doc = await rpc('ag05_public_story_document', { p_path: path });
    if (!doc) {
      res.setHeader('X-AG05-Resolution', 'document_missing');
      return sendJson(req, res, 404, {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path,
        routing: {
          httpStatus: 404,
          resolution: 'document_missing',
          targetPath: null
        }
      });
    }

    const capability = buildStoryCapability(doc, { supabaseUrl: config().url, mediaBaseUrl: process.env.HEALTHTIMES_MEDIA_BASE_URL });
    res.setHeader('X-AG05-Source-ID', String(doc.source_id || ''));
    return sendJson(req, res, 200, capability, 'public, max-age=60, s-maxage=300');
  } catch (error) {
    const status = Number(error.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return sendJson(req, res, safeStatus, {
      capabilityVersion: CAPABILITY_VERSION,
      error: 'cp5-capability-failed-safely'
    });
  }
};

module.exports._internals = {
  config,
  rpc,
  requestedPath,
  robotsText,
  pagePathFrom,
  renderPage,
  escapeHtml,
  jsonForScript,
  setShellLoader(loader) { shellLoaderOverride = typeof loader === 'function' ? loader : null; },
  loadShell,
  requestHost,
  PAGE_PATH_PARAM
};
