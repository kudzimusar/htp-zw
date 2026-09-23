import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const eas=JSON.parse(read("eas.json"));
const env=eas.build?.staging?.env ?? {};
const url=env.EXPO_PUBLIC_SUPABASE_URL;
const key=env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

assert.equal(typeof url,"string");
assert.equal(typeof key,"string");
assert.match(url,/^https:\/\/gcdohgbmqhqwydgaxrcr\.supabase\.co$/);
assert.match(key,/^sb_publishable_/);
assert.doesNotMatch(key,/service_role/i);

const headers={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"};

async function rpc(name,args){
  const response=await fetch(`${url}/rest/v1/rpc/${name}`,{
    method:"POST",headers,body:JSON.stringify(args)
  });
  const textBody=await response.text();
  assert.equal(response.ok,true,`${name} returned HTTP ${response.status}: ${textBody}`);
  return textBody ? JSON.parse(textBody) : null;
}

const mapperSource=read("src/services/migrated-corpus-mapper.ts");
const mapperOutput=ts.transpileModule(mapperSource,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const mapperModule={exports:{}};
new Function("module","exports","require",mapperOutput)(
  mapperModule,mapperModule.exports,(name)=>{throw new Error("Unexpected runtime import "+name);}
);
const {mapMigratedStoryDocument}=mapperModule.exports;

const representative={
  recent:{sourceId:"30154",path:"/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/"},
  old:{sourceId:"935",path:"/2016/02/16/zim-launches-unicef-eli-lilly-initiative-to-fight-pediatric-and-adolescent-ncds/"},
  premium:{sourceId:"33190",path:"/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/"},
  long:{sourceId:"4726",path:"/2018/10/26/gvt-applauds-un-investment-in-zims-health-sector/"},
  page:{sourceId:"1208",path:"/research-findings/"},
  inlineMedia:{sourceId:"29578",path:"/2025/12/24/novorapid-vial-practical-guidance-for-mealtime-insulin-use/"}
};

async function documentFor(item){
  const doc=await rpc("ag05_public_story_document",{p_path:item.path});
  assert.equal(doc?.source_id,item.sourceId,`unexpected source for ${item.path}`);
  return doc;
}

function walk(dir){
  return readdirSync(dir).flatMap((entry)=>{
    const full=join(dir,entry);
    return statSync(full).isDirectory()?walk(full):[full];
  });
}

test("1 staging Reader service mode resolves to accepted migrated corpus",()=>{
  const services=read("src/services/index.ts");
  const config=read("src/platform/config.ts");
  const adapter=read("src/services/migrated-corpus.ts");
  assert.equal(eas.build.staging.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE,"staging");
  assert.match(services,/editorialDataMode === "staging"[\s\S]*migratedCorpusServices/);
  assert.match(config,/ACCEPTED MIGRATED CORPUS/);
  for(const rpcName of ["ag05_public_feed_rows","ag05_public_story_document","ag05_public_context_document","ag05_resolve_public_path"]){
    assert.ok(adapter.includes(rpcName),rpcName);
  }
});

test("2 Reader screens contain no direct Supabase/database shortcut",()=>{
  const files=walk(join(root,"app")).filter((path)=>/\.(ts|tsx)$/.test(path));
  for(const path of files){
    const source=readFileSync(path,"utf8");
    assert.doesNotMatch(source,/@supabase\/supabase-js|platform\/supabase|\.from\s*\(|\.rpc\s*\(/,path);
  }
});

test("3 recent migrated public article maps into the Reader domain model",async()=>{
  const doc=await documentFor(representative.recent);
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.sourceProvenance?.sourceId,"30154");
  assert.equal(article.accessPolicy,"public");
  assert.equal(article.bodyHtml,doc.body_html);
  assert.equal(article.author?.displayName,"Michael Gwarisa");
  assert.equal(typeof article.publishedAt,"string");
  assert.equal(typeof article.primarySection?.name,"string");
  assert.match(article.canonicalUrl,/^https:\/\/healthtimes\.co\.zw\//);
  assert.equal(article.canonicalStoryId,doc.story_id);
  assert.equal(article.contentIntegrity,"verified");
});

test("4 historical migrated article maps without recent-window dependence",async()=>{
  const doc=await documentFor(representative.old);
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.sourceProvenance?.sourceId,"935");
  assert.match(String(article.publishedAt),/^2016-02-16/);
  assert.equal(article.bodyHtml,doc.body_html);
  assert.equal(article.heroMedia,null);
});

test("5 premium-review source 33190 remains publicly body-protected",async()=>{
  const doc=await documentFor(representative.premium);
  assert.equal(doc.access_policy,"premium_marker_review");
  assert.equal(doc.body_html,null);
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.accessPolicy,"premium");
  assert.equal(article.bodyHtml,null);
  assert.equal(article.contentIntegrity,"requires-review");
  assert.equal(article.premiumSourceContext?.legacyMembershipSignal,"unknown");
});

test("6 long-form migrated body survives mapping without truncation",async()=>{
  const doc=await documentFor(representative.long);
  assert.equal(typeof doc.body_html,"string");
  assert.ok(doc.body_html.length>30000,`expected long body, got ${doc.body_html?.length}`);
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.bodyHtml,doc.body_html);
  assert.equal(article.bodyHtml.length,doc.body_html.length);
});

test("7 migrated WordPress page maps through the same ArticleDetail contract",async()=>{
  const doc=await documentFor(representative.page);
  assert.equal(doc.source_type,"page");
  assert.equal(typeof doc.body_html,"string");
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.slug,"research-findings");
  assert.equal(article.bodyHtml,doc.body_html);
  assert.equal(article.sourceProvenance?.stableKey,"wordpress-page:1208");
});

