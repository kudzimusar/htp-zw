import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const readRepo=(path)=>readFileSync(join(repoRoot,path),"utf8");

test("Phase 6A remains one canonical shared Reader",()=>{
  const pkg=JSON.parse(read("package.json"));
  const rootLayout=read("app/_layout.tsx");
  assert.equal(pkg.name,"@healthtimes/mobile");
  assert.ok(rootLayout.includes('<Stack.Screen name="(reader)"'));
  assert.equal(rootLayout.includes("WebView"),false);
});

test("native app identity supports iOS Android tablets deep links and automatic appearance",()=>{
  const config=read("app.config.ts");
  assert.ok(config.includes('scheme: "healthtimes"'));
  assert.ok(config.includes("supportsTablet: true"));
  assert.ok(config.includes('orientation: "default"'));
  assert.ok(config.includes('userInterfaceStyle: "automatic"'));
  assert.ok(config.includes('"zw.co.healthtimes.app" + suffix'));
});

test("shared page shell protects native top side safe areas and bottom reader controls",()=>{
  const layout=read("src/ui/Layout.tsx");
  const tabs=read("app/(reader)/_layout.tsx");
  assert.ok(layout.includes('edges={["top", "left", "right"]}'));
  assert.ok(layout.includes("bottomInset={mobileTabsVisible ? 96 : 64}"));
  assert.ok(tabs.includes("minHeight:66"));
  assert.ok(tabs.includes("tabBarItemStyle:{minHeight:56}"));
});

test("native search exposes keyboard-safe focus and submission semantics",()=>{
  const layout=read("src/ui/Layout.tsx");
  const search=read("app/search.tsx");
  assert.ok(layout.includes('keyboardShouldPersistTaps="handled"'));
  assert.ok(search.includes('accessibilityLabel="Search HealthTimes"'));
  assert.ok(search.includes('returnKeyType="search"'));
  assert.ok(search.includes("onSubmitEditing={()=>submit()}"));
});

test("article native interactions keep accessible touch targets and persistence authority",()=>{
  const toolbar=read("src/ui/ArticleToolbar.tsx");
  const article=read("app/article/[id].tsx");
  const persistence=read("src/services/reader-persistence.ts");
  assert.ok(toolbar.includes("minHeight: layout.touchMin"));
  assert.ok(toolbar.includes('label="Save article"'));
  assert.ok(toolbar.includes('label="Share article"'));
  assert.ok(toolbar.includes('accessibilityLabel="Download article for offline reading"'));
  assert.ok(article.includes("Share.share"));
  assert.ok(article.includes("services.reader.toggleSavedArticle"));
  assert.ok(article.includes("services.reader.downloadArticle"));
  assert.ok(persistence.includes("@react-native-async-storage/async-storage"));
});

test("tablet layouts use additional width deliberately",()=>{
  const cards=read("src/ui/Cards.tsx");
  const tokens=read("src/theme/tokens.ts");
  assert.ok(tokens.includes("tablet: 768"));
  assert.ok(cards.includes("styles.heroTablet"));
  assert.ok(cards.includes("styles.gridItemTablet"));
  assert.ok(cards.includes("tablet && styles.gridResponsive"));
});

test("appearance preference is HealthTimes-owned and persistent",()=>{
  const appearance=read("app/appearance.tsx");
  const provider=read("src/theme/AppearanceProvider.tsx");
  const persistence=read("src/services/reader-persistence.ts");
  assert.ok(appearance.includes('["system", "light", "dark"]'));
  assert.ok(provider.includes(".getAppearance()"));
  assert.ok(provider.includes(".setAppearance(next)"));
  assert.ok(persistence.includes("ht:nm04:reader:appearance:v1"));
});

test("Phase 6A workflow is exact-head and real native-device oriented",()=>{
  const workflow=readRepo(".github/workflows/ui02-phase6a-native-cross-device.yml");
  assert.ok(workflow.includes("Prove exact candidate checkout"));
  assert.ok(workflow.includes("xcrun simctl"));
  assert.ok(workflow.includes("reactivecircus/android-emulator-runner@v2"));
  assert.ok(workflow.includes("maestro test"));
  assert.ok(workflow.includes("ui02-phase6a-native-evidence"));
  assert.equal(workflow.includes("playwright"),false);
});
