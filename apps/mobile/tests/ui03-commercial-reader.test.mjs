import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("UI-03 Premium preview configuration follows frozen owner teaser policy and fails closed",()=>{
  const config=read("src/growth/config.ts");
  assert.match(config,/premiumTeaserParagraphCount: 1/);
  assert.match(config,/premiumTeaserDurationSeconds: 20/);
  assert.match(config,/paragraphCount!==1 \|\| durationSeconds!==20/);
  assert.match(config,/source:"fail-closed"/);
  assert.doesNotMatch(config,/EXPO_PUBLIC_HEALTHTIMES_PREMIUM_PREVIEW_SECONDS/);
});

test("UI-03 anonymous Premium Reader uses only explicit public teaser authority",()=>{
  const sourceParity=read("src/services/source-parity.ts");
  const article=read("app/article/[id].tsx");
  assert.match(sourceParity,/bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(sourceParity,/premiumTeaserHtml:accessPolicy==="premium"/);
  assert.match(article,/parseArticleContent\(protectedBody \? null : story\.bodyHtml/);
  assert.match(article,/publicStory\.premiumTeaserHtml/);
  assert.match(article,/premiumTeaserParagraph/);
  assert.match(article,/premiumTeaserBlock/);
  assert.match(article,/previewVisible/);
  assert.match(article,/PremiumPaywall/);
  assert.doesNotMatch(article,/const previewCopy=/);
  assert.doesNotMatch(article,/previewVisible[\s\S]{0,1200}story\.bodyHtml/);
});

test("UI-03 timed preview lifecycle uses the persistent 20-second story ledger",()=>{
  const article=read("app/article/[id].tsx");
  for(const name of ["premium_preview_started","premium_warning_shown","premium_locked"]){
    assert.ok(article.includes('"'+name+'"'),"missing event "+name);
  }
  assert.match(article,/getPremiumPreviewWindow/);
  assert.match(article,/current\.canonicalStoryId \?\? current\.id/);
  assert.match(article,/previewConfig\.seconds===20/);
  assert.match(article,/previewWindow\.remainingSeconds\*1000/);
  assert.match(article,/seconds_elapsed:previewConfig\.seconds/);
  assert.match(article,/premiumPreview\.state==="warning"/);
});

test("UI-03 Article toolbar is icon-led, accessible, and keeps Offline secondary",()=>{
  const toolbar=read("src/ui/ArticleToolbar.tsx");
  for(const label of [
    "Back",
    "Text size ",
    "Save article",
    "Listen to article",
    "Share article",
    "Download article for offline reading"
  ]) assert.ok(toolbar.includes(label),"missing accessible toolbar action "+label);
  for(const glyph of ['glyph="←"','glyph="Aa"','glyph="☆"','glyph="▶"','glyph="↗"']){
    assert.ok(toolbar.includes(glyph),"missing toolbar glyph "+glyph);
  }
  assert.match(toolbar,/accessibilityRole="toolbar"/);
  assert.match(toolbar,/accessibilityRole="button"/);
  assert.match(toolbar,/accessibilityLabel=\{label\}/);
  assert.match(toolbar,/minHeight: layout\.touchMin/);
  assert.match(toolbar,/↓ Offline/);
  assert.doesNotMatch(toolbar,/styles\.label/);
});

test("UI-03 Premium landing separates source states and keeps reader copy truthful",()=>{
  const premium=read("app/premium.tsx");
  assert.match(premium,/sourceStories\.loading/);
  assert.match(premium,/sourceStories\.error/);
  assert.match(premium,/premiumStories\.length > 0/);
  assert.match(premium,/Premium stories loading/);
  assert.match(premium,/Premium stories unavailable/);
  assert.match(premium,/Source-backed Premium journalism/);
  assert.match(premium,/Premium stories empty/);
  assert.match(premium,/Membership options aren't available here yet/);
  assert.match(premium,/Your Premium access is active\./);
  assert.match(premium,/store\.data\?\.status==="available"/);
  assert.match(premium,/offer\.displayPrice/);
  assert.match(premium,/offer\.storeProductId/);
  assert.doesNotMatch(premium,/on this build|approved store|secure member service/i);
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
  assert.match(home,/HealthTimes Home sections/);
});


test("UI-03 Article Reader keeps internal source-bridge notes out of publication copy",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/readerFacingStandfirst/);
  assert.match(article,/readerFacingMediaCredit/);
  assert.match(article,/premiumTeaserBlock/);
  assert.match(article,/read-only source bridge/);
  assert.match(article,/return internal\.test\(text\) \? null : text/);
});


test("UI-03 evidence uses HealthTimes Dark state and waits for media readiness",()=>{
  const evidence=read("tests/ui03-commercial-reader-evidence.mjs");
  const article=read("app/article/[id].tsx");
  assert.match(evidence,/open\(page,"\/appearance","appearance preference"\)/);
  assert.match(evidence,/getByRole\("button",\{name:"Dark",exact:true\}\)/);
  assert.match(evidence,/rgb\(243, 247, 250\)/);
  assert.match(evidence,/rgb\(11, 22, 34\)/);
  assert.match(evidence,/appearance_preference/);
  assert.match(evidence,/img\.complete===true/);
  assert.match(evidence,/img\.naturalWidth>0/);
  assert.match(evidence,/img\.naturalHeight>0/);
  assert.match(evidence,/Source-backed Premium journalism/);
  assert.match(evidence,/hero_media_complete/);
  assert.match(evidence,/creative_complete/);
  assert.match(evidence,/Loading article…/);
  assert.match(article,/testID="article-hero-media"/);
});
