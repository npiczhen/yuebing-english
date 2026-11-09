import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'),{chromium}=require('playwright');
const data=JSON.parse(await readFile(new URL('../dist/curriculum.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
const context=await browser.newContext({viewport:{width:800,height:1280},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
const base=process.env.YB_TEST_URL||'http://127.0.0.1:4174';
page.on('pageerror',e=>errors.push(e.message));
await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});
await context.addInitScript(()=>{
 const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.playbackRate=4;return play.call(this);};
 const fetchNative=window.fetch;window.fetch=(url,options)=>{if(String(url).includes('/audio/'))window.__lastAudio=String(url).split('/').at(-1).replace('.mp3','');return fetchNative(url,options);};
 window.__focusLog=[];new MutationObserver(()=>{const words=[...document.querySelectorAll('#story-content .story-speaking')].map(el=>el.dataset.word);if(words.length)window.__focusLog.push({id:window.__lastAudio,words});}).observe(document,{subtree:true,attributes:true,attributeFilter:['class']});
});
async function open(id,frame=0,line=0,step=2){
 await page.goto(base);await page.locator('.hero').waitFor();
 await page.evaluate(({id,frame,line,step})=>localStorage.setItem('yuebing-red-panda-progress-v1',JSON.stringify({schema:1,contentRevision:'2.0.0',completed:[],revisedCompleted:[],metPanda:true,currentLesson:id,sessions:{[id]:{step,seconds:0,contentRevision:'2.0.0',story:{frame,line,speechRevision:'2.0.1'}}}})),{id,frame,line,step});
 await page.goto(base+'/?stage-qa='+Date.now()+'#lesson/'+id);if(step===2)await page.locator('.story-chapter').waitFor();else await page.locator('.word-card').first().waitFor();
}
try{
 const lesson=data.lessons.find(l=>l.id==='w1-d5'),f=lesson.frames[3],bear=f.englishParts.find(p=>p.focusWords.includes('bear')),bird=f.englishParts.find(p=>p.focusWords.includes('bird'));
 await open(lesson.id,3,f.narrationParts.length);
 await page.waitForFunction(({a,b})=>window.__focusLog.some(e=>e.id===a&&e.words.length===1&&e.words[0]==='bear')&&window.__focusLog.some(e=>e.id===b&&e.words.length===1&&e.words[0]==='bird'),{a:bear.audio,b:bird.audio});
 console.log('PASS actual bear/bird MP3 turns focus only the named animal');
 await page.waitForFunction(()=>document.querySelector('.story-chapter').textContent.includes('5 / 6'));
 assert.equal(await page.locator('.story-options img').count(),0);assert.equal(await page.locator('.scene-hotspot[data-id="duck"]').count(),1);assert.equal(await page.locator('.adventure-scene [data-word="dog"]').count(),1);
 await page.locator('.scene-hotspot[data-id="dog"]').click();await page.waitForTimeout(1600);assert((await page.locator('.story-chapter').textContent()).includes('5 / 6'));
 await page.locator('.scene-hotspot[data-id="duck"]').click();await page.waitForFunction(()=>document.querySelector('.story-chapter').textContent.includes('6 / 6'));
 assert.equal(await page.locator('.adventure-scene .scene-entity:not(.scene-decoration)').count(),9);
 await page.screenshot({path:fileURLToPath(new URL('../.qa/story-party-fixed-tablet.png',import.meta.url)),fullPage:true});console.log('PASS scene-only animal choices, wrong tap retry, all eight friends once');
 await open('w1-d1');assert.equal(await page.locator('.adventure-scene [data-word="dog"]').count(),0);assert.equal(await page.locator('.adventure-scene [data-word="cat"]').count(),1);console.log('PASS future dog waits for introduction');
 await open('w1-d3',3);await page.locator('.story-speaking').first().waitFor();await page.locator('[data-action="rest-open"]').click();assert.equal(await page.locator('.story-speaking').count(),0);await page.locator('[data-action="rest-close"]').click();assert.equal(await page.locator('.story-speaking').count(),0);console.log('PASS rest clears story speech motion');
 await open('w7-d5',5);const bounds=await page.locator('.adventure-scene').evaluate(root=>{const box=root.getBoundingClientRect();return [...root.querySelectorAll('.scene-entity:not(.scene-decoration)')].map(e=>{const b=e.getBoundingClientRect();return {id:e.dataset.object,left:b.left-box.left,right:b.right-box.left,width:box.width};});});for(const b of bounds)assert(b.left>=-1&&b.right<=b.width+1,b.id);console.log('PASS family portraits stay within album');
 await page.setViewportSize({width:1280,height:800});await page.screenshot({path:fileURLToPath(new URL('../.qa/story-album-fixed-landscape.png',import.meta.url)),fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await open('w1-d3',3);await page.locator('.story-speaking').first().waitFor();const animation=await page.locator('.story-speaking .scene-visual').first().evaluate(e=>getComputedStyle(e).animationName);assert.equal(animation,'none');console.log('PASS reduced motion keeps a static cue');
 await open('w11-d4',0,0,1);assert.equal(await page.locator('.word-card[data-id="seven"] .count-set svg').count(),7);assert.equal(await page.locator('.word-card[data-id="eight"] .count-set svg').count(),8);console.log('PASS quantity word cards match the spoken single blocks');
 assert.deepEqual(errors,[]);await writeFile(new URL('../.qa/story-stage-ui-report.json',import.meta.url),JSON.stringify({passed:true,version:data.version,actualMp3:true,sceneOnlyChoices:true,clippedPortraits:0,errors,physicalTabletVerified:false},null,2));
}catch(e){console.error(await page.locator('body').innerText());throw e;}finally{await browser.close();}
