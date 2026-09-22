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
    "app/system-status.tsx",
    "app/growth-status.tsx",
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
    "PremiumStoreService",
    "AdvertisingService",
    "AnalyticsService",
    "LiveService",
    "VideoService",
    "AudioService",
    "NotificationService",
    "PlatformService",
    "TaxonomyService",
    "SocialAttributionService"
  ]) {
    assert.match(contracts, new RegExp(`export interface ${contract}\\b`), `missing contract: ${contract}`);
  }
});

test("staging composition is transparent and production remains fail-closed", () => {
  const services = read("src/services/index.ts");
  assert.match(services, /appEnvironment === "production"/);
  assert.match(services, /editorialDataMode === "staging"/);
  assert.match(services, /stagingAuthService/);
  assert.match(services, /stagingPlatformService/);
  assert.match(services, /Staging editorial-data mode is locked/);

  const config = read("src/platform/config.ts");
  assert.match(config, /FIXTURE EDITORIAL DATA/);
  assert.match(config, /LIVE STAGING PLATFORM/);

  const fixtures = read("src/services/fixtures.ts");
  const advertising = read("src/growth/advertising.ts");
  assert.match(fixtures, /createAdvertisingService/, "fixture advertising must route through the NM-05 policy service");
  assert.match(advertising, /source: "none"/, "fixture advertising must not masquerade as real inventory");
  assert.match(fixtures, /getProtectedArticle\(\)[\s\S]*return null/, "fixture Premium service must not return protected bodies");
});

test("PWA contract is installable, subpath-safe and static-export ready", () => {
  const manifest = JSON.parse(read("public/manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.icons[0].src, "healthtimes-icon.svg");
  assert.equal(manifest.theme_color, "#071A2B");

  const html = read("app/+html.tsx");
  assert.match(html, /Constants\.expoConfig\?\.experiments/);
  assert.match(html, /assetPath\("manifest\.json"\)/);
  assert.match(html, /assetPath\("sw\.js"\)/);

  const sw = read("public/sw.js");
  assert.match(sw, /self\.registration\.scope/);
  assert.match(sw, /scopedPath\("manifest\.json"\)/);
  assert.match(sw, /scopedPath\("healthtimes-icon\.svg"\)/);

  const config = read("app.config.ts");
  assert.match(config, /zw\.co\.healthtimes\.app/);
  assert.match(config, /output: "static"/);
  assert.match(config, /baseUrl: webBaseUrl/);
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

  const entries = files.map((file) => ({
    path: relative(root, file),
    content: readFileSync(file, "utf8")
  }));
  const corpus = entries.map(({ path, content }) => `\n--- ${path} ---\n${content}`).join("\n");

  assert.doesNotMatch(corpus, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.doesNotMatch(corpus, /service_role/i);
  assert.doesNotMatch(corpus, /ca-app-pub-/i, "unverified AdMob identifiers must not enter the client");
  assert.doesNotMatch(corpus, /react-native-webview|<WebView\b/i);

  const publicIdentityAllowed = new Set([
    "src/growth/config.ts",
    "public/ads.txt",
    "public/app-ads.txt"
  ]);
  for (const entry of entries) {
    if (/ca-pub-\d+/i.test(entry.content) || /G-[A-Z0-9]{8,}/.test(entry.content)) {
      assert.equal(
        publicIdentityAllowed.has(entry.path),
        true,
        `verified web Google/AdSense identity leaked outside approved continuity files: ${entry.path}`
      );
    }
  }
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
