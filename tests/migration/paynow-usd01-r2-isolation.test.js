'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {hashValues}=require('../../lib/paynow-protocol');
const runtime=require('../../lib/paynow-runtime');
const commerce=require('../../api/commerce');

const key='3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977'; // Paynow public documentation only.
const ref='HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const poll='https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b';
const base={PAYNOW_MODE:'test',PAYNOW_INTEGRATION_ID:'20637',PAYNOW_INTEGRATION_KEY:key,
  SUPABASE_URL:'https://bzuvntbkevvuhfhqhkua.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'x'.repeat(40)};
const liveFlags=['PAYNOW_LIVE_CODE_ENABLED','PAYNOW_LIVE_OWNER_AUTHORIZED',
  'PAYNOW_LIVE_SECURITY_APPROVED','PAYNOW_LIVE_FINANCE_APPROVED',
  'PAYNOW_LIVE_MERCHANT_USD_CERTIFIED','PAYNOW_LIVE_SETTLEMENT_CURRENCY_EVIDENCE_CONFIRMED',
  'PAYNOW_LIVE_PAYMENT_EXECUTION_AUTHORIZED','PAYNOW_LIVE_MONETARY_RPC_CERTIFIED',
  'PAYNOW_PROVIDER_AUTHORITY_CERTIFIED','PAYNOW_CHECKOUT_IMPLEMENTATION_VERIFIED','PAYNOW_CHECKOUT_PUBLIC'];
const liveEnv={...base,PAYNOW_MODE:'live',PAYNOW_LIVE_INTEGRATION_ID:'99999',
 PAYNOW_LIVE_INTEGRATION_KEY:key+'-separate-live-fixture',PAYNOW_LIVE_CALLBACK_URL:'https://healthtimes.co.zw/api/commerce?action=callback',
 PAYNOW_LIVE_RETURN_ORIGIN:'https://healthtimes.co.zw',VERCEL_ENV:'production',
 SUPABASE_URL:'https://different-project.supabase.co',
 ...Object.fromEntries(liveFlags.map(x=>[x,'1']))};
function signed(entries, signatureKey=key) {
 const v=new URLSearchParams(entries);
 v.append('hash',hashValues(entries,signatureKey));
 return v.toString();
}
const fields=(currency)=>[
 ['reference',ref],['paynowreference','424242'],['amount','1.00'],['status','Paid'],
 ['pollurl',poll],...(currency?[['currency',currency]]:[])
];

test('USD Premium product remains canonical and TEST credentials never activate commercial checkout',async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('unexpected network access in TEST readiness');};
 try {
  const ready=await runtime.readiness({...base,...Object.fromEntries(liveFlags.map(x=>[x,'1']))});
  assert.equal(ready.mode,'test');
  assert.equal(ready.checkout_available,false);
  assert.equal(ready.provider_authority_certified,false);
  assert.equal(ready.test_simulator_only,true);
  assert.equal(ready.live_authority_ready,false);
 } finally {globalThis.fetch=before;}
});

test('LIVE mode never falls back to TEST secrets or Staging, requires every approval and segregated identity',()=>{
 assert.equal(runtime.config({...base,PAYNOW_MODE:'live'}).credentialsPresent,false);
 assert.equal(runtime.config({...base,SUPABASE_URL:'https://untrusted.supabase.co'}).ready,false);
 assert.equal(runtime.config({...liveEnv,PAYNOW_LIVE_INTEGRATION_ID:base.PAYNOW_INTEGRATION_ID}).ready,false);
 assert.equal(runtime.config({...liveEnv,PAYNOW_LIVE_INTEGRATION_KEY:base.PAYNOW_INTEGRATION_KEY}).ready,false);
 assert.equal(runtime.config({...liveEnv, PAYNOW_LIVE_FINANCE_APPROVED:'0'}).ready,false);
 assert.equal(runtime.config({...liveEnv, SUPABASE_URL:base.SUPABASE_URL}).ready,false);
 assert.equal(runtime.config({...liveEnv, PAYNOW_LIVE_CALLBACK_URL:'https://attacker.example/callback'}).ready,false);
 assert.equal(runtime.config({...liveEnv, VERCEL_ENV:'preview'}).ready,false);
 assert.equal(runtime.config({...liveEnv, PAYNOW_LIVE_MONETARY_RPC_CERTIFIED:'0'}).ready,false);
 const tested=runtime.config(liveEnv);
 assert.equal(tested.liveCodeReady,true);
 assert.equal(tested.mode,'live');
 assert.notEqual(tested.key,base.PAYNOW_INTEGRATION_KEY);
 // Synthetic all-flags configuration does not constitute a deployed or authorized merchant.
});

