import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

function loadPlacementHelper() {
  const source = read("src/ui/Cards.tsx");
  const start = source.indexOf("export type AdPlacementFamily");
  const end = source.indexOf("export function AdSlot(");
  assert.ok(start > 0 && end > start, "missing resolveAdPlacementPresentation block in Cards.tsx");
  const snippet =
    `const breakpoints = { tablet: 768, desktop: 1100 };\n` +
    source.slice(start, end);
  const output = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", output)(mod, mod.exports);
  return mod.exports;
}

test("UI-WF-05 active Reader placements remain exact and unused placement keys are not activated", () => {
  const home = read("app/(reader)/index.tsx");
  const article = read("app/article/[id].tsx");
  const watch = read("app/(reader)/watch.tsx");
  const live = read("app/(reader)/live.tsx");
  const search = read("app/(reader)/search.tsx");
  const listen = read("app/listen.tsx");
  const saved = read("app/saved.tsx");
  const my = read("app/(reader)/my.tsx");
  const edition = read("app/edition.tsx");
  const premium = read("app/premium.tsx");

  for (const key of ["hospaz-header-direct", "home_after_live", "home_watch", "home_deep_feed"]) {
    assert.ok(home.includes(`placement="${key}"`), `missing active Home placement ${key}`);
  }
  for (const key of ["article_after_intro", "article_end"]) {
    assert.ok(article.includes(`placement="${key}"`), `missing active Article placement ${key}`);
  }
  assert.ok(watch.includes('placement="watch_feed"'), "missing Watch placement watch_feed");
  assert.ok(live.includes('placement="live_feed"'), "missing Live placement live_feed");

  const allRoutes = [home, article, watch, live, search, listen, saved, my, edition, premium].join("\n");
  for (const unused of ["home_top", "home_feed_1", "home_feed_2"]) {
    assert.doesNotMatch(
      allRoutes,
      new RegExp(`placement=["']${unused}["']`),
      `unused placement ${unused} must not be activated`
    );
  }
});

test("UI-WF-05 resolveAdPlacementPresentation maps placement families and responsive geometry across phone, tablet, and desktop", () => {
  const { resolveAdPlacementPresentation } = loadPlacementHelper();

  // 1. HOSPAZ direct header family
  assert.deepEqual(resolveAdPlacementPresentation("hospaz-header-direct", 390), {
    family: "direct_header",
    variant: "mobile_banner",
    fallbackAspect: 16 / 3
  });
  assert.deepEqual(resolveAdPlacementPresentation("hospaz-header-direct", 834), {
    family: "direct_header",
    variant: "tablet_banner",
    fallbackAspect: 6 / 1
  });
  assert.deepEqual(resolveAdPlacementPresentation("hospaz-header-direct", 1440), {
    family: "direct_header",
    variant: "desktop_leaderboard",
    fallbackAspect: 8 / 1
  });

  // 2. Home feed family
  for (const key of ["home_after_live", "home_watch", "home_deep_feed"]) {
    assert.equal(resolveAdPlacementPresentation(key, 390).family, "home_feed");
    assert.equal(resolveAdPlacementPresentation(key, 390).variant, "mobile_feed_banner");
    assert.equal(resolveAdPlacementPresentation(key, 834).variant, "tablet_in_content");
    assert.equal(resolveAdPlacementPresentation(key, 1440).variant, "desktop_in_content");
  }

  // 3. Watch and Live media feed family
  for (const key of ["watch_feed", "live_feed"]) {
    assert.equal(resolveAdPlacementPresentation(key, 390).family, "media_feed");
    assert.equal(resolveAdPlacementPresentation(key, 390).variant, "mobile_media_feed");
    assert.equal(resolveAdPlacementPresentation(key, 834).variant, "tablet_media_feed");
    assert.equal(resolveAdPlacementPresentation(key, 1440).variant, "desktop_media_feed");
  }

  // 4. Article after intro (mobile rectangle vs tablet/desktop in-content)
  assert.deepEqual(resolveAdPlacementPresentation("article_after_intro", 390), {
    family: "article_after_intro",
    variant: "mobile_in_article_rectangle",
    fallbackAspect: 6 / 5
  });
  assert.deepEqual(resolveAdPlacementPresentation("article_after_intro", 834), {
    family: "article_after_intro",
    variant: "tablet_in_article",
    fallbackAspect: 5 / 1
  });
  assert.deepEqual(resolveAdPlacementPresentation("article_after_intro", 1440), {
    family: "article_after_intro",
    variant: "desktop_in_article",
    fallbackAspect: 6 / 1
  });

  // 5. Article end wide closing family
  assert.deepEqual(resolveAdPlacementPresentation("article_end", 390), {
    family: "article_end",
    variant: "mobile_article_end",
    fallbackAspect: 16 / 4
  });
  assert.deepEqual(resolveAdPlacementPresentation("article_end", 834), {
    family: "article_end",
    variant: "tablet_article_end",
    fallbackAspect: 6 / 1
  });
  assert.deepEqual(resolveAdPlacementPresentation("article_end", 1440), {
    family: "article_end",
    variant: "desktop_article_end",
    fallbackAspect: 8 / 1
  });
});

test("UI-WF-05 AdSlot preserves zero-space collapse, non-personalized sensitive-health handling, and commercial truth boundaries", () => {
  const cards = read("src/ui/Cards.tsx");
  const config = read("src/growth/config.ts");
  const directAd = read("src/growth/direct-ad.ts");
  const sourceParity = read("src/services/source-parity.ts");
  const evidence = read("tests/ui03-commercial-reader-evidence.mjs");

  assert.match(cards, /if\(!adDecision \|\| adDecision\.source === "none" \|\| !adDecision\.creativeUrl\) return null;/);
  assert.match(cards, /sensitiveHealthContext = true/);
  assert.match(cards, /consentForPersonalizedAds:false/);
  assert.match(cards, /resolveAdPlacementPresentation\(placement,width\)/);
  assert.match(cards, /adSlotDirectHeader/);
  assert.match(cards, /adSlotHomeFeed/);
  assert.match(cards, /adSlotMediaFeed/);
  assert.match(cards, /adSlotInArticle/);
  assert.match(cards, /adSlotMobileRectangle/);
  assert.match(cards, /adSlotArticleEnd/);
  assert.match(cards, /const clickable=\/\^https:\\\/\\\/\/i\.test\(destination\)/);
  assert.match(cards, /if\(!clickable\) return;/);
  assert.match(cards, /No verified destination is available for this advertisement\./);
  assert.doesNotMatch(cards, /Ad space|Reserved advertising|Placeholder/i);

  assert.match(config, /adMobAppId: null/);
  assert.match(config, /adMobBannerUnitId: null/);
  assert.match(directAd, /personalization:"none"/);
  assert.match(sourceParity, /source: "none"/);
  assert.match(evidence, /stagingRpc\("ag05_hospaz_direct_ad_preview"/);
  assert.match(evidence, /destination_state:destinationState/);
  assert.match(evidence, /schedule_state:scheduleState/);
  assert.match(evidence, /placement_conditions_state:placementConditionsState/);
  assert.match(evidence, /ad_clickable:expectedClickable/);
  assert.doesNotMatch(evidence, /destination_state:"UNKNOWN"/);
  assert.doesNotMatch(evidence, /schedule_state:"UNKNOWN"/);
  assert.doesNotMatch(evidence, /placement_conditions_state:"UNKNOWN"/);
});
