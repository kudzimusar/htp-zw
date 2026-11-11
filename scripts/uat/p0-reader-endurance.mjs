// HT-MVP-OWNER-UAT-P0-RECOVERY-01 — local exact-head browser endurance.
// No privileged sessions, staging writes, Vercel bypass, or production effects.
// A local static-export test does not substitute for the Owner's protected UAT.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FORBIDDEN_PAGE_PATH, LAB_SESSION_COOKIE, startProtectedLab } from "./p0-protected-lab-server.mjs";

const port=Number(process.env.P0_LAB_PORT ?? 4174);
const base="http://127.0.0.1:"+port;
const articleId="source-ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis";
const articleTitle="Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt";
const articleBodyText=/Health advocates are linking Zimbabwe.s debt burden/;
const articleUrl=base+"/article/"+articleId+"?utm_source=p0-endurance";
const expectedSha=process.env.EXPECTED_SHA;
if(!/^[0-9a-f]{40}$/.test(expectedSha??"")) throw new Error("EXACT_HEAD_SHA_REQUIRED");
const sessionSeconds=Number(process.env.P0_SESSION_SECONDS ?? 120);
const distDir=resolve(process.env.P0_DIST_DIR ?? "apps/mobile/dist");
// Unrelated window messages are what extensions and embedded toolbars generate.
const messagesPerTick=25;

const viewports=[
  {name:"owner-narrow",width:279,height:696},
  {name:"mobile",width:390,height:844},
  {name:"tablet",width:768,height:1024},
  {name:"desktop",width:1280,height:800},
  {name:"wide",width:1920,height:1080}
];
// A third-party image outage must not decide a stability verdict, but a retry loop
// would be a real defect, so failures are recorded and held to a budget. Not done
// with request interception: that disables the cache and sidesteps the worker.
const MAX_THIRD_PARTY_MEDIA_FAILURES=4;
const runDir=process.env.P0_RUN_DIR ?? "p0-reader-endurance";
await mkdir(runDir,{recursive:true});
const lab=await startProtectedLab({distDir,port,legacyWorkerPath:resolve("scripts/uat/fixtures/sw-g3-legacy.js")});
const browser=await chromium.launch({headless:true,args:["--enable-precise-memory-info"]});
const output={
  kind:"isolated-exact-head-static-reader-endurance",
  candidateSha:expectedSha,
  startedAt:new Date().toISOString(),
  environment:"isolated-protected-preview-laboratory",
  sessionSeconds,
  serviceWorkers:"allow",
  performanceBudgets:{
    maxArticleReadyMs:10000,
    maxLongTasks:10,
    maxHistoryMutations:3,
    maxHeapDeltaMb:30,
    maxDomGrowthPercent:20,
    maxThirdPartyMediaFailures:MAX_THIRD_PARTY_MEDIA_FAILURES
  },
  protectedDeploymentStatus:"HELD_PENDING_OWNER_AUTHORIZATION",
  sessions:[],
  limitations:[
    "Local build laboratory emulating Deployment Protection, not the Owner SSO-protected Vercel deployment",
    "Message noise is synthetic; the sources active in the Owner's browser were not observed",
    "Laboratory measurements, not actual Core Web Vitals p75 field data"
  ]
};
let hadFailure=false;

// page.waitForFunction treats a returned Promise as truthy, so anything that has
// to await browser state (Cache Storage) is polled from here instead.
async function waitUntil(check,label,timeoutMs=20000){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    if(await check()) return;
    await new Promise(done=>setTimeout(done,250));
  }
  throw new Error("Timed out waiting for "+label);
}

function isThirdPartyMedia(value){
  try{
    const url=new URL(value);
    return url.origin!==base && /\.(?:jpe?g|png|webp|gif|avif)$/i.test(url.pathname);
  }catch{
    return false;
  }
}

async function labContext(viewport){
  const context=await browser.newContext({viewport,serviceWorkers:"allow"});
  await context.addCookies([{name:LAB_SESSION_COOKIE,value:"p0-lab-session",url:base}]);
  return context;
}

