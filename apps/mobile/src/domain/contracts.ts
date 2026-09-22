import type {
  AdDecision,
  AdPlacementKey,
  AdRequestContext,
  AnalyticsEvent,
  AppearancePreference,
  AccountDeletionState,
  AuthActionResult,
  ArticleDetail,
  ArticleSummary,
  AuthorProfile,
  AudioItem,
  AuthSessionState,
  CurrentDeviceSession,
  EditionPreference,
  LiveItem,
  NotificationItem,
  PlatformConnectivityReport,
  PremiumRestoreResult,
  ReaderCommentEligibility,
  ReaderStoryComment,
  NewsroomInboxItem,
  NewsroomInboxSummary,
  NewsroomInternalComment,
  NewsroomDesk,
  NewsroomThread,
  NewsroomMessage,
  NewsroomAnnouncement,
  ReaderCommentModerationItem,
  PublicationProfile,
  PremiumStoreState,
  ReaderProfile,
  SearchQuery,
  SearchResult,
  VideoItem
} from "./models";
import type { TaxonomySnapshot } from "./source";
import type { AuthorizationSnapshot, HealthTimesCapability } from "../security/capabilities";
import type { NotificationPreferences } from "../security/notification-preferences";
import type { PushRegistrationResult } from "../security/push";

export interface ArticleRepository {
  getHome(): Promise<ArticleSummary[]>;
  getById(id: string): Promise<ArticleDetail | null>;
  getRelated(id: string): Promise<ArticleSummary[]>;
  listBySection(sectionSlug: string): Promise<ArticleSummary[]>;
  listByAuthor(authorSlug: string): Promise<ArticleSummary[]>;
}

export interface PublicationRepository {
  getProfile(): Promise<PublicationProfile>;
  listAuthors(): Promise<AuthorProfile[]>;
  getAuthor(slug: string): Promise<AuthorProfile | null>;
}

export interface SearchService {
  search(query: SearchQuery): Promise<SearchResult>;
}

export interface AuthService {
  getReader(): Promise<ReaderProfile>;
  getSessionState(): Promise<AuthSessionState>;
  signInWithPassword(email: string, password: string): Promise<AuthActionResult>;
  registerReader(email: string, password: string, displayName: string): Promise<AuthActionResult>;
  requestPasswordReset(email: string): Promise<AuthActionResult>;
  resendVerification(email: string): Promise<AuthActionResult>;
  handleAuthCallback(url: string): Promise<AuthActionResult>;
  completePasswordReset(password: string): Promise<AuthActionResult>;
  requestAccountDeletion(): Promise<AccountDeletionState>;
  signOut(): Promise<void>;
}

export interface AuthorizationService {
  getSnapshot(): Promise<AuthorizationSnapshot>;
  hasCapability(capability: HealthTimesCapability): Promise<boolean>;
}

export interface DeviceSecurityService {
  getCurrentSession(): Promise<CurrentDeviceSession>;
  requestPushRegistration(): Promise<PushRegistrationResult>;
  getNotificationPreferences(): Promise<NotificationPreferences>;
  saveNotificationPreferences(preferences: NotificationPreferences): Promise<void>;
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

export interface PremiumStoreService {
  getState(): Promise<PremiumStoreState>;
  startPurchase(storeProductId: string): Promise<void>;
  restorePurchases(): Promise<PremiumRestoreResult>;
}

export interface AdvertisingService {
  getDecision(placementKey: AdPlacementKey, context?: AdRequestContext): Promise<AdDecision>;
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

export interface ReaderDiscussionService {
  registerProfile(displayName: string): Promise<string>;
  getEligibility(canonicalStoryId: string | null): Promise<ReaderCommentEligibility>;
  listPublic(canonicalStoryId: string | null): Promise<ReaderStoryComment[]>;
  submit(canonicalStoryId: string | null, body: string, parentCommentId?: string | null): Promise<string>;
  edit(commentId: string, body: string): Promise<void>;
  withdraw(commentId: string): Promise<void>;
  report(commentId: string, reasonCode: string, details?: string | null): Promise<string>;
}

export interface NewsroomCommunicationService {
  listInbox(filter?: string, limit?: number): Promise<{ items: NewsroomInboxItem[]; summary: NewsroomInboxSummary }>;
  markRead(notificationId: string, read?: boolean): Promise<void>;
  acknowledge(notificationId: string): Promise<void>;
  archive(notificationId: string): Promise<void>;

  listAssignments(): Promise<NewsroomAssignment[]>;
  listStoryDiscussion(storyId: string): Promise<NewsroomInternalComment[]>;
  addStoryComment(storyId: string, body: string, parentCommentId?: string | null, mentionStaffIds?: string[]): Promise<string>;
  editStoryComment(commentId: string, body: string, mentionStaffIds?: string[] | null): Promise<void>;
  setStoryCommentResolved(commentId: string, resolved: boolean): Promise<void>;

  listDesks(): Promise<NewsroomDesk[]>;
  listThreads(options?: { deskId?: string | null; threadType?: NewsroomThread["threadType"] | null }): Promise<NewsroomThread[]>;
  createThread(input: {
    threadType: NewsroomThread["threadType"];
    title: string;
    assignmentId?: string | null;
    deskId?: string | null;
    priority?: NewsroomThread["priority"];
    expiresAt?: string | null;
  }): Promise<string>;
  listThreadMessages(threadId: string): Promise<NewsroomMessage[]>;
  postThreadMessage(threadId: string, body: string, parentMessageId?: string | null, mentionStaffIds?: string[]): Promise<string>;
  markThreadRead(threadId: string): Promise<void>;
  listAnnouncements(): Promise<NewsroomAnnouncement[]>;
}

export interface CommentModerationService {
  listQueue(state?: ReaderCommentModerationItem["state"] | null, limit?: number): Promise<ReaderCommentModerationItem[]>;
  moderate(commentId: string, action: "publish" | "hold" | "reject" | "hide" | "remove" | "restore", reasonCode: string, notes?: string | null): Promise<string>;
  setStoryCommentPolicy(storyId: string, policy: "disabled" | "read_only" | "open"): Promise<string>;
  restrictReader(readerProfileId: string, kind: "pre_moderation" | "comment_block" | "link_block", reasonCode: string, endsAt?: string | null, notes?: string | null): Promise<string>;
  liftRestriction(restrictionId: string, notes?: string | null): Promise<void>;
}

export interface TaxonomyService {
  getSnapshot(): Promise<TaxonomySnapshot>;
}

export interface PlatformService {
  checkConnectivity(): Promise<PlatformConnectivityReport>;
}

export interface SocialAttributionService {
  buildCanonicalShareUrl(article: ArticleSummary): Promise<string>;
  buildAttributedShareUrl(
    article: ArticleSummary,
    channel: "system" | "whatsapp" | "facebook" | "x" | "linkedin" | "email" | "copy"
  ): Promise<string>;
}

export interface HealthTimesServices {
  articles: ArticleRepository;
  search: SearchService;
  auth: AuthService;
  authorization: AuthorizationService;
  deviceSecurity: DeviceSecurityService;
  reader: ReaderRepository;
  premium: PremiumService;
  premiumStore: PremiumStoreService;
  advertising: AdvertisingService;
  analytics: AnalyticsService;
  live: LiveService;
  video: VideoService;
  audio: AudioService;
  notifications: NotificationService;
  readerDiscussion: ReaderDiscussionService;
  newsroomCommunication: NewsroomCommunicationService;
  commentModeration: CommentModerationService;
  taxonomy: TaxonomyService;
  publication: PublicationRepository;
  platform: PlatformService;
  social: SocialAttributionService;
}
