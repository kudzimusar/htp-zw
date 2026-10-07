import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2] ?? ".");
const port=Number(process.argv[3] ?? "4173");

const types={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".svg":"image/svg+xml",
  ".ico":"image/x-icon",
  ".woff":"font/woff",
  ".woff2":"font/woff2"
};

function resolveFile(urlPath){
  const clean=decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative=clean.replace(/^\/+/, "");
  let target=path.join(root,relative);
  if(target.endsWith(path.sep)) target=path.join(target,"index.html");
  if(fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  if(!path.extname(target) && fs.existsSync(target+".html")) return target+".html";
  if(fs.existsSync(path.join(target,"index.html"))) return path.join(target,"index.html");
  return null;
}

const server=http.createServer((req,res)=>{
  const file=resolveFile(req.url ?? "/");
  if(!file){
    res.writeHead(404,{"content-type":"text/plain; charset=utf-8"});
    res.end("Not found");
    return;
  }
  const ext=path.extname(file).toLowerCase();
  res.writeHead(200,{"content-type":types[ext] ?? "application/octet-stream","cache-control":"no-store"});
  fs.createReadStream(file).pipe(res);
});

server.listen(port,"127.0.0.1",()=>{
  process.stdout.write(`UI-WF-01A static evidence server listening on ${port}\n`);
});
