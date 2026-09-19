import type { HealthTimesServices } from "../domain/contracts";
import { fixtureServices } from "./fixtures";

export type ServiceMode = "fixture" | "staging" | "production";

const requestedMode = process.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE;
export const serviceMode: ServiceMode =
  requestedMode === "staging" ? "staging" :
  requestedMode === "production" ? "production" :
  "fixture";

function buildServices(): HealthTimesServices {
  if (serviceMode !== "fixture") {
    // AG-02 supplies infrastructure, but downstream AG-backed content/auth/commercial
    // adapters are not yet certified. Refuse to ship fixtures under a real environment label.
    throw new Error(
      serviceMode === "production"
        ? "Production service adapters are locked until AG-04/05/06 and NM-04/05/06 are certified."
        : "Staging service adapters are locked until the required AG-backed integrations are implemented."
    );
  }
  return fixtureServices;
}

export const services = buildServices();
