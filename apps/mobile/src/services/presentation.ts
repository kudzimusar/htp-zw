import type { PresentationRepository } from "../domain/contracts";
import {
  parseHomepagePlacement,
  validateEditionSlug,
  type AccessPolicy,
  type ArticleSummary,
  type PublicHomepagePresentation,
  type PublicHomepagePresentationRow
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

export function mapPresentationRow(
  row: PublicHomepagePresentationRow
): PublicHomepagePresentation {
  const article: ArticleSummary = {
    id: row.slug || row.story_id,
    canonicalStoryId: row.story_id,
    title: row.title,
    slug: row.slug,
    standfirst: row.standfirst,
    excerpt: row.excerpt,
    accessPolicy: (row.access_policy === "premium" ? "premium" : "public") as AccessPolicy,
    status: "published",
    publishedAt: row.published_at,
    modifiedAt: row.modified_at,
    author: row.author_name
      ? {
          id: row.author_slug || "author",
          displayName: row.author_name,
          slug: row.author_slug || "author"
        }
      : null,
    primarySection: row.section_name
      ? {
          id: row.section_slug || "section",
          name: row.section_name,
          slug: row.section_slug || "section"
        }
      : null,
    geography: [],
    topics: [],
    heroMedia: row.hero_public_url
      ? {
          id: `media-${row.story_id}`,
          publicUrl: row.hero_public_url,
          altText: row.hero_alt_text,
          caption: row.hero_caption,
          credit: row.hero_credit
        }
      : null
  };

  return {
    article,
    globalPlacement: parseHomepagePlacement(row.global_placement),
    editionPlacement: parseHomepagePlacement(row.edition_placement)
  };
}

export const publicPresentationService: PresentationRepository = {
  async getPublicHomepagePresentations(
    editionSlug?: string | null
  ): Promise<PublicHomepagePresentation[]> {
    const validSlug = editionSlug ? validateEditionSlug(editionSlug) : null;
    const client = getStagingSupabaseClient() as any;

    const { data, error } = await client.rpc(
      "newsroom_public_homepage_presentations",
      { p_edition_slug: validSlug }
    );

    if (error) {
      throw new Error(
        error.message || "Failed to load public homepage presentations."
      );
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return (data as PublicHomepagePresentationRow[])
      .map(mapPresentationRow)
      .filter((item) => Boolean(item.article && item.article.id));
  }
};
