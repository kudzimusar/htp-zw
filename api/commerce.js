'use strict';

const {
  COMMERCE_CAPABILITY_VERSION,
  publicCommerceAuthority,
  checkoutDecision,
  webhookDecision
} = require('../lib/ag05-premium-commerce');

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-AG05-Commerce-Version', COMMERCE_CAPABILITY_VERSION);
}

function send(res, status, value) {
  res.statusCode = status;
  securityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, publicCommerceAuthority());
  }

  if (req.method !== 'POST') {
    return send(res, 405, {
      capabilityVersion: COMMERCE_CAPABILITY_VERSION,
      error: 'method-not-allowed',
      entitlementGranted: false
    });
  }

  const url = new URL(req.url || '/api/commerce', 'https://' + (req.headers?.host || 'localhost'));
  const action = String(url.searchParams.get('action') || 'checkout').toLowerCase();

  // Browser query parameters such as paid=true, premium=true or success=1 are
  // deliberately ignored. Only a future verified provider webhook may create
  // payment/subscription state and only authoritative entitlement may unlock
  // Premium content.
  if (action === 'webhook' || action === 'callback') {
    const decision = webhookDecision();
    return send(res, decision.httpStatus, decision);
  }

  if (action === 'checkout') {
    const decision = checkoutDecision();
    return send(res, decision.httpStatus, decision);
  }

  return send(res, 400, {
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    error: 'unsupported-commerce-action',
    entitlementGranted: false
  });
};

module.exports._internals = { securityHeaders, send };
