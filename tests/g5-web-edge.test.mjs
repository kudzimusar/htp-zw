// HT-MVP-PUBLIC-LAUNCH-01-G5-WEB-FOUNDATION: public web edge contracts.
// Offline: Supabase RPCs are stubbed, the Reader shell is a fixture (plus the real
// exported shell when a local build exists). No network, no secrets.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const publicHandler = require('../api/public.js');
const internals = publicHandler._internals;

const INLINE_SCRIPTS = [
  '(function(){try{var key="ht:theme";}catch(e){}})();',
  'if ("serviceWorker" in navigator) {}',
  'globalThis.__EXPO_ROUTER_HYDRATE__=true;'
];
const FIXTURE_SHELL = '<!DOCTYPE html><html  lang="en"><head><meta charSet="utf-8"/>' +
  '<meta name="description" content="HealthTimes global health journalism."/>' +
  '<title data-rh="true"></title>' +
  '<script>' + INLINE_SCRIPTS[0] + '</script><script>' + INLINE_SCRIPTS[1] + '</script>' +
  '<script type="module">' + INLINE_SCRIPTS[2] + '</script>' +
  '<script src="/_expo/static/js/web/entry-abc.js" defer></script></head>' +
  '<body><div id="root"><p>Loading HealthTimes…</p></div></body></html>';

const STORY_DOC = {
  title: 'Cholera response update — HealthTimes',
  story_title: 'Cholera response update',
  description: 'Ministry confirms new treatment centres.',
  canonical_url: 'https://healthtimes.co.zw/cholera-response-update/',
  access_policy: 'public',
  body_html: '<p>Full public body.</p>',
  source_id: 101,
  source_type: 'post',
  published_at: '2026-10-30T08:00:00Z'
};

function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/\bsrc\s*=/.test(match[1]) && !/application\/(ld\+)?json/.test(match[1]))
    .map(match => match[2]);
}

function stubBackend(handlers) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const rpc = url.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)$/);
    if (rpc) {
      const args = init.body ? JSON.parse(init.body) : {};
      const handler = handlers[rpc[1]];
      const result = handler ? handler(args) : { status: 404, json: null };
      return new Response(result.json == null ? '' : JSON.stringify(result.json), {
        status: result.status || 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (handlers.__other) return handlers.__other(url, init);
    return new Response('unexpected', { status: 599 });
  };
  return { calls, restore() { globalThis.fetch = original; } };
}

async function invoke(url, { method = 'GET', headers = {} } = {}) {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = String(value); },
    getHeader(key) { return this.headers[String(key).toLowerCase()]; },
    end(chunk) { this.body = chunk == null ? '' : String(chunk); }
  };
  await publicHandler({ method, url, headers: { host: 'healthtimes.co.zw', ...headers } }, res);
  return { status: res.statusCode, headers: res.headers, body: res.body };
}

function withRuntime(fn) {
  return async () => {
    const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY, media: process.env.HEALTHTIMES_MEDIA_BASE_URL };
    process.env.SUPABASE_URL = 'https://stub-project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_stub';
    delete process.env.HEALTHTIMES_MEDIA_BASE_URL;
    internals.setShellLoader(() => FIXTURE_SHELL);
    try { await fn(); } finally {
      internals.setShellLoader(null);
      for (const [k, v] of [['SUPABASE_URL', saved.url], ['SUPABASE_PUBLISHABLE_KEY', saved.key], ['HEALTHTIMES_MEDIA_BASE_URL', saved.media]]) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  };
}

const pageUrl = p => '/api/public?kind=page&htpPath=' + encodeURIComponent(p);

// ---------------------------------------------------------------- vercel.json

test('vercel.json keeps accepted routing contracts first and adds G5 routes after them', () => {
  assert.equal(vercel.cleanUrls, true);
  const sources = vercel.rewrites.map(rule => rule.source);
  assert.deepEqual(sources.slice(0, 3), ['/article/:id*', '/author/:slug*', '/studio/staff/:staffId*']);
  assert.equal(vercel.rewrites.find(r => r.source === '/studio/staff/:staffId*').destination, '/studio/staff/fallback');
  assert.equal(vercel.rewrites.find(r => r.source === '/robots.txt').destination, '/api/public?kind=robots');
  assert.equal(vercel.rewrites.find(r => r.source === '/sitemap.xml').destination, '/api/public?kind=sitemap');
  assert.equal(vercel.rewrites.find(r => r.source === '/feed/').destination, '/api/public?kind=feed');
  const last = vercel.rewrites.at(-1);
  assert.equal(last.source, '/:htpPath((?!api/|_expo/|_htp/|assets/)[^.]*)', 'page renderer must be the final rewrite');
  assert.equal(last.destination, '/api/public?kind=page&htpPath=/:htpPath');
  assert.equal(vercel.functions, undefined, 'no includeFiles: Vercel snapshots source files before the build command');
});

