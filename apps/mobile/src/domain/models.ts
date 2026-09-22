import type { CommercialSourceContext, ContentIntegrityState, GeographyRef, PremiumSourceContext, SourceMappingAuthority, SourceProvenance, SourceTaxonomyKind } from "./source";

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

export type LegacyTaxonomyRef = TaxonomyRef & {
  authority: Extract<SourceMappingAuthority, "observed-source">;
  sourceSystem: "wordpress";
  sourceId: string | null;
  sourceKind: SourceTaxonomyKind | null;
};

export type TaxonomyResolution = {
  observedWordPress: LegacyTaxonomyRef[];
  approvedCanonical: TaxonomyRef[];
  inferredRequiresReview: TaxonomyRef[];
};

export type GeographyEvidence = {
  candidate: GeographyRef;
  authority: Extract<SourceMappingAuthority, "observed-source" | "inferred-requires-review">;
  evidence: "wordpress-taxonomy" | "headline-excerpt" | "certified-source-snapshot" | "ag04-repository";
  sourceValue: string | null;
};

export type GeographyResolution = {
  canonicalApproved: GeographyRef[];
  observedSource: GeographyEvidence[];
  inferredRequiresReview: GeographyEvidence[];
};

export type ArticleSummary = {
  id: string;
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
  geographyResolution?: GeographyResolution;
  topics: TaxonomyRef[];
  legacyTaxonomy?: LegacyTaxonomyRef[];
  taxonomyResolution?: TaxonomyResolution;
  heroMedia: MediaRef | null;
  sourceProvenance?: SourceProvenance | null;
  contentIntegrity?: ContentIntegrityState;
  premiumSourceContext?: PremiumSourceContext;
};

export type ArticleDetail = ArticleSummary & {
  bodyHtml: string | null;
  canonicalUrl: string | null;
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

export type MediaTranscriptState = "unavailable" | "available" | "pending" | "unknown";

export type ReaderMediaSource = {
  url: string | null;
  provider: string | null;
  providerAssetId: string | null;
  mimeType: string | null;
  verified: boolean;
  downloadable: boolean;
};

export type VideoItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnail: MediaRef | null;
  sourceUrl?: string | null;
  provider?: string | null;
  providerAssetId?: string | null;
  description?: string | null;
  transcriptState?: MediaTranscriptState;
  relatedArticleId?: string | null;
  accessPolicy?: AccessPolicy | null;
  presentation?: "recorded" | "live" | null;
  sourceProvenance?: SourceProvenance | null;
};

export type AudioItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  artwork?: MediaRef | null;
  source?: ReaderMediaSource | null;
  relatedArticleId?: string | null;
  transcriptState?: MediaTranscriptState;
  accessPolicy?: AccessPolicy | null;
};

export type MediaPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";
export type MediaPlayerPresentation = "mini" | "full";

export type MediaPlaybackState = {
  status: MediaPlaybackStatus;
  currentItemId: string | null;
  elapsedSeconds: number;
  durationSeconds: number | null;
  playbackRate: number;
  presentation: MediaPlayerPresentation;
  error: string | null;
};

export type ReaderConnectivityState = "online" | "offline" | "unknown";

export type OfflineAvailabilityState =
  | "not-downloaded"
  | "downloading"
  | "available"
  | "stale"
  | "failed"
  | "unavailable"
  | "pending-sync";

export type OfflineArticleRecord = {
  schemaVersion: 2;
  article: ArticleDetail;
  state: OfflineAvailabilityState;
  downloadedAt: string | null;
  sourceModifiedAt: string | null;
  textAvailable: boolean;
  mediaAvailable: boolean;
  syncMode: "local-only";
  failureReason: string | null;
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
  | "home_after_live"
  | "home_feed_1"
  | "home_feed_2"
  | "home_watch"
  | "home_deep_feed"
  | "article_after_intro"
  | "article_mid_body"
  | "article_end"
  | "watch_feed"
  | "live_feed";

export type AdRequestContext = {
  consentForPersonalizedAds: boolean;
  sensitiveHealthContext: boolean;
  pagePath?: string;
  storyId?: string;
};

export type AdProviderReadinessState =
  | "unconfigured"
  | "blocked-by-policy"
  | "eligible-no-inventory"
  | "available"
  | "error";

export type AdPlacementFormat = "banner" | "inline-display" | "feed-display";

export type AdPlacementDefinition = {
  key: AdPlacementKey;
  surface: "home" | "article" | "live" | "watch";
  format: AdPlacementFormat;
  sensitiveHealthEligibility: "blocked" | "non-personalized-only";
  personalizationAllowed: false;
};

export type AdDecision = {
  placementKey: AdPlacementKey;
  providerState: AdProviderReadinessState;
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
  status: "configuration-required" | "loading" | "available" | "unavailable" | "error";
  offers: PremiumOffer[];
  message: string;
};

export type PremiumPurchaseResult = {
  status:
    | "configuration-required"
    | "cancelled"
    | "pending-server-entitlement"
    | "unavailable"
    | "error";
  storeProductId: string | null;
  providerTransactionReference: string | null;
  message: string;
};

export type PremiumRestoreResult = {
  restored: boolean;
  reason:
    | "restored-pending-server-entitlement"
    | "nothing-to-restore"
    | "configuration-required"
    | "unavailable"
    | "error";
  providerTransactionReferences?: string[];
};

export type AnalyticsProviderStatus = {
  provider: "development-test" | "pwa-web" | "native";
  state: "available" | "configuration-required" | "blocked-by-host" | "error";
  measurementId: string | null;
  detail: string;
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
