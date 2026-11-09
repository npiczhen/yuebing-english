import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),dist=path.join(root,'dist');
const legacyCommit=process.env.YB_LEGACY_COMMIT||'0a7ae64aaad33b7bff5b5672a73a8c7d25492e97';
const oldManifest=JSON.parse(execFileSync('git',['show',`${legacyCommit}:dist/resources.json`],{cwd:root,maxBuffer:16*1024*1024}));
const oldAssets=new Map(oldManifest.assets.map(asset=>[asset.url.slice(2),asset]));
const current=JSON.parse(await readFile(path.join(dist,'resources.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),originalFiles=new Map();
async function legacyFile(name){
 if(originalFiles.has(name))return originalFiles.get(name);
 let buffer;try{buffer=await readFile(path.join(dist,name));}catch{}
 if(!buffer||hash(buffer)!==oldAssets.get(name).sha256){
  const git=execFileSync('git',['show',`${legacyCommit}:dist/${name}`],{cwd:root,maxBuffer:16*1024*1024});
  buffer=[git,Buffer.from(git.toString('utf8').replace(/\r?\n/g,'\r\n'))].find(value=>hash(value)===oldAssets.get(name).sha256);
  assert(buffer,'Legacy bytes: '+name);
 }
 originalFiles.set(name,buffer);return buffer;
}
let legacy=true,remoteManifest=current;const oldWeeks=oldManifest.coverage?.weeks||4,newAssets=new Map(current.assets.map(asset=>[asset.url.slice(2),asset]));let enforceReuse=false,corruptName='',repairedDownloads=0;const rejectedShared=[];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname.slice(1)||'index.html'),filename=path.resolve(dist,name);
  if(!filename.startsWith(dist+path.sep))throw new Error('invalid path');
  if(!legacy&&enforceReuse&&name.endsWith('.mp3')&&oldAssets.get(name)?.sha256===newAssets.get(name)?.sha256){if(name!==corruptName){rejectedShared.push(name);res.writeHead(503).end('unchanged audio must be reused');return;}repairedDownloads++;}
  const buffer=name==='resources.json'?Buffer.from(JSON.stringify(legacy?oldManifest:remoteManifest)):legacy&&oldAssets.has(name)?await legacyFile(name):await readFile(filename);
  res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(buffer);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
const context=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true});
let page;const results=[],errors=[];const record=text=>{results.push(text);console.log('PASS '+text);};
try{
 page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/#parent');
 await page.locator('#download-size').filter({hasText:'MB'}).waitFor();
 await page.evaluate(async()=>{
  localStorage.setItem('yuebing-red-panda-progress-v1',JSON.stringify({schema:1,completed:['w1-d1','w3-d4'],currentLesson:'w4-d1',sessions:{},metPanda:true}));
  await new Promise((resolve,reject)=>{const request=indexedDB.open('yuebing-local-recordings-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('takes',{keyPath:'key'});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('takes','readwrite');tx.objectStore('takes').put({key:'w1-d1/cat',blob:new Blob([new Uint8Array([1,2,3])],{type:'audio/webm'}),durationMs:1000,updatedAt:123});tx.oncomplete=()=>{db.close();resolve();};};});
 });
 await page.getByRole('button',{name:`下载完整${oldWeeks}周课程`,exact:true}).click();
 await page.getByText(`${oldWeeks}周课程已可离线使用。可以关闭网络，再从桌面打开。`,{exact:true}).waitFor({timeout:90000});
 legacy=false;await page.reload();await page.locator('#download-size').filter({hasText:'MB'}).waitFor();
 const before=await page.evaluate(async()=>{const data=await(await fetch('./curriculum.json')).json();return{weeks:data.weeks.length,lessons:data.lessons.length};});
 assert.equal(before.weeks,oldWeeks);assert.equal(before.lessons,oldWeeks*5);record(`Restored the real ${oldWeeks}-week cached app before upgrading`);enforceReuse=true;
 await page.goto(base+'/update.html?yb-update=repair');
 await page.getByRole('button',{name:'下载并打开12周升级版',exact:true}).waitFor();assert((await page.locator('#summary').textContent()).includes('60节课'));
 await page.getByRole('button',{name:'下载并打开12周升级版',exact:true}).click();
 await page.waitForURL(url=>url.pathname==='/'&&url.searchParams.has('yb-open'),{timeout:90000});
 await page.locator('.lesson-card').last().waitFor();assert.equal(await page.locator('.lesson-card').count(),60);assert.equal(await page.locator('.course-section').count(),12);const upgraded=await page.evaluate(async()=>await(await fetch('./curriculum.json')).json());assert.equal(upgraded.version,'2.0.1');assert.equal(upgraded.vocabulary.length,96);assert(upgraded.lessons.every(l=>l.frames.length===6));
 const preserved=await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');const take=await getRecording('w1-d1/cat');return{completed:JSON.parse(localStorage.getItem('yuebing-red-panda-progress-v1')).completed,voiceBytes:take.blob.size,voiceTime:take.updatedAt};});
 assert.deepEqual(preserved,{completed:['w1-d1','w3-d4'],voiceBytes:3,voiceTime:123});record('Independent recovery entry downloads 12 weeks, opens all 60 lessons immediately and retains progress and recordings');
 await page.getByRole('link',{name:'家长入口',exact:true}).click();await page.locator('#download-size').filter({hasText:'MB'}).waitFor();
 remoteManifest={...current,version:'1.0.0-f00d1234abcd'};
 corruptName=oldManifest.assets.find(asset=>asset.url.endsWith('.mp3')&&newAssets.get(asset.url.slice(2))?.sha256===asset.sha256).url.slice(2);
 await page.evaluate(async name=>{const {workerMessage}=await import('./offline.js');const state=await workerMessage('STATUS'),cache=await caches.open('yb-pack-'+state.version);await cache.put(new URL('./'+name,location.href),new Response('damaged audio',{headers:{'Content-Type':'audio/mpeg'}}));},corruptName);
 await page.locator('#download-start').click();
 await page.getByRole('button',{name:'打开已下载的12周课程',exact:true}).waitFor();
 const newest=await page.evaluate(async()=>{const {workerMessage}=await import('./offline.js');return workerMessage('STATUS');});assert.equal(newest.version,remoteManifest.version);assert(newest.complete);
 await page.getByRole('button',{name:'打开已下载的12周课程',exact:true}).click();await page.locator('.lesson-card').last().waitFor();assert.equal(await page.locator('.lesson-card').count(),60);
 record('Ordinary download fetches a newer manifest that appeared after the parent page opened, then opens it without a manual tab restart');
 await context.setOffline(true);await page.close();page=await context.newPage();await page.goto(base+'/#courses');await page.locator('.lesson-card').last().waitFor();assert.equal(await page.locator('.lesson-card').count(),60);
 assert.deepEqual(rejectedShared,[]);assert.equal(repairedDownloads,1);record('Unchanged audio is reused and a corrupted cached clip is fetched again after SHA verification');
 assert.deepEqual(errors,[]);record('Cold reopen offline keeps all 12 weeks available');
 await mkdir(path.join(root,'.qa'),{recursive:true});await writeFile(path.join(root,'.qa/upgrade-flow-report.json'),JSON.stringify({passed:true,legacyCommit,oldWeeks,results,preserved,repairedDownloads,rejectedShared,errors},null,2));
}catch(error){console.error('Diagnostics:',await page?.evaluate(()=>({url:location.href,text:document.body.innerText.slice(-700)})).catch(()=>null));throw error;}
finally{await context.close();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
