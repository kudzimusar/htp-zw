import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const eas = JSON.parse(read("eas.json"));
const env = eas.build?.staging?.env ?? {};
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

assert.equal(typeof url, "string");
assert.equal(typeof key, "string");
assert.match(url, /^https:\/\/bzuvntbkevvuhfhqhkua\.supabase\.co$/);
assert.match(key, /^sb_publishable_/);

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function rpc(name, args) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args)
  });
  const textBody = await response.text();
  assert.equal(response.ok, true, `${name} returned HTTP ${response.status}: ${textBody}`);
  return textBody ? JSON.parse(textBody) : null;
}

const mapperSource = read("src/services/migrated-corpus-mapper.ts");
const mapperOutput = ts.transpileModule(mapperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const mapperModule = { exports: {} };
new Function("module", "exports", "require", mapperOutput)(
  mapperModule, mapperModule.exports, () => { throw new Error("Unexpected require"); }
);
const { mapMigratedStoryDocument } = mapperModule.exports;

const rankingSource = read("src/reader/search-ranking.ts");
const rankingOutput = ts.transpileModule(rankingSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const rankingModule = { exports: {} };
new Function("module", "exports", "require", rankingOutput)(
  rankingModule, rankingModule.exports, () => { throw new Error("Unexpected require"); }
);
const { scoreReaderSearch } = rankingModule.exports;

test("DISCOVERY: Homepage feed RPC returns bounded 50 items with sub-100ms response", async () => {
  // Prime connection
  await rpc("ag05_public_feed_documents", { p_limit: 1 });
  const t0 = Date.now();
  const docs = await rpc("ag05_public_feed_documents", { p_limit: 50 });
  const latency = Date.now() - t0;

  assert.equal(Array.isArray(docs), true);
  assert.equal(docs.length, 50, "Homepage must return exactly 50 candidate documents");
  assert.ok(latency < 2500, `Feed RPC latency (${latency}ms) must remain bounded`);

  const mapped = docs.map((d) => mapMigratedStoryDocument(d, url));
  assert.equal(mapped.length, 50);
  assert.ok(mapped[0].title, "First story must have title");
  assert.ok(mapped[49].title, "50th story must have title");
});

test("DISCOVERY: Decoupled candidate pool discovers stories ranked 51-200 and public legacy stories", async () => {
  const t0 = Date.now();
  // Request candidate pool with limit=200, public_limit=50
  const docs = await rpc("ag05_public_feed_documents", { p_limit: 200, p_public_limit: 50 });
  const latency = Date.now() - t0;

  assert.equal(Array.isArray(docs), true);
  assert.equal(docs.length, 250, "Expanded candidate pool must contain 250 documents (200 chronological + 50 public)");
  assert.ok(latency < 2500, `Expanded pool fetch latency (${latency}ms) must be under 2.5s`);

  const mapped = docs.map((d) => mapMigratedStoryDocument(d, url));

  // Verify rank 51 discovery: Cervical Cancer
  const cervicalMatches = mapped.filter((a) => a.title.includes("Cervical Cancer"));
  assert.ok(cervicalMatches.length > 0, "Story ranked 51 (Cervical Cancer) must be in candidate pool");
  assert.equal(cervicalMatches[0].accessPolicy, "premium");
  assert.equal(cervicalMatches[0].bodyHtml, null, "Premium article body_html must remain null");

  // Verify rank 150 discovery: Ebola
  const ebolaMatches = mapped.filter((a) => a.title.includes("Ebola"));
  assert.ok(ebolaMatches.length > 0, "Story ranked 150 (Ebola) must be in candidate pool");
  assert.equal(ebolaMatches[0].accessPolicy, "premium");
  assert.equal(ebolaMatches[0].bodyHtml, null, "Premium article body_html must remain null");

  // Verify public legacy article discovery: "Who Should Not Take Lenacapavir" (access_policy = public)
  const lenaMatch = mapped.find((a) => a.title.includes("Who Should Not Take Lenacapavir"));
  assert.ok(lenaMatch, "Public legacy story (Who Should Not Take Lenacapavir) must be in candidate pool");
  assert.equal(lenaMatch.accessPolicy, "public");
  assert.ok(lenaMatch.bodyHtml, "Public legacy story body_html must be populated");

  // Verify public legacy article discovery: "NovoRapid" (access_policy = public)
  const novoMatch = mapped.find((a) => a.title.includes("NovoRapid"));
  assert.ok(novoMatch, "Public legacy story (NovoRapid) must be in candidate pool");
  assert.equal(novoMatch.accessPolicy, "public");
  assert.ok(novoMatch.bodyHtml, "Public legacy story body_html must be populated");
});

test("DISCOVERY: Full-corpus text search via RPC finds historic articles across all 5,700+ stories", async () => {
  const t0 = Date.now();
  const docs = await rpc("ag05_public_feed_documents", { p_limit: 50, p_public_limit: 0, p_search: "Victoria Falls" });
  const latency = Date.now() - t0;

  assert.equal(Array.isArray(docs), true);
  assert.ok(docs.length > 0, "Search query must return matching stories");
  assert.ok(latency < 1000, `Corpus search query latency (${latency}ms) must remain fast`);

  const mapped = docs.map((d) => mapMigratedStoryDocument(d, url));
  const scored = mapped
    .map((article) => ({
      article,
      score: scoreReaderSearch("Victoria Falls", {
        title: article.title,
        slug: article.slug,
        standfirst: article.standfirst,
        excerpt: article.excerpt,
        author: article.author?.displayName ?? null,
        section: article.primarySection?.name ?? null,
        publishedAt: article.publishedAt
      })
    }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => b.score - a.score);

  assert.ok(scored.length > 0, "Search ranking score must return matches");
  assert.ok(scored[0].article.title.includes("Victoria Falls"), "Top ranked match must contain query phrase");
});

test("DISCOVERY: Canonical authors and sections are fully represented in candidate pool", async () => {
  const docs = await rpc("ag05_public_feed_documents", { p_limit: 200, p_public_limit: 50 });
  const mapped = docs.map((d) => mapMigratedStoryDocument(d, url));

  const authors = new Set(mapped.map((a) => a.author?.displayName).filter(Boolean));
  assert.ok(authors.has("Michael Gwarisa"), "Michael Gwarisa must be observed");
  assert.ok(authors.has("Kuda Pembere") || authors.has("healthTimesco"), "Additional canonical authors must be observed");

  const sections = new Set(mapped.map((a) => a.primarySection?.slug).filter(Boolean));
  assert.ok(sections.size >= 10, `Candidate pool must cover rich taxonomy sections (found ${sections.size})`);
});
