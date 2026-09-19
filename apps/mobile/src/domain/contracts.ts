import type {
  AdDecision,
  AdPlacementKey,
  AnalyticsEvent,
  AppearancePreference,
  ArticleDetail,
  ArticleSummary,
  AudioItem,
  AuthSessionState,
  EditionPreference,
  LiveItem,
  NotificationItem,
  PlatformConnectivityReport,
  ReaderProfile,
  SearchQuery,
  SearchResult,
  VideoItem
} from "./models";
import type { TaxonomySnapshot } from "./source";
import type { ReaderAppearance, ReadingPosition } from "../reader/types";

export interface ArticleRepository {
  getHome(): Promise<ArticleSummary[]>;
  getById(id: string): Promise<ArticleDetail | null>;
  getRelated(id: string): Promise<ArticleSummary[]>;
  listBySection(sectionSlug: string): Promise<ArticleSummary[]>;
}

export interface SearchService {
  search(query: SearchQuery): Promise<SearchResult>;
}

export interface AuthService {
  getReader(): Promise<ReaderProfile>;
  getSessionState(): Promise<AuthSessionState>;
  signOut(): Promise<void>;
}

export interface ReaderRepository {
  getPreferences(): Promise<EditionPreference>;
  savePreferences(preferences: EditionPreference): Promise<void>;
  getAppearance(): Promise<AppearancePreference>;
  setAppearance(preference: AppearancePreference): Promise<void>;
  getSavedArticleIds(): Promise<string[]>;
  toggleSavedArticle(id: string): Promise<boolean>;
  getDownloadedArticles(): Promise<ArticleDetail[]>;
  downloadArticle(article: ArticleDetail): Promise<void>;
  removeDownloadedArticle(id: string): Promise<void>;
  getReadPosition(articleId: string): Promise<number>;
  setReadPosition(articleId: string, progress: number): Promise<void>;
  recordReadingHistory(articleId: string): Promise<void>;
  getReadingHistoryIds(): Promise<string[]>;
}

export interface PremiumService {
  hasEntitlement(): Promise<boolean>;
  getProtectedArticle(id: string): Promise<ArticleDetail | null>;
}

export interface AdvertisingService {
  getDecision(placementKey: AdPlacementKey): Promise<AdDecision>;
}

export interface AnalyticsService {
  track(event: AnalyticsEvent): Promise<void>;
}

export interface LiveService {
  list(): Promise<LiveItem[]>;
}

export interface VideoService {
  list(): Promise<VideoItem[]>;
}

export interface AudioService {
  list(): Promise<AudioItem[]>;
}

export interface NotificationService {
  list(): Promise<NotificationItem[]>;
  registerDevice(): Promise<{ status: "fixture" | "registered" | "blocked" }>;
}

export interface TaxonomyService {
  getSnapshot(): Promise<TaxonomySnapshot>;
}

export interface PlatformService {
  checkConnectivity(): Promise<PlatformConnectivityReport>;
}

export interface SocialAttributionService {
  buildCanonicalShareUrl(article: ArticleSummary): Promise<string>;
}

export interface HealthTimesServices {
  articles: ArticleRepository;
  search: SearchService;
  auth: AuthService;
  reader: ReaderRepository;
  premium: PremiumService;
  advertising: AdvertisingService;
  analytics: AnalyticsService;
  live: LiveService;
  video: VideoService;
  audio: AudioService;
  notifications: NotificationService;
  taxonomy: TaxonomyService;
  platform: PlatformService;
  social: SocialAttributionService;
}
