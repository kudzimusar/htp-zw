import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("required Reader and Studio routes exist", () => {
  const routes = [
    "app/(reader)/index.tsx",
    "app/(reader)/explore.tsx",
    "app/(reader)/live.tsx",
    "app/(reader)/watch.tsx",
    "app/(reader)/my.tsx",
    "app/search.tsx",
    "app/article/[id].tsx",
    "app/listen.tsx",
    "app/saved.tsx",
    "app/notifications.tsx",
    "app/edition.tsx",
    "app/premium.tsx",
    "app/onboarding.tsx",
    "app/studio/index.tsx",
    "app/studio/[module].tsx"
  ];
  for (const route of routes) {
    assert.equal(existsSync(join(root, route)), true, `missing route: ${route}`);
  }
  assert.equal(existsSync(join(root, "app/index.tsx")), false, "Reader route group should own / without a duplicate root route");
});

test("service contract surface stays explicit", () => {
  const contracts = read("src/domain/contracts.ts");
  for (const contract of [
    "ArticleRepository",
    "SearchService",
    "AuthService",
    "ReaderRepository",
    "PremiumService",
    "AdvertisingService",
    "AnalyticsService",
    "LiveService",
    "VideoService",
    "AudioService",
    "NotificationService",
    "SocialAttributionService"
  ]) {
    assert.match(contracts, new RegExp(`export interface ${contract}\\b`), `missing contract: ${contract}`);
  }
});

test("non-fixture environments fail closed", () => {
  const services = read("src/services/index.ts");
  assert.match(services, /serviceMode !== "fixture"/);
  assert.match(services, /Production service adapters are locked/);
  assert.match(services, /Staging service adapters are locked/);

  const fixtures = read("src/services/fixtures.ts");
  assert.match(fixtures, /source: "none"/, "fixture advertising must not masquerade as real inventory");
  assert.match(fixtures, /getProtectedArticle\(\)[\s\S]*return null/, "fixture Premium service must not return protected bodies");
});

test("PWA contract is installable and static-export ready", () => {
  const manifest = JSON.parse(read("public/manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.theme_color, "#071A2B");
  assert.equal(existsSync(join(root, "public/sw.js")), true);

  const config = read("app.config.ts");
  assert.match(config, /zw\.co\.healthtimes\.app/);
  assert.match(config, /output: "static"/);
});

test("mobile workspace contains no production credentials or WebView architecture", () => {
  const roots = ["app", "src", "public"];
  const files = [];

  const walk = (path) => {
    for (const name of readdirSync(path)) {
      const full = join(path, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  for (const dir of roots) walk(join(root, dir));

  const corpus = files.map((file) => `\n--- ${relative(root, file)} ---\n${readFileSync(file, "utf8")}`).join("\n");
  assert.doesNotMatch(corpus, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.doesNotMatch(corpus, /ca-pub-\d+/i);
  assert.doesNotMatch(corpus, /G-[A-Z0-9]{8,}/);
  assert.doesNotMatch(corpus, /react-native-webview|<WebView\b/i);
});

test("approved design hierarchy remains visible in the core UI", () => {
  const home = read("app/(reader)/index.tsx");
  for (const heading of [
    "Live Now",
    "Top Stories",
    "For You",
    "Primary Edition",
    "Research & Findings",
    "Health Business",
    "Premium Intelligence",
    "Watch",
    "Global Health",
    "Most Read / Trending"
  ]) {
    assert.match(home, new RegExp(heading.replace(/[&/]/g, "\\$&")));
  }

  const studio = read("src/ui/Studio.tsx");
  assert.match(studio, /Create \/ Edit/);
  assert.match(studio, /Authority: AG-06 server roles only/);
});