test('page renderer route (as compiled by vercel build) excludes assets, APIs, shell and file-like paths', () => {
  // Copied from .vercel/output/config.json produced by vercel@65.14.0 for this vercel.json.
  const compiled = /^(?:\/((?!api\/|_expo\/|_htp\/|assets\/)[^.]*))$/;
  for (const p of ['/cholera-response-update/', '/2026/09/22/slug/', '/category/health/', '/studio-feature-story/']) {
    assert.ok(compiled.test(p), p + ' must reach the page renderer');
  }
  for (const p of ['/api/public', '/_expo/static/js/web/entry.js', '/_htp/reader-shell', '/assets/x', '/wp-login.php', '/.env', '/feed.xml']) {
    assert.ok(!compiled.test(p), p + ' must not reach the page renderer');
  }
});

test('security headers: enforced CSP without unsafe-eval or inline script, plus baseline headers', () => {
  const global = vercel.headers.find(rule => rule.source === '/(.*)' && !rule.has);
  const headers = Object.fromEntries(global.headers.map(h => [h.key, h.value]));
  const csp = headers['Content-Security-Policy'];
  const directives = Object.fromEntries(csp.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values];
  }));
  assert.deepEqual(directives['default-src'], ["'self'"]);
  assert.ok(directives['script-src'].includes("'self'"));
  assert.ok(!directives['script-src'].includes("'unsafe-inline'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.equal(directives['script-src'].filter(v => v.startsWith("'sha256-")).length, 4);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'self'"]);
  assert.deepEqual(directives['base-uri'], ["'self'"]);
  assert.deepEqual(directives['form-action'], ["'self'"]);
  assert.ok(directives['connect-src'].includes('https://*.supabase.co'));
  assert.ok('upgrade-insecure-requests' in directives);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(headers['Strict-Transport-Security'], /^max-age=\d+$/);
  assert.match(headers['Permissions-Policy'], /camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  assert.ok(!headers['X-Robots-Tag'], 'production must stay indexable');
  const preview = vercel.headers.find(rule => rule.has && rule.has[0].type === 'host');
  assert.equal(preview.has[0].value, '.*\\.vercel\\.app');
  assert.deepEqual(preview.headers, [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]);
});

test('legacy wp-content uploads redirect onto the verified Cloudflare archive keys', () => {
  const rule = vercel.redirects.find(r => r.source === '/wp-content/uploads/:path*');
  assert.equal(rule.statusCode, 301);
  assert.equal(rule.destination, 'https://healthtimes-media.pages.dev/wordpress/:path*');
  const manifest = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'docs/cost-recovery/media-manifest-2026-11-11.json.gz'))));
  const archived = manifest.objects.map(o => o.name).filter(name => name.startsWith('wordpress/'));
  assert.ok(archived.length >= 2000, 'mirror holds the WordPress archive under wordpress/');
  const compiled = /^\/wp-content\/uploads(?:\/((?:[^/]+?)(?:\/(?:[^/]+?))*))?$/;
  const key = archived.find(name => /^wordpress\/\d{4}\/\d{2}\/[^/]+$/.test(name));
  const legacy = '/wp-content/uploads/' + key.slice('wordpress/'.length);
  const location = 'https://healthtimes-media.pages.dev/wordpress/' + legacy.match(compiled)[1];
  assert.equal(location, 'https://healthtimes-media.pages.dev/' + key);
});

// ------------------------------------------------------------------ robots.txt

