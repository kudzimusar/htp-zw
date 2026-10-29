import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handlePaynowTestCallback, classifyPollTransport } from '../../supabase/functions/paynow-test-callback/index.ts';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { verifyForm } = require('../../lib/paynow-protocol');
const { formFromRequestBody } = require('../../lib/paynow-runtime');

const key = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'; // Public documentation fixture.
const options = { key, supabaseUrl: 'https://bzuvntbkevvuhfhqhkua.supabase.co', serviceKey: 'x'.repeat(40) };
const pollUrl = 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b';
// Synthetic currency field exercises the mismatch barrier. Paynow's documented
// status format does not guarantee this field, and missing currency fails closed.
const entries = [['reference','HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV'],['paynowreference','1234'],['amount','1.00'],['status','Paid'],['pollurl',pollUrl],['currency','USD']];
const signed = (items) => {
  const hash = createHash('sha512').update(items.map(([, value]) => value).join('') + key).digest('hex').toUpperCase();
  return new URLSearchParams([...items, ['hash', hash]]).toString();
};
const request = (body) => new Request('https://example.test/', { method: 'POST', headers: {'content-type':'application/x-www-form-urlencoded'}, body });
const tx = (purpose='PROVIDER_CONNECTIVITY_TEST') => ({ id:'fixture', purpose, expected_amount:1, currency:'USD', poll_url:pollUrl, provider_reference:null });

test('valid callback requires a matching signed provider poll before ledger update', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    if (url.includes('/payment_transactions?')) return Response.json([tx()]);
    if (url === pollUrl) { assert.equal(init.body, ''); return new Response(signed(entries), { status: 200 }); }
    return Response.json({ accepted: true, duplicate: false, purpose: 'PROVIDER_CONNECTIVITY_TEST' });
  };
  const response = await handlePaynowTestCallback(request(signed(entries)), { ...options, fetcher });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.accepted, true);
  assert.equal(result.provider_signature_verified, true);
  assert.equal(result.provider_currency_verified, true);
  assert.equal(result.reconciliation_eligible, false);
  assert.equal(calls.length, 3);
  const record = JSON.parse(calls[2][1].body);
  assert.equal(record.p_merchant_reference, entries[0][1]);
  assert.equal(record.p_currency, 'USD');
  assert.equal(record.p_amount, '1.00');
});

test('bad signature, duplicate fields, unsafe URL and oversized form never call providers or ledger', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error('unexpected'); };
  const invalid = signed(entries).replace('amount=1.00', 'amount=2.00');
  const unsafe = signed(entries.map(([name, value]) => [name, name === 'pollurl' ? 'https://www.paynow.co.zw.evil.test/' : value]));
  for (const form of [invalid, signed(entries) + '&status=Paid', unsafe, 'a=' + 'x'.repeat(17000)]) {
    assert.notEqual((await handlePaynowTestCallback(request(form), { ...options, fetcher })).status, 200);
  }
  assert.equal(calls, 0);
});

test('poll signature and status disagreement prevent ledger writes', async () => {
  for (const [body, expected] of [[signed(entries).replace('amount=1.00', 'amount=3.00'), 'POLL_SIGNATURE_OR_FORM_REJECTED'], [signed(entries.map(([n, v]) => [n, n === 'status' ? 'Cancelled' : v])), 'POLL_TRANSACTION_MISMATCH']]) {
    let calls = 0;
    const response = await handlePaynowTestCallback(request(signed(entries)), { ...options,
      fetcher: async (url) => { calls++; return url.includes('/payment_transactions?') ? Response.json([tx()]) : new Response(body, { status: 200 }); } });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, expected);
    assert.equal(calls, 2);
  }
});

