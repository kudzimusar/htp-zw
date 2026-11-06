'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('../../lib/paynow-runtime');
const commerce=require('../../api/commerce');
const ref='HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const connection='HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const cfg={
 PAYNOW_MODE:'test',PAYNOW_INTEGRATION_ID:'20637',
 PAYNOW_INTEGRATION_KEY:'fixture-key-only-'.repeat(4),
 SUPABASE_URL:'https://bzuvntbkevvuhfhqhkua.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key-'.repeat(4),
 SUPABASE_ANON_KEY:'public-fixture-key'
};
test('R3 security: missing authentication prevents privileged status lookup',async()=>{
 const original=globalThis.fetch;let sent=0;
 globalThis.fetch=async()=>{sent++;throw Error('Unauthorized network call');};
 try{
  await assert.rejects(runtime.transactionStatus(ref,cfg),/AUTHENTICATION_REQUIRED/);
  assert.equal(sent,0);
 }finally{globalThis.fetch=original;}
});
test('R3 security: foreign authenticated subscriber cannot read another customer payment',async()=>{
 const original=globalThis.fetch;
 const urls=[];
 globalThis.fetch=async(url)=>{
  const u=String(url);urls.push(u);
  if(u.includes('/auth/v1/user'))return Response.json({id:'subscriber-user-fixture'});
  if(u.includes('/rest/v1/subscribers?'))return Response.json([{id:'foreign-subscriber-123'}]);
  if(u.includes('/rest/v1/payment_transactions?')){
   assert.ok(u.includes('subscriber_id=eq.foreign-subscriber-123'));
   assert.ok(u.includes('purpose=eq.PREMIUM_SUBSCRIPTION'));
   return Response.json([]);
  }
  throw Error('Status RPC must not execute for wrong owner');
 };
 try{
  await assert.rejects(runtime.transactionStatus(ref,cfg,{accessToken:'fixture-logged-in-token'}),/PAYMENT_STATUS_NOT_FOUND/);
  assert.equal(urls.filter(x=>x.includes('/rest/v1/rpc/')).length,0);
 }finally{globalThis.fetch=original;}
});
test('R3 security: subscriber-owned status passes only on exact subscriber and purpose',async()=>{
 const original=globalThis.fetch;
 const urls=[];
 globalThis.fetch=async(url)=>{
  const u=String(url);urls.push(u);
  if(u.includes('/auth/v1/user'))return Response.json({id:'member-user'});
  if(u.includes('/rest/v1/subscribers?'))return Response.json([{id:'member-row'}]);
  if(u.includes('/rest/v1/payment_transactions?')){
   assert.ok(u.includes('subscriber_id=eq.member-row'));
   assert.ok(u.includes('merchant_reference=eq.'+ref));
   return Response.json([{id:'transaction-id'}]);
  }
  if(u.includes('/rest/v1/rpc/payment_get_paynow_transaction_status'))
   return Response.json({merchant_reference:ref,purpose:'PREMIUM_SUBSCRIPTION',internal_status:'PROVIDER_INITIATED'});
  if(u.includes('/provider_webhook_events?'))return Response.json([]);
  throw Error('Unexpected network '+u);
 };
 try{
  const status=await runtime.transactionStatus(ref,cfg,{accessToken:'fixture-member-token'});
  assert.equal(status.merchant_reference,ref);
  assert.equal(status.payment_verified,false);
  assert.equal(urls.filter(x=>x.includes('/rest/v1/rpc/')).length,1);
 }finally{globalThis.fetch=original;}
});
test('R3 security: TEST operator is limited to connectivity purpose',async()=>{
 const original=globalThis.fetch;
 let seen=false;
 globalThis.fetch=async(url)=>{
  const u=String(url);
  if(u.includes('/payment_transactions?')){
   seen=true;assert.ok(u.includes('purpose=eq.PROVIDER_CONNECTIVITY_TEST'));
   return Response.json([]);
  }
  throw Error('Unexpected unauthorized RPC');
 };
 try{
  await assert.rejects(runtime.transactionStatus(ref,cfg,{operatorAuthorized:true}),/PAYMENT_STATUS_NOT_FOUND/);
  assert.equal(seen,true);
 }finally{globalThis.fetch=original;}
});
test('R3 security: public status HTTP endpoint rejects unauthenticated access before DB request',async()=>{
 const before=globalThis.fetch;
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Status read attempted');};
 const prior=process.env.PAYNOW_MODE;
 process.env.PAYNOW_MODE='test';
 try{
  let status=0,payload='';
  await commerce({method:'GET',url:'/api/commerce?action=status&reference='+connection,headers:{host:'healthtimes-staging.vercel.app'}},
    {set statusCode(x){status=x;},get statusCode(){return status;},setHeader(){},end(x){payload=x;}});
  assert.equal(status,401);
  assert.equal(JSON.parse(payload).error,'AUTHENTICATION_REQUIRED');
  assert.equal(calls,0);
 }finally{
  globalThis.fetch=before;
  if(prior===undefined)delete process.env.PAYNOW_MODE;else process.env.PAYNOW_MODE=prior;
 }
});
