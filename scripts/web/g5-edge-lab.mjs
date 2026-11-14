#!/usr/bin/env node
// HT-MVP-PUBLIC-LAUNCH-01-G5: local lab that reproduces the compiled Vercel edge
// (vercel.json headers, redirects, filesystem-first rewrites, page renderer) over
// apps/mobile/dist, with a mock Supabase RPC backend, then drives Chromium.
//
// Usage: node scripts/web/g5-edge-lab.mjs [--out <dir>]
// Requires a prior `npm run build:phase4:web`. Makes no request outside 127.0.0.1:
// every other origin is aborted after the browser has applied the CSP.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const root = process.cwd();
const dist = path.join(root, 'apps/mobile/dist');
const outIndex = process.argv.indexOf('--out');
const outDir = path.resolve(outIndex > 0 ? process.argv[outIndex + 1] : 'g5-edge-lab');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

if (!fs.existsSync(path.join(root, 'lib/generated/reader-shell.js')) || !fs.existsSync(path.join(dist, '+not-found.html'))) {
  console.error('G5_LAB_FATAL: run `npm run build:phase4:web` first (bundled Reader shell module or export missing).');
  process.exit(2);
}

// ----------------------------------------------------------- mock Supabase RPC
const STORY = {
  title: 'Cholera response update — HealthTimes',
  story_title: 'Cholera response update',
  description: 'Ministry confirms new treatment centres in Harare.',
  standfirst: 'Ministry confirms new treatment centres in Harare.',
  canonical_url: 'https://healthtimes.co.zw/cholera-response-update/',
  access_policy: 'public',
  body_html: '<p>G5 lab public body paragraph.</p>',
  source_id: 9001,
  source_type: 'post',
  published_at: '2026-10-30T08:00:00Z',
  author: { name: 'HealthTimes Reporter', slug: 'healthtimes-reporter' },
  section: { name: 'Health', slug: 'health' }
};
const rpcCalls = [];
const rpcServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const name = (req.url.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/) || [])[1];
    const args = body ? JSON.parse(body) : {};
    // Same normalization as public.ag05_normalize_path: drop query/hash, force a trailing slash.
    if (typeof args.p_path === 'string') {
      const bare = args.p_path.split('?')[0].split('#')[0] || '/';
      args.p_path = bare === '/' || bare.endsWith('/') ? bare : bare + '/';
    }
    rpcCalls.push({ name, path: args.p_path });
    let result = null;
    if (name === 'ag05_resolve_public_path') {
      result = args.p_path === '/cholera-response-update/'
        ? { resolution: 'preserved_direct', http_status: 200, target_path: '/cholera-response-update/' }
        : args.p_path === '/2026/10/30/cholera-response-update/'
          ? { resolution: 'alias_redirect', http_status: 301, target_path: '/cholera-response-update/' }
          : { resolution: 'explicit_404_exception', http_status: 404 };
    } else if (name === 'ag05_public_story_document') {
      result = args.p_path === '/cholera-response-update/' ? STORY : null;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  });
});
await new Promise(resolve => rpcServer.listen(0, '127.0.0.1', resolve));
process.env.SUPABASE_URL = 'http://127.0.0.1:' + rpcServer.address().port;
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lab';
// No shell override: the page renderer uses the build-generated bundled module, as on Vercel.
delete process.env.HEALTHTIMES_PAGE_SHELL_FILE;
const publicHandler = require(path.join(root, 'api/public.js'));

// ------------------------------------------------- Vercel edge reproduction
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
function staticFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['index.html'] : [clean.slice(1), clean.slice(1) + '.html', clean.slice(1) + '/index.html'];
  for (const rel of candidates) {
    const full = path.join(dist, rel);
    if (full.startsWith(dist) && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}
function edgeHeaders(host) {
  const out = {};
  for (const rule of vercel.headers) {
    if (rule.has && !rule.has.every(cond => cond.type === 'host' && new RegExp('^' + cond.value + '$').test(host))) continue;
    for (const h of rule.headers) out[h.key] = h.value;
  }
  return out;
}
function callPublic(req, res, query) {
  req.url = '/api/public?' + query;
  return publicHandler(req, res);
}
const edge = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + req.headers.host);
  const host = String(req.headers.host || '').split(':')[0];
  for (const [k, v] of Object.entries(edgeHeaders(host))) {
    if (!(k === 'Cache-Control' && !url.pathname.startsWith('/_expo/static/'))) res.setHeader(k, v);
  }
  const wp = url.pathname.match(/^\/wp-content\/uploads(?:\/(.*))?$/);
  if (wp) { res.writeHead(301, { Location: 'https://healthtimes-media.pages.dev/wordpress/' + (wp[1] || '') }); return res.end(); }
  if (url.pathname.startsWith('/api/public')) return publicHandler(req, res);
  const file = staticFile(url.pathname);                                   // handle: filesystem
  const serve = full => { res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream' }); fs.createReadStream(full).pipe(res); };
  if (file) return serve(file);
  if (/^\/article(\/|$)/.test(url.pathname)) return serve(path.join(dist, 'article/fallback.html'));
  if (/^\/author(\/|$)/.test(url.pathname)) return serve(path.join(dist, 'author/fallback.html'));
  if (/^\/studio\/staff(\/|$)/.test(url.pathname)) return serve(path.join(dist, 'studio/staff/fallback.html'));
  if (url.pathname === '/robots.txt') return callPublic(req, res, 'kind=robots');
  if (url.pathname === '/sitemap.xml') return callPublic(req, res, 'kind=sitemap');
  if (url.pathname === '/feed' || url.pathname === '/feed/') return callPublic(req, res, 'kind=feed');
  const page = url.pathname.match(/^(?:\/((?!api\/|_expo\/|_htp\/|assets\/)[^.]*))$/);
  if (page) return callPublic(req, res, 'kind=page&htpPath=' + encodeURIComponent('/' + page[1]));
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('NOT_FOUND');
});
await new Promise(resolve => edge.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + edge.address().port;

// ---------------------------------------------------------------- browser run
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const violations = [];
const pageErrors = [];
const blockedExternal = new Set();
await context.addInitScript(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const block = document.getElementById('htp-public-capability');
    window.__htpBlockAtDomReady = block ? block.getAttribute('data-path') : null;
  });
  document.addEventListener('securitypolicyviolation', event => {
    (window.__cspViolations ||= []).push({ directive: event.effectiveDirective, blocked: event.blockedURI, sample: event.sample, source: event.sourceFile });
  });
});
await context.route('**/*', route => {
  const target = new URL(route.request().url());
  if (target.hostname === '127.0.0.1') return route.continue();
  blockedExternal.add(target.origin);
  return route.abort();
});

