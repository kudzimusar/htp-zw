import type { HealthTimesServices } from "../domain/contracts";
import { appEnvironment, editorialDataMode } from "../platform/config";
import { fixtureServices } from "./fixtures";
import { sourceParityServices } from "./source-parity";
import { migratedCorpusServices } from "./migrated-corpus";
import { stagingAuthService, stagingNotificationService, stagingPlatformService } from "./staging";
import { stagingAuthorizationService, stagingDeviceSecurityService } from "./security";
import { stagingCommentModerationService, stagingNewsroomCommunicationService, stagingReaderDiscussionService } from "./communications";
import { stagingNewsroomStoryService } from "./newsroom-stories";
import { stagingNewsroomMediaService } from "./newsroom-media";
import { stagingNewsroomVideoService } from "./newsroom-video";
import { stagingNewsroomLiveCoverageService } from "./newsroom-live";
import { stagingNewsroomSocialService } from "./newsroom-social";
import { stagingNewsroomCampaignService } from "./newsroom-campaigns";
import { stagingNewsroomPushAlertService } from "./newsroom-push-alerts";
import { stagingNewsroomWhatsAppService } from "./newsroom-whatsapp";
import { stagingNewsroomIntelligenceService } from "./newsroom-intelligence";
import { stagingNewsroomStaffService } from "./newsroom-staff";
import { stagingNewsroomCommercialService } from "./newsroom-commercial";

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
      notifications: stagingNotificationService,
      readerDiscussion: stagingReaderDiscussionService,
      newsroomCommunication: stagingNewsroomCommunicationService,
      commentModeration: stagingCommentModerationService,
      newsroomStories: stagingNewsroomStoryService,
      newsroomMedia: stagingNewsroomMediaService,
      newsroomVideo: stagingNewsroomVideoService,
      newsroomLive: stagingNewsroomLiveCoverageService,
      newsroomSocial: stagingNewsroomSocialService,
      newsroomCampaigns: stagingNewsroomCampaignService,
      newsroomPushAlerts: stagingNewsroomPushAlertService,
      newsroomWhatsApp: stagingNewsroomWhatsAppService,
      newsroomIntelligence: stagingNewsroomIntelligenceService,
      newsroomStaff: stagingNewsroomStaffService,
      newsroomCommercial: stagingNewsroomCommercialService,
      platform: stagingPlatformService
    };
  }

  return editorialServices;
}

export const services = buildServices();
