import type {
  AdDecision,
  AdPlacementKey,
  AdRequestContext,
  CommercialSourceContext
} from "../domain/models";
import type { AdvertisingService } from "../domain/contracts";
import { getReaderAdPlacement } from "./ad-placements";

export type AdvertisingInventory = Omit<
  AdDecision,
  "placementKey" | "providerState" | "commercialSourceContext"
>;

export interface AdvertisingProvider {
  configured: boolean;
  request(
    placementKey: AdPlacementKey,
    context: AdRequestContext
  ): Promise<AdvertisingInventory | null>;
}

type AdvertisingServiceOptions = {
  provider?: AdvertisingProvider | null;
  commercialSourceContext?: CommercialSourceContext;
};

const defaultContext: AdRequestContext = {
  consentForPersonalizedAds: false,
  sensitiveHealthContext: true
};

function noneDecision(
  placementKey: AdPlacementKey,
  providerState: AdDecision["providerState"],
  policyReason: string,
  context?: CommercialSourceContext
): AdDecision {
  return {
    placementKey,
    providerState,
    source: "none",
    personalization: "none",
    disclosureLabel: "Advertisement",
    policyReason,
    commercialSourceContext: context
  };
}

export function createAdvertisingService(
  options: AdvertisingServiceOptions = {}
): AdvertisingService {
  return {
    async getDecision(placementKey, requestContext = defaultContext) {
      const placement = getReaderAdPlacement(placementKey);
      const context = { ...defaultContext, ...requestContext };

      if (
        context.sensitiveHealthContext &&
        placement.sensitiveHealthEligibility === "blocked"
      ) {
        return noneDecision(
          placementKey,
          "blocked-by-policy",
          "Sensitive health context is blocked from Reader advertising delivery; no diagnosis, medication, condition, symptom, query or inferred health-interest targeting is allowed.",
          options.commercialSourceContext
        );
      }

      const provider = options.provider ?? null;
      if (!provider?.configured) {
        return noneDecision(
          placementKey,
          "unconfigured",
          "No verified NM-05 advertising provider configuration is available.",
          options.commercialSourceContext
        );
      }

      try {
        const inventory = await provider.request(placementKey, context);
        if (!inventory) {
          return noneDecision(
            placementKey,
            "eligible-no-inventory",
            "The placement is policy-eligible, but the verified provider returned no inventory.",
            options.commercialSourceContext
          );
        }

        if (inventory.personalization === "personalized") {
          return noneDecision(
            placementKey,
            "blocked-by-policy",
            "Reader placements do not accept personalized sensitive-health advertising.",
            options.commercialSourceContext
          );
        }

        return {
          ...inventory,
          placementKey,
          providerState: "available",
          commercialSourceContext: options.commercialSourceContext
        };
      } catch {
        return noneDecision(
          placementKey,
          "error",
          "The advertising provider failed safely; no ad was rendered.",
          options.commercialSourceContext
        );
      }
    }
  };
}

export async function decideFixtureAd(
  placementKey: AdPlacementKey,
  context: AdRequestContext = defaultContext
): Promise<AdDecision> {
  return createAdvertisingService().getDecision(placementKey, context);
}
