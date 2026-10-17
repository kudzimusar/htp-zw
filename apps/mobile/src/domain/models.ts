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
  summary?: string | null;
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

// ============================================================================
// HT-NR-04A: HOMEPAGE CURATION CONTROL-PLANE DOMAIN MODELS
// ============================================================================

export const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const HOMEPAGE_SECTION_KEYS = [
  "hero",
  "top-stories",
  "latest",
  "features",
  "public-health",
  "research",
  "health-business",
  "hiv-aids",
  "global-health",
  "watch",
  "premium",
  "opportunities",
  "edition",
  "further-coverage"
] as const;

export type HomepageSectionKey = typeof HOMEPAGE_SECTION_KEYS[number];

export const CURATED_HOMEPAGE_SECTIONS = [
  "hero",
  "top-stories",
  "features",
  "public-health",
  "research",
  "health-business",
  "hiv-aids",
  "global-health",
  "premium",
  "further-coverage"
] as const;

export type CuratedHomepageSectionKey =
  typeof CURATED_HOMEPAGE_SECTIONS[number];

export const UNCURATED_HOMEPAGE_SECTIONS = [
  "latest",
  "watch",
  "opportunities",
  "edition"
] as const;

export type UncuratedHomepageSectionKey =
  typeof UNCURATED_HOMEPAGE_SECTIONS[number];

export type HomepagePlacement = {
  section: CuratedHomepageSectionKey;
  rank: number;
  active: boolean;
};

export function isStoryPublishable(story: {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  workflowStatus?: string | null;
  status?: string | null;
  accessPolicy?: string | null;
}): boolean {
  if (!story || typeof story !== "object") return false;
  if (!story.id || !CANONICAL_UUID_PATTERN.test(story.id)) return false;
  if (!story.title || !story.title.trim()) return false;
  if (!story.slug || !story.slug.trim()) return false;
  const policy = (story.accessPolicy || "").toLowerCase();
  if (policy !== "public" && policy !== "premium") return false;
  const ws = (story.workflowStatus || "").toLowerCase();
  const st = (story.status || "").toLowerCase();
  if (ws === "archived" || st === "archived") return false;
  return true;
}

export function parseHomepagePlacement(
  input: unknown
): HomepagePlacement | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  const section = raw.section;
  if (
    typeof section !== "string" ||
    !CURATED_HOMEPAGE_SECTIONS.includes(section as CuratedHomepageSectionKey)
  ) {
    return null;
  }
  const rank = raw.rank;
  if (
    typeof rank !== "number" ||
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > 6
  ) {
    return null;
  }
  if (section === "hero" && rank !== 1) {
    return null;
  }
  const active = raw.active;
  if (typeof active !== "boolean") {
    return null;
  }
  return {
    section: section as CuratedHomepageSectionKey,
    rank,
    active
  };
}

export function mergeHomepageDistribution(
  currentDistribution: Record<string, unknown> | null | undefined,
  homepagePlacement: HomepagePlacement | null
): Record<string, unknown> {
  const next = { ...(currentDistribution || {}) };
  if (!homepagePlacement) {
    delete next.homepage;
  } else {
    next.homepage = homepagePlacement;
  }
  return next;
}

export type HomepageCurationState = {
  hero: NewsroomStory | null;
  topStories: NewsroomStory[];
  sections: Record<CuratedHomepageSectionKey, NewsroomStory[]>;
};

export function deriveHomepageCurationState(
  stories: NewsroomStory[]
): HomepageCurationState {
  const initialSections: Record<CuratedHomepageSectionKey, NewsroomStory[]> = {
    hero: [],
    "top-stories": [],
    features: [],
    "public-health": [],
    research: [],
    "health-business": [],
    "hiv-aids": [],
    "global-health": [],
    premium: [],
    "further-coverage": []
  };

  const eligibleStories = (Array.isArray(stories) ? stories : []).filter(isStoryPublishable);

  const heroCandidates: NewsroomStory[] = [];
  const topStoryCandidates: NewsroomStory[] = [];
  const sectionCandidates: Record<string, NewsroomStory[]> = {};

  for (const story of eligibleStories) {
    const placement = parseHomepagePlacement(story.distribution?.homepage);
    if (!placement || !placement.active) continue;

    if (placement.section === "hero") {
      heroCandidates.push(story);
    } else if (placement.section === "top-stories") {
      topStoryCandidates.push(story);
    } else if (placement.section in initialSections) {
      const currentList = sectionCandidates[placement.section] ?? [];
      currentList.push(story);
      sectionCandidates[placement.section] = currentList;
    }
  }

  // Resolve Hero: lowest rank (all 1), newest modification timestamp, stable UUID order
  let hero: NewsroomStory | null = null;
  if (heroCandidates.length > 0) {
    heroCandidates.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.modifiedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.modifiedAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return a.id.localeCompare(b.id);
    });
    hero = heroCandidates[0] ?? null;
  }

  // Resolve Top Stories: unique ranks 1..6, max 6
  const topByRank = new Map<number, NewsroomStory>();
  for (const story of topStoryCandidates) {
    const placement = parseHomepagePlacement(story.distribution?.homepage)!;
    const existing = topByRank.get(placement.rank);
    if (!existing) {
      topByRank.set(placement.rank, story);
    } else {
      const timeExisting = new Date(
        existing.updatedAt || existing.modifiedAt || 0
      ).getTime();
      const timeStory = new Date(
        story.updatedAt || story.modifiedAt || 0
      ).getTime();
      if (
        timeStory > timeExisting ||
        (timeStory === timeExisting && story.id < existing.id)
      ) {
        topByRank.set(placement.rank, story);
      }
    }
  }
  const topStories = Array.from(topByRank.entries())
    .sort(([rankA], [rankB]) => rankA - rankB)
    .map(([, story]) => story)
    .slice(0, 6);

  // Resolve Curated Sections
  const sections = { ...initialSections };
  sections.hero = hero ? [hero] : [];
  sections["top-stories"] = topStories;

  for (const sectionKey of CURATED_HOMEPAGE_SECTIONS) {
    if (sectionKey === "hero" || sectionKey === "top-stories") continue;
    const list = sectionCandidates[sectionKey] || [];
    const byRank = new Map<number, NewsroomStory>();
    for (const story of list) {
      const placement = parseHomepagePlacement(story.distribution?.homepage)!;
      const existing = byRank.get(placement.rank);
      if (!existing) {
        byRank.set(placement.rank, story);
      } else {
        const timeExisting = new Date(
          existing.updatedAt || existing.modifiedAt || 0
        ).getTime();
        const timeStory = new Date(
          story.updatedAt || story.modifiedAt || 0
        ).getTime();
        if (
          timeStory > timeExisting ||
          (timeStory === timeExisting && story.id < existing.id)
        ) {
          byRank.set(placement.rank, story);
        }
      }
    }
    sections[sectionKey] = Array.from(byRank.entries())
      .sort(([rankA], [rankB]) => rankA - rankB)
      .map(([, story]) => story)
      .slice(0, 6);
  }

  return {
    hero,
    topStories,
    sections
  };
}

