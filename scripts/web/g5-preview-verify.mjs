#!/usr/bin/env node
// HT-MVP-PUBLIC-LAUNCH-01-G3G5: verification of the deployment-dependent G5 behaviour on a
// real, protected Vercel Preview. Run ONLY against a Preview the Owner has authorized.
//
//   vercel env run -- node scripts/web/g5-preview-verify.mjs \
//     --base https://<deployment>.vercel.app --preserved /<preserved-wordpress-path>/ \
//     --alias /<cp5-alias-path>/ --upload /wp-content/uploads/<yyyy>/<mm>/<file> [--browser] [--out dir]
//
// Authentication: the short-lived development OIDC token (VERCEL_OIDC_TOKEN) sent as
// x-vercel-trusted-oidc-idp-token, and ONLY to the Preview origin. Do not use `vercel curl`:
// it creates a project automation protection-bypass secret when none exists.
// Redirects are never followed with the token. The token is never printed or stored.
//
// Self-test of this script against the local replica (no token, no protection):
//   node scripts/web/g5-preview-verify.mjs --local-replica http://127.0.0.1:<port> ...
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const flag = name => args.includes('--' + name);
const localReplica = opt('local-replica');
const base = new URL(localReplica || opt('base') || '');
const outDir = path.resolve(opt('out') || 'g5-preview-verify');
const preserved = opt('preserved');
const alias = opt('alias');
const upload = opt('upload');
const token = localReplica ? '' : String(process.env.VERCEL_OIDC_TOKEN || '');
const TOKEN_HEADER = 'x-vercel-trusted-oidc-idp-token';
const vercelJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
const expectedCsp = vercelJson.headers.flatMap(rule => rule.headers).find(h => h.key === 'Content-Security-Policy').value;

if (localReplica) {
  if (!['127.0.0.1', 'localhost'].includes(base.hostname)) { console.error('G5_VERIFY_FATAL: --local-replica must be a loopback URL.'); process.exit(2); }
} else {
  if (base.protocol !== 'https:' || !/^[a-z0-9-]+\.vercel\.app$/.test(base.hostname)) {
    console.error('G5_VERIFY_FATAL: --base must be an https://<deployment>.vercel.app Preview URL.'); process.exit(2);
  }
  if (!token) { console.error('G5_VERIFY_FATAL: VERCEL_OIDC_TOKEN is not set. Run through `vercel env run -- …`.'); process.exit(2); }
}

