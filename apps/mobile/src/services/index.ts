import type { HealthTimesServices } from "../domain/contracts";
import { appEnvironment, editorialDataMode } from "../platform/config";
import { fixtureServices } from "./fixtures";
import { sourceParityServices } from "./source-parity";
import { migratedCorpusServices } from "./migrated-corpus";
import { stagingAuthService, stagingPlatformService } from "./staging";
import { stagingAuthorizationService, stagingDeviceSecurityService } from "./security";
import { stagingCommentModerationService, stagingNewsroomCommunicationService, stagingReaderDiscussionService } from "./communications";

export const serviceMode = editorialDataMode;

function buildServices(): HealthTimesServices {
  if (appEnvironment === "production" || editorialDataMode === "production") {
    throw new Error(
      "Production service adapters remain locked until production release authorization."
    );
  }

  const editorialServices =
    editorialDataMode === "staging"
      ? migratedCorpusServices
      : editorialDataMode === "source-parity"
        ? sourceParityServices
        : fixtureServices;

  if (appEnvironment === "staging") {
    return {
      ...editorialServices,
      auth: stagingAuthService,
      authorization: stagingAuthorizationService,
      deviceSecurity: stagingDeviceSecurityService,
      readerDiscussion: stagingReaderDiscussionService,
      newsroomCommunication: stagingNewsroomCommunicationService,
      commentModeration: stagingCommentModerationService,
      platform: stagingPlatformService
    };
  }

  return editorialServices;
}

export const services = buildServices();
