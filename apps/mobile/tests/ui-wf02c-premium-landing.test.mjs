import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

test("UI-WF-02C R1 Premium landing enforces Screen 11 hierarchy and flagship editorial value proposition", () => {
  const premium = read("app/premium.tsx");

  const idxIdentity = premium.indexOf("HEALTHTIMES PREMIUM");
  const idxValueProp = premium.indexOf("Deeper reporting for readers who want the full health story.");
  const idxAccessState = premium.indexOf('testID="premium-member-access-card"');
  const idxAvailableWeb = premium.indexOf('accessibilityLabel="Available HealthTimes Premium web membership"');
  const idxUnavailable = premium.indexOf('testID="premium-commerce-unavailable"');
  const idxJournalism = premium.indexOf('title="From HealthTimes Premium"');
  const idxBenefits = premium.indexOf('title="Premium benefits"');
  const idxClosingConversion = premium.indexOf("styles.closingCard");

  assert.ok(idxIdentity > 0, "missing Premium identity");
  assert.ok(idxValueProp > idxIdentity, "value proposition must follow Premium identity");
  assert.ok(idxAccessState > idxValueProp, "member access state must follow value proposition");
  assert.ok(idxAvailableWeb > idxAccessState, "authoritative membership options must follow access state");
  assert.ok(idxUnavailable > idxAvailableWeb, "subordinate unavailable state must follow membership option check");
  assert.ok(idxJournalism > idxUnavailable, "Premium journalism showcase must follow membership options");
  assert.ok(idxBenefits > idxJournalism, "concise benefits must follow Premium journalism");
  assert.ok(idxClosingConversion > idxBenefits, "closing conversion/member bar must follow benefits");
});

test("UI-WF-02C R1 Premium landing preserves commerce, entitlement, restore, and truth boundaries", () => {
  const premium = read("app/premium.tsx");

  for (const required of [
    "services.premiumStore.getState()",
    "services.premiumCommerce.getAuthority()",
    "services.premium.hasEntitlement()",
    "offer.displayPrice",
    "offer.storeProductId",
    "services.premiumCommerce.startCheckout",
    "services.premiumStore.startPurchase",
    "services.premiumStore.restorePurchases()",
    "/account-access",
    "premium_preview_started",
    "subscription_started",
    "useHydratedPremiumWidth",
    "color:palette.premium",
    "borderTopColor:palette.premium"
  ]) {
    assert.ok(premium.includes(required), "missing required contract: " + required);
  }

  assert.doesNotMatch(
    premium,
    /configuration-required|on this build|approved store|secure member service|when secure web checkout is configured|MOST POPULAR|Most Popular|\$\d|US\$|ZW\$|7-day trial|free trial|20% OFF/i
  );
  assert.doesNotMatch(premium, /store\.data\?\.offers\[0\]/, "must not silently select the first store offer as a recommended/default plan");
  assert.doesNotMatch(premium, /event\("subscription_completed"/);
});

test("UI-WF-02C R1 evidence harness captures mobile, tablet, desktop, and dark-mobile Screen 11 artifacts", () => {
  const evidence = read("tests/ui03-commercial-reader-evidence.mjs");

  assert.match(evidence, /premium-landing-masthead/);
  assert.match(evidence, /premium-member-access-card/);
  assert.match(evidence, /premium-commerce-unavailable/);
  assert.match(evidence, /"premium-"\+name\+"\.png"/);
  assert.match(evidence, /premium-dark-mobile\.png/);
});
