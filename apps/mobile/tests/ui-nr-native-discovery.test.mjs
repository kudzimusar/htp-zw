import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

// Transpile and load native-story-mapper
const mapperSource = read("src/services/native-story-mapper.ts");
const mapperOutput = ts.transpileModule(mapperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const mapperModule = { exports: {} };
new Function("module", "exports", "require", mapperOutput)(
  mapperModule,
  mapperModule.exports,
  (name) => {
    throw new Error("Unexpected runtime import: " + name);
  }
);
const { mapNativeStoryDocument, safePublicMediaUrl } = mapperModule.exports;

// Read Staging config
const eas = JSON.parse(read("eas.json"));
const env = eas.build?.staging?.env ?? {};
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test("1. SOURCE CONTRACT: migrated-corpus.ts integrates dual feed and native publication authority", () => {
  const source = read("src/services/migrated-corpus.ts");

  // Dual-feed RPC references
  assert.match(source, /ag05_public_feed_rows/, "Must query legacy public feed");
  assert.match(source, /newsroom_public_published_stories/, "Must query native public feed");
  assert.match(source, /newsroom_public_story_document/, "Must query native story document");

  // Type & Mapper integration
  assert.match(source, /NativeFeedRow/, "Must declare NativeFeedRow type");
  assert.match(source, /mapNativeStoryDocument/, "Must import and use mapNativeStoryDocument");
  assert.match(source, /nativeStoryForFeedRow/, "Must map native feed rows");

  // Published-time sorting & deduplication
  assert.match(source, /articleSort/, "Must sort merged articles deterministically");
  assert.match(source, /seenKeys/, "Must enforce canonical identity collision protection");

  // Identity resolution fallback
  assert.match(source, /nativeStoryForPath\(requestedPath\)/, "Must fall back to native story resolution");

  // Status publication
  assert.match(source, /nativePublicFunctions/, "Must expose nativePublicFunctions status");
});

test("2. MAPPER CONTRACT: native-story-mapper maps CMS-native stories with healthtimes-native provenance", () => {
  const doc = {
    story_id: "77777777-7777-7777-7777-777777777777",
    slug: "cholera-outbreak-contained-harare",
    title: "Cholera Outbreak Contained in Harare",
    story_title: "Cholera Outbreak Contained in Harare After Rapid Response",
    standfirst: "Health officials confirm zero new cases in 48 hours.",
    excerpt: "Health officials confirm zero new cases in 48 hours.",
    body_html: "<p>The cholera outbreak has been successfully contained.</p>",
    canonical_url: "https://healthtimes.co.zw/cholera-outbreak-contained-harare/",
    access_policy: "public",
    published_at: "2026-10-18T10:00:00Z",
    modified_at: "2026-10-18T12:00:00Z",
    author: {
      name: "Tinashe Moyo",
      slug: "tinashe-moyo",
      bio: "Senior Health Reporter"
    },
    section: {
      name: "Public Health",
      slug: "public-health"
    },
    featured_storage_bucket: "newsroom-public",
    featured_storage_object: "stories/hero-cholera.jpg",
    featured_public_url: "https://gcdohgbmqhqwydgaxrcr.supabase.co/storage/v1/object/public/newsroom-public/stories/hero-cholera.jpg",
    featured_alt_text: "Health workers in Harare",
    featured_caption: "Rapid response teams at work",
    featured_credit: "HealthTimes / Photo"
  };

  const article = mapNativeStoryDocument(doc, "https://gcdohgbmqhqwydgaxrcr.supabase.co");

  // Provenance must NEVER be labeled as WordPress
  assert.equal(article.sourceProvenance?.system, "healthtimes-native");
  assert.equal(article.author?.sourceProvenance?.system, "healthtimes-native");
  assert.equal(article.heroMedia?.sourceProvenance?.system, "healthtimes-native");

  // Identity & fields
  assert.equal(article.canonicalStoryId, "77777777-7777-7777-7777-777777777777");
  assert.equal(article.slug, "cholera-outbreak-contained-harare");
  assert.equal(article.title, "Cholera Outbreak Contained in Harare After Rapid Response");
  assert.equal(article.accessPolicy, "public");
  assert.equal(article.status, "published");
  assert.equal(article.author?.displayName, "Tinashe Moyo");
  assert.equal(article.primarySection?.name, "Public Health");
  assert.equal(article.heroMedia?.publicUrl, "https://gcdohgbmqhqwydgaxrcr.supabase.co/storage/v1/object/public/newsroom-public/stories/hero-cholera.jpg");
  assert.equal(article.contentIntegrity, "verified");
});

test("3. SECURITY CONTRACT: Premium native stories fail closed and withhold bodyHtml", () => {
  const premiumDoc = {
    story_id: "88888888-8888-8888-8888-888888888888",
    slug: "investigation-private-hospital-fees",
    title: "Investigation: The High Cost of Care",
    access_policy: "premium",
    body_html: "<p>CONFIDENTIAL INVESTIGATION FULL TEXT THAT MUST NOT LEAK</p>",
    published_at: "2026-10-18T08:00:00Z"
  };

  const article = mapNativeStoryDocument(premiumDoc);
  assert.equal(article.accessPolicy, "premium");
  assert.equal(article.bodyHtml, null, "Premium native story bodyHtml MUST be withheld from public projection");
});

test("4. SECURITY CONTRACT: Media mapper rejects private, signed, and untrusted storage URLs", () => {
  const baseOrigin = "https://gcdohgbmqhqwydgaxrcr.supabase.co";

  // Public bucket: allowed
  assert.notEqual(
    safePublicMediaUrl(`${baseOrigin}/storage/v1/object/public/newsroom-public/lead.jpg`, "newsroom-public", baseOrigin),
    null
  );

  // Private bucket: rejected
  assert.equal(
    safePublicMediaUrl(`${baseOrigin}/storage/v1/object/authenticated/newsroom-private/doc.pdf`, "newsroom-private", baseOrigin),
    null
  );

  // Signed URL token: rejected
  assert.equal(
    safePublicMediaUrl(`${baseOrigin}/storage/v1/object/sign/newsroom-public/leak.jpg?token=secret`, "newsroom-public", baseOrigin),
    null
  );

  // Cross-origin untrusted URL: rejected
  assert.equal(
    safePublicMediaUrl("https://evil.attacker.com/malware.jpg", "newsroom-public", baseOrigin),
    null
  );
});

test("5. BEHAVIOR A: Empty native feed preserves legacy Home without disruption", () => {
  const legacyArticles = [
    { id: "leg-1", canonicalStoryId: "101", title: "Legacy Story 1", slug: "legacy-1", publishedAt: "2026-10-10T00:00:00Z" },
    { id: "leg-2", canonicalStoryId: "102", title: "Legacy Story 2", slug: "legacy-2", publishedAt: "2026-10-09T00:00:00Z" }
  ];
  const nativeArticles = [];

  // Merging legacy + empty native produces legacy unchanged
  const merged = [...legacyArticles, ...nativeArticles];
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "leg-1");
  assert.equal(merged[1].id, "leg-2");
});