export function validateEditionSlug(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.length > 64) return null;
  if (normalized === "global") return null;
  if (!/^[a-z0-9-]+$/.test(normalized)) return null;
  return normalized;
}

export function parseHomepageEditionPlacement(
  input: unknown
): HomepagePlacement | null {
  return parseHomepagePlacement(input);
}

export function mergeHomepageEditionDistribution(
  currentDistribution: Record<string, unknown> | null | undefined,
  editionSlug: string,
  placement: HomepagePlacement | null
): Record<string, unknown> {
  const validSlug = validateEditionSlug(editionSlug);
  const next = { ...(currentDistribution || {}) };
  if (!validSlug) {
    return next;
  }

  const existingEditions =
    next.homepage_editions &&
    typeof next.homepage_editions === "object" &&
    !Array.isArray(next.homepage_editions)
      ? { ...(next.homepage_editions as Record<string, unknown>) }
      : {};

  if (!placement) {
    delete existingEditions[validSlug];
  } else {
    existingEditions[validSlug] = {
      section: placement.section,
      rank: placement.rank,
      active: placement.active
    };
  }

  if (Object.keys(existingEditions).length > 0) {
    next.homepage_editions = existingEditions;
  } else {
    delete next.homepage_editions;
  }

  return next;
}

export type EditionHomepageCurationState = HomepageCurationState & {
  editionSlug: string;
  isSlotInherited: (section: CuratedHomepageSectionKey, rank?: number) => boolean;
  hasEditionOverride: (section: CuratedHomepageSectionKey, rank?: number) => boolean;
  editionOverridesCount: number;
};

export function deriveEditionHomepageCurationState(
  stories: NewsroomStory[],
  editionSlug: string
): EditionHomepageCurationState {
  const globalState = deriveHomepageCurationState(stories);
  const validSlug = validateEditionSlug(editionSlug);

  if (!validSlug) {
    return {
      ...globalState,
      editionSlug: "",
      isSlotInherited: () => false,
      hasEditionOverride: () => false,
      editionOverridesCount: 0
    };
  }

  const eligibleStories = (Array.isArray(stories) ? stories : []).filter(isStoryPublishable);

  // Collect edition-specific placements
  const editionHeroCandidates: NewsroomStory[] = [];
  const editionTopStoryCandidates: NewsroomStory[] = [];
  const editionSectionCandidates: Record<string, NewsroomStory[]> = {};

  for (const story of eligibleStories) {
    const rawEditions = story.distribution?.homepage_editions;
    if (!rawEditions || typeof rawEditions !== "object" || Array.isArray(rawEditions)) continue;
    const rawPlacement = (rawEditions as Record<string, unknown>)[validSlug];
    const placement = parseHomepagePlacement(rawPlacement);
    if (!placement || !placement.active) continue;

    if (placement.section === "hero") {
      editionHeroCandidates.push(story);
    } else if (placement.section === "top-stories") {
      editionTopStoryCandidates.push(story);
    } else if (CURATED_HOMEPAGE_SECTIONS.includes(placement.section)) {
      const list = editionSectionCandidates[placement.section] ?? [];
      list.push(story);
      editionSectionCandidates[placement.section] = list;
    }
  }

  const overridesMap = new Set<string>(); // section:rank

  // Resolve Hero
  let hero: NewsroomStory | null = null;
  if (editionHeroCandidates.length > 0) {
    editionHeroCandidates.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.modifiedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.modifiedAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return a.id.localeCompare(b.id);
    });
    hero = editionHeroCandidates[0] ?? null;
    overridesMap.add("hero:1");
  } else {
    hero = globalState.hero;
  }

  // Resolve Top Stories (ranks 1..6)
  const editionTopByRank = new Map<number, NewsroomStory>();
  for (const story of editionTopStoryCandidates) {
    const rawEditions = story.distribution?.homepage_editions as Record<string, unknown>;
    const placement = parseHomepagePlacement(rawEditions[validSlug])!;
    const existing = editionTopByRank.get(placement.rank);
    if (!existing) {
      editionTopByRank.set(placement.rank, story);
    } else {
      const timeExisting = new Date(existing.updatedAt || existing.modifiedAt || 0).getTime();
      const timeStory = new Date(story.updatedAt || story.modifiedAt || 0).getTime();
      if (timeStory > timeExisting || (timeStory === timeExisting && story.id < existing.id)) {
        editionTopByRank.set(placement.rank, story);
      }
    }
  }

  // Combine edition Top Stories with Global inheritance by rank
  const finalTopByRank = new Map<number, NewsroomStory>();
  for (let rank = 1; rank <= 6; rank++) {
    if (editionTopByRank.has(rank)) {
      finalTopByRank.set(rank, editionTopByRank.get(rank)!);
      overridesMap.add(`top-stories:${rank}`);
    } else {
      const globalStory = globalState.topStories.find((s) => {
        const p = parseHomepagePlacement(s.distribution?.homepage);
        return p?.rank === rank;
      });
      if (globalStory) {
        finalTopByRank.set(rank, globalStory);
      }
    }
  }

  const topStories = Array.from(finalTopByRank.entries())
    .sort(([rankA], [rankB]) => rankA - rankB)
    .map(([, story]) => story);

  // Resolve Curated Thematic Sections
  const sections: Record<CuratedHomepageSectionKey, NewsroomStory[]> = {
    ...globalState.sections,
    hero: hero ? [hero] : [],
    "top-stories": topStories
  };

  for (const sectionKey of CURATED_HOMEPAGE_SECTIONS) {
    if (sectionKey === "hero" || sectionKey === "top-stories") continue;
    const list = editionSectionCandidates[sectionKey] || [];
    const editionSectionByRank = new Map<number, NewsroomStory>();
    for (const story of list) {
      const rawEditions = story.distribution?.homepage_editions as Record<string, unknown>;
      const placement = parseHomepagePlacement(rawEditions[validSlug])!;
      const existing = editionSectionByRank.get(placement.rank);
      if (!existing) {
        editionSectionByRank.set(placement.rank, story);
      } else {
        const timeExisting = new Date(existing.updatedAt || existing.modifiedAt || 0).getTime();
        const timeStory = new Date(story.updatedAt || story.modifiedAt || 0).getTime();
        if (timeStory > timeExisting || (timeStory === timeExisting && story.id < existing.id)) {
          editionSectionByRank.set(placement.rank, story);
        }
      }
    }

    const finalSectionByRank = new Map<number, NewsroomStory>();
    for (let rank = 1; rank <= 6; rank++) {
      if (editionSectionByRank.has(rank)) {
        finalSectionByRank.set(rank, editionSectionByRank.get(rank)!);
        overridesMap.add(`${sectionKey}:${rank}`);
      } else {
        const globalStory = (globalState.sections[sectionKey] || []).find((s) => {
          const p = parseHomepagePlacement(s.distribution?.homepage);
          return p?.rank === rank;
        });
        if (globalStory) {
          finalSectionByRank.set(rank, globalStory);
        }
      }
    }

    sections[sectionKey] = Array.from(finalSectionByRank.entries())
      .sort(([rankA], [rankB]) => rankA - rankB)
      .map(([, story]) => story);
  }

  const hasEditionOverride = (section: CuratedHomepageSectionKey, rank = 1): boolean => {
    return overridesMap.has(`${section}:${rank}`);
  };

  const isSlotInherited = (section: CuratedHomepageSectionKey, rank = 1): boolean => {
    if (section === "hero") {
      return Boolean(hero && !hasEditionOverride("hero", 1));
    }
    if (section === "top-stories") {
      const storyInSlot = finalTopByRank.get(rank);
      return Boolean(storyInSlot && !hasEditionOverride("top-stories", rank));
    }
    const sectionStories = sections[section] || [];
    const storyInSlot = sectionStories.find((s) => {
      const p = parseHomepagePlacement(s.distribution?.homepage);
      return p?.rank === rank;
    });
    return Boolean(storyInSlot && !hasEditionOverride(section, rank));
  };

  return {
    hero,
    topStories,
    sections,
    editionSlug: validSlug,
    isSlotInherited,
    hasEditionOverride,
    editionOverridesCount: overridesMap.size
  };
}

