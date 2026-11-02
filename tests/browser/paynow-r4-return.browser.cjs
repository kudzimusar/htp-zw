'use strict';
// R4 actual Chromium browser tests against the exported Expo web UI.
// Only the *provider transport* is routed to deterministic fixtures;
// the real React/Expo payment-return page is loaded, hydrated and interacted with.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const dist=path.resolve(__dirname,'../../apps/mobile/dist');
const refPremium='HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const refConn='HT-CONN-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
if(!fs.existsSync(dist)) throw Error('Expo web export missing. Run npm run export:web in apps/mobile.');
const root=path.resolve(dist);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 let p=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403);res.end();return;}
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)||!fs.statSync(p).isFile()){
   const route=path.join(root,url.pathname.replace(/^\/+/, '')+'.html');
   p=fs.existsSync(route)?route:path.join(root,'index.html');
 }
 if(!fs.existsSync(p)){res.writeHead(404);res.end('No web export entry');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});
 fs.createReadStream(p).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const outcomes=[];
 async function scenario(label,reference,response,expected,{expectCalls=1,button=null}={}){
  const page=await browser.newPage();
  const calls=[];
  try{
   await page.route('**/api/commerce?action=status**',async route=>{
    calls.push(route.request().url());
    await route.fulfill({status:response.status||200,contentType:'application/json',
      body:JSON.stringify(response.body||{})});
   });
   await page.goto(origin+'/payment/return?reference='+encodeURIComponent(reference),{waitUntil:'domcontentloaded',timeout:40000});
   await page.getByText(expected,{exact:false}).first().waitFor({timeout:30000});
   if(button)assert.equal(await page.getByRole('button',{name:button}).count(),1);
   assert.equal(calls.length,expectCalls,label+' unexpected server calls');
   outcomes.push({scenario:label,passed:true,requests:calls.length});
  }finally{await page.close();}
 }
 try{
  await scenario('connectivity_return_no_operator_token',refConn,{status:401},'Only an authorized HealthTimes test operator',{expectCalls:0});
  await scenario('signed_out_premium',refPremium,{status:401,body:{error:'AUTHENTICATION_REQUIRED'}},'Sign in to your HealthTimes account',{button:'Sign in to HealthTimes'});
  await scenario('foreign_subscriber_forbidden',refPremium,{status:404,body:{error:'PAYMENT_STATUS_NOT_FOUND'}},'not available to your account',{button:null});
  await scenario('authenticated_simulated_paid_nonmonetary',refPremium,{status:200,body:{test_outcome:'TEST_SIMULATED_PAID',payment_verified:false}},'No money moved and no Premium subscription was activated.');
  await scenario('authenticated_cancelled',refPremium,{status:200,body:{internal_status:'CANCELLED'}},'payment was cancelled.');
  await scenario('authenticated_failed',refPremium,{status:200,body:{internal_status:'FAILED'}},'could not complete the payment.');
  await scenario('rate_limit',refPremium,{status:429,body:{error:'RATE_LIMITED'}},'Too many status checks.');
  process.stdout.write(JSON.stringify({browser:'Chromium',realExpoPage:true,mockedProviderTransport:true,results:outcomes})+'\n');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
