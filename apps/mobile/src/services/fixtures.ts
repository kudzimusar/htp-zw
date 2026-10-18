import type {
  AdvertisingService,
  AnalyticsService,
  ArticleRepository,
  AuthorizationService,
  CommentModerationService,
  DeviceSecurityService,
  AudioService,
  AuthService,
  HealthTimesServices,
  LiveService,
  NotificationService,
  NewsroomCommunicationService,
  NewsroomStoryService,
  NewsroomMediaService,
  NewsroomVideoService,
  NewsroomLiveCoverageService,
  NewsroomSocialService,
  NewsroomCampaignService,
  NewsroomPushAlertService,
  NewsroomWhatsAppService,
  NewsroomIntelligenceService,
  NewsroomStaffService,
  ReaderDiscussionService,
  PremiumService,
  PlatformService,
  SearchService,
  SocialAttributionService,
  VideoService
} from "../domain/contracts";
import type {
  SearchQuery
} from "../domain/models";
import { articles, audioItems, liveItems, notifications, videos } from "../fixtures/content";
import { certifiedTaxonomyFixtureService } from "./taxonomy";
import { persistentReaderRepository } from "./reader-persistence";
import { decideFixtureAd } from "../growth/advertising";
import { validatePublicAnalyticsEvent } from "../growth/events";
import { attributedShareUrl, canonicalArticleUrl } from "../growth/deepLinks";
import { fixturePremiumStoreService } from "../growth/premium-store";
import { premiumCommerceService } from "../growth/premium-commerce";
import { emptyAuthorizationSnapshot, hasServerCapability } from "../security/capabilities";
import { getNotificationPreferences, saveNotificationPreferences } from "../security/notification-preferences";

const normalized = (value: string) => value.trim().toLowerCase();

const articleRepository: ArticleRepository = {
  async getHome() {
    return articles;
  },
  async getById(id) {
    return articles.find((item) => item.id === id) ?? null;
  },
  async getRelated(id) {
    return articles.filter((item) => item.id !== id).slice(0, 2);
  },
  async listBySection(sectionSlug) {
    return articles.filter((item) => item.primarySection?.slug === sectionSlug);
  },
  async listByAuthor(authorSlug) {
    return articles.filter((item) => item.author?.slug === authorSlug);
  }
};

