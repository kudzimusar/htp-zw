'use strict';

const COMMERCE_CAPABILITY_VERSION = 'ag05-premium-commerce-v1';

const PREMIUM_TEASER_POLICY = Object.freeze({
  premiumTeaserParagraphCount: 1,
  premiumTeaserDurationSeconds: 20
});

const CANONICAL_PREMIUM_PLAN = Object.freeze({
  plan_key: 'healthtimes_premium_monthly',
  version: 1,
  name: 'HealthTimes Premium',
  amount: 5.00,
  currency: 'USD',
  billing_interval: 'month',
  status: 'active',
  effective_from: '2026-01-01T00:00:00.000Z',
  effective_to: null
});

const LEGACY_COMMERCE_AUTHORITY = Object.freeze({
  source: 'AG-03 authoritative source capture plus retired frontend provenance',
  wordpress: {
    wooCommercePluginInstalled: true,
    membershipsPluginInstalled: true,
    subscriptionsPluginInstalled: true,
    paypalPaymentsPluginInstalled: true,
    paynowZimbabwePluginInstalled: true,
    wooCommerceTablesPresent: true,
    capturedOrders: 0,
    capturedSubscriptions: 0,
    capturedPaymentTokens: 0,
    capturedMembershipPlans: 1,
    wpFormsPaymentRows: 0,
    membershipPlanIdentity: null,
    subscriptionConfiguration: null,
    currency: null,
    billingInterval: null,
    productPlanIds: [],
    membershipPlanLinkage: null
  },
  paynow: {
    pluginInstalled: true,
    pluginConfigured: 'unverified',
    providerAccountOperational: 'unverified',
    historicalTransactionsProven: 'unverified',
    mode: null,
    callbackReturnUrl: null,
    webhookIpn: null
  },
  paypal: {
    pluginInstalled: true,
    pluginConfigured: 'unverified',
    providerAccountOperational: 'unverified',
    historicalTransactionsProven: 'unverified',
    mode: null,
    callbackReturnUrl: null,
    webhookIpn: null
  },
  price: {
    retiredFrontendUxEvidence: 'US$5/month',
    currentBillingAuthority: null
  }
});

function providerReadinessState(env = process.env || {}) {
  const integrationId = String(env.PAYNOW_INTEGRATION_ID || '').trim();
  const integrationKey = String(env.PAYNOW_INTEGRATION_KEY || '').trim();
  const rawMode = String(env.PAYNOW_MODE || '').trim().toLowerCase();

  const configured = integrationId.length > 0 && integrationKey.length > 0;
  if (!configured) {
    return {
      provider: 'paynow',
      configured: false,
      mode: 'unavailable',
      checkout_available: false,
      paynow_configured: 'NO',
      checkout_behavior: 'CHECKOUT_FAILS_CLOSED',
      business_authority_mutated: false
    };
  }

  return {
    provider: 'paynow',
    configured: true,
    mode: rawMode === 'live' ? 'live' : 'test',
    checkout_available: true,
    paynow_configured: 'YES',
    checkout_behavior: 'CHECKOUT_AVAILABLE',
    business_authority_mutated: false
  };
}

function publicCommerceAuthority(env = process.env || {}) {
  const readiness = providerReadinessState(env);
  return {
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: readiness.checkout_available ? 'ready' : 'authority-incomplete',
    paymentGatewayMigrationComplete: false,
    currentProvider: null,
    currentPrice: null,
    currentCurrency: null,
    membershipPlanIdentity: null,
    productPlanIds: [],
    canonicalPremiumPlan: CANONICAL_PREMIUM_PLAN,
    providerReadiness: readiness,
    teaserPolicy: {
      paragraphCount: PREMIUM_TEASER_POLICY.premiumTeaserParagraphCount,
      durationSeconds: PREMIUM_TEASER_POLICY.premiumTeaserDurationSeconds
    },
    legacyEvidence: LEGACY_COMMERCE_AUTHORITY,
    blockers: [
      'Legacy membership-plan identity/linkage is not present in repository-safe authority.',
      'Legacy currency, billing interval and product/plan IDs are unresolved.',
      'Paynow plugin configuration and provider-account operational state are unverified.',
      'PayPal Payments configuration and provider-account operational state are unverified.',
      'External Paynow/PayPal transaction history is unverified.'
    ]
  };
}

function checkoutDecision(env = process.env || {}) {
  const readiness = providerReadinessState(env);
  return {
    httpStatus: 503,
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: 'configuration-required',
    error: 'commerce-provider-authority-unavailable',
    entitlementGranted: false,
    businessAuthorityMutated: false,
    checkoutUrl: null,
    provider: null,
    productPlanId: null,
    price: null,
    canonicalPremiumPlan: CANONICAL_PREMIUM_PLAN,
    providerReadiness: readiness
  };
}

function webhookDecision(env = process.env || {}) {
  const readiness = providerReadinessState(env);
  return {
    httpStatus: 503,
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: 'configuration-required',
    error: 'verified-provider-webhook-not-configured',
    paymentVerified: false,
    subscriptionUpdated: false,
    entitlementGranted: false,
    businessAuthorityMutated: false,
    providerReadiness: readiness
  };
}

function browserSuccessSignalGrantsEntitlement() {
  return false;
}

module.exports = {
  COMMERCE_CAPABILITY_VERSION,
  PREMIUM_TEASER_POLICY,
  CANONICAL_PREMIUM_PLAN,
  LEGACY_COMMERCE_AUTHORITY,
  providerReadinessState,
  publicCommerceAuthority,
  checkoutDecision,
  webhookDecision,
  browserSuccessSignalGrantsEntitlement
};
