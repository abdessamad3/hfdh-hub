// Only public app resources enter Cache Storage. Student records use the UID-isolated device database.
const VERSION='katatib-offline-20261019-1',META='katatib-offline-meta';
const SDK='https://www.gstatic.com/firebasejs/12.12.0/';
const allowedHost=['katatib-64049.web.app','katatib-64049.firebaseapp.com','localhost','127.0.0.1'].includes(location.hostname);
self.addEventListener('install',()=>{if(allowedHost)self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{if(!allowedHost)return;await self.clients.claim();})()));
async function fetchOK(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const response=await fetch(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});if(!response.ok||response.type==='opaque')throw Error('offline-download-failed');return response;}finally{clearTimeout(timer);}}
async function prepare(){if(!allowedHost)throw Error('offline-wrong-site');const staging=VERSION+'-'+crypto.randomUUID(),cache=await caches.open(staging);
 try{const manifest=await (await fetchOK('/offline-shell.json')).json();
 if(manifest.schemaVersion!==1||!Array.isArray(manifest.assets)||manifest.assets.length>100||manifest.assets.some(a=>typeof a.path!=='string'||!/^\/(|live\/[a-z-]+\.mjs|live\/[a-z-]+\.css|styles\.css|favicon\.svg|manifest\.webmanifest|mushaf\/(manifest\.json|source-license\.txt))$/.test(a.path)||!/^[a-f0-9]{64}$/.test(a.sha256)))throw Error('offline-invalid-shell');
 for(const asset of manifest.assets){const r=await fetchOK(asset.path),bytes=await r.clone().arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),hex=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');if(hex!==asset.sha256)throw Error('offline-deployment-changed');await cache.put(asset.path,r);}
 const config=await fetchOK('/__/firebase/init.json'),data=await config.clone().json();if(data.projectId!=='katatib-64049')throw Error('offline-wrong-project');await cache.put('/__/firebase/init.json',config);
 const visited=new Set();async function sdk(url){if(!url.startsWith(SDK)||visited.has(url))return;if(visited.size>=40)throw Error('offline-sdk-limit');visited.add(url);const response=await fetchOK(url),text=await response.clone().text();await cache.put(url,response);const dependencies=[...text.matchAll(/(?:from\s*|import\s*\(?)['"]([^'"]+)['"]/g)].map(m=>new URL(m[1],url).href).filter(u=>u.startsWith(SDK));for(const dep of dependencies)await sdk(dep);}
 for(const name of ['firebase-app.js','firebase-auth.js','firebase-firestore.js'])await sdk(SDK+name);
 const meta=await caches.open(META);await meta.put('/active-package',new Response(staging));
 for(const name of await caches.keys())if(name.startsWith('katatib-offline-')&&name!==META&&name!==staging)await caches.delete(name);
 }catch(e){await caches.delete(staging);throw e;}
}
self.addEventListener('message',event=>{if(event.data?.type!=='PREPARE'||!event.ports[0])return;event.waitUntil((navigator.locks?.request?navigator.locks.request('katatib-offline-package',prepare):prepare()).then(()=>event.ports[0].postMessage({ok:true})).catch(()=>event.ports[0].postMessage({ok:false})));});
self.addEventListener('fetch',event=>{if(!allowedHost||event.request.method!=='GET')return;const url=new URL(event.request.url),local=url.origin===location.origin;
 if(!(local&&(url.pathname==='/'||url.pathname==='/__/firebase/init.json'||/^\/(live\/[^/]+\.(mjs|css)|styles\.css|favicon\.svg|manifest\.webmanifest|mushaf\/(manifest\.json|source-license\.txt))$/.test(url.pathname))||url.href.startsWith(SDK)))return;
 event.respondWith((async()=>{const meta=await caches.open(META),pointer=await meta.match('/active-package');if(!pointer)return fetch(event.request);const cache=await caches.open(await pointer.text());
 try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);let response;try{response=await fetch(event.request,{signal:controller.signal});}finally{clearTimeout(timer);}if(response.ok)return response; // Never cache a mixed deployment silently; preparation pins one complete shell.
 return response;}catch{const cached=await cache.match(local?url.pathname:url.href);if(cached)return cached;throw Error('offline-resource-not-prepared');}})());
});