const searchService: SearchService = {
  async search(query: SearchQuery) {
    const q = normalized(query.text);
    const articleMatches = articles.filter((article) => {
      if (!q) return true;
      const haystack = [
        article.title,
        article.standfirst ?? "",
        article.excerpt ?? "",
        article.primarySection?.name ?? "",
        ...article.topics.map((topic) => topic.name),
        ...article.geography.map((zone) => zone.name)
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    return {
      articles: articleMatches,
      authors: [],
      videos: query.format && query.format !== "video" ? [] : videos,
      audio: query.format && query.format !== "audio" ? [] : audioItems,
      live: query.format && query.format !== "live" ? [] : liveItems
    };
  }
};

const authService: AuthService = {
  async getReader() {
    return { id: "fixture-reader", displayName: "Development Reader", membership: "registered" };
  },
  async getSessionState() {
    return { authenticated: false, userId: null, expiresAt: null };
  },
  async signInWithPassword() {
    return { status: "blocked", message: "Fixture mode does not authenticate real accounts." };
  },
  async registerReader() {
    return { status: "blocked", message: "Fixture mode does not create real accounts." };
  },
  async requestPasswordReset() {
    return { status: "blocked", message: "Fixture mode does not send account email." };
  },
  async resendVerification() {
    return { status: "blocked", message: "Fixture mode does not send account email." };
  },
  async handleAuthCallback() {
    return { status: "blocked", message: "Fixture mode does not consume real account links." };
  },
  async completePasswordReset() {
    return { status: "blocked", message: "Fixture mode has no authoritative account password." };
  },
  async requestAccountDeletion() {
    return {
      status: "unavailable",
      message: "Fixture mode has no authoritative account to delete."
    };
  },
  async signOut() {
    return;
  }
};

const authorizationService: AuthorizationService = {
  async getSnapshot() {
    return emptyAuthorizationSnapshot(
      "server-policy-unavailable",
      "Fixture mode never grants Studio authority."
    );
  },
  async hasCapability(capability) {
    const snapshot = await this.getSnapshot();
    return hasServerCapability(snapshot, capability);
  }
};

const deviceSecurityService: DeviceSecurityService = {
  async getCurrentSession() {
    return {
      authenticated: false,
      userId: null,
      expiresAt: null,
      remoteSessionManagementAvailable: false
    };
  },
  async requestPushRegistration() {
    return {
      status: "configuration-required",
      deviceTokenAvailable: false,
      message: "Fixture mode does not register push devices."
    };
  },
  async getNotificationPreferences() {
    return getNotificationPreferences();
  },
  async saveNotificationPreferences(preferences) {
    await saveNotificationPreferences(preferences);
  }
};

const premiumService: PremiumService = {
  async hasEntitlement() {
    return false;
  },
  async getProtectedArticle() {
    return null;
  }
};

const advertisingService: AdvertisingService = {
  async getDecision(placementKey, context) {
    return decideFixtureAd(placementKey, context);
  }
};

const analyticsService: AnalyticsService = {
  async track(event) {
    validatePublicAnalyticsEvent(event);
    // Event shape is validated, but NM-05 intentionally emits no production analytics
    // until a verified mobile GA4 stream/provider is configured.
    return;
  }
};

const fixtureCanonicalLiveItems = [
  {
    id: "d1000000-0000-4000-b000-000000000001",
    title: "National Cholera & Waterborne Disease Emergency Briefing",
    summary: "Real-time epidemiological updates, rapid response deployments, and municipal water testing bulletins from the Ministry of Health and Child Care.",
    kind: "live-blog" as const,
    status: "live" as const,
    updatedAt: "2026-10-17T10:42:00.000Z",
    updateCount: 3,
    media: liveItems[0]?.media ?? null
  },
  {
    id: "d1000000-0000-4000-b000-000000000005",
    title: "Provincial Maternal Health Infrastructure Roundtable",
    summary: "Live coverage of provincial hospital maternity wing upgrades and rural clinic referral transport discussions.",
    kind: "live-blog" as const,
    status: "live" as const,
    updatedAt: "2026-10-17T09:15:00.000Z",
    updateCount: 0,
    media: null
  },
  {
    id: "d1000000-0000-4000-b000-000000000002",
    title: "Parliamentary Portfolio Committee on Health Budget Hearing",
    summary: "Scheduled live blog covering health sector allocations and NatPharm supply chain testimony.",
    kind: "live-blog" as const,
    status: "upcoming" as const,
    updatedAt: "2026-10-17T08:00:00.000Z",
    updateCount: 0,
    media: null
  },
  {
    id: "d1000000-0000-4000-b000-000000000003",
    title: "Southern Africa Antimicrobial Resistance Symposium",
    summary: "Scheduled regional briefing on hospital stewardship and laboratory surveillance.",
    kind: "scheduled" as const,
    status: "upcoming" as const,
    updatedAt: "2026-10-17T07:30:00.000Z",
    media: liveItems[1]?.media ?? null
  },
  ...liveItems
];

const liveService: LiveService = {
  async list() {
    return fixtureCanonicalLiveItems;
  },
  async listUpdates(coverageId, options) {
    if (coverageId === "d1000000-0000-4000-b000-000000000001" || coverageId === "fixture-live-001") {
      const allUpdates = [
        {
          streamSeq: 3,
          id: "e1000000-0000-4000-b000-000000000003",
          coverageId,
          headline: "NatPharm dispatches 40 tonnes of oral rehydration salts to provincial depots",
          body: "Emergency logistics teams have completed loading at the Harare central warehouse. Consignments of intravenous fluids, chlorine tablets, and rapid diagnostic kits are en route to Manicaland and Mashonaland Central.",
          publishedAt: "2026-10-17T10:42:00.000Z",
          media: liveItems[0]?.media
            ? {
                ...liveItems[0].media,
                caption: "Field epidemiology teams coordinating emergency supply dispatch in Harare.",
                credit: "HealthTimes Newsroom"
              }
            : null
        },
        {
          streamSeq: 2,
          id: "e1000000-0000-4000-b000-000000000002",
          coverageId,
          headline: "Municipal water quality monitoring expanded across 14 high-density suburbs",
          body: "Environmental health technicians have established 28 additional borehole and tap-water sampling points, with laboratory turnaround times shortened to under six hours.",
          publishedAt: "2026-10-17T10:15:00.000Z",
          media: null
        },
        {
          streamSeq: 1,
          id: "e1000000-0000-4000-b000-000000000001",
          coverageId,
          headline: null,
          body: "The Ministry of Health and Child Care has opened the morning situation briefing, confirming that rapid response teams are operational in all eight rural provinces.",
          publishedAt: "2026-10-17T09:50:00.000Z",
          media: null
        }
      ];
      if (options?.afterSeq !== undefined && options?.afterSeq !== null) {
        return allUpdates
          .filter((u) => u.streamSeq > options.afterSeq!)
          .sort((a, b) => a.streamSeq - b.streamSeq);
      }
      return allUpdates;
    }
    return [];
  }
};
const videoService: VideoService = { async list() { return videos; } };
const audioService: AudioService = { async list() { return audioItems; } };

const notificationService: NotificationService = {
  async list() {
    return notifications;
  },
  async registerDevice() {
    return { status: "fixture" };
  }
};

const readerDiscussionService: ReaderDiscussionService = {
  async registerProfile() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  },
  async getEligibility() {
    return { status: "blocked", reason: "canonical_story_required", profileId: null, publishedCommentCount: 0 };
  },
  async listPublic() {
    return [];
  },
  async submit() {
    throw new Error("Canonical HealthTimes story identity is required before discussion can be used.");
  },
  async edit() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  },
  async withdraw() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  },
  async report() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  }
};