test('poll transport failures expose only a bounded category', async () => {
  const response = await handlePaynowTestCallback(request(signed(entries)), { ...options,
    fetcher: async (url) => { if (url.includes('/payment_transactions?')) return Response.json([tx()]);
      throw new Error('TLS certificate failed with sensitive provider details'); } });
  const result = await response.json();
  assert.equal(result.error, 'POLL_TRANSPORT_FAILED');
  assert.equal(result.transport_category, 'TLS_CERTIFICATE');
  assert.equal(JSON.stringify(result).includes('sensitive provider details'), false);
});

test('nested transport causes retain bounded actionable categories', () => {
  for (const [message, expected] of [
    ['ECONNREFUSED', 'CONNECTION_REFUSED'], ['ECONNRESET', 'CONNECTION_RESET'],
    ['ENOTFOUND', 'DNS'], ['ETIMEDOUT', 'TIMEOUT'], ['ENETUNREACH', 'NETWORK_UNREACHABLE'],
    ['invalid peer certificate: UnknownIssuer', 'TLS_CERTIFICATE'], ['TLS handshake failed', 'TLS_NEGOTIATION']
  ]) {
    const cause = Object.assign(new Error('private diagnostic'), {code:message});
    assert.equal(classifyPollTransport(new Error('fetch failed', {cause})), expected);
  }
});

test('upstream HTTP failure is distinguished from transport failure', async () => {
  const response = await handlePaynowTestCallback(request(signed(entries)), { ...options,
    fetcher: async (url) => url.includes('/payment_transactions?') ? Response.json([tx()]) : new Response('', {status:411}) });
  const result = await response.json();
  assert.equal(result.error, 'POLL_HTTP_FAILED');
  assert.equal(result.poll_http_status, 411);
  assert.equal(result.poll_verified, false);
});

test('timeout and evidence-storage failure never acknowledge processing', async () => {
  const noCurrency = entries.filter(([name]) => name !== 'currency');
  const timeout = await handlePaynowTestCallback(request(signed(noCurrency)), {...options,
    fetcher: async (url) => { if (url.includes('/payment_transactions?')) return Response.json([tx()]);
      throw new DOMException('Timed out', 'TimeoutError'); }});
  const timeoutResult = await timeout.json();
  assert.equal(timeout.status, 503);
  assert.equal(timeoutResult.transport_category, 'TIMEOUT');
  const storageFailure = await handlePaynowTestCallback(request(signed(noCurrency)), {...options,
    fetcher: async (url) => { if (url.includes('/payment_transactions?')) return Response.json([tx()]);
      if (url === pollUrl) return new Response(signed(noCurrency));
      return new Response('', {status:503}); }});
  const storageResult = await storageFailure.json();
  assert.equal(storageFailure.status, 503);
  assert.equal(storageResult.error, 'EVENT_STORAGE_FAILED');
  assert.equal(storageResult.provider_currency_verified, false);
});

test('HTTP/1 retry follows only a reset and still requires a signed matched poll', async () => {
  const noCurrency = entries.filter(([name]) => name !== 'currency');
  let pollCalls = 0;
  let closed = false;
  const retryClient = {close: () => {closed = true;}};
  const response = await handlePaynowTestCallback(request(signed(noCurrency)), {...options,
    makeHttp1Client: () => retryClient,
    fetcher: async (url, init = {}) => {
      if (url.includes('/payment_transactions?')) return Response.json([tx()]);
      if (url === pollUrl) {
        assert.equal(init.method, 'POST'); assert.equal(init.body, ''); pollCalls++;
        if (pollCalls === 1) throw new Error('connection reset');
        assert.equal(init.client, retryClient); return new Response(signed(noCurrency));
      }
      return Response.json([{id:'event'}]);
    }});
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.poll_transport, 'HTTP1_RETRY');
  assert.equal(result.poll_verified, true);
  assert.equal(result.provider_currency_verified, false);
  assert.equal(result.reconciliation_eligible, false);
  assert.equal(pollCalls, 2); assert.equal(closed, true);
});

