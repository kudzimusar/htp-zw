import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("verified web identities remain separate from unverified native configuration",()=>{
  const config=read("src/growth/config.ts");
  for(const value of [
    "GT-PLTTGPL",
    "359235319",
    "G-S39LN2KX4X",
    "pub-8744434739998394",
    "ca-pub-8744434739998394",
    "7971959240"
  ]) assert.ok(config.includes(value), "missing verified web identity: "+value);

  for(const field of [
    "ga4MobileStreamId: null",
    "ga4MobileMeasurementId: null",
    "adMobAppId: null",
    "adMobBannerUnitId: null",
    "iosMonthlyProductId: null",
    "iosYearlyProductId: null",
    "androidMonthlyProductId: null",
    "androidYearlyProductId: null"
  ]) assert.ok(config.includes(field), "native config must remain unresolved: "+field);
});

test("public event catalogue is versioned and rejects sensitive health attributes",()=>{
  const events=read("src/growth/events.ts");
  const config=read("src/growth/config.ts");
  assert.ok(config.includes('GROWTH_EVENT_VERSION = "2026-09-09"'));
  for(const name of [
    "article_view","article_25_percent","article_50_percent","article_75_percent","article_complete",
    "story_saved","story_shared","search_performed","premium_locked","subscription_started",
    "ad_impression","ad_click"
  ]) assert.ok(events.includes('"'+name+'"'), "missing event: "+name);
  for(const fragment of ["diagnosis","disease","condition","medication","prescription","symptom","patient","medical_record"]){
    assert.ok(events.includes('"'+fragment+'"'), "missing sensitive filter: "+fragment);
  }
});

test("search analytics redacts raw health-related query text",()=>{
  const search=read("app/search.tsx");
  assert.ok(search.includes("search_performed"));
  assert.ok(search.includes("query_redacted:true"));
  assert.equal(search.includes("query:submitted"),false);
  assert.equal(search.includes("query: submitted"),false);
});

test("sensitive health ad requests never produce fabricated inventory",()=>{
  const ads=read("src/growth/advertising.ts");
  assert.ok(ads.includes("context.sensitiveHealthContext"));
  assert.ok(ads.includes('source: "none"'));
  assert.ok(ads.includes('personalization: "none"'));
  assert.ok(ads.includes("consentForPersonalizedAds"));
  const cards=read("src/ui/Cards.tsx");
  assert.ok(cards.includes("services.advertising.getDecision"));
  assert.ok(cards.includes("sensitiveHealthContext = true"));
});

test("seller files contain exactly the verified declaration and no invented mobile seller",()=>{
  const expected="google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0";
  for(const file of ["public/ads.txt","public/app-ads.txt"]){
    assert.equal(read(file).trim(),expected);
  }
  const corpus=read("src/growth/config.ts")+"\n"+read("public/app-ads.txt");
  assert.equal(/ca-app-pub-/i.test(corpus),false);
});

test("deep links and outgoing shares are attributable and domain-bounded",()=>{
  const links=read("src/growth/deepLinks.ts");
  for(const value of [
    "Linking.createURL",
    "ht_article_id",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "healthtimes.co.zw",
    "parseSocialReferral"
  ]) assert.ok(links.includes(value), "missing deep-link behavior: "+value);
  assert.ok(links.includes("allowedHosts"));
  const root=read("app/_layout.tsx");
  assert.ok(root.includes("parseHealthTimesDeepLink"));
  assert.ok(root.includes("Linking.getInitialURL"));
  assert.ok(root.includes('Linking.addEventListener("url"'));
  assert.ok(root.includes('router.push(("/article/"'));
});

test("Premium storefront remains configuration-driven and server entitlement remains authoritative",()=>{
  const store=read("src/growth/premium-store.ts");
  const premium=read("app/premium.tsx");
  const article=read("app/article/[id].tsx");
  assert.ok(store.includes('status: "configuration-required"'));
  assert.ok(store.includes("offers: []"));
  assert.ok(premium.includes("premiumStore.getState"));
  assert.ok(premium.includes("Storefront state is loading"));
  assert.equal(/\$\d|US\$|ZW\$/.test(premium),false);
  assert.ok(article.includes("services.premium.hasEntitlement"));
  assert.ok(article.includes("protectedBody"));
});

test("article interactions emit approved attributed events",()=>{
  const article=read("app/article/[id].tsx");
  for(const eventName of [
    "article_view",
    "article_25_percent",
    "article_50_percent",
    "article_75_percent",
    "article_complete",
    "premium_locked",
    "story_saved",
    "story_shared"
  ]) assert.ok(article.includes('"'+eventName+'"'), "missing article event: "+eventName);
  assert.ok(article.includes('buildAttributedShareUrl(story,"system")'));
});

test("policy documents prohibit sensitive health targeting and provider inference",()=>{
  const policy=readFileSync(join(repoRoot,"docs/native-mobile/NM-05_GROWTH_ADS_PRIVACY_POLICY.md"),"utf8");
  for(const value of [
    "no diagnosis targeting",
    "no medication or prescription targeting",
    "must not transpose or derive",
    "hardcode production prices"
  ]) assert.ok(policy.includes(value), "missing policy rule: "+value);
});
