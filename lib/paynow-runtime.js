'use strict';

const { createHash } = require('node:crypto');
const {
  INITIATE_URL, buildInitiation, verifyInitiation, verifyForm, trustedUrl
} = require('./paynow-protocol');

const UNIT_ID = 'HT-MVP-EXT-01A-PROVIDER-AUTHORITY-R3-R1';
const MERCHANT_REFERENCE = /^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/;
const CONNECTIVITY_SCENARIOS = new Set(['connectivity', 'success', 'cancel', 'failure', 'delayed']);

function timeoutSignal() {
  return AbortSignal.timeout(15_000);
}

function config(env = process.env) {
  const id = String(env.PAYNOW_INTEGRATION_ID || '');
  const key = String(env.PAYNOW_INTEGRATION_KEY || '');
  const mode = String(env.PAYNOW_MODE || '').toLowerCase();
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  const publishableKey = String(env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '');
  return {
    id, key, mode, supabaseUrl, serviceKey, publishableKey,
    credentialsPresent: /^\d+$/.test(id) && key.length >= 32,
    ready: /^\d+$/.test(id) && key.length >= 32 && mode === 'test' &&
      /^https:\/\//.test(supabaseUrl) && serviceKey.length > 20
  };
}

async function authenticatedSubscriber(cfg, accessToken) {
  if (!accessToken || !cfg.publishableKey) throw new Error('AUTHENTICATION_REQUIRED');
  const userResponse = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${accessToken}` },
    signal: timeoutSignal()
  });
  const user = await userResponse.json().catch(() => null);
  if (!userResponse.ok || !user?.id) throw new Error('AUTHENTICATION_REQUIRED');
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/subscribers?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`, {
    headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
    signal: timeoutSignal()
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(rows) || !rows[0]?.id) throw new Error('SUBSCRIBER_PROFILE_REQUIRED');
  return rows[0].id;
}

