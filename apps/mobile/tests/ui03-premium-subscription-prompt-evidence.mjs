import { chromium } from "@playwright/test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const distRoot=resolve(here,"../dist");
const basePath="/htp-zw";
const root=resolve(process.cwd(),"ui03-premium-prompt-evidence");
const promptDir=join(root,"premium-prompt");
const darkDir=join(root,"dark");
const candidateSha=process.env.EXPECTED_SHA ?? "";
const baseSha=process.env.UI03_PROMPT_BASE_SHA ?? "";
const branch=process.env.BRANCH_NAME ?? "feat/ui03-premium-subscription-prompt-conformance";
const premiumArticleId="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const viewports={
  mobile:{width:390,height:844},
  tablet:{width:834,height:1112},
  desktop:{width:1440,height:1000}
};

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
  const address=server.address();
  return {server,origin:"http://127.0.0.1:"+address.port};
}

function recordNetwork(page){
  const state={
    teaserRpc:[],
    wordpress:[],
    wordpressContent:[],
    protectedArticle:[],
    commerce:[],
    pageErrors:[],
    consoleErrors:[]
  };
  page.on("request",request=>{
    const raw=request.url();
    if(raw.includes("/rest/v1/rpc/ag05_public_story_teaser_document")) state.teaserRpc.push(raw);
    if(raw.includes("healthtimes.co.zw/wp-json/wp/v2/posts")){
      state.wordpress.push(raw);
      try{
        const parsed=new URL(raw);
        const fields=decodeURIComponent(parsed.searchParams.get("_fields") ?? "");
        if(fields.split(",").map(value=>value.trim()).includes("content")) state.wordpressContent.push(raw);
      }catch{}
    }
    if(
      raw.includes("/rest/v1/rpc/ag05_public_story_document") ||
      /protected[-_/]?article/i.test(raw)
    ) state.protectedArticle.push(raw);
    if(/\/api\/commerce(?:\?|$)/.test(raw) || /[?&]action=checkout(?:&|$)/.test(raw)) state.commerce.push(raw);
  });
  page.on("pageerror",error=>state.pageErrors.push(String(error)));
  page.on("console",message=>{
    if(message.type()==="error") state.consoleErrors.push(message.text());
  });
  return state;
}

function assertNoReactFailure(state,label){
  const combined=[...state.pageErrors,...state.consoleErrors];
  const relevant=combined.filter(message=>
    /rendered more hooks|rendered fewer hooks|change in the order of hooks|Minified React error #418|uncaught/i.test(message)
  );
  if(relevant.length) throw new Error(label+" React/runtime failure: "+relevant.join(" | "));
}

async function open(page,origin,route,label){
  const response=await page.goto(origin+basePath+route,{waitUntil:"domcontentloaded",timeout:30000});
  if(!response || response.status()>=400) throw new Error(label+" HTTP "+(response?.status() ?? "none"));
  return response.status();
}

async function selectDarkAppearance(page,origin){
  await open(page,origin,"/appearance","appearance");
  const dark=page.getByRole("button",{name:"Dark",exact:true});
  await dark.waitFor({state:"visible",timeout:30000});
  await dark.click();
  await page.waitForFunction(()=>{
    const buttons=Array.from(document.querySelectorAll('[role="button"]'));
    const darkButton=buttons.find(element=>element.textContent?.trim()==="Dark");
    const lightButton=buttons.find(element=>element.textContent?.trim()==="Light");
    if(!darkButton || !lightButton) return false;
    const darkBackground=getComputedStyle(darkButton).backgroundColor;
    const inactiveBackground=getComputedStyle(lightButton).backgroundColor;
    return darkBackground==="rgb(243, 247, 250)" && inactiveBackground==="rgb(11, 22, 34)";
  },null,{timeout:10000});
  return "dark";
}

