import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import pkg from "../../package.json" with { type: "json" };

const PUBLIC_URL=(process.env.PUBLIC_URL||"https://kudzimusar.github.io/htp-zw/").replace(/\/+$/,"")+"/";
const TARGET_DEPLOYMENT_WRAPPER=process.env.TARGET_DEPLOYMENT_WRAPPER||"c462b4cdf10bf0072cac48bbf163bb567428ce77";
const ACCEPTED_UI01_EXECUTABLE=process.env.ACCEPTED_UI01_EXECUTABLE||"c233377d71a6758d080ee3fffbd7c8731daf333a";
const TOOLING_SHA=process.env.CERTIFICATION_TOOLING_SHA||process.env.GITHUB_SHA||"unknown";
const RUN_ID=process.env.GITHUB_RUN_ID||"local";
const ROOT=process.env.ARTIFACT_DIR||"artifacts/ui06/ui01-screen1-live-cert";
const TIMEOUT=30000;
const OVERFLOW_TOLERANCE=8;
const GAP_BLOCKER_PX=220;
const VIEWS=[
  {key:"mobile",width:390,height:844},
  {key:"tablet",width:834,height:1112},
  {key:"desktop",width:1440,height:1000}
];

const consoleEvents=[];
const pageErrors=[];
const requestFailed=[];
const httpErrors=[];
const imageResponses=[];
const maxresFailures=[];
const serviceWorkerObservations=[];
const findings=[];
const results={};
let buildInfo=null;
let browserVersion="unknown";
let firstBlocker=null;
let liveSourcePosts=null;

