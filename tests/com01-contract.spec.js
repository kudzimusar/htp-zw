const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const domain = read('supabase/migrations/20260922183500_com01_communications_domain.sql');
const attachments = read('supabase/migrations/20260922183600_com01_private_attachments.sql');
const api = read('api/communications.js');

test('COM-01 canonical domain preserves provider and authority boundaries', async () => {
  for (const table of [
    'communication_channels',
    'communication_threads',
    'communication_messages',
    'communication_participants',
    'contact_profiles',
    'contact_consents',
    'communication_suppressions',
    'provider_webhook_events',
    'communication_events',
    'audience_campaigns',
    'social_posts',
    'social_publication_attempts'
  ]) {
    expect(domain).toContain('public.' + table);
  }

  for (const capability of [
    'communications.view',
    'communications.reply',
    'communications.queue.editorial',
    'communications.queue.commercial',
    'marketing.send',
    'social.approve',
    'social.publish'
  ]) {
    expect(domain).toContain(capability);
  }

  expect(domain).toContain('opaque_reply_token uuid not null default gen_random_uuid() unique');
  expect(domain).toContain('Human approval required before social publication');
  expect(domain).toContain("scope in ('marketing','all')");
  expect(domain).toContain("scope in ('email_delivery','all')");
  expect(domain).toContain("grant execute on function public.communications_ingest_inbound");
  expect(domain).toContain('to service_role');
});

test('COM-01 private attachments are bounded and anonymous access is absent', async () => {
  expect(attachments).toContain("default 'communications-private'");
  expect(attachments).toContain('public=false');
  expect(attachments).toContain('byte_size <= 10485760');
  expect(attachments).toContain("'quarantined'");
  expect(attachments).toContain('dangerous_extension');
  expect(attachments).toContain('extension_mime_mismatch');
  expect(attachments).toContain('revoke all on public.communication_attachments from public,anon,authenticated');
  expect(attachments).not.toMatch(/grant\s+(select|insert|update|delete)\s+on\s+public\.communication_attachments\s+to\s+anon/i);
});

test('COM-01 provider orchestration verifies webhooks and fails closed when unconfigured', async () => {
  expect(api).toContain("COM01_RESEND_WEBHOOK_SECRET");
  expect(api).toContain("svix-id");
  expect(api).toContain("svix-timestamp");
  expect(api).toContain("svix-signature");
  expect(api).toContain("Raw webhook body unavailable; request denied.");
  expect(api).toContain("HealthTimes staging Brevo webhook verification is not configured.");
  expect(api).toContain("HealthTimes staging inbound verification is not configured.");
  expect(api).toContain("Idempotency-Key");
  expect(api).toContain("reply+");
  expect(api).toContain("communications_record_send_result");
  expect(api).toContain("communications_mark_consent_sync");
  expect(api).not.toMatch(/re_[A-Za-z0-9_-]{20,}/);
  expect(api).not.toMatch(/xkeysib-[A-Za-z0-9_-]{20,}/i);
  expect(api).not.toMatch(/whsec_[A-Za-z0-9+/=_-]{20,}/);
});

test('COM-01 separates marketing opt-out from transactional eligibility', async () => {
  expect(domain).toContain('communications_marketing_eligible');
  expect(domain).toContain('communications_transactional_eligible');
  expect(domain).toContain("'unsubscribe'");
  expect(domain).toContain("'bounce'");
  expect(domain).toContain("'complaint'");
  expect(api).toContain("Explicit marketing consent is required.");
  expect(api).toContain("BREVO_API_KEY is not configured for HealthTimes staging.");
});
