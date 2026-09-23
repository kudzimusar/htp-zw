import type {
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
import {
  mapMigratedStoryDocument,
  type MigratedStoryDocument
} from "./migrated-corpus-mapper";

type FeedRow = {
  title: string;
  canonical_url: string | null;
  published_at: string | null;
  modified_at: string | null;
  author_name: string | null;
  description: string | null;
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

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = getStagingSupabaseClient() as any;
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message || "HealthTimes migrated-corpus request failed.");
  }
  return data as T;
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

async function storyForPath(path: string) {
  const doc = await rpc<MigratedStoryDocument | null>("ag05_public_story_document", {
    p_path: normalizePath(path)
  });
  return doc?.story_id ? mapMigratedStoryDocument(doc, stagingConfig.url) : null;
}

async function storyForCanonicalUrl(url: string | null) {
  const path = pathFromCanonicalUrl(url);
  return path ? storyForPath(path) : null;
}

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

async function loadFeedDocuments(limit = FEED_LIMIT) {
  if (limit === FEED_LIMIT && feedCache && Date.now() - feedCache.at < CACHE_MS) {
    return feedCache.articles;
  }
  const feed = await rpc<FeedRow[]>("ag05_public_feed_rows", { p_limit: limit });
  const mapped = await mapInBatches(
    (feed ?? []).map((row) => row.canonical_url),
    8,
    storyForCanonicalUrl
  );
  const articles = mapped.filter((article): article is ArticleDetail => Boolean(article));
  if (limit === FEED_LIMIT) {
    feedCache = { at: Date.now(), articles };
  }
  return articles;
}

async function loadContext(kind: "category" | "tag" | "author", slug: string) {
  const context = await rpc<ContextDocument | null>("ag05_public_context_document", {
    p_path: "/" + kind + "/" + encodeURIComponent(slug) + "/"
  });
  if (!context?.items) return [];
  const mapped = await mapInBatches(
    context.items.map((item) => item.canonical_url ?? null),
    8,
    storyForCanonicalUrl
  );
  return mapped.filter((article): article is ArticleDetail => Boolean(article));
}

async function resolveIdentity(id: string) {
  const cached = (await loadFeedDocuments()).find(
    (article) => article.id === id || article.slug === id || article.canonicalStoryId === id
  );
  if (cached) return cached;

  let requestedPath: string;
  if (/^https?:\/\//i.test(id)) {
    const path = pathFromCanonicalUrl(id);
    if (!path) return null;
    requestedPath = path;
  } else if (id.startsWith("/")) {
    requestedPath = normalizePath(id);
  } else {
    requestedPath = normalizePath("/" + decodeURIComponent(id));
  }

  const resolution = await rpc<PathResolution | null>("ag05_resolve_public_path", {
    p_path: requestedPath
  });
  if (!resolution || resolution.http_status === 404 || !resolution.target_path) return null;
  return storyForPath(resolution.target_path);
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
  publication: publicationRepository
};

export const migratedCorpusStatus = {
  mode: "accepted-staging-migrated-corpus" as const,
  projectRef: stagingConfig.expectedProjectRef,
  publicObjects: 5786,
  canonicalMedia: 3275,
  totalMigratedMediaObjects: 5705,
  cp5Functions: [
    "ag05_resolve_public_path",
    "ag05_public_story_document",
    "ag05_public_context_document",
    "ag05_public_feed_rows"
  ] as const
};
