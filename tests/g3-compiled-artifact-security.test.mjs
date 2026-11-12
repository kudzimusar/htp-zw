import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, '.vercel/output');
const MANIFEST_PATH = path.join(ROOT_DIR, '.vercel/package-manifest.json');
const OUTPUT_FUNC_DIR = path.join(OUTPUT_DIR, 'functions/api');
const STATIC_DIR = path.join(OUTPUT_DIR, 'static');

function createServer(handlers) {
  return http.createServer((req, res) => {
    const pathname = req.url.split('?')[0];
    const handler = handlers[pathname];
    if (handler) {
      handler(req, res);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(JSON.stringify({ ok: false, error: 'ROUTE_NOT_FOUND', path: pathname }));
    }
  });
}

test('G3 Compiled Vercel Output Function Security & Integrity Suite (DEF-G3-05)', async (t) => {
  // Real Artifact Presence Invariant: This suite MUST NOT skip if .vercel/output is missing.
  // Missing compiled output artifact is a critical failure.
  assert.ok(fs.existsSync(OUTPUT_DIR), `[DEF-G3-05 FATAL] .vercel/output does not exist at ${OUTPUT_DIR}`);
  assert.ok(fs.existsSync(MANIFEST_PATH), `[DEF-G3-05 FATAL] .vercel/package-manifest.json does not exist at ${MANIFEST_PATH}`);
  assert.ok(fs.existsSync(OUTPUT_FUNC_DIR), `[DEF-G3-05 FATAL] functions/api directory missing in .vercel/output`);
  assert.ok(fs.existsSync(STATIC_DIR), `[DEF-G3-05 FATAL] static directory missing in .vercel/output`);

  // Require compiled function modules directly from .vercel/output
  const newsroomHandlerPath = path.join(OUTPUT_FUNC_DIR, 'newsroom.func/api/newsroom.js');
  const commsHandlerPath = path.join(OUTPUT_FUNC_DIR, 'communications.func/api/communications.js');
  const commerceHandlerPath = path.join(OUTPUT_FUNC_DIR, 'commerce.func/api/commerce.js');
  const publicHandlerPath = path.join(OUTPUT_FUNC_DIR, 'public.func/api/public.js');

  assert.ok(fs.existsSync(newsroomHandlerPath), `Missing compiled handler: ${newsroomHandlerPath}`);
  assert.ok(fs.existsSync(commsHandlerPath), `Missing compiled handler: ${commsHandlerPath}`);
  assert.ok(fs.existsSync(commerceHandlerPath), `Missing compiled handler: ${commerceHandlerPath}`);
  assert.ok(fs.existsSync(publicHandlerPath), `Missing compiled handler: ${publicHandlerPath}`);

  const compiledHandlers = {
    newsroom: require(newsroomHandlerPath),
    comms: require(commsHandlerPath),
    commerce: require(commerceHandlerPath),
    pub: require(publicHandlerPath)
  };

  const server = createServer({
    '/api/newsroom': compiledHandlers.newsroom,
    '/api/communications': compiledHandlers.comms,
    '/api/commerce': compiledHandlers.commerce,
    '/api/public': compiledHandlers.pub
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Global outbound fetch interceptor: Any external network call is a catastrophic leak
  let outboundFetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.startsWith('http://127.0.0.1:') || urlStr.startsWith('http://localhost:')) {
      return originalFetch(url, options);
    }
    outboundFetchCalls.push({ url: urlStr, method: options.method || 'GET' });
    throw new Error(`CRITICAL_EXTERNAL_LEAK: Compiled function made outbound request to ${urlStr}`);
  };

  const originalEnv = { ...process.env };

  t.after(() => {
    server.close();
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  // 1. Packaged Newsroom Function Verification
  await t.test('1. Compiled newsroom.func rejects mutations fail-closed with 403 PREVIEW_MUTATION_BLOCKED', async () => {
    outboundFetchCalls = [];
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
      const res = await fetch(`${baseUrl}/api/newsroom`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_story', title: 'Tampered Story' })
      });
      assert.equal(res.status, 403, `newsroom ${method} must return 403`);
      assert.match(res.headers.get('content-type') || '', /application\/json/);
      const data = await res.json();
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.isolated, true);
    }
    assert.equal(outboundFetchCalls.length, 0, 'Zero external calls from newsroom');
  });

  // 2. Packaged Communications Function Verification
  await t.test('2. Compiled communications.func rejects signups/webhooks fail-closed with 403', async () => {
    outboundFetchCalls = [];
    const res = await fetch(`${baseUrl}/api/communications?action=signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    assert.equal(res.status, 403);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
    assert.equal(data.isolated, true);
    assert.equal(outboundFetchCalls.length, 0, 'Zero external calls from communications');
  });

  // 3. Packaged Commerce Function Verification
  await t.test('3. Compiled commerce.func rejects checkout/callbacks/webhooks fail-closed with 403', async () => {
    outboundFetchCalls = [];
    const actions = ['checkout', 'poll', 'status', 'paynow_webhook'];
    for (const action of actions) {
      const res = await fetch(`${baseUrl}/api/commerce?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium_annual' })
      });
      assert.equal(res.status, 403, `commerce action=${action} must return 403`);
      assert.match(res.headers.get('content-type') || '', /application\/json/);
      const data = await res.json();
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.isolated, true);
    }
    assert.equal(outboundFetchCalls.length, 0, 'Zero external calls from commerce');
  });

  // 4. Packaged Public Reader API Verification
  await t.test('4. Compiled public.func enforces read-only contract (405 on POST, valid JSON on GET)', async () => {
    outboundFetchCalls = [];
    // POST must be rejected with 405 Method Not Allowed
    const postRes = await fetch(`${baseUrl}/api/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(postRes.status, 405);

    // GET with unknown or missing action
    const getRes = await fetch(`${baseUrl}/api/public?action=health`, { method: 'GET' });
    assert.match(getRes.headers.get('content-type') || '', /application\/json/);

    assert.equal(outboundFetchCalls.length, 0, 'Zero external calls from public');
  });

  // 5. Canary Secrets Resilience Proof
  await t.test('5. Canary secrets injected in process.env are never accessed or leaked', async () => {
    outboundFetchCalls = [];
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'canary_service_role_secret_compiled_proof';
    process.env.PAYNOW_INTEGRATION_KEY = 'canary_paynow_secret_compiled_proof';
    process.env.RESEND_API_KEY = 'canary_resend_secret_compiled_proof';
    process.env.BREVO_API_KEY = 'canary_brevo_secret_compiled_proof';

    const nrRes = await fetch(`${baseUrl}/api/newsroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_story' })
    });
    assert.equal(nrRes.status, 403);
    const nrText = await nrRes.text();
    assert.equal(nrText.includes('canary'), false, 'Response must never leak canary secrets');

    const commRes = await fetch(`${baseUrl}/api/commerce?action=checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(commRes.status, 403);
    const commText = await commRes.text();
    assert.equal(commText.includes('canary'), false, 'Response must never leak canary secrets');

    assert.equal(outboundFetchCalls.length, 0, 'Zero network calls made with canary secrets');
  });

  // 6. Config Environment Stamping Inspection
  await t.test('6. All compiled mutating bundles contain baked previewLock environment flags', () => {
    const mutatingBundles = ['newsroom.func', 'communications.func', 'commerce.func'];
    for (const b of mutatingBundles) {
      const configPath = path.join(OUTPUT_FUNC_DIR, b, '.vc-config.json');
      assert.ok(fs.existsSync(configPath), `Missing .vc-config.json in ${b}`);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.equal(config.environment?.HEALTHTIMES_PREVIEW_LOCK, '1', `${b} must have HEALTHTIMES_PREVIEW_LOCK='1'`);
      assert.equal(config.environment?.HEALTHTIMES_ARTIFACT_PROFILE, 'reader-only-preview', `${b} must have HEALTHTIMES_ARTIFACT_PROFILE='reader-only-preview'`);
    }
  });

  // 7. Static Reader Assets Integrity
  await t.test('7. Packaged static Reader assets are present and compliant', () => {
    assert.ok(fs.existsSync(path.join(STATIC_DIR, 'index.html')), 'static/index.html must exist');
    assert.ok(fs.existsSync(path.join(STATIC_DIR, 'manifest.json')), 'static/manifest.json must exist');
    assert.ok(fs.existsSync(path.join(STATIC_DIR, 'build-info.json')), 'static/build-info.json must exist');
    assert.ok(fs.existsSync(path.join(STATIC_DIR, 'sw.js')), 'static/sw.js must exist');

    const buildInfo = JSON.parse(fs.readFileSync(path.join(STATIC_DIR, 'build-info.json'), 'utf8'));
    assert.equal(buildInfo.serviceMode, 'source-parity');
    assert.equal(buildInfo.previewLocked, true);
    assert.equal(buildInfo.profile, 'reader-only-preview');
    assert.ok(buildInfo.sha && buildInfo.sha.length >= 7, 'buildInfo.sha must be valid Git SHA');
  });
});
