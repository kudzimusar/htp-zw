import type { CommercialSourceContext, ContentIntegrityState, GeographyRef, PremiumSourceContext, SourceProvenance } from "./source";

export type AppearancePreference = "light" | "dark" | "system";
export type AccessPolicy = "public" | "premium";
export type StoryStatus = "draft" | "scheduled" | "published" | "archived";

export type AuthorRef = {
  id: string;
  displayName: string;
  slug: string;
  sourceProvenance?: SourceProvenance | null;
};

export type AuthorProfile = AuthorRef & {
  role: string | null;
  bio: string | null;
  sourceUrl: string | null;
};

export type PublicationLink = {
  key: string;
  label: string;
  url: string;
  kind: "product" | "social" | "contact";
};

export type PublicationProfile = {
  name: string;
  description: string;
  publisher: string;
  location: string;
  editorialEmail: string;
  aboutUrl: string;
  contactUrl: string;
  editorialPrinciples: string[];
  sourceLinks?: PublicationLink[];
  sourceVerifiedAt: string;
};

export type MediaRef = {
  id: string;
  publicUrl: string | null;
  altText: string | null;
  caption: string | null;
  credit: string | null;
  sourceProvenance?: SourceProvenance | null;
};

export type TaxonomyRef = {
  id: string;
  name: string;
  slug: string;
};

export type ArticleSummary = {
  id: string;
  /**
   * Canonical public.stories.id. Temporary WordPress/source-parity and fixture
   * identities must leave this null so permanent discussion cannot attach to them.
   */
  canonicalStoryId: string | null;
  title: string;
  slug: string;
  standfirst: string | null;
  excerpt: string | null;
  accessPolicy: AccessPolicy;
  status: StoryStatus;
  publishedAt: string | null;
  modifiedAt: string | null;
  author: AuthorRef | null;
  primarySection: TaxonomyRef | null;
  geography: TaxonomyRef[];
  geographyRefs?: GeographyRef[];
  topics: TaxonomyRef[];
  legacyTaxonomy?: TaxonomyRef[];
  heroMedia: MediaRef | null;
  sourceProvenance?: SourceProvenance | null;
  contentIntegrity?: ContentIntegrityState;
  premiumSourceContext?: PremiumSourceContext;
};

export type ArticleDetail = ArticleSummary & {
  bodyHtml: string | null;
  /**
   * Exactly one explicitly public editorial paragraph from otherwise protected
   * Premium content. This is not a bodyHtml/excerpt/standfirst alias.
   */
  premiumTeaserHtml?: string | null;
  canonicalUrl: string | null;
};

export type PremiumPreviewWindow = {
  scopeId: string;
  storyId: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
};

export type LiveItem = {
  id: string;
  title: string;
  kind: "live-blog" | "live-video" | "scheduled";
  status: "live" | "upcoming" | "ended";
  updatedAt: string;
  updateCount?: number;
  media: MediaRef | null;
  sourceProvenance?: SourceProvenance | null;
};

export type VideoItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnail: MediaRef | null;
  sourceUrl?: string | null;
  relatedArticleId?: string | null;
  sourceProvenance?: SourceProvenance | null;
};

export type AudioItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  publishedAt: string | null;
};

export type EditionPreference = {
  primaryEdition: string;
  followedCountries: string[];
  followedTopics: string[];
};

export type ReaderProfile = {
  id: string;
  displayName: string;
  membership: "anonymous" | "registered" | "premium";
};

export type SearchQuery = {
  text: string;
  country?: string;
  topic?: string;
  format?: "article" | "video" | "audio" | "live";
};

export type SearchResult = {
  articles: ArticleSummary[];
  authors: AuthorProfile[];
  videos: VideoItem[];
  audio: AudioItem[];
  live: LiveItem[];
};

export type AdPlacementKey =
  | "home_top"
  | "hospaz-header-direct"
  | "home_after_live"
  | "home_feed_1"
  | "home_feed_2"
  | "home_watch"
  | "home_deep_feed"
  | "article_after_intro"
  | "article_end"
  | "watch_feed"
  | "live_feed";

export type AdRequestContext = {
  consentForPersonalizedAds: boolean;
  sensitiveHealthContext: boolean;
  pagePath?: string;
  storyId?: string;
};

