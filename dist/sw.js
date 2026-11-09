const SHELL_VERSION='1.0.0-b54d36030a9d';
const ENTRY_SHA256='9d7281e8d7cf3df3ed207a38b90528f570b2bbbd205d107a76bd7450a1f8c89f';
const SHELL='yb-shell-'+SHELL_VERSION, META='yb-metadata', ROOT=self.registration.scope;
const absolute=path=>new URL(path,ROOT).href;
const STATE=absolute('./__offline_state__');
const ENTRY='./offline-entry.json';
const BOOT=[ENTRY,'./styles.css','./app.js','./adventure.js','./core.js','./offline.js','./recorder.js','./curriculum.json','./app.webmanifest','./assets/icon.svg','./assets/mascot.svg'];
async function entryResponse(response,expectedHash){
 if(!response?.ok||!expectedHash)throw new Error('离线首页尚未准备好');
 const bytes=await response.arrayBuffer();
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 if(actual!==expectedHash)throw new Error('离线首页校验未通过');
 const payload=JSON.parse(new TextDecoder().decode(bytes));
 if(payload.encoding!=='base64'||typeof payload.content!=='string')throw new Error('离线首页格式无效');
 const binary=atob(payload.content),html=Uint8Array.from(binary,c=>c.charCodeAt(0));
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL);await cache.addAll(BOOT.map(absolute));
 await cache.put(absolute('./index.html'),await entryResponse(await cache.match(absolute(ENTRY)),ENTRY_SHA256));
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function state(){const cache=await caches.open(META),response=await cache.match(STATE);return response?response.json():null;}
async function validAsset(response,asset){
 try{if(!response?.ok)return false;const bytes=await response.arrayBuffer();if(bytes.byteLength!==asset.bytes)return false;const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')===asset.sha256;}catch{return false;}
}
async function status(){
 const current=await state();if(!current)return {complete:false,cached:0,total:0};
 const cache=await caches.open('yb-pack-'+current.version),manifestResponse=await cache.match(absolute('./resources.json'));
 if(!manifestResponse)return {complete:false,cached:0,total:0,version:current.version};
 const manifest=await manifestResponse.json();let cached=0;
 for(const asset of manifest.assets){const r=await cache.match(absolute(asset.url));if(await validAsset(r,asset))cached++;}
 return {complete:cached===manifest.assets.length,cached,total:manifest.assets.length,version:current.version,totalBytes:manifest.totalBytes,coverage:manifest.coverage};
}
self.addEventListener('message',event=>{
 event.waitUntil((async()=>{
  const reply=value=>event.ports[0]?.postMessage(value);
  try{
   if(event.data.type==='STATUS')return reply(await status());
   if(event.data.type==='COMMIT'){
    const version=event.data.version;
    if(typeof version!=='string'||!/^1\.0\.0-[a-f0-9]{12}$/.test(version))throw new Error('课程版本无效');
    const cache=await caches.open('yb-pack-'+version),r=await cache.match(absolute('./resources.json'));
    if(!r)throw new Error('下载清单尚未保存');
    const manifest=await r.json();
    if(manifest.version!==version)throw new Error('课程版本不一致');
    for(const asset of manifest.assets){if(!await validAsset(await cache.match(absolute(asset.url)),asset))throw new Error('还有课程资源没有下载完整或校验未通过');}
    const metadata=await caches.open(META);await metadata.put(STATE,new Response(JSON.stringify({version}),{headers:{'Content-Type':'application/json'}}));
    reply({complete:true,version});
   }else if(event.data.type==='ACTIVATE')await self.skipWaiting();
  }catch(e){reply({error:e.message});}
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==new URL(ROOT).origin||!url.href.startsWith(ROOT))return;
 if(url.searchParams.has('yb-update')){event.respondWith(fetch(request));return;}
 event.respondWith((async()=>{
  const current=await state(),key=(request.mode==='navigate'&&(url.pathname===new URL(ROOT).pathname||url.pathname.endsWith('/index.html')))?absolute('./index.html'):request.url;
  if(current){
   const pack=await caches.open('yb-pack-'+current.version);
   if(key===absolute('./index.html')){
    const encoded=await pack.match(absolute(ENTRY));
    if(encoded){
     try{const manifest=await(await pack.match(absolute('./resources.json'))).json();const asset=manifest.assets.find(a=>absolute(a.url)===absolute(ENTRY));return await entryResponse(encoded,asset?.sha256);}catch{/* A damaged document must never be served; retain the checked boot shell. */}
    }
   }
   const hit=await pack.match(key);if(hit)return hit;
  }
  const shell=await caches.open(SHELL),hit=await shell.match(key);if(hit)return hit;
  try{return await fetch(request);}catch{return new Response(request.mode==='navigate'?'请先联网打开学习小屋并下载完整课程。':'离线资源尚未下载',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
