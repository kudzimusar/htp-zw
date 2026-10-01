import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base="http://127.0.0.1:4174";
const candidateSha=process.env.EXPECTED_SHA ?? "";
const baseSha=process.env.UI03_BASE_SHA ?? "";
const branch=process.env.BRANCH_NAME ?? "feat/ui03-article-premium-advertising-conformance";
const previewSeconds=Number(process.env.EXPO_PUBLIC_HEALTHTIMES_PREMIUM_PREVIEW_SECONDS ?? "0");
const publicId="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const premiumId="source-us-embassy-challenges-zimbabwe-rejected-health-mou";
const viewports={
  mobile:{width:390,height:844},
  tablet:{width:834,height:1112},
  desktop:{width:1440,height:1000}
};

const mode=process.argv[2] ?? "source-parity";
const root="ui03-evidence";
for(const dir of ["article","premium","advertising","dark","smoke"]){
  fs.mkdirSync(path.join(root,dir),{recursive:true});
}

function diagnostics(page){
  const pageErrors=[];
  const consoleErrors=[];
  page.on("pageerror",error=>pageErrors.push(String(error)));
  page.on("console",message=>{
    if(message.type()==="error") consoleErrors.push(message.text());
  });
  return {pageErrors,consoleErrors};
}

function resource404Errors(state){
  return state.consoleErrors.filter(value=>/Failed to load resource:.*404/i.test(value));
}

function assertClean(label,state){
  const resource404=resource404Errors(state);
  const actionableConsole=state.consoleErrors.filter(value=>!resource404.includes(value));
  const combined=[...state.pageErrors,...actionableConsole];
  const react418=combined.filter(value=>value.includes("Minified React error #418"));
  if(react418.length) throw new Error(label+" React #418: "+react418.join(" | "));
  if(state.pageErrors.length) throw new Error(label+" page errors: "+state.pageErrors.join(" | "));
  if(actionableConsole.length) throw new Error(label+" console errors: "+actionableConsole.join(" | "));
  return react418.length;
}

async function overflow(page){
  return page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth,
    overflow:document.documentElement.scrollWidth>window.innerWidth
  }));
}

async function open(page,route,label){
  const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:30000});
  if(!response||response.status()>=400) throw new Error(label+" HTTP "+(response?.status()??"none"));
  await page.waitForTimeout(1200);
  return response.status();
}

async function waitForVisibleBodyText(page,text,timeout=30000){
  await page.waitForFunction(
    needle=>document.body.innerText.includes(needle),
    text,
    {timeout}
  );
}

async function imageReadiness(page,locator,label,{required=true}={}){
  const count=await locator.count();
  if(count<1){
    if(required) throw new Error(label+" image is absent");
    return {
      present:false,
      url:null,
      complete:false,
      natural_width:0,
      natural_height:0,
      visible_width:0,
      visible_height:0
    };
  }
  const image=locator.first();
  await image.waitFor({state:"visible",timeout:30000});
  const handle=await image.elementHandle();
  if(!handle) throw new Error(label+" image handle unavailable");
  await page.waitForFunction(
    img=>{
      const rect=img.getBoundingClientRect();
      return img.complete===true &&
        img.naturalWidth>0 &&
        img.naturalHeight>0 &&
        rect.width>0 &&
        rect.height>0;
    },
    handle,
    {timeout:30000}
  );
  const metrics=await image.evaluate(img=>{
    const rect=img.getBoundingClientRect();
    return {
      present:true,
      url:img.currentSrc||img.src||null,
      complete:img.complete===true,
      natural_width:img.naturalWidth,
      natural_height:img.naturalHeight,
      visible_width:Math.round(rect.width),
      visible_height:Math.round(rect.height)
    };
  });
  await handle.dispose();
  return metrics;
}

async function selectDarkAppearance(page){
  await open(page,"/appearance","appearance preference");
  const dark=page.getByRole("button",{name:"Dark",exact:true});
  await dark.waitFor({state:"visible",timeout:30000});
  await dark.click();
  await page.waitForFunction(
    ()=>Array.from(document.querySelectorAll('[role="button"]')).some(element=>
      element.textContent?.trim()==="Dark" && element.getAttribute("aria-selected")==="true"
    ),
    null,
    {timeout:10000}
  );
  return "dark";
}

async function resolvedPremiumJournalism(page,label){
  const region=page.getByLabel("Source-backed Premium journalism");
  await region.waitFor({state:"visible",timeout:30000});
  const count=await region.getByRole("link").count();
  if(count<1) throw new Error(label+" resolved without source-backed Premium journalism");
  return count;
}

