// HT-MVP-PUBLIC-LAUNCH-01-G5 / G4 / G6: launch-level purchase policy.
//
// Defence in depth over the server commerce authority (api/commerce.js already
// refuses checkout without Paynow readiness):
// - Purchases are OFF unless EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED is
//   exactly "true" in an Owner-approved build (Reader-only launch default).
// - Android/iOS never open an external checkout: digital subscriptions sold
//   in-app must use the store's billing (Apple 3.1.1, Google Play Payments),
//   which is not implemented. Existing members may still sign in.
import type { PremiumCommerceStatus } from "../domain/models";

export function launchCommerceEnabled(value: string | undefined = process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED): boolean {
  return String(value ?? "").trim().toLowerCase() === "true";
}

/** The server status as the Reader may act on it under the launch policy. */
export function effectiveCommerceStatus(
  serverStatus: PremiumCommerceStatus | "loading",
  enabled: boolean = launchCommerceEnabled()
): PremiumCommerceStatus | "loading" {
  if (serverStatus === "loading") return serverStatus;
  return enabled ? serverStatus : "unavailable";
}

export type PurchaseChannels = { readonly webCheckout: boolean; readonly nativeStore: boolean };

export function purchaseChannels(input: {
  platform: string;
  commerceEnabled: boolean;
  webAuthorityAvailable: boolean;
  storeConfigured: boolean;
}): PurchaseChannels {
  const web = input.platform === "web";
  return {
    webCheckout: web && input.commerceEnabled && input.webAuthorityAvailable,
    nativeStore: !web && input.commerceEnabled && input.storeConfigured
  };
}

/** Only an https checkout URL, only on the web, only with commerce enabled. */
export function mayOpenCheckoutUrl(input: { platform: string; commerceEnabled: boolean; url: unknown }): boolean {
  return input.platform === "web" &&
    input.commerceEnabled &&
    typeof input.url === "string" &&
    /^https:\/\/[^\s/]+\//i.test(input.url.trim());
}
