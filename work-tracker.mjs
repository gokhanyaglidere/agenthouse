import {createReadStream,existsSync,readdirSync,readFileSync,statSync,openSync,readSync,closeSync} from 'node:fs';
import {basename,join,relative,resolve} from 'node:path';
const SPAWN=new Set(['Agent','Task']);
const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);
const text=value=>typeof value==='string'?value:Array.isArray(value)?value.filter(b=>b.type==='text').map(b=>b.text??'').join('\n'):'';
const brief=(value,max=4000)=>text(value).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').slice(0,max);
function header(path,length=128){const fd=openSync(path,'r');try{const bytes=Buffer.alloc(length);return bytes.subarray(0,readSync(fd,bytes,0,length,0));}finally{closeSync(fd);}}
export class WorkTracker{
 constructor({sessionManager,cwd}){this.sessions=sessionManager;this.cwd=resolve(cwd);this.cache=new Map();this.flights=new Map();this.nativeSessions=new Map();this.nativeWork=new Map();}
 observeNative(message){
  if(message.type==='agentCreated'&&message.sessionId)this.nativeSessions.set(message.id,message.sessionId);
  if(message.type==='existingAgents')for(const [id,agent]of Object.entries(message.agentMeta??{}))if(agent.sessionId)this.nativeSessions.set(Number(id),agent.sessionId);
  if(message.type==='agentClosed'){const session=this.nativeSessions.get(message.id);this.nativeSessions.delete(message.id);if(session)for(const key of this.nativeWork.keys())if(key.startsWith(session+':'))this.nativeWork.delete(key);return;}
  const session=this.nativeSessions.get(message.id);if(!session)return;
  const key=`${session}:${message.parentToolId??'lead'}`;const old=this.nativeWork.get(key)??{tools:new Set(),state:'unknown'};
  if(message.type==='agentStatus')old.state=message.status==='active'?'running':message.status==='waiting'?'waiting':'unknown';
  else if(message.type==='agentToolStart'){old.tools.add(message.toolId);old.state='running';}
  else if(message.type==='agentToolDone'){old.tools.delete(message.toolId);old.state=old.tools.size?'running':'waiting';}
  else if(message.type==='agentToolPermission')old.state='waiting';
  else if(message.type==='agentToolsClear'){old.tools.clear();old.state='waiting';}
  else if(message.type==='subagentToolStart'){old.tools.add(message.toolId);old.state='running';}
  else if(message.type==='subagentToolDone'){old.tools.delete(message.toolId);old.state=old.tools.size?'running':'waiting';}
  else if(message.type==='subagentToolPermission')old.state='waiting';
  else if(message.type==='subagentClear'){old.tools.clear();old.state='closed';}
  else return;
  this.nativeWork.set(key,old);if(this.nativeWork.size>1000)this.nativeWork.delete(this.nativeWork.keys().next().value);
 }
 async get(id){const session=await this.sessions.known(id);return this.trace(session);}
 trace(session){const id=session.id;if(this.flights.has(id))return this.flights.get(id);const promise=this.update(session).finally(()=>this.flights.delete(id));this.flights.set(id,promise);return promise;}
 fresh(id){return {id,files:new Map(),edits:new Set(),members:new Map([['lead',{id:'lead',parentId:null,role:null,label:'Ana oturum',status:'unknown',instruction:'',summary:'',lastTool:null,file:null,updatedAt:null}]]),calls:new Map(),events:new Map(),workItems:new Map(),paths:new Map(),testResults:[],skipped:0,limited:false};}
 fileLabel(value){if(typeof value!=='string')return null;const path=resolve(this.cwd,value);const rel=relative(this.cwd,path);return rel.startsWith('..')||rel.startsWith('/')?basename(path):rel;}
 event(state,id,kind,from,to,value,at,file=null){
  state.events.set(id,{id,kind,from,to,text:brief(value),at:at??null,file});
  const category=[...state.events.values()].filter(e=>(e.kind==='tool')===(kind==='tool'));
  if(category.length>(kind==='tool'?100:150))state.events.delete(category[0].id);
 }
 consume(state,row,actor){
  if(row.type==='progress'||row.isMeta||(actor==='lead'&&row.isSidechain))return;
  const member=state.members.get(actor);if(!member)return;
  const at=row.timestamp??null;const blocks=Array.isArray(row.message?.content)?row.message.content:[];
  if(row.type==='assistant'&&text(row.message?.content)&&!blocks.some(b=>b.type==='tool_use')){member.summary=brief(row.message.content);member.updatedAt=at;if(actor!=='lead'&&!['completed','failed','stopped'].includes(member.status))member.status='reported';}
  const notification=text(row.message?.content);const notifyId=/<task-id>([a-zA-Z0-9_-]+)<\/task-id>/.exec(notification)?.[1];const notifyStatus=/<status>(completed|failed|stopped)<\/status>/.exec(notification)?.[1];
  if(notifyId&&notifyStatus)for(const worker of state.members.values())if(worker.agentId===notifyId){worker.status=notifyStatus;worker.updatedAt=at;const answer=/<result>([\s\S]*?)<\/result>/.exec(notification)?.[1];if(answer)worker.summary=brief(answer);this.event(state,`${row.uuid}:notice`,'result',worker.id,worker.parentId??'lead',answer??/<summary>([\s\S]*?)<\/summary>/.exec(notification)?.[1]??'Uzman durumu bildirildi.',at);}
  for(const block of blocks){
   if(block.type==='tool_use'){
    const input=block.input??{};const call={actor,name:block.name};if(block.name==='SubagentHandback')call.report=brief(input.message,5000);if(block.name==='Bash'&&typeof input.command==='string'&&/(?:^|&&|;|\n)\s*(?:[A-Z_][A-Z0-9_]*=\S+\s+)*(?:(?:npm|pnpm|yarn)\s+(?:--prefix\s+\S+\s+)?(?:run\s+)?(?:test|check|lint|typecheck|tsc)\b|node\s+--test\b|(?:pytest|vitest)\b|(?:flutter|dart|deno|playwright)\s+(?:test|check|lint)\b)/.test(input.command))call.testCommand=`${input.command.match(/\b(npm|pnpm|yarn|node|pytest|vitest|playwright|flutter|dart|deno)\b/)?.[1]??'Bash'} · test / kontrol`;state.calls.set(block.id,call);
    if(SPAWN.has(block.name)){
     const id=block.id;call.worker=id;
     if(state.members.size>=200&&!state.members.has(id)){state.limited=true;continue;}
     const existing=state.members.get(id);const worker=existing??{id,parentId:actor,role:String(input.subagent_type??''),label:String(input.name??input.description??input.subagent_type??'Uzman').slice(0,120),status:'assigned',instruction:brief(input.prompt,5000),summary:'',lastTool:null,file:null,updatedAt:at};
     state.members.set(id,worker);this.event(state,id,'delegated',actor,id,input.description??'Uzman görevlendirildi.',at);
    }else if(block.name==='SendMessage'){
     this.event(state,block.id,'message',actor,String(input.to??input.recipient??'Ekip'),input.message??input.content??input.summary??'',at);
    }else if(block.name==='TaskCreate'||block.name==='TaskUpdate'){
     call.input={taskId:input.taskId,subject:input.subject,owner:input.owner,status:input.status};
     if(input.taskId){const old=state.workItems.get(String(input.taskId))??{id:String(input.taskId),subject:'İş kaydı'};state.workItems.set(old.id,{...old,...Object.fromEntries(Object.entries(call.input).filter(([,v])=>v!==undefined))});}
     this.event(state,block.id,'assignment',actor,String(input.owner??actor),input.subject??`${input.taskId??'İş'} · ${input.status??'Güncelleme'}`,at);
    }else{
     member.lastTool=String(block.name);member.file=this.fileLabel(input.file_path??input.path);member.updatedAt=at;if(actor!=='lead'&&!['completed','failed','stopped'].includes(member.status))member.status='running';
     if(member.file){if(['Edit','Write','NotebookEdit'].includes(block.name))state.edits.add(member.file);state.files.set(member.file,{path:member.file,operation:block.name,actor,at});if(state.files.size>150)state.files.delete(state.files.keys().next().value);}
     this.event(state,block.id,'tool',actor,null,String(block.name),at,member.file);
    }
   }
   if(block.type==='tool_result'){
    const call=state.calls.get(block.tool_use_id);if(!call)continue;
    const result=row.toolUseResult??{};
    if(call.worker){const worker=state.members.get(call.worker);if(!worker)continue;
     if(safeId(result.agentId))worker.agentId=result.agentId;
     const asyncResult=result.isAsync===true||result.status==='async_launched'||result.status==='running';
     if(!asyncResult){worker.status=block.is_error||result.status==='failed'?'failed':'completed';worker.summary=brief(result.content??block.content);worker.updatedAt=at;this.event(state,`${row.uuid??block.tool_use_id}:result`,'result',worker.id,call.actor,worker.summary||'Uzman sonucu döndü.',at);}
    }else{
     if(call.name==='SubagentHandback'&&actor!=='lead'&&!block.is_error&&result.success===true){member.status='completed';member.summary=call.report??'';member.updatedAt=at;member.handoffAt=at;this.event(state,`${block.tool_use_id}:handback`,'result',actor,member.parentId??'lead',member.summary||'Uzman raporu teslim edildi.',at);}
     if(call.testCommand){state.testResults.unshift({id:block.tool_use_id,actor:call.actor,command:call.testCommand,at,failed:!!block.is_error,output:brief(result.stdout??result.output??block.content,5000).replace(/(?:sk-ant-|sk-proj-|tskey-)[a-zA-Z0-9_-]+/g,'[gizlendi]').replace(/((?:token|password|secret|api[_-]?key)\s*[=:]\s*)[^\s]+/gi,'$1[gizlendi]')});state.testResults=state.testResults.slice(0,30);}
     if(call.name==='TaskCreate'){const taskId=String(result.task?.id??result.taskId??'');if(taskId)state.workItems.set(taskId,{id:taskId,subject:call.input?.subject??'İş kaydı',owner:call.input?.owner??null,status:call.input?.status??'pending'});}
     if(member.lastTool===call.name)member.lastTool=null;
     state.calls.delete(block.tool_use_id);
    }
   }
  }
 }
 async read(state,path,actor){
  if(!existsSync(path))return;const stat=statSync(path);let cursor=state.paths.get(path)??{offset:0,mtime:0};
  if(stat.size<cursor.offset)cursor={offset:0,mtime:0};if(stat.size===cursor.offset){state.paths.set(path,{...cursor,mtime:stat.mtimeMs});return;}
  let pending=Buffer.alloc(0),position=cursor.offset,oversized=false;
  if(!stat.size)return;
  const stream=createReadStream(path,{start:cursor.offset,end:Math.max(0,stat.size-1),highWaterMark:65536});
  for await(const chunk of stream){pending=Buffer.concat([pending,chunk]);let index;
   while((index=pending.indexOf(10))>=0){const line=pending.subarray(0,index);pending=pending.subarray(index+1);position+=index+1;
    if(!oversized&&line.length<=1024*1024){try{this.consume(state,JSON.parse(line.toString('utf8')),actor);}catch{state.skipped++;}}else state.skipped++;
    oversized=false;
   }
   if(pending.length>1024*1024){position+=pending.length;pending=Buffer.alloc(0);oversized=true;}
  }
  // A partially written JSON line is consumed only after its terminating newline.
  state.paths.set(path,{offset:position,mtime:stat.mtimeMs});
 }
 async update(session){
  const rootPath=this.sessions.path(session.id);let state=this.cache.get(session.id);
  const stat=existsSync(rootPath)?statSync(rootPath):null;
  const replaced=stat&&state&&(stat.size<(state.paths.get(rootPath)?.offset??0)||state.inode!==stat.ino||(state.header&&!header(rootPath,state.header.length).equals(state.header)));
  if(!state||replaced){state=this.fresh(session.id);state.inode=stat?.ino;state.header=stat?header(rootPath):null;this.cache.set(session.id,state);if(this.cache.size>20)this.cache.delete(this.cache.keys().next().value);}
  const lead=state.members.get('lead');lead.role=session.role??'chief';lead.label=session.title;lead.status=['completed','failed','stopped'].includes(session.taskStatus)?session.taskStatus:['working','busy','running'].includes(session.activity)?'running':['blocked','idle','waiting'].includes(session.activity)?'waiting':'unknown';
  await this.read(state,rootPath,'lead');
  const dir=join(this.sessions.rootFor?.(session.id)??this.sessions.root,session.id,'subagents');
  const metas=existsSync(dir)?readdirSync(dir).filter(f=>/^agent-[a-zA-Z0-9_-]+\.meta\.json$/.test(f)):[];
  // Metadata provides exact tool-use identity, including nested delegations.
  for(let pass=0;pass<4;pass++){
   let changed=false;
   for(const file of metas){let meta;try{meta=JSON.parse(readFileSync(join(dir,file),'utf8'));}catch{continue;}
    const worker=state.members.get(meta.toolUseId);if(worker&&!worker.agentId){worker.agentId=file.slice(6,-10);worker.role=worker.role||meta.agentType||'';changed=true;}
   }
   const before=state.members.size;
   for(const worker of [...state.members.values()])if(worker.agentId&&safeId(worker.agentId)){
    const resolved=['completed','failed','stopped'].includes(worker.status)?{status:worker.status,...(worker.summary?{summary:worker.summary}:{}),updatedAt:worker.updatedAt}:null;
    await this.read(state,join(dir,`agent-${worker.agentId}.jsonl`),worker.id);
    if(resolved&&(!worker.handoffAt||String(worker.handoffAt)<=String(resolved.updatedAt??'')))Object.assign(worker,resolved,{lastTool:null});
   }
   if(!changed&&state.members.size===before)break;
  }
  const members=[...state.members.values()].map(member=>{
   const connected=['open','background','external'].includes(session.status);
   const terminal=['completed','failed','stopped'].includes(member.status);
   // CLI inventory is a current process signal; transcript status alone is history.
   const inventoryState=member.id==='lead'?(['working','busy','running'].includes(session.activity)?'running':session.activity==='idle'?'idle':['blocked','waiting'].includes(session.activity)?'waiting':null):null;
   return {...member,liveState:connected&&!terminal?(inventoryState??this.nativeWork.get(`${session.id}:${member.id}`)?.state??null):null};
  });
  const aliases=new Map(members.flatMap(m=>[[m.id,m.id],[m.agentId,m.id],[m.label,m.id]].filter(([v])=>!!v)));
  return {sessionId:session.id,sessionStatus:session.status,title:session.title,taskId:session.taskId,live:['open','background','external'].includes(session.status),updatedAt:Date.now(),members,
   events:[...state.events.values()].sort((a,b)=>String(a.at??'').localeCompare(String(b.at??''))).map(e=>({...e,to:aliases.get(e.to)??e.to})),files:[...state.files.values()].slice(-100).map(f=>({...f,edited:state.edits.has(f.path)})),workItems:[...state.workItems.values()].slice(-100),
   testResults:[...state.testResults].sort((a,b)=>String(b.at??'').localeCompare(String(a.at??''))),coverage:{skippedLines:state.skipped,limitedMembers:state.limited,missingTranscripts:members.filter(m=>m.id!=='lead'&&(!m.agentId||!existsSync(join(dir,`agent-${m.agentId}.jsonl`)))).length}};
 }
 async overview(){const {sessions,inventoryAvailable}=await this.sessions.list();const all=sessions.filter(s=>['open','background','external'].includes(s.status));const active=all.slice(0,8);return {inventoryAvailable,totalLiveSessions:all.length,limitedSessions:all.length>active.length,groups:await Promise.all(active.map(s=>this.trace(s)))};}
}
