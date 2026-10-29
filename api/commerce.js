'use strict';

const crypto = require('node:crypto');
const paynow = require('../lib/paynow-runtime');
const {
  COMMERCE_CAPABILITY_VERSION,
  CANONICAL_PREMIUM_PLAN,
  PREMIUM_TEASER_POLICY,
  LEGACY_COMMERCE_AUTHORITY
} = require('../lib/ag05-premium-commerce');

const COOKIE_ACCESS = 'htp_nr_access';
const COOKIE_CSRF = 'htp_nr_csrf';
const rate = globalThis.__HTP_PAYNOW_RATE__ || (globalThis.__HTP_PAYNOW_RATE__ = new Map());

function send(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-AG05-Commerce-Version', COMMERCE_CAPABILITY_VERSION);
  res.end(JSON.stringify(value));
}

function cookies(req) {
  const out = Object.create(null);
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[decodeURIComponent(part.slice(0, i).trim())] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function same(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validCsrf(req) {
  const jar = cookies(req);
  const requestOrigin = String(req.headers.origin || '');
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).host !== String(req.headers['x-forwarded-host'] || req.headers.host || '')) return false;
    } catch { return false; }
  }
  return same(jar[COOKIE_CSRF], req.headers['x-htp-csrf']);
}

function allowed(req, action, limit = 12, windowMs = 60_000) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].slice(0, 80);
  const key = `${ip}:${action}`;
  const now = Date.now();
  const row = rate.get(key);
  if (!row || now - row.start > windowMs) { rate.set(key, { start: now, count: 1 }); return true; }
  row.count += 1;
  return row.count <= limit;
}

function requestOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const deploymentHost = String(process.env.VERCEL_URL || '').toLowerCase();
  const projectHost = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '').toLowerCase();
  const isKnownRuntimeHost = !deploymentHost || host === deploymentHost || host === projectHost ||
    host === 'healthtimes.co.zw' || host === 'www.healthtimes.co.zw';
  if (!/^[a-z0-9.-]+(?::\d+)?$/.test(host) ||
      !(host.endsWith('.vercel.app') || host === 'healthtimes.co.zw' || host === 'www.healthtimes.co.zw') ||
      !isKnownRuntimeHost) {
    throw new Error('REQUEST_HOST_INVALID');
  }
  return `https://${host}`;
}

