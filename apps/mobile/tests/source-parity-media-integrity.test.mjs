import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const snapshotModule = loadTs("src/source-parity/snapshot.ts");
const {
  SOURCE_PARITY_MEDIA_MIRRORS,
  publicMirrorForSourceMedia,
  sourceParityArticles
} = snapshotModule;

// Provenance register of all known source assets
export const MEDIA_PROVENANCE_REGISTER = [
  {
    id: "media-1",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg",
    contentType: "image/jpeg",
    expectedHttpStatus: 200,
    associatedArticleSlug: "zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks",
    accessPolicy: "premium",
    verifiedAvailability: true
  },
  {
    id: "media-2",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg",
    contentType: "image/jpeg",
    expectedHttpStatus: 200,
    associatedArticleSlug: "ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis",
    accessPolicy: "public",
    verifiedAvailability: true
  },
  {
    id: "media-3",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/01/enhanced_1200x665.jpg",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/01/enhanced_1200x665.jpg",
    contentType: "image/jpeg",
    expectedHttpStatus: 200,
    associatedArticleSlug: "africa-cdc-ebola-contact-tracing-community-deaths-drc",
    accessPolicy: "public",
    verifiedAvailability: true
  },
  {
    id: "media-4",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/09/dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/dr-neddy-makonza-zimbabwe-fourth-female-orthopaedic-surgeon.png",
    contentType: "image/png",
    expectedHttpStatus: 200,
    associatedArticleSlug: "meet-dr-neddy-zimbabwes-fourth-female-orthopaedic-surgeon",
    accessPolicy: "public",
    verifiedAvailability: true
  },
  {
    id: "media-5",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/09/Chief-Nyamaropa.jpeg",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/Chief-Nyamaropa.jpeg",
    contentType: "image/jpeg",
    expectedHttpStatus: 200,
    associatedArticleSlug: "chief-nyamaropa-orders-woman-to-pay-cow-over-alleged-hiv-transmission",
    accessPolicy: "public",
    verifiedAvailability: true
  },
  {
    id: "media-6",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/09/aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/aids-2026-protest-hiv-indigenous-people-fiji-creative-commons-https-creativecommons-org-licenses-by-sa-4-0.jpg.png",
    contentType: "image/png",
    expectedHttpStatus: 200,
    associatedArticleSlug: "fiji-hiv-emergency-epidemic-spreads-beyond-drug-users",
    accessPolicy: "public",
    verifiedAvailability: true
  },
  {
    id: "media-7",
    canonicalSourceUrl: "https://healthtimes.co.zw/wp-content/uploads/2026/09/zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg",
    expectedMirrorPath: "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/zimbabwe-parliamentarians-not-in-my-constituency-teenage-pregnancy.jpg",
    contentType: "image/jpeg",
    expectedHttpStatus: 200,
    associatedArticleSlug: "not-in-my-constituency-zimbabwe-teenage-pregnancy-tags",
    accessPolicy: "public",
    verifiedAvailability: true
  }
];

test("Work Package B - B1: Known media URLs resolve strictly to verified Supabase Storage mirrors", () => {
  for (const entry of MEDIA_PROVENANCE_REGISTER) {
    const resolved = publicMirrorForSourceMedia(entry.canonicalSourceUrl);
    assert.equal(resolved, entry.expectedMirrorPath, `Asset ${entry.id} must resolve to verified mirror`);
    assert.equal(SOURCE_PARITY_MEDIA_MIRRORS[entry.canonicalSourceUrl], entry.expectedMirrorPath);
  }
});

test("Work Package B - B1: Unknown media URLs are never silently rewritten to unverified Supabase paths", () => {
  const unmappedWordPressUrls = [
    "https://healthtimes.co.zw/wp-content/uploads/2026/09/unmapped-story-image.jpg",
    "https://healthtimes.co.zw/wp-content/uploads/2025/12/nonexistent.png",
    "https://healthtimes.co.zw/wp-content/uploads/2026/02/random-photo.webp"
  ];

  for (const url of unmappedWordPressUrls) {
    const resolved = publicMirrorForSourceMedia(url);
    assert.equal(
      resolved,
      null,
      `Unmapped URL ${url} must return null, NEVER an unverified Supabase path`
    );
  }

  // Non-WordPress unknown URL must also return null
  assert.equal(publicMirrorForSourceMedia("https://third-party.com/image.jpg"), null);
  assert.equal(publicMirrorForSourceMedia(""), null);
  assert.equal(publicMirrorForSourceMedia(undefined), null);
});

test("Work Package B - B1: Direct Supabase Storage URLs are preserved as-is", () => {
  const directSupabaseUrl = "https://bzuvntbkevvuhfhqhkua.supabase.co/storage/v1/object/public/migrated-media/wordpress/2026/09/direct-asset.jpg";
  const resolved = publicMirrorForSourceMedia(directSupabaseUrl);
  assert.equal(resolved, directSupabaseUrl);
});

test("Work Package B - B1: HeroMedia preserves original sourceUrl for content attribution and provenance", () => {
  for (const entry of MEDIA_PROVENANCE_REGISTER) {
    const article = sourceParityArticles.find((a) => a.slug === entry.associatedArticleSlug);
    assert.ok(article, `Article for slug ${entry.associatedArticleSlug} must exist in sourceParityArticles`);
    assert.ok(article.heroMedia, `Article ${article.slug} must have heroMedia`);
    assert.equal(
      article.heroMedia.sourceProvenance?.sourceUrl,
      entry.canonicalSourceUrl,
      `heroMedia.sourceProvenance.sourceUrl must preserve original canonical WordPress URL for attribution`
    );
    assert.equal(
      article.heroMedia.publicUrl,
      entry.expectedMirrorPath,
      `heroMedia.publicUrl must point to verified Supabase Storage mirror`
    );
  }
});

test("Work Package B - B1: Live verification of all 7 mapped Supabase Storage objects (HTTP 200, correct Content-Type)", async () => {
  for (const entry of MEDIA_PROVENANCE_REGISTER) {
    const response = await fetch(entry.expectedMirrorPath, { method: "HEAD" });
    assert.equal(
      response.status,
      entry.expectedHttpStatus,
      `Mirror object ${entry.expectedMirrorPath} must return HTTP 200`
    );
    const contentType = response.headers.get("content-type");
    assert.ok(
      contentType && contentType.startsWith(entry.contentType),
      `Mirror object ${entry.expectedMirrorPath} content-type must match ${entry.contentType}, got ${contentType}`
    );
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    assert.ok(contentLength > 10000, `Mirror object must have valid size (>10KB), got ${contentLength}`);
  }
});

test("Work Package B - B2: Premium content authority is never bypassed by media rewriting", () => {
  const premiumEntry = MEDIA_PROVENANCE_REGISTER.find((e) => e.accessPolicy === "premium");
  assert.ok(premiumEntry);
  const premiumArticle = sourceParityArticles.find((a) => a.slug === premiumEntry.associatedArticleSlug);
  assert.ok(premiumArticle);
  assert.equal(premiumArticle.accessPolicy, "premium");
  assert.equal(premiumArticle.bodyHtml, null, "Premium article bodyHtml must remain null in snapshot");
});
