'use strict';

// INVARIANT G3-ISO-01: Immutable Fail-Closed Preview Isolation Barrier
// This handler is packaged into the Reader-only client preview artifact in place
// of privileged operational handlers (newsroom, communications, commerce).
// It contains zero credentials, zero database logic, zero payment calls, and zero mail dispatch.
// It cannot execute operational mutations under any environment configuration.

module.exports = async function previewBarrierHandler(req, res) {
  const url = new URL(req.url || '/', 'https://' + (req.headers.host || 'localhost'));
  const action = String(url.searchParams.get('action') || '').toLowerCase();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Diagnostics check for provider health returns safe inert status
  if (req.method === 'GET' && action === 'providerhealth') {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true,
      previewIsolated: true,
      message: 'Operational functions are excluded from Reader-only preview artifact.',
      providers: { resend: 'disabled-in-preview', brevo: 'disabled-in-preview' }
    }));
  }

  // Safe commerce readiness check reports preview-isolated
  if (req.method === 'GET' && !action) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      ready: false,
      mode: 'preview-isolated',
      paynowStatus: 'disabled-in-preview',
      message: 'Commerce operations are disabled in client review preview.'
    }));
  }

  // All other actions, mutating methods, newsroom actions, checkout, webhooks, callbacks,
  // and status inspections are blocked fail-closed with HTTP 403 JSON
  res.statusCode = 403;
  return res.end(JSON.stringify({
    ok: false,
    error: 'PREVIEW_MUTATION_BLOCKED',
    message: 'Operational mutations are excluded from Reader-only preview artifact.',
    entitlementGranted: false,
    isolated: true,
    preview: true,
    serviceMode: 'source-parity'
  }));
};