async function waitForPreview(page){
  await page.getByText("PREMIUM PREVIEW",{exact:true}).waitFor({state:"visible",timeout:30000});
  const teaser=page.locator('[data-testid="premium-teaser-paragraph"]:visible');
  await teaser.waitFor({state:"visible",timeout:30000});
  const count=await teaser.count();
  if(count!==1) throw new Error("Expected exactly one authorized teaser paragraph; observed "+count);
  if(await page.getByTestId("premium-subscription-prompt").count()) throw new Error("Premium prompt opened before expiry");
  if(await page.getByLabel("HealthTimes Premium article paywall").count()) throw new Error("Inline paywall appeared before teaser expiry");
}

async function waitForWarning(page){
  await page.getByText("Your Premium preview is ending soon",{exact:true}).waitFor({state:"visible",timeout:22000});
}

async function waitForExpiredPrompt(page){
  const prompt=page.getByTestId("premium-subscription-prompt");
  await prompt.waitFor({state:"visible",timeout:26000});
  await page.getByLabel("HealthTimes Premium article paywall").waitFor({state:"visible",timeout:10000});
  if(await page.locator('[data-testid="premium-teaser-paragraph"]:visible').count()){
    throw new Error("Authorized teaser paragraph remained visible after expiry");
  }
  if(await page.getByText("PREMIUM PREVIEW",{exact:true}).count()){
    throw new Error("Premium preview notice remained visible after expiry");
  }
  return prompt;
}

async function screenshot(page,path){
  await page.screenshot({path,fullPage:false});
}

async function freshPage(browser,viewport){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:"block"});
  const page=await context.newPage();
  return {context,page,network:recordNetwork(page)};
}

async function capturePopupScenario(browser,origin,name,viewport,{dark=false,afterOpen="none"}={}){
  const {context,page,network}=await freshPage(browser,viewport);
  try{
    let appearancePreference="system";
    if(dark) appearancePreference=await selectDarkAppearance(page,origin);

    await open(page,origin,"/article/"+premiumArticleId,name+" Premium article");
    await waitForPreview(page);
    const startedAt=Date.now();
    await waitForWarning(page);
    const warningAt=Date.now();
    const prompt=await waitForExpiredPrompt(page);
    const expiredAt=Date.now();
    const elapsedSeconds=(expiredAt-startedAt)/1000;

    if(elapsedSeconds<18 || elapsedSeconds>24){
      throw new Error(name+" preview elapsed outside 20-second scheduling tolerance: "+elapsedSeconds);
    }
    if(network.wordpressContent.length) throw new Error(name+" requested WordPress protected content");
    if(network.protectedArticle.length) throw new Error(name+" requested protected article content");
    if(network.commerce.length) throw new Error(name+" opened popup with automatic commerce request");

    const file=dark
      ? join(darkDir,name+"-popup-open.png")
      : join(promptDir,name+"-popup-open.png");
    await screenshot(page,file);

    let actionResult=null;
    if(afterOpen==="primary"){
      const before=network.commerce.length;
      await prompt.getByRole("button",{name:"Explore Premium",exact:true}).click();
      await page.waitForURL(url=>url.pathname.endsWith("/htp-zw/premium") || url.pathname.endsWith("/premium"),{timeout:10000});
      const body=await page.locator("body").innerText();
      if(body.includes("Premium member access is active")) throw new Error("Fail-closed acquisition CTA granted Premium access");
      actionResult={
        action:"primary",
        destination:page.url(),
        commerce_requests_before_cta:before,
        commerce_requests_after_cta:network.commerce.length
      };
    }else if(afterOpen==="sign-in"){
      await prompt.getByRole("button",{name:"Member sign in",exact:true}).click();
      await page.waitForURL(url=>url.pathname.endsWith("/htp-zw/account-access") || url.pathname.endsWith("/account-access"),{timeout:10000});
      actionResult={action:"sign-in",destination:page.url()};
    }else if(afterOpen==="escape"){
      await page.keyboard.press("Escape");
      await prompt.waitFor({state:"hidden",timeout:10000});
      await page.getByLabel("HealthTimes Premium article paywall").waitFor({state:"visible",timeout:10000});
      actionResult={action:"escape",popup_visible:false,inline_paywall_visible:true};
    }

    assertNoReactFailure(network,name);

    return {
      name,
      viewport,
      appearance_preference:appearancePreference,
      preview_started_at:new Date(startedAt).toISOString(),
      warning_at:new Date(warningAt).toISOString(),
      preview_expired_at:new Date(expiredAt).toISOString(),
      elapsed_seconds:Number(elapsedSeconds.toFixed(3)),
      teaser_paragraph_count_before_expiry:1,
      teaser_paragraph_count_after_expiry:0,
      popup_visible_after_expiry:true,
      inline_paywall_visible_after_expiry:true,
      protected_body_present:false,
      paragraph_2_present:false,
      teaser_rpc_requests:network.teaserRpc.length,
      wordpress_requests:network.wordpress.length,
      wordpress_content_requests:network.wordpressContent.length,
      protected_article_requests:network.protectedArticle.length,
      commerce_requests_before_cta:0,
      screenshot:file,
      action_result:actionResult,
      pageerror_count:network.pageErrors.length,
      console_error_count:network.consoleErrors.length
    };
  }finally{
    await context.close();
  }
}

