import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),data=JSON.parse(await readFile(new URL('dist/curriculum.json',root))),requests=JSON.parse(await readFile(new URL('scripts/audio-requests.json',root))),manifest=JSON.parse(await readFile(new URL('dist/resources.json',root)));
assert.equal(data.lessons.length,60);assert.equal(data.vocabulary.length,96);assert.equal(data.weeks.length,12);assert.equal(new Set(data.lessons.map(l=>l.id)).size,60);
assert.equal(data.lessons.filter(l=>l.review).length,12);
assert.equal(manifest.coverage.weeks,12);assert.equal(manifest.coverage.lessons,60);assert.equal(manifest.coverage.words,96);assert.equal(manifest.coverage.curriculumVersion,data.version);
const ids=new Set(requests.map(r=>r.id)),audioRefs=[],packed=new Set(manifest.assets.map(a=>a.url));
const scriptsById=new Map(requests.map(r=>[r.id,r.text]));
assert(!packed.has('./index.html'),'HTML responses may be modified by the host; cache the encoded offline entry instead');
assert(packed.has('./offline-entry.json'),'missing canonical offline document');
assert(packed.has('./recorder.js'),'recording support must also work offline');
assert(packed.has('./update.js'),'missing standalone update logic');
assert(!packed.has('./update.html'),'hosting may modify recovery HTML; never hash-check it as a course asset');
await access(new URL('dist/update.html',root));
const entry=JSON.parse(await readFile(new URL('dist/offline-entry.json',root),'utf8'));
assert.equal(entry.encoding,'base64');
assert.deepEqual(Buffer.from(entry.content,'base64'),await readFile(new URL('dist/index.html',root)));
function visit(value){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){if((k==='audio'||k.endsWith('Audio'))&&typeof v==='string')audioRefs.push(v);else visit(v);}}
visit(data);
for(const id of audioRefs){assert(ids.has(id),`unknown audio ${id}`);assert(packed.has(`./assets/audio/${id}.mp3`),`audio absent from offline manifest: ${id}`);await access(new URL(`dist/assets/audio/${id}.mp3`,root));}
for(const word of data.vocabulary){assert.equal(scriptsById.get(word.audio),word.id);assert.equal(scriptsById.get(word.phraseAudio),word.phrase);assert.equal(word.image,'assets/'+word.id+'.svg');await access(new URL('dist/'+word.image,root));}
for(const lesson of data.lessons){assert.equal(lesson.frames.length,6);assert(lesson.task&&lesson.intro.includes('月饼'));assert(lesson.words.every(id=>data.vocabulary.some(w=>w.id===id)));assert.deepEqual(lesson.warmupWords,lesson.words);assert.equal(scriptsById.get(lesson.introAudio),lesson.intro);for(const letter of lesson.letters){assert(lesson.words.includes(letter.word));assert.equal(letter.letter,letter.word[0].toUpperCase());assert.equal(scriptsById.get(letter.audio),letter.letter+'.');}for(const frame of lesson.frames){assert(lesson.knownWords.includes(frame.word));assert.equal(scriptsById.get(frame.audio),frame.text);}const index=data.lessons.indexOf(lesson);assert(lesson.reviewWords.every(id=>data.lessons.slice(0,index).some(l=>l.newWords.includes(id))));}
for(const variants of Object.values(data.promptVariants))for(const cue of variants)assert.equal(scriptsById.get(cue.audio),cue.text);
for(const interaction of data.interactions){assert.equal(scriptsById.get(interaction.audio),interaction.text);assert.equal(interaction.choices.length,2);for(const choice of interaction.choices){assert.equal(scriptsById.get(choice.replyAudio),choice.reply);await access(new URL('dist/'+choice.image,root));}}
for(const lesson of data.lessons){if(lesson.soundGame){assert.equal(scriptsById.get(lesson.soundGame.audio),lesson.soundGame.text);assert.deepEqual(lesson.soundGame.words,lesson.words);}}
for(const asset of manifest.assets){const bytes=await readFile(new URL('dist/'+asset.url.slice(2),root));assert.equal(bytes.length,asset.bytes,asset.url);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.url);}
assert(manifest.totalBytes<=50*1048576,'offline pack exceeds 50MB');
const audioReport=JSON.parse(await readFile(new URL('dist/audio-report.json',root))),chineseReport=JSON.parse(await readFile(new URL('dist/chinese-audio-report.json',root)));
assert.equal(audioReport.version,data.version);assert.equal(audioReport.completed,requests.length);assert.deepEqual(audioReport.failed,[]);
for(const item of requests){const clip=audioReport.files.find(file=>file.id===item.id);assert(clip);assert.equal(clip.text,item.text);assert.equal(clip.voice,item.lang==='en'?'af_heart':'zh-CN-XiaoxiaoNeural');assert.equal(clip.sha256,manifest.assets.find(asset=>asset.url===`./assets/audio/${item.id}.mp3`).sha256);}
assert.equal(chineseReport.completed,requests.filter(item=>item.lang==='zh').length);assert.deepEqual(chineseReport.failed,[]);assert.equal(chineseReport.childRecordingsUploaded,false);
console.log(`PASS: ${data.lessons.length} lessons, ${data.vocabulary.length} words, ${ids.size} audio clips, ${audioRefs.length} references, ${manifest.assets.length} verified offline assets.`);

const allPlots=new Set();
for(const lesson of data.lessons){
 assert.equal(lesson.contentRevision,'2.0.0');assert.equal(lesson.frames.length,6);
 assert.deepEqual(lesson.frames.flatMap((frame,index)=>frame.interaction?[index]:[]),[2,4]);
 const plot=lesson.frames.map(frame=>frame.narration).join('|');assert(!allPlots.has(plot),'duplicate complete story '+lesson.id);allPlots.add(plot);
 for(const frame of lesson.frames)for(const scene of [frame.scene,frame.interaction?.success.scene].filter(Boolean)){
  for(const decoration of scene.decorations||[]){await access(new URL('dist/assets/'+decoration.asset+'.svg',root));assert(packed.has('./assets/'+decoration.asset+'.svg'));}
  for(const object of scene.objects){assert(object.word==='mascot'||data.vocabulary.some(word=>word.id===object.word));assert(Number.isFinite(object.x)&&Number.isFinite(object.y)&&Number.isFinite(object.size));}
 }
}
assert(packed.has('./adventure.js'));
console.log('PASS: 360 story scenes, 120 consequential tasks, local scene dependencies and unique plots.');
