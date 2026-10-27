import type {
  AdvertisingService,
  ArticleRepository,
  PublicationRepository,
  SearchService,
  TaxonomyService
} from "../domain/contracts";
import type {
  ArticleDetail,
  AuthorProfile,
  SearchQuery,
  SearchResult,
  TaxonomyRef
} from "../domain/models";
import { scoreReaderSearch } from "../reader/search-ranking";
import { stagingConfig } from "../platform/config";
import { getStagingSupabaseClient } from "../platform/supabase";
import { certifiedTaxonomyFixtureService } from "./taxonomy";
import { sourceParityServices } from "./source-parity";
import { publicVideoService } from "./public-video";
import { publicLiveService } from "./public-live";
import { publicPresentationService } from "./presentation";
import {
  directDecisionFromHospazCapability,
  projectCp5HospazCapability,
  type Cp5HospazRaw
} from "../growth/direct-ad";
import {
  mapMigratedStoryDocument,
  type MigratedStoryDocument
} from "./migrated-corpus-mapper";
import {
  mapNativeStoryDocument,
  type NativeStoryDocument
} from "./native-story-mapper";

type FeedRow = {
  title: string;
  canonical_url: string | null;
  published_at: string | null;
  modified_at: string | null;
  author_name: string | null;
  description: string | null;
};

export type NativeFeedRow = {
  id: string;
  title: string;
  slug: string;
  standfirst: string | null;
  excerpt: string | null;
  body_html: string | null;
  published_at: string | null;
  modified_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
};

type ContextDocument = {
  kind?: "category" | "tag" | "author";
  slug?: string;
  name?: string;
  canonical_url?: string;
  items?: Array<{
    title?: string | null;
    canonical_url?: string | null;
    published_at?: string | null;
    author_name?: string | null;
    source_id?: string | null;
  }>;
};

type PathResolution = {
  resolution?: "homepage" | "preserved_direct" | "redirect" | "alias_redirect" | "explicit_404_exception";
  http_status?: number;
  requested_path?: string | null;
  target_path?: string | null;
  source_id?: string | null;
  source_type?: string | null;
};

const CACHE_MS = 120_000;
const FEED_LIMIT = 120;
let feedCache: { at: number; articles: ArticleDetail[] } | null = null;
let feedLoadPromise: Promise<ArticleDetail[]> | null = null;

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = getStagingSupabaseClient() as any;
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message || `HealthTimes migrated-corpus request failed: ${name}`);
  }
  return data as T;
}

async function boundedRpcRows<T>(
  name: string,
  args: Record<string, unknown>,
  limit: number
): Promise<T[]> {
  const client = getStagingSupabaseClient() as any;
  const { data, error } = await client.rpc(name, args).limit(limit);
  if (error) {
    throw new Error(error.message || `HealthTimes public Reader listing request failed: ${name}`);
  }
  return (data ?? []) as T[];
}

function normalizePath(value: string) {
  const path = value.startsWith("/") ? value : "/" + value;
  return path.endsWith("/") ? path : path + "/";
}

function pathFromCanonicalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["healthtimes.co.zw", "www.healthtimes.co.zw"].includes(url.hostname.toLowerCase())) {
      return null;
    }
    return normalizePath(url.pathname);
  } catch {
    return null;
  }
}

async function migratedStoryForPath(path: string) {
  const args = { p_path: normalizePath(path) };
  let doc: MigratedStoryDocument | null = null;
  try {
    doc = await rpc<MigratedStoryDocument | null>("ag05_public_story_teaser_document", args);
  } catch {
    // Fail closed during staged contract rollout: the legacy public document
    // still withholds Premium body_html and therefore yields immediate paywall.
    doc = await rpc<MigratedStoryDocument | null>("ag05_public_story_document", args);
  }
  return doc?.story_id ? mapMigratedStoryDocument(doc, stagingConfig.url) : null;
}

async function nativeStoryForPath(path: string) {
  try {
    const doc = await rpc<NativeStoryDocument | null>("newsroom_public_story_document", {
      p_path: normalizePath(path)
    });
    return doc?.story_id ? mapNativeStoryDocument(doc, stagingConfig.url) : null;
  } catch {
    return null;
  }
}

async function storyForPath(path: string) {
  const migrated = await migratedStoryForPath(path);
  if (migrated) return migrated;
  return nativeStoryForPath(path);
}