try{
  for(const vp of viewports){
    const session={viewport:vp,errors:[],unhandled:[],httpFailures:[],requestFailures:[],thirdPartyMediaFailures:[],historyMutations:0,articleReadyMs:null,screenshots:[],articleBodyObserved:false,serviceWorkerControlled:false,messagesSent:0,linkingMessageListeners:null,initialDomNodes:null,finalDomNodes:null,initialJsHeap:null,finalJsHeap:null,longTasks:0,success:false};
    output.sessions.push(session);
    const context=await labContext({width:vp.width,height:vp.height});
    await context.tracing.start({screenshots:true,snapshots:true});
    const page=await context.newPage();
    page.on("pageerror",error=>session.errors.push({message:String(error.message??error),stack:String(error.stack??"").slice(0,1800)}));
    page.on("console",message=>{
      if(message.type()!=="error") return;
      const url=message.location().url ?? "";
      if(message.text().startsWith("Failed to load resource") && isThirdPartyMedia(url)){
        session.thirdPartyMediaFailures.push({url:url.slice(0,220),message:message.text().slice(0,200)});
        return;
      }
      session.errors.push({message:message.text().slice(0,1000),url:url.slice(0,220),console:true});
    });
    page.on("requestfailed",request=>session.requestFailures.push({url:request.url().slice(0,220),error:request.failure()?.errorText}));
    page.on("response",response=>{if(response.status()>=400 && !/favicon\.ico$/.test(response.url()))session.httpFailures.push({status:response.status(),url:response.url().slice(0,220)});});
    await page.addInitScript(()=>{
      window.__htP0={historyMutations:0,longTasks:0,unhandled:[],linkingMessageListeners:0};
      const origPush=window.history.pushState.bind(window.history);
      const origReplace=window.history.replaceState.bind(window.history);
      window.history.pushState=function(...args){window.__htP0.historyMutations++;return origPush(...args);};
      window.history.replaceState=function(...args){window.__htP0.historyMutations++;return origReplace(...args);};
      const origListen=window.addEventListener.bind(window);
      window.addEventListener=function(type,listener,options){
        if(type==="message" && /nativeEvent/.test(String(listener))) window.__htP0.linkingMessageListeners++;
        return origListen(type,listener,options);
      };
      window.addEventListener("unhandledrejection",event=>window.__htP0.unhandled.push(String(event.reason)));
      try{new PerformanceObserver(list=>{window.__htP0.longTasks+=list.getEntries().length;}).observe({entryTypes:["longtask"]});}catch{}
    });
    const waitForArticle=async()=>{
      await page.getByRole("button",{name:/Text size/i}).waitFor({timeout:30000});
      await page.getByText(articleTitle,{exact:false}).first().waitFor({timeout:30000});
      await page.getByText("Loading article…",{exact:true}).waitFor({state:"hidden",timeout:30000});
      await page.getByTestId("article-body").getByText(articleBodyText).waitFor({timeout:30000});
    };
    const start=Date.now();
    try{
      const response=await page.goto(articleUrl,{waitUntil:"domcontentloaded",timeout:35000});
      if(response?.status()!==200) throw new Error("Article direct navigation status "+response?.status());
      await waitForArticle();
      session.articleReadyMs=Date.now()-start;
      session.articleBodyObserved=true;
      if(session.articleReadyMs>10000) throw new Error("Article ready exceeded budget: "+session.articleReadyMs+"ms");

      // Endurance runs on a page the service worker actually controls.
      await page.evaluate(()=>navigator.serviceWorker.ready);
      await page.reload({waitUntil:"domcontentloaded"});
      await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:15000});
      session.serviceWorkerControlled=true;
      await waitForArticle();

      session.initialJsHeap=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
      session.initialDomNodes=await page.evaluate(()=>document.getElementsByTagName("*").length);
      await page.getByRole("button",{name:/Text size/i}).click();
      await page.getByRole("button",{name:"Save article"}).click();
      await page.screenshot({path:runDir+"/"+vp.name+"-initial.png",fullPage:false});
      session.screenshots.push(vp.name+"-initial.png");
      const deadline=Date.now()+sessionSeconds*1000;
      while(Date.now()<deadline){
        await page.evaluate((count)=>{
          for(let n=0;n<count;n+=1) window.postMessage({source:"p0-unrelated-noise",n},"*");
          window.scrollBy(0,window.innerHeight*0.65);
        },messagesPerTick);
        session.messagesSent+=messagesPerTick;
        await page.waitForTimeout(4500);
        if(await page.getByText("Loading article…",{exact:true}).count())throw new Error("Article returned to loading state");
        if(await page.getByRole("button",{name:/Text size/i}).count()!==1)throw new Error("Article toolbar blanked or remounted");
        if(page.isClosed())throw new Error("Page crashed or closed");
        if(session.errors.length || session.unhandled.length)throw new Error("Uncaught browser errors during article endurance");
        if(session.thirdPartyMediaFailures.length>MAX_THIRD_PARTY_MEDIA_FAILURES)throw new Error("Repeated media failures suggest a retry loop");
      }
      const runtime=await page.evaluate(()=>({
        ...window.__htP0,
        heap:performance.memory?.usedJSHeapSize??null,
        domNodes:document.getElementsByTagName("*").length,
        path:window.location.pathname
      }));
      session.finalJsHeap=runtime.heap;
      session.finalDomNodes=runtime.domNodes;
      session.longTasks=runtime.longTasks;
      session.historyMutations=runtime.historyMutations;
      session.linkingMessageListeners=runtime.linkingMessageListeners;
      session.unhandled.push(...runtime.unhandled);
      if(runtime.path!=="/article/"+articleId)throw new Error("Unexpected route navigation: "+runtime.path);
      if(session.linkingMessageListeners!==0)throw new Error("Deep-link handler is bound to window message events");
      if(session.historyMutations>3)throw new Error("Repeated history modifications: "+session.historyMutations);
      if(session.longTasks>10) throw new Error("Excessive long tasks: "+session.longTasks);
      if(session.finalDomNodes>session.initialDomNodes*1.2)throw new Error("DOM grew from "+session.initialDomNodes+" to "+session.finalDomNodes+" nodes");
      if(session.initialJsHeap && session.finalJsHeap && (session.finalJsHeap-session.initialJsHeap)>30*1024*1024){
        throw new Error("Excessive heap growth: "+Math.round((session.finalJsHeap-session.initialJsHeap)/1024/1024)+"MB");
      }
      if(await page.getByTestId("article-body").getByText(articleBodyText).count()!==1)throw new Error("Article body text missing or unrendered");
      if(session.unhandled.length||session.errors.length)throw new Error("Unhandled application exception");
      if(session.httpFailures.length)throw new Error("HTTP failure observed during article: "+session.httpFailures[0].status+" "+session.httpFailures[0].url);
      await page.screenshot({path:runDir+"/"+vp.name+"-final.png",fullPage:false});
      session.screenshots.push(vp.name+"-final.png");
      // Test history restoration after a settled article session, not only one screenshot.
      await page.goto(base+"/",{waitUntil:"domcontentloaded"});
      await page.goBack({waitUntil:"domcontentloaded"});
      await page.getByRole("button",{name:/Text size/i}).waitFor({timeout:30000});
      session.success=true;
    }catch(error){
      hadFailure=true;
      session.failure=String(error?.stack??error).slice(0,1800);
    }finally{
      const data=await page.evaluate(()=>window.__htP0??null).catch(()=>null);
      if(data){session.unhandled.push(...data.unhandled);session.longTasks=data.longTasks;session.historyMutations=data.historyMutations;session.linkingMessageListeners=data.linkingMessageListeners;}
      if(session.errors.length||session.unhandled.length) {session.success=false;hadFailure=true;}
      await context.tracing.stop({path:runDir+"/"+vp.name+"-trace.zip"}).catch(()=>{});
      await context.close();
    }
    await writeFile(runDir+"/evidence.json",JSON.stringify(output,null,2)+"\n");
  }

  // Service worker lifecycle: upgrade from the deployed G3 worker, then the two
  // ways a worker can mislead a reader: caching a refusal, and failing offline.
  const lifecycle={kind:"service-worker-lifecycle",success:false};
  output.serviceWorkerLifecycle=lifecycle;
  const context=await labContext({width:390,height:844});
  const page=await context.newPage();
  try{
    // Start on a page with no third-party media: the legacy worker proxies those
    // requests itself, and a new worker cannot activate while one is in flight.
    lab.useLegacyWorker(true);
    await page.goto(base+"/about",{waitUntil:"load",timeout:35000});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    const cacheKeys=()=>page.evaluate(()=>caches.keys());
    await waitUntil(async()=>(await cacheKeys()).includes("healthtimes-universal-v2"),"the legacy worker cache");
    lifecycle.legacyCaches=await cacheKeys();

    lab.useLegacyWorker(false);
    await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
    await waitUntil(()=>page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.getRegistration();
      return registration.active?.state==="activated" && !registration.installing && !registration.waiting;
    }),"the new worker to activate");
    await waitUntil(async()=>{
      const keys=await cacheKeys();
      return keys.includes("healthtimes-universal-p0-v3") && !keys.includes("healthtimes-universal-v2");
    },"the legacy cache to be retired");
    lifecycle.upgradedCaches=await cacheKeys();
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:15000});
    lifecycle.controlledAfterUpgrade=true;

    const refused=await page.goto(base+FORBIDDEN_PAGE_PATH,{waitUntil:"domcontentloaded"});
    if(refused?.status()!==403) throw new Error("Expected a 403 refusal, got "+refused?.status());
    lifecycle.forbiddenCached=await page.evaluate((path)=>caches.match(path).then(Boolean),FORBIDDEN_PAGE_PATH);
    if(lifecycle.forbiddenCached) throw new Error("A 403 response was stored in the service worker cache");

    await page.goto(articleUrl,{waitUntil:"domcontentloaded"});
    await page.getByTestId("article-body").getByText(articleBodyText).waitFor({timeout:30000});
    // A normal navigation: a forced reload deliberately bypasses the worker.
    lab.setOutage(true);
    await page.goto(articleUrl,{waitUntil:"domcontentloaded",timeout:30000});
    await page.getByTestId("article-body").getByText(articleBodyText).waitFor({timeout:30000});
    lifecycle.offlineArticleRendered=true;
    lifecycle.success=true;
  }catch(error){
    hadFailure=true;
    lifecycle.failure=String(error?.stack??error).slice(0,1800);
  }finally{
    lab.setOutage(false);
    lab.useLegacyWorker(false);
    await context.close();
  }
}finally{
  await browser.close();
  await lab.close();
  output.finishedAt=new Date().toISOString();
  output.overallResult=hadFailure?"REMEDIATE":"LAB_ENDURANCE_PASS_NOT_PROTECTED_DEPLOYMENT";
  await writeFile(runDir+"/evidence.json",JSON.stringify(output,null,2)+"\n");
}
if(hadFailure){console.error("Reader P0 endurance FAIL; see exact-head trace artifacts");process.exitCode=1;}