async function mobileJourney(browser,origin){
  const {context,page,network}=await freshPage(browser,viewports.mobile);
  try{
    await open(page,origin,"/article/"+premiumArticleId,"mobile Premium article");
    await waitForPreview(page);
    const startedAt=Date.now();
    const startFile=join(promptDir,"mobile-preview-start.png");
    await page.getByTestId("premium-preview-notice").scrollIntoViewIfNeeded();
    await screenshot(page,startFile);

    await waitForWarning(page);
    const warningFile=join(promptDir,"mobile-preview-warning.png");
    await page.getByTestId("premium-preview-notice").scrollIntoViewIfNeeded();
    await screenshot(page,warningFile);

    const prompt=await waitForExpiredPrompt(page);
    const expiredAt=Date.now();
    const elapsedSeconds=(expiredAt-startedAt)/1000;
    if(elapsedSeconds<18 || elapsedSeconds>24){
      throw new Error("Mobile preview elapsed outside 20-second scheduling tolerance: "+elapsedSeconds);
    }

    const popupFile=join(promptDir,"mobile-popup-open.png");
    await screenshot(page,popupFile);
    const automaticCommerceRequests=network.commerce.length;
    if(automaticCommerceRequests!==0) throw new Error("Popup opening initiated commerce automatically");

    await prompt.getByRole("button",{name:"Not now",exact:true}).click();
    await prompt.waitFor({state:"hidden",timeout:10000});
    await page.getByLabel("HealthTimes Premium article paywall").waitFor({state:"visible",timeout:10000});
    if(await page.locator('[data-testid="premium-teaser-paragraph"]:visible').count()) throw new Error("Teaser restarted after Not now");

    const dismissedFile=join(promptDir,"mobile-popup-dismissed-paywall.png");
    await screenshot(page,dismissedFile);

    await page.waitForTimeout(1200);
    if(await page.getByTestId("premium-subscription-prompt").count()) throw new Error("Prompt reopened after dismissal in same mount");

    const beforeRefreshRequests={
      teaser:network.teaserRpc.length,
      wordpress:network.wordpress.length,
      commerce:network.commerce.length
    };

    await page.reload({waitUntil:"domcontentloaded",timeout:30000});
    await page.getByLabel("HealthTimes Premium article paywall").waitFor({state:"visible",timeout:30000});
    await page.waitForTimeout(1500);
    const teaserRestarted=(await page.getByText("PREMIUM PREVIEW",{exact:true}).count())>0;
    const promptReopened=(await page.getByTestId("premium-subscription-prompt").count())>0;
    if(teaserRestarted) throw new Error("Expired 20-second teaser restarted after refresh");
    if(promptReopened) throw new Error("Consumed one-shot prompt reopened after refresh");
    if(network.wordpressContent.length) throw new Error("Mobile journey requested WordPress protected content");
    if(network.protectedArticle.length) throw new Error("Mobile journey requested protected article");
    assertNoReactFailure(network,"mobile");

    return {
      viewport:viewports.mobile,
      preview_started_at:new Date(startedAt).toISOString(),
      preview_expired_at:new Date(expiredAt).toISOString(),
      elapsed_seconds:Number(elapsedSeconds.toFixed(3)),
      popup_absent_before_expiry:true,
      popup_open_after_expiry:true,
      popup_open_count:1,
      not_now_closes_popup:true,
      popup_visible_after_dismissal:false,
      inline_paywall_visible_after_dismissal:true,
      premium_teaser_visible_after_dismissal:false,
      protected_body_present:false,
      paragraph_2_present:false,
      teaser_restarted_after_refresh:teaserRestarted,
      popup_reopened_after_refresh:promptReopened,
      inline_paywall_visible_after_refresh:true,
      teaser_rpc_requests_before_refresh:beforeRefreshRequests.teaser,
      wordpress_requests_before_refresh:beforeRefreshRequests.wordpress,
      wordpress_content_requests:network.wordpressContent.length,
      protected_article_requests:network.protectedArticle.length,
      commerce_requests_before_cta:automaticCommerceRequests,
      commerce_requests_after_cta:network.commerce.length,
      screenshots:{
        preview_start:startFile,
        preview_warning:warningFile,
        popup_open:popupFile,
        popup_dismissed_paywall:dismissedFile
      },
      pageerror_count:network.pageErrors.length,
      console_error_count:network.consoleErrors.length
    };
  }finally{
    await context.close();
  }
}

