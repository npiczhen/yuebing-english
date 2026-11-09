import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/LZC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),base=process.env.YB_TEST_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/LZC/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const results=[],contexts=[],errors=[];
const record=message=>{results.push(message);console.log('PASS '+message);};
async function makeContext(mode='normal'){
 const context=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true});contexts.push(context);
 await context.addInitScript(mode=>{
  const key='yuebing-red-panda-progress-v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({schema:1,completed:['w1-d1'],currentLesson:'w1-d2',sessions:{'w1-d2':{step:4,seconds:0}},metPanda:true}));
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__micStreams=[];window.__micCalls=0;
  navigator.mediaDevices.getUserMedia=async constraints=>{
   window.__micCalls++;
   if(mode==='denied')throw new DOMException('permission denied','NotAllowedError');
   const stream=await original(constraints);window.__micStreams.push(stream);
   if(mode==='delayed')return new Promise(resolve=>{window.__releasePermission=()=>resolve(stream);});
   return stream;
  };
  if(mode==='unsupported')window.MediaRecorder=undefined;
 },mode);
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/#lesson/w1-d2');await page.locator('#local-recorder[data-phase="idle"]').waitFor();
 return {context,page};
}
const liveTracks=page=>page.evaluate(()=>window.__micStreams.flatMap(stream=>stream.getTracks()).filter(track=>track.readyState==='live').length);
async function take(page,minimumMs=1000){
 await page.getByRole('button',{name:/^(开始录音|再录一次)$/}).click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();
 await page.waitForFunction(ms=>document.querySelector('.record-timer').textContent.slice(0,5)>=`00:${String(Math.ceil(ms/1000)).padStart(2,'0')}`,minimumMs);
 await page.getByRole('button',{name:'停止录音',exact:true}).click();await page.locator('#local-recorder[data-phase="ready"]').waitFor();
 assert.equal(await liveTracks(page),0);
}
try{
 const {page}=await makeContext();assert.equal(await page.evaluate(()=>window.__micCalls),0);
 assert(await page.getByRole('button',{name:'听听我的声音',exact:true}).isDisabled());
 await take(page);
 const saved=await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');const value=await getRecording('w1-d2/bird');return{bytes:value.blob.size,type:value.blob.type,durationMs:value.durationMs,updatedAt:value.updatedAt};});
 assert(saved.bytes>1000&&saved.type.startsWith('audio/')&&saved.durationMs>=900);
 const uploads=[];page.on('request',request=>{if(request.method()!=='GET')uploads.push(request.url());});
 await page.getByRole('button',{name:'听听我的声音',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.audio-playing'));
 await page.locator('#local-recorder[data-phase="ready"]').waitFor();assert.deepEqual(uploads,[]);
 record('Explicit microphone start, real MediaRecorder capture from browser test device, local save and audible-file replay without uploads');
 await page.getByRole('button',{name:'再听另一个',exact:true}).click();await page.locator('#local-recorder[data-phase="idle"]').waitFor();
 assert(await page.getByRole('button',{name:'听听我的声音',exact:true}).isDisabled());
 await page.getByRole('button',{name:'开始录音',exact:true}).click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();
 await page.getByRole('button',{name:'再听另一个',exact:true}).click();await page.locator('#local-recorder[data-phase="ready"]').waitFor();assert.equal(await liveTracks(page),0);
 const fish=await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');return !!await getRecording('w1-d2/fish');});assert.equal(fish,false);
 await page.reload();await page.locator('#local-recorder[data-phase="ready"]').waitFor();assert(await page.getByRole('button',{name:'听听我的声音',exact:true}).isEnabled());
 record('Recordings persist across reload, remain specific to the lesson/word, and microphone closes on switching words');
 await page.getByRole('button',{name:'再录一次',exact:true}).click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await liveTracks(page),0);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 record('Background visibility event releases microphone tracks and cancels partial capture');
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;window.__restorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(...args){if(this.name==='takes')throw new DOMException('simulated full storage','QuotaExceededError');return original.apply(this,args);};});
 await take(page);assert((await page.locator('#record-status').textContent()).includes('未能长期保存'));
 assert(await page.getByRole('button',{name:'听听我的声音',exact:true}).isEnabled());
 const protectedTake=await page.evaluate(async()=>{window.__restorePut();const {getRecording}=await import('./recorder.js');return (await getRecording('w1-d2/bird')).updatedAt;});assert.equal(protectedTake,saved.updatedAt);
 record('Storage failure keeps the previous saved take and permits immediate replay of the new in-memory take');
 await page.getByRole('button',{name:'删除这段录音',exact:true}).click();await page.locator('#local-recorder[data-phase="idle"]').waitFor();
 assert.equal(await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');return await getRecording('w1-d2/bird');}),null);
 const retention=await page.evaluate(async()=>{
  const {saveRecording,recordingSummary,getRecording}=await import('./recorder.js');
  const blob=new Blob([new Uint8Array(64)],{type:'audio/webm'});
  for(let i=0;i<82;i++)await saveRecording({key:'retention/'+i,blob,durationMs:1000});
  return {summary:await recordingSummary(),newest:!!await getRecording('retention/81')};
 });assert.equal(retention.summary.count,80);assert(retention.newest);
 await page.getByRole('link',{name:'保存并返回小屋'}).click();await page.getByRole('link',{name:'家长入口'}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'删除本机全部录音',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#recording-summary')?.textContent.includes('0 段'));
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('yuebing-red-panda-progress-v1')).completed),['w1-d1']);
 record('Individual deletion, bounded 80-take retention, and parent clear-all preserve learning progress');
 await mkdir(new URL('../.qa/',import.meta.url),{recursive:true});
 await page.goto(base+'/#lesson/w1-d2');await page.locator('#local-recorder[data-phase="idle"]').waitFor();
 if(process.argv.includes('--full')){
  await page.getByRole('button',{name:'开始录音',exact:true}).click();await page.locator('#local-recorder[data-phase="recording"]').waitFor();
  await page.locator('#local-recorder[data-phase="ready"]').waitFor({timeout:26000});assert.equal(await liveTracks(page),0);
  const capped=await page.evaluate(async()=>{const {getRecording}=await import('./recorder.js');return (await getRecording('w1-d2/bird')).durationMs;});assert(capped<=20000&&capped>=19500);
  record('Twenty-second safety limit automatically finishes the take and turns off the microphone');
 }
 await page.screenshot({path:fileURLToPath(new URL('../.qa/recording-tablet.png',import.meta.url)),fullPage:true});
 for(const mode of ['denied','unsupported']){
  const {page:other}=await makeContext(mode);await other.getByRole('button',{name:'开始录音',exact:true}).click();
  await other.locator('#local-recorder[data-phase="error"]').waitFor();assert.equal(await liveTracks(other),0);
  assert((await other.locator('#record-status').textContent()).includes(mode==='denied'?'允许麦克风':'不支持录音'));
  await other.getByRole('button',{name:'去和玩偶一起玩',exact:true}).click();await other.getByRole('heading',{name:'把小发现，带进生活'}).waitFor();
 }
 record('Denied permission and unsupported recording show Chinese help while the rest of the lesson remains usable');
 const {page:late}=await makeContext('delayed');await late.getByRole('button',{name:'开始录音',exact:true}).click();
 await late.waitForFunction(()=>!!window.__releasePermission);await late.getByRole('button',{name:'再听另一个',exact:true}).click();
 await late.evaluate(()=>window.__releasePermission());await late.waitForFunction(()=>window.__micStreams.every(stream=>stream.getTracks().every(track=>track.readyState==='ended')));
 await late.locator('#local-recorder[data-phase="idle"]').waitFor();
 assert.equal(await late.locator('#local-recorder').getAttribute('data-phase'),'idle');
 record('A permission result arriving after cancellation cannot start background recording');
 assert.deepEqual(errors,[]);await writeFile(new URL('../.qa/recording-report.json',import.meta.url),JSON.stringify({passed:true,results,realHardwareTested:false,microphoneSource:'Chromium test device',errors},null,2));
}finally{for(const context of contexts)await context.close();await browser.close();}
