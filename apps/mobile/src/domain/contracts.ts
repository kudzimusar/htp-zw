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
  PremiumPreviewWindow,
  PremiumCheckoutResult,
  PremiumCommerceAuthority,
  ReaderCommentEligibility,
  ReaderStoryComment,
  NewsroomInboxItem,
  NewsroomInboxSummary,
  NewsroomInternalComment,
  NewsroomDesk,
  NewsroomThread,
  NewsroomMessage,
  NewsroomAnnouncement,
  NewsroomAssignment,
  NewsroomStory,
  NewsroomPublicAuthor,
  NewsroomSection,
  NewsroomStoryRevision,
  NewsroomStoryAutosave,
  NewsroomStoryReview,
  NewsroomStoryCorrection,
  CreateStoryInput,
  SaveStoryPatch,
  CreateAssignmentInput,
  NewsroomPlanningStaff,
  ReaderCommentModerationItem,
  PublicationProfile,
  PremiumStoreState,
  ReaderProfile,
  SearchQuery,
  SearchResult,
  VideoItem,
  PublicHomepagePresentation,
  NewsroomMediaAsset,
  NewsroomMediaPreview,
  NewsroomMediaMetadataPatch,
  PrepareStoryMediaPayload,
  StoryMediaPreparation,
  StoryMediaUploadContext,
  StoryMediaPromotionItem,
  StoryMediaStageResult,
  StoryMediaUsageType,
  NewsroomVideo,
  NewsroomVideoCreateInput,
  NewsroomVideoPatch,
  NewsroomVideoListOptions,
  NewsroomLiveCoverage,
  NewsroomLiveCoverageCreateInput,
  NewsroomLiveCoveragePatch,
  NewsroomLiveCoverageListOptions,
  NewsroomLiveUpdate,
  NewsroomLiveUpdateCreateInput,
  LiveBlogUpdate,
  NewsroomSocialAccount,
  NewsroomSocialPost,
  NewsroomSocialPostStatus,
  NewsroomSocialPublicationAttempt,
  NewsroomSocialPreparePublishResult,
  NewsroomSocialDraftCreateInput,
  NewsroomCampaign,
  NewsroomCampaignPurpose,
  NewsroomCampaignStatus,
  NewsroomContactSegment,
  NewsroomCampaignCreateInput,
  NewsroomCampaignPrepareSendResult,
  NewsroomPushAlert,
  NewsroomPushAlertCategory,
  NewsroomPushAlertCreateInput,
  NewsroomPushAlertPatch,
  NewsroomPushAlertPrepareResult,
  NewsroomPushAlertStatus,
  NewsroomPushDispatch,
  NewsroomPushDispatchResult,
  NewsroomWhatsAppBroadcast,
  NewsroomWhatsAppBroadcastCreateInput,
  NewsroomWhatsAppBroadcastStatus,
  NewsroomWhatsAppBroadcastType,
  NewsroomWhatsAppDispatch,
  NewsroomWhatsAppDispatchResult,
  NewsroomWhatsAppDispatchStatus,
  NewsroomEditorialIntelligence,
  NewsroomGrowthIntelligence,
  NewsroomAudienceIntelligence,
  NewsroomStaffMember,
  NewsroomStaffInvitation,
  NewsroomRole,
  NewsroomCapability,
  NewsroomAuditRecord,
  NewsroomStaffOperationsDirectory,
  NewsroomStaffInviteInput,
  NewsroomAdvertisingOverview,
  NewsroomCreateCampaignInput,
  NewsroomCreateCreativeInput,
  NewsroomSubscribersDirectory,
  NewsroomPremiumOperationsOverview,
  NewsroomAiAssistOverview,
  NewsroomAiAssistSession,
  NewsroomRunAiAssistInput,
  NewsroomCitationsDirectory,
  NewsroomRecordCitationInput
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
  getPremiumPreviewWindow(stableStoryId: string, durationSeconds: number): Promise<PremiumPreviewWindow | null>;
  requestPremiumPreviewPrompt(stableStoryId: string): Promise<boolean>;
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

