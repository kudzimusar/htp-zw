import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const PUBLIC_URL=(process.env.PUBLIC_URL||"https://kudzimusar.github.io/htp-zw/").replace(/\/+$/,"")+"/";
const TARGET=process.env.TARGET_DEPLOYED_SHA||"e275e53071bbbb519b6e7a4f3805e77038567b54";
const READER=process.env.UNDERLYING_READER_SHA||"f36d6336c65c598191ea2841952a8c9f18bcf57e";
const TOOLING=process.env.CERTIFICATION_TOOLING_SHA||process.env.GITHUB_SHA||"unknown";
const RUN_ID=process.env.GITHUB_RUN_ID||"local";
const ROOT=process.env.ARTIFACT_DIR||"artifacts/ui06/phase0-live-pages";
const TIMEOUT=30000;
const OVERFLOW_TOLERANCE=8;
const VIEWS=[
  {key:"mobile",width:390,height:844},
  {key:"tablet",width:834,height:1112},
  {key:"desktop",width:1440,height:1000}
];
const consoleEvents=[],pageErrors=[],requestFailed=[],httpErrors=[],maxres=[],sw=[],results={};
let blocker=null,buildInfo=null,browserVersion="unknown";

const now=()=>new Date().toISOString();
const fail=(message)=>{if(!blocker) blocker=message;};
const dir=(p)=>fs.mkdir(p,{recursive:true});
const json=async(p,v)=>{await dir(path.dirname(p));await fs.writeFile(p,JSON.stringify(v,null,2)+"\n","utf8");};
const text=async(p,v)=>{await dir(path.dirname(p));await fs.writeFile(p,v,"utf8");};
const route=(page)=>{try{return new URL(page.url()).pathname;}catch{return page.url();}};
const label=(v)=>v.key+" "+v.width+"x"+v.height;
const y=async(loc)=>{const b=await loc.boundingBox().catch(()=>null);return b?b.y:null;};

async function identityGate(){
  const response=await fetch(PUBLIC_URL+"build-info.json",{headers:{accept:"application/json","cache-control":"no-cache"},redirect:"follow"});
  const body=await response.text();
  await text(path.join(ROOT,"build-info.json"),body.endsWith("\n")?body:body+"\n");
  if(!response.ok){fail("DEPLOYMENT CUSTODY REGRESSION — build-info.json HTTP "+response.status);return null;}
  try{buildInfo=JSON.parse(body);}catch{fail("DEPLOYMENT CUSTODY REGRESSION — invalid build-info.json");return null;}
  const expected={sha:TARGET,presentation:"apps/mobile",service_mode:"source-parity",base_path:"/htp-zw"};
  const bad=Object.entries(expected).filter(([k,v])=>buildInfo[k]!==v).map(([k,v])=>k+" expected "+JSON.stringify(v)+" received "+JSON.stringify(buildInfo[k]));
  if(bad.length) fail("DEPLOYMENT CUSTODY REGRESSION — "+bad.join("; "));
  return buildInfo;
}

function listeners(page,v){
  page.on("pageerror",error=>{
    const item={captured_at:now(),viewport:v.key,route:route(page),message:error.message||String(error),stack:error.stack||null};
    pageErrors.push(item);
    const s=item.message.toLowerCase();
    if(s.includes("minified react error #418")||s.includes("react error #418")) fail("React #418 observed at "+label(v));
  });
  page.on("console",message=>{
    if(!["error","warning"].includes(message.type())) return;
    const item={captured_at:now(),viewport:v.key,route:route(page),type:message.type(),text:message.text(),location:message.location()};
    consoleEvents.push(item);
    const s=item.text.toLowerCase();
    if(s.includes("minified react error #418")||s.includes("react error #418")) fail("React #418 observed at "+label(v));
  });
  page.on("requestfailed",request=>requestFailed.push({
    captured_at:now(),viewport:v.key,route:route(page),url:request.url(),resource_type:request.resourceType(),failure:request.failure()
  }));
  page.on("response",response=>{
    if(response.status()<400) return;
    const item={captured_at:now(),viewport:v.key,route:route(page),url:response.url(),status:response.status(),resource_type:response.request().resourceType()};
    httpErrors.push(item);
    if(item.url.includes("maxresdefault.jpg")){
      const m=item.url.match(/\/vi\/([^/]+)\/maxresdefault\.jpg/i);
      maxres.push({...item,provider_id:m?m[1]:null,visibly_rendered:null});
    }
  });
}