export type AdDecision = {
  placementKey: AdPlacementKey;
  source: "direct" | "adsense" | "house" | "none";
  personalization: "personalized" | "non-personalized" | "contextual" | "none";
  disclosureLabel: string;
  policyReason?: string;
  creativeUrl?: string;
  destinationUrl?: string;
  commercialSourceContext?: CommercialSourceContext;
};

export type AnalyticsEventName =
  | "page_view"
  | "article_view"
  | "article_25_percent"
  | "article_50_percent"
  | "article_75_percent"
  | "article_complete"
  | "listen_started"
  | "listen_completed"
  | "story_saved"
  | "story_shared"
  | "whatsapp_share"
  | "search_performed"
  | "topic_followed"
  | "citation_copied"
  | "reference_opened"
  | "premium_preview_started"
  | "premium_warning_shown"
  | "premium_locked"
  | "subscription_started"
  | "subscription_completed"
  | "newsletter_signup"
  | "push_opt_in"
  | "ad_impression"
  | "ad_click";

export type AnalyticsEvent = {
  eventName: AnalyticsEventName;
  eventVersion: "2026-09-09";
  storyId?: string;
  pagePath?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  parameters?: Record<string, string | number | boolean | null>;
};

export type PremiumOffer = {
  productKey: "monthly" | "yearly";
  storeProductId: string;
  displayPrice: string;
  periodLabel: string;
};

export type PremiumStoreState = {
  status: "configuration-required" | "available" | "unavailable";
  offers: PremiumOffer[];
  message: string;
};

export type PremiumRestoreResult = {
  restored: boolean;
  reason: "restored" | "nothing-to-restore" | "configuration-required" | "unavailable";
};

export type PremiumCommerceStatus =
  | "configuration-required"
  | "available"
  | "unavailable"
  | "error";

export type PremiumCommerceAuthority = {
  channel: "web-server" | "native-store";
  status: PremiumCommerceStatus;
  provider: string | null;
  price: string | null;
  currency: string | null;
  billingInterval: string | null;
  productPlanId: string | null;
  checkoutUrl: string | null;
  entitlementGranted: false;
  message: string;
};

export type PremiumCheckoutResult = {
  status: "redirect-required" | "configuration-required" | "unavailable" | "error";
  checkoutUrl: string | null;
  entitlementGranted: false;
  message: string;
};

export type NotificationItem = {
  id: string;
  category: "breaking" | "live" | "topic" | "premium" | "system";
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  destination?: string;
};

export type AuthActionResult = {
  status: "success" | "verification-required" | "blocked" | "error";
  message: string;
};

export type AccountDeletionState = {
  status: "server-required" | "requested" | "unavailable";
  message: string;
};

export type CurrentDeviceSession = {
  authenticated: boolean;
  userId: string | null;
  expiresAt: number | null;
  remoteSessionManagementAvailable: boolean;
};

export type AuthSessionState = {
  authenticated: boolean;
  userId: string | null;
  expiresAt: number | null;
};

export type PlatformConnectivityCheck = {
  key: "configuration" | "auth" | "database" | "storage" | "session";
  label: string;
  status: "pass" | "fail";
  detail: string;
};

export type PlatformConnectivityReport = {
  status: "healthy" | "degraded" | "misconfigured";
  checkedAt: string;
  projectRef: string | null;
  checks: PlatformConnectivityCheck[];
};

export type StudioModule =
  | "stories"
  | "create-edit"
  | "live-desk"
  | "video-desk"
  | "media"
  | "advertising"
  | "premium"
  | "social"
  | "audience"
  | "search-growth"
  | "analytics"
  | "subscribers"
  | "authors"
  | "staff-roles"
  | "settings";


export type ReaderCommentEligibility = {
  status: "blocked" | "pre_moderated" | "allowed";
  reason: string;
  profileId: string | null;
  publishedCommentCount: number;
};

export type ReaderStoryComment = {
  id: string;
  storyId: string;
  parentCommentId: string | null;
  displayName: string;
  body: string;
  publishedAt: string | null;
  edited: boolean;
};

export type ReaderCommentActionResult = {
  status: "success" | "blocked" | "error";
  message: string;
  id?: string | null;
};

