import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const playwrightVersion=require("@playwright/test/package.json").version;
const base=(process.env.PUBLIC_URL||"https://kudzimusar.github.io/htp-zw").replace(/\/+$/,"");
const wrapper=process.env.TARGET_DEPLOYED_SHA||"8611beb08a9cc43accc9109457ed48901c3daaf1";
const executable=process.env.ACCEPTED_EXECUTABLE_SHA||"6cbfcaa9ee6c06e25f59c99eb21bf86211990605";
const tooling=process.env.CERTIFICATION_TOOLING_SHA||process.env.GITHUB_SHA||"unknown";
const runId=process.env.GITHUB_RUN_ID||"local";
const root=process.env.ARTIFACT_DIR||"artifacts/ui06/ui03-phase2-live-cert";
const publicId="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const premiumId="source-us-embassy-challenges-zimbabwe-rejected-health-mou";
const views={mobile:{width:390,height:844},tablet:{width:834,height:1112},desktop:{width:1440,height:1000}};
const timeout=30000,tolerance=8;
for(const d of ["identity","article","premium-article","premium","dark","advertising","home"]) fs.mkdirSync(path.join(root,d),{recursive:true});

let buildInfo=null,browserVersion="unknown",firstBlocker=null;
const results=[],findings=[],consoleLog=[],pageErrors=[],network=[];
const stamp=()=>new Date().toISOString();
const write=(p,v)=>fs.writeFileSync(path.join(root,p),typeof v==="string"?v:JSON.stringify(v,null,2)+(p.endsWith(".json")?"\n":""));
const block=(severity,message)=>{if(!firstBlocker)firstBlocker={severity,message};throw new Error(severity+" — "+message);};
const finding=(severity,category,message,details={})=>findings.push({severity,category,message,...details});

async function identity(){
  const r=await fetch(base+"/build-info.json",{headers:{"cache-control":"no-cache","accept":"application/json"}});
  const body=await r.text();write("identity/build-info.json",body.endsWith("\n")?body:body+"\n");
  if(!r.ok) block("P1","build-info.json HTTP "+r.status);
  try{buildInfo=JSON.parse(body);}catch{block("P1","build-info.json invalid JSON");}
  const expected={sha:wrapper,presentation:"apps/mobile",service_mode:"source-parity",base_path:"/htp-zw"};
  const bad=Object.entries(expected).filter(([k,v])=>buildInfo[k]!==v);
  if(bad.length) block("P1","DEPLOYMENT CUSTODY CHANGED — "+bad.map(([k,v])=>k+" expected "+v+" got "+buildInfo[k]).join("; "));
}

