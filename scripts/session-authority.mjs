/**
 * HealthTimes ICR05B — exact, current-run UAT session custody.
 * This helper is intentionally test-harness-only. It uses a privileged
 * Supabase Management API credential only for a fixed, UUID-only SQL readback;
 * it DOES NOT have DB-role read-only permissions. No arbitrary SQL input.
 */
import { getSupabaseManagementToken, STAGING_PROJECT_REF } from './audit-template-executor.mjs';

export const UAT_STAFF_MAP = Object.freeze({
  'uat-specialist@healthtimes.test': Object.freeze({
    email:'uat-specialist@healthtimes.test',
    staffProfileId:'5d01dd6e-2a6d-46fa-9c5c-846193add82a'
  }),
  'uat-commercial@healthtimes.test': Object.freeze({
    email:'uat-commercial@healthtimes.test',
    staffProfileId:'5801b34b-04dc-433b-89e4-128874618dab'
  })
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const vault=new Map(); // tokens never placed in records, output or evidence
let currentRun=null;
let startedAt=0;
const validId=(v)=>typeof v==='string' && UUID.test(v);
function ensureRun(runId) {
  if(!validId(runId)||runId!==currentRun) throw Error('BLOCKED_RUN_ID: current exact run identity required');
}
function failSession(id) {
  if(!validId(id)) throw Error('BLOCKED_SESSION_ID: exact UUID provider_session_id required; null sentinel forbidden');
}
export function beginExactSessionRun(runId) {
  if(!validId(runId))throw Error('BLOCKED_RUN_ID: non-null UUID required');
  vault.clear();
  currentRun=runId;
  startedAt=Date.now();
}
export function clearTrackedSessions() {
  vault.clear();currentRun=null;startedAt=0;
}
export function getTrackedSessions() {
  // Deliberately omit accessToken/password and any raw JWT.
  return [...vault.values()].map(({accessToken,...safe})=>({...safe}));
}
export function trackExactSession({email,staffProfileId,authUserId,providerSessionId,testRunId,accessToken}) {
  ensureRun(testRunId);failSession(providerSessionId);
  const actor=UAT_STAFF_MAP[email];
  if(!actor || actor.staffProfileId!==staffProfileId)throw Error('BLOCKED_SESSION_TARGET: owner/foreign staff denied');
  if(!validId(authUserId))throw Error('BLOCKED_AUTH_SUB: authenticated user UUID required');
  if(typeof accessToken!=='string'||accessToken.split('.').length!==3)
    throw Error('BLOCKED_AUTH_TOKEN: original browser token required in ephemeral vault');
  const claims=decodeClaims(accessToken);
  if(claims.sub!==authUserId || claims.session_id!==providerSessionId || claims.email!==email)
    throw Error('BLOCKED_IDENTITY_CLAIMS: JWT subject/session/email mismatch');
  if(!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))
    throw Error('BLOCKED_EXPIRED_SESSION');
  const key=providerSessionId.toLowerCase();
  if(vault.has(key))throw Error('BLOCKED_SESSION_DUPLICATE');
  const record={email,staffProfileId,authUserId,providerSessionId:key,testRunId,trackedAt:new Date().toISOString()};
  vault.set(key,{...record,accessToken});
  return {...record};
}
function decodeClaims(token) {
  try {return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}
  catch {throw Error('BLOCKED_AUTH_TOKEN: malformed JWT claims');}
}
async function readExactRow({providerSessionId,staffProfileId,authUserId}) {
  // UUID values are validated before interpolation; no caller-provided SQL.
  const query=`select ns.auth_user_id,ns.staff_profile_id,ns.provider_session_id,ns.created_at,ns.revoked_at,sp.email
  from public.newsroom_sessions ns
  join public.staff_profiles sp on sp.id=ns.staff_profile_id
  where ns.provider_session_id='${providerSessionId}'
    and ns.staff_profile_id='${staffProfileId}'
    and ns.auth_user_id='${authUserId}' limit 2;`;
  const response=await fetch(`https://api.supabase.com/v1/projects/${STAGING_PROJECT_REF}/database/query`,{
    method:'POST',
    headers:{Authorization:'Bearer '+getSupabaseManagementToken(),'Content-Type':'application/json'},
    body:JSON.stringify({query})
  });
  if(!response.ok)throw Error('BLOCKED_SESSION_READBACK: privileged audit failed');
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length!==1)throw Error('BLOCKED_SESSION_READBACK: exact row missing or ambiguous');
  return rows[0];
}
function verifyRow(row,rec,shouldBeRevoked) {
  if(row.auth_user_id!==rec.authUserId || row.staff_profile_id!==rec.staffProfileId ||
     row.provider_session_id!==rec.providerSessionId || row.email!==rec.email)
    throw Error('BLOCKED_SESSION_OWNERSHIP: database identity mismatch');
  const created=Date.parse(row.created_at);
  if(!Number.isFinite(created)||created<startedAt-10000||created>Date.now()+10000)
    throw Error('BLOCKED_SESSION_RUN_ORIGIN: session not created during current run');
  if(shouldBeRevoked ? !row.revoked_at : !!row.revoked_at)
    throw Error('BLOCKED_SESSION_STATE: unexpected revocation state');
}
export async function revokeExactSession({supabaseUrl,anonKey,email,staffProfileId,providerSessionId,testRunId,authUserId}) {
  failSession(providerSessionId);
  ensureRun(testRunId);
  const actor=UAT_STAFF_MAP[email];
  if(!actor || actor.staffProfileId!==staffProfileId || !validId(authUserId))
    throw Error('BLOCKED_SESSION_TARGET: unauthorized actor/staff');
  const rec=vault.get(providerSessionId.toLowerCase());
  if(!rec||rec.testRunId!==testRunId||rec.authUserId!==authUserId||
     rec.staffProfileId!==staffProfileId||rec.email!==email)
    throw Error('BLOCKED_SESSION_OWNERSHIP: session not owned by this exact test run');
  if(supabaseUrl!==`https://${STAGING_PROJECT_REF}.supabase.co`||!anonKey)
    throw Error('BLOCKED_PROJECT_AUTHORITY');
  const claims=decodeClaims(rec.accessToken);
  if(claims.sub!==authUserId||claims.session_id!==rec.providerSessionId||claims.email!==email||
     !Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))
    throw Error('BLOCKED_EXPIRED_OR_FOREIGN_SESSION');
  const verify=await fetch(supabaseUrl+'/auth/v1/user',{
    method:'GET',headers:{apikey:anonKey,Authorization:'Bearer '+rec.accessToken}
  });
  if(!verify.ok)throw Error('BLOCKED_AUTH_VERIFY: source JWT not authenticated');
  const user=await verify.json();
  if(user.id!==authUserId||user.email!==email)throw Error('BLOCKED_AUTH_SUB: verified identity mismatch');
  const row=await readExactRow(rec);verifyRow(row,rec,false);
  const rpc=await fetch(supabaseUrl+'/rest/v1/rpc/newsroom_revoke_session',{
    method:'POST',
    headers:{apikey:anonKey,Authorization:'Bearer '+rec.accessToken,'Content-Type':'application/json'},
    body:JSON.stringify({p_staff_id:staffProfileId,p_provider_session_id:rec.providerSessionId})
  });
  if(!rpc.ok)throw Error('FAIL_CLOSED_RPC_ERROR: canonical revocation refused');
  const count=await rpc.json();
  if(!Number.isInteger(count)||count!==1)
    throw Error('BLOCKED_REVOKE_COUNT: expected exactly one row');
  const after=await readExactRow(rec);verifyRow(after,rec,true);
  const logout=await fetch(supabaseUrl+'/auth/v1/logout',{
    method:'POST',headers:{apikey:anonKey,Authorization:'Bearer '+rec.accessToken}
  });
  if(!logout.ok)throw Error('BLOCKED_LOGOUT: original session logout failed');
  vault.delete(rec.providerSessionId);
  return {email,staffProfileId,providerSessionId:rec.providerSessionId,authUserId,revokedCount:count,testRunId};
}
export async function extractBrowserProviderSessionId(page) {
  const data=await page.evaluate(()=>{
    const raw=localStorage.getItem('healthtimes.auth.sb-bzuvntbkevvuhfhqhkua-auth-token');
    if(!raw)return null;
    try {return JSON.parse(raw);}catch{return null;}
  });
  const token=data?.access_token;
  if(typeof token!=='string')return null;
  const claims=decodeClaims(token);
  if(!validId(claims.sub)||!validId(claims.session_id)||
      typeof claims.email!=='string'||!Number.isFinite(claims.exp)||
      claims.exp<=Math.floor(Date.now()/1000))return null;
  return {authUserId:claims.sub,providerSessionId:claims.session_id,email:claims.email,accessToken:token};
}
