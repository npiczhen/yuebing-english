// All scenes, speech and tasks use downloaded local resources.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bounded=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number(v)||0));
export const picture=(word,cls='')=>`<img class="${cls}" src="./assets/${esc(word)}.svg" alt="" draggable="false">`;
const storyAnimals=new Set(['cat','dog','bird','fish','bear','rabbit','duck','frog']);
export function usesSceneAnimalChoices(scene,task){
 return !!task&&['choose','reveal'].includes(task.type)&&task.choices.every(c=>storyAnimals.has(c.word))&&task.choices.some(c=>c.id===task.target&&scene.objects.some(o=>o.id===c.objectId&&!o.hidden));
}
const unitBlock='<svg viewBox="0 0 240 240" aria-label="一块积木"><rect x="35" y="35" width="170" height="170" rx="18" fill="#dfae68" stroke="#715542" stroke-width="8"/></svg>';
export function countPicture(item,count){return `<div class="count-set" aria-label="${count}个物品">${Array.from({length:count},()=>item==='blocks'?unitBlock:picture(item)).join('')}</div>`;}
export function sceneHTML(scene={},interaction=null,solved=false){
 const objects=scene.objects||[],direct=usesSceneAnimalChoices(scene,interaction)||['reveal','position'].includes(interaction?.type),hotspots=new Map((direct?interaction?.choices||[]:[]).filter(c=>c.objectId).map(c=>[c.objectId,c]));
 if(usesSceneAnimalChoices(scene,interaction))for(const o of objects)if(!o.hidden&&storyAnimals.has(o.word)&&!hotspots.has(o.id))hotspots.set(o.id,{id:o.word,label:'听声音，选择这个动物'});
 const entity=(o,asset,z,extra='')=>{
  const choice=hotspots.get(o.id),action=!solved&&choice?'story-choice':!solved&&interaction?.type==='deliver'&&o.id===interaction.receiver?'story-receiver':'';
  const tag=action?'button':'div';
  return `<${tag} class="scene-entity ${extra} ${o.pose?'pose-'+esc(o.pose):''} ${action?'scene-hotspot':''}" data-object="${esc(o.id)}" data-word="${esc(o.word)}" ${action?`data-action="${action}" data-id="${esc(choice?.id||o.id)}" aria-label="${esc(choice?.label||'把选好的物品送到这里')}"`:''} style="--x:${bounded(o.x,0,100)}%;--y:${bounded(o.y,0,100)}%;--size:${bounded(o.size||24,4,100)}%;--turn:${Number(o.rotate)||0}deg;z-index:${z};${o.color?`--object-color:var(--${esc(o.color)},${esc(o.color)})`:''}"><span class="scene-visual">${o.unit?unitBlock:o.word==='ball'&&o.color?'<svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="78" fill="'+({red:'#d97b62',blue:'#6e9db5',yellow:'#e3bc5b',green:'#7e9c70'}[o.color]||'#d97b62')+'" stroke="#664f3f" stroke-width="6"/><path d="M62 66q70 33 116 103M55 166q62-51 127-94" fill="none" stroke="#fff8" stroke-width="8"/></svg>':picture(asset)}${o.color?`<span class="object-color-dot" aria-hidden="true"></span>`:''}</span></${tag}>`;
 };
 return `<div class="adventure-scene ${esc(scene.setting||'playroom')} ${esc(scene.layout||'')}" aria-label="故事场景"><div class="scene-sky"></div><div class="scene-ground"></div>${scene.layout==='animal-stage'?'<div class="cast-distant-path" aria-hidden="true"></div>':''}${(scene.decorations||[]).map(o=>entity({...o,word:o.asset},o.asset,Number(o.z)||1,'scene-decoration')).join('')}${objects.filter(o=>!o.hidden).map(o=>{
  const z=Number(o.z)||3;
  if(o.word==='box'||o.word==='basket')return entity(o,'scene-'+o.word+'-back',z,'container-back')+entity(o,'scene-'+o.word+'-front',z+2,'container-front')+(o.word==='box'?entity(o,o.open?'scene-box-open-lid':'scene-box-lid',o.open?z+0.5:z+3,'container-lid'):'');
  return entity(o,o.word==='door'&&o.open?'scene-door-open':o.word,z);
 }).join('')}</div>`;
}