async function body(req) {
  if (req.body !== undefined) return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error('REQUEST_BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function publicAuthority(readiness) {
  const available = readiness.checkout_available === true;
  return {
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: available ? 'available' : 'authority-incomplete',
    paymentGatewayMigrationComplete: available,
    currentProvider: available ? 'paynow' : null,
    currentPrice: available ? '5.00' : null,
    currentCurrency: available ? 'USD' : null,
    billingInterval: available ? 'month' : null,
    productPlanIds: available ? ['healthtimes_premium_monthly'] : [],
    canonicalPremiumPlan: CANONICAL_PREMIUM_PLAN,
    providerReadiness: readiness,
    teaserPolicy: {
      paragraphCount: PREMIUM_TEASER_POLICY.premiumTeaserParagraphCount,
      durationSeconds: PREMIUM_TEASER_POLICY.premiumTeaserDurationSeconds
    },
    legacyEvidence: LEGACY_COMMERCE_AUTHORITY,
    entitlementGranted: false
  };
}

function safeError(error) {
  const code = String(error?.message || 'PAYNOW_REQUEST_FAILED').split(':')[0];
  return /^[A-Z0-9_]+$/.test(code) ? code : 'PAYNOW_REQUEST_FAILED';
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url || '/api/commerce', 'https://' + (req.headers.host || 'localhost'));
  const action = String(url.searchParams.get('action') || '').toLowerCase();
  try {
    if (req.method === 'GET') {
      if (action === 'status') {
        if (!allowed(req, 'status', 60)) return send(res, 429, { error: 'RATE_LIMITED' });
        return send(res, 200, await paynow.transactionStatus(String(url.searchParams.get('reference') || '')));
      }
      const readiness = await paynow.readiness();
      return send(res, 200, action === 'readiness' ? readiness : publicAuthority(readiness));
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });

    if (action === 'internal-test-poll') {
      if (String(process.env.PAYNOW_INTERNAL_POLL_TOKEN || '').length < 32 ||
          !same(req.headers['x-healthtimes-internal-poll'], process.env.PAYNOW_INTERNAL_POLL_TOKEN) ||
          !allowed(req, 'internal-test-poll', 60)) return send(res, 403, { error: 'INTERNAL_POLL_AUTHORITY_REQUIRED' });
      const input = await body(req);
      const parsed = typeof input === 'string' && input ? JSON.parse(input) : input;
      if (!parsed || Object.keys(parsed).length !== 1 || typeof parsed.reference !== 'string') {
        return send(res, 400, { error: 'INTERNAL_POLL_REQUEST_INVALID' });
      }
      return send(res, 200, await paynow.internalConnectivityPoll(parsed.reference));
    }

    if (action === 'callback' || action === 'webhook') {
      if (!allowed(req, 'callback', 120)) return send(res, 429, { error: 'RATE_LIMITED' });
      const result = await paynow.acceptCallback(await body(req));
      return send(res, 200, { received: true, accepted: result.accepted, duplicate: result.duplicate === true });
    }

    if (action === 'connectivity') {
      if (!same(req.headers['x-healthtimes-unit'], paynow.UNIT_ID) ||
          !same(req.headers['x-healthtimes-operator'], process.env.PAYNOW_TEST_OPERATOR_TOKEN) ||
          !allowed(req, 'connectivity', 8, 300_000)) {
        return send(res, 403, { error: 'CONNECTIVITY_AUTHORITY_REQUIRED' });
      }
      const input = await body(req);
      const parsed = typeof input === 'string' && input ? JSON.parse(input) : input;
      return send(res, 200, await paynow.initiateConnectivity({
        origin: requestOrigin(req), scenario: parsed?.scenario
      }));
    }

    if (action === 'poll') {
      if (!same(req.headers['x-healthtimes-unit'], paynow.UNIT_ID) ||
          !same(req.headers['x-healthtimes-operator'], process.env.PAYNOW_TEST_OPERATOR_TOKEN) ||
          !allowed(req, 'poll', 20)) {
        return send(res, 403, { error: 'POLL_AUTHORITY_REQUIRED' });
      }
      const input = await body(req);
      const reference = typeof input === 'string' ? JSON.parse(input).reference : input?.reference;
      return send(res, 200, await paynow.pollByReference(String(reference || '')));
    }

    if (action === 'checkout') {
      // Browser query parameters such as paid=true, premium=true or success=1 are
      // deliberately ignored. Only verified server callback/poll authority can
      // transition payment state, and entitlement still requires reconciliation.
      const readiness = await paynow.readiness();
      if (!readiness.checkout_available) return send(res, 503, {
        status: 'configuration-required', checkoutUrl: null, entitlementGranted: false,
        providerReadiness: readiness
      });
      if (!validCsrf(req) || !allowed(req, 'checkout', 8, 300_000)) {
        return send(res, 403, { status: 'unavailable', checkoutUrl: null, entitlementGranted: false });
      }
      const input = await body(req);
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      const result = await paynow.initiatePremium({
        origin: requestOrigin(req), accessToken: cookies(req)[COOKIE_ACCESS],
        idempotencyKey: String(parsed?.idempotencyKey || '')
      });
      return send(res, 200, {
        status: 'redirect-required', checkoutUrl: result.trustedBrowserUrl,
        merchantReference: result.merchantReference, entitlementGranted: false
      });
    }

    return send(res, 400, { error: 'UNSUPPORTED_COMMERCE_ACTION' });
  } catch (error) {
    const code = safeError(error);
    const status = code === 'AUTHENTICATION_REQUIRED' ? 401 :
      code.endsWith('_INVALID') || code.includes('MISMATCH') ? 400 : 503;
    return send(res, status, { error: code, entitlementGranted: false });
  }
};

module.exports._internals = { cookies, validCsrf, allowed, requestOrigin, publicAuthority, safeError };
