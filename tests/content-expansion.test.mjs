import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('dist/curriculum.json',root),'utf8'));
const requests=JSON.parse(await readFile(new URL('scripts/audio-requests.json',root),'utf8'));
const words=new Map(data.vocabulary.map(word=>[word.id,word]));
const expected=[
 ['head','hand','eye','ear','nose','mouth','arm','leg'],
 ['hat','shoes','shirt','pants','dress','socks','coat','skirt'],
 ['mom','dad','sister','brother','grandma','grandpa','baby','family'],
 ['bed','chair','table','door','window','sofa','lamp','book']
];

test('weeks 5–8 each provide four two-word lessons and one complete weekly review',()=>{
 assert.equal(data.lessons.length,60);
 assert.equal(data.vocabulary.length,96);
 assert.equal(data.weeks.length,12);
 for(let offset=0;offset<4;offset++){
  const week=offset+5,lessons=data.lessons.filter(lesson=>lesson.week===week);
  assert.equal(lessons.length,5);
  assert.deepEqual(lessons.slice(0,4).flatMap(lesson=>lesson.newWords),expected[offset]);
  assert.deepEqual(lessons[4].words,expected[offset]);
  assert(lessons[4].review);
  for(const lesson of lessons){
   assert.equal(lesson.id,`w${week}-d${lesson.day}`);
   assert.equal(lesson.number,(week-1)*5+lesson.day);
   assert.deepEqual(lesson.warmupWords,lesson.words);
   assert.equal(lesson.frames.length,6);
   assert(lesson.intro.includes('月饼'));
   for(const letter of lesson.letters){
    assert(lesson.words.includes(letter.word));
    assert.equal(letter.letter,letter.word[0].toUpperCase());
   }
  }
 }
});

test('plural garments and safe body language remain consistent across phrases and stories',()=>{
 for(const id of ['shoes','pants','socks']){
  assert.equal(words.get(id).phrase,`These are my ${id}.`);
  const lesson=data.lessons.find(lesson=>lesson.newWords.includes(id));
  for(const frame of lesson.frames.filter(frame=>frame.word===id)){
   assert(!/^This is|\b[Aa] (shoes|pants|socks)\b/.test(frame.text),frame.text);
  }
 }
 for(const request of requests.filter(request=>request.lang==='en')){
  assert(!/touch your (eye|ear)/i.test(request.text),request.text);
 }
});

test('new illustrations exist, have accessible titles, and are all distinct',async()=>{
 const hashes=new Set();
 for(const id of expected.flat()){
  const svg=await readFile(new URL(`dist/assets/${id}.svg`,root),'utf8');
  assert.match(svg,/<svg[^>]+viewBox="0 0 240 240"/);
  assert.match(svg,/<title id="title">.+<\/title>/);
  hashes.add(createHash('sha256').update(svg).digest('hex'));
 }
 assert.equal(hashes.size,32);
});

test('new Chinese voice namespace changes IDs while English IDs keep their stable text hashes',()=>{
 for(const request of requests){
  const seed=request.lang==='zh'?'natural-v1:'+request.text:request.text;
  assert.equal(request.id,request.lang+'-'+createHash('sha1').update(seed).digest('hex').slice(0,12));
 }
 assert.equal(data.audio.chinese.voice,'zh-CN-XiaoxiaoNeural');
 assert.equal(data.audio.chinese.runtimeOnline,false);
 assert(data.roadmap.find(item=>item.weeks==='05—06').available);
 assert(data.roadmap.find(item=>item.weeks==='07—08').available);
 assert(data.roadmap.every(item=>item.available));
});
