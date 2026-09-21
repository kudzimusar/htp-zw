import type { Database } from "../generated/database.types";
import type {
  ArticleDetail,
  AuthorRef,
  LegacyTaxonomyRef,
  MediaRef,
  TaxonomyRef
} from "./models";
import type {
  GeographyRef,
  SourceException,
  SourceMappingAuthority,
  SourceProvenance,
  WordPressSourceIdentity
} from "./source";
import { normalizeCanonicalGeography } from "./taxonomy-authority";

type StoryRow = Database["public"]["Tables"]["stories"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type ZoneRow = Database["public"]["Tables"]["geographic_zones"]["Row"];
type LegacySourceRow = Database["public"]["Tables"]["legacy_sources"]["Row"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value
    .map((item) => typeof item === "string" || typeof item === "number" ? String(item) : "")
    .filter(Boolean);
  return ids.length ? ids : undefined;
}

function wordpressIdentityFromLegacySource(row: LegacySourceRow): WordPressSourceIdentity | undefined {
  if (row.system !== "wordpress") return undefined;
  const raw = asRecord(row.raw);
  const source = asRecord(raw?.source);
  const story = asRecord(raw?.story);
  const sourceType = nonEmptyString(source?.type) ?? row.source_type;
  return {
    postId: sourceType === "post" || sourceType === "page" ? row.source_id : undefined,
    authorId: nonEmptyString(story?.authorSourceId),
    featuredMediaId: nonEmptyString(story?.featuredMediaSourceId),
    categoryIds: stringIds(story?.categorySourceIds),
    tagIds: stringIds(story?.tagSourceIds),
    legacyPath: nonEmptyString(source?.legacyPath)
  };
}

function exceptionsFromLegacySource(row: LegacySourceRow): SourceException[] {
  const raw = asRecord(row.raw);
  const rawExceptions = Array.isArray(raw?.exceptions) ? raw.exceptions : [];
  return rawExceptions.map((value): SourceException => {
    const exception = asRecord(value);
    const type = nonEmptyString(exception?.type);
    const detail = asRecord(exception?.detail);
    return {
      kind:
        type === "shortcode"
          ? "unknown-shortcode"
          : type === "unknown_field"
            ? "unmapped-custom-field"
            : "other",
      classification: "requires-review",
      field:
        type === "shortcode"
          ? "bodyHtml"
          : nonEmptyString(detail?.field),
      note: "Preserved from the AG-04 legacy source exception payload."
    };
  });
}

export function mapAuthorRow(row: AuthorRow): AuthorRef {
  return {
    id: row.id,
    displayName: row.display_name,
    slug: row.slug,
    sourceProvenance: row.wordpress_source_id
      ? {
          system: "wordpress",
          sourceId: row.wordpress_source_id,
          stableKey: null,
          sourceUrl: null,
          checksum: null,
          capturedAt: null,
          wordpress: { authorId: row.wordpress_source_id },
          exceptions: []
        }
      : null
  };
}

export function mapMediaRow(row: MediaRow): MediaRef {
  return {
    id: row.id,
    publicUrl: row.public_url,
    altText: row.alt_text,
    caption: row.caption,
    credit: row.credit,
    sourceProvenance: row.legacy_source_id
      ? {
          system: "wordpress",
          sourceId: null,
          stableKey: null,
          sourceUrl: row.source_url,
          checksum: row.checksum,
          capturedAt: null,
          exceptions: []
        }
      : null
  };
}

export function mapSectionRow(row: SectionRow): TaxonomyRef {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug
  };
}

export function mapLegacySectionRow(row: SectionRow): LegacyTaxonomyRef | null {
  if (!row.wordpress_source_id) return null;
  return {
    ...mapSectionRow(row),
    authority: "observed-source",
    sourceSystem: "wordpress",
    sourceId: row.wordpress_source_id,
    sourceKind: "category"
  };
}

export function mapTagRow(row: TagRow): TaxonomyRef {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug
  };
}

