import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";

const base=(process.env.PUBLIC_URL||"https://kudzimusar.github.io/htp-zw").replace(/\/+$/,"");
const root=process.env.ARTIFACT_DIR||"artifacts/ui06/premium-prompt-live-cert";
const route="/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks";
fs.mkdirSync(path.join(root,"premium-prompt"),{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage();
const requests=[];
page.on("request",r=>requests.push({url:r.url(),method:r.method(),type:r.resourceType()}));

const rpcPromise=page.waitForResponse(r=>r.url().includes("ag05_public_story_teaser_document"),{timeout:35000}).catch(()=>null);
const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:35000});
await page.waitForFunction(()=>!document.body.innerText.includes("Loading article…"),null,{timeout:35000}).catch(()=>{});
const rpc=await rpcPromise;
let authority=null;
if(rpc){
  try{
    const payload=await rpc.json();
    const raw=Array.isArray(payload)?(payload[0]??{}):payload;
    const html=typeof raw?.premium_teaser_html==="string"?raw.premium_teaser_html:"";
    authority={
      http_status:rpc.status(),
      response_shape:Array.isArray(payload)?"array":"object",
      row_count:Array.isArray(payload)?payload.length:1,
      source_id:String(raw?.source_id??""),
      access_policy:String(raw?.access_policy??""),
      body_html_null:raw?.body_html===null,
      teaser_length:html.length,
      teaser_digest:crypto.createHash("sha256").update(html).digest("hex"),
      teaser_paragraph_count:(html.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi)||[]).length
    };
  }catch(error){
    authority={http_status:rpc.status(),parse_error:String(error)};
  }
}
let initial_state="unresolved";
for(let i=0;i<40;i++){
  const preview=await page.getByText("PREMIUM PREVIEW",{exact:true}).isVisible().catch(()=>false);
  const paywall=await page.getByText("Continue reading with HealthTimes Premium",{exact:false}).first().isVisible().catch(()=>false);
  if(preview){initial_state="preview";break;}
  if(paywall){initial_state="paywall";break;}
  await page.waitForTimeout(250);
}
const badge=await page.getByText("PREMIUM",{exact:true}).first().isVisible().catch(()=>false);
const teaser=page.getByTestId("premium-teaser-paragraph");
const teaser_visible=await teaser.isVisible().catch(()=>false);
const teaser_text=teaser_visible?(await teaser.innerText()).trim():"";
const paywallLocator=page.getByText("Continue reading with HealthTimes Premium",{exact:false}).first();
if(initial_state==="paywall")await paywallLocator.scrollIntoViewIfNeeded().catch(()=>{});
await page.waitForTimeout(250);
const screenshot="premium-prompt/live-mobile-initial-state.png";
await page.screenshot({path:path.join(root,screenshot),fullPage:false});
const result={
  document_status:response?.status()||null,
  route,
  viewport:{width:390,height:844},
  authority,
  premium_badge_visible:badge,
  initial_state,
  preview_visible:initial_state==="preview",
  paywall_visible:initial_state==="paywall",
  teaser_visible,
  teaser_text_length:teaser_text.length,
  teaser_text_digest:teaser_text?crypto.createHash("sha256").update(teaser_text).digest("hex"):null,
  wordpress_content_field_requests:requests.filter(x=>decodeURIComponent(x.url).toLowerCase().includes("wp-json/wp/v2")&&decodeURIComponent(x.url).toLowerCase().includes("content")).length,
  protected_article_requests:requests.filter(x=>/protected.*article|premium.*body|ag05_public_story_document/i.test(x.url)).length,
  screenshot
};
fs.writeFileSync(path.join(root,"premium-prompt","initial-state.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result));
await context.close();
await browser.close();
if(initial_state!=="preview"){
  console.error("UI-06 LIVE PREMIUM JOURNEY NOT CERTIFIED — authorized Premium teaser opened in "+initial_state+" state instead of 20-second preview");
  process.exitCode=1;
}