test('TEST callback relays signed status only to isolated Edge simulation, not money RPC',async()=>{
 const orig=globalThis.fetch;const urls=[];
 const raw=signed(fields(null));
 globalThis.fetch=async(url,opts={})=>{
  urls.push(String(url));
  if(String(url)===poll)return new Response(raw);
  if(String(url)==='https://bzuvntbkevvuhfhqhkua.supabase.co/functions/v1/paynow-test-callback'){
   assert.equal(opts.body,raw);
   return Response.json({received:true,test_simulation_recorded:true,
      test_outcome:'TEST_SIMULATED_PAID',commercial_payment_verified:false,duplicate:false});
  }
  throw Error('TEST attempted unauthorized money/RPC call: '+url);
 };
 try {
  const result=await runtime.acceptCallback(raw,base);
  assert.equal(result.accepted,false);
  assert.equal(result.internal_status,'TEST_SIMULATED_PAID');
  assert.equal(result.entitlement_granted,false);
  assert.equal(urls.length,2);
 }finally{globalThis.fetch=orig;}
});

test('LIVE signed status without signed currency cannot be promoted, even if all gates are synthetically true',async()=>{
 const raw=signed(fields(null),liveEnv.PAYNOW_LIVE_INTEGRATION_KEY);
 const orig=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url)=>{
  calls++;
  if(String(url)===poll)return new Response(raw);
  throw Error('Unexpected DB/provider call: '+url);
 };
 try{
  await assert.rejects(()=>runtime.acceptCallback(raw,liveEnv),/PAYNOW_CURRENCY_UNVERIFIED/);
  assert.equal(calls,1);
 }finally{globalThis.fetch=orig;}
});

test('TEST signed status readback is never reported as verified monetary payment',async()=>{
 const old=globalThis.fetch;const queries=[];
 globalThis.fetch=async(url)=>{
  queries.push(String(url));
  if(String(url).includes('/rest/v1/rpc/payment_get_paynow_transaction_status'))
   return Response.json({merchant_reference:ref,payment_verified:false,internal_status:'PROVIDER_INITIATED'});
  if(String(url).includes('/provider_webhook_events?'))
   return Response.json([{sanitized_metadata:{test_outcome:'TEST_SIMULATED_PAID'}}]);
  throw Error('Unexpected URL '+url);
 };
 try {
  const result=await runtime.transactionStatus(ref,base);
  assert.equal(result.payment_verified,false);
  assert.equal(result.test_outcome,'TEST_SIMULATED_PAID');
  assert.equal(result.entitlement_granted,false);
  assert.equal(queries.length,2);
 } finally {globalThis.fetch=old;}
});

test('public checkout and TEST premium operation deny unauthorized operator token',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('unexpected network');};
 try{
  const replies=[];
  for(const action of ['checkout','test-premium']){
   let status=0,body='';
   await commerce({method:'POST',url:'/api/commerce?action='+action,headers:{host:'healthtimes-staging.vercel.app'}},
    {set statusCode(v){status=v;},get statusCode(){return status;},setHeader(){},end(v){body=v;}});
   replies.push([status,JSON.parse(body)]);
  }
  assert.equal(replies[0][0],503);
  assert.equal(replies[1][0],403);
  assert.equal(replies[0][1].entitlementGranted,false);
 }finally{globalThis.fetch=old;}
});

test('TEST callback source cannot call financial status or grant entitlements',()=>{
 const edge=fs.readFileSync(path.resolve(__dirname,'../../supabase/functions/paynow-test-callback/index.ts'),'utf8');
 assert.match(edge,/TEST_SIMULATED_PAID/);
 assert.match(edge,/NO_VERIFICATION_AUTHORITY/);
 assert.match(edge,/reconciliation_eligible: false/);
 assert.doesNotMatch(edge,/await rpc\("payment_record_paynow_status"/);
 assert.doesNotMatch(edge,/await rpc\("payment_reconcile_premium_transaction"/);
 const run=fs.readFileSync(path.resolve(__dirname,'../../lib/paynow-runtime.js'),'utf8');
 assert.match(run,/payment_record_paynow_live_status/);
 assert.doesNotMatch(run,/rpc\(cfg, 'payment_record_paynow_status'/);
});
