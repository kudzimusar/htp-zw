// HT-MVP-PUBLIC-LAUNCH-01-G5: Reader side of server-rendered legacy pages.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function load(path) {
  const source = readFileSync(join(root, path), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, () => { throw new Error("Unexpected require"); });
  return module.exports;
}
const web = load("src/services/public-web.ts");

test("injected capability block: only well-formed story/context/route JSON is accepted", () => {
  assert.equal(web.parseInjectedCapabilityText('{"kind":"story","seo":{}}').kind, "story");
  assert.equal(web.parseInjectedCapabilityText('{"kind":"context"}').kind, "context");
  assert.equal(web.parseInjectedCapabilityText('{"kind":"route"}').kind, "route");
  for (const bad of [null, "", "not json", '{"kind":"script"}', "[]", "1", "x".repeat(2_000_001)]) {
    assert.equal(web.parseInjectedCapabilityText(bad), null, String(bad).slice(0, 20));
  }
});

test("alias redirects only follow same-site paths", () => {
  for (const ok of ["/cholera-response-update/", "/2026/09/22/slug/", "/category/health/"]) {
    assert.equal(web.safeInternalRedirectTarget(ok), ok);
  }
  for (const bad of ["//evil.example/x", "https://evil.example/", "/\\evil.example", "javascript:alert(1)", "/javascript:alert(1)",
    "relative/path", "", null, 42, "/a\u0000b", "/" + "a".repeat(600)]) {
    assert.equal(web.safeInternalRedirectTarget(bad), null, String(bad).slice(0, 30));
  }
});

test("server data block applies only to the address it was rendered for", () => {
  assert.equal(web.injectedCapabilityMatchesPath("/cholera-response-update/", "/cholera-response-update"), true);
  assert.equal(web.injectedCapabilityMatchesPath("/cholera-response-update/", "/cholera-response-update/"), true);
  assert.equal(web.injectedCapabilityMatchesPath("/cholera-response-update/", "/another-story"), false);
  assert.equal(web.injectedCapabilityMatchesPath(null, "/x"), false);
  assert.equal(web.injectedCapabilityMatchesPath("/x/", null), false);
});

test("injectedPublicWebCapability reads the DOM block only for the matching path", () => {
  const block = { textContent: '{"kind":"story","seo":{"title":"T"}}', getAttribute: name => (name === "data-path" ? "/story-a/" : null) };
  const saved = globalThis.document;
  globalThis.document = { getElementById: id => (id === "htp-public-capability" ? block : null) };
  const savedLocation = globalThis.location;
  try {
    assert.equal(web.injectedPublicWebCapability("/story-a").kind, "story");
    assert.equal(web.injectedPublicWebCapability("/story-b"), null, "client navigation to another path must refetch");
    assert.equal(web.injectedPublicWebCapability(), null);
    // In the browser the loaded address is authoritative over the router's pathname form.
    globalThis.location = { pathname: "/story-a/" };
    assert.equal(web.injectedPublicWebCapability("/+not-found").kind, "story");
    globalThis.location = { pathname: "/story-b/" };
    assert.equal(web.injectedPublicWebCapability("/story-a"), null);
  } finally {
    if (saved === undefined) delete globalThis.document; else globalThis.document = saved;
    if (savedLocation === undefined) delete globalThis.location; else globalThis.location = savedLocation;
  }
});

test("article reader renders a supplied story on preserved WordPress addresses without an /article/<id> segment", () => {
  const article = readFileSync(join(root, "app/article/[id].tsx"), "utf8");
  assert.match(article, /const id = resolvedId \|\| initialStory\?\.id \|\| "";/);
  assert.match(article, /initialStory \? Promise\.resolve\(initialStory\) : services\.articles\.getById/);
});

test("fallback screen follows validated alias decisions, resolves canonical story identity and keys injected data by pathname (N2)", () => {
  const screen = readFileSync(join(root, "app/+not-found.tsx"), "utf8");
  assert.match(screen, /safeInternalRedirectTarget\(capability\.routing\.targetPath\)/);
  assert.match(screen, /router\.replace\(redirectTarget as never\)/);
  assert.match(screen, /resolveCanonicalStoryFromPublicCapability\(value, services\.articles\)/);
  assert.match(screen, /useMemo\(\(\) => injectedPublicWebCapability\(pathname\), \[pathname\]\)/);
  const service = readFileSync(join(root, "src/services/public-web.ts"), "utf8");
  assert.match(service, /kind=resolve&redirect=json&path=/);
  assert.doesNotMatch(service, /cp5-source-/, "N2: synthetic cp5-source- namespace must not be generated");
});

