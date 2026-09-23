import type { ArticleDetail } from "../domain/models";

export type PublicWebStoryCapability = {
  capabilityVersion: string;
  kind: "story";
  routing: {
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

export function storyFromPublicCapability(capability: PublicWebStoryCapability): ArticleDetail {
  const sourceId = capability.routing.sourceId ?? "unknown";
  const canonicalUrl = capability.routing.canonicalUrl || capability.seo.canonicalUrl;
  const canonicalPath = (() => {
    try { return new URL(canonicalUrl).pathname; } catch { return "/"; }
  })();
  const slug = canonicalPath.split("/").filter(Boolean).at(-1) ?? "story";
  const author = capability.content.author?.name ? {
    id: "cp5-author-" + (capability.content.author.slug || "healthtimes"),
    displayName: capability.content.author.name,
    slug: capability.content.author.slug || "healthtimes"
  } : null;
  const primarySection = capability.content.section?.name ? {
    id: "cp5-section-" + (capability.content.section.slug || "healthtimes"),
    name: capability.content.section.name,
    slug: capability.content.section.slug || "healthtimes"
  } : null;
  const premium = capability.content.bodyProtected || String(capability.content.accessPolicy || "").toLowerCase() !== "public";

  return {
    id: "cp5-source-" + sourceId,
    canonicalStoryId: null,
    title: capability.content.storyTitle || capability.seo.title,
    slug,
    standfirst: capability.content.standfirst,
    excerpt: capability.content.excerpt || capability.content.protectedPreview,
    bodyHtml: capability.content.bodyProtected ? null : capability.content.bodyHtml,
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
      id: "cp5-media-" + sourceId,
      publicUrl: capability.content.featuredMedia.publicUrl,
      altText: capability.content.featuredMedia.altText,
      caption: null,
      credit: null
    } : null,
    contentIntegrity: "verified",
    premiumSourceContext: {
      accessPolicy: premium ? "premium" : "public",
      legacyMembershipSignal: premium ? "wordpress-premium" : "none",
      providerReferencePresent: false,
      reconciliation: "match"
    }
  };
}

export async function fetchPublicWebCapability(pathname: string): Promise<PublicWebCapability | null> {
  if (typeof fetch !== "function") return null;
  try {
    const response = await fetch("/api/public?kind=resolve&path=" + encodeURIComponent(pathname), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const value = await response.json() as PublicWebCapability;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function injectedPublicWebCapability(): PublicWebCapability | null {
  const value = (globalThis as typeof globalThis & {
    __HTP_PHASE4_CAPABILITY__?: PublicWebCapability;
  }).__HTP_PHASE4_CAPABILITY__;
  return value && typeof value === "object" ? value : null;
}
