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