test('HTTP/1 retry failure does not store or acknowledge evidence', async () => {
  let polls = 0;
  const response = await handlePaynowTestCallback(request(signed(entries)), {...options,
    makeHttp1Client: () => ({close: () => {}}),
    fetcher: async (url) => { if (url.includes('/payment_transactions?')) return Response.json([tx()]);
      polls++; throw new Error('connection reset'); }});
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.equal(result.retry_category, 'CONNECTION_RESET');
  assert.equal(result.poll_verified, false);
  assert.equal(polls, 2);
});

test('a signed provider message without currency cannot become a verified USD payment', async () => {
  const withoutCurrency = entries.filter(([name]) => name !== 'currency');
  let calls = 0;
  const response = await handlePaynowTestCallback(request(signed(withoutCurrency)), { ...options,
    fetcher: async (url) => { calls++; if (url.includes('/payment_transactions?')) return Response.json([tx()]);
      if (url === pollUrl) return new Response(signed(withoutCurrency), { status: 200 });
      return Response.json([{id:'event'}]); } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider_signature_verified, true);
  assert.equal(body.provider_transaction_matched, true);
  assert.equal(body.provider_amount_verified, true);
  assert.equal(body.provider_currency_verified, false);
  assert.equal(body.reconciliation_eligible, false);
  assert.equal(body.event_stored, true);
  assert.equal(calls, 3);
});

test('duplicate events are reported without creating a second payment', async () => {
  const rpcCalls = [];
  const fetcher = async (url) => {
    if (url.includes('/payment_transactions?')) return Response.json([tx()]);
    if (url === pollUrl) return new Response(signed(entries), { status: 200 });
    rpcCalls.push(url);
    return Response.json({ accepted: true, duplicate: true, purpose: 'PROVIDER_CONNECTIVITY_TEST' });
  };
  const response = await handlePaynowTestCallback(request(signed(entries)), { ...options, fetcher });
  assert.equal((await response.json()).duplicate, true);
  assert.equal(rpcCalls.length, 1);
  assert.match(rpcCalls[0], /payment_record_paynow_status$/);
});

test('only verified Premium status proceeds to the established entitlement reconciliation', async () => {
  const premium = entries.map(([n, v]) => [n, n === 'reference' ? 'HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV' : v]);
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    if (url.includes('/payment_transactions?')) return Response.json([tx('PREMIUM_SUBSCRIPTION')]);
    if (url === pollUrl) return new Response(signed(premium), { status: 200 });
    if (url.endsWith('/payment_record_paynow_status')) return Response.json({ accepted: true, purpose: 'PREMIUM_SUBSCRIPTION', internal_status: 'PAYMENT_VERIFIED', transaction_id: 'fixture' });
    return Response.json({ reconciled: true });
  };
  assert.equal((await handlePaynowTestCallback(request(signed(premium)), { ...options, fetcher })).status, 200);
  assert.match(calls[3], /payment_reconcile_premium_transaction$/);
});

test('wrong Supabase project and non-POST requests fail closed', async () => {
  assert.equal((await handlePaynowTestCallback(request(signed(entries)), { ...options, supabaseUrl: 'https://other.supabase.co' })).status, 503);
  assert.equal((await handlePaynowTestCallback(new Request('https://example.test/'), options)).status, 405);
});

test('callback rejects wrong content type, transaction identity and amount before polling', async () => {
  const wrongType = new Request('https://example.test/', { method: 'POST', headers: {'content-type':'application/json'}, body:signed(entries) });
  assert.equal((await handlePaynowTestCallback(wrongType, options)).status, 415);
  for (const [transaction, expected] of [
    [{...tx(), provider_reference:'different'}, 'TRANSACTION_MISMATCH'],
    [{...tx(), poll_url:'https://wrong.example/'}, 'TRANSACTION_MISMATCH'],
    [{...tx(), expected_amount:2}, 'AMOUNT_MISMATCH']
  ]) {
    let calls = 0;
    const response = await handlePaynowTestCallback(request(signed(entries)), {...options, fetcher:async () => { calls++; return Response.json([transaction]); }});
    assert.equal((await response.json()).error, expected);
    assert.equal(calls, 1);
  }
});

