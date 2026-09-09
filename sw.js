const CACHE='healthtimes-shell-v21-quality-pass';
const SHELL=['./','./index.html','./article.html','./premium.html','./preferences.html','./about.html','./archive.html','./manual.html','./styles.css','./v21.css','./v21-fixes.css','./reader.css','./quality-pass.css','./app.js','./v21.js','./reader.js','./ad-placement.js','./quality-pass.js','./favicon.svg','./site.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
