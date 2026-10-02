import assert from "node:assert/strict";
import http from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here=dirname(fileURLToPath(import.meta.url));
const distRoot=resolve(here,"../dist");
const basePath="/htp-zw";

const premiumSlug="zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const premiumArticleId="source-"+premiumSlug;
const premiumCurrentPath="/"+premiumSlug+"/";
const premiumDatedPath="/2026/09/18/"+premiumSlug+"/";
const publicSlug="ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis";
const publicArticleId="source-"+publicSlug;
const publicDatedPath="/2026/09/18/"+publicSlug+"/";

const contentTypes={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".ico":"image/x-icon",
  ".woff":"font/woff",
  ".woff2":"font/woff2"
};

async function resolveFile(pathname){
  if(!pathname.startsWith(basePath)) return null;
  let relative=decodeURIComponent(pathname.slice(basePath.length));
  if(!relative || relative==="/") relative="/index.html";
  const safe=normalize(relative).replace(/^(\.\.[/\\])+/, "");
  let candidate=join(distRoot,safe);
  try{
    const info=await stat(candidate);
    if(info.isDirectory()) candidate=join(candidate,"index.html");
    return candidate;
  }catch{}
  if(!extname(candidate)){
    for(const fallback of [candidate+".html",join(candidate,"index.html")]){
      try{
        await stat(fallback);
        return fallback;
      }catch{}
    }
  }
  return null;
}

function wpPost({id,slug,path,title,excerpt,content}){
  return {
    id,
    date:"2026-09-18T10:00:00",
    modified:"2026-09-18T10:00:00",
    slug,
    link:"https://healthtimes.co.zw"+path,
    author:7,
    featured_media:0,
    categories:[],
    tags:[],
    title:{rendered:title},
    excerpt:{rendered:"<p>"+excerpt+"</p>"},
    ...(content===undefined ? {} : {content:{rendered:content}}),
    _embedded:{
      author:[{id:7,name:"HealthTimes Reporter",slug:"healthtimes-reporter"}],
      "wp:term":[]
    }
  };
}

async function startServer(){
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url || "/", "http://127.0.0.1");
      const file=await resolveFile(url.pathname);
      if(!file){
        res.writeHead(404,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"});
        res.end("Not found");
        return;
      }
      const body=await readFile(file);
      res.writeHead(200,{
        "content-type":contentTypes[extname(file)] || "application/octet-stream",
        "cache-control":"no-store"
      });
      res.end(body);
    }catch(error){
      res.writeHead(500,{"content-type":"text/plain; charset=utf-8"});
      res.end(String(error));
    }
  });
  await new Promise(resolveReady=>server.listen(0,"127.0.0.1",resolveReady));
  return server;
}

