'use strict';

const crypto = require('crypto');

const COOKIE_ACCESS = 'htp_nr_access';
const COOKIE_REFRESH = 'htp_nr_refresh';
const COOKIE_CSRF = 'htp_nr_csrf';
const COOKIE_PATH = '/';
const rateState = globalThis.__HTP_NEWSROOM_RATE__ || (globalThis.__HTP_NEWSROOM_RATE__ = new Map());

function config() {
  const url = (process.env.SUPABASE_URL || process.env.HEALTHTIMES_SUPABASE_URL || '').replace(/\/$/, '');
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.HEALTHTIMES_SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, publishable, service };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const key = decodeURIComponent(part.slice(0, i).trim());
    const value = decodeURIComponent(part.slice(i + 1).trim());
    if (key) out[key] = value;
  });
  return out;
}

function appendCookie(res, value) {
  const previous = res.getHeader('Set-Cookie');
  const list = Array.isArray(previous) ? previous : previous ? [previous] : [];
  res.setHeader('Set-Cookie', [...list, value]);
}

function cookie(name, value, options = {}) {
  const attrs = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${options.path || COOKIE_PATH}`,
    'SameSite=Lax',
    'Secure'
  ];
  if (options.httpOnly !== false) attrs.push('HttpOnly');
  if (Number.isFinite(options.maxAge)) attrs.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  return attrs.join('; ');
}

function setSessionCookies(res, session) {
  appendCookie(res, cookie(COOKIE_ACCESS, session.access_token, { maxAge: Number(session.expires_in || 3600) }));
  appendCookie(res, cookie(COOKIE_REFRESH, session.refresh_token, { maxAge: 60 * 60 * 24 * 30 }));
}

function setCsrfCookie(res) {
  const token = crypto.randomBytes(24).toString('base64url');
  appendCookie(res, cookie(COOKIE_CSRF, token, { httpOnly: false, maxAge: 60 * 60 * 8 }));
  return token;
}

function clearSessionCookies(res) {
  appendCookie(res, cookie(COOKIE_ACCESS, '', { maxAge: 0 }));
  appendCookie(res, cookie(COOKIE_REFRESH, '', { maxAge: 0 }));
  appendCookie(res, cookie(COOKIE_CSRF, '', { maxAge: 0, httpOnly: false }));
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
}

function rateLimit(req, action) {
  const spec = {
    login: [10, 15 * 60_000],
    recover: [6, 15 * 60_000],
    invite: [20, 60 * 60_000],
    transitionStory: [60, 60_000],
    prepareStoryMedia: [30, 60_000],
    finalizeStoryMedia: [30, 60_000],
    attachStoryMedia: [60, 60_000],
    requestStoryChanges: [30, 60_000],
    approveCampaign: [30, 60_000],
    changeRole: [30, 60_000],
    revokeStaff: [30, 60_000],
    revokeSession: [60, 60_000]
  }[action];
  if (!spec) return true;
  const [limit, windowMs] = spec;
  const now = Date.now();
  const key = `${clientIp(req)}:${action}`;
  const row = rateState.get(key);
  if (!row || now - row.started > windowMs) {
    rateState.set(key, { started: now, count: 1 });
    return true;
  }
  row.count += 1;
  return row.count <= limit;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    return o.host === host;
  } catch {
    return false;
  }
}

function requireCsrf(req) {
  if (!sameOrigin(req)) return false;
  const cookies = parseCookies(req);
  const expected = cookies[COOKIE_CSRF];
  const received = String(req.headers['x-htp-csrf'] || '');
  if (!expected || !received) return false;
  const a=Buffer.from(expected), b=Buffer.from(received);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
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

async function supabaseRequest(path, { method = 'GET', token, service = false, body, prefer } = {}) {
  const { url, publishable, service: serviceKey } = config();
  if (!url || !publishable) {
    const error = new Error('HealthTimes staging backend is not configured.');
    error.status = 503;
    throw error;
  }
  const key = service ? serviceKey : publishable;
  if (!key) {
    const error = new Error(service ? 'Server-only staging credential is not configured.' : 'Staging publishable credential is not configured.');
    error.status = 503;
    throw error;
  }
  const headers = { apikey: key };
  if (service) headers.Authorization = `Bearer ${key}`;
  else if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error = new Error(
      (data && typeof data === 'object' && (data.message || data.msg || data.error_description || data.error)) ||
      `Backend request failed (${response.status})`
    );
    error.status = response.status;
    error.backend = data;
    throw error;
  }
  return data;
}

async function authPassword(email, password) {
  const { publishable } = config();
  if (!publishable) {
    const e = new Error('Staging authentication is not configured.');
    e.status = 503;
    throw e;
  }
  return supabaseRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });
}

async function refreshSession(refreshToken) {
  return supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken }
  });
}

async function rpc(name, args, token) {
  return supabaseRequest(`/rest/v1/rpc/${encodeURIComponent(name)}`, {
    method: 'POST',
    token,
    body: args || {}
  });
}

async function rest(tableAndQuery, token) {
  return supabaseRequest(`/rest/v1/${tableAndQuery}`, { token });
}

function storageObjectPath(bucket, objectKey) {
  const parts=[String(bucket||''),...String(objectKey||'').split('/').filter(Boolean)];
  return parts.map(encodeURIComponent).join('/');
}

async function storageServiceRequest(path, { method='GET', body } = {}) {
  const { url, service } = config();
  if (!url || !service) {
    const error=new Error('Server-only staging storage credential is not configured.');
    error.status=503;
    throw error;
  }
  const headers={apikey:service,Authorization:`Bearer ${service}`};
  if (body !== undefined) headers['Content-Type']='application/json';
  const response=await fetch(`${url}/storage/v1${path}`,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'
  });
  const text=await response.text();
  let data=null;
  if(text){try{data=JSON.parse(text);}catch{data=text;}}
  if(!response.ok){
    const error=new Error((data&&typeof data==='object'&&(data.message||data.error))||`Storage request failed (${response.status})`);
    error.status=response.status;error.backend=data;throw error;
  }
  return data;
}

async function createSignedStoryUpload(bucket, objectKey) {
  const { url }=config();
  const data=await storageServiceRequest(`/object/upload/sign/${storageObjectPath(bucket,objectKey)}`,{method:'POST',body:{}});
  if(!data||typeof data.url!=='string') {
    const error=new Error('Storage did not issue a signed upload URL.');error.status=502;throw error;
  }
  return `${url}/storage/v1${data.url}`;
}

async function storyMediaObjectInfo(bucket, objectKey) {
  return storageServiceRequest(`/object/info/${storageObjectPath(bucket,objectKey)}`);
}

async function createSignedStoryPreview(bucket, objectKey, expiresIn=300) {
  const { url }=config();
  const data=await storageServiceRequest(`/object/sign/${storageObjectPath(bucket,objectKey)}`,{
    method:'POST',body:{expiresIn}
  });
  if(!data||typeof data.signedURL!=='string') {
    const error=new Error('Storage did not issue a signed preview URL.');error.status=502;throw error;
  }
  return encodeURI(`${url}/storage/v1${data.signedURL}`);
}

async function accessToken(req, res) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_ACCESS]) {
    try {
      await supabaseRequest('/auth/v1/user', { token: cookies[COOKIE_ACCESS] });
      return cookies[COOKIE_ACCESS];
    } catch (error) {
      if (![401, 403].includes(Number(error.status))) throw error;
    }
  }
  if (!cookies[COOKIE_REFRESH]) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }
  try {
    const refreshed = await refreshSession(cookies[COOKIE_REFRESH]);
    setSessionCookies(res, refreshed);
    return refreshed.access_token;
  } catch {
    clearSessionCookies(res);
    const error = new Error('Session expired or revoked.');
    error.status = 401;
    throw error;
  }
}

async function registerAndContext(token, req) {
  await rpc('newsroom_register_session', { p_user_agent: String(req.headers['user-agent'] || '').slice(0, 500) }, token);
  return rpc('newsroom_current_context', {}, token);
}

async function optionalRows(query, token) {
  try {
    const result = await rest(query, token);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    if ([401, 403].includes(Number(error.status))) return [];
    throw error;
  }
}

function encodeSelect(value) {
  return encodeURIComponent(value).replace(/%2C/g, ',');
}

function storageObjectPath(bucket, objectPath) {
  const clean = String(objectPath || '').replace(/^\/+|\/+$/g, '');
  return encodeURIComponent(String(bucket || '')) + '/' + clean.split('/').map(encodeURIComponent).join('/');
}

function signedStorageUrl(fragment) {
  const base = config().url + '/storage/v1';
  return new URL(String(fragment || ''), base + '/').toString();
}


async function bootstrap(token, req) {
  const context = await registerAndContext(token, req);
  const canMedia=Array.isArray(context?.capabilities)&&context.capabilities.includes('media.manage');
  const queries = {
    revisions: 'story_revisions?select=' + encodeSelect('id,story_id,revision_number,title,body_html,editor_id,change_summary,created_at') + '&order=created_at.desc&limit=500',
    lifecycle: 'story_lifecycle_events?select=' + encodeSelect('id,story_id,from_status,to_status,actor_staff_id,reason,created_at') + '&order=created_at.desc&limit=500',
    assignments: 'story_assignments?select=' + encodeSelect('id,story_id,title,reporter_staff_id,assigned_editor_staff_id,desk,deadline_at,priority,notes,status,assigned_by,created_at,updated_at') + '&order=updated_at.desc',
    reviews: 'story_reviews?select=' + encodeSelect('id,story_id,review_type,assigned_to,status,notes,completed_at,completed_by,created_by,created_at,updated_at') + '&order=created_at.desc',
    comments: 'story_internal_comments?select=' + encodeSelect('id,story_id,author_staff_id,body,parent_comment_id,created_at,edited_at,edited_by,resolved_at,resolved_by') + '&order=created_at.asc',
    staff: 'staff_profiles?select=' + encodeSelect('id,auth_user_id,handle,display_name,email,role_id,desk,beat,country,region,status,assigned_editor_id,last_login_at,mfa_required,mfa_enrolled_at,created_at,updated_at') + '&order=display_name.asc',
    roles: 'newsroom_roles?select=' + encodeSelect('id,name,description') + '&order=name.asc',
    audit: 'audit_logs?select=' + encodeSelect('id,actor_staff_id,action,target_table,target_id,metadata,created_at') + '&order=created_at.desc&limit=200',
    sessions: 'newsroom_sessions?select=' + encodeSelect('id,staff_profile_id,provider_session_id,user_agent,created_at,last_seen_at,revoked_at,revoked_by') + '&order=last_seen_at.desc&limit=200',
    desks: 'newsroom_desks?select=' + encodeSelect('id,key,name,description,created_by,created_at,updated_at,archived_at') + '&order=name.asc',
    deskMembers: 'newsroom_desk_members?select=' + encodeSelect('desk_id,staff_profile_id,member_role,joined_at,left_at') + '&order=joined_at.asc',
    threads: 'newsroom_threads?select=' + encodeSelect('id,thread_type,title,assignment_id,desk_id,created_by,priority,status,opened_at,closed_at,expires_at,created_at,updated_at') + '&order=updated_at.desc&limit=200',
    threadMembers: 'newsroom_thread_members?select=' + encodeSelect('thread_id,staff_profile_id,member_role,joined_at,left_at,last_read_at') + '&order=joined_at.asc&limit=500',
    messages: 'newsroom_messages?select=' + encodeSelect('id,thread_id,author_staff_id,parent_message_id,body,created_at') + '&order=created_at.asc&limit=500',
    announcements: 'newsroom_announcements?select=' + encodeSelect('id,title,body,audience_scope,desk_id,priority,requires_ack,created_by,published_at,expires_at,archived_at,created_at') + '&order=published_at.desc&limit=100',
    campaigns: 'ad_campaigns?select=' + encodeSelect('id,advertiser_id,name,status,start_at,end_at,review_status,created_at') + '&order=created_at.desc',
    advertisers: 'advertisers?select=' + encodeSelect('id,name') + '&order=name.asc',
    subscribers: 'subscribers?select=' + encodeSelect('id,email,display_name,status,created_at') + '&order=created_at.desc&limit=200'
  };
  const [stories, entries, directory, notifications, inboxSummary, media] = await Promise.all([
    rpc('newsroom_list_stories', { p_limit: 200 }, token),
    Promise.all(Object.entries(queries).map(async ([key, query]) => [key, await optionalRows(query, token)])),
    rpc('newsroom_staff_directory', {}, token),
    rpc('newsroom_list_inbox', { p_filter: 'all', p_limit: 50, p_before: null }, token),
    rpc('newsroom_inbox_summary', {}, token),
    canMedia ? rpc('newsroom_list_media',{p_search:null,p_limit:150},token) : Promise.resolve([])
  ]);
  return {
    context,
    stories: Array.isArray(stories) ? stories : [],
    media: Array.isArray(media) ? media : [],
    directory: Array.isArray(directory) ? directory : [],
    notifications: Array.isArray(notifications) ? notifications : [],
    inboxSummary: inboxSummary && typeof inboxSummary === 'object' ? inboxSummary : {},
    ...Object.fromEntries(entries)
  };
}

function backendError(res, error) {
  const backendCode = error?.backend && typeof error.backend === 'object' ? String(error.backend.code || '') : '';
  const mappedStatus =
    backendCode === 'P0002' ? 404 :
    backendCode === '42501' ? 403 :
    backendCode === '22023' ? 400 :
    backendCode === '23505' ? 409 :
    0;
  const status = mappedStatus || Number(error.status) || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  if (process.env.AG06_CERTIFICATION_DEBUG === '1') {
    console.error('AG06_CERTIFICATION_BACKEND_ERROR', JSON.stringify({
      status: safeStatus,
      message: String(error.message || ''),
      backend: error.backend && typeof error.backend === 'object' ? error.backend : null
    }));
  }
  const message = safeStatus >= 500 ? 'Newsroom backend request failed safely.' : String(error.message || 'Request denied.');
  return json(res, safeStatus, { ok: false, error: message });
}

async function inviteAuthUser(invitation, origin) {
  const { url, service } = config();
  if (!url || !service) {
    const error = new Error('Staff invitation delivery is not configured on the staging server.');
    error.status = 503;
    throw error;
  }
  const redirectTo = process.env.NEWSROOM_INVITE_REDIRECT_URL || `${origin}/newsroom.html`;
  return supabaseRequest('/auth/v1/invite?redirect_to=' + encodeURIComponent(redirectTo), {
    method: 'POST',
    service: true,
    body: {
      email: invitation.email,
      data: { newsroom_invitation_id: invitation.id }
    }
  });
}

async function handle(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed.' });

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const body = req.method === 'POST' ? await readBody(req) : {};
  const action = String(body.action || url.searchParams.get('action') || (req.method === 'GET' ? 'bootstrap' : ''));

  if (!rateLimit(req, action)) return json(res, 429, { ok: false, error: 'Too many requests. Try again later.' });
  if (req.method === 'POST' && !['login', 'recover', 'adoptSession'].includes(action) && !requireCsrf(req)) {
    return json(res, 403, { ok: false, error: 'Request integrity check failed.' });
  }
  if (req.method === 'POST' && ['login', 'recover', 'adoptSession'].includes(action) && !sameOrigin(req)) {
    return json(res, 403, { ok: false, error: 'Origin check failed.' });
  }

  try {
    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) return json(res, 400, { ok: false, error: 'Email and password are required.' });
      const session = await authPassword(email, password);
      setSessionCookies(res, session);
      setCsrfCookie(res);
      try {
        const context = await registerAndContext(session.access_token, req);
        return json(res, 200, { ok: true, context });
      } catch (error) {
        clearSessionCookies(res);
        throw error;
      }
    }

    if (action === 'adoptSession') {
      const access = String(body.accessToken || '');
      const refresh = String(body.refreshToken || '');
      if (!access || !refresh) return json(res, 400, { ok: false, error: 'Provider session tokens are required.' });
      await supabaseRequest('/auth/v1/user', { token: access });
      const session = { access_token: access, refresh_token: refresh, expires_in: Number(body.expiresIn || 3600) };
      setSessionCookies(res, session);
      setCsrfCookie(res);
      try {
        const context = await registerAndContext(access, req);
        return json(res, 200, { ok: true, context });
      } catch (error) {
        clearSessionCookies(res);
        throw error;
      }
    }

    if (action === 'recover') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) return json(res, 400, { ok: false, error: 'Staff email is required.' });
      const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
      const redirectTo = process.env.NEWSROOM_RECOVERY_REDIRECT_URL || `${origin}/newsroom.html`;
      await supabaseRequest('/auth/v1/recover?redirect_to=' + encodeURIComponent(redirectTo), {
        method: 'POST',
        body: { email }
      });
      return json(res, 200, { ok: true, message: 'If the account is eligible, a recovery email has been requested.' });
    }

    const token = await accessToken(req, res);

    if (action === 'setPassword') {
      const password = String(body.password || '');
      if (password.length < 12) return json(res, 400, { ok: false, error: 'Use a password of at least 12 characters.' });
      await supabaseRequest('/auth/v1/user', { method: 'PUT', token, body: { password } });
      return json(res, 200, { ok: true });
    }

    if (action === 'logout') {
      try {
        const context = await rpc('newsroom_current_context', {}, token);
        if (context?.id && context?.session_id) {
          await rpc('newsroom_revoke_session', {
            p_staff_id: context.id,
            p_provider_session_id: context.session_id
          }, token);
        }
      } catch {}
      try { await supabaseRequest('/auth/v1/logout', { method: 'POST', token }); } catch {}
      clearSessionCookies(res);
      return json(res, 200, { ok: true });
    }

    if (action === 'bootstrap') {
      if (!parseCookies(req)[COOKIE_CSRF]) setCsrfCookie(res);
      return json(res, 200, { ok: true, data: await bootstrap(token, req) });
    }

    const call = async (name, args) => rpc(name, args, token);

    if (action === 'createStory') {
      const id = await call('newsroom_create_story', { p_story: body.story || {} });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'saveStory') {
      const version = await call('newsroom_save_story', {
        p_story_id: body.storyId,
        p_expected_version: Number(body.expectedVersion),
        p_patch: body.patch || {},
        p_reason: String(body.reason || 'Autosave').slice(0, 240)
      });
      return json(res, 200, { ok: true, version });
    }
    if (action === 'transitionStory') {
      const status = await call('newsroom_transition_story', {
        p_story_id: body.storyId,
        p_next_status: body.nextStatus,
        p_reason: body.reason || null
      });
      return json(res, 200, { ok: true, status });
    }
    if (action === 'createAssignment') {
      const id = await call('newsroom_create_assignment', { p_payload: body.assignment || {} });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'progressAssignment') {
      const status = await call('newsroom_progress_assignment', { p_assignment_id: body.assignmentId });
      return json(res, 200, { ok: true, status });
    }
    if (action === 'addComment') {
      const id = await call('newsroom_add_internal_comment', {
        p_story_id: body.storyId,
        p_body: body.comment,
        p_parent_comment_id: body.parentCommentId || null,
        p_mention_staff_ids: Array.isArray(body.mentionStaffIds) ? body.mentionStaffIds : []
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'editComment') {
      await call('newsroom_edit_internal_comment', {
        p_comment_id: body.commentId,
        p_body: body.comment,
        p_mention_staff_ids: Array.isArray(body.mentionStaffIds) ? body.mentionStaffIds : null
      });
      return json(res, 200, { ok: true });
    }
    if (action === 'resolveComment') {
      await call('newsroom_set_internal_comment_resolved', {
        p_comment_id: body.commentId,
        p_resolved: body.resolved !== false
      });
      return json(res, 200, { ok: true });
    }
    if (action === 'listInbox') {
      const rows = await call('newsroom_list_inbox', {
        p_filter: body.filter || 'all',
        p_limit: Number(body.limit || 50),
        p_before: body.before || null
      });
      const summary = await call('newsroom_inbox_summary', {});
      return json(res, 200, { ok: true, rows: Array.isArray(rows) ? rows : [], summary: summary || {} });
    }
    if (action === 'markNotificationRead') {
      await call('newsroom_mark_notification_read', {
        p_notification_id: body.notificationId,
        p_read: body.read !== false
      });
      return json(res, 200, { ok: true });
    }
    if (action === 'ackNotification') {
      await call('newsroom_ack_notification', { p_notification_id: body.notificationId });
      return json(res, 200, { ok: true });
    }
    if (action === 'archiveNotification') {
      await call('newsroom_archive_notification', { p_notification_id: body.notificationId });
      return json(res, 200, { ok: true });
    }
    if (action === 'updateNotificationPreferences') {
      const preferences = await call('newsroom_update_notification_preferences', {
        p_preferences: body.preferences || {}
      });
      return json(res, 200, { ok: true, preferences });
    }
    if (action === 'createDesk') {
      const id = await call('newsroom_create_desk', {
        p_key: body.key,
        p_name: body.name,
        p_description: body.description || null
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'setDeskMember') {
      await call('newsroom_set_desk_member', {
        p_desk_id: body.deskId,
        p_staff_id: body.staffId,
        p_member_role: body.memberRole || 'member',
        p_active: body.active !== false
      });
      return json(res, 200, { ok: true });
    }
    if (action === 'createThread') {
      const id = await call('newsroom_create_thread', {
        p_thread_type: body.threadType,
        p_title: body.title,
        p_assignment_id: body.assignmentId || null,
        p_desk_id: body.deskId || null,
        p_priority: body.priority || 'normal',
        p_expires_at: body.expiresAt || null
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'setThreadMember') {
      await call('newsroom_set_thread_member', {
        p_thread_id: body.threadId,
        p_staff_id: body.staffId,
        p_active: body.active !== false
      });
      return json(res, 200, { ok: true });
    }
    if (action === 'postThreadMessage') {
      const id = await call('newsroom_post_thread_message', {
        p_thread_id: body.threadId,
        p_body: body.message,
        p_parent_message_id: body.parentMessageId || null,
        p_mention_staff_ids: Array.isArray(body.mentionStaffIds) ? body.mentionStaffIds : []
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'markThreadRead') {
      await call('newsroom_mark_thread_read', { p_thread_id: body.threadId });
      return json(res, 200, { ok: true });
    }
    if (action === 'closeThread') {
      await call('newsroom_close_thread', { p_thread_id: body.threadId });
      return json(res, 200, { ok: true });
    }
    if (action === 'publishAnnouncement') {
      const id = await call('newsroom_publish_announcement', {
        p_title: body.title,
        p_body: body.message,
        p_audience_scope: body.audienceScope || 'all_staff',
        p_desk_id: body.deskId || null,
        p_priority: body.priority || 'normal',
        p_requires_ack: Boolean(body.requiresAck),
        p_expires_at: body.expiresAt || null
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'archiveAnnouncement') {
      await call('newsroom_archive_announcement', { p_announcement_id: body.announcementId });
      return json(res, 200, { ok: true });
    }
    if (action === 'setStoryCommentPolicy') {
      const policy = await call('newsroom_set_story_comment_policy', {
        p_story_id: body.storyId,
        p_policy: body.policy
      });
      return json(res, 200, { ok: true, policy });
    }
    if (action === 'listModerationQueue') {
      const rows = await call('newsroom_list_comment_moderation_queue', {
        p_state: body.state || null,
        p_limit: Number(body.limit || 50)
      });
      return json(res, 200, { ok: true, rows: Array.isArray(rows) ? rows : [] });
    }
    if (action === 'moderateComment') {
      const state = await call('newsroom_moderate_story_comment', {
        p_comment_id: body.commentId,
        p_action: body.moderationAction,
        p_reason_code: body.reasonCode || 'policy',
        p_notes: body.notes || null
      });
      return json(res, 200, { ok: true, state });
    }
    if (action === 'restrictReader') {
      const id = await call('newsroom_restrict_reader_comments', {
        p_reader_profile_id: body.readerProfileId,
        p_kind: body.kind,
        p_reason_code: body.reasonCode || 'policy',
        p_ends_at: body.endsAt || null,
        p_notes: body.notes || null
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'liftReaderRestriction') {
      await call('newsroom_lift_reader_comment_restriction', {
        p_restriction_id: body.restrictionId,
        p_notes: body.notes || null
      });
      return json(res, 200, { ok: true });
    }
    if (action === 'prepareAttachment') {
      if (!config().service) return json(res, 503, { ok: false, error: 'Private attachment signing is not configured on staging.' });
      const attachment = await call('newsroom_prepare_communication_attachment', {
        p_story_internal_comment_id: body.storyCommentId || null,
        p_newsroom_message_id: body.messageId || null,
        p_filename: body.filename,
        p_mime_type: body.mimeType,
        p_byte_size: Number(body.byteSize),
        p_sha256: body.sha256 || null
      });
      const objectPath = storageObjectPath(attachment.bucket, attachment.path);
      const signed = await supabaseRequest('/storage/v1/object/upload/sign/' + objectPath, {
        method: 'POST',
        service: true,
        body: {}
      });
      const uploadUrl = signedStorageUrl(signed?.url || signed?.signedURL);
      return json(res, 200, {
        ok: true,
        attachment,
        upload: {
          signedUrl: uploadUrl,
          method: 'PUT',
          expiresInSeconds: 7200
        }
      });
    }
    if (action === 'finalizeAttachment') {
      const attachment = await call('newsroom_finalize_communication_attachment', { p_attachment_id: body.attachmentId });
      return json(res, 200, { ok: true, attachment });
    }
    if (action === 'attachmentDownload') {
      if (!config().service) return json(res, 503, { ok: false, error: 'Private attachment signing is not configured on staging.' });
      const rows = await call('newsroom_get_communication_attachment', { p_attachment_id: body.attachmentId });
      const attachment = Array.isArray(rows) ? rows[0] : rows;
      if (!attachment || attachment.status !== 'ready') return json(res, 404, { ok: false, error: 'Ready attachment not found.' });
      const objectPath = storageObjectPath(attachment.storage_bucket, attachment.storage_path);
      const signed = await supabaseRequest('/storage/v1/object/sign/' + objectPath, {
        method: 'POST',
        service: true,
        body: { expiresIn: 60 }
      });
      let downloadUrl = signedStorageUrl(signed?.signedURL || signed?.url);
      downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(attachment.filename);
      return json(res, 200, { ok: true, url: downloadUrl, expiresInSeconds: 60, filename: attachment.filename });
    }
    if (action === 'markAttachmentDeleted') {
      if (!config().service) return json(res, 503, { ok: false, error: 'Private attachment deletion is not configured on staging.' });
      const rows = await call('newsroom_get_communication_attachment', { p_attachment_id: body.attachmentId });
      const attachment = Array.isArray(rows) ? rows[0] : rows;
      if (!attachment) return json(res, 404, { ok: false, error: 'Attachment not found.' });
      await supabaseRequest('/storage/v1/object/' + encodeURIComponent(attachment.storage_bucket), {
        method: 'DELETE',
        service: true,
        body: { prefixes: [attachment.storage_path] }
      });
      await call('newsroom_mark_communication_attachment_deleted', { p_attachment_id: body.attachmentId });
      return json(res, 200, { ok: true });
    }
    if (action === 'prepareStoryMedia') {
      const prepared=await call('newsroom_prepare_story_media',{
        p_story_id:body.storyId,
        p_filename:body.filename,
        p_mime_type:body.mimeType,
        p_byte_size:Number(body.byteSize),
        p_checksum:body.checksum||null,
        p_alt_text:body.altText||null,
        p_caption:body.caption||null,
        p_credit:body.credit||null,
        p_source_provenance:body.sourceProvenance||null,
        p_usage_type:body.usageType||'inline_image'
      });
      const uploadUrl=await createSignedStoryUpload(prepared.storage_bucket,prepared.storage_key);
      return json(res,200,{ok:true,prepared,uploadUrl});
    }
    if (action === 'finalizeStoryMedia') {
      const context=await call('newsroom_media_upload_context',{p_media_id:body.mediaId,p_story_id:body.storyId});
      const info=await storyMediaObjectInfo(context.storage_bucket,context.storage_key);
      const storedSize=Number(info?.metadata?.size ?? info?.size ?? 0);
      const storedMime=String(info?.metadata?.mimetype ?? info?.metadata?.['content-type'] ?? info?.mimetype ?? '').toLowerCase();
      if(storedSize&&storedSize!==Number(context.byte_size)){
        return json(res,409,{ok:false,error:'Uploaded file size does not match the prepared media record.'});
      }
      if(storedMime&&storedMime!==String(context.mime_type||'').toLowerCase()){
        return json(res,409,{ok:false,error:'Uploaded MIME type does not match the prepared media record.'});
      }
      const result=await call('newsroom_finalize_story_media',{
        p_media_id:body.mediaId,p_story_id:body.storyId,
        p_usage_type:body.usageType,p_checksum:body.checksum||null
      });
      return json(res,200,{ok:true,result});
    }
    if (action === 'attachStoryMedia') {
      await call('newsroom_attach_story_media',{p_media_id:body.mediaId,p_story_id:body.storyId,p_usage_type:body.usageType});
      return json(res,200,{ok:true});
    }
    if (action === 'detachStoryMedia') {
      await call('newsroom_detach_story_media',{p_media_id:body.mediaId,p_story_id:body.storyId,p_usage_type:body.usageType});
      return json(res,200,{ok:true});
    }
    if (action === 'updateStoryMediaMetadata') {
      await call('newsroom_update_story_media_metadata',{
        p_media_id:body.mediaId,p_alt_text:body.altText??null,p_caption:body.caption??null,
        p_credit:body.credit??null,p_source_provenance:body.sourceProvenance??null
      });
      return json(res,200,{ok:true});
    }
    if (action === 'getMediaPreview') {
      const context=await call('newsroom_get_media_preview',{p_media_id:body.mediaId});
      if(context.public_url) return json(res,200,{ok:true,url:context.public_url,public:true});
      if(context.storage_bucket!=='newsroom-private') return json(res,409,{ok:false,error:'Private preview is unavailable for this media asset.'});
      const previewUrl=await createSignedStoryPreview(context.storage_bucket,context.storage_key,300);
      return json(res,200,{ok:true,url:previewUrl,public:false,expiresIn:300});
    }
    if (action === 'requestStoryChanges') {
      const result=await call('newsroom_request_story_changes',{p_story_id:body.storyId,p_reason:body.reason});
      return json(res,200,{ok:true,result});
    }
    if (action === 'recordReview') {
      const id = await call('newsroom_record_review', {
        p_story_id: body.storyId,
        p_review_type: body.reviewType,
        p_status: body.status,
        p_notes: body.notes || null
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'restoreRevision') {
      const version = await call('newsroom_restore_revision', {
        p_story_id: body.storyId,
        p_revision_id: body.revisionId,
        p_expected_version: Number(body.expectedVersion)
      });
      return json(res, 200, { ok: true, version });
    }
    if (action === 'invite') {
      if (!config().service) return json(res, 503, { ok: false, error: 'Staff invitation delivery is not configured on staging.' });
      const invitation = await call('newsroom_create_invitation', {
        p_email: body.email,
        p_display_name: body.displayName,
        p_role_name: body.role,
        p_desk: body.desk || null,
        p_country: body.country || null,
        p_assigned_editor_id: body.assignedEditorId || null
      });
      const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
      await inviteAuthUser(invitation, origin);
      return json(res, 200, { ok: true, invitation, delivery: 'requested' });
    }
    if (action === 'changeRole') {
      await call('newsroom_change_staff_role', { p_staff_id: body.staffId, p_role_name: body.role });
      return json(res, 200, { ok: true });
    }
    if (action === 'revokeStaff') {
      await call('newsroom_revoke_staff', { p_staff_id: body.staffId, p_status: body.status || 'revoked' });
      return json(res, 200, { ok: true });
    }
    if (action === 'revokeSession') {
      const count = await call('newsroom_revoke_session', {
        p_staff_id: body.staffId,
        p_provider_session_id: body.providerSessionId || null
      });
      return json(res, 200, { ok: true, count });
    }
    if (action === 'setPremium') {
      const policy = await call('newsroom_set_story_access', { p_story_id: body.storyId, p_access_policy: body.accessPolicy });
      return json(res, 200, { ok: true, accessPolicy: policy });
    }
    if (action === 'createCampaign') {
      const id = await call('newsroom_create_campaign', {
        p_advertiser_id: body.advertiserId,
        p_name: body.name,
        p_start_at: body.startAt || null,
        p_end_at: body.endAt || null
      });
      return json(res, 200, { ok: true, id });
    }
    if (action === 'approveCampaign') {
      const reviewStatus = await call('newsroom_approve_campaign', { p_campaign_id: body.campaignId, p_approved: Boolean(body.approved) });
      return json(res, 200, { ok: true, reviewStatus });
    }

    return json(res, 404, { ok: false, error: 'Unknown Newsroom action.' });
  } catch (error) {
    return backendError(res, error);
  }
}

module.exports = handle;
