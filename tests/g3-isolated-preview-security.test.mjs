import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Import source handlers
import sourceNewsroom from '../api/newsroom.js';
import sourceComms from '../api/communications.js';
import sourceCommerce from '../api/commerce.js';
import sourcePublic from '../api/public.js';

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

test('G3 Comprehensive Fail-Closed Preview Isolation & Adversarial Security Suite', async (t) => {
  const handlers = {
    '/api/newsroom': sourceNewsroom,
    '/api/communications': sourceComms,
    '/api/commerce': sourceCommerce,
    '/api/public': sourcePublic
  };

  const server = createServer(handlers);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Global instrumentation: Track any external outbound fetch calls
  let outboundFetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    // If request is to any local test server, forward to real fetch
    if (urlStr.startsWith('http://127.0.0.1:') || urlStr.startsWith('http://localhost:')) {
      return originalFetch(url, options);
    }
    // Any other outbound call is an external side-effect!
    outboundFetchCalls.push({ url: urlStr, method: options.method || 'GET' });
    if (urlStr.includes('paynow.co.zw') || urlStr.includes('brevo.com') || urlStr.includes('resend.com') || urlStr.includes('supabase.co')) {
      throw new Error(`CRITICAL_SIDE_EFFECT_LEAK: Denied endpoint made outbound request to ${urlStr}`);
    }
    return new Response(JSON.stringify({ mock: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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

  function resetState() {
    outboundFetchCalls = [];
    delete process.env.HEALTHTIMES_OPERATIONS_MUTATION_AUTHORITY;
    delete process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW;
    delete process.env.HEALTHTIMES_CLIENT_PREVIEW;
  }

  await t.test('1. Deny-by-default under all misconfiguration states (Missing, 0, Unexpected)', async (t) => {
    const misconfigStates = [
      { name: 'Missing / undefined flags', setup: () => { resetState(); } },
      { name: 'Flag set to 0', setup: () => { resetState(); process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW = '0'; } },
      { name: 'Flag set to unexpected string', setup: () => { resetState(); process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW = 'foobar'; process.env.HEALTHTIMES_CLIENT_PREVIEW = 'disabled'; } },
      { name: 'Preview flag set to 1', setup: () => { resetState(); process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW = '1'; } }
    ];

    for (const state of misconfigStates) {
      await t.test(`State: ${state.name}`, async () => {
        state.setup();

        // 1. Newsroom POST must be blocked with 403 JSON
        const nrRes = await fetch(`${baseUrl}/api/newsroom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        assert.equal(nrRes.status, 403);
        assert.match(nrRes.headers.get('content-type') || '', /application\/json/);
        const nrData = await nrRes.json();
        assert.equal(nrData.error, 'PREVIEW_MUTATION_BLOCKED');
        assert.equal(nrData.isolated, true);

        // 2. Communications POST must be blocked with 403 JSON
        const comRes = await fetch(`${baseUrl}/api/communications?action=signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com' }) });
        assert.equal(comRes.status, 403);
        assert.match(comRes.headers.get('content-type') || '', /application\/json/);
        const comData = await comRes.json();
        assert.equal(comData.error, 'PREVIEW_MUTATION_BLOCKED');

        // 3. Commerce POST must be blocked with 403 JSON
        const commRes = await fetch(`${baseUrl}/api/commerce?action=checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        assert.equal(commRes.status, 403);
        assert.match(commRes.headers.get('content-type') || '', /application\/json/);
        const commData = await commRes.json();
        assert.equal(commData.error, 'PREVIEW_MUTATION_BLOCKED');

        // 4. Zero outbound calls occurred
        assert.equal(outboundFetchCalls.length, 0, `Zero outbound calls allowed in state: ${state.name}`);
      });
    }
  });

  await t.test('2. Inert test canaries in environment: No privileged secret leak or usage', async () => {
    resetState();
    // Inject canary credentials mimicking accidental staging env presence
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'canary_service_role_secret_do_not_use';
    process.env.PAYNOW_INTEGRATION_KEY = 'canary_paynow_integration_key_do_not_use';
    process.env.RESEND_API_KEY = 'canary_resend_api_key_do_not_use';
    process.env.BREVO_API_KEY = 'canary_brevo_api_key_do_not_use';
    process.env.PAYNOW_TEST_OPERATOR_TOKEN = 'canary_test_operator_token_do_not_use';

    // Firing mutating calls across all endpoints
    const endpoints = [
      { url: '/api/newsroom?action=login', body: '{"email":"admin@healthtimes.co.zw","password":"test"}' },
      { url: '/api/communications?action=signup', body: '{"email":"reader@test.co.zw","consent":true}' },
      { url: '/api/commerce?action=checkout', body: '{"idempotencyKey":"test"}' }
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ep.body
      });
      assert.equal(res.status, 403);
      const text = await res.text();
      assert.doesNotMatch(text, /canary/, 'Response must never leak canary values');
    }

    // Assert that zero outbound requests were made despite canaries being in process.env
    assert.equal(outboundFetchCalls.length, 0, 'Zero network side-effects executed with canary secrets present');
  });

  await t.test('3. Full Newsroom Action Matrix: Anonymous, malformed & privileged actions refused', async () => {
    resetState();
    const newsroomActions = [
      { method: 'POST', path: '/api/newsroom', body: '{}', desc: 'Anonymous root POST' },
      { method: 'POST', path: '/api/newsroom', body: 'invalid-json{{{', desc: 'Malformed body' },
      { method: 'POST', path: '/api/newsroom?action=login', body: '{"email":"admin@healthtimes.co.zw","password":"pwd"}', desc: 'Login attempt' },
      { method: 'POST', path: '/api/newsroom?action=adoptSession', body: '{"accessToken":"mock","refreshToken":"mock"}', desc: 'Adopt session' },
      { method: 'POST', path: '/api/newsroom?action=recover', body: '{"email":"admin@healthtimes.co.zw"}', desc: 'Password recovery' },
      { method: 'POST', path: '/api/newsroom?action=createStory', body: '{"title":"Test"}', desc: 'Create story' },
      { method: 'POST', path: '/api/newsroom?action=transitionStory', body: '{"storyId":"uuid-1"}', desc: 'Transition story' },
      { method: 'POST', path: '/api/newsroom?action=createStaff', body: '{"email":"rep@test.co.zw"}', desc: 'Create staff' },
      { method: 'POST', path: '/api/newsroom?action=changeRole', body: '{"staffId":"uuid-2","role":"editor"}', desc: 'Change role' },
      { method: 'POST', path: '/api/newsroom?action=revokeStaff', body: '{"staffId":"uuid-2"}', desc: 'Revoke staff' },
      { method: 'GET', path: '/api/newsroom?action=bootstrap', desc: 'Bootstrap GET' }
    ];

    for (const action of newsroomActions) {
      const res = await fetch(`${baseUrl}${action.path}`, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body
      });
      assert.equal(res.status, 403, `${action.desc} must return 403`);
      const data = await res.json();
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.isolated, true);
    }
    assert.equal(outboundFetchCalls.length, 0);
  });

  await t.test('4. Full Communications Action Matrix: Mutations denied, safe health inspection', async () => {
    resetState();
    const commsActions = [
      { method: 'POST', path: '/api/communications', body: '{}', desc: 'Anonymous root POST' },
      { method: 'POST', path: '/api/communications?action=signup', body: '{"email":"reader@healthtimes.co.zw","purpose":"NEWSLETTER","policyVersion":"1.0","consent":true}', desc: 'Newsletter signup' },
      { method: 'POST', path: '/api/communications?action=signup', body: 'not-json', desc: 'Malformed signup' },
      { method: 'POST', path: '/api/communications?action=resendWebhook', body: '{"type":"email.delivered"}', desc: 'Resend webhook' },
      { method: 'POST', path: '/api/communications?action=brevoWebhook', body: '{"event":"delivered"}', desc: 'Brevo webhook' },
      { method: 'POST', path: '/api/communications?action=inbound', body: '{"from":"test@test.com"}', desc: 'Inbound email webhook' },
      { method: 'POST', path: '/api/communications?action=reply', body: '{"threadId":"1","bodyText":"hello"}', desc: 'Staff email reply' }
    ];

    for (const action of commsActions) {
      const res = await fetch(`${baseUrl}${action.path}`, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body
      });
      assert.equal(res.status, 403, `${action.desc} must return 403`);
      const data = await res.json();
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
    }

    // Safe health check GET must return 200 with disabled providers
    const healthRes = await fetch(`${baseUrl}/api/communications?action=providerHealth`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.ok, true);
    assert.equal(healthData.previewIsolated, true);
    assert.equal(healthData.providers.resend, 'disabled-by-default');
    assert.equal(healthData.providers.brevo, 'disabled-by-default');
    assert.equal(outboundFetchCalls.length, 0);
  });

  await t.test('5. Full Commerce Action Matrix: Checkout, callback, webhooks & status inspection', async () => {
    resetState();
    const commerceActions = [
      { method: 'POST', path: '/api/commerce', body: '{}', desc: 'Anonymous root POST' },
      { method: 'POST', path: '/api/commerce?action=checkout', body: '{"idempotencyKey":"test"}', desc: 'Checkout initiation' },
      { method: 'POST', path: '/api/commerce?action=checkout', body: 'invalid-body', desc: 'Malformed checkout' },
      { method: 'POST', path: '/api/commerce?action=callback', body: 'test-callback-payload', desc: 'Paynow callback' },
      { method: 'POST', path: '/api/commerce?action=webhook', body: 'test-webhook-payload', desc: 'Paynow webhook' },
      { method: 'POST', path: '/api/commerce?action=poll', body: '{"reference":"HT-123"}', desc: 'Operator poll' },
      { method: 'POST', path: '/api/commerce?action=connectivity', body: '{}', desc: 'Connectivity test' },
      { method: 'POST', path: '/api/commerce?action=internal-test-poll', body: '{"reference":"HT-123"}', desc: 'Internal test poll' },
      { method: 'GET', path: '/api/commerce?action=status&reference=HT-PREM-123', desc: 'Privileged status inspection' }
    ];

    for (const action of commerceActions) {
      const res = await fetch(`${baseUrl}${action.path}`, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body
      });
      assert.equal(res.status, 403, `${action.desc} must return 403`);
      const data = await res.json();
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.entitlementGranted, false);
    }

    // Safe readiness GET must report preview-isolated and disabled
    const readinessRes = await fetch(`${baseUrl}/api/commerce`);
    assert.equal(readinessRes.status, 200);
    const readinessData = await readinessRes.json();
    assert.equal(readinessData.ready, false);
    assert.equal(readinessData.mode, 'preview-isolated');
    assert.equal(readinessData.paynowStatus, 'disabled-by-default');
    assert.equal(outboundFetchCalls.length, 0);
  });

  await t.test('6. Public Reader API: Method restrictions & read-only enforcement', async () => {
    resetState();

    // Mutating methods must return 405 Method Not Allowed in JSON
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const res = await fetch(`${baseUrl}/api/public`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ try: 'mutate' })
      });
      assert.equal(res.status, 405, `${method} must return 405`);
      assert.match(res.headers.get('content-type') || '', /application\/json/);
      const data = await res.json();
      assert.equal(data.error, 'METHOD_NOT_ALLOWED');
    }
  });

  await t.test('7. Unknown API routes: Return safe JSON 404, never falling through to HTML', async () => {
    resetState();
    const unknownRoutes = [
      '/api/unknown',
      '/api/newsroom/admin',
      '/api/internal/secret',
      '/api/v1/auth'
    ];

    for (const route of unknownRoutes) {
      for (const method of ['GET', 'POST']) {
        const res = await fetch(`${baseUrl}${route}`, { method });
        assert.equal(res.status, 404);
        assert.match(res.headers.get('content-type') || '', /application\/json/);
        const text = await res.text();
        assert.doesNotMatch(text, /<!DOCTYPE/i, 'Must never fall through to HTML doctype');
        assert.doesNotMatch(text, /<html/i, 'Must never contain HTML elements');
      }
    }
  });

  await t.test('8. Packaged .vercel/output Serverless Functions: Verifying compiled output', async () => {
    resetState();
    const outputFuncDir = path.join(process.cwd(), '.vercel/output/functions/api');
    if (!fs.existsSync(outputFuncDir)) {
      console.log('Skipping output function check: .vercel/output not yet generated');
      return;
    }

    const compiledHandlers = {
      newsroom: require(path.join(outputFuncDir, 'newsroom.func/api/newsroom.js')),
      comms: require(path.join(outputFuncDir, 'communications.func/api/communications.js')),
      commerce: require(path.join(outputFuncDir, 'commerce.func/api/commerce.js')),
      pub: require(path.join(outputFuncDir, 'public.func/api/public.js'))
    };

    const compiledServer = createServer({
      '/api/newsroom': compiledHandlers.newsroom,
      '/api/communications': compiledHandlers.comms,
      '/api/commerce': compiledHandlers.commerce,
      '/api/public': compiledHandlers.pub
    });

    await new Promise((resolve) => compiledServer.listen(0, resolve));
    const cPort = compiledServer.address().port;
    const cUrl = `http://127.0.0.1:${cPort}`;

    try {
      // Test packaged newsroom handler
      const cNr = await fetch(`${cUrl}/api/newsroom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(cNr.status, 403);
      const cNrData = await cNr.json();
      assert.equal(cNrData.error, 'PREVIEW_MUTATION_BLOCKED');

      // Test packaged comms handler
      const cCom = await fetch(`${cUrl}/api/communications?action=signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(cCom.status, 403);

      // Test packaged commerce handler
      const cComm = await fetch(`${cUrl}/api/commerce?action=checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(cComm.status, 403);

      // Test packaged public handler
      const cPub = await fetch(`${cUrl}/api/public`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(cPub.status, 405);
    } finally {
      compiledServer.close();
    }
  });

  await t.test('9. Operational authority preservation in non-preview mode', async () => {
    resetState();
    // Enable explicit operational authority without preview restrictions
    process.env.HEALTHTIMES_OPERATIONS_MUTATION_AUTHORITY = 'active';

    // In non-preview authorized mode, requests reach operational CSRF/rate/credential check
    const nrRes = await fetch(`${baseUrl}/api/newsroom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const nrData = await nrRes.json();
    // It fails on CSRF integrity check, NOT on PREVIEW_MUTATION_BLOCKED
    assert.equal(nrData.error, 'Request integrity check failed.');
    assert.equal(nrData.isolated, undefined);

    const commRes = await fetch(`${baseUrl}/api/commerce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const commData = await commRes.json();
    // It reaches action parser and reports unsupported action, NOT PREVIEW_MUTATION_BLOCKED
    assert.equal(commData.error, 'UNSUPPORTED_COMMERCE_ACTION');
    assert.equal(commData.isolated, undefined);
  });
});
