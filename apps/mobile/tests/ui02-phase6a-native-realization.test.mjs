import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const readRepo=(path)=>readFileSync(join(repoRoot,path),"utf8");

test("Phase 6A preserves the single canonical native Reader and tablet support",()=>{
  const config=read("app.config.ts");
  const rootLayout=read("app/_layout.tsx");
  assert.ok(config.includes("supportsTablet: true"));
  assert.ok(config.includes('scheme: "healthtimes"'));
  assert.ok(rootLayout.includes('<Stack.Screen name="(reader)"'));
  assert.equal(rootLayout.includes("WebView"),false);
});

test("shared Reader uses native safe areas and reserves mobile tab space",()=>{
  const layout=read("src/ui/Layout.tsx");
  assert.ok(layout.includes('SafeAreaView'));
  assert.ok(layout.includes('edges={["top", "left", "right"]}'));
  assert.ok(layout.includes("bottomInset={mobileTabsVisible ? 96 : 64}"));
  assert.ok(layout.includes('keyboardShouldPersistTaps="handled"'));
});

test("native search retains focusable keyboard input and touch-safe controls",()=>{
  const search=read("app/search.tsx");
  const tokens=read("src/theme/tokens.ts");
  assert.ok(search.includes("<TextInput"));
  assert.ok(search.includes('returnKeyType="search"'));
  assert.ok(search.includes('accessibilityLabel="Search HealthTimes"'));
  assert.ok(tokens.includes("touchMin:44"));
});

test("article native actions preserve save offline share and Premium boundaries",()=>{
  const article=read("app/article/[id].tsx");
  const toolbar=read("src/ui/ArticleToolbar.tsx");
  const persistence=read("src/services/reader-persistence.ts");
  assert.ok(article.includes("Share.share"));
  assert.ok(toolbar.includes('label="Save article"'));
  assert.ok(toolbar.includes('accessibilityLabel="Download article for offline reading"'));
  assert.ok(persistence.includes('if(article.accessPolicy==="premium")'));
  assert.ok(article.includes("PremiumPaywall"));
});

test("native persistence, Edition and Appearance remain device-backed",()=>{
  const persistence=read("src/services/reader-persistence.ts");
  const edition=read("app/edition.tsx");
  const appearance=read("src/theme/AppearanceProvider.tsx");
  assert.ok(persistence.includes("@react-native-async-storage/async-storage"));
  assert.ok(persistence.includes("getSavedArticleIds"));
  assert.ok(persistence.includes("getReadingHistoryIds"));
  assert.ok(edition.includes("savePreferences"));
  assert.ok(appearance.includes("useColorScheme"));
  assert.ok(appearance.includes("setAppearance"));
});

test("tablet composition uses width deliberately instead of scaling phone cards",()=>{
  const cards=read("src/ui/Cards.tsx");
  const readerTabs=read("app/(reader)/_layout.tsx");
  assert.ok(cards.includes("gridItemTablet"));
  assert.ok(cards.includes("heroTablet"));
  assert.ok(cards.includes("breakpoints.tablet"));
  assert.ok(readerTabs.includes("breakpoints.desktop"));
});

test("Phase 6A evidence workflow is exact-head and covers all four native matrix cells",()=>{
  const workflow=readRepo(".github/workflows/ui02-phase6a-native-cross-device.yml");
  assert.ok(workflow.includes("UI-02 Phase 6A Native Cross-Device Evidence"));
  assert.ok(workflow.includes("android-evidence"));
  assert.ok(workflow.includes("ios-evidence"));
  assert.ok(workflow.includes("pixel_tablet"));
  assert.ok(workflow.includes("iPad"));
  assert.ok(workflow.includes("ui02-phase6a-native-evidence"));
  assert.ok(workflow.includes("EXPECTED_SHA"));
});

test("Phase 6A phone flow exercises the required reader surfaces and critical interactions",()=>{
  const flow=read("e2e/ui02-phase6a-phone.yaml");
  for(const expected of [
    "Top Stories",
    "Explore",
    "Intelligent Search",
    "Save article",
    "Download article for offline reading",
    "Share article",
    "Continue reading with HealthTimes Premium",
    "Live",
    "Watch",
    "Listen",
    "Saved & Offline",
    "My HealthTimes",
    "Edition & Preferences",
    "Dark"
  ]) assert.ok(flow.includes(expected),expected);
});

test("Phase 6A tablet flow targets the five tablet-sensitive surfaces",()=>{
  const flow=read("e2e/ui02-phase6a-tablet.yaml");
  for(const expected of [
    "Top Stories",
    "Zimbabwe Looks to Strengthen Social Contracting",
    "Watch",
    "My HealthTimes",
    "Edition & Preferences"
  ]) assert.ok(flow.includes(expected),expected);
});
