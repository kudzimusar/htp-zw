'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const migrationPath=path.resolve(__dirname,'../../supabase/migrations/candidates/20261102090000_ht_mvp_paynow_r3_live_usd_attested_contract.sql');
const candidate=fs.readFileSync(migrationPath,'utf8');
const ref='HT-PREM-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const poll='https://www.paynow.co.zw/Interface/CheckPayment/?guid=fixture';
const meta=JSON.stringify({signature_verified:true,poll_confirmed:true,provider_mode:'LIVE'});
function quote(s){return "'"+String(s).replaceAll("'","''")+"'";}
function sqlCall(o={}){
 const {amount='5.00',currency=null,status='Paid',event='a'.repeat(64),reference=ref,metaJson=meta}=o;
 return "select public.payment_record_paynow_live_status("+
 [quote(reference),quote('PN-FIXTURE-001'),amount,currency===null?'NULL':quote(currency),
  quote(status),quote(poll),quote(event),quote('b'.repeat(64)),quote(metaJson)+'::jsonb'].join(',')+");";
}
test('R3 LIVE SQL has independent USD attestation and zero application insertion authority',()=>{
 assert.match(candidate,/create table if not exists public\.payment_live_usd_attestations/);
 assert.match(candidate,/security_reviewer <> finance_reviewer/);
 assert.match(candidate,/PAYNOW_LIVE_USD_ATTESTED/);
 assert.match(candidate,/INDEPENDENT_PROVIDER_USD_ATTESTATION_REQUIRED/);
 assert.match(candidate,/revoke all on table public\.payment_live_usd_attestations from public, anon, authenticated, service_role/);
 assert.match(candidate,/grant execute on function public\.payment_record_paynow_live_status/);
 assert.match(candidate,/USD_ATTESTED_PENDING_BANK_SETTLEMENT/);
});
test('R3 LIVE currency authority: disposable database rejects no proof; attested fixture replay is idempotent',()=>{
 const db='ht_r3_paynow_'+process.pid;
 function run(database,source){
  return execFileSync('psql',['-h','/tmp','-p','5432','-d',database,'-v','ON_ERROR_STOP=1','-qAt'],{
   input:source,encoding:'utf8',stdio:['pipe','pipe','pipe']
  }).trim();
 }
 let created=false;
 try{
  assert.equal(run('postgres','select 1;'),'1');
  run('postgres','create database '+db+';');created=true;
  for(const role of ['service_role','anon','authenticated']){
    if(run('postgres',"select 1 from pg_roles where rolname='"+role+"';")!=='1')
      run('postgres','create role '+role+' nologin;');
  }
  run(db,[
   '-- Roles are created conditionally in the disposable Postgres cluster.' ,
   'create table public.payment_transactions(',
   'id uuid primary key default gen_random_uuid(),provider text not null,purpose text not null,',
   'merchant_reference text unique not null,currency text not null,expected_amount numeric(18,2) not null,',
   'reported_amount numeric(18,2),provider_reference text,poll_url text,provider_status text,',
   'internal_status text not null,verification_authority text not null,',
   "provider_metadata jsonb not null default '{}'::jsonb,",
   'confirmed_at timestamptz,updated_at timestamptz default now(),',
   'constraint payment_transactions_verification_authority_check check(',
   "verification_authority in ('NO_VERIFICATION_AUTHORITY','PAYNOW_TEST_SHA512_VERIFIED','TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION')));",
   'create table public.provider_webhook_events(',
   'id uuid primary key default gen_random_uuid(), provider text not null,provider_event_id text not null,',
   'event_type text,signature_valid boolean,payload_hash text,payload jsonb,status text,transaction_id uuid,',
   'merchant_reference text,provider_reference text,reported_amount numeric(18,2),reported_currency text,',
   'verification_authority text,sanitized_metadata jsonb,processed_at timestamptz,',
   'constraint provider_webhook_events_provider_event_id_key unique(provider,provider_event_id),',
   'constraint provider_webhook_events_verification_authority_check check(',
   "verification_authority in ('NO_VERIFICATION_AUTHORITY','PAYNOW_TEST_SHA512_VERIFIED','TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION')));"
  ].join('\n'));
  run(db,candidate);
  run(db,"insert into public.payment_transactions(provider,purpose,merchant_reference,currency,expected_amount,poll_url,internal_status,verification_authority) values('paynow','PREMIUM_SUBSCRIPTION',"+quote(ref)+",'USD',5.00,"+quote(poll)+",'PROVIDER_INITIATED','NO_VERIFICATION_AUTHORITY');");
  function call(o){return JSON.parse(run(db,sqlCall(o)));}
  assert.equal(call().code,'INDEPENDENT_PROVIDER_USD_ATTESTATION_REQUIRED');
  assert.equal(run(db,'select count(*) from public.provider_webhook_events;'),'0');
  assert.equal(run(db,'select internal_status from public.payment_transactions;'),'PROVIDER_INITIATED');
  assert.equal(call({currency:'ZWG'}).code,'LIVE_SIGNED_NON_USD_CURRENCY');
  assert.equal(call({amount:'4.99'}).code,'LIVE_LEDGER_AMOUNT_REFERENCE_STATE_MISMATCH');
  assert.equal(call({status:'Refunded'}).code,'LIVE_NON_PAYMENT_STATUS_REQUIRES_REVIEW');
  assert.equal(call({metaJson:JSON.stringify({signature_verified:false,poll_confirmed:true,provider_mode:'LIVE'})}).code,'LIVE_CRYPTO_POLL_AUTHORITY_REQUIRED');
  const attestation=[
   'insert into public.payment_live_usd_attestations(',
   'transaction_id,merchant_reference,provider_reference,integration_id,amount,charge_currency,settlement_currency,',
   'provider_evidence_source,provider_evidence_sha256,provider_evidence_reference,security_reviewer,finance_reviewer,',
   'security_approved_at,finance_approved_at)',
   'select id,'+quote(ref)+",'PN-FIXTURE-001','9999',5.00,'USD','USD','PAYNOW_PROVIDER_STATEMENT',",
   "repeat('c',64),'DOCUMENTED_PROVIDER_FIXTURE_ONLY','independent_security_fixture',",
   "'independent_finance_fixture',now(),now() from public.payment_transactions;"
  ].join(' ');
  run(db,attestation);
  const first=call();
  assert.equal(first.accepted,true);
  assert.equal(first.duplicate,false);
  assert.equal(first.bank_settled,false);
  assert.equal(call().duplicate,true);
  assert.equal(run(db,'select count(*) from public.provider_webhook_events;'),'1');
  assert.equal(run(db,"select internal_status||'|'||verification_authority from public.payment_transactions;"),
    'PAYMENT_VERIFIED|PAYNOW_LIVE_USD_ATTESTED');
  assert.equal(run(db,'select reported_currency is null from public.provider_webhook_events;'),'t');
  assert.equal(run(db,"select sanitized_metadata->>'currency_source' from public.provider_webhook_events;"),'PROVIDER_USD_ATTESTATION');
  assert.equal(run(db,"select has_table_privilege('service_role','public.payment_live_usd_attestations','INSERT');"),'f');
  assert.equal(run(db,"select has_function_privilege('service_role','public.payment_record_paynow_live_status(text,text,numeric,text,text,text,text,text,jsonb)','EXECUTE');"),'t');
  assert.equal(run(db,"select has_function_privilege('anon','public.payment_record_paynow_live_status(text,text,numeric,text,text,text,text,text,jsonb)','EXECUTE');"),'f');
  assert.equal(call({status:'Refunded',event:'d'.repeat(64)}).accepted,false);
  assert.equal(run(db,'select count(*) from public.provider_webhook_events;'),'1');
 }finally{
  if(created)run('postgres','drop database if exists '+db+' with (force);');
 }
});