export type PublicHomepagePresentationRow = {
  story_id: string;
  slug: string;
  title: string;
  standfirst: string | null;
  excerpt: string | null;
  access_policy: string;
  published_at: string | null;
  modified_at: string | null;
  canonical_url: string | null;
  author_name: string | null;
  author_slug: string | null;
  section_name: string | null;
  section_slug: string | null;
  hero_public_url: string | null;
  hero_alt_text: string | null;
  hero_caption: string | null;
  hero_credit: string | null;
  global_placement: Record<string, unknown> | null;
  edition_placement: Record<string, unknown> | null;
};

export type PublicHomepagePresentation = {
  article: ArticleSummary;
  globalPlacement: HomepagePlacement | null;
  editionPlacement: HomepagePlacement | null;
};

// ---------------------------------------------------------------------------
// HT-NR-05A: Newsroom Media Library & Metadata Operations Models
// ---------------------------------------------------------------------------

export type NewsroomMediaAssetStatus =
  | "pending"
  | "missing_from_uploads_archive"
  | "upload_pending"
  | "private_ready"
  | "public_staged"
  | "published"
  | (string & {});

export type NewsroomMediaAssetTypeGroup =
  | "Images"
  | "Video"
  | "Audio"
  | "Documents"
  | "Other";

export type NewsroomMediaUsage = {
  storyId: string;
  usageType: string;
  sourceContext: Record<string, unknown> | null;
};

export type NewsroomMediaAsset = {
  id: string;
  sourceUrl: string | null;
  storageBucket: string | null;
  storageKey: string | null;
  publicUrl: string | null;
  checksum: string | null;
  mimeType: string;
  filename: string;
  altText: string | null;
  caption: string | null;
  credit: string | null;
  width: number | null;
  height: number | null;
  status: string;
  byteSize: number | null;
  sourceProvenance: string | null;
  uploadedByStaffId: string | null;
  createdAt: string;
  updatedAt: string;
  usage: NewsroomMediaUsage[];
  typeGroup?: NewsroomMediaAssetTypeGroup;
  storageCustodyCategory?: "public" | "migrated" | "private" | "unknown";
};

export type NewsroomMediaPreview = {
  mediaId: string;
  storageBucket: string | null;
  storageKey: string | null;
  mimeType: string;
  filename: string;
  status: string;
  publicUrl: string | null;
};

export type NewsroomMediaMetadataPatch = {
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  sourceProvenance?: string | null;
};

export function classifyMediaMimeType(
  mimeType: string | null | undefined
): NewsroomMediaAssetTypeGroup {
  if (!mimeType) return "Other";
  const lower = mimeType.trim().toLowerCase();
  if (lower.startsWith("image/")) return "Images";
  if (lower.startsWith("video/")) return "Video";
  if (lower.startsWith("audio/")) return "Audio";
  if (
    lower === "application/pdf" ||
    lower.includes("wordprocessingml") ||
    lower.includes("presentationml") ||
    lower.includes("spreadsheetml") ||
    lower.includes("msword") ||
    lower.includes("ms-powerpoint") ||
    lower.includes("ms-excel")
  ) {
    return "Documents";
  }
  return "Other";
}

export function deriveStorageCustodyCategory(
  asset: Pick<NewsroomMediaAsset, "publicUrl" | "storageBucket" | "sourceUrl">
): "public" | "migrated" | "private" | "unknown" {
  if (asset.publicUrl) return "public";
  if (asset.sourceUrl) return "migrated";
  if (asset.storageBucket === "newsroom-public") return "public";
  if (asset.storageBucket === "newsroom-private") return "private";
  return "unknown";
}

export function validateMediaMetadataPatch(
  asset: Pick<NewsroomMediaAsset, "mimeType" | "altText">,
  patch: NewsroomMediaMetadataPatch
): { valid: boolean; error?: string } {
  if (asset.mimeType.toLowerCase().startsWith("image/")) {
    const nextAlt = patch.altText !== undefined ? patch.altText : asset.altText;
    if (!nextAlt || nextAlt.trim().length < 2) {
      return {
        valid: false,
        error: "Image alt text is required for accessibility (minimum 2 characters)."
      };
    }
  }
  return { valid: true };
}

// =========================================================================
// HT-NR-05B: STORY MEDIA INGESTION, ATTACHMENT & PUBLIC STAGING DOMAIN MODELS
// =========================================================================

export type StoryMediaUsageType = "featured" | "inline" | "supporting_document";

export const ALLOWED_STORY_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export type AllowedStoryMediaMimeType = (typeof ALLOWED_STORY_MEDIA_MIME_TYPES)[number];

export const MAX_STORY_MEDIA_BYTES = 15728640; // 15 MB

export interface PrepareStoryMediaPayload {
  filename: string;
  mimeType: string;
  byteSize: number;
  checksum?: string | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  sourceProvenance: string;
  usageType: StoryMediaUsageType;
}

export interface StoryMediaPreparation {
  mediaId: string;
  storyId: string;
  usageType: StoryMediaUsageType;
  storageBucket: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  status: string; // "upload_pending"
}

export interface StoryMediaUploadContext {
  mediaId: string;
  storyId: string;
  storageBucket: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  byteSize: number;
}

export interface StoryMediaPromotionItem {
  mediaId: string;
  usageType: string;
  privateBucket: string;
  privateKey: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  checksum: string | null;
  publicStorageBucket: string | null;
  publicStorageKey: string | null;
  publicUrl: string | null;
  mediaStatus: string;
}

export interface StoryMediaStageResult {
  mediaId: string;
  usageType: string;
  status: string; // "public_staged"
  publicStorageBucket: string;
  publicStorageKey: string;
  publicUrl: string;
  checksum: string;
}

export type StoryMediaOperationState =
  | "idle"
  | "validating"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "staging"
  | "clearing"
  | "success"
  | "error"
  | "reconciliation_required";

export type UploadReconciliationState = {
  stage: "upload_failed" | "finalize_failed";
  mediaId: string;
  storyId: string;
  usageType: StoryMediaUsageType;
  storageBucket: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  checksum: string;
  errorMessage: string;
};

export function isValidSha256Checksum(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{64}$/.test(value.trim());
}

