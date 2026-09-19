import type {
  AdvertisingService,
  AnalyticsService,
  ArticleRepository,
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
import { decideFixtureAd } from "../growth/advertising";
import { validatePublicAnalyticsEvent } from "../growth/events";
import { attributedShareUrl, canonicalArticleUrl } from "../growth/deepLinks";
import { fixturePremiumStoreService } from "../growth/premium-store";

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
  async signOut() {
    return;
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
  platform: platformService,
  social: socialService
};
