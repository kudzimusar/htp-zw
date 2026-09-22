'use strict';

const crypto = require('crypto');

const COOKIE_ACCESS = 'htp_nr_access';
const COOKIE_CSRF = 'htp_nr_csrf';
const rateState = globalThis.__HTP_COM01_RATE__ || (globalThis.__HTP_COM01_RATE__ = new Map());

function config() {
  return {
    supabaseUrl: String(process.env.SUPABASE_URL || process.env.HEALTHTIMES_SUPABASE_URL || '').replace(/\/$/, ''),
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.HEALTHTIMES_SUPABASE_SERVICE_ROLE_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFrom: process.env.COM01_RESEND_FROM || '',
    resendWebhookSecret: process.env.COM01_RESEND_WEBHOOK_SECRET || '',
    replyDomain: process.env.COM01_REPLY_DOMAIN || '',
    inboundSecret: process.env.COM01_INBOUND_WEBHOOK_SECRET || '',
    brevoApiKey: process.env.BREVO_API_KEY || '',
    brevoWebhookToken: process.env.COM01_BREVO_WEBHOOK_TOKEN || '',
    brevoListNewsletter: process.env.COM01_BREVO_LIST_NEWSLETTER || '',
    brevoListBreaking: process.env.COM01_BREVO_LIST_BREAKING_NEWS || '',
    brevoListMarketing: process.env.COM01_BREVO_LIST_MARKETING || ''
  };
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

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    return parsed.host === host;
  } catch {
    return false;
  }
}

function timingSafeString(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireCsrf(req) {
  if (!sameOrigin(req)) return false;
  const cookies = parseCookies(req);
  return timingSafeString(cookies[COOKIE_CSRF], req.headers['x-htp-csrf']);
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
}

function rateLimit(req, action) {
  const spec = {
    signup: [20, 60 * 60_000],
    reply: [60, 60_000],
    inbound: [180, 60_000],
    resendWebhook: [300, 60_000],
    brevoWebhook: [300, 60_000]
  }[action];
  if (!spec) return true;
  const [limit, windowMs] = spec;
  const now = Date.now();
  const key = clientIp(req) + ':' + action;
  const state = rateState.get(key);
  if (!state || now - state.started > windowMs) {
    rateState.set(key, { started: now, count: 1 });
    return true;
  }
  state.count += 1;
  return state.count <= limit;
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return { raw: req.body.toString('utf8'), exact: true };
  if (typeof req.body === 'string') return { raw: req.body, exact: true };
  if (req.body && typeof req.body === 'object') return { raw: JSON.stringify(req.body), exact: false };
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return { raw: Buffer.concat(chunks).toString('utf8'), exact: true };
}

function parseJson(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return null;
  }
}

async function supabaseRequest(path, { method = 'GET', token, service = false, body } = {}) {
  const c = config();
  if (!c.supabaseUrl || !c.publishableKey) {
    const error = new Error('HealthTimes staging backend is not configured.');
    error.status = 503;
    throw error;
  }
  const key = service ? c.serviceKey : c.publishableKey;
  if (!key) {
    const error = new Error(service ? 'Server-only staging credential is not configured.' : 'Staging publishable credential is not configured.');
    error.status = 503;
    throw error;
  }
  const headers = { apikey: key };
  headers.Authorization = 'Bearer ' + (service ? key : token || key);
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(c.supabaseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  });
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }
  if (!response.ok) {
    const error = new Error(
      (data && typeof data === 'object' && (data.message || data.error_description || data.error || data.msg)) ||
      ('Backend request failed (' + response.status + ')')
    );
    error.status = response.status;
    error.backend = data;
    throw error;
  }
  return data;
}

async function rpc(name, args, { token, service = false } = {}) {
  return supabaseRequest('/rest/v1/rpc/' + encodeURIComponent(name), {
    method: 'POST',
    token,
    service,
    body: args || {}
  });
}

async function requireStaffToken(req) {
  const token = parseCookies(req)[COOKIE_ACCESS];
  if (!token) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }
  await supabaseRequest('/auth/v1/user', { token });
  await rpc('newsroom_current_context', {}, { token });
  return token;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function verifyHmac(raw, secret, supplied) {
  if (!secret || !supplied) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeString(expected, supplied);
}

function verifyResendWebhook(raw, req, secret) {
  if (!secret) return { ok: false, reason: 'resend_webhook_secret_unconfigured' };
  const id = String(req.headers['svix-id'] || '');
  const timestamp = String(req.headers['svix-timestamp'] || '');
  const signatureHeader = String(req.headers['svix-signature'] || '');
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'missing_svix_headers' };

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
    return { ok: false, reason: 'stale_svix_timestamp' };
  }

  let key;
  try {
    const encoded = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    key = Buffer.from(encoded, 'base64');
  } catch {
    return { ok: false, reason: 'invalid_webhook_secret' };
  }

  const signed = [id, timestamp, raw].join('.');
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');
  const candidates = signatureHeader.split(/\s+/).map(value => {
    const parts = value.split(',');
    return parts[0] === 'v1' ? parts[1] : '';
  }).filter(Boolean);

  return {
    ok: candidates.some(candidate => timingSafeString(expected, candidate)),
    reason: 'signature_mismatch',
    id
  };
}

