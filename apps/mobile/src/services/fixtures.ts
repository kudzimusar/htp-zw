import type {
  AdvertisingService,
  AnalyticsService,
  ArticleRepository,
  AuthorizationService,
  CommentModerationService,
  DeviceSecurityService,
  AudioService,
  AuthService,
  HealthTimesServices,
  LiveService,
  NotificationService,
  NewsroomCommunicationService,
  NewsroomStoryService,
  ReaderDiscussionService,
  PremiumService,
  PlatformService,
  SearchService,
  SocialAttributionService,
  VideoService
} from "../domain/contracts";
import type {
  CreateStoryInput,
  NewsroomPublicAuthor,
  NewsroomSection,
  NewsroomStory,
  NewsroomStoryAutosave,
  NewsroomStoryCorrection,
  NewsroomStoryReview,
  NewsroomStoryRevision,
  SaveStoryPatch,
  SearchQuery
} from "../domain/models";
import { articles, audioItems, liveItems, notifications, videos } from "../fixtures/content";
import { certifiedTaxonomyFixtureService } from "./taxonomy";
import { persistentReaderRepository } from "./reader-persistence";
import { decideFixtureAd } from "../growth/advertising";
import { validatePublicAnalyticsEvent } from "../growth/events";
import { attributedShareUrl, canonicalArticleUrl } from "../growth/deepLinks";
import { fixturePremiumStoreService } from "../growth/premium-store";
import { premiumCommerceService } from "../growth/premium-commerce";
import { emptyAuthorizationSnapshot, hasServerCapability } from "../security/capabilities";
import { getNotificationPreferences, saveNotificationPreferences } from "../security/notification-preferences";

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
  },
  async listByAuthor(authorSlug) {
    return articles.filter((item) => item.author?.slug === authorSlug);
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
      authors: [],
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
  async signInWithPassword() {
    return { status: "blocked", message: "Fixture mode does not authenticate real accounts." };
  },
  async registerReader() {
    return { status: "blocked", message: "Fixture mode does not create real accounts." };
  },
  async requestPasswordReset() {
    return { status: "blocked", message: "Fixture mode does not send account email." };
  },
  async resendVerification() {
    return { status: "blocked", message: "Fixture mode does not send account email." };
  },
  async handleAuthCallback() {
    return { status: "blocked", message: "Fixture mode does not consume real account links." };
  },
  async completePasswordReset() {
    return { status: "blocked", message: "Fixture mode has no authoritative account password." };
  },
  async requestAccountDeletion() {
    return {
      status: "unavailable",
      message: "Fixture mode has no authoritative account to delete."
    };
  },
  async signOut() {
    return;
  }
};

const authorizationService: AuthorizationService = {
  async getSnapshot() {
    return emptyAuthorizationSnapshot(
      "server-policy-unavailable",
      "Fixture mode never grants Studio authority."
    );
  },
  async hasCapability(capability) {
    const snapshot = await this.getSnapshot();
    return hasServerCapability(snapshot, capability);
  }
};

const deviceSecurityService: DeviceSecurityService = {
  async getCurrentSession() {
    return {
      authenticated: false,
      userId: null,
      expiresAt: null,
      remoteSessionManagementAvailable: false
    };
  },
  async requestPushRegistration() {
    return {
      status: "configuration-required",
      deviceTokenAvailable: false,
      message: "Fixture mode does not register push devices."
    };
  },
  async getNotificationPreferences() {
    return getNotificationPreferences();
  },
  async saveNotificationPreferences(preferences) {
    await saveNotificationPreferences(preferences);
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

const readerDiscussionService: ReaderDiscussionService = {
  async registerProfile() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  },
  async getEligibility() {
    return { status: "blocked", reason: "canonical_story_required", profileId: null, publishedCommentCount: 0 };
  },
  async listPublic() {
    return [];
  },
  async submit() {
    throw new Error("Canonical HealthTimes story identity is required before discussion can be used.");
  },
  async edit() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  },
  async withdraw() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  },
  async report() {
    throw new Error("Reader discussion is unavailable in fixture mode.");
  }
};

