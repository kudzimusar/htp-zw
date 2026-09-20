import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("ReaderRepository exposes deterministic persistent Reader capabilities", () => {
  const contracts = read("src/domain/contracts.ts");
  for (const method of [
    "getSavedArticleIds",
    "toggleSavedArticle",
    "getDownloadedArticles",
    "downloadArticle",
    "removeDownloadedArticle",
    "getReadPosition",
    "setReadPosition",
    "recordReadingHistory",
    "getReadingHistoryIds",
    "getAppearance",
    "setAppearance"
  ]) {
    assert.match(contracts, new RegExp("\\b" + method + "\\b"), "missing ReaderRepository method: " + method);
  }
});

test("device persistence separates saved, downloads, progress, history and appearance", () => {
  const persistence = read("src/services/reader-persistence.ts");
  for (const key of [
    "preferences",
    "appearance",
    "saved",
    "downloads",
    "progress",
    "history"
  ]) {
    assert.match(persistence, new RegExp("ht:nm04:reader:" + key + ":v1"));
  }
  assert.match(persistence, /Math\.max\(0, Math\.min\(1, value\)\)/);
  assert.match(persistence, /slice\(0, 100\)/, "reading history must be bounded");
});

test("Article Reader restores progress and blocks unauthorized Premium offline body", () => {
  const article = read("app/article/[id].tsx");
  assert.match(article, /getReadPosition/);
  assert.match(article, /initialScrollProgress/);
  assert.match(article, /setReadPosition/);
  assert.match(article, /downloadArticle/);
  assert.match(article, /Premium body is not available for offline storage without entitlement/);
  assert.match(article, /recordReadingHistory/);
});

test("Saved and Offline library keeps bookmarks, downloads and history distinct", () => {
  const saved = read("app/saved.tsx");
  assert.match(saved, /type LibraryTab = "articles" \| "videos" \| "audio" \| "offline" \| "history"/);
  assert.match(saved, /Available offline/);
  assert.match(saved, /Remove download/);
  assert.match(saved, /Reading history/);
  assert.match(saved, /stored separately from bookmarks/);
});

test("appearance, accessibility and tablet density are wired into Reader UI", () => {
  const provider = read("src/theme/AppearanceProvider.tsx");
  const layout = read("src/ui/Layout.tsx");
  const cards = read("src/ui/Cards.tsx");
  const appearance = read("app/appearance.tsx");
  const tokens = read("src/theme/tokens.ts");

  assert.match(provider, /useColorScheme/);
  assert.match(provider, /appearance === "dark"/);
  assert.match(provider, /appearance === "system"/);
  assert.match(appearance, /"system", "light", "dark"/);
  assert.match(layout, /accessibilityState=\{\{ selected: active \}\}/);
  assert.match(tokens, /touchMin: 44/);
  assert.match(cards, /breakpoints\.tablet/);
  assert.match(cards, /gridItemTablet/);
  assert.match(cards, /gridItemDesktop/);
});

test("NM-04 cannot claim real migrated content before AG-04", () => {
  const services = read("src/services/index.ts");
  const source = read("src/domain/source.ts");

  assert.match(services, /Staging editorial-data mode is locked until AG-04/);
  assert.match(source, /status: "blocked"/);
  assert.match(source, /authoritativeDatabaseValidated: false/);
  assert.match(source, /completeUploadsValidated: false/);
});

test("unified UI milestone follows approved Reader and PWA design authority", () => {
  const layout = read("src/ui/Layout.tsx");
  const cards = read("src/ui/Cards.tsx");
  const home = read("app/(reader)/index.tsx");
  const explore = read("app/(reader)/explore.tsx");
  const search = read("app/search.tsx");
  const article = read("app/article/[id].tsx");

  assert.match(layout, /EDITION/);
  assert.match(layout, /My HealthTimes/);
  assert.match(layout, /breakpoints\.desktop/);
  assert.match(cards, /export function StoryList/);
  assert.match(cards, /heroDesktop/);
  assert.match(home, /Editorial filters/);
  assert.doesNotMatch(home, /zone\.slug === "zimbabwe"/i, "Home must not permanently hard-code Zimbabwe as the active edition");
  assert.match(explore, /TAXONOMY GATEWAY/);
  assert.match(search, /Suggested searches/);
  assert.match(search, /VideoCard/);
  assert.match(search, /AudioCard/);
  assert.match(search, /LiveRail/);
  assert.match(article, /articleParagraphs/);
  assert.match(article, /article_after_intro/);
  assert.match(article, /AG-06 remains the server authority for entitlement/);
});
