import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
function load(){
  const source=readFileSync(join(root,"src/reader/offline-state.ts"),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  const require=(name)=>{
    if(name==="react") return {useEffect:()=>{},useState:()=>[null,()=>{}]};
    if(name==="react-native") return {Platform:{OS:"web"}};
    throw new Error("Unexpected require "+name);
  };
  new Function("module","exports","require",output)(module,module.exports,require);
  return module.exports;
}
const offline=load();
const article=(accessPolicy,bodyHtml)=>({
  id:"story-1",title:"Story",slug:"story",standfirst:null,excerpt:"Excerpt",accessPolicy,status:"published",
  publishedAt:"2026-09-20T00:00:00Z",modifiedAt:"2026-09-20T00:00:00Z",author:null,primarySection:null,
  geography:[],topics:[],heroMedia:null,bodyHtml,canonicalUrl:"https://healthtimes.co.zw/story/"
});

test("public article creates readable local-only offline record",()=>{
  const record=offline.offlineRecordForArticle(article("public","<p>Public body</p>"),"2026-09-21T00:00:00Z");
  assert.equal(record.state,"available");
  assert.equal(record.textAvailable,true);
  assert.equal(record.syncMode,"local-only");
  assert.equal(offline.canOpenOffline(record),true);
});

test("Premium body is removed at offline boundary even if caller supplies it",()=>{
  const record=offline.offlineRecordForArticle(article("premium","<p>SECRET</p>"),"2026-09-21T00:00:00Z");
  assert.equal(record.state,"unavailable");
  assert.equal(record.textAvailable,false);
  assert.equal(record.article.bodyHtml,null);
  assert.equal(JSON.stringify(record).includes("SECRET"),false);
  assert.equal(offline.canOpenOffline(record),false);
});

test("cached copy becomes stale only when source timestamp advances",()=>{
  const record=offline.offlineRecordForArticle(article("public","<p>Body</p>"),"2026-09-21T00:00:00Z");
  assert.equal(offline.compareSourceFreshness(record,"2026-09-20T00:00:00Z"),"available");
  assert.equal(offline.compareSourceFreshness(record,"2026-09-22T00:00:00Z"),"stale");
});
