import {readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,basename,resolve} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {SessionManager,validSessionId} from './session-manager.mjs';
const liveStates=new Set(['working','busy','running','blocked','idle','waiting','ready','starting']);
// Discovery never registers projects, starts workers or changes Claude settings.
export class SessionCatalog{
 constructor({root=join(homedir(),'.claude','projects'),runtimes,listAgents}){this.root=root;this.runtimes=runtimes;this.listAgents=listAgents;this.readers=new Map();this.entries=new Map();this.flight=null;}
 list(){if(this.flight)return this.flight;this.flight=this.scan().finally(()=>this.flight=null);return this.flight;}
 async scan(){
  const agents=await this.listAgents();const result=new Map(),entries=new Map(),seen=new Set();
  const runtimes=[...this.runtimes.values()];
  for(const r of runtimes){const data=await r.sessionManager.list();for(const s of data.sessions){seen.add(r.context.cwd+':'+s.id);const key=r.context.workspaceId+':'+s.id;result.set(key,{...s,catalogKey:key,workspaceId:r.context.workspaceId,projectName:r.context.projectName,currentWorkspace:false});entries.set(key,{manager:r.sessionManager,id:s.id});}}
  if(existsSync(this.root))for(const directory of readdirSync(this.root)){
   const root=join(this.root,directory);if(!lstatSync(root).isDirectory())continue;
   if(runtimes.some(r=>resolve(r.sessionManager.root)===resolve(root)))continue;
   let manager=this.readers.get(directory);if(!manager){manager=new SessionManager({cwd:'/',root,storePath:join(root,'.bibilen-discovery-unused.json'),allowedRoles:new Set(),listAgents:async()=>null});manager.known=async id=>{const path=manager.path(id);if(!existsSync(path)||!lstatSync(path).isFile())throw Error('Oturum kaydı bulunamadı.');return manager.fileInfo(id);};this.readers.set(directory,manager);}
   for(const filename of readdirSync(root)){
    const id=filename.replace(/\.jsonl$/,'');if(!filename.endsWith('.jsonl')||!validSessionId(id)||!lstatSync(join(root,filename)).isFile())continue;
    let info;try{info=manager.fileInfo(id);}catch{continue;}
    if(info.cwd)seen.add(info.cwd+':'+id);
    const key=createHash('sha256').update(directory).digest('hex').slice(0,20)+':'+id;
    const agent=Array.isArray(agents)?agents.find(a=>a.sessionId===id&&info.cwd&&resolve(a.cwd??'/')===resolve(info.cwd)):null;
    const active=agent&&liveStates.has(agent.state??agent.status);
    result.set(key,{id,title:info.title,role:null,createdAt:info.createdAt,updatedAt:info.updatedAt,status:active?(agent.kind==='background'?'background':'external'):'history',activity:agent?.state??agent?.status??'unknown',hasTranscript:true,canOpen:false,taskId:null,taskTitle:null,note:'Bu ortam panele eklenmemiş. Geçmişi okuyabilirsin; burada çalıştırmak için projeyi ekle.',catalogKey:key,workspaceId:null,projectName:info.cwd?basename(info.cwd):directory,discovered:true});entries.set(key,{manager,id});
   }
  }
  if(Array.isArray(agents))for(const agent of agents){
   if(!validSessionId(agent.sessionId)||typeof agent.cwd!=='string'||!liveStates.has(agent.state??agent.status)||seen.has(agent.cwd+':'+agent.sessionId))continue;
   const key=createHash('sha256').update(agent.cwd).digest('hex').slice(0,20)+':'+agent.sessionId;
   result.set(key,{id:agent.sessionId,title:agent.name||'Claude konuşması',role:null,createdAt:agent.startedAt,updatedAt:agent.startedAt,status:agent.kind==='background'?'background':'external',activity:agent.state??agent.status,hasTranscript:false,canOpen:false,taskId:null,taskTitle:null,note:'CLI oturumu açık; henüz konuşma kaydı oluşmamış.',catalogKey:key,workspaceId:null,projectName:basename(agent.cwd),discovered:true});
   entries.set(key,{id:agent.sessionId,manager:{transcript:async()=>({messages:[],nextBefore:null})}});
  }
  this.entries=entries;return {inventoryAvailable:Array.isArray(agents),sessions:[...result.values()].sort((a,b)=>b.updatedAt-a.updatedAt),source:'Bu bilgisayardaki Claude Code kayıtları'};
 }
 async transcript(key,before){await this.list();const entry=this.entries.get(key);if(!entry)throw Error('Oturum kaydı bulunamadı.');return entry.manager.transcript(entry.id,before);}
}
