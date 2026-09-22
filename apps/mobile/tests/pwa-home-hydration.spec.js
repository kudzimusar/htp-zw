const { test, expect } = require("@playwright/test");
const http = require("node:http");
const { readFile, stat } = require("node:fs/promises");
const { extname, join, normalize, resolve } = require("node:path");

const distRoot=resolve(__dirname,"../dist");
const basePath="/htp-zw";
let server;
let origin;

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
    try{
      const htmlCandidate=candidate+".html";
      await stat(htmlCandidate);
      return htmlCandidate;
    }catch{}
    try{
      const indexCandidate=join(candidate,"index.html");
      await stat(indexCandidate);
      return indexCandidate;
    }catch{}
  }
  return null;
}

test.beforeAll(async()=>{
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
  origin="http://127.0.0.1:"+address.port;
});

test.afterAll(async()=>{
  if(server) await new Promise((resolveClose,reject)=>server.close((error)=>error?reject(error):resolveClose()));
});

test.use({ serviceWorkers:"block" });

test("Home survives loading to loaded hydration after an async source transition",async({page})=>{
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

  await expect(page.getByText("Loading Home…",{exact:true})).toBeVisible({timeout:5000});
  await expect(page.getByText("Top Stories",{exact:true})).toBeVisible({timeout:15000});
  await expect(page.getByText("Loading Home…",{exact:true})).toHaveCount(0);

  expect(sourceRequests).toBeGreaterThan(0);
  expect(hookFailures).toEqual([]);
});
