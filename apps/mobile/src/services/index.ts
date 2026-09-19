import type { HealthTimesServices } from "../domain/contracts";
import { fixtureServices } from "./fixtures";

export type ServiceMode = "fixture" | "staging";

const requestedMode = process.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE;
export const serviceMode: ServiceMode = requestedMode === "staging" ? "staging" : "fixture";

function buildServices(): HealthTimesServices {
  if (serviceMode === "staging") {
    // AG-02 provides staging infrastructure, but CP3/AG-04 content and AG-06 auth
    // are not yet certified. Refuse to silently fake a real integration.
    throw new Error(
      "Staging mode is not enabled in NM-01. Complete the AG-backed staging adapters before setting EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE=staging."
    );
  }
  return fixtureServices;
}

export const services = buildServices();