async function homeReady(page,v){
  let resolved=false;
  try{await page.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout:TIMEOUT});resolved=true;}catch{}
  const loading=await page.getByText("Loading Home…",{exact:true}).isVisible().catch(()=>false);
  if(!resolved||loading) fail("Home failed to resolve beyond Loading Home… at "+label(v));
  return {resolved,loading};
}

async function contentChecks(page){
  const top=page.getByText("Top Stories",{exact:true});
  const filters=page.getByLabel("Editorial filters");

  // HomeScreen renders HeroStory as the immediate product sibling after the
  // editorial-filter container. Certify that existing structure directly
  // instead of assuming React Native Web exposes Pressable as role="link".
  const hero=filters.locator("xpath=following-sibling::*[1]");
  const heroVisible=await hero.isVisible().catch(()=>false);
  const heroText=heroVisible ? (await hero.innerText().catch(()=>"")).replace(/\s+/g," ").trim() : "";
  const heroLabel=heroVisible ? ((await hero.getAttribute("aria-label").catch(()=>null))||"").trim() : "";
  const heroRole=heroVisible ? await hero.getAttribute("role").catch(()=>null) : null;
  const heroImage=heroVisible ? await hero.locator("img").first().isVisible().catch(()=>false) : false;
  const heroMeaningful=heroVisible && (heroLabel.length>=12 || heroText.length>=24);

  const topY=await y(top);
  const next=await y(page.getByText("JUST PUBLISHED",{exact:true}));
  const storyTargets=page.locator('[role="link"],a');
  const n=await storyTargets.count();
  const exclude=new Set(["Home","Explore","Live","Watch","My HT","My HealthTimes","HealthTimes Home","Search HealthTimes","Notifications","HealthTimes Premium"]);
  const items=[];
  for(let i=0;i<n;i++){
    const loc=storyTargets.nth(i);
    if(!(await loc.isVisible().catch(()=>false))) continue;
    const b=await loc.boundingBox().catch(()=>null);
    if(!b||topY===null||b.y<=topY) continue;
    if(next!==null&&b.y>=next) continue;
    const name=((await loc.getAttribute("aria-label").catch(()=>null))||(await loc.innerText().catch(()=>""))).replace(/\s+/g," ").trim();
    if(name&&!exclude.has(name)) items.push(name);
  }

  return {
    hero_present:heroMeaningful,
    hero_label:heroLabel||heroText.slice(0,180)||null,
    hero_role:heroRole,
    hero_image_present:heroImage,
    top_stories_present:await top.isVisible().catch(()=>false),
    top_stories_item_count:items.length,
    first_top_story_label:items[0]||null
  };
}

async function tabbar(page){
  const tablists=page.locator('[role="tablist"]');
  const observed=[];
  for(let i=0;i<await tablists.count();i++){
    const list=tablists.nth(i);
    if(!(await list.isVisible().catch(()=>false))) continue;
    const tabs=list.locator('[role="tab"]');
    const names=[];
    for(let j=0;j<await tabs.count();j++){
      const tab=tabs.nth(j);
      if(!(await tab.isVisible().catch(()=>false))) continue;
      const name=((await tab.getAttribute("aria-label").catch(()=>null))||(await tab.innerText().catch(()=>""))).trim();
      if(name) names.push(name);
    }
    observed.push({structure:"role=tablist",tab_count:names.length,destinations:names});
  }
  const good=(names)=>{
    const s=new Set(names);
    return ["Home","Explore","Live","Watch"].every(x=>s.has(x))&&(s.has("My HT")||s.has("My HealthTimes"));
  };
  let found=observed.find(o=>good(o.destinations))||null;
  if(!found){
    found=await page.evaluate(()=>{
      const controls=Array.from(document.querySelectorAll('[role="tab"],[role="button"],[role="link"],a'));
      const name=n=>(n.getAttribute("aria-label")||n.textContent||"").replace(/\s+/g," ").trim();
      const vis=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0;};
      const bottom=controls.filter(n=>{if(!vis(n))return false;const r=n.getBoundingClientRect();return r.top>=innerHeight-160&&r.bottom<=innerHeight+40;});
      const wanted=["Home","Explore","Live","Watch"];
      const chosen=wanted.map(x=>bottom.find(n=>name(n)===x)).filter(Boolean);
      const my=bottom.find(n=>["My HT","My HealthTimes"].includes(name(n)));
      if(my) chosen.push(my);
      if(chosen.length!==5) return null;
      let a=chosen[0].parentElement,best=null;
      while(a&&a!==document.body){
        if(chosen.every(n=>a.contains(n))){
          const r=a.getBoundingClientRect();
          if(r.top>=innerHeight-190&&r.bottom<=innerHeight+60){
            const area=r.width*r.height;
            if(!best||area<best.area) best={area,tag:a.tagName,role:a.getAttribute("role"),box:{x:r.x,y:r.y,width:r.width,height:r.height}};
          }
        }
        a=a.parentElement;
      }
      return best?{structure:"bottom-aligned common navigation container",tab_count:5,destinations:chosen.map(name),container:best}:null;
    }).catch(()=>null);
  }
  return {present:Boolean(found),tab_count:found?.tab_count||0,destinations:found?.destinations||[],structure:found?.structure||null,visible_tablists:observed};
}

