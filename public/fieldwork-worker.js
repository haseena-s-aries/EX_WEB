/* Build replaces the precache list and revision. Never cache API responses or bearer tokens here. */
const CACHE = 'ex-survey-shell-__REVISION__';
const ASSETS = __ASSETS__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('ex-survey-shell-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(c=>c.match('index.html'))));return;
  }
  if(ASSETS.some(asset=>new URL(asset,self.registration.scope).pathname===url.pathname))
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request,{ignoreSearch:true}))||fetch(request)));
});