async function runPremiumScenario(browser,origin,{metadataAvailable}){
  const context=await browser.newContext({serviceWorkers:"block"});
  const page=await context.newPage();

  const wordpressRequests=[];
  const teaserRequests=[];
  const protectedRequests=[];
  const commerceRequests=[];
  const browserErrors=[];

  page.on("pageerror",error=>browserErrors.push(error.message));
  page.on("console",message=>{
    if(message.type()==="error") browserErrors.push(message.text());
  });
  page.on("request",request=>{
    const url=request.url();
    if(url.includes("healthtimes.co.zw/wp-json/wp/v2/posts")) wordpressRequests.push(url);
    if(url.includes("/rest/v1/rpc/ag05_public_story_teaser_document")){
      let payload=null;
      try{payload=request.postDataJSON();}catch{}
      teaserRequests.push({url,p_path:payload?.p_path ?? null});
    }
    if(url.includes("/rest/v1/rpc/ag05_public_story_document")) protectedRequests.push(url);
    if(/\/api\/commerce(?:\?|$)/.test(url)) commerceRequests.push(url);
  });

  await page.route("https://healthtimes.co.zw/wp-json/wp/v2/posts**",async route=>{
    const url=new URL(route.request().url());
    const slug=url.searchParams.get("slug");
    const fields=decodeURIComponent(url.searchParams.get("_fields") ?? "");
    const includesContent=fields.split(",").includes("content");

    let payload=[];
    if(slug===premiumSlug && metadataAvailable && !includesContent){
      payload=[wpPost({
        id:33190,
        slug:premiumSlug,
        path:premiumCurrentPath,
        title:"Zimbabwe Looks to Strengthen Social Contracting as HIV Donor Funding Shrinks",
        excerpt:"Public metadata only."
      })];
    }

    await route.fulfill({
      status:200,
      contentType:"application/json",
      headers:{
        "access-control-allow-origin":"*",
        "x-wp-total":String(payload.length),
        "x-wp-totalpages":payload.length ? "1" : "0"
      },
      body:JSON.stringify(payload)
    });
  });

  const liveTeaserResponsePromise=metadataAvailable
    ? page.waitForResponse(
        response=>{
          if(!response.url().includes("/rest/v1/rpc/ag05_public_story_teaser_document")) return false;
          try{return response.request().postDataJSON()?.p_path===premiumDatedPath;}catch{return false;}
        },
        {timeout:15000}
      )
    : null;

  await page.goto(origin+basePath+"/article/"+premiumArticleId,{waitUntil:"domcontentloaded"});

  let liveTeaserEvidence=null;
  if(metadataAvailable){
    await page.getByText("PREMIUM PREVIEW",{exact:true}).waitFor({state:"visible",timeout:15000});
    const teaserResponse=await liveTeaserResponsePromise;
    const teaserPayload=await teaserResponse.json();
    const teaserHtml=String(teaserPayload?.premium_teaser_html ?? "").trim();
    const teaserParagraphs=teaserHtml.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi) ?? [];
    liveTeaserEvidence={
      source_id:teaserPayload?.source_id===null || teaserPayload?.source_id===undefined
        ? null
        : String(teaserPayload.source_id),
      access_policy:teaserPayload?.access_policy ?? null,
      body_html_is_null:teaserPayload?.body_html===null,
      teaser_paragraph_count:teaserParagraphs.length,
      teaser_length:teaserHtml.length,
      teaser_sha256:createHash("sha256").update(teaserHtml).digest("hex")
    };
    assert.equal(liveTeaserEvidence.source_id,"33190");
    assert.equal(liveTeaserEvidence.access_policy,"premium_marker_review");
    assert.equal(liveTeaserEvidence.body_html_is_null,true);
    assert.equal(liveTeaserEvidence.teaser_paragraph_count,1);
    assert.equal(teaserRequests.length,2,"Premium flow must try current permalink then bounded dated compatibility path");
    assert.equal(teaserRequests[0].p_path,premiumCurrentPath,"first teaser RPC must use current WordPress permalink");
    assert.equal(teaserRequests[1].p_path,premiumDatedPath,"second teaser RPC must use metadata-derived dated compatibility path");

    const teaserText=page.locator('[data-testid="premium-preview-teaser"]');
    if(await teaserText.count()){
      await teaserText.first().waitFor({state:"visible",timeout:5000});
    }
    assert.equal(
      await page.getByText("Continue reading with HealthTimes Premium",{exact:true}).count(),
      0,
      "inline paywall must be absent during active preview"
    );

    const beforeExpiryWordPressCount=wordpressRequests.length;
    await page.getByText("Continue reading with HealthTimes Premium",{exact:true}).waitFor({
      state:"visible",
      timeout:25000
    });
    await page.getByTestId("premium-subscription-prompt").waitFor({state:"visible",timeout:5000});
    await page.getByTestId("premium-prompt-not-now").click();
    await page.getByTestId("premium-subscription-prompt").waitFor({state:"hidden",timeout:5000});
    await page.getByText("Continue reading with HealthTimes Premium",{exact:true}).waitFor({state:"visible"});

    assert.equal(
      wordpressRequests.length,
      beforeExpiryWordPressCount,
      "20-second expiry must not trigger another WordPress request"
    );
  }else{
    await page.getByText("Continue reading with HealthTimes Premium",{exact:true}).waitFor({
      state:"visible",
      timeout:10000
    });
    assert.equal(teaserRequests.length,0,"metadata failure must not attempt teaser lookup from slug-only fallback identity");
  }

  const wordpressContentFieldRequests=wordpressRequests.filter(rawUrl=>{
    const url=new URL(rawUrl);
    const fields=decodeURIComponent(url.searchParams.get("_fields") ?? "");
    return fields.split(",").includes("content");
  });

  assert.equal(wordpressContentFieldRequests.length,0,"anonymous Premium must make zero WordPress content-field requests");
  assert.equal(protectedRequests.length,0,"anonymous Premium must make zero protected-body RPC requests");
  assert.equal(commerceRequests.length,0,"Premium preview must make zero automatic commerce requests");

  const relevantErrors=browserErrors.filter(message=>
    /rendered more hooks|rendered fewer hooks|change in the order of hooks|uncaught/i.test(message)
  );
  assert.deepEqual(relevantErrors,[]);

  await context.close();
  return {
    metadata_available:metadataAvailable,
    requested_p_path:teaserRequests.at(-1)?.p_path ?? null,
    attempted_p_paths:teaserRequests.map(entry=>entry.p_path),
    wordpress_metadata_requests:wordpressRequests.length,
    wordpress_content_field_requests:wordpressContentFieldRequests.length,
    protected_article_requests:protectedRequests.length,
    automatic_commerce_requests:commerceRequests.length,
    live_teaser:liveTeaserEvidence
  };
}

