import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const data=JSON.parse(await readFile(new URL('../dist/curriculum.json',import.meta.url)));
const base=process.env.YB_TEST_URL||'http://127.0.0.1:4174';
await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const context=await browser.newContext({viewport:{width:800,height:1280},serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.mp3'))requests.push(r.url().split('/').at(-1).replace('.mp3',''));});
await context.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.playbackRate=16;return play.call(this);};});
async function openLesson(id,step,extra={}){
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('.hero'));
 await page.evaluate(({id,step,extra})=>localStorage.setItem('yuebing-red-panda-progress-v1',JSON.stringify({schema:1,contentRevision:'2.0.0',completed:[],revisedCompleted:[],currentLesson:id,metPanda:true,sessions:{[id]:{step,seconds:0,contentRevision:'2.0.0',...extra}}})),{id,step,extra});
 await page.goto(base+'/?qa='+Date.now()+'#lesson/'+id);await page.locator('.lesson-title').waitFor();
}
try{
 await openLesson('w9-d1',1);await page.waitForFunction(()=>document.querySelector('#word-sequence-status')?.textContent.includes('都听过'),{timeout:45000});
 const lesson=data.lessons.find(l=>l.id==='w9-d1'),box=data.vocabulary.find(w=>w.id==='box'),basket=data.vocabulary.find(w=>w.id==='basket');
 const filtered=requests.filter(id=>[box.audio,box.phraseAudio,basket.audio,basket.phraseAudio].includes(id));assert.deepEqual(filtered.slice(-8),[box.audio,box.audio,box.audio,box.phraseAudio,basket.audio,basket.audio,basket.audio,basket.phraseAudio]);console.log('PASS actual MP3 triple order and phrases');
 await page.locator('[data-action="words-restart"]').click();await page.locator('.word-active[data-id="box"]').waitFor();assert.equal(await page.locator('.word-active').count(),1);await page.locator('[data-action="words-toggle"]').click();assert.equal(await page.locator('.word-active').count(),0);console.log('PASS synchronized highlight and pause');
 await page.screenshot({path:fileURLToPath(new URL('../.qa/v2-words-tablet.png',import.meta.url)),fullPage:true});
 await openLesson('w9-d2',2);await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('3 / 6'),{timeout:45000});
 await page.locator('.story-option[data-id="in"]').waitFor();await page.screenshot({path:fileURLToPath(new URL('../.qa/v2-box-before.png',import.meta.url)),fullPage:true});
 await page.locator('.story-option[data-id="on"]').click();await page.waitForTimeout(500);assert((await page.locator('.story-chapter').textContent()).includes('3 / 6'));
 await page.locator('.story-option[data-id="in"]').click();await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('5 / 6'),{timeout:45000});
 await page.screenshot({path:fileURLToPath(new URL('../.qa/v2-box-second-help.png',import.meta.url)),fullPage:true});
 await page.locator('[data-action="rest-open"]').click();await page.locator('.rest-dialog').waitFor();await page.locator('[data-action="rest-close"]').click();assert((await page.locator('.story-chapter').textContent()).includes('5 / 6'));
 await page.locator('.story-option[data-id="in"]').click();await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('6 / 6'),{timeout:45000});
 await page.getByRole('link',{name:'保存并返回小屋'}).click();await page.getByRole('button',{name:/继续我们的故事/}).click();assert((await page.locator('.story-chapter').textContent()).includes('6 / 6'));console.log('PASS six scenes, wrong/correct tasks, rest and exit resume');
 await openLesson('w3-d1',3);for(let i=0;i<6;i++){
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('yuebing-red-panda-progress-v1')).sessions['w3-d1'].quiz),q=saved.questions[i];await page.locator(`.quiz-choice[data-id="${q.target}"]`).click();if(q.mode==='deliver')await page.locator('[data-action="deliver-answer"]').click();await page.waitForFunction(i=>document.querySelector('.quiz-done')||document.querySelector('.quiz-count')?.textContent.includes('第 '+(i+2)+' /'),i,{timeout:15000});
 }assert.equal(await page.locator('.quiz-done').count(),1);console.log('PASS picture selection and two-tap delivery');
 await openLesson('w11-d4',3);const q=await page.evaluate(()=>JSON.parse(localStorage.getItem('yuebing-red-panda-progress-v1')).sessions['w11-d4'].quiz.questions[0]);await page.locator(`.quiz-choice[data-id="${q.target}"]`).click();await page.waitForFunction(()=>document.querySelector('.quiz-grid[data-mode="count"]'),{timeout:15000});assert(await page.locator('.count-set svg').count()>0);await page.screenshot({path:fileURLToPath(new URL('../.qa/v2-count-tablet.png',import.meta.url)),fullPage:true});console.log('PASS counted single blocks');
 await openLesson('w8-d4',4);await page.locator('#local-recorder[data-phase="idle"]').waitFor();await page.locator('[data-action="record-start"]').click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();await page.waitForTimeout(1100);await page.locator('[data-action="record-stop"]').click();await page.locator('#local-recorder[data-phase="ready"]').waitFor();await page.locator('[data-action="record-play"]').click();await page.locator('#local-recorder[data-phase="ready"]').waitFor();await page.goto(base+'/#parent');await page.locator('[data-action="archive-play"]').waitFor();await page.locator('[data-action="archive-play"]').first().click();console.log('PASS microphone capture, saved replay and parent archive');
 if(process.argv.includes('--all')){
  for(const l of data.lessons){await openLesson(l.id,2);await page.waitForFunction(()=>document.querySelector('.story-chapter')?.textContent.includes('3 / 6'),{timeout:45000});for(const index of [2,4]){const task=l.frames[index].interaction;const cards=page.locator(`.story-option[data-id="${task.target}"]`);if(await cards.count())await cards.click();else await page.locator(`.scene-hotspot[data-id="${task.target}"]`).first().click();if(task.type==='deliver')await page.locator('.story-receiver').click();await page.waitForFunction(text=>document.querySelector('.story-chapter')?.textContent.includes(text),index===2?'5 / 6':'6 / 6',{timeout:45000});}console.log('PASS story',l.id);}
 }
 await page.setViewportSize({width:1280,height:800});await openLesson('w12-d3',2);await page.screenshot({path:fileURLToPath(new URL('../.qa/v2-story-landscape.png',import.meta.url)),fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(new URL('../.qa/adventure-ui-report.json',import.meta.url),JSON.stringify({passed:true,all:process.argv.includes('--all'),version:data.version,errors,actualAudio:true,microphone:'browser fake device; physical tablet unverified'},null,2));console.log('PASS browser console and tablet orientations');
}catch(error){console.error('BROWSER ERRORS',errors);console.error('PAGE',await page.locator('body').innerText());await page.screenshot({path:fileURLToPath(new URL('../.qa/v2-failure.png',import.meta.url)),fullPage:true});throw error;}finally{await browser.close();}