test("N2: storyFromPublicCapability uses canonical Reader slug/storyId and preserves Premium fail-closed boundaries", () => {
  const pubCap = {
    capabilityVersion: "cp5-phase3-v1",
    kind: "story",
    routing: {
      storyId: "11111111-2222-4333-8444-555555555555",
      sourceId: "9001",
      sourceType: "post",
      sourceUrl: "https://healthtimes.co.zw/cholera-response-update/",
      handling: "preserved_direct",
      canonicalUrl: "https://healthtimes.co.zw/cholera-response-update/",
      httpStatus: 200
    },
    seo: { title: "Cholera response update — HealthTimes", description: "Desc", canonicalUrl: "https://healthtimes.co.zw/cholera-response-update/", robots: "index,follow", openGraph: { type: "article", siteName: "HealthTimes", title: "T", description: "D", url: "https://healthtimes.co.zw/cholera-response-update/", image: null }, twitterCard: "summary", structuredData: {} },
    content: { storyTitle: "Cholera response update", standfirst: "Standfirst", excerpt: "Excerpt", publishedAt: "2026-10-30T08:00:00Z", modifiedAt: null, author: { name: "Jane Reporter", slug: "jane-reporter" }, section: { name: "Health", slug: "health" }, accessPolicy: "public", bodyProtected: false, bodyHtml: "<p>Body</p>", protectedPreview: null, featuredMedia: null }
  };
  const story = web.storyFromPublicCapability(pubCap);
  assert.equal(story.id, "cholera-response-update");
  assert.equal(story.slug, "cholera-response-update");
  assert.equal(story.canonicalStoryId, "11111111-2222-4333-8444-555555555555");
  assert.equal(story.sourceProvenance.sourceId, "9001");
  assert.equal(story.author.id, "wordpress-author:jane-reporter");
  assert.ok(!story.id.startsWith("cp5-source-"));

  const sluglessA = web.storyFromPublicCapability({
    ...pubCap,
    routing: { ...pubCap.routing, storyId: "aaaaaaaa-1111-4111-8111-111111111111", sourceId: "9002" },
    content: { ...pubCap.content, author: { name: "Tendai Moyo" } }
  });
  const sluglessB = web.storyFromPublicCapability({
    ...pubCap,
    routing: { ...pubCap.routing, storyId: "bbbbbbbb-2222-4222-8222-222222222222", sourceId: "9003" },
    content: { ...pubCap.content, author: { name: "Rudo Ncube" } }
  });
  assert.equal(sluglessA.author.displayName, "Tendai Moyo");
  assert.equal(sluglessB.author.displayName, "Rudo Ncube");
  assert.equal(sluglessA.author.slug, "", "unverified author must not receive a profile route");
  assert.equal(sluglessB.author.slug, "", "unverified author must not receive a profile route");
  assert.notEqual(sluglessA.author.id, sluglessB.author.id, "distinct slugless writers must not share an author identity");

  const premCap = {
    ...pubCap,
    content: { ...pubCap.content, accessPolicy: "premium", bodyProtected: true, bodyHtml: "<p>LEAK</p>", premiumTeaserHtml: "<p>Teaser</p>", protectedPreview: "Preview" }
  };
  const premStory = web.storyFromPublicCapability(premCap);
  assert.equal(premStory.accessPolicy, "premium");
  assert.equal(premStory.bodyHtml, null);
  assert.equal(premStory.premiumTeaserHtml, "<p>Teaser</p>");
});