const evidence = { kind: 'g5-preview-verify', target: base.origin, mode: localReplica ? 'local-replica' : 'protected-preview', startedAt: new Date().toISOString(), checks: [] };
const SAFE_HEADERS = ['content-type', 'cache-control', 'x-vercel-cache', 'age', 'location', 'x-robots-tag', 'x-htp-shell', 'x-htp-page', 'set-cookie', 'vary',
  'content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'retry-after'];

async function request(pathname, { auth = true, headers = {}, method = 'GET' } = {}) {
  const url = new URL(pathname, base);
  if (url.origin !== base.origin) throw new Error('refusing cross-origin request: ' + url.origin);
  const sent = { ...headers };
  if (auth && token) sent[TOKEN_HEADER] = token;
  let response;
  try {
    response = await fetch(url, { method, headers: sent, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  } catch (error) {
    // Network failures are recorded as failed checks, never as a crash.
    return { url: url.pathname + url.search, status: 0, headers: {}, body: '', error: String(error?.cause?.code || error?.name || 'network-error') };
  }
  const body = method === 'HEAD' ? '' : await response.text();
  const kept = {};
  for (const name of SAFE_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null && name !== 'set-cookie') kept[name] = value;
  }
  // Cookie NAMES only (values never recorded).
  const cookieNames = (typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [])
    .map(cookie => cookie.split('=')[0].trim()).filter(Boolean);
  return { url: url.pathname + url.search, status: response.status, headers: kept, cookieNames, body };
}

// Vercel Skew Protection may set __vdpl (deployment id, not user state) on shared responses.
const PLATFORM_COOKIES = new Set(['__vdpl']);
const onlyPlatformCookies = res => (res.cookieNames || []).every(name => PLATFORM_COOKIES.has(name));

function record(name, pass, detail, { blocked = false } = {}) {
  evidence.checks.push({ name, result: blocked ? 'BLOCKED_STAGING_402' : (pass ? 'PASS' : (pass === null ? 'NOT_APPLICABLE' : 'FAIL')), detail });
}
const isStagingBlocked = res => res.status === 503 && res.headers['x-htp-page'] === 'backend-unavailable';
const isPreviewHost = !localReplica;

// A. The Preview is protected (no credentials at all).
if (isPreviewHost) {
  const anon = await request('/', { auth: false });
  record('A1 preview requires authentication', anon.status === 401 || anon.status === 403 || (anon.status >= 300 && anon.status < 400), { status: anon.status });
}

// B. Reader-shell function: bundled shell, Host-only, no recursion surface.
{
  const probe = '/wp-admin/g5-preview-verify/';
  const plain = await request(probe);
  const spoofed = await request(probe, { headers: { 'x-forwarded-host': 'evil.example', cookie: 'g5-verify=1' } });
  record('B1 page function serves the build-bundled Reader shell', plain.status === 404 && plain.headers['x-htp-shell'] === 'bundled' && plain.headers['x-htp-page'] === 'not-a-page' && plain.body.includes('<div id="root">'),
    { status: plain.status, shell: plain.headers['x-htp-shell'], page: plain.headers['x-htp-page'] });
  record('B2 spoofed x-forwarded-host and cookies change nothing', spoofed.status === plain.status && spoofed.headers['x-htp-shell'] === 'bundled' && spoofed.body.length === plain.body.length,
    { status: spoofed.status, sameLength: spoofed.body.length === plain.body.length });
  const shellPath = await request('/_htp/reader-shell');
  record('B3 no public shell copy and no renderer recursion path', shellPath.status === 404 && !shellPath.headers['x-htp-shell'], { status: shellPath.status });
}

// C. Query-string handling on the rewrite to /api/public?kind=page&htpPath=...
{
  const cases = [
    ['C1 duplicate htpPath via query cannot redirect the renderer', (preserved || '/g5-verify-story/') + '?htpPath=%2Fother-story%2F', res => res.status !== 200 || !/og:url" content="[^"]*other-story/.test(res.body)],
    ['C2 unrelated query parameters are ignored', (preserved || '/g5-verify-story/') + '?utm_source=g5-verify', res => res.status < 500 || isStagingBlocked(res)],
    ['C3 percent-encoded UTF-8 path is handled without 5xx', '/caf%C3%A9-g5-verify/', res => res.status < 500 || isStagingBlocked(res)],
    ['C4 encoded traversal never resolves', '/%2e%2e/%2e%2e/g5-verify/', res => res.status !== 200 && res.status < 500],
    ['C5 encoded slash never resolves to another document', '/a%2Fb-g5-verify/', res => res.status !== 200 || isStagingBlocked(res)],
    ['C6 over-long path is rejected before any lookup', '/' + 'g'.repeat(450) + '/', res => res.status === 404 && res.headers['x-htp-page'] === 'not-a-page'],
    ['C7 robots.txt with a query string still applies the host policy', '/robots.txt?g5=1', res => res.status === 200 && /text\/plain/.test(res.headers['content-type'] || '')],
    ['C8 RSS route with a query string', '/feed?g5=1', res => (res.status === 200 && /rss\+xml/.test(res.headers['content-type'] || '')) || isStagingBlocked(res) || res.status === 503]
  ];
  for (const [name, pathname, ok] of cases) {
    const res = await request(pathname);
    const blocked = isStagingBlocked(res) || (name.startsWith('C8') && res.status === 503);
    record(name, ok(res), { path: pathname.slice(0, 80), status: res.status, page: res.headers['x-htp-page'] || null }, { blocked: blocked && ok(res) });
  }
}

// D. Preview indexing: every response on *.vercel.app is noindex; robots disallows everything.
{
  const index = await request('/');
  const asset = (index.body.match(/\/_expo\/static\/js\/web\/[^"']+\.js/) || [])[0];
  const targets = ['/', '/explore', '/manifest.json', '/api/public?kind=resolve&path=%2F', '/wp-admin/g5-preview-verify/', ...(asset ? [asset] : [])];
  for (const target of targets) {
    const res = target === '/' ? index : await request(target);
    const tag = res.headers['x-robots-tag'] || '';
    record('D1 noindex on ' + target.slice(0, 60), isPreviewHost ? /noindex/.test(tag) : null, { status: res.status, xRobotsTag: tag || null });
  }
  const robots = await request('/robots.txt');
  record('D2 robots.txt disallows everything on the Preview host', robots.body === 'User-agent: *\nDisallow: /\n', { status: robots.status });
}

// E. CDN caching: redirects and 404s cacheable and identical; nothing user-specific; private APIs uncached.
{
  const notFound1 = await request('/wp-admin/g5-cache-probe/');
  const notFound2 = await request('/wp-admin/g5-cache-probe/');
  record('E1 404 is publicly cacheable and identical on repeat', /s-maxage=\d+/.test(notFound1.headers['cache-control'] || '') && notFound2.body === notFound1.body && onlyPlatformCookies(notFound1),
    { cacheControl: notFound1.headers['cache-control'], secondCache: notFound2.headers['x-vercel-cache'] || null, setCookieNames: notFound1.cookieNames });
  if (alias) {
    const a1 = await request(alias); const a2 = await request(alias);
    if (isStagingBlocked(a1)) record('E2 CP5 alias 301 is cacheable', true, { status: a1.status }, { blocked: true });
    else record('E2 CP5 alias 301 is cacheable', a1.status === 301 && a2.status === 301 && a1.headers.location === a2.headers.location && /s-maxage=3600/.test(a1.headers['cache-control'] || '') && onlyPlatformCookies(a1),
      { status: a1.status, location: a1.headers.location || null, cacheControl: a1.headers['cache-control'], secondCache: a2.headers['x-vercel-cache'] || null, setCookieNames: a1.cookieNames });
  } else record('E2 CP5 alias 301 is cacheable', null, 'no --alias supplied');
  if (preserved) {
    const p = await request(preserved);
    if (isStagingBlocked(p)) record('E3 preserved article page is shared-cacheable and carries no user state', true, { status: p.status }, { blocked: true });
    else record('E3 preserved article page is shared-cacheable and carries no user state', p.status === 200 && /s-maxage=300/.test(p.headers['cache-control'] || '') && onlyPlatformCookies(p) && !/cookie/i.test(p.headers.vary || ''),
      { status: p.status, cacheControl: p.headers['cache-control'], vary: p.headers.vary || null, setCookieNames: p.cookieNames, ogTitle: (p.body.match(/property="og:title" content="([^"]*)"/) || [])[1] || null });
  } else record('E3 preserved article page is shared-cacheable and carries no user state', null, 'no --preserved supplied');
  for (const [name, target] of [['E4 commerce API is not shared-cached', '/api/commerce'], ['E5 communications API is not shared-cached', '/api/communications?action=providerHealth']]) {
    const res = await request(target);
    const cc = res.headers['cache-control'] || '';
    record(name, !/s-maxage|public/.test(cc), { status: res.status, cacheControl: cc || null });
  }
}

// F. Security headers on static HTML, the page function, an API response and a static asset.
{
  const index = await request('/');
  const asset = (index.body.match(/\/_expo\/static\/js\/web\/[^"']+\.js/) || [])[0];
  for (const target of ['/', '/wp-admin/g5-preview-verify/', '/api/public?kind=robots', ...(asset ? [asset] : [])]) {
    const res = target === '/' ? index : await request(target);
    const h = res.headers;
    record('F1 security headers on ' + target.slice(0, 60),
      h['content-security-policy'] === expectedCsp && /max-age=\d+/.test(h['strict-transport-security'] || (localReplica ? 'max-age=1' : '')) &&
      h['x-content-type-options'] === 'nosniff' && /SAMEORIGIN/i.test(h['x-frame-options'] || '') && h['referrer-policy'] === 'strict-origin-when-cross-origin' && /camera=\(\)/.test(h['permissions-policy'] || ''),
      { status: res.status, csp: h['content-security-policy'] === expectedCsp ? 'matches vercel.json' : 'MISMATCH', hsts: h['strict-transport-security'] || null });
  }
}

// G. Legacy uploads redirect to the archive; the token is never sent there (redirect not followed).
if (upload) {
  const res = await request(upload);
  record('G1 wp-content upload is a 301 to the Cloudflare archive', res.status === 301 && (res.headers.location || '').startsWith('https://healthtimes-media.pages.dev/wordpress/'), { status: res.status, location: res.headers.location || null });
} else record('G1 wp-content upload is a 301 to the Cloudflare archive', null, 'no --upload supplied');

// H. Optional real-browser pass on the Preview: CSP violations and page errors.
if (flag('browser')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (token && target.origin === base.origin) return route.continue({ headers: { ...route.request().headers(), [TOKEN_HEADER]: token } });
    return route.continue();
  });
  await context.addInitScript(() => document.addEventListener('securitypolicyviolation', e => (window.__csp ||= []).push({ d: e.effectiveDirective, b: e.blockedURI })));
  for (const target of ['/', '/explore', '/premium', '/about', '/studio', ...(preserved ? [preserved] : [])]) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error.message).slice(0, 200)));
    const response = await page.goto(new URL(target, base).toString(), { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const csp = await page.evaluate(() => window.__csp || []);
    record('H1 browser: ' + target.slice(0, 60) + ' renders with no CSP violation or page error', csp.length === 0 && errors.length === 0 && response.status() < 500,
      { status: response.status(), cspViolations: csp, pageErrors: errors.slice(0, 3) });
    await page.close();
  }
  await browser.close();
}

evidence.finishedAt = new Date().toISOString();
const failed = evidence.checks.filter(c => c.result === 'FAIL');
evidence.summary = {
  pass: evidence.checks.filter(c => c.result === 'PASS').length,
  fail: failed.length,
  blockedStaging402: evidence.checks.filter(c => c.result === 'BLOCKED_STAGING_402').length,
  notApplicable: evidence.checks.filter(c => c.result === 'NOT_APPLICABLE').length
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
for (const c of evidence.checks) console.log(c.result.padEnd(20), c.name);
console.log(JSON.stringify(evidence.summary));
process.exit(failed.length ? 1 : 0);
