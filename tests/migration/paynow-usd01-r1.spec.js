'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { hashValues } = require('../../lib/paynow-protocol');
const runtime = require('../../lib/paynow-runtime');

const key = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'; // Public Paynow documentation fixture, never merchant credential.
const reference = 'HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const cfg = Object.freeze({
  PAYNOW_MODE: 'test',
  PAYNOW_INTEGRATION_ID: '20637',
  PAYNOW_INTEGRATION_KEY: key,
  SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'not-a-real-secret-'.repeat(3),
  VERCEL_GIT_COMMIT_SHA: 'usd01-no-real-payment'
});
const origin = 'https://candidate.vercel.app';
const migration = path.resolve(__dirname, '../../supabase/migrations/20261102080000_ht_mvp_paynow_usd01_ambiguous_initiation_safety.sql');

function signed(fields) {
  return new URLSearchParams([...fields, ['hash', hashValues(fields, key)]]).toString();
}

async function simulatedInitiation(behavior, {secondClaim = false} = {}) {
  const originalFetch = globalThis.fetch;
  const rpcCalls = [];
  let providerCalls = 0;
  let claimed = 0;
  let recordCalls = 0;
  const intent = {
    transaction_id: '11111111-1111-4111-8111-111111111111',
    merchant_reference: reference,
    expected_amount: '1.00',
    currency: 'USD',
    reconciliation_status: 'NOT_ELIGIBLE',
    accounting_status: 'NOT_APPLICABLE'
  };
  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.includes('/rest/v1/rpc/')) {
      const name = target.split('/').pop();
      rpcCalls.push(name);
      if (name === 'payment_create_intent') return Response.json(intent);
      if (name === 'payment_claim_paynow_initiation') {
        claimed++;
        if (claimed > 1 && secondClaim) return Response.json({ claimed: false, internal_status: 'PROVIDER_PENDING' });
        return Response.json({ claimed: true, merchant_trace: '01ARZ3NDEKTSV4RRFFQ69G5FAV' });
      }
      if (name === 'payment_record_paynow_initiation') {
        recordCalls++;
        if (behavior === 'record_error') return new Response('unavailable', {status: 503});
        return Response.json({ recorded: true });
      }
      if (name === 'payment_release_paynow_initiation') return Response.json(null);
      throw new Error('Unexpected RPC ' + name);
    }
    if (target === 'https://www.paynow.co.zw/interface/initiatetransaction') {
      providerCalls++;
      if (behavior === 'timeout') throw new Error('ETIMEDOUT_SIMULATED');
      if (behavior === 'signed_rejection') return new Response(signed([['Status','Error'],['Error','Invalid amount']]));
      if (behavior === 'http_error') return new Response('gateway unavailable', {status: 503});
      if (behavior === 'invalid_signature') return new Response('Status=Ok&Hash=123');
      const fields = [
        ['Status','Ok'],
        ['BrowserUrl','https://www.paynow.co.zw/Payment/ConfirmPayment/1169'],
        ['PollUrl','https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b']
      ];
      return new Response(signed(fields));
    }
    throw new Error('No external network is authorized in this fixture: ' + target);
  };
  try {
    await assert.rejects(runtime.initiateConnectivity({origin,scenario:'connectivity',env:cfg}));
    if (secondClaim) await assert.rejects(
      runtime.initiateConnectivity({origin,scenario:'connectivity',env:cfg}), /PAYNOW_INITIATION_IN_PROGRESS/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  return {rpcCalls,providerCalls,recordCalls};
}

test('ambiguous timeout never releases provider initiation or retries on duplicate intent', async () => {
  const result=await simulatedInitiation('timeout',{secondClaim:true});
  assert.equal(result.providerCalls,1);
  assert.equal(result.rpcCalls.filter(n=>n==='payment_release_paynow_initiation').length,0);
});

test('HTTP error and invalid signed reply remain ambiguous and cannot release the original reference', async () => {
  for(const behavior of ['http_error','invalid_signature']) {
    const result=await simulatedInitiation(behavior);
    assert.equal(result.providerCalls,1);
    assert.equal(result.rpcCalls.filter(n=>n==='payment_release_paynow_initiation').length,0);
  }
});

test('verified Paynow Status=Error permits only the explicit rejection release path', async () => {
  const result=await simulatedInitiation('signed_rejection');
  assert.equal(result.providerCalls,1);
  assert.deepEqual(result.rpcCalls.filter(n=>n==='payment_release_paynow_initiation'),['payment_release_paynow_initiation']);
});

test('verified provider Ok followed by database failure cannot reopen intent', async () => {
  const result=await simulatedInitiation('record_error');
  assert.equal(result.recordCalls,1);
  assert.equal(result.rpcCalls.filter(n=>n==='payment_release_paynow_initiation').length,0);
});

test('migration forbids five-minute automatic claim reset and arbitrary release codes', () => {
  const sql=fs.readFileSync(migration,'utf8');
  assert.match(sql,/create or replace function public\.payment_claim_paynow_initiation/);
  assert.match(sql,/create or replace function public\.payment_release_paynow_initiation/);
  assert.doesNotMatch(sql,/initiated_at\s*<\s*now\(\)\s*-\s*interval/i);
  assert.match(sql,/p_failure_code is distinct from 'PAYNOW_INITIATION_REJECTED'/);
  assert.match(sql,/PAYNOW_AMBIGUOUS_INITIATION_CANNOT_RELEASE/);
  assert.match(sql,/revoke all on function public\.payment_claim_paynow_initiation\(text\) from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.payment_claim_paynow_initiation\(text\) to service_role/);
});

test('USD amount/currency barrier and Premium reconciliation authority remain unchanged',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../../lib/paynow-runtime.js'),'utf8');
  const edge=fs.readFileSync(path.resolve(__dirname,'../../supabase/functions/paynow-test-callback/index.ts'),'utf8');
  assert.match(source,/PAYNOW_CURRENCY_UNVERIFIED/);
  assert.match(source,/p_client_supplied_currency: 'USD'/);
  assert.match(source,/payment_reconcile_premium_transaction/);
  assert.match(edge,/currency_verified: false/);
  assert.match(edge,/reconciliation_eligible: false/);
  assert.match(edge,/payment_record_paynow_status/);
  assert.doesNotMatch(source,/PAYNOW_MODE\s*=\s*'live'/);
});