test("N2: resolveCanonicalStoryFromPublicCapability reconciles with repository without mapping unknown stories to arbitrary articles", async () => {
  const cap = {
    capabilityVersion: "cp5-phase3-v1",
    kind: "story",
    routing: { storyId: "11111111-2222-4333-8444-555555555555", sourceId: "9001", sourceType: "post", sourceUrl: null, handling: "preserved_direct", canonicalUrl: "https://healthtimes.co.zw/cholera-response-update/", httpStatus: 200 },
    seo: { title: "Cholera", description: "", canonicalUrl: "https://healthtimes.co.zw/cholera-response-update/", robots: "index,follow", openGraph: { type: "article", siteName: "HealthTimes", title: "T", description: "", url: "https://healthtimes.co.zw/cholera-response-update/", image: null }, twitterCard: "summary", structuredData: {} },
    content: { storyTitle: "Cholera", standfirst: null, excerpt: null, publishedAt: null, modifiedAt: null, author: null, section: null, accessPolicy: "public", bodyProtected: false, bodyHtml: "<p>Public</p>", protectedPreview: null, featuredMedia: null }
  };

  // Matching repository story is adopted
  const matched = await web.resolveCanonicalStoryFromPublicCapability(cap, {
    getById: async (key) => key === "11111111-2222-4333-8444-555555555555" ? { id: "cholera-response-update", slug: "cholera-response-update", canonicalStoryId: "11111111-2222-4333-8444-555555555555", title: "Repo Cholera", accessPolicy: "public", bodyHtml: "<p>Repo</p>" } : null
  });
  assert.equal(matched.title, "Repo Cholera");
  assert.equal(matched.id, "cholera-response-update");

  // Unrelated story returned by a buggy repository is rejected; falls back to capability identity
  const guarded = await web.resolveCanonicalStoryFromPublicCapability(cap, {
    getById: async () => ({ id: "unrelated-story", slug: "unrelated-story", canonicalStoryId: "99999999-9999-4999-8999-999999999999", title: "Wrong Story", accessPolicy: "public", bodyHtml: "<p>Wrong</p>" })
  });
  assert.equal(guarded.id, "cholera-response-update");
  assert.equal(guarded.title, "Cholera");

  // Premium capability stays premium even if repository record was stale public
  const premCap = { ...cap, content: { ...cap.content, accessPolicy: "premium", bodyProtected: true, bodyHtml: null } };
  const premResolved = await web.resolveCanonicalStoryFromPublicCapability(premCap, {
    getById: async () => ({ id: "cholera-response-update", slug: "cholera-response-update", canonicalStoryId: "11111111-2222-4333-8444-555555555555", title: "Repo Cholera", accessPolicy: "public", bodyHtml: "<p>Should be stripped</p>" })
  });
  assert.equal(premResolved.accessPolicy, "premium");
  assert.equal(premResolved.bodyHtml, null);

  // R3-B2: Duplicate slug with conflicting sourceId or canonicalStoryId is rejected (never merged across distinct stories)
  const dupConflict = await web.resolveCanonicalStoryFromPublicCapability(cap, {
    getById: async () => ({
      id: "cholera-response-update",
      slug: "cholera-response-update",
      canonicalStoryId: "22222222-3333-4444-8555-666666666666",
      sourceProvenance: { sourceId: "9999" },
      title: "Different Story Sharing Slug",
      accessPolicy: "public",
      bodyHtml: "<p>Wrong body</p>"
    })
  });
  assert.equal(dupConflict.title, "Cholera");
  assert.equal(dupConflict.canonicalStoryId, "11111111-2222-4333-8444-555555555555");
  assert.equal(dupConflict.sourceProvenance.sourceId, "9001");
});

test("R3-B7: only verified WordPress slugs or a verified matching source profile create author routes", () => {
  const sourceParityText = readFileSync(join(root, "src/services/source-parity.ts"), "utf8");
  assert.match(sourceParityText, /export function slugifyAuthorName/);
  assert.match(sourceParityText, /normalize\("NFKD"\)/);
  assert.match(sourceParityText, /export function resolveManifestAuthorSlug/);
  assert.match(sourceParityText, /Do not manufacture a profile slug/);
  assert.match(sourceParityText, /if\(!author \|\| !author\.slug\) continue/);
  assert.match(sourceParityText, /if\(!authorSlug\) return \[\]/);
  const fnMatch = sourceParityText.match(/export function slugifyAuthorName[\s\S]*?return null;\n\}/);
  assert.ok(fnMatch, "author-slug helpers present");
  const transpiled = ts.transpileModule(fnMatch[0], { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", transpiled)(mod, mod.exports);
  const { slugifyAuthorName, resolveManifestAuthorSlug } = mod.exports;

  assert.equal(slugifyAuthorName("Dr. José Moyo"), "dr-jose-moyo");
  assert.equal(slugifyAuthorName("  Chipo  Ndlovu-Chikwanda! "), "chipo-ndlovu-chikwanda");
  assert.equal(resolveManifestAuthorSlug("Kudakwashe Pembere", null, { displayName: "Kudakwashe Pembere", slug: "kuda-pembere" }), "kuda-pembere");
  assert.equal(resolveManifestAuthorSlug("Jane Doe", "jane-doe-verified", { displayName: "Jane Doe", slug: "old-slug" }), "jane-doe-verified");
  assert.equal(resolveManifestAuthorSlug("Jane Doe", null, { displayName: "Different Writer", slug: "different-writer" }), null);
  assert.equal(resolveManifestAuthorSlug("Tendai Moyo", null, null), null);
  assert.equal(resolveManifestAuthorSlug("Rudo Ncube", null, null), null);
  assert.equal(resolveManifestAuthorSlug("Dr. J. Moyo", null, null), null);
  assert.equal(resolveManifestAuthorSlug("Dr J Moyo", null, null), null);
  assert.equal(resolveManifestAuthorSlug("   ", null, null), null);
});
