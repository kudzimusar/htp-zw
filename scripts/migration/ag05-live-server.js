#!/usr/bin/env node
'use strict';

const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const handler=require('../../api/public');

const root=path.resolve(__dirname,'../..');
const port=Number(process.env.PORT||4174);
const mime={
  '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'
};

function safeFile(urlPath){
  const pathname=decodeURIComponent(String(urlPath||'/').split('?')[0]);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)) return null;
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()) return null;
  return file;
}

const server=http.createServer(async (req,res)=>{
  const original=req.url||'/';
  const url=new URL(original,'http://127.0.0.1');

  if(url.pathname==='/sitemap.xml') req.url='/api/public?kind=sitemap';
  else if(url.pathname==='/feed'||url.pathname==='/feed/') req.url='/api/public?kind=feed';
  else if(url.pathname==='/__ag05/direct-ad-preview') req.url='/api/public?kind=ad-preview';
  else {
    const file=safeFile(url.pathname);
    if(file){
      res.statusCode=200;
      res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');
      return fs.createReadStream(file).pipe(res);
    }
    req.url=`/api/public?kind=page&path=${encodeURIComponent(url.pathname)}`;
  }

  try{ await handler(req,res); }
  catch(error){
    res.statusCode=500;
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.end('AG-05 live rehearsal harness failed safely.');
  } finally {
    req.url=original;
  }
});

server.listen(port,'127.0.0.1',()=>{
  process.stdout.write(`AG05 live rehearsal server http://127.0.0.1:${port}\n`);
});
