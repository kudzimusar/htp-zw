'use strict';

const { createHash } = require('node:crypto');
const {
  INITIATE_URL, buildInitiation, verifyInitiation, verifyForm, trustedUrl
} = require('./paynow-protocol');

const UNIT_ID = 'HT-MVP-EXT-01A-PROVIDER-AUTHORITY-R3-R1';
const MERCHANT_REFERENCE = /^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/;
const CONNECTIVITY_SCENARIOS = new Set(['connectivity', 'success', 'cancel', 'failure', 'delayed', 'callback']);

function timeoutSignal() {
  return AbortSignal.timeout(15_000);
}

function config(env = process.env) {
  const mode = String(env.PAYNOW_MODE || '').toLowerCase();
  const isLive = mode === 'live';
  // Never fall back from a missing LIVE secret to the existing TEST integration.
  const id = String(isLive ? env.PAYNOW_LIVE_INTEGRATION_ID || '' : env.PAYNOW_INTEGRATION_ID || '');
  const key = String(isLive ? env.PAYNOW_LIVE_INTEGRATION_KEY || '' : env.PAYNOW_INTEGRATION_KEY || '');
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  const publishableKey = String(env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '');
  const credentialsPresent = /^\d+$/.test(id) && key.length >= 32;
  const flags = [
    'PAYNOW_LIVE_CODE_ENABLED', 'PAYNOW_LIVE_OWNER_AUTHORIZED',
    'PAYNOW_LIVE_SECURITY_APPROVED', 'PAYNOW_LIVE_FINANCE_APPROVED',
    'PAYNOW_LIVE_MERCHANT_USD_CERTIFIED',
    'PAYNOW_LIVE_SETTLEMENT_CURRENCY_EVIDENCE_CONFIRMED',
    'PAYNOW_LIVE_PAYMENT_EXECUTION_AUTHORIZED',
    'PAYNOW_LIVE_MONETARY_RPC_CERTIFIED',
    'PAYNOW_PROVIDER_AUTHORITY_CERTIFIED',
    'PAYNOW_CHECKOUT_IMPLEMENTATION_VERIFIED', 'PAYNOW_CHECKOUT_PUBLIC'
  ];
  const liveApprovalsPresent = flags.every(name => String(env[name] || '') === '1');
  const liveCallbackUrl = String(env.PAYNOW_LIVE_CALLBACK_URL || '');
  const liveReturnOrigin = String(env.PAYNOW_LIVE_RETURN_ORIGIN || '');
  const liveIdentityValid = liveCallbackUrl === 'https://healthtimes.co.zw/api/commerce?action=callback' &&
    liveReturnOrigin === 'https://healthtimes.co.zw' &&
    env.VERCEL_ENV === 'production' &&
    supabaseUrl !== 'https://bzuvntbkevvuhfhqhkua.supabase.co' &&
    id !== String(env.PAYNOW_INTEGRATION_ID || '') &&
    key !== String(env.PAYNOW_INTEGRATION_KEY || '') &&
    /^https:\/\//.test(supabaseUrl);
  const liveCodeReady = isLive && credentialsPresent && liveApprovalsPresent && liveIdentityValid &&
    serviceKey.length > 20;
  const testReady = mode === 'test' && credentialsPresent && serviceKey.length > 20 &&
    supabaseUrl === 'https://bzuvntbkevvuhfhqhkua.supabase.co';
  return {
    id, key, mode, supabaseUrl, serviceKey, publishableKey,
    credentialsPresent, liveCodeReady, liveApprovalsPresent,
    liveCallbackUrl, liveReturnOrigin, ready: testReady || liveCodeReady
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
  // Vercel's parsed form represents duplicate fields as arrays. Reject them;
  // coercing an array would silently change the authenticated message.
  if (Object.values(body).some((value) => typeof value !== 'string')) throw new Error('PAYNOW_FORM_INVALID');
  return new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString();
}

function eventIdentity(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

function sameStatusAuthority(callback, polled) {
  for (const field of ['reference', 'paynowreference', 'amount', 'status', 'pollurl', 'currency']) {
    if (String(callback[field] || '') !== String(polled[field] || '')) return false;
  }
  return true;
}

function verifiedCurrency(fields) {
  const currency = String(fields.currency || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('PAYNOW_CURRENCY_UNVERIFIED');
  return currency;
}

async function pollVerified(rawPollUrl, key) {
  const pollUrl = trustedUrl(rawPollUrl, 'poll');
  const response = await fetch(pollUrl, { method: 'POST', body: '', redirect: 'error', signal: timeoutSignal() });
  const raw = await response.text();
  if (!response.ok) throw new Error(`PAYNOW_POLL_FAILED:${response.status}`);
  const fields = verifyForm(raw, key);
  trustedUrl(fields.pollurl, 'poll');
  return { fields, raw, httpStatus: response.status };
}

async function internalConnectivityPoll(reference, env = process.env) {
  const cfg = config(env);
  if (!cfg.ready || cfg.id !== '20637' || cfg.supabaseUrl !== 'https://bzuvntbkevvuhfhqhkua.supabase.co') {
    throw new Error('PAYNOW_TEST_CONFIGURATION_INCOMPLETE');
  }
  if (!/^HT-CONN-[0-9A-HJKMNP-TV-Z]{26}$/.test(reference || '')) throw new Error('MERCHANT_REFERENCE_INVALID');
  const lookup = await fetch(`${cfg.supabaseUrl}/rest/v1/payment_transactions?provider=eq.paynow&purpose=eq.PROVIDER_CONNECTIVITY_TEST&merchant_reference=eq.${encodeURIComponent(reference)}&select=expected_amount,poll_url,provider_reference&limit=2`, {
    headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` }, signal: timeoutSignal(), redirect: 'error'
  });
  if (!lookup.ok) throw new Error('PAYNOW_TEST_LOOKUP_FAILED');
  const rows = await lookup.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('PAYNOW_TEST_TARGET_INVALID');
  const target = rows[0];
  const polled = await pollVerified(target.poll_url, cfg.key);
  const fields = polled.fields;
  const cents = (v) => { const m = /^(\d{1,16})(?:\.(\d{1,2}))?$/.exec(String(v));
    return m ? BigInt(m[1]) * 100n + BigInt((m[2] || '').padEnd(2, '0')) : null; };
  if (fields.reference !== reference || fields.pollurl !== target.poll_url ||
      (target.provider_reference && String(target.provider_reference) !== fields.paynowreference) ||
      cents(target.expected_amount) === null || cents(target.expected_amount) !== cents(fields.amount)) {
    throw new Error('PAYNOW_TEST_POLL_MISMATCH');
  }
  return { signedForm: polled.raw };
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
  if (cfg.mode === 'live' && (origin !== cfg.liveReturnOrigin || !cfg.liveCodeReady)) {
    throw new Error('PAYNOW_LIVE_AUTHORITY_REQUIRED');
  }
  const returnUrl = `${origin}/payment/return?reference=${encodeURIComponent(intent.merchant_reference)}`;
  // TEST callbacks only reach the isolated Staging Edge function. LIVE callbacks
  // require the separately approved public server callback and USD evidence.
  const resultUrl = cfg.mode === 'test'
    ? `${cfg.supabaseUrl}/functions/v1/paynow-test-callback`
    : cfg.liveCallbackUrl;
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
  // A transport timeout, HTTP error, malformed response or lost database update
  // does NOT prove Paynow declined the request. Never unlock a retry for such an
  // ambiguous outcome: the same reference could otherwise be charged twice.
  let signedProviderRejection = false;
  try {
    response = await fetch(INITIATE_URL, {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      signal: timeoutSignal()
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`PAYNOW_INITIATION_FAILED:${response.status}`);
    verified = verifyInitiation(raw, cfg.key);
    if (!verified.ok) {
      signedProviderRejection = true;
      throw new Error(`PAYNOW_INITIATION_REJECTED:${verified.status}:${verified.error}`);
    }
  } catch (error) {
    // Reopen only an explicitly SHA-512-verified Paynow Error. An ambiguous
    // claim remains PROVIDER_PENDING pending authorized merchanttrace recovery.
    if (signedProviderRejection) {
      await rpc(cfg, 'payment_release_paynow_initiation', {
        p_merchant_reference: intent.merchant_reference,
        p_failure_code: 'PAYNOW_INITIATION_REJECTED'
      }).catch(() => null);
    }
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
  if (config(env).mode !== 'test') throw new Error('PAYNOW_TEST_ONLY');
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

async function forwardSimulatedStatus(raw, cfg) {
  if (cfg.mode !== 'test' || cfg.supabaseUrl !== 'https://bzuvntbkevvuhfhqhkua.supabase.co') {
    throw new Error('PAYNOW_TEST_STAGING_ONLY');
  }
  // The TEST Edge verifies the signed form, target transaction, amount and
  // fresh provider poll. It stores *only* non-commercial simulator evidence.
  const response = await fetch(`${cfg.supabaseUrl}/functions/v1/paynow-test-callback`, {
    method: 'POST', redirect: 'error', signal: timeoutSignal(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: raw
  });
  if (!response.ok) throw new Error(`PAYNOW_TEST_SIMULATION_RECORD_FAILED:${response.status}`);
  const result = await response.json().catch(() => null);
  if (!result?.test_simulation_recorded || result?.commercial_payment_verified !== false) {
    throw new Error('PAYNOW_TEST_SIMULATION_AUTHORITY_INVALID');
  }
  return { accepted: false, duplicate: result.duplicate === true,
    internal_status: result.test_outcome, test_simulation_recorded: true,
    payment_verified: false, entitlement_granted: false, reconciliation_eligible: false };
}

async function acceptCallback(body, env = process.env) {
  const cfg = config(env);
  if (!cfg.ready) throw new Error('PAYNOW_CONFIGURATION_INCOMPLETE');
  const raw = formFromRequestBody(body);
  const callback = verifyForm(raw, cfg.key);
  trustedUrl(callback.pollurl, 'poll');
  const polled = await pollVerified(callback.pollurl, cfg.key);
  if (!sameStatusAuthority(callback, polled.fields)) throw new Error('PAYNOW_CALLBACK_POLL_MISMATCH');
  if (cfg.mode === 'test') return forwardSimulatedStatus(raw, cfg);
  const currency = verifiedCurrency(callback);
  if (currency !== 'USD') throw new Error('PAYNOW_LIVE_USD_NOT_VERIFIED');
  const id = eventIdentity(raw);
  const result = await rpc(cfg, 'payment_record_paynow_live_status', {
    p_merchant_reference: callback.reference,
    p_provider_reference: callback.paynowreference,
    p_amount: callback.amount, p_currency: currency,
    p_provider_status: callback.status, p_poll_url: callback.pollurl,
    p_event_id: id, p_payload_hash: id,
    p_metadata: {
      source: 'paynow_live_callback_confirmed_by_poll',
      currency_source: 'SIGNED_PROVIDER_FIELD',
      payment_channel: callback.paymentchannel || null,
      poll_http_status: polled.httpStatus
    }
  });
  return reconcileAccepted(cfg, result);
}
async function reconcileAccepted(cfg, result) {
  if (cfg.mode !== 'live' || !cfg.liveCodeReady) return result;
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
  if (!cfg.ready) throw new Error('PAYNOW_CONFIGURATION_INCOMPLETE');
  const polled = await pollVerified(rawPollUrl, cfg.key);
  const fields = polled.fields;
  if (cfg.mode === 'test') return forwardSimulatedStatus(polled.raw, cfg);
  const currency = verifiedCurrency(fields);
  if (currency !== 'USD') throw new Error('PAYNOW_LIVE_USD_NOT_VERIFIED');
  const id = eventIdentity(polled.raw);
  const result = await rpc(cfg, 'payment_record_paynow_live_status', {
    p_merchant_reference: fields.reference, p_provider_reference: fields.paynowreference,
    p_amount: fields.amount, p_currency: currency, p_provider_status: fields.status,
    p_poll_url: fields.pollurl, p_event_id: id, p_payload_hash: id,
    p_metadata: { source: 'paynow_live_server_poll', currency_source: 'SIGNED_PROVIDER_FIELD', poll_http_status: polled.httpStatus }
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
  const status = await rpc(cfg, 'payment_get_paynow_transaction_status', { p_merchant_reference: merchantReference });
  if (cfg.mode !== 'test') return status;
  // Non-commercial readback of TEST evidence; never presents simulation as Paid.
  // Inability to read simulator evidence must not unlock any entitlement.
  if (cfg.supabaseUrl !== 'https://bzuvntbkevvuhfhqhkua.supabase.co') {
    return { ...status, payment_verified: false, test_outcome: null };
  }
  let testOutcome = null;
  try {
    const url = `${cfg.supabaseUrl}/rest/v1/provider_webhook_events?provider=eq.paynow&merchant_reference=eq.${encodeURIComponent(merchantReference)}&verification_authority=eq.NO_VERIFICATION_AUTHORITY&select=sanitized_metadata&order=received_at.desc&limit=10`;
    const response = await fetch(url, {
      headers: {apikey:cfg.serviceKey, Authorization:`Bearer ${cfg.serviceKey}`},
      redirect:'error', signal:timeoutSignal()
    });
    if (response.ok) {
      const events = await response.json();
      if (Array.isArray(events)) {
        const event = events.find(item => /^TEST_SIMULATED_(PAID|CANCELLED|FAILED|PENDING)$/.test(String(item?.sanitized_metadata?.test_outcome || '')));
        testOutcome = event?.sanitized_metadata?.test_outcome || null;
      }
    }
  } catch { /* Fail closed; availability is not monetary authority. */ }
  return { ...status, payment_verified: false, test_outcome: testOutcome,
    commercial_payment_verified: false, entitlement_granted: false };
}

async function readiness(env = process.env) {
  const cfg = config(env);
  // Prior TEST Paid status is not monetary authority. Never use an historic
  // PAYNOW_TEST_SHA512_VERIFIED row to unlock commercial checkout.
  const checkoutImplementationReady = String(env.PAYNOW_CHECKOUT_IMPLEMENTATION_VERIFIED || '') === '1';
  const checkoutPubliclyEnabled = String(env.PAYNOW_CHECKOUT_PUBLIC || '') === '1';
  const authorityCertified = cfg.mode === 'live' && cfg.liveCodeReady;
  const checkoutAvailable = cfg.mode === 'live' && authorityCertified &&
    checkoutImplementationReady && checkoutPubliclyEnabled;
  return {
    provider: 'paynow',
    status: checkoutAvailable ? 'available' : 'authority-incomplete',
    credentials_present: cfg.credentialsPresent,
    provider_authority_certified: authorityCertified,
    checkout_implementation_ready: checkoutImplementationReady,
    checkout_available: checkoutAvailable,
    configured: checkoutAvailable,
    mode: cfg.mode === 'test' ? 'test' : cfg.mode === 'live' ? 'live' : 'unavailable',
    mode_status: cfg.mode === 'test'
      ? 'simulator_only_no_monetary_checkout'
      : cfg.mode === 'live'
        ? (cfg.liveCodeReady ? 'live_authorized_server_configuration' : 'live_gates_incomplete')
        : 'configuration_incomplete_invalid_mode',
    test_simulator_only: cfg.mode === 'test',
    live_code_capable: true,
    live_authority_ready: cfg.liveCodeReady,
    paynow_configured: checkoutAvailable ? 'YES' : 'NO',
    checkout_behavior: checkoutAvailable ? 'CHECKOUT_AVAILABLE' : 'CHECKOUT_FAILS_CLOSED',
    business_authority_mutated: false
  };
}

module.exports = { UNIT_ID, config, formFromRequestBody, sameStatusAuthority,
  normalizeConnectivityScenario, verifiedCurrency,
  initiateConnectivity, initiatePremium, acceptCallback, pollTransaction,
  pollByReference, internalConnectivityPoll, transactionStatus, readiness };
