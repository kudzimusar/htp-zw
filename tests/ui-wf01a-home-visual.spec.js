const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const candidate = process.env.UI_WF01A_CANDIDATE_BASE;
const current = process.env.UI_WF01A_CURRENT_BASE;
const staging = process.env.UI_WF01A_STAGING_BASE;
const evidenceDir = process.env.UI_WF01A_EVIDENCE_DIR || "ui-wf01a-evidence/web";

for (const [label, value] of [["candidate",candidate],["current",current],["staging",staging]]) {
  if (!value) throw new Error("Missing "+label+" evidence base URL");
}
fs.mkdirSync(evidenceDir,{recursive:true});

async function ready(page, base, label) {
  const errors=[];
  page.on("pageerror",(error)=>errors.push(String(error)));
  const response=await page.goto(base.replace(/\/$/,"")+"/",{waitUntil:"domcontentloaded",timeout:60000});
  expect(response && response.status(),label+" HTTP").toBe(200);
  await page.getByText("Top Stories",{exact:true}).first().waitFor({timeout:60000});
  await page.getByRole("button",{name:"HealthTimes Home"}).waitFor({timeout:30000});
  expect(errors,label+" page errors").toEqual([]);
}

async function assertNoOverflow(page,label){
  const dims=await page.evaluate(()=>({
    htmlScroll:document.documentElement.scrollWidth,
    htmlClient:document.documentElement.clientWidth,
    bodyScroll:document.body.scrollWidth
  }));
  expect(dims.htmlScroll,label+" html overflow").toBeLessThanOrEqual(dims.htmlClient+2);
  expect(dims.bodyScroll,label+" body overflow").toBeLessThanOrEqual(dims.htmlClient+2);
}

const viewports=[
  {name:"390x844",width:390,height:844},
  {name:"834x1112",width:834,height:1112},
  {name:"1440x1000",width:1440,height:1000}
];

test("UI-WF-01A candidate Home evidence at required Web/PWA viewports",async({browser})=>{
  test.setTimeout(180000);
  for(const viewport of viewports){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},colorScheme:"light"});
    await ready(page,candidate,"candidate "+viewport.name);
    for(const tab of ["For You","Latest","Zimbabwe","World","Premium"]){
      await expect(page.getByRole("tab",{name:tab})).toBeVisible();
    }
    if(viewport.width<768){
      await expect(page.getByRole("button",{name:"Search HealthTimes"})).toBeVisible();
      await expect(page.getByRole("button",{name:/^Edition .*Change edition$/})).toHaveCount(0);
      await expect(page.getByRole("button",{name:"Notifications"})).toHaveCount(0);
      await expect(page.getByRole("button",{name:"HealthTimes Premium"})).toHaveCount(0);
    }
    if(viewport.width>=1100){
      expect(await page.getByRole("tab").count(),"desktop mobile bottom navigation").toBe(0);
    }
    await assertNoOverflow(page,"candidate "+viewport.name);
    await page.screenshot({path:path.join(evidenceDir,"candidate-home-"+viewport.name+".png"),fullPage:false});
    await page.close();
  }
});

test("current canonical main comparison captures use the same required viewports",async({browser})=>{
  test.setTimeout(180000);
  for(const viewport of viewports){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},colorScheme:"light"});
    await ready(page,current,"current-main "+viewport.name);
    await assertNoOverflow(page,"current-main "+viewport.name);
    await page.screenshot({path:path.join(evidenceDir,"current-main-home-"+viewport.name+".png"),fullPage:false});
    await page.close();
  }
});

test("candidate phone dark mode and truthful empty commercial/live states",async({browser})=>{
  const dark=await browser.newPage({viewport:{width:390,height:844},colorScheme:"dark"});
  await ready(dark,candidate,"candidate phone dark");
  await dark.screenshot({path:path.join(evidenceDir,"candidate-home-phone-dark.png"),fullPage:false});
  await dark.close();

  const page=await browser.newPage({viewport:{width:390,height:844},colorScheme:"light"});
  await ready(page,candidate,"candidate no-live unfilled-ad");
  await expect(page.getByText("Live Now",{exact:true})).toHaveCount(0);
  await expect(page.getByText("ADVERTISEMENT",{exact:true})).toHaveCount(0);
  await page.screenshot({path:path.join(evidenceDir,"candidate-home-no-live-unfilled-ad.png"),fullPage:false});
  await page.close();
});

test("current truthful HOSPAZ staging capability renders as disclosed advertising",async({browser})=>{
  test.setTimeout(90000);
  const page=await browser.newPage({viewport:{width:390,height:844},colorScheme:"light"});
  const errors=[];
  page.on("pageerror",(error)=>errors.push(String(error)));
  const response=await page.goto(staging.replace(/\/$/,"")+"/",{waitUntil:"domcontentloaded",timeout:60000});
  expect(response && response.status(),"staging Home HTTP").toBe(200);
  await page.getByText("Top Stories",{exact:true}).first().waitFor({timeout:60000});
  const disclosure=page.getByText("ADVERTISEMENT",{exact:true}).first();
  await disclosure.waitFor({timeout:60000});
  await page.screenshot({path:path.join(evidenceDir,"candidate-home-hospaz-filled.png"),fullPage:false});
  expect(errors,"staging page errors").toEqual([]);
  await page.close();
});