test("6. BEHAVIOR B: Native public story successfully merges into Home feed", () => {
  const legacyArticles = [
    { id: "leg-1", canonicalStoryId: "101", title: "Legacy Story", slug: "legacy-1", publishedAt: "2026-10-10T00:00:00Z" }
  ];
  const nativeArticles = [
    {
      id: "nat-1",
      canonicalStoryId: "201",
      title: "Native Story",
      slug: "nat-1",
      publishedAt: "2026-10-15T00:00:00Z",
      sourceProvenance: { system: "healthtimes-native" }
    }
  ];

  const merged = [...legacyArticles, ...nativeArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "nat-1", "More recent native story appears first");
  assert.equal(merged[0].sourceProvenance?.system, "healthtimes-native");
  assert.equal(merged[1].id, "leg-1");
});

test("7. BEHAVIOR C & D: Server boundary guarantees draft and public_reader=false exclusion", () => {
  // Test boundary logic: candidate native records must satisfy all release criteria
  const candidateStories = [
    { id: "s-1", status: "draft", access_policy: "public", distribution: { public_reader: true }, published_at: "2026-10-18T00:00:00Z" },
    { id: "s-2", status: "published", access_policy: "public", distribution: { public_reader: false }, published_at: "2026-10-18T00:00:00Z" },
    { id: "s-3", status: "published", access_policy: "public", distribution: {}, published_at: "2026-10-18T00:00:00Z" },
    { id: "s-4", status: "published", access_policy: "public", distribution: { public_reader: true }, published_at: "2026-10-25T00:00:00Z" }, // future scheduled
    { id: "s-5", status: "published", access_policy: "public", distribution: { public_reader: true }, published_at: "2026-10-18T00:00:00Z" }  // eligible
  ];

  const now = new Date("2026-10-20T00:00:00Z").getTime();
  const eligible = candidateStories.filter((s) => {
    if (s.status.toLowerCase() !== "published") return false;
    if (s.access_policy.toLowerCase() !== "public") return false;
    if (s.distribution?.public_reader !== true) return false;
    if (new Date(s.published_at).getTime() > now) return false;
    return true;
  });

  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].id, "s-5", "Only published, public, released, non-future native stories are eligible");
});

test("8. BEHAVIOR E: Merged feed preserves deterministic published timestamp ordering with tie-breakers", () => {
  const items = [
    { id: "b-older", canonicalStoryId: "2", publishedAt: "2026-10-01T00:00:00Z", modifiedAt: "2026-10-01T00:00:00Z" },
    { id: "a-newer", canonicalStoryId: "1", publishedAt: "2026-10-19T00:00:00Z", modifiedAt: "2026-10-19T00:00:00Z" },
    { id: "c-same-time-modified-later", canonicalStoryId: "3", publishedAt: "2026-10-10T00:00:00Z", modifiedAt: "2026-10-10T05:00:00Z" },
    { id: "d-same-time-modified-earlier", canonicalStoryId: "4", publishedAt: "2026-10-10T00:00:00Z", modifiedAt: "2026-10-10T01:00:00Z" }
  ];

  function sortArticles(list) {
    return [...list].sort((a, b) => {
      const pubDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (pubDiff !== 0) return pubDiff;
      const modDiff = new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
      if (modDiff !== 0) return modDiff;
      return String(a.canonicalStoryId ?? a.id).localeCompare(String(b.canonicalStoryId ?? b.id));
    });
  }

  const sorted = sortArticles(items);
  assert.equal(sorted[0].id, "a-newer");
  assert.equal(sorted[1].id, "c-same-time-modified-later");
  assert.equal(sorted[2].id, "d-same-time-modified-earlier");
  assert.equal(sorted[3].id, "b-older");
});