const newsroomCommunicationService: NewsroomCommunicationService = {
  async listInbox() {
    return {
      items: [],
      summary: {
        unreadTotal: 0, mentions: 0, assignments: 0, reviews: 0,
        urgent: 0, announcements: 0, newsletter: 0, moderation: 0, unacknowledged: 0
      }
    };
  },
  async markRead() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async acknowledge() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async archive() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listAssignments() { return []; },
  async listStoryDiscussion() { return []; },
  async addStoryComment() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async editStoryComment() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async setStoryCommentResolved() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listDesks() { return []; },
  async listThreads() { return []; },
  async createThread() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listThreadMessages() { return []; },
  async postThreadMessage() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async markThreadRead() { throw new Error("Server-authorized Newsroom communication is unavailable in fixture mode."); },
  async listAnnouncements() { return []; }
};

const commentModerationService: CommentModerationService = {
  async listQueue() { return []; },
  async moderate() { throw new Error("Comment moderation is unavailable in fixture mode."); },
  async setStoryCommentPolicy() { throw new Error("Comment moderation is unavailable in fixture mode."); },
  async restrictReader() { throw new Error("Comment moderation is unavailable in fixture mode."); },
  async liftRestriction() { throw new Error("Comment moderation is unavailable in fixture mode."); }
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

const fixtureAuthors: NewsroomPublicAuthor[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    displayName: "Staff Reporter",
    slug: "staff-reporter",
    bio: "HealthTimes medical journalism desk",
    provenance: "fixture"
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    displayName: "Dr. Rutendo Shumba",
    slug: "dr-rutendo-shumba",
    bio: "Senior Health & Science Correspondent",
    provenance: "fixture"
  }
];

const fixtureSections: NewsroomSection[] = [
  {
    id: "s0000000-0000-4000-8000-000000000001",
    name: "Health Policy",
    slug: "health-policy",
    parentId: null,
    provenance: "fixture"
  },
  {
    id: "s0000000-0000-4000-8000-000000000002",
    name: "Clinical Medicine",
    slug: "clinical-medicine",
    parentId: null,
    provenance: "fixture"
  },
  {
    id: "s0000000-0000-4000-8000-000000000003",
    name: "Community Health",
    slug: "community-health",
    parentId: null,
    provenance: "fixture"
  }
];

let fixtureStories: NewsroomStory[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    title: "National Cholera Surveillance and Oral Rehydration Centers Expanded",
    slug: "national-cholera-surveillance-expanded",
    standfirst: "Rapid intervention teams deploy across metropolitan districts.",
    excerpt: "Health authorities report stabilization across high-density suburbs.",
    bodyHtml: "<p>Health authorities have deployed rapid intervention teams to scale oral rehydration points.</p>",
    bodyJson: null,
    status: "draft",
    workflowStatus: "Draft",
    accessPolicy: "public",
    authorId: "a0000000-0000-4000-8000-000000000001",
    primarySectionId: "s0000000-0000-4000-8000-000000000001",
    publishedAt: null,
    scheduledAt: null,
    seoTitle: "Cholera Response - HealthTimes",
    seoDescription: "Rapid response teams expand treatment units.",
    canonicalUrl: null,
    ownerStaffId: "u0000000-0000-4000-8000-000000000001",
    assignedEditorStaffId: null,
    factCheckerStaffId: null,
    healthReviewerStaffId: null,
    copyEditorStaffId: null,
    desk: "National",
    topic: "Infectious Disease",
    country: "Zimbabwe",
    region: "Harare",
    sourceNotes: "Ministry of Health situation report #44",
    internalNotes: "Prioritize cold-chain verification",
    deadlineAt: null,
    distribution: { public_reader: true },
    adSetting: "Standard",
    commentPolicy: "open",
    lockVersion: 1,
    lastSavedBy: "u0000000-0000-4000-8000-000000000001",
    createdAt: "2026-09-20T08:00:00Z",
    updatedAt: "2026-09-20T08:00:00Z",
    modifiedAt: null
  }
];

