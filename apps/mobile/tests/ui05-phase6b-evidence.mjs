import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base=process.env.UI05_BASE_URL || "http://127.0.0.1:4174";
const sha=process.env.EXPECTED_SHA || "unknown";
const out="ui05-phase6b-evidence";
const articleId="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const articleHeadline="Zimbabwe Looks to Strengthen Social Contracting as HIV Donor Funding Shrinks";
mkdirSync(join(out,"web"),{recursive:true});

function diagnostics(page){
  const pageErrors=[];
  const consoleErrors=[];
  page.on("pageerror",error=>pageErrors.push(String(error)));
  page.on("console",msg=>{ if(msg.type()==="error") consoleErrors.push(msg.text()); });
  return {pageErrors,consoleErrors};
}

async function inspect(page){
  return page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    activeLabel:document.activeElement?.getAttribute?.("aria-label") || document.activeElement?.textContent?.trim()?.slice(0,120) || document.activeElement?.tagName || null
  }));
}

function assertClean(label,diag,state){
  const react418=[...diag.pageErrors,...diag.consoleErrors].filter(value=>value.includes("Minified React error #418")||value.includes("React error #418"));
  if(react418.length) throw new Error(label+" React #418: "+react418.join(" | "));
  if(diag.pageErrors.length) throw new Error(label+" page errors: "+diag.pageErrors.join(" | "));
  if(diag.consoleErrors.length) throw new Error(label+" console errors: "+diag.consoleErrors.join(" | "));
  if(state.scrollWidth>state.clientWidth+1) throw new Error(label+" horizontal overflow: "+state.scrollWidth+" > "+state.clientWidth);
}

async function markerVisible(page,marker){
  return page.getByText(marker,{exact:false}).first().isVisible().catch(()=>false);
}

async function requireNoLoading(page,label,loadingMarkers){
  if(!loadingMarkers.length) return {loadingVisible:false};
  await page.waitForFunction(
    markers=>markers.every(marker=>!document.body.innerText.includes(marker)),
    loadingMarkers,
    {timeout:30000}
  );
  const visible=[];
  for(const marker of loadingMarkers){
    if(await markerVisible(page,marker)) visible.push(marker);
  }
  if(visible.length) throw new Error(label+" unresolved loading markers: "+visible.join(" | "));
  return {loadingVisible:false};
}

async function requireResolvedArticle(page,label){
  await page.getByRole("button",{name:"Save article"}).waitFor({state:"visible",timeout:30000});
  await page.getByText(articleHeadline,{exact:true}).first().waitFor({state:"visible",timeout:30000});
  const loading=await requireNoLoading(page,label,["Loading article…"]);
  return {...loading,articleResolved:true,articleHeadline};
}

async function requireResolvedHome(page,label){
  await page.getByText("Top Stories",{exact:true}).first().waitFor({state:"visible",timeout:30000});
  const loading=await requireNoLoading(page,label,["Loading Home…"]);
  return {...loading,homeResolved:true,homeResolutionMarker:"Top Stories"};
}

async function requireApprovedState(page,label,expectations,loadingMarkers=[]){
  await page.waitForFunction(
    allowed=>allowed.some(text=>document.body.innerText.includes(text)),
    expectations,
    {timeout:30000}
  );
  await requireNoLoading(page,label,loadingMarkers);
  const body=await page.locator("body").innerText();
  const resolved=expectations.find(text=>body.includes(text));
  if(!resolved) throw new Error(label+" did not resolve to an approved state: "+expectations.join(" | "));
  return resolved;
}

