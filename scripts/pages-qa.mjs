// Project-path smoke test; uses the existing local QA browser, never installs one.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist');
const prefix='/yuebing-english/',requests=[],errors=[];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');requests.push(url.pathname);
 try{
  assert(url.pathname.startsWith(prefix));
  const name=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html',filename=path.resolve(dist,name);
  assert(filename.startsWith(dist+path.sep));
  const data=await readFile(filename);res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch{res.writeHead(404).end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
const require=createRequire(process.env.YB_PLAYWRIGHT_PACKAGE||'C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.YB_CHROMIUM_PATH||'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
const context=await browser.newContext({viewport:{width:800,height:1280},hasTouch:true});
await context.addInitScript(()=>{const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.playbackRate=8;return original.call(this);};});
let page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'update.html?yb-update=repair');await page.locator('#start').filter({hasText:'升级版'}).waitFor();
 assert((await page.locator('#summary').textContent()).includes('2.0.1'));
 await page.locator('#start').click();
 await page.waitForURL(url=>url.pathname===prefix&&url.searchParams.has('yb-open'),{timeout:120000});
 await page.locator('.lesson-card').last().waitFor();assert.equal(await page.locator('.lesson-card').count(),60);
 const pack=await page.evaluate(async()=>{const {workerMessage}=await import('./offline.js');return workerMessage('STATUS');});
 assert(pack.complete);assert.equal(pack.coverage.curriculumVersion,'2.0.1');assert.equal(pack.coverage.words,96);
 const manifest=await page.evaluate(async()=>{const data=await(await fetch('./app.webmanifest')).json();return {start:new URL(data.start_url,location.href).pathname,scope:new URL(data.scope,location.href).pathname};});
 assert.equal(manifest.start,prefix);assert.equal(manifest.scope,prefix);
 console.log('PASS complete course download, update redirect and PWA scope under the repository path');
 await context.setOffline(true);await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#courses');await page.locator('.lesson-card').last().waitFor();assert.equal(await page.locator('.lesson-card').count(),60);
 await page.evaluate(()=>{localStorage.setItem('yuebing-red-panda-progress-v1',JSON.stringify({schema:1,metPanda:true,currentLesson:'w9-d2',completed:[],sessions:{'w9-d2':{step:2,seconds:0,contentRevision:'2.0.0'}}}));});
 await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#lesson/w9-d2');
 await page.locator('[data-action="story-play"]').waitFor();
 await page.waitForFunction(()=>['开始听故事','继续故事','暂停故事'].includes(document.querySelector('[data-action="story-play"]')?.textContent),null,{timeout:45000});
 if((await page.locator('[data-action="story-play"]').textContent())!=='暂停故事')await page.locator('[data-action="story-play"]').click();
 await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('3 / 6'),null,{timeout:45000});
 await page.locator('.story-option[data-id="in"]').click();
 await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('5 / 6'),null,{timeout:45000});
 await page.locator('.story-option[data-id="in"]').click();
 await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('6 / 6'),null,{timeout:45000});
 console.log('PASS offline cold reopen, real MP3 playback and both story interactions under repository path');
 assert.deepEqual(errors,[]);assert(requests.filter(p=>p!=='/favicon.ico').every(p=>p.startsWith(prefix)));
 await mkdir(path.join(root,'.qa'),{recursive:true});
 await writeFile(path.join(root,'.qa/pages-report.json'),JSON.stringify({passed:true,version:'2.0.1',prefix,pack,requests:requests.length,errors,physicalTabletVerified:false},null,2));
}catch(error){console.error('Page diagnostics:',await page.locator('body').innerText().catch(()=>''));throw error;}
finally{await context.close();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
