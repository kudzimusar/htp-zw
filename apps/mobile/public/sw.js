// Public Reader cache only. Never cache authenticated Studio, APIs, Premium,
// service-worker updates, or fresh editorial manifests.
const CACHE_NAME = "healthtimes-universal-p0-v3";

const scopePath = new URL(self.registration.scope).pathname;
const scopedPath = (path = "") => scopePath + path.replace(/^\\/+/, "");
const SHELL = [scopedPath(), scopedPath("manifest.json"), scopedPath("healthtimes-icon.svg")];

function isRestrictedPath(pathname) {
  return /(?:^|\\/)(?:studio|owner-preview|api|auth|account-access|premium|checkout|billing|finance)(?:\\/|$)/i.test(pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("healthtimes-universal-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("Authorization")) return;
  const url = new URL(request.url);
  if(url.origin!==self.location.origin) return;

  // The public manifest must never be served from an old SW cache: the
  // Reader separately verifies the SHA-256 and 15-minute publication age.
  // Bypass the SW entirely to honor browser no-store and independent freshness.
  if(url.pathname.endsWith("/healthtimes-public-feed.json") ||
    url.pathname.endsWith("/build-info.json") ||
    isRestrictedPath(url.pathname) ||
    request.cache === "no-store" || request.cache === "reload") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if(response.ok && response.type==="basic" && response.headers.get("content-type")?.includes("text/html")) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.put(request,copy)));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(scopedPath())))
    );
    return;
  }

  // Versioned Reader asset requests are network-first to avoid the old build
  // being served after an update. Offline cache remains available on failure.
  event.respondWith(
    fetch(request)
      .then((response)=>{
        if(response.ok && response.type==="basic"){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.put(request,copy)));
        }
        return response;
      })
      .catch(()=>caches.match(request))
  );
});
