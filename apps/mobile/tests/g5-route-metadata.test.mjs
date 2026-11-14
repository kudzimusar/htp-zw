// HT-MVP-PUBLIC-LAUNCH-01-G5: route-level titles, canonical URLs and robots.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");
function load(path) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, () => { throw new Error("Unexpected require"); });
  return module.exports;
}
const seo = load("src/seo/route-metadata.ts");

test("public routes get a title, description and canonical URL on the canonical origin", () => {
  const home = seo.routeMetadata("/");
  assert.deepEqual({ ...home }, { title: "HealthTimes", description: "Health news, investigations and analysis from HealthTimes.", canonicalUrl: "https://healthtimes.co.zw/", robots: "index,follow" });
  const explore = seo.routeMetadata("/explore/");
  assert.equal(explore.title, "Explore — HealthTimes");
  assert.equal(explore.canonicalUrl, "https://healthtimes.co.zw/explore");
  assert.equal(seo.routeMetadata("/(reader)/explore").canonicalUrl, "https://healthtimes.co.zw/explore");
  assert.equal(seo.routeMetadata("/about").title, "About HealthTimes");
  assert.equal(seo.routeMetadata("/search").robots, "noindex,follow");
  assert.equal(seo.routeMetadata("/listen").robots, "noindex,follow", "unavailable feature stays out of search");
});

test("draft policies are noindex until legal approval", () => {
  for (const path of ["/privacy", "/terms", "/subscription-terms"]) {
    assert.equal(seo.routeMetadata(path).robots, "noindex,follow");
    assert.equal(seo.routeMetadata(path, { policiesApproved: true }).robots, "index,follow");
  }
});

test("personal, staff and payment surfaces are never indexed", () => {
  for (const path of ["/my", "/saved", "/account-access", "/devices-sessions", "/studio", "/studio/stories", "/owner-preview/studio/premium", "/payment/return"]) {
    assert.equal(seo.routeMetadata(path).robots, "noindex,nofollow", path);
  }
  assert.equal(seo.routeMetadata("/studious-article/"), null, "prefix match is segment-based");
});

test("story, author and legacy addresses are left to their own capability metadata", () => {
  for (const path of ["/article/source-1", "/author/jane", "/cholera-response-update/", "/category/health/"]) {
    assert.equal(seo.routeMetadata(path), null, path);
  }
});

test("every screen gets route metadata through Page (no new import in P0-harnessed files)", () => {
  const layout = read("src/ui/Layout.tsx");
  assert.match(layout, /import \{ RouteSeoHead \} from "\.\.\/seo\/RouteSeoHead";/);
  assert.match(layout, /<SafeAreaView[^>]*>\s*<RouteSeoHead \/>/);
  const head = read("src/seo/RouteSeoHead.tsx");
  assert.match(head, /if \(Platform\.OS !== "web"\) return null;/);
  assert.match(head, /policiesApproved: policiesApprovedForLaunch\(\)/);
  assert.doesNotMatch(read("app/_layout.tsx"), /RouteSeoHead|expo-router\/head/);
  assert.match(read("src/ui/Studio.tsx"), /<StudioPreferencesProvider>\s*<RouteSeoHead \/>/, "Studio screens do not use Page");
});

test("exported pages carry their route metadata (when a local web export exists)", () => {
  const dist = join(root, "dist");
  if (!existsSync(join(dist, "explore.html"))) return;
  const explore = readFileSync(join(dist, "explore.html"), "utf8");
  assert.match(explore, /<title data-rh="true">Explore — HealthTimes<\/title>/);
  assert.match(explore, /rel="canonical" href="https:\/\/healthtimes\.co\.zw\/explore"/);
  const studio = readFileSync(join(dist, "studio/stories.html"), "utf8");
  assert.match(studio, /name="robots" content="noindex,nofollow"/);
  const privacy = readFileSync(join(dist, "privacy.html"), "utf8");
  assert.match(privacy, /name="robots" content="noindex,follow"/);
});

test("article pages describe the story and point canonical at its preserved public URL", () => {
  const meta = seo.articleMetadata({
    title: "Cholera response update",
    standfirst: "  Ministry confirms\n new treatment centres. ",
    canonicalUrl: "https://healthtimes.co.zw/cholera-response-update/",
    heroMedia: { publicUrl: "https://healthtimes-media.pages.dev/wordpress/2026/10/cholera.jpg" }
  });
  assert.deepEqual({ ...meta }, {
    title: "Cholera response update — HealthTimes",
    description: "Ministry confirms new treatment centres.",
    canonicalUrl: "https://healthtimes.co.zw/cholera-response-update/",
    image: "https://healthtimes-media.pages.dev/wordpress/2026/10/cholera.jpg"
  });
  const unsafe = seo.articleMetadata({ title: "T", canonicalUrl: "javascript:alert(1)", heroMedia: { publicUrl: "http://insecure.example/x.jpg" } });
  assert.equal(unsafe.canonicalUrl, null);
  assert.equal(unsafe.image, null);
  assert.equal(seo.articleMetadata({ title: "T", excerpt: "x".repeat(400) }).description.length, 298);
  const article = read("app/article/[id].tsx");
  assert.match(article, /<ArticleSeoHead story=\{story\} \/>/);
});