function extractEmails(value) {
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap(item => String(item || '').split(','))
    .map(item => {
      const match = item.match(/<([^<>]+@[^<>]+)>/);
      return (match ? match[1] : item).trim().toLowerCase();
    })
    .filter(item => item.includes('@'));
}

function extractReplyToken(value) {
  for (const address of extractEmails(value)) {
    const match = address.match(/^reply\+([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})@/i);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

function queueFromRecipient(value) {
  const allowed = new Set(['newsroom','tips','corrections','advertising','subscriptions','support','privacy','press']);
  for (const address of extractEmails(value)) {
    const local = address.split('@')[0].toLowerCase();
    if (allowed.has(local)) return local;
  }
  return null;
}

async function recordSendFailure(messageId, reason) {
  try {
    await rpc('communications_record_send_result', {
      p_message_id: messageId,
      p_provider_message_id: null,
      p_status: 'failed',
      p_error: String(reason || 'provider unavailable').slice(0, 1000)
    }, { service: true });
  } catch {}
}

async function sendResendReply(prepared) {
  const c = config();
  if (!c.resendApiKey || !c.resendFrom || !c.replyDomain) {
    const missing = [
      !c.resendApiKey && 'RESEND_API_KEY',
      !c.resendFrom && 'COM01_RESEND_FROM',
      !c.replyDomain && 'COM01_REPLY_DOMAIN'
    ].filter(Boolean).join(',');
    await recordSendFailure(prepared.message_id, 'Resend staging configuration missing: ' + missing);
    const error = new Error('Resend staging is not configured: ' + missing);
    error.status = 503;
    throw error;
  }

  const payload = {
    from: c.resendFrom,
    to: [prepared.to_email],
    subject: prepared.subject,
    text: prepared.body_text,
    reply_to: 'reply+' + prepared.reply_token + '@' + c.replyDomain,
    headers: {
      'X-HealthTimes-Thread': prepared.thread_id
    }
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + c.resendApiKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'com01-' + prepared.message_id
    },
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw }; }

  if (!response.ok || !data.id) {
    const reason = data.message || data.error || ('Resend HTTP ' + response.status);
    await recordSendFailure(prepared.message_id, reason);
    const error = new Error('Transactional provider send failed.');
    error.status = 502;
    error.provider = reason;
    throw error;
  }

  await rpc('communications_record_send_result', {
    p_message_id: prepared.message_id,
    p_provider_message_id: data.id,
    p_status: 'sent',
    p_error: null
  }, { service: true });

  return { provider: 'resend', providerMessageId: data.id };
}

