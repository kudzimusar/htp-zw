import type { AdDecision, AdPlacementKey, AdRequestContext } from "../domain/models";

export function decideFixtureAd(
  placementKey: AdPlacementKey,
  context: AdRequestContext = {
    consentForPersonalizedAds: false,
    sensitiveHealthContext: true
  }
): AdDecision {
  if (context.sensitiveHealthContext) {
    return {
      placementKey,
      source: "none",
      personalization: "none",
      disclosureLabel: "Advertisement",
      policyReason:
        "Sensitive health context is not eligible for personalized targeting. No verified contextual/mobile inventory is configured."
    };
  }

  if (!context.consentForPersonalizedAds) {
    return {
      placementKey,
      source: "none",
      personalization: "non-personalized",
      disclosureLabel: "Advertisement",
      policyReason:
        "Personalized advertising consent is absent and no verified non-personalized mobile inventory is configured."
    };
  }

  return {
    placementKey,
    source: "none",
    personalization: "none",
    disclosureLabel: "Advertisement",
    policyReason: "No verified NM-05 mobile advertising provider is configured."
  };
}