const newsroomCommunicationService: NewsroomCommunicationService = {
  async listInbox() {
    return {
      items: [],
      summary: {
        unreadTotal: 0, mentions: 0, assignments: 0, reviews: 0,
        urgent: 0, announcements: 0, newsletter: 0, moderation: 0, unacknowledged: 0
      }
    };
  },
  async markRead() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async acknowledge() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async archive() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listAssignments() { return []; },
  async createAssignment() { throw new Error("Server-authorized Newsroom assignment creation is unavailable in fixture mode."); },
  async progressAssignment() { throw new Error("Server-authorized Newsroom assignment progression is unavailable in fixture mode."); },
  async listAssignmentStaff() { return []; },
  async listStoryDiscussion() { return []; },
  async addStoryComment() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async editStoryComment() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async setStoryCommentResolved() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listDesks() { return []; },
  async listThreads() { return []; },
  async createThread() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listThreadMessages() { return []; },
  async postThreadMessage() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async markThreadRead() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listAnnouncements() { return []; }
};

const commentModerationService: CommentModerationService = {
  async listQueue() { return []; },
  async moderate() { throw new Error("Comment moderation is unavailable in fixture mode."); },
  async setStoryCommentPolicy() { throw new Error("Comment moderation is unavailable in fixture mode."); },
  async restrictReader() { throw new Error("Comment moderation is unavailable in fixture mode."); },
  async liftRestriction() { throw new Error("Comment moderation is unavailable in fixture mode."); }
};

const platformService: PlatformService = {
  async checkConnectivity() {
    return {
      status: "healthy",
      checkedAt: new Date().toISOString(),
      projectRef: null,
      checks: [
        {
          key: "configuration",
          label: "Fixture environment",
          status: "pass",
          detail: "Local fixture mode is active; no staging network calls are required."
        }
      ]
    };
  }
};

const socialService: SocialAttributionService = {
  async buildCanonicalShareUrl(article) {
    return canonicalArticleUrl(article);
  },
  async buildAttributedShareUrl(article, channel) {
    return attributedShareUrl(article, channel);
  }
};

const FAIL_CLOSED_NEWSROOM_MESSAGE = "Server-authorized Newsroom story authority is unavailable in fixture mode.";

export const fixtureNewsroomStoryService: NewsroomStoryService = {
  async listStories() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async getStory() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async createStory() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async saveStory() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async setCommentPolicy() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async transitionStory() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async listAuthors() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async listSections() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async listRevisions() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async listAutosave() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async listReviews() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async listCorrections() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async restoreRevision() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async recordReview() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  },
  async requestChanges() {
    throw new Error(FAIL_CLOSED_NEWSROOM_MESSAGE);
  }
};

