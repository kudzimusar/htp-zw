import type { ArticleSummary } from "../domain/models";

type PublicationSortable = Pick<ArticleSummary, "id" | "publishedAt" | "modifiedAt">;

function publicationTime(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function comparePublicationDesc(a: PublicationSortable, b: PublicationSortable): number {
  return (
    publicationTime(b.publishedAt) - publicationTime(a.publishedAt) ||
    publicationTime(b.modifiedAt) - publicationTime(a.modifiedAt) ||
    a.id.localeCompare(b.id)
  );
}

export function sortByPublicationDesc<T extends PublicationSortable>(items: readonly T[]): T[] {
  return [...items].sort(comparePublicationDesc);
}

function readerStoryIdentity(story: ArticleSummary): string {
  const slug = story.slug?.trim().toLowerCase();
  if (slug) return "slug:" + slug;
  const canonicalUrl = story.canonicalUrl?.trim().replace(/\/+$/, "").toLowerCase();
  if (canonicalUrl) return "url:" + canonicalUrl;
  const canonicalStoryId = story.canonicalStoryId?.trim();
  return canonicalStoryId ? "story:" + canonicalStoryId : "id:" + story.id;
}

export function mergeReaderFeeds(
  authoritative: readonly ArticleSummary[],
  supplemental: readonly ArticleSummary[]
): ArticleSummary[] {
  const seen = new Set<string>();
  const merged: ArticleSummary[] = [];
  for (const story of [...authoritative, ...supplemental]) {
    const identity = readerStoryIdentity(story);
    if (seen.has(identity)) continue;
    seen.add(identity);
    merged.push(story);
  }
  return sortByPublicationDesc(merged);
}