async function runPublicComparison(browser,origin){
  const context=await browser.newContext({serviceWorkers:"block"});
  const page=await context.newPage();
  const wordpressRequests=[];
  const teaserRequests=[];

  page.on("request",request=>{
    const url=request.url();
    if(url.includes("healthtimes.co.zw/wp-json/wp/v2/posts")) wordpressRequests.push(url);
    if(url.includes("/rest/v1/rpc/ag05_public_story_teaser_document")){
      let payload=null;
      try{payload=request.postDataJSON();}catch{}
      teaserRequests.push(payload?.p_path ?? null);
    }
  });

  await page.route("https://healthtimes.co.zw/wp-json/wp/v2/posts**",async route=>{
    const url=new URL(route.request().url());
    const slug=url.searchParams.get("slug");
    const fields=decodeURIComponent(url.searchParams.get("_fields") ?? "");
    const includesContent=fields.split(",").includes("content");

    let payload=[];
    if(slug===publicSlug){
      payload=[wpPost({
        id:33001,
        slug:publicSlug,
        path:publicDatedPath,
        title:"Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt",
        excerpt:"Public comparison metadata.",
        ...(includesContent ? {content:"<p>PUBLIC BODY NETWORK PROBE</p>"} : {})
      })];
    }

    await route.fulfill({
      status:200,
      contentType:"application/json",
      headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify(payload)
    });
  });

  // Public comparison teaser classification is deterministic and bounded here;
  // only the Premium repaired journey uses the live teaser authority below.
  await page.route("https://gcdohgbmqhqwydgaxrcr.supabase.co/rest/v1/rpc/ag05_public_story_teaser_document",async route=>{
    const payload=route.request().postDataJSON();
    await route.fulfill({
      status:200,
      contentType:"application/json",
      headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify({
        source_id:"33001",
        access_policy:"public",
        body_html:null,
        premium_teaser_html:null,
        requested_path:payload?.p_path ?? null
      })
    });
  });

  await page.goto(origin+basePath+"/article/"+publicArticleId,{waitUntil:"domcontentloaded"});
  await page.getByText("PUBLIC BODY NETWORK PROBE",{exact:true}).waitFor({state:"visible",timeout:15000});

  const contentRequests=wordpressRequests.filter(rawUrl=>{
    const url=new URL(rawUrl);
    const fields=decodeURIComponent(url.searchParams.get("_fields") ?? "");
    return fields.split(",").includes("content");
  });
  assert.ok(contentRequests.length>=1,"public comparison must remain capable of requesting public body content");
  assert.equal(teaserRequests[0],publicDatedPath,"public comparison must classify from resolved metadata permalink");

  await context.close();
  return {
    public_body_visible:true,
    public_content_field_requests:contentRequests.length,
    public_requested_p_path:teaserRequests[0]
  };
}

async function main(){
  let server;
  let browser;
  try{
    server=await startServer();
    const address=server.address();
    const origin="http://127.0.0.1:"+address.port;
    browser=await chromium.launch({headless:true});

    const repaired=await runPremiumScenario(browser,origin,{metadataAvailable:true});
    const failedMetadata=await runPremiumScenario(browser,origin,{metadataAvailable:false});
    const publicComparison=await runPublicComparison(browser,origin);

    const evidence={
      story_source_id:"33190",
      accepted_access_policy:"premium_marker_review",
      repaired,
      metadata_failure:failedMetadata,
      public_comparison:publicComparison
    };
    const evidencePath=process.env.NM05R_EVIDENCE_PATH || join(distRoot,"nm05r-live-path-evidence.json");
    await writeFile(evidencePath,JSON.stringify(evidence,null,2)+"\n","utf8");
    console.log(JSON.stringify(evidence));
  }finally{
    if(browser) await browser.close();
    if(server) await new Promise((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()));
  }
}

main().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