test('mismatched signed currency is not reported verified or eligible', async () => {
  const zwg = entries.map(([n,v]) => [n, n === 'currency' ? 'ZWG' : v]);
  const response = await handlePaynowTestCallback(request(signed(zwg)), {...options, fetcher:async (url) => {
    if (url.includes('/payment_transactions?')) return Response.json([tx()]);
    if (url === pollUrl) return new Response(signed(zwg));
    return Response.json({accepted:false, purpose:'PROVIDER_CONNECTIVITY_TEST'});
  }});
  const result = await response.json();
  assert.equal(result.provider_signature_verified, true);
  assert.equal(result.provider_currency_verified, false);
  assert.equal(result.reconciliation_eligible, false);
});

test('Vercel and Edge use the same ordered decoded-value signature rules', async () => {
  const unicodeEntries = [...entries, ['additionalinfo', 'Médecin + café']];
  const valid = signed(unicodeEntries);
  const parts = valid.split('&');
  const alteredOrder = [parts[1], parts[0], ...parts.slice(2)].join('&');
  const scenarios = [
    ['valid unicode', valid, key, true],
    ['tampered amount', valid.replace('amount=1.00','amount=2.00'), key, false],
    ['tampered status', valid.replace('status=Paid','status=Failed'), key, false],
    ['modified field order', alteredOrder, key, false],
    ['missing hash', parts.filter((part) => !part.startsWith('hash=')).join('&'), key, false],
    ['invalid hash', valid.replace(/hash=[^&]+/, 'hash=not-a-hash'), key, false],
    ['duplicate field', valid + '&status=Paid', key, false],
    ['wrong key', valid, 'wrong-key-for-testing-only-123456789', false],
    ['malformed escape', valid + '&extra=%ZZ', key, false],
    ['invalid encoded utf8', valid + '&extra=%FF', key, false],
    ['oversized', 'a=' + 'x'.repeat(17000), key, false]
  ];
  for (const [label, body, activeKey, expected] of scenarios) {
    let vercelValid = false;
    try { verifyForm(body, activeKey); vercelValid = true; } catch {}
    const edge = await handlePaynowTestCallback(request(body), { ...options, key: activeKey,
      fetcher: async () => Response.json([]) });
    const edgeBody = await edge.json();
    assert.equal(vercelValid, expected, label);
    assert.equal(edgeBody.provider_signature_verified === true, expected, label);
  }
  assert.throws(() => formFromRequestBody({status:['Paid','Failed']}), /PAYNOW_FORM_INVALID/);
});

test('unverified-currency callback replay stores one evidence identity without payment mutation', async () => {
  const withoutCurrency = entries.filter(([name]) => name !== 'currency');
  const stored = new Map();
  let writes = 0;
  const fetcher = async (url, init = {}) => {
    if (url.includes('/payment_transactions?')) return Response.json([tx()]);
    if (url === pollUrl) return new Response(signed(withoutCurrency), { status: 200 });
    assert.match(url, /provider_webhook_events/);
    writes++;
    const event = JSON.parse(init.body);
    assert.equal(event.signature_valid, true);
    assert.equal(event.verification_authority, 'NO_VERIFICATION_AUTHORITY');
    assert.equal(event.reported_currency, null);
    assert.equal(event.status, 'ignored');
    if (stored.has(event.provider_event_id)) return Response.json([]);
    stored.set(event.provider_event_id, event);
    return Response.json([{id:'event'}]);
  };
  const first = await (await handlePaynowTestCallback(request(signed(withoutCurrency)), {...options, fetcher})).json();
  const second = await (await handlePaynowTestCallback(request(signed(withoutCurrency)), {...options, fetcher})).json();
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(stored.size, 1);
  assert.equal(writes, 2);
  assert.equal(second.reconciliation_eligible, false);
});
