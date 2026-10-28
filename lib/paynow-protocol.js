'use strict';

// The same protocol implementation is used by the staging Edge callback.
const { hashValues, parseForm, verifyForm, trustedUrl } = require('../supabase/functions/_shared/paynow-protocol.cjs');

const INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
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
