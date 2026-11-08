'use strict';

const crypto = require('node:crypto');
const paynow = require('../lib/paynow-runtime');
const { enforceSharedLimit } = require('../lib/paynow-distributed-rate');
const {
  COMMERCE_CAPABILITY_VERSION,
  CANONICAL_PREMIUM_PLAN,
  PREMIUM_TEASER_POLICY,
  LEGACY_COMMERCE_AUTHORITY
} = require('../lib/ag05-premium-commerce');

const COOKIE_ACCESS = 'htp_nr_access';
const COOKIE_CSRF = 'htp_nr_csrf';

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

async function rateGate(req,res,action,limit,windowSeconds){
  try{
    const result=await enforceSharedLimit(req,action,limit,windowSeconds);
    if(!result.allowed){
      res.setHeader('Retry-After',String(result.retry_after_seconds||1));
      send(res,429,{error:'RATE_LIMITED',entitlementGranted:false});
      return false;
    }
    return true;
  }catch{
    // No shared database RPC, untrusted Vercel IP or missing server-only HMAC
    // means no safe rate authority. NEVER fall back to an instance-local Map.
    send(res,503,{error:'RATE_CONTROL_UNAVAILABLE',entitlementGranted:false});
    return false;
  }
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

  if (process.env.EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW === '1' || process.env.HEALTHTIMES_CLIENT_PREVIEW === '1') {
    if (req.method === 'POST') {
      return send(res, 403, {
        error: 'PREVIEW_MUTATION_BLOCKED',
        message: 'Payment mutations are disabled in client review preview.',
        entitlementGranted: false,
        isolated: true
      });
    }
    if (action === 'status') {
      return send(res, 403, {
        error: 'PREVIEW_MUTATION_BLOCKED',
        message: 'Payment status inspection is disabled in client review preview.',
        entitlementGranted: false
      });
    }
    return send(res, 200, {
      ready: false,
      mode: 'preview-isolated',
      paynowStatus: 'disabled-in-preview',
      message: 'Payment operations are disabled in client review preview.'
    });
  }
  try {
    if (req.method === 'GET') {
      if (action === 'status') {
        // A merchant reference is NOT an authorization token. Only the
        // authenticated owning subscriber or a separately authorized TEST
        // operator may read this privileged status projection.
        const testOperator = paynow.config().mode === 'test' &&
          same(req.headers['x-healthtimes-unit'], paynow.UNIT_ID) &&
          same(req.headers['x-healthtimes-operator'], process.env.PAYNOW_TEST_OPERATOR_TOKEN);
        const accessToken = cookies(req)[COOKIE_ACCESS];
        if (!testOperator && !accessToken) {
          return send(res, 401, { error: 'AUTHENTICATION_REQUIRED' });
        }
        if(!await rateGate(req,res,'status',60,60)) return;
        return send(res, 200, await paynow.transactionStatus(
          String(url.searchParams.get('reference') || ''),
          process.env, { accessToken, operatorAuthorized: testOperator }
        ));
      }
      const readiness = await paynow.readiness();
      return send(res, 200, action === 'readiness' ? readiness : publicAuthority(readiness));
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });

    if (action === 'internal-test-poll') {
      if (String(process.env.PAYNOW_INTERNAL_POLL_TOKEN || '').length < 32 ||
          !same(req.headers['x-healthtimes-internal-poll'], process.env.PAYNOW_INTERNAL_POLL_TOKEN)) return send(res, 403, { error: 'INTERNAL_POLL_AUTHORITY_REQUIRED' });
      if(!await rateGate(req,res,'internal-test-poll',60,60)) return;
      const input = await body(req);
      const parsed = typeof input === 'string' && input ? JSON.parse(input) : input;
      if (!parsed || Object.keys(parsed).length !== 1 || typeof parsed.reference !== 'string') {
        return send(res, 400, { error: 'INTERNAL_POLL_REQUEST_INVALID' });
      }
      return send(res, 200, await paynow.internalConnectivityPoll(parsed.reference));
    }

    if (action === 'callback' || action === 'webhook') {
      // Do not let an IP bucket suppress genuine Paynow callback retries:
      // acceptCallback cryptographically verifies signed callback and fresh poll.
      const result = await paynow.acceptCallback(await body(req));
      return send(res, 200, { received: true, accepted: result.accepted, duplicate: result.duplicate === true });
    }

    if (action === 'connectivity') {
      if (!same(req.headers['x-healthtimes-unit'], paynow.UNIT_ID) ||
          !same(req.headers['x-healthtimes-operator'], process.env.PAYNOW_TEST_OPERATOR_TOKEN)) {
        return send(res, 403, { error: 'CONNECTIVITY_AUTHORITY_REQUIRED' });
      }
      if(!await rateGate(req,res,'connectivity',8,300)) return;
      const input = await body(req);
      const parsed = typeof input === 'string' && input ? JSON.parse(input) : input;
      return send(res, 200, await paynow.initiateConnectivity({
        origin: requestOrigin(req), scenario: parsed?.scenario
      }));
    }

    if (action === 'poll') {
      if (!same(req.headers['x-healthtimes-unit'], paynow.UNIT_ID) ||
          !same(req.headers['x-healthtimes-operator'], process.env.PAYNOW_TEST_OPERATOR_TOKEN) ||
          false) {
        return send(res, 403, { error: 'POLL_AUTHORITY_REQUIRED' });
      }
      const input = await body(req);
      const reference = typeof input === 'string' ? JSON.parse(input).reference : input?.reference;
      if(!await rateGate(req,res,'poll',20,60)) return;
      return send(res, 200, await paynow.pollByReference(String(reference || '')));
    }

    if (action === 'test-premium') {
      // Controlled authenticated TEST subscriber journey, never public checkout.
      const cfg = paynow.config();
      if (cfg.mode !== 'test' ||
          cfg.supabaseUrl !== 'https://bzuvntbkevvuhfhqhkua.supabase.co' ||
          !same(req.headers['x-healthtimes-unit'], paynow.UNIT_ID) ||
          !same(req.headers['x-healthtimes-operator'], process.env.PAYNOW_TEST_OPERATOR_TOKEN) ||
          !validCsrf(req)) {
        return send(res, 403, { error: 'TEST_PREMIUM_OPERATOR_AUTHORITY_REQUIRED', entitlementGranted: false });
      }
      const input = await body(req);
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      if(!await rateGate(req,res,'test-premium',4,300)) return;
      const result = await paynow.initiatePremium({
        origin: requestOrigin(req), accessToken: cookies(req)[COOKIE_ACCESS],
        idempotencyKey: String(parsed?.idempotencyKey || '')
      });
      return send(res, 200, {
        status: 'test-simulator-only', checkoutUrl: result.trustedBrowserUrl,
        merchantReference: result.merchantReference, entitlementGranted: false,
        commercialPaymentVerified: false
      });
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
      if (!validCsrf(req)) {
        return send(res, 403, { status: 'unavailable', checkoutUrl: null, entitlementGranted: false });
      }
      const input = await body(req);
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      if(!await rateGate(req,res,'checkout',8,300)) return;
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
      code === 'PAYMENT_STATUS_NOT_FOUND' ? 404 :
      code.endsWith('_INVALID') || code.includes('MISMATCH') ? 400 : 503;
    return send(res, status, { error: code, entitlementGranted: false });
  }
};

module.exports._internals = { cookies, validCsrf, rateGate, requestOrigin, publicAuthority, safeError };
