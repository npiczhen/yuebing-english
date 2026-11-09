import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {actorMentions} from '../scripts/story-stage.mjs';
import {StorySequence,storyView} from '../dist/adventure.js';
const data=JSON.parse(await readFile(new URL('../dist/curriculum.json',import.meta.url)));
const actors=new Set(['cat','dog','bird','fish','bear','rabbit','duck','frog','mascot','mom','dad','sister','brother','grandma','grandpa','baby','family']);
const clips=new Map(JSON.parse(await readFile(new URL('../scripts/audio-requests.json',import.meta.url))).map(r=>[r.id,r]));
test('Chinese names distinguish red panda, bear, cat and teddy',()=>{
 assert.deepEqual(actorMentions('小熊猫向月饼挥手。','zh'),['mascot']);
 assert.deepEqual(actorMentions('请小熊出来，小猫在旁边。','zh'),['bear','cat']);
 assert.deepEqual(actorMentions('玩具熊和小熊一起坐好。','zh'),['teddy','bear']);
 assert.deepEqual(actorMentions('A bear. A teddy. A cat.','en'),['cat','bear','teddy']);
});
test('first-week friends enter when introduced and each animal appears once in the final party',()=>{
 const l=data.lessons.find(l=>l.id==='w1-d1');assert(l.frames[0].scene.objects.find(o=>o.word==='dog').hidden);
 assert(!l.frames[3].scene.objects.find(o=>o.word==='dog').hidden);
 const party=data.lessons.find(l=>l.id==='w1-d5').frames[5].scene;
 for(const word of ['cat','dog','bird','fish','bear','rabbit','duck','frog'])assert.equal(party.objects.filter(o=>o.word===word&&!o.hidden).length,1,word);
});
test('480 scenes keep all animal and portrait bounds inside the scene without substantial actor overlap',()=>{
 let checked=0;
 for(const l of data.lessons)for(const f of l.frames)for(const scene of [f.scene,f.interaction?.success.scene].filter(Boolean)){
  checked++;const visible=scene.objects.filter(o=>!o.hidden&&actors.has(o.word));
  for(const o of visible){assert(o.x-o.size/2>=0&&o.x+o.size/2<=100,`${l.id} ${f.id} ${o.word}: clipped`);}
  for(const ratio of scene.layout==='animal-stage'?[1.65]:[2.05,1.65,1.35])for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
   const a=visible[i],b=visible[j];if(a.word==='mascot'&&b.word==='mascot')continue;
   const w=Math.max(0,Math.min(a.x+a.size/2,b.x+b.size/2)-Math.max(a.x-a.size/2,b.x-b.size/2)),h=Math.max(0,Math.min(a.y+a.size*ratio/2,b.y+b.size*ratio/2)-Math.max(a.y-a.size*ratio/2,b.y-b.size*ratio/2));
   assert(w*h/Math.min(a.size*a.size*ratio,b.size*b.size*ratio)<.4,`${l.id} ${f.id}: ${a.word} covers ${b.word}`);
  }
 }
 assert.equal(checked,480);
});
test('speech turns retain narration and English text and reference the exact prerecorded words',()=>{
 const normalized=s=>s.replace(/\s+/g,'');
 for(const l of data.lessons)for(const f of l.frames){
  assert.equal(normalized(f.narrationParts.map(p=>p.text).join('')),normalized(f.narration));
  assert.equal(normalized(f.englishParts.map(p=>p.text).join('')),normalized(f.text));
  for(const part of [...f.narrationParts,...f.englishParts]){assert.equal(clips.get(part.audio).text,part.text);assert.deepEqual(part.focusWords,actorMentions(part.text,part.lang));}
 }
});
test('animal tasks use existing scene actors instead of duplicate picture cards',()=>{
 const lesson=data.lessons.find(l=>l.id==='w1-d3'),s=new StorySequence({player:{stop(){}}});s.load(lesson,{frame:2});
 const html=storyView(s);assert(html.includes('scene-tap-help'));assert(!html.includes('class="story-options"'));assert(html.includes('data-action="story-choice" data-id="bear"'));
});
test('actor cues start with actual playback, clear between turns and clear when paused',async()=>{
 const seen=[],player={stop(){},async play(id,el,onStart){onStart?.();return true;}};
 const s=new StorySequence({player,onFocus:words=>seen.push([...words])});s.delay=async()=>{};
 const l=data.lessons.find(l=>l.id==='w1-d5');s.load(l,{frame:3});await s.play();
 assert(seen.some(w=>w.length===1&&w[0]==='bear'));assert(seen.some(w=>w.length===1&&w[0]==='bird'));s.pause();assert.deepEqual(seen.at(-1),[]);
});
test('existing frame and task progress survives the new speech queue revision',()=>{
 const s=new StorySequence({player:{stop(){}}});s.load(data.lessons[0],{frame:4,line:2,solved:{'w1-d1-f3':true}});
 assert.equal(s.state.frame,4);assert.equal(s.state.line,0);assert(s.state.solved['w1-d1-f3']);const saved=s.snapshot();saved.line=4;s.load(data.lessons[0],saved);assert.equal(s.state.line,4);
});