export function validateStoryMediaUpload(
  payload: PrepareStoryMediaPayload,
  bytes?: Uint8Array
): {
  valid: boolean;
  error?: string;
} {
  const filename = (payload.filename || "").trim();
  if (filename.length === 0) {
    return {
      valid: false,
      error: "A valid filename is required."
    };
  }

  const mime = (payload.mimeType || "").trim().toLowerCase();
  if (!ALLOWED_STORY_MEDIA_MIME_TYPES.includes(mime as any)) {
    return {
      valid: false,
      error: `Unsupported media MIME type "${payload.mimeType}". Allowed types: JPEG, PNG, WebP, PDF, Plain Text, DOCX.`
    };
  }

  const resolvedMime = resolveBoundedMimeType(mime, filename);
  if (!resolvedMime || resolvedMime !== mime) {
    return {
      valid: false,
      error: `Filename extension does not match media MIME type "${payload.mimeType}" for "${filename}".`
    };
  }

  if (bytes && !verifyFileContentSignature(bytes, resolvedMime)) {
    return {
      valid: false,
      error: `File content signature verification failed: bytes do not match expected format for ${resolvedMime} ("${filename}").`
    };
  }

  if (typeof payload.byteSize !== "number" || !Number.isFinite(payload.byteSize) || payload.byteSize <= 0) {
    return {
      valid: false,
      error: "File size must be greater than 0 bytes."
    };
  }

  if (payload.byteSize > MAX_STORY_MEDIA_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 15 MB limit (${(payload.byteSize / (1024 * 1024)).toFixed(1)} MB).`
    };
  }

  const usage = payload.usageType;
  if (usage !== "featured" && usage !== "inline" && usage !== "supporting_document") {
    return {
      valid: false,
      error: `Unsupported story media usage role "${usage}". Allowed: featured, inline, supporting_document.`
    };
  }

  const isImage = mime.startsWith("image/");
  if ((usage === "featured" || usage === "inline") && !isImage) {
    return {
      valid: false,
      error: `${usage === "featured" ? "Featured lead media" : "Inline media"} must be an image file (JPEG, PNG, or WebP).`
    };
  }

  if (usage === "supporting_document" && isImage) {
    return {
      valid: false,
      error: "Supporting documents cannot be images (must be PDF, DOCX, or Plain Text)."
    };
  }

  if (isImage) {
    const alt = (payload.altText || "").trim();
    if (alt.length < 2) {
      return {
        valid: false,
        error: "Alt text is required for editorial images (minimum 2 characters)."
      };
    }
  }

  const provenance = (payload.sourceProvenance || "").trim();
  if (provenance.length === 0) {
    return {
      valid: false,
      error: "Source provenance is required for all new Story media uploads."
    };
  }

  if (payload.checksum && !isValidSha256Checksum(payload.checksum)) {
    return {
      valid: false,
      error: "Checksum must be a 64-character lowercase SHA-256 hexadecimal string."
    };
  }

  return { valid: true };
}

export function buildCanonicalPublicStorageKey(
  storyId: string,
  mediaId: string,
  checksum: string,
  filename: string
): string {
  const safeFilename = filename
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `story-media/${storyId.trim()}/${mediaId.trim()}/${checksum.trim().toLowerCase()}/${safeFilename}`;
}

export type StoryMediaSelectedFile = {
  filename: string;
  mimeType: AllowedStoryMediaMimeType;
  byteSize: number;
  bytes: Uint8Array;
  sourceUri?: string;
};

export const BOUNDED_MIME_BY_EXTENSION: Record<string, AllowedStoryMediaMimeType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

export function verifyFileContentSignature(
  bytes: Uint8Array,
  mimeType: AllowedStoryMediaMimeType
): boolean {
  if (!bytes) return false;

  switch (mimeType) {
    case "image/jpeg":
      // Minimum 3 bytes: FF D8 FF
      return (
        bytes.byteLength >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );

    case "image/png":
      // Minimum 8 bytes: 89 50 4E 47 0D 0A 1A 0A
      return (
        bytes.byteLength >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );

    case "image/webp":
      // Minimum 12 bytes: RIFF at 0..3, WEBP at 8..11
      return (
        bytes.byteLength >= 12 &&
        bytes[0] === 0x52 && // 'R'
        bytes[1] === 0x49 && // 'I'
        bytes[2] === 0x46 && // 'F'
        bytes[3] === 0x46 && // 'F'
        bytes[8] === 0x57 && // 'W'
        bytes[9] === 0x45 && // 'E'
        bytes[10] === 0x42 && // 'B'
        bytes[11] === 0x50    // 'P'
      );

    case "application/pdf":
      // Minimum 5 bytes: %PDF-
      return (
        bytes.byteLength >= 5 &&
        bytes[0] === 0x25 && // '%'
        bytes[1] === 0x50 && // 'P'
        bytes[2] === 0x44 && // 'D'
        bytes[3] === 0x46 && // 'F'
        bytes[4] === 0x2d    // '-'
      );

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // ZIP container signature: PK\x03\x04 or standard ZIP variants PK\x05\x06 / PK\x07\x08
      return (
        bytes.byteLength >= 4 &&
        bytes[0] === 0x50 && // 'P'
        bytes[1] === 0x4b && // 'K'
        ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
          (bytes[2] === 0x05 && bytes[3] === 0x06) ||
          (bytes[2] === 0x07 && bytes[3] === 0x08))
      );

    case "text/plain":
      // Plain text: extension/text governed. Valid Uint8Array accepted.
      return true;

    default:
      return false;
  }
}

export function resolveBoundedMimeType(
  rawMimeOrFilename?: string | null,
  filenameOrRawMime?: string | null
): AllowedStoryMediaMimeType | null {
  const p1 = (rawMimeOrFilename || "").trim();
  const p2 = (filenameOrRawMime || "").trim();

  let filename = "";
  let rawMime = "";

  if (p1.includes("/") && !p2.includes("/")) {
    rawMime = p1;
    filename = p2;
  } else if (!p1.includes("/") && p2.includes("/")) {
    filename = p1;
    rawMime = p2;
  } else if (p1.includes(".") && !p2.includes(".")) {
    filename = p1;
    rawMime = p2;
  } else if (!p1.includes(".") && p2.includes(".")) {
    rawMime = p1;
    filename = p2;
  } else if (p1.includes(".") && p2.includes(".")) {
    filename = p1;
    rawMime = p2;
  } else {
    rawMime = p1;
    filename = p2;
  }

  // Filename must be present and contain an extension
  if (!filename || !filename.includes(".")) {
    return null;
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const mappedMime = BOUNDED_MIME_BY_EXTENSION[ext];
  if (!mappedMime) {
    // Unsupported extension -> fail closed
    return null;
  }

  // If picker-provided MIME is present, meaningful and conflicts with canonical extension mapping -> fail closed
  if (rawMime && rawMime.includes("/") && rawMime.toLowerCase() !== "application/octet-stream") {
    if (rawMime.toLowerCase() !== mappedMime) {
      return null;
    }
  }

  return mappedMime;
}

export function validateStoryMediaSelectedFile(file: {
  filename?: string | null;
  mimeType?: string | null;
  bytes: Uint8Array;
}): {
  valid: boolean;
  resolvedMime?: AllowedStoryMediaMimeType;
  error?: string;
} {
  const filename = (file.filename || "").trim();
  if (!filename) {
    return {
      valid: false,
      error: "Filename is required and cannot be empty."
    };
  }

  const resolvedMime = resolveBoundedMimeType(file.mimeType, filename);
  if (!resolvedMime) {
    return {
      valid: false,
      error: `Unsupported file type, missing extension, or MIME/extension mismatch for "${filename}".`
    };
  }

  if (!verifyFileContentSignature(file.bytes, resolvedMime)) {
    return {
      valid: false,
      error: `File content signature verification failed: bytes do not match expected format for ${resolvedMime} ("${filename}").`
    };
  }

  return {
    valid: true,
    resolvedMime
  };
}

export function isMediaAssetAttachable(
  asset: Pick<NewsroomMediaAsset, "storageBucket" | "status" | "mimeType"> | null | undefined,
  usageType?: StoryMediaUsageType
): { eligible: boolean; attachable: boolean; reason?: string } {
  if (!asset) {
    return {
      eligible: false,
      attachable: false,
      reason: "No asset selected."
    };
  }
  if (asset.storageBucket !== "newsroom-private") {
    return {
      eligible: false,
      attachable: false,
      reason: `Asset is in "${asset.storageBucket}" custody. Only "newsroom-private" assets may be attached.`
    };
  }
  if (asset.status !== "private_ready" && asset.status !== "published") {
    let reasonDetail = `Asset status is "${asset.status}". Only "private_ready" or "published" assets may be attached.`;
    if (asset.status === "pending") {
      reasonDetail = "Asset is pending processing.";
    } else if (asset.status === "upload_pending") {
      reasonDetail = "Asset upload has not been finalized.";
    } else if (asset.status === "public_staged") {
      reasonDetail = "Asset is currently staged for public presentation.";
    } else if (asset.status === "missing_from_uploads_archive") {
      reasonDetail = "Asset is missing from storage archive.";
    }
    return {
      eligible: false,
      attachable: false,
      reason: reasonDetail
    };
  }
  if (!ALLOWED_STORY_MEDIA_MIME_TYPES.includes(asset.mimeType as any)) {
    return {
      eligible: false,
      attachable: false,
      reason: `MIME type ${asset.mimeType} is not supported for story attachment.`
    };
  }
  if (usageType) {
    const isImage = (asset.mimeType || "").startsWith("image/");
    if ((usageType === "featured" || usageType === "inline") && !isImage) {
      return {
        eligible: false,
        attachable: false,
        reason: `${usageType === "featured" ? "Featured lead" : "Inline"} media requires an image asset.`
      };
    }
    if (usageType === "supporting_document" && isImage) {
      return {
        eligible: false,
        attachable: false,
        reason: "Supporting documents cannot be image assets."
      };
    }
  }
  return { eligible: true, attachable: true };
}

// ============================================================
// HT-NR-05C-A: Newsroom Video Registry Models & Helpers
// ============================================================

export type NewsroomVideoStatus = "draft" | "ready";

export interface NewsroomVideo {
  id: string;
  title: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  relatedStoryId: string | null;
  sourceProvenance: string;
  status: NewsroomVideoStatus;
  lockVersion: number;
  createdByStaffId: string;
  updatedByStaffId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  watchFeatured: boolean;
  publishedByStaffId?: string | null;
}

export interface NewsroomVideoCreateInput {
  title: string;
  sourceUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  relatedStoryId?: string | null;
  sourceProvenance: string;
}

export interface NewsroomVideoPatch {
  title?: string;
  sourceUrl?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  relatedStoryId?: string | null;
  sourceProvenance?: string;
}

export interface NewsroomVideoListOptions {
  status?: NewsroomVideoStatus;
  search?: string;
  limit?: number;
}

export function validateVideoHttpsUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || /\s/.test(trimmed)) return false;
  if (!/^https:\/\//i.test(trimmed)) return false;

  const rest = trimmed.slice(8);
  if (/^[^/?#]*@/.test(rest)) return false;

  const authorityMatch = rest.match(/^([^/?#]+)/);
  if (!authorityMatch || !authorityMatch[1]) return false;
  const authority = authorityMatch[1];

  // If an explicit port is supplied, it must be an integer in 1..65535
  if (authority.includes(":")) {
    const portMatch = authority.match(/:([0-9]+)$/);
    if (!portMatch || !portMatch[1]) {
      // Malformed port syntax or IPv6
      return false;
    }
    const portStr = portMatch[1];
    if (portStr.length > 5) return false;
    const portNum = Number(portStr);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return false;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol.toLowerCase() !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port) {
      const portNum = Number(parsed.port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        return false;
      }
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    if (host.startsWith("[") || host.endsWith("]") || host.includes(":")) return false;
    if (!host.includes(".")) return false;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function validateVideoCreateInput(input: NewsroomVideoCreateInput): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Video payload is required." };
  }
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: "Video title is required." };
  }
  if (!input.sourceUrl || !validateVideoHttpsUrl(input.sourceUrl)) {
    return { valid: false, error: "A valid absolute HTTPS source URL without credentials is required." };
  }
  if (input.thumbnailUrl && !validateVideoHttpsUrl(input.thumbnailUrl)) {
    return { valid: false, error: "Thumbnail URL must be a valid absolute HTTPS URL without credentials." };
  }
  if (input.durationSeconds !== undefined && input.durationSeconds !== null) {
    if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 0) {
      return { valid: false, error: "Duration must be an integer greater than or equal to 0." };
    }
  }
  if (input.relatedStoryId !== undefined && input.relatedStoryId !== null) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input.relatedStoryId)) {
      return { valid: false, error: "Related story ID must be a valid UUID." };
    }
  }
  if (!input.sourceProvenance || input.sourceProvenance.trim().length === 0) {
    return { valid: false, error: "Source provenance is required and cannot be empty." };
  }
  return { valid: true };
}

export function validateVideoPatch(patch: NewsroomVideoPatch): { valid: boolean; error?: string } {
  if (!patch || typeof patch !== "object") {
    return { valid: false, error: "Patch object is required." };
  }
  const keys = Object.keys(patch);
  if (keys.length === 0) {
    return { valid: false, error: "Patch must contain at least one field to update." };
  }
  const allowedKeys = new Set([
    "title",
    "sourceUrl",
    "thumbnailUrl",
    "durationSeconds",
    "relatedStoryId",
    "sourceProvenance"
  ]);
  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Invalid or unpatchable field: ${key}` };
    }
  }
  if (patch.title !== undefined) {
    if (!patch.title || patch.title.trim().length === 0) {
      return { valid: false, error: "Video title cannot be empty." };
    }
  }
  if (patch.sourceUrl !== undefined) {
    if (!patch.sourceUrl || !validateVideoHttpsUrl(patch.sourceUrl)) {
      return { valid: false, error: "A valid absolute HTTPS source URL without credentials is required." };
    }
  }
  if (patch.thumbnailUrl !== undefined && patch.thumbnailUrl !== null) {
    if (patch.thumbnailUrl.trim().length > 0 && !validateVideoHttpsUrl(patch.thumbnailUrl)) {
      return { valid: false, error: "Thumbnail URL must be a valid absolute HTTPS URL without credentials." };
    }
  }
  if (patch.durationSeconds !== undefined && patch.durationSeconds !== null) {
    if (!Number.isInteger(patch.durationSeconds) || patch.durationSeconds < 0) {
      return { valid: false, error: "Duration must be an integer greater than or equal to 0." };
    }
  }
  if (patch.relatedStoryId !== undefined && patch.relatedStoryId !== null) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patch.relatedStoryId)) {
      return { valid: false, error: "Related story ID must be a valid UUID." };
    }
  }
  if (patch.sourceProvenance !== undefined) {
    if (!patch.sourceProvenance || patch.sourceProvenance.trim().length === 0) {
      return { valid: false, error: "Source provenance cannot be empty." };
    }
  }
  return { valid: true };
}