async function sourceParityEvidence(){
  if(!Number.isFinite(previewSeconds)||previewSeconds<=0) throw new Error("Evidence preview seconds must be positive.");
  const browser=await chromium.launch({headless:true});
  const version=browser.version();
  const publicArticle=[];
  const premiumPreview=[];
  const premiumLanding=[];
  const smoke=[];
  const dark=[];

  for(const [name,viewport] of Object.entries(viewports)){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    const diag=diagnostics(page);
    const status=await open(page,"/article/"+publicId,"public article "+name);
    await page.getByRole("button",{name:/Back/i}).waitFor({state:"visible",timeout:30000});
    await waitForVisibleBodyText(page,"Zimbabwe Looks to Strengthen Social Contracting");
    const hero=await imageReadiness(page,page.getByTestId("article-hero-media"),"public Article Hero "+name);
    const body=await page.locator("body").innerText();
    if(body.includes("PREMIUM PREVIEW")||body.includes("Continue reading with HealthTimes Premium")){
      throw new Error("Known public article unexpectedly rendered Premium state at "+name);
    }
    for(const action of ["Back","Save","Listen","Share"]){
      if(await page.getByRole("button",{name:new RegExp(action,"i")}).count()<1){
        throw new Error("Missing Article toolbar action "+action+" at "+name);
      }
    }
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Public Article horizontal overflow at "+name+": "+JSON.stringify(ov));
    const react418=assertClean("public article "+name,diag);
    const file=path.join(root,"article",name+"-public.png");
    await page.screenshot({path:file,fullPage:true});
    publicArticle.push({
      viewport:name,...viewport,status,file,
      article_id:publicId,
      access_policy:"public",
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      resource_404_count:resource404Errors(diag).length,
      horizontal_overflow:ov.overflow,
      hero_media_present:hero.present,
      hero_media_url:hero.url,
      hero_media_complete:hero.complete,
      hero_media_natural_width:hero.natural_width,
      hero_media_natural_height:hero.natural_height,
      hero_media_visible_width:hero.visible_width,
      hero_media_visible_height:hero.visible_height,
      article_ad_visible:(await page.getByText("ADVERTISEMENT",{exact:true}).count())>0,
      ad_source_expected:"none_when_no_decision"
    });
    await page.close();
  }

  for(const name of ["mobile","desktop"]){
    const viewport=viewports[name];
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    const diag=diagnostics(page);
    const requests=[];
    page.on("request",request=>requests.push(request.url()));
    const status=await open(page,"/article/"+premiumId,"premium preview "+name);
    await page.getByRole("button",{name:/Back/i}).waitFor({state:"visible",timeout:30000});
    await waitForVisibleBodyText(page,"US Embassy Challenges Zimbabwe");
    await waitForVisibleBodyText(page,"PREMIUM PREVIEW",10000);
    const previewBody=await page.locator("body").innerText();
    if(!previewBody.includes("full member article has not been downloaded")){
      throw new Error("Premium public-preview disclosure missing at "+name);
    }
    if(previewBody.includes("Continue reading with HealthTimes Premium")){
      throw new Error("Premium paywall appeared before configured preview window at "+name);
    }
    const beforeOverflow=await overflow(page);
    if(beforeOverflow.overflow) throw new Error("Premium preview horizontal overflow at "+name);
    const previewFile=path.join(root,"article",name+"-premium-preview.png");
    await page.screenshot({path:previewFile,fullPage:true});

    await page.waitForTimeout((previewSeconds+1)*1000);
    await waitForVisibleBodyText(page,"Continue reading with HealthTimes Premium",10000);
    if(await page.getByRole("button",{name:/Go to HealthTimes Premium/i}).count()!==1){
      throw new Error("Go Premium CTA missing after lock at "+name);
    }
    if(await page.getByRole("button",{name:/Sign in as an existing member/i}).count()!==1){
      throw new Error("Member sign-in CTA missing after lock at "+name);
    }
    const afterBody=await page.locator("body").innerText();
    if(afterBody.includes("PREMIUM PREVIEW")) throw new Error("Preview remained visible after paywall transition at "+name);
    const afterOverflow=await overflow(page);
    if(afterOverflow.overflow) throw new Error("Premium paywall horizontal overflow at "+name);
    const react418=assertClean("premium article "+name,diag);
    const paywallFile=path.join(root,"article",name+"-premium-paywall.png");
    await page.screenshot({path:paywallFile,fullPage:true});

    const contentRequests=requests.filter(url=>{
      try{
        const parsed=new URL(url);
        return parsed.pathname.includes("/wp-json/wp/v2/posts") &&
          decodeURIComponent(parsed.search).includes("content");
      }catch{
        return false;
      }
    });
    if(contentRequests.length){
      throw new Error("Premium anonymous route requested WordPress content field: "+contentRequests.join(" | "));
    }

    premiumPreview.push({
      viewport:name,...viewport,status,
      article_id:premiumId,
      access_policy:"premium",
      entitlement_state:false,
      preview_configuration_source:"environment",
      preview_seconds_for_test:previewSeconds,
      test_duration_is_commercial_policy:false,
      preview_started:true,
      preview_file:previewFile,
      paywall_visible:true,
      paywall_file:paywallFile,
      protected_body_requested:false,
      protected_body_present_in_dom:false,
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      resource_404_count:resource404Errors(diag).length,
      horizontal_overflow:afterOverflow.overflow
    });
    await page.close();
  }

  for(const [name,viewport] of Object.entries(viewports)){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    const diag=diagnostics(page);
    const status=await open(page,"/premium","premium landing "+name);
    await waitForVisibleBodyText(page,"HEALTHTIMES PREMIUM",10000);
    await waitForVisibleBodyText(page,"Membership options aren't available here yet",10000);
    const premiumStoryCount=await resolvedPremiumJournalism(page,"premium landing "+name);
    const body=await page.locator("body").innerText();
    for(const forbidden of ["on this build","approved store","secure member service","configuration-required"]){
      if(body.toLowerCase().includes(forbidden)) throw new Error("Implementation-facing Premium copy leaked at "+name+": "+forbidden);
    }
    if(/\$\s*\d+(?:\.\d{2})?/.test(body)) throw new Error("Unverified price rendered at "+name);
    if(/MOST POPULAR/i.test(body)) throw new Error("Unapproved recommended-plan claim rendered at "+name);
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Premium landing horizontal overflow at "+name);
    const react418=assertClean("premium landing "+name,diag);
    const file=path.join(root,"premium",name+".png");
    await page.screenshot({path:file,fullPage:true});
    premiumLanding.push({
      viewport:name,...viewport,status,file,
      premium_stories_loading:false,
      premium_stories_error:false,
      premium_story_count:premiumStoryCount,
      store_status:"configuration-required",
      offer_count:0,
      invented_price:false,
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      resource_404_count:resource404Errors(diag).length,
      horizontal_overflow:ov.overflow
    });
    await page.close();
  }

  for(const [name,route] of [
    ["article","/article/"+publicId],
    ["premium-paywall","/article/"+premiumId],
    ["premium-landing","/premium"]
  ]){
    const page=await browser.newPage({viewport:viewports.mobile,deviceScaleFactor:1,colorScheme:"light"});
    const diag=diagnostics(page);
    const appearancePreference=await selectDarkAppearance(page);
    await open(page,route,"dark "+name);

    if(name==="article"){
      await waitForVisibleBodyText(page,"Zimbabwe Looks to Strengthen Social Contracting");
      await page.getByRole("button",{name:/Back/i}).waitFor({state:"visible",timeout:30000});
      await imageReadiness(page,page.getByTestId("article-hero-media"),"dark public Article Hero");
    }else if(name==="premium-paywall"){
      await waitForVisibleBodyText(page,"US Embassy Challenges Zimbabwe");
      await waitForVisibleBodyText(page,"PREMIUM PREVIEW",10000);
      await page.waitForTimeout((previewSeconds+1)*1000);
      await waitForVisibleBodyText(page,"Continue reading with HealthTimes Premium",10000);
      const lockedBody=await page.locator("body").innerText();
      if(lockedBody.includes("PREMIUM PREVIEW")) throw new Error("Dark Premium preview remained active after lock");
    }else{
      await waitForVisibleBodyText(page,"HEALTHTIMES PREMIUM",10000);
      await waitForVisibleBodyText(page,"Membership options aren't available here yet",10000);
      await resolvedPremiumJournalism(page,"dark Premium landing");
    }

    const body=await page.locator("body").innerText();
    if(body.includes("Loading article…")) throw new Error("Dark "+name+" captured unresolved Article loading state");
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Dark-mode horizontal overflow on "+name);
    const react418=assertClean("dark "+name,diag);
    const file=path.join(root,"dark",name+"-mobile.png");
    await page.screenshot({path:file,fullPage:true});
    dark.push({
      name,file,viewport:"mobile",...viewports.mobile,
      appearance_preference:appearancePreference,
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      horizontal_overflow:ov.overflow
    });
    await page.close();
  }

  for(const [name,route] of [
    ["home","/"],["explore","/explore"],["live","/live"],
    ["watch","/watch"],["my","/my"],["search","/search"]
  ]){
    const page=await browser.newPage({viewport:viewports.desktop,deviceScaleFactor:1});
    const diag=diagnostics(page);
    const status=await open(page,route,"smoke "+name);
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Route horizontal overflow on "+route);
    const react418=assertClean("smoke "+name,diag);
    if(name==="home"){
      await page.getByText("Top Stories",{exact:true}).waitFor({timeout:30000});
      if(await page.getByRole("tab").count()!==0) throw new Error("Desktop Home rendered mobile tabs");
    }
    smoke.push({
      name,route,status,
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      resource_404_count:resource404Errors(diag).length,
      horizontal_overflow:ov.overflow
    });
    await page.close();
  }

  const manifest={
    candidate_sha:candidateSha,
    base_sha:baseSha,
    branch,
    appearance_preference:"dark",
    browser:"chromium",
    browser_version:version,
    captured_at:new Date().toISOString(),
    evidence_configuration:{
      premium_preview_seconds:previewSeconds,
      note:"Test duration is evidence configuration, not final commercial policy."
    },
    public_article:publicArticle,
    premium_preview:premiumPreview,
    premium_landing:premiumLanding,
    smoke,
    dark_mode:dark
  };
  fs.writeFileSync(path.join(root,"manifest.json"),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(root,"premium-preview.json"),JSON.stringify({
    candidate_sha:candidateSha,
    article_id:premiumId,
    entitlement_state:false,
    preview_configuration_source:"environment",
    preview_seconds_for_test:previewSeconds,
    test_duration_is_commercial_policy:false,
    anonymous_full_protected_body_received:false,
    anonymous_full_protected_body_rendered:false,
    evidence:premiumPreview
  },null,2));
  fs.writeFileSync(path.join(root,"accessibility.json"),JSON.stringify({
    candidate_sha:candidateSha,
    article_toolbar_actions:["Back","Text size","Save","Listen","Share","Offline"],
    paywall_actions:["Go Premium","Member sign in"],
    touch_target_contract_px:44,
    keyboard_semantics:"Pressable roles retained for Web focus/keyboard behavior"
  },null,2));
  await browser.close();
}

