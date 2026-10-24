import type { ArticleRepository, HealthTimesServices } from "../domain/contracts";
import { appEnvironment, editorialDataMode } from "../platform/config";
import { fixtureServices } from "./fixtures";
import { sourceParityServices } from "./source-parity";
import { migratedCorpusServices } from "./migrated-corpus";
import { mergeReaderFeeds } from "../reader/feed-order";
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
import { stagingNewsroomFinanceService } from "./newsroom-finance";
import { stagingNewsroomAiService } from "./newsroom-ai";
import { stagingNewsroomAuthorsService } from "./newsroom-authors";
import { stagingNewsroomSettingsService } from "./newsroom-settings";

export const serviceMode = editorialDataMode;

const stagingReaderArticles: ArticleRepository = {
  async getHome() {
    const migrated = await migratedCorpusServices.articles.getHome();
    const current = await sourceParityServices.articles.getHome().catch(() => []);
    return mergeReaderFeeds(migrated, current);
  },
  async getById(id) {
    const migrated = await migratedCorpusServices.articles.getById(id);
    if (migrated) return migrated;
    return sourceParityServices.articles.getById(id).catch(() => null);
  },
  async getRelated(id) {
    const migrated = await migratedCorpusServices.articles.getRelated(id);
    const current = await sourceParityServices.articles.getRelated(id).catch(() => []);
    return mergeReaderFeeds(migrated, current).slice(0, 3);
  },
  async listBySection(sectionSlug) {
    const migrated = await migratedCorpusServices.articles.listBySection(sectionSlug);
    const current = await sourceParityServices.articles.listBySection(sectionSlug).catch(() => []);
    return mergeReaderFeeds(migrated, current);
  },
  async listByAuthor(authorSlug) {
    const migrated = await migratedCorpusServices.articles.listByAuthor(authorSlug);
    const current = await sourceParityServices.articles.listByAuthor(authorSlug).catch(() => []);
    return mergeReaderFeeds(migrated, current);
  }
};

function buildServices(): HealthTimesServices {
  if (appEnvironment === "production" || editorialDataMode === "production") {
    throw new Error(
      "Production service adapters remain locked until production release authorization."
    );
  }

  const editorialServices =
    editorialDataMode === "staging"
      ? { ...migratedCorpusServices, articles: stagingReaderArticles }
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
      newsroomFinance: stagingNewsroomFinanceService,
      newsroomAi: stagingNewsroomAiService,
      newsroomAuthors: stagingNewsroomAuthorsService,
      newsroomSettings: stagingNewsroomSettingsService,
      platform: stagingPlatformService
    };
  }

  return editorialServices;
}

export const services = buildServices();