test('robots: only the canonical HealthTimes hosts are indexable', async () => {
  const prod = await invoke('/api/public?kind=robots', { headers: { host: 'healthtimes.co.zw' } });
  assert.equal(prod.status, 200);
  assert.match(prod.headers['content-type'], /^text\/plain/);
  assert.match(prod.body, /Disallow: \/studio\n/);
  assert.match(prod.body, /Disallow: \/owner-preview\n/);
  assert.match(prod.body, /Disallow: \/api\/\n/);
  assert.match(prod.body, /Sitemap: https:\/\/healthtimes\.co\.zw\/sitemap\.xml/);
  assert.doesNotMatch(prod.body, /Disallow: \/\n/);
  for (const host of ['dist-11-11.vercel.app', 'healthtimes-client-preview.vercel.app', 'evil.example', '']) {
    const other = await invoke('/api/public?kind=robots', { headers: { host } });
    assert.equal(other.body, 'User-agent: *\nDisallow: /\n', host + ' must not be indexable');
  }
});

// --------------------------------------------------------------- page renderer

test('page: WordPress alias returns a real 301 to the canonical preserved path', withRuntime(async () => {
  const backend = stubBackend({ ag05_resolve_public_path: () => ({ json: { resolution: 'alias_redirect', http_status: 301, target_path: '/cholera-response-update/' } }) });
  try {
    const res = await invoke(pageUrl('/2026/10/30/cholera-response-update/'));
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, '/cholera-response-update/');
    assert.match(res.headers['cache-control'], /s-maxage=3600/);
    assert.equal(res.body, '');
    assert.equal(backend.calls.length, 1);
  } finally { backend.restore(); }
}));

test('page: preserved story returns 200 with server metadata, an escaped data block and unchanged inline scripts', withRuntime(async () => {
  const backend = stubBackend({
    ag05_resolve_public_path: () => ({ json: { resolution: 'preserved_direct', http_status: 200 } }),
    ag05_public_story_document: () => ({ json: { ...STORY_DOC, story_title: 'Cholera </script><script>alert(1)</script> "update"' } })
  });
  try {
    const res = await invoke(pageUrl('/cholera-response-update/'));
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /^text\/html/);
    assert.equal(res.headers['x-robots-tag'], undefined, 'article pages must not carry noindex from the JSON API');
    assert.match(res.headers['cache-control'], /s-maxage=300/);
    assert.match(res.body, /<title data-rh="true">Cholera response update — HealthTimes<\/title>/);
    assert.match(res.body, /<link data-rh="true" rel="canonical" href="https:\/\/healthtimes\.co\.zw\/cholera-response-update\/"\/>/);
    assert.match(res.body, /<meta data-rh="true" property="og:title" content="Cholera response update — HealthTimes"\/>/);
    assert.match(res.body, /<meta data-rh="true" name="description" content="Ministry confirms new treatment centres\."\/>/);
    assert.doesNotMatch(res.body, /HealthTimes global health journalism/, 'generic description replaced');
    assert.equal((res.body.match(/<title/g) || []).length, 1);
    const block = res.body.match(/<script type="application\/json" id="htp-public-capability" data-path="\/cholera-response-update\/">([\s\S]*?)<\/script>/);
    assert.ok(block, 'capability data block present');
    assert.doesNotMatch(block[1], /<\/script/i);
    const parsed = JSON.parse(block[1]);
    assert.equal(parsed.kind, 'story');
    assert.match(parsed.content.storyTitle, /<\/script>/, 'round-trips the original text');
    assert.deepEqual(inlineScripts(res.body), INLINE_SCRIPTS, 'no new executable inline script: CSP hashes stay valid');
    assert.match(res.body, /<noscript><main><h1>Cholera &lt;\/script&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;update&quot;<\/h1>/);
  } finally { backend.restore(); }
}));

