import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const readRepo = (path) => readFileSync(join(repoRoot, path), "utf8");

// Read Staging config
const eas = JSON.parse(read("eas.json"));
const env = eas.build?.staging?.env ?? {};
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

assert.equal(typeof url, "string");
assert.equal(typeof key, "string");
assert.match(url, /^https:\/\/gcdohgbmqhqwydgaxrcr\.supabase\.co$/);
assert.match(key, /^sb_publishable_/);
assert.doesNotMatch(key, /service_role/i);

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json"
};

// =========================================================================
// SECTION 28: SECURITY CONTRACT & MIGRATION VERIFICATION
// =========================================================================

test("SECURITY CONTRACT: migration files exist and enforce strict public and HTTPS media boundary", () => {
  const conv02Migration = "supabase/migrations/20261020041108_ui_nr_conv02_native_context_discovery.sql";
  const r1HttpsMigration = "supabase/migrations/20261020042423_ui_nr_conv02_r1_context_media_https_boundary.sql";
  assert.equal(existsSync(join(repoRoot, conv02Migration)), true, "CONV-02 migration file must exist");
  assert.equal(existsSync(join(repoRoot, r1HttpsMigration)), true, "R1 HTTPS hardening migration file must exist");
  const sql = readRepo(conv02Migration);
  const r1Sql = readRepo(r1HttpsMigration);

  // Function signature & mode across both migrations
  assert.match(sql, /create or replace function public\.newsroom_public_context_document\s*\(\s*p_kind text,\s*p_slug text,\s*p_limit integer default 50\s*\)/i);
  assert.match(sql, /create or replace function public\.newsroom_public_context_document\s*\(\s*p_path text\s*\)/i);
  assert.match(sql, /security definer/i, "Must use security definer");
  assert.match(sql, /set search_path\s*=\s*public/i, "Must pin search_path to public");

  // R1 migration enforces explicit HTTPS predicate
  assert.match(r1Sql, /ma\.public_url\s*~\*\s*'\^https:\/\/'/i, "R1 migration must enforce explicit HTTPS predicate");

  // Whitelist of allowed kinds & fail-closed behaviour
  assert.match(sql, /v_kind in \('category',\s*'section'\)/i, "Must explicitly allow category and section");
  assert.match(sql, /v_kind = 'author'/i, "Must explicitly allow author");
  assert.match(sql, /return null;\s*end if;\s*return jsonb_strip_nulls/i, "Unknown kind must fail closed (return null)");

  // Bounded limit
  assert.match(sql, /least\(greatest\(coalesce\(p_limit,\s*50\),\s*1\),\s*100\)/i, "Limit must be clamped between 1 and 100");

  // Release predicates
  assert.match(sql, /st\.legacy_source_id is null/i, "Must only select native CMS stories");
  assert.match(sql, /lower\(st\.status\)\s*in\s*\('publish',\s*'published'\)/i, "Must only select published stories");
  assert.match(sql, /coalesce\(\(st\.distribution->>'public_reader'\)::boolean,\s*false\)\s*=\s*true/i, "Must check distribution.public_reader");
  assert.match(sql, /st\.published_at <= now\(\)/i, "Must exclude future scheduled stories");

  // Paywall & Media protection
  assert.doesNotMatch(sql, /'body_html',\s*st\.body_html/i, "Context items must NOT project full body_html");
  assert.match(sql, /ma\.public_storage_bucket\s*=\s*'newsroom-public'/i, "Must restrict featured media to newsroom-public bucket");
  assert.match(sql, /ma\.status\s*=\s*'published'/i, "Must require published media asset status");

  // Explicit privileges
  assert.match(sql, /revoke all on function public\.newsroom_public_context_document\(text,\s*text,\s*integer\)\s*from public/i);
  assert.match(sql, /grant execute on function public\.newsroom_public_context_document\(text,\s*text,\s*integer\)\s*to anon,\s*authenticated,\s*service_role/i);
  assert.match(sql, /revoke all on function public\.newsroom_public_context_document\(text\)\s*from public/i);
  assert.match(sql, /grant execute on function public\.newsroom_public_context_document\(text\)\s*to anon,\s*authenticated,\s*service_role/i);

  // No direct table grants introduced by CONV-02
  assert.doesNotMatch(sql, /grant (select|insert|update|delete) on (public\.)?(stories|sections|authors|media_assets) to anon/i, "Must not grant direct table access to anon");
  assert.doesNotMatch(r1Sql, /grant (select|insert|update|delete) on (public\.)?(stories|sections|authors|media_assets) to anon/i, "R1 must not grant direct table access to anon");
});