async function utility(page){
  const names=["Search HealthTimes","Notifications","HealthTimes Premium"],controls={};
  for(const name of names) controls[name]=await page.getByRole("button",{name,exact:true}).isVisible().catch(()=>false);
  return {top_utility_navigation_exists:Object.values(controls).every(Boolean),controls};
}

async function serviceWorker(page,v){
  const obs=await page.evaluate(async()=>{
    if(!("serviceWorker" in navigator)) return {service_worker_supported:false,controller_present:false,registration_state:"unsupported",fatal_sw_error:false};
    const r=await navigator.serviceWorker.getRegistration().catch(()=>null);
    return {service_worker_supported:true,controller_present:Boolean(navigator.serviceWorker.controller),registration_state:r?.active?"active":r?.waiting?"waiting":r?.installing?"installing":"none",fatal_sw_error:false};
  }).catch(error=>({service_worker_supported:true,controller_present:false,registration_state:"observation-error",fatal_sw_error:false,observation_error:String(error)}));
  sw.push({viewport:v.key,...obs});
  return obs;
}

async function markMaxres(page,v){
  for(const item of maxres.filter(x=>x.viewport===v.key&&x.visibly_rendered===null)){
    item.visibly_rendered=await page.evaluate(url=>Array.from(document.images).some(img=>{
      const src=img.currentSrc||img.src||"";
      const r=img.getBoundingClientRect();
      return src===url&&r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
    }),item.url).catch(()=>false);
  }
}

async function screenshot(page,v,folder){
  const top=path.join(ROOT,v.key+"-home.png");
  await page.screenshot({path:top,fullPage:true});
  await fs.copyFile(top,path.join(folder,"home.png"));
}

async function premium(page){
  const entry=page.getByRole("button",{name:"HealthTimes Premium",exact:true});
  const visible=await entry.isVisible().catch(()=>false);
  const start=pageErrors.length;
  let reachable=false,error=null;
  if(visible){
    try{
      await entry.click();
      await page.waitForURL(url=>url.pathname.endsWith("/premium")||url.pathname.endsWith("/premium/"),{timeout:15000});
      await page.getByText("Go Premium",{exact:true}).waitFor({state:"visible",timeout:15000});
      reachable=true;
    }catch(e){error={message:e.message||String(e)};}
  }
  return {premium_entry_visible:visible,premium_route_reachable:reachable,premium_pageerror_count:pageErrors.length-start,navigation_error:error};
}