const routes = ['/', '/explore', '/search', '/live', '/watch', '/listen', '/about', '/premium', '/authors', '/saved', '/my', '/account-access', '/article/fixture-001', '/article/source-africa-cdc-ebola-contact-tracing-community-deaths-drc', '/privacy', '/studio'];
const results = [];
for (const route of routes) {
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push({ route, message: String(error.message).slice(0, 300) }));
  const response = await page.goto(base + route, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const found = await page.evaluate(() => window.__cspViolations || []);
  violations.push(...found.map(v => ({ route, ...v })));
  results.push({ route, status: response.status(), title: await page.title(), rootChildren: await page.evaluate(() => document.getElementById('root')?.childElementCount ?? 0) });
  await page.close();
}

async function legacy(pathname) {
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push({ route: pathname, message: String(error.message).slice(0, 300) }));
  const response = await page.goto(base + pathname, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const outcome = {
    requested: pathname,
    finalPath: new URL(page.url()).pathname,
    redirectChain: response.request().redirectedFrom() ? [new URL(response.request().redirectedFrom().url()).pathname] : [],
    status: response.status(),
    serverOgTitle: (await response.text()).match(/property="og:title" content="([^"]*)"/)?.[1] ?? null,
    shellSource: response.headers()['x-htp-shell'] ?? null,
    bodyText: (await page.evaluate(() => document.body.innerText)).slice(0, 4000),
    canonical: await page.evaluate(() => [...document.querySelectorAll('link[rel="canonical"]')].map(l => l.href)),
    capabilityBlockAtDomReady: await page.evaluate(() => window.__htpBlockAtDomReady ?? null),
    capabilityBlockAfterHydration: await page.evaluate(() => document.getElementById('htp-public-capability')?.getAttribute('data-path') ?? null),
    csp: await page.evaluate(() => window.__cspViolations || [])
  };
  violations.push(...outcome.csp.map(v => ({ route: pathname, ...v })));
  await page.screenshot({ path: path.join(outDir, 'legacy-' + pathname.replace(/[^a-z0-9]+/gi, '_') + '.png') });
  await page.close();
  delete outcome.csp;
  return outcome;
}
const preserved = await legacy('/cholera-response-update/');
const alias = await legacy('/2026/10/30/cholera-response-update/');
const missing = await legacy('/no-such-story/');
const robots = await (await fetch(base + '/robots.txt')).text();
const wpRedirect = await fetch(base + '/wp-content/uploads/2026/09/example.jpg', { redirect: 'manual' });

await browser.close();
edge.close();
rpcServer.close();

const checks = {
  zeroCspViolations: violations.length === 0,
  zeroPageErrors: pageErrors.length === 0,
  staticRoutesRendered: results.every(r => r.status === 200 && r.rootChildren > 0),
  preservedLegacyPage200WithServerMetadata: preserved.status === 200 && preserved.serverOgTitle === 'Cholera response update — HealthTimes',
  preservedLegacyPageRendersArticle: preserved.bodyText.includes('G5 lab public body paragraph.'),
  aliasRedirectsToCanonical: alias.finalPath === '/cholera-response-update/' && alias.redirectChain[0] === '/2026/10/30/cholera-response-update/' && alias.bodyText.includes('G5 lab public body paragraph.'),
  unknownPathIs404: missing.status === 404 && /not available/i.test(missing.bodyText),
  bundledShellServed: [preserved, alias, missing].every(page => page.shellSource === 'bundled'),
  robotsDisallowsNonCanonicalHost: robots === 'User-agent: *\nDisallow: /\n',
  wpUploadsRedirectToArchive: wpRedirect.status === 301 && wpRedirect.headers.get('location') === 'https://healthtimes-media.pages.dev/wordpress/2026/09/example.jpg'
};
const evidence = { kind: 'g5-edge-lab', base, checks, results, preserved, alias, missing, violations, pageErrors, blockedExternalOrigins: [...blockedExternal].sort(), rpcCalls };
fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ checks, violations: violations.length, pageErrors: pageErrors.length, blockedExternalOrigins: evidence.blockedExternalOrigins }, null, 2));
process.exit(failed.length ? 1 : 0);