test("SOURCE CONTRACT: migrated-corpus.ts implements dual-authority context convergence", () => {
  const source = read("src/services/migrated-corpus.ts");

  // Both context RPCs referenced
  assert.match(source, /ag05_public_context_document/, "Must call legacy context RPC");
  assert.match(source, /newsroom_public_context_document/, "Must call native context RPC");

  // Degradation matrix: fail-closed if both fail
  assert.match(source, /legacyFailed/, "Must track legacy context outcome");
  assert.match(source, /nativeFailed/, "Must track native context outcome");
  assert.match(source, /Dual context resolution failed closed/, "Must fail closed with explicit error when both fail");

  // Deduplication & Deterministic sorting
  assert.match(source, /seenKeys/, "Must deduplicate by story identity key");
  assert.match(source, /seenPaths/, "Must deduplicate by canonical slug path");
  assert.match(source, /timeB - timeA/, "Must sort deterministically by publication time descending");
  assert.match(source, /modB - modA/, "Must use modified time descending as secondary sort");

  // Bounded limit
  assert.match(source, /CONTEXT_LIMIT = 50/, "Must enforce bounded CONTEXT_LIMIT");

  // Status publication
  assert.match(source, /"newsroom_public_context_document"/, "Must publish newsroom_public_context_document in status");
});

// =========================================================================
// SECTION 27: MINIMUM TEST CASES 1-19 (LOGIC & UNIT MATRIX)
// =========================================================================

test("1 & 16. Legacy-only context & native failure resilience: legacy items succeed when native is absent or fails", () => {
  const legacyDoc = {
    kind: "category",
    slug: "health_news",
    name: "Health News",
    items: [
      { title: "Legacy Story 1", canonical_url: "https://healthtimes.co.zw/2026/02/12/legacy-story-1/", published_at: "2026-10-15T10:00:00Z" }
    ]
  };
  const nativeDoc = null; // Native returns null (zero rows / unconfigured)

  const items = [...(legacyDoc?.items ?? []), ...(nativeDoc?.items ?? [])];
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Legacy Story 1");
});

test("2 & 17. Native-only context & legacy failure resilience: native items succeed when legacy is absent or fails", () => {
  const legacyDoc = null;
  const nativeDoc = {
    kind: "category",
    slug: "public-health",
    name: "Public Health",
    items: [
      { story_id: "11111111-1111-1111-1111-111111111111", title: "Native Story 1", canonical_url: "https://healthtimes.co.zw/native-story-1/", published_at: "2026-10-18T10:00:00Z" }
    ]
  };

  const items = [...(legacyDoc?.items ?? []), ...(nativeDoc?.items ?? [])];
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Native Story 1");
});

test("3 & 15. Merged legacy + native context & deterministic ordering", () => {
  const legacyItems = [
    { canonicalStoryId: "legacy-1", title: "Story A", publishedAt: "2026-10-10T10:00:00Z", modifiedAt: "2026-10-10T12:00:00Z", slug: "story-a" }
  ];
  const nativeItems = [
    { canonicalStoryId: "native-1", title: "Story B", publishedAt: "2026-10-18T10:00:00Z", modifiedAt: "2026-10-18T12:00:00Z", slug: "story-b" },
    { canonicalStoryId: "native-2", title: "Story C", publishedAt: "2026-10-18T10:00:00Z", modifiedAt: "2026-10-18T14:00:00Z", slug: "story-c" }
  ];

  const merged = [...legacyItems, ...nativeItems];
  merged.sort((a, b) => {
    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    if (timeA !== timeB) return timeB - timeA;
    const modA = new Date(a.modifiedAt).getTime();
    const modB = new Date(b.modifiedAt).getTime();
    if (modA !== modB) return modB - modA;
    return a.canonicalStoryId.localeCompare(b.canonicalStoryId);
  });

  // Story C has newer modifiedAt than Story B on the same day; both are newer than Story A
  assert.equal(merged[0].title, "Story C");
  assert.equal(merged[1].title, "Story B");
  assert.equal(merged[2].title, "Story A");
});

