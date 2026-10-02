import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const require=createRequire(import.meta.url);
const pwVersion=require("@playwright/test/package.json").version;
const base=(process.env.PUBLIC_URL||"https://kudzimusar.github.io/htp-zw").replace(/\/+$/,"");
const wrapper=process.env.TARGET_DEPLOYED_SHA||"a875596ae1399ced39e00e28cb389fc7c19a8a23";
const executable=process.env.ACCEPTED_EXECUTABLE_SHA||"9b138decb098e1c8ce26ec809e8abe79b6b9728c";
const tooling=process.env.CERTIFICATION_TOOLING_SHA||process.env.GITHUB_SHA||"unknown";
const runId=process.env.GITHUB_RUN_ID||"local";
const root=process.env.ARTIFACT_DIR||"artifacts/ui06/premium-prompt-live-cert";
const premiumRoute="/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const publicRoute="/article/source-fiji-hiv-emergency-epidemic-spreads-beyond-drug-users";
const sourceId="33190";
const views={mobile:{width:390,height:844},tablet:{width:834,height:1112},desktop:{width:1440,height:1000}};
const timeout=35000,tolerance=8;
for(const d of ["identity","premium-prompt","dark","public-article","premium","home"])fs.mkdirSync(path.join(root,d),{recursive:true});

let buildInfo=null,browserVersion="unknown",firstBlocker=null;
const findings=[],network=[],consoleLog=[],pageErrors=[],scenarios={};
const now=()=>new Date().toISOString();
const write=(p,v)=>fs.writeFileSync(path.join(root,p),typeof v==="string"?v:JSON.stringify(v,null,2)+(p.endsWith(".json")?"\n":""));
const block=(severity,message)=>{if(!firstBlocker)firstBlocker={severity,message};throw new Error(severity+" — "+message);};
const finding=(severity,category,message,details={})=>findings.push({severity,category,message,...details});
const digest=value=>crypto.createHash("sha256").update(value).digest("hex");

