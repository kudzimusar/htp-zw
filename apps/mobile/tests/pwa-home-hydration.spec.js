const { chromium } = require("@playwright/test");
const http = require("node:http");
const { readFile, stat } = require("node:fs/promises");
const { extname, join, normalize, resolve } = require("node:path");

const distRoot=resolve(__dirname,"../dist");
const basePath="/htp-zw";
const contentTypes={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".ico":"image/x-icon",
  ".woff":"font/woff",
  ".woff2":"font/woff2"
};

async function resolveFile(pathname){
  if(!pathname.startsWith(basePath)) return null;
  let relative=decodeURIComponent(pathname.slice(basePath.length));
  if(!relative || relative==="/") relative="/index.html";
  const normalizedRelative=normalize(relative).replace(/^(\.\.[/\\])+/, "");
  let candidate=join(distRoot,normalizedRelative);

  try{
    const info=await stat(candidate);
    if(info.isDirectory()) candidate=join(candidate,"index.html");
    return candidate;
  }catch{}

  if(!extname(candidate)){
    for(const fallback of [candidate+".html",join(candidate,"index.html")]){
      try{
        await stat(fallback);
        return fallback;
      }catch{}
    }
  }
  return null;
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

async function main(){
  let server;
  let browser;
  try{
    server=http.createServer(async(req,res)=>{
      try{
        const url=new URL(req.url || "/", "http://127.0.0.1");
        const file=await resolveFile(url.pathname);
        if(!file){
          res.writeHead(404,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"});
          res.end("Not found");
          return;
        }
        const body=await readFile(file);
        res.writeHead(200,{
          "content-type":contentTypes[extname(file)] || "application/octet-stream",
          "cache-control":"no-store"
        });
        res.end(body);
      }catch(error){
        res.writeHead(500,{"content-type":"text/plain; charset=utf-8"});
        res.end(String(error));
      }
    });

    await new Promise((resolveReady)=>server.listen(0,"127.0.0.1",resolveReady));
    const address=server.address();
    const origin="http://127.0.0.1:"+address.port;

    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({serviceWorkers:"block"});
    const page=await context.newPage();
    const hookFailures=[];
    let sourceRequests=0;

    page.on("pageerror",(error)=>{
      if(/hook|rendered more|rendered fewer/i.test(error.message)) hookFailures.push(error.message);
    });
    page.on("console",(message)=>{
      const text=message.text();
      if(message.type()==="error" && /rendered more hooks|rendered fewer hooks|change in the order of hooks/i.test(text)){
        hookFailures.push(text);
      }
    });

    await page.route("https://healthtimes.co.zw/wp-json/**",async(route)=>{
      sourceRequests+=1;
      await new Promise((resolveDelay)=>setTimeout(resolveDelay,900));
      await route.abort("failed");
    });

    await page.goto(origin+basePath+"/",{waitUntil:"domcontentloaded"});

    const loading=page.getByText("Loading Home…",{exact:true});
    await loading.waitFor({state:"visible",timeout:5000});

    const topStories=page.getByText("Top Stories",{exact:true});
    await topStories.waitFor({state:"visible",timeout:15000});
    await loading.waitFor({state:"detached",timeout:5000});

    assert(sourceRequests>0,"Expected the browser to exercise the delayed WordPress Source Parity request.");
    assert(hookFailures.length===0,"React hook-order failure detected: "+hookFailures.join(" | "));

    console.log("Home hydration transition: PASS");
    console.log("Observed loading state: PASS");
    console.log("Observed loaded Home state: PASS");
    console.log("WordPress request delayed then failed closed to source snapshot: PASS");
    console.log("React hook-order runtime errors: 0");
  }finally{
    if(browser) await browser.close();
    if(server) await new Promise((resolveClose,reject)=>server.close((error)=>error?reject(error):resolveClose()));
  }
}

main().catch((error)=>{
  console.error(error);
  process.exitCode=1;
});