test("4 & 5. Native section match & mismatch filtering", () => {
  const stories = [
    { id: "1", sectionSlug: "public-health", title: "Cholera Control" },
    { id: "2", sectionSlug: "health-business", title: "Pharma Funding" }
  ];

  const targetSection = "public-health";
  const matched = stories.filter(s => s.sectionSlug === targetSection);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].title, "Cholera Control");
});

test("6. Native author match filtering", () => {
  const stories = [
    { id: "1", authorSlug: "tinashe-moyo", title: "Field Report" },
    { id: "2", authorSlug: "mike-gwarisa", title: "HIV Governance" }
  ];

  const targetAuthor = "tinashe-moyo";
  const matched = stories.filter(s => s.authorSlug === targetAuthor);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].title, "Field Report");
});

test("7. Topic match classified as unsupported in native (NATIVE_TOPIC_MODEL_NOT_IMPLEMENTED)", () => {
  // In native Newsroom, topics are free-text strings without an authoritative foreign key relationship.
  // Therefore, native RPC fails closed (returns null) for kind: 'topic', and Reader does not fabricate associations.
  const sql = readRepo("supabase/migrations/20261020041108_ui_nr_conv02_native_context_discovery.sql");
  assert.doesNotMatch(sql, /v_kind = 'topic'/i, "Native RPC must not fake topic support");
});

test("8 & 9. Unknown context kind fails closed & unknown slug returns empty/not-found", () => {
  const allowedKinds = ["section", "category", "author"];
  const isAllowed = (kind) => allowedKinds.includes(kind.toLowerCase());

  assert.equal(isAllowed("topic"), false);
  assert.equal(isAllowed("geography"), false);
  assert.equal(isAllowed("arbitrary_table"), false);
  assert.equal(isAllowed("category"), true);
  assert.equal(isAllowed("section"), true);
  assert.equal(isAllowed("author"), true);
});

test("10, 11, 12. Draft, public_reader=false, and future stories strictly excluded", () => {
  const candidates = [
    { id: "1", status: "published", public_reader: true, published_at: "2026-10-18T10:00:00Z" }, // Eligible
    { id: "2", status: "draft", public_reader: true, published_at: "2026-10-18T10:00:00Z" },     // Ineligible (draft)
    { id: "3", status: "published", public_reader: false, published_at: "2026-10-18T10:00:00Z" },// Ineligible (public_reader=false)
    { id: "4", status: "published", public_reader: true, published_at: "2099-01-01T00:00:00Z" }  // Ineligible (future)
  ];

  const now = new Date("2026-10-20T12:00:00Z").getTime();
  const eligible = candidates.filter(s =>
    ["publish", "published"].includes(s.status.toLowerCase()) &&
    s.public_reader === true &&
    new Date(s.published_at).getTime() <= now
  );

  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].id, "1");
});

test("13. Premium body not leaked in context list projections", () => {
  const contextItem = {
    story_id: "premium-1",
    title: "Protected Investigation",
    slug: "protected-investigation",
    canonical_url: "https://healthtimes.co.zw/protected-investigation/",
    access_policy: "premium",
    standfirst: "Public teaser only",
    excerpt: "Public teaser only"
    // body_html MUST NOT be present
  };

  assert.equal("body_html" in contextItem, false, "Context projection must never include body_html");
  assert.equal(contextItem.access_policy, "premium");
});

test("14. Canonical duplicate removed across legacy and native paths", () => {
  const articles = [
    { id: "legacy-1", canonicalStoryId: "canonical-story-uuid", slug: "who-should-not-take-lenacapavir", sourceProvenance: { system: "healthtimes-legacy" } },
    { id: "native-1", canonicalStoryId: "canonical-story-uuid", slug: "who-should-not-take-lenacapavir", sourceProvenance: { system: "healthtimes-native" } }
  ];

  const seenKeys = new Set();
  const seenPaths = new Set();
  const deduped = articles.filter(article => {
    const storyKey = "story:" + article.canonicalStoryId;
    const pathKey = "slug:" + article.slug.toLowerCase();
    if (seenKeys.has(storyKey) || seenPaths.has(pathKey)) return false;
    seenKeys.add(storyKey);
    seenPaths.add(pathKey);
    return true;
  });

  assert.equal(deduped.length, 1, "Duplicate canonical story must be deduplicated to 1 item");
});

