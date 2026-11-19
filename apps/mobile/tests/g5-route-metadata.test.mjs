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

const MANDATORY_EXPORTED_PAGES = [
  { file: "index.html", title: /<title data-rh="true">HealthTimes<\/title>/, canonical: /rel="canonical" href="https:\/\/healthtimes\.co\.zw\/"/, robots: /name="robots" content="index,follow"/ },
  { file: "explore.html", title: /<title data-rh="true">Explore — HealthTimes<\/title>/, canonical: /rel="canonical" href="https:\/\/healthtimes\.co\.zw\/explore"/, robots: /name="robots" content="index,follow"/ },
  { file: "about.html", title: /<title data-rh="true">About HealthTimes<\/title>/, canonical: /rel="canonical" href="https:\/\/healthtimes\.co\.zw\/about"/, robots: /name="robots" content="index,follow"/ },
  { file: "studio/stories.html", robots: /name="robots" content="noindex,nofollow"/ },
  { file: "privacy.html", robots: /name="robots" content="noindex,follow"/ },
  { file: "terms.html", robots: /name="robots" content="noindex,follow"/ },
  { file: "subscription-terms.html", robots: /name="robots" content="noindex,follow"/ }
];

function verifyExportedRouteMetadata(distDir, { expectedSha = "" } = {}) {
  const missing = MANDATORY_EXPORTED_PAGES.filter(entry => !existsSync(join(distDir, entry.file))).map(entry => entry.file);
  if (missing.length > 0) {
    throw new Error("MISSING_WEB_EXPORT: mandatory exported pages are absent from " + distDir + ": " + missing.join(", "));
  }
  const buildInfoPath = join(distDir, "build-info.json");
  if (!existsSync(buildInfoPath)) {
    throw new Error("MISSING_WEB_EXPORT: build-info.json is absent from " + distDir);
  }
  const buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf8"));
  if (typeof buildInfo?.sha !== "string" || !/^[0-9a-f]{40}$/i.test(buildInfo.sha)) {
    throw new Error("MISSING_WEB_EXPORT: build-info.json lacks a valid 40-char commit sha");
  }
  if (expectedSha && buildInfo.sha.toLowerCase() !== String(expectedSha).trim().toLowerCase()) {
    throw new Error("STALE_WEB_EXPORT: build-info.json sha " + buildInfo.sha + " does not match expected " + expectedSha);
  }
  for (const entry of MANDATORY_EXPORTED_PAGES) {
    const html = readFileSync(join(distDir, entry.file), "utf8");
    if (entry.title) assert.match(html, entry.title, entry.file + " title");
    if (entry.canonical) assert.match(html, entry.canonical, entry.file + " canonical");
    if (entry.robots) assert.match(html, entry.robots, entry.file + " robots");
  }
}

test("exported pages carry their route metadata and fail clearly when the export is absent or stale (N6)", () => {
  const expectedSha = process.env.HT_EXPECTED_BUILD_SHA || process.env.GITHUB_SHA || "";
  verifyExportedRouteMetadata(join(root, "dist"), { expectedSha });
});

test("deliberately missing web export fails closed with MISSING_WEB_EXPORT (N6 negative regression)", () => {
  assert.throws(
    () => verifyExportedRouteMetadata(join(root, "tests", "__nonexistent_export_dir__")),
    /MISSING_WEB_EXPORT/
  );
});

test("stale prior web export with mismatched SHA fails closed with STALE_WEB_EXPORT (N6 negative regression)", () => {
  assert.throws(
    () => verifyExportedRouteMetadata(join(root, "dist"), { expectedSha: "0000000000000000000000000000000000000000" }),
    /STALE_WEB_EXPORT/
  );
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
