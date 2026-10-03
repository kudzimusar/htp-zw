import type { PremiumStoreService } from "../domain/contracts";
import type { PremiumStoreState } from "../domain/models";
import { MOBILE_GROWTH_CONFIGURATION } from "./config";

const unavailable: PremiumStoreState = {
  status: "configuration-required",
  offers: [],
  message:
    "Native storefront products are not configured. Product IDs and localized prices must come from approved App Store / Google Play configuration."
};

export const fixturePremiumStoreService: PremiumStoreService = {
  async getState() {
    return unavailable;
  },

  async startPurchase() {
    throw new Error(
      "Premium purchase is unavailable until approved native storefront product IDs are configured."
    );
  },

  async restorePurchases() {
    return { restored: false, reason: "configuration-required" };
  }
};

export function premiumStoreConfigurationReady() {
  return Boolean(
    MOBILE_GROWTH_CONFIGURATION.iosMonthlyProductId &&
      MOBILE_GROWTH_CONFIGURATION.iosYearlyProductId &&
      MOBILE_GROWTH_CONFIGURATION.androidMonthlyProductId &&
      MOBILE_GROWTH_CONFIGURATION.androidYearlyProductId
  );
}