const FAIL_CLOSED_MEDIA_MESSAGE = "Server-authorized Newsroom media operations are unavailable in fixture mode.";

export const fixtureNewsroomMediaService: NewsroomMediaService = {
  async listMedia() {
    return [];
  },
  async listStoryMedia() {
    return [];
  },
  async getMediaPreview() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async updateMediaMetadata() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async prepareStoryMedia() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async getUploadContext() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async finalizeStoryMedia() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async attachStoryMedia() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async detachStoryMedia() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async getPromotionPlan() {
    return [];
  },
  async stagePromotion() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  },
  async clearStagedPromotion() {
    throw new Error(FAIL_CLOSED_MEDIA_MESSAGE);
  }
};

const FAIL_CLOSED_VIDEO_MESSAGE =
  "Fixture video service mutations remain locked in non-production fixture mode.";

export const fixtureNewsroomVideoService: NewsroomVideoService = {
  async listVideos() {
    return [];
  },
  async createVideo() {
    throw new Error(FAIL_CLOSED_VIDEO_MESSAGE);
  },
  async saveVideo() {
    throw new Error(FAIL_CLOSED_VIDEO_MESSAGE);
  },
  async setReady() {
    throw new Error(FAIL_CLOSED_VIDEO_MESSAGE);
  },
  async publishVideo() {
    throw new Error(FAIL_CLOSED_VIDEO_MESSAGE);
  },
  async unpublishVideo() {
    throw new Error(FAIL_CLOSED_VIDEO_MESSAGE);
  },
  async setFeatured() {
    throw new Error(FAIL_CLOSED_VIDEO_MESSAGE);
  }
};

const FAIL_CLOSED_LIVE_MESSAGE =
  "Newsroom live coverage mutations are disabled in fixture mode. Staging or production server connection required.";

const fixtureNewsroomLiveCoverageService: NewsroomLiveCoverageService = {
  async listCoverage() {
    return [];
  },
  async createCoverage() {
    throw new Error(FAIL_CLOSED_LIVE_MESSAGE);
  },
  async saveCoverage() {
    throw new Error(FAIL_CLOSED_LIVE_MESSAGE);
  },
  async startCoverage() {
    throw new Error(FAIL_CLOSED_LIVE_MESSAGE);
  },
  async endCoverage() {
    throw new Error(FAIL_CLOSED_LIVE_MESSAGE);
  },
  async listUpdates() {
    return [];
  },
  async postUpdate() {
    throw new Error(FAIL_CLOSED_LIVE_MESSAGE);
  }
};

const FAIL_CLOSED_SOCIAL_MESSAGE =
  "Newsroom social desk mutations are disabled in fixture mode. Staging or production server connection required.";

const fixtureNewsroomSocialService: NewsroomSocialService = {
  async listAccounts() {
    return [];
  },
  async listPosts() {
    return [];
  },
  async listPublicationAttempts() {
    return [];
  },
  async createDraft() {
    throw new Error(FAIL_CLOSED_SOCIAL_MESSAGE);
  },
  async approvePost() {
    throw new Error(FAIL_CLOSED_SOCIAL_MESSAGE);
  },
  async preparePublish() {
    throw new Error(FAIL_CLOSED_SOCIAL_MESSAGE);
  }
};

const FAIL_CLOSED_CAMPAIGN_MESSAGE =
  "Newsroom newsletter campaign desk mutations are disabled in fixture mode. Staging or production server connection required.";

const fixtureNewsroomCampaignService: NewsroomCampaignService = {
  async listCampaigns() {
    return [];
  },
  async listSegments() {
    return [];
  },
  async createCampaign() {
    throw new Error(FAIL_CLOSED_CAMPAIGN_MESSAGE);
  },
  async approveCampaign() {
    throw new Error(FAIL_CLOSED_CAMPAIGN_MESSAGE);
  },
  async prepareSend() {
    throw new Error(FAIL_CLOSED_CAMPAIGN_MESSAGE);
  }
};

const FAIL_CLOSED_PUSH_ALERT_MESSAGE =
  "Newsroom push alert desk mutations are disabled in fixture mode. Staging or production server connection required.";