const now=()=>new Date().toISOString();
const mkdir=(p)=>fs.mkdir(p,{recursive:true});
const writeJson=async(p,v)=>{await mkdir(path.dirname(p));await fs.writeFile(p,JSON.stringify(v,null,2)+"\n","utf8");};
const writeText=async(p,v)=>{await mkdir(path.dirname(p));await fs.writeFile(p,v,"utf8");};
const clean=(s)=>String(s||"").replace(/\s+/g," ").trim();
const pageRoute=(page)=>{try{return new URL(page.url()).pathname;}catch{return page.url();}};
const viewLabel=(v)=>v.key+" "+v.width+"x"+v.height;
const htmlDecode=(s)=>String(s||"")
  .replace(/&#8217;|&rsquo;/g,"’").replace(/&#8216;|&lsquo;/g,"‘")
  .replace(/&#8220;|&ldquo;/g,"“").replace(/&#8221;|&rdquo;/g,"”")
  .replace(/&#038;|&amp;/g,"&").replace(/&#8211;|&ndash;/g,"–").replace(/&#8212;|&mdash;/g,"—")
  .replace(/&nbsp;/g," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

function addFinding(category,severity,message,evidence={}){
  findings.push({category,severity,message,evidence,captured_at:now()});
}
function block(category,severity,message,evidence={}){
  addFinding(category,severity,message,evidence);
  if(!firstBlocker) firstBlocker={category,severity,message,evidence};
}

async function identityGate(){
  const url=PUBLIC_URL+"build-info.json?ui06="+Date.now();
  const response=await fetch(url,{headers:{accept:"application/json","cache-control":"no-cache, no-store"},redirect:"follow"});
  const body=await response.text();
  await writeText(path.join(ROOT,"build-info.json"),body.endsWith("\n")?body:body+"\n");
  if(!response.ok){
    block("DEPLOYMENT DEFECT","P1","DEPLOYMENT CUSTODY REGRESSION — build-info.json HTTP "+response.status,{url,status:response.status});
    return;
  }
  try{buildInfo=JSON.parse(body);}catch{
    block("DEPLOYMENT DEFECT","P1","DEPLOYMENT CUSTODY REGRESSION — invalid build-info.json",{url,body});
    return;
  }
  const expected={sha:TARGET_DEPLOYMENT_WRAPPER,presentation:"apps/mobile",service_mode:"source-parity",base_path:"/htp-zw"};
  const mismatch=Object.entries(expected).filter(([k,v])=>buildInfo[k]!==v).map(([k,v])=>({field:k,expected:v,actual:buildInfo[k]}));
  if(mismatch.length) block("DEPLOYMENT DEFECT","P1","DEPLOYMENT CUSTODY REGRESSION — live build-info does not match target wrapper",{mismatch,buildInfo});
}

async function fetchLiveSourcePosts(){
  const endpoint="https://healthtimes.co.zw/wp-json/wp/v2/posts?per_page=20&status=publish&orderby=date&order=desc&_embed=1";
  try{
    const response=await fetch(endpoint,{headers:{accept:"application/json","cache-control":"no-cache"}});
    if(!response.ok) return {endpoint,status:response.status,posts:[]};
    const posts=await response.json();
    return {endpoint,status:response.status,posts:Array.isArray(posts)?posts:[]};
  }catch(error){
    return {endpoint,status:null,error:String(error),posts:[]};
  }
}

function attachListeners(page,v){
  page.on("pageerror",error=>{
    const item={captured_at:now(),viewport:v.key,route:pageRoute(page),message:error.message||String(error),stack:error.stack||null};
    pageErrors.push(item);
    const lower=item.message.toLowerCase();
    if(lower.includes("minified react error #418")||lower.includes("react error #418")){
      block("RUNTIME DEFECT","P1","React #418 observed at "+viewLabel(v),item);
    } else {
      block("RUNTIME DEFECT","P1","Uncaught page exception at "+viewLabel(v),item);
    }
  });
  page.on("console",message=>{
    if(!["error","warning"].includes(message.type())) return;
    const item={captured_at:now(),viewport:v.key,route:pageRoute(page),type:message.type(),text:message.text(),location:message.location()};
    consoleEvents.push(item);
    const lower=item.text.toLowerCase();
    if(lower.includes("minified react error #418")||lower.includes("react error #418")){
      block("RUNTIME DEFECT","P1","React #418 observed in console at "+viewLabel(v),item);
    }
  });
  page.on("requestfailed",request=>{
    const item={captured_at:now(),viewport:v.key,route:pageRoute(page),url:request.url(),method:request.method(),resource_type:request.resourceType(),failure:request.failure()};
    requestFailed.push(item);
    if(item.url.includes("maxresdefault.jpg")){
      const m=item.url.match(/\/vi\/([^/]+)\/maxresdefault\.jpg/i);
      maxresFailures.push({...item,provider_id:m?m[1]:null,kind:"requestfailed"});
    }
  });
  page.on("response",response=>{
    const req=response.request();
    if(req.resourceType()==="image"){
      imageResponses.push({captured_at:now(),viewport:v.key,route:pageRoute(page),url:response.url(),status:response.status(),from_service_worker:response.fromServiceWorker()});
    }
    if(response.status()>=400){
      const item={captured_at:now(),viewport:v.key,route:pageRoute(page),url:response.url(),status:response.status(),resource_type:req.resourceType(),method:req.method()};
      httpErrors.push(item);
      if(item.url.includes("maxresdefault.jpg")){
        const m=item.url.match(/\/vi\/([^/]+)\/maxresdefault\.jpg/i);
        maxresFailures.push({...item,provider_id:m?m[1]:null,kind:"http"});
      }
    }
  });
}

async function homeReady(page,v){
  let topStories=false;
  try{
    await page.getByText("Top Stories",{exact:true}).waitFor({state:"visible",timeout:TIMEOUT});
    topStories=true;
  }catch{}
  const loading=await page.getByText("Loading Home…",{exact:true}).isVisible().catch(()=>false);
  if(!topStories||loading){
    block("RUNTIME DEFECT","P1","Home failed to resolve beyond Loading Home… at "+viewLabel(v),{top_stories_visible:topStories,loading_visible:loading});
  }
  return {resolved:topStories&&!loading,loading_visible:loading};
}

async function visibleCount(locator){
  let n=0;
  for(let i=0;i<await locator.count();i++) if(await locator.nth(i).isVisible().catch(()=>false)) n++;
  return n;
}
async function box(locator){return locator.boundingBox().catch(()=>null);}

async function shellEvidence(page,v){
  const brand=page.getByRole("button",{name:"HealthTimes Home",exact:true});
  const brandVisible=await brand.isVisible().catch(()=>false);
  const brandBox=brandVisible?await box(brand):null;
  const envText="DEVELOPMENT • READ-ONLY PUBLIC SOURCE PARITY • NOT MIGRATION COMPLETE";
  const environmentBannerVisible=await page.getByText(envText,{exact:true}).isVisible().catch(()=>false);

  const search=page.getByRole("button",{name:"Search HealthTimes",exact:true});
  const alerts=page.getByRole("button",{name:"Notifications",exact:true});
  const premium=page.getByRole("button",{name:"HealthTimes Premium",exact:true});
  const edition=page.locator('[role="button"][aria-label^="Edition "]');
  const controls={search:await search.isVisible().catch(()=>false),alerts:await alerts.isVisible().catch(()=>false),premium:await premium.isVisible().catch(()=>false),edition:await edition.first().isVisible().catch(()=>false)};
  const counts={
    search:await visibleCount(search),
    alerts:await visibleCount(alerts),
    premium:await visibleCount(premium),
    edition:await visibleCount(edition)
  };
  const boxes={brand:brandBox,search:await box(search),alerts:await box(alerts),premium:await box(premium),edition:await box(edition.first())};
  const centers=Object.values(boxes).filter(Boolean).map(b=>b.y+b.height/2);
  const sameHeaderBand=centers.length>=4 && Math.max(...centers)-Math.min(...centers)<36;
  const duplicateUtilityRow=counts.search>1||counts.alerts>1||counts.premium>1||!sameHeaderBand;
  const headerHeight=await page.evaluate(()=>{
    const brand=document.querySelector('[aria-label="HealthTimes Home"]');
    if(!brand) return null;
    let node=brand.parentElement;
    while(node&&node!==document.body){
      const r=node.getBoundingClientRect();
      if(r.width>=innerWidth*0.85&&r.height>=44&&r.height<=180) return r.height;
      node=node.parentElement;
    }
    return null;
  }).catch(()=>null);
  const compactMasthead=brandVisible && (headerHeight===null||headerHeight<=100);

  if(environmentBannerVisible) block("VISUAL DESIGN GAP","P2","UI-01 shell regression — environment banner is visibly present at "+viewLabel(v));
  if(!brandVisible||!compactMasthead) block("VISUAL DESIGN GAP","P2","Compact HealthTimes masthead not proven at "+viewLabel(v),{brandVisible,headerHeight});
  if(!Object.values(controls).every(Boolean)) block("VISUAL DESIGN GAP","P2","Reader utilities are not all discoverable at "+viewLabel(v),{controls});
  if(duplicateUtilityRow) block("VISUAL DESIGN GAP","P2","Separate/duplicated utility-row behavior detected at "+viewLabel(v),{counts,sameHeaderBand,boxes});

  return {environment_banner_visible:environmentBannerVisible,compact_masthead:compactMasthead,masthead_height:headerHeight,utility_controls:controls,utility_counts:counts,utility_same_header_band:sameHeaderBand,duplicate_utility_row:duplicateUtilityRow};
}

async function filterEvidence(page,v){
  const rail=page.getByLabel("Editorial filters");
  const railVisible=await rail.isVisible().catch(()=>false);
  const buttons=rail.getByRole("button");
  const items=[];
  for(let i=0;i<await buttons.count();i++){
    const b=buttons.nth(i);
    if(!(await b.isVisible().catch(()=>false))) continue;
    const bb=await box(b);
    items.push({label:clean(await b.innerText().catch(()=>"" )),box:bb});
  }
  const tops=items.filter(x=>x.box).map(x=>Math.round(x.box.y));
  const lineTops=[];
  for(const y of tops) if(!lineTops.some(existing=>Math.abs(existing-y)<=4)) lineTops.push(y);
  const railBox=await box(rail);
  const labels=items.map(x=>x.label);
  const expectedFixed=["For You","Latest","World","Health"];
  const fixedPresent=expectedFixed.every(x=>labels.includes(x));
  const singleRow=lineTops.length===1;
  if(!railVisible||items.length!==5||!fixedPresent||!singleRow){
    block("VISUAL DESIGN GAP","P2","Five Home filters are not preserved as one horizontal row at "+viewLabel(v),{railVisible,labels,line_count:lineTops.length,railBox});
  }
  return {filter_count:items.length,filter_labels:labels,filter_container_height:railBox?.height??null,filter_line_count:lineTops.length,single_row:singleRow,filter_box:railBox};
}

function sourceAuthorityForTitle(title){
  if(!liveSourcePosts?.posts?.length||!title) return null;
  const wanted=clean(title).toLowerCase();
  const post=liveSourcePosts.posts.find(p=>htmlDecode(p?.title?.rendered).toLowerCase()===wanted)||
    liveSourcePosts.posts.find(p=>wanted.includes(htmlDecode(p?.title?.rendered).toLowerCase())||htmlDecode(p?.title?.rendered).toLowerCase().includes(wanted));
  if(!post) return null;
  const media=post?._embedded?.["wp:featuredmedia"]?.[0]||null;
  return {
    source_post_id:post.id??null,
    source_slug:post.slug??null,
    source_url:post.link??null,
    featured_media_id:post.featured_media??null,
    media_url:media?.source_url??null,
    media_alt:media?.alt_text??null
  };
}

async function heroEvidence(page,v){
  const filters=page.getByLabel("Editorial filters");
  const hero=filters.locator("xpath=following-sibling::*[1]");
  const heroVisible=await hero.isVisible().catch(()=>false);
  const heroBox=heroVisible?await box(hero):null;
  const aria=heroVisible?clean(await hero.getAttribute("aria-label").catch(()=>null)):"";
  const role=heroVisible?await hero.getAttribute("role").catch(()=>null):null;
  const title=aria||clean(await hero.innerText().catch(()=>"" )).slice(0,240);
  const sourceAuthority=sourceAuthorityForTitle(title);
  const imgs=hero.locator("img");
  const imageCount=await imgs.count().catch(()=>0);
  let image=null;
  for(let i=0;i<imageCount;i++){
    const candidate=imgs.nth(i);
    if(await candidate.isVisible().catch(()=>false)){image=candidate;break;}
  }
  let imageInfo={present:false,url:null,natural_width:0,natural_height:0,box:null,network_status:null,requestfailed:false,visible_render_result:false};
  if(image){
    const info=await image.evaluate(img=>({
      url:img.currentSrc||img.src||null,
      natural_width:img.naturalWidth||0,
      natural_height:img.naturalHeight||0,
      rendered_width:img.getBoundingClientRect().width,
      rendered_height:img.getBoundingClientRect().height
    })).catch(()=>null);
    const imageBox=await box(image);
    if(info){
      const response=[...imageResponses].reverse().find(x=>x.viewport===v.key&&x.url===info.url);
      const failed=requestFailed.some(x=>x.viewport===v.key&&x.url===info.url);
      imageInfo={present:true,url:info.url,natural_width:info.natural_width,natural_height:info.natural_height,box:imageBox,network_status:response?.status??null,requestfailed:failed,visible_render_result:info.natural_width>0&&info.natural_height>0&&info.rendered_width>0&&info.rendered_height>0};
    }
  }

  const titleLocator=hero.locator("text="+title).first();
  const titleBox=title?await box(titleLocator):null;
  let mobileHeadlineImageOverlap=null;
  if(v.key==="mobile"&&imageInfo.box&&titleBox){
    const a=imageInfo.box,b=titleBox;
    const x=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
    const y=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
    mobileHeadlineImageOverlap=x*y>0;
  }
  const mediaAuthoritative=sourceAuthority?.media_url||imageInfo.url||null;
  const mediaValid=imageInfo.present&&imageInfo.visible_render_result&&!imageInfo.requestfailed&&(imageInfo.network_status===null||imageInfo.network_status<400);
  let mediaClassification="PASS";
  if(!mediaValid){
    if(mediaAuthoritative){
      mediaClassification="MEDIA / DATA DEFECT";
      block("MEDIA / DATA DEFECT","P2","Hero media failed or did not render at "+viewLabel(v),{title,sourceAuthority,imageInfo});
    }else{
      mediaClassification="SOURCE HERO HAS NO MEDIA AUTHORITY";
      block("MEDIA / DATA DEFECT","P2","SOURCE HERO HAS NO MEDIA AUTHORITY at "+viewLabel(v),{title,sourceAuthority,imageInfo});
    }
  }
  if(!heroVisible||!title||role!=="link"){
    block("RUNTIME DEFECT","P1","Hero lead article is absent or not a functional accessible link at "+viewLabel(v),{heroVisible,title,role});
  }
  if(v.key==="mobile"&&mediaValid&&mobileHeadlineImageOverlap===false){
    addFinding("VISUAL DESIGN GAP","P3","Mobile Hero headline does not geometrically overlap Hero imagery; review tight attachment in screenshot",{title,image_box:imageInfo.box,title_box:titleBox});
  }

  return {
    hero_present:heroVisible,
    hero_story_title:title||null,
    hero_story_id_or_route:sourceAuthority?.source_slug?("source-"+sourceAuthority.source_slug):null,
    hero_role:role,
    hero_box:heroBox,
    hero_media_element_present:imageInfo.present,
    hero_media_url:imageInfo.url||sourceAuthority?.media_url||null,
    hero_media_network_status:imageInfo.network_status,
    hero_media_requestfailed:imageInfo.requestfailed,
    hero_media_natural_width:imageInfo.natural_width,
    hero_media_natural_height:imageInfo.natural_height,
    hero_media_visible_render_result:imageInfo.visible_render_result,
    hero_media_classification:mediaClassification,
    source_authority:sourceAuthority,
    mobile_headline_image_overlap:mobileHeadlineImageOverlap
  };
}

async function optionalAndTopStories(page,v,hero){
  const liveHeading=page.getByText("Live Now",{exact:true});
  const livePresent=await liveHeading.isVisible().catch(()=>false);
  const hospaz=page.locator('[aria-label="Advertising placement hospaz-header-direct"]');
  const hospazPresent=await hospaz.isVisible().catch(()=>false);
  const homeAfter=page.locator('[aria-label="Advertising placement home_after_live"]');
  const homeAfterPresent=await homeAfter.isVisible().catch(()=>false);
  const top=page.getByText("Top Stories",{exact:true});
  const topPresent=await top.isVisible().catch(()=>false);
  const topBox=topPresent?await box(top):null;
  const heroBottom=hero.hero_box?hero.hero_box.y+hero.hero_box.height:null;
  const gap=(heroBottom!==null&&topBox)?Math.max(0,topBox.y-heroBottom):null;

  const next=page.getByText("Latest",{exact:true});
  const nextBox=await box(next);
  const storyLinks=page.locator('[role="link"]');
  let count=0;
  for(let i=0;i<await storyLinks.count();i++){
    const l=storyLinks.nth(i);
    if(!(await l.isVisible().catch(()=>false))) continue;
    const b=await box(l);
    if(!b||!topBox||b.y<=topBox.y) continue;
    if(nextBox&&b.y>=nextBox.y) continue;
    count++;
  }

  const unexplained=!livePresent&&!hospazPresent&&!homeAfterPresent&&gap!==null&&gap>GAP_BLOCKER_PX;
  if(!topPresent) block("RUNTIME DEFECT","P1","Top Stories is missing at "+viewLabel(v));
  if(unexplained) block("VISUAL DESIGN GAP","P2","Large unexplained Hero-to-Top-Stories blank interval at "+viewLabel(v),{gap_px:gap});
  return {
    Live_present:livePresent,
    HOSPAZ_present:hospazPresent,
    home_after_live_ad_present:homeAfterPresent,
    Hero_to_Top_Stories_gap:gap,
    Top_Stories_present:topPresent,
    Top_Stories_heading_top:topBox?.y??null,
    top_stories_visible_story_link_count:count,
    unexplained_blank_gap:unexplained
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
      const name=clean((await tab.getAttribute("aria-label").catch(()=>null))||(await tab.innerText().catch(()=>"" )));
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
      const bottom=controls.filter(n=>{if(!vis(n))return false;const r=n.getBoundingClientRect();return r.top>=innerHeight-180&&r.bottom<=innerHeight+50;});
      const wanted=["Home","Explore","Live","Watch"];
      const chosen=wanted.map(x=>bottom.find(n=>name(n)===x)).filter(Boolean);
      const my=bottom.find(n=>["My HT","My HealthTimes"].includes(name(n)));
      if(my) chosen.push(my);
      if(chosen.length!==5) return null;
      return {structure:"bottom-aligned navigation",tab_count:5,destinations:chosen.map(name)};
    }).catch(()=>null);
  }
  return {present:Boolean(found),tab_count:found?.tab_count||0,destinations:found?.destinations||[],observed};
}

async function responsiveEvidence(page,v){
  const tabs=await tabbar(page);
  const out={mobile_tabbar_present:null,tab_count:null,destinations:[],tablet_bottom_tabs:null,desktop_mobile_tabbar_present:null,desktop_nav_links:[]};
  if(v.key==="mobile"){
    out.mobile_tabbar_present=tabs.present;out.tab_count=tabs.tab_count;out.destinations=tabs.destinations;
    if(!tabs.present||tabs.tab_count!==5) block("RUNTIME DEFECT","P1","Mobile five-tab Reader navigation missing/incomplete at "+viewLabel(v),tabs);
  }else if(v.key==="tablet"){
    out.tablet_bottom_tabs=tabs.present;out.tab_count=tabs.tab_count;out.destinations=tabs.destinations;
    if(!tabs.present) addFinding("VISUAL DESIGN GAP","P3","Tablet bottom navigation is absent; verify top utilities/navigation remain sufficient",{});
  }else{
    out.desktop_mobile_tabbar_present=tabs.present;
    if(tabs.present) block("RUNTIME DEFECT","P1","Desktop mobile bottom tabs returned at "+viewLabel(v),tabs);
    const expected=["Home","Explore","Live","Watch","My HealthTimes"];
    for(const name of expected){
      if(await page.getByRole("link",{name,exact:true}).isVisible().catch(()=>false)) out.desktop_nav_links.push(name);
    }
    if(out.desktop_nav_links.length<5) block("VISUAL DESIGN GAP","P2","Desktop publication navigation is incomplete at "+viewLabel(v),{links:out.desktop_nav_links});
  }
  return out;
}

async function overflowEvidence(page,v){
  const m=await page.evaluate(()=>({window_inner_width:innerWidth,document_scroll_width:document.documentElement.scrollWidth,body_scroll_width:document.body?.scrollWidth??0}));
  const widest=Math.max(m.document_scroll_width,m.body_scroll_width);
  const pixels=Math.max(0,widest-m.window_inner_width);
  const pass=pixels<=OVERFLOW_TOLERANCE;
  if(!pass) block("RUNTIME DEFECT","P1","Document-level horizontal overflow at "+viewLabel(v),{...m,overflow_pixels:pixels});
  return {...m,overflow_pixels:pixels,horizontal_overflow:!pass};
}

async function serviceWorkerEvidence(page,v){
  const observation=await page.evaluate(async()=>{
    if(!("serviceWorker" in navigator)) return {supported:false,controller_present:false,registration_state:"unsupported",fatal_error:false};
    try{
      const registration=await navigator.serviceWorker.getRegistration();
      return {
        supported:true,
        controller_present:Boolean(navigator.serviceWorker.controller),
        controller_script:navigator.serviceWorker.controller?.scriptURL||null,
        registration_state:registration?.active?"active":registration?.waiting?"waiting":registration?.installing?"installing":"none",
        active_script:registration?.active?.scriptURL||null,
        fatal_error:false
      };
    }catch(error){
      return {supported:true,controller_present:false,registration_state:"error",fatal_error:true,error:String(error)};
    }
  });
  serviceWorkerObservations.push({viewport:v.key,...observation});
  if(observation.fatal_error) block("RUNTIME DEFECT","P1","Fatal service-worker observation error at "+viewLabel(v),observation);
  return observation;
}

async function languageAndFeedEvidence(page,v){
  const visibleText=clean(await page.locator("body").innerText().catch(()=>"" ));
  const lower=visibleText.toLowerCase();
  const forbidden=["source parity","bounded source","migration authority","configuration-required","migration complete","migration incomplete"];
  const violations=forbidden.filter(x=>lower.includes(x));
  if(violations.length) block("VISUAL DESIGN GAP","P2","Internal programme terminology is visible to readers at "+viewLabel(v),{violations});
  const mostRead=await page.getByText("Most Read",{exact:true}).isVisible().catch(()=>false);
  const trending=await page.getByText("Trending",{exact:true}).isVisible().catch(()=>false);
  if(mostRead||trending) addFinding("VISUAL DESIGN GAP","P2","Potential fabricated audience-ranking block is visible",{viewport:v.key,mostRead,trending});
  const headings=["Latest","Features","Public Health","Research & Findings","Health Financing & Health Business","HIV/AIDS","Global Health","Watch","Premium Intelligence","Opportunities","Further Coverage"];
  const present=[];
  for(const h of headings) if(await page.getByText(h,{exact:true}).isVisible().catch(()=>false)) present.push(h);
  return {reader_language_violations:violations,most_read_visible:mostRead,trending_visible:trending,later_home_sections_present:present,visible_text_length:visibleText.length};
}

async function premiumEvidence(page,v){
  const headerEntry=page.getByRole("button",{name:"HealthTimes Premium",exact:true});
  const headerVisible=await headerEntry.isVisible().catch(()=>false);
  const moduleVisible=await page.getByText("Premium Intelligence",{exact:true}).isVisible().catch(()=>false);
  let reachable=false,navigation_error=null;
  const beforeErrors=pageErrors.length;
  if(headerVisible){
    try{
      await headerEntry.click();
      await page.waitForURL(url=>/\/premium\/?$/.test(url.pathname),{timeout:15000});
      await page.waitForLoadState("domcontentloaded");
      reachable=true;
    }catch(error){navigation_error=String(error);}
    if(reachable){
      await page.goto(PUBLIC_URL,{waitUntil:"domcontentloaded",timeout:TIMEOUT});
      await homeReady(page,v);
    }
  }
  const newErrors=pageErrors.length-beforeErrors;
  if(!headerVisible||!reachable||newErrors>0) block("RUNTIME DEFECT","P1","Premium discovery/reachability failed from Home at "+viewLabel(v),{headerVisible,moduleVisible,reachable,newErrors,navigation_error});
  return {Premium_entry_visible:headerVisible,Premium_Intelligence_visible:moduleVisible,Premium_route_reachable:reachable,premium_navigation_pageerror_count:newErrors,navigation_error};
}

async function markMaxresVisibility(page,v){
  for(const item of maxresFailures.filter(x=>x.viewport===v.key&&x.visible_in_document===undefined)){
    item.visible_in_document=await page.evaluate(url=>Array.from(document.images).some(img=>{
      const src=img.currentSrc||img.src||"";
      const r=img.getBoundingClientRect();
      return src===url&&r.width>0&&r.height>0;
    }),item.url).catch(()=>false);
    if(item.visible_in_document){
      addFinding("MEDIA / DATA DEFECT","P3","A visible Home/Watch maxresdefault.jpg asset failed",{...item});
    }
  }
}

async function screenshots(page,v,hero,top){
  const folder=path.join(ROOT,v.key);
  await mkdir(folder);
  const full=path.join(folder,"home.png");
  await page.screenshot({path:full,fullPage:true});
  if(v.key==="mobile"){
    await page.screenshot({path:path.join(folder,"above-fold.png"),clip:{x:0,y:0,width:v.width,height:v.height}});
  }else{
    const heroBox=hero.hero_box;
    const topY=top.Top_Stories_heading_top;
    if(heroBox&&topY!==null){
      const docHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
      const start=Math.max(0,heroBox.y-40);
      const end=Math.min(docHeight,topY+440);
      await page.screenshot({path:path.join(folder,"hero-topstories.png"),clip:{x:0,y:start,width:v.width,height:Math.max(100,end-start)}});
    }
  }
}

async function runViewport(browser,v){
  const folder=path.join(ROOT,v.key);
  await mkdir(folder);
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1});
  const page=await context.newPage();
  attachListeners(page,v);
  const out={width:v.width,height:v.height};
  try{
    await page.goto(PUBLIC_URL+"?ui06="+v.key+"-"+Date.now(),{waitUntil:"domcontentloaded",timeout:TIMEOUT});
    out.initial=await homeReady(page,v);
    if(firstBlocker?.category==="DEPLOYMENT DEFECT"||firstBlocker?.category==="RUNTIME DEFECT"){
      await page.screenshot({path:path.join(folder,"home.png"),fullPage:true}).catch(()=>{});
      return out;
    }
    await page.reload({waitUntil:"domcontentloaded",timeout:TIMEOUT});
    out.reloaded=await homeReady(page,v);

    out.shell=await shellEvidence(page,v);
    out.filters=await filterEvidence(page,v);
    out.hero=await heroEvidence(page,v);
    out.editorial=await optionalAndTopStories(page,v,out.hero);
    out.responsive=await responsiveEvidence(page,v);
    out.overflow=await overflowEvidence(page,v);
    out.service_worker=await serviceWorkerEvidence(page,v);
    out.language_feed=await languageAndFeedEvidence(page,v);

    await markMaxresVisibility(page,v);
    await screenshots(page,v,out.hero,out.editorial);

    if(!firstBlocker || (firstBlocker.category!=="RUNTIME DEFECT"&&firstBlocker.category!=="MEDIA / DATA DEFECT"&&firstBlocker.category!=="DEPLOYMENT DEFECT")){
      out.premium=await premiumEvidence(page,v);
    }else{
      out.premium={skipped_due_to_blocker:true};
    }

    const viewportErrors=[
      ...pageErrors.filter(x=>x.viewport===v.key).map(x=>x.message),
      ...consoleEvents.filter(x=>x.viewport===v.key&&x.type==="error").map(x=>x.text)
    ];
    out.React_418_count=viewportErrors.filter(x=>{const s=String(x).toLowerCase();return s.includes("minified react error #418")||s.includes("react error #418");}).length;
    out.pageerror_count=pageErrors.filter(x=>x.viewport===v.key).length;
    out.console_error_count=consoleEvents.filter(x=>x.viewport===v.key&&x.type==="error").length;
    out.console_warning_count=consoleEvents.filter(x=>x.viewport===v.key&&x.type==="warning").length;
    out.Home_resolved=Boolean(out.reloaded?.resolved);
    out.Hero_present=Boolean(out.hero?.hero_present);
    out.Hero_media_present=Boolean(out.hero?.hero_media_element_present);
    out.Hero_media_url=out.hero?.hero_media_url??null;
    out.Hero_media_natural_width=out.hero?.hero_media_natural_width??0;
    out.Hero_media_natural_height=out.hero?.hero_media_natural_height??0;
    out.Top_Stories_present=Boolean(out.editorial?.Top_Stories_present);
    out.Hero_to_Top_Stories_gap=out.editorial?.Hero_to_Top_Stories_gap??null;
    out.Live_present=Boolean(out.editorial?.Live_present);
    out.HOSPAZ_present=Boolean(out.editorial?.HOSPAZ_present);
    out.mobile_tabbar_present=v.key==="mobile"?out.responsive?.mobile_tabbar_present:null;
    out.Premium_entry_visible=out.premium?.Premium_entry_visible??null;
    out.Premium_route_reachable=out.premium?.Premium_route_reachable??null;
    out.document_scroll_width=out.overflow?.document_scroll_width??null;
    out.horizontal_overflow=out.overflow?.horizontal_overflow??null;
    out.service_worker_controller=out.service_worker?.controller_present??null;
  }catch(error){
    block("RUNTIME DEFECT","P1","Certification browser execution failed at "+viewLabel(v),{message:error.message||String(error),stack:error.stack||null});
    out.harness_error={message:error.message||String(error),stack:error.stack||null};
    await page.screenshot({path:path.join(folder,"home.png"),fullPage:true}).catch(()=>{});
  }finally{
    await writeJson(path.join(folder,"browser.json"),out);
    await context.close();
  }
  return out;
}

