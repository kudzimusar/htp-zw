'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const r3=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/candidates/20261102090000_ht_mvp_paynow_r3_live_usd_attested_contract.sql'),'utf8');
const r5=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/candidates/20261102131000_ht_mvp_paynow_r5_identity_bound_usd_evidence.sql'),'utf8');
function psql(db,sql){return execFileSync('psql',['-h','/tmp','-p','5432','-d',db,'-v','ON_ERROR_STOP=1','-qAt'],{input:sql,encoding:'utf8'}).trim();}
const id={capture:'11111111-1111-4111-8111-111111111111',
 source:'22222222-2222-4222-8222-222222222222',
 security:'33333333-3333-4333-8333-333333333333',
 finance:'44444444-4444-4444-8444-444444444444',
 extra:'55555555-5555-4555-8555-555555555555'};
const reference='HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV';
function rejected(db,sql,re){assert.throws(()=>psql(db,sql),re);}
test('R5 source document SHA is computed from bytes; named R3 reviewers cannot self-attest or approve without JWT-bound roles',()=>{
 const db='ht_r5_evidence_'+process.pid,bytes=Buffer.from('Synthetic fixture for a controlled isolated unit test; this is NOT a Paynow USD receipt.','utf8');
 const hash=crypto.createHash('sha256').update(bytes).digest('hex'),hex=bytes.toString('hex');
 let made=false;
 try{
  psql('postgres','create database '+db);made=true;
  for(const role of ['service_role','anon','authenticated']){
   if(psql('postgres',"select 1 from pg_roles where rolname='"+role+"'")!=='1')psql('postgres','create role '+role+' nologin');
  }
  psql(db,[
   'create schema if not exists auth;',
   "create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
   "create table public.payment_transactions(id uuid primary key default gen_random_uuid(),provider text,purpose text,merchant_reference text unique,currency text,expected_amount numeric(18,2),reported_amount numeric(18,2),provider_reference text,poll_url text,provider_status text,internal_status text,verification_authority text,provider_metadata jsonb default '{}'::jsonb,confirmed_at timestamptz,updated_at timestamptz, constraint payment_transactions_verification_authority_check check (verification_authority in('NO_VERIFICATION_AUTHORITY','TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION','PAYNOW_TEST_SHA512_VERIFIED')));",
   "create table public.provider_webhook_events(id uuid primary key default gen_random_uuid(),provider text,provider_event_id text,event_type text,signature_valid boolean,payload_hash text,payload jsonb,status text,transaction_id uuid,merchant_reference text,provider_reference text,reported_amount numeric(18,2),reported_currency text,verification_authority text,sanitized_metadata jsonb,processed_at timestamptz, constraint provider_webhook_events_provider_event_id_key unique(provider,provider_event_id),constraint provider_webhook_events_verification_authority_check check (verification_authority in('NO_VERIFICATION_AUTHORITY','TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION','PAYNOW_TEST_SHA512_VERIFIED')));"
  ].join('\n'));
  psql(db,r3);psql(db,r5);
  psql(db,"insert into public.payment_transactions(provider,purpose,merchant_reference,currency,expected_amount,poll_url,internal_status,verification_authority) values('paynow','PREMIUM_SUBSCRIPTION','"+reference+"','USD',5.00,'https://www.paynow.co.zw/Interface/CheckPayment/?guid=fixture','PROVIDER_INITIATED','NO_VERIFICATION_AUTHORITY');");
  psql(db,"insert into public.payment_live_usd_attestations(transaction_id,merchant_reference,provider_reference,integration_id,amount,charge_currency,settlement_currency,provider_evidence_source,provider_evidence_sha256,provider_evidence_reference,security_reviewer,finance_reviewer,security_approved_at,finance_approved_at) select id,merchant_reference,'PN-FIXTURE-001','9999',5.00,'USD','USD','PAYNOW_PROVIDER_STATEMENT','"+hash+"','DOCUMENTED_FIXTURE','TEXT_ONLY_SECURITY','TEXT_ONLY_FINANCE',now(),now() from public.payment_transactions;");
  const status=()=>JSON.parse(psql(db,"select public.payment_record_paynow_live_status('"+reference+"','PN-FIXTURE-001',5.00,null,'Paid','https://www.paynow.co.zw/Interface/CheckPayment/?guid=fixture',repeat('a',64),repeat('b',64),'{\"signature_verified\":true,\"poll_confirmed\":true,\"provider_mode\":\"LIVE\",\"integration_id\":\"9999\"}'::jsonb)::text"));
  assert.equal(status().code,'AUTHENTICATED_EVIDENCE_AND_DUAL_REVIEW_REQUIRED');
  assert.equal(psql(db,'select count(*) from public.provider_webhook_events;'),'0');
  rejected(db,"select public.payment_live_usd_capture_evidence((select id from public.payment_live_usd_attestations limit 1),decode('"+hex+"','hex'))",/EVIDENCE_CAPTURE_AUTHORITY_REQUIRED/);
  for(const role of ['capture','source','security','finance']){
   psql(db,"insert into public.payment_live_usd_review_assignments(user_id,duty) values('"+id[role]+"','"+(role==='capture'?'CAPTURE':role.toUpperCase())+"')");
  }
  const evidence=psql(db,"select set_config('request.jwt.claim.sub','"+id.capture+"',false); select public.payment_live_usd_capture_evidence((select id from public.payment_live_usd_attestations limit 1),decode('"+hex+"','hex'));").split('\n').at(-1);
  assert.match(evidence,/^[a-f0-9-]{36}$/);
  assert.equal(psql(db,"select sha256 from public.payment_live_usd_evidence_objects;"),hash);
  rejected(db,"select set_config('request.jwt.claim.sub','"+id.capture+"',false); select public.payment_live_usd_approve_evidence('"+evidence+"','SECURITY','"+hash+"');",/INDEPENDENT_REVIEWER_AUTHORITY_REQUIRED/);
  rejected(db,"select set_config('request.jwt.claim.sub','"+id.security+"',false); select public.payment_live_usd_approve_evidence('"+evidence+"','FINANCE','"+hash+"');",/INDEPENDENT_REVIEWER_AUTHORITY_REQUIRED/);
  rejected(db,"select set_config('request.jwt.claim.sub','"+id.security+"',false); select public.payment_live_usd_approve_evidence('"+evidence+"','SECURITY',repeat('f',64));",/REVIEWER_DOCUMENT_HASH_MISMATCH/);
  for(const role of ['source','security','finance']){
   const result=psql(db,"select set_config('request.jwt.claim.sub','"+id[role]+"',false); select public.payment_live_usd_approve_evidence('"+evidence+"','"+role.toUpperCase()+"','"+hash+"');").split('\n').at(-1);
   assert.equal(JSON.parse(result).accepted,true);
  }
  assert.equal(psql(db,"select count(distinct actor_id) from public.payment_live_usd_evidence_approvals;"),'3');
  assert.equal(psql(db,"select has_table_privilege('service_role','public.payment_live_usd_evidence_objects','SELECT');"),'f');
  assert.equal(psql(db,"select has_function_privilege('anon','public.payment_live_usd_approve_evidence(uuid,text,text)','EXECUTE');"),'f');
  rejected(db,"delete from public.payment_live_usd_evidence_approvals;",/USD_EVIDENCE_APPEND_ONLY/);
  assert.equal(psql(db,'select count(*) from public.provider_webhook_events;'),'0','no monetary change from role approvals alone');
 }finally{if(made)psql('postgres','drop database if exists '+db+' with (force)');}
});
