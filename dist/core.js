export const STORE_KEY='yuebing-red-panda-progress-v1';
export function emptyProgress(){return {schema:1,contentRevision:'2.0.0',completed:[],revisedCompleted:[],currentLesson:'w1-d1',sessions:{},metPanda:false};}
export function sanitizeProgress(value,lessons){
 if(!value||value.schema!==1||!Array.isArray(value.completed)||!value.sessions||typeof value.sessions!=='object')throw new Error('这不是有效的学习进度文件');
 const valid=new Set(lessons.map(x=>x.id));
 const sessions={},limit=(v,max)=>Math.max(0,Math.min(Math.floor(Number(v)||0),max));
 for(const [id,s] of Object.entries(value.sessions))if(valid.has(id)&&s&&Number.isInteger(s.step)&&s.step>=0&&s.step<=5){
  const lesson=lessons.find(l=>l.id===id),known=new Set(lesson.knownWords),modes=['listen','deliver','position','color','count'];
  const questions=Array.isArray(s.quiz?.questions)?s.quiz.questions.slice(0,8).filter(q=>q&&known.has(q.target)&&Array.isArray(q.choices)&&q.choices.includes(q.target)&&q.choices.every(w=>known.has(w))).map(q=>({target:q.target,choices:[q.target,...new Set(q.choices.filter(w=>w!==q.target))].slice(0,3),scope:q.scope==='review'?'review':'current',mode:modes.includes(q.mode)?q.mode:'listen'})):[];
  sessions[id]={step:s.step,seconds:Math.max(0,Math.min(Number(s.seconds)||0,86400))};
  if(s.contentRevision==='2.0.0')Object.assign(sessions[id],{contentRevision:'2.0.0',story:{frame:limit(s.story?.frame,5),line:limit(s.story?.line,32),speechRevision:s.story?.speechRevision==='2.0.1'?'2.0.1':undefined,solved:Object.fromEntries((lesson.frames||[]).filter(f=>s.story?.solved?.[f.id]===true).map(f=>[f.id,true]))},words:{cursor:limit(s.words?.cursor,lesson.words.length*4)},quiz:{questions,index:limit(s.quiz?.index,Math.max(0,questions.length-1)),finished:!!s.quiz?.finished,accepted:!!s.quiz?.accepted,selected:known.has(s.quiz?.selected)?s.quiz.selected:null},speakingIndex:limit(s.speakingIndex,1000)%lesson.words.length});
 }
 return {schema:1,contentRevision:'2.0.0',completed:[...new Set(value.completed.filter(x=>valid.has(x)))],revisedCompleted:[...new Set((Array.isArray(value.revisedCompleted)?value.revisedCompleted:[]).filter(x=>valid.has(x)))],currentLesson:value.contentRevision!=='2.0.0'&&lessons.find(l=>l.id===value.currentLesson)?.week>=11?'w11-d1':valid.has(value.currentLesson)?value.currentLesson:lessons[0].id,sessions,metPanda:!!value.metPanda};
}
export function isLessonComplete(lesson,progress){return progress.completed.includes(lesson.id)&&(lesson.week<11||progress.revisedCompleted?.includes(lesson.id));}
export function nextLesson(lessons,progress){return lessons.find(l=>!isLessonComplete(l,progress))||lessons[0];}
export function shuffle(values,random=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function choosePrompt(variants,recent=[],random=Math.random){
 if(!variants?.length)throw new Error('缺少提示语');
 const fresh=variants.filter(cue=>!recent.includes(cue.audio));
 const alternate=variants.filter(cue=>cue.audio!==recent.at(-1));
 const pool=fresh.length?fresh:alternate.length?alternate:variants;
 return pool[Math.floor(random()*pool.length)];
}
export function quizFor(lesson,vocabulary,random=Math.random){
 const current=shuffle(lesson.words,random),review=shuffle(lesson.reviewWords,random);
 const known=lesson.knownWords||[...new Set([...lesson.words,...lesson.reviewWords])];
 return Array.from({length:lesson.review?lesson.words.length:6},(_,i)=>{
  const isReview=!lesson.review&&i>=4&&review.length>0;
  const target=isReview?review[(i-4)%review.length]:current[i%current.length];
  const others=shuffle(known.filter(x=>x!==target),random).slice(0,2);
  return {target,scope:isReview?'review':'current',choices:shuffle([target,...others],random)};
 });
}
export function formatBytes(bytes){return bytes<1024*1024?`${Math.ceil(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
