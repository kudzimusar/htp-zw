'use strict';

const COMMERCE_CAPABILITY_VERSION = 'ag05-premium-commerce-v1';

const PREMIUM_TEASER_POLICY = Object.freeze({
  premiumTeaserParagraphCount: 1,
  premiumTeaserDurationSeconds: 20
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

function publicCommerceAuthority() {
  return {
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: 'authority-incomplete',
    paymentGatewayMigrationComplete: false,
    currentProvider: null,
    currentPrice: null,
    currentCurrency: null,
    membershipPlanIdentity: null,
    productPlanIds: [],
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

function checkoutDecision() {
  return {
    httpStatus: 503,
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: 'configuration-required',
    error: 'commerce-provider-authority-unavailable',
    entitlementGranted: false,
    checkoutUrl: null,
    provider: null,
    productPlanId: null,
    price: null
  };
}

function webhookDecision() {
  return {
    httpStatus: 503,
    capabilityVersion: COMMERCE_CAPABILITY_VERSION,
    status: 'configuration-required',
    error: 'verified-provider-webhook-not-configured',
    paymentVerified: false,
    subscriptionUpdated: false,
    entitlementGranted: false
  };
}

function browserSuccessSignalGrantsEntitlement() {
  return false;
}

module.exports = {
  COMMERCE_CAPABILITY_VERSION,
  PREMIUM_TEASER_POLICY,
  LEGACY_COMMERCE_AUTHORITY,
  publicCommerceAuthority,
  checkoutDecision,
  webhookDecision,
  browserSuccessSignalGrantsEntitlement
};