async function capture(browser,manifest,{name,route,viewport,ready,readiness,loadingMarkers=[],expectedState="resolved",contextOptions={},after}){
  const [label,width,height]=viewport;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,...contextOptions});
  const page=await context.newPage();
  const diag=diagnostics(page);
  const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:30000});
  if(response?.status()!==200) throw new Error(name+" HTTP "+response?.status());
  if(ready) await page.getByText(ready,{exact:false}).first().waitFor({timeout:30000});
  if(after) await after(page);
  let readinessObservation={};
  if(expectedState==="resolved"){
    const resolution=readiness ? await readiness(page,name) : {};
    const loading=await requireNoLoading(page,name,loadingMarkers);
    readinessObservation={...loading,...resolution};
  }else if(expectedState==="loading"){
    if(!loadingMarkers.length) throw new Error(name+" loading-state capture requires loadingMarkers");
    const visible=[];
    for(const marker of loadingMarkers){
      if(await markerVisible(page,marker)) visible.push(marker);
    }
    if(!visible.length) throw new Error(name+" expected a loading state but no loading marker was visible");
    readinessObservation={loadingVisible:true};
  }else{
    throw new Error(name+" unknown expectedState "+expectedState);
  }
  const state=await inspect(page);
  assertClean(name,diag,state);
  const file=join(out,"web",name+".png");
  await page.screenshot({path:file,fullPage:true});
  assertClean(name+" post-capture",diag,await inspect(page));
  manifest.screens.push({
    sha,name,route,viewport:label,width,height,status:response?.status()??null,file,
    pageErrors:diag.pageErrors,consoleErrors:diag.consoleErrors,react418:0,
    horizontalOverflow:false,focusObservation:state.activeLabel,expectedState,
    ...(contextOptions.reducedMotion ? {reducedMotion:contextOptions.reducedMotion} : {}),
    ...readinessObservation
  });
  await context.close();
}

const browser=await chromium.launch({headless:true});
const manifest={
  sha,
  capturedAt:new Date().toISOString(),
  serviceMode:"source-parity",
  screens:[],
  focusChecks:[],
  stateChecks:[],
  authority:{
    canonicalReader:"apps/mobile",
    premiumEntitlementMutation:false,
    offlineArchitectureMutation:false,
    ag05Mutation:false,
    ag06Mutation:false,
    commerceAuthorityMutation:false,
    supabaseMigrationOrRlsMutation:false,
    productionMutation:false,
    pagesDeploymentMutation:false
  }
};

