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
  ReaderRepository,
  SearchService,
  SocialAttributionService,
  VideoService
} from "../domain/contracts";
import type { EditionPreference, SearchQuery } from "../domain/models";
import { articles, audioItems, liveItems, notifications, videos } from "../fixtures/content";

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
  async signOut() {
    return;
  }
};

let preferences: EditionPreference = {
  primaryEdition: "Global",
  followedCountries: ["Zimbabwe"],
  followedTopics: ["Public Health", "Research"]
};
const saved = new Set<string>();

const readerRepository: ReaderRepository = {
  async getPreferences() {
    return { ...preferences, followedCountries: [...preferences.followedCountries], followedTopics: [...preferences.followedTopics] };
  },
  async savePreferences(next) {
    preferences = { ...next, followedCountries: [...next.followedCountries], followedTopics: [...next.followedTopics] };
  },
  async getSavedArticleIds() {
    return [...saved];
  },
  async toggleSavedArticle(id) {
    if (saved.has(id)) {
      saved.delete(id);
      return false;
    }
    saved.add(id);
    return true;
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
  async getDecision(placementKey) {
    return {
      placementKey,
      source: "none",
      disclosureLabel: "Advertisement"
    };
  }
};

const analyticsService: AnalyticsService = {
  async track() {
    // NM-01 intentionally emits no production analytics.
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

const socialService: SocialAttributionService = {
  async buildCanonicalShareUrl(article) {
    return "https://healthtimes.co.zw/" + article.slug + "/";
  }
};

export const fixtureServices: HealthTimesServices = {
  articles: articleRepository,
  search: searchService,
  auth: authService,
  reader: readerRepository,
  premium: premiumService,
  advertising: advertisingService,
  analytics: analyticsService,
  live: liveService,
  video: videoService,
  audio: audioService,
  notifications: notificationService,
  social: socialService
};