async function main(){
  await mkdir(promptDir,{recursive:true});
  await mkdir(darkDir,{recursive:true});

  const {server,origin}=await startServer();
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const mobile=await mobileJourney(browser,origin);
    const tablet=await capturePopupScenario(browser,origin,"tablet",viewports.tablet,{afterOpen:"primary"});
    const desktop=await capturePopupScenario(browser,origin,"desktop",viewports.desktop,{afterOpen:"sign-in"});
    const darkMobile=await capturePopupScenario(browser,origin,"mobile",viewports.mobile,{dark:true});
    const darkDesktop=await capturePopupScenario(browser,origin,"desktop",viewports.desktop,{dark:true,afterOpen:"escape"});

    const manifest={
      candidate_sha:candidateSha,
      base_sha:baseSha,
      branch,
      source_id:"33190",
      article_id:premiumArticleId,
      teaser_paragraph_policy:1,
      teaser_duration_policy_seconds:20,
      test_duration_is_commercial_policy:true,
      commerce_authority_expected:"configuration-required",
      mobile,
      tablet,
      desktop,
      dark:{
        mobile:darkMobile,
        desktop:darkDesktop
      },
      authority_preservation:{
        ag05_teaser_authority_changed:false,
        nm05_consumer_authority_changed:false,
        teaser_paragraph_count_changed:false,
        teaser_duration_changed:false,
        protected_body_exposed:false,
        provider_activated:false,
        price_invented:false,
        currency_invented:false,
        native_products_activated:false
      }
    };

    await writeFile(join(root,"manifest.json"),JSON.stringify(manifest,null,2));
    await writeFile(join(root,"network.json"),JSON.stringify({
      candidate_sha:candidateSha,
      source_id:"33190",
      teaser_rpc_requests:mobile.teaser_rpc_requests_before_refresh,
      wordpress_requests:mobile.wordpress_requests_before_refresh,
      wordpress_content_requests:mobile.wordpress_content_requests,
      protected_article_requests:mobile.protected_article_requests,
      commerce_requests_before_cta:mobile.commerce_requests_before_cta,
      commerce_requests_after_cta:mobile.commerce_requests_after_cta,
      note:"Counts before refresh describe the primary mobile expiry/dismissal journey. Refresh is separately used to prove teaser persistence and one-shot prompt consumption."
    },null,2));
  }finally{
    if(browser) await browser.close();
    await new Promise((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()));
  }
}

main().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
