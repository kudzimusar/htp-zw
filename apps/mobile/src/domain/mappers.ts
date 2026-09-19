import type { Database } from "../generated/database.types";
import type { ArticleDetail, AuthorRef, MediaRef, TaxonomyRef } from "./models";
import type { GeographyRef, SourceProvenance } from "./source";

type StoryRow = Database["public"]["Tables"]["stories"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type ZoneRow = Database["public"]["Tables"]["geographic_zones"]["Row"];
type LegacySourceRow = Database["public"]["Tables"]["legacy_sources"]["Row"];

export function mapAuthorRow(row: AuthorRow): AuthorRef {
  return {
    id: row.id,
    displayName: row.display_name,
    slug: row.slug
  };
}

export function mapMediaRow(row: MediaRow): MediaRef {
  return {
    id: row.id,
    publicUrl: row.public_url,
    altText: row.alt_text,
    caption: row.caption,
    credit: row.credit
  };
}

export function mapSectionRow(row: SectionRow): TaxonomyRef {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug
  };
}

function geographyLevel(row: ZoneRow): GeographyRef["level"] {
  if (row.slug === "global") return "global";
  if (row.slug === "africa") return "continent";
  if (row.code && row.code.length === 2) return "country";
  return row.parent_zone_id ? "region" : "region";
}

export function mapGeographicZoneRow(row: ZoneRow): GeographyRef {
  const level = geographyLevel(row);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    code: row.code,
    parentId: row.parent_zone_id,
    level,
    isoCountryCode: level === "country" ? row.code : null
  };
}

export function mapSourceProvenance(row: LegacySourceRow | null): SourceProvenance | null {
  if (!row) return null;
  return {
    system: row.system === "wordpress" ? "wordpress" : "healthtimes-native",
    sourceId: row.source_id,
    stableKey: row.stable_key,
    sourceUrl: row.source_url,
    checksum: row.checksum,
    capturedAt: row.last_seen_at,
    exceptions: []
  };
}

export type StoryRelations = {
  author?: AuthorRow | null;
  primarySection?: SectionRow | null;
  heroMedia?: MediaRow | null;
  geography?: ZoneRow[];
  topics?: Array<{ id: string; name: string; slug: string }>;
  legacySource?: LegacySourceRow | null;
};

export function mapStoryRow(row: StoryRow, relations: StoryRelations = {}): ArticleDetail {
  const accessPolicy = row.access_policy === "premium" ? "premium" : "public";
  const status =
    row.status === "scheduled" || row.status === "published" || row.status === "archived"
      ? row.status
      : "draft";

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    standfirst: row.standfirst,
    excerpt: row.excerpt,
    bodyHtml: row.body_html,
    canonicalUrl: row.canonical_url,
    status,
    accessPolicy,
    publishedAt: row.published_at,
    modifiedAt: row.modified_at,
    author: relations.author ? mapAuthorRow(relations.author) : null,
    primarySection: relations.primarySection ? mapSectionRow(relations.primarySection) : null,
    geography: [],
    geographyRefs: (relations.geography ?? []).map(mapGeographicZoneRow),
    topics: relations.topics ?? [],
    heroMedia: relations.heroMedia ? mapMediaRow(relations.heroMedia) : null,
    sourceProvenance: mapSourceProvenance(relations.legacySource),
    contentIntegrity: relations.legacySource ? "unknown" : "unknown"
  };
}
