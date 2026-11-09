import {STORE_KEY,emptyProgress,sanitizeProgress,nextLesson,quizFor,choosePrompt,formatBytes,isLessonComplete} from './core.js';
import {registerOffline,workerMessage,getManifest,PackDownloader} from './offline.js';
import {WordSequence,StorySequence,storyView,missionFor,missionHTML,countPicture,numbers} from './adventure.js';
import {LocalRecorder,listRecordings,recordingKey,getRecording,saveRecording,deleteRecording,clearRecordings,recordingSummary,MAX_RECORDING_MS,MAX_SAVED_RECORDINGS} from './recorder.js';
const app=document.querySelector('#app');
const icons={arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="m14 6-6 6 6 6"/>',sound:'<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',check:'<path d="m5 12 4 4 10-10"/>',leaf:'<path d="M20 3C6 1 1 9 6 16s17 0 14-13ZM5 21l11-13"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',parent:'<circle cx="9" cy="7" r="3"/><circle cx="18" cy="9" r="2"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-7c3 0 4 2 4 5v2"/>',play:'<path d="m8 5 11 7-11 7V5Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 8 15 8 15S25 10 20 5Z"/>'};
const icon=name=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.leaf}</svg>`;
icons.mic='<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>';
icons.stop='<rect x="6" y="6" width="12" height="12" rx="2"/>';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data,progress,words,offlineState={complete:false},offlineError='',manifest,installPrompt,activeLesson,step=0,frame=0,quiz,index=0,quizFinished=false,answering=false,speakingIndex=0,storyPlaying=false,storyToken=0,saveErrorShown=false,firstMeetReady=false,routeEpoch=0;
let stageEpoch=0,pendingCorrect=false,missionSelected=null;
let downloadInfoEpoch=0,restState=null;
let cueCache={},cueHistory={};
try{cueHistory=JSON.parse(localStorage.getItem('yuebing-prompt-history-v1')||'{}');if(!cueHistory||typeof cueHistory!=='object')cueHistory={};}catch{}
function cueFor(key,fresh=false){
 if(!fresh&&cueCache[key])return cueCache[key];
 const variants=key==='miniInteraction'?data.interactions:data.promptVariants?.[key]||[data.prompts[key]],recent=Array.isArray(cueHistory[key])?cueHistory[key]:[];
 const cue=choosePrompt(variants,recent);cueCache[key]=cue;cueHistory[key]=[...recent,cue.audio].slice(-2);
 try{localStorage.setItem('yuebing-prompt-history-v1',JSON.stringify(cueHistory));}catch{}
 return cue;
}
function playCue(key,element){return player.play(cueFor(key,['retry','correct','afterSpeak','complete','reviewQuiz'].includes(key)).audio,element);}
let seconds=0,lastTick=Date.now(),toastTimer,storyTimer,speakingTimer;
const steps=[['打招呼','1分钟'],['听新词','2分钟'],['看故事','4分钟'],['找一找','4分钟'],['说一说','2分钟'],['一起玩','2分钟']];
class Player{
 constructor(){this.audio=null;this.url=null;this.token=0;this.resolve=null;}
 stop(){this.token++;if(this.audio){this.audio.pause();this.audio.onended=null;this.audio.onerror=null;this.audio=null;}if(this.url){URL.revokeObjectURL(this.url);this.url=null;}if(this.resolve){this.resolve(false);this.resolve=null;}document.querySelectorAll('.audio-playing').forEach(el=>el.classList.remove('audio-playing'));}
 async play(id,element,onStart){
  this.lastError=null;
  this.stop();const token=this.token;
  try{
   const response=await fetch(`./assets/audio/${id}.mp3`);if(!response.ok)throw new Error('音频尚未下载，请联网补齐课程资源。');
   const blob=await response.blob();if(token!==this.token)return false;
   return await this.startBlob(blob,element,token,onStart);
  }catch(error){return this.failed(error,token);}
 }
 async playBlob(blob,element,onStart){this.stop();const token=this.token;try{return await this.startBlob(blob,element,token,onStart);}catch(error){return this.failed(error,token);}}
 failed(error,token){this.lastError=error.name;if(token===this.token){this.stop();toast(error.name==='NotAllowedError'?'请点一下声音按钮开始播放。':error.message||'声音暂时无法播放，请重试。');}return false;}
 async startBlob(blob,element,token,onStart){
   if(token!==this.token)return false;
   this.url=URL.createObjectURL(blob);const audio=new Audio(this.url);this.audio=audio;audio.addEventListener('playing',()=>{if(token===this.token){element?.classList.add('audio-playing');onStart?.();}},{once:true});
   const ended=new Promise(resolve=>{this.resolve=resolve;audio.onended=()=>resolve(true);audio.onerror=()=>resolve(false);});
   await audio.play();const result=await ended;
   if(token===this.token){this.resolve=null;this.audio=null;if(this.url){URL.revokeObjectURL(this.url);this.url=null;}element?.classList.remove('audio-playing');}
   return result;
 }
}
const player=new Player();
const wordSequence=new WordSequence({player,onChange:()=>{updateWordSequence();if(activeLesson&&step===1)saveSession();}});
const storySequence=new StorySequence({player,onFocus:updateStoryFocus,onChange:()=>{const el=document.querySelector('#story-content');if(el&&activeLesson&&step===2)el.innerHTML=storyHTML();if(activeLesson&&step===2)saveSession();}});
function updateStoryFocus(names){const root=document.querySelector('#story-content');if(!root)return;root.querySelectorAll('.story-speaking').forEach(el=>el.classList.remove('story-speaking'));for(const word of new Set(names)){const matches=[...root.querySelectorAll('.adventure-scene .scene-entity:not(.scene-decoration)')].filter(el=>el.dataset.word===word&&el.dataset.object!=='reflection');const target=matches.find(el=>el.dataset.object==='panda')||matches[0];if(target){void target.offsetWidth;target.classList.add('story-speaking');}}}
function makeQuiz(lesson){return quizFor(lesson,data.vocabulary).map((q,i)=>missionFor(q,lesson,i));}
function wordControls(){return `<section class="word-sequence" aria-label="顺序朗读控制"><p id="word-sequence-status" role="status">准备听三遍单词，再听一句话。</p><div class="repeat-dots" aria-label="三遍朗读"><span></span><span></span><span></span></div><div class="sequence-actions"><button class="audio-button" data-action="words-toggle">开始听</button><button class="text-button" data-action="words-restart">从头播放</button></div></section>`;}
function updateWordSequence(){
 if(!activeLesson||step!==1)return;const state=wordSequence.state;
 document.querySelectorAll('.word-card').forEach(card=>{const active=state.wordId===card.dataset.id&&state.phase==='playing';card.classList.toggle('word-active',active);card.setAttribute('aria-current',String(active));if(active){card.classList.remove('word-bounce');void card.offsetWidth;card.classList.add('word-bounce');}});
 const line=document.querySelector('#word-sequence-status');if(line)line.textContent=state.phase==='complete'?'都听过啦！喜欢的还可以再点一下。':state.phase==='blocked'?'点“开始听”，小熊猫就会顺序读给你听。':state.phase==='paused'?'先停一停，准备好了继续听。':state.wordId?`${state.wordId} · ${state.repeat===4?'听一句话':'第 '+state.repeat+' 遍 / 共 3 遍'}`:'准备听三遍单词，再听一句话。';
 const toggle=document.querySelector('[data-action="words-toggle"]');if(toggle)toggle.textContent=state.phase==='playing'?'暂停朗读':state.phase==='complete'?'再听一遍':state.phase==='blocked'?'开始听':'继续朗读';
 document.querySelectorAll('.repeat-dots span').forEach((dot,i)=>dot.classList.toggle('lit',state.phase==='playing'&&i<Math.min(3,state.repeat)));
}
async function enterStage(){
 const epoch=stageEpoch,key=['warmup','learn','story','game','speak','task'][step];
 if(step===0){await player.play(activeLesson.introAudio);return;}
 if(step===2)return storySequence.play();
 if(step===3){if(activeLesson.gameBrief?.audio)await player.play(activeLesson.gameBrief.audio);if(epoch===stageEpoch&&!quizFinished)await player.play(words.get(quiz[index].target).questionAudio);return;}
 await playCue(key);if(epoch!==stageEpoch||!activeLesson)return;
 if(step===1)return wordSequence.play();
 if(step===4)return player.play(speakingLine().audio);
 if(step===5)return player.play(activeLesson.taskAudio);
}

let recordingView={key:null,phase:'idle',take:null,elapsedMs:0,message:''},recordingWrite=Promise.resolve();
const memoryTakes=new Map();
const queueRecording=operation=>{const result=recordingWrite.then(operation);recordingWrite=result.catch(()=>{});return result;};
const recorder=new LocalRecorder({
 onChange:state=>{
  if(state.meta?.key!==recordingView.key)return;
  const previous=recordingView.phase;
  recordingView.phase=state.phase;if(state.elapsedMs!==undefined)recordingView.elapsedMs=state.elapsedMs;
  if(state.error)recordingView.message=state.error;
  if(state.phase==='requesting')recordingView.message='请家长帮忙允许麦克风。准备好了，我们再开始说。';
  if(state.phase==='recording')recordingView.message='小麦克风开着呢，说一句给自己听。说完点停止。';
  if(state.phase==='ready'&&!recordingView.message.includes('未能长期保存'))recordingView.message='声音留下来啦！点“听听我的声音”，再听小熊猫示范。';
  if(state.phase==='idle'&&['requesting','recording','saving'].includes(previous))recordingView.message='麦克风已经关闭。准备好了，再点一次小麦克风吧。';
  updateRecordingControls();
 },
 onCapture:async take=>{
  memoryTakes.set(take.key,take);if(memoryTakes.size>MAX_SAVED_RECORDINGS)memoryTakes.delete(memoryTakes.keys().next().value);
  if(recordingView.key===take.key){recordingView.take=take;recordingView.message='正在把声音保存在这台平板…';updateRecordingControls();}
  try{await queueRecording(()=>saveRecording(take));}
  catch{if(recordingView.key===take.key)recordingView.message='声音可以马上回放，但未能长期保存。请家长检查平板存储空间。';}
 }
});
const downloader=new PackDownloader(state=>{updateDownload(state);if(state.phase==='complete'){offlineState={complete:true,total:state.total,cached:state.total};toast('全部课程下载好了，断网也能和小熊猫一起学啦。');}});
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4500);}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(progress));}catch{if(!saveErrorShown){toast('浏览器未能保存进度，请在家长页面导出备份。');saveErrorShown=true;}}}
function saveSession(){if(activeLesson&&progress){progress.sessions[activeLesson.id]={step,seconds,contentRevision:'2.0.0',story:storySequence.lesson?.id===activeLesson.id?storySequence.snapshot():{},words:wordSequence.snapshot(),quiz:{questions:quiz||[],index,finished:quizFinished,accepted:pendingCorrect,selected:missionSelected},speakingIndex};progress.currentLesson=activeLesson.id;save();}}
function stopStage(){stageEpoch++;wordSequence.pause();if(storySequence.lesson)storySequence.pause();answering=false;pendingCorrect=false;recorder.cancel();player.stop();if(recordingView.phase==='playing'){recordingView.phase=recordingView.take?'ready':'idle';updateRecordingControls();}storyPlaying=false;storyToken++;clearTimeout(storyTimer);clearTimeout(speakingTimer);}
function footer(){return `<footer class="footer"><span>YUEBING & LITTLE RED PANDA</span><span>每天一点点，和好朋友慢慢长大。</span><span>${offlineState.complete?'课程已下载 · 可离线使用':'初次下载后，支持离线学习'}</span></footer>`;}
function header(page){return `<header class="header"><a class="brand" href="#home" aria-label="回到我的小屋"><img src="./assets/icon.svg" alt="小熊猫"><span><strong>月饼和小熊猫的英语小屋</strong><small>A LITTLE ENGLISH, A LITTLE EVERY DAY</small></span></a><nav class="nav" aria-label="主要导航">${[['home','我的小屋'],['courses','发现课程'],['stickers','我的贴纸']].map(([id,label])=>`<a href="#${id}" class="${id===page?'active':''}" ${id===page?'aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="parent-link" href="#parent">${icon('parent')}家长入口</a></header>`;}
function shell(page,body){return `<div class="shell">${header(page)}<main class="main">${body}</main>${footer()}</div>`;}
const image=(id,cls='',alt)=>`<img class="${cls}" src="./assets/${id}.svg" alt="${escape(alt??words?.get(id)?.zh??'小熊猫')}" draggable="false">`;
function home(){
 const next=nextLesson(data.lessons,progress),current=data.lessons.find(l=>l.id===progress.currentLesson&&!isLessonComplete(l,progress))||next;
 const started=!!progress.sessions[current.id];
 return shell('home',`<section class="hero"><div class="hero-copy"><div class="eyebrow">月饼的专属英语时光</div><h1>和小熊猫一起，<br>发现英语的<em>小世界。</em></h1><p class="hero-description">我是月饼的好朋友小熊猫。<br>听听声音，看看故事，今天也一起玩着学吧。</p><div class="cta-row"><button class="primary" data-action="start" data-id="${current.id}">${icon('play')}${started?'继续我们的故事':'开始今天的小冒险'}${icon('arrow')}</button><a class="text-button" href="#courses">看看全部课程</a></div><div class="hero-note"><span>${icon('clock')}每天约15分钟</span><span>${icon('heart')}专属于月饼</span><span>${icon('leaf')}下载后离线学</span></div></div><div class="hero-art" aria-label="月饼的好朋友：红棕色长尾小熊猫"><div class="hero-disc"></div><button class="bubble" data-action="prompt" data-key="warmup" aria-label="听小熊猫和月饼打招呼">你好呀，月饼！<br>今天也要一起<\strong>玩得开心</strong>呀。</button>${image('mascot','hero-panda','招手的小熊猫，红棕色毛发、浅色脸颊和环纹长尾巴')}<span class="spark one">✧</span><span class="spark two">✦</span><span class="spark three">✧</span><span class="leaf-doodle">❧</span><div class="art-badge"><span class="badge-icon">${icon('leaf')}</span><span>小小的发现<br><strong>也是大大的进步</strong></span></div></div></section><section class="today-row" aria-label="今天的学习与离线状态"><div class="today-card">${image(current.words[0],'today-thumb')}<div class="text"><span class="card-label">OUR NEXT LITTLE ADVENTURE</span><h3>${current.title}</h3><p>第${current.week}周 · 第${current.day}次见面 · ${current.review?'复习小派对':current.practice?'熟词新故事':'2个新词，一段小故事'}</p></div><button class="round-button" data-action="start" data-id="${current.id}" aria-label="开始${current.title}">${icon('arrow')}</button></div><div class="offline-card"><span class="offline-icon">${icon(offlineState.complete?'check':'download')}</span><div class="text"><h3>${offlineState.complete?'小屋已经装进平板啦':'把小屋装进口袋'}</h3><p>${offlineState.complete?`${data.weeks.length}周课程都在，没网络也能一起玩。`:'下载完整课程，随时打开，安心离线学。'}</p></div><a class="download-mini" href="#parent">${offlineState.complete?'查看下载':'去下载'}</a></div></section><section><div class="section-heading"><div><div class="eyebrow">OUR LEARNING JOURNEY</div><h2>十二周的小小发现</h2></div><p>不赶进度，喜欢的故事可以再玩一遍。</p></div><div class="week-grid">${data.weeks.map(w=>weekCard(w)).join('')}</div></section><p class="welcome-note">“月饼，抱上你的小熊猫，我们一起去发现吧。” <span>♡</span></p>`).replace('<\strong>','<strong>');
}
function weekCard(w){const complete=data.lessons.filter(l=>l.week===w.number&&isLessonComplete(l,progress)).length,thumb=w.thumb||['rabbit','ball','apple','jump','hand','hat','family','bed'][w.number-1];return `<a class="week-card ${w.color}" href="#courses/week${w.number}"><span class="week-number">${String(w.number).padStart(2,'0')}</span>${image(thumb)}<h3>${w.title}</h3><p>${w.subtitle}</p><div class="mini-track"><span style="width:${complete*20}%"></span></div><div class="week-bottom"><span>${complete} / 5 次小冒险</span>${icon('arrow')}</div></a>`;}
function courses(){return shell('courses',`<div class="page-head"><div class="eyebrow">ONE LITTLE STEP AT A TIME</div><h1>每次见面，都有新发现。</h1><p>从熟悉的小世界出发。按顺序学，也可以随时重玩喜欢的故事。</p></div>${data.weeks.map(w=>`<section class="course-section" id="week${w.number}"><div class="course-title"><span class="week-number">${String(w.number).padStart(2,'0')}</span><div><h2>${w.title}</h2><p class="tiny muted">${w.subtitle}</p></div></div><div class="lesson-grid">${data.lessons.filter(l=>l.week===w.number).map(l=>`<button class="lesson-card" data-action="start" data-id="${l.id}"><span class="lesson-index">DAY 0${l.day}${l.review?' · REVIEW':''}</span>${isLessonComplete(l,progress)?`<span class="done">${icon('check')}</span>`:''}${image(l.words[0])}<span class="small">${l.title}</span>${l.week>=11&&progress.completed.includes(l.id)&&!isLessonComplete(l,progress)?'<span class="revision-label">旧版贴纸保留 · 有新内容</span>':''}<span class="pill">${l.review?'复习小派对':l.practice?'约15分钟 · 熟词新故事':'约15分钟 · 2个新词'}</span></button>`).join('')}</div></section>`).join('')}<section class="roadmap"><h2>我们的12周成长路线</h2><p class="small muted">12周课程已全部开放。每课六幕故事，两次帮忙；最后两周加入数量、感受和选择。</p>${data.roadmap.map(r=>`<div class="roadmap-item"><span>W${r.weeks}</span><strong>${r.title}</strong><p>${r.detail}${r.available?' · 已开放':' · 后续计划'}</p></div>`).join('')}</section>`);}
function stickers(){return shell('stickers',`<div class="page-head"><div class="eyebrow">LITTLE MOMENTS, LOVELY MEMORIES</div><h1>和小熊猫收集的小美好</h1><p>每完成一次小冒险，就留下一张小贴纸。休息几天也不会消失。</p><span class="sticker-total">${icon('star')}已经收集 ${progress.completed.length} / ${data.lessons.length} 张</span></div><div class="sticker-grid">${data.lessons.map(l=>`<div class="sticker ${progress.completed.includes(l.id)?'':'locked'}">${image(l.words[(l.day-1)%l.words.length])}<p>${progress.completed.includes(l.id)?l.title:'等待一次小小发现'}</p></div>`).join('')}</div>`);}
function parent(){const state=downloader.state;return shell('parent',`<div class="page-head"><div class="eyebrow">A LITTLE HELP FROM GROWN-UPS</div><h1>准备好，就可以安心离线学。</h1><p>家长帮助开始，最后陪两分钟。英文示范都可以点按钮播放。</p></div><div class="parent-grid"><section class="panel download-panel"><h2>把${data.weeks.length}周课程装进平板</h2><p>音频、图片、故事和游戏一起下载。完成后从桌面打开，日常不用开电脑。</p><div class="download-summary"><span class="offline-icon">${icon('download')}</span><div><strong>${data.lessons.length}节课程 · ${data.vocabulary.length}个核心词</strong><small id="download-size">${manifest?formatBytes(manifest.totalBytes)+' · 全部资源':'正在读取实际下载大小…'}</small></div></div><progress id="download-progress" max="${state.total||1}" value="${state.done||0}" aria-label="课程下载进度"></progress><div class="status-line" id="download-status" aria-live="polite">${escape(state.text||(offlineState.complete?'12周课程已可离线使用。':offlineError||'首次下载请保持页面打开。中断后可继续补齐。'))}</div><div class="cta-row"><button class="primary" id="download-start" data-action="download" ${downloader.running?'disabled':''}>${icon('download')}${offlineState.complete?'检查并修复下载':'下载完整12周课程'}</button><button class="secondary" id="download-pause" data-action="pause-download" ${downloader.running?'':'hidden'}>暂停</button></div><div class="parent-actions"><button class="primary" id="open-downloaded" data-action="open-downloaded" ${state.phase==='complete'?'':'hidden'}>打开已下载的12周课程</button><button class="secondary" data-action="check-offline">${icon('check')}检查离线完整性</button><button class="secondary" data-action="check-update">检查新版本</button></div><p class="notice">请先看到“12周课程已可离线使用”，再断开网络测试。清理浏览器数据或系统释放存储后，可能需要重新下载。学习进度可以在下方备份。下载后点击“打开已下载的12周课程”载入新课。</p><p class="tiny muted" style="margin-top:12px">如果课程没有新增，<a href="./update.html?yb-update=repair">点这里直接更新到12周</a>。</p></section><section class="panel"><h2>添加到平板桌面</h2><ol class="install-list"><li>用支持离线网页的安卓浏览器打开本站。</li><li>在浏览器菜单选择“安装应用”或“添加到主屏幕”。</li><li>完成课程下载后，开启飞行模式，从桌面图标重新打开测试。</li></ol><button class="secondary" data-action="install">${icon('play')}添加到桌面</button><p class="tiny muted" style="margin-top:13px">浏览器的菜单名称可能不同。如果不支持安装，仍可用同一浏览器的书签打开。</p></section><section class="panel"><h2>留住月饼的小进步</h2><p>已完成 ${progress.completed.length} 节。记录仅保存在这台设备，不会自动同步到其他设备。</p><div class="parent-actions"><button class="secondary" data-action="export">导出进度备份</button><button class="secondary" data-action="import">导入进度备份</button></div><input type="file" id="progress-file" class="file-input" accept="application/json,.json"></section><section class="panel"><h2>月饼自己的声音</h2><p>在“说一说”点麦克风录音，再点“听听我的声音”回放。首次请家长允许麦克风，每次最多20秒。离开课程或切到后台时麦克风会关闭。</p><p class="tiny muted" id="recording-summary" style="margin-top:12px">正在查看本机录音…</p><p class="tiny muted" style="margin-top:10px">每个跟读项目保留最近一次，最多保存80段，超出时替换最早的。录音不上传，不随进度备份导出；清理浏览器数据会删除录音。</p><div id="recording-library" class="recording-library"></div><div class="parent-actions"><button class="secondary" data-action="recordings-clear">删除本机全部录音</button></div></section></div><section class="panel"><h2>陪伴，比教得标准更重要</h2><p>每天约15分钟：打招呼1分钟、词汇2分钟、六幕故事4分钟、游戏4分钟、跟说2分钟、生活任务2分钟。孩子可以暂停、跳过跟说，或者多玩几遍。不要急着纠正，让他多听清晰的示范。最后抱上家里的小熊猫玩偶，把屏幕里的词带进生活。</p><p style="margin-top:12px">字母名称和单词开头的声音是两回事：先听完整单词、玩声音游戏，逐步准备自然拼读。跟说环节可点麦克风录音，再听自己的声音。录音只保存在这台设备，不上传、不打分，也可以继续只听示范。</p><p class="tiny muted" style="margin-top:15px">课程版本 ${data.version} · 原创轻量情境动画 · 统一预制美式语音 · 学习过程中不调用在线语音服务</p></section>`);}
function promptButton(key,label='听小熊猫说'){const cue=cueFor(key);return `<button class="audio-button" data-action="prompt" data-key="${key}" data-audio="${cue.audio}">${icon('sound')}${label}</button>`;}
function wordPicture(id){if(!numbers.includes(id))return image(id);const phrase=words.get(id).phrase,item=/blocks/i.test(phrase)?'blocks':/eggs/i.test(phrase)?'egg':/balls/i.test(phrase)?'ball':'apple';return countPicture(item,numbers.indexOf(id)+1);}
function wordCard(id,compact=false){const w=words.get(id);return `<div><button class="word-card" data-action="word" data-id="${id}" aria-label="听${w.id}的发音">${icon('sound')}${wordPicture(id)}<span class="english">${w.id}</span><span class="meaning">${w.zh}</span></button>${compact?'':`<button class="phrase-button" data-action="phrase" data-id="${id}">${icon('sound')} ${w.phrase}</button>`}</div>`;}
function stageHeading(title,description,prompt){return `<div class="stage-heading"><div><h2>${title}</h2><p>${description}</p></div>${promptButton(prompt)}</div>`;}
function miniInteractionHTML(){
 if(!data.interactions?.length)return '';
 const invite=cueFor('miniInteraction');
 return `<section class="mini-interaction" data-interaction="${escape(invite.id)}" aria-label="和小熊猫的中文互动"><div class="mini-interaction-title">${image('mascot')}<div><h3>${escape(invite.title)}</h3><button class="text-button" data-action="interaction-listen">${icon('sound')}听小熊猫的小邀请</button></div></div><div class="mini-interaction-choices">${invite.choices.map(choice=>`<button class="secondary" data-action="interaction-choice" data-id="${escape(choice.id)}" aria-pressed="false">${image((choice.image||'mascot').replace(/^assets\//,'').replace(/\.svg$/,''))}${escape(choice.label)}</button>`).join('')}</div><p class="interaction-reply" id="interaction-reply" role="status">想玩就选一个，也可以直接进入下一步。</p></section>`;
}
function showRest(button){
 if(!activeLesson||restState)return;
 const accepted=step===3&&pendingCorrect;stopStage();
 if(step===3){if(accepted){index++;quizFinished=index>=quiz.length;missionSelected=null;}document.querySelector('#quiz-content').innerHTML=quizHTML();saveSession();}
 const cue=data.promptVariants?.rest?.length?cueFor('rest',true):{text:'抱抱小熊猫，准备好了再继续。'};
 const dialog=document.createElement('dialog');dialog.className='rest-dialog';dialog.setAttribute('aria-labelledby','rest-title');
 dialog.innerHTML=`<div class="modal rest-content">${image('mascot','rest-panda')}<h2 id="rest-title">和小熊猫歇一会儿</h2><p>${escape(cue.text)}</p><p class="tiny muted">不着急，准备好了再继续。</p><div class="rest-actions"><button class="primary" data-action="rest-close">准备好了，继续</button><button class="text-button" data-action="rest-listen">${icon('sound')}再听小熊猫说</button></div></div>`;
 restState={dialog,button,cue};document.body.append(dialog);
 if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.classList.add('rest-fallback');}
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeRest();});
 dialog.querySelector('button').focus();if(cue.audio)player.play(cue.audio);
}
function closeRest(silent=false){
 if(!restState)return;const {dialog,button}=restState;restState=null;player.stop();
 if(typeof dialog.close==='function')dialog.close();dialog.remove();lastTick=Date.now();
 if(!silent){if(button?.isConnected)button.focus();if(activeLesson&&step===3&&!quizFinished)player.play(words.get(quiz[index].target).questionAudio);}
}
function renderLesson(){
 const l=activeLesson;
 app.innerHTML=`<div class="lesson-shell"><header class="lesson-header"><a class="round-button" href="#home" aria-label="保存并返回小屋">${icon('back')}</a><div class="lesson-title"><h1>${l.title}</h1><p>第${l.week}周 · 第${l.day}次见面 · ${l.review?'复习小派对':l.practice?'熟悉的声音，新故事':'和小熊猫一起发现'}</p></div><span class="lesson-clock">${icon('clock')} <span id="elapsed">${formatTime(seconds)}</span> / 约15分钟</span></header><nav class="steps" aria-label="学习环节">${steps.map(([label],i)=>`<span class="step-dot ${i===step?'current':i<step?'past':''}">${i+1} ${i===1&&(l.practice||l.review)?'听熟词':label}</span>`).join('')}</nav><main class="lesson-stage" id="stage">${stageHTML()}</main><div class="lesson-bottom"><button class="text-button" data-action="previous" ${step===0?'disabled':''}>${icon('back')}上一步</button><button class="text-button lesson-rest" data-action="rest-open">${icon('pause')}休息一会</button><span class="muted">${step===5?'抱着真实的玩偶，和家人一起玩。':'想多听几遍也可以，不赶时间。'}</span><button class="primary" data-action="next">${step===5?'玩好了，收下贴纸':step===4?'去和玩偶一起玩':'下一步'}${icon('arrow')}</button></div></div>`;
 if(step===4)loadSpeakingRecording();
}
function stageHTML(){
 const l=activeLesson;
 if(step===0){
  const ids=l.warmupWords||l.words,greeting=cueFor('warmup');
  return stageHeading(greeting.title||'你好呀，月饼！',l.review?'今天把这一周的发现再玩一遍。':l.practice?'让熟悉的声音，陪我们走进新故事。':'先和好朋友打个招呼，再听听今天故事里的声音。','warmup')+`<div class="stage-content"><div class="buddy-row">${image('mascot','buddy-small')}<div class="speech-note">${escape(l.intro)}<br><button class="text-button" data-action="lesson-intro">${icon('sound')}听今天的邀请</button></div></div><p class="word-help lesson-word-label">${l.review?'本周一起回顾':l.practice?'故事里的老朋友':'今天一起认识'}：${ids.map(id=>words.get(id).zh).join('、')}</p><div class="word-grid compact">${ids.map(id=>wordCard(id,true)).join('')}</div>${l.recallWords?.length?'<p class="recall-note">还记得'+l.recallWords.map(id=>words.get(id).zh).join('、')+'吗？它们也会来今天的故事里帮忙。</p>':''}</div>`;
 }
 if(step===1){
  const ids=l.review||l.practice?l.words:l.newWords;
  const title=l.review?'熟悉的朋友，再见面':'听一听，图片会说话';
  return stageHeading(title,'先听完整的声音，再轻轻跟着说。','learn')+`<div class="stage-content"><div class="word-grid ${l.review?'compact':''}">${ids.map(id=>wordCard(id,l.review)).join('')}</div>${wordControls()}<p class="word-help">每张图片会说三遍单词，再说一句话。也可以点自己喜欢的图片。</p><div class="letters-row">${l.letters.map((x,i)=>`<button class="letter-button" data-action="letter" data-index="${i}"><strong>${x.letter} ${x.letter.toLowerCase()}</strong>${icon('sound')} ${x.word}</button>`).join('')}</div>${l.letters.length?'<p class="word-help tiny">先听今天单词的开头字母，再听这个单词。字母名字和单词开头的声音不一样。</p>':''}${l.soundGame?`<section class="sound-game"><h3>听听开头，像不像？</h3><p>${escape(l.soundGame.text)}</p><button class="audio-button" data-action="sound-game">${icon('sound')}听听这两个词</button></section>`:''}${miniInteractionHTML()}</div>`;
 }
 if(step===2)return stageHeading('故事里的小发现','小熊猫需要月饼的帮忙。听听看，它发现了什么？','story')+`<div class="stage-content" id="story-content">${storyHTML()}</div>`;
 if(step===3)return stageHeading('月饼，帮我找找吧',l.week===3?'听声音，把好吃的送给小熊猫。':l.week===4?'听指令，先做动作，再点相同的图。':'听声音，再点图片。没找到也可以再听一遍。','game')+`<div class="stage-content" id="quiz-content">${quizHTML()}</div>`;
 if(step===4)return stageHeading('轮到月饼说一说','听一遍，自己试一遍。也可以只听，慢慢来。','speak')+`<div class="stage-content" id="speaking-content">${speakingHTML()}</div>`;
 return stageHeading('把小发现，带进生活','现在请家长陪一下，抱上家里的小熊猫玩偶。','task')+`<div class="stage-content"><div class="task-card">${image('mascot')}<div><p class="task-text">${l.task}</p><span class="small">家长可以点下面的声音，让小熊猫再说一遍。</span><button class="audio-button" style="margin-top:18px" data-action="task-audio">${icon('sound')}听小熊猫的小任务</button></div></div></div>`;
}
function storyHTML(){return storyView(storySequence);}
function quizHTML(){
 if(quizFinished)return `<div class="quiz-done">${image('mascot')}<h3>谢谢月饼来帮忙！</h3><p class="muted">故事里的任务完成啦，接下来把一句话说给小熊猫听吧。</p><button class="secondary" data-action="quiz-restart">再玩一次</button></div>`;
 const q=quiz[index];return `<p class="quiz-count"><span class="quiz-scope ${q.scope}" data-scope="${q.scope}">${activeLesson.review?'本周复习':q.scope==='review'?'复习以前学过的词':'今天的新发现'}</span>第 ${index+1} / ${quiz.length} 次小发现</p><p class="mission-brief">${escape(activeLesson.gameBrief?.text||'帮小熊猫完成故事里的任务吧。')}</p><div class="mission-listen"><button class="audio-button" data-action="quiz-listen">${icon('sound')}听一听，要找谁？</button></div>${missionHTML(q,words,{selected:missionSelected,done:pendingCorrect})}<p class="quiz-feedback" role="status" id="quiz-feedback">${missionSelected&&q.mode==='deliver'?'选好啦，再点小熊猫送过去。':'听到了就试着点一点吧。'}</p>${index>=3?'<div class="quiz-rest-invite"><span>小耳朵想歇一会吗？</span><button class="text-button" data-action="rest-open">和小熊猫休息一下</button></div>':''}`;
}
function speakingLine(){const w=speakingWord();return activeLesson.speaking?.find(line=>line.word===w.id)||{text:w.phrase,audio:w.phraseAudio};}
function speakingWord(){return words.get(activeLesson.words[speakingIndex%activeLesson.words.length]);}
function speakingHTML(){const w=speakingWord();return `<div class="speaking-card">${wordPicture(w.id)}<p class="phrase">${escape(speakingLine().text)}</p><button class="audio-button" data-action="speaking-listen" data-id="${w.id}">${icon('sound')}听小熊猫示范</button><div class="speaking-wait" id="speaking-wait">听完后，留一点时间给自己的声音。</div><section class="local-recorder" id="local-recorder" data-key="${escape(recordingKey(activeLesson.id,w.id))}" data-phase="loading" aria-label="月饼的跟读录音"><div class="recording-heading"><span class="mic-badge">${icon('mic')}</span><strong>把自己的声音留下来</strong><span class="record-timer" aria-hidden="true">00:00 / 00:20</span></div><div class="recording-actions"><button class="record-button" data-action="record-start" disabled>${icon('mic')}开始录音</button><button class="record-button recording-stop" data-action="record-stop" hidden>${icon('stop')}停止录音</button><button class="secondary" data-action="record-play" disabled>${icon('play')}听听我的声音</button></div><p class="record-status" id="record-status" role="status">正在看看有没有留下的声音…</p><button class="text-button record-delete" data-action="record-delete" hidden>删除这段录音</button><p class="tiny muted recording-privacy">每次最多20秒，仅保存在这台设备。首次请家长允许麦克风。</p></section><div class="speaking-choice"><button class="secondary" data-action="speaking-tried">我试着说啦</button><button class="secondary" data-action="speaking-next">再听另一个</button></div><p class="word-help tiny">想说就试试看，也可以只听。小熊猫不会给发音打分。</p></div>`;}
async function loadSpeakingRecording(){
 const key=recordingKey(activeLesson.id,speakingWord().id),epoch=stageEpoch;
 recordingView={key,phase:'loading',take:null,elapsedMs:0,message:'正在看看有没有留下的声音…'};updateRecordingControls();
 let take=memoryTakes.get(key)||null;
 try{await recordingWrite;take=await getRecording(key)||take;}catch{}
 if(epoch!==stageEpoch||recordingView.key!==key||recordingView.phase!=='loading'||!activeLesson||step!==4)return;
 Object.assign(recordingView,{take,phase:take?'ready':'idle',message:take?'上次的声音还在呢！可以听一听，也可以再录一次。':'先听小熊猫，再点小麦克风，说一句给自己听。',elapsedMs:take?.durationMs||0});updateRecordingControls();
}
function updateRecordingControls(){
 const root=document.querySelector('#local-recorder');if(!root||root.dataset.key!==recordingView.key)return;
 const {phase,take}=recordingView,busy=['requesting','recording','saving'].includes(phase);root.dataset.phase=phase;
 const start=root.querySelector('[data-action="record-start"]'),stop=root.querySelector('[data-action="record-stop"]'),play=root.querySelector('[data-action="record-play"]'),remove=root.querySelector('[data-action="record-delete"]');
 start.hidden=busy;start.disabled=phase==='loading';start.innerHTML=icon('mic')+(take?'再录一次':'开始录音');
 stop.hidden=!busy;stop.disabled=phase==='saving';stop.innerHTML=icon('stop')+(phase==='requesting'?'先不录了':phase==='saving'?'正在保存…':'停止录音');
 play.disabled=!take||busy||phase==='loading';play.innerHTML=icon(phase==='playing'?'stop':'play')+(phase==='playing'?'停止回放':'听听我的声音');
 remove.hidden=!take;remove.disabled=busy;
 root.querySelector('#record-status').textContent=recordingView.message;
 root.querySelector('.record-timer').textContent=formatTime(recordingView.elapsedMs/1000)+' / '+formatTime(MAX_RECORDING_MS/1000);
 document.querySelector('[data-action="speaking-listen"]')?.toggleAttribute('disabled',busy);
 document.querySelector('[data-action="speaking-tried"]')?.toggleAttribute('disabled',busy);
}
async function refreshRecordingSummary(){
 const element=document.querySelector('#recording-summary');if(!element)return;
 try{const info=await recordingSummary();if(element.isConnected)element.textContent=`这台设备保存了 ${info.count} 段声音 · ${formatBytes(info.bytes)}`;const rows=await listRecordings(),library=document.querySelector('#recording-library');if(library)library.innerHTML=rows.map(row=>{const [lessonId,word]=row.key.split('/');return `<button class="text-button" data-action="archive-play" data-key="${escape(row.key)}">${icon('play')}第${Number(lessonId.match(/w(\d+)/)?.[1])}周 · ${escape(word)} 的声音</button>`;}).join('');}
 catch{if(element.isConnected)element.textContent='录音只存在当前浏览器。无法长期保存时，仍可以当次回放。';}
}
function formatTime(n){return `${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;}
function showFirstMeet(id){firstMeetReady=false;const modal=document.createElement('div');modal.className='modal-backdrop';modal.id='first-meet';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','meet-heading');modal.innerHTML=`<div class="modal">${image('mascot')}<h2 id="meet-heading">月饼，你好呀！</h2><p>我是小熊猫，我是月饼的好朋友。<br>抱上家里的小熊猫，我们一起出发吧。</p><button class="primary" data-action="meet-listen" data-id="${id}">${icon('sound')}听小熊猫打招呼</button><button class="text-button" data-action="meet-skip" data-id="${id}">先一起出发</button></div>`;document.body.append(modal);modal.querySelector('button').focus();}
function startLesson(id){if(downloader.running){toast('请先完成或暂停课程下载，再开始学习。');return;}if(!progress.metPanda){showFirstMeet(id);return;}location.hash='lesson/'+id;}
function updateDownload(state){const bar=document.querySelector('#download-progress'),status=document.querySelector('#download-status'),button=document.querySelector('#download-start'),pause=document.querySelector('#download-pause');if(bar){bar.max=state.total||1;bar.value=state.done;}if(status)status.textContent=state.text;if(button){button.disabled=state.phase==='downloading';button.innerHTML=icon('download')+(state.phase==='complete'?'检查并修复下载':state.phase==='paused'?'继续下载完整课程':state.phase==='error'?'重新检查并下载':'下载完整12周课程');}if(pause)pause.hidden=state.phase!=='downloading';const enter=document.querySelector('#open-downloaded');if(enter)enter.hidden=state.phase!=='complete';}
async function checkOffline(){try{offlineState=await workerMessage('STATUS');return offlineState;}catch(e){offlineError=e.message;return {complete:false};}}
async function loadDownloadInfo(fresh=false){const epoch=++downloadInfoEpoch;try{const latest=await getManifest(fresh);if(epoch!==downloadInfoEpoch||downloader.running)return;manifest=latest;const el=document.querySelector('#download-size');if(el)el.textContent=`${latest.coverage?.weeks||data.weeks.length}周 · ${latest.coverage?.lessons||data.lessons.length}节课 · ${formatBytes(latest.totalBytes)} · ${latest.assets.length}项资源`;}catch(e){const el=document.querySelector('#download-size');if(el&&epoch===downloadInfoEpoch)el.textContent='联网后可读取实际下载大小';}}
function tick(){const now=Date.now();if(activeLesson&&!document.hidden&&!restState){seconds+=Math.min((now-lastTick)/1000,2);const el=document.querySelector('#elapsed');if(el)el.textContent=formatTime(seconds);}lastTick=now;}
async function route(){
 closeRest(true);saveSession();stopStage();cueCache={};activeLesson=null;const epoch=++routeEpoch;
 const [page='home',detail]=(location.hash.slice(1)||'home').split('/');
 if(page==='lesson'){
  activeLesson=data.lessons.find(l=>l.id===detail);if(!activeLesson){location.hash='courses';return;}
  const oldSession=progress.sessions[activeLesson.id],session=activeLesson.week>=11&&oldSession?.contentRevision!=='2.0.0'?null:oldSession;step=session?.step??0;seconds=session?.seconds??0;lastTick=Date.now();frame=0;quiz=session?.quiz?.questions?.length?session.quiz.questions:makeQuiz(activeLesson);index=Math.min((session?.quiz?.index||0)+(session?.quiz?.accepted?1:0),quiz.length);quizFinished=!!session?.quiz?.finished||index>=quiz.length;if(quizFinished)index=Math.min(index,quiz.length-1);answering=false;missionSelected=session?.quiz?.selected||null;speakingIndex=session?.speakingIndex||0;wordSequence.load(activeLesson.review?activeLesson.words:activeLesson.newWords,words,session?.words?.cursor);storySequence.load(activeLesson,session?.story);renderLesson();updateWordSequence();saveSession();await enterStage();
 }else{
  app.innerHTML=page==='courses'?courses():page==='stickers'?stickers():page==='parent'?parent():home();
  if(page==='parent')refreshRecordingSummary();
  if(page==='parent'){loadDownloadInfo(navigator.onLine);await checkOffline();if(epoch!==routeEpoch)return;const line=document.querySelector('#download-status');if(line&&!downloader.running&&downloader.state.phase==='idle')line.textContent=offlineState.complete?'12周课程已可离线使用。':offlineError||`尚未完成完整下载${offlineState.total?`（已缓存 ${offlineState.cached} / ${offlineState.total} 项）`:''}。`;}
  if(detail?.startsWith('week'))document.getElementById(detail)?.scrollIntoView({block:'start'});
 }
 if(!detail?.startsWith('week'))window.scrollTo(0,0);
}
async function completeLesson(){
 const l=activeLesson;saveSession();if(!isLessonComplete(l,progress))progress.completed.push(l.id);progress.sessions[l.id]={step:0,seconds:0};progress.currentLesson=nextLesson(data.lessons,progress).id;save();stopStage();activeLesson=null;
 const total=progress.completed.length;
 app.innerHTML=`<div class="lesson-shell"><main class="panel completion">${image(l.words[0])}<p class="sticker-award">A LITTLE STICKER FOR YUEBING</p><h2>月饼，谢谢你陪我一起玩！</h2><p class="muted">今天的小发现，已经变成第 ${total} 张贴纸啦。<br>抱一抱你的小熊猫，今天就到这里吧。</p><div class="cta-row"><a href="#home" class="primary">回到小屋${icon('arrow')}</a><a href="#stickers" class="secondary">看看我的贴纸</a><button class="text-button" data-action="prompt" data-key="complete">${icon('sound')}听小熊猫说</button></div></main></div>`;
 const epoch=routeEpoch;await playCue('complete');if(epoch===routeEpoch)await player.play(data.prompts.goodbye.audio);
}
async function playStory(){if(storySequence.state.phase==='playing')storySequence.pause();else await storySequence.play();}
async function answer(button,delivered=false){
 if(answering||quizFinished)return;const q=quiz[index],epoch=stageEpoch,id=delivered?missionSelected:button.dataset.id;
 if(q.mode==='deliver'&&!delivered){wordSequence.pause();missionSelected=id;document.querySelector('#quiz-content').innerHTML=quizHTML();saveSession();return;}
 if(!id)return;answering=true;
 if(id!==q.target){button.classList.add('retry');const feedback=cueFor('retry',true);document.querySelector('#quiz-feedback').textContent=feedback.text;await player.play(feedback.audio);if(epoch!==stageEpoch)return;await player.play(words.get(q.target).questionAudio);if(epoch!==stageEpoch)return;answering=false;missionSelected=null;document.querySelector('#quiz-content').innerHTML=quizHTML();return;}
 pendingCorrect=true;document.querySelector('#quiz-content').innerHTML=quizHTML();saveSession();await player.play(words.get(q.target).phraseAudio);
 if(epoch!==stageEpoch||!activeLesson||step!==3)return;pendingCorrect=false;missionSelected=null;index++;if(index>=quiz.length)quizFinished=true;answering=false;document.querySelector('#quiz-content').innerHTML=quizHTML();saveSession();if(!quizFinished)await player.play(words.get(quiz[index].target).questionAudio);
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
 const action=button.dataset.action;
 try{
  if(restState&&!action.startsWith('rest-'))return;
  if(!['story-play','story-prev','story-next','story-restart','story-choice','story-receiver','words-toggle','words-restart','next','previous','rest-open','rest-close','rest-listen'].includes(action)){if(wordSequence.state.phase==='playing')wordSequence.pause();if(storySequence.state.phase==='playing')storySequence.pause();}
  if(action==='words-toggle'){if(wordSequence.state.phase==='playing')wordSequence.pause();else await wordSequence.play();return;}
  if(action==='words-restart')return wordSequence.play(true);
  if(action==='story-choice')return storySequence.choose(button.dataset.id);
  if(action==='story-receiver')return storySequence.choose(button.dataset.id,true);
  if(action==='story-restart')return storySequence.play(true);
  if(action==='deliver-answer')return answer(button,true);
  if(action==='archive-play'){const take=await getRecording(button.dataset.key);if(take)return player.playBlob(take.blob,button);return;}
  if(action==='rest-open')return showRest(button);
  if(action==='rest-close')return closeRest();
  if(action==='rest-listen'){if(restState?.cue.audio)return player.play(restState.cue.audio,button);return;}
  if(action==='interaction-listen'){const invite=cueFor('miniInteraction');return player.play(invite.audio,button);}
  if(action==='interaction-choice'){
   const invite=cueFor('miniInteraction'),choice=invite.choices.find(item=>item.id===button.dataset.id);if(!choice)return;
   document.querySelector('#interaction-reply').textContent=choice.reply;
   document.querySelectorAll('[data-action="interaction-choice"]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
   const epoch=stageEpoch,played=await player.play(choice.replyAudio,button);
   if(choice.id==='say'&&played&&epoch===stageEpoch&&activeLesson&&step===1)return player.play(words.get(activeLesson.words[0]).phraseAudio,button);
   return;
  }
  if(action==='sound-game'){
   const activity=activeLesson?.soundGame;if(!activity)return;stopStage();const epoch=stageEpoch;
   if(activity.audio&&!await player.play(activity.audio,button))return;
   for(const id of activity.words){if(epoch!==stageEpoch||!await player.play(words.get(id).audio,button))return;}
   return;
  }
  if(!action.startsWith('record-')){
   if(['requesting','recording','saving'].includes(recorder.phase))recorder.cancel();
   if(recordingView.phase==='playing'){player.stop();recordingView.phase='ready';recordingView.message='想再听就点一次，也可以再听小熊猫。';updateRecordingControls();}
  }
  if(action==='record-start'){
   if(!activeLesson||step!==4||['loading','requesting','recording','saving'].includes(recordingView.phase))return;
   wordSequence.pause();storySequence.pause();player.stop();clearTimeout(speakingTimer);recordingView.message='';recordingView.elapsedMs=0;
   return recorder.start({key:recordingView.key});
  }
  if(action==='record-stop'){if(recorder.phase==='requesting')recorder.cancel();else recorder.stop();return;}
  if(action==='record-play'){
   if(!recordingView.take)return;
   if(recordingView.phase==='playing'){player.stop();recordingView.phase='ready';recordingView.message='再听小熊猫示范，也可以再听一次自己的声音。';updateRecordingControls();return;}
   const key=recordingView.key,epoch=stageEpoch;recorder.cancel();recordingView.phase='playing';recordingView.message='这是月饼自己的声音。';updateRecordingControls();
   await player.playBlob(recordingView.take.blob,button);
   if(epoch===stageEpoch&&key===recordingView.key){recordingView.phase='ready';recordingView.message='听到自己的声音啦！想再试，就点“再录一次”。';updateRecordingControls();}return;
  }
  if(action==='record-delete'){
   const key=recordingView.key;recorder.cancel();player.stop();await queueRecording(()=>deleteRecording(key));memoryTakes.delete(key);
   if(recordingView.key===key){recordingView.take=null;recordingView.phase='idle';recordingView.elapsedMs=0;recordingView.message='这段声音已经删除。准备好了，再录一段吧。';updateRecordingControls();}return;
  }
  if(action==='recordings-clear'){
   if(!confirm('删除这台设备上保存的全部跟读录音？学习进度和已下载课程会保留。'))return;
   recorder.cancel();player.stop();await queueRecording(()=>clearRecordings());memoryTakes.clear();recordingView.take=null;refreshRecordingSummary();toast('本机的跟读录音已全部删除。');return;
  }
  if(action==='start')return startLesson(button.dataset.id);
  if(action==='prompt')return playCue(button.dataset.key,button);
  if(action==='word')return player.play(words.get(button.dataset.id).audio,button);
  if(action==='phrase')return player.play(words.get(button.dataset.id).phraseAudio,button);
  if(action==='lesson-intro')return player.play(activeLesson.introAudio,button);
  if(action==='task-audio')return player.play(activeLesson.taskAudio,button);
  if(action==='meet-listen'){
   if(firstMeetReady){progress.metPanda=true;save();document.querySelector('#first-meet')?.remove();location.hash='lesson/'+button.dataset.id;return;}
   button.disabled=true;await player.play(data.prompts.firstMeet.audio,button);if(!document.querySelector('#first-meet'))return;await player.play(data.prompts.hello.audio,button);if(!document.querySelector('#first-meet'))return;firstMeetReady=true;button.disabled=false;button.innerHTML=icon('arrow')+'和小熊猫一起出发';return;
  }
  if(action==='meet-skip'){player.stop();progress.metPanda=true;save();document.querySelector('#first-meet')?.remove();location.hash='lesson/'+button.dataset.id;return;}
  if(action==='next'||action==='previous'){
   if(action==='next'&&step===5)return completeLesson();stopStage();cueCache={};step+=action==='next'?1:-1;answering=false;saveSession();renderLesson();updateWordSequence();await enterStage();return;
  }
  if(action==='letter'){stopStage();const letter=activeLesson.letters[Number(button.dataset.index)];if(await player.play(letter.audio,button))await player.play(words.get(letter.word).audio,button);return;}
  if(action==='story-play')return playStory();
  if(action==='story-next'||action==='story-prev')return storySequence.move(action==='story-next'?1:-1);
  if(action==='quiz-listen')return player.play(words.get(quiz[index].target).questionAudio,button);
  if(action==='answer')return answer(button);
  if(action==='quiz-restart'){stopStage();quiz=makeQuiz(activeLesson);index=0;quizFinished=false;answering=false;missionSelected=null;document.querySelector('#quiz-content').innerHTML=quizHTML();return player.play(words.get(quiz[0].target).questionAudio);}
  if(action==='speaking-listen'){clearTimeout(speakingTimer);const token=routeEpoch,played=await player.play(speakingLine().audio,button);if(!played||token!==routeEpoch||step!==4)return;document.querySelector('#speaking-wait').textContent='现在，轮到月饼啦…';speakingTimer=setTimeout(()=>{const el=document.querySelector('#speaking-wait');if(el)el.textContent='慢慢来，还想听就再点一次。';},7000);return;}
  if(action==='speaking-tried'){const feedback=cueFor('afterSpeak',true);document.querySelector('#speaking-wait').textContent=feedback.text;return player.play(feedback.audio);}
  if(action==='speaking-next'){stopStage();speakingIndex=(speakingIndex+1)%activeLesson.words.length;document.querySelector('#speaking-content').innerHTML=speakingHTML();loadSpeakingRecording();saveSession();return player.play(speakingLine().audio);}
  if(action==='download'){
   if(downloader.running)return;downloadInfoEpoch++;button.disabled=true;
   try{await registerOffline();offlineError='';
    manifest=await getManifest(navigator.onLine);if(!navigator.onLine&&!offlineState.complete){toast('请联网后下载课程，下载完整后就可以离线学。');return;}
    await downloader.start(manifest);if(downloader.state.phase==='complete'){const enter=document.querySelector('#open-downloaded');if(enter){enter.hidden=false;enter.textContent=`打开已下载的${manifest.coverage?.weeks||data.weeks.length}周课程`;}}await checkOffline();
   }finally{button.disabled=false;}return;
  }
  if(action==='open-downloaded'){saveSession();const url=new URL('./',location.href);url.searchParams.set('yb-open',Date.now());url.hash='courses';location.replace(url.href);return;}
  if(action==='pause-download')return downloader.pause();
  if(action==='check-offline'){button.disabled=true;const result=await checkOffline();button.disabled=false;const message=result.complete?'检查通过：12周课程已可离线使用。':`课程尚未完整：${result.cached||0} / ${result.total||'待下载'} 项，请点下载补齐。`;document.querySelector('#download-status').textContent=offlineError||message;toast(offlineError||message);return;}
  if(action==='check-update'){
   if(downloader.running){toast('请先完成或暂停当前下载。');return;}downloadInfoEpoch++;button.disabled=true;
   try{const remote=await getManifest(true);const current=await checkOffline();manifest=remote;document.querySelector('#download-size').textContent=formatBytes(remote.totalBytes)+' · 全部资源';document.querySelector('#download-status').textContent=remote.version===current.version&&current.complete?'已经是当前完整版本。':'已取得最新课程清单，点击下载即可完整保存；现有课程继续保留。';const reg=await navigator.serviceWorker.getRegistration();await reg?.update();}finally{button.disabled=false;}return;
  }
  if(action==='install'){if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else toast('请在浏览器菜单选择“安装应用”或“添加到主屏幕”。');return;}
  if(action==='export'){saveSession();const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='月饼英语进度-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
  if(action==='import')return document.querySelector('#progress-file').click();
 }catch(e){toast(e.message||'暂时没准备好，请再试一次。');}
});
document.addEventListener('change',async event=>{
 if(event.target.id!=='progress-file')return;const file=event.target.files[0];if(!file)return;
 try{if(file.size>1024*1024)throw new Error('进度文件过大，请选择之前导出的 JSON 备份。');const imported=sanitizeProgress(JSON.parse(await file.text()),data.lessons);if(!confirm(`导入这份进度？共有 ${imported.completed.length} 节已完成课程，将替换当前设备的记录。`))return;progress=imported;save();await route();toast('月饼的学习进度已经恢复。');}catch(e){toast(e.message||'进度文件无法读取。');}event.target.value='';
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('hashchange',route);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopStage();saveSession();if(activeLesson&&step===2){const el=document.querySelector('#story-content');if(el)el.innerHTML=storyHTML();}}lastTick=Date.now();});
window.addEventListener('pagehide',()=>{stopStage();saveSession();});
setInterval(tick,1000);setInterval(saveSession,15000);
async function boot(){
 try{
  const response=await fetch('./curriculum.json');if(!response.ok)throw new Error('课程暂时无法读取。请先联网完成首次下载。');data=await response.json();words=new Map(data.vocabulary.map(w=>[w.id,w]));
  try{const saved=localStorage.getItem(STORE_KEY);progress=saved?sanitizeProgress(JSON.parse(saved),data.lessons):emptyProgress();}catch{progress=emptyProgress();toast('暂时无法读取原有进度，已为你打开小屋。');}
  await route();
  try{await registerOffline();await checkOffline();if(!activeLesson&&!downloader.running)await route();}catch(e){offlineError=e.message;if(location.hash==='#parent'){const el=document.querySelector('#download-status');if(el)el.textContent=e.message;}}
 }catch(e){app.innerHTML=`<main class="error-card"><h1>小熊猫还在准备小屋</h1><p>${escape(e.message)}如果之前已下载，请用原来的浏览器和桌面图标打开。</p><button class="primary" onclick="location.reload()">重新打开</button></main>`;}
}
boot();
