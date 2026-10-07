#!/usr/bin/env node
'use strict';

const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {URL}=require('node:url');

const dist=path.resolve('apps/mobile/dist');
const port=Number(process.env.PORT||4174);
const types={
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon',
  '.woff':'font/woff',
  '.woff2':'font/woff2'
};

function inside(file){
  const resolved=path.resolve(file);
  return resolved===dist||resolved.startsWith(dist+path.sep);
}

function send(res,file,status=200){
  if(!inside(file)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404,{'cache-control':'no-store'});
    res.end('Not found');
    return;
  }
  res.writeHead(status,{
    'content-type':types[path.extname(file).toLowerCase()]||'application/octet-stream',
    'cache-control':'no-store'
  });
  fs.createReadStream(file).pipe(res);
}

if(!fs.existsSync(path.join(dist,'index.html'))){
  throw new Error('Canonical apps/mobile export missing: apps/mobile/dist/index.html');
}

const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const rel=pathname.replace(/^\/+/,'');

  if(!rel){
    send(res,path.join(dist,'index.html'));
    return;
  }

  const direct=path.join(dist,rel);
  if(inside(direct)&&fs.existsSync(direct)&&fs.statSync(direct).isFile()){
    send(res,direct);
    return;
  }

  if(!path.extname(rel)){
    for(const candidate of [path.join(dist,rel+'.html'),path.join(dist,rel,'index.html')]){
      if(inside(candidate)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){
        send(res,candidate);
        return;
      }
    }
    send(res,path.join(dist,'index.html'));
    return;
  }

  res.writeHead(404,{'cache-control':'no-store'});
  res.end('Not found');
});

server.listen(port,'127.0.0.1',()=>{
  console.log('UI-REL-04 canonical Reader server http://127.0.0.1:'+port);
});
