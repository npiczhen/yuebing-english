import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('dist/curriculum.json',root),'utf8'));
const requests=JSON.parse(await readFile(new URL('scripts/audio-requests.json',root),'utf8'));
const audio=new Map(requests.map(request=>[request.id,request]));
const vocabulary=new Map(data.vocabulary.map(word=>[word.id,word]));
const focus=[
 ['box','basket','in','on','under','behind','near','far'],
 ['sunny','rainy','cloudy','windy','hot','cold','snowy','rainbow'],
 ['one','two','three','four','five','six','seven','eight'],
 ['happy','sad','hungry','thirsty','big','small','fast','slow']
];

test('complete route introduces 96 unique words in 48 lessons and 12 weekly reviews',()=>{
 assert.equal(data.version,'2.0.1');assert.equal(data.weeks.length,12);assert.equal(data.lessons.length,60);assert.equal(data.vocabulary.length,96);assert.equal(data.lessons.filter(l=>l.review).length,12);
 const introduced=data.lessons.flatMap(l=>l.newWords);assert.equal(introduced.length,96);assert.equal(new Set(introduced).size,96);
 for(const lesson of data.lessons)assert.equal(lesson.newWords.length,lesson.review?0:2);assert(data.roadmap.every(s=>s.available));
});

test('weeks 9–12 have explicit weekly focus and the intended daily pairs',()=>{
 for(let offset=0;offset<4;offset++){
  const number=9+offset,week=data.weeks.find(week=>week.number===number);
  const lessons=data.lessons.filter(lesson=>lesson.week===number);
  assert.deepEqual(week.focusWords,focus[offset]);
  assert.deepEqual(lessons.slice(0,4).flatMap(lesson=>lesson.words),focus[offset]);
  assert.deepEqual(lessons[4].words,focus[offset]);
  assert.equal(lessons[4].words.length,8);
  for(const lesson of lessons){
   assert.equal(lesson.number,(number-1)*5+lesson.day);
   assert.equal(lesson.id,`w${number}-d${lesson.day}`);
   assert.deepEqual(lesson.warmupWords,lesson.words);
   for(const frame of lesson.frames){
    assert(lesson.knownWords.includes(frame.word));
    assert.equal(audio.get(frame.audio).text,frame.text);
   }
  }
 }
});

test('position and weather listening questions match the pictured relation or weather',()=>{
 const questions={in:'In the box.',on:'On the box.',under:'Under the table.',behind:'Behind the box.',near:'Near the box.',far:'Far from the box.',sunny:'Sunny!',rainy:'Rainy!',cloudy:'Cloudy!',windy:'Windy!',hot:'Hot!',cold:'Cold!',snowy:'Snowy!',rainbow:'Rainbow!'};
 for(const [id,question] of Object.entries(questions)){
  const word=vocabulary.get(id);
  assert.equal(audio.get(word.questionAudio).text,question);
 }
 assert.equal(vocabulary.get('under').phrase,'Under the table.');
 assert.equal(vocabulary.get('behind').phrase,'Behind the box.');
 assert.equal(vocabulary.get('far').phrase,'Far from the box.');
 assert.equal(vocabulary.get('rainbow').phrase,'Look! A rainbow.');
});

test('new final topics use meaningful phrases rather than a repeated four-line lesson',()=>{
 for(const lesson of data.lessons.filter(l=>l.week>=11)){assert.equal(lesson.frames.length,6);assert.equal(lesson.frames.filter(f=>f.interaction).length,2);assert(lesson.newWords.every(w=>focus[lesson.week-9].includes(w)));}
 for(const id of focus[2])assert.match(vocabulary.get(id).phrase,/apple|ball|egg|blocks/);
});

test('six companion interactions have two illustrated choices and complete spoken replies',async()=>{
 assert.equal(data.interactions.length,6);
 assert.equal(new Set(data.interactions.map(interaction=>interaction.id)).size,6);
 for(const interaction of data.interactions){
  assert(interaction.title&&interaction.text);
  assert.equal(audio.get(interaction.audio).text,interaction.text);
  assert.equal(interaction.choices.length,2);
  assert.equal(new Set(interaction.choices.map(choice=>choice.id)).size,2);
  for(const choice of interaction.choices){
   assert(choice.label&&choice.reply);
   assert.equal(audio.get(choice.replyAudio).text,choice.reply);
   assert.equal(audio.get(choice.replyAudio).lang,'zh');
   assert(!('correct' in choice));
   assert.match(choice.image,/^assets\/[a-z-]+\.svg$/);
   await access(new URL('dist/'+choice.image,root));
  }
 }
 assert(data.promptVariants.rest.length>=3);
 assert.deepEqual(data.prompts.rest,data.promptVariants.rest[0]);
 for(const cue of data.promptVariants.rest)assert.equal(audio.get(cue.audio).text,cue.text);
});

test('all 16 final illustrations exist and remain distinct accessible SVGs',async()=>{
 const hashes=new Set();
 for(const id of [...focus[0],...focus[1]]){
  const svg=await readFile(new URL(`dist/assets/${id}.svg`,root),'utf8');
  assert.match(svg,/<svg[^>]+viewBox="0 0 240 240"/);
  assert.match(svg,/<title id="title">.+<\/title>/);
  hashes.add(createHash('sha256').update(svg).digest('hex'));
 }
 assert.equal(hashes.size,16);
});
