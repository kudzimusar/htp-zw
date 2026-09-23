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

test("Phase 6 staging Reader uses the accepted migrated corpus without reopening NM-04", () => {
  const services = read("src/services/index.ts");
  const migrated = read("src/services/migrated-corpus.ts");
  const eas = JSON.parse(read("eas.json"));

  assert.match(services, /migratedCorpusServices/);
  assert.match(migrated, /ag05_public_story_document/);
  assert.match(migrated, /ag05_public_feed_rows/);
  assert.equal(eas.build.staging.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE, "staging");
  assert.doesNotMatch(services, /Staging editorial-data mode is locked until AG-04/);
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
  assert.match(article, /parseArticleContent/);
  assert.match(article, /article_after_intro/);
  assert.match(article, /This Premium article is available to members/);
});


test("media and personal surfaces remain service-owned and globally edition-safe", () => {
  const live = read("app/(reader)/live.tsx");
  const watch = read("app/(reader)/watch.tsx");
  const listen = read("app/listen.tsx");
  const edition = read("app/edition.tsx");
  const onboarding = read("app/onboarding.tsx");
  const premium = read("app/premium.tsx");
  const notifications = read("app/notifications.tsx");

  assert.match(live, /services\.live\.list/);
  assert.match(watch, /services\.video\.list/);
  assert.match(listen, /services\.audio\.list/);
  assert.match(edition, /services\.reader\.getPreferences/);
  assert.match(onboarding, /services\.taxonomy\.getSnapshot/);
  assert.match(onboarding, /saveNotificationPreferences/);
  assert.doesNotMatch(edition, /Zimbabwe/);
  assert.doesNotMatch(onboarding, /Zimbabwe/);
  assert.match(premium, /Already a member\? Sign in to restore your HealthTimes Premium access/);
  assert.match(notifications, /Choose which HealthTimes alerts you want to receive/);
});


test("responsive Reader shell keeps mobile native and desktop editorial navigation aligned", () => {
  const tabs = read("app/(reader)/_layout.tsx");
  const layout = read("src/ui/Layout.tsx");

  for (const label of ["Home","Explore","Live","Watch","My HT"]) {
    assert.ok(tabs.includes('title:"' + label + '"'), "missing bottom tab: " + label);
  }
  for (const kind of ["home","explore","live","watch","profile"]) {
    assert.ok(tabs.includes('icon("' + kind + '")'), "missing bottom-tab icon: " + kind);
  }
  assert.ok(tabs.includes("tabBarActiveTintColor:palette.blue"));
  assert.ok(tabs.includes("tabBarInactiveTintColor:palette.inkMuted"));
  assert.ok(layout.includes("phone = width < breakpoints.tablet"));
  assert.ok(layout.includes("mobileUtilityWrap"));
  assert.ok(layout.includes("Search HealthTimes"));
  assert.ok(layout.includes("Notifications"));
  assert.ok(layout.includes("Change edition"));
  assert.ok(layout.includes("mobileTabsVisible ? 96 : 64"));
});


test("Home editorial filters are functional and default country preferences stay global-neutral", () => {
  const home = read("app/(reader)/index.tsx");
  const persistence = read("src/services/reader-persistence.ts");
  assert.ok(home.includes('type HomeFilter="for-you"|"latest"|"edition"|"world"|"health"'));
  assert.ok(home.includes("setActiveFilter(item.key)"));
  assert.ok(home.includes("matchesPreferences"));
  assert.ok(home.includes('activeFilter==="latest"'));
  assert.ok(home.includes('activeFilter==="edition"'));
  assert.ok(home.includes('activeFilter==="world"'));
  assert.ok(home.includes('activeFilter==="health"'));
  assert.ok(home.includes('live.data?.length'));
  assert.ok(persistence.includes("followedCountries: []"));
  assert.equal(persistence.includes('followedCountries: ["Zimbabwe"]'), false);
});