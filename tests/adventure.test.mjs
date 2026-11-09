import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WordSequence,StorySequence,missionFor,missionHTML} from '../dist/adventure.js';
import {sanitizeProgress,nextLesson,isLessonComplete,quizFor} from '../dist/core.js';
const data=JSON.parse(await readFile(new URL('../dist/curriculum.json',import.meta.url)));
const baseline=JSON.parse(await readFile(new URL('./fixtures/course-foundation-1.3.json',import.meta.url)));
const words=new Map(data.vocabulary.map(w=>[w.id,w]));
test('first twenty course foundations and every original core English line survive expansion',()=>{
 for(const old of baseline.lessons.slice(0,20)){
  const lesson=data.lessons.find(l=>l.id===old.id);
  for(const key of ['title','week','day','theme','words','newWords','intro','task'])assert.deepEqual(lesson[key],old[key],`${old.id}: ${key}`);
  for(const frame of old.frames)assert(lesson.frames.some(f=>f.text.includes(frame.text)),`${old.id}: ${frame.text}`);
 }
 assert.deepEqual(data.vocabulary.slice(0,80),baseline.vocabulary);
});
test('all story plots are distinct, have two consequential tasks and use taught options',()=>{
 const plots=new Set(),prior=new Set();
 for(const l of data.lessons){
  assert.equal(l.frames.length,6);assert.deepEqual(l.frames.map(f=>f.role),['goal','problem','help','change','help','resolution']);
  const plot=l.frames.map(f=>f.narration).join('|');assert(!plots.has(plot),l.id);plots.add(plot);
  assert(l.recallWords.length<=4);assert(l.recallWords.every(w=>prior.has(w)),l.id);
  if(prior.size>=4)assert(l.recallWords.length>=2,l.id);
  assert.deepEqual(l.frames.flatMap((f,i)=>f.interaction?[i]:[]),[2,4]);
  for(const f of l.frames){
   for(const o of f.scene.objects)assert(o.word==='mascot'||words.has(o.word),`${l.id} ${o.word}`);
   if(!f.interaction)continue;const q=f.interaction;assert(q.choices.some(c=>c.id===q.target));assert(q.choices.every(c=>l.knownWords.includes(c.word)));assert.notDeepEqual(q.success.scene,f.scene,`${l.id}: operation has no visible result`);
   if(q.type==='deliver')assert(f.scene.objects.some(o=>o.id===q.receiver),`${l.id}: missing receiver`);
  }
  l.newWords.forEach(w=>prior.add(w));
 }
});
test('hide-and-seek uses actual box layering and targets inside for both helps',()=>{
 const l=data.lessons.find(l=>l.id==='w9-d2');assert.equal(l.frames[1].text,'I’m in the box.');assert.equal(l.frames[3].text,'The cat is on the box.');
 for(const i of [2,4])assert.equal(l.frames[i].interaction.target,'in');
 const scene=l.frames[1].scene,box=scene.objects.find(o=>o.word==='box'),panda=scene.objects.find(o=>o.word==='mascot');assert.equal(box.x,panda.x);assert(panda.z>box.z&&panda.z<box.z+2);assert(!box.open);
 assert(l.frames[2].interaction.success.scene.objects.find(o=>o.word==='box').open);
});
test('old finished weeks retain stickers but do not falsely complete new week 11 goals',()=>{
 const old={schema:1,completed:data.lessons.map(l=>l.id),currentLesson:'w12-d5',sessions:{},metPanda:true};const p=sanitizeProgress(old,data.lessons);
 assert.equal(p.completed.length,60);assert.equal(nextLesson(data.lessons,p).id,'w11-d1');assert(isLessonComplete(data.lessons[49],p));assert(!isLessonComplete(data.lessons[50],p));p.revisedCompleted.push('w11-d1');assert.equal(nextLesson(data.lessons,p).id,'w11-d2');
});
test('cycling speaking cards restores the recorded word after reloading',()=>{
 const p=sanitizeProgress({schema:1,completed:[],sessions:{'w1-d2':{step:4,seconds:2,contentRevision:'2.0.0',speakingIndex:2}},currentLesson:'w1-d2'},data.lessons);
 const lesson=data.lessons.find(l=>l.id==='w1-d2');assert.equal(lesson.words[p.sessions['w1-d2'].speakingIndex],'bird');
});
test('word queue speaks each word exactly three times and its phrase once, with actual-start notification',async()=>{
 const heard=[],started=[];const player={stop(){},async play(id,el,onStart){heard.push(id);onStart?.();return true;}};
 const queue=new WordSequence({player,onChange:s=>{if(s.wordId)started.push(s.wordId);}});queue.delay=async()=>{};queue.load(['box','basket'],words);await queue.play();
 assert.deepEqual(heard,['box','box','box'].map(id=>words.get(id).audio).concat(words.get('box').phraseAudio,['basket','basket','basket'].map(id=>words.get(id).audio),words.get('basket').phraseAudio));assert.equal(queue.state.phase,'complete');assert(started.includes('box')&&started.includes('basket'));
});
test('story pauses at help until an operation, then visibly resolves and reaches the second help',async()=>{
 const heard=[];const player={stop(){},async play(id){heard.push(id);return true;}};const story=new StorySequence({player});story.delay=async()=>{};story.load(data.lessons.find(l=>l.id==='w9-d2'));await story.play();assert.equal(story.state.frame,2);assert.equal(story.state.phase,'waiting');await story.choose('on');assert.equal(story.state.frame,2);assert.equal(story.state.phase,'waiting');await story.choose('in');assert.equal(story.state.frame,4);assert.equal(story.state.phase,'waiting');assert(story.state.solved['w9-d2-f3']);const restored=story.snapshot();story.load(story.lesson,restored);await story.play();assert.equal(story.state.frame,4);await story.choose('in');assert.equal(story.state.frame,5);assert.equal(story.state.phase,'complete');
});
test('quantity missions count the spoken objects, with one block per unit; old words keep picture selection',()=>{
 const l=data.lessons.find(l=>l.id==='w11-d4'),q=missionFor({target:'seven',choices:['seven','six','eight'],scope:'current'},l,1);const html=missionHTML(q,words);assert.equal(q.mode,'count');assert(html.includes('一块积木'));assert(!html.includes('assets/apple.svg'));assert.equal(missionFor({target:'car',choices:['car','ball'],scope:'review'},l,5).mode,'listen');
});
test('every generated mission retains a unique taught target and no untaught color or quantity choices',()=>{
 for(const lesson of data.lessons)for(const [i,q]of quizFor(lesson,data.vocabulary,()=>.42).entries()){
  const m=missionFor(q,lesson,i);assert.equal(m.choices.filter(w=>w===m.target).length,1);assert(m.choices.every(w=>lesson.knownWords.includes(w)),lesson.id+' '+m.choices);
  if(m.mode==='color')assert(m.choices.every(w=>['red','blue','yellow','green'].includes(w)));
 }
});
