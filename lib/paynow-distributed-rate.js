'use strict';
// HealthTimes R5: an atomic shared database limiter, never a Vercel-process Map.
// Not deployed until the candidate SQL is authorized. Missing authority fails
// closed for status and initiation. Provider callbacks are separately signed,
// freshly polled and replay-safe; do not rate-limit their delivery by caller IP.
const { createHmac } = require('node:crypto');
const { isIP } = require('node:net');

function trustedIp(req, env=process.env) {
  const headers=req.headers||{};
  let raw;
  if (env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development') {
    // Vercel overwrites the original XFF and provides x-vercel-forwarded-for.
    // Never accept a caller-originated XFF chain as authority in local runtimes.
    raw=String(headers['x-vercel-forwarded-for']||'').trim();
    if (!raw || raw.includes(',')) throw new Error('RATE_CLIENT_IP_UNTRUSTED');
  } else {
    raw=String(req.socket?.remoteAddress||'').trim();
  }
  // Strip only Node's IPv4-mapped IPv6 prefix; do not trust user supplied Host.
  if(raw.startsWith('::ffff:')) raw=raw.slice(7);
  if(!isIP(raw)) throw new Error('RATE_CLIENT_IP_UNTRUSTED');
  return raw.toLowerCase();
}

async function enforceSharedLimit(req,action,max,windowSeconds,env=process.env,transport=fetch){
  if(!/^(status|checkout|connectivity|poll|internal-test-poll|test-premium)$/.test(action)||
      !Number.isInteger(max)||max<1||max>500||
      !Number.isInteger(windowSeconds)||windowSeconds<10||windowSeconds>3600)
    throw new Error('RATE_POLICY_INVALID');
  if(!/^[A-Za-z0-9_-]{32,}$/.test(String(env.PAYNOW_RATE_HMAC_KEY||'')) ||
     !String(env.SUPABASE_URL||'').startsWith('https://') ||
     !String(env.SUPABASE_SERVICE_ROLE_KEY||'').length)
    throw new Error('RATE_CONTROL_UNAVAILABLE');
  const ip=trustedIp(req,env);
  const key=createHmac('sha256',env.PAYNOW_RATE_HMAC_KEY)
    .update('paynow-r5:'+action+':'+ip).digest('hex');
  let response;
  try {
    response=await transport(String(env.SUPABASE_URL).replace(/\/$/,'')+
      '/rest/v1/rpc/payment_rate_limit_take',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),
      headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type':'application/json'},
      body:JSON.stringify({p_bucket_hash:key,p_limit:max,p_window_seconds:windowSeconds})
    });
    if(!response.ok)throw Error('RATE_RPC_FAILED');
    const result=await response.json();
    if(!result || typeof result.allowed!=='boolean' ||
        !Number.isInteger(result.retry_after_seconds) ||
        result.retry_after_seconds<0||result.retry_after_seconds>3600)
      throw Error('RATE_RPC_MALFORMED');
    return result;
  }catch {
    // Never fall back to per-instance process storage or accept unchecked bursts.
    throw new Error('RATE_CONTROL_UNAVAILABLE');
  }
}

module.exports={trustedIp,enforceSharedLimit};
