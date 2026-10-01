import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("UI-03 Premium preview configuration is explicit and fails closed",()=>{
  const config=read("src/growth/config.ts");
  assert.match(config,/EXPO_PUBLIC_HEALTHTIMES_PREMIUM_PREVIEW_SECONDS/);
  assert.match(config,/seconds: 0, source: "fail-closed"/);
  assert.match(config,/parsed <= 0/);
  assert.match(config,/parsed > MAX_PREMIUM_PREVIEW_SECONDS/);
  assert.doesNotMatch(read("app/article/[id].tsx"),/setTimeout\([^,]+,\s*(10000|30000|60000)\)/);
});

test("UI-03 anonymous Premium Reader never parses protected body for preview",()=>{
  const sourceParity=read("src/services/source-parity.ts");
  const article=read("app/article/[id].tsx");
  assert.match(sourceParity,/bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(article,/parseArticleContent\(protectedBody \? null : story\.bodyHtml/);
  assert.match(article,/story\.excerpt \?\? story\.standfirst \?\? ""/);
  assert.match(article,/previewVisible/);
  assert.match(article,/PremiumPaywall/);
  assert.doesNotMatch(article,/previewVisible[\s\S]{0,900}story\.bodyHtml/);
});

test("UI-03 timed preview lifecycle records configured elapsed time",()=>{
  const article=read("app/article/[id].tsx");
  for(const name of ["premium_preview_started","premium_warning_shown","premium_locked"]){
    assert.ok(article.includes('"'+name+'"'),"missing event "+name);
  }
  assert.match(article,/seconds_elapsed:previewConfig\.seconds/);
  assert.match(article,/previewConfig\.seconds\*1000/);
  assert.match(article,/premiumState==="warning"/);
});

test("UI-03 Article toolbar keeps primary actions compact and offline secondary",()=>{
  const toolbar=read("src/ui/ArticleToolbar.tsx");
  for(const label of [
    "Back",
    "Text ",
    "Save",
    "Listen",
    "Share",
    "Download article for offline reading"
  ]) assert.ok(toolbar.includes(label),"missing toolbar action "+label);
  assert.match(toolbar,/accessibilityRole="toolbar"/);
  assert.match(toolbar,/accessibilityRole="button"/);
  assert.match(toolbar,/minHeight: layout\.touchMin/);
  assert.match(toolbar,/↓ Offline/);
});

test("UI-03 Premium landing is truthful and does not invent commercial facts",()=>{
  const premium=read("app/premium.tsx");
  assert.match(premium,/Membership options aren't available on this build yet/);
  assert.match(premium,/store\.data\?\.status==="available"/);
  assert.match(premium,/offer\.displayPrice/);
  assert.match(premium,/offer\.storeProductId/);
  assert.doesNotMatch(premium,/MOST POPULAR|Most Popular/);
  assert.doesNotMatch(premium,/configuration-required/);
  assert.doesNotMatch(premium,/\$\d|US\$|ZW\$|7-day trial|free trial|20% OFF/i);
});

test("UI-03 responsive advertising preserves service and destination authority",()=>{
  const cards=read("src/ui/Cards.tsx");
  assert.match(cards,/services\.advertising\.getDecision/);
  assert.match(cards,/consentForPersonalizedAds:false/);
  assert.match(cards,/sensitiveHealthContext/);
  assert.match(cards,/adDecision\.source === "none" \|\| !adDecision\.creativeUrl/);
  assert.match(cards,/const clickable=\/\^https:/);
  assert.match(cards,/if\(!clickable\) return;/);
  assert.match(cards,/adSlotMobileRectangle/);
  assert.match(cards,/adSlotTablet/);
  assert.match(cards,/adSlotDesktop/);
  assert.match(cards,/adSlotArticleEnd/);
  assert.match(cards,/setCreativeAspect\(naturalWidth\/naturalHeight\)/);
  assert.match(cards,/ADVERTISEMENT/);
});

test("UI-03 leaves Home implementation and fixed HOSPAZ placement intact",()=>{
  const home=read("app/(reader)/index.tsx");
  assert.match(home,/AdSlot placement="hospaz-header-direct"/);
  assert.equal((home.match(/hospaz-header-direct/g)??[]).length,1);
  assert.match(home,/SectionHeader title="Top Stories"/);
  assert.match(home,/Editorial filters/);
});
