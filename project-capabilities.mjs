import {parseDocument} from 'yaml';
import {createHash} from 'node:crypto';
import {lstatSync,realpathSync,readdirSync,existsSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {homedir} from 'node:os';
const inside=(base,path)=>{const rel=relative(base,path);return rel!==''&&!rel.startsWith('..')&&!rel.startsWith('/');};
export function readScopedText(path,root){
 const base=realpathSync(root),actual=realpathSync(path),before=lstatSync(path);
 if(!inside(base,actual)||before.isSymbolicLink()||!before.isFile()||before.size>64000)throw Error('Dosya güvenli kapsamın dışında veya çok büyük.');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const opened=fstatSync(fd);if(!opened.isFile()||opened.dev!==before.dev||opened.ino!==before.ino||opened.size>64000)throw Error('Tanım dosyasının kimliği değişti.');
  const bytes=Buffer.alloc(64001);let size=0;while(size<bytes.length){const n=readSync(fd,bytes,size,bytes.length-size,size);if(!n)break;size+=n;}
  const after=fstatSync(fd);if(size>64000||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||realpathSync(path)!==actual)throw Error('Tanım dosyası okuma sırasında değişti veya boyut sınırını aştı.');
  return bytes.subarray(0,size).toString('utf8');
 }finally{closeSync(fd);}
}
export function readDefinition(path,root,{skill=false}={}){
 const text=readScopedText(path,root),match=text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 const hash=createHash('sha256').update(text).digest('hex');
 if(!match){if(skill)return {metadata:{},body:text.trim(),hash};throw Error('YAML başlığı eksik.');}
 const document=parseDocument(match[1],{uniqueKeys:true});if(document.errors.length){if(skill)return {metadata:{},body:text.trim(),hash,warning:'YAML başlığı geçersiz; skill düz metin olarak keşfedildi.'};throw Error('YAML başlığı geçersiz.');}
 const metadata=document.toJS({maxAliasCount:20});if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)){if(skill)return {metadata:{},body:text.slice(match[0].length).trim(),hash,...(metadata!==null?{warning:'Skill başlığı nesne biçiminde değil; alanlar uygulanmadı.'}:{})};throw Error('YAML başlığı geçersiz.');}
 return {metadata,body:text.slice(match[0].length).trim(),hash};
}
const label=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const strings=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,100).map(x=>label(x)):typeof v==='string'?v.split(',').slice(0,100).map(x=>label(x)).filter(Boolean):[];
export class ProjectCapabilities{
 constructor(cwd,{personal=join(homedir(),'.claude','skills')}={}){this.cwd=resolve(cwd);this.personal=personal;}
 scan(){
  const root=realpathSync(this.cwd),agents=[],skills=[],diagnostics=[],duplicateAgents=new Set();
  const sources=[{key:'project',source:'Proje',scope:'project',path:join(root,'.claude','skills'),native:true},{key:'cursor',source:'Proje talimatları · Cursor',scope:'project',path:join(root,'.cursor','skills'),native:false},{key:'personal',source:'Kişisel · bu bilgisayar',scope:'personal',path:this.personal,native:true}];
  const entries=(path,boundary)=>{if(!existsSync(path))return [];try{if(path!==boundary&&!inside(realpathSync(boundary),realpathSync(path)))throw Error();const found=readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));if(found.length>200)diagnostics.push({path:relative(root,path),message:'Tanım tarama sınırı 200; kalan dosyalar bu listede incelenmedi.'});return found.slice(0,200);}catch{diagnostics.push({path:relative(root,path),message:'Tanım klasörü okunamadı veya proje dışına yönleniyor.'});return [];}};
  for(const source of sources){const boundary=source.key==='personal'?source.path:root;for(const entry of entries(source.path,boundary)){if(!entry.isDirectory()||entry.isSymbolicLink())continue;const path=join(source.path,entry.name,'SKILL.md');if(!existsSync(path))continue;try{const {metadata,hash,warning}=readDefinition(path,source.path,{skill:true});if(warning)diagnostics.push({path:source.key==='personal'?'Kişisel/'+entry.name:relative(root,path),message:warning});const name=label(metadata.name)||entry.name;if(!/^[a-zA-Z0-9_-]+$/.test(name)&&metadata.name===undefined)throw Error('Skill adı geçersiz.');skills.push({id:Buffer.from(source.key+':'+entry.name).toString('base64url'),name,description:label(metadata.description,2000),source:source.source,scope:source.scope,native:source.native,path:source.key==='personal'?entry.name+'/SKILL.md':relative(root,path),folder:entry.name,preloadable:!['true','yes','on','1'].includes(String(metadata['disable-model-invocation']).toLowerCase()),hash});}catch(error){diagnostics.push({path:source.key==='personal'?'Kişisel/'+entry.name:relative(root,path),message:error.message});}}}
  const dir=join(root,'.claude','agents');for(const entry of entries(dir,root)){if(!entry.name.endsWith('.md')||entry.isSymbolicLink())continue;const path=join(dir,entry.name);try{const {metadata,body,hash}=readDefinition(path,dir);const key=typeof metadata.name==='string'?metadata.name.trim():'';if(!key||key.startsWith('-')||key.length>256||/[:\x00-\x1f\x7f]/.test(key)||!label(metadata.description))throw Error('Ajan adı, açıklaması veya talimatı eksik/geçersiz.');if(duplicateAgents.has(key)||agents.some(a=>a.key===key)){duplicateAgents.add(key);throw Error('Aynı ajan adı birden fazla dosyada tanımlı; bu adla yeni iş başlatılamaz.');}const refs=strings(metadata.skills);const skillLinks=refs.map(name=>{const matches=skills.filter(s=>s.native&&(s.name===name||s.folder===name));const scoped=matches.some(s=>s.scope==='project')?matches.filter(s=>s.scope==='project'):matches;const skill=scoped.length===1?scoped[0]:undefined;return {name,available:!!skill&&skill.preloadable,source:skill?.source??null,path:skill?.path??null,reason:scoped.length>1?'Skill adı birden fazla tanımla eşleşiyor.':skill&&!skill.preloadable?'Skill otomatik yükleme için kapalı.':!skill?'Skill bulunamadı.':null};});agents.push({key,name:key,description:label(metadata.description,2000),group:'Proje ajanları',model:label(metadata.model),tools:strings(metadata.tools),skills:refs,skillLinks,path:relative(root,path),scope:'project',hash});for(const link of skillLinks.filter(s=>!s.available))diagnostics.push({path:relative(root,path),message:link.name+' · '+link.reason});}catch(error){diagnostics.push({path:relative(root,path),message:error.message});}}
  const instructions=['CLAUDE.md','CLAUDE.local.md','.claude/CLAUDE.md'].filter(path=>{try{return inside(root,realpathSync(join(root,path)))&&lstatSync(join(root,path)).isFile();}catch{return false;}});
  for(let i=agents.length-1;i>=0;i--)if(duplicateAgents.has(agents[i].key))agents.splice(i,1);
  const instructionHashes=instructions.map(path=>{const file=join(root,path),stat=lstatSync(file);if(stat.size>64000){diagnostics.push({path,message:'Talimat dosyası özet tarama sınırını aşıyor; içerik değişimleri bu taramada izlenmiyor.'});return {path,hash:null};}return {path,hash:createHash('sha256').update(readScopedText(file,root)).digest('hex')};});
  const data={agents,skills,diagnostics,instructions,instructionHashes};const revision=createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,16);
  return {...data,revision,scannedAt:Date.now()};
 }
}
