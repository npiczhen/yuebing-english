// Recordings stay in this browser. This module makes no network requests.
export const MAX_RECORDING_MS=20000;
export const MAX_SAVED_RECORDINGS=80;
const DATABASE='yuebing-local-recordings-v1',STORE='takes';
let databasePromise;

function database(){
 if(!globalThis.indexedDB)return Promise.reject(new Error('当前浏览器不能保存录音'));
 if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'key'});
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();databasePromise=null;};resolve(db);};
  request.onerror=()=>{databasePromise=null;reject(request.error);};
  request.onblocked=()=>{databasePromise=null;reject(new Error('请关闭其他小屋页面，再试保存录音'));};
 });
 return databasePromise;
}
async function transaction(mode,operation){
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||new Error('录音未能保存'));tx.onerror=()=>{};
  try{operation(store,value=>{result=value;});}catch(error){tx.abort();reject(error);}
 });
}
export function recordingKey(lessonId,wordId){return lessonId+'/'+wordId;}
export async function getRecording(key){
 return transaction('readonly',(store,done)=>{const r=store.get(key);r.onsuccess=()=>done(r.result||null);});
}
export async function saveRecording(take){
 if(!(take.blob instanceof Blob)||!take.blob.size||take.blob.size>3*1024*1024||!take.blob.type.startsWith('audio/'))throw new Error('录音格式无效，请重新录一次');
 const row={key:take.key,blob:take.blob,durationMs:Math.min(MAX_RECORDING_MS,Math.max(0,take.durationMs)),updatedAt:Date.now()};
 return transaction('readwrite',(store,done)=>{
  store.put(row);const request=store.getAll();
  request.onsuccess=()=>{const rows=[row,...request.result.filter(item=>item.key!==row.key).sort((a,b)=>b.updatedAt-a.updatedAt)];for(const old of rows.slice(MAX_SAVED_RECORDINGS))store.delete(old.key);done(row);};
 });
}
export async function deleteRecording(key){return transaction('readwrite',store=>store.delete(key));}
export async function clearRecordings(){return transaction('readwrite',store=>store.clear());}
export async function recordingSummary(){
 return transaction('readonly',(store,done)=>{const request=store.getAll();request.onsuccess=()=>done({count:request.result.length,bytes:request.result.reduce((n,row)=>n+row.blob.size,0)});});
}
export async function listRecordings(){
 return transaction('readonly',(store,done)=>{const request=store.getAll();request.onsuccess=()=>done(request.result.sort((a,b)=>b.updatedAt-a.updatedAt));});
}
export function microphoneError(error){
 if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return '麦克风没有打开。请家长在浏览器的网站设置中允许麦克风，再点一次；也可以继续只听示范。';
 if(error?.name==='NotFoundError')return '没有找到麦克风。请家长检查平板的麦克风，也可以继续只听示范。';
 if(error?.name==='NotReadableError'||error?.name==='AbortError')return '麦克风暂时不能用，可能正被其他应用占用。请家长关闭其他录音应用后再试。';
 return error?.message||'这次没有录下来，想试时再点小麦克风。';
}

export class LocalRecorder{
 constructor({onChange=()=>{},onCapture=async()=>{}}={}){this.onChange=onChange;this.onCapture=onCapture;this.token=0;this.phase='idle';this.stream=null;this.recorder=null;this.timer=null;this.clock=null;this.meta=null;}
 emit(phase,extra={}){this.phase=phase;this.onChange({phase,meta:this.meta,...extra});}
 release(){clearTimeout(this.timer);clearInterval(this.clock);this.timer=this.clock=null;this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;}
 cancel(){
  this.token++;const recorder=this.recorder;this.recorder=null;
  if(recorder){recorder.onstop=null;recorder.ondataavailable=null;recorder.onerror=null;if(recorder.state!=='inactive')try{recorder.stop();}catch{}}
  this.release();this.emit('idle');
 }
 async start(meta){
  this.cancel();this.meta=meta;const token=++this.token;
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){this.emit('error',{error:'当前浏览器不支持录音。请用平板浏览器打开HTTPS学习网址；仍然可以听示范、玩游戏。'});return;}
  this.emit('requesting');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(token!==this.token){stream.getTracks().forEach(track=>track.stop());return;}
   this.stream=stream;
   const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported?.(type));
   const recorder=new MediaRecorder(stream,type?{mimeType:type,audioBitsPerSecond:64000}:{}),chunks=[];
   this.recorder=recorder;let started=0;
   recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data);};
   recorder.onerror=event=>{if(token!==this.token)return;this.cancel();this.meta=meta;this.emit('error',{error:microphoneError(event.error)});};
   recorder.onstop=async()=>{
    const durationMs=Math.min(MAX_RECORDING_MS,Date.now()-started);this.release();this.recorder=null;
    if(token!==this.token)return;
    const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'});
    if(!blob.size||durationMs<300){this.emit('error',{error:'这次还没来得及留下声音。点小麦克风，说一句，再点停止吧。'});return;}
    this.emit('saving',{elapsedMs:durationMs});
    try{await this.onCapture({key:meta.key,blob,durationMs});if(token===this.token)this.emit('ready',{elapsedMs:durationMs});}
    catch(error){if(token===this.token)this.emit('error',{error:microphoneError(error)});}
   };
   recorder.start(200);started=Date.now();this.emit('recording',{elapsedMs:0});
   this.clock=setInterval(()=>{if(token===this.token)this.emit('recording',{elapsedMs:Math.min(MAX_RECORDING_MS,Date.now()-started)});},200);
   this.timer=setTimeout(()=>this.stop(),MAX_RECORDING_MS);
  }catch(error){if(token===this.token){this.release();this.recorder=null;this.emit('error',{error:microphoneError(error)});}}
 }
 stop(){
  const recorder=this.recorder;if(!recorder||recorder.state==='inactive')return;
  clearTimeout(this.timer);clearInterval(this.clock);this.emit('saving');
  try{recorder.stop();}catch(error){this.cancel();this.emit('error',{error:microphoneError(error)});}
  // Stop microphone capture immediately, without waiting for file persistence.
  this.stream?.getTracks().forEach(track=>track.stop());
 }
}
