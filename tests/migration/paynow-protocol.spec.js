'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  hashValues, parseForm, verifyForm, trustedUrl, buildInitiation, verifyInitiation
} = require('../../lib/paynow-protocol');
const runtime = require('../../lib/paynow-runtime');
const commerceApi = require('../../api/commerce');

const exampleKey = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'; // Public Paynow documentation fixture only.

test('official outbound SHA-512 fixture and field ordering', () => {
  const entries = [
    ['id', '1201'], ['reference', 'TEST REF'], ['amount', '99.99'],
    ['additionalinfo', 'A test ticket transaction'],
    ['returnurl', 'http://www.google.com/search?q=returnurl'],
    ['resulturl', 'http://www.google.com/search?q=resulturl'], ['status', 'Message']
  ];
  assert.equal(hashValues(entries, exampleKey), '2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689');
  assert.notEqual(hashValues([...entries].reverse(), exampleKey), hashValues(entries, exampleKey));
});

test('official inbound response fixture uses decoded values in actual wire order', () => {
  const response = 'status=Ok&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413&paynowreference=9510&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D';
  assert.equal(verifyForm(response, exampleKey).paynowreference, '9510');
  assert.equal(verifyInitiation(response, exampleKey).ok, true);
  assert.throws(() => verifyForm(response.replace('9510&hash', '9511&hash'), exampleKey), /PAYNOW_HASH_MISMATCH/);
});

test('status-update wire order verifies and rejects missing or altered hash', () => {
  const entries = [
    ['reference', 'ABC123'], ['paynowreference', '123456'], ['amount', '1.00'],
    ['status', 'Awaiting Delivery'],
    ['pollurl', 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b']
  ];
  const form = new URLSearchParams(entries);
  form.append('hash', hashValues(entries, exampleKey));
  const status = form.toString();
  assert.equal(verifyForm(status, exampleKey).status, 'Awaiting Delivery');
  assert.throws(() => verifyForm(status.replace('&hash=', '&ignored='), exampleKey), /PAYNOW_HASH_MISSING_OR_INVALID/);
  assert.throws(() => verifyForm(status.replace('amount=1.00', 'amount=2.00'), exampleKey), /PAYNOW_HASH_MISMATCH/);
});

test('duplicate fields and unsafe Paynow URLs fail closed', () => {
  assert.throws(() => parseForm('status=Ok&Status=Paid'), /PAYNOW_FORM_DUPLICATE/);
  for (const url of [
    'http://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
    'https://www.paynow.co.zw.evil.test/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
    'https://www.paynow.co.zw/interface/trace',
    'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b&next=https://evil.test'
  ]) assert.throws(() => trustedUrl(url, 'poll'));
});

test('signed initiation sends canonical amount and never includes a key in fields', () => {
  const body = buildInitiation({
    id: 1201, reference: 'HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV', amount: '1.00',
    returnUrl: 'https://staging.healthtimes.co.zw/payment/return',
    resultUrl: 'https://staging.healthtimes.co.zw/api/commerce?action=callback',
    merchantTrace: '01ARZ3NDEKTSV4RRFFQ69G5FAV', key: exampleKey
  });
  const fields=verifyForm(body, exampleKey);
  assert.equal(fields.amount, '1.00');
  assert.equal(fields.merchanttrace, '01ARZ3NDEKTSV4RRFFQ69G5FAV');
  assert.equal(body.includes(exampleKey), false);
});

test('callback and trusted poll must agree on every authority field', () => {
  const base={reference:'HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV',paynowreference:'P1',amount:'1.00',status:'Paid',pollurl:'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b'};
  assert.equal(runtime.sameStatusAuthority(base,{...base}),true);
  assert.equal(runtime.sameStatusAuthority(base,{...base,amount:'5.00'}),false);
  assert.equal(runtime.sameStatusAuthority(base,{...base,status:'Created'}),false);
  assert.equal(runtime.sameStatusAuthority(base,{...base,paynowreference:'P2'}),false);
});

test('readiness gates and public offer stay separate', () => {
  const cfg=runtime.config({PAYNOW_INTEGRATION_ID:'20637',PAYNOW_INTEGRATION_KEY:exampleKey,PAYNOW_MODE:'test',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'x'.repeat(40)});
  assert.equal(cfg.credentialsPresent,true);
  assert.equal(cfg.ready,true);
  const closed=commerceApi._internals.publicAuthority({credentials_present:true,provider_authority_certified:false,checkout_implementation_ready:true,checkout_available:false});
  assert.equal(closed.paymentGatewayMigrationComplete,false);
  assert.equal(closed.currentProvider,null);
  const open=commerceApi._internals.publicAuthority({credentials_present:true,provider_authority_certified:true,checkout_implementation_ready:true,checkout_available:true});
  assert.equal(open.currentPrice,'5.00');
  assert.equal(open.currentCurrency,'USD');
});

test('verified connectivity alone cannot certify authority or enable checkout', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => [{ id: 'fixture' }] });
  try {
    const env = { PAYNOW_INTEGRATION_ID: '20637', PAYNOW_INTEGRATION_KEY: exampleKey,
      PAYNOW_MODE: 'test', SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40) };
    const closed = await runtime.readiness(env);
    assert.equal(closed.provider_authority_certified, false);
    assert.equal(closed.checkout_implementation_ready, false);
    assert.equal(closed.checkout_available, false);
    const certified = await runtime.readiness({ ...env, PAYNOW_PROVIDER_AUTHORITY_CERTIFIED: '1' });
    assert.equal(certified.provider_authority_certified, true);
    assert.equal(certified.checkout_available, false);
  } finally { globalThis.fetch = original; }
});

test('commerce errors never echo provider or secret material', () => {
  assert.equal(commerceApi._internals.safeError(new Error('PAYNOW_INITIATION_REJECTED:Error:sensitive provider detail')),'PAYNOW_INITIATION_REJECTED');
  assert.equal(commerceApi._internals.safeError(new Error('bad detail from provider')),'PAYNOW_REQUEST_FAILED');
});

test('invalid public status references are rejected before any backend request', async () => {
  await assert.rejects(() => runtime.transactionStatus('HT-PREM-user@example.com', {}), /MERCHANT_REFERENCE_INVALID/);
});

test('operator TEST scenarios are bounded and idempotency-safe', () => {
  for (const scenario of ['connectivity', 'success', 'cancel', 'failure', 'delayed']) {
    assert.equal(runtime.normalizeConnectivityScenario(scenario.toUpperCase()), scenario);
  }
  assert.throws(() => runtime.normalizeConnectivityScenario('live'), /PAYNOW_TEST_SCENARIO_INVALID/);
  assert.throws(() => runtime.normalizeConnectivityScenario('customer-payment'), /PAYNOW_TEST_SCENARIO_INVALID/);
});

test('operator connectivity and poll endpoints fail closed without a separate secret', async () => {
  const invoke = async (action) => {
    let statusCode = 0;
    let payload = '';
    await commerceApi(
      { method: 'POST', url: `/api/commerce?action=${action}`, headers: {
        host: 'healthtimes-staging.vercel.app',
        'x-healthtimes-unit': runtime.UNIT_ID
      } },
      { set statusCode(value) { statusCode = value; }, get statusCode() { return statusCode; },
        setHeader() {}, end(value) { payload = value; } }
    );
    return { statusCode, body: JSON.parse(payload) };
  };
  assert.equal((await invoke('connectivity')).statusCode, 403);
  assert.equal((await invoke('poll')).statusCode, 403);
});