class Sequence{
 constructor({player,onChange=()=>{}}){this.player=player;this.onChange=onChange;this.epoch=0;this.timer=null;this.wake=null;}
 delay(ms){return new Promise(resolve=>{this.wake=resolve;this.timer=setTimeout(()=>{this.timer=null;this.wake=null;resolve();},ms);});}
 cancel(){this.epoch++;clearTimeout(this.timer);this.timer=null;this.wake?.();this.wake=null;this.player.stop();}
}
export class WordSequence extends Sequence{
 constructor(options){super(options);this.state={cursor:0,phase:'idle',wordId:null,repeat:0};}
 load(ids,words,cursor=0){this.cancel();this.words=words;this.items=ids.flatMap(id=>[0,1,2,3].map(n=>({wordId:id,audio:n===3?words.get(id).phraseAudio:words.get(id).audio,repeat:n+1,phrase:n===3})));this.state={cursor:bounded(cursor,0,this.items.length),phase:'idle',wordId:null,repeat:0};}
 snapshot(){return {cursor:this.state.cursor};}
 pause(){this.cancel();this.state.phase=this.state.phase==='complete'?'complete':'paused';this.state.wordId=null;this.onChange(this.state);}
 async play(restart=false){
  this.cancel();const epoch=this.epoch;if(restart||this.state.cursor>=this.items.length)this.state.cursor=0;
  this.state.phase='playing';this.onChange(this.state);
  while(epoch===this.epoch&&this.state.cursor<this.items.length){
   const item=this.items[this.state.cursor];this.state.wordId=null;this.onChange(this.state);
   const played=await this.player.play(item.audio,null,()=>{if(epoch!==this.epoch)return;Object.assign(this.state,item);this.onChange(this.state);});
   if(epoch!==this.epoch)return;
   if(!played){this.state.phase=this.player.lastError==='NotAllowedError'?'blocked':'paused';this.state.wordId=null;this.onChange(this.state);return;}
   this.state.cursor++;this.onChange(this.state);await this.delay(item.phrase?900:450);
  }
  if(epoch===this.epoch){this.state.phase='complete';this.state.wordId=null;this.onChange(this.state);}
 }
}

