'use strict';

const rateState = globalThis.__HTP_CA01_DISCUSSION_RATE__ || (globalThis.__HTP_CA01_DISCUSSION_RATE__ = new Map());

function config() {
  const url = (process.env.SUPABASE_URL || process.env.HEALTHTIMES_SUPABASE_URL || '').replace(/\/$/, '');
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY || '';
  return { url, publishable };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0,80);
}

function rateLimit(req, action) {
  const spec = {
    publicComments: [120, 60_000],
    eligibility: [60, 60_000],
    registerProfile: [10, 60_000],
    submitComment: [12, 10 * 60_000],
    editComment: [30, 10 * 60_000],
    withdrawComment: [30, 10 * 60_000],
    reportComment: [20, 10 * 60_000]
  }[action] || [60, 60_000];
  const now = Date.now();
  const key = clientIp(req) + ':' + action;
  const row = rateState.get(key);
  if (!row || now - row.started > spec[1]) {
    rateState.set(key, { started: now, count: 1 });
    return true;
  }
  row.count += 1;
  return row.count <= spec[0];
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

function bearer(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function rpc(name, args, token) {
  const { url, publishable } = config();
  if (!url || !publishable) {
    const error = new Error('HealthTimes discussion backend is not configured.');
    error.status = 503;
    throw error;
  }
  const response = await fetch(url + '/rest/v1/rpc/' + encodeURIComponent(name), {
    method: 'POST',
    headers: {
      apikey: publishable,
      Authorization: 'Bearer ' + (token || publishable),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args || {})
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error = new Error(
      (data && typeof data === 'object' && (data.message || data.error || data.hint)) ||
      'Discussion request failed (' + response.status + ')'
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

function requireToken(req) {
  const token = bearer(req);
  if (!token) {
    const error = new Error('Authenticated reader session required.');
    error.status = 401;
    throw error;
  }
  return token;
}

async function handle(req, res) {
  if (!['GET','POST'].includes(req.method)) {
    return json(res,405,{ok:false,error:'Method not allowed.'});
  }

  try {
    if (req.method === 'GET') {
      if (!rateLimit(req,'publicComments')) return json(res,429,{ok:false,error:'Too many requests.'});
      const url = new URL(req.url,'https://' + (req.headers.host || 'localhost'));
      const storyId = String(url.searchParams.get('storyId') || '');
      if (!storyId) return json(res,400,{ok:false,error:'Canonical storyId is required.'});
      const rows = await rpc('reader_public_story_comments',{
        p_story_id: storyId,
        p_limit: Math.min(Math.max(Number(url.searchParams.get('limit') || 50),1),100),
        p_before: url.searchParams.get('before') || null
      },null);
      return json(res,200,{ok:true,rows:Array.isArray(rows)?rows:[]});
    }

    const body = await readBody(req);
    const action = String(body.action || '');
    if (!rateLimit(req,action)) return json(res,429,{ok:false,error:'Too many requests.'});
    const token = requireToken(req);

    if (action === 'registerProfile') {
      const id = await rpc('reader_register_comment_profile',{p_display_name:body.displayName},token);
      return json(res,200,{ok:true,id});
    }
    if (action === 'eligibility') {
      const eligibility = await rpc('reader_comment_eligibility',{p_story_id:body.storyId},token);
      return json(res,200,{ok:true,eligibility});
    }
    if (action === 'submitComment') {
      const id = await rpc('reader_submit_story_comment',{
        p_story_id:body.storyId,
        p_body:body.comment,
        p_parent_comment_id:body.parentCommentId || null
      },token);
      return json(res,200,{ok:true,id});
    }
    if (action === 'editComment') {
      await rpc('reader_edit_story_comment',{p_comment_id:body.commentId,p_body:body.comment},token);
      return json(res,200,{ok:true});
    }
    if (action === 'withdrawComment') {
      await rpc('reader_withdraw_story_comment',{p_comment_id:body.commentId},token);
      return json(res,200,{ok:true});
    }
    if (action === 'reportComment') {
      const id = await rpc('reader_report_story_comment',{
        p_comment_id:body.commentId,
        p_reason_code:body.reasonCode,
        p_details:body.details || null
      },token);
      return json(res,200,{ok:true,id});
    }

    return json(res,404,{ok:false,error:'Unknown discussion action.'});
  } catch (error) {
    const status = Number(error.status) || 500;
    return json(res,status>=400&&status<600?status:500,{
      ok:false,
      error:status>=500?'Discussion backend request failed safely.':String(error.message || 'Request denied.')
    });
  }
}

module.exports = handle;
