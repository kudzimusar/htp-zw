const { test, expect }=require("@playwright/test");
const fs=require("fs"),path=require("path");
const candidate=process.env.UI_WF01B_CANDIDATE_BASE;
const current=process.env.UI_WF01B_CURRENT_BASE;
const out=process.env.UI_WF01B_EVIDENCE_DIR;
if(!candidate||!current||!out) throw new Error("UI-WF01B evidence environment incomplete");
fs.mkdirSync(out,{recursive:true});

async function resolvedHome(page,url){
  await page.goto(url+"/",{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Top Stories",{exact:true})).toBeVisible({timeout:120000});
  await expect(page.getByText("Loading Home…",{exact:true})).toHaveCount(0);
  await page.waitForTimeout(1200);
}
async function capture(browser,url,name,width,height){
  const context=await browser.newContext({viewport:{width,height},colorScheme:"light"});
  const page=await context.newPage();
  await resolvedHome(page,url);
  await page.screenshot({path:path.join(out,name+".png"),fullPage:true});
  await context.close();
}

test("current-main and final candidate viewport comparison",async({browser})=>{
  for(const [label,width,height] of [["390x844",390,844],["834x1112",834,1112],["1440x1000",1440,1000]]){
    await capture(browser,current,"current-main-home-"+label,width,height);
    await capture(browser,candidate,"candidate-home-"+label,width,height);
  }
});

test("owner phone structure and exact tabs",async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:"light"});
  const page=await context.newPage();
  await resolvedHome(page,candidate);
  for(const label of ["For You","Latest","Zimbabwe","World","Premium"]) await expect(page.getByRole("button",{name:label+" Home filter"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Search HealthTimes"})).toBeVisible();
  await expect(page.getByText("EDITOR'S DESK",{exact:true})).toHaveCount(0);
  await page.screenshot({path:path.join(out,"candidate-home-phone-owner-structure.png"),fullPage:false});
  await context.close();
});

test("dark and zero-space no-Live/unfilled-ad states",async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:"light"});
  const page=await context.newPage();
  await page.goto(candidate+"/",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>localStorage.setItem("ht:nm04:reader:appearance:v1",JSON.stringify("dark")));
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.getByText("Top Stories",{exact:true})).toBeVisible({timeout:120000});
  await page.screenshot({path:path.join(out,"candidate-home-phone-dark.png"),fullPage:false});
  await page.evaluate(()=>localStorage.setItem("ht:nm04:reader:appearance:v1",JSON.stringify("light")));
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.getByText("Top Stories",{exact:true})).toBeVisible({timeout:120000});
  await expect(page.getByText("Live Now",{exact:true})).toHaveCount(0);
  await expect(page.getByText("ADVERTISEMENT",{exact:true})).toHaveCount(0);
  await page.screenshot({path:path.join(out,"candidate-home-no-live-unfilled-ad.png"),fullPage:true});
  fs.writeFileSync(path.join(out,"truth-state.json"),JSON.stringify({serviceMode:"source-parity",liveRendered:false,advertisementRendered:false},null,2));
  await context.close();
});