export class StorySequence extends Sequence{
 constructor(options){super(options);this.onFocus=options.onFocus||(()=>{});this.state={frame:0,line:0,solved:{},selected:null,phase:'paused'};}
 cancel(){super.cancel();this.onFocus?.([]);}
 load(lesson,saved={}){this.cancel();this.lesson=lesson;this.state={frame:bounded(saved.frame,0,5),line:saved.speechRevision==='2.0.1'?bounded(saved.line,0,32):0,solved:{...saved.solved},selected:null,phase:'paused'};}
 snapshot(){const {frame,line,solved}=this.state;return {frame,line,solved:{...solved},speechRevision:'2.0.1'};}
 async playPart(part){const epoch=this.epoch;const okay=await this.player.play(part.audio,null,()=>{if(epoch===this.epoch)this.onFocus(part.focusWords||[]);});if(epoch===this.epoch)this.onFocus([]);return okay;}
 current(){return this.lesson.frames[this.state.frame];}
 pause(){this.cancel();this.state.phase='paused';this.onChange(this.state);}
 view(){const f=this.current(),done=this.state.solved[f.id];return {frame:f,scene:done&&f.interaction?.success.scene||f.scene,done};}
 async play(restart=false){
  this.cancel();if(restart){this.state.frame=0;this.state.line=0;this.state.solved={};}
  const epoch=this.epoch;this.state.phase='playing';this.onChange(this.state);
  while(epoch===this.epoch){
   const f=this.current(),done=this.state.solved[f.id];
   const lines=[...(f.narrationParts||[{audio:f.narrationAudio}]),...(f.englishParts||[{audio:f.audio}]),...(!done&&f.interaction&&f.interaction.prompt!==f.narration?(f.interaction.promptParts||[{audio:f.interaction.promptAudio}]):[])];
   for(;this.state.line<lines.length;this.state.line++){
    const part=lines[this.state.line];if(!part.audio)continue;
    const okay=await this.playPart(part);if(epoch!==this.epoch)return;
    if(!okay){this.state.phase=this.player.lastError==='NotAllowedError'?'blocked':'paused';this.onChange(this.state);return;}
   }
   if(f.interaction&&!done){this.state.phase='waiting';this.onChange(this.state);return;}
   if(this.state.frame===5){this.state.phase='complete';this.onChange(this.state);return;}
   await this.delay(600);if(epoch!==this.epoch)return;this.state.frame++;this.state.line=0;this.state.selected=null;this.onChange(this.state);
  }
 }
 async move(delta){this.pause();this.state.frame=bounded(this.state.frame+delta,0,5);this.state.line=0;this.state.selected=null;await this.play();}
 async choose(id,receiver=false){
  const f=this.current(),task=f.interaction;if(!task||this.state.solved[f.id]||this.state.phase==='feedback')return;
  this.cancel();const epoch=this.epoch;
  if(task.type==='deliver'&&!receiver){this.state.selected=id;this.state.phase='waiting';this.onChange(this.state);return;}
  const selected=receiver?this.state.selected:id;if(!selected){this.state.phase='waiting';this.onChange(this.state);return;}
  if(selected!==task.target){this.state.phase='feedback';this.onChange(this.state);await this.player.play(task.retry.audio);if(epoch!==this.epoch)return;this.state.phase='waiting';this.onChange(this.state);for(const part of task.promptParts||[{audio:task.promptAudio}]){await this.playPart(part);if(epoch!==this.epoch)return;}return;}
  this.state.solved[f.id]=true;this.state.selected=null;this.state.phase='feedback';this.onChange(this.state);
  for(const part of [...(task.success.parts||[{audio:task.success.audio}]),...(task.success.englishParts||[{audio:task.success.englishAudio}])]){if(part.audio&&!await this.playPart(part))return;if(epoch!==this.epoch)return;}
  if(epoch!==this.epoch)return;await this.delay(600);if(epoch!==this.epoch)return;
  this.state.frame=Math.min(5,this.state.frame+1);this.state.line=0;await this.play();
 }
}

export function storyView(controller){
 const state=controller.state,{frame:f,scene,done}=controller.view(),task=f.interaction;
 const labels=['约定目标','出现小问题','第一次帮忙','情况变化','第二次帮忙','问题解决'];
 const choices=task&&((controller.lesson.number+state.frame)%2?[...task.choices].reverse():task.choices);
 const direct=usesSceneAnimalChoices(scene,task);
 return `<div class="story-chapter"><span>第 ${state.frame+1} / 6 幕</span><span>${labels[state.frame]}</span></div>${sceneHTML(scene,task,done)}<p class="story-text">${esc(f.text)}</p><p class="story-caption">${esc(f.narration||f.caption)}</p>${task?`<section class="story-task ${done?'task-solved':''}" aria-label="帮帮小熊猫"><p>${esc(done?task.success.text:task.prompt)}</p>${!done?`${direct?'<p class="scene-tap-help">直接点故事里的小动物，就能帮上忙。</p>':`<div class="story-options">${choices.map(c=>`<button class="story-option ${state.selected===c.id?'selected':''}" data-action="story-choice" data-id="${esc(c.id)}" ${state.phase==='feedback'?'disabled':''}>${c.count?countPicture(c.item,c.count):picture(c.word)}<span>${esc(c.label)}</span></button>`).join('')}</div>`}${task.type==='deliver'?`<button class="primary story-receiver" data-action="story-receiver" ${!state.selected?'disabled':''}>${picture('mascot')}送给小熊猫</button>`:''}`:'<span class="task-check">✓ 我们一起帮上忙啦</span>'}</section>`:''}<div class="story-controls"><button class="secondary" data-action="story-prev" aria-label="上一幕" ${state.frame===0?'disabled':''}>←</button><button class="audio-button" data-action="story-play">${state.phase==='playing'?'暂停故事':state.phase==='blocked'?'开始听故事':'继续故事'}</button><button class="text-button" data-action="story-restart">从头重播</button><div class="frame-dots" aria-label="第${state.frame+1}幕，共6幕">${controller.lesson.frames.map((_,i)=>`<span class="${i===state.frame?'active':''}"></span>`).join('')}</div><button class="secondary" data-action="story-next" aria-label="下一幕" ${state.frame===5?'disabled':''}>→</button></div>`;
}

