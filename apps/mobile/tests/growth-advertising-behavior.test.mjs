import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const ads=loadTs("src/growth/advertising.ts");
const placements=loadTs("src/growth/ad-placements.ts");

const safeInventory={
  source:"direct",
  personalization:"non-personalized",
  disclosureLabel:"Advertisement",
  destinationUrl:"https://example.com/campaign"
};

test("Reader ad registry contains approved home article Live and Watch placements",()=>{
  for(const key of [
    "home_top","article_after_intro","article_mid_body","article_end","live_feed","watch_feed"
  ]) assert.equal(placements.getReaderAdPlacement(key).key,key);
  assert.throws(()=>placements.getReaderAdPlacement("arbitrary_slot"),/Unregistered/);
});

test("sensitive article placements are blocked by policy before provider access",async()=>{
  let requested=0;
  const service=ads.createAdvertisingService({
    provider:{configured:true,request:async()=>{requested++;return safeInventory;}}
  });
  const decision=await service.getDecision("article_after_intro",{
    consentForPersonalizedAds:false,sensitiveHealthContext:true
  });
  assert.equal(decision.providerState,"blocked-by-policy");
  assert.equal(decision.source,"none");
  assert.equal(requested,0);
});

test("unconfigured advertising returns no ad without fabricating inventory",async()=>{
  const decision=await ads.createAdvertisingService().getDecision("watch_feed",{
    consentForPersonalizedAds:false,sensitiveHealthContext:false
  });
  assert.equal(decision.providerState,"unconfigured");
  assert.equal(decision.source,"none");
});

test("configured provider distinguishes no inventory available and error states",async()=>{
  const noInventory=ads.createAdvertisingService({
    provider:{configured:true,request:async()=>null}
  });
  assert.equal((await noInventory.getDecision("watch_feed",{consentForPersonalizedAds:false,sensitiveHealthContext:false})).providerState,"eligible-no-inventory");

  const failed=ads.createAdvertisingService({
    provider:{configured:true,request:async()=>{throw new Error("down");}}
  });
  assert.equal((await failed.getDecision("watch_feed",{consentForPersonalizedAds:false,sensitiveHealthContext:false})).providerState,"error");
});

test("only compliant non-personalized inventory becomes available",async()=>{
  const service=ads.createAdvertisingService({
    provider:{configured:true,request:async()=>safeInventory}
  });
  const decision=await service.getDecision("watch_feed",{
    consentForPersonalizedAds:false,sensitiveHealthContext:false
  });
  assert.equal(decision.providerState,"available");
  assert.equal(decision.source,"direct");

  const personalized=ads.createAdvertisingService({
    provider:{configured:true,request:async()=>({...safeInventory,personalization:"personalized"})}
  });
  assert.equal((await personalized.getDecision("watch_feed",{consentForPersonalizedAds:true,sensitiveHealthContext:false})).providerState,"blocked-by-policy");
});

test("unsafe or malformed ad destinations fail closed",async()=>{
  for(const destinationUrl of ["http://example.com/ad","javascript:alert(1)","not a url"]){
    const service=ads.createAdvertisingService({
      provider:{configured:true,request:async()=>({...safeInventory,destinationUrl})}
    });
    const decision=await service.getDecision("live_feed",{consentForPersonalizedAds:false,sensitiveHealthContext:false});
    assert.equal(decision.providerState,"error");
    assert.equal(decision.source,"none");
  }
});
