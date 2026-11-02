import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
 UAT_STAFF_MAP, beginExactSessionRun, clearTrackedSessions, trackExactSession,
 revokeExactSession, getTrackedSessions,extractBrowserProviderSessionId
} from '../../scripts/session-authority.mjs';
const url='https://bzuvntbkevvuhfhqhkua.supabase.co';
const email='uat-commercial@healthtimes.test';
const staff=UAT_STAFF_MAP[email].staffProfileId;
const id=randomUUID(),run=randomUUID(),sid=randomUUID();
const token=(sub=id,session=sid,e=email,exp=Math.floor(Date.now()/1000)+600)=>
  [Buffer.from('{"alg":"none"}').toString('base64url'),Buffer.from(JSON.stringify({sub,session_id:session,email:e,exp})).toString('base64url'),'signature-fixture-only'].join('.');
const base=()=>({email,staffProfileId:staff,authUserId:id,providerSessionId:sid,testRunId:run,accessToken:token()});
const rev=()=>({supabaseUrl:url,anonKey:'test-anon-key',email,staffProfileId:staff,authUserId:id,providerSessionId:sid,testRunId:run});
const init=()=>{clearTrackedSessions();beginExactSessionRun(run);};
test('R5B SECURITY: missing run UUID denied',()=>{clearTrackedSessions();assert.throws(()=>beginExactSessionRun('unknown'),/BLOCKED_RUN_ID/);});
test('R5B SECURITY: unknown staff denied before token use',()=>{init();assert.throws(()=>trackExactSession({...base(),email:'owner@example.com'}),/BLOCKED_SESSION_TARGET/);});
test('R5B SECURITY: absent auth subject denied, never unknown placeholder',()=>{init();assert.throws(()=>trackExactSession({...base(),authUserId:undefined}),/BLOCKED_AUTH_SUB/);});
test('R5B SECURITY: null provider ID denied in registration and teardown',async()=>{init();assert.throws(()=>trackExactSession({...base(),providerSessionId:null}),/BLOCKED_SESSION_ID/);await assert.rejects(revokeExactSession({...rev(),providerSessionId:null}),/BLOCKED_SESSION_ID/);});
test('R5B SECURITY: token subject cannot diverge from registered subject',()=>{init();assert.throws(()=>trackExactSession({...base(),accessToken:token(randomUUID())}),/BLOCKED_IDENTITY_CLAIMS/);});
test('R5B SECURITY: different provider session cannot impersonate owned session',()=>{init();assert.throws(()=>trackExactSession({...base(),accessToken:token(id,randomUUID())}),/BLOCKED_IDENTITY_CLAIMS/);});
test('R5B SECURITY: expired original browser token rejected',()=>{init();assert.throws(()=>trackExactSession({...base(),accessToken:token(id,sid,email,1)}),/BLOCKED_EXPIRED_SESSION/);});
test('R5B SECURITY: untracked foreign session/run rejected without network',async()=>{init();await assert.rejects(revokeExactSession(rev()),/BLOCKED_SESSION_OWNERSHIP/);});
test('R5B SECURITY: ephemeral bearer never appears in persisted tracked record',()=>{init();trackExactSession(base());const data=JSON.stringify(getTrackedSessions());assert.ok(!data.includes('signature-fixture-only'));assert.ok(!data.includes('accessToken'));});
test('R5B SECURITY: external auth mismatch blocks all session RPC writes',async()=>{init();trackExactSession(base());const f=globalThis.fetch;let writes=0;globalThis.fetch=async u=>{if(String(u).endsWith('/auth/v1/user'))return Response.json({id:randomUUID(),email});writes++;throw Error('unexpected fetch');};try{await assert.rejects(revokeExactSession(rev()),/BLOCKED_AUTH_SUB/);assert.equal(writes,0);}finally{globalThis.fetch=f;}});
test('R5B SECURITY: one-row positive teardown; second same-account session preserved',async()=>{
 init();trackExactSession(base());const sibling=randomUUID(); const siblingRec={...base(),providerSessionId:sibling,accessToken:token(id,sibling)};trackExactSession(siblingRec);
 const old=globalThis.fetch,prior=process.env.SUPABASE_ACCESS_TOKEN;process.env.SUPABASE_ACCESS_TOKEN='unit-test-management-only';const revoked=new Set();const calls=[];
 globalThis.fetch=async (u,opt={})=>{
 const target=String(u);calls.push(target);
 if(target.endsWith('/auth/v1/user'))return Response.json({id,email});
 if(target.endsWith('/database/query')){
  const m=JSON.parse(opt.body).query.match(/ns.provider_session_id='([^']+)'/);
  const session=m?.[1];assert.ok([sid,sibling].includes(session));
  return Response.json([{auth_user_id:id,staff_profile_id:staff,provider_session_id:session,created_at:new Date(Date.now()-1000).toISOString(),revoked_at:revoked.has(session)?new Date().toISOString():null,email}]);
 }
 if(target.endsWith('/rest/v1/rpc/newsroom_revoke_session')){
  const b=JSON.parse(opt.body);assert.equal(b.p_provider_session_id,sid);revoked.add(sid);return Response.json(1);
 }
 if(target.endsWith('/auth/v1/logout'))return new Response(null,{status:204});
 throw Error('Unexpected transport '+target);
 };
 try {
  assert.equal((await revokeExactSession(rev())).revokedCount,1);
  assert.equal(revoked.has(sid),true);assert.equal(revoked.has(sibling),false);
  assert.equal(getTrackedSessions().length,1);
  await assert.rejects(revokeExactSession(rev()),/BLOCKED_SESSION_OWNERSHIP/);
 }finally{globalThis.fetch=old;process.env.SUPABASE_ACCESS_TOKEN=prior||'';}
});
test('R5B SECURITY: zero or multiple-row RPC return is fatal',async()=>{
 for(const value of [0,2]){
  init();trackExactSession(base());
  const old=globalThis.fetch,prior=process.env.SUPABASE_ACCESS_TOKEN;
  process.env.SUPABASE_ACCESS_TOKEN='unit-test-management-only';
  globalThis.fetch=async (u,opt={})=>{
   const x=String(u);
   if(x.endsWith('/auth/v1/user'))return Response.json({id,email});
   if(x.endsWith('/database/query'))return Response.json([{auth_user_id:id,staff_profile_id:staff,provider_session_id:sid,created_at:new Date(Date.now()-1000).toISOString(),revoked_at:null,email}]);
   if(x.endsWith('/newsroom_revoke_session'))return Response.json(value);
   throw Error('Unexpected transport '+x);
  };
  try{await assert.rejects(revokeExactSession(rev()),/BLOCKED_REVOKE_COUNT/);}
  finally{globalThis.fetch=old;process.env.SUPABASE_ACCESS_TOKEN=prior||'';}
 }
});