test('page: Premium story body is never injected', withRuntime(async () => {
  const backend = stubBackend({
    ag05_resolve_public_path: () => ({ json: { resolution: 'preserved_direct', http_status: 200 } }),
    ag05_public_story_document: () => ({ json: { ...STORY_DOC, access_policy: 'premium', body_html: '<p>SECRET PREMIUM BODY</p>', premium_teaser_html: '<p>Teaser paragraph.</p>' } })
  });
  try {
    const res = await invoke(pageUrl('/premium-investigation/'));
    assert.equal(res.status, 200);
    assert.doesNotMatch(res.body, /SECRET PREMIUM BODY/);
    const parsed = JSON.parse(res.body.match(/id="htp-public-capability"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.equal(parsed.content.bodyProtected, true);
    assert.equal(parsed.content.bodyHtml, null);
  } finally { backend.restore(); }
}));

test('page: unknown path is a real 404 with noindex, and context paths render their metadata', withRuntime(async () => {
  const backend = stubBackend({
    ag05_resolve_public_path: () => ({ json: { resolution: 'explicit_404_exception', http_status: 404 } }),
    ag05_public_context_document: () => ({ json: { context_kind: 'category', slug: 'health', name: 'Health', path: '/category/health/' } })
  });
  try {
    const missing = await invoke(pageUrl('/no-such-story/'));
    assert.equal(missing.status, 404);
    assert.match(missing.body, /<meta data-rh="true" name="robots" content="noindex,follow"\/>/);
    assert.match(missing.body, /<title data-rh="true">Page not found — HealthTimes<\/title>/);
    assert.doesNotMatch(missing.body, /htp-public-capability/);
    const context = await invoke(pageUrl('/category/health/'));
    assert.equal(context.status, 200);
    assert.match(context.body, /id="htp-public-capability" data-path="\/category\/health\/"/);
  } finally { backend.restore(); }
}));

test('page: bot probes, file paths, internal prefixes and ambiguous parameters never reach Supabase', withRuntime(async () => {
  const backend = stubBackend({});
  try {
    for (const p of ['/wp-login.php', '/.env', '/xmlrpc', '/wp-admin/', '/studio/staff/x', '/api/public', '/a/../b/']) {
      const res = await invoke(pageUrl(p));
      assert.equal(res.status, 404, p);
    }
    const dup = await invoke('/api/public?kind=page&htpPath=%2Fa%2F&htpPath=%2Fb%2F');
    assert.equal(dup.status, 404);
    assert.equal(backend.calls.length, 0, 'no RPC for rejected paths');
  } finally { backend.restore(); }
}));

test('page: backend restriction (HTTP 402) is a 503 with Retry-After, never cached', withRuntime(async () => {
  const backend = stubBackend({ ag05_resolve_public_path: () => ({ status: 402, json: { message: 'restricted' } }) });
  try {
    const res = await invoke(pageUrl('/cholera-response-update/'));
    assert.equal(res.status, 503);
    assert.equal(res.headers['retry-after'], '300');
    assert.equal(res.headers['cache-control'], 'no-store');
  } finally { backend.restore(); }
}));

test('page: the shell comes only from the build-bundled module; no network fetch, no cookie forwarding, no header trust', withRuntime(async () => {
  const backend = stubBackend({ ag05_resolve_public_path: () => ({ json: { resolution: 'explicit_404_exception', http_status: 404 } }) });
  internals.setShellLoader(null);
  const savedFile = process.env.HEALTHTIMES_PAGE_SHELL_FILE;
  delete process.env.HEALTHTIMES_PAGE_SHELL_FILE;
  const generated = path.join(root, 'lib/generated/reader-shell.js');
  const existed = fs.existsSync(generated);
  try {
    if (!existed) {
      fs.mkdirSync(path.dirname(generated), { recursive: true });
      fs.writeFileSync(generated, "'use strict';\nmodule.exports = " + JSON.stringify(FIXTURE_SHELL) + ';\n');
    }
    delete require.cache[generated];
    const res = await invoke(pageUrl('/no-such-story/'), {
      headers: { host: 'healthtimes.co.zw', 'x-forwarded-host': 'evil.example', cookie: '_vercel_jwt=visitor; sb-access-token=reader-session' }
    });
    assert.equal(res.status, 404);
    assert.equal(res.headers['x-htp-shell'], 'bundled');
    assert.match(res.body, /<div id="root">/, 'served inside the real Reader shell');
    assert.deepEqual([...new Set(backend.calls.map(call => new URL(call.url).origin))], ['https://stub-project.supabase.co'], 'only the configured RPC origin is contacted');
    for (const call of backend.calls) {
      const sent = JSON.stringify(call.init.headers || {});
      assert.doesNotMatch(sent, /_vercel_jwt|reader-session|cookie/i, 'visitor credentials are never forwarded');
    }
  } finally {
    backend.restore();
    if (!existed) fs.rmSync(generated, { force: true });
    delete require.cache[generated];
    if (savedFile === undefined) delete process.env.HEALTHTIMES_PAGE_SHELL_FILE; else process.env.HEALTHTIMES_PAGE_SHELL_FILE = savedFile;
  }
}));

test('page: with no shell available the response is a minimal, script-free page', withRuntime(async () => {
  const backend = stubBackend({ ag05_resolve_public_path: () => ({ json: { resolution: 'explicit_404_exception', http_status: 404 } }) });
  internals.setShellLoader(null);
  const savedFile = process.env.HEALTHTIMES_PAGE_SHELL_FILE;
  process.env.HEALTHTIMES_PAGE_SHELL_FILE = path.join(root, 'tests', 'no-such-shell-file.html');
  try {
    const res = await invoke(pageUrl('/no-such-story/'));
    assert.equal(res.status, 404);
    assert.equal(res.headers['x-htp-shell'], 'minimal');
    assert.match(res.body, /^<!DOCTYPE html>/);
    assert.doesNotMatch(res.body, /<script/);
    assert.match(res.body, /name="robots" content="noindex,follow"/);
  } finally {
    backend.restore();
    if (savedFile === undefined) delete process.env.HEALTHTIMES_PAGE_SHELL_FILE; else process.env.HEALTHTIMES_PAGE_SHELL_FILE = savedFile;
  }
}));

test('robots depends on the Host header only (x-forwarded-host cannot change a CDN-cached policy)', async () => {
  const preview = await invoke('/api/public?kind=robots', { headers: { host: 'dist-11-11.vercel.app', 'x-forwarded-host': 'healthtimes.co.zw' } });
  assert.equal(preview.body, 'User-agent: *\nDisallow: /\n');
  const production = await invoke('/api/public?kind=robots', { headers: { host: 'healthtimes.co.zw', 'x-forwarded-host': 'dist-11-11.vercel.app' } });
  assert.match(production.body, /Sitemap: https:\/\/healthtimes\.co\.zw\/sitemap\.xml/);
  assert.equal(internals.requestHost({ headers: { host: 'preview.vercel.app', 'x-forwarded-host': 'evil.example' } }), 'preview.vercel.app');
});

test('page: the real exported shell keeps its executable inline scripts byte-identical', withRuntime(async () => {
  const generated = path.join(root, 'lib/generated/reader-shell.js');
  const notFound = path.join(root, 'apps/mobile/dist/+not-found.html');
  const shell = fs.existsSync(generated) ? require(generated) : (fs.existsSync(notFound) ? fs.readFileSync(notFound, 'utf8') : FIXTURE_SHELL);
  internals.setShellLoader(() => shell);
  const backend = stubBackend({
    ag05_resolve_public_path: () => ({ json: { resolution: 'preserved_direct', http_status: 200 } }),
    ag05_public_story_document: () => ({ json: STORY_DOC })
  });
  try {
    const res = await invoke(pageUrl('/cholera-response-update/'));
    assert.equal(res.status, 200);
    assert.deepEqual(inlineScripts(res.body), inlineScripts(shell));
    assert.equal((res.body.match(/<title/g) || []).length, 1);
  } finally { backend.restore(); }
}));

// -------------------------------------------------------- resolve (in-app use)

test('resolve: redirect=json returns the alias decision as data; default keeps the real 301', withRuntime(async () => {
  const backend = stubBackend({ ag05_resolve_public_path: () => ({ json: { resolution: 'alias_redirect', http_status: 301, target_path: '/cholera-response-update/' } }) });
  try {
    const data = await invoke('/api/public?kind=resolve&redirect=json&path=' + encodeURIComponent('/old-alias/'));
    assert.equal(data.status, 200);
    assert.equal(data.headers.location, undefined);
    const body = JSON.parse(data.body);
    assert.equal(body.kind, 'route');
    assert.equal(body.routing.httpStatus, 301);
    assert.equal(body.routing.targetPath, '/cholera-response-update/');
    const real = await invoke('/api/public?kind=resolve&path=' + encodeURIComponent('/old-alias/'));
    assert.equal(real.status, 301);
    assert.equal(real.headers.location, '/cholera-response-update/');
  } finally { backend.restore(); }
}));

test('public handler stays read-only: POST is 405 and unconfigured GET makes no outbound call', async () => {
  const backend = stubBackend({});
  const saved = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  try {
    const post = await invoke('/api/public?kind=page&htpPath=%2Fx%2F', { method: 'POST' });
    assert.equal(post.status, 405);
    const get = await invoke('/api/public?action=health');
    assert.equal(get.status, 503);
    assert.equal(backend.calls.length, 0);
  } finally {
    backend.restore();
    if (saved !== undefined) process.env.SUPABASE_URL = saved;
  }
});
