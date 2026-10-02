import assert from "node:assert/strict";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here=dirname(fileURLToPath(import.meta.url));
const distRoot=resolve(here,"../dist");
const basePath="/htp-zw";
const premiumArticleId="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";

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

async function main(){
  let server;
  let browser;
  try{
    server=http.createServer(async(req,res)=>{
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
    const address=server.address();
    const origin="http://127.0.0.1:"+address.port;

    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({serviceWorkers:"block"});
    const page=await context.newPage();

    const wordpressRequests=[];
    const teaserRequests=[];
    const commerceRequests=[];
    const browserErrors=[];

    page.on("pageerror",error=>browserErrors.push(error.message));
    page.on("console",message=>{
      if(message.type()==="error") browserErrors.push(message.text());
    });
    page.on("request",request=>{
      const url=request.url();
      if(url.includes("healthtimes.co.zw/wp-json/wp/v2/posts")) wordpressRequests.push(url);
      if(url.includes("/rest/v1/rpc/ag05_public_story_teaser_document")) teaserRequests.push(url);
      if(/\/api\/commerce(?:\?|$)/.test(url)) commerceRequests.push(url);
    });

    await page.route("https://healthtimes.co.zw/wp-json/wp/v2/posts**",async route=>{
      await route.fulfill({
        status:200,
        contentType:"application/json",
        headers:{
          "access-control-allow-origin":"*",
          "x-wp-total":"0",
          "x-wp-totalpages":"0"
        },
        body:"[]"
      });
    });

    await page.route("https://gcdohgbmqhqwydgaxrcr.supabase.co/rest/v1/rpc/ag05_public_story_teaser_document",async route=>{
      await route.fulfill({
        status:200,
        contentType:"application/json",
        headers:{"access-control-allow-origin":"*"},
        body:JSON.stringify({
          source_id:"33190",
          access_policy:"premium_marker_review",
          body_html:null,
          premium_teaser_html:"<p>BOUNDED PUBLIC TEASER NETWORK PROBE</p>"
        })
      });
    });

    await page.goto(origin+basePath+"/article/"+premiumArticleId,{waitUntil:"domcontentloaded"});
    await page.getByText("PREMIUM PREVIEW",{exact:true}).waitFor({state:"visible",timeout:15000});

    assert.ok(teaserRequests.length>=1,"Expected bounded AG-05 teaser RPC request.");
    assert.ok(wordpressRequests.length>=1,"Expected source-parity WordPress metadata request.");

    const beforeExpiryWordPressCount=wordpressRequests.length;
    await page.getByText("Continue reading with HealthTimes Premium",{exact:true}).waitFor({
      state:"visible",
      timeout:25000
    });
    assert.equal(
      wordpressRequests.length,
      beforeExpiryWordPressCount,
      "Preview expiry must not trigger any additional WordPress request"
    );

    for(const rawUrl of wordpressRequests){
      const url=new URL(rawUrl);
      const fields=decodeURIComponent(url.searchParams.get("_fields") ?? "");
      assert.equal(
        fields.split(",").includes("content"),
        false,
        "Premium source-parity browser request must never include WordPress content.rendered"
      );
    }

    assert.equal(
      commerceRequests.length,
      0,
      "Static source-parity Reader must not contact a server commerce endpoint when none is configured"
    );

    const relevantErrors=browserErrors.filter(message=>
      /rendered more hooks|rendered fewer hooks|change in the order of hooks|uncaught/i.test(message)
    );
    assert.deepEqual(relevantErrors,[]);

    console.log(JSON.stringify({
      story_source_id:"33190",
      bounded_teaser_rpc_requests:teaserRequests.length,
      wordpress_requests:wordpressRequests.length,
      wordpress_content_field_requests:0,
      commerce_requests:commerceRequests.length,
      premium_preview_visible:true,
      expired_to_inline_paywall:true,
      expiry_additional_wordpress_requests:0
    }));
  }finally{
    if(browser) await browser.close();
    if(server) await new Promise((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()));
  }
}

main().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
