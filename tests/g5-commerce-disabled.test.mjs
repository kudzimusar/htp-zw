// HT-MVP-PUBLIC-LAUNCH-01-G4/G5: with no Paynow configuration the commerce API
// cannot start a checkout, grant access, or contact the provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const commerce = require('../api/commerce.js');
const PAYNOW_KEYS = Object.keys(process.env).filter(key => key.startsWith('PAYNOW_'));

async function invoke(method, url, body) {
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, getHeader(k) { return this.headers[k.toLowerCase()]; }, end(chunk) { this.body = chunk == null ? '' : String(chunk); } };
  const req = {
    method,
    url,
    headers: { host: 'healthtimes.co.zw', origin: 'https://healthtimes.co.zw', 'content-type': 'application/json' },
    body,
    on(event, fn) { if (event === 'data' && body) fn(Buffer.from(JSON.stringify(body))); if (event === 'end') fn(); return this; }
  };
  await commerce(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null };
}

test('default deployment: checkout is refused, no checkout URL, no entitlement, no provider call', async () => {
  const saved = Object.fromEntries(PAYNOW_KEYS.map(key => [key, process.env[key]]));
  for (const key of PAYNOW_KEYS) delete process.env[key];
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => { calls.push(String(input)); return new Response('{}', { status: 500 }); };
  try {
    const checkout = await invoke('POST', '/api/commerce?action=checkout', { idempotencyKey: 'g5-launch-check' });
    assert.ok(checkout.status >= 400, 'checkout must not succeed');
    assert.equal(checkout.json.checkoutUrl ?? null, null);
    assert.equal(checkout.json.entitlementGranted, false);
    assert.notEqual(checkout.json.status, 'redirect-required');
    const authority = await invoke('GET', '/api/commerce');
    assert.equal(authority.status, 200);
    assert.notEqual(authority.json.status, 'available', 'public authority must not advertise checkout');
    assert.equal(calls.filter(url => /paynow/i.test(url)).length, 0, 'no Paynow request');
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of Object.entries(saved)) process.env[key] = value;
  }
});