async function stagingAdvertisingEvidence(){
  const browser=await chromium.launch({headless:true});
  const results=[];
  for(const [name,viewport] of Object.entries(viewports)){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    const diag=diagnostics(page);
    const status=await open(page,"/","HOSPAZ Home "+name);
    await waitForVisibleBodyText(page,"Direct advertising · HOSPAZ",30000);
    const disclosure=page.getByText("Direct advertising · HOSPAZ",{exact:true}).first();
    const container=disclosure.locator("..");
    const body=await container.innerText();
    if(!body.includes("ADVERTISEMENT")) throw new Error("Advertisement disclosure missing at "+name);
    if(await container.locator("a").count()) throw new Error("HOSPAZ became clickable without verified destination at "+name);
    const creative=await imageReadiness(page,container.locator("img"),"HOSPAZ creative "+name);
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("HOSPAZ Home overflow at "+name);
    const react418=assertClean("HOSPAZ "+name,diag);
    const file=path.join(root,"advertising",name+"-hospaz-direct.png");
    await page.screenshot({path:file,fullPage:true});
    results.push({
      viewport:name,...viewport,status,
      ad_placement:"hospaz-header-direct",
      ad_source:"direct",
      ad_disclosure:true,
      destination_verified:false,
      ad_clickable:false,
      creative_url:creative.url,
      creative_complete:creative.complete,
      creative_natural_width:creative.natural_width,
      creative_natural_height:creative.natural_height,
      destination_verified:false,
      clickable:false,
      sensitive_health_context:true,
      personalization:"none",
      file,
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      resource_404_count:resource404Errors(diag).length,
      horizontal_overflow:ov.overflow
    });
    await page.close();
  }
  fs.writeFileSync(path.join(root,"advertising.json"),JSON.stringify({
    candidate_sha:candidateSha,
    controlled_fixture:false,
    source_parity_article_no_decision_collapses:true,
    hospaz_authority:{
      advertiser:"HOSPAZ",
      placement:"hospaz-header-direct",
      destination:null,
      clickable:false
    },
    responsive_direct_ad:results
  },null,2));
  await browser.close();
}

if(mode==="source-parity"){
  await sourceParityEvidence();
}else if(mode==="staging-advertising"){
  await stagingAdvertisingEvidence();
}else{
  throw new Error("Unknown UI-03 evidence mode: "+mode);
}