async function storyForCanonicalUrl(url: string | null) {
  const path = pathFromCanonicalUrl(url);
  return path ? storyForPath(path) : null;
}

async function nativeStoryForFeedRow(row: NativeFeedRow): Promise<ArticleDetail | null> {
  const requestedPath =
    pathFromCanonicalUrl(row.canonical_url) ??
    normalizePath("/" + row.slug);
  try {
    const legacy = await rpc<PathResolution | null>("ag05_resolve_public_path", {
      p_path: requestedPath
    });
    if (legacy && legacy.http_status !== 404 && legacy.target_path) {
      return null;
    }
  } catch {
    // Continue
  }

  const detailed = await nativeStoryForPath(requestedPath);
  if (detailed) return detailed;

  return {
    id: row.slug || String(row.id),
    canonicalStoryId: row.id,
    title: row.title?.trim() || row.slug,
    slug: row.slug,
    standfirst: row.standfirst ?? row.excerpt ?? null,
    excerpt: row.excerpt ?? row.standfirst ?? null,
    bodyHtml: row.body_html ?? null,
    canonicalUrl: row.canonical_url,
    accessPolicy: "public" as const,
    status: "published" as const,
    publishedAt: row.published_at,
    modifiedAt: row.modified_at,
    author: null,
    primarySection: null,
    geography: [],
    geographyRefs: [],
    topics: [],
    legacyTaxonomy: [],
    heroMedia: null,
    sourceProvenance: {
      system: "healthtimes-native" as const,
      sourceId: row.id,
      stableKey: "healthtimes-native-story:" + row.id,
      sourceUrl: row.canonical_url,
      checksum: null,
      capturedAt: null,
      exceptions: []
    },
    contentIntegrity: "verified" as const,
    premiumSourceContext: {
      accessPolicy: "public" as const,
      legacyMembershipSignal: "none" as const,
      providerReferencePresent: false,
      reconciliation: "match" as const
    }
  };
}

const DETAIL_BATCH_SIZE = 8;

async function mapInBatches<T, R>(
  items: T[],
  size: number,
  mapper: (item: T) => Promise<R>
) {
  const output: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(...await Promise.all(items.slice(index, index + size).map(mapper)));
  }
  return output;
}

function articleSort(a: ArticleDetail, b: ArticleDetail) {
  return (
    publishedTime(b.publishedAt) - publishedTime(a.publishedAt) ||
    publishedTime(b.modifiedAt) - publishedTime(a.modifiedAt) ||
    String(a.canonicalStoryId ?? a.id).localeCompare(String(b.canonicalStoryId ?? b.id))
  );
}

async function loadFeedDocuments(limit = FEED_LIMIT) {
  const boundedLimit = Math.max(1, Math.floor(limit));
  const canonicalFeed = boundedLimit === FEED_LIMIT;

  if (canonicalFeed && feedCache && Date.now() - feedCache.at < CACHE_MS) {
    return feedCache.articles;
  }
  if (canonicalFeed && feedLoadPromise) {
    return feedLoadPromise;
  }

  const load = async () => {
    let feed: FeedRow[] = [];
    let legacyError: Error | null = null;
    try {
      feed = await rpc<FeedRow[]>("ag05_public_feed_rows", { p_limit: boundedLimit });
    } catch (err) {
      legacyError = err instanceof Error ? err : new Error(String(err));
    }

    let nativeFeed: NativeFeedRow[] = [];
    let nativeError: Error | null = null;
    try {
      nativeFeed = await boundedRpcRows<NativeFeedRow>(
        "newsroom_public_published_stories",
        { p_slug: null },
        boundedLimit
      );
    } catch (err) {
      nativeError = err instanceof Error ? err : new Error(String(err));
    }

    if (legacyError && nativeError) {
      throw new Error(
        `HealthTimes public feed request failed: legacy (${legacyError.message}); native (${nativeError.message})`
      );
    }

    const [mappedMigrated, mappedNative] = await Promise.all([
      mapInBatches(
        (feed ?? []).map((row) => row.canonical_url),
        DETAIL_BATCH_SIZE,
        storyForCanonicalUrl
      ),
      mapInBatches(
        nativeFeed ?? [],
        DETAIL_BATCH_SIZE,
        nativeStoryForFeedRow
      )
    ]);

    const seenKeys = new Set<string>();
    const seenPaths = new Set<string>();
    const articles = [...mappedMigrated, ...mappedNative]
      .filter((article): article is ArticleDetail => Boolean(article))
      .sort(articleSort)
      .filter((article) => {
        const storyKey = article.canonicalStoryId
          ? "story:" + article.canonicalStoryId
          : (article.sourceProvenance?.system ?? "unknown") + ":" + article.id;
        const pathKey = article.slug ? "slug:" + article.slug.toLowerCase() : null;

        if (seenKeys.has(storyKey)) return false;
        if (pathKey && seenPaths.has(pathKey)) return false;

        seenKeys.add(storyKey);
        if (pathKey) seenPaths.add(pathKey);
        return true;
      })
      .slice(0, boundedLimit);

    if (canonicalFeed) {
      feedCache = { at: Date.now(), articles };
    }
    return articles;
  };

  if (!canonicalFeed) {
    return load();
  }

  const pending = load();
  feedLoadPromise = pending;
  try {
    return await pending;
  } finally {
    if (feedLoadPromise === pending) {
      feedLoadPromise = null;
    }
  }
}

