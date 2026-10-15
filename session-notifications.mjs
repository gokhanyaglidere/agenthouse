import {existsSync,statSync,openSync,readSync,closeSync,readFileSync,writeFileSync,mkdirSync,renameSync,chmodSync} from 'node:fs';
import {join,dirname} from 'node:path';import {homedir} from 'node:os';
function transcriptEvidence(path){
 if(!existsSync(path))return {end:null,question:null};
 const size=statSync(path).size,fd=openSync(path,'r');let bytes;
 try{const b=Buffer.alloc(Math.min(size,131072));bytes=b.subarray(0,readSync(fd,b,0,b.length,Math.max(0,size-b.length)));}finally{closeSync(fd);}
 const rows=bytes.toString('utf8').split('\n').flatMap(s=>{try{return [JSON.parse(s)];}catch{return [];}}).filter(r=>!r.isSidechain&&!r.isMeta);
 const questions=new Set();for(const row of rows)for(const block of Array.isArray(row.message?.content)?row.message.content:[]){if(block.type==='tool_use'&&block.name==='AskUserQuestion')questions.add(block.id);if(block.type==='tool_result')questions.delete(block.tool_use_id);}
 // Prefer assistant completion evidence, so a later turn-duration row doesn't notify twice for the same reply.
 const completed=rows.findLastIndex(r=>r.type==='assistant'&&r.message?.stop_reason==='end_turn'&&r.message?.content?.some?.(b=>b.type==='text')||r.type==='system'&&r.subtype==='turn_duration');
 const text=completed<0?null:rows.slice(0,completed+1).filter(r=>r.type==='assistant'&&r.message?.content?.some?.(b=>b.type==='text')).at(-1);
 return {end:text?.timestamp??rows[completed]?.timestamp??null,question:[...questions].at(-1)??null};
}
export class SessionNotifications{
 constructor({sessions,push,path=join(homedir(),'.pixel-agents','bibilen-session-notices.json'),now=()=>Date.now(),waitingDelayMs=10000}){
  this.sessions=sessions;this.push=push;this.path=path;this.now=now;this.waitingDelayMs=waitingDelayMs;
  try{this.seen=JSON.parse(readFileSync(path,'utf8'));}catch{this.seen={};}this.busy=false;this.native=new Map();this.permissions=new Map();
 }
 observeNative(message){
  if(message.type==='agentCreated'&&message.sessionId)this.native.set(message.id,message.sessionId);
  if(message.type==='existingAgents')for(const [id,meta]of Object.entries(message.agentMeta??{}))if(meta.sessionId)this.native.set(Number(id),meta.sessionId);
  const id=this.native.get(message.id);if(!id)return;
  if(['agentToolPermission','subagentToolPermission'].includes(message.type))this.permissions.set(id,message.toolId??true);
  if(['agentToolPermissionClear','agentToolStart','agentToolsClear'].includes(message.type))this.permissions.delete(id);
 }
 save(){mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path+'.tmp',JSON.stringify(this.seen),{mode:0o600});renameSync(this.path+'.tmp',this.path);chmodSync(this.path,0o600);}
 async poll(){
  if(this.busy)return;this.busy=true;
  try{
   const inventory=await this.sessions.list();if(!inventory.inventoryAvailable)return;
   for(const s of inventory.sessions){
    if(s.taskId)continue;
    const prior=this.seen[s.id]??null,{end,question}=transcriptEvidence(this.sessions.path(s.id));
    const permission=this.permissions.get(s.id),attention=!!permission||!!question||s.activity==='blocked';
    // CLI "waiting" often means an ordinary finished conversation, not a request requiring action.
    const waitingKey=permission??question??(attention?'blocked':null),waitingSince=attention?(prior?.waitingSince??this.now()):null;
    const current={activity:s.activity,end,sequence:prior?.sequence??0,waitingSince,waitingKey,notifiedWaiting:attention&&prior?.waitingKey===waitingKey&&!!prior?.notifiedWaiting};
    if(!attention&&prior?.notifiedWaiting)this.push.resolveSession?.(s.id);
    let status=null,evidence=null;
    if(attention&&!current.notifiedWaiting&&(permission||question||this.now()-waitingSince>=this.waitingDelayMs)){
     status='waiting';evidence=String(++current.sequence);current.notifiedWaiting=true;
    }else if(prior&&s.activity==='failed'&&prior.activity!=='failed'){status='failed';evidence=String(++current.sequence);}
    else if(prior&&!attention&&end&&end!==prior.end&&Date.parse(end)>this.now()-5*60*1000){status='completed';evidence=end;}
    if(status)await this.push.send({id:s.id,sessionId:s.id,title:s.title,status,source:'session',noticeId:`session:${s.id}:${status}:${evidence}`});
    this.seen[s.id]=current;
   }
   this.save();
  }finally{this.busy=false;}
 }
}