async function runView(browser,v){
  const folder=path.join(ROOT,v.key);await dir(folder);
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1});
  const page=await context.newPage();listeners(page,v);
  const out={viewport:v,home_resolved:false,loading_visible_after_wait:null,hero_present:false,top_stories_present:false,top_stories_item_count:0,mobile_tabbar_present:null,tab_count:null,destinations_found:[],tablet_navigation:null,desktop_mobile_tabbar_present:null,premium:null,overflow:null,horizontal_overflow:null,service_worker:null,react_418_count:0};
  try{
    await page.goto(PUBLIC_URL,{waitUntil:"domcontentloaded",timeout:TIMEOUT});
    let state=await homeReady(page,v);out.home_resolved=state.resolved;out.loading_visible_after_wait=state.loading;
    if(blocker){await screenshot(page,v,folder).catch(()=>{});return out;}
    await page.reload({waitUntil:"domcontentloaded",timeout:TIMEOUT});
    state=await homeReady(page,v);out.home_resolved=state.resolved;out.loading_visible_after_wait=state.loading;

    Object.assign(out,await contentChecks(page));
    if(!out.hero_present) fail("Hero lead story region absent/broken at "+label(v));
    if(!out.top_stories_present) fail("Top Stories section absent at "+label(v));
    if(out.top_stories_present&&out.top_stories_item_count<1) fail("Top Stories rendered without story items at "+label(v));

    const tabs=await tabbar(page);
    if(v.key==="mobile"){
      out.mobile_tabbar_present=tabs.present;out.tab_count=tabs.tab_count;out.destinations_found=tabs.destinations;
      if(!tabs.present) fail("Mobile Reader tab bar missing or incomplete at "+label(v));
    }else if(v.key==="tablet"){
      const u=await utility(page);
      out.tablet_navigation={bottom_tab_navigation_exists:tabs.present,top_utility_navigation_exists:u.top_utility_navigation_exists,both_exist:tabs.present&&u.top_utility_navigation_exists,neither_exists:!tabs.present&&!u.top_utility_navigation_exists,tab_destinations:tabs.destinations,utility_controls:u.controls};
      if(out.tablet_navigation.neither_exists) fail("Tablet navigation unusable: neither bottom tabs nor utility navigation visible");
    }else{
      out.desktop_mobile_tabbar_present=tabs.present;
      if(tabs.present) fail("Desktop mobile bottom tab bar is still present at "+label(v));
    }

    out.overflow=await page.evaluate(()=>({document_scroll_width:document.documentElement.scrollWidth,body_scroll_width:document.body?.scrollWidth??null,viewport_width:innerWidth}));
    const widest=Math.max(out.overflow.document_scroll_width||0,out.overflow.body_scroll_width||0);
    const px=Math.max(0,widest-out.overflow.viewport_width);
    out.horizontal_overflow={overflow_pixels:px,tolerance_pixels:OVERFLOW_TOLERANCE,pass:px<=OVERFLOW_TOLERANCE};
    if(px>OVERFLOW_TOLERANCE) fail("Material document-level horizontal overflow: "+px+"px at "+label(v));

    out.service_worker=await serviceWorker(page,v);
    await markMaxres(page,v);
    await screenshot(page,v,folder);

    if(v.key==="desktop"&&!blocker){
      out.premium=await premium(page);
      if(!out.premium.premium_entry_visible) fail("Premium entry point not visible in Reader shell");
      else if(!out.premium.premium_route_reachable) fail("Premium route not reachable from user-facing Reader entry point");
    }

    const err=[...pageErrors.filter(x=>x.viewport===v.key).map(x=>x.message),...consoleEvents.filter(x=>x.viewport===v.key&&x.type==="error").map(x=>x.text)];
    out.react_418_count=err.filter(x=>{const s=String(x).toLowerCase();return s.includes("minified react error #418")||s.includes("react error #418");}).length;
    if(out.react_418_count) fail("React #418 observed at "+label(v));
  }catch(e){
    out.harness_error={message:e.message||String(e),stack:e.stack||null};
    fail("Certification tooling/browser execution failure at "+label(v)+": "+(e.message||String(e)));
    await screenshot(page,v,folder).catch(()=>{});
  }finally{
    await json(path.join(folder,"browser.json"),out);
    await context.close();
  }
  return out;
}

function warningList(){
  return consoleEvents.filter(x=>x.type==="warning").map(x=>{
    let classification="non-blocking warning";
    if(x.text.includes("[expo-notifications] Listening to push token changes is not yet fully supported on web")) classification="known non-blocking: expo-notifications web";
    else if(x.text.includes("apple-mobile-web-app-capable")||x.text.includes("mobile-web-app-capable")) classification="known non-blocking: PWA meta";
    else if(x.text.includes("Cannot record touch end without a touch start")) classification="known non-blocking unless interaction failure is separately proven: Touch Bank";
    return {...x,classification};
  });
}

function gaps(){
  const m=results.mobile||{},t=results.tablet||{},d=results.desktop||{};
  return {
    basis:"Live exact-viewport screenshots plus DOM observations; runtime and visual categories remain separate.",
    observed:[
      "Environment banner remains present in the current shell.",
      "Search / Alerts / Premium utility controls are part of the current AppHeader.",
      "Editorial filters precede the hero on Home.",
      "Hero lead region: "+(m.hero_present?"present":"not proven on mobile")+".",
      "Top Stories: "+(m.top_stories_present?"present":"not proven on mobile")+".",
      "Mobile bottom navigation: "+(m.mobile_tabbar_present?"present":"absent/not proven")+".",
      "Tablet bottom navigation: "+(t.tablet_navigation?.bottom_tab_navigation_exists?"present":"absent/not proven")+".",
      "Desktop mobile-tab suppression: "+(d.desktop_mobile_tabbar_present===false?"suppressed":"not proven or failed")+"."
    ],
    visual_review_items:["masthead/header height","environment banner presence","Search/Alerts/Premium utility row","editorial filter placement","hero prominence","hero text/image relationship","Live placement","HOSPAZ placement","Top Stories hierarchy","content density above the fold","repeated section rhythm","Premium visibility","advertisement rhythm","mobile bottom navigation","desktop navigation","spacing","hierarchy","publication feel"],
    classification:"VISUAL DESIGN GAPS — no redesign performed"
  };
}