const CONTEXT_LIMIT = 50;

async function loadContext(kind: "category" | "tag" | "author", slug: string): Promise<ArticleDetail[]> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return [];

  let legacyDoc: ContextDocument | null = null;
  let legacyFailed = false;

  try {
    legacyDoc = await rpc<ContextDocument | null>("ag05_public_context_document", {
      p_path: "/" + kind + "/" + encodeURIComponent(normalizedSlug) + "/"
    });
  } catch {
    legacyFailed = true;
  }

  let nativeDoc: ContextDocument | null = null;
  let nativeFailed = false;

  if (kind === "category" || kind === "author") {
    try {
      nativeDoc = await rpc<ContextDocument | null>("newsroom_public_context_document", {
        p_kind: kind === "category" ? "section" : kind,
        p_slug: normalizedSlug,
        p_limit: CONTEXT_LIMIT
      });
    } catch {
      try {
        nativeDoc = await rpc<ContextDocument | null>("newsroom_public_context_document", {
          p_path: "/" + kind + "/" + encodeURIComponent(normalizedSlug) + "/"
        });
      } catch {
        nativeFailed = true;
      }
    }
  }

  if (legacyFailed && (kind === "tag" || nativeFailed)) {
    throw new Error(`Dual context resolution failed closed for ${kind}:${slug}`);
  }

  const legacyItems = legacyDoc?.items ?? [];
  const nativeItems = nativeDoc?.items ?? [];

  if (legacyItems.length === 0 && nativeItems.length === 0) {
    return [];
  }

  const urls = [
    ...legacyItems.map((item) => item.canonical_url ?? null),
    ...nativeItems.map((item) => item.canonical_url ?? null)
  ].filter((url): url is string => Boolean(url));

  const uniqueUrls = Array.from(new Set(urls));

  const mapped = await mapInBatches(
    uniqueUrls,
    DETAIL_BATCH_SIZE,
    storyForCanonicalUrl
  );

  const articles = mapped.filter((article): article is ArticleDetail => Boolean(article));

  const seenKeys = new Set<string>();
  const seenPaths = new Set<string>();

  const deduped = articles.filter((article) => {
    const storyKey = article.canonicalStoryId
      ? "story:" + article.canonicalStoryId
      : (article.sourceProvenance?.system ?? "unknown") + ":" + article.id;
    const pathKey = article.slug ? "slug:" + article.slug.toLowerCase() : null;

    if (seenKeys.has(storyKey)) return false;
    if (pathKey && seenPaths.has(pathKey)) return false;

    seenKeys.add(storyKey);
    if (pathKey) seenPaths.add(pathKey);
    return true;
  });

  deduped.sort((a, b) => {
    const timeA = publishedTime(a.publishedAt);
    const timeB = publishedTime(b.publishedAt);
    if (timeA !== timeB) return timeB - timeA;
    const modA = publishedTime(a.modifiedAt);
    const modB = publishedTime(b.modifiedAt);
    if (modA !== modB) return modB - modA;
    return (a.canonicalStoryId || a.id).localeCompare(b.canonicalStoryId || b.id);
  });

  return deduped.slice(0, CONTEXT_LIMIT);
}

function cachedArticleForIdentity(id: string) {
  if (!feedCache || Date.now() - feedCache.at >= CACHE_MS) return null;
  return feedCache.articles.find(
    (article) => article.id === id || article.slug === id || article.canonicalStoryId === id
  ) ?? null;
}