const fixtureNewsroomPushAlertService: NewsroomPushAlertService = {
  async listAlerts() {
    return [];
  },
  async createAlert() {
    throw new Error(FAIL_CLOSED_PUSH_ALERT_MESSAGE);
  },
  async saveAlert() {
    throw new Error(FAIL_CLOSED_PUSH_ALERT_MESSAGE);
  },
  async approveAlert() {
    throw new Error(FAIL_CLOSED_PUSH_ALERT_MESSAGE);
  },
  async prepareAlert() {
    throw new Error(FAIL_CLOSED_PUSH_ALERT_MESSAGE);
  },
  async getDispatch() {
    return null;
  },
  async dispatchAlert() {
    throw new Error(FAIL_CLOSED_PUSH_ALERT_MESSAGE);
  }
};

const FAIL_CLOSED_WHATSAPP_MESSAGE =
  "Newsroom WhatsApp desk mutations are disabled in fixture mode. Staging or production server connection required.";

const fixtureNewsroomWhatsAppService: NewsroomWhatsAppService = {
  async listBroadcasts() {
    return [];
  },
  async createBroadcast() {
    throw new Error(FAIL_CLOSED_WHATSAPP_MESSAGE);
  },
  async approveBroadcast() {
    throw new Error(FAIL_CLOSED_WHATSAPP_MESSAGE);
  },
  async rejectBroadcast() {
    throw new Error(FAIL_CLOSED_WHATSAPP_MESSAGE);
  },
  async getDispatch() {
    return null;
  },
  async dispatchBroadcast() {
    throw new Error(FAIL_CLOSED_WHATSAPP_MESSAGE);
  }
};

const fixtureNewsroomIntelligenceService: NewsroomIntelligenceService = {
  async getEditorialIntelligence() {
    return {
      generatedAt: new Date().toISOString(),
      storyInventory: {
        total: 5792,
        published: 5789,
        draft: 3,
        review: 3,
        scheduled: 0,
        archived: 0
      },
      publishingVelocity: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 7
      },
      reviewQueue: {
        inReviewCount: 3,
        avgAgeHours: 24.5,
        oldestAgeHours: 48.0
      },
      assignments: {
        total: 0,
        active: 0,
        overdue: 0,
        completed: 0
      },
      deskMix: [
        { desk: "Public Health", count: 2400 },
        { desk: "Policy", count: 1500 },
        { desk: "Clinical", count: 989 },
        { desk: "Investigations", count: 900 }
      ],
      distributionReach: {
        socialPostsCount: 0,
        newsletterCampaignsCount: 0,
        pushAlertsCount: 0,
        whatsappBroadcastsCount: 0
      }
    };
  },

  async getGrowthIntelligence() {
    return {
      generatedAt: new Date().toISOString(),
      integrations: [
        {
          id: "int-ga4-001",
          provider: "google_analytics",
          integrationKey: "public_web",
          status: "identity_verified_account_access_pending",
          externalAccountId: "137814020",
          externalPropertyId: "359235319",
          externalMeasurementId: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          lastError: null,
          notes: "Property identified; awaiting service account authorization"
        },
        {
          id: "int-gsc-001",
          provider: "search_console",
          integrationKey: "public_search",
          status: "property_known_account_access_pending",
          externalAccountId: null,
          externalPropertyId: "https://healthtimes.co.zw/",
          externalMeasurementId: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          lastError: null,
          notes: "Domain property identified; awaiting Search Console API access"
        },
        {
          id: "int-ads-001",
          provider: "adsense",
          integrationKey: "public_ads",
          status: "identity_verified_reporting_access_pending",
          externalAccountId: null,
          externalPropertyId: "pub-8744434739998394",
          externalMeasurementId: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          lastError: null,
          notes: "Publisher ID verified; awaiting reporting API grant"
        },
        {
          id: "int-cit-001",
          provider: "citations",
          integrationKey: "external_references",
          status: "provider_not_connected",
          externalAccountId: null,
          externalPropertyId: null,
          externalMeasurementId: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          lastError: null,
          notes: "Citation tracking provider unconfigured"
        }
      ],
      analyticsDailySummary: {
        rowsRecorded: 0,
        totalPageViews: 0,
        totalUsers: 0,
        totalSessions: 0,
        status: "pending_ingestion"
      },
      searchConsoleSummary: {
        property: "https://healthtimes.co.zw/",
        rowsRecorded: 0,
        totalClicks: 0,
        totalImpressions: 0,
        status: "pending_ingestion"
      },
      seoHealth: {
        totalStories: 5792,
        withSeoTitle: 5780,
        withSeoDescription: 5780,
        withCanonicalUrl: 5792
      },
      citationsSummary: {
        status: "provider_not_connected",
        verifiedCitationsCount: 0,
        institutionalReferencesCount: 0,
        governmentNgoMentionsCount: 0,
        notes: "Production citation tracking requires academic/cross-ref indexer API integration."
      }
    };
  },

  async getAudienceIntelligence() {
    return {
      generatedAt: new Date().toISOString(),
      contacts: {
        totalProfiles: 0,
        consentedContacts: 0
      },
      segments: {
        totalSegments: 0,
        totalMemberships: 0
      },
      pushSubscribers: {
        registeredDevices: 0,
        activeDevices: 0
      },
      whatsappDistribution: {
        totalBroadcasts: 0,
        sentBroadcasts: 0
      },
      subscribers: {
        totalSubscribers: 0,
        activeSubscribers: 0
      },
      ga4AudienceStatus: {
        propertyId: "359235319",
        accountId: "137814020",
        status: "identity_verified_account_access_pending",
        notes: "Google Analytics 4 property identified. Awaiting Data API service account grant."
      }
    };
  }
};