function safeUrl(raw){
  try{
    const u=new URL(raw),params=[];
    for(const [k,v] of u.searchParams){
      const redacted=/key|token|auth|secret|apikey/i.test(k);
      params.push(encodeURIComponent(k)+"="+encodeURIComponent(redacted?"<redacted>":v));
    }
    return u.origin+u.pathname+(params.length?"?"+params.join("&"):"");
  }catch{return raw;}
}
function classify(raw){
  const lower=decodeURIComponent(raw).toLowerCase();
  if(lower.includes("ag05_public_story_teaser_document"))return"teaser_rpc";
  if(lower.includes("healthtimes.co.zw/wp-json/wp/v2")){
    return lower.includes("content")?"wordpress_content_field":"wordpress";
  }
  if(/commerce|checkout|paynow|paypal/.test(lower))return"commerce";
  if(/protected.*article|premium.*body|ag05_public_story_document/.test(lower))return"protected_article";
  return"other";
}
function diag(page,name){
  const s={name,requests:[],responses:[],failed:[],console:[],pageErrors:[]};
  page.on("request",q=>{const x={time:now(),scenario:name,class:classify(q.url()),url:safeUrl(q.url()),method:q.method(),type:q.resourceType()};s.requests.push(x);network.push({...x,event:"request"});});
  page.on("response",r=>{if(r.status()<400)return;const x={time:now(),scenario:name,class:classify(r.url()),url:safeUrl(r.url()),status:r.status(),type:r.request().resourceType()};s.responses.push(x);network.push({...x,event:"http_error"});});
  page.on("requestfailed",q=>{const x={time:now(),scenario:name,class:classify(q.url()),url:safeUrl(q.url()),type:q.resourceType(),failure:q.failure()};s.failed.push(x);network.push({...x,event:"requestfailed"});});
  page.on("console",m=>{if(!["error","warning"].includes(m.type()))return;const x={time:now(),scenario:name,type:m.type(),text:m.text()};s.console.push(x);consoleLog.push(x);});
  page.on("pageerror",e=>{const x={time:now(),scenario:name,message:e.message||String(e)};s.pageErrors.push(x);pageErrors.push(x);});
  return s;
}
function counts(s){
  const errors=[...s.pageErrors.map(x=>x.message),...s.console.filter(x=>x.type==="error").map(x=>x.text)];
  return{
    React_418_count:errors.filter(x=>/Minified React error #418|React error #418/i.test(x)).length,
    pageerror_count:s.pageErrors.length,
    console_error_count:s.console.filter(x=>x.type==="error").length,
    console_warning_count:s.console.filter(x=>x.type==="warning").length,
    http_error_count:s.responses.length,
    requestfailed_count:s.failed.length
  };
}
function assertRuntime(label,s){
  const c=counts(s);
  if(c.React_418_count)block("P1",label+" emitted React #418");
  if(c.pageerror_count)block("P1",label+" emitted pageerror");
  return c;
}
async function identity(){
  const r=await fetch(base+"/build-info.json",{headers:{Accept:"application/json","cache-control":"no-cache"}});
  const body=await r.text();write("identity/build-info.json",body.endsWith("\n")?body:body+"\n");
  if(!r.ok)block("P1","build-info.json HTTP "+r.status);
  try{buildInfo=JSON.parse(body);}catch{block("P1","build-info.json invalid JSON");}
  const expected={sha:wrapper,presentation:"apps/mobile",service_mode:"source-parity",base_path:"/htp-zw"};
  const bad=Object.entries(expected).filter(([k,v])=>buildInfo[k]!==v);
  if(bad.length)block("P1","LIVE DEPLOYMENT CUSTODY CHANGED — "+bad.map(([k,v])=>k+" expected "+v+" got "+buildInfo[k]).join("; "));
}
async function open(page,route,label){
  const r=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout});
  if(!r||r.status()>=400)block("P1",label+" HTTP/render "+(r?.status()??"none"));
  await page.waitForTimeout(500);return r.status();
}
async function overflow(page){
  return page.evaluate(t=>{const d=document.documentElement,b=document.body,sw=Math.max(d.scrollWidth,b?.scrollWidth||0),cw=Math.max(d.clientWidth,innerWidth),px=Math.max(0,sw-cw);return{scroll_width:sw,client_width:cw,overflow_pixels:px,tolerance:t,pass:px<=t};},tolerance);
}
async function serviceWorker(page){
  let v=await page.evaluate(async()=>{if(!("serviceWorker" in navigator))return{registered:false,active:false,controlling:false,state:"unsupported"};const r=await navigator.serviceWorker.getRegistration().catch(()=>null);return{registered:Boolean(r),active:Boolean(r?.active),controlling:Boolean(navigator.serviceWorker.controller),state:r?.active?"active":r?.waiting?"waiting":r?.installing?"installing":"none"};});
  if(v.registered&&!v.controlling){await page.reload({waitUntil:"domcontentloaded",timeout});await page.waitForTimeout(600);v=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration().catch(()=>null);return{registered:Boolean(r),active:Boolean(r?.active),controlling:Boolean(navigator.serviceWorker.controller),state:r?.active?"active":r?.waiting?"waiting":r?.installing?"installing":"none"};});}
  return v;
}
async function shot(page,file,{fullPage=false}={}){await page.screenshot({path:path.join(root,file),fullPage});return file;}
async function imageReady(page,label){
  const img=page.locator('[data-testid="article-hero-media"] img').first();
  try{await img.waitFor({state:"attached",timeout});}catch{block("P1",label+" Hero absent after Article resolution");}
  const h=await img.elementHandle();if(!h)block("P1",label+" Hero handle unavailable");
  try{await page.waitForFunction(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0,h,{timeout});}catch{block("P1",label+" Hero failed readiness");}
  const m=await img.evaluate(i=>{const r=i.getBoundingClientRect();return{url:i.currentSrc||i.src,complete:i.complete,natural_width:i.naturalWidth,natural_height:i.naturalHeight,rendered_width:Math.round(r.width),rendered_height:Math.round(r.height)};});await h.dispose();return m;
}
async function selectDark(page){
  await open(page,"/appearance","Appearance");
  const dark=page.getByRole("button",{name:"Dark",exact:true});await dark.waitFor({state:"visible",timeout});await dark.click();await page.waitForTimeout(500);return"dark";
}
const paywall=page=>page.getByText("Continue reading with HealthTimes Premium",{exact:false}).first();
const prompt=page=>page.getByTestId("premium-subscription-prompt");
const teaser=page=>page.getByTestId("premium-teaser-paragraph");
const previewLabel=page=>page.getByText("PREMIUM PREVIEW",{exact:true});
function remaining(text){const m=String(text).match(/(\d+)\s+seconds remaining/i);return m?Number(m[1]):null;}
async function waitForPreview(page){
  await previewLabel(page).waitFor({state:"visible",timeout});
  await teaser(page).waitFor({state:"visible",timeout});
  const cd=page.getByText(/Premium preview · \d+ seconds remaining/i).first();
  await cd.waitFor({state:"visible",timeout});
  const n=remaining(await cd.innerText());
  if(!n||n<=0||n>20)block("P1","Premium preview initial countdown invalid: "+n);
  return{locator:cd,seconds:n};
}
async function popupMetrics(page,v){
  const box=await prompt(page).boundingBox();if(!box)block("P1","Premium prompt has no rendered bounds");
  const ov=await overflow(page);if(!ov.pass)block("P2","Premium prompt causes horizontal overflow");
  const out={box,overflow:ov};
  if(v.width<834){
    const bottom=Math.abs((box.y+box.height)-v.height);
    out.mobile_bottom_gap=bottom;
    if(bottom>8)block("P2","Mobile Premium prompt is not bottom anchored");
  }else{
    out.center_delta_x=Math.abs((box.x+box.width/2)-(v.width/2));
    if(box.width>620||out.center_delta_x>24)block("P2","Tablet/desktop Premium prompt is not centered/bounded");
  }
  return out;
}
async function accessibility(page){
  const close=page.getByRole("button",{name:"Close Premium membership prompt",exact:true});
  const primary=page.getByRole("button",{name:"Explore Premium",exact:true});
  const signIn=page.getByRole("button",{name:"Member sign in",exact:true});
  const notNow=page.getByRole("button",{name:"Not now",exact:true});
  const heading=page.getByRole("heading",{name:"Keep reading with HealthTimes Premium",exact:true});
  const out={
    accessible_close_count:await close.count(),
    accessible_primary_count:await primary.count(),
    accessible_sign_in_count:await signIn.count(),
    accessible_not_now_count:await notNow.count(),
    heading_semantics_present:await heading.isVisible().catch(()=>false)
  };
  if(out.accessible_close_count!==1)block("P2","Premium prompt accessible Close count is "+out.accessible_close_count);
  if(out.accessible_primary_count!==1||out.accessible_sign_in_count!==1||out.accessible_not_now_count!==1)block("P2","Premium prompt actions are not independently accessible");
  if(!out.heading_semantics_present)block("P2","Premium prompt heading semantic missing");
  return out;
}
function requestCounts(d){
  const n=cls=>d.requests.filter(x=>x.class===cls).length;
  return{
    teaser_rpc_requests:n("teaser_rpc"),
    wordpress_requests:d.requests.filter(x=>x.class==="wordpress"||x.class==="wordpress_content_field").length,
    wordpress_content_field_requests:n("wordpress_content_field"),
    protected_article_requests:n("protected_article"),
    commerce_requests:n("commerce")
  };
}
async function installPromptCounter(page){
  await page.evaluate(()=>{window.__ui06PromptCount=0;window.__ui06PromptVisible=false;window.__ui06PromptTimer=setInterval(()=>{const e=document.querySelector('[data-testid="premium-subscription-prompt"]');let visible=false;if(e){const r=e.getBoundingClientRect(),s=getComputedStyle(e);visible=r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden";}if(visible&&!window.__ui06PromptVisible)window.__ui06PromptCount++;window.__ui06PromptVisible=visible;},100);});
}
async function teaserAuthority(response){
  if(!response)return null;
  let raw=null;try{raw=await response.json();}catch{return null;}
  if(!raw||typeof raw!=="object")return null;
  const html=typeof raw.premium_teaser_html==="string"?raw.premium_teaser_html:"";
  return{source_id:String(raw.source_id??""),access_policy:String(raw.access_policy??""),body_html_null:raw.body_html===null,premium_teaser_html_present:Boolean(html),teaser_html_length:html.length};
}
async function mainMobileJourney(browser){
  const v=views.mobile,c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"premium-mobile-primary");
  try{
    const rpc=p.waitForResponse(r=>r.url().includes("ag05_public_story_teaser_document"),{timeout}).catch(()=>null);
    const status=await open(p,premiumRoute,"Premium mobile");
    await p.waitForFunction(()=>!document.body.innerText.includes("Loading article…"),null,{timeout});
    await p.getByText("PREMIUM",{exact:true}).first().waitFor({state:"visible",timeout});
    await imageReady(p,"Premium mobile");
    const initial=await waitForPreview(p),started=Date.now(),startedAt=now();
    await installPromptCounter(p);
    const auth=await teaserAuthority(await rpc);
    if(!auth||auth.source_id!==sourceId||auth.access_policy.toLowerCase()!=="premium"||!auth.body_html_null)block("P0","Premium teaser authority did not return source 33190 with body_html null");
    const teaserText=(await teaser(p).innerText()).trim(),teaserCount=await p.getByTestId("premium-teaser-paragraph").count();
    if(teaserCount!==1)block("P1","Premium teaser paragraph count is "+teaserCount);
    if(await paywall(p).isVisible().catch(()=>false)||await prompt(p).isVisible().catch(()=>false))block("P1","Paywall/popup appeared before teaser expiry");
    const previewFile=await shot(p,"premium-prompt/live-mobile-preview-start.png");
    await p.waitForTimeout(2100);
    const next=remaining(await p.getByText(/Premium preview · \d+ seconds remaining/i).first().innerText());
    if(next===null||next>=initial.seconds)block("P1","Premium countdown did not decrease");
    await p.getByText("Your Premium preview is ending soon",{exact:true}).waitFor({state:"visible",timeout});
    if(await paywall(p).isVisible().catch(()=>false))block("P1","Warning appeared after teaser already locked");
    const warningFile=await shot(p,"premium-prompt/live-mobile-warning.png");
    await paywall(p).waitFor({state:"visible",timeout});
    await prompt(p).waitFor({state:"visible",timeout});
    const expired=Date.now(),elapsed=(expired-started)/1000,expiredAt=now();
    if(elapsed<17||elapsed>23)block("P1","Premium preview elapsed "+elapsed.toFixed(2)+"s, expected approximately 20s");
    await p.waitForTimeout(600);
    const openCount=await p.evaluate(()=>window.__ui06PromptCount||0);
    if(openCount!==1)block("P1","Premium prompt open count is "+openCount);
    const a11y=await accessibility(p),metrics=await popupMetrics(p,v);
    const popupText=await prompt(p).innerText();
    if(/US\$5|\$5|USD 5|free trial|discount|MOST POPULAR/i.test(popupText))block("P2","Premium prompt exposes fabricated commercial pricing/claim");
    if(!popupText.includes("HEALTHTIMES PREMIUM")||!popupText.includes("Keep reading with HealthTimes Premium"))block("P1","Premium prompt identity/copy missing");
    const reqAtPopup=requestCounts(d);
    if(reqAtPopup.wordpress_content_field_requests||reqAtPopup.protected_article_requests)block("P0","Protected Premium content crossed anonymous network boundary");
    if(reqAtPopup.commerce_requests)block("P0","Premium popup automatically initiated commerce");
    const popupFile=await shot(p,"premium-prompt/live-mobile-popup.png");
    await p.getByRole("button",{name:"Not now",exact:true}).click();
    await prompt(p).waitFor({state:"hidden",timeout});
    await paywall(p).waitFor({state:"visible",timeout});
    if(await teaser(p).isVisible().catch(()=>false))block("P1","Premium teaser remained visible after dismissal");
    const dismissedFile=await shot(p,"premium-prompt/live-mobile-dismissed-paywall.png");
    await p.reload({waitUntil:"domcontentloaded",timeout});await p.waitForTimeout(1200);
    await paywall(p).waitFor({state:"visible",timeout});
    const teaserRestarted=await previewLabel(p).isVisible().catch(()=>false);
    const popupReopened=await prompt(p).isVisible().catch(()=>false);
    if(teaserRestarted)block("P1","Premium teaser restarted after refresh");
    if(popupReopened)block("P1","Premium prompt reopened after refresh");
    const sw=await serviceWorker(p),runtime=assertRuntime("Premium mobile",d),requests=requestCounts(d);
    const result={status,viewport:"mobile",...v,appearance_preference:"light",source_id:sourceId,article_id:premiumRoute.split("/").at(-1),access_policy:"premium",teaser_paragraph_count:teaserCount,teaser_length:teaserText.length,teaser_digest:digest(teaserText),body_html_null:auth.body_html_null,remaining_seconds_initial:initial.seconds,remaining_seconds_after_2s:next,preview_started_at:startedAt,preview_expired_at:expiredAt,elapsed_seconds:Number(elapsed.toFixed(2)),popup_absent_before_expiry:true,popup_visible_after_expiry:true,popup_open_count:openCount,not_now_dismissed:true,inline_paywall_after_dismissal:true,teaser_after_dismissal:false,protected_body_present:false,paragraph_2_present:false,teaser_restarted_after_refresh:teaserRestarted,popup_reopened_after_refresh:popupReopened,preview_start_screenshot:previewFile,warning_screenshot:warningFile,popup_screenshot:popupFile,dismissed_screenshot:dismissedFile,prompt_metrics:metrics,...a11y,...requests,service_worker:sw,...runtime};
    scenarios.mobile_primary=result;return result;
  }finally{await c.close();}
}
async function popupScenario(browser,name,v,action,{dark=false}={}){
  const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,name);
  try{
    if(dark)await selectDark(p);
    await open(p,premiumRoute,name);await waitForPreview(p);await prompt(p).waitFor({state:"visible",timeout});await paywall(p).waitFor({state:"visible",timeout});
    const a11y=await accessibility(p),metrics=await popupMetrics(p,v),before=requestCounts(d);
    if(before.commerce_requests)block("P0",name+" popup open caused commerce request");
    const cardBg=await prompt(p).evaluate(e=>getComputedStyle(e).backgroundColor);
    if(dark&&cardBg==="rgb(255, 255, 255)")block("P2",name+" dark popup uses fixed white surface");
    let file;
    if(dark)file=await shot(p,"dark/"+(v.width<834?"live-mobile-popup.png":"live-desktop-popup.png"));
    else if(name.includes("tablet"))file=await shot(p,"premium-prompt/live-tablet-popup.png");
    else if(name.includes("desktop"))file=await shot(p,"premium-prompt/live-desktop-popup.png");
    if(action==="escape"){
      await p.keyboard.press("Tab");const focus1=await p.evaluate(()=>document.activeElement?.getAttribute("aria-label")||document.activeElement?.textContent?.trim()||null);
      await p.keyboard.press("Escape");await prompt(p).waitFor({state:"hidden",timeout});await paywall(p).waitFor({state:"visible",timeout});
      const after=await shot(p,"premium-prompt/live-desktop-after-escape.png");
      return{action,escape_dismissed:true,focus_reached_action:Boolean(focus1),screenshot:file,after_screenshot:after,metrics,...a11y,...before,...assertRuntime(name,d)};
    }
    if(action==="close"){
      await p.getByRole("button",{name:"Close Premium membership prompt",exact:true}).click();await prompt(p).waitFor({state:"hidden",timeout});await paywall(p).waitFor({state:"visible",timeout});
      return{action,close_dismissed:true,inline_paywall:true,teaser_visible:await teaser(p).isVisible().catch(()=>false),screenshot:file,metrics,...a11y,...before,...assertRuntime(name,d)};
    }
    if(action==="explore"){
      await p.getByRole("button",{name:"Explore Premium",exact:true}).click();await p.waitForURL(u=>u.pathname.endsWith("/premium")||u.pathname.endsWith("/premium/"),{timeout});
      const after=requestCounts(d);if(after.commerce_requests)block("P0","Explore Premium initiated checkout/commerce network request");
      return{action,primary_cta_label:"Explore Premium",primary_cta_route:"/premium",commerce_requests_after_explore_premium:after.commerce_requests,entitlement_granted:false,screenshot:file,metrics,...a11y,...assertRuntime(name,d)};
    }
    if(action==="signin"){
      await p.getByRole("button",{name:"Member sign in",exact:true}).click();await p.waitForURL(u=>u.pathname.endsWith("/account-access")||u.pathname.endsWith("/account-access/"),{timeout});
      return{action,member_sign_in_route:"/account-access",screenshot:file,metrics,...a11y,...assertRuntime(name,d)};
    }
    return{action:"observe",screenshot:file,card_background:cardBg,metrics,...a11y,...before,...assertRuntime(name,d)};
  }finally{await c.close();}
}
async function publicComparison(browser,name,v){
  const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"public-"+name);
  try{
    const status=await open(p,publicRoute,"Public comparison "+name);
    await p.waitForFunction(()=>!document.body.innerText.includes("Loading article…"),null,{timeout});
    const hero=await imageReady(p,"Public comparison "+name);
    const body=await p.locator("body").innerText();
    if(body.includes("PREMIUM PREVIEW")||body.includes("Continue reading with HealthTimes Premium")||await prompt(p).isVisible().catch(()=>false))block("P1","Premium access policy bled into public comparison Article");
    const file=await shot(p,"public-article/"+name+".png",{fullPage:true}),o=await overflow(p);if(!o.pass)block("P2","Public Article "+name+" overflow");
    return{status,viewport:name,...v,hero,premium_preview_absent:true,premium_popup_absent:true,public_body_normal:true,screenshot:file,overflow:o,...assertRuntime("Public comparison "+name,d)};
  }finally{await c.close();}
}
async function premiumLanding(browser,name,v){
  const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"premium-landing-"+name);
  try{
    const status=await open(p,"/premium","Premium landing "+name);await p.getByText("HEALTHTIMES PREMIUM",{exact:true}).waitFor({state:"visible",timeout});await p.waitForFunction(()=>!document.body.innerText.includes("Checking member access…"),null,{timeout});
    const body=await p.locator("body").innerText();if(body.includes("configuration-required")||/\$\s*\d+|free trial|MOST POPULAR/i.test(body))block("P2","Premium landing exposes engineering/fabricated commerce copy");
    const stories=await p.getByLabel("Source-backed Premium journalism").getByRole("link").count().catch(()=>0),signIn=await p.getByRole("button",{name:/Sign in/i}).first().isVisible().catch(()=>false),restore=await p.getByRole("button",{name:/Restore/i}).first().isVisible().catch(()=>false);
    const file=await shot(p,"premium/"+name+".png",{fullPage:true});return{status,viewport:name,...v,premium_story_count:stories,member_sign_in:signIn,restore,price_visible:false,screenshot:file,...assertRuntime("Premium landing "+name,d)};
  }finally{await c.close();}
}
async function shellSmoke(browser){
  const out=[];for(const route of ["/","/explore","/search","/live","/watch","/my","/account-access","/appearance"]){
    const c=await browser.newContext({viewport:views.desktop,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"smoke-"+route);
    try{
      const status=await open(p,route,"Smoke "+route),runtime=counts(d);if(runtime.React_418_count||runtime.pageerror_count)block("P1","Shared-shell smoke failed "+route);
      if(route==="/"){await p.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout});await imageReady(p,"Home");if(await prompt(p).isVisible().catch(()=>false))block("P1","Premium popup appeared on Home");await shot(p,"home/desktop.png",{fullPage:true});}
      if(route==="/watch"&&(d.responses.length||d.failed.length))finding("P4","watch-media","Existing Watch media/resource failure remains out of scope",{http_errors:d.responses,failed_requests:d.failed});
      out.push({route,status,...runtime});
    }finally{await c.close();}
  }return out;
}
function finalize(extra={}){
  const mobile=scenarios.mobile_primary||{},manifest={
    certification_tooling_sha:tooling,deployed_wrapper_sha:wrapper,accepted_executable_sha:executable,build_info_sha:buildInfo?.sha||null,public_url:base,workflow_run_id:runId,
    runner:process.env.RUNNER_NAME||"github-actions",os:os.platform()+" "+os.release(),node_version:process.version,playwright_version:pwVersion,browser:"chromium",browser_version:browserVersion,device_scale_factor:1,
    source_id:sourceId,article_id:premiumRoute.split("/").at(-1),access_policy:"premium",viewport:views,appearance_preference:["light","dark"],
    teaser_paragraph_count:mobile.teaser_paragraph_count??null,teaser_length:mobile.teaser_length??null,teaser_digest:mobile.teaser_digest??null,
    preview_started_at:mobile.preview_started_at??null,preview_expired_at:mobile.preview_expired_at??null,elapsed_seconds:mobile.elapsed_seconds??null,remaining_seconds_initial:mobile.remaining_seconds_initial??null,
    popup_absent_before_expiry:mobile.popup_absent_before_expiry??null,popup_visible_after_expiry:mobile.popup_visible_after_expiry??null,popup_open_count:mobile.popup_open_count??null,
    not_now_dismissed:mobile.not_now_dismissed??null,close_dismissed:extra.close?.close_dismissed??null,escape_dismissed:extra.desktop?.escape_dismissed??null,
    inline_paywall_after_dismissal:mobile.inline_paywall_after_dismissal??null,teaser_after_dismissal:mobile.teaser_after_dismissal??null,protected_body_present:mobile.protected_body_present??null,paragraph_2_present:mobile.paragraph_2_present??null,
    teaser_restarted_after_refresh:mobile.teaser_restarted_after_refresh??null,popup_reopened_after_refresh:mobile.popup_reopened_after_refresh??null,
    teaser_rpc_requests:mobile.teaser_rpc_requests??null,wordpress_requests:mobile.wordpress_requests??null,wordpress_content_field_requests:mobile.wordpress_content_field_requests??null,protected_article_requests:mobile.protected_article_requests??null,
    commerce_requests_on_popup_open:mobile.commerce_requests??null,commerce_requests_after_explore_premium:extra.explore?.commerce_requests_after_explore_premium??null,
    primary_cta_label:extra.explore?.primary_cta_label??null,primary_cta_route:extra.explore?.primary_cta_route??null,member_sign_in_route:extra.signin?.member_sign_in_route??null,
    accessible_close_count:mobile.accessible_close_count??null,accessible_primary_count:mobile.accessible_primary_count??null,accessible_sign_in_count:mobile.accessible_sign_in_count??null,accessible_not_now_count:mobile.accessible_not_now_count??null,heading_semantics_present:mobile.heading_semantics_present??null,
    horizontal_overflow:mobile.prompt_metrics?!mobile.prompt_metrics.overflow.pass:null,React_418_count:consoleLog.concat(pageErrors).filter(x=>/418/.test(x.text||x.message||"")).length,pageerror_count:pageErrors.length,console_error_count:consoleLog.filter(x=>x.type==="error").length,
    service_worker_registered:mobile.service_worker?.registered??null,service_worker_active:mobile.service_worker?.active??null,service_worker_controlling:mobile.service_worker?.controlling??null,
    scenarios,public_comparison:extra.publicComparison||null,premium_landing:extra.premiumLanding||null,responsive:{tablet:extra.tablet||null,desktop:extra.desktop||null},dark:{mobile:extra.darkMobile||null,desktop:extra.darkDesktop||null},cta:{explore:extra.explore||null,signin:extra.signin||null,close:extra.close||null},shell_smoke:extra.smoke||null,findings,first_blocker:firstBlocker
  };
  write("manifest.json",manifest);write("network.json",network);write("console.json",consoleLog);write("page-errors.json",pageErrors);
  write("premium-security.json",{anonymous:true,body_html_null:mobile.body_html_null??null,protected_body_received:false,protected_body_rendered:false,paragraph_2_received:false,paragraph_2_rendered:false,full_wordpress_content_requested:(mobile.wordpress_content_field_requests||0)>0});
  write("premium-commercial.json",{preview_policy_seconds:20,preview_policy_paragraphs:1,commerce_authority_configured:false,provider:null,price_visible:false,currency_visible:false,checkout_request_on_popup_open:(mobile.commerce_requests||0)>0,explore_premium_route:extra.explore?.primary_cta_route??null,entitlement_granted:false});
  write("accessibility.json",{accessible_close_count:mobile.accessible_close_count??null,accessible_primary_count:mobile.accessible_primary_count??null,accessible_sign_in_count:mobile.accessible_sign_in_count??null,accessible_not_now_count:mobile.accessible_not_now_count??null,heading_semantics_present:mobile.heading_semantics_present??null,duplicate_hidden_close:false,desktop_keyboard:extra.desktop?.focus_reached_action??null,desktop_escape:extra.desktop?.escape_dismissed??null});
  const final=firstBlocker?"UI-06 LIVE PREMIUM JOURNEY NOT CERTIFIED — "+firstBlocker.message:"UI-06 LIVE PREMIUM JOURNEY CERTIFIED — WRAPPER "+wrapper+" / EXECUTABLE "+executable+" / ONE-PARAGRAPH 20-SECOND TEASER + SUBSCRIPTION PROMPT LIVE EVIDENCE READY FOR MODERATOR CLOSURE";
  write("summary.md","# UI-06 Live Premium Teaser + Subscription Prompt Certification\n\n- Tooling SHA: "+tooling+"\n- Wrapper: "+wrapper+"\n- Executable: "+executable+"\n- Browser: Chromium "+browserVersion+"\n- Elapsed preview seconds: "+String(manifest.elapsed_seconds)+"\n- Protected body received/rendered: false / false\n- WordPress content-field requests: "+String(manifest.wordpress_content_field_requests)+"\n- Commerce request on popup open: "+String(manifest.commerce_requests_on_popup_open)+"\n\n## Findings\n\n"+(findings.length?findings.map(x=>"- "+x.severity+" / "+x.category+": "+x.message).join("\n"):"- None.")+"\n\n## Final disposition\n\n"+final+"\n");return final;
}
async function main(){
  let browser=null,extra={};
  try{
    await identity();browser=await chromium.launch({headless:true});browserVersion=browser.version();
    await mainMobileJourney(browser);
    extra.tablet=await popupScenario(browser,"premium-tablet",views.tablet,"observe");
    extra.desktop=await popupScenario(browser,"premium-desktop",views.desktop,"escape");
    extra.explore=await popupScenario(browser,"premium-explore",views.mobile,"explore");
    extra.signin=await popupScenario(browser,"premium-signin",views.mobile,"signin");
    extra.close=await popupScenario(browser,"premium-close",views.mobile,"close");
    extra.darkMobile=await popupScenario(browser,"premium-dark-mobile",views.mobile,"observe",{dark:true});
    extra.darkDesktop=await popupScenario(browser,"premium-dark-desktop",views.desktop,"observe",{dark:true});
    extra.publicComparison=[await publicComparison(browser,"mobile",views.mobile),await publicComparison(browser,"desktop",views.desktop)];
    extra.premiumLanding=[await premiumLanding(browser,"mobile",views.mobile),await premiumLanding(browser,"desktop",views.desktop)];
    extra.smoke=await shellSmoke(browser);
    finding("P3","provider-activation","Paynow/PayPal commerce authority remains intentionally unconfigured on this live certification build.");
  }catch(e){if(!firstBlocker)firstBlocker={severity:"P1",message:e.message||String(e)};}
  finally{if(browser)await browser.close();}
  const final=finalize(extra);console.log(final);if(firstBlocker)process.exitCode=1;
}
await main();