function requestedPathForIdentity(id: string) {
  const identity = id.trim();
  if (!identity) return null;

  if (/^https?:\/\//i.test(identity)) {
    return pathFromCanonicalUrl(identity);
  }
  if (identity.startsWith("/")) {
    return normalizePath(identity);
  }

  // Source-parity cards use source-<slug> IDs. In staging those stories are
  // also present in the migrated corpus, so strip only the routing prefix and
  // resolve the canonical public slug before considering any feed fallback.
  const routeIdentity = identity.startsWith("source-")
    ? identity.slice("source-".length)
    : identity;

  try {
    return normalizePath("/" + decodeURIComponent(routeIdentity));
  } catch {
    return normalizePath("/" + routeIdentity);
  }
}

async function resolveIdentityDirect(id: string) {
  const requestedPath = requestedPathForIdentity(id);
  if (!requestedPath) return null;

  let migratedPath = requestedPath;
  let explicitLegacy404 = false;

  try {
    const resolution = await rpc<PathResolution | null>("ag05_resolve_public_path", {
      p_path: requestedPath
    });
    if (resolution?.http_status === 404) {
      explicitLegacy404 = true;
    } else if (resolution?.target_path) {
      migratedPath = normalizePath(resolution.target_path);
    }
  } catch {
    // The direct story documents remain independently authoritative fallbacks.
  }

  if (!explicitLegacy404) {
    try {
      const migrated = await migratedStoryForPath(migratedPath);
      if (migrated) return migrated;
    } catch {
      // Continue to native direct resolution before any feed fallback.
    }
  }

  return nativeStoryForPath(requestedPath);
}

async function resolveIdentity(id: string) {
  const cached = cachedArticleForIdentity(id);
  if (cached) return cached;

  const direct = await resolveIdentityDirect(id);
  if (direct) return direct;

  // Opaque identities that cannot be represented as a public path retain a
  // bounded compatibility fallback. Normal slug/path/URL navigation never
  // reaches this full-feed traversal when direct resolution succeeds.
  return (await loadFeedDocuments()).find(
    (article) => article.id === id || article.slug === id || article.canonicalStoryId === id
  ) ?? null;
}

