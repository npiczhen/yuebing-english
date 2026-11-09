import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {quizFor} from '../dist/core.js';
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'),{chromium}=require('playwright');
const data=JSON.parse(await readFile(new URL('../dist/curriculum.json',import.meta.url))),base=process.env.YB_TEST_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const context=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
 Math.random=()=>.42;window.__micStreams=[];
 const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);window.__micStreams.push(stream);return stream;};
});
const page=await context.newPage(),errors=[],results=[];page.on('pageerror',error=>errors.push(error.message));
const record=text=>{results.push(text);console.log('PASS '+text);};
try{
 await page.goto(base);await page.getByRole('heading',{name:'十二周的小小发现'}).waitFor();assert.equal(await page.locator('.week-card').count(),12);
 assert.deepEqual((await page.locator('.week-card .week-number').allTextContents()).slice(-3),['10','11','12']);
 await page.getByRole('link',{name:'发现课程',exact:true}).click();await page.locator('.lesson-card').last().waitFor();assert.equal(await page.locator('.lesson-card').count(),60);
 record('All twelve weeks and sixty lessons render, including correct two-digit week labels');
 await page.goto(base+'/#lesson/w9-d2');await page.locator('.lesson-word-label').waitFor();await page.getByRole('button',{name:'下一步',exact:true}).click();
 await page.locator('.mini-interaction').waitFor();
 const interactionId=await page.locator('.mini-interaction').getAttribute('data-interaction'),interaction=data.interactions.find(item=>item.id===interactionId);
 assert(interaction);
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.mini-interaction img')).every(img=>img.complete&&img.naturalWidth>0));
 await Promise.all([page.waitForRequest(request=>request.url().includes('/'+interaction.audio+'.mp3')),page.getByRole('button',{name:'听小熊猫的小邀请',exact:true}).click()]);
 for(const choice of interaction.choices){
  const followUp=choice.id==='say'?[page.waitForRequest(request=>request.url().includes('/'+data.vocabulary.find(word=>word.id==='in').phraseAudio+'.mp3'))]:[];
  await Promise.all([page.waitForRequest(request=>request.url().includes('/'+choice.replyAudio+'.mp3')),...followUp,page.locator(`[data-action="interaction-choice"][data-id="${choice.id}"]`).click()]);
  assert.equal(await page.locator('#interaction-reply').textContent(),choice.reply);
 }
 assert.equal(await page.locator('[data-action="interaction-choice"][aria-pressed="true"]').count(),1);
 record('Illustrated Chinese invitations and both selected spoken replies match their text');
 await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'下一幕',exact:true}).click();
 const storyText=await page.locator('.story-text').textContent();await page.getByRole('button',{name:'休息一会',exact:true}).click();await page.locator('.rest-dialog[open]').waitFor();
 const pausedTime=await page.locator('#elapsed').textContent();await page.waitForTimeout(1300);assert.equal(await page.locator('#elapsed').textContent(),pausedTime);
 await page.getByRole('button',{name:'准备好了，继续',exact:true}).click();assert.equal(await page.locator('.story-text').textContent(),storyText);
 record('Optional rest pauses the lesson clock and keeps the exact story frame');
 await page.getByRole('button',{name:'下一步',exact:true}).click();
 const lesson=data.lessons.find(item=>item.id==='w9-d2'),questions=quizFor(lesson,data.vocabulary,()=>.42);
 await page.locator(`[data-action="answer"][data-id="${questions[0].target}"]`).click();await page.locator('.quiz-choice.right').waitFor();
 await page.getByRole('button',{name:'休息一会',exact:true}).click();await page.locator('.rest-dialog[open]').waitFor();
 assert((await page.locator('.quiz-count').textContent()).includes('第 2 /'));
 await page.getByRole('button',{name:'准备好了，继续',exact:true}).click();assert((await page.locator('.quiz-count').textContent()).includes('第 2 /'));
 for(let i=1;i<3;i++){
  await page.waitForFunction(()=>document.querySelector('.quiz-grid').getAttribute('aria-busy')!=='true');
  await page.locator(`[data-action="answer"][data-id="${questions[i].target}"]`).click();
  await page.waitForFunction(number=>document.querySelector('.quiz-count')?.textContent.includes('第 '+number+' /'),i+2);
 }
 await page.locator('.quiz-rest-invite').waitFor();record('A rest during correct-answer feedback retains the accepted answer; another optional break appears after three questions');
 await page.goto(base+'/#lesson/w11-d1');await page.locator('.lesson-word-label').waitFor();assert((await page.locator('.lesson-word-label').textContent()).includes('故事里的老朋友'));
 await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('heading',{name:'熟悉的声音，换个故事',exact:true}).waitFor();
 assert.deepEqual(await page.locator('.word-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.id)),['apple','water']);
 record('Week eleven practices earlier words with complete cards and familiar-word labels');
 await page.goto(base+'/#lesson/w12-d1');await page.locator('.lesson-word-label').waitFor();await page.getByRole('button',{name:'下一步',exact:true}).click();
 const sound=data.lessons.find(item=>item.id==='w12-d1').soundGame;
 await Promise.all([page.waitForRequest(request=>request.url().includes('/'+sound.audio+'.mp3')), ...sound.words.map(id=>page.waitForRequest(request=>request.url().includes('/'+data.vocabulary.find(word=>word.id===id).audio+'.mp3'))),page.getByRole('button',{name:'听听这两个词',exact:true}).click()]);
 record('Week twelve plays the Chinese sound-game invitation followed by both complete US English word samples');
 await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('../.qa/final-sound-game-tablet.png',import.meta.url)),fullPage:true});
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'下一步',exact:true}).click();await page.locator('#local-recorder[data-phase="idle"]').waitFor();
 await page.getByRole('button',{name:'开始录音',exact:true}).click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();
 await page.getByRole('button',{name:'休息一会',exact:true}).click();await page.locator('.rest-dialog[open]').waitFor();
 assert.equal(await page.evaluate(()=>window.__micStreams.flatMap(stream=>stream.getTracks()).filter(track=>track.readyState==='live').length),0);
 await page.getByRole('button',{name:'准备好了，继续',exact:true}).click();await page.locator('#local-recorder[data-phase="idle"]').waitFor();
 await page.getByRole('button',{name:'开始录音',exact:true}).click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();
 await page.waitForFunction(()=>document.querySelector('.record-timer').textContent.startsWith('00:01'));await page.getByRole('button',{name:'停止录音',exact:true}).click();await page.locator('#local-recorder[data-phase="ready"]').waitFor();
 const saved=await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');return (await getRecording('w12-d1/cat')).blob.size;});assert(saved>1000);
 await page.getByRole('button',{name:'休息一会',exact:true}).click();await page.getByRole('button',{name:'准备好了，继续',exact:true}).click();
 assert(await page.getByRole('button',{name:'听听我的声音',exact:true}).isEnabled());
 assert.equal(await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');return (await getRecording('w12-d1/cat')).blob.size;}),saved);
 record('Taking a rest closes the microphone and preserves earlier completed recordings');
 await page.setViewportSize({width:1280,height:800});await page.screenshot({path:fileURLToPath(new URL('../.qa/final-lesson-landscape.png',import.meta.url)),fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(new URL('../.qa/final-weeks-ui-report.json',import.meta.url),JSON.stringify({passed:true,version:data.version,results,errors,realHardwareTested:false},null,2));
}finally{await context.close();await browser.close();}
