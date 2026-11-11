import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const PAST = "2026-11-01T00:00:00.000Z";
const document = (overrides = {}) => ({
  story_id: "story-" + (overrides.source_id ?? "1"), source_id: "1", source_type: "post",
  source_url: "https://healthtimes.co.zw/public-post/", old_path: "/public-post/", new_path: "/public-post/",
  handling: "preserve", http_status: 200, title: "Public post", story_title: "Public post",
  canonical_url: "https://healthtimes.co.zw/public-post/", access_policy: "public", body_html: "<p>Body</p>",
  published_at: PAST, modified_at: PAST, ...overrides
});
const nativeRow = (overrides = {}) => ({
  id: "native-1", title: "Genuine newsroom report", slug: "genuine-newsroom-report", standfirst: null, excerpt: null,
  body_html: "<p>Native body</p>", published_at: PAST, modified_at: PAST, seo_title: null, seo_description: null,
  canonical_url: "https://healthtimes.co.zw/genuine-newsroom-report/", ...overrides
});

function corpus({ docs = [], native = [] }) {
  const client = {
    rpc(name) {
      const data = name === "ag05_public_feed_documents" ? docs
        : name === "newsroom_public_published_stories" ? native
        : null;
      const result = Promise.resolve({ data, error: null });
      result.limit = () => Promise.resolve({ data, error: null });
      return result;
    }
  };
  const inert = new Proxy({}, { get: () => async () => [] });
  return loadTs("src/services/migrated-corpus.ts", { mocks: {
    "../platform/config": { stagingConfig: { url: "https://staging.example", publishableKey: "x" }, hasStagingConfig: true },
    "../platform/supabase": { getStagingSupabaseClient: () => client },
    "./taxonomy": { certifiedTaxonomyFixtureService: inert },
    "./source-parity": { sourceParityServices: { articles: inert, publication: inert, advertising: inert, search: inert, taxonomy: inert, video: inert } },
    "./public-video": { publicVideoService: inert },
    "./public-live": { publicLiveService: inert },
    "./presentation": { publicPresentationService: inert },
    "../growth/direct-ad": new Proxy({}, { get: () => () => null })
  } }).migratedCorpusServices;
}
const titles = (articles) => articles.map((article) => article.title).sort();

test("published posts and genuine native stories both reach the feed", async () => {
  const home = await corpus({ docs: [document()], native: [nativeRow()] }).articles.getHome();
  assert.deepEqual(titles(home), ["Genuine newsroom report", "Public post"]);
});

test("an imported page never reaches the feed", async () => {
  const docs = [document(), document({ story_id: "page-1", source_id: "2", source_type: "page", title: "Login", story_title: "Login", old_path: "/login/", new_path: "/login/", canonical_url: "https://healthtimes.co.zw/login/" })];
  assert.deepEqual(titles(await corpus({ docs }).articles.getHome()), ["Public post"]);
});

test("a UAT story never reaches the feed", async () => {
  const native = [nativeRow(), nativeRow({ id: "native-2", title: "[UAT04B] Test Story 001", slug: "uat04b-test-story-001", canonical_url: "https://healthtimes.co.zw/uat04b-test-story-001/" })];
  const home = await corpus({ docs: [document()], native }).articles.getHome();
  assert.deepEqual(titles(home), ["Genuine newsroom report", "Public post"]);
});

test("a native story is not dropped for having no legacy source", async () => {
  const home = await corpus({ docs: [document()], native: [nativeRow()] }).articles.getHome();
  assert.ok(home.some((article) => article.canonicalStoryId === "native-1"));
});
