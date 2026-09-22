import type { HealthTimesServices } from "../domain/contracts";
import { appEnvironment, editorialDataMode } from "../platform/config";
import { fixtureServices } from "./fixtures";
import { sourceParityServices } from "./source-parity";
import { stagingAuthService, stagingPlatformService } from "./staging";
import { stagingAuthorizationService, stagingDeviceSecurityService } from "./security";
import { stagingNewsroomCommunicationService, stagingReaderDiscussionService } from "./communications";

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

  const editorialServices = editorialDataMode === "source-parity" ? sourceParityServices : fixtureServices;

  if (appEnvironment === "staging") {
    return {
      ...editorialServices,
      auth: stagingAuthService,
      authorization: stagingAuthorizationService,
      deviceSecurity: stagingDeviceSecurityService,
      readerDiscussion: stagingReaderDiscussionService,
      newsroomCommunication: stagingNewsroomCommunicationService,
      platform: stagingPlatformService
    };
  }

  return editorialServices;
}

export const services = buildServices();
