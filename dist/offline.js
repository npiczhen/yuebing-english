import {formatBytes} from './core.js';
const packName=version=>'yb-pack-'+version;
let registration;
export async function registerOffline(){
 if(!('serviceWorker' in navigator)||!window.isSecureContext)throw new Error('当前浏览器不能使用离线功能，请用支持离线网页的浏览器打开 HTTPS 网址。');
 registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
 await navigator.serviceWorker.ready;
 return registration;
}
export async function workerMessage(type,payload={}){
 const reg=registration||await navigator.serviceWorker?.getRegistration();
 if(!reg?.active){
  if(type==='STATUS')return {complete:false,cached:0,total:0};
  throw new Error('离线功能正在准备，请稍后再试。');
 }
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),timeout=setTimeout(()=>reject(new Error('离线检查超时，请重新检查。')),20000);
  channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();e.data.error?reject(new Error(e.data.error)):resolve(e.data);};
  reg.active.postMessage({type,...payload},[channel.port2]);
 });
}
export async function getManifest(fresh=false){
 const response=await fetch('./resources.json'+(fresh?'?yb-update='+Date.now():''),{cache:'no-store'});
 if(!response.ok)throw new Error('暂时无法取得下载清单，请联网后重试。');
 const manifest=await response.json();
 if(!manifest.version||!Array.isArray(manifest.assets)||!manifest.assets.length)throw new Error('课程清单无效。');
 return manifest;
}
async function verified(response,asset){
 if(!response?.ok)return null;
 const data=await response.arrayBuffer();
 if(data.byteLength!==asset.bytes)return null;
 const digest=await crypto.subtle.digest('SHA-256',data);
 const hex=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 return hex===asset.sha256?data:null;
}
export class PackDownloader{
 constructor(onChange){this.onChange=onChange;this.running=false;this.abort=null;this.state={phase:'idle',done:0,total:0,bytes:0,totalBytes:0,text:''};}
 emit(patch){Object.assign(this.state,patch);this.onChange({...this.state});}
 pause(){if(this.running){this.abort.abort();this.emit({text:'正在暂停，已下载的资源会保留。'});}}
 async start(manifest){
  if(this.running)return;
  this.running=true;this.abort=new AbortController();const signal=this.abort.signal;
  this.emit({phase:'downloading',done:0,total:manifest.assets.length,bytes:0,totalBytes:manifest.totalBytes,text:'正在检查已有资源…'});
  let failed=false;
  try{
   const cache=await caches.open(packName(manifest.version));let cursor=0,previousPack;
   // Reuse only byte-for-byte verified assets from the committed course pack.
   // A failed or paused update never changes that committed pack.
   try{
    const metadata=await caches.open('yb-metadata'),response=await metadata.match(new URL('./__offline_state__',location.href));
    const current=response?await response.json():null;
    if(current?.version!==manifest.version&&/^1\.0\.0-[a-f0-9]{12}$/.test(current?.version||''))previousPack=await caches.open(packName(current.version));
   }catch{}
   const task=async()=>{
    while(cursor<manifest.assets.length&&!failed&&!signal.aborted){
     const asset=manifest.assets[cursor++],url=new URL(asset.url,location.href).href;
     let data=await verified(await cache.match(url),asset);
     if(signal.aborted)throw new DOMException('Paused','AbortError');
     if(!data&&previousPack){
      const previous=await previousPack.match(url),contentType=previous?.headers.get('content-type')||'application/octet-stream';
      data=await verified(previous,asset);
      if(data)await cache.put(url,new Response(data,{status:200,headers:{'Content-Type':contentType}}));
     }
     if(!data){
      const response=await fetch(url+'?yb-update='+encodeURIComponent(manifest.version),{cache:'no-store',signal});
      const contentType=response.headers.get('content-type')||'application/octet-stream';
      data=await verified(response,asset);
      if(!data)throw new Error('资源校验未通过，请重新下载：'+asset.url);
      await cache.put(url,new Response(data,{status:200,headers:{'Content-Type':contentType}}));
     }
     this.emit({done:this.state.done+1,bytes:this.state.bytes+asset.bytes,text:`已检查 ${this.state.done+1} / ${manifest.assets.length} 项 · ${formatBytes(this.state.bytes+asset.bytes)}`});
    }
   };
   const results=await Promise.allSettled(Array.from({length:4},()=>task().catch(e=>{failed=true;this.abort.abort();throw e;})));
   const problem=results.find(r=>r.status==='rejected'&&r.reason.name!=='AbortError')||results.find(r=>r.status==='rejected');
   if(problem)throw problem.reason;
   if(signal.aborted)throw new DOMException('Paused','AbortError');
   await cache.put(new URL('./resources.json',location.href),new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
   await workerMessage('COMMIT',{version:manifest.version});
   this.emit({phase:'complete',text:`${manifest.coverage?.weeks||4}周课程已可离线使用。可以关闭网络，再从桌面打开。`});
   if(navigator.storage?.persist)await navigator.storage.persist().catch(()=>false);
  }catch(e){
   const paused=e.name==='AbortError';
   this.emit({phase:paused?'paused':'error',text:paused?'已暂停。再次下载时会检查并保留已完成的资源。':e.name==='QuotaExceededError'?'平板空间不足，请先释放存储空间，再继续下载；原来可用的课程会保留。':e.message||'下载中断，请联网后重试。'});
  }finally{this.running=false;}
 }
}
