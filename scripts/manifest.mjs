import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
async function list(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const e of entries){const full=path.join(dir,e.name);if(e.isDirectory())files.push(...await list(full));else files.push(path.relative(root,full).split(path.sep).join('/'));}return files.sort();}
// Hosting middleware may insert per-visitor scripts into text/html responses.
// Ship the exact offline document as base64 JSON, which remains byte-stable.
const html=await readFile(path.join(root,'index.html'));
const entry=Buffer.from(JSON.stringify({encoding:'base64',content:html.toString('base64')}));
await writeFile(path.join(root,'offline-entry.json'),entry);
const entryHash=createHash('sha256').update(entry).digest('hex');
// The online recovery entry must stay outside byte-checked HTML resources too.
const paths=(await list(root)).filter(p=>p!=='resources.json'&&p!=='index.html'&&p!=='update.html');
const digest=createHash('sha256');
for(const p of paths.filter(p=>p!=='sw.js')){digest.update(p);digest.update(await readFile(path.join(root,p)));}
const version='1.0.0-'+digest.digest('hex').slice(0,12);
let worker=await readFile(path.join(root,'sw.js'),'utf8');worker=worker.replace(/const SHELL_VERSION='[^']+';/,`const SHELL_VERSION='${version}';`).replace(/const ENTRY_SHA256='[^']+';/,`const ENTRY_SHA256='${entryHash}';`);await writeFile(path.join(root,'sw.js'),worker);
const assets=[];
for(const p of paths){const buffer=await readFile(path.join(root,p));assets.push({url:'./'+p,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')});}
const curriculum=JSON.parse(await readFile(path.join(root,'curriculum.json'),'utf8'));
const manifest={version,coverage:{weeks:curriculum.weeks.length,lessons:curriculum.lessons.length,words:curriculum.vocabulary.length,curriculumVersion:curriculum.version},totalBytes:assets.reduce((sum,a)=>sum+a.bytes,0),assets};
await writeFile(path.join(root,'resources.json'),JSON.stringify(manifest,null,2));
console.log(`${version}: ${assets.length} assets, ${(manifest.totalBytes/1048576).toFixed(2)} MB`);
