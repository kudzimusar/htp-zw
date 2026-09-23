import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const source=readFileSync(join(root,"src/growth/deepLinks.ts"),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
const linking={
  createURL(path){return "healthtimes://"+path;},
  parse(value){const u=new URL(value);return {path:u.protocol==="healthtimes:"?(u.host+u.pathname).replace(/^\/+|\/+$/g,""):u.pathname.replace(/^\/+|\/+$/g,"")};}
};
new Function("module","exports","require",output)(module,module.exports,(name)=>{if(name==="expo-linking")return linking;throw new Error("Unexpected require "+name);});
const links=module.exports;
test("canonical HealthTimes dated story URL resolves to Native article slug",()=>{
  assert.deepEqual(links.parseHealthTimesDeepLink("https://healthtimes.co.zw/2026/02/17/parirenyatwa-hospital-commissions-new-heart-bypass-machine-boosts-open-heart-surgery-in-zimbabwe/"),{type:"article",articleId:"parirenyatwa-hospital-commissions-new-heart-bypass-machine-boosts-open-heart-surgery-in-zimbabwe"});
});
test("custom scheme article deep link remains supported",()=>{assert.deepEqual(links.parseHealthTimesDeepLink("healthtimes://article/story-123"),{type:"article",articleId:"story-123"});});
test("category and non-HealthTimes web URLs are rejected",()=>{assert.equal(links.parseHealthTimesDeepLink("https://healthtimes.co.zw/category/health-news/"),null);assert.equal(links.parseHealthTimesDeepLink("https://example.com/story/"),null);});
test("shares retain migrated canonical URL while adding attribution",()=>{
  const article={id:"story-1",slug:"fallback",canonicalUrl:"https://healthtimes.co.zw/2026/09/18/real-story/"};
  const url=new URL(links.attributedShareUrl(article,"system"));
  assert.equal(url.pathname,"/2026/09/18/real-story/");
  assert.equal(url.searchParams.get("ht_article_id"),"story-1");
  assert.equal(url.searchParams.get("utm_medium"),"system");
});