export type NewsroomInboxItem = {
  id: string;
  eventType: string;
  targetTable: string | null;
  targetId: string | null;
  category: "general" | "mention" | "assignment" | "review" | "urgent" | "announcement" | "newsletter" | "moderation";
  priority: "normal" | "high" | "urgent";
  payload: Record<string, unknown>;
  readAt: string | null;
  requiresAck: boolean;
  acknowledgedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type NewsroomInboxSummary = {
  unreadTotal: number;
  mentions: number;
  assignments: number;
  reviews: number;
  urgent: number;
  announcements: number;
  newsletter: number;
  moderation: number;
  unacknowledged: number;
};


export type NewsroomInternalComment = {
  id: string;
  storyId: string;
  authorStaffId: string;
  body: string;
  parentCommentId: string | null;
  createdAt: string;
  editedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type NewsroomDesk = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
};

export type NewsroomThread = {
  id: string;
  threadType: "assignment" | "desk" | "breaking" | "general";
  title: string;
  assignmentId: string | null;
  deskId: string | null;
  priority: "normal" | "high" | "urgent";
  status: "open" | "closed" | "archived";
  expiresAt: string | null;
  updatedAt: string;
};

export type NewsroomMessage = {
  id: string;
  threadId: string;
  authorStaffId: string;
  parentMessageId: string | null;
  body: string;
  createdAt: string;
};

export type NewsroomAnnouncement = {
  id: string;
  title: string;
  body: string;
  audienceScope: "all_staff" | "desk";
  deskId: string | null;
  priority: "normal" | "high" | "urgent";
  requiresAck: boolean;
  publishedAt: string;
  expiresAt: string | null;
};

export type ReaderCommentModerationItem = {
  id: string;
  storyId: string;
  authorProfileId: string;
  parentCommentId: string | null;
  body: string;
  state: "PENDING" | "PUBLISHED" | "HELD" | "REJECTED" | "HIDDEN" | "REMOVED";
  riskFlags: string[];
  createdAt: string;
  editedAt: string | null;
  publishedAt: string | null;
};


export type NewsroomAssignment = {
  id: string;
  storyId: string | null;
  title: string;
  reporterStaffId: string;
  assignedEditorStaffId: string | null;
  desk: string | null;
  deadlineAt: string | null;
  priority: string;
  notes: string | null;
  status: string;
  assignedBy: string;
  updatedAt: string;
};

export type NewsroomStory = {
  id: string;
  title: string;
  slug: string;
  standfirst: string | null;
  excerpt: string | null;
  bodyHtml: string | null;
  bodyJson: Record<string, unknown> | null;
  status: string;
  workflowStatus: string | null;
  accessPolicy: "public" | "premium" | string;
  authorId: string | null;
  primarySectionId: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ownerStaffId: string | null;
  assignedEditorStaffId: string | null;
  factCheckerStaffId: string | null;
  healthReviewerStaffId: string | null;
  copyEditorStaffId: string | null;
  desk: string | null;
  topic: string | null;
  country: string | null;
  region: string | null;
  sourceNotes: string | null;
  internalNotes: string | null;
  deadlineAt: string | null;
  distribution: { public_reader?: boolean; [key: string]: unknown };
  adSetting: string;
  commentPolicy: "disabled" | "read_only" | "open" | string;
  lockVersion: number;
  lastSavedBy: string | null;
  createdAt: string;
  updatedAt: string;
  modifiedAt: string | null;
};

export type NewsroomPublicAuthor = {
  id: string;
  displayName: string;
  slug: string;
  bio: string | null;
  provenance?: string;
  wordpressSourceId?: string;
};

export type NewsroomSection = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  provenance?: string;
  wordpressSourceId?: string;
};

export type NewsroomStoryRevision = {
  id: string;
  storyId: string;
  revisionNumber: number;
  title: string | null;
  bodyHtml: string | null;
  bodyJson?: Record<string, unknown> | null;
  changeSummary: string | null;
  editorId: string | null;
  createdAt: string;
};

export type NewsroomStoryAutosave = {
  storyId: string;
  title: string | null;
  standfirst: string | null;
  bodyHtml: string | null;
  lockVersion: number;
  savedBy: string;
  savedAt: string;
};

export type NewsroomStoryReview = {
  id: string;
  storyId: string;
  reviewType: string;
  status: string;
  notes: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  completedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt?: string;
};

export type NewsroomStoryCorrection = {
  id: string;
  storyId: string;
  reason: string;
  changedBy: string;
  changedAt: string;
  previousRevisionId: string | null;
  newRevisionId: string | null;
};

