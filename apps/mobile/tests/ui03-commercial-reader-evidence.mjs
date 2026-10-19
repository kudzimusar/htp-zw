import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base="http://127.0.0.1:4174";
const candidateSha=process.env.EXPECTED_SHA ?? "";
const baseSha=process.env.UI03_BASE_SHA ?? "";
const branch=process.env.BRANCH_NAME ?? "feat/ui-wf02c-premium-landing-convergence";
const previewSeconds=20;
const publicId="source-ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis";
const publicTitle="Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt";
const premiumId="source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
const premiumTitle="Zimbabwe Looks to Strengthen Social Contracting";
const premiumReferencePath="/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/";
const viewports={
  mobile:{width:390,height:844},
  tablet:{width:834,height:1112},
  desktop:{width:1440,height:1000}
};

const mode=process.argv[2] ?? "source-parity";
const stagingUrl=process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const stagingKey=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

async function stagingRpc(name,args={}){
  if(!/^https:\/\//i.test(stagingUrl) || !stagingKey){
    throw new Error("Staging public configuration is unavailable for "+name);
  }
  const response=await fetch(stagingUrl.replace(/\/$/,"")+"/rest/v1/rpc/"+encodeURIComponent(name),{
    method:"POST",
    headers:{
      apikey:stagingKey,
      Authorization:"Bearer "+stagingKey,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(args)
  });
  const body=await response.text();
  if(!response.ok) throw new Error(name+" returned HTTP "+response.status+": "+body);
  return body ? JSON.parse(body) : null;
}

function commercialState(value){
  const normalized=String(value ?? "UNKNOWN").trim().toUpperCase();
  return normalized || "UNKNOWN";
}

function provenCommercialValue(state,value){
  return state==="KNOWN" && value != null && String(value).trim() ? String(value).trim() : null;
}

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

async function waitForBodyTextAbsent(page,text,timeout=30000){
  await page.waitForFunction(
    needle=>!document.body.innerText.includes(needle),
    text,
    {timeout}
  );
}

async function imageReadiness(page,locator,label,{required=true,boundsLocator=null}={}){
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
  await image.waitFor({state:"attached",timeout:30000});
  const handle=await image.elementHandle();
  if(!handle) throw new Error(label+" image handle unavailable");
  await page.waitForFunction(
    img=>img.complete===true && img.naturalWidth>0 && img.naturalHeight>0,
    handle,
    {timeout:30000}
  );
  const rendered=boundsLocator ? boundsLocator.first() : image;
  await rendered.waitFor({state:"visible",timeout:30000});
  const metrics=await image.evaluate((img)=>{
    return {
      present:true,
      url:img.currentSrc||img.src||null,
      complete:img.complete===true,
      natural_width:img.naturalWidth,
      natural_height:img.naturalHeight
    };
  });
  const bounds=await rendered.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return {
      visible_width:Math.round(rect.width),
      visible_height:Math.round(rect.height)
    };
  });
  await handle.dispose();
  if(bounds.visible_width<=0 || bounds.visible_height<=0){
    throw new Error(label+" rendered bounds are zero");
  }
  return {...metrics,...bounds};
}

