import type { ArticleDetail, AuthorProfile } from "../domain/models";
import type { SourceException } from "../domain/source";

export type WpAuthorInput = {
  id?: number;
  name?: string;
  slug?: string;
  link?: string;
};

export type WpAuthorResolution = {
  postAuthorId: number | null;
  embeddedAuthorId: number | null;
  authorIdConflict: { postAuthorId: number; embeddedAuthorId: number } | null;
  authorIdentityVerified: boolean;
  author: ArticleDetail["author"];
  exception: SourceException | null;
};

export function positiveWpId(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function resolveWpAuthorAttribution(input: {
  postId: number;
  postAuthor?: number;
  embeddedAuthor?: WpAuthorInput;
  fallbackAuthor?: ArticleDetail["author"] | null;
  verifiedAuthors: Pick<AuthorProfile, "displayName" | "slug">[];
  decodeName?: (value: string) => string;
}): WpAuthorResolution {
  const { postId, postAuthor, embeddedAuthor, fallbackAuthor, verifiedAuthors } = input;
  const decode = input.decodeName ?? ((v: string) => v);
  const postAuthorId = positiveWpId(postAuthor);
  const embeddedAuthorId = positiveWpId(embeddedAuthor?.id);
  const authorIdConflict =
    postAuthorId !== null && embeddedAuthorId !== null && postAuthorId !== embeddedAuthorId
      ? { postAuthorId, embeddedAuthorId }
      : null;

  const fallbackAuthorId = fallbackAuthor?.sourceProvenance?.wordpress?.authorId;
  const fallbackMatchesWpId = Boolean(
    postAuthorId !== null && fallbackAuthorId && String(postAuthorId) === String(fallbackAuthorId)
  );

  let authorName: string | null = null;
  let authorSlug: string | null = null;
  let authorId: number | null = null;
  let authorSourceUrl: string | null = null;
  let authorIdentityVerified = false;

  if (authorIdConflict) {
    // Conflicting WordPress author IDs: reject embedded author completely and never link a profile.
    // Only preserve an unlinked byline if separately trusted fallback evidence matches post.author.
    if (fallbackMatchesWpId && fallbackAuthor?.displayName) {
      authorName = fallbackAuthor.displayName;
    }
  } else {
    const embeddedAuthorName = embeddedAuthor?.name ? decode(embeddedAuthor.name) : null;
    const sourceAuthorMatches = embeddedAuthorName
      ? verifiedAuthors.filter(
          (a) => a.displayName.trim().toLowerCase() === embeddedAuthorName.trim().toLowerCase()
        )
      : [];
    const fallbackMatchesVerifiedProfile =
      sourceAuthorMatches.length === 1 && sourceAuthorMatches[0] !== undefined && fallbackAuthor?.slug === sourceAuthorMatches[0].slug;
    const verifiedFallbackAuthor =
      fallbackAuthor && (fallbackMatchesWpId || fallbackMatchesVerifiedProfile)
        ? fallbackAuthor
        : null;
    authorName = embeddedAuthorName ?? verifiedFallbackAuthor?.displayName ?? null;
    authorSlug = embeddedAuthor?.slug?.trim() || verifiedFallbackAuthor?.slug || null;
    authorId = embeddedAuthorId ?? postAuthorId ?? null;
    authorSourceUrl = embeddedAuthor?.link ?? verifiedFallbackAuthor?.sourceProvenance?.sourceUrl ?? null;
    authorIdentityVerified = Boolean(authorName && authorSlug);
  }

  let exception: SourceException | null = null;
  if (authorIdConflict) {
    exception = {
      kind: "author-unresolved",
      classification: "requires-review",
      field: "author",
      note: `Conflicting WordPress author IDs (post.author=${authorIdConflict.postAuthorId}, _embedded.author[0].id=${authorIdConflict.embeddedAuthorId}); conflicting embedded author identity was rejected and no author profile route was assigned.`
    };
  } else if ((postAuthorId !== null || embeddedAuthor?.name) && !authorIdentityVerified) {
    exception = {
      kind: "author-unresolved",
      classification: "requires-review",
      field: "author",
      note: "The byline may be displayed, but no verified WordPress author slug or matching source profile is available; no author profile route is assigned."
    };
  }

  const author: ArticleDetail["author"] = authorName
    ? {
        id: authorIdConflict
          ? `source-author-unresolved:${postId}`
          : authorId
            ? `wordpress-author-${authorId}`
            : authorSlug
              ? `wordpress-author:${authorSlug}`
              : `source-author-unresolved:${postId}`,
        displayName: authorName,
        slug: authorSlug ?? "",
        sourceProvenance: {
          system: "wordpress",
          sourceId: authorIdConflict ? null : authorId ? String(authorId) : null,
          stableKey: authorIdConflict
            ? `wordpress-post-author-unresolved:${postId}`
            : authorId
              ? `wordpress-author:${authorId}`
              : authorSlug
                ? `wordpress-author:${authorSlug}`
                : `wordpress-post-author-unresolved:${postId}`,
          sourceUrl: authorSourceUrl,
          checksum: null,
          capturedAt: new Date().toISOString(),
          wordpress: { authorId: authorIdConflict ? undefined : authorId ? String(authorId) : undefined },
          exceptions: authorIdentityVerified
            ? []
            : [
                {
                  kind: "author-unresolved",
                  classification: "requires-review",
                  field: "author",
                  note: authorIdConflict
                    ? `Conflicting WordPress author IDs (post.author=${authorIdConflict.postAuthorId}, _embedded.author[0].id=${authorIdConflict.embeddedAuthorId}); byline kept unlinked.`
                    : "The byline is preserved without a fabricated author slug or profile identity."
                }
              ]
        }
      }
    : null;

  return {
    postAuthorId,
    embeddedAuthorId,
    authorIdConflict,
    authorIdentityVerified,
    author,
    exception
  };
}