function warningClassification(item){
  const text=item.text||"";
  if(text.includes("[expo-notifications] Listening to push token changes is not yet fully supported on web.")) return "known non-blocking: expo-notifications web";
  if(text.includes("apple-mobile-web-app-capable")||text.includes("mobile-web-app-capable")) return "known non-blocking: PWA meta";
  if(text.includes("Cannot record touch end without a touch start")) return "known non-blocking unless interaction failure separately proven: Touch Bank";
  return "new/unclassified warning";
}

function makeWireframeComparison(){
  const rows=[];
  for(const key of ["mobile","tablet","desktop"]){
    const r=results[key]||{};
    rows.push({
      viewport:key,
      masthead:r.shell?.compact_masthead??null,
      filters_single_row:r.filters?.single_row??null,
      hero:r.hero?.hero_present??null,
      hero_media:r.hero?.hero_media_visible_render_result??null,
      live:r.editorial?.Live_present??null,
      top_stories:r.editorial?.Top_Stories_present??null,
      hero_top_gap:r.editorial?.Hero_to_Top_Stories_gap??null,
      premium:r.premium?.Premium_entry_visible??null,
      mobile_bottom_nav:key==="desktop"?(r.responsive?.desktop_mobile_tabbar_present===false):(r.responsive?.mobile_tabbar_present??r.responsive?.tablet_bottom_tabs??null),
      overflow:r.overflow?.horizontal_overflow??null
    });
  }
  return rows;
}

