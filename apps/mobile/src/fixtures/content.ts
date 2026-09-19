import type {
  ArticleDetail,
  ArticleSummary,
  AudioItem,
  LiveItem,
  NotificationItem,
  VideoItem
} from "../domain/models";

const healthMedia = {
  id: "fixture-media-health",
  publicUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
  altText: "Health professional in a clinical setting",
  caption: null,
  credit: "Fixture image — replace with AG-04 migrated media"
};

const labMedia = {
  id: "fixture-media-lab",
  publicUrl: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1600&q=80",
  altText: "Laboratory research equipment",
  caption: null,
  credit: "Fixture image — replace with AG-04 migrated media"
};

const communityMedia = {
  id: "fixture-media-community",
  publicUrl: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1600&q=80",
  altText: "Community health care discussion",
  caption: null,
  credit: "Fixture image — replace with AG-04 migrated media"
};

const author = {
  id: "fixture-author",
  displayName: "HealthTimes Desk",
  slug: "healthtimes-desk"
};

const section = { id: "fixture-section-public-health", name: "Public Health", slug: "public-health" };
const global = { id: "fixture-zone-global", name: "Global", slug: "global" };
const africa = { id: "fixture-zone-africa", name: "Africa", slug: "africa" };
const zimbabwe = { id: "fixture-zone-zimbabwe", name: "Zimbabwe", slug: "zimbabwe" };

export const articles: ArticleDetail[] = [
  {
    id: "fixture-001",
    title: "Health systems prepare for a new season of regional pressure",
    slug: "fixture-health-systems-regional-pressure",
    standfirst: "A fixture story demonstrating the approved HealthTimes editorial hierarchy while AG-04 content remains unavailable.",
    excerpt: "Health services across the region are balancing access, workforce and medicine supply pressures.",
    bodyHtml: "<p>This is controlled fixture content for NM-01. It proves article layout only and must be replaced by AG-04 migrated reporting before integrated certification.</p><p>The Reader keeps full journalism at the centre, with search, save, listen and related coverage supporting rather than replacing the article.</p>",
    status: "published",
    accessPolicy: "public",
    publishedAt: "2026-09-19T08:00:00Z",
    modifiedAt: "2026-09-19T08:00:00Z",
    author,
    primarySection: section,
    geography: [africa, zimbabwe],
    topics: [{ id: "fixture-topic-health-systems", name: "Health Systems", slug: "health-systems" }],
    heroMedia: healthMedia,
    canonicalUrl: null
  },
  {
    id: "fixture-002",
    title: "Research teams expand evidence on community health delivery",
    slug: "fixture-community-health-evidence",
    standfirst: "Research and field practice remain closely linked in the HealthTimes discovery model.",
    excerpt: "A fixture research story used to exercise cards, search and related coverage.",
    bodyHtml: "<p>Fixture content only. Authoritative research stories will come from the AG-04 migration.</p>",
    status: "published",
    accessPolicy: "public",
    publishedAt: "2026-09-18T12:00:00Z",
    modifiedAt: "2026-09-18T12:00:00Z",
    author,
    primarySection: { id: "fixture-section-research", name: "Research", slug: "research" },
    geography: [global, africa],
    topics: [{ id: "fixture-topic-community", name: "Community Health", slug: "community-health" }],
    heroMedia: labMedia,
    canonicalUrl: null
  },
  {
    id: "fixture-003",
    title: "Premium intelligence: what health financing signals mean for providers",
    slug: "fixture-premium-health-financing",
    standfirst: "Premium presentation is visible now; entitlement remains a server-owned AG-06 responsibility.",
    excerpt: "A fixture premium story used to prove preview and lock treatment without shipping protected production content.",
    bodyHtml: null,
    status: "published",
    accessPolicy: "premium",
    publishedAt: "2026-09-17T07:30:00Z",
    modifiedAt: "2026-09-17T07:30:00Z",
    author,
    primarySection: { id: "fixture-section-business", name: "Health Business", slug: "health-business" },
    geography: [global],
    topics: [{ id: "fixture-topic-financing", name: "Health Financing", slug: "health-financing" }],
    heroMedia: communityMedia,
    canonicalUrl: null
  }
];

export const homeArticles: ArticleSummary[] = articles;

export const liveItems: LiveItem[] = [
  {
    id: "fixture-live-001",
    title: "Regional health policy briefing",
    kind: "live-blog",
    status: "live",
    updatedAt: "2026-09-19T11:58:00Z",
    updateCount: 12,
    media: communityMedia
  },
  {
    id: "fixture-live-002",
    title: "Public health conference stream",
    kind: "scheduled",
    status: "upcoming",
    updatedAt: "2026-09-19T10:00:00Z",
    media: healthMedia
  }
];

export const videos: VideoItem[] = [
  {
    id: "fixture-video-001",
    title: "Inside the systems shaping health access",
    durationSeconds: 486,
    publishedAt: "2026-09-18T09:00:00Z",
    thumbnail: healthMedia
  },
  {
    id: "fixture-video-002",
    title: "Research briefing: translating evidence into practice",
    durationSeconds: 312,
    publishedAt: "2026-09-17T09:00:00Z",
    thumbnail: labMedia
  }
];

export const audioItems: AudioItem[] = [
  {
    id: "fixture-audio-001",
    title: "Listen: the week in global health",
    durationSeconds: 1280,
    publishedAt: "2026-09-19T06:00:00Z"
  },
  {
    id: "fixture-audio-002",
    title: "Article audio: understanding medicine supply chains",
    durationSeconds: 540,
    publishedAt: "2026-09-18T06:00:00Z"
  }
];

export const notifications: NotificationItem[] = [
  {
    id: "fixture-notification-001",
    category: "live",
    title: "Live coverage has started",
    description: "Regional health policy briefing is now live.",
    createdAt: "2026-09-19T11:58:00Z",
    read: false,
    destination: "/live"
  },
  {
    id: "fixture-notification-002",
    category: "system",
    title: "Development build",
    description: "Notifications are fixture-only until NM-06 device registration.",
    createdAt: "2026-09-19T08:00:00Z",
    read: true
  }
];
