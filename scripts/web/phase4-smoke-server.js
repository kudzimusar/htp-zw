'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { buildStoryCapability, buildContextCapability } = require('../../lib/ag05-capability');
const { renderCapabilityShell } = require('../../api/web')._internals;

const dist = path.join(process.cwd(), 'apps/mobile/dist');
const port = Number(process.env.PORT || 4174);

const publicDoc = {
  source_id: '30154',
  source_type: 'post',
  source_url: 'https://healthtimes.co.zw/2026/02/12/phase4-representative-story/',
  handling: 'preserve_directly',
  http_status: 200,
  title: 'Phase 4 representative migrated story — HealthTimes',
  story_title: 'Phase 4 representative migrated story',
  description: 'Representative migrated-story browser smoke for the universal Reader.',
  canonical_url: 'https://healthtimes.co.zw/2026/02/12/phase4-representative-story/',
  robots: 'index,follow,max-image-preview:large',
  open_graph_title: 'Phase 4 representative migrated story',
  open_graph_description: 'Representative migrated-story browser smoke for the universal Reader.',
  schema_type: 'NewsArticle',
  published_at: '2026-02-12T17:04:57Z',
  modified_at: '2026-02-12T18:04:57Z',
  author: { name: 'Michael Gwarisa', slug: 'mike-gwarisa', bio: null },
  section: { name: 'Health News', slug: 'health-news' },
  access_policy: 'public',
  body_html: '<p>Verified Phase 4 Reader body.</p>',
  standfirst: 'Universal Reader presentation with CP5 server-visible metadata.'
};

const story = buildStoryCapability(publicDoc, { supabaseUrl: 'https://example.supabase.co' });
const context = buildContextCapability({
  kind: 'category',
  slug: 'health_news',
  name: 'Health News',
  path: '/category/health_news/',
  canonical_url: 'https://healthtimes.co.zw/category/health_news/',
  robots: 'noindex,follow',
  routing_disposition: 'PRESERVE_CONTEXT_NOINDEX',
  items: []
});

function typeFor(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json') || file.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function staticFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\.\./g, '');
  const candidates = clean === '/'
    ? [path.join(dist, 'index.html')]
    : [
        path.join(dist, clean.replace(/^\//, '')),
        path.join(dist, clean.replace(/^\//, '') + '.html'),
        path.join(dist, clean.replace(/^\//, ''), 'index.html')
      ];
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:' + port);
  const pathname = url.pathname;
  const file = staticFile(pathname);
  if (file) {
    res.statusCode = 200;
    res.setHeader('Content-Type', typeFor(file));
    return res.end(fs.readFileSync(file));
  }

  const shell = fs.readFileSync(path.join(dist, '404.html'), 'utf8');
  if (pathname === '/2026/02/12/phase4-representative-story/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderCapabilityShell(shell, story, pathname));
  }
  if (pathname === '/category/health_news/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderCapabilityShell(shell, context, pathname));
  }
  if (pathname === '/api/public') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      capabilityVersion: 'cp5-phase3-v1',
      kind: 'route',
      path: url.searchParams.get('path') || '/',
      routing: { httpStatus: 404, resolution: 'explicit_404_exception', targetPath: null }
    }));
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(renderCapabilityShell(shell, {
    capabilityVersion: 'cp5-phase3-v1',
    kind: 'route',
    path: pathname,
    routing: { httpStatus: 404, resolution: 'explicit_404_exception', targetPath: null }
  }, pathname));
});

server.listen(port, '127.0.0.1', () => {
  console.log('Phase 4 smoke server listening on http://127.0.0.1:' + port);
});
