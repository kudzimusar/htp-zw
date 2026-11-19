import type { ArticleDetail } from "../domain/models";

export type PublicWebStoryCapability = {
  capabilityVersion: string;
  kind: "story";
  routing: {
    storyId?: string | null;
    sourceId: string | null;
    sourceType: string | null;
    sourceUrl: string | null;
    handling: string | null;
    canonicalUrl: string;
    httpStatus: number;
  };
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
    openGraph: {
      type: string;
      siteName: string;
      title: string;
      description: string;
      url: string;
      image: string | null;
    };
    twitterCard: string;
    structuredData: Record<string, unknown>;
  };
  content: {
    storyTitle: string;
    standfirst: string | null;
    excerpt: string | null;
    publishedAt: string | null;
    modifiedAt: string | null;
    author: { name?: string; slug?: string } | null;
    section: { name?: string; slug?: string } | null;
    accessPolicy: string | null;
    bodyProtected: boolean;
    bodyHtml: string | null;
    premiumTeaserHtml?: string | null;
    protectedPreview: string | null;
    featuredMedia: {
      publicUrl: string;
      sourceUrl: string | null;
      storageObject: string | null;
      altText: string | null;
    } | null;
  };
};

export type PublicWebContextCapability = {
  capabilityVersion: string;
  kind: "context";
  contextKind: string | null;
  slug: string | null;
  name: string;
  path: string;
  routingDisposition: string | null;
  seo: {
    title: string;
    canonicalUrl: string;
    robots: string;
    openGraph: {
      type: string;
      siteName: string;
      title: string;
      url: string;
    };
    twitterCard: string;
    structuredData: Record<string, unknown>;
  };
  items: unknown[];
};

export type PublicWebRouteCapability = {
  capabilityVersion?: string;
  kind: "route";
  path?: string;
  routing?: {
    httpStatus?: number;
    resolution?: string;
    targetPath?: string | null;
  };
};

export type PublicWebCapability =
  | PublicWebStoryCapability
  | PublicWebContextCapability
  | PublicWebRouteCapability;

function normalizedSlugFromPath(pathname: string): string {
  return pathname.split("/").filter(Boolean).at(-1)?.trim() ?? "";
}

function canonicalSlugForCapability(capability: PublicWebStoryCapability): string {
  const candidates = [
    capability.routing?.canonicalUrl,
    capability.seo?.canonicalUrl,
    capability.routing?.sourceUrl
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const slug = normalizedSlugFromPath(new URL(candidate).pathname);
      if (slug) return slug;
    } catch {
      const slug = normalizedSlugFromPath(candidate);
      if (slug) return slug;
    }
  }
  const sourceId = capability.routing?.sourceId?.trim();
  const storyId = capability.routing?.storyId?.trim();
  return storyId || sourceId || "story";
}

function normalizedLegacyPath(canonicalUrl: string): string | undefined {
  try {
    const pathname = new URL(canonicalUrl).pathname;
    if (!pathname) return undefined;
    return pathname.endsWith("/") ? pathname : pathname + "/";
  } catch {
    return undefined;
  }
}

export function storyFromPublicCapability(capability: PublicWebStoryCapability): ArticleDetail {
  const sourceId = capability.routing.sourceId?.trim() || null;
  const canonicalStoryId = capability.routing.storyId?.trim() || null;
  const canonicalUrl = capability.routing.canonicalUrl || capability.seo.canonicalUrl;
  const slug = canonicalSlugForCapability(capability);
  const sourceType = capability.routing.sourceType || "post";
  const authorSlug = capability.content.author?.slug?.trim() || null;
  const author = capability.content.author?.name ? {
    id: authorSlug ? "wordpress-author:" + authorSlug : "wordpress-author:healthtimes",
    displayName: capability.content.author.name,
    slug: authorSlug || "healthtimes"
  } : null;
  const sectionSlug = capability.content.section?.slug?.trim() || null;
  const primarySection = capability.content.section?.name ? {
    id: sectionSlug ? "migrated-section:" + sectionSlug : "migrated-section:healthtimes",
    name: capability.content.section.name,
    slug: sectionSlug || "healthtimes"
  } : null;
  const premium = capability.content.bodyProtected || String(capability.content.accessPolicy || "").toLowerCase() !== "public";
  const legacyPath = normalizedLegacyPath(canonicalUrl);

  return {
    id: slug,
    canonicalStoryId,
    title: capability.content.storyTitle || capability.seo.title,
    slug,
    standfirst: capability.content.standfirst,
    excerpt: capability.content.excerpt || capability.content.protectedPreview,
    bodyHtml: premium ? null : capability.content.bodyHtml,
    premiumTeaserHtml: premium ? (capability.content.premiumTeaserHtml ?? null) : null,
    canonicalUrl,
    accessPolicy: premium ? "premium" : "public",
    status: "published",
    publishedAt: capability.content.publishedAt,
    modifiedAt: capability.content.modifiedAt,
    author,
    primarySection,
    geography: [],
    topics: [],
    legacyTaxonomy: [],
    heroMedia: capability.content.featuredMedia ? {
      id: capability.content.featuredMedia.storageObject
        ? "migrated-media:" + capability.content.featuredMedia.storageObject
        : "source-media:" + String(sourceId ?? canonicalStoryId ?? slug),
      publicUrl: capability.content.featuredMedia.publicUrl,
      altText: capability.content.featuredMedia.altText,
      caption: null,
      credit: null
    } : null,
    sourceProvenance: {
      system: "wordpress",
      sourceId,
      stableKey: sourceId ? "wordpress-" + sourceType + ":" + sourceId : null,
      sourceUrl: capability.routing.sourceUrl ?? canonicalUrl,
      checksum: null,
      capturedAt: null,
      wordpress: {
        postId: sourceId ?? undefined,
        legacyPath
      },
      exceptions: []
    },
    contentIntegrity: "verified",
    premiumSourceContext: {
      accessPolicy: premium ? "premium" : "public",
      legacyMembershipSignal: premium ? "wordpress-premium" : "none",
      providerReferencePresent: false,
      reconciliation: "match"
    }
  };
}

