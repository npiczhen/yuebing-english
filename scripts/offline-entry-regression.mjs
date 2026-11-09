import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const originalCommit='52f4a757fc0c4a6675afcb91efb1c13ffce959a3';
const oldWorker=execFileSync('git',['show',`${originalCommit}:dist/sw.js`],{cwd:root});
let oldApp=execFileSync('git',['show',`${originalCommit}:dist/app.js`],{cwd:root});
let oldOffline=execFileSync('git',['show',`${originalCommit}:dist/offline.js`],{cwd:root});
const oldManifestBytes=execFileSync('git',['show',`${originalCommit}:dist/resources.json`],{cwd:root});
const oldManifest=JSON.parse(oldManifestBytes),newManifest=JSON.parse(await readFile(path.join(root,'dist/resources.json')));
const oldAssets=new Map(oldManifest.assets.map(a=>[a.url.slice(2),a]));
function originalBytes(name,blob){
 const expected=oldManifest.assets.find(a=>a.url==='./'+name).sha256;
 const candidates=[blob,Buffer.from(blob.toString('utf8').replace(/\r?\n/g,'\r\n'))];
 const bytes=candidates.find(value=>createHash('sha256').update(value).digest('hex')===expected);
 assert(bytes,'legacy fixture must match the original deployed bytes: '+name);return bytes;
}
oldApp=originalBytes('app.js',oldApp);oldOffline=originalBytes('offline.js',oldOffline);
const originalFiles=new Map();
async function oldArtifact(name){
 if(originalFiles.has(name))return originalFiles.get(name);
 let bytes;try{bytes=await readFile(path.join(root,'dist',name));}catch{}
 if(!bytes||createHash('sha256').update(bytes).digest('hex')!==oldAssets.get(name).sha256)bytes=originalBytes(name,execFileSync('git',['show',`${originalCommit}:dist/${name}`],{cwd:root}));
 originalFiles.set(name,bytes);return bytes;
}
assert.equal(createHash('sha256').update(oldWorker).digest('hex'),oldManifest.assets.find(a=>a.url==='./sw.js').sha256);
let legacyManifest=true,legacyWorker=true,htmlRequests=0;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const filename=path.resolve(root,'dist',relative);if(!filename.startsWith(path.join(root,'dist')+path.sep))throw new Error('invalid path');
  let bytes=legacyManifest&&oldAssets.has(relative)?await oldArtifact(relative):await readFile(filename);
  if(relative==='resources.json'&&legacyManifest)bytes=oldManifestBytes;
  if(relative==='app.js'&&legacyManifest)bytes=oldApp;
  if(relative==='offline.js'&&legacyManifest)bytes=oldOffline;
  if(relative==='sw.js'&&(legacyManifest||(legacyWorker&&!url.searchParams.has('yb-update'))))bytes=oldWorker;
  if(relative==='index.html'){
   htmlRequests++;
   bytes=Buffer.from(bytes.toString('utf8').replace('</body>','<script>window.__testInjectedHome="'+Math.random()+'";</script></body>'));
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':bytes.length});res.end(bytes);
 }catch{res.writeHead(404).end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
const context=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 12; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'});
const results=[];let page;const record=text=>{results.push(text);console.log('PASS '+text);};
try{
 page=await context.newPage();console.log('Stage: recreate old download failure');
 await page.goto(base);await page.getByRole('heading',{name:'四周的小小发现'}).waitFor();
 await page.getByRole('link',{name:'家长入口'}).click();await page.locator('#download-size').filter({hasText:'MB'}).waitFor();
 await page.evaluate(()=>localStorage.setItem('yuebing-red-panda-progress-v1',JSON.stringify({schema:1,completed:['w1-d1'],currentLesson:'w1-d2',sessions:{},metPanda:true})));
 await page.getByRole('button',{name:'下载完整4周课程',exact:true}).click();
 await page.getByText('资源校验未通过，请重新下载：./index.html',{exact:true}).waitFor({timeout:90000});
 record('Reproduced reported index.html failure with transformed HTML and the original manifest/worker');
 legacyManifest=false;const before=htmlRequests;console.log('Stage: check update from old page');
 await page.getByRole('button',{name:'检查新版本',exact:true}).click();
 await page.getByText('已取得最新课程清单，点击下载即可完整保存；现有课程继续保留。',{exact:true}).waitFor();
 await page.getByRole('button',{name:'重新检查并下载',exact:true}).click();
 await page.getByText('4周课程已可离线使用。可以关闭网络，再从桌面打开。',{exact:true}).waitFor({timeout:90000});
 assert.equal(htmlRequests,before,'fixed downloads must never fetch transformed HTML');
 record('Original cached client repairs itself through Check for updates, without clearing progress or replacing its worker');
 await context.setOffline(true);await page.close();page=await context.newPage();await page.goto(base);
 await page.getByRole('heading',{name:'十二周的小小发现'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('yuebing-red-panda-progress-v1')).completed),['w1-d1']);
 record('Legacy worker cold-reopens offline and retains existing completed lessons');
 await context.setOffline(false);legacyWorker=false;console.log('Stage: install updated worker');
 await page.evaluate(async()=>{
  const registration=await navigator.serviceWorker.getRegistration();await registration.update();
  if(!registration.waiting)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('worker update timeout')),20000);const check=()=>{if(registration.waiting){clearTimeout(timeout);resolve();}};registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',check));registration.installing?.addEventListener('statechange',check);check();});
  // This assertion concerns the updated worker. Await activation explicitly rather
  // than racing a fresh navigation against the old worker's final client closing.
  const updated=registration.waiting;
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('worker activation timeout: '+JSON.stringify({updated:updated.state,active:registration.active?.state,waiting:registration.waiting?.state,installing:registration.installing?.state}))),20000);
   const check=()=>{if(updated.state==='activated'){clearTimeout(timeout);resolve();}else if(updated.state==='redundant'){clearTimeout(timeout);reject(new Error('updated worker was replaced before activation'));}};
   updated.addEventListener('statechange',check);
   updated.postMessage({type:'ACTIVATE'});
   check();
  });
 });
 console.log('Stage: reopen canonical offline home');await page.close();await context.setOffline(true);page=await context.newPage();await page.goto(base);
 await page.getByRole('heading',{name:'十二周的小小发现'}).waitFor();
 assert.equal(await page.evaluate(()=>window.__testInjectedHome),undefined,'offline HTML must come from the checked canonical payload');
 record('Updated worker reconstructs the exact canonical HTML, excluding injected hosting scripts');
 await context.setOffline(false);await page.goto(base+'/#parent');await page.locator('#download-size').filter({hasText:'MB'}).waitFor();
 const damaged=await page.evaluate(async()=>{
  const {workerMessage}=await import('./offline.js');const status=await workerMessage('STATUS'),cache=await caches.open('yb-pack-'+status.version);
  await cache.put(new URL('./offline-entry.json',location.href),new Response('{"encoding":"base64","content":"dGFtcGVyZWQ="}',{headers:{'Content-Type':'application/json'}}));
  return workerMessage('STATUS');
 });
 assert.equal(damaged.complete,false);assert.equal(damaged.cached,newManifest.assets.length-1);
 await page.getByRole('button',{name:'检查并修复下载'}).click();
 await page.getByText('12周课程已可离线使用。可以关闭网络，再从桌面打开。',{exact:true}).waitFor({timeout:90000});
 record('Corrupted encoded HTML still fails SHA-256 verification and can be repaired');
 const fresh=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true});
 try{
  const direct=await fresh.newPage();await direct.goto(base+'/#parent');
  await direct.locator('#download-size').filter({hasText:'MB'}).waitFor();
  await direct.getByRole('button',{name:'下载完整12周课程',exact:true}).click();
  await direct.getByText('12周课程已可离线使用。可以关闭网络，再从桌面打开。',{exact:true}).waitFor({timeout:90000});
  record('Fresh direct navigation to the parent/download page initializes its worker and completes the download');
 }finally{await fresh.close();}
 await mkdir(path.join(root,'.qa'),{recursive:true});await writeFile(path.join(root,'.qa/offline-entry-regression.json'),JSON.stringify({passed:true,results},null,2));
 results.forEach(result=>console.log('PASS '+result));
}catch(error){console.error('Failure diagnostics:',await page?.evaluate(()=>({url:location.href,status:document.querySelector('#download-status')?.textContent,toast:document.querySelector('#toast')?.textContent,body:document.body.textContent.slice(-600)})).catch(()=>null));throw error;}finally{await context.close();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
