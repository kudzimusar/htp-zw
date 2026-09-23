import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const key={
  legacy:"ht:nm04:reader:downloads:v1",
  current:"ht:nm04:reader:downloads:v2",
  version:"ht:nm04:reader:storage-version"
};

function transpile(path,require){
  const source=readFileSync(join(root,path),"utf8");
  const output=ts.transpileModule(source,{
    compilerOptions:{
      module:ts.ModuleKind.CommonJS,
      target:ts.ScriptTarget.ES2022,
      esModuleInterop:true
    }
  }).outputText;
  const module={exports:{}};
  new Function("module","exports","require",output)(module,module.exports,require);
  return module.exports;
}

function loadOfflineState(){
  return transpile("src/reader/offline-state.ts",(name)=>{
    if(name==="react") return {useEffect:()=>{},useState:(value)=>[typeof value==="function"?value():value,()=>{}]};
    if(name==="react-native") return {Platform:{OS:"web"}};
    throw new Error("Unexpected offline-state require "+name);
  });
}

function createStorage(initial={}){
  const values=new Map(Object.entries(initial));
  const writes=[];
  const removals=[];
  return {
    values,writes,removals,
    async getItem(name){return values.has(name)?values.get(name):null;},
    async setItem(name,value){writes.push([name,value]);values.set(name,value);},
    async removeItem(name){removals.push(name);values.delete(name);}
  };
}

function loadRepository(storage){
  const offline=loadOfflineState();
  const module=transpile("src/services/reader-persistence.ts",(name)=>{
    if(name==="@react-native-async-storage/async-storage") return storage;
    if(name==="../reader/offline-state") return offline;
    throw new Error("Unexpected persistence require "+name);
  });
  return module.persistentReaderRepository;
}

function article({id="story-1",accessPolicy="public",bodyHtml="<p>Public body</p>"}={}){
  return {
    id,title:"Story "+id,slug:id,standfirst:null,excerpt:"Excerpt",bodyHtml,
    canonicalUrl:"https://healthtimes.co.zw/"+id+"/",accessPolicy,status:"published",
    publishedAt:"2026-09-20T00:00:00Z",modifiedAt:"2026-09-20T00:00:00Z",
    author:null,primarySection:null,geography:[],topics:[],heroMedia:null
  };
}

test("1. v1 public download migrates to v2 once",async()=>{
  const legacy=article();
  const storage=createStorage({[key.legacy]:JSON.stringify({[legacy.id]:legacy})});
  const repo=loadRepository(storage);
  const records=await repo.getOfflineArticleRecords();
  assert.equal(records.length,1);
  assert.equal(records[0].article.id,legacy.id);
  assert.equal(records[0].state,"available");
  assert.equal(records[0].article.bodyHtml,"<p>Public body</p>");
  assert.ok(storage.values.has(key.current));
});

test("2. migrated Premium body is sanitized",async()=>{
  const premium=article({id:"premium-1",accessPolicy:"premium",bodyHtml:"<p>SECRET PREMIUM BODY</p>"});
  const storage=createStorage({[key.legacy]:JSON.stringify({[premium.id]:premium})});
  const repo=loadRepository(storage);
  const records=await repo.getOfflineArticleRecords();
  assert.equal(records.length,1);
  assert.equal(records[0].state,"unavailable");
  assert.equal(records[0].textAvailable,false);
  assert.equal(records[0].article.bodyHtml,null);
  assert.equal(storage.values.get(key.current).includes("SECRET PREMIUM BODY"),false);
});

test("3. migration marks completion",async()=>{
  const legacy=article();
  const storage=createStorage({[key.legacy]:JSON.stringify({[legacy.id]:legacy})});
  const repo=loadRepository(storage);
  await repo.getOfflineArticleRecords();
  assert.equal(JSON.parse(storage.values.get(key.version)),2);
  assert.equal(storage.removals.includes(key.legacy),true);
});

test("4. deleting migrated v2 article keeps it deleted",async()=>{
  const legacy=article();
  const storage=createStorage({[key.legacy]:JSON.stringify({[legacy.id]:legacy})});
  const repo=loadRepository(storage);
  await repo.getOfflineArticleRecords();

  // Simulate a stale legacy key surviving cleanup on a real device.
  storage.values.set(key.legacy,JSON.stringify({[legacy.id]:legacy}));
  await repo.removeDownloadedArticle(legacy.id);
  assert.deepEqual(await repo.getOfflineArticleRecords(),[]);
  assert.deepEqual(JSON.parse(storage.values.get(key.current)),{});
});

test("5. intentionally empty v2 store does not re-import v1",async()=>{
  const legacy=article();
  const storage=createStorage({
    [key.legacy]:JSON.stringify({[legacy.id]:legacy}),
    [key.current]:"{}"
  });
  const repo=loadRepository(storage);
  const records=await repo.getOfflineArticleRecords();
  assert.deepEqual(records,[]);
  assert.equal(JSON.parse(storage.values.get(key.version)),2);
  assert.equal(storage.values.get(key.current),"{}");
});

test("6. repeated repository reads are idempotent",async()=>{
  const legacy=article();
  const storage=createStorage({[key.legacy]:JSON.stringify({[legacy.id]:legacy})});
  const repo=loadRepository(storage);
  const first=await repo.getOfflineArticleRecords();
  const second=await repo.getOfflineArticleRecords();
  assert.deepEqual(second,first);
  const v2Writes=storage.writes.filter(([name])=>name===key.current);
  assert.equal(v2Writes.length,1,"v2 should be created once, not remigrated on every read");
});

test("7. malformed legacy data fails safely",async()=>{
  const storage=createStorage({[key.legacy]:'{"bad":42,"alsoBad":{"id":"","accessPolicy":"public","bodyHtml":"x"}}'});
  const repo=loadRepository(storage);
  await assert.doesNotReject(()=>repo.getOfflineArticleRecords());
  assert.deepEqual(await repo.getOfflineArticleRecords(),[]);
  assert.deepEqual(JSON.parse(storage.values.get(key.current)),{});
  assert.equal(JSON.parse(storage.values.get(key.version)),2);
});
