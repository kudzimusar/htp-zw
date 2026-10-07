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
        const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
        const pageErrors=[];
        const consoleErrors=[];
        page.on('pageerror',error=>pageErrors.push(String(error)));
        page.on('console',message=>{
          if(message.type()!=='error') return;
          const value=message.text();
          if(/favicon|Failed to load resource.*404/i.test(value)) return;
          consoleErrors.push(value);
        });
        const response=await page.goto(base+route.path,{waitUntil:'domcontentloaded',timeout:30000});
        if(!response||response.status()>=400) throw new Error(route.name+' HTTP '+(response?.status()??'none'));
        await page.getByText(route.marker,{exact:true}).first().waitFor({state:'visible',timeout:30000});
        const dims=await page.evaluate(()=>({
          scrollWidth:document.documentElement.scrollWidth,
          clientWidth:document.documentElement.clientWidth
        }));
        if(dims.scrollWidth>dims.clientWidth+2) throw new Error(route.name+' horizontal overflow '+JSON.stringify(dims));
        if(pageErrors.length) throw new Error(route.name+' page errors: '+pageErrors.join(' | '));
        if(consoleErrors.length) throw new Error(route.name+' console errors: '+consoleErrors.join(' | '));
        if(route.path==='/'&&viewport.name==='mobile'){
          const tabs=await page.getByRole('tab').count();
          if(tabs<5) throw new Error('mobile canonical navigation tabs missing: '+tabs);
        }
        if(route.path==='/'&&viewport.name==='desktop'){
          const tabs=await page.getByRole('tab').count();
          if(tabs!==0) throw new Error('desktop rendered mobile navigation tabs: '+tabs);
        }
        const file=path.join(out,viewport.name+'-'+route.name+'.png');
        await page.screenshot({path:file,fullPage:true});
        evidence.checks.push({viewport:viewport.name,route:route.path,status:response.status(),marker:route.marker,horizontal_overflow:false,page_error_count:0,console_error_count:0,file});
        await page.close();
      }
    }
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(evidence,null,2)+'\n');
    process.stdout.write(JSON.stringify(evidence,null,2)+'\n');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
