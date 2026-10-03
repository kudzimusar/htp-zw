import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const require=createRequire(import.meta.url);
const playwrightVersion=require("@playwright/test/package.json").version;
const BASE=(process.env.PUBLIC_URL||"https://kudzimusar.github.io/htp-zw").replace(/\/+$/,"");
const WRAPPER=process.env.TARGET_DEPLOYED_SHA||"87bebecfa9e224b6356e1509093ba745bb80a883";
const EXECUTABLE=process.env.ACCEPTED_EXECUTABLE_SHA||"9afa03a32d7e1187c1a2cc383411bcfed3d3ea2a";
const TOOLING=process.env.CERTIFICATION_TOOLING_SHA||process.env.GITHUB_SHA||"unknown";
const RUN_ID=process.env.GITHUB_RUN_ID||"local";
const ROOT=process.env.ARTIFACT_DIR||"artifacts/ui06/ui-int02-premium-live-cert";
const PREMIUM_ROUTE="/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const FIJI_ROUTE="/article/source-fiji-hiv-emergency-epidemic-spreads-beyond-drug-users";
const VIEWS={
  mobile:{width:390,height:844,dismiss:"not-now"},
  tablet:{width:834,height:1112,dismiss:"close"},
  desktop:{width:1440,height:1000,dismiss:"escape"}
};
const TIMEOUT=35000;
const TOLERANCE=8;
const findings=[];
const results={premium:[],fiji:[],shell:[]};
let firstBlocker=null;
let browserVersion="unknown";
let buildInfo=null;

fs.mkdirSync(ROOT,{recursive:true});
for(const d of ["premium","fiji","shell","dark"]) fs.mkdirSync(path.join(ROOT,d),{recursive:true});

