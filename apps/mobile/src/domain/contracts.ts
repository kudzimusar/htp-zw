import type {
  AdDecision,
  AdPlacementKey,
  AnalyticsEvent,
  ArticleDetail,
  ArticleSummary,
  AudioItem,
  EditionPreference,
  LiveItem,
  NotificationItem,
  ReaderProfile,
  SearchQuery,
  SearchResult,
  VideoItem
} from "./models";

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
  signOut(): Promise<void>;
}

export interface ReaderRepository {
  getPreferences(): Promise<EditionPreference>;
  savePreferences(preferences: EditionPreference): Promise<void>;
  getSavedArticleIds(): Promise<string[]>;
  toggleSavedArticle(id: string): Promise<boolean>;
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
  social: SocialAttributionService;
}