export interface PremiumCommerceService {
  getAuthority(): Promise<PremiumCommerceAuthority>;
  startCheckout(input?: { productPlanId?: string | null }): Promise<PremiumCheckoutResult>;
}

export interface AdvertisingService {
  getDecision(placementKey: AdPlacementKey, context?: AdRequestContext): Promise<AdDecision>;
}

export interface AnalyticsService {
  track(event: AnalyticsEvent): Promise<void>;
}

export interface LiveService {
  list(): Promise<LiveItem[]>;
  listUpdates(
    coverageId: string,
    options?: { afterSeq?: number | null; limit?: number }
  ): Promise<LiveBlogUpdate[]>;
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
  createAssignment(input: CreateAssignmentInput): Promise<string>;
  progressAssignment(assignmentId: string): Promise<string>;
  listAssignmentStaff(): Promise<NewsroomPlanningStaff[]>;
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

export interface NewsroomStoryService {
  listStories(limit?: number): Promise<NewsroomStory[]>;
  getStory(storyId: string): Promise<NewsroomStory | null>;
  createStory(input: CreateStoryInput): Promise<string>;
  saveStory(storyId: string, expectedVersion: number, patch: SaveStoryPatch, reason?: string): Promise<number>;
  transitionStory(storyId: string, nextStatus: string, reason?: string): Promise<string>;
  listAuthors(): Promise<NewsroomPublicAuthor[]>;
  listSections(): Promise<NewsroomSection[]>;
  listRevisions(storyId: string): Promise<NewsroomStoryRevision[]>;
  listAutosave(storyId: string): Promise<NewsroomStoryAutosave | null>;
  listReviews(storyId: string): Promise<NewsroomStoryReview[]>;
  listCorrections(storyId: string): Promise<NewsroomStoryCorrection[]>;
  restoreRevision(storyId: string, revisionId: string, expectedVersion: number): Promise<number>;
  recordReview(storyId: string, reviewType: string, status: string, notes?: string | null): Promise<string>;
  requestChanges(storyId: string, reason: string): Promise<Record<string, unknown>>;
  setCommentPolicy(storyId: string, policy: "disabled" | "read_only" | "open"): Promise<string>;
}

export interface SocialAttributionService {
  buildCanonicalShareUrl(article: ArticleSummary): Promise<string>;
  buildAttributedShareUrl(
    article: ArticleSummary,
    channel: "system" | "whatsapp" | "facebook" | "x" | "linkedin" | "email" | "copy"
  ): Promise<string>;
}

export interface PresentationRepository {
  getPublicHomepagePresentations(editionSlug?: string | null): Promise<PublicHomepagePresentation[]>;
}

export interface NewsroomMediaService {
  listMedia(search?: string | null, limit?: number): Promise<NewsroomMediaAsset[]>;
  listStoryMedia(storyId: string): Promise<NewsroomMediaAsset[]>;
  getMediaPreview(mediaId: string): Promise<NewsroomMediaPreview>;
  updateMediaMetadata(mediaId: string, patch: NewsroomMediaMetadataPatch): Promise<void>;
  prepareStoryMedia(storyId: string, payload: PrepareStoryMediaPayload): Promise<StoryMediaPreparation>;
  getUploadContext(mediaId: string, storyId: string): Promise<StoryMediaUploadContext>;
  finalizeStoryMedia(
    mediaId: string,
    storyId: string,
    usageType: StoryMediaUsageType,
    checksum?: string | null
  ): Promise<{ mediaId: string; storyId: string; usageType: StoryMediaUsageType; status: string }>;
  attachStoryMedia(mediaId: string, storyId: string, usageType: StoryMediaUsageType): Promise<void>;
  detachStoryMedia(mediaId: string, storyId: string, usageType: StoryMediaUsageType): Promise<void>;
  getPromotionPlan(storyId: string): Promise<StoryMediaPromotionItem[]>;
  stagePromotion(
    storyId: string,
    mediaId: string,
    publicStorageKey: string,
    verifiedChecksum: string
  ): Promise<StoryMediaStageResult>;
  clearStagedPromotion(storyId: string, mediaId: string): Promise<void>;
}

export interface NewsroomVideoService {
  listVideos(options?: NewsroomVideoListOptions): Promise<NewsroomVideo[]>;
  createVideo(input: NewsroomVideoCreateInput): Promise<string>;
  saveVideo(videoId: string, expectedVersion: number, patch: NewsroomVideoPatch): Promise<number>;
  setReady(videoId: string, expectedVersion: number, ready: boolean): Promise<number>;
  publishVideo(videoId: string, expectedVersion: number, featured?: boolean): Promise<number>;
  unpublishVideo(videoId: string, expectedVersion: number): Promise<number>;
  setFeatured(videoId: string, expectedVersion: number, featured: boolean): Promise<number>;
}

export interface NewsroomLiveCoverageService {
  listCoverage(options?: NewsroomLiveCoverageListOptions): Promise<NewsroomLiveCoverage[]>;
  createCoverage(input: NewsroomLiveCoverageCreateInput): Promise<string>;
  saveCoverage(id: string, expectedVersion: number, patch: NewsroomLiveCoveragePatch): Promise<number>;
  startCoverage(id: string, expectedVersion: number): Promise<number>;
  endCoverage(id: string, expectedVersion: number): Promise<number>;
  listUpdates(coverageId: string, limit?: number): Promise<NewsroomLiveUpdate[]>;
  postUpdate(coverageId: string, input: NewsroomLiveUpdateCreateInput): Promise<string>;
}

export interface NewsroomSocialService {
  listAccounts(): Promise<NewsroomSocialAccount[]>;
  listPosts(options?: {
    storyId?: string | null;
    status?: NewsroomSocialPostStatus | null;
    limit?: number;
  }): Promise<NewsroomSocialPost[]>;
  listPublicationAttempts(socialPostId: string): Promise<NewsroomSocialPublicationAttempt[]>;
  createDraft(input: NewsroomSocialDraftCreateInput): Promise<string>;
  approvePost(socialPostId: string): Promise<void>;
  preparePublish(socialPostId: string): Promise<NewsroomSocialPreparePublishResult>;
}

export interface NewsroomCampaignService {
  listCampaigns(options?: {
    status?: NewsroomCampaignStatus | null;
    purpose?: NewsroomCampaignPurpose | null;
    search?: string | null;
    limit?: number;
  }): Promise<NewsroomCampaign[]>;
  listSegments(): Promise<NewsroomContactSegment[]>;
  createCampaign(input: NewsroomCampaignCreateInput): Promise<string>;
  approveCampaign(campaignId: string): Promise<void>;
  prepareSend(campaignId: string): Promise<NewsroomCampaignPrepareSendResult>;
}

export interface NewsroomPushAlertService {
  listAlerts(options?: {
    status?: NewsroomPushAlertStatus | null;
    category?: NewsroomPushAlertCategory | null;
    search?: string | null;
    limit?: number;
  }): Promise<NewsroomPushAlert[]>;
  createAlert(input: NewsroomPushAlertCreateInput): Promise<string>;
  saveAlert(alertId: string, patch: NewsroomPushAlertPatch): Promise<void>;
  approveAlert(alertId: string): Promise<void>;
  prepareAlert(alertId: string): Promise<NewsroomPushAlertPrepareResult>;
  getDispatch(alertId: string): Promise<NewsroomPushDispatch | null>;
  dispatchAlert(
    alertId: string,
    idempotencyKey?: string
  ): Promise<NewsroomPushDispatchResult>;
}

export interface NewsroomWhatsAppService {
  listBroadcasts(options?: {
    status?: NewsroomWhatsAppBroadcastStatus | null;
    broadcastType?: NewsroomWhatsAppBroadcastType | null;
    search?: string | null;
    limit?: number;
  }): Promise<NewsroomWhatsAppBroadcast[]>;
  createBroadcast(input: NewsroomWhatsAppBroadcastCreateInput): Promise<string>;
  approveBroadcast(broadcastId: string): Promise<void>;
  rejectBroadcast(broadcastId: string, reason?: string): Promise<void>;
  getDispatch(broadcastId: string): Promise<NewsroomWhatsAppDispatch | null>;
  dispatchBroadcast(
    broadcastId: string,
    idempotencyKey?: string
  ): Promise<NewsroomWhatsAppDispatchResult>;
}

export interface NewsroomIntelligenceService {
  getEditorialIntelligence(): Promise<NewsroomEditorialIntelligence>;
  getGrowthIntelligence(): Promise<NewsroomGrowthIntelligence>;
  getAudienceIntelligence(): Promise<NewsroomAudienceIntelligence>;
}

export interface NewsroomStaffService {
  getStaffOperationsDirectory(): Promise<NewsroomStaffOperationsDirectory>;
  changeStaffRole(staffId: string, roleName: string): Promise<void>;
  updateStaffStatus(
    staffId: string,
    status: "active" | "suspended" | "revoked" | "deactivated"
  ): Promise<void>;
  revokeStaffSession(
    staffId: string,
    providerSessionId?: string | null
  ): Promise<number>;
  createInvitation(
    input: NewsroomStaffInviteInput
  ): Promise<{ id: string; email: string; displayName: string; role: string }>;
  cancelInvitation(invitationId: string): Promise<void>;
}

export interface NewsroomCommercialService {
  getAdvertisingOverview(): Promise<NewsroomAdvertisingOverview>;
  createAdvertiser(name: string, contactNotes?: string | null): Promise<string>;
  createCampaign(input: NewsroomCreateCampaignInput): Promise<string>;
  createCreative(input: NewsroomCreateCreativeInput): Promise<string>;
  approveCampaign(campaignId: string, approved: boolean): Promise<string>;
  updateCampaignStatus(campaignId: string, status: string): Promise<string>;

