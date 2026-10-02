const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('owner commercial policy is frozen to one paragraph and 20 seconds', async () => {
  const commerce = require(path.join(root, 'lib/ag05-premium-commerce.js'));
  expect(commerce.PREMIUM_TEASER_POLICY).toEqual({
    premiumTeaserParagraphCount: 1,
    premiumTeaserDurationSeconds: 20
  });

  const clientConfig = read('apps/mobile/src/growth/config.ts');
  expect(clientConfig).toContain('premiumTeaserParagraphCount: 1');
  expect(clientConfig).toContain('premiumTeaserDurationSeconds: 20');
  expect(clientConfig).not.toContain('EXPO_PUBLIC_HEALTHTIMES_PREMIUM_PREVIEW_SECONDS');
});

test('legacy commerce audit remains evidence-separated and fail closed', async () => {
  const commerce = require(path.join(root, 'lib/ag05-premium-commerce.js'));
  const authority = commerce.publicCommerceAuthority();

  expect(authority.paymentGatewayMigrationComplete).toBe(false);
  expect(authority.currentProvider).toBeNull();
  expect(authority.currentPrice).toBeNull();
  expect(authority.currentCurrency).toBeNull();
  expect(authority.legacyEvidence.wordpress.capturedOrders).toBe(0);
  expect(authority.legacyEvidence.wordpress.capturedSubscriptions).toBe(0);
  expect(authority.legacyEvidence.wordpress.capturedPaymentTokens).toBe(0);
  expect(authority.legacyEvidence.wordpress.capturedMembershipPlans).toBe(1);
  expect(authority.legacyEvidence.paynow.pluginInstalled).toBe(true);
  expect(authority.legacyEvidence.paynow.pluginConfigured).toBe('unverified');
  expect(authority.legacyEvidence.paypal.pluginInstalled).toBe(true);
  expect(authority.legacyEvidence.paypal.providerAccountOperational).toBe('unverified');
  expect(authority.legacyEvidence.price.retiredFrontendUxEvidence).toBe('US$5/month');
  expect(authority.legacyEvidence.price.currentBillingAuthority).toBeNull();
});

test('server commerce boundary never grants entitlement from browser success state', async () => {
  const commerce = require(path.join(root, 'lib/ag05-premium-commerce.js'));
  expect(commerce.checkoutDecision().entitlementGranted).toBe(false);
  expect(commerce.checkoutDecision().checkoutUrl).toBeNull();
  expect(commerce.webhookDecision().paymentVerified).toBe(false);
  expect(commerce.webhookDecision().entitlementGranted).toBe(false);
  expect(commerce.browserSuccessSignalGrantsEntitlement('?paid=true')).toBe(false);
  expect(commerce.browserSuccessSignalGrantsEntitlement('?premium=true')).toBe(false);
  expect(commerce.browserSuccessSignalGrantsEntitlement('?success=1')).toBe(false);

  const api = read('api/commerce.js');
  expect(api).toContain('Browser query parameters such as paid=true, premium=true or success=1');
  expect(api).not.toMatch(/localStorage|SUBSCRIBED_KEY|htpDemoSubscribed/);
});

test('CP5 capability exposes separate sanitized teaser while full Premium body remains null', async () => {
  const { buildStoryCapability } = require(path.join(root, 'lib/ag05-capability.js'));
  const capability = buildStoryCapability({
    source_id: '33190',
    title: 'Premium',
    story_title: 'Premium',
    canonical_url: 'https://healthtimes.co.zw/premium-story/',
    access_policy: 'premium_marker_review',
    standfirst: 'Public metadata',
    excerpt: 'Public excerpt',
    premium_teaser_html: '<p onclick="steal()">FIRST AUTHORIZED PARAGRAPH</p>',
    body_html: '<p>FIRST AUTHORIZED PARAGRAPH</p><p>PARAGRAPH_TWO_SECRET</p>'
  });

  expect(capability.content.bodyProtected).toBe(true);
  expect(capability.content.bodyHtml).toBeNull();
  expect(capability.content.premiumTeaserHtml).toBe('<p>FIRST AUTHORIZED PARAGRAPH</p>');
  expect(JSON.stringify(capability)).not.toContain('PARAGRAPH_TWO_SECRET');
});