// ============================================================
// HT-NR-05D-A: Newsroom Live Coverage Registry Models & Helpers
// ============================================================

export type NewsroomLiveCoverageKind = "live-blog" | "scheduled";
export type NewsroomLiveCoverageStatus = "upcoming" | "live" | "ended";

export interface NewsroomLiveCoverage {
  id: string;
  title: string;
  kind: NewsroomLiveCoverageKind;
  status: NewsroomLiveCoverageStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  relatedStoryId: string | null;
  mediaId: string | null;
  sourceProvenance: string;
  lockVersion: number;
  createdByStaffId: string;
  updatedByStaffId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsroomLiveCoverageCreateInput {
  title: string;
  kind: NewsroomLiveCoverageKind;
  scheduledAt?: string | null;
  relatedStoryId?: string | null;
  mediaId?: string | null;
  sourceProvenance: string;
}

export interface NewsroomLiveCoveragePatch {
  title?: string;
  scheduledAt?: string | null;
  relatedStoryId?: string | null;
  mediaId?: string | null;
  sourceProvenance?: string;
}

export interface NewsroomLiveCoverageListOptions {
  status?: NewsroomLiveCoverageStatus;
  kind?: NewsroomLiveCoverageKind;
  search?: string;
  limit?: number;
}

export function validateLiveCoverageCreateInput(input: NewsroomLiveCoverageCreateInput): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Coverage payload is required." };
  }
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: "Coverage title is required." };
  }
  if (!input.kind || (input.kind !== "live-blog" && input.kind !== "scheduled")) {
    return { valid: false, error: "kind must be either live-blog or scheduled (live-video is reserved for a future task)." };
  }
  if (input.scheduledAt !== undefined && input.scheduledAt !== null && input.scheduledAt.trim().length > 0) {
    const d = new Date(input.scheduledAt);
    if (isNaN(d.getTime())) {
      return { valid: false, error: "scheduledAt must be a valid date timestamp if provided." };
    }
  }
  if (input.relatedStoryId !== undefined && input.relatedStoryId !== null && input.relatedStoryId.trim().length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input.relatedStoryId.trim())) {
      return { valid: false, error: "Related story ID must be a valid UUID." };
    }
  }
  if (input.mediaId !== undefined && input.mediaId !== null && input.mediaId.trim().length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input.mediaId.trim())) {
      return { valid: false, error: "mediaId must be a valid UUID." };
    }
  }
  if (!input.sourceProvenance || input.sourceProvenance.trim().length === 0) {
    return { valid: false, error: "Source provenance is required and cannot be empty." };
  }
  return { valid: true };
}

