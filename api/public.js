'use strict';

const { renderStoryPage, renderContextPage, renderSitemap, renderFeed, renderAdPreview } = require('../lib/ag05-public-runtime');

function config() {
  const url=(process.env.SUPABASE_URL || process.env.HEALTHTIMES_SUPABASE_URL || '').replace(/\/$/,'');
  const key=process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY || '';
  return {url,key};
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
}

function send(res,status,body,type='text/html; charset=utf-8',cache='public, max-age=60, s-maxage=300') {
  res.statusCode=status;
  res.setHeader('Content-Type',type);
  res.setHeader('Cache-Control',cache);
  setSecurityHeaders(res);
  res.end(body);
}

async function rpc(name,args={}) {
  const {url,key}=config();
  if(!url || !key){
    const e=new Error('HealthTimes staging public runtime is not configured.');
    e.status=503;
    throw e;
  }
  const response=await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(name)}`,{
    method:'POST',
    headers:{apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify(args),
    redirect:'manual'
  });
  const text=await response.text();
  let data=null;
  if(text){
    try{ data=JSON.parse(text); }catch{ data=text; }
  }
  if(!response.ok){
    const e=new Error(`Public content RPC failed (${response.status})`);
    e.status=response.status;
    e.backend=data;
    throw e;
  }
  return data;
}

function requestedPath(req,url) {
  const queryPath=url.searchParams.get('path');
  if(queryPath) return queryPath.startsWith('/') ? queryPath : '/' + queryPath;
  return url.pathname || '/';
}

function notFound(path) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found — HealthTimes</title><link rel="stylesheet" href="/styles.css"></head><body><main class="shell" style="min-height:70vh;display:grid;place-items:center;padding:50px 0"><section><span class="eyebrow">404</span><h1>Page not found</h1><p>No authoritative migrated destination is known for this path.</p><a class="button button-primary" href="/">HealthTimes home</a></section></main></body></html>`;
}

module.exports=async function handler(req,res){
  if(req.method!=='GET' && req.method!=='HEAD') return send(res,405,'Method not allowed','text/plain; charset=utf-8','no-store');

  const url=new URL(req.url,`https://${req.headers.host || 'localhost'}`);
  const kind=String(url.searchParams.get('kind')||'page');

  try{
    if(kind==='sitemap'){
      const xml=await rpc('ag05_public_sitemap_xml',{});
      const body=typeof xml==='string' ? xml : String(xml||'');
      const count=(body.match(/<url>/g)||[]).length;
      res.setHeader('X-AG05-Sitemap-URL-Count',String(count));
      return send(res,200,req.method==='HEAD'?'':body,'application/xml; charset=utf-8','public, max-age=300, s-maxage=1800');
    }

    if(kind==='feed'){
      const rows=await rpc('ag05_public_feed_rows',{p_limit:50});
      const body=renderFeed(Array.isArray(rows)?rows:[]);
      res.setHeader('X-AG05-Feed-Item-Count',String(Array.isArray(rows)?rows.length:0));
      return send(res,200,req.method==='HEAD'?'':body,'application/rss+xml; charset=utf-8','public, max-age=120, s-maxage=600');
    }

    if(kind==='ad-preview'){
      const ad=await rpc('ag05_hospaz_direct_ad_preview',{});
      const body=renderAdPreview(ad,{supabaseUrl:config().url});
      res.setHeader('X-Robots-Tag','noindex, nofollow');
      return send(res,body?200:404,req.method==='HEAD'?'':(body||notFound(url.pathname)),'text/html; charset=utf-8','no-store');
    }

    const path=requestedPath(req,url);

    if(/^\/(category|tag|author)\//i.test(path)){
      const context=await rpc('ag05_public_context_document',{p_path:path});
      if(context){
        const html=renderContextPage(context);
        res.setHeader('X-AG05-Resolution',String(context.routing_disposition||'context'));
        return send(res,200,req.method==='HEAD'?'':html,'text/html; charset=utf-8','public, max-age=60, s-maxage=300');
      }
      res.setHeader('X-AG05-Resolution','context_alias_evidence_missing');
      return send(res,404,req.method==='HEAD'?'':notFound(path),'text/html; charset=utf-8','public, max-age=60');
    }

    const resolution=await rpc('ag05_resolve_public_path',{p_path:path});
    const status=Number(resolution?.http_status||404);

    if(status===301 && resolution?.target_path){
      res.statusCode=301;
      res.setHeader('Location',resolution.target_path);
      res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600');
      res.setHeader('X-AG05-Resolution',String(resolution.resolution||'redirect'));
      setSecurityHeaders(res);
      return res.end();
    }

    if(status!==200 || resolution?.resolution==='explicit_404_exception'){
      res.setHeader('X-AG05-Resolution',String(resolution?.resolution||'explicit_404_exception'));
      return send(res,404,req.method==='HEAD'?'':notFound(path),'text/html; charset=utf-8','public, max-age=60');
    }

    if(path==='/'){
      res.statusCode=302;
      res.setHeader('Location','/');
      return res.end();
    }

    const doc=await rpc('ag05_public_story_document',{p_path:path});
    if(!doc){
      res.setHeader('X-AG05-Resolution','document_missing');
      return send(res,404,req.method==='HEAD'?'':notFound(path),'text/html; charset=utf-8','no-store');
    }
    const html=renderStoryPage(doc,{supabaseUrl:config().url});
    res.setHeader('X-AG05-Resolution',String(resolution?.resolution||'preserved_direct'));
    res.setHeader('X-AG05-Source-ID',String(doc.source_id||''));
    return send(res,200,req.method==='HEAD'?'':html,'text/html; charset=utf-8','public, max-age=60, s-maxage=300');
  }catch(error){
    const status=Number(error.status)||500;
    const safe=status>=400&&status<600?status:500;
    return send(res,safe,'HealthTimes staging public runtime failed safely.','text/plain; charset=utf-8','no-store');
  }
};
