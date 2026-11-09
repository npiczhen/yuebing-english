// An independent network entry: all executable update code bypasses old packs.
const status=document.querySelector('#status'),summary=document.querySelector('#summary'),start=document.querySelector('#start'),pause=document.querySelector('#pause'),open=document.querySelector('#open'),bar=document.querySelector('#progress');
const bytes=value=>(value/1048576).toFixed(1)+' MB';
let manifest,downloader,ready=false,courseCount=0,opening;
function courseURL(){const url=new URL('./',location.href);url.searchParams.set('yb-open',Date.now());url.hash='courses';return url.href;}
function fail(error){status.textContent=error.message||'更新中断，请联网后重试。';start.disabled=false;start.textContent='继续更新课程';pause.hidden=true;}
try{
 const {getManifest,registerOffline,PackDownloader,workerMessage}=await import('./offline.js?yb-update='+Date.now());
 manifest=await getManifest(true);
 if(!manifest.coverage||manifest.coverage.weeks<12||manifest.coverage.lessons<60||manifest.coverage.words<96||manifest.coverage.curriculumVersion!=='2.0.1')throw new Error('暂未取得12周课程清单，请保持联网后重新打开本页。');
 const coverage=manifest.coverage;courseCount=coverage.weeks;
 summary.textContent=`最新课程 ${coverage.curriculumVersion}：${coverage.weeks}周 · ${coverage.lessons}节课 · ${coverage.words}个核心词 · ${bytes(manifest.totalBytes)}。`;
 status.textContent='已找到六幕互动故事版：保留原课程基础，补充新玩法和后两周新词。下载后保留进度和录音。';
 await registerOffline();
 downloader=new PackDownloader(state=>{
  bar.max=state.total||1;bar.value=state.done;status.textContent=state.text;
  pause.hidden=state.phase!=='downloading';
  if(state.phase==='downloading'){start.disabled=true;start.textContent='正在下载并校验…';}
  if(state.phase==='paused'||state.phase==='error'){start.disabled=false;start.textContent='继续更新课程';}
 });
 start.textContent=`下载并打开${courseCount}周升级版`;start.disabled=false;
 start.addEventListener('click',async()=>{
  if(downloader.running)return;start.disabled=true;
  clearTimeout(opening);open.hidden=true;ready=false;
  try{
   // Never reuse a manifest read from the old committed cache.
   manifest=await getManifest(true);
   if(!manifest.coverage||manifest.coverage.weeks<12||manifest.coverage.lessons<60||manifest.coverage.words<96||manifest.coverage.curriculumVersion!=='2.0.1')throw new Error('课程清单尚未更新，请稍后再试。');
   await downloader.start(manifest);
   if(downloader.state.phase!=='complete')return;
   const cache=await caches.open('yb-pack-'+manifest.version),response=await cache.match(new URL('./curriculum.json',location.href));
   if(!response)throw new Error('新增课件尚未保存，请点继续更新。');
   const data=await response.json(),verified=await workerMessage('STATUS');
   if(!verified.complete||verified.version!==manifest.version||data.weeks.length<12||data.lessons.length<60||data.vocabulary.length!==96||data.version!=='2.0.1')throw new Error('新增课程尚未通过最终检查，请点继续更新。');
   ready=true;status.textContent=`已确认${data.weeks.length}周${data.lessons.length}节课，正在打开新增课程…`;
   start.hidden=true;pause.hidden=true;open.href=courseURL();open.textContent=`打开${data.weeks.length}周课程`;open.hidden=false;
   // A different document is essential: hash-only navigation keeps old data alive.
   opening=setTimeout(()=>location.replace(open.href),900);
  }catch(error){fail(error);}
 });
 pause.addEventListener('click',()=>downloader.pause());
 window.addEventListener('pagehide',()=>{clearTimeout(opening);if(!ready)downloader.pause();});
}catch(error){fail(error);start.textContent='重新读取最新课程';start.addEventListener('click',()=>location.reload());}
