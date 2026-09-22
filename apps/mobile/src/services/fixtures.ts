import type {
  AdvertisingService,
  AnalyticsService,
  ArticleRepository,
  AuthorizationService,
  DeviceSecurityService,
  AudioService,
  AuthService,
  HealthTimesServices,
  LiveService,
  NotificationService,
  PremiumService,
  PlatformService,
  SearchService,
  SocialAttributionService,
  VideoService
} from "../domain/contracts";
import type { SearchQuery } from "../domain/models";
import { articles, audioItems, liveItems, notifications, videos } from "../fixtures/content";
import { certifiedTaxonomyFixtureService } from "./taxonomy";
import { persistentReaderRepository } from "./reader-persistence";
import { createAdvertisingService } from "../growth/advertising";
import { createRuntimeAnalyticsService } from "../growth/analytics";
import { attributedShareUrl, canonicalArticleUrl } from "../growth/deepLinks";
import { fixturePremiumStoreService } from "../growth/premium-store";
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
  async getBySlug(slug) {
    return articles.find((item) => item.slug === slug) ?? null;
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

const advertisingService: AdvertisingService = createAdvertisingService();

const analyticsService: AnalyticsService = createRuntimeAnalyticsService();

const liveService: LiveService = { async list() { return liveItems; } };
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

export const fixtureServices: HealthTimesServices = {
  articles: articleRepository,
  search: searchService,
  auth: authService,
  authorization: authorizationService,
  deviceSecurity: deviceSecurityService,
  reader: persistentReaderRepository,
  premium: premiumService,
  premiumStore: fixturePremiumStoreService,
  advertising: advertisingService,
  analytics: analyticsService,
  live: liveService,
  video: videoService,
  audio: audioService,
  notifications: notificationService,
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