function brevoListForPurpose(purpose) {
  const c = config();
  const raw =
    purpose === 'NEWSLETTER' ? c.brevoListNewsletter :
    purpose === 'BREAKING_NEWS' ? c.brevoListBreaking :
    purpose === 'MARKETING' ? c.brevoListMarketing : '';
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function syncBrevoContact(email, purpose, contactId) {
  const c = config();
  if (!c.brevoApiKey) {
    await rpc('communications_mark_consent_sync', {
      p_contact_id: contactId,
      p_purpose: purpose,
      p_state: 'failed',
      p_error: 'BREVO_API_KEY is not configured for HealthTimes staging.'
    }, { service: true });
    return { ok: false, reason: 'brevo_api_key_unconfigured' };
  }

  const listId = brevoListForPurpose(purpose);
  const body = { email, updateEnabled: true, getId: true };
  if (listId) body.listIds = [listId];

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': c.brevoApiKey,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(body)
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

  if (!response.ok) {
    const reason = data.message || data.code || ('Brevo HTTP ' + response.status);
    await rpc('communications_mark_consent_sync', {
      p_contact_id: contactId,
      p_purpose: purpose,
      p_state: 'failed',
      p_error: String(reason).slice(0, 1000)
    }, { service: true });
    return { ok: false, reason: 'brevo_sync_failed' };
  }

  await rpc('communications_mark_consent_sync', {
    p_contact_id: contactId,
    p_purpose: purpose,
    p_state: 'synced',
    p_error: null
  }, { service: true });
  return { ok: true, provider: 'brevo', providerContactId: data.id || null, listId };
}

function providerHealth() {
  const c = config();
  return {
    resend: {
      configured: Boolean(c.resendApiKey && c.resendFrom && c.resendWebhookSecret),
      senderConfigured: Boolean(c.resendFrom),
      webhookVerificationConfigured: Boolean(c.resendWebhookSecret),
      replyDomainConfigured: Boolean(c.replyDomain)
    },
    brevo: {
      configured: Boolean(c.brevoApiKey),
      webhookVerificationConfigured: Boolean(c.brevoWebhookToken),
      newsletterListConfigured: Boolean(c.brevoListNewsletter),
      breakingNewsListConfigured: Boolean(c.brevoListBreaking),
      marketingListConfigured: Boolean(c.brevoListMarketing)
    },
    cloudflareInbound: {
      configured: Boolean(c.inboundSecret && c.replyDomain)
    }
  };
}

async function handleInbound(req, res, raw, exact) {
  const c = config();
  if (!exact) return json(res, 400, { ok: false, error: 'Raw inbound body unavailable; request denied.' });
  if (!c.inboundSecret) return json(res, 503, { ok: false, error: 'HealthTimes staging inbound verification is not configured.' });
  if (!verifyHmac(raw, c.inboundSecret, req.headers['x-healthtimes-signature'])) {
    return json(res, 401, { ok: false, error: 'Inbound signature verification failed.' });
  }

  const payload = parseJson(raw);
  if (!payload) return json(res, 400, { ok: false, error: 'Invalid inbound payload.' });
  const eventId = String(req.headers['x-healthtimes-event-id'] || payload.eventId || '').trim();
  if (!eventId) return json(res, 400, { ok: false, error: 'Inbound provider event id required.' });

  const toValue = payload.to || payload.recipient || (payload.envelope && payload.envelope.to) || '';
  const queue = String(payload.queue || queueFromRecipient(toValue) || '').toLowerCase();
  const replyToken = payload.replyToken || extractReplyToken(toValue);
  const fromEmail = extractEmails(payload.from || payload.sender || (payload.envelope && payload.envelope.from) || '')[0] || '';
  const toEmail = extractEmails(toValue)[0] || '';

  const result = await rpc('communications_ingest_inbound', {
    p_provider: 'cloudflare',
    p_event_id: eventId,
    p_queue_key: queue,
    p_from_email: fromEmail,
    p_to_email: toEmail,
    p_subject: String(payload.subject || '(no subject)'),
    p_body_text: String(payload.text || payload.bodyText || ''),
    p_body_html: String(payload.html || payload.bodyHtml || ''),
    p_reply_token: replyToken || null,
    p_provider_message_id: String(payload.messageId || payload.message_id || '') || null,
    p_payload_hash: sha256(raw),
    p_payload: payload
  }, { service: true });

  return json(res, 200, { ok: true, data: result });
}

async function handleResendWebhook(req, res, raw, exact) {
  const c = config();
  if (!exact) return json(res, 400, { ok: false, error: 'Raw webhook body unavailable; request denied.' });
  const verified = verifyResendWebhook(raw, req, c.resendWebhookSecret);
  if (!verified.ok) {
    const status = verified.reason === 'resend_webhook_secret_unconfigured' ? 503 : 401;
    return json(res, status, { ok: false, error: 'Resend webhook verification failed.' });
  }

  const payload = parseJson(raw);
  if (!payload) return json(res, 400, { ok: false, error: 'Invalid Resend webhook payload.' });
  const recipient = extractEmails((payload.data && payload.data.to) || '')[0] || '';
  const result = await rpc('communications_ingest_provider_event', {
    p_provider: 'resend',
    p_event_id: verified.id,
    p_event_type: String(payload.type || ''),
    p_provider_message_id: String((payload.data && payload.data.email_id) || ''),
    p_recipient_email: recipient,
    p_payload_hash: sha256(raw),
    p_payload: payload
  }, { service: true });

  return json(res, 200, { ok: true, data: result });
}

function brevoEventType(payload) {
  const value = String(payload.event || payload.type || '').trim();
  const map = {
    hardBounce: 'hard_bounce',
    softBounce: 'soft_bounce',
    spam: 'spam',
    unsubscribed: 'unsubscribed',
    delivered: 'delivered',
    blocked: 'blocked',
    invalid: 'invalid',
    error: 'failed'
  };
  return map[value] || value;
}

async function handleBrevoWebhook(req, res, raw, exact) {
  const c = config();
  if (!exact) return json(res, 400, { ok: false, error: 'Raw webhook body unavailable; request denied.' });
  if (!c.brevoWebhookToken) return json(res, 503, { ok: false, error: 'HealthTimes staging Brevo webhook verification is not configured.' });
  if (!timingSafeString(req.headers['x-healthtimes-brevo-token'], c.brevoWebhookToken)) {
    return json(res, 401, { ok: false, error: 'Brevo webhook verification failed.' });
  }

  const payload = parseJson(raw);
  if (!payload) return json(res, 400, { ok: false, error: 'Invalid Brevo webhook payload.' });

  const providerEventId = String(
    payload.id || payload.eventId || payload['message-id'] || payload.messageId ||
    (brevoEventType(payload) + ':' + (payload.email || '') + ':' + (payload.date || payload.ts || sha256(raw)))
  );

  const result = await rpc('communications_ingest_provider_event', {
    p_provider: 'brevo',
    p_event_id: providerEventId,
    p_event_type: brevoEventType(payload),
    p_provider_message_id: String(payload['message-id'] || payload.messageId || ''),
    p_recipient_email: String(payload.email || ''),
    p_payload_hash: sha256(raw),
    p_payload: payload
  }, { service: true });

  return json(res, 200, { ok: true, data: result });
}

async function handle(req, res) {
  if (!['GET','POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed.' });

  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  const queryAction = String(url.searchParams.get('action') || '');
  const webhookAction = ['inbound','resendWebhook','brevoWebhook'].includes(queryAction);

  let rawInfo = { raw: '', exact: true };
  let body = {};
  if (req.method === 'POST') {
    rawInfo = await readRawBody(req);
    body = parseJson(rawInfo.raw) || {};
  }

  const action = queryAction || String(body.action || (req.method === 'GET' ? 'providerHealth' : ''));
  if (!rateLimit(req, action)) return json(res, 429, { ok: false, error: 'Too many requests.' });

  try {
    if (webhookAction) {
      if (action === 'inbound') return handleInbound(req, res, rawInfo.raw, rawInfo.exact);
      if (action === 'resendWebhook') return handleResendWebhook(req, res, rawInfo.raw, rawInfo.exact);
      return handleBrevoWebhook(req, res, rawInfo.raw, rawInfo.exact);
    }

    if (action === 'signup') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST required.' });
      if (!sameOrigin(req)) return json(res, 403, { ok: false, error: 'Origin check failed.' });

      const email = String(body.email || '').trim().toLowerCase();
      const purpose = String(body.purpose || 'NEWSLETTER').toUpperCase();
      const policyVersion = String(body.policyVersion || '').trim();
      const allowedPurpose = new Set(['NEWSLETTER','BREAKING_NEWS','MARKETING','RESEARCH_UPDATES','EVENTS','PARTNER_CONTENT']);
      if (!email.includes('@') || !allowedPurpose.has(purpose) || !policyVersion) {
        return json(res, 400, { ok: false, error: 'Valid email, purpose and policy version are required.' });
      }
      if (body.consent !== true) {
        return json(res, 400, { ok: false, error: 'Explicit marketing consent is required.' });
      }

      const consent = await rpc('communications_record_consent', {
        p_email: email,
        p_purpose: purpose,
        p_channel: 'email',
        p_granted: true,
        p_source: String(body.source || 'healthtimes-web').slice(0, 120),
        p_policy_version: policyVersion
      }, { service: true });

      const eligible = await rpc('communications_marketing_eligible', {
        p_contact_id: consent.contact_id,
        p_purpose: purpose
      }, { service: true });

      if (eligible !== true) {
        return json(res, 409, { ok: false, error: 'Contact is not eligible for marketing synchronization.', consent });
      }

      const sync = await syncBrevoContact(email, purpose, consent.contact_id);
      return json(res, sync.ok ? 200 : 503, { ok: sync.ok, consent, providerSync: sync });
    }

    const token = await requireStaffToken(req);

    if (action === 'providerHealth') {
      return json(res, 200, { ok: true, providers: providerHealth() });
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST required.' });
    if (!requireCsrf(req)) return json(res, 403, { ok: false, error: 'Request integrity check failed.' });

    if (action === 'reply') {
      const prepared = await rpc('communications_prepare_reply', {
        p_thread_id: body.threadId,
        p_body_text: String(body.bodyText || ''),
        p_subject: body.subject ? String(body.subject) : null
      }, { token });

      prepared.body_text = String(body.bodyText || '');
      const send = await sendResendReply(prepared);
      return json(res, 200, { ok: true, messageId: prepared.message_id, send });
    }

    return json(res, 400, { ok: false, error: 'Unknown communications action.' });
  } catch (error) {
    const backendCode = error && error.backend && typeof error.backend === 'object' ? String(error.backend.code || '') : '';
    const status =
      backendCode === '42501' ? 403 :
      backendCode === '22023' ? 400 :
      backendCode === 'P0002' ? 404 :
      Number(error && error.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const message = safeStatus >= 500 ? 'Communications request failed safely.' : String((error && error.message) || 'Request denied.');
    return json(res, safeStatus, { ok: false, error: message });
  }
}

module.exports = handle;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