async function rpc(cfg, name, args) {
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args), signal: timeoutSignal()
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`PAYMENT_AUTHORITY_RPC_FAILED:${name}:${response.status}:${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

function formFromRequestBody(body) {
  if (typeof body === 'string' || Buffer.isBuffer(body)) return body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('PAYNOW_FORM_INVALID');
  return new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString();
}

function eventIdentity(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

function sameStatusAuthority(callback, polled) {
  for (const field of ['reference', 'paynowreference', 'amount', 'status', 'pollurl']) {
    if (String(callback[field] || '') !== String(polled[field] || '')) return false;
  }
  return true;
}

async function pollVerified(rawPollUrl, key) {
  const pollUrl = trustedUrl(rawPollUrl, 'poll');
  const response = await fetch(pollUrl, { method: 'POST', redirect: 'error', signal: timeoutSignal() });
  const raw = await response.text();
  if (!response.ok) throw new Error(`PAYNOW_POLL_FAILED:${response.status}`);
  const fields = verifyForm(raw, key);
  trustedUrl(fields.pollurl, 'poll');
  return { fields, raw, httpStatus: response.status };
}

function normalizeConnectivityScenario(value) {
  const scenario = String(value || 'connectivity').trim().toLowerCase();
  if (!CONNECTIVITY_SCENARIOS.has(scenario)) throw new Error('PAYNOW_TEST_SCENARIO_INVALID');
  return scenario;
}

async function initiateIntent({ origin, purpose, idempotencyKey, subscriberId = null,
  connectivityScenario = 'connectivity', env = process.env }) {
  const cfg = config(env);
  if (!cfg.ready) throw new Error('PAYNOW_TEST_CONFIGURATION_INCOMPLETE');
  const intent = await rpc(cfg, 'payment_create_intent', {
    p_purpose: purpose, p_idempotency_key: idempotencyKey,
    p_subscriber_id: subscriberId, p_invoice_id: null,
    p_plan_key: purpose === 'PREMIUM_SUBSCRIPTION' ? 'healthtimes_premium_monthly' : null,
    p_client_supplied_amount: purpose === 'PREMIUM_SUBSCRIPTION' ? '5.00' : '1.00',
    p_client_supplied_currency: 'USD'
  });
  const claim = await rpc(cfg, 'payment_claim_paynow_initiation', {
    p_merchant_reference: intent.merchant_reference
  });
  if (!claim.claimed) {
    if (['PROVIDER_INITIATED', 'PROVIDER_PENDING'].includes(claim.internal_status) && claim.browser_url) {
      return {
        replayed: true, merchantReference: intent.merchant_reference,
        transactionId: intent.transaction_id, internalStatus: claim.internal_status,
        trustedBrowserUrl: trustedUrl(claim.browser_url, 'browser'),
        trustedPollUrl: claim.poll_url ? trustedUrl(claim.poll_url, 'poll') : null
      };
    }
    throw new Error(claim.internal_status === 'PROVIDER_PENDING'
      ? 'PAYNOW_INITIATION_IN_PROGRESS'
      : 'PAYNOW_INTENT_NOT_INITIATABLE');
  }
  const returnUrl = `${origin}/payment/return?reference=${encodeURIComponent(intent.merchant_reference)}`;
  const resultUrl = `${origin}/api/commerce?action=callback`;
  const body = buildInitiation({
    id: cfg.id, key: cfg.key, reference: intent.merchant_reference,
    amount: Number(intent.expected_amount).toFixed(2),
    additionalInfo: purpose === 'PREMIUM_SUBSCRIPTION'
      ? `HealthTimes Premium USD 5.00 monthly ${intent.merchant_reference}`
      : `HealthTimes provider TEST ${connectivityScenario} ${intent.merchant_reference}`,
    returnUrl, resultUrl, merchantTrace: claim.merchant_trace
  });
  let response;
  let verified;
  try {
    response = await fetch(INITIATE_URL, {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      signal: timeoutSignal()
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`PAYNOW_INITIATION_FAILED:${response.status}`);
    verified = verifyInitiation(raw, cfg.key);
    if (!verified.ok) throw new Error(`PAYNOW_INITIATION_REJECTED:${verified.status}:${verified.error}`);
  } catch (error) {
    await rpc(cfg, 'payment_release_paynow_initiation', {
      p_merchant_reference: intent.merchant_reference,
      p_failure_code: String(error?.message || 'PAYNOW_INITIATION_FAILED').split(':')[0]
    }).catch(() => null);
    throw error;
  }
  await rpc(cfg, 'payment_record_paynow_initiation', {
    p_merchant_reference: intent.merchant_reference,
    p_poll_url: verified.pollUrl, p_browser_url: verified.browserUrl,
    p_provider_reference: verified.providerReference
  });
  return {
    replayed: false, timestamp: new Date().toISOString(), httpStatus: response.status,
    providerStatus: verified.status, merchantReference: intent.merchant_reference,
    providerReference: verified.providerReference, responseHashVerified: true,
    trustedBrowserUrl: verified.browserUrl, trustedPollUrl: verified.pollUrl,
    reconciliationStatus: intent.reconciliation_status,
    accountingStatus: intent.accounting_status
  };
}

async function initiateConnectivity({ origin, scenario, env = process.env }) {
  const testScenario = normalizeConnectivityScenario(scenario);
  return initiateIntent({
    origin, purpose: 'PROVIDER_CONNECTIVITY_TEST', env, connectivityScenario: testScenario,
    idempotencyKey: `paynow-${testScenario}-${String(env.VERCEL_GIT_COMMIT_SHA || UNIT_ID).slice(0, 40)}`
  });
}

async function initiatePremium({ origin, accessToken, idempotencyKey, env = process.env }) {
  const cfg = config(env);
  const subscriberId = await authenticatedSubscriber(cfg, accessToken);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey || '')) throw new Error('IDEMPOTENCY_KEY_INVALID');
  return initiateIntent({ origin, purpose: 'PREMIUM_SUBSCRIPTION', subscriberId, idempotencyKey, env });
}

async function acceptCallback(body, env = process.env) {
  const cfg = config(env);
  if (!cfg.ready) throw new Error('PAYNOW_TEST_CONFIGURATION_INCOMPLETE');
  const raw = formFromRequestBody(body);
  const callback = verifyForm(raw, cfg.key);
  trustedUrl(callback.pollurl, 'poll');
  const polled = await pollVerified(callback.pollurl, cfg.key);
  if (!sameStatusAuthority(callback, polled.fields)) throw new Error('PAYNOW_CALLBACK_POLL_MISMATCH');
  const id = eventIdentity(raw);
  const result = await rpc(cfg, 'payment_record_paynow_status', {
    p_merchant_reference: callback.reference,
    p_provider_reference: callback.paynowreference,
    p_amount: callback.amount, p_currency: 'USD',
    p_provider_status: callback.status, p_poll_url: callback.pollurl,
    p_event_id: id, p_payload_hash: id,
    p_metadata: {
      source: 'paynow_callback_confirmed_by_poll',
      payment_channel: callback.paymentchannel || null,
      poll_http_status: polled.httpStatus
    }
  });
  return reconcileAccepted(cfg, result);
}

async function reconcileAccepted(cfg, result) {
  if (result?.accepted === true && result?.purpose === 'PREMIUM_SUBSCRIPTION' &&
      ['PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED'].includes(result.internal_status)) {
    const reconciliation = await rpc(cfg, 'payment_reconcile_premium_transaction', {
      p_transaction_id: result.transaction_id
    });
    return { ...result, premium_reconciliation: {
      reconciled: reconciliation?.reconciled === true,
      replayed: reconciliation?.replayed === true,
      entitlement_changed: reconciliation?.entitlement_changed === true
    } };
  }
  return result;
}

async function pollTransaction(rawPollUrl, env = process.env) {
  const cfg = config(env);
  if (!cfg.ready) throw new Error('PAYNOW_TEST_CONFIGURATION_INCOMPLETE');
  const polled = await pollVerified(rawPollUrl, cfg.key);
  const fields = polled.fields;
  const id = eventIdentity(polled.raw);
  const result = await rpc(cfg, 'payment_record_paynow_status', {
    p_merchant_reference: fields.reference, p_provider_reference: fields.paynowreference,
    p_amount: fields.amount, p_currency: 'USD', p_provider_status: fields.status,
    p_poll_url: fields.pollurl, p_event_id: id, p_payload_hash: id,
    p_metadata: { source: 'paynow_server_poll', poll_http_status: polled.httpStatus }
  });
  return reconcileAccepted(cfg, result);
}

async function pollByReference(merchantReference, env = process.env) {
  const cfg = config(env);
  if (!MERCHANT_REFERENCE.test(merchantReference || '')) {
    throw new Error('MERCHANT_REFERENCE_INVALID');
  }
  const target = await rpc(cfg, 'payment_get_paynow_poll_target', { p_merchant_reference: merchantReference });
  return pollTransaction(target.poll_url, env);
}

async function transactionStatus(merchantReference, env = process.env) {
  if (!MERCHANT_REFERENCE.test(merchantReference || '')) throw new Error('MERCHANT_REFERENCE_INVALID');
  const cfg = config(env);
  return rpc(cfg, 'payment_get_paynow_transaction_status', { p_merchant_reference: merchantReference });
}

async function readiness(env = process.env) {
  const cfg = config(env);
  let authorityCertified = false;
  if (cfg.ready) {
    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/payment_transactions?provider=eq.paynow&purpose=eq.PROVIDER_CONNECTIVITY_TEST&internal_status=eq.PAYMENT_VERIFIED&verification_authority=eq.PAYNOW_TEST_SHA512_VERIFIED&select=id&limit=1`, {
      headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
      signal: timeoutSignal()
    });
    const rows = await response.json().catch(() => []);
    authorityCertified = response.ok && Array.isArray(rows) && rows.length > 0;
  }
  const checkoutImplementationReady = true;
  const checkoutAvailable = cfg.mode === 'test' && cfg.credentialsPresent &&
    authorityCertified && checkoutImplementationReady;
  return {
    provider: 'paynow',
    status: checkoutAvailable ? 'available' : 'authority-incomplete',
    credentials_present: cfg.credentialsPresent,
    provider_authority_certified: authorityCertified,
    checkout_implementation_ready: checkoutImplementationReady,
    checkout_available: checkoutAvailable,
    configured: checkoutAvailable,
    mode: cfg.mode === 'test' ? 'test' : 'unavailable',
    mode_status: cfg.mode === 'test'
      ? 'valid_test_configuration_candidate'
      : cfg.mode
        ? 'configuration_incomplete_invalid_mode'
        : 'configuration_incomplete_missing_mode',
    paynow_configured: checkoutAvailable ? 'YES' : 'NO',
    checkout_behavior: checkoutAvailable ? 'CHECKOUT_AVAILABLE' : 'CHECKOUT_FAILS_CLOSED',
    business_authority_mutated: false
  };
}

module.exports = { UNIT_ID, config, formFromRequestBody, sameStatusAuthority,
  normalizeConnectivityScenario,
  initiateConnectivity, initiatePremium, acceptCallback, pollTransaction,
  pollByReference, transactionStatus, readiness };