export function validateLiveCoveragePatch(patch: NewsroomLiveCoveragePatch): { valid: boolean; error?: string } {
  if (!patch || typeof patch !== "object") {
    return { valid: false, error: "Patch object is required." };
  }
  const keys = Object.keys(patch);
  if (keys.length === 0) {
    return { valid: false, error: "Patch must contain at least one field to update." };
  }
  const allowedKeys = new Set([
    "title",
    "scheduledAt",
    "relatedStoryId",
    "mediaId",
    "sourceProvenance"
  ]);
  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Invalid or unpatchable field: ${key}` };
    }
  }
  if (patch.title !== undefined) {
    if (!patch.title || patch.title.trim().length === 0) {
      return { valid: false, error: "Coverage title cannot be empty." };
    }
  }
  if (patch.scheduledAt !== undefined && patch.scheduledAt !== null && patch.scheduledAt.trim().length > 0) {
    const d = new Date(patch.scheduledAt);
    if (isNaN(d.getTime())) {
      return { valid: false, error: "scheduledAt must be a valid date timestamp if provided." };
    }
  }
  if (patch.relatedStoryId !== undefined && patch.relatedStoryId !== null && patch.relatedStoryId.trim().length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patch.relatedStoryId.trim())) {
      return { valid: false, error: "Related story ID must be a valid UUID." };
    }
  }
  if (patch.mediaId !== undefined && patch.mediaId !== null && patch.mediaId.trim().length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patch.mediaId.trim())) {
      return { valid: false, error: "mediaId must be a valid UUID." };
    }
  }
  if (patch.sourceProvenance !== undefined) {
    if (!patch.sourceProvenance || patch.sourceProvenance.trim().length === 0) {
      return { valid: false, error: "Source provenance cannot be empty." };
    }
  }
  return { valid: true };
}

// ============================================================
// HT-NR-05D-B: Canonical Live Blog Update Stream Models & Helpers
// ============================================================

export interface NewsroomLiveUpdate {
  id: string;
  coverageId: string;
  headline: string | null;
  body: string;
  mediaId: string | null;
  publishedAt: string;
  authorStaffId?: string;
  createdByStaffId: string;
  createdAt: string;
}

export interface NewsroomLiveUpdateCreateInput {
  coverageId?: string;
  headline?: string | null;
  body: string;
  mediaId?: string | null;
}

export interface LiveBlogUpdate {
  streamSeq: number;
  id: string;
  coverageId: string;
  headline: string | null;
  body: string;
  publishedAt: string;
  media?: MediaRef | null | undefined;
  sourceProvenance?: SourceProvenance | null | undefined;
}

export function validateLiveUpdateCreateInput(
  input: unknown
): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "Live update input payload must be a JSON object." };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["coverageId", "headline", "body", "mediaId"]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unknown or forbidden live update field: ${key}` };
    }
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (record.coverageId !== undefined) {
    if (
      typeof record.coverageId !== "string" ||
      !uuidRegex.test(record.coverageId.trim())
    ) {
      return { valid: false, error: "Valid coverage reference is required." };
    }
  }

  if (typeof record.body !== "string") {
    return { valid: false, error: "Update body is required." };
  }

  const trimmedBody = record.body.trim();
  if (trimmedBody.length === 0) {
    return { valid: false, error: "Update body is required." };
  }
  if (trimmedBody.length > 10000) {
    return { valid: false, error: "Update body must be between 1 and 10,000 characters." };
  }

  if (record.headline !== undefined && record.headline !== null) {
    if (typeof record.headline !== "string") {
      return { valid: false, error: "Update headline must be a string or null." };
    }
    if (record.headline.trim().length > 200) {
      return { valid: false, error: "Update headline must not exceed 200 characters." };
    }
  }

  if (record.mediaId !== undefined && record.mediaId !== null) {
    if (typeof record.mediaId !== "string") {
      return { valid: false, error: "Invalid media asset reference." };
    }
    const trimmedMediaId = record.mediaId.trim();
    if (trimmedMediaId.length > 0) {
      if (!uuidRegex.test(trimmedMediaId)) {
        return { valid: false, error: "Invalid media asset reference." };
      }
    }
  }

  return { valid: true };
}