export function mapLegacyTagRow(row: TagRow): LegacyTaxonomyRef | null {
  if (!row.wordpress_source_id) return null;
  return {
    ...mapTagRow(row),
    authority: "observed-source",
    sourceSystem: "wordpress",
    sourceId: row.wordpress_source_id,
    sourceKind: "post_tag"
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

export function mapSourceProvenance(
  row: LegacySourceRow | null,
  additionalExceptions: SourceException[] = []
): SourceProvenance | null {
  if (!row) return null;
  return {
    system: row.system === "wordpress" ? "wordpress" : "healthtimes-native",
    sourceId: row.source_id,
    stableKey: row.stable_key,
    sourceUrl: row.source_url,
    checksum: row.checksum,
    capturedAt: row.last_seen_at,
    wordpress: wordpressIdentityFromLegacySource(row),
    exceptions: [...exceptionsFromLegacySource(row), ...additionalExceptions]
  };
}

export type StoryRelations = {
  author?: AuthorRow | null;
  primarySection?: SectionRow | null;
  /**
   * A section row is Reader-canonical only when the repository can prove that
   * AG-04 mapped it to the AG-01 vocabulary. WordPress-backed section rows
   * default to observed-source and remain legacy taxonomy.
   */
  primarySectionAuthority?: SourceMappingAuthority;
  heroMedia?: MediaRow | null;
  geography?: ZoneRow[];
  /**
   * Canonical AG-01/AG-04 topics only. Imported WordPress terms remain in
   * legacyTaxonomy until AG-04 explicitly maps them.
   */
  topics?: TaxonomyRef[];
  legacyTaxonomy?: LegacyTaxonomyRef[];
  legacySource?: LegacySourceRow | null;
  migrationExceptions?: SourceException[];
};

export function mapStoryRow(row: StoryRow, relations: StoryRelations = {}): ArticleDetail {
  const accessPolicy = row.access_policy === "premium" ? "premium" : "public";
  const status =
    row.status === "scheduled" || row.status === "published" || row.status === "archived"
      ? row.status
      : "draft";
  const primarySectionCandidate = relations.primarySection ? mapSectionRow(relations.primarySection) : null;
  const primarySectionAuthority =
    relations.primarySectionAuthority ??
    (relations.primarySection?.wordpress_source_id ? "observed-source" : null);
  const primarySection =
    primarySectionAuthority === "canonical-approved" ? primarySectionCandidate : null;
  const observedPrimarySection =
    primarySectionAuthority === "observed-source" && relations.primarySection
      ? mapLegacySectionRow(relations.primarySection)
      : null;
  const topics = relations.topics ?? [];
  const legacyTaxonomy = Array.from(new Map(
    [
      ...(relations.legacyTaxonomy ?? []),
      ...(observedPrimarySection ? [observedPrimarySection] : [])
    ].map((term) => [term.sourceKind + ":" + (term.sourceId ?? term.slug), term])
  ).values());
  const inferredCanonical =
    primarySectionAuthority === "inferred-requires-review" && primarySectionCandidate
      ? [primarySectionCandidate]
      : [];
  const geographyRefs = (relations.geography ?? []).map(mapGeographicZoneRow);
  const canonicalGeography = normalizeCanonicalGeography(geographyRefs);
  const sourceProvenance = mapSourceProvenance(
    relations.legacySource ?? null,
    relations.migrationExceptions ?? []
  );

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
    primarySection,
    ...canonicalGeography,
    geographyResolution: {
      canonicalApproved: geographyRefs,
      observedSource: [],
      inferredRequiresReview: []
    },
    topics,
    legacyTaxonomy,
    taxonomyResolution: {
      observedWordPress: legacyTaxonomy,
      approvedCanonical: [
        ...(primarySection ? [primarySection] : []),
        ...topics
      ],
      inferredRequiresReview: inferredCanonical
    },
    heroMedia: relations.heroMedia ? mapMediaRow(relations.heroMedia) : null,
    sourceProvenance,
    contentIntegrity: sourceProvenance?.exceptions.length ? "requires-review" : "unknown",
    premiumSourceContext: {
      accessPolicy,
      legacyMembershipSignal: "unknown",
      providerReferencePresent: false,
      reconciliation: null
    }
  };
}
