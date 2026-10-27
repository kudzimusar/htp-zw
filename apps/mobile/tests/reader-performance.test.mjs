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
  assert.match(related,/services\.articles\.listBySection\(current\.primarySection\.slug,RELATED_CONTEXT_LIMIT\)/);
  assert.doesNotMatch(related,/services\.articles\.getHome/);
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

test("web deep-link bridge never pushes the browser's already-authoritative article URL",()=>{
  const layout=read("app/_layout.tsx");
  const effect=between(layout,"useEffect(()=>{","return null;");
  const webGuard=effect.indexOf('if(Platform.OS==="web") return');
  const initialUrl=effect.indexOf("Linking.getInitialURL()");
  const push=effect.indexOf("router.push");
  assert.ok(webGuard>=0,"web deep-link bridge must have an explicit no-op guard");
  assert.ok(initialUrl>webGuard,"web guard must run before initial URL processing");
  assert.ok(push>webGuard,"web guard must run before synthetic route pushes");
});

test("anonymous Reader eligibility returns sign-in-required without protected eligibility RPC",()=>{
  const communications=read("src/services/communications.ts");
  const body=between(
    communications,
    "async getEligibility(canonicalStoryId)",
    "async listPublic(canonicalStoryId)"
  );
  const sessionCheck=body.indexOf("client.auth.getSession()");
  const anonymousReturn=body.indexOf('reason:"signin_required"');
  const protectedRpc=body.indexOf('"reader_comment_eligibility"');
  assert.ok(sessionCheck>=0);
  assert.ok(anonymousReturn>sessionCheck);
  assert.ok(protectedRpc>anonymousReturn,"protected RPC must be unreachable for anonymous session");
});

test("discussion mount has one explicit refresh effect and no polling or retry loop",()=>{
  const discussion=read("src/ui/ReaderDiscussion.tsx");
  assert.match(discussion,/useEffect\(\(\)=>\{void refresh\(\);\},\[canonicalStoryId\]\)/);
  assert.doesNotMatch(discussion,/setInterval\s*\(/);
  assert.doesNotMatch(discussion,/setTimeout\s*\([^)]*refresh/);
  assert.match(discussion,/services\.readerDiscussion\.listPublic\(canonicalStoryId\)/);
  assert.match(discussion,/services\.readerDiscussion\.getEligibility\(canonicalStoryId\)/);
});

test("related coverage is bounded and cannot hydrate Home on sectionless detail",()=>{
  const article=read("app/article/[id].tsx");
  const related=between(article,"const related=useAsync(async()=>","const entitlement=useAsync");
  assert.match(article,/const RELATED_CONTEXT_LIMIT=4/);
  assert.match(related,/listBySection\(current\.primarySection\.slug,RELATED_CONTEXT_LIMIT\)/);
  assert.match(related,/current\.primarySection\?\.slug[\s\S]*:\s*\[\]/);
  assert.doesNotMatch(related,/getHome\(/);

  const corpus=read("src/services/migrated-corpus.ts");
  const context=between(corpus,"async function loadContext(","function cachedArticleForIdentity");
  assert.match(context,/boundedLimit/);
  assert.match(context,/p_limit: boundedLimit/);
  assert.match(context,/Array\.from\(new Set\(urls\)\)\.slice\(0,boundedLimit\)/);
  assert.match(context,/deduped\.slice\(0,boundedLimit\)/);
});

test("request-budget diagnostics cover mounts lookups related discussion and eligibility RPCs",()=>{
  const article=read("app/article/[id].tsx");
  const discussion=read("src/ui/ReaderDiscussion.tsx");
  const communications=read("src/services/communications.ts");
  for(const marker of ["article_mount_count","article_lookup_count","related_lookup_count"]){
    assert.ok(article.includes('"'+marker+'"'),"missing article stability counter "+marker);
  }
  for(const marker of ["discussion_refresh_count","public_comment_lookup_count","eligibility_service_check_count"]){
    assert.ok(discussion.includes('"'+marker+'"'),"missing discussion stability counter "+marker);
  }
  assert.ok(communications.includes('"eligibility_rpc_count"'));
  assert.match(article,/__HT_READER_STABILITY__/);
  assert.match(discussion,/__HT_READER_STABILITY__/);
  assert.match(communications,/__HT_READER_STABILITY__/);
});

test("normal detail request budget retains direct lookup and zero Home/full-feed related fallback",()=>{
  const article=read("app/article/[id].tsx");
  const related=between(article,"const related=useAsync(async()=>","const entitlement=useAsync");
  assert.doesNotMatch(related,/loadFeedDocuments|getHome|getRelated/);

  const corpus=read("src/services/migrated-corpus.ts");
  const identity=between(corpus,"async function resolveIdentity(id: string)","const articleRepository: ArticleRepository");
  assert.ok(identity.indexOf("resolveIdentityDirect(id)") < identity.indexOf("loadFeedDocuments()"));
});
