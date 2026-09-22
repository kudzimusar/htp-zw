import type { PremiumStoreService } from "../domain/contracts";
import type {
  PremiumOffer,
  PremiumPurchaseResult,
  PremiumRestoreResult,
  PremiumStoreState
} from "../domain/models";
import { MOBILE_GROWTH_CONFIGURATION } from "./config";

export type StorefrontProviderState = PremiumStoreState;

export type StorefrontPurchaseProviderResult = {
  status: "purchased" | "cancelled" | "unavailable" | "error";
  transactionReference?: string | null;
  message?: string;
};

export type StorefrontRestoreProviderResult = {
  status: "restored" | "nothing-to-restore" | "unavailable" | "error";
  transactionReferences?: string[];
};

export interface PremiumStorefrontProvider {
  getState(): Promise<StorefrontProviderState>;
  startPurchase(storeProductId: string): Promise<StorefrontPurchaseProviderResult>;
  restorePurchases(): Promise<StorefrontRestoreProviderResult>;
}

export const PREMIUM_CONFIGURATION_REQUIRED_STATE: PremiumStoreState = {
  status: "configuration-required",
  offers: [],
  message:
    "Native storefront products are not configured. Product IDs and localized prices must come from approved App Store / Google Play configuration."
};

function validateOffers(offers: PremiumOffer[]): PremiumOffer[] {
  const ids = new Set<string>();
  return offers.map((offer) => {
    if (!offer.storeProductId.trim() || !offer.displayPrice.trim() || !offer.periodLabel.trim()) {
      throw new Error("Storefront offer is missing provider-returned product identity or localized display data.");
    }
    if (ids.has(offer.storeProductId)) {
      throw new Error("Storefront returned a duplicate product identifier.");
    }
    ids.add(offer.storeProductId);
    return { ...offer };
  });
}

function normalizeProviderState(state: StorefrontProviderState): PremiumStoreState {
  if (state.status === "available") {
    const offers = validateOffers(state.offers);
    if (!offers.length) {
      return {
        status: "unavailable",
        offers: [],
        message: state.message || "The platform storefront returned no available Premium products."
      };
    }
    return { ...state, offers };
  }

  return {
    ...state,
    offers: []
  };
}

function configurationRequiredPurchase(storeProductId: string): PremiumPurchaseResult {
  return {
    status: "configuration-required",
    storeProductId,
    providerTransactionReference: null,
    message: PREMIUM_CONFIGURATION_REQUIRED_STATE.message
  };
}

export function createPremiumStoreService(
  provider: PremiumStorefrontProvider | null = null
): PremiumStoreService {
  const getState = async (): Promise<PremiumStoreState> => {
    if (!provider) return PREMIUM_CONFIGURATION_REQUIRED_STATE;
    try {
      return normalizeProviderState(await provider.getState());
    } catch {
      return {
        status: "error",
        offers: [],
        message: "The platform storefront could not be read safely."
      };
    }
  };

  return {
    getState,

    async startPurchase(storeProductId) {
      if (!provider) return configurationRequiredPurchase(storeProductId);

      const state = await getState();
      if (state.status !== "available") {
        return {
          status: state.status === "configuration-required" ? "configuration-required" : "unavailable",
          storeProductId,
          providerTransactionReference: null,
          message: state.message
        };
      }

      if (!state.offers.some((offer) => offer.storeProductId === storeProductId)) {
        return {
          status: "error",
          storeProductId,
          providerTransactionReference: null,
          message: "The requested Premium product is not present in the current platform storefront response."
        };
      }

      try {
        const result = await provider.startPurchase(storeProductId);
        if (result.status === "purchased") {
          return {
            status: "pending-server-entitlement",
            storeProductId,
            providerTransactionReference: result.transactionReference ?? null,
            message:
              "Store purchase result received. Premium access remains locked until NM-06 / AG-06 confirms server entitlement."
          };
        }
        return {
          status: result.status === "cancelled" ? "cancelled" : result.status,
          storeProductId,
          providerTransactionReference: result.transactionReference ?? null,
          message: result.message ?? "The platform storefront did not produce an entitlement."
        };
      } catch {
        return {
          status: "error",
          storeProductId,
          providerTransactionReference: null,
          message: "The platform storefront purchase boundary failed safely."
        };
      }
    },

    async restorePurchases(): Promise<PremiumRestoreResult> {
      if (!provider) {
        return { restored: false, reason: "configuration-required" };
      }
      try {
        const result = await provider.restorePurchases();
        if (result.status === "restored") {
          return {
            restored: true,
            reason: "restored-pending-server-entitlement",
            providerTransactionReferences: result.transactionReferences ?? []
          };
        }
        if (result.status === "nothing-to-restore") {
          return { restored: false, reason: "nothing-to-restore" };
        }
        return {
          restored: false,
          reason: result.status === "error" ? "error" : "unavailable"
        };
      } catch {
        return { restored: false, reason: "error" };
      }
    }
  };
}

export const fixturePremiumStoreService = createPremiumStoreService();

export function premiumStoreConfigurationReady() {
  return Boolean(
    MOBILE_GROWTH_CONFIGURATION.iosMonthlyProductId &&
      MOBILE_GROWTH_CONFIGURATION.iosYearlyProductId &&
      MOBILE_GROWTH_CONFIGURATION.androidMonthlyProductId &&
      MOBILE_GROWTH_CONFIGURATION.androidYearlyProductId
  );
}
