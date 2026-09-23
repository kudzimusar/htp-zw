import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const require=createRequire(import.meta.url);
const {buildHospazCapability}=require(join(repoRoot,"lib/ag05-capability.js"));

const eas=JSON.parse(read("eas.json"));
const env=eas.build?.staging?.env ?? {};
const url=env.EXPO_PUBLIC_SUPABASE_URL;
const key=env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.match(url,/^https:\/\/gcdohgbmqhqwydgaxrcr\.supabase\.co$/);
assert.match(key,/^sb_publishable_/);

async function rpc(name,args={}){
  const response=await fetch(url+"/rest/v1/rpc/"+encodeURIComponent(name),{
    method:"POST",
    headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify(args)
  });
  const body=await response.text();
  assert.equal(response.ok,true,name+" returned HTTP "+response.status+": "+body);
  return body ? JSON.parse(body) : null;
}

function compileModule(path){
  const source=read(path);
  const output=ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const module={exports:{}};
  new Function("module","exports","require",output)(
    module,module.exports,(name)=>{
      if(name.startsWith("../domain/")) return {};
      throw new Error("Unexpected runtime import "+name);
    }
  );
  return module.exports;
}

test("1 portable Reader HOSPAZ projection matches accepted CP5 builder semantics",()=>{
  const raw={
    advertiser:"HOSPAZ",
    placement_key:"hospaz-header-direct",
    current_source_attachment_id:"33005",
    current_source_url:"https://healthtimes.co.zw/wp-content/uploads/hospaz.jpeg",
    current_storage_object:"wordpress/2025/11/hospaz.jpeg",
    destination_url_state:"UNKNOWN",
    destination_url:"https://example.invalid/not-authorized",
    schedule_state:"UNKNOWN",
    schedule:"invented",
    placement_conditions_state:"UNKNOWN",
    placement_conditions:"invented"
  };
  const cp5=buildHospazCapability(raw,{supabaseUrl:url});
  const portable=compileModule("src/growth/direct-ad.ts").projectCp5HospazCapability(raw,url);
  assert.deepEqual(portable,cp5);
});

