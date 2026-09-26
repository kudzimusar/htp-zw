import type { ArticleDetail } from "../domain/models";

export type NativeStoryDocument = {
  story_id: string;
  source_id?: null;
  source_type?: "native-story" | string | null;
  source_url?: null;
  old_path?: string | null;
  new_path?: string | null;
  handling?: "native_cms" | string | null;
  http_status?: number | null;
  title: string | null;
  story_title: string | null;
  description: string | null;
  canonical_url: string | null;
  published_at: string | null;
  modified_at: string | null;
  author: { name?: string | null; slug?: string | null; bio?: string | null } | null;
  section: { name?: string | null; slug?: string | null } | null;
  access_policy: string | null;
  body_html: string | null;
  standfirst: string | null;
  excerpt: string | null;
  featured_storage_bucket: string | null;
  featured_storage_object: string | null;
  featured_public_url: string | null;
  featured_alt_text: string | null;
  featured_caption: string | null;
  featured_credit: string | null;
  featured_checksum: string | null;
};

function normalizePath(value: string | null) {
  if (!value) return null;
  const path = value.startsWith("/") ? value : "/" + value;
  return path.endsWith("/") ? path : path + "/";
}

function pathFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return normalizePath(new URL(value).pathname);
  } catch {
    return null;
  }
}

function slugFromPath(value: string | null) {
  const path = normalizePath(value);
  return path?.split("/").filter(Boolean).at(-1) ?? "";
}

function deterministicSlug(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safePublicMediaUrl(
  value: string | null,
  storageBucket: string | null,
  publicOrigin?: string | null
) {
  if (!value) return null;
  if (storageBucket && storageBucket !== "newsroom-public") return null;

  const publicPrefix = "/storage/v1/object/public/newsroom-public/";
  try {
    const base = publicOrigin ? new URL(publicOrigin) : null;
    const parsed = value.startsWith("/")
      ? (base ? new URL(value, base.origin) : null)
      : new URL(value);
    if (!parsed || parsed.protocol !== "https:") return null;
    if (!parsed.pathname.startsWith(publicPrefix)) return null;
    if (parsed.pathname.toLowerCase().includes("newsroom-private")) return null;
    if (parsed.pathname.includes("/storage/v1/object/sign/")) return null;
    if (parsed.pathname.includes("/storage/v1/object/authenticated/")) return null;
    if (base && parsed.origin !== base.origin) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function mapNativeStoryDocument(
  doc: NativeStoryDocument,
  publicOrigin?: string | null
): ArticleDetail {
  const rawAccess = (doc.access_policy ?? "premium").trim().toLowerCase();
  const accessPolicy = rawAccess === "public" ? "public" as const : "premium" as const;
  const canonicalPath =
    normalizePath(doc.old_path ?? null) ??
    pathFromUrl(doc.canonical_url) ??
    normalizePath(doc.new_path ?? null);
  const slug = slugFromPath(canonicalPath) || String(doc.story_id);
  const authorName = doc.author?.name?.trim() || null;
  const authorSlug = deterministicSlug(doc.author?.slug || authorName);
  const sectionName = doc.section?.name?.trim() || null;
  const sectionSlug = deterministicSlug(doc.section?.slug || sectionName);
  const publicMediaUrl = safePublicMediaUrl(
    doc.featured_public_url,
    doc.featured_storage_bucket,
    publicOrigin
  );
  const mediaStableKey = doc.featured_storage_object
    ? "newsroom-public:" + doc.featured_storage_object
    : "healthtimes-native-featured:" + doc.story_id;

  return {
    id: slug,
    canonicalStoryId: doc.story_id,
    title: doc.story_title?.trim() || doc.title?.trim() || slug,
    slug,
    standfirst: doc.standfirst ?? doc.description ?? null,
    excerpt: doc.excerpt ?? doc.description ?? null,
    bodyHtml: accessPolicy === "public" ? doc.body_html : null,
    canonicalUrl: doc.canonical_url,
    accessPolicy,
    status: "published",
    publishedAt: doc.published_at,
    modifiedAt: doc.modified_at,
    author: authorName ? {
      id: "healthtimes-native-author:" + (authorSlug || doc.story_id),
      displayName: authorName,
      slug: authorSlug || "author-" + doc.story_id,
      sourceProvenance: {
        system: "healthtimes-native",
        sourceId: null,
        stableKey: "healthtimes-native-author:" + (authorSlug || doc.story_id),
        sourceUrl: null,
        checksum: null,
        capturedAt: null,
        exceptions: []
      }
    } : null,
    primarySection: sectionName ? {
      id: "healthtimes-native-section:" + (sectionSlug || doc.story_id),
      name: sectionName,
      slug: sectionSlug || "section-" + doc.story_id
    } : null,
    geography: [],
    geographyRefs: [],
    topics: [],
    legacyTaxonomy: [],
    heroMedia: publicMediaUrl ? {
      id: mediaStableKey,
      publicUrl: publicMediaUrl,
      altText: doc.featured_alt_text,
      caption: doc.featured_caption,
      credit: doc.featured_credit,
      sourceProvenance: {
        system: "healthtimes-native",
        sourceId: doc.featured_storage_object,
        stableKey: mediaStableKey,
        sourceUrl: publicMediaUrl,
        checksum: doc.featured_checksum,
        capturedAt: null,
        exceptions: []
      }
    } : null,
    sourceProvenance: {
      system: "healthtimes-native",
      sourceId: doc.story_id,
      stableKey: "healthtimes-native-story:" + doc.story_id,
      sourceUrl: doc.canonical_url,
      checksum: null,
      capturedAt: null,
      exceptions: []
    },
    contentIntegrity: "verified",
    premiumSourceContext: {
      accessPolicy,
      legacyMembershipSignal: "none",
      providerReferencePresent: false,
      reconciliation: "match"
    }
  };
}
