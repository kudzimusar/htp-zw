import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Load handlers
import newsroomHandler from '../api/newsroom.js';
import commsHandler from '../api/communications.js';
import commerceHandler from '../api/commerce.js';
import publicHandler from '../api/public.js';

function createServer() {
  const routes = {
    '/api/newsroom': newsroomHandler,
    '/api/communications': commsHandler,
    '/api/commerce': commerceHandler,
    '/api/public': publicHandler
  };

  return http.createServer((req, res) => {
    const pathname = req.url.split('?')[0];
    const handler = routes[pathname];
    if (handler) {
      handler(req, res);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!DOCTYPE html><html><body><h1>Not Found</h1></body></html>');
    }
  });
}

test('G3 Client Preview Fail-Closed Runtime Isolation Suite', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Force Client Preview Review Mode
  const prevEnv = process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW;
  process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW = '1';

  t.after(() => {
    server.close();
    if (prevEnv !== undefined) {
      process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW = prevEnv;
    } else {
      delete process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW;
    }
  });

  await t.test('1. Newsroom API: All operations denied fail-closed with 403 JSON', async () => {
    const testCases = [
      { method: 'POST', path: '/api/newsroom', body: '{}', desc: 'Anonymous root POST' },
      { method: 'POST', path: '/api/newsroom?action=login', body: JSON.stringify({ email: 'admin@healthtimes.co.zw', password: 'secret' }), desc: 'Login attempt' },
      { method: 'POST', path: '/api/newsroom?action=adoptSession', body: JSON.stringify({ accessToken: 'fake', refreshToken: 'fake' }), desc: 'Session adoption' },
      { method: 'POST', path: '/api/newsroom?action=transitionStory', body: JSON.stringify({ storyId: '123' }), desc: 'Story transition' },
      { method: 'POST', path: '/api/newsroom?action=createStaff', body: JSON.stringify({ email: 'eic@healthtimes.co.zw' }), desc: 'Staff creation' },
      { method: 'GET', path: '/api/newsroom?action=bootstrap', desc: 'Bootstrap GET' }
    ];

    for (const tc of testCases) {
      const res = await fetch(`${baseUrl}${tc.path}`, {
        method: tc.method,
        headers: { 'Content-Type': 'application/json' },
        body: tc.body
      });
      assert.equal(res.status, 403, `${tc.desc} must return 403`);
      const contentType = res.headers.get('content-type') || '';
      assert.match(contentType, /application\/json/, `${tc.desc} must return JSON, never HTML`);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.isolated, true);
    }
  });

  await t.test('2. Communications API: Mutating actions denied fail-closed with 403 JSON', async () => {
    const mutatingCases = [
      { method: 'POST', path: '/api/communications', body: '{}', desc: 'Anonymous root POST' },
      { method: 'POST', path: '/api/communications?action=signup', body: JSON.stringify({ email: 'reader@example.com', purpose: 'NEWSLETTER', policyVersion: '1.0', consent: true }), desc: 'Newsletter signup' },
      { method: 'POST', path: '/api/communications?action=signup', body: 'invalid-body', desc: 'Malformed newsletter signup' },
      { method: 'POST', path: '/api/communications?action=resendWebhook', body: '{}', desc: 'Resend webhook' },
      { method: 'POST', path: '/api/communications?action=brevoWebhook', body: '{}', desc: 'Brevo webhook' },
      { method: 'POST', path: '/api/communications?action=inbound', body: '{}', desc: 'Inbound email webhook' }
    ];

    for (const tc of mutatingCases) {
      const res = await fetch(`${baseUrl}${tc.path}`, {
        method: tc.method,
        headers: { 'Content-Type': 'application/json' },
        body: tc.body
      });
      assert.equal(res.status, 403, `${tc.desc} must return 403`);
      const contentType = res.headers.get('content-type') || '';
      assert.match(contentType, /application\/json/, `${tc.desc} must return JSON, never HTML`);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.isolated, true);
    }

    // Provider health GET should return safe isolated status
    const healthRes = await fetch(`${baseUrl}/api/communications?action=providerHealth`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.ok, true);
    assert.equal(healthData.previewIsolated, true);
    assert.equal(healthData.providers.resend, 'disabled-in-preview');
  });

  await t.test('3. Commerce API: All checkout/callback/mutation actions blocked with 403 JSON', async () => {
    const commerceCases = [
      { method: 'POST', path: '/api/commerce', body: '{}', desc: 'Anonymous root POST' },
      { method: 'POST', path: '/api/commerce?action=checkout', body: JSON.stringify({ idempotencyKey: 'test' }), desc: 'Checkout initiation' },
      { method: 'POST', path: '/api/commerce?action=callback', body: 'test-callback', desc: 'Paynow callback' },
      { method: 'POST', path: '/api/commerce?action=webhook', body: 'test-webhook', desc: 'Paynow webhook' },
      { method: 'POST', path: '/api/commerce?action=connectivity', body: '{}', desc: 'Test operator connectivity' },
      { method: 'POST', path: '/api/commerce?action=poll', body: '{}', desc: 'Test operator poll' },
      { method: 'POST', path: '/api/commerce?action=internal-test-poll', body: '{}', desc: 'Internal test poll' },
      { method: 'GET', path: '/api/commerce?action=status&reference=HT-PREM-123', desc: 'Status inspection' }
    ];

    for (const tc of commerceCases) {
      const res = await fetch(`${baseUrl}${tc.path}`, {
        method: tc.method,
        headers: { 'Content-Type': 'application/json' },
        body: tc.body
      });
      assert.equal(res.status, 403, `${tc.desc} must return 403`);
      const contentType = res.headers.get('content-type') || '';
      assert.match(contentType, /application\/json/, `${tc.desc} must return JSON, never HTML`);
      const data = await res.json();
      assert.equal(data.error, 'PREVIEW_MUTATION_BLOCKED');
      assert.equal(data.entitlementGranted, false);
    }

    // Safe general GET readiness check
    const readinessRes = await fetch(`${baseUrl}/api/commerce`);
    assert.equal(readinessRes.status, 200);
    const readinessData = await readinessRes.json();
    assert.equal(readinessData.ready, false);
    assert.equal(readinessData.mode, 'preview-isolated');
    assert.equal(readinessData.paynowStatus, 'disabled-in-preview');
  });

  await t.test('4. Public API: Read-only contract strictly enforced', async () => {
    // POST must return 405 Method Not Allowed in JSON
    const postRes = await fetch(`${baseUrl}/api/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 1 })
    });
    assert.equal(postRes.status, 405);
    const contentType = postRes.headers.get('content-type') || '';
    assert.match(contentType, /application\/json/, 'POST /api/public must return JSON');
    const postData = await postRes.json();
    assert.equal(postData.error, 'METHOD_NOT_ALLOWED');
  });

  await t.test('5. Request Routing Integrity: Zero API routes fall through to HTML', async () => {
    const apiEndpoints = [
      '/api/newsroom',
      '/api/newsroom?action=login',
      '/api/communications',
      '/api/communications?action=signup',
      '/api/commerce',
      '/api/commerce?action=checkout',
      '/api/public'
    ];

    for (const ep of apiEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const contentType = res.headers.get('content-type') || '';
      assert.match(contentType, /application\/json/, `${ep} must return application/json`);
      const text = await res.text();
      assert.doesNotMatch(text, /<!DOCTYPE/i, `${ep} must never fall through to HTML`);
      assert.doesNotMatch(text, /<html/i, `${ep} must never contain html tags`);
    }
  });

  await t.test('6. Non-Preview Mode: Normal handling is preserved when preview review is inactive', async () => {
    process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW = '0';
    delete process.env.HEALTHTIMES_CLIENT_PREVIEW;

    // In normal mode, POST /api/newsroom without CSRF returns standard 403 CSRF error, not PREVIEW_MUTATION_BLOCKED
    const nrRes = await fetch(`${baseUrl}/api/newsroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const nrData = await nrRes.json();
    assert.equal(nrData.error, 'Request integrity check failed.');
    assert.equal(nrData.isolated, undefined);

    // In normal mode, POST /api/commerce returns standard 400 UNSUPPORTED_COMMERCE_ACTION, not PREVIEW_MUTATION_BLOCKED
    const commRes = await fetch(`${baseUrl}/api/commerce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const commData = await commRes.json();
    assert.equal(commData.error, 'UNSUPPORTED_COMMERCE_ACTION');
    assert.equal(commData.isolated, undefined);
  });
});