test("2 live HOSPAZ capability preserves accepted provenance and unknown commercial facts",async()=>{
  const raw=await rpc("ag05_hospaz_direct_ad_preview",{});
  const capability=buildHospazCapability(raw,{supabaseUrl:url});
  assert.equal(capability.advertiser,"HOSPAZ");
  assert.equal(capability.placementKey,"hospaz-header-direct");
  assert.equal(capability.provenance.currentSourceAttachmentId,"33005");
  assert.match(capability.creativeUrl,/\/storage\/v1\/object\/public\/migrated-media\//);
  assert.deepEqual(capability.destination,{state:"UNKNOWN",url:null});
  assert.deepEqual(capability.schedule,{state:"UNKNOWN",value:null});
  assert.deepEqual(capability.placementConditions,{state:"UNKNOWN",value:null});
  assert.equal(capability.failClosed.clickTargetInvented,false);
});

test("3 staging advertising service consumes the CP5 HOSPAZ RPC rather than a Reader fixture",()=>{
  const service=read("src/services/migrated-corpus.ts");
  assert.match(service,/ag05_hospaz_direct_ad_preview/);
  assert.match(service,/projectCp5HospazCapability/);
  assert.match(service,/directDecisionFromHospazCapability/);
  assert.match(service,/advertising: stagingAdvertisingService/);
  assert.doesNotMatch(service,/destinationUrl:\s*["']/);
});

test("4 shared AdSlot renders accepted creative and emits clicks only behind a verified destination",()=>{
  const cards=read("src/ui/Cards.tsx");
  assert.match(cards,/adDecision\.creativeUrl/);
  assert.match(cards,/const clickable=\/\^https:/);
  assert.match(cards,/if\(!clickable\) return;/);
  assert.match(cards,/event\("ad_click"/);
  assert.match(cards,/No verified destination is available for this direct advertisement/);
  const clickIndex=cards.indexOf('event("ad_click"');
  const guardIndex=cards.lastIndexOf("if(!clickable) return;",clickIndex);
  assert.ok(guardIndex>=0 && guardIndex<clickIndex,"ad_click must remain behind destination verification");
});

test("5 Home demonstrates only the accepted fixed HOSPAZ placement identity",()=>{
  const home=read("app/(reader)/index.tsx");
  assert.match(home,/AdSlot placement="hospaz-header-direct"/);
  assert.equal((home.match(/hospaz-header-direct/g)??[]).length,1);
});

test("6 migrated Premium reference 33190 remains body-protected at the public CP5 boundary",async()=>{
  const doc=await rpc("ag05_public_story_document",{
    p_path:"/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/"
  });
  assert.equal(doc.source_id,"33190");
  assert.equal(doc.access_policy,"premium_marker_review");
  assert.equal(doc.body_html,null);
});

test("7 Article Reader requests protected content only after authoritative entitlement",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/entitlement\.data===true/);
  assert.match(article,/services\.premium\.getProtectedArticle/);
  assert.match(article,/const protectedBody=/);
  assert.match(article,/parseArticleContent\(protectedBody \? null : story\.bodyHtml/);
  assert.match(article,/Member sign in/);
});

test("8 offline persistence rejects Premium articles independently of screen behavior",()=>{
  const persistence=read("src/services/reader-persistence.ts");
  assert.match(persistence,/article\.accessPolicy==="premium"/);
  assert.match(persistence,/Premium body is not available for offline storage/);
  const article=read("app/article/[id].tsx");
  assert.match(article,/story\.accessPolicy==="premium"/);
});

test("9 storefront remains configuration-required with no invented price or product identity",()=>{
  const store=read("src/growth/premium-store.ts");
  const config=read("src/growth/config.ts");
  const premium=read("app/premium.tsx");
  assert.match(store,/status: "configuration-required"/);
  assert.match(store,/offers: \[\]/);
  for(const field of [
    "iosMonthlyProductId: null","iosYearlyProductId: null",
    "androidMonthlyProductId: null","androidYearlyProductId: null"
  ]) assert.ok(config.includes(field),field);
  assert.equal(/\$\d|US\$|ZW\$|USD\s*\d|ZWL\s*\d/.test(premium),false);
  assert.doesNotMatch(premium,/event\("subscription_completed"/);
  assert.match(premium,/await services\.premiumStore\.startPurchase/);
  assert.doesNotMatch(premium,/purchaseStatus\s*===?\s*["']success["']/i);
  assert.doesNotMatch(premium,/subscriptionStatus\s*===?\s*["']active["']/i);
});

test("10 Premium discovery remains access-policy driven across Home cards and landing",()=>{
  const home=read("app/(reader)/index.tsx");
  const cards=read("src/ui/Cards.tsx");
  const premium=read("app/premium.tsx");
  assert.match(home,/source\.filter\(\(story\)=>story\.accessPolicy==="premium"\)/);
  assert.match(cards,/story\.accessPolicy === "premium" && <PremiumBadge/);
  assert.match(premium,/filter\(\(story\)=>story\.accessPolicy==="premium"\)/);
  assert.match(premium,/Premium entitlement is checked securely/);
});

test("11 sensitive-health advertising and analytics remain non-personalized and non-sensitive",()=>{
  const direct=read("src/growth/direct-ad.ts");
  const ads=read("src/growth/advertising.ts");
  const cards=read("src/ui/Cards.tsx");
  assert.match(direct,/personalization:"none"/);
  assert.match(ads,/context\.sensitiveHealthContext/);
  assert.doesNotMatch(cards,/diagnosis|disease|medication|prescription|symptom|patient|medical_record/i);
  assert.match(cards,/placement_key/);
  assert.match(cards,/direct_ad_source/);
});

test("12 subscription success and direct-ad click events are never fabricated",()=>{
  const premium=read("app/premium.tsx");
  const cards=read("src/ui/Cards.tsx");
  assert.doesNotMatch(premium,/event\("subscription_completed"/);
  assert.match(premium,/await services\.premiumStore\.startPurchase/);
  const clickIndex=cards.indexOf('event("ad_click"');
  assert.ok(clickIndex>cards.indexOf("if(!clickable) return;"));
});
