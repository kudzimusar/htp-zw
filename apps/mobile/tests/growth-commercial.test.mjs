import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mobileRoot } from "./ts-module-loader.mjs";

const read=(path)=>readFileSync(join(mobileRoot,path),"utf8");

test("Reader analytics service is provider-backed rather than a validate-and-discard no-op",()=>{
  const fixtures=read("src/services/fixtures.ts");
  assert.match(fixtures,/createRuntimeAnalyticsService/);
  assert.doesNotMatch(fixtures,/validatePublicAnalyticsEvent\(event\)[\s\S]{0,160}return;/);
});

test("Listen wiring routes lifecycle transitions into approved analytics events",()=>{
  const listen=read("app/listen.tsx");
  assert.match(listen,/onLifecycleEvent/);
  assert.match(listen,/services\.analytics\.track\(event\(lifecycle\.type/);
  assert.match(listen,/media_id/);
});

test("Premium UI never emits subscription_completed from a client purchase result",()=>{
  const premium=read("app/premium.tsx");
  assert.match(premium,/pending server entitlement|NM-06 \/ AG-06/i);
  assert.doesNotMatch(premium,/event\("subscription_completed"/);
  assert.doesNotMatch(premium,/\$\d|US\$|ZW\$/);
});

test("Reader ad rendering requires providerState available before impression or click",()=>{
  const cards=read("src/ui/Cards.tsx");
  assert.match(cards,/providerState==="available"/);
  assert.match(cards,/event\("ad_impression"/);
  assert.match(cards,/event\("ad_click"/);
});

test("PWA web analytics bootstrap is canonical-host gated and native configuration stays unresolved",()=>{
  const html=read("app/+html.tsx");
  const config=read("src/growth/config.ts");
  assert.match(html,/CANONICAL_WEB_ANALYTICS_HOSTS/);
  assert.match(html,/ga4WebMeasurementId/);
  for(const field of [
    "ga4MobileStreamId: null",
    "ga4MobileMeasurementId: null",
    "adMobAppId: null",
    "adMobBannerUnitId: null",
    "iosMonthlyProductId: null",
    "iosYearlyProductId: null",
    "androidMonthlyProductId: null",
    "androidYearlyProductId: null"
  ]) assert.ok(config.includes(field),field);
});
