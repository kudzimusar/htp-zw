'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync,spawn}=require('node:child_process');
const {trustedIp,enforceSharedLimit}=require('../../lib/paynow-distributed-rate');
const migration=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/candidates/20261102130000_ht_mvp_paynow_r5_shared_rate.sql'),'utf8');
const env={PAYNOW_RATE_HMAC_KEY:'fixture-HMAC-key-dedicated-test-1234567890123456',
 SUPABASE_URL:'https://test-project.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'fixture-service-role-not-real',VERCEL_ENV:'preview'};
const req=(ip='2001:db8::1',headers={})=>({headers:{'x-vercel-forwarded-for':ip,...headers},socket:{remoteAddress:'127.0.0.1'}});
const call=(database,sql)=>execFileSync('psql',['-h','/tmp','-p','5432','-d',database,'-v','ON_ERROR_STOP=1','-qAt'],{input:sql,encoding:'utf8'}).trim();
function concurrentSql(database,sql){
 return new Promise((resolve,reject)=>{
  const p=spawn('psql',['-h','/tmp','-p','5432','-d',database,'-v','ON_ERROR_STOP=1','-qAt']);
  let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
  p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(JSON.parse(out.trim())));
  p.stdin.end(sql);
 });
}
test('R5 shared rate hashes trusted Vercel address; ignores arbitrary client-forwarded chains',async()=>{
 assert.equal(trustedIp(req('2001:DB8::1',{'x-forwarded-for':'198.51.100.2,198.51.100.3'}),env),'2001:db8::1');
 assert.equal(trustedIp({headers:{'x-forwarded-for':'9.9.9.9'},socket:{remoteAddress:'127.0.0.1'}},{}),'127.0.0.1');
 assert.throws(()=>trustedIp(req('malicious-ip'),env),/RATE_CLIENT_IP_UNTRUSTED/);
 assert.throws(()=>trustedIp(req('198.51.100.1, 10.0.0.2'),env),/RATE_CLIENT_IP_UNTRUSTED/);
 let captured;
 const transport=async (_url,options)=>{
  captured=JSON.parse(options.body);return {ok:true,json:async()=>({allowed:true,retry_after_seconds:0})};
 };
 assert.equal((await enforceSharedLimit(req(), 'status',60,60,env,transport)).allowed,true);
 assert.match(captured.p_bucket_hash,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(captured),/2001:db8/);
 assert.equal((await enforceSharedLimit(req(),'status',60,60,env,async()=>({ok:true,json:async()=>({allowed:false,retry_after_seconds:39})}))).allowed,false);
});
test('R5 shared rate unavailable/fault fails closed; never falls back to in-memory Map',async()=>{
 await assert.rejects(enforceSharedLimit(req(),'status',60,60,{...env,PAYNOW_RATE_HMAC_KEY:''}),/RATE_CONTROL_UNAVAILABLE/);
 await assert.rejects(enforceSharedLimit(req(),'status',60,60,env,async()=>{throw Error('network timeout');}),/RATE_CONTROL_UNAVAILABLE/);
 await assert.rejects(enforceSharedLimit(req(),'status',60,60,env,async()=>({ok:true,json:async()=>({allowed:true,retry_after_seconds:'not-int'})})),/RATE_CONTROL_UNAVAILABLE/);
 await assert.rejects(enforceSharedLimit(req(),'status',60,60,env,async()=>({ok:false})),/RATE_CONTROL_UNAVAILABLE/);
 assert.equal(globalThis.__HTP_PAYNOW_RATE__,undefined);
});
test('R5 PG atomic shared limiter: 20 concurrent processes, 10 admits, restart persistence, expiry and grants',async()=>{
 const db='ht_r5_rate_'+process.pid;
 let created=false;
 try{
  call('postgres','create database '+db);created=true;
  for(const role of ['service_role','anon','authenticated']){
   if(call('postgres',"select 1 from pg_roles where rolname='"+role+"'")!=='1')
    call('postgres','create role '+role+' nologin');
  }
  call(db,migration);
  const key='f'.repeat(64),sql="select public.payment_rate_limit_take('"+key+"',10,60)::text;";
  const results=await Promise.all(Array.from({length:20},()=>concurrentSql(db,sql)));
  assert.equal(results.filter(r=>r.allowed).length,10);
  assert.equal(results.filter(r=>!r.allowed).length,10);
  assert.equal(call(db,"select attempts from public.payment_rate_windows where bucket_hash='"+key+"'"),'20');
  assert.equal(JSON.parse(call(db,sql)).allowed,false,'cold-start/process restart cannot reset shared counter');
  assert.equal(call(db,"select has_function_privilege('anon','public.payment_rate_limit_take(text,integer,integer)','EXECUTE')"),'f');
  assert.equal(call(db,"select has_function_privilege('authenticated','public.payment_rate_limit_take(text,integer,integer)','EXECUTE')"),'f');
  assert.equal(call(db,"select has_function_privilege('service_role','public.payment_rate_limit_take(text,integer,integer)','EXECUTE')"),'t');
  assert.equal(call(db,"select has_table_privilege('service_role','public.payment_rate_windows','SELECT')"),'f');
  call(db,"update public.payment_rate_windows set window_started_at=clock_timestamp()-interval '90 seconds' where bucket_hash='"+key+"'");
  const reset=JSON.parse(call(db,sql));
  assert.equal(reset.allowed,true);
  assert.equal(call(db,"select attempts from public.payment_rate_windows where bucket_hash='"+key+"'"),'1');
  assert.equal(JSON.parse(call(db,"select public.payment_rate_limit_take('"+'e'.repeat(64)+"',1,60)::text")).allowed,true);
  assert.equal(JSON.parse(call(db,"select public.payment_rate_limit_take('"+'e'.repeat(64)+"',1,60)::text")).allowed,false);
 } finally {if(created)call('postgres','drop database if exists '+db+' with (force)');}
});
