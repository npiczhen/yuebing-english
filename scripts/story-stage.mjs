// Explicit stage positions and short speech turns keep each friend identifiable.
export const ANIMALS=['cat','dog','bird','fish','bear','rabbit','duck','frog'];
const CAST=new Set([...ANIMALS,'mascot','teddy','mom','dad','sister','brother','grandma','grandpa','baby','family']);
const chineseActors={小熊猫:'mascot',玩具熊:'teddy',小猫:'cat',小狗:'dog',小鸟:'bird',小鱼:'fish',小熊:'bear',小兔:'rabbit',小鸭:'duck',青蛙:'frog',妈妈:'mom',爸爸:'dad',小宝宝:'baby',宝宝:'baby',奶奶:'grandma',外婆:'grandma',爷爷:'grandpa',外公:'grandpa',姐妹:'sister',兄弟:'brother',家人:'family'};
const actorPattern=new RegExp(Object.keys(chineseActors).join('|'),'g');
export function actorMentions(text,lang){
 if(lang==='zh')return [...new Set([...text.matchAll(actorPattern)].map(m=>chineseActors[m[0]]))];
 const names=[...CAST].filter(word=>word!=='mascot'&&new RegExp('\\b'+word+'s?\\b','i').test(text));
 if(/\bI[’']m\b|\bI can\b|red panda/i.test(text))names.push('mascot');
 return [...new Set(names)];
}
function narrationChunks(text){
 const raw=text.match(/[^，。！？；]+[，。！？；]?/g)||[text],chunks=[];
 for(let i=0;i<raw.length;i++){
  let chunk=raw[i];
  if(chunk.replace(/[，。！？；]/g,'').length<=4&&!actorMentions(chunk,'zh').length&&i+1<raw.length)chunk+=raw[++i];
  chunks.push(chunk);
 }
 return chunks;
}
function englishChunks(text){return text.match(/(?:Look!\s*)?[^.!?]+[.!?]?/gi)?.map(s=>s.trim()).filter(Boolean)||[text];}
function turns(text,lang,say){
 const mentioned=actorMentions(text,lang);
 const chunks=mentioned.length?(lang==='zh'?narrationChunks(text):englishChunks(text)):[text];
 return chunks.map(text=>({text,lang,audio:say(text,lang),focusWords:actorMentions(text,lang)}));
}
function uniqueActors(scene){
 const seen=new Set();
 scene.objects=scene.objects.filter(o=>{
  if(!CAST.has(o.word)||o.id==='reflection')return true;
  const key=o.word+':'+(o.role||'actor');if(seen.has(key))return false;seen.add(key);return true;
 });
}
function firstMentions(lesson){
 const starts=new Map();
 for(const [i,f]of lesson.frames.entries()){
  for(const word of [...actorMentions(f.narration,'zh'),...actorMentions(f.text,'en')])if(!starts.has(word))starts.set(word,i);
  const q=f.interaction;if(q){const c=q.choices.find(c=>c.id===q.target);if(c&&CAST.has(c.word)&&!starts.has(c.word))starts.set(c.word,i);}
 }
 return starts;
}
function animalStage(lesson,frameIndex,scene,completed,starts){
 scene.layout='animal-stage';
 const first=scene.objects.find(o=>o.id==='first'),second=scene.objects.find(o=>o.id==='second'),panda=scene.objects.find(o=>o.id==='panda');
 if(!first||!second||!panda)return;
 Object.assign(panda,{x:12,y:70,size:23,z:5});
 const firstDone=frameIndex>=3||completed,secondDone=frameIndex===5||completed&&frameIndex>=3;
 for(const [i,o]of [first,second].entries()){
  const done=i?secondDone:firstDone;
  Object.assign(o,{x:i?80:50,y:done?70:66,size:i?20:22,z:done?6:3,role:'story-actor'});
  const bush=scene.decorations?.find(d=>d.id==='bush-'+i);if(bush)Object.assign(bush,{x:o.x,y:done?55:80,size:done?22:i?25:27,z:done?1:4});
 }
 const extras=scene.objects.filter(o=>ANIMALS.includes(o.word)&&o!==first&&o!==second);
 const ground=extras.filter(o=>!['bird','fish'].includes(o.word));
 for(const [i,o]of ground.entries())Object.assign(o,{x:[30,49,68,87][i]??30,y:26,size:12,z:2,role:'recall-actor'});
 for(const o of extras){
  if(o.word==='bird')Object.assign(o,{x:12,y:26,size:12,z:2,role:'recall-actor'});
  if(o.word==='fish')Object.assign(o,{x:30,y:84,size:10,z:2,role:'recall-actor'});
 }
 // Bird/fish have distinct sky and pond positions; land friends stay clear.
 if(lesson.id==='w1-d2'){
  Object.assign(first,{x:64,y:24,size:20,z:6});Object.assign(second,{x:78,y:73,size:19,z:3});
  for(const [i,o]of ground.entries())Object.assign(o,{x:35+i*20,y:81,size:13});
  const pond=scene.decorations?.find(d=>d.id==='pond');if(pond)Object.assign(pond,{x:78,y:78,size:35});
 }
 if(extras.some(o=>o.word==='fish')){
  const pond=scene.decorations?.find(d=>d.id==='recall-pond');
  if(!pond)(scene.decorations??=[]).push({id:'recall-pond',asset:'scene-pond',x:30,y:87,size:19,z:0});
 }
 for(const o of scene.objects)if(ANIMALS.includes(o.word)){
  // One stable slot per animal. Future friends wait until they are introduced.
  const introduced=frameIndex===5&&lesson.review||((starts.get(o.word)??99)<=frameIndex);
  o.hidden=!introduced;o.introducedAt=starts.get(o.word)??5;
 }
}
function albumStage(scene){
 const first=scene.objects.find(o=>o.id==='first'),second=scene.objects.find(o=>o.id==='second');
 if(!first||!second)return;
 Object.assign(first,{x:49,y:64,size:22});Object.assign(second,{x:79,y:64,size:22});
 const extras=scene.objects.filter(o=>o.id.startsWith('recall')||o.id.startsWith('review'));
 for(const [i,o]of extras.entries())Object.assign(o,{x:9+i*16.4,y:24,size:11});
 for(const d of scene.decorations||[]){
  const o=d.id==='photo-first'?first:d.id==='photo-second'?second:d.id.startsWith('small-photo-')?extras[Number(d.id.slice(12))]:null;
  if(o)Object.assign(d,{x:o.x,y:o.y,size:d.id.startsWith('small-photo')?14:27});
 }
}
function arrangeScene(lesson,frameIndex,scene,completed,starts){
 uniqueActors(scene);
 if(lesson.week===1){animalStage(lesson,frameIndex,scene,completed,starts);return;}
 if(lesson.week===7){albumStage(scene);return;}
 const helpers=scene.objects.filter(o=>(o.id.startsWith('recall')||o.id.startsWith('review'))&&ANIMALS.includes(o.word));
 for(const [i,o]of helpers.entries()){
  const lookingAtWindow=lesson.id==='w8-d3'&&frameIndex===2&&completed&&o.word==='cat';
  if(lookingAtWindow){const panda=scene.objects.find(o=>o.id==='panda');if(panda)Object.assign(panda,{x:22,size:24});continue;}
  Object.assign(o,{x:12+i*20,y:18,size:12,z:2,role:'recall-actor'});
  if((starts.get(o.word)??99)>frameIndex)o.hidden=true;
 }
}
export function arrangeStoryStages(lessons,say){
 for(const lesson of lessons){
  const starts=firstMentions(lesson);
  for(const [i,f]of lesson.frames.entries()){
   arrangeScene(lesson,i,f.scene,false,starts);
   f.narrationParts=turns(f.narration,'zh',say);f.englishParts=turns(f.text,'en',say);
   if(f.interaction){
    const q=f.interaction;arrangeScene(lesson,i,q.success.scene,true,starts);
    q.promptParts=q.prompt===f.narration?f.narrationParts:turns(q.prompt,'zh',say);
    q.success.parts=turns(q.success.text,'zh',say);
    if(q.success.english)q.success.englishParts=turns(q.success.english,'en',say);
   }
  }
 }
 return lessons;
}