async function selectDarkAppearance(page){
  await open(page,"/appearance","appearance preference");
  const dark=page.getByRole("button",{name:"Dark",exact:true});
  await dark.waitFor({state:"visible",timeout:30000});
  await dark.click();
  await page.waitForFunction(
    ()=>{
      const buttons=Array.from(document.querySelectorAll('[role="button"]'));
      const darkButton=buttons.find(element=>element.textContent?.trim()==="Dark");
      const lightButton=buttons.find(element=>element.textContent?.trim()==="Light");
      if(!darkButton||!lightButton) return false;
      const darkBackground=getComputedStyle(darkButton).backgroundColor;
      const inactiveBackground=getComputedStyle(lightButton).backgroundColor;
      return darkBackground==="rgb(243, 247, 250)" && inactiveBackground==="rgb(11, 22, 34)";
    },
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
  const images=region.locator("img:visible");
  const imageCount=await images.count();
  for(let index=0;index<imageCount;index+=1){
    const image=images.nth(index);
    await image.waitFor({state:"visible",timeout:30000});
    const handle=await image.elementHandle();
    if(!handle) throw new Error(label+" Premium journalism image handle unavailable at index "+index);
    try{
      await page.waitForFunction(
        img=>img.complete===true && img.naturalWidth>0 && img.naturalHeight>0,
        handle,
        {timeout:30000}
      );
    }catch{
      throw new Error(label+" Premium journalism image did not settle at index "+index);
    }finally{
      await handle.dispose();
    }
  }
  return count;
}

async function loadAcceptedPremiumTeaserAuthority(){
  const url=String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/,"");
  const key=String(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "");
  if(!/^https:\/\/gcdohgbmqhqwydgaxrcr\.supabase\.co$/.test(url)) throw new Error("Accepted teaser Supabase URL unavailable");
  if(!/^sb_publishable_/.test(key)) throw new Error("Accepted teaser publishable key unavailable");

  const response=await fetch(url+"/rest/v1/rpc/ag05_public_story_teaser_document",{
    method:"POST",
    headers:{
      apikey:key,
      Accept:"application/json",
      "Content-Type":"application/json",
      "x-healthtimes-client":"ui03-commercial-reader-certification"
    },
    body:JSON.stringify({p_path:premiumReferencePath})
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok || !payload) throw new Error("Accepted Premium teaser authority unavailable");
  if(String(payload.source_id)!=="33190") throw new Error("Unexpected Premium source authority");
  if(payload.access_policy!=="premium_marker_review") throw new Error("Unexpected Premium access authority");
  if(payload.body_html!==null) throw new Error("Premium teaser authority exposed protected body");
  const teaser=String(payload.premium_teaser_html ?? "").trim();
  const paragraphs=teaser.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi) ?? [];
  if(paragraphs.length!==1 || paragraphs[0].trim()!==teaser) throw new Error("Premium teaser authority is not exactly one paragraph");
  return payload;
}

async function installPremiumAuthorityRoutes(page,payload){
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
      body:JSON.stringify(payload)
    });
  });
}