test("8 hero and inline media retain canonical migrated-media authority",async()=>{
  const recent=await documentFor(representative.recent);
  const recentArticle=mapMigratedStoryDocument(recent,url);
  assert.equal(typeof recent.featured_storage_object,"string");
  assert.match(recentArticle.heroMedia?.publicUrl ?? "",/\/storage\/v1\/object\/public\/migrated-media\/wordpress\//);
  assert.doesNotMatch(recentArticle.heroMedia?.publicUrl ?? "",/migrated-media\/wordpress\/uploads\//);

  const inline=await documentFor(representative.inlineMedia);
  assert.equal(typeof inline.body_html,"string");
  assert.match(inline.body_html,/\/storage\/v1\/object\/public\/migrated-media\//);
  assert.doesNotMatch(inline.body_html,/\/wp-content\/uploads\//);
});

test("9 byline date and accepted section provenance survive without invented geography/tags",async()=>{
  const doc=await documentFor(representative.recent);
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.author?.displayName,doc.author?.name);
  assert.equal(article.publishedAt,doc.published_at);
  assert.equal(article.primarySection?.slug,doc.section?.slug);
  assert.deepEqual(article.geography,[]);
  assert.deepEqual(article.topics,[]);
  assert.deepEqual(article.legacyTaxonomy,[]);
});

test("10 Search Explore category and author paths use migrated authoritative records",()=>{
  const adapter=read("src/services/migrated-corpus.ts");
  const explore=read("app/(reader)/explore.tsx");
  const search=read("app/search.tsx");
  assert.match(adapter,/const searchService: SearchService/);
  assert.match(adapter,/loadContext\("category"/);
  assert.match(adapter,/loadContext\("author"/);
  assert.match(explore,/services\./);
  assert.match(search,/services\.search\.search/);
  assert.doesNotMatch(adapter,/sourceParityServices\.articles|sourceParityServices\.search/);
});

test("11 unknown values remain empty or null rather than fabricated",async()=>{
  const doc=await documentFor(representative.old);
  const article=mapMigratedStoryDocument(doc,url);
  assert.equal(article.heroMedia,null);
  assert.deepEqual(article.geography,[]);
  assert.deepEqual(article.topics,[]);
  assert.ok(article.author===null || article.author.displayName===doc.author?.name);
  assert.ok(article.primarySection===null || article.primarySection.name===doc.section?.name);
});

test("12 offline persistence accepts migrated records while Premium bodies remain unavailable",async()=>{
  const persistence=read("src/services/reader-persistence.ts");
  const articleScreen=read("app/article/[id].tsx");
  assert.match(persistence,/downloads\[article\.id\] = article/);
  assert.match(articleScreen,/Premium body is not available for offline storage without entitlement/);
  const premium=mapMigratedStoryDocument(await documentFor(representative.premium),url);
  assert.equal(premium.bodyHtml,null);
  const adapter=read("src/services/migrated-corpus.ts");
  assert.doesNotMatch(adapter,/sourceParityServices\.articles|sourceParityArticles/);
});

test("13 CP5 path resolution preserves canonical direct 301 alias and explicit 404 semantics",async()=>{
  const direct=await rpc("ag05_resolve_public_path",{p_path:representative.recent.path});
  assert.equal(direct.http_status,200);
  assert.equal(direct.resolution,"preserved_direct");

  const alias=await rpc("ag05_resolve_public_path",{p_path:"/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/"});
  assert.equal(alias.http_status,301);
  assert.equal(alias.target_path,representative.recent.path);

  const missing=await rpc("ag05_resolve_public_path",{p_path:"/nm07-phase6-definitely-not-a-real-story/"});
  assert.equal(missing.http_status,404);
  assert.equal(missing.resolution,"explicit_404_exception");
});

test("14 Web PWA iOS Android share one migrated-corpus Reader contract",()=>{
  const adapter=read("src/services/migrated-corpus.ts");
  const contracts=read("src/domain/contracts.ts");
  assert.match(contracts,/export interface ArticleRepository/);
  assert.match(adapter,/const articleRepository: ArticleRepository/);
  assert.doesNotMatch(adapter,/Platform\.OS|\.ios\.|\.android\.|\.web\./);
  assert.doesNotMatch(adapter,/createClient\(/);
});
