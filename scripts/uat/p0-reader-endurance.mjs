// HT-MVP-OWNER-UAT-P0-RECOVERY-01 — local exact-head browser endurance.
// No privileged sessions, staging writes, Vercel bypass, or production effects.
// A local static-export test does not substitute for the Owner's protected UAT.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = "http://127.0.0.1:4174";
const articleId="source-ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis";
const articleTitle="Zimbabwe urged to join Borrowers Forum amid US$23.7bn debt";
const expectedSha=process.env.EXPECTED_SHA;
if(!/^[0-9a-f]{40}$/.test(expectedSha??"")) throw new Error("EXACT_HEAD_SHA_REQUIRED");

const viewports=[
  {name:"owner-narrow",width:279,height:696},
  {name:"mobile",width:390,height:844},
  {name:"tablet",width:768,height:1024},
  {name:"desktop",width:1280,height:800},
  {name:"wide",width:1920,height:1080}
];
const runDir="p0-reader-endurance";
await mkdir(runDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const output={
  kind:"isolated-exact-head-static-reader-endurance",
  candidateSha:expectedSha,
  startedAt:new Date().toISOString(),
  environment:"isolated-static-export-laboratory",
  serviceWorkers:"allow",
  performanceBudgets:{
    maxArticleReadyMs:10000,
    maxLongTasks:10,
    maxHistoryMutations:3,
    maxHeapDeltaMb:30
  },
  protectedDeploymentStatus:"HELD_PENDING_OWNER_AUTHORIZATION",
  sessions:[],
  limitations:[
    "Local static build laboratory, not Owner SSO-protected Vercel deployment",
    "Evaluates static export runtime stability with active service worker",
    "Laboratory measurements, not actual Core Web Vitals p75 field data"
  ]
};
let hadFailure=false;
try{
  for(const vp of viewports){
    const session={viewport:vp,errors:[],unhandled:[],httpFailures:[],historyMutations:0,articleReadyMs:null,screenshots:[],articleTextObserved:false,initialJsHeap:null,finalJsHeap:null,longTasks:0,success:false};
    output.sessions.push(session);
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},serviceWorkers:"allow"});
    await context.tracing.start({screenshots:true,snapshots:true});
    const page=await context.newPage();
    page.on("pageerror",error=>session.errors.push({message:String(error.message??error),stack:String(error.stack??"").slice(0,1800)}));
    page.on("console",message=>{if(message.type()==="error")session.errors.push({message:message.text().slice(0,1000),console:true});});
    page.on("response",response=>{if(response.status()>=400 && !/favicon\.ico$/.test(response.url()))session.httpFailures.push({status:response.status(),url:response.url().slice(0,220)});});
    await page.addInitScript(()=>{
      window.__htP0={historyMutations:0,longTasks:0,unhandled:[]};
      const origPush=window.history.pushState.bind(window.history);
      const origReplace=window.history.replaceState.bind(window.history);
      window.history.pushState=function(...args){window.__htP0.historyMutations++;return origPush(...args);};
      window.history.replaceState=function(...args){window.__htP0.historyMutations++;return origReplace(...args);};
      window.addEventListener("unhandledrejection",event=>window.__htP0.unhandled.push(String(event.reason)));
      try{new PerformanceObserver(list=>{window.__htP0.longTasks+=list.getEntries().length;}).observe({entryTypes:["longtask"]});}catch{}
    });
    const start=Date.now();
    try{
      const response=await page.goto(base+"/article/"+articleId+"?utm_source=p0-endurance",{waitUntil:"domcontentloaded",timeout:35000});
      if(response?.status()!==200) throw new Error("Article direct navigation status "+response?.status());
      await page.getByRole("button",{name:/Text size/i}).waitFor({timeout:30000});
      await page.getByText(articleTitle,{exact:false}).first().waitFor({timeout:30000});
      await page.getByText("Loading article…",{exact:true}).waitFor({state:"hidden",timeout:30000});
      session.articleReadyMs=Date.now()-start;
      session.articleTextObserved=true;
      if(session.articleReadyMs>10000) throw new Error("Article ready exceeded budget: "+session.articleReadyMs+"ms");
      session.initialJsHeap=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
      await page.getByRole("button",{name:/Text size/i}).click();
      await page.getByRole("button",{name:"Save article"}).click();
      await page.screenshot({path:runDir+"/"+vp.name+"-initial.png",fullPage:false});
      session.screenshots.push(vp.name+"-initial.png");
      const deadline=Date.now()+120000;
      while(Date.now()<deadline){
        await page.evaluate(()=>window.scrollBy(0,window.innerHeight*0.65));
        await page.waitForTimeout(4500);
        if(await page.getByText("Loading article…",{exact:true}).count())throw new Error("Article returned to loading state");
        if(await page.getByRole("button",{name:/Text size/i}).count()!==1)throw new Error("Article toolbar blanked or remounted");
        if(page.isClosed())throw new Error("Page crashed or closed");
        if(session.errors.length || session.unhandled.length)throw new Error("Uncaught browser errors during article endurance");
      }
      const runtime=await page.evaluate(()=>({
        ...window.__htP0,
        heap:performance.memory?.usedJSHeapSize??null,
        path:window.location.pathname,
        bodyText:document.body.innerText.slice(0,350)
      }));
      session.finalJsHeap=runtime.heap;
      session.longTasks=runtime.longTasks;
      session.historyMutations=runtime.historyMutations;
      session.unhandled.push(...runtime.unhandled);
      if(runtime.path!=="/article/"+articleId)throw new Error("Unexpected route navigation: "+runtime.path);
      if(session.historyMutations>3)throw new Error("Repeated history modifications: "+session.historyMutations);
      if(session.longTasks>10) throw new Error("Excessive long tasks: "+session.longTasks);
      if(session.initialJsHeap && session.finalJsHeap && (session.finalJsHeap-session.initialJsHeap)>30*1024*1024){
        throw new Error("Excessive heap growth: "+Math.round((session.finalJsHeap-session.initialJsHeap)/1024/1024)+"MB");
      }
      if(!runtime.bodyText || runtime.bodyText.length<50) throw new Error("Article body text missing or unrendered");
      if(session.unhandled.length||session.errors.length)throw new Error("Unhandled application exception");
      if(session.httpFailures.some(x=>x.status>=500))throw new Error("HTTP 5xx observed during article");
      await page.screenshot({path:runDir+"/"+vp.name+"-120-second.png",fullPage:false});
      session.screenshots.push(vp.name+"-120-second.png");
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
      if(data){session.unhandled.push(...data.unhandled);session.longTasks=data.longTasks;session.historyMutations=data.historyMutations;}
      if(session.errors.length||session.unhandled.length) {session.success=false;hadFailure=true;}
      await context.tracing.stop({path:runDir+"/"+vp.name+"-trace.zip"}).catch(()=>{});
      await context.close();
    }
    await writeFile(runDir+"/evidence.json",JSON.stringify(output,null,2)+"\n");
  }
}finally{
  await browser.close();
  output.finishedAt=new Date().toISOString();
  output.overallResult=hadFailure?"REMEDIATE":"LAB_ENDURANCE_PASS_NOT_PROTECTED_DEPLOYMENT";
  await writeFile(runDir+"/evidence.json",JSON.stringify(output,null,2)+"\n");
}
if(hadFailure){console.error("Reader P0 endurance FAIL; see exact-head trace artifacts");process.exitCode=1;}
