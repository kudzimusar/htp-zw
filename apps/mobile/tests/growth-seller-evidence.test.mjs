import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mobileRoot, loadTs } from "./ts-module-loader.mjs";

const config=loadTs("src/growth/config.ts");
const read=(path)=>readFileSync(join(mobileRoot,path),"utf8");

test("ads.txt contains exactly the recorded web seller declaration",()=>{
  assert.equal(read("public/ads.txt").trim(),config.VERIFIED_SELLER_DECLARATION);
  assert.deepEqual(config.SELLER_FILE_EVIDENCE.adsTxt.declarations,[config.VERIFIED_SELLER_DECLARATION]);
});

test("app-ads.txt remains declaration-free until AG-05 native seller evidence exists",()=>{
  assert.equal(read("public/app-ads.txt").trim(),"");
  assert.equal(config.SELLER_FILE_EVIDENCE.appAdsTxt.status,"configuration-required");
  assert.deepEqual(config.SELLER_FILE_EVIDENCE.appAdsTxt.declarations,[]);
});

test("native advertising provider evidence remains distinct and unconfigured",()=>{
  assert.equal(config.SELLER_FILE_EVIDENCE.nativeAdvertisingProvider.status,"configuration-required");
  assert.deepEqual(config.SELLER_FILE_EVIDENCE.nativeAdvertisingProvider.declarations,[]);
});

test("no AdMob ca-app-pub identity is fabricated in certified seller evidence",()=>{
  const corpus=[
    read("public/ads.txt"),
    read("public/app-ads.txt"),
    JSON.stringify(config.MOBILE_GROWTH_CONFIGURATION),
    JSON.stringify(config.SELLER_FILE_EVIDENCE)
  ].join("\n");
  assert.equal(/ca-app-pub-/i.test(corpus),false);
  assert.equal(config.MOBILE_GROWTH_CONFIGURATION.adMobAppId,null);
  assert.equal(config.MOBILE_GROWTH_CONFIGURATION.adMobBannerUnitId,null);
});