// ============================================================
// HT-NR-06A: Canonical Social Desk Convergence Models & Helpers
// ============================================================

export const NEWSROOM_SOCIAL_ACCOUNT_STATUSES = [
  "unconfigured",
  "ready",
  "disabled",
  "error"
] as const;

export type NewsroomSocialAccountStatus =
  (typeof NEWSROOM_SOCIAL_ACCOUNT_STATUSES)[number];

export const NEWSROOM_SOCIAL_ACCOUNT_ENVIRONMENTS = [
  "staging",
  "production"
] as const;

export type NewsroomSocialAccountEnvironment =
  (typeof NEWSROOM_SOCIAL_ACCOUNT_ENVIRONMENTS)[number];

export interface NewsroomSocialAccount {
  id: string;
  provider: string;
  accountLabel: string;
  providerAccountId: string | null;
  environment: NewsroomSocialAccountEnvironment;
  status: NewsroomSocialAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export const NEWSROOM_SOCIAL_POST_STATUSES = [
  "draft",
  "approved",
  "published",
  "failed",
  "cancelled"
] as const;

export type NewsroomSocialPostStatus =
  (typeof NEWSROOM_SOCIAL_POST_STATUSES)[number];

export interface NewsroomSocialPost {
  id: string;
  storyId: string;
  socialAccountId: string | null;
  provider: string;
  body: string;
  status: NewsroomSocialPostStatus;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  providerPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NEWSROOM_SOCIAL_ATTEMPT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "unconfigured"
] as const;

export type NewsroomSocialAttemptStatus =
  (typeof NEWSROOM_SOCIAL_ATTEMPT_STATUSES)[number];

export interface NewsroomSocialPublicationAttempt {
  id: string;
  socialPostId: string;
  attemptedBy: string;
  provider: string;
  status: NewsroomSocialAttemptStatus;
  providerPostId: string | null;
  attemptedAt: string;
  completedAt: string | null;
  safeReason?: string | null;
}

export interface NewsroomSocialPreparePublishResult {
  attemptId: string;
  provider: string;
  body: string;
  providerReady: boolean;
}

export interface NewsroomSocialDraftCreateInput {
  storyId: string;
  provider: string;
  body: string;
  socialAccountId?: string | null;
}

export function validateSocialDraftCreateInput(
  input: unknown
): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      error: "Social draft input payload must be a JSON object."
    };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    "storyId",
    "provider",
    "body",
    "socialAccountId"
  ]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      return {
        valid: false,
        error: `Unknown or forbidden social draft field: ${key}`
      };
    }
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    typeof record.storyId !== "string" ||
    !uuidRegex.test(record.storyId.trim())
  ) {
    return {
      valid: false,
      error: "Canonical story selection is required."
    };
  }

  if (
    typeof record.provider !== "string" ||
    record.provider.trim().length === 0 ||
    record.provider.trim().length > 100
  ) {
    return {
      valid: false,
      error: "Configured provider context is required."
    };
  }

  if (typeof record.body !== "string") {
    return {
      valid: false,
      error: "Social post body is required."
    };
  }

  const trimmedBody = record.body.trim();
  if (trimmedBody.length === 0) {
    return {
      valid: false,
      error: "Social post body is required."
    };
  }
  if (trimmedBody.length > 10000) {
    return {
      valid: false,
      error: "Social post body must be between 1 and 10,000 characters."
    };
  }

  if (record.socialAccountId !== undefined && record.socialAccountId !== null) {
    if (typeof record.socialAccountId !== "string") {
      return {
        valid: false,
        error: "Invalid social account reference."
      };
    }
    const trimmedAccountId = record.socialAccountId.trim();
    if (trimmedAccountId.length > 0 && !uuidRegex.test(trimmedAccountId)) {
      return {
        valid: false,
        error: "Invalid social account reference."
      };
    }
  }

  return { valid: true };
}

// ============================================================
// HT-NR-06B: Canonical Newsletter / Campaign Desk Models & Helpers
// ============================================================

export const NEWSROOM_CAMPAIGN_PURPOSES = [
  "NEWSLETTER",
  "BREAKING_NEWS",
  "MARKETING",
  "RESEARCH_UPDATES",
  "EVENTS",
  "PARTNER_CONTENT"
] as const;

export type NewsroomCampaignPurpose =
  (typeof NEWSROOM_CAMPAIGN_PURPOSES)[number];

export const NEWSROOM_CAMPAIGN_STATUSES = [
  "draft",
  "approved",
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled"
] as const;

export type NewsroomCampaignStatus =
  (typeof NEWSROOM_CAMPAIGN_STATUSES)[number];

export interface NewsroomCampaign {
  id: string;
  name: string;
  purpose: NewsroomCampaignPurpose;
  channel: "email";
  segmentId: string | null;
  provider: "brevo";
  providerCampaignId: string | null;
  status: NewsroomCampaignStatus;
  subject: string;
  htmlContent: string | null;
  textContent: string | null;
  approvedAt: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NEWSROOM_SEGMENT_SYNC_STATES = [
  "pending",
  "synced",
  "failed",
  "not_configured"
] as const;

export type NewsroomSegmentSyncState =
  (typeof NEWSROOM_SEGMENT_SYNC_STATES)[number];

export interface NewsroomContactSegment {
  id: string;
  key: string;
  name: string;
  provider: string | null;
  providerSegmentId: string | null;
  syncState: NewsroomSegmentSyncState;
  createdAt: string;
  updatedAt: string;
}

export interface NewsroomCampaignCreateInput {
  name: string;
  purpose: NewsroomCampaignPurpose;
  subject: string;
  htmlContent?: string | null;
  textContent?: string | null;
  segmentId: string;
}

export interface NewsroomCampaignPrepareSendResult {
  campaignId: string;
  name: string;
  purpose: NewsroomCampaignPurpose;
  subject: string;
  htmlContent: string | null;
  textContent: string | null;
  brevoListId: string;
  eligibleCount: number;
  noConsentCount: number;
  suppressedCount: number;
}

export function validateCampaignCreateInput(
  input: unknown
): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      error: "Campaign create payload must be a JSON object."
    };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    "name",
    "purpose",
    "subject",
    "htmlContent",
    "textContent",
    "segmentId"
  ]);

  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      return {
        valid: false,
        error: `Unknown or forbidden campaign create field: ${key}`
      };
    }
  }

  if (typeof record.name !== "string" || record.name.trim().length < 1) {
    return {
      valid: false,
      error: "Campaign name and subject are required."
    };
  }
  if (record.name.trim().length > 200) {
    return {
      valid: false,
      error: "Campaign name must be 200 characters or fewer."
    };
  }

  if (
    typeof record.purpose !== "string" ||
    !NEWSROOM_CAMPAIGN_PURPOSES.includes(
      record.purpose as NewsroomCampaignPurpose
    )
  ) {
    return {
      valid: false,
      error: "Invalid campaign purpose."
    };
  }

  if (typeof record.subject !== "string" || record.subject.trim().length < 1) {
    return {
      valid: false,
      error: "Campaign name and subject are required."
    };
  }
  if (record.subject.trim().length > 300) {
    return {
      valid: false,
      error: "Campaign subject must be 300 characters or fewer."
    };
  }

  if (
    record.htmlContent !== undefined &&
    record.htmlContent !== null &&
    typeof record.htmlContent !== "string"
  ) {
    return {
      valid: false,
      error: "Campaign HTML content must be a string when provided."
    };
  }

  if (
    record.textContent !== undefined &&
    record.textContent !== null &&
    typeof record.textContent !== "string"
  ) {
    return {
      valid: false,
      error: "Campaign text content must be a string when provided."
    };
  }

  const rawHtml =
    typeof record.htmlContent === "string" ? record.htmlContent : "";
  const rawText =
    typeof record.textContent === "string" ? record.textContent.trim() : "";
  const hasMeaningfulHtml =
    rawHtml.length >= 11 && rawHtml.trim().length >= 11;
  const hasMeaningfulText = rawText.length >= 1;

  if (!hasMeaningfulHtml && !hasMeaningfulText) {
    return {
      valid: false,
      error:
        "Campaign content is required (provide meaningful HTML content or non-empty plain text)."
    };
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    typeof record.segmentId !== "string" ||
    !uuidRegex.test(record.segmentId.trim())
  ) {
    return {
      valid: false,
      error: "Canonical contact segment is required."
    };
  }

  return { valid: true };
}

