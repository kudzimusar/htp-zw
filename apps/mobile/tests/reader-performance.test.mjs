import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const readRepo=(path)=>readFileSync(join(repoRoot,path),"utf8");

function between(source,start,end){
  const from=source.indexOf(start);
  assert.ok(from>=0,"missing start marker: "+start);
  const to=source.indexOf(end,from);
  assert.ok(to>from,"missing end marker: "+end);
  return source.slice(from,to);
}

test("detail resolution performs bounded direct lookup before full-feed fallback",()=>{
  const service=read("src/services/migrated-corpus.ts");
  const body=between(
    service,
    "async function resolveIdentity(id: string)",
    "const articleRepository: ArticleRepository"
  );
  const directIndex=body.indexOf("resolveIdentityDirect(id)");
  const feedIndex=body.indexOf("loadFeedDocuments()");
  assert.ok(directIndex>=0,"direct identity resolver is required");
  assert.ok(feedIndex>directIndex,"full feed must remain fallback-only");
  assert.doesNotMatch(body,/\(await loadFeedDocuments\(\)\)\.find[\s\S]*if \(cached\)/);
});

test("direct identity resolution preserves slug path URL migrated and native compatibility",()=>{
  const service=read("src/services/migrated-corpus.ts");
  const body=between(
    service,
    "function requestedPathForIdentity",
    "async function resolveIdentity(id: string)"
  );
  assert.match(body,/pathFromCanonicalUrl\(identity\)/);
  assert.match(body,/identity\.startsWith\("\/"\)/);
  assert.match(body,/identity\.startsWith\("source-"\)/);
  assert.match(body,/decodeURIComponent\(routeIdentity\)/);
  assert.match(body,/ag05_resolve_public_path/);
  assert.match(body,/migratedStoryForPath\(migratedPath\)/);
  assert.match(body,/nativeStoryForPath\(requestedPath\)/);
});

test("canonical cold feed callers share one in-flight promise and failures remain retryable",()=>{
  const service=read("src/services/migrated-corpus.ts");
  const body=between(
    service,
    "async function loadFeedDocuments(limit = FEED_LIMIT)",
    "const CONTEXT_LIMIT = 50"
  );
  assert.match(service,/let feedLoadPromise: Promise<ArticleDetail\[]> \| null = null/);
  assert.match(body,/if \(canonicalFeed && feedLoadPromise\)[\s\S]*return feedLoadPromise/);
  assert.match(body,/const pending = load\(\)/);
  assert.match(body,/feedLoadPromise = pending/);
  assert.match(body,/finally[\s\S]*feedLoadPromise === pending[\s\S]*feedLoadPromise = null/);
});

test("article Reader resolves primary story before beginning related work",()=>{
  const article=read("app/article/[id].tsx");
  const related=between(
    article,
    "const related=useAsync(async()=>",
    "const entitlement=useAsync"
  );
  assert.match(related,/const current=article\.data/);
  assert.match(related,/if\(initialStory \|\| !current\) return \[]/);
  assert.match(related,/services\.articles\.listBySection\(current\.primarySection\.slug\)/);
  assert.match(related,/services\.articles\.getHome\(\)/);
  assert.doesNotMatch(related,/services\.articles\.getRelated/);
  assert.match(related,/article\.data\?\.id/);
});

test("Reader performance diagnostics are bounded to development or explicit test instrumentation",()=>{
  const article=read("app/article/[id].tsx");
  for(const eventName of [
    "article_lookup_start",
    "article_resolved",
    "article_visible",
    "related_lookup_start",
    "related_resolved"
  ]){
    assert.ok(article.includes('"'+eventName+'"'),"missing performance event "+eventName);
  }
  assert.match(article,/runtime\.__DEV__!==true && runtime\.__HT_READER_PERF__!==true/);
  assert.doesNotMatch(article,/password|access_token|refresh_token|service_role/i);
});

test("Premium protected-body and 20-second preview authority remain unchanged",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/entitlement\.data===true/);
  assert.match(article,/services\.premium\.getProtectedArticle\(current\.id\)/);
  assert.match(article,/previewConfig\.seconds===20/);
  assert.match(article,/parseArticleContent\(protectedBody \? null : story\.bodyHtml/);
  assert.match(article,/PremiumPaywall/);
});

test("fresh article URLs are served through a generic exported article shell",()=>{
  const config=JSON.parse(readRepo("vercel.json"));
  assert.equal(
    config.rewrites.some((rule)=>
      rule.source==="/article/:id" &&
      rule.destination==="/article/fallback"
    ),
    true,
    "Vercel must route fresh article identities to the exported article shell"
  );

  const prepare=readRepo("scripts/web/prepare-phase4-vercel.js");
  assert.match(prepare,/articleFallbackHtml/);
  assert.match(prepare,/article\/fallback\.html/);
  assert.match(prepare,/source-.*\.html/);
});