test('migration publishes only a bounded teaser projection', async () => {
  const sql = read('supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql');
  expect(sql).toContain('ag05_first_editorial_paragraph_html');
  expect(sql).toContain('regexp_split_to_table');
  expect(sql).toContain('ag05_public_story_teaser_document');
  expect(sql).toContain("'premium_teaser_html'");
  expect(sql).toContain("if v_doc->>'body_html' is not null then");
  expect(sql).toContain("grant execute on function public.ag05_public_story_teaser_document(text) to anon, authenticated");
  expect(sql).toMatch(/caption\|wp-caption\|advert/);
  expect(sql).toMatch(/blockquote\|ul\|ol\|li/);
});

test('source-parity never fetches complete Premium WordPress content', async () => {
  const source = read('apps/mobile/src/services/source-parity.ts');
  const authority = read('apps/mobile/src/services/premium-teaser-authority.ts');
  expect(source).toContain('getPublicPremiumTeaserAuthority(current.canonicalUrl)');
  expect(source).toContain('sourceParityPremiumDetailDecision');
  expect(source).toContain('wpPostQuery({includeContent:detailDecision.includeWordPressContent})');
  expect(source).toContain('bodyHtml:accessPolicy==="premium" ? null');
  expect(source).toContain('premiumTeaserHtml:accessPolicy==="premium" ? (fallback?.premiumTeaserHtml ?? null) : null');
  expect(authority).toContain('includeWordPressContent:accessPolicy==="public" && !taxonomyUnresolved');
  expect(authority).toContain('ag05_public_story_teaser_document');
  expect(authority).not.toContain('content.rendered');
});

test('migrated Reader consumes teaser-specific authority and keeps body protected', async () => {
  const mapper = read('apps/mobile/src/services/migrated-corpus-mapper.ts');
  expect(mapper).toContain('premium_teaser_html');
  expect(mapper).toContain('premiumTeaserHtml: accessPolicy === "premium"');
  expect(mapper).toContain('bodyHtml: accessPolicy === "public" ? doc.body_html : null');

  const service = read('apps/mobile/src/services/migrated-corpus.ts');
  expect(service).toContain('ag05_public_story_teaser_document');
  expect(service).toContain('ag05_public_story_document');
});

test('Reader preview uses the teaser field and persistent preview ledger, not excerpt/body', async () => {
  const article = read('apps/mobile/app/article/[id].tsx');
  expect(article).toContain('publicStory.premiumTeaserHtml');
  expect(article).toContain('getPremiumPreviewWindow');
  expect(article).toContain('current.canonicalStoryId ?? current.id');
  expect(article).toContain('previewConfig.seconds===20');
  expect(article).not.toContain('const previewCopy=readerFacingStandfirst(story.excerpt');

  const persistence = read('apps/mobile/src/services/reader-persistence.ts');
  expect(persistence).toContain('premiumPreviewScope');
  expect(persistence).toContain('premiumPreviewLedger');
  expect(persistence).toContain('getPremiumPreviewWindow');
  expect(persistence).toContain('startedAt');
  expect(persistence).toContain('remainingSeconds');
});

test('legacy local-storage entitlement mechanism remains retired provenance only', async () => {
  const legacy = read('app.js');
  expect(legacy).toContain("localStorage.setItem(SUBSCRIBED_KEY,'true')");
  const currentFiles = [
    'apps/mobile/src/growth/premium-store.ts',
    'apps/mobile/app/article/[id].tsx',
    'api/commerce.js'
  ].map(read).join('\n');
  expect(currentFiles).not.toContain('htpDemoSubscribed');
  expect(currentFiles).not.toMatch(/localStorage\.setItem\([^\n]*premium/i);
});
