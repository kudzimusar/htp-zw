import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handlePaynowTestCallback } from '../../supabase/functions/paynow-test-callback/index.ts';

const key = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'; // Public documentation fixture.
const options = { key, supabaseUrl: 'https://bzuvntbkevvuhfhqhkua.supabase.co', serviceKey: 'x'.repeat(40) };
const pollUrl = 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b';
const entries = [['reference','HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV'],['paynowreference','1234'],['amount','1.00'],['status','Paid'],['pollurl',pollUrl]];
const signed = (items) => {
  const hash = createHash('sha512').update(items.map(([, value]) => value).join('') + key).digest('hex').toUpperCase();
  return new URLSearchParams([...items, ['hash', hash]]).toString();
};
const request = (body) => new Request('https://example.test/', { method: 'POST', body });

test('valid callback requires a matching signed provider poll before ledger update', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    if (url === pollUrl) return new Response(signed(entries), { status: 200 });
    return Response.json({ accepted: true, duplicate: false, purpose: 'PROVIDER_CONNECTIVITY_TEST' });
  };
  const response = await handlePaynowTestCallback(request(signed(entries)), { ...options, fetcher });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, accepted: true, duplicate: false });
  assert.equal(calls.length, 2);
  const record = JSON.parse(calls[1][1].body);
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
  for (const body of [signed(entries).replace('amount=1.00', 'amount=3.00'), signed(entries.map(([n, v]) => [n, n === 'status' ? 'Cancelled' : v]))]) {
    let calls = 0;
    const response = await handlePaynowTestCallback(request(signed(entries)), { ...options,
      fetcher: async () => { calls++; return new Response(body, { status: 200 }); } });
    assert.equal(response.status, 503);
    assert.equal(calls, 1);
  }
});

test('duplicate events are reported without creating a second payment', async () => {
  const rpcCalls = [];
  const fetcher = async (url) => {
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
    if (url === pollUrl) return new Response(signed(premium), { status: 200 });
    if (url.endsWith('/payment_record_paynow_status')) return Response.json({ accepted: true, purpose: 'PREMIUM_SUBSCRIPTION', internal_status: 'PAYMENT_VERIFIED', transaction_id: 'fixture' });
    return Response.json({ reconciled: true });
  };
  assert.equal((await handlePaynowTestCallback(request(signed(premium)), { ...options, fetcher })).status, 200);
  assert.match(calls[2], /payment_reconcile_premium_transaction$/);
});

test('wrong Supabase project and non-POST requests fail closed', async () => {
  assert.equal((await handlePaynowTestCallback(request(signed(entries)), { ...options, supabaseUrl: 'https://other.supabase.co' })).status, 503);
  assert.equal((await handlePaynowTestCallback(new Request('https://example.test/'), options)).status, 405);
});