const FAIL_CLOSED_STAFF_MESSAGE =
  "Newsroom staff management operations require authenticated server connection.";

export const fixtureNewsroomStaffService: NewsroomStaffService = {
  async getStaffOperationsDirectory() {
    return {
      staff: [],
      invitations: [],
      roles: [],
      capabilities: [],
      auditHistory: [],
      canManageStaff: false
    };
  },
  async changeStaffRole() {
    throw new Error(FAIL_CLOSED_STAFF_MESSAGE);
  },
  async updateStaffStatus() {
    throw new Error(FAIL_CLOSED_STAFF_MESSAGE);
  },
  async revokeStaffSession() {
    throw new Error(FAIL_CLOSED_STAFF_MESSAGE);
  },
  async createInvitation() {
    throw new Error(FAIL_CLOSED_STAFF_MESSAGE);
  },
  async cancelInvitation() {
    throw new Error(FAIL_CLOSED_STAFF_MESSAGE);
  }
};

export const fixtureServices: HealthTimesServices = {
  articles: articleRepository,
  presentation: {
    async getPublicHomepagePresentations() {
      return [];
    }
  },
  search: searchService,
  auth: authService,
  authorization: authorizationService,
  deviceSecurity: deviceSecurityService,
  reader: persistentReaderRepository,
  premium: premiumService,
  premiumStore: fixturePremiumStoreService,
  premiumCommerce: premiumCommerceService,
  advertising: advertisingService,
  analytics: analyticsService,
  live: liveService,
  video: videoService,
  audio: audioService,
  notifications: notificationService,
  readerDiscussion: readerDiscussionService,
  newsroomCommunication: newsroomCommunicationService,
  commentModeration: commentModerationService,
  newsroomStories: fixtureNewsroomStoryService,
  newsroomMedia: fixtureNewsroomMediaService,
  newsroomVideo: fixtureNewsroomVideoService,
  newsroomLive: fixtureNewsroomLiveCoverageService,
  newsroomSocial: fixtureNewsroomSocialService,
  newsroomCampaigns: fixtureNewsroomCampaignService,
  newsroomPushAlerts: fixtureNewsroomPushAlertService,
  newsroomWhatsApp: fixtureNewsroomWhatsAppService,
  newsroomIntelligence: fixtureNewsroomIntelligenceService,
  newsroomStaff: fixtureNewsroomStaffService,
  taxonomy: certifiedTaxonomyFixtureService,
  publication: {
    async getProfile() {
      return {
        name: "HealthTimes",
        description: "Controlled fixture publication profile.",
        publisher: "Fixture",
        location: "Global",
        editorialEmail: "editorial@example.invalid",
        aboutUrl: "",
        contactUrl: "",
        editorialPrinciples: [],
        sourceVerifiedAt: ""
      };
    },
    async listAuthors() { return []; },
    async getAuthor() { return null; }
  },
  platform: platformService,
  social: socialService
};