async function sourceParityEvidence(){
  if(previewSeconds!==20) throw new Error("UI-03 evidence must preserve the frozen 20-second policy.");
  const premiumAuthority=await loadAcceptedPremiumTeaserAuthority();
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
    await page.locator('[aria-label="Back"]:visible').first().waitFor({state:"visible",timeout:30000});
    await waitForVisibleBodyText(page,publicTitle);
    const heroWrapper=page.locator('[data-testid="article-hero-media"]:visible').first();
    const hero=await imageReadiness(page,heroWrapper.locator("img"),"public Article Hero "+name,{boundsLocator:heroWrapper});
    const body=await page.locator("body").innerText();
    if(body.includes("Loading article…")) throw new Error("Public Article captured loading state at "+name);
    if(body.includes("Article not found.")) throw new Error("Public Article captured not-found state at "+name);
    if(body.includes("PREMIUM PREVIEW")||body.includes("Continue reading with HealthTimes Premium")){
      throw new Error("Known public article unexpectedly rendered Premium state at "+name);
    }
    for(const action of ["Back","Save","Listen","Share"]){
      if(await page.getByRole("button",{name:new RegExp(action,"i")}).and(page.locator(":visible")).count()<1){
        throw new Error("Missing Article toolbar action "+action+" at "+name);
      }
    }
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Public Article horizontal overflow at "+name+": "+JSON.stringify(ov));
    const react418=assertClean("public article "+name,diag);
    const file=path.join(root,"article",name+"-public.png");
    await page.screenshot({path:file,fullPage:true});
    if(name==="mobile"){
      fs.copyFileSync(file,path.join(root,"article","public-article-regression.png"));
    }
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
      article_ad_visible:(await page.getByText("ADVERTISEMENT",{exact:true}).and(page.locator(":visible")).count())>0,
      ad_source_expected:"none_when_no_decision"
    });
    await page.close();
  }

  for(const [name,viewport] of Object.entries(viewports)){
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    const page=await context.newPage();
    const diag=diagnostics(page);
    await installPremiumAuthorityRoutes(page,premiumAuthority);
    const requests=[];
    page.on("request",request=>requests.push(request.url()));
    const status=await open(page,"/article/"+premiumId,"premium preview "+name);
    await page.locator('[aria-label="Back"]:visible').first().waitFor({state:"visible",timeout:30000});
    await waitForVisibleBodyText(page,premiumTitle);
    await waitForVisibleBodyText(page,"PREMIUM PREVIEW",10000);
    await page.locator('[data-testid="premium-teaser-paragraph"]:visible').first().waitFor({state:"visible",timeout:10000});
    await page.locator('[data-testid="premium-preview-notice"]:visible').first().waitFor({state:"visible",timeout:10000});
    const previewBody=await page.locator("body").innerText();
    if(previewBody.includes("Loading article…")||previewBody.includes("Article not found.")){
      throw new Error("Premium preview captured unresolved state at "+name);
    }
    if(!previewBody.includes("full member article has not been downloaded")){
      throw new Error("Premium public-preview disclosure missing at "+name);
    }
    if(previewBody.includes("Continue reading with HealthTimes Premium")){
      throw new Error("Premium paywall appeared before configured preview window at "+name);
    }
    const beforeOverflow=await overflow(page);
    if(beforeOverflow.overflow) throw new Error("Premium preview horizontal overflow at "+name);
    const previewNotice=page.locator('[data-testid="premium-preview-notice"]:visible').first();
    await previewNotice.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const previewFile=path.join(root,"article",name+"-premium-preview.png");
    await page.screenshot({path:previewFile,fullPage:false});
    if(name==="mobile"){
      fs.copyFileSync(previewFile,path.join(root,"article","premium-preview-initial.png"));
    }

    await waitForVisibleBodyText(page,"Your Premium preview is ending soon",20000);
    await waitForVisibleBodyText(page,"Members can continue with the full article after the preview ends.",10000);
    const warningNotice=page.locator('[data-testid="premium-preview-notice"]:visible').first();
    await warningNotice.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const warningFile=path.join(root,"article",name+"-premium-warning.png");
    await page.screenshot({path:warningFile,fullPage:false});
    if(name==="mobile"){
      fs.copyFileSync(warningFile,path.join(root,"article","premium-preview-warning.png"));
    }

    await waitForVisibleBodyText(page,"Continue reading with HealthTimes Premium",15000);
    const supplementalPrompt=page.locator('[data-testid="premium-subscription-prompt"]:visible').first();
    await supplementalPrompt.waitFor({state:"visible",timeout:10000});
    await waitForVisibleBodyText(page,"Keep reading with HealthTimes Premium",10000);
    await waitForVisibleBodyText(page,"Explore Premium",10000);
    await page.waitForTimeout(700);
    const promptFile=path.join(root,"article",name+"-premium-subscription-prompt.png");
    await page.screenshot({path:promptFile,fullPage:false});
    if(name==="mobile"){
      fs.copyFileSync(promptFile,path.join(root,"article","premium-subscription-prompt.png"));
    }

    await supplementalPrompt.getByRole("button",{name:"Not now",exact:true}).click();
    await supplementalPrompt.waitFor({state:"hidden",timeout:10000});

    if(await page.getByRole("button",{name:/Go to HealthTimes Premium/i}).and(page.locator(":visible")).count()!==1){
      throw new Error("Go Premium CTA missing after lock at "+name);
    }
    if(await page.getByRole("button",{name:/Sign in as an existing member/i}).and(page.locator(":visible")).count()!==1){
      throw new Error("Member sign-in CTA missing after lock at "+name);
    }
    const afterBody=await page.locator("body").innerText();
    if(afterBody.includes("PREMIUM PREVIEW")) throw new Error("Preview remained visible after paywall transition at "+name);
    const afterOverflow=await overflow(page);
    if(afterOverflow.overflow) throw new Error("Premium paywall horizontal overflow at "+name);
    const paywall=page.locator('[data-testid="premium-article-paywall"]:visible').first();
    await paywall.waitFor({state:"visible",timeout:10000});
    await paywall.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const react418=assertClean("premium article "+name,diag);
    const paywallFile=path.join(root,"article",name+"-premium-paywall.png");
    await page.screenshot({path:paywallFile,fullPage:false});
    if(name==="mobile"){
      fs.copyFileSync(paywallFile,path.join(root,"article","premium-paywall-expired.png"));
    }

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
      preview_configuration_source:"owner-policy",
      preview_seconds_for_test:previewSeconds,
      test_duration_is_commercial_policy:true,
      preview_started:true,
      preview_file:previewFile,
      warning_visible:true,
      warning_file:warningFile,
      prompt_visible:true,
      prompt_file:promptFile,
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
    await context.close();
  }

  for(const [name,viewport] of Object.entries(viewports)){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    const diag=diagnostics(page);
    const status=await open(page,"/premium","premium landing "+name);
    await waitForVisibleBodyText(page,"HEALTHTIMES PREMIUM",10000);
    await page.locator('[data-testid="premium-landing-masthead"]:visible').first().waitFor({state:"visible",timeout:10000});
    await page.locator('[data-testid="premium-member-access-card"]:visible').first().waitFor({state:"visible",timeout:10000});
    await page.locator('[data-testid="premium-commerce-unavailable"]:visible').first().waitFor({state:"visible",timeout:10000});
    await waitForVisibleBodyText(page,"Membership options aren't available here yet",10000);
    await waitForBodyTextAbsent(page,"Checking member access…",30000);
    await waitForVisibleBodyText(page,"Already a member?",10000);
    await waitForVisibleBodyText(page,"Sign in as existing member",10000);
    const premiumStoryCount=await resolvedPremiumJournalism(page,"premium landing "+name);
    const body=await page.locator("body").innerText();
    for(const forbidden of ["on this build","approved store","secure member service","configuration-required"]){
      if(body.toLowerCase().includes(forbidden)) throw new Error("Implementation-facing Premium copy leaked at "+name+": "+forbidden);
    }
    const membershipOfferSurfaces=page.locator(
      '[aria-label="Available HealthTimes Premium web membership"], [aria-label="Available HealthTimes Premium plans"]'
    );
    if(await membershipOfferSurfaces.count()) throw new Error("Unverified membership offer rendered at "+name);
    if(/MOST POPULAR/i.test(body)) throw new Error("Unapproved recommended-plan claim rendered at "+name);
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Premium landing horizontal overflow at "+name);
    const react418=assertClean("premium landing "+name,diag);
    const file=path.join(root,"premium",name+".png");
    await page.screenshot({path:file,fullPage:true});
    fs.copyFileSync(file,path.join(root,"premium","premium-"+name+".png"));
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
    const context=await browser.newContext({viewport:viewports.mobile,deviceScaleFactor:1,colorScheme:"light"});
    const page=await context.newPage();
    const diag=diagnostics(page);
    const appearancePreference=await selectDarkAppearance(page);
    if(name==="premium-paywall") await installPremiumAuthorityRoutes(page,premiumAuthority);
    await open(page,route,"dark "+name);

    if(name==="article"){
      await waitForVisibleBodyText(page,publicTitle);
      await page.locator('[aria-label="Back"]:visible').first().waitFor({state:"visible",timeout:30000});
      const heroWrapper=page.locator('[data-testid="article-hero-media"]:visible').first();
      await imageReadiness(page,heroWrapper.locator("img"),"dark public Article Hero",{boundsLocator:heroWrapper});
    }else if(name==="premium-paywall"){
      await waitForVisibleBodyText(page,premiumTitle);
      await waitForVisibleBodyText(page,"PREMIUM PREVIEW",10000);
      await page.waitForTimeout((previewSeconds+1)*1000);
      await waitForVisibleBodyText(page,"Continue reading with HealthTimes Premium",10000);
      const supplementalPrompt=page.locator('[data-testid="premium-subscription-prompt"]:visible').first();
      if(await supplementalPrompt.count()){
        await supplementalPrompt.getByRole("button",{name:"Not now",exact:true}).click();
        await supplementalPrompt.waitFor({state:"hidden",timeout:10000});
      }
      const lockedBody=await page.locator("body").innerText();
      if(lockedBody.includes("PREMIUM PREVIEW")) throw new Error("Dark Premium preview remained active after lock");
    }else{
      await waitForVisibleBodyText(page,"HEALTHTIMES PREMIUM",10000);
      await waitForVisibleBodyText(page,"Membership options aren't available here yet",10000);
      await waitForBodyTextAbsent(page,"Checking member access…",30000);
      await resolvedPremiumJournalism(page,"dark Premium landing");
    }

    const body=await page.locator("body").innerText();
    if(body.includes("Loading article…")) throw new Error("Dark "+name+" captured unresolved Article loading state");
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("Dark-mode horizontal overflow on "+name);
    const react418=assertClean("dark "+name,diag);
    const file=path.join(root,"dark",name+"-mobile.png");
    await page.screenshot({path:file,fullPage:true});
    if(name==="premium-landing"){
      fs.copyFileSync(file,path.join(root,"premium","premium-dark-mobile.png"));
      fs.copyFileSync(file,path.join(root,"dark","premium-dark-mobile.png"));
    }
    dark.push({
      name,file,viewport:"mobile",...viewports.mobile,
      appearance_preference:appearancePreference,
      React_418_count:react418,
      pageerror_count:diag.pageErrors.length,
      console_error_count:diag.consoleErrors.length,
      horizontal_overflow:ov.overflow
    });
    await context.close();
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
      await page.getByText("Top Stories",{exact:true}).first().waitFor({timeout:30000});
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
      source:"owner-policy",
      note:"20 seconds is the frozen owner product policy; evidence does not shorten it."
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
    preview_configuration_source:"owner-policy",
    preview_seconds_for_test:previewSeconds,
    test_duration_is_commercial_policy:true,
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
  const rawAuthority=await stagingRpc("ag05_hospaz_direct_ad_preview",{});
  if(!rawAuthority) throw new Error("HOSPAZ staging authority is absent");
  const destinationState=commercialState(rawAuthority.destination_url_state);
  const scheduleState=commercialState(rawAuthority.schedule_state);
  const placementConditionsState=commercialState(rawAuthority.placement_conditions_state);
  const destinationUrl=provenCommercialValue(destinationState,rawAuthority.destination_url);
  const scheduleValue=provenCommercialValue(scheduleState,rawAuthority.schedule);
  const placementConditionsValue=provenCommercialValue(placementConditionsState,rawAuthority.placement_conditions);
  const expectedClickable=Boolean(destinationUrl && /^https:\/\//i.test(destinationUrl));
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
    const linkCount=await container.locator("a").count();
    if((linkCount>0)!==expectedClickable){
      throw new Error("HOSPAZ clickability diverged from staging destination authority at "+name);
    }
    const creative=await imageReadiness(page,container.locator("img"),"HOSPAZ creative "+name,{boundsLocator:container});
    const ov=await overflow(page);
    if(ov.overflow) throw new Error("HOSPAZ Home overflow at "+name);
    const react418=assertClean("HOSPAZ "+name,diag);
    const file=path.join(root,"advertising",name+"-hospaz-direct.png");
    await page.screenshot({path:file,fullPage:true});
    fs.copyFileSync(file,path.join(root,"advertising","hospaz-"+name+".png"));
    results.push({
      viewport:name,...viewport,status,
      placement:"hospaz-header-direct",
      ad_placement:"hospaz-header-direct",
      ad_source:"direct",
      disclosure:true,
      ad_disclosure:true,
      ad_clickable:false,
      creative_url:creative.url,
      creative_complete:creative.complete,
      creative_natural_width:creative.natural_width,
      creative_natural_height:creative.natural_height,
      destination_state:destinationState,
      destination_verified:destinationUrl!==null,
      destination_url:destinationUrl,
      clickable:expectedClickable,
      schedule_state:scheduleState,
      schedule_value:scheduleValue,
      placement_conditions_state:placementConditionsState,
      placement_conditions_value:placementConditionsValue,
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
      advertiser:String(rawAuthority.advertiser || "HOSPAZ"),
      placement:String(rawAuthority.placement_key || "hospaz-header-direct"),
      source_attachment_id:rawAuthority.current_source_attachment_id == null ? null : String(rawAuthority.current_source_attachment_id),
      destination_state:destinationState,
      destination:destinationUrl,
      clickable:expectedClickable,
      schedule_state:scheduleState,
      schedule:scheduleValue,
      placement_conditions_state:placementConditionsState,
      placement_conditions:placementConditionsValue
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