function diag(page,surface,viewport){
  const s={surface,viewport,pageErrors:[],console:[],requests:[],httpErrors:[],failed:[]};
  page.on("pageerror",e=>{const x={time:stamp(),surface,viewport,message:e.message||String(e)};s.pageErrors.push(x);pageErrors.push(x);});
  page.on("console",m=>{if(!["error","warning"].includes(m.type()))return;const x={time:stamp(),surface,viewport,type:m.type(),text:m.text()};s.console.push(x);consoleLog.push(x);});
  page.on("request",q=>{const x={time:stamp(),surface,viewport,url:q.url(),method:q.method(),type:q.resourceType()};s.requests.push(x);network.push({...x,event:"request"});});
  page.on("response",r=>{if(r.status()<400)return;const x={time:stamp(),surface,viewport,url:r.url(),status:r.status(),type:r.request().resourceType()};s.httpErrors.push(x);network.push({...x,event:"http_error"});});
  page.on("requestfailed",q=>{const x={time:stamp(),surface,viewport,url:q.url(),type:q.resourceType(),failure:q.failure()};s.failed.push(x);network.push({...x,event:"requestfailed"});});
  return s;
}
function counts(s){
  const text=[...s.pageErrors.map(x=>x.message),...s.console.filter(x=>x.type==="error").map(x=>x.text)];
  return {
    React_418_count:text.filter(x=>/Minified React error #418|React error #418/i.test(x)).length,
    pageerror_count:s.pageErrors.length,
    console_error_count:s.console.filter(x=>x.type==="error").length,
    console_warning_count:s.console.filter(x=>x.type==="warning").length,
    resource_http_error_count:s.httpErrors.length,
    failed_request_count:s.failed.length
  };
}
function assertRuntime(label,s){
  const c=counts(s);
  if(c.React_418_count) block("P1",label+" emitted React #418");
  if(c.pageerror_count) block("P1",label+" emitted pageerror");
  const actionable=s.console.filter(x=>x.type==="error"&&!/Failed to load resource/i.test(x.text));
  if(actionable.length) block("P1",label+" emitted console error: "+actionable.map(x=>x.text).join(" | "));
  return c;
}
async function open(page,route,label){
  const r=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout});
  if(!r||r.status()>=400) block("P1",label+" HTTP/render "+(r?.status()??"none"));
  await page.waitForTimeout(900);return r.status();
}
async function ov(page){
  return page.evaluate(t=>{
    const d=document.documentElement,b=document.body;
    const sw=Math.max(d.scrollWidth,b?.scrollWidth||0),cw=Math.max(d.clientWidth,innerWidth),px=Math.max(0,sw-cw);
    return {scroll_width:sw,client_width:cw,overflow_pixels:px,tolerance:t,pass:px<=t};
  },tolerance);
}
async function shot(page,file){await page.screenshot({path:path.join(root,file),fullPage:true});return file;}
async function sw(page){
  let v=await page.evaluate(async()=>{
    if(!("serviceWorker" in navigator))return{registered:false,controlling:false,state:"unsupported"};
    const r=await navigator.serviceWorker.getRegistration().catch(()=>null);
    return{registered:Boolean(r),controlling:Boolean(navigator.serviceWorker.controller),state:r?.active?"active":r?.waiting?"waiting":r?.installing?"installing":"none"};
  });
  if(v.registered&&!v.controlling){await page.reload({waitUntil:"domcontentloaded",timeout});await page.waitForTimeout(500);v=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration().catch(()=>null);return{registered:Boolean(r),controlling:Boolean(navigator.serviceWorker.controller),state:r?.active?"active":r?.waiting?"waiting":r?.installing?"installing":"none"};});}
  return v;
}
async function imageReady(page,wrapperLoc,label){
  const img=wrapperLoc.locator("img").first();
  if(await img.count()<1) block("P1",label+" absent");
  const h=await img.elementHandle();if(!h)block("P1",label+" handle unavailable");
  try{await page.waitForFunction(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0,h,{timeout});}catch{block("P1",label+" not complete");}
  const m=await img.evaluate(i=>({url:i.currentSrc||i.src,complete:i.complete,natural_width:i.naturalWidth,natural_height:i.naturalHeight}));
  const box=await wrapperLoc.boundingBox();await h.dispose();
  const out={...m,rendered_width:Math.round(box?.width||0),rendered_height:Math.round(box?.height||0)};
  if(!out.rendered_width||!out.rendered_height) block("P1",label+" zero rendered dimensions");
  return out;
}
async function toolbar(page,label){
  const specs={Back:/Back/i,"Text size":/Text size/i,"Save article":/Save article|Save/i,"Listen to article":/Listen to article|Listen/i,"Share article":/Share article|Share/i,Offline:/Download article for offline reading|Offline/i};
  const out={};for(const [k,re] of Object.entries(specs)){out[k]=await page.getByRole("button",{name:re}).first().isVisible().catch(()=>false);if(!out[k])block("P1",label+" missing action "+k);}return out;
}
async function noReaderLeak(page,label){
  const body=(await page.locator("body").innerText()).toLowerCase();
  const bad=["source-parity","fixture story","canonical healthtimes story identity","certified yet","read-only source bridge","runtime media url","migration authority"].filter(x=>body.includes(x));
  if(bad.length)block("P1",label+" reader copy leak: "+bad.join(", "));return true;
}
async function mobileTabsPresent(page){
  return page.evaluate(()=>{
    const wanted=["Home","Explore","Live","Watch"],els=Array.from(document.querySelectorAll('[role="tab"],[role="button"],[role="link"],a'));
    const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden";};
    const names=els.filter(e=>vis(e)&&e.getBoundingClientRect().top>innerHeight-160).map(e=>(e.getAttribute("aria-label")||e.textContent||"").trim());
    return wanted.every(x=>names.includes(x))&&(names.includes("My HT")||names.includes("My HealthTimes"));
  });
}
async function selectDark(page){
  await open(page,"/appearance","Appearance");
  const d=page.getByRole("button",{name:"Dark",exact:true});await d.waitFor({state:"visible",timeout});await d.click();await page.waitForTimeout(450);
  return "dark";
}
async function article(browser,name,v,{dark=false}={}){
  const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,dark?"dark-article":"article",name);
  try{
    if(dark)await selectDark(p);
    const status=await open(p,"/article/"+publicId,(dark?"Dark ":"")+"Article "+name);
    await p.getByRole("button",{name:/Back/i}).waitFor({state:"visible",timeout});
    await p.waitForFunction(()=>!document.body.innerText.includes("Loading article…"),null,{timeout});
    const hero=await imageReady(p,p.locator('[data-testid="article-hero-media"]:visible').first(),"Article Hero "+name);
    const actions=await toolbar(p,"Article "+name);await noReaderLeak(p,"Article "+name);
    let discussionFixedLight=null;if(dark){const x=p.getByText(/Discussion/i).last();if(await x.count()){await x.scrollIntoViewIfNeeded().catch(()=>{});await p.waitForTimeout(250);}discussionFixedLight=await p.evaluate(()=>{const all=Array.from(document.querySelectorAll("*"));const n=all.find(e=>(e.textContent||"").trim().startsWith("Discussion"));if(!n)return false;let cur=n;for(let i=0;i<4&&cur;i++,cur=cur.parentElement){const bg=getComputedStyle(cur).backgroundColor;if(bg==="rgb(255, 255, 255)")return true;}return false;});if(discussionFixedLight)block("P1","Dark Article Discussion fixed-light regression");}
    const overflow=await ov(p);if(!overflow.pass)block("P1","Article "+name+" overflow "+overflow.overflow_pixels+"px");
    if(name==="desktop"&&await mobileTabsPresent(p))block("P1","Desktop Article exposes mobile bottom navigation");
    const runtime=assertRuntime("Article "+name,d),service_worker=await sw(p);
    const file=await shot(p,dark?"dark/article-mobile.png":"article/"+name+"-public.png");
    const r={surface:dark?"dark_article":"public_article",route:"/article/"+publicId,viewport:name,...v,deployed_sha:wrapper,appearance:dark?"dark":"light",loaded_resolved:true,status,screenshot:file,hero,...hero,toolbar:actions,reader_copy_guard:true,discussion_fixed_light:discussionFixedLight,horizontal_overflow:!overflow.pass,overflow,service_worker,...runtime};
    results.push(r);return r;
  }finally{await c.close();}
}
function protectedRequests(d){
  return d.requests.filter(x=>{try{const u=new URL(x.url);return u.pathname.includes("/wp-json/wp/v2/posts")&&decodeURIComponent(u.search).toLowerCase().includes("content");}catch{return false;}});
}
async function premiumArticle(browser,name,v,{dark=false}={}){
  const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,dark?"dark-premium-article":"premium-article",name);
  try{
    if(dark)await selectDark(p);
    const start=Date.now(),status=await open(p,"/article/"+premiumId,(dark?"Dark ":"")+"Premium Article "+name);
    await p.getByRole("button",{name:/Back/i}).waitFor({state:"visible",timeout});
    await p.waitForFunction(()=>!document.body.innerText.includes("Loading article…"),null,{timeout});
    const pay=p.getByText("Continue reading with HealthTimes Premium",{exact:false}).first(),preview=p.getByText("PREMIUM PREVIEW",{exact:true});
    let payVisible=await pay.isVisible().catch(()=>false),previewVisible=await preview.isVisible().catch(()=>false),timer=false,duration=0,state="fail-closed";
    if(!payVisible&&previewVisible){timer=true;state="timed-preview";await shot(p,"premium-article/"+name+"-live-state.png");const t=Date.now();await pay.waitFor({state:"visible",timeout});duration=Math.round((Date.now()-t)/100)/10;payVisible=true;}
    else if(payVisible){await shot(p,"premium-article/"+name+"-live-state.png");}
    else block("P1","Premium Article "+name+" resolved without preview/paywall");
    const body=await p.locator("body").innerText();
    for(const x of ["$4.99","$9.99","20% OFF","7-day trial","free trial","MOST POPULAR"])if(body.toLowerCase().includes(x.toLowerCase()))block("P1","Premium Article "+name+" unverified commercial claim "+x);
    if(!await p.getByRole("button",{name:/Go to HealthTimes Premium|Go Premium/i}).isVisible().catch(()=>false))block("P1","Premium Article "+name+" Go Premium missing");
    if(!await p.getByRole("button",{name:/Sign in as an existing member|Sign in/i}).isVisible().catch(()=>false))block("P1","Premium Article "+name+" member sign-in missing");
    const req=protectedRequests(d);if(req.length)block("P0","Premium anonymous route requested protected content field");
    const domLeak=await p.evaluate(()=>Array.from(document.querySelectorAll("p")).filter(e=>(e.textContent||"").trim().length>350).length>=3).catch(()=>false);
    if(domLeak)block("P0","Premium protected body appears present in anonymous DOM");
    const overflow=await ov(p);if(!overflow.pass)block("P1","Premium Article "+name+" horizontal overflow");
    const runtime=assertRuntime("Premium Article "+name,d),service_worker=await sw(p);
    const file=await shot(p,dark?"dark/premium-paywall-mobile.png":"premium-article/"+name+"-paywall.png");
    const r={surface:"premium_article",route:"/article/"+premiumId,viewport:name,...v,deployed_sha:wrapper,appearance:dark?"dark":"light",anonymous:true,entitlement_state:false,premium_state:"locked",loaded_resolved:true,status,screenshot:file,preview_timer_active:timer,preview_duration_observed:duration,preview_configuration_state:state,paywall_visible:true,paywall_first_observed_ms:Date.now()-start,protected_body_present_in_dom:false,protected_body_network_retrieval:false,protected_requests:req.length,horizontal_overflow:!overflow.pass,overflow,service_worker,...runtime};
    results.push(r);return r;
  }finally{await c.close();}
}
async function premiumLanding(browser,name,v,{dark=false}={}){
  const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,dark?"dark-premium":"premium",name);
  try{
    if(dark)await selectDark(p);
    const status=await open(p,"/premium",(dark?"Dark ":"")+"Premium "+name);
    await p.getByText("HEALTHTIMES PREMIUM",{exact:true}).waitFor({state:"visible",timeout});
    await p.waitForFunction(()=>!document.body.innerText.includes("Checking member access…"),null,{timeout});await p.waitForFunction(()=>!document.body.innerText.includes("Checking membership options…"),null,{timeout});
    const region=p.getByLabel("Source-backed Premium journalism");await region.waitFor({state:"visible",timeout});const storyCount=await region.getByRole("link").count();
    const body=await p.locator("body").innerText(),lower=body.toLowerCase();
    for(const x of ["configuration-required","on this build","approved store","secure member service"])if(lower.includes(x))block("P1","Premium reader copy leak: "+x);
    const priceVisible=/\$\s*\d+(?:\.\d{2})?/.test(body);if(/20% OFF|7-day trial|free trial|MOST POPULAR/i.test(body))block("P1","Premium fabricated commercial claim");
    const restore=await p.getByRole("button",{name:/Restore/i}).first().isVisible().catch(()=>false),signIn=await p.getByRole("button",{name:/Sign in|Member sign in/i}).first().isVisible().catch(()=>false);
    if(!restore||!signIn)block("P1","Premium restore/member sign-in missing");
    const overflow=await ov(p);if(!overflow.pass)block("P1","Premium "+name+" horizontal overflow");
    const runtime=assertRuntime("Premium "+name,d),service_worker=await sw(p);
    const file=await shot(p,dark?"dark/premium-landing-mobile.png":"premium/"+name+".png");
    const r={surface:"premium_landing",route:"/premium",viewport:name,...v,deployed_sha:wrapper,appearance:dark?"dark":"light",loaded_resolved:true,status,screenshot:file,premium_story_count:storyCount,store_reader_state:body.includes("Membership options aren't available here yet")?"membership-options-unavailable":"authoritative-offer-state",price_visible:priceVisible,restore_visible:restore,member_sign_in_visible:signIn,horizontal_overflow:!overflow.pass,overflow,service_worker,...runtime};
    if(storyCount===0)finding("P3","premium","Premium source-parity journalism resolved empty",{viewport:name});results.push(r);return r;
  }finally{await c.close();}
}
async function advertising(browser){
  const out=[];
  for(const [name,v] of Object.entries(views)){
    const c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"advertising",name);
    try{
      await open(p,"/","Advertising "+name);const label=p.getByText("Direct advertising · HOSPAZ",{exact:true}).first();const present=await label.isVisible().catch(()=>false);let hospaz=null;
      if(present){const box=label.locator("..");if(!(await box.innerText()).includes("ADVERTISEMENT"))block("P1","HOSPAZ disclosure missing");const image=await imageReady(p,box,"HOSPAZ "+name);const clickable=(await box.locator("a").count())>0;if(clickable)block("P1","ADVERTISING DESTINATION AUTHORITY VIOLATION");hospaz={advertiser:"HOSPAZ",placement:"hospaz-header-direct",...image,destination_verified:false,clickable:false,personalization:"none"};}
      const overflow=await ov(p);if(!overflow.pass)block("P1","Advertising "+name+" overflow");const runtime=assertRuntime("Advertising "+name,d);const file=await shot(p,"advertising/"+name+"-source-parity.png");
      out.push({viewport:name,...v,advertising_source:present?"direct":"none",ad_visible:present,ad_gap_present:false,HOSPAZ_present:present,HOSPAZ:hospaz,screenshot:file,...runtime});
    }finally{await c.close();}
  }
  if(out.every(x=>!x.HOSPAZ_present))finding("P4","advertising","HOSPAZ NOT PRESENT ON PUBLIC SOURCE-PARITY RUNTIME");
  write("advertising.json",{deployed_wrapper_sha:wrapper,results:out});return out;
}
async function smoke(browser){
  const out=[];
  for(const route of ["/","/explore","/search","/live","/watch","/my","/appearance"]){
    const name=route==="/"?"home":route.slice(1),v=views.desktop,c=await browser.newContext({viewport:v,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"smoke",name);
    try{
      const status=await open(p,route,"Smoke "+route),overflow=await ov(p),runtime=counts(d);
      if(runtime.React_418_count)block("P1","Smoke "+route+" React #418");if(runtime.pageerror_count)block("P1","Smoke "+route+" pageerror");
      if(route==="/watch"&&(d.httpErrors.length||d.failed.length))finding("P3","watch-media","Watch media/resource debt remains outside UI-03",{http_errors:d.httpErrors,failed_requests:d.failed});
      if(route==="/"){await p.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout});if(await mobileTabsPresent(p))block("P1","Desktop Home exposes mobile tabs");await shot(p,"home/desktop-regression.png");}
      out.push({route,status,horizontal_overflow:!overflow.pass,overflow,...runtime,http_errors:d.httpErrors,failed_requests:d.failed});
    }finally{await c.close();}
  }
  const c=await browser.newContext({viewport:views.mobile,deviceScaleFactor:1}),p=await c.newPage(),d=diag(p,"smoke","home-mobile");
  try{await open(p,"/","Home mobile");await p.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout});if(!await mobileTabsPresent(p))block("P1","Mobile Home five-tab nav missing");await shot(p,"home/mobile-regression.png");out.push({route:"/",viewport:"mobile",...counts(d)});}finally{await c.close();}
  return out;
}
function finish(extra={}){
  const manifest={certification_tooling_sha:tooling,deployed_wrapper_sha:wrapper,accepted_executable_sha:executable,build_info_sha:buildInfo?.sha||null,public_url:base,workflow_run_id:runId,captured_at:stamp(),browser:"chromium",browser_version:browserVersion,runner:process.env.RUNNER_NAME||"github-actions",os:os.platform()+" "+os.release(),node_version:process.version,playwright_version:playwrightVersion,device_scale_factor:1,viewports:views,primary_results:results,findings,commercial_preview_duration_configured:extra.preview?.preview_configuration_state==="timed-preview",commercial_preview_policy_status:extra.preview?.preview_configuration_state==="timed-preview"?"configured-runtime-observed":"owner-duration-not-configured",advertising:extra.ads||null,route_smoke:extra.smoke||null,React_418_count:results.reduce((n,x)=>n+(x.React_418_count||0),0),pageerror_count:pageErrors.length,console_error_count:consoleLog.filter(x=>x.type==="error").length,resource_http_error_count:network.filter(x=>x.event==="http_error").length,service_worker_registered:results.some(x=>x.service_worker?.registered),service_worker_controlling:results.some(x=>x.service_worker?.controlling),first_blocker:firstBlocker};
  write("manifest.json",manifest);write("console.json",consoleLog);write("network.json",network);write("service-worker.json",results.filter(x=>x.service_worker).map(x=>({surface:x.surface,viewport:x.viewport,state:x.service_worker})));
  write("premium-security.json",results.filter(x=>x.surface==="premium_article").map(x=>({viewport:x.viewport,anonymous:x.anonymous,protected_body_present_in_dom:x.protected_body_present_in_dom,protected_body_network_retrieval:x.protected_body_network_retrieval,paywall_visible:x.paywall_visible})));
  write("premium-commercial-policy.json",{preview_timer_active:extra.preview?.preview_timer_active??null,preview_duration_observed:extra.preview?.preview_duration_observed??null,commercial_preview_duration_configured:manifest.commercial_preview_duration_configured,commercial_preview_policy_status:manifest.commercial_preview_policy_status});
  const disposition=firstBlocker?"UI-06 PHASE 2 LIVE COMMERCIAL READER NOT CERTIFIED — "+firstBlocker.message:manifest.commercial_preview_duration_configured?"UI-06 PHASE 2 LIVE COMMERCIAL READER CERTIFIED — DEPLOYMENT "+wrapper+" / EXECUTABLE "+executable+" / ARTICLE + PREMIUM + ADVERTISING LIVE EVIDENCE READY FOR UI MODERATOR FINAL CLOSURE":"UI-06 PHASE 2 LIVE COMMERCIAL READER TECHNICALLY CERTIFIED — PREMIUM SECURITY / ARTICLE / PREMIUM UI PASS, BUT NON-ZERO COMMERCIAL PREVIEW DURATION IS NOT CONFIGURED";
  write("summary.md","# UI-06 Phase 2 Live Commercial Reader Certification\n\n- Tooling SHA: "+tooling+"\n- Wrapper: "+wrapper+"\n- Executable: "+executable+"\n- Browser: Chromium "+browserVersion+"\n- Playwright: "+playwrightVersion+"\n- Preview policy: "+manifest.commercial_preview_policy_status+"\n\n## Findings\n\n"+(findings.length?findings.map(x=>"- "+x.severity+" / "+x.category+": "+x.message).join("\n"):"- None.")+"\n\n## Final disposition\n\n"+disposition+"\n");return disposition;
}
async function main(){
  try{await identity();}catch(e){console.error(finish());process.exitCode=1;return;}
  const browser=await chromium.launch({headless:true});browserVersion=browser.version();let preview=null,ads=null,smokes=null;
  try{
    for(const [n,v] of Object.entries(views))await article(browser,n,v);
    preview=await premiumArticle(browser,"mobile",views.mobile);await premiumArticle(browser,"desktop",views.desktop);
    for(const [n,v] of Object.entries(views))await premiumLanding(browser,n,v);
    await article(browser,"mobile",views.mobile,{dark:true});await premiumArticle(browser,"mobile",views.mobile,{dark:true});await premiumLanding(browser,"mobile",views.mobile,{dark:true});
    ads=await advertising(browser);smokes=await smoke(browser);
    if(preview.preview_configuration_state==="fail-closed")finding("P2","commercial-activation","COMMERCIAL ACTIVATION GAP — NON-ZERO PREMIUM PREVIEW DURATION NOT CONFIGURED ON PUBLIC CERTIFICATION BUILD");
  }catch(e){if(!firstBlocker)firstBlocker={severity:"P1",message:e.message||String(e)};}finally{await browser.close();}
  const disposition=finish({preview,ads,smoke:smokes});console.log(disposition);if(firstBlocker)process.exitCode=1;
}
await main();

// Trigger exact-head UI-06 live certification after workflow installation.

// UI-06 exact-head certification dispatch marker: 2026-10-02.