async function finish(){
  const warnings=consoleEvents.filter(x=>x.type==="warning").map(x=>({...x,classification:warningClassification(x)}));
  const wireframe=makeWireframeComparison();
  const nodeVersion=process.version;
  const playwrightVersion=pkg.devDependencies?.["@playwright/test"]||"unknown";
  const runnerImage={image_os:process.env.ImageOS||null,image_version:process.env.ImageVersion||null,runner_os:process.env.RUNNER_OS||null,runner_arch:process.env.RUNNER_ARCH||null};

  await writeJson(path.join(ROOT,"console.json"),consoleEvents);
  await writeJson(path.join(ROOT,"page-errors.json"),pageErrors);
  await writeJson(path.join(ROOT,"network.json"),{request_failed:requestFailed,http_ge_400:httpErrors,image_responses:imageResponses,maxresdefault:maxresFailures});
  await writeJson(path.join(ROOT,"hero-media.json"),Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.hero||null])));
  await writeJson(path.join(ROOT,"service-worker.json"),serviceWorkerObservations);
  await writeJson(path.join(ROOT,"layout-measurements.json"),Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{shell:v.shell,filters:v.filters,editorial:v.editorial,overflow:v.overflow,responsive:v.responsive}])));
  await writeJson(path.join(ROOT,"source-authority.json"),liveSourcePosts);

  const manifest={
    certification_tooling_sha:TOOLING_SHA,
    target_deployment_wrapper_sha:TARGET_DEPLOYMENT_WRAPPER,
    accepted_ui01_executable_sha:ACCEPTED_UI01_EXECUTABLE,
    public_url:PUBLIC_URL,
    browser:"chromium",
    browser_version:browserVersion,
    node_version:nodeVersion,
    playwright_version:playwrightVersion,
    runner_image:runnerImage,
    run_id:RUN_ID,
    captured_at:now(),
    build_info:buildInfo,
    viewports:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{
      width:v.width,
      height:v.height,
      pageerror_count:v.pageerror_count??null,
      console_error_count:v.console_error_count??null,
      console_warning_count:v.console_warning_count??null,
      React_418_count:v.React_418_count??null,
      Home_resolved:v.Home_resolved??null,
      Hero_present:v.Hero_present??null,
      Hero_media_present:v.Hero_media_present??null,
      Hero_media_url:v.Hero_media_url??null,
      Hero_media_natural_width:v.Hero_media_natural_width??null,
      Hero_media_natural_height:v.Hero_media_natural_height??null,
      Top_Stories_present:v.Top_Stories_present??null,
      Hero_to_Top_Stories_gap:v.Hero_to_Top_Stories_gap??null,
      Live_present:v.Live_present??null,
      HOSPAZ_present:v.HOSPAZ_present??null,
      mobile_tabbar_present:v.mobile_tabbar_present??null,
      Premium_entry_visible:v.Premium_entry_visible??null,
      Premium_route_reachable:v.Premium_route_reachable??null,
      document_scroll_width:v.document_scroll_width??null,
      horizontal_overflow:v.horizontal_overflow??null,
      service_worker_controller:v.service_worker_controller??null
    }])),
    findings,
    first_blocker:firstBlocker
  };
  await writeJson(path.join(ROOT,"manifest.json"),manifest);

  const wc=[
    "# UI-06 UI-01 Screen 1 Wireframe Comparison","",
    "Binding comparison dimensions: masthead, editorial filter row, Hero, Live, Top Stories, Premium discoverability, advertising rhythm, content density, mobile bottom navigation.","",
    "| Viewport | Compact masthead | Filters single-row | Hero | Hero media | Live | Top Stories | Hero→Top gap | Premium | Navigation | Overflow |",
    "|---|---|---|---|---|---|---|---|---:|---|---|---|",
    ...wireframe.map(r=>"| "+r.viewport+" | "+String(r.masthead)+" | "+String(r.filters_single_row)+" | "+String(r.hero)+" | "+String(r.hero_media)+" | "+String(r.live)+" | "+String(r.top_stories)+" | "+String(r.hero_top_gap)+" | "+String(r.premium)+" | "+String(r.mobile_bottom_nav)+" | "+String(r.overflow)+" |"),
    "",
    "Qualitative gate: determine whether the live composition visibly represents the client-approved publication hierarchy rather than the prior generic component-driven layout. No numeric beauty score is used.",
    "",
    "Automated evidence must be reviewed with the captured screenshots before final moderator closure."
  ].join("\n");
  await writeText(path.join(ROOT,"wireframe-comparison.md"),wc+"\n");

  const disposition=firstBlocker
    ?"UI-06 UI-01 SCREEN 1 LIVE CANDIDATE NOT CERTIFIED — "+firstBlocker.message
    :"UI-06 UI-01 SCREEN 1 LIVE CANDIDATE CERTIFIED — DEPLOYMENT "+TARGET_DEPLOYMENT_WRAPPER+" / EXECUTABLE "+ACCEPTED_UI01_EXECUTABLE+" / HOME READY FOR UI MODERATOR FINAL CLOSURE";
  const summary=[
    "# UI-06 UI-01 Screen 1 Live Candidate Certification","",
    "- Certification tooling SHA: "+TOOLING_SHA,
    "- Target deployment wrapper: "+TARGET_DEPLOYMENT_WRAPPER,
    "- Accepted UI-01 executable: "+ACCEPTED_UI01_EXECUTABLE,
    "- Public URL: "+PUBLIC_URL,
    "- Browser: Chromium "+browserVersion,
    "- Node: "+nodeVersion,
    "- Playwright: "+playwrightVersion,
    "- Run ID: "+RUN_ID,"",
    "## Runtime",
    "- React #418 count: "+Object.values(results).reduce((n,v)=>n+(v.React_418_count||0),0),
    "- Page errors: "+pageErrors.length,
    "- Console errors: "+consoleEvents.filter(x=>x.type==="error").length,
    "- Console warnings: "+warnings.length,"",
    "## Findings",
    ...(findings.length?findings.map(x=>"- "+x.category+" / "+x.severity+": "+x.message):["- None blocking proven by automated live-browser gates."]),"",
    "## Final disposition","",disposition,""
  ].join("\n");
  await writeText(path.join(ROOT,"certification-summary.md"),summary);

  return disposition;
}

async function main(){
  await mkdir(ROOT);
  await identityGate();
  if(firstBlocker){
    const disposition=await finish();
    console.error(disposition);
    process.exitCode=1;
    return;
  }

  liveSourcePosts=await fetchLiveSourcePosts();
  const browser=await chromium.launch({headless:true});
  browserVersion=browser.version();
  try{
    for(const v of VIEWS){
      results[v.key]=await runViewport(browser,v);
      if(firstBlocker && ["DEPLOYMENT DEFECT","RUNTIME DEFECT","MEDIA / DATA DEFECT"].includes(firstBlocker.category)) break;
    }
  }finally{
    await browser.close();
  }

  const disposition=await finish();
  console.log(disposition);
  if(firstBlocker) process.exitCode=1;
}

await main();