export type CreateStoryInput = {
  title: string;
  slug?: string | null;
  standfirst?: string | null;
  body?: string | null;
  bodyHtml?: string | null;
  body_html?: string | null;
  desk?: string | null;
  topic?: string | null;
  country?: string | null;
  region?: string | null;
  sources?: string | null;
  sourceNotes?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  deadline_at?: string | null;
  deadlineAt?: string | null;
  seo_title?: string | null;
  seoTitle?: string | null;
  seo_description?: string | null;
  seoDescription?: string | null;
  author_id?: string | null;
  authorId?: string | null;
  primary_section_id?: string | null;
  primarySectionId?: string | null;
};

export type SaveStoryPatch = {
  title?: string;
  slug?: string;
  standfirst?: string | null;
  body?: string | null;
  bodyHtml?: string | null;
  body_html?: string | null;
  sources?: string | null;
  sourceNotes?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  owner_staff_id?: string | null;
  ownerStaffId?: string | null;
  assigned_editor_staff_id?: string | null;
  assignedEditorStaffId?: string | null;
  fact_checker_staff_id?: string | null;
  factCheckerStaffId?: string | null;
  author_id?: string | null;
  authorId?: string | null;
  primary_section_id?: string | null;
  primarySectionId?: string | null;
  desk?: string | null;
  topic?: string | null;
  country?: string | null;
  region?: string | null;
  access_policy?: "public" | "premium" | string;
  accessPolicy?: "public" | "premium" | string;
  deadline_at?: string | null;
  deadlineAt?: string | null;
  seo_title?: string | null;
  seoTitle?: string | null;
  seo_description?: string | null;
  seoDescription?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  distribution?: Record<string, unknown>;
  ad_setting?: string;
  adSetting?: string;
};

export type CreateAssignmentInput = {
  title: string;
  reporterStaffId: string;
  assignedEditorStaffId?: string | null;
  desk?: string | null;
  deadlineAt?: string | null;
  priority?: string;
  notes?: string | null;
  storyId?: string | null;
};

export type NewsroomPlanningStaff = {
  id: string;
  displayName: string;
  email: string | null;
  desk: string | null;
  status: string;
  revokedAt: string | null;
};

export const ASSIGNMENT_STATUS_SEQUENCE = [
  "Assigned",
  "Accepted",
  "Reporting",
  "Drafting",
  "Submitted",
  "Complete"
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS_SEQUENCE)[number];

export function getNextAssignmentStatus(currentStatus: string): AssignmentStatus | null {
  switch (currentStatus) {
    case "Assigned":
      return "Accepted";
    case "Accepted":
      return "Reporting";
    case "Reporting":
      return "Drafting";
    case "Drafting":
      return "Submitted";
    case "Submitted":
      return "Complete";
    default:
      return null;
  }
}

export function getAssignmentProgressActionLabel(currentStatus: string): string | null {
  switch (currentStatus) {
    case "Assigned":
      return "Accept Assignment";
    case "Accepted":
      return "Start Reporting";
    case "Reporting":
      return "Start Drafting";
    case "Drafting":
      return "Submit Assignment";
    case "Submitted":
      return "Mark Complete";
    default:
      return null;
  }
}

export type NewsroomCalendarEventKind =
  | "story_deadline"
  | "scheduled_publication"
  | "assignment_deadline";

export type NewsroomCalendarSourceType = "story" | "assignment";

export type NewsroomCalendarUrgency =
  | "overdue"
  | "today"
  | "tomorrow"
  | "upcoming"
  | "completed"
  | "past_scheduled";

export type NewsroomCalendarHorizonBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "next_7_days"
  | "later"
  | "past";

export type NewsroomCalendarItem = {
  id: string;
  sourceType: NewsroomCalendarSourceType;
  sourceId: string;
  title: string;
  timestamp: string;
  timestampMs: number;
  eventKind: NewsroomCalendarEventKind;
  desk: string | null;
  workflowOrStatus: string;
  accessPolicy: "public" | "premium" | string | null;
  priority: string | null;
  urgency: NewsroomCalendarUrgency;
  horizonBucket: NewsroomCalendarHorizonBucket;
  isOverdue: boolean;
  isTerminal: boolean;
  storyId: string | null;
  assignmentId: string | null;
};