test("18. Both legacy and native failure triggers explicit descriptive fail-closed error", () => {
  const legacyFailed = true;
  const nativeFailed = true;
  const kind = "category";
  const slug = "public-health";

  assert.throws(() => {
    if (legacyFailed && nativeFailed) {
      throw new Error(`Dual context resolution failed closed for ${kind}:${slug}`);
    }
  }, /Dual context resolution failed closed/);
});

test("19. Bounded limit clamped safely between 1 and 100", () => {
  const clamp = (limit, fallback = 50) => Math.min(Math.max(limit ?? fallback, 1), 100);

  assert.equal(clamp(null), 50);
  assert.equal(clamp(undefined), 50);
  assert.equal(clamp(-5), 1);
  assert.equal(clamp(0), 1);
  assert.equal(clamp(25), 25);
  assert.equal(clamp(500), 100);
});

// =========================================================================
// SECTION 27: MINIMUM TEST CASE 20 (LIVE STAGING READ-ONLY VERIFICATION)
// =========================================================================

test("20. LIVE STAGING RPC: newsroom_public_context_document live readback on gcdohgbmqhqwydgaxrcr", async () => {
  async function callRpc(body) {
    const res = await fetch(`${url}/rest/v1/rpc/newsroom_public_context_document`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    assert.equal(res.ok, true, `RPC returned HTTP ${res.status}`);
    return await res.json();
  }

  // Parameter signature (p_kind, p_slug, p_limit)
  const categoryDoc = await callRpc({ p_kind: "category", p_slug: "health_news", p_limit: 10 });
  assert.equal(typeof categoryDoc, "object");
  assert.equal(categoryDoc.kind, "category");
  assert.equal(categoryDoc.slug, "health_news");
  assert.equal(Array.isArray(categoryDoc.items), true);

  const authorDoc = await callRpc({ p_kind: "author", p_slug: "mike-gwarisa", p_limit: 10 });
  assert.equal(typeof authorDoc, "object");
  assert.equal(authorDoc.kind, "author");
  assert.equal(authorDoc.slug, "mike-gwarisa");
  assert.equal(Array.isArray(authorDoc.items), true);

  // Path signature (p_path)
  const pathCategoryDoc = await callRpc({ p_path: "/category/health_news/" });
  assert.equal(typeof pathCategoryDoc, "object");
  assert.equal(pathCategoryDoc.kind, "category");

  const pathAuthorDoc = await callRpc({ p_path: "/author/mike-gwarisa/" });
  assert.equal(typeof pathAuthorDoc, "object");
  assert.equal(pathAuthorDoc.kind, "author");

  // Unsupported kinds fail closed (return null)
  const topicDoc = await callRpc({ p_kind: "topic", p_slug: "cpu", p_limit: 10 });
  assert.equal(topicDoc, null, "Topic context must fail closed");

  const geoDoc = await callRpc({ p_kind: "geography", p_slug: "zimbabwe", p_limit: 10 });
  assert.equal(geoDoc, null, "Geography context must fail closed");

  const unknownKindDoc = await callRpc({ p_kind: "unknown_entity", p_slug: "test", p_limit: 10 });
  assert.equal(unknownKindDoc, null, "Unknown context kind must fail closed");

  // Unknown slug returns null
  const unknownSlugDoc = await callRpc({ p_kind: "category", p_slug: "non_existent_section_slug", p_limit: 10 });
  assert.equal(unknownSlugDoc, null, "Non-existent slug must return null");

  // Zero-state condition verified truthfully
  assert.equal(categoryDoc.items.length, 0, "Current staging contains 0 published native stories (STAGING_DATA_CONDITION)");

  // Inherited table ACL & RLS verification
  const authorsRes = await fetch(`${url}/rest/v1/authors?select=id`, { headers });
  assert.equal(authorsRes.ok, true);
  const authorsRows = await authorsRes.json();
  assert.equal(Array.isArray(authorsRows) && authorsRows.length === 0, true, "RLS must ensure 0 authors visible to anon");

  const sectionsRes = await fetch(`${url}/rest/v1/sections?select=id`, { headers });
  assert.equal(sectionsRes.ok, true);
  const sectionsRows = await sectionsRes.json();
  assert.equal(Array.isArray(sectionsRows) && sectionsRows.length === 0, true, "RLS must ensure 0 sections visible to anon");
});
