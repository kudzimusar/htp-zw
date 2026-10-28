'use strict';

// Paynow's hash covers decoded field values in message order, followed by the
// integration key. Never log the preimage or the key.
const { createHash, timingSafeEqual } = require('node:crypto');

const INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const TRUSTED_HOSTS = new Set(['www.paynow.co.zw', 'paynow.co.zw', 'staging.paynow.co.zw']);
const MAX_FORM_BYTES = 16_384;

function hashValues(entries, key) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('PAYNOW_KEY_MISSING');
  const values = entries.filter(([name]) => name.toLowerCase() !== 'hash').map(([, value]) => value);
  return createHash('sha512').update(values.join('') + key, 'utf8').digest('hex').toUpperCase();
}

function parseForm(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_FORM_BYTES || /%(?![\da-f]{2})/i.test(text)) {
    throw new Error('PAYNOW_FORM_INVALID');
  }
  const entries = [...new URLSearchParams(text).entries()];
  const fields = Object.create(null);
  for (const [name, value] of entries) {
    const lower = name.toLowerCase();
    if (!/^[a-z][a-z0-9]*$/.test(lower) || Object.hasOwn(fields, lower)) {
      throw new Error('PAYNOW_FORM_DUPLICATE_OR_INVALID_FIELD');
    }
    fields[lower] = value;
  }
  return { entries, fields };
}

function verifyForm(raw, key) {
  const parsed = parseForm(raw);
  const supplied = parsed.fields.hash;
  if (!supplied || !/^[\da-f]{128}$/i.test(supplied)) {
    throw new Error('PAYNOW_HASH_MISSING_OR_INVALID');
  }
  const expected = Buffer.from(hashValues(parsed.entries, key), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(supplied, 'hex'))) {
    throw new Error('PAYNOW_HASH_MISMATCH');
  }
  return parsed.fields;
}

function trustedUrl(raw, role) {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\\\u0000-\u001f]/.test(raw)) {
    throw new Error('PAYNOW_URL_INVALID');
  }
  let url;
  try { url = new URL(raw); } catch { throw new Error('PAYNOW_URL_INVALID'); }
  if (url.protocol !== 'https:' || !TRUSTED_HOSTS.has(url.hostname.toLowerCase()) ||
      url.username || url.password || (url.port && url.port !== '443') || url.hash) {
    throw new Error('PAYNOW_URL_UNTRUSTED');
  }
  if (role === 'poll') {
    if (!/^\/interface\/checkpayment\/?$/i.test(url.pathname) ||
        !/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(url.searchParams.get('guid') || '') ||
        [...url.searchParams.keys()].length !== 1) throw new Error('PAYNOW_POLL_URL_INVALID');
  } else if (role === 'browser') {
    if (!/^\/payment\/confirmpayment\/[a-z0-9_-]{1,128}$/i.test(url.pathname) || url.search) {
      throw new Error('PAYNOW_BROWSER_URL_INVALID');
    }
  } else {
    throw new Error('PAYNOW_URL_ROLE_INVALID');
  }
  return url.toString();
}

function buildInitiation({ id, reference, amount, returnUrl, resultUrl, additionalInfo = '', authEmail = '', merchantTrace = '', key }) {
  if (!/^\d+$/.test(String(id)) || !/^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/.test(reference) ||
      !/^(?:0|[1-9]\d*)\.\d{2}$/.test(String(amount)) || Number(amount) <= 0) {
    throw new Error('PAYNOW_INITIATION_FIELDS_INVALID');
  }
  for (const raw of [returnUrl, resultUrl]) {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
      throw new Error('PAYNOW_CALLBACK_URL_INVALID');
    }
  }
  const entries = [
    ['id', String(id)], ['reference', reference], ['amount', String(amount)],
    ['additionalinfo', String(additionalInfo)], ['returnurl', returnUrl],
    ['resulturl', resultUrl]
  ];
  if (authEmail) entries.push(['authemail', String(authEmail)]);
  if (merchantTrace) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(merchantTrace)) throw new Error('PAYNOW_MERCHANT_TRACE_INVALID');
    entries.push(['merchanttrace', merchantTrace]);
  }
  entries.push(['status', 'Message']);
  const form = new URLSearchParams(entries);
  form.append('hash', hashValues(entries, key));
  return form.toString();
}

function verifyInitiation(raw, key) {
  const fields = verifyForm(raw, key);
  if (fields.status?.toLowerCase() !== 'ok') {
    return { ok: false, status: fields.status || 'Unknown', error: String(fields.error || '').slice(0, 160) };
  }
  return {
    ok: true,
    status: fields.status,
    browserUrl: trustedUrl(fields.browserurl, 'browser'),
    pollUrl: trustedUrl(fields.pollurl, 'poll'),
    providerReference: fields.paynowreference || null
  };
}

module.exports = { INITIATE_URL, hashValues, parseForm, verifyForm, trustedUrl, buildInitiation, verifyInitiation };
