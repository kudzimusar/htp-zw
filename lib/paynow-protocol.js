'use strict';

/**
 * HT-MVP-EXT-01A-PAYNOW-PROTOCOL-01
 * Server-only Paynow transport/protocol primitives. No credential storage, network
 * I/O, checkout endpoint, business reconciliation or entitlement mutation here.
 * Official protocol: https://developers.paynow.co.zw/docs/paynow/generating_hash/
 */
const { createHash, timingSafeEqual } = require('node:crypto');

const INITIATE_TRANSACTION_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const CONTENT_TYPE = 'application/x-www-form-urlencoded';
const MERCHANT_REFERENCE_PATTERN = /^HT-(?:PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/;
const HASH_PATTERN = /^[a-fA-F0-9]{128}$/;

function requireKey(key) {
  if (typeof key !== 'string' || !key.length) {
    throw new Error('Paynow server integration key is unavailable');
  }
  return key;
}

function entriesFrom(fields) {
  const entries = Array.isArray(fields) ? fields : Object.entries(fields || {});
  if (!entries.length) throw new Error('Paynow message is empty');
  const seen = new Set();
  return entries.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Invalid Paynow field pair');
    const [name, value] = pair;
    if (typeof name !== 'string' || !/^[a-z][a-z0-9]*$/i.test(name)) {
      throw new Error('Invalid Paynow field name');
    }
    if (typeof value !== 'string') throw new Error('Invalid Paynow field value');
    const canonical = name.toLowerCase();
    if (seen.has(canonical)) throw new Error('Duplicate Paynow field');
    seen.add(canonical);
    return [name, value];
  });
}

function generatePaynowHash(fields, integrationKey) {
  const values = entriesFrom(fields)
    .filter(([name]) => name.toLowerCase() !== 'hash')
    .map(([, value]) => value);
  return createHash('sha512')
    .update(values.join('') + requireKey(integrationKey), 'utf8')
    .digest('hex')
    .toUpperCase();
}

function verifyPaynowHash(fields, integrationKey) {
  try {
    const entries = entriesFrom(fields);
    const entry = entries.find(([name]) => name.toLowerCase() === 'hash');
    if (!entry || !HASH_PATTERN.test(entry[1])) return false;
    const expected = Buffer.from(generatePaynowHash(entries, integrationKey), 'hex');
    const supplied = Buffer.from(entry[1], 'hex');
    return supplied.length === expected.length && timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}

function serializePaynowForm(fields) {
  const entries = entriesFrom(fields);
  const form = new URLSearchParams();
  for (const [name, value] of entries) form.append(name, value);
  return form.toString();
}

function parsePaynowForm(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 16384) {
    throw new Error('Invalid Paynow response size');
  }
  if (raw.startsWith('?')) throw new Error('Invalid Paynow response format');
  const parsed = [...new URLSearchParams(raw).entries()];
  return entriesFrom(parsed);
}

function requireHttpsUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Paynow callback URL must be HTTPS'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || parsed.hash) {
    throw new Error('Paynow callback URL must be HTTPS');
  }
  return parsed.toString();
}

function requireProviderUrl(raw, pathKind) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Untrusted Paynow destination'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'www.paynow.co.zw' ||
      url.username || url.password || url.port || url.hash) {
    throw new Error('Untrusted Paynow destination');
  }
  if (pathKind === 'poll' && !/^\/interface\/checkpayment\/?$/i.test(url.pathname)) {
    throw new Error('Untrusted Paynow polling destination');
  }
  return url.toString();
}

function buildPaynowInitiation({ integrationId, reference, amount, additionalInfo = '', returnUrl, resultUrl, authEmail }, integrationKey) {
  if (typeof integrationId !== 'string' || !/^\d+$/.test(integrationId)) {
    throw new Error('Invalid Paynow integration ID');
  }
  if (typeof reference !== 'string' || !MERCHANT_REFERENCE_PATTERN.test(reference)) {
    throw new Error('Invalid HealthTimes merchant reference');
  }
  if (typeof amount !== 'string' || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(amount) || Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
    throw new Error('Invalid Paynow two-decimal amount');
  }
  if (typeof additionalInfo !== 'string' || additionalInfo.length > 250) {
    throw new Error('Invalid Paynow payment description');
  }
  const fields = [
    ['id', integrationId],
    ['reference', reference],
    ['amount', amount],
    ['additionalinfo', additionalInfo],
    ['returnurl', requireHttpsUrl(returnUrl)],
    ['resulturl', requireHttpsUrl(resultUrl)]
  ];
  if (authEmail !== undefined) {
    if (typeof authEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail)) {
      throw new Error('Invalid Paynow payer email');
    }
    fields.push(['authemail', authEmail]);
  }
  fields.push(['status', 'Message']);
  fields.push(['hash', generatePaynowHash(fields, integrationKey)]);
  return Object.freeze({
    url: INITIATE_TRANSACTION_URL,
    contentType: CONTENT_TYPE,
    body: serializePaynowForm(fields),
    reference
  });
}

function signedResponse(raw, integrationKey) {
  const fields = parsePaynowForm(raw);
  if (!verifyPaynowHash(fields, integrationKey)) throw new Error('Unverified Paynow response');
  const values = Object.fromEntries(fields.map(([key, value]) => [key.toLowerCase(), value]));
  return values;
}

function parsePaynowInitiationResponse(raw, integrationKey) {
  const fields = signedResponse(raw, integrationKey);
  if (fields.status?.toLowerCase() !== 'ok') throw new Error('Paynow initiation did not succeed');
  if (!fields.browserurl || !fields.pollurl) throw new Error('Incomplete Paynow initiation response');
  return Object.freeze({
    verified: true,
    status: 'Ok',
    browserUrl: requireProviderUrl(fields.browserurl, 'browser'),
    pollUrl: requireProviderUrl(fields.pollurl, 'poll'),
    entitlementGranted: false,
    businessAuthorityMutated: false
  });
}

function parsePaynowStatusUpdate(raw, integrationKey) {
  const fields = signedResponse(raw, integrationKey);
  const status = fields.status || '';
  if (!status || !fields.reference || !MERCHANT_REFERENCE_PATTERN.test(fields.reference) ||
      !fields.amount || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(fields.amount)) {
    throw new Error('Incomplete Paynow status response');
  }
  return Object.freeze({
    verifiedHash: true,
    reference: fields.reference,
    amount: fields.amount,
    status,
    paynowReference: fields.paynowreference || null,
    pollUrl: fields.pollurl ? requireProviderUrl(fields.pollurl, 'poll') : null,
    // A valid hash is not, by itself, payment/business reconciliation authority.
    requiresProviderPollConfirmation: true,
    entitlementGranted: false,
    businessAuthorityMutated: false
  });
}

module.exports = Object.freeze({
  INITIATE_TRANSACTION_URL,
  CONTENT_TYPE,
  generatePaynowHash,
  verifyPaynowHash,
  serializePaynowForm,
  parsePaynowForm,
  buildPaynowInitiation,
  parsePaynowInitiationResponse,
  parsePaynowStatusUpdate
});
