import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {quizFor} from '../dist/core.js';
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),base=process.env.YB_TEST_URL||'http://127.0.0.1:4174';
const data=JSON.parse(await readFile(new URL('../dist/curriculum.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
const context=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{Math.random=()=>.42;});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 for(const lesson of data.lessons){
  await page.goto(base+'/#lesson/'+lesson.id);
  await page.locator('.lesson-word-label').waitFor();
  assert.deepEqual(await page.locator('.word-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),lesson.words);
  const selected=await page.locator('[data-key="warmup"]').getAttribute('data-audio');
  assert(data.promptVariants.warmup.some(cue=>cue.audio===selected));
  await page.getByRole('button',{name:'下一步',exact:true}).click();
  await page.getByRole('heading',{name:lesson.review?'熟悉的朋友，再见面':lesson.practice?'熟悉的声音，换个故事':'点一点，听一听'}).waitFor();
  assert.deepEqual(await page.locator('.word-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),lesson.words);
  const labels=await page.locator('.letter-button').allTextContents();assert.equal(labels.length,lesson.letters.length);
  labels.forEach((label,i)=>{assert(label.includes(lesson.letters[i].word));assert(label.includes(lesson.letters[i].letter));});
  if(lesson.id==='w1-d2'){
   for(const [i,item]of lesson.letters.entries()){
    const word=data.vocabulary.find(w=>w.id===item.word);
    await Promise.all([page.waitForRequest(r=>r.url().includes('/'+item.audio+'.mp3')),page.waitForRequest(r=>r.url().includes('/'+word.audio+'.mp3')),page.locator('.letter-button').nth(i).click()]);
   }
   await page.screenshot({path:fileURLToPath(new URL('../.qa/day02-correct-letters.png',import.meta.url)),fullPage:true});
  }
  await page.getByRole('button',{name:'下一步',exact:true}).click();
  await page.getByRole('heading',{name:'故事里的小发现'}).waitFor();
  for(let i=0;i<4;i++){
   assert.equal(await page.locator('.story-text').textContent(),lesson.frames[i].text);
   assert((await page.locator('.scene-object').getAttribute('src')).endsWith('/'+lesson.frames[i].word+'.svg'));
   if(i<3)await page.getByRole('button',{name:'下一幕',exact:true}).click();
  }
  results.push(lesson.id+': current greeting words, letter-word buttons, four story pictures and spoken sentences match');
 }
 await page.goto(base+'/#lesson/w1-d2');
 await page.locator('.lesson-header').waitFor();
 // Return to greeting first, even if the earlier audit saved this lesson at its story step.
 while(await page.getByRole('button',{name:'上一步',exact:true}).isEnabled())await page.getByRole('button',{name:'上一步',exact:true}).click();
 await page.locator('.lesson-word-label').waitFor();
 const cueIds=[];
 for(let i=0;i<5;i++){
  cueIds.push(await page.locator('[data-key="warmup"]').getAttribute('data-audio'));
  if(i<4){await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'上一步',exact:true}).click();}
 }
 cueIds.forEach((id,i)=>{if(i>0)assert.notEqual(id,cueIds[i-1]);if(i>1)assert.notEqual(id,cueIds[i-2]);});
 results.push('Greeting cues avoid the previous two selections across repeated lesson entries');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'下一步',exact:true}).click();
 const lesson=data.lessons.find(l=>l.id==='w1-d2'),questions=quizFor(lesson,data.vocabulary,()=>.42);
 for(let i=0;i<6;i++){
  await page.waitForFunction(n=>document.querySelector('.quiz-count')?.textContent.includes('第 '+n+' /'),i+1);
  await page.waitForFunction(()=>document.querySelector('.quiz-grid')?.getAttribute('aria-busy')!=='true');
  assert.equal(await page.locator('.quiz-scope').getAttribute('data-scope'),i<4?'current':'review');
  await page.locator(`[data-action="answer"][data-id="${questions[i].target}"]`).click();
 }
 await page.getByRole('heading',{name:'谢谢月饼来帮忙！'}).waitFor({timeout:30000});
 results.push('Day 02 quiz starts with bird/fish and explicitly identifies the final two retrieval questions');
 assert.deepEqual(errors,[]);
 await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});
 await writeFile(new URL('../.qa/lesson-content-report.json',import.meta.url),JSON.stringify({passed:true,version:data.version,results},null,2));
 console.log(`PASS ${data.lessons.length} lessons: aligned words, letters, images, sentences; nonrepeating spoken cues; labeled retrieval`);
}finally{await context.close();await browser.close();}