try{
  for(const spec of [
    {name:"mobile-search",route:"/search",viewport:["mobile",390,844],ready:"Suggested searches"},
    {name:"tablet-my",route:"/my",viewport:["tablet",834,1112],ready:"My HealthTimes"},
    {name:"desktop-article",route:"/article/"+articleId,viewport:["desktop",1440,1000],readiness:requireResolvedArticle,loadingMarkers:["Loading article…"]}
  ]) await capture(browser,manifest,spec);

  await capture(browser,manifest,{
    name:"narrow-long-search",
    route:"/search",
    viewport:["narrow",320,844],
    ready:"Suggested searches",
    after:async page=>{
      const input=page.getByRole("textbox",{name:"Search HealthTimes"});
      await input.fill("cardiovascular-health-policy-and-community-prevention-".repeat(3));
      await input.press("Enter");
      await page.waitForTimeout(900);
    }
  });

  {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
    const page=await context.newPage();
    const diag=diagnostics(page);

    await page.goto(base+"/search",{waitUntil:"domcontentloaded",timeout:30000});
    const search=page.getByRole("textbox",{name:"Search HealthTimes"});
    await search.focus();
    await search.fill("health");
    await search.press("Enter");
    await page.waitForTimeout(500);
    let state=await inspect(page);
    assertClean("keyboard-search",diag,state);
    manifest.focusChecks.push({surface:"Search",operation:"focus + Enter submit",activeLabel:state.activeLabel});

    await page.goto(base+"/saved?tab=saved",{waitUntil:"domcontentloaded",timeout:30000});
    const offline=page.getByRole("button",{name:"Offline",exact:true});
    await offline.focus();
    await offline.press("Enter");
    await page.getByText("Available offline",{exact:true}).waitFor({timeout:10000});
    state=await inspect(page);
    assertClean("keyboard-saved",diag,state);
    manifest.focusChecks.push({surface:"Saved",operation:"focus + Enter tab choice",activeLabel:state.activeLabel});

    await page.goto(base+"/article/"+articleId,{waitUntil:"domcontentloaded",timeout:30000});
    const save=page.getByRole("button",{name:"Save article"});
    await save.focus();
    await save.press("Enter");
    await page.getByText(/Saved|Removed from saved/).first().waitFor({timeout:10000});
    state=await inspect(page);
    assertClean("keyboard-article",diag,state);
    manifest.focusChecks.push({surface:"Article",operation:"focus + Enter save",activeLabel:state.activeLabel});

    await page.goto(base+"/appearance",{waitUntil:"domcontentloaded",timeout:30000});
    const dark=page.getByRole("button",{name:"Dark",exact:true});
    await dark.focus();
    await dark.press("Enter");
    await page.waitForTimeout(300);
    state=await inspect(page);
    assertClean("keyboard-appearance",diag,state);
    manifest.focusChecks.push({surface:"Appearance",operation:"focus + Enter choice",activeLabel:state.activeLabel});

    await context.close();
  }

  {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
    const setup=await context.newPage();
    await setup.goto(base+"/appearance",{waitUntil:"domcontentloaded",timeout:30000});
    await setup.getByRole("button",{name:"Dark",exact:true}).click();
    await setup.close();

    for(const [name,route,ready] of [
      ["dark-home","/","HealthTimes"],
      ["dark-article","/article/"+articleId,null],
      ["dark-premium","/premium","HEALTHTIMES PREMIUM"],
      ["dark-watch","/watch","Watch"],
      ["dark-my","/my","My HealthTimes"]
    ]){
      const page=await context.newPage();
      const diag=diagnostics(page);
      const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:30000});
      if(response?.status()!==200) throw new Error(name+" HTTP "+response?.status());
      if(ready) await page.getByText(ready,{exact:false}).first().waitFor({timeout:30000});
      const readinessObservation=
        name==="dark-article"
          ? await requireResolvedArticle(page,name)
          : name==="dark-home"
            ? await requireResolvedHome(page,name)
            : await requireNoLoading(page,name,[]);
      const state=await inspect(page);
      assertClean(name,diag,state);
      const file=join(out,"web",name+".png");
      await page.screenshot({path:file,fullPage:true});
      assertClean(name+" post-capture",diag,await inspect(page));
      manifest.screens.push({sha,name,route,viewport:"mobile-dark",width:390,height:844,status:response?.status()??null,file,pageErrors:diag.pageErrors,consoleErrors:diag.consoleErrors,react418:0,horizontalOverflow:false,appearance:"dark",expectedState:"resolved",...readinessObservation});
      await page.close();
    }
    await context.close();
  }

  for(const [name,route,expectations,loadingMarkers] of [
    ["saved-state","/saved?tab=saved",["Nothing saved yet","Available offline"],["Loading your library…"]],
    ["live-state","/live",["No live coverage right now","Live now","Upcoming coverage","Live blogs"],["Loading live coverage…"]],
    ["listen-state","/listen",["No audio published yet","Featured audio"],["Loading audio…"]],
    ["premium-state","/premium",["Membership options aren't available here yet","Membership options"],["Checking membership options…","Loading Premium journalism…"]]
  ]){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
    const page=await context.newPage();
    const diag=diagnostics(page);
    const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:30000});
    if(response?.status()!==200) throw new Error(name+" HTTP "+response?.status());
    const resolved=await requireApprovedState(page,name,expectations,loadingMarkers);
    const state=await inspect(page);
    assertClean(name,diag,state);
    manifest.stateChecks.push({surface:route,resolved,approvedStates:expectations,loadingVisible:false});
    await context.close();
  }

  await capture(browser,manifest,{
    name:"reduced-motion-home",
    route:"/",
    viewport:["mobile-reduced-motion",390,844],
    readiness:requireResolvedHome,
    loadingMarkers:["Loading Home…"],
    contextOptions:{reducedMotion:"reduce"}
  });

  writeFileSync(join(out,"manifest.json"),JSON.stringify(manifest,null,2));
}finally{
  await browser.close();
}
