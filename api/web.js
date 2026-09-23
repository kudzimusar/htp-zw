'use strict';

const fs = require('node:fs');
const path = require('node:path');
const publicApi = require('./public');
const {
  CAPABILITY_VERSION,
  normalizePath,
  routeDecision,
  buildStoryCapability,
  buildContextCapability
} = require('../lib/ag05-capability');

const { config, rpc } = publicApi._internals;

function shellPath() {
  const candidates = [
    path.join(process.cwd(), 'apps/mobile/dist/+not-found.html'),
    path.join(process.cwd(), 'apps/mobile/dist/index.html')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw Object.assign(new Error('Universal Reader shell is missing.'), { status: 503 });
}

function readShell() {
  return fs.readFileSync(shellPath(), 'utf8');
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function stripManagedHead(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '')
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
}

function headMarkup(capability) {
  if (!capability || (capability.kind !== 'story' && capability.kind !== 'context')) {
    return [
      '<title>Page not found — HealthTimes</title>',
      '<meta name="robots" content="noindex,follow">'
    ].join('');
  }

  const seo = capability.seo || {};
  const og = seo.openGraph || {};
  const tags = [
    '<title>' + escapeAttr(seo.title || 'HealthTimes') + '</title>',
    capability.kind === 'story' && seo.description
      ? '<meta name="description" content="' + escapeAttr(seo.description) + '">'
      : '',
    '<meta name="robots" content="' + escapeAttr(seo.robots || 'noindex,follow') + '">',
    '<link rel="canonical" href="' + escapeAttr(seo.canonicalUrl || '') + '">',
    '<meta property="og:type" content="' + escapeAttr(og.type || (capability.kind === 'story' ? 'article' : 'website')) + '">',
    '<meta property="og:site_name" content="' + escapeAttr(og.siteName || 'HealthTimes') + '">',
    '<meta property="og:title" content="' + escapeAttr(og.title || seo.title || 'HealthTimes') + '">',
    og.description ? '<meta property="og:description" content="' + escapeAttr(og.description) + '">' : '',
    '<meta property="og:url" content="' + escapeAttr(og.url || seo.canonicalUrl || '') + '">',
    og.image ? '<meta property="og:image" content="' + escapeAttr(og.image) + '">' : '',
    '<meta name="twitter:card" content="' + escapeAttr(seo.twitterCard || 'summary') + '">',
    seo.structuredData
      ? '<script type="application/ld+json">' + safeJson(seo.structuredData) + '</script>'
      : ''
  ];
  return tags.join('');
}

function renderCapabilityShell(shell, capability, requestedPath) {
  let html = stripManagedHead(shell);
  const bootstrap =
    '<script>window.__HTP_PHASE4_CAPABILITY__=' + safeJson(capability) +
    ';window.__HTP_PHASE4_PATH__=' + safeJson(requestedPath) + ';</script>';
  html = html.replace(/<head>/i, '<head>' + headMarkup(capability) + bootstrap);
  return html;
}

function setHeaders(res, status, resolution) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=60, s-maxage=300' : 'public, max-age=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-AG05-Capability-Version', CAPABILITY_VERSION);
  res.setHeader('X-HealthTimes-Presentation', 'apps/mobile');
  if (resolution) res.setHeader('X-AG05-Resolution', String(resolution));
}

function requestedPath(req) {
  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  return normalizePath(url.searchParams.get('path') || '/');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    setHeaders(res, 405, 'method_not_allowed');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(req.method === 'HEAD' ? '' : 'Method not allowed');
  }

  const publicPath = requestedPath(req);

  try {
    if (/^\/(category|tag|author)\//i.test(publicPath)) {
      const context = await rpc('ag05_public_context_document', { p_path: publicPath });
      if (!context) {
        setHeaders(res, 404, 'context_alias_evidence_missing');
        return res.end(req.method === 'HEAD' ? '' : renderCapabilityShell(readShell(), {
          capabilityVersion: CAPABILITY_VERSION,
          kind: 'route',
          path: publicPath,
          routing: { httpStatus: 404, resolution: 'context_alias_evidence_missing', targetPath: null }
        }, publicPath));
      }
      const capability = buildContextCapability(context);
      setHeaders(res, 200, context.routing_disposition || 'context');
      return res.end(req.method === 'HEAD' ? '' : renderCapabilityShell(readShell(), capability, publicPath));
    }

    const resolution = await rpc('ag05_resolve_public_path', { p_path: publicPath });
    const decision = routeDecision(resolution);

    if (decision.httpStatus === 301) {
      res.statusCode = 301;
      res.setHeader('Location', decision.targetPath);
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-AG05-Capability-Version', CAPABILITY_VERSION);
      res.setHeader('X-AG05-Resolution', decision.resolution);
      res.setHeader('X-HealthTimes-Presentation', 'apps/mobile');
      return res.end();
    }

    if (decision.httpStatus !== 200) {
      setHeaders(res, 404, decision.resolution);
      const missing = {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path: publicPath,
        routing: decision
      };
      return res.end(req.method === 'HEAD' ? '' : renderCapabilityShell(readShell(), missing, publicPath));
    }

    const doc = await rpc('ag05_public_story_document', { p_path: publicPath });
    if (!doc) {
      setHeaders(res, 404, 'document_missing');
      const missing = {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path: publicPath,
        routing: { httpStatus: 404, resolution: 'document_missing', targetPath: null }
      };
      return res.end(req.method === 'HEAD' ? '' : renderCapabilityShell(readShell(), missing, publicPath));
    }

    const capability = buildStoryCapability(doc, { supabaseUrl: config().url });
    setHeaders(res, 200, resolution?.resolution || 'preserved_direct');
    res.setHeader('X-AG05-Source-ID', String(doc.source_id || ''));
    return res.end(req.method === 'HEAD' ? '' : renderCapabilityShell(readShell(), capability, publicPath));
  } catch (error) {
    const status = Number(error && error.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    setHeaders(res, safeStatus, 'cp5-capability-failed-safely');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(req.method === 'HEAD' ? '' : 'HealthTimes public Reader failed safely.');
  }
};

module.exports._internals = {
  shellPath,
  readShell,
  escapeAttr,
  safeJson,
  stripManagedHead,
  headMarkup,
  renderCapabilityShell,
  requestedPath
};