async function finish(){
  const warnings=warningList();
  const react418=[...pageErrors.map(x=>x.message),...consoleEvents.filter(x=>x.type==="error").map(x=>x.text)].filter(x=>{const s=String(x).toLowerCase();return s.includes("minified react error #418")||s.includes("react error #418");}).length;
  const manifest={
    certification_tooling_sha:TOOLING,target_deployed_sha:TARGET,underlying_accepted_reader_sha:READER,public_url:PUBLIC_URL,build_info:buildInfo,
    browser_name:"chromium",browser_version:browserVersion,run_id:RUN_ID,captured_at:now(),
    mobile_viewport:{width:390,height:844,device_scale_factor:1},tablet_viewport:{width:834,height:1112,device_scale_factor:1},desktop_viewport:{width:1440,height:1000,device_scale_factor:1},
    react_418_count:react418,pageerror_count:pageErrors.length,console_error_count:consoleEvents.filter(x=>x.type==="error").length,console_warning_count:warnings.length,requestfailed_count:requestFailed.length,http_ge_400_count:httpErrors.length,
    home_resolved:Object.values(results).length===3&&Object.values(results).every(x=>x.home_resolved===true),
    hero_present:Object.values(results).length===3&&Object.values(results).every(x=>x.hero_present===true),
    top_stories_present:Object.values(results).length===3&&Object.values(results).every(x=>x.top_stories_present===true),
    mobile_tabbar_present:results.mobile?.mobile_tabbar_present??null,mobile_destinations_present:results.mobile?.destinations_found??[],
    desktop_mobile_tabbar_absent:results.desktop?results.desktop.desktop_mobile_tabbar_present===false:null,
    premium_entry_visible:results.desktop?.premium?.premium_entry_visible??null,premium_route_reachable:results.desktop?.premium?.premium_route_reachable??null,
    document_scroll_width_per_viewport:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.overflow])),
    horizontal_overflow_result:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.horizontal_overflow])),
    service_worker_observations:sw,maxresdefault_failures:maxres,wireframe_gap_summary:gaps(),first_blocker:blocker
  };
  await json(path.join(ROOT,"console.json"),consoleEvents);
  await json(path.join(ROOT,"page-errors.json"),pageErrors);
  await json(path.join(ROOT,"network-errors.json"),{request_failed:requestFailed,http_ge_400:httpErrors});
  await json(path.join(ROOT,"maxresdefault.json"),maxres);
  await json(path.join(ROOT,"service-worker.json"),sw);
  await json(path.join(ROOT,"manifest.json"),manifest);
  const disposition=blocker?"UI-06 PHASE 0 HOME BASELINE NOT CERTIFIED — "+blocker:"UI-06 PHASE 0 HOME BASELINE CERTIFIED — EXACT LIVE PAGES RUNTIME HEALTHY / READY FOR UI-01 HOME CONFORMANCE";
  await text(path.join(ROOT,"certification-summary.md"),[
    "# UI-06 Phase 0 Live Pages Certification","",
    "- Tooling SHA: "+TOOLING,
    "- Target deployed SHA: "+TARGET,
    "- Underlying accepted Reader SHA: "+READER,
    "- Public URL: "+PUBLIC_URL,
    "- Browser: Chromium "+browserVersion,
    "- Run ID: "+RUN_ID,"",
    "## Classification","",
    "- Deployment defects: "+(String(blocker||"").startsWith("DEPLOYMENT CUSTODY REGRESSION")?blocker:"none proven"),
    "- Runtime defects: "+(react418?"React #418 observed":"no React #418 observed")+"; first blocker: "+(blocker||"none"),
    "- Media / data defects: "+(maxres.length?String(maxres.length)+" maxresdefault.jpg failure(s) recorded":"none proven by maxresdefault observation"),
    "- Visual design gaps: recorded separately in manifest; no product mutation.",
    "- Non-blocking warnings: "+warnings.length,"",
    "## Final disposition","",disposition,""
  ].join("\n"));
  return disposition;
}

async function main(){
  await dir(ROOT);
  await identityGate();
  if(blocker){console.error(await finish());process.exitCode=1;return;}
  const browser=await chromium.launch({headless:true});browserVersion=browser.version();
  try{
    for(const v of VIEWS){
      results[v.key]=await runView(browser,v);
      if(blocker) break;
    }
  }finally{await browser.close();}
  const disposition=await finish();
  console.log(disposition);
  if(blocker) process.exitCode=1;
}

await main();
