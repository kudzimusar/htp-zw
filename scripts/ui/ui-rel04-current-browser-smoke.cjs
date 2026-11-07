#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('@playwright/test');

const base=(process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4174').replace(/\/$/,'');
const candidateSha=process.env.EXPECTED_SHA||process.env.GITHUB_SHA||null;
const viewports=[
  {name:'mobile',width:390,height:844},
  {name:'desktop',width:1440,height:1000}
];
const routes=[
  {name:'home',path:'/',marker:'Top Stories'},
  {name:'explore',path:'/explore',marker:'Explore by topic'},
  {name:'premium',path:'/premium',marker:'HEALTHTIMES PREMIUM'},
  {name:'my',path:'/my',marker:'My HealthTimes'}
];

(async()=>{
  const browser=await chromium.launch({headless:true});
  const evidence={candidate_sha:candidateSha,base_url:base,browser:browser.version(),captured_at:new Date().toISOString(),checks:[]};
  const out=path.resolve('ui-rel04-evidence/current-browser-smoke');
  fs.mkdirSync(out,{recursive:true});
  try{
    for(const viewport of viewports){
      for(const route of routes){
        let attempt = 0;
        const maxAttempts = 3;
        let lastError = null;

        while(attempt < maxAttempts){
          attempt++;
          const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
          const pageErrors=[];
          const consoleErrors=[];
          const non200Responses=[];

          page.on('pageerror',error=>pageErrors.push(String(error)));
          page.on('response',res=>{
            const status=res.status();
            if(status>=400){
              const url=res.url();
              if(/favicon|404/i.test(url) && status===404) return;
              non200Responses.push({status,statusText:res.statusText(),url,method:res.request().method()});
            }
          });
          page.on('console',message=>{
            if(message.type()!=='error') return;
            const value=message.text();
            if(/favicon|Failed to load resource.*404/i.test(value)) return;
            consoleErrors.push(value);
          });

          try{
            const response=await page.goto(base+route.path,{waitUntil:'domcontentloaded',timeout:30000});
            if(!response||response.status()>=400) throw new Error(route.name+' HTTP '+(response?.status()??'none'));
            await page.getByText(route.marker,{exact:true}).first().waitFor({state:'visible',timeout:30000});
            const dims=await page.evaluate(()=>({
              scrollWidth:document.documentElement.scrollWidth,
              clientWidth:document.documentElement.clientWidth
            }));
            if(dims.scrollWidth>dims.clientWidth+2) throw new Error(route.name+' horizontal overflow '+JSON.stringify(dims));
            if(pageErrors.length) throw new Error(route.name+' page errors: '+pageErrors.join(' | '));

            // If console errors or non-200 responses occurred from upstream staging backend (e.g. 500/502/503/504)
            // under high concurrent load, log details and retry if attempts remain
            if(consoleErrors.length || non200Responses.length){
              const details = non200Responses.map(r=>`${r.method} ${r.url} -> ${r.status} ${r.statusText}`).join('; ');
              const errSummary = route.name+' console/network errors: '+consoleErrors.join(' | ')+(details ? ' [upstream: '+details+']' : '');
              if(attempt < maxAttempts){
                console.warn(`[WARN] ${errSummary} on attempt ${attempt}. Retrying in 2s...`);
                await page.close();
                await new Promise(r=>setTimeout(r, 2000));
                continue;
              }
              throw new Error(errSummary);
            }

            if(route.path==='/'&&viewport.name==='mobile'){
              const tabs=(await page.getByRole('tab').count())-(await page.getByRole('tab',{name:/Home filter$/}).count());
              if(tabs<5) throw new Error('mobile canonical navigation tabs missing: '+tabs);
            }
            if(route.path==='/'&&viewport.name==='desktop'){
              const tabs=(await page.getByRole('tab').count())-(await page.getByRole('tab',{name:/Home filter$/}).count());
              if(tabs!==0) throw new Error('desktop rendered mobile navigation tabs: '+tabs);
            }
            const file=path.join(out,viewport.name+'-'+route.name+'.png');
            await page.screenshot({path:file,fullPage:true});
            evidence.checks.push({viewport:viewport.name,route:route.path,status:response.status(),marker:route.marker,horizontal_overflow:false,page_error_count:0,console_error_count:0,file,attempts:attempt});
            await page.close();
            lastError = null;
            break;
          } catch(err){
            lastError = err;
            await page.close();
            if(attempt < maxAttempts){
              console.warn(`[WARN] Route ${route.name} failed attempt ${attempt}: ${err.message}. Retrying in 2s...`);
              await new Promise(r=>setTimeout(r, 2000));
            }
          }
        }

        if(lastError){
          throw lastError;
        }
      }
    }
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(evidence,null,2)+'\n');
    process.stdout.write(JSON.stringify(evidence,null,2)+'\n');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
