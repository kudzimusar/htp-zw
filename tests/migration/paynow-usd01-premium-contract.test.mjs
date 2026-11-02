import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handlePaynowTestCallback } from '../../supabase/functions/paynow-test-callback/index.ts';

const KEY='3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'; // Paynow public documentation fixture.
const REF='HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const POLL='https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b';
const CONFIG={key:KEY,supabaseUrl:'https://bzuvntbkevvuhfhqhkua.supabase.co',serviceKey:'fixture-not-a-server-secret-'.repeat(2)};
function signed(fields){
 const hash=createHash('sha512').update(fields.map(([,v])=>v).join('')+KEY).digest('hex').toUpperCase();
 return new URLSearchParams([...fields,['hash',hash]]).toString();
}
function fields(status='Paid',currency='USD',amount='5.00'){
 const result=[['reference',REF],['paynowreference','fixture-provider-123'],['amount',amount],['status',status],['pollurl',POLL]];
 if(currency!==null) result.push(['currency',currency]);
 return result;
}
function request(raw) {return new Request('https://fake.test/callback',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:raw});}
function harness({providerStatus='Paid', currency='USD', amount='5.00', matchedAmount='5.00', outcome='verified', duplicate=false, expectedRef=REF}={}){
 const message=signed(fields(providerStatus,currency,amount));
 const calls=[];
 const fetcher=async (url,init)=>{
  const u=String(url);
  calls.push({url:u,body:init?.body||null});
  if(u.includes('/payment_transactions?')) return Response.json(expectedRef===REF
    ? [{id:'fixture-premium-transaction',purpose:'PREMIUM_SUBSCRIPTION',expected_amount:matchedAmount,currency:'USD',poll_url:POLL,provider_reference:null}]
    : []);
  if(u===POLL)return new Response(message);
  if(u.includes('/provider_webhook_events?'))return Response.json([{id:'ignored-evidence-only'}]);
  if(u.endsWith('/payment_record_paynow_status')) {
   if(outcome==='mismatch')return Response.json({accepted:false,code:'CURRENCY_MISMATCH'});
   return Response.json({accepted:true,duplicate,purpose:'PREMIUM_SUBSCRIPTION',
      internal_status:providerStatus==='Paid'?'PAYMENT_VERIFIED':providerStatus==='Cancelled'?'CANCELLED':'FAILED',
      transaction_id:'fixture-premium-transaction'});
  }
  if(u.endsWith('/payment_reconcile_premium_transaction')) return Response.json({
   reconciled:true,replayed:duplicate,entitlement_changed:!duplicate
  });
  throw Error('Unapproved external fetch in fixture: '+u);
 };
 return {message,calls,fetcher};
}

test('synthetic signed USD 5.00 Premium Paid status reaches exactly one reconciliation request',async()=>{
 const h=harness();
 const response=await handlePaynowTestCallback(request(h.message),{...CONFIG,fetcher:h.fetcher});
 const output=await response.json();
 assert.equal(response.status,200);
 assert.equal(output.accepted,true);
 assert.equal(output.provider_currency_verified,true);
 assert.equal(output.reconciliation_eligible,true);
 const record=h.calls.filter(x=>x.url.endsWith('/payment_record_paynow_status'));
 const reconcile=h.calls.filter(x=>x.url.endsWith('/payment_reconcile_premium_transaction'));
 assert.equal(record.length,1);
 assert.equal(reconcile.length,1);
 const params=JSON.parse(record[0].body);
 assert.equal(params.p_amount,'5.00');
 assert.equal(params.p_currency,'USD');
 assert.equal(params.p_merchant_reference,REF);
 // This is an offline contract mock, NOT provider USD settlement or a real entitlement grant.
});

test('synthetic duplicate Premium Paid status delegates to existing idempotent reconciliation authority',async()=>{
 const h=harness({duplicate:true});
 const output=await handlePaynowTestCallback(request(h.message),{...CONFIG,fetcher:h.fetcher});
 assert.equal(output.status,200);
 assert.equal((await output.json()).duplicate,true);
 assert.equal(h.calls.filter(x=>x.url.endsWith('/payment_reconcile_premium_transaction')).length,1);
 // The authoritative SQL idempotency/unique-transaction behavior is tested separately.
});

test('Premium amount discrepancy cannot poll, record or grant entitlement',async()=>{
 const h=harness({amount:'4.00'});
 const response=await handlePaynowTestCallback(request(h.message),{...CONFIG,fetcher:h.fetcher});
 assert.equal(response.status,409);
 assert.equal((await response.json()).error,'AMOUNT_MISMATCH');
 assert.equal(h.calls.some(x=>x.url===POLL),false);
 assert.equal(h.calls.some(x=>x.url.includes('/rpc/')),false);
});

test('signed ZWG or missing currency cannot reconcile the USD 5.00 Premium plan',async()=>{
 for(const currency of ['ZWG',null]){
  const h=harness({currency,outcome:'mismatch'});
  const res=await handlePaynowTestCallback(request(h.message),{...CONFIG,fetcher:h.fetcher});
  const data=await res.json();
  assert.equal(res.status,200);
  assert.equal(data.accepted,false);
  assert.equal(h.calls.some(x=>x.url.endsWith('/payment_reconcile_premium_transaction')),false);
  if(currency===null){
   assert.equal(data.provider_currency_verified,false);
   assert.equal(h.calls.some(x=>x.url.includes('/provider_webhook_events?')),true);
   assert.equal(h.calls.some(x=>x.url.endsWith('/payment_record_paynow_status')),false);
  }
 }
});

test('signed cancelled and failed Premium statuses never request entitlement reconciliation',async()=>{
 for(const providerStatus of ['Cancelled','Failed']){
  const h=harness({providerStatus});
  const res=await handlePaynowTestCallback(request(h.message),{...CONFIG,fetcher:h.fetcher});
  assert.equal(res.status,200);
  assert.equal(h.calls.filter(x=>x.url.endsWith('/payment_record_paynow_status')).length,1);
  assert.equal(h.calls.some(x=>x.url.endsWith('/payment_reconcile_premium_transaction')),false);
 }
});

test('unrecognised merchant reference cannot access or reconcile another Premium intent',async()=>{
 const h=harness({expectedRef:'not-the-reference'});
 const res=await handlePaynowTestCallback(request(h.message),{...CONFIG,fetcher:h.fetcher});
 assert.equal(res.status,404);
 assert.equal(h.calls.some(x=>x.url.includes('/rpc/')),false);
});