let fixtureRevisions: Record<string, NewsroomStoryRevision[]> = {
  "d0000000-0000-4000-8000-000000000001": [
    {
      id: "r0000000-0000-4000-8000-000000000001",
      storyId: "d0000000-0000-4000-8000-000000000001",
      revisionNumber: 1,
      title: "National Cholera Surveillance and Oral Rehydration Centers Expanded",
      bodyHtml: "<p>Health authorities have deployed rapid intervention teams to scale oral rehydration points.</p>",
      bodyJson: null,
      changeSummary: "Story created",
      editorId: "u0000000-0000-4000-8000-000000000001",
      createdAt: "2026-09-20T08:00:00Z"
    }
  ]
};

let fixtureAutosaves: Record<string, NewsroomStoryAutosave | null> = {};
let fixtureReviews: Record<string, NewsroomStoryReview[]> = {};
let fixtureCorrections: Record<string, NewsroomStoryCorrection[]> = {};

export const fixtureNewsroomStoryService: NewsroomStoryService = {
  async listStories(limit = 200) {
    return fixtureStories.slice(0, limit);
  },
  async getStory(storyId: string) {
    return fixtureStories.find((s) => s.id === storyId) ?? null;
  },
  async createStory(input: CreateStoryInput) {
    const id = `d0000000-0000-4000-8000-${String(fixtureStories.length + 1).padStart(12, "0")}`;
    const slug = input.slug || `draft-${Math.random().toString(36).slice(2, 10)}`;
    const newStory: NewsroomStory = {
      id,
      title: input.title || "Untitled story",
      slug,
      standfirst: input.standfirst ?? null,
      excerpt: null,
      bodyHtml: input.bodyHtml ?? input.body_html ?? input.body ?? null,
      bodyJson: null,
      status: "draft",
      workflowStatus: "Draft",
      accessPolicy: input.accessPolicy ?? input.access_policy ?? "public",
      authorId: input.authorId ?? input.author_id ?? "a0000000-0000-4000-8000-000000000001",
      primarySectionId: input.primarySectionId ?? input.primary_section_id ?? null,
      publishedAt: null,
      scheduledAt: null,
      seoTitle: input.seoTitle ?? input.seo_title ?? null,
      seoDescription: input.seoDescription ?? input.seo_description ?? null,
      canonicalUrl: null,
      ownerStaffId: "u0000000-0000-4000-8000-000000000001",
      assignedEditorStaffId: null,
      factCheckerStaffId: null,
      healthReviewerStaffId: null,
      copyEditorStaffId: null,
      desk: input.desk ?? null,
      topic: input.topic ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      sourceNotes: input.sourceNotes ?? input.sources ?? null,
      internalNotes: input.internalNotes ?? input.notes ?? null,
      deadlineAt: input.deadlineAt ?? input.deadline_at ?? null,
      distribution: { public_reader: true },
      adSetting: "Standard",
      commentPolicy: (input.commentPolicy ?? input.comment_policy ?? "open") as any,
      lockVersion: 1,
      lastSavedBy: "u0000000-0000-4000-8000-000000000001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modifiedAt: null
    };
    fixtureStories.unshift(newStory);
    fixtureRevisions[id] = [
      {
        id: `r0000000-0000-4000-8000-${String(Date.now()).slice(-12)}`,
        storyId: id,
        revisionNumber: 1,
        title: newStory.title,
        bodyHtml: newStory.bodyHtml,
        bodyJson: null,
        changeSummary: "Story created",
        editorId: "u0000000-0000-4000-8000-000000000001",
        createdAt: new Date().toISOString()
      }
    ];
    return id;
  },
  async saveStory(storyId: string, expectedVersion: number, patch: SaveStoryPatch, reason = "Autosave") {
    const story = fixtureStories.find((s) => s.id === storyId);
    if (!story) throw new Error("Story not found");
    if (story.lockVersion !== expectedVersion) {
      throw new Error("VERSION_CONFLICT");
    }
    const newVersion = story.lockVersion + 1;
    story.lockVersion = newVersion;
    if (patch.title !== undefined) story.title = patch.title;
    if (patch.slug !== undefined) story.slug = patch.slug;
    if (patch.standfirst !== undefined) story.standfirst = patch.standfirst;
    if (patch.body !== undefined || patch.bodyHtml !== undefined || patch.body_html !== undefined) {
      story.bodyHtml = patch.body ?? patch.bodyHtml ?? patch.body_html ?? null;
    }
    if (patch.sources !== undefined || patch.sourceNotes !== undefined) {
      story.sourceNotes = patch.sources ?? patch.sourceNotes ?? null;
    }
    if (patch.notes !== undefined || patch.internalNotes !== undefined) {
      story.internalNotes = patch.notes ?? patch.internalNotes ?? null;
    }
    if (patch.authorId !== undefined || patch.author_id !== undefined) {
      story.authorId = patch.authorId ?? patch.author_id ?? null;
    }
    if (patch.primarySectionId !== undefined || patch.primary_section_id !== undefined) {
      story.primarySectionId = patch.primarySectionId ?? patch.primary_section_id ?? null;
    }
    if (patch.desk !== undefined) story.desk = patch.desk ?? null;
    if (patch.topic !== undefined) story.topic = patch.topic ?? null;
    if (patch.country !== undefined) story.country = patch.country ?? null;
    if (patch.region !== undefined) story.region = patch.region ?? null;
    if (patch.accessPolicy !== undefined || patch.access_policy !== undefined) {
      story.accessPolicy = (patch.accessPolicy ?? patch.access_policy) as any;
    }
    if (patch.commentPolicy !== undefined || patch.comment_policy !== undefined) {
      story.commentPolicy = (patch.commentPolicy ?? patch.comment_policy) as any;
    }
    if (patch.deadlineAt !== undefined || patch.deadline_at !== undefined) {
      story.deadlineAt = patch.deadlineAt ?? patch.deadline_at ?? null;
    }
    if (patch.seoTitle !== undefined || patch.seo_title !== undefined) {
      story.seoTitle = patch.seoTitle ?? patch.seo_title ?? null;
    }
    if (patch.seoDescription !== undefined || patch.seo_description !== undefined) {
      story.seoDescription = patch.seoDescription ?? patch.seo_description ?? null;
    }
    story.updatedAt = new Date().toISOString();

    if (reason.toLowerCase() === "autosave") {
      fixtureAutosaves[storyId] = {
        storyId,
        title: story.title,
        standfirst: story.standfirst,
        bodyHtml: story.bodyHtml,
        lockVersion: newVersion,
        savedBy: "u0000000-0000-4000-8000-000000000001",
        savedAt: new Date().toISOString()
      };
    } else {
      delete fixtureAutosaves[storyId];
      const revs = fixtureRevisions[storyId] || [];
      revs.unshift({
        id: `r0000000-0000-4000-8000-${String(Date.now()).slice(-12)}`,
        storyId,
        revisionNumber: revs.length + 1,
        title: story.title,
        bodyHtml: story.bodyHtml,
        bodyJson: null,
        changeSummary: reason,
        editorId: "u0000000-0000-4000-8000-000000000001",
        createdAt: new Date().toISOString()
      });
      fixtureRevisions[storyId] = revs;
    }

    return newVersion;
  },
  async transitionStory(storyId: string, nextStatus: string, reason?: string) {
    const story = fixtureStories.find((s) => s.id === storyId);
    if (!story) throw new Error("Story not found");
    story.workflowStatus = nextStatus;
    if (nextStatus === "Published") {
      story.publishedAt = new Date().toISOString();
      story.status = "published";
    }
    if (nextStatus === "Updated / Corrected" && reason) {
      const corrs = fixtureCorrections[storyId] || [];
      corrs.unshift({
        id: `c0000000-0000-4000-8000-${String(Date.now()).slice(-12)}`,
        storyId,
        reason,
        changedBy: "u0000000-0000-4000-8000-000000000001",
        changedAt: new Date().toISOString(),
        previousRevisionId: null,
        newRevisionId: null
      });
      fixtureCorrections[storyId] = corrs;
    }
    return nextStatus;
  },
  async listAuthors() {
    return fixtureAuthors;
  },
  async listSections() {
    return fixtureSections;
  },
  async listRevisions(storyId: string) {
    return fixtureRevisions[storyId] ?? [];
  },
  async listAutosave(storyId: string) {
    return fixtureAutosaves[storyId] ?? null;
  },
  async listReviews(storyId: string) {
    return fixtureReviews[storyId] ?? [];
  },
  async listCorrections(storyId: string) {
    return fixtureCorrections[storyId] ?? [];
  },
  async restoreRevision(storyId: string, revisionId: string, expectedVersion: number) {
    const story = fixtureStories.find((s) => s.id === storyId);
    if (!story) throw new Error("Story not found");
    if (story.lockVersion !== expectedVersion) throw new Error("VERSION_CONFLICT");
    const rev = (fixtureRevisions[storyId] ?? []).find((r) => r.id === revisionId);
    if (!rev) throw new Error("Revision not found");
    story.title = rev.title || story.title;
    story.bodyHtml = rev.bodyHtml;
    story.lockVersion += 1;
    story.updatedAt = new Date().toISOString();
    return story.lockVersion;
  },
  async recordReview(storyId: string, reviewType: string, status: string, notes?: string | null) {
    const id = `rev00000-0000-4000-8000-${String(Date.now()).slice(-12)}`;
    const revs = fixtureReviews[storyId] || [];
    revs.unshift({
      id,
      storyId,
      reviewType,
      status,
      notes: notes ?? null,
      assignedTo: null,
      createdBy: "u0000000-0000-4000-8000-000000000001",
      completedBy: "u0000000-0000-4000-8000-000000000001",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    });
    fixtureReviews[storyId] = revs;
    return id;
  },
  async requestChanges(storyId: string, reason: string) {
    const story = fixtureStories.find((s) => s.id === storyId);
    if (!story) throw new Error("Story not found");
    story.workflowStatus = "Draft";
    return { ok: true, reason };
  }
};

export const fixtureServices: HealthTimesServices = {
  articles: articleRepository,
  search: searchService,
  auth: authService,
  authorization: authorizationService,
  deviceSecurity: deviceSecurityService,
  reader: persistentReaderRepository,
  premium: premiumService,
  premiumStore: fixturePremiumStoreService,
  premiumCommerce: premiumCommerceService,
  advertising: advertisingService,
  analytics: analyticsService,
  live: liveService,
  video: videoService,
  audio: audioService,
  notifications: notificationService,
  readerDiscussion: readerDiscussionService,
  newsroomCommunication: newsroomCommunicationService,
  commentModeration: commentModerationService,
  newsroomStories: fixtureNewsroomStoryService,
  taxonomy: certifiedTaxonomyFixtureService,
  publication: {
    async getProfile() {
      return {
        name: "HealthTimes",
        description: "Controlled fixture publication profile.",
        publisher: "Fixture",
        location: "Global",
        editorialEmail: "editorial@example.invalid",
        aboutUrl: "",
        contactUrl: "",
        editorialPrinciples: [],
        sourceVerifiedAt: ""
      };
    },
    async listAuthors() { return []; },
    async getAuthor() { return null; }
  },
  platform: platformService,
  social: socialService
};