  getSubscribersDirectory(options?: {
    status?: string | null;
    search?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<NewsroomSubscribersDirectory>;
  updateSubscriberStatus(subscriberId: string, status: string): Promise<string>;
  grantSubscriberEntitlement(
    subscriberId: string,
    policyKey?: string,
    durationDays?: number,
    provider?: string
  ): Promise<string>;

  getPremiumOperationsOverview(): Promise<NewsroomPremiumOperationsOverview>;
  setStoryAccess(storyId: string, accessPolicy: "public" | "premium"): Promise<string>;
}

export interface NewsroomAiService {
  getOverview(): Promise<NewsroomAiAssistOverview>;
  runAssist(input: NewsroomRunAiAssistInput): Promise<NewsroomAiAssistSession>;
  getCitationsDirectory(options?: {
    status?: string | null;
    search?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<NewsroomCitationsDirectory>;
  recordCitation(input: NewsroomRecordCitationInput): Promise<{ citationId: string; status: string }>;
  updateCitationStatus(citationId: string, status: string): Promise<{ citationId: string; status: string }>;
}

export interface HealthTimesServices {
  articles: ArticleRepository;
  presentation: PresentationRepository;
  search: SearchService;
  auth: AuthService;
  authorization: AuthorizationService;
  deviceSecurity: DeviceSecurityService;
  reader: ReaderRepository;
  premium: PremiumService;
  premiumStore: PremiumStoreService;
  premiumCommerce: PremiumCommerceService;
  advertising: AdvertisingService;
  analytics: AnalyticsService;
  live: LiveService;
  video: VideoService;
  audio: AudioService;
  notifications: NotificationService;
  readerDiscussion: ReaderDiscussionService;
  newsroomCommunication: NewsroomCommunicationService;
  commentModeration: CommentModerationService;
  newsroomStories: NewsroomStoryService;
  newsroomMedia: NewsroomMediaService;
  newsroomVideo: NewsroomVideoService;
  newsroomLive: NewsroomLiveCoverageService;
  newsroomSocial: NewsroomSocialService;
  newsroomCampaigns: NewsroomCampaignService;
  newsroomPushAlerts: NewsroomPushAlertService;
  newsroomWhatsApp: NewsroomWhatsAppService;
  newsroomIntelligence: NewsroomIntelligenceService;
  newsroomStaff: NewsroomStaffService;
  newsroomCommercial: NewsroomCommercialService;
  newsroomAi: NewsroomAiService;
  taxonomy: TaxonomyService;
  publication: PublicationRepository;
  platform: PlatformService;
  social: SocialAttributionService;
}

