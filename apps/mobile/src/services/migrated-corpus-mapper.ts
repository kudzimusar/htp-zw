import type { ArticleDetail } from "../domain/models";
import type { SourceException } from "../domain/source";

export type MigratedStoryDocument = {
  story_id: string;
  source_id: string | null;
  source_type: "post" | "page" | string | null;
  source_url: string | null;
  old_path: string | null;
  new_path: string | null;
  handling: string | null;
  http_status: number | null;
  title: string | null;
  story_title: string | null;
  description: string | null;
  canonical_url: string | null;
  featured_storage_object: string | null;
  featured_source_url: string | null;
  featured_alt_text: string | null;
  published_at: string | null;
  modified_at: string | null;
  author: { name?: string | null; slug?: string | null; bio?: string | null } | null;
  section: { name?: string | null; slug?: string | null } | null;
  access_policy: string | null;
  body_html: string | null;
  standfirst: string | null;
  excerpt: string | null;
};

function pathFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

function normalizePath(value: string | null) {
  if (!value) return null;
  const path = value.startsWith("/") ? value : "/" + value;
  return path.endsWith("/") ? path : path + "/";
}

function slugFromPath(value: string | null) {
  const path = normalizePath(value);
  return path?.split("/").filter(Boolean).at(-1) ?? "";
}

function migratedMediaUrl(stagingUrl: string, objectName: string | null) {
  if (!objectName) return null;
  const encoded = objectName.split("/").map(encodeURIComponent).join("/");
  return stagingUrl.replace(/\/$/, "") + "/storage/v1/object/public/migrated-media/" + encoded;
}

export function mapMigratedStoryDocument(
  doc: MigratedStoryDocument,
  stagingUrl: string
): ArticleDetail {
  const rawAccess = (doc.access_policy ?? "unknown").trim().toLowerCase();
  const accessPolicy = rawAccess === "public" ? "public" as const : "premium" as const;
  const canonicalPath =
    normalizePath(doc.old_path) ??
    normalizePath(pathFromUrl(doc.canonical_url)) ??
    normalizePath(doc.new_path);
  const slug = slugFromPath(canonicalPath) || String(doc.source_id ?? doc.story_id);
  const sourceType = doc.source_type ?? "unknown";
  const exceptions: SourceException[] = [];

  if (rawAccess !== "public" && rawAccess !== "premium") {
    exceptions.push({
      kind: "premium-history-unresolved",
      classification: "requires-review",
      field: "accessPolicy",
      note: "Migrated access marker " + rawAccess + " is preserved; the public Reader fails closed."
    });
  }

  if (doc.featured_source_url && !doc.featured_storage_object) {
    exceptions.push({
      kind: "missing-media",
      classification: "requires-review",
      field: "heroMedia",
      note: "The accepted public document exposes source media but no canonical migrated-media object."
    });
  }

  const authorSlug = doc.author?.slug?.trim() || null;
  const sectionSlug = doc.section?.slug?.trim() || null;
  const canonicalMedia = migratedMediaUrl(stagingUrl, doc.featured_storage_object);
  const heroUrl = canonicalMedia ?? doc.featured_source_url ?? null;

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
    author: doc.author?.name && authorSlug ? {
      id: "wordpress-author:" + authorSlug,
      displayName: String(doc.author.name),
      slug: authorSlug,
      sourceProvenance: {
        system: "wordpress",
        sourceId: null,
        stableKey: "wordpress-author:" + authorSlug,
        sourceUrl: null,
        checksum: null,
        capturedAt: null,
        exceptions: []
      }
    } : null,
    primarySection: sectionSlug ? {
      id: "migrated-section:" + sectionSlug,
      name: String(doc.section?.name ?? sectionSlug),
      slug: sectionSlug
    } : null,
    geography: [],
    geographyRefs: [],
    topics: [],
    legacyTaxonomy: [],
    heroMedia: heroUrl ? {
      id: doc.featured_storage_object
        ? "migrated-media:" + doc.featured_storage_object
        : "source-media:" + String(doc.source_id ?? doc.story_id),
      publicUrl: heroUrl,
      altText: doc.featured_alt_text,
      caption: null,
      credit: null,
      sourceProvenance: {
        system: "wordpress",
        sourceId: null,
        stableKey: doc.featured_storage_object
          ? "migrated-media:" + doc.featured_storage_object
          : null,
        sourceUrl: doc.featured_source_url,
        checksum: null,
        capturedAt: null,
        exceptions: doc.featured_source_url && !doc.featured_storage_object
          ? [exceptions.find((entry) => entry.field === "heroMedia")!]
          : []
      }
    } : null,
    sourceProvenance: {
      system: "wordpress",
      sourceId: doc.source_id,
      stableKey: doc.source_id ? "wordpress-" + sourceType + ":" + doc.source_id : null,
      sourceUrl: doc.source_url ?? doc.canonical_url,
      checksum: null,
      capturedAt: null,
      wordpress: {
        postId: doc.source_id ?? undefined,
        legacyPath: canonicalPath ?? undefined
      },
      exceptions
    },
    contentIntegrity: exceptions.length ? "requires-review" : "verified",
    premiumSourceContext: {
      accessPolicy,
      legacyMembershipSignal: accessPolicy === "public" ? "none" : "unknown",
      providerReferencePresent: false,
      reconciliation: exceptions.length ? "requires-review" : "match"
    }
  };
}