function stamp(){return new Date().toISOString();}
function write(rel,value){
  const file=path.join(ROOT,rel);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,typeof value==="string"?value:JSON.stringify(value,null,2)+"\n");
}
function finding(severity,category,message,evidence={}){
  findings.push({captured_at:stamp(),severity,category,message,evidence});
}
function block(message,evidence={}){
  finding("P1","blocker",message,evidence);
  if(!firstBlocker) firstBlocker={message,evidence};
  throw new Error(message);
}
function assert(condition,message,evidence={}){
  if(!condition) block(message,evidence);
}
function clean(value){return String(value??"").replace(/\s+/g," ").trim();}
function isReact418(text){
  const s=String(text||"").toLowerCase();
  return s.includes("minified react error #418")||s.includes("react error #418");
}
function isWordPressContentRequest(url){
  try{
    const u=new URL(url);
    const decoded=decodeURIComponent(u.search||"").toLowerCase();
    return u.pathname.includes("/wp-json/wp/v2/posts") && decoded.includes("content");
  }catch{return false;}
}
function isProtectedRequest(url){
  const s=String(url||"").toLowerCase();
  return isWordPressContentRequest(url) ||
    s.includes("/protected") ||
    s.includes("protected-article") ||
    s.includes("premium-body") ||
    s.includes("member-article");
}
function isCommerceRequest(url){
  const s=String(url||"").toLowerCase();
  return s.includes("/api/commerce") ||
    s.includes("paynow") ||
    s.includes("paypal") ||
    s.includes("/checkout") ||
    s.includes("checkout.");
}
function makeDiag(page,label){
  const d={label,requests:[],responses:[],failed:[],console:[],pageErrors:[],projections:[]};
  page.on("request",req=>{
    d.requests.push({url:req.url(),method:req.method(),resourceType:req.resourceType(),postData:req.postData()});
  });
  page.on("requestfailed",req=>{
    d.failed.push({url:req.url(),method:req.method(),resourceType:req.resourceType(),failure:req.failure()});
  });
  page.on("console",msg=>{
    if(msg.type()==="error"||msg.type()==="warning"){
      d.console.push({type:msg.type(),text:msg.text(),location:msg.location()});
    }
  });
  page.on("pageerror",error=>d.pageErrors.push({message:error.message||String(error),stack:error.stack||null}));
  page.on("response",async response=>{
    const item={url:response.url(),status:response.status(),resourceType:response.request().resourceType()};
    d.responses.push(item);
    if(response.url().includes("ag05_public_story_teaser_document")){
      try{
        const body=await response.json();
        d.projections.push({url:response.url(),status:response.status(),body});
      }catch(error){
        d.projections.push({url:response.url(),status:response.status(),parse_error:String(error)});
      }
    }
  });
  return d;
}
function runtimeCounts(d){
  const all=[...d.pageErrors.map(x=>x.message),...d.console.filter(x=>x.type==="error").map(x=>x.text)];
  return {
    React_418_count:all.filter(isReact418).length,
    pageerror_count:d.pageErrors.length,
    console_error_count:d.console.filter(x=>x.type==="error").length,
    console_warning_count:d.console.filter(x=>x.type==="warning").length
  };
}
async function overflow(page){
  return page.evaluate((tolerance)=>{
    const width=innerWidth;
    const doc=document.documentElement.scrollWidth;
    const body=document.body?.scrollWidth||0;
    const pixels=Math.max(0,Math.max(doc,body)-width);
    return {viewport_width:width,document_scroll_width:doc,body_scroll_width:body,overflow_pixels:pixels,pass:pixels<=tolerance};
  },TOLERANCE);
}
async function serviceWorker(page){
  return page.evaluate(async()=>{
    if(!("serviceWorker" in navigator)) return {supported:false,registered:false,controlling:false,state:"unsupported"};
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      return {
        supported:true,
        registered:Boolean(reg),
        controlling:Boolean(navigator.serviceWorker.controller),
        controller_script:navigator.serviceWorker.controller?.scriptURL||null,
        active_script:reg?.active?.scriptURL||null,
        state:reg?.active?"active":reg?.waiting?"waiting":reg?.installing?"installing":"none"
      };
    }catch(error){
      return {supported:true,registered:false,controlling:false,state:"error",error:String(error)};
    }
  });
}
async function installPromptCounter(page){
  await page.addInitScript(()=>{
    window.__htPromptOpenCount=0;
    window.__htPromptWasOpen=false;
    const observe=()=>{
      const check=()=>{
        const node=document.querySelector('[data-testid="premium-subscription-prompt"]');
        const open=Boolean(node);
        if(open&&!window.__htPromptWasOpen) window.__htPromptOpenCount++;
        window.__htPromptWasOpen=open;
      };
      check();
      new MutationObserver(check).observe(document.documentElement,{childList:true,subtree:true,attributes:true});
    };
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",observe,{once:true});
    else observe();
  });
}
async function setDark(page){
  const response=await page.goto(BASE+"/appearance?ui06="+Date.now(),{waitUntil:"domcontentloaded",timeout:TIMEOUT});
  assert(response&&response.status()<400,"Appearance route failed",{status:response?.status()});
  const dark=page.getByRole("button",{name:"Dark",exact:true});
  await dark.waitFor({state:"visible",timeout:TIMEOUT});
  await dark.click();
  await page.waitForTimeout(350);
  return true;
}
async function identity(){
  const response=await fetch(BASE+"/build-info.json?ui06="+Date.now(),{headers:{"cache-control":"no-cache, no-store"}});
  assert(response.ok,"Public build-info.json failed",{status:response.status});
  buildInfo=await response.json();
  assert(buildInfo.sha===WRAPPER,"Pages wrapper identity mismatch",{expected:WRAPPER,actual:buildInfo.sha});
  assert(buildInfo.presentation==="apps/mobile","Pages presentation is not apps/mobile",{buildInfo});
  assert(buildInfo.service_mode==="source-parity","Pages service mode is not source-parity",{buildInfo});
  assert(buildInfo.base_path==="/htp-zw","Pages base_path mismatch",{buildInfo});
  write("build-info.json",buildInfo);
}
async function waitArticleResolved(page){
  await page.waitForFunction(()=>!document.body.innerText.includes("Loading article…"),null,{timeout:TIMEOUT});
  await page.getByRole("button",{name:/Back/i}).first().waitFor({state:"visible",timeout:TIMEOUT});
}
async function projectionForSource(d,sourceId){
  for(let i=0;i<20;i++){
    const hit=d.projections.map(x=>x.body).flatMap(x=>Array.isArray(x)?x:[x]).find(x=>String(x?.source_id??"")===String(sourceId));
    if(hit) return hit;
    await new Promise(r=>setTimeout(r,100));
  }
  return null;
}
async function promptSnapshot(page,viewportName){
  const prompt=page.locator('[data-testid="premium-subscription-prompt"]');
  await prompt.waitFor({state:"visible",timeout:TIMEOUT});
  const count=await prompt.count();
  const closeCount=await page.getByRole("button",{name:"Close Premium membership prompt",exact:true}).count();
  const explore=page.getByRole("button",{name:"Explore Premium",exact:true});
  const signIn=page.getByRole("button",{name:"Member sign in",exact:true});
  const notNow=page.getByRole("button",{name:"Not now",exact:true});
  const heading=page.getByRole("heading",{name:"Keep reading with HealthTimes Premium",exact:true});
  assert(count===1,"UI-03 prompt is not exactly one DOM instance",{viewportName,count});
  assert(closeCount===1,"Duplicate accessible close target detected",{viewportName,closeCount});
  assert(await explore.isVisible(),"Explore Premium control missing",{viewportName});
  assert(await signIn.isVisible(),"Member sign in control missing",{viewportName});
  assert(await notNow.isVisible(),"Not now control missing",{viewportName});
  assert(await heading.isVisible(),"Prompt heading semantics missing",{viewportName});
  const box=await prompt.boundingBox();
  assert(box,"Prompt has no rendered bounding box",{viewportName});
  if(viewportName==="mobile"){
    assert(Math.abs((box.y+box.height)-844)<35,"Mobile prompt is not bottom-sheet aligned",{box});
    assert(box.width>=360,"Mobile bottom sheet is unexpectedly narrow",{box});
  }else{
    const v=VIEWS[viewportName];
    const centerX=box.x+box.width/2;
    const centerY=box.y+box.height/2;
    assert(box.width<=610,"Tablet/desktop prompt exceeds centered-card width",{viewportName,box});
    assert(Math.abs(centerX-v.width/2)<80,"Tablet/desktop prompt is not horizontally centered",{viewportName,box});
    assert(Math.abs(centerY-v.height/2)<180,"Tablet/desktop prompt is not vertically centered",{viewportName,box});
  }
  await explore.focus();
  const focusExplore=await page.evaluate(()=>document.activeElement?.getAttribute("aria-label")||document.activeElement?.textContent||"");
  assert(clean(focusExplore).includes("Explore Premium"),"Explore Premium is not keyboard-focusable",{viewportName,focusExplore});
  await page.keyboard.press("Tab");
  const afterTab=clean(await page.evaluate(()=>document.activeElement?.getAttribute("aria-label")||document.activeElement?.textContent||""));
  assert(afterTab.length>0,"Keyboard Tab left no active accessible control",{viewportName});
  return {count,closeCount,box,controls:{explore:true,member_sign_in:true,not_now:true,heading:true},keyboard:{explore_focus:true,after_tab:afterTab}};
}
async function dismissPrompt(page,method){
  if(method==="not-now"){
    await page.getByRole("button",{name:"Not now",exact:true}).click();
  }else if(method==="close"){
    await page.getByRole("button",{name:"Close Premium membership prompt",exact:true}).click();
  }else if(method==="escape"){
    await page.keyboard.press("Escape");
  }else throw new Error("Unknown dismiss method "+method);
  await page.locator('[data-testid="premium-subscription-prompt"]').waitFor({state:"detached",timeout:5000}).catch(async()=>{
    await page.locator('[data-testid="premium-subscription-prompt"]').waitFor({state:"hidden",timeout:5000});
  });
}
async function premiumJourney(browser,name,view){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1});
  const page=await context.newPage();
  await installPromptCounter(page);
  const d=makeDiag(page,"premium-"+name);
  try{
    await setDark(page);
    const response=await page.goto(BASE+PREMIUM_ROUTE+"?ui06="+name+"-"+Date.now(),{waitUntil:"domcontentloaded",timeout:TIMEOUT});
    assert(response&&response.status()<400,"Premium route HTTP failure",{viewport:name,status:response?.status()});
    await waitArticleResolved(page);

    const premiumBadge=page.getByText("PREMIUM",{exact:true}).first();
    await premiumBadge.waitFor({state:"visible",timeout:TIMEOUT});
    const teaser=page.locator('[data-testid="premium-teaser-paragraph"]');
    await teaser.waitFor({state:"visible",timeout:TIMEOUT});
    const teaserCount=await teaser.count();
    assert(teaserCount===1,"Premium teaser paragraph count is not exactly one",{viewport:name,teaserCount});
    const teaserText=clean(await teaser.innerText());
    assert(teaserText.length>0,"Premium teaser paragraph is empty",{viewport:name});
    const previewNotice=page.locator('[data-testid="premium-preview-notice"]');
    assert(await previewNotice.isVisible(),"Premium preview notice is absent before expiry",{viewport:name});
    const paywall=page.getByLabel("HealthTimes Premium article paywall");
    assert(!(await paywall.isVisible().catch(()=>false)),"Inline paywall appeared before preview expiry",{viewport:name});
    const countdownText=clean(await previewNotice.innerText());
    const previewFirstSeen=Date.now();
    const remainingMatch=countdownText.match(/(\d+)\s+seconds remaining/i);
    const initialRemaining=remainingMatch?Number(remainingMatch[1]):null;
    assert(initialRemaining!==null&&initialRemaining>=17&&initialRemaining<=20,"Observed Premium timer does not represent the 20-second window",{viewport:name,countdownText,initialRemaining});

    await page.waitForTimeout(500);
    const projection=await projectionForSource(d,33190);
    assert(projection,"No bounded teaser projection observed for source 33190",{viewport:name,projections:d.projections});
    assert(projection.body_html===null,"Source 33190 projection exposed body_html",{viewport:name,body_html:projection.body_html});
    assert(String(projection.source_id)==="33190","Premium projection source mismatch",{viewport:name,source_id:projection.source_id});

    const preExpiryShot="premium/"+name+"-pre-expiry.png";
    await page.screenshot({path:path.join(ROOT,preExpiryShot),fullPage:false});

    const waitStarted=Date.now();
    await paywall.waitFor({state:"visible",timeout:28000});
    const observedSeconds=(Date.now()-previewFirstSeen)/1000;
    const transitionWaitSeconds=(Date.now()-waitStarted)/1000;
    assert(observedSeconds>=17&&observedSeconds<=25,"Premium expiry timing is outside bounded 20-second tolerance",{viewport:name,observedSeconds,transitionWaitSeconds});

    assert((await teaser.count())===0||!(await teaser.isVisible().catch(()=>false)),"Teaser remains visible after expiry",{viewport:name});
    assert(await paywall.isVisible(),"Inline paywall absent after expiry",{viewport:name});
    const prompt=page.locator('[data-testid="premium-subscription-prompt"]');
    await prompt.waitFor({state:"visible",timeout:7000});
    const promptEvidence=await promptSnapshot(page,name);
    const promptOpenCount=await page.evaluate(()=>window.__htPromptOpenCount||0);
    assert(promptOpenCount===1,"UI-03 prompt did not open exactly once",{viewport:name,promptOpenCount});
    const overflowBefore=await overflow(page);
    assert(overflowBefore.pass,"Premium prompt journey has horizontal overflow",{viewport:name,overflowBefore});

    const automaticCommerce=d.requests.filter(x=>isCommerceRequest(x.url));
    const wpContent=d.requests.filter(x=>isWordPressContentRequest(x.url));
    const protectedReq=d.requests.filter(x=>isProtectedRequest(x.url));
    assert(wpContent.length===0,"Premium journey made WordPress content-field request",{viewport:name,requests:wpContent});
    assert(protectedReq.length===0,"Premium journey made protected article/body request",{viewport:name,requests:protectedReq});
    assert(automaticCommerce.length===0,"Opening Premium prompt caused automatic commerce request",{viewport:name,requests:automaticCommerce});

    const afterExpiryShot="premium/"+name+"-post-expiry-prompt.png";
    await page.screenshot({path:path.join(ROOT,afterExpiryShot),fullPage:false});
    await dismissPrompt(page,view.dismiss);
    assert(await paywall.isVisible(),"Inline paywall disappeared when prompt was dismissed",{viewport:name,method:view.dismiss});

    let reload={tested:false};
    if(name==="mobile"){
      await page.reload({waitUntil:"domcontentloaded",timeout:TIMEOUT});
      await waitArticleResolved(page);
      await page.waitForTimeout(1500);
      const teaserAfterReload=await page.locator('[data-testid="premium-teaser-paragraph"]').isVisible().catch(()=>false);
      const paywallAfterReload=await page.getByLabel("HealthTimes Premium article paywall").isVisible().catch(()=>false);
      const promptAfterReload=await page.locator('[data-testid="premium-subscription-prompt"]').isVisible().catch(()=>false);
      assert(!teaserAfterReload,"Reload restarted Premium teaser",{viewport:name});
      assert(paywallAfterReload,"Reload did not preserve locked inline paywall",{viewport:name});
      assert(!promptAfterReload,"Reload reopened one-shot Premium prompt",{viewport:name});
      reload={tested:true,teaser_restarted:teaserAfterReload,paywall_visible:paywallAfterReload,prompt_reopened:promptAfterReload};
    }

    const runtime=runtimeCounts(d);
    assert(runtime.React_418_count===0,"React #418 observed in Premium journey",{viewport:name,runtime});
    assert(runtime.pageerror_count===0,"Page error observed in Premium journey",{viewport:name,pageErrors:d.pageErrors});
    const sw=await serviceWorker(page);
    assert(sw.registered&&sw.state==="active","Service worker not active during Premium journey",{viewport:name,sw});

    const result={
      viewport:name,width:view.width,height:view.height,http_status:response.status(),
      premium_classification:true,teaser_paragraph_count:teaserCount,teaser_text_length:teaserText.length,
      projection:{source_id:projection.source_id,access_policy:projection.access_policy??null,body_html:projection.body_html,premium_teaser_html_present:Boolean(projection.premium_teaser_html)},
      timer:{configured_seconds:20,initial_remaining:initialRemaining,observed_seconds:Math.round(observedSeconds*10)/10},
      pre_expiry:{preview_visible:true,paywall_visible:false},
      post_expiry:{teaser_visible:false,paywall_visible:true,prompt_visible:true},
      popup_open_count:promptOpenCount,dismissal:view.dismiss,dismissal_worked:true,inline_paywall_remains:true,reload,
      network:{wordpress_content_requests:wpContent.length,protected_requests:protectedReq.length,automatic_commerce_requests:automaticCommerce.length},
      prompt:promptEvidence,dark_mode:true,overflow:overflowBefore,service_worker:sw,...runtime,
      screenshots:{pre_expiry:preExpiryShot,post_expiry:afterExpiryShot}
    };
    results.premium.push(result);
    write("premium/"+name+".json",result);
    return result;
  }finally{
    await context.close();
  }
}
async function fijiJourney(browser,name,view){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1});
  const page=await context.newPage();
  const d=makeDiag(page,"fiji-"+name);
  try{
    const response=await page.goto(BASE+FIJI_ROUTE+"?ui06=fiji-"+name+"-"+Date.now(),{waitUntil:"domcontentloaded",timeout:TIMEOUT});
    assert(response&&response.status()<400,"Fiji public route HTTP failure",{viewport:name,status:response?.status()});
    await waitArticleResolved(page);
    await page.waitForTimeout(650);
    const projection=await projectionForSource(d,33149);
    const preview=await page.locator('[data-testid="premium-preview-notice"]').isVisible().catch(()=>false);
    const teaser=await page.locator('[data-testid="premium-teaser-paragraph"]').isVisible().catch(()=>false);
    const paywall=await page.getByLabel("HealthTimes Premium article paywall").isVisible().catch(()=>false);
    const popup=await page.locator('[data-testid="premium-subscription-prompt"]').isVisible().catch(()=>false);
    const premiumBadge=await page.getByText("PREMIUM",{exact:true}).first().isVisible().catch(()=>false);
    assert(!preview&&!teaser&&!paywall&&!popup&&!premiumBadge,"Fiji source-parity public story was promoted into Premium",{viewport:name,preview,teaser,paywall,popup,premiumBadge,projection});
    const bodyText=clean(await page.locator("body").innerText());
    assert(bodyText.length>700,"Fiji public body did not render normally",{viewport:name,body_length:bodyText.length});
    const wpContent=d.requests.filter(x=>isWordPressContentRequest(x.url));
    assert(wpContent.length>=1,"Fiji public route did not perform expected public WordPress detail request",{viewport:name});
    const runtime=runtimeCounts(d);
    assert(runtime.React_418_count===0,"React #418 observed on Fiji public article",{viewport:name,runtime});
    assert(runtime.pageerror_count===0,"Page error observed on Fiji public article",{viewport:name,pageErrors:d.pageErrors});
    const ov=await overflow(page);
    assert(ov.pass,"Fiji public article has horizontal overflow",{viewport:name,ov});
    const shot="fiji/"+name+"-public.png";
    await page.screenshot({path:path.join(ROOT,shot),fullPage:false});
    const result={
      viewport:name,width:view.width,height:view.height,http_status:response.status(),source_parity_classification:"public",
      bounded_projection_access_policy:projection?.access_policy??null,
      premium_preview:false,premium_paywall:false,premium_popup:false,premium_badge:false,
      public_body_rendered:true,body_text_length:bodyText.length,wordpress_content_requests:wpContent.length,
      overflow:ov,...runtime,screenshot:shot
    };
    results.fiji.push(result);
    write("fiji/"+name+".json",result);
    return result;
  }finally{
    await context.close();
  }
}
async function shellSmoke(browser){
  const routes=[
    ["/","Home"],["/explore","Explore"],["/search","Search"],["/live","Live"],["/watch","Watch"],
    ["/my","My HealthTimes"],["/premium","Premium"],["/appearance","Appearance"],["/account-access","Account Access"]
  ];
  for(const [route,label] of routes){
    const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const page=await context.newPage();
    const d=makeDiag(page,"shell-"+label);
    try{
      const response=await page.goto(BASE+route+"?ui06=shell-"+Date.now(),{waitUntil:"domcontentloaded",timeout:TIMEOUT});
      assert(response&&response.status()<400,"Shell route failed",{route,status:response?.status()});
      if(route==="/"){
        await page.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout:TIMEOUT});
        await page.waitForFunction(()=>!document.body.innerText.includes("Loading Home…"),null,{timeout:TIMEOUT});
        const heroLinks=page.locator('[role="link"]');
        assert(await heroLinks.count()>0,"Home Hero/lead content did not resolve",{route});
      }
      await page.waitForTimeout(250);
      const runtime=runtimeCounts(d);
      assert(runtime.React_418_count===0,"React #418 observed in shell smoke",{route,runtime});
      assert(runtime.pageerror_count===0,"Page error observed in shell smoke",{route,pageErrors:d.pageErrors});
      const ov=await overflow(page);
      assert(ov.pass,"Shell route has horizontal overflow",{route,ov});
      const result={route,label,http_status:response.status(),horizontal_overflow:!ov.pass,...runtime};
      if(route==="/"){
        await page.reload({waitUntil:"domcontentloaded",timeout:TIMEOUT});
        await page.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout:TIMEOUT});
        const sw=await serviceWorker(page);
        assert(sw.registered&&sw.state==="active","Home service worker is not active",{sw});
        assert(sw.controlling,"Home service worker is not controlling after reload",{sw});
        result.service_worker=sw;
        result.hero_resolved=true;
      }
      if(route==="/watch"&&(d.failed.length||d.responses.some(x=>x.status>=400))){
        finding("P3","watch-media","Known Watch media/resource debt observed separately",{
          failed:d.failed,
          http_errors:d.responses.filter(x=>x.status>=400)
        });
      }
      results.shell.push(result);
    }finally{
      await context.close();
    }
  }
}
async function finish(){
  const allPremium=results.premium;
  const networkTotals={
    wordpress_content_requests:allPremium.reduce((n,x)=>n+x.network.wordpress_content_requests,0),
    protected_requests:allPremium.reduce((n,x)=>n+x.network.protected_requests,0),
    automatic_commerce_requests:allPremium.reduce((n,x)=>n+x.network.automatic_commerce_requests,0)
  };
  const manifest={
    certification_tooling_sha:TOOLING,deployed_wrapper_sha:WRAPPER,accepted_executable_sha:EXECUTABLE,
    build_info:buildInfo,public_url:BASE,workflow_run_id:RUN_ID,captured_at:stamp(),
    browser:"chromium",browser_version:browserVersion,playwright_version:playwrightVersion,node_version:process.version,
    runner:process.env.RUNNER_NAME||"github-actions",os:os.platform()+" "+os.release(),device_scale_factor:1,
    results,network_totals:networkTotals,findings,first_blocker:firstBlocker
  };
  write("manifest.json",manifest);
  const summary=[
    "# UI-INT-02 Live Premium Journey Certification","",
    "- Tooling SHA: "+TOOLING,
    "- Deployed wrapper: "+WRAPPER,
    "- Accepted executable: "+EXECUTABLE,
    "- Browser: Chromium "+browserVersion,
    "- Run ID: "+RUN_ID,"",
    "## Premium 33190",
    ...allPremium.map(x=>"- "+x.viewport+": teaser="+x.teaser_paragraph_count+", timer="+x.timer.observed_seconds+"s, popup="+x.popup_open_count+", dismiss="+x.dismissal+", reload="+(x.reload.tested?JSON.stringify(x.reload):"n/a")),"",
    "## Network",
    "- WordPress content-field requests for Premium: "+networkTotals.wordpress_content_requests,
    "- Protected article/body requests: "+networkTotals.protected_requests,
    "- Automatic commerce requests: "+networkTotals.automatic_commerce_requests,"",
    "## Fiji 33149",
    ...results.fiji.map(x=>"- "+x.viewport+": classification="+x.source_parity_classification+", projection="+String(x.bounded_projection_access_policy)+", premium UI absent="+String(!x.premium_preview&&!x.premium_paywall&&!x.premium_popup)),"",
    "## Runtime",
    "- React #418: "+[...results.premium,...results.fiji,...results.shell].reduce((n,x)=>n+(x.React_418_count||0),0),
    "- Page errors: "+[...results.premium,...results.fiji,...results.shell].reduce((n,x)=>n+(x.pageerror_count||0),0),"",
    "## Findings",
    ...(findings.length?findings.map(x=>"- "+x.severity+" / "+x.category+": "+x.message):["- None."]),"",
    "## Disposition",
    firstBlocker?"UI-INT-02 LIVE CERTIFICATION BLOCKED — "+firstBlocker.message:"UI-INT-02 LIVE CERTIFICATION PASSED — EVIDENCE READY FOR MODERATOR REVIEW",
    ""
  ].join("\n");
  write("summary.md",summary);
  const receipt={
    build_info:manifest.build_info,
    premium:allPremium.map(x=>({
      viewport:x.viewport,
      http_status:x.http_status,
      teaser_paragraph_count:x.teaser_paragraph_count,
      body_html:x.projection.body_html,
      projection_access_policy:x.projection.access_policy,
      initial_remaining:x.timer.initial_remaining,
      observed_seconds:x.timer.observed_seconds,
      pre_expiry:x.pre_expiry,
      post_expiry:x.post_expiry,
      popup_open_count:x.popup_open_count,
      dismissal:x.dismissal,
      dismissal_worked:x.dismissal_worked,
      inline_paywall_remains:x.inline_paywall_remains,
      reload:x.reload,
      network:x.network,
      dark_mode:x.dark_mode,
      overflow_pixels:x.overflow.overflow_pixels,
      prompt:x.prompt,
      React_418_count:x.React_418_count,
      pageerror_count:x.pageerror_count
    })),
    network_totals:manifest.network_totals,
    fiji:results.fiji.map(x=>({
      viewport:x.viewport,
      http_status:x.http_status,
      classification:x.source_parity_classification,
      projection_access_policy:x.bounded_projection_access_policy,
      premium_preview:x.premium_preview,
      premium_paywall:x.premium_paywall,
      premium_popup:x.premium_popup,
      public_body_rendered:x.public_body_rendered,
      wordpress_content_requests:x.wordpress_content_requests,
      React_418_count:x.React_418_count,
      pageerror_count:x.pageerror_count
    })),
    shell:results.shell,
    findings:manifest.findings
  };
  console.log("UI_INT02_EVIDENCE="+JSON.stringify(receipt));
  return manifest;
}
async function main(){
  await identity();
  const browser=await chromium.launch({headless:true});
  browserVersion=browser.version();
  try{
    for(const [name,view] of Object.entries(VIEWS)) await premiumJourney(browser,name,view);
    for(const [name,view] of Object.entries(VIEWS)) await fijiJourney(browser,name,view);
    await shellSmoke(browser);
  }catch(error){
    if(!firstBlocker) firstBlocker={message:error.message||String(error),stack:error.stack||null};
  }finally{
    await browser.close();
  }
  const manifest=await finish();
  if(manifest.first_blocker){
    console.error("UI-INT-02 LIVE CERTIFICATION BLOCKED — "+manifest.first_blocker.message);
    process.exitCode=1;
  }else{
    console.log("UI-INT-02 LIVE CERTIFICATION PASSED — CLEAN INTEGRATION CANDIDATE LIVE JOURNEY EVIDENCE COMPLETE");
  }
}
await main();
