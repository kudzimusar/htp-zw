'use strict';
// Real Node HTTP handler/socket exercised with deterministic fake Supabase auth
// and DB transport. Not a genuine Staging subscriber sign-in.
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const commerce=require('../../api/commerce');
const paynow=require('../../lib/paynow-runtime');
const premium='HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const conn='HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const config={
 PAYNOW_MODE:'test',PAYNOW_INTEGRATION_ID:'20637',
 PAYNOW_INTEGRATION_KEY:'fixture-key-only-'.repeat(4),
 SUPABASE_URL:'https://bzuvntbkevvuhfhqhkua.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-role-secret',
 SUPABASE_ANON_KEY:'fixture-anon-pub',
 PAYNOW_RATE_HMAC_KEY:'rate-only-r5-fixture-key-123456789012345',
 PAYNOW_TEST_OPERATOR_TOKEN:'fixture-operator-token-123456789012345',
 VERCEL_ENV:'preview'
};
function request(port,ref,token,operator=false){
 return new Promise((resolve,reject)=>{
  const headers={'x-vercel-forwarded-for':'192.0.2.5',
    ...(token?{cookie:'htp_nr_access='+token}:{}),
    ...(operator?{'x-healthtimes-unit':paynow.UNIT_ID,
      'x-healthtimes-operator':config.PAYNOW_TEST_OPERATOR_TOKEN}:{})};
  http.get({hostname:'127.0.0.1',port,path:'/api/commerce?action=status&reference='+ref,headers},res=>{
   let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(body)}));
  }).on('error',reject);
 });
}
test('R5 actual HTTP handler denies anonymous/foreign/expired, preserves owner and operator purpose isolation',async()=>{
 const before={};for(const [key,value] of Object.entries(config)){before[key]=process.env[key];process.env[key]=value;}
 const fetchBefore=globalThis.fetch;let privileged=0,rateCalls=0;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.includes('/rpc/payment_rate_limit_take')){rateCalls++;return Response.json({allowed:true,retry_after_seconds:0});}
  if(u.includes('/auth/v1/user')){
   const token=String(options.headers?.Authorization||'').replace('Bearer ','');
   return token==='expired'?Response.json({message:'expired'},{status:401}):
     Response.json({id:token==='owner-a'?'auth-user-a':'auth-user-b'});
  }
  if(u.includes('/rest/v1/subscribers?'))return Response.json([{id:u.includes('auth-user-a')?'subscriber-a':'subscriber-b'}]);
  if(u.includes('/rest/v1/payment_transactions?')){
   if(u.includes('purpose=eq.PROVIDER_CONNECTIVITY_TEST'))return Response.json(u.includes(conn)?[{id:'conn-tx'}]:[]);
   if(u.includes('subscriber_id=eq.subscriber-a') && u.includes(premium))return Response.json([{id:'premium-owner-tx'}]);
   return Response.json([]);
  }
  if(u.includes('/rest/v1/rpc/payment_get_paynow_transaction_status')){
   privileged++;return Response.json({merchant_reference:premium,purpose:'PREMIUM_SUBSCRIPTION',internal_status:'PROVIDER_INITIATED'});
  }
  if(u.includes('/rest/v1/provider_webhook_events?'))return Response.json([]);
  throw Error('Unrecognized mock transport '+u);
 };
 const server=http.createServer(commerce);
 try{
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const p=server.address().port;
  assert.equal((await request(p,premium)).status,401);
  assert.equal(privileged,0);assert.equal(rateCalls,0,'anonymous should not consume shared rate slots');
  assert.equal((await request(p,premium,'expired')).status,401);
  assert.equal((await request(p,premium,'other-b')).status,404);
  assert.equal(privileged,0,'foreign actor never gets privileged RPC');
  assert.equal((await request(p,premium,'owner-a')).status,200);
  assert.equal(privileged,1);
  assert.equal((await request(p,premium,null,true)).status,404,'operator restricted to connectivity');
  assert.equal(privileged,1);
  const connection=await request(p,conn,null,true);
  assert.equal(connection.status,200);
  assert.equal(connection.body.entitlement_granted,false);
  assert.equal(privileged,2);
  assert.equal(rateCalls,5);
 }finally{
  await new Promise(done=>server.close(done));globalThis.fetch=fetchBefore;
  for(const [k,v] of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});
