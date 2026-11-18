/* Build replaces the precache list, revision and mode. Never cache API responses or bearer tokens here.
 * production: cache-first app shell (versioned by content revision).
 * development: network-first, so local edits always load while online; the cached copy is used only offline. */
const CACHE = 'ex-survey-shell-__REVISION__';
const ASSETS = __ASSETS__;
const MODE = '__MODE__';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>MODE==='development'?self.skipWaiting():undefined)));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('ex-survey-shell-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
const isShellAsset=url=>ASSETS.some(asset=>new URL(asset,self.registration.scope).pathname===url.pathname);
self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  // Only same-origin, credential-free GETs of the static shell. API calls (any origin) always bypass the worker.
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/')||request.headers.has('Authorization'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(c=>c.match('index.html'))));return;
  }
  if(!isShellAsset(url))return;
  if(MODE==='development'){
    event.respondWith(fetch(request).then(async response=>{
      if(response.ok&&response.type==='basic')(await caches.open(CACHE)).put(request,response.clone());
      return response;
    }).catch(async()=>(await caches.open(CACHE)).match(request,{ignoreSearch:true})||Response.error()));
    return;
  }
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request,{ignoreSearch:true}))||fetch(request)));
});
