import type { HealthTimesServices } from "../domain/contracts";
import { appEnvironment, editorialDataMode } from "../platform/config";
import { fixtureServices } from "./fixtures";
import { stagingAuthService, stagingPlatformService } from "./staging";

export const serviceMode = editorialDataMode;

function buildServices(): HealthTimesServices {
  if (appEnvironment === "production" || editorialDataMode === "production") {
    throw new Error(
      "Production service adapters are locked until AG-04/05/06 and NM-04/05/06 are certified."
    );
  }

  if (editorialDataMode === "staging") {
    throw new Error(
      "Staging editorial-data mode is locked until AG-04 migrated content and required public read policies are certified."
    );
  }

  if (appEnvironment === "staging") {
    return {
      ...fixtureServices,
      auth: stagingAuthService,
      platform: stagingPlatformService
    };
  }

  return fixtureServices;
}

export const services = buildServices();
