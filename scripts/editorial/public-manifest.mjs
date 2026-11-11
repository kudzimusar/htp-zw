// Builds the same-origin public feed. A body, excerpt, image or byline ships only
// when an editor has classified that exact source revision as public: the original
// Premium signal lived in WordPress postmeta, which public REST does not expose.
import { createHash } from "node:crypto";

export const stableKeyForPost = (postId) => `wordpress:post:${postId}`;

const CLASSIFICATION_AUTHORITY = "Publisher/Owner";
// Public REST availability is deliberately absent: it says nothing about Premium.
const ACCEPTED_EVIDENCE = new Set(["wordpress-postmeta", "publisher-owner-decision"]);

export function classificationIndex(document) {
  if (document === null || document === undefined) return new Map();
  const { schemaVersion, authority, records } = document;
  if (schemaVersion !== 1 || authority?.role !== CLASSIFICATION_AUTHORITY ||
      typeof authority?.decidedBy !== "string" || !authority.decidedBy.trim() ||
      !Number.isFinite(Date.parse(authority?.decidedAt)) || !Array.isArray(records) ||
      !records.every((record) => ACCEPTED_EVIDENCE.has(record?.evidence?.kind))) {
    throw new Error("INVALID_CLASSIFICATION");
  }
  return new Map(records.map((record) => [record.stableKey, record]));
}

export function isClassifiedPublic(article, records) {
  const record = records.get(stableKeyForPost(article.postId));
  // Tied to one revision: a later WordPress edit voids the decision.
  return Boolean(
    record && record.accessPolicy === "public" && article.contentBody &&
    Date.parse(record.sourceModifiedAt) === Date.parse(article.modifiedAt)
  );
}

export function buildPublicManifest({ probe, classification, generatedAt }) {
  const records = classificationIndex(classification);
  const articles = probe.latestTwentyMetadata.map((article) => {
    const authorized = isClassifiedPublic(article, records);
    return {
      id:article.postId,
      type:"post",
      status:"publish",
      slug:article.slug,
      link:article.canonicalUrl,
      publishedAt:article.publishedAt,
      modifiedAt:article.modifiedAt,
      title:article.title,
      categoryIds:article.categoryIds,
      publicTerms:article.publicTerms ?? [],
      contentBody:authorized ? article.contentBody : null,
      excerpt:authorized ? article.excerpt ?? null : null,
      heroMedia:authorized ? article.heroMedia ?? null : null,
      authorName:authorized ? article.authorName ?? null : null,
      bodyAuthority:authorized ? "EDITORIAL_CLASSIFIED_PUBLIC" : "BLOCKED_PENDING_OWNER_CLASSIFICATION",
      authorAuthority:"NOT_VERIFIED",
      mediaAuthority:"NOT_VERIFIED"
    };
  });
  const anyBody = articles.some((article) => article.contentBody);
  return {
    schemaVersion:1,
    source:"healthtimes.co.zw/public-wordpress-rest-metadata",
    verifiedAt:generatedAt,
    publicationDateAtLatest:probe.latestPublicCandidateAt,
    // One build-time export cannot prove a recurring publisher-to-Reader SLA.
    freshnessSlaVerified:false,
    metadataOnly:!anyBody,
    contentBodyAvailable:anyBody,
    restrictedBodiesIncluded:false,
    contentHashSha256:createHash("sha256").update(JSON.stringify(articles)).digest("hex"),
    count:articles.length,
    articles
  };
}