/**
 * Resolves a public-web story capability into the Reader's established canonical
 * article identity using the active article repository when available, without
 * inventing synthetic source-prefix IDs or mapping unknown sources to arbitrary stories.
 */
export async function resolveCanonicalStoryFromPublicCapability(
  capability: PublicWebStoryCapability,
  repository: { getById: (id: string) => Promise<ArticleDetail | null> }
): Promise<ArticleDetail> {
  const fallback = storyFromPublicCapability(capability);
  const lookupKeys = [
    fallback.canonicalStoryId,
    fallback.slug,
    fallback.sourceProvenance?.wordpress?.legacyPath
  ].filter((value, index, all): value is string => Boolean(value && value.trim()) && all.indexOf(value) === index);

  for (const key of lookupKeys) {
    try {
      const resolved = await repository.getById(key);
      if (!resolved) continue;
      // Only accept a repository match whose identity actually corresponds to this capability
      // (same canonicalStoryId, same slug, or same WordPress sourceId). Never map to an arbitrary story.
      const sameCanonical = Boolean(
        fallback.canonicalStoryId &&
        resolved.canonicalStoryId &&
        resolved.canonicalStoryId === fallback.canonicalStoryId
      );
      const sameSlug = Boolean(
        fallback.slug &&
        resolved.slug &&
        resolved.slug.toLowerCase() === fallback.slug.toLowerCase()
      );
      const sameSourceId = Boolean(
        fallback.sourceProvenance?.sourceId &&
        resolved.sourceProvenance?.sourceId &&
        resolved.sourceProvenance.sourceId === fallback.sourceProvenance.sourceId
      );
      if (sameCanonical || sameSlug || sameSourceId) {
        // Preserve fail-closed Premium classification if either authority marks it premium.
        if (fallback.accessPolicy === "premium" && resolved.accessPolicy !== "premium") {
          return {
            ...resolved,
            accessPolicy: "premium",
            bodyHtml: null,
            premiumTeaserHtml: resolved.premiumTeaserHtml ?? fallback.premiumTeaserHtml ?? null
          };
        }
        return resolved;
      }
    } catch {
      // Fall through to next key or canonical capability fallback.
    }
  }
  return fallback;
}

export async function fetchPublicWebCapability(pathname: string): Promise<PublicWebCapability | null> {
  if (typeof fetch !== "function") return null;
  try {
    // redirect=json: a real 301 would be followed by fetch() into a static
    // page, so alias decisions are requested as data and applied in-app.
    const response = await fetch("/api/public?kind=resolve&redirect=json&path=" + encodeURIComponent(pathname), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const value = await response.json() as PublicWebCapability;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

const CAPABILITY_KINDS = new Set(["story", "context", "route"]);

/** Parse the non-executable capability block injected by api/public.js kind=page. */
export function parseInjectedCapabilityText(text: string | null | undefined): PublicWebCapability | null {
  if (!text || text.length > 2_000_000) return null;
  try {
    const value = JSON.parse(text) as PublicWebCapability;
    return value && typeof value === "object" && CAPABILITY_KINDS.has(String((value as { kind?: unknown }).kind)) ? value : null;
  } catch {
    return null;
  }
}

/** Only same-site absolute paths may be followed; never a scheme, host or protocol-relative URL. */
export function safeInternalRedirectTarget(target: unknown): string | null {
  if (typeof target !== "string") return null;
  const value = target.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.length > 512 || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}

function comparablePath(value: string | null | undefined): string {
  const path = String(value || "").trim().replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The server block is valid only for the address it was rendered for. */
export function injectedCapabilityMatchesPath(blockPath: string | null | undefined, pathname: string | null | undefined): boolean {
  if (!blockPath || !pathname) return false;
  return comparablePath(blockPath) === comparablePath(pathname);
}

export function injectedPublicWebCapability(pathname?: string): PublicWebCapability | null {
  const value = (globalThis as typeof globalThis & {
    __HTP_PHASE4_CAPABILITY__?: PublicWebCapability;
  }).__HTP_PHASE4_CAPABILITY__;
  if (value && typeof value === "object") return value;
  const doc = (globalThis as typeof globalThis & {
    document?: { getElementById?: (id: string) => { textContent?: string | null; getAttribute?: (name: string) => string | null } | null };
  }).document;
  if (!doc || typeof doc.getElementById !== "function") return null;
  const block = doc.getElementById("htp-public-capability");
  if (!block) return null;
  const blockPath = typeof block.getAttribute === "function" ? block.getAttribute("data-path") : null;
  // Compare with the address the browser actually loaded (what the server
  // rendered for); router pathnames can differ in form during hydration.
  const location = (globalThis as typeof globalThis & { location?: { pathname?: unknown } }).location;
  const current = typeof location?.pathname === "string" ? location.pathname : pathname;
  if (!injectedCapabilityMatchesPath(blockPath, current)) return null;
  return parseInjectedCapabilityText(block.textContent);
}