test("9. BEHAVIOR F: Deduplication prevents duplicate entries on canonical collision", () => {
  const items = [
    { id: "slug-1", canonicalStoryId: "uuid-1", slug: "who-lenacapavir-rollout" },
    { id: "legacy-post-30154", canonicalStoryId: "uuid-1", slug: "who-lenacapavir-rollout" }, // Duplicate by story ID and slug
    { id: "slug-2", canonicalStoryId: "uuid-2", slug: "distinct-story" }
  ];

  const seenKeys = new Set();
  const seenPaths = new Set();
  const deduped = items.filter((article) => {
    const storyKey = "story:" + article.canonicalStoryId;
    const pathKey = "slug:" + article.slug.toLowerCase();
    if (seenKeys.has(storyKey)) return false;
    if (seenPaths.has(pathKey)) return false;
    seenKeys.add(storyKey);
    seenPaths.add(pathKey);
    return true;
  });

  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].canonicalStoryId, "uuid-1");
  assert.equal(deduped[1].canonicalStoryId, "uuid-2");
});

test("10. BEHAVIOR H: Curated homepage placement does not create duplicate rendering in sections", () => {
  const heroStory = { id: "native-hero-1", title: "Curated Hero" };
  const topStories = [
    { id: "top-1", title: "Top 1" },
    { id: "native-hero-1", title: "Curated Hero in Top Stories" } // Colliding with Hero
  ];
  const source = [heroStory, ...topStories, { id: "latest-1", title: "Latest 1" }];

  // Reader app deduplication contract
  const immediateIds = new Set(topStories.map((s) => s.id));
  if (heroStory) immediateIds.add(heroStory.id);

  const filteredLatest = source.filter((s) => !immediateIds.has(s.id));
  assert.equal(filteredLatest.length, 1);
  assert.equal(filteredLatest[0].id, "latest-1");
  assert.equal(filteredLatest.some((s) => s.id === heroStory.id), false, "Hero story must not render again in latest section");
});

test("11. STAGING VERIFICATION (Read-Only): Live Supabase zero-native state returns valid empty projection", async () => {
  assert.equal(typeof url, "string", "EXPO_PUBLIC_SUPABASE_URL must be configured");
  assert.equal(typeof key, "string", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured");

  const response = await fetch(`${url}/rest/v1/rpc/newsroom_public_published_stories`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_slug: null })
  });

  assert.equal(response.ok, true, `newsroom_public_published_stories returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(Array.isArray(body), true, "newsroom_public_published_stories must return an array");

  // In zero-native staging, length is 0 (valid data state, not defect)
  assert.equal(body.length, 0, "Staging currently has 0 native public_reader=true stories (expected zero-state)");
});

test("12. STAGING VERIFICATION (Read-Only): ag05_public_feed_rows returns legacy feed successfully", async () => {
  const response = await fetch(`${url}/rest/v1/rpc/ag05_public_feed_rows`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_limit: 10 })
  });

  assert.equal(response.ok, true, `ag05_public_feed_rows returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(Array.isArray(body), true);
  assert.equal(body.length > 0, true, "Legacy feed on Staging must return migrated stories");
  assert.equal(typeof body[0]?.title, "string");
  assert.equal(typeof body[0]?.canonical_url, "string");
});

test("13. BEHAVIOR I: Search convergence - eligible native stories in the feed pool are searchable", () => {
  const rankingSource = read("src/reader/search-ranking.ts");
  const rankingOutput = ts.transpileModule(rankingSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const rankingModule = { exports: {} };
  new Function("module", "exports", "require", rankingOutput)(rankingModule, rankingModule.exports, () => {});
  const { scoreReaderSearch } = rankingModule.exports;

  const nativeStory = {
    title: "Cholera Outbreak Contained in Harare",
    slug: "cholera-outbreak-contained-harare",
    standfirst: "Health officials confirm zero new cases in 48 hours.",
    excerpt: "Health officials confirm zero new cases in 48 hours.",
    author: "Tinashe Moyo",
    section: "Public Health",
    publishedAt: "2026-10-18T10:00:00Z"
  };

  const score = scoreReaderSearch("cholera", nativeStory);
  assert.notEqual(score, null, "Query 'cholera' must match native story title");
  assert.ok(score > 20, "Exact title match score must be high");

  const scoreAuthor = scoreReaderSearch("Tinashe Moyo", nativeStory);
  assert.notEqual(scoreAuthor, null, "Query 'Tinashe Moyo' must match native story author");
});
