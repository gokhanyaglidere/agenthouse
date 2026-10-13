import {mkdirSync,readdirSync,lstatSync,readFileSync,writeFileSync,renameSync,existsSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const names=new Set(['project-decisions.json','agent-house-sharing.json','standalone-state.json','native-state.json','bibilen-session-notices.json','session-notices.json','projects.json','bibilen-tasks.json','bibilen-sessions.json','bibilen-character-looks.json','bibilen-notifications.json','bibilen-daily-reports.json','bibilen-operations.json','layout.json','tasks.json','sessions.json','character-looks.json','daily-reports.json','operations.json']);
const safe=path=>{const parts=path.split('/');return parts.length===1&&names.has(path)||parts.length===3&&parts[0]==='workspaces'&&/^[a-f0-9]{12}$/.test(parts[1])&&names.has(parts[2]);};
const hash=data=>createHash('sha256').update(data).digest('hex');
export class StateBackup{
 constructor(root){this.root=root;this.directory=join(root,'backups');this.error=null;}
 list(){if(!existsSync(this.directory))return [];return readdirSync(this.directory).filter(n=>/^\d+-[a-f0-9-]+$/.test(n)).sort().reverse().map(id=>{try{const m=JSON.parse(readFileSync(join(this.directory,id,'manifest.json'),'utf8'));return {id,at:m.at,files:m.files.length,bytes:m.files.reduce((n,f)=>n+f.bytes,0)};}catch{return null;}}).filter(Boolean);}
 state(){const items=this.list();return {last:items[0]??null,count:items.length,error:this.error,retention:14};}
 create({daily=false}={}){
  const current=this.list()[0];if(daily&&current&&Date.now()-current.at<86400000)return this.state();
  mkdirSync(this.directory,{recursive:true,mode:0o700});const id=Date.now()+'-'+randomUUID(),temporary=join(this.directory,'.'+id),files=[];
  mkdirSync(temporary,{mode:0o700});
  try{
   const paths=[...names].filter(n=>existsSync(join(this.root,n)));
   const workspaces=join(this.root,'workspaces');if(existsSync(workspaces)&&!lstatSync(workspaces).isSymbolicLink())for(const n of readdirSync(workspaces)){const dir=join(workspaces,n);if(!/^[a-f0-9]{12}$/.test(n)||!lstatSync(dir).isDirectory()||lstatSync(dir).isSymbolicLink())continue;for(const f of readdirSync(dir))if(names.has(f))paths.push('workspaces/'+n+'/'+f);}
   for(const path of paths){if(!safe(path))continue;const source=join(this.root,path);const stat=lstatSync(source);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)continue;const data=readFileSync(source);JSON.parse(data.toString());const destination=join(temporary,path);mkdirSync(dirname(destination),{recursive:true,mode:0o700});writeFileSync(destination,data,{mode:0o600});files.push({path,bytes:data.length,sha256:hash(data)});}
   if(!files.length)throw new Error('Yedeklenecek kayıt yok.');
   writeFileSync(join(temporary,'manifest.json'),JSON.stringify({version:1,at:Date.now(),files}),{mode:0o600});renameSync(temporary,join(this.directory,id));
   for(const old of this.list().slice(14))rmSync(join(this.directory,old.id),{recursive:true});this.error=null;
  }catch(error){rmSync(temporary,{recursive:true,force:true});this.error='Yedek oluşturulamadı; mevcut kayıtlar korunuyor.';throw error;}
  return this.state();
 }
 exportLatest(){
  const latest=this.list()[0];if(!latest)throw new Error('Henüz yedek yok.');
  const manifest=JSON.parse(readFileSync(join(this.directory,latest.id,'manifest.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.files)||manifest.files.length>500)throw new Error('Geçersiz yedek.');
  const files=manifest.files.map(f=>{if(typeof f.path!=='string'||!safe(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes>16*1024*1024)throw new Error('Geçersiz kayıt yolu.');const path=join(this.directory,latest.id,f.path);const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)throw new Error('Geçersiz kayıt.');return {...f,data:readFileSync(path).toString('base64')};});
  const archive={format:'agent-house-state',version:1,at:manifest.at,files};
  validateArchive(archive);return archive;
 }
 // Restore only into a NEW staging directory. Never replace active state or processes.
 restoreTo(id,destination){
  if(!/^\d+-[a-f0-9-]+$/.test(id)||existsSync(destination))throw new Error('Geçersiz yedek veya hedef zaten var.');
  const source=join(this.directory,id);const manifest=JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.files)||manifest.files.length>500)throw new Error('Geçersiz yedek.');
  const data=manifest.files.map(f=>{if(!safe(f.path))throw new Error('Geçersiz kayıt yolu.');const body=readFileSync(join(source,f.path));if(hash(body)!==f.sha256||body.length!==f.bytes)throw new Error('Yedek bütünlüğü doğrulanamadı.');JSON.parse(body.toString());return {path:f.path,body};});
  mkdirSync(destination,{mode:0o700});for(const f of data){const path=join(destination,f.path);mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,f.body,{mode:0o600});}return {files:data.length};
 }
}

function validateArchive(archive){
 if(archive?.format!=='agent-house-state'||archive.version!==1||!Array.isArray(archive.files)||!archive.files.length||archive.files.length>500)throw new Error('Geçersiz yedek.');
 const seen=new Set();let total=0;
 return archive.files.map(f=>{
  if(typeof f.path!=='string'||!safe(f.path)||seen.has(f.path))throw new Error('Geçersiz veya yinelenen kayıt yolu.');seen.add(f.path);
  if(typeof f.data!=='string'||f.data.length>24*1024*1024||!Number.isSafeInteger(f.bytes)||f.bytes<0||f.bytes>16*1024*1024)throw new Error('Geçersiz kayıt boyutu.');
  const body=Buffer.from(f.data,'base64');total+=body.length;
  if(total>64*1024*1024||body.length!==f.bytes||hash(body)!==f.sha256)throw new Error('Yedek bütünlüğü doğrulanamadı.');
  JSON.parse(body.toString());return {path:f.path,body};
 });
}
export function restoreArchive(archive,destination){
 if(existsSync(destination))throw new Error('Hedef zaten var; canlı kayıtlar değiştirilmedi.');
 const files=validateArchive(archive);
 mkdirSync(destination,{mode:0o700});
 try{for(const f of files){const path=join(destination,f.path);mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,f.body,{mode:0o600});}}catch(error){rmSync(destination,{recursive:true,force:true});throw error;}
 return {files:files.length};
}
