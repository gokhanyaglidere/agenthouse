import {parseDocument} from 'yaml';
import {createHash} from 'node:crypto';
import {lstatSync,realpathSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {homedir} from 'node:os';
const inside=(base,path)=>{const rel=relative(base,path);return rel!==''&&!rel.startsWith('..')&&!rel.startsWith('/');};
export function readDefinition(path,root){
 const base=realpathSync(root),actual=realpathSync(path),stat=lstatSync(path);
 if(!inside(base,actual)||stat.isSymbolicLink()||!stat.isFile()||stat.size>64000)throw Error('Dosya güvenli kapsamın dışında veya çok büyük.');
 const text=readFileSync(actual,'utf8'),match=text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!match)throw Error('YAML başlığı eksik.');
 const document=parseDocument(match[1],{uniqueKeys:true});if(document.errors.length)throw Error('YAML başlığı geçersiz.');
 const metadata=document.toJS({maxAliasCount:20});if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw Error('YAML başlığı geçersiz.');
 return {metadata,body:text.slice(match[0].length).trim(),hash:createHash('sha256').update(text).digest('hex')};
}
const label=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const strings=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,100).map(x=>label(x)):typeof v==='string'?v.split(',').slice(0,100).map(x=>label(x)).filter(Boolean):[];
export class ProjectCapabilities{
 constructor(cwd,{personal=join(homedir(),'.claude','skills')}={}){this.cwd=resolve(cwd);this.personal=personal;}
 scan(){
  const root=realpathSync(this.cwd),agents=[],skills=[],diagnostics=[];
  const sources=[{key:'project',source:'Proje',scope:'project',path:join(root,'.claude','skills'),native:true},{key:'cursor',source:'Proje talimatları · Cursor',scope:'project',path:join(root,'.cursor','skills'),native:false},{key:'personal',source:'Kişisel · bu bilgisayar',scope:'personal',path:this.personal,native:true}];
  const entries=(path,boundary)=>{if(!existsSync(path))return [];try{if(path!==boundary&&!inside(realpathSync(boundary),realpathSync(path)))throw Error();return readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,200);}catch{diagnostics.push({path:relative(root,path),message:'Tanım klasörü okunamadı veya proje dışına yönleniyor.'});return [];}};
  for(const source of sources){const boundary=source.key==='personal'?source.path:root;for(const entry of entries(source.path,boundary)){if(!entry.isDirectory()||entry.isSymbolicLink())continue;const path=join(source.path,entry.name,'SKILL.md');if(!existsSync(path))continue;try{const {metadata,hash}=readDefinition(path,source.path);const name=label(metadata.name)||entry.name;if(!/^[a-zA-Z0-9_-]+$/.test(name)&&metadata.name===undefined)throw Error('Skill adı geçersiz.');skills.push({id:Buffer.from(source.key+':'+entry.name).toString('base64url'),name,description:label(metadata.description,2000),source:source.source,scope:source.scope,native:source.native,path:source.key==='personal'?entry.name+'/SKILL.md':relative(root,path),folder:entry.name,hash});}catch(error){diagnostics.push({path:source.key==='personal'?'Kişisel/'+entry.name:relative(root,path),message:error.message});}}}
  const dir=join(root,'.claude','agents');for(const entry of entries(dir,root)){if(!entry.name.endsWith('.md')||entry.isSymbolicLink())continue;const path=join(dir,entry.name);try{const {metadata,body,hash}=readDefinition(path,dir);const key=label(metadata.name)||entry.name.slice(0,-3);if(!/^[a-zA-Z0-9_-]+$/.test(key)||!label(metadata.description)||!body)throw Error('Ajan adı, açıklaması veya talimatı eksik/geçersiz.');if(agents.some(a=>a.key===key))throw Error('Aynı ajan adı birden fazla dosyada tanımlı.');const refs=strings(metadata.skills);const skillLinks=refs.map(name=>{const matches=skills.filter(s=>s.native&&(s.name===name||s.folder===name));const skill=matches.find(s=>s.scope==='project')??matches[0];return {name,available:!!skill,source:skill?.source??null,path:skill?.path??null};});agents.push({key,name:key,description:label(metadata.description,2000),group:'Proje ajanları',model:label(metadata.model),tools:strings(metadata.tools),skills:refs,skillLinks,path:relative(root,path),scope:'project',hash});for(const link of skillLinks.filter(s=>!s.available))diagnostics.push({path:relative(root,path),message:'Başvurulan skill bulunamadı: '+link.name});}catch(error){diagnostics.push({path:relative(root,path),message:error.message});}}
  const instructions=['CLAUDE.md','CLAUDE.local.md','.claude/CLAUDE.md'].filter(path=>{try{return inside(root,realpathSync(join(root,path)))&&lstatSync(join(root,path)).isFile();}catch{return false;}});
  const data={agents,skills,diagnostics,instructions};const revision=createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,16);
  return {...data,revision,scannedAt:Date.now()};
 }
}