const articleRepository: ArticleRepository = {
  async getHome() {
    return loadFeedDocuments();
  },

  async getById(id) {
    return resolveIdentity(id);
  },

  async getRelated(id) {
    const current = await resolveIdentity(id);
    if (!current) return [];
    if (current.primarySection?.slug) {
      const section = await loadContext("category", current.primarySection.slug);
      return section.filter((article) => article.id !== current.id).slice(0, 3);
    }
    return (await loadFeedDocuments()).filter((article) => article.id !== current.id).slice(0, 3);
  },

  async listBySection(sectionSlug) {
    return loadContext("category", sectionSlug);
  },

  async listByAuthor(authorSlug) {
    return loadContext("author", authorSlug);
  }
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function publishedTime(value: string | null) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

async function corpusAuthors() {
  const articles = await loadFeedDocuments(200);
  const authors = new Map<string, AuthorProfile>();
  for (const article of articles) {
    const author = article.author;
    if (!author) continue;
    const existing = authors.get(author.slug);
    authors.set(author.slug, {
      id: author.id,
      displayName: author.displayName,
      slug: author.slug,
      role: existing?.role ?? null,
      bio: existing?.bio ?? null,
      sourceUrl: author.sourceProvenance?.sourceUrl ?? null,
      sourceProvenance: author.sourceProvenance ?? null
    });
  }
  return Array.from(authors.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

const searchService: SearchService = {
  async search(query: SearchQuery): Promise<SearchResult> {
    const q = query.text.trim();
    const all = await loadFeedDocuments(200);
    const articleMatches = query.format && query.format !== "article"
      ? []
      : all
          .filter((article) => {
            if (query.country) {
              const country = normalized(query.country);
              if (!article.geography.some(
                (zone) => normalized(zone.name) === country || normalized(zone.slug) === country
              )) return false;
            }
            if (query.topic) {
              const topic = normalized(query.topic);
              const sectionMatch =
                normalized(article.primarySection?.name ?? "") === topic ||
                normalized(article.primarySection?.slug ?? "") === topic;
              if (!sectionMatch) return false;
            }
            return true;
          })
          .map((article) => ({
            article,
            score: scoreReaderSearch(q, {
              title: article.title,
              slug: article.slug,
              standfirst: article.standfirst,
              excerpt: article.excerpt,
              author: article.author?.displayName ?? null,
              section: article.primarySection?.name ?? null,
              taxonomy: [],
              geography: [],
              publishedAt: article.publishedAt
            })
          }))
          .filter((entry): entry is { article: ArticleDetail; score: number } => entry.score !== null)
          .sort(
            (a, b) =>
              b.score - a.score ||
              publishedTime(b.article.publishedAt) - publishedTime(a.article.publishedAt)
          )
          .map((entry) => entry.article);

    const authorMatches = query.format
      ? []
      : (await corpusAuthors())
          .map((author) => ({
            author,
            score: scoreReaderSearch(q, {
              title: author.displayName,
              excerpt: author.bio,
              author: author.displayName
            })
          }))
          .filter((entry): entry is { author: AuthorProfile; score: number } => entry.score !== null)
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.author);

    const videos = query.country || query.topic || (query.format && query.format !== "video")
      ? []
      : await sourceParityServices.video.list();

    return {
      articles: articleMatches,
      authors: authorMatches,
      videos,
      audio: [],
      live: []
    };
  }
};

const taxonomyService: TaxonomyService = {
  async getSnapshot() {
    const canonical = await certifiedTaxonomyFixtureService.getSnapshot();
    const articles = await loadFeedDocuments(200);
    const observedSections = Array.from(
      new Map(
        articles
          .map((article) => article.primarySection)
          .filter((section): section is TaxonomyRef => Boolean(section))
          .map((section) => [section.slug, { ...section, parentId: null }])
      ).values()
    );
    return {
      ...canonical,
      sections: observedSections.length ? observedSections : canonical.sections
    };
  }
};

const stagingAdvertisingService: AdvertisingService = {
  async getDecision(placementKey, context) {
    if(placementKey!=="hospaz-header-direct"){
      return sourceParityServices.advertising.getDecision(placementKey,context);
    }
    try{
      const raw=await rpc<Cp5HospazRaw | null>("ag05_hospaz_direct_ad_preview",{});
      const capability=projectCp5HospazCapability(raw,stagingConfig.url);
      return directDecisionFromHospazCapability(capability,placementKey);
    }catch{
      return {
        placementKey,
        source:"none",
        personalization:"none",
        disclosureLabel:"Advertisement",
        policyReason:"Direct advertising capability is unavailable. No fallback destination or campaign state is invented."
      };
    }
  }
};

const publicationRepository: PublicationRepository = {
  async getProfile() {
    return sourceParityServices.publication.getProfile();
  },

  async listAuthors() {
    return corpusAuthors();
  },

  async getAuthor(slug) {
    const contextArticles = await loadContext("author", slug);
    const author = contextArticles.map((article) => article.author).find(Boolean);
    if (author) {
      return {
        id: author.id,
        displayName: author.displayName,
        slug: author.slug,
        role: null,
        bio: null,
        sourceUrl: author.sourceProvenance?.sourceUrl ?? null,
        sourceProvenance: author.sourceProvenance ?? null
      };
    }
    return (await corpusAuthors()).find((candidate) => candidate.slug === slug) ?? null;
  }
};

export const migratedCorpusServices = {
  ...sourceParityServices,
  articles: articleRepository,
  search: searchService,
  taxonomy: taxonomyService,
  publication: publicationRepository,
  advertising: stagingAdvertisingService,
  presentation: publicPresentationService,
  video: publicVideoService,
  live: publicLiveService
};

export const migratedCorpusStatus = {
  mode: "accepted-staging-migrated-corpus" as const,
  projectRef: stagingConfig.expectedProjectRef,
  publicObjects: 5786,
  canonicalMedia: 3275,
  totalMigratedMediaObjects: 5705,
  cp5Functions: [
    "ag05_resolve_public_path",
    "ag05_public_story_teaser_document",
    "ag05_public_story_document",
    "ag05_public_context_document",
    "ag05_public_feed_rows",
    "ag05_hospaz_direct_ad_preview"
  ] as const,
  nativePublicFunctions: [
    "newsroom_public_story_document",
    "newsroom_public_published_stories",
    "newsroom_public_context_document"
  ] as const
};
