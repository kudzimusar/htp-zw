// HT-MVP-PUBLIC-LAUNCH-01-G5: the Reader's newsletter request is accepted by the
// existing server signup path. Offline: Supabase RPCs and Brevo are stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = require(path.join(root, 'apps/mobile/node_modules/typescript'));
function loadTs(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', 'process', output)(module, module.exports, () => { throw new Error('Unexpected require'); }, process);
  return module.exports;
}
const client = loadTs('apps/mobile/src/growth/newsletter-signup.ts');
const handle = require('../api/communications.js');

async function invoke(request, { origin = 'https://healthtimes.co.zw' } = {}) {
  const req = Readable.from([Buffer.from(request.init.body)]);
  req.method = request.init.method;
  req.url = request.url;
  req.headers = { host: 'healthtimes.co.zw', origin, 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 200) };
  req.socket = { remoteAddress: '203.0.113.9' };
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, getHeader(k) { return this.headers[k.toLowerCase()]; }, end(chunk) { this.body = chunk == null ? '' : String(chunk); } };
  await handle(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null };
}

function withServer(fn) {
  return async () => {
    const keys = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'BREVO_API_KEY', 'COM01_BREVO_LIST_NEWSLETTER', 'EXPO_PUBLIC_HEALTHTIMES_PUBLIC_CLIENT_REVIEW', 'HEALTHTIMES_CLIENT_PREVIEW', 'HEALTHTIMES_PREVIEW_LOCK', 'VERCEL_PROJECT_NAME'];
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    // The handler requires the publishable key even for service-role RPCs (deployment prerequisite).
    Object.assign(process.env, { SUPABASE_URL: 'https://stub-project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_stub', SUPABASE_SERVICE_ROLE_KEY: 'stub-service-key', BREVO_API_KEY: 'stub-brevo', COM01_BREVO_LIST_NEWSLETTER: '7' });
    const calls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push({ url, body, headers: init.headers || {} });
      if (url.endsWith('/rest/v1/rpc/communications_record_consent')) return Response.json({ contact_id: 'c-1', granted: true });
      if (url.endsWith('/rest/v1/rpc/communications_marketing_eligible')) return Response.json(true);
      if (url.endsWith('/rest/v1/rpc/communications_mark_consent_sync')) return Response.json(true);
      if (url === 'https://api.brevo.com/v3/contacts') return Response.json({ id: 99 }, { status: 201 });
      return new Response('unexpected ' + url, { status: 599 });
    };
    try { await fn(calls); } finally {
      globalThis.fetch = original;
      for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  };
}

test('the Reader request records consent against the approved policy version and syncs the newsletter list', withServer(async calls => {
  const built = client.buildSignupRequest({ email: 'reader@example.org', consent: true, policyVersion: '2026-12-01' });
  const res = await invoke(built.request);
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.ok, true);
  const consent = calls.find(c => c.url.endsWith('communications_record_consent'));
  assert.deepEqual(
    { email: consent.body.p_email, purpose: consent.body.p_purpose, granted: consent.body.p_granted, policy: consent.body.p_policy_version, source: consent.body.p_source },
    { email: 'reader@example.org', purpose: 'NEWSLETTER', granted: true, policy: '2026-12-01', source: 'healthtimes-web-reader' }
  );
  const brevo = calls.find(c => c.url === 'https://api.brevo.com/v3/contacts');
  assert.deepEqual(brevo.body.listIds, [7]);
}));

test('without consent or from another origin nothing is recorded', withServer(async calls => {
  const built = client.buildSignupRequest({ email: 'reader@example.org', consent: true, policyVersion: '2026-12-01' });
  const noConsent = { ...built.request, init: { ...built.request.init, body: JSON.stringify({ ...JSON.parse(built.request.init.body), consent: false }) } };
  assert.equal((await invoke(noConsent)).status, 400);
  assert.equal((await invoke(built.request, { origin: 'https://evil.example' })).status, 403);
  assert.equal(calls.length, 0);
}));