export const numbers=['one','two','three','four','five','six','seven','eight'];
export function missionFor(question,lesson,index){
 const tangible=['ball','car','teddy','blocks','apple','banana','milk','water','bread','egg','orange','rice','hat','shoes','shirt','pants','dress','socks','coat','skirt','book','lamp','box','basket'];
 const mode=index%2===0?'listen':lesson.week===9&&['in','on','under','behind','near','far'].includes(question.target)?'position':lesson.week===11&&numbers.includes(question.target)?'count':lesson.week===2&&['red','blue','yellow','green'].includes(question.target)?'color':[2,3,6,7,8,12].includes(lesson.week)&&tangible.includes(question.target)?'deliver':'listen';
 const n=numbers.indexOf(question.target)+1;
 const positions=['in','on','under','behind','near','far'],colors=['red','blue','yellow','green'];
 const choices=mode==='count'?numbers.slice(Math.max(0,n-2),Math.min(8,n+1)).filter(w=>lesson.knownWords.includes(w)):mode==='color'?colors.filter(w=>lesson.knownWords.includes(w)):mode==='position'?[question.target,...positions.filter(w=>w!==question.target&&lesson.knownWords.includes(w)).slice(0,2)]:question.choices;
 return {...question,mode,choices:choices.includes(question.target)?choices:[...choices,question.target]};
}
export function missionHTML(q,words,{selected=null,done=false}={}){
 const names={listen:'听声音，找到图片',deliver:'选好物品，再送给小熊猫',position:'听位置提示，选对藏身处',color:'帮故事里的球配上颜色',count:'按声音准备对应数量'};
 const ball=id=>`<svg viewBox="0 0 120 120" role="img" aria-label="${esc(words.get(id)?.zh)}的球"><circle cx="60" cy="60" r="43" fill="${({red:'#d97b62',blue:'#6e9db5',yellow:'#e3bc5b',green:'#7e9c70'})[id]}" stroke="#5a634d" stroke-width="3"/><path d="M28 35q43 20 64 49M25 80q33-23 69-47" fill="none" stroke="#fff8" stroke-width="5"/></svg>`;
 const phrase=words.get(q.target)?.phrase||'',item=/blocks/i.test(phrase)?'blocks':/eggs/i.test(phrase)?'egg':/balls/i.test(phrase)?'ball':'apple';
 const count=id=>countPicture(item,numbers.indexOf(id)+1);
 return `<div class="mission-label">${names[q.mode]}</div><div class="quiz-grid" data-mode="${q.mode}" data-count="${q.choices.length}">${q.choices.map(id=>`<button class="quiz-choice ${selected===id?'selected':''} ${done&&id===q.target?'right':''}" data-action="answer" data-id="${id}" aria-label="${esc(words.get(id)?.zh)}" ${done?'disabled':''}>${q.mode==='color'?ball(id):q.mode==='count'?count(id):picture(id)}</button>`).join('')}</div>${q.mode==='deliver'?`<button class="mission-receiver ${done?'received':''}" data-action="deliver-answer" ${!selected||done?'disabled':''}>${done?picture(q.target,'delivered-item'):''}${picture('mascot')}<span>${done?'送到了！':'送给小熊猫'}</span></button>`:''}${done&&q.mode!=='deliver'?'<div class="mission-result">✓ 帮上忙啦！</div>':''}`;
}