// ============================================================================
// HT-NR-06C: PUSH ALERT CONTROL PLANE MODELS & VALIDATORS
// ============================================================================

export const NEWSROOM_PUSH_ALERT_CATEGORIES = [
  "breaking",
  "live",
  "topic",
  "premium",
  "system"
] as const;

export type NewsroomPushAlertCategory =
  (typeof NEWSROOM_PUSH_ALERT_CATEGORIES)[number];

export const NEWSROOM_PUSH_ALERT_STATUSES = [
  "draft",
  "approved",
  "prepared"
] as const;

export type NewsroomPushAlertStatus =
  (typeof NEWSROOM_PUSH_ALERT_STATUSES)[number];

export interface NewsroomPushAlertCreateInput {
  title: string;
  body: string;
  category: NewsroomPushAlertCategory;
  destination?: string | null;
  related_story_id?: string | null;
}

export interface NewsroomPushAlertPatch {
  title?: string;
  body?: string;
  category?: NewsroomPushAlertCategory;
  destination?: string | null;
  related_story_id?: string | null;
}

export interface NewsroomPushAlert {
  id: string;
  title: string;
  body: string;
  category: NewsroomPushAlertCategory;
  destination: string | null;
  relatedStoryId: string | null;
  status: NewsroomPushAlertStatus;
  createdBy: string;
  updatedBy: string;
  approvedBy: string | null;
  preparedBy: string | null;
  approvedAt: string | null;
  preparedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsroomPushAlertPrepareResult {
  alert_id: string;
  title: string;
  body: string;
  category: NewsroomPushAlertCategory;
  destination: string | null;
  eligible_device_count: number;
}

export function validatePushAlertCategory(
  category: unknown
): category is NewsroomPushAlertCategory {
  return (
    typeof category === "string" &&
    NEWSROOM_PUSH_ALERT_CATEGORIES.includes(
      category as NewsroomPushAlertCategory
    )
  );
}

export function validatePushAlertDestination(
  destination: unknown
): boolean {
  if (destination === null || destination === undefined) return true;
  if (typeof destination !== "string") return false;
  const trimmed = destination.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > 255) return false;
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.includes("//") || trimmed.includes(":")) return false;
  return /^\/[a-zA-Z0-9_\-./]*$/.test(trimmed);
}

export function validatePushAlertCreateInput(
  input: unknown
): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "Push alert input must be a JSON object." };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    "title",
    "body",
    "category",
    "destination",
    "related_story_id"
  ]);

  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unexpected field in push alert: ${key}` };
    }
  }

  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    return { valid: false, error: "Push alert title is required." };
  }
  if (record.title.trim().length > 140) {
    return {
      valid: false,
      error: "Push alert title cannot exceed 140 characters."
    };
  }

  if (typeof record.body !== "string" || record.body.trim().length === 0) {
    return { valid: false, error: "Push alert body is required." };
  }
  if (record.body.trim().length > 500) {
    return {
      valid: false,
      error: "Push alert body cannot exceed 500 characters."
    };
  }

  if (!validatePushAlertCategory(record.category)) {
    return {
      valid: false,
      error: "Invalid category. Must be breaking, live, topic, premium, or system."
    };
  }

  if (!validatePushAlertDestination(record.destination)) {
    return {
      valid: false,
      error:
        "Destination must be a valid internal path starting with / without schemes or credentials."
    };
  }

  if (
    record.related_story_id !== null &&
    record.related_story_id !== undefined &&
    record.related_story_id !== ""
  ) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      typeof record.related_story_id !== "string" ||
      !uuidRegex.test(record.related_story_id.trim())
    ) {
      return { valid: false, error: "related_story_id must be a valid UUID." };
    }
  }

  return { valid: true };
}

export function validatePushAlertPatch(
  patch: unknown
): { valid: boolean; error?: string } {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { valid: false, error: "Patch payload must be a JSON object." };
  }

  const record = patch as Record<string, unknown>;
  const allowedKeys = new Set([
    "title",
    "body",
    "category",
    "destination",
    "related_story_id"
  ]);

  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Invalid or unpatchable field: ${key}` };
    }
  }

  if (record.title !== undefined) {
    if (typeof record.title !== "string" || record.title.trim().length === 0) {
      return { valid: false, error: "Push alert title cannot be empty." };
    }
    if (record.title.trim().length > 140) {
      return {
        valid: false,
        error: "Push alert title cannot exceed 140 characters."
      };
    }
  }

  if (record.body !== undefined) {
    if (typeof record.body !== "string" || record.body.trim().length === 0) {
      return { valid: false, error: "Push alert body cannot be empty." };
    }
    if (record.body.trim().length > 500) {
      return {
        valid: false,
        error: "Push alert body cannot exceed 500 characters."
      };
    }
  }

  if (record.category !== undefined) {
    if (!validatePushAlertCategory(record.category)) {
      return {
        valid: false,
        error: "Invalid category. Must be breaking, live, topic, premium, or system."
      };
    }
  }

  if (record.destination !== undefined) {
    if (!validatePushAlertDestination(record.destination)) {
      return {
        valid: false,
        error:
          "Destination must be a valid internal path starting with / without schemes or credentials."
      };
    }
  }

  if (
    record.related_story_id !== null &&
    record.related_story_id !== undefined &&
    record.related_story_id !== ""
  ) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      typeof record.related_story_id !== "string" ||
      !uuidRegex.test(record.related_story_id.trim())
    ) {
      return { valid: false, error: "related_story_id must be a valid UUID." };
    }
  }

  return { valid: true };
}

