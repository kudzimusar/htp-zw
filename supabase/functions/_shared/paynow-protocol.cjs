'use strict';

// Shared by the Vercel server and the Supabase Edge callback. Paynow signs
// decoded field values in their received order, followed by the integration key.
const { createHash, timingSafeEqual } = require('node:crypto');
const { Buffer } = require('node:buffer');
const TRUSTED_HOSTS = new Set(['www.paynow.co.zw', 'paynow.co.zw', 'staging.paynow.co.zw']);
const MAX_FORM_BYTES = 16_384;

function hashValues(entries, key) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('PAYNOW_KEY_MISSING');
  return createHash('sha512').update(entries.filter(([name]) => name.toLowerCase() !== 'hash').map(([, value]) => value).join('') + key, 'utf8').digest('hex').toUpperCase();
}

function parseForm(raw) {
  let text;
  try { text = Buffer.isBuffer(raw) ? new TextDecoder('utf-8', { fatal: true }).decode(raw) : raw; }
  catch { throw new Error('PAYNOW_FORM_INVALID'); }
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_FORM_BYTES || /%(?![\da-f]{2})/i.test(text)) throw new Error('PAYNOW_FORM_INVALID');
  // URLSearchParams tolerates malformed UTF-8; reject it before decoding.
  try { for (const part of text.split('&')) for (const piece of part.split('=')) decodeURIComponent(piece.replace(/\+/g, ' ')); }
  catch { throw new Error('PAYNOW_FORM_INVALID'); }
  const entries = [...new URLSearchParams(text).entries()];
  const fields = Object.create(null);
  for (const [name, value] of entries) {
    const lower = name.toLowerCase();
    if (!/^[a-z][a-z0-9]*$/.test(lower) || Object.hasOwn(fields, lower)) throw new Error('PAYNOW_FORM_DUPLICATE_OR_INVALID_FIELD');
    fields[lower] = value;
  }
  return { entries, fields };
}

function verifyForm(raw, key) {
  const parsed = parseForm(raw);
  const supplied = parsed.fields.hash;
  if (!supplied || !/^[\da-f]{128}$/i.test(supplied)) throw new Error('PAYNOW_HASH_MISSING_OR_INVALID');
  const expected = Buffer.from(hashValues(parsed.entries, key), 'hex');
  const actual = Buffer.from(supplied, 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('PAYNOW_HASH_MISMATCH');
  return parsed.fields;
}

function trustedUrl(raw, role) {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\\\u0000-\u001f]/.test(raw)) throw new Error('PAYNOW_URL_INVALID');
  let url;
  try { url = new URL(raw); } catch { throw new Error('PAYNOW_URL_INVALID'); }
  if (url.protocol !== 'https:' || !TRUSTED_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || (url.port && url.port !== '443') || url.hash) throw new Error('PAYNOW_URL_UNTRUSTED');
  if (role === 'poll') {
    if (!/^\/interface\/checkpayment\/?$/i.test(url.pathname) || !/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(url.searchParams.get('guid') || '') || [...url.searchParams.keys()].length !== 1) throw new Error('PAYNOW_POLL_URL_INVALID');
  } else if (role === 'browser') {
    if (!/^\/payment\/confirmpayment\/[a-z0-9_-]{1,128}$/i.test(url.pathname) || url.search) throw new Error('PAYNOW_BROWSER_URL_INVALID');
  } else throw new Error('PAYNOW_URL_ROLE_INVALID');
  return url.toString();
}

module.exports = { hashValues, parseForm, verifyForm, trustedUrl };
