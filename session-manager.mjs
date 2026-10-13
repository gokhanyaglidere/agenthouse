import {remoteControlUrl} from './remote-control-links.mjs';
import {hasNativeWork} from './native-work-state.mjs';
import {sessionOptions,sessionOptionArgs} from './session-options.mjs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,chmodSync,readdirSync,statSync,lstatSync,realpathSync,openSync,readSync,closeSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
const localPath=p=>{const m=/^([A-Za-z]):[\\/](.*)$/.exec(String(p??''));return m&&process.platform==='linux'?'/mnt/'+m[1].toLowerCase()+'/'+m[2].replace(/\\/g,'/'):p;};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE=new Set(['working','running','blocked','busy','idle','waiting']);
export function validSessionId(id){return typeof id==='string'&&UUID.test(id);}
function sliceFile(path,start,length){const fd=openSync(path,'r');try{const b=Buffer.alloc(length);return b.subarray(0,readSync(fd,b,0,length,start));}finally{closeSync(fd);}}
function parseLines(bytes){return bytes.toString('utf8').split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});}
export function conversationEntry(row){
 if(row.isSidechain||row.isMeta||!['user','assistant'].includes(row.type))return null;
 const content=row.message?.content;
 const blocks=typeof content==='string'?[{type:'text',text:content}]:Array.isArray(content)?content:[];
 const text=blocks.filter(b=>b.type==='text').map(b=>b.text??'').join('\n').trim();
 const tools=blocks.filter(b=>b.type==='tool_use').map(b=>String(b.name??'Araç'));
 if(!text&&!tools.length)return null;
 return {id:row.uuid??randomUUID(),role:row.type,text:text.slice(0,40000),tools,timestamp:row.timestamp??null};
}
function stopExternalCli(agent){
 const identity=execFileSync('ps',['-p',String(agent.pid),'-o','uid=,comm='],{encoding:'utf8'}).trim();
 const match=/^(\d+)\s+(.+)$/.exec(identity);
 if(!match||Number(match[1])!==process.getuid?.()||!/(?:^|\/)claude$/.test(match[2]))throw new Error('CLI süreci doğrulanamadı; başka süreç durdurulmadı.');
 process.kill(agent.pid,'SIGTERM');
}
export class SessionManager{
 constructor({cwd,context,allowedRoles,spawnTerminal,listAgents,tasks=()=>[],canAttach=()=>true,root,extraRoots=[],storePath,restoreTerminals=async()=>[],stopExternal=stopExternalCli,discoveryReadOnly=false,refreshRoles=()=>{},nativeRoles,memoryPrompt=()=>''}){
  this.memoryPrompt=memoryPrompt;this.nativeRoles=nativeRoles;this.refreshRoles=refreshRoles;this.discoveryReadOnly=discoveryReadOnly;this.stopExternal=stopExternal;this.transferring=new Set();this.context=context;this.cwd=resolve(context?.cwd??cwd);this.roles=allowedRoles;this.spawnTerminal=spawnTerminal;this.listAgents=listAgents;this.tasks=tasks;this.canAttach=canAttach;
  this.root=root??join(homedir(),'.claude','projects',this.cwd.replace(/[^a-zA-Z0-9]/g,'-'));
  // Read-only transcript folders written by another machine OS (e.g. Windows Claude seen from WSL). Never written, never resumed.
  this.roots=[this.root,...extraRoots.map(r=>resolve(r))];
  this.storePath=storePath??context?.sessionStorePath??join(homedir(),'.pixel-agents','bibilen-sessions.json');
  try{this.saved=JSON.parse(readFileSync(this.storePath,'utf8')).sessions??{};}catch{this.saved={};}
  this.restoreTerminals=restoreTerminals;this.restored=false;this.restoreFlight=null;
  this.live=new Map();this.cache=new Map();this.opening=new Set();
 }
 save(){mkdirSync(resolve(this.storePath,'..'),{recursive:true});const tmp=this.storePath+'.tmp';writeFileSync(tmp,JSON.stringify({version:1,sessions:this.saved}),{mode:0o600});renameSync(tmp,this.storePath);chmodSync(this.storePath,0o600);}
 rootFor(id){for(const root of this.roots)if(existsSync(join(root,id+'.jsonl')))return root;return this.root;}
 isExternal(id){return validSessionId(id)&&this.rootFor(id)!==this.root;}
 path(id){if(!validSessionId(id))throw new Error('Geçersiz oturum kimliği.');return join(this.rootFor(id),id+'.jsonl');}
 fileInfo(id){
  const path=this.path(id);if(!existsSync(path))return null;const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Oturum kaydı doğrulanamadı.');
  const cache=this.cache.get(id);if(cache?.path===path&&cache.mtime===stat.mtimeMs&&cache.size===stat.size)return cache.info;
  const head=parseLines(sliceFile(path,0,Math.min(65536,stat.size)));
  const tail=parseLines(sliceFile(path,Math.max(0,stat.size-65536),Math.min(65536,stat.size)));
  const records=[...head,...tail];
  const titleRow=records.filter(r=>r.customTitle||r.aiTitle).at(-1);
  const user=head.map(conversationEntry).find(r=>r?.role==='user'&&!/^<|^Another Claude session sent a message:/i.test(r.text));
  const title=String(titleRow?.customTitle??titleRow?.aiTitle??user?.text??`Claude konuşması · ${id.slice(0,8)}`).replace(/\s+/g,' ').slice(0,120);
  const info={id,title,cwd:records.find(r=>typeof r.cwd==='string')?.cwd??null,createdAt:stat.birthtimeMs||stat.mtimeMs,updatedAt:stat.mtimeMs,hasTranscript:true};
  this.cache.set(id,{path,mtime:stat.mtimeMs,size:stat.size,info});return info;
 }
 scoped(info){
  if(this.discoveryReadOnly)return true;
  if(info?.cwd){const canonical=p=>{p=localPath(p);try{return realpathSync(p);}catch{return resolve(p);}};return canonical(info.cwd)===canonical(this.cwd);}
  const saved=this.saved[info?.id];return !!saved&&(!this.context||saved.workspaceId===this.context.workspaceId||this.context.legacy&&!saved.workspaceId);
 }
 assertTranscript(id){const info=this.fileInfo(id);if(!info||!this.scoped(info))throw Error('Oturum kaydı bu projeye ait değil veya proje kimliği doğrulanamadı.');return info;}
 async inventory(){
  this.context?.assertValid();
  if(!this.restored){this.restoreFlight??=(async()=>{for(const recovered of await this.restoreTerminals()){if(this.live.has(recovered.id)){recovered.terminal.disconnect?.();continue;}const live={...recovered,output:'',clients:new Set(),controller:null,background:false};this.live.set(live.id,live);this.wireTerminal(live);}this.restored=true;})();await this.restoreFlight;}
  const agents=await this.listAgents();
  const scoped=(agents??[]).filter(a=>a.cwd&&resolve(a.cwd)===this.cwd&&validSessionId(a.sessionId));
  // /clear and /resume change the session UUID inside the same owned CLI process.
  for(const [id,live]of [...this.live]){
   if(live.background||!Number.isInteger(live.terminal.pid)||live.terminal.pid<=0)continue;
   const agent=scoped.find(a=>a.origin!=='windows'&&a.pid===live.terminal.pid);
   if(!agent||agent.sessionId===id||this.live.has(agent.sessionId))continue;
   this.live.delete(id);live.id=agent.sessionId;this.live.set(live.id,live);
   this.saved[live.id]={...this.saved[id],...this.saved[live.id],title:this.saved[live.id]?.title??agent.name??this.saved[id]?.title??'Claude konuşması',createdAt:this.saved[live.id]?.createdAt??Date.now(),updatedAt:Date.now()};this.save();
   for(const client of live.clients)if(client.readyState===1)client.send(JSON.stringify({type:'session',id:live.id,title:this.saved[live.id].title}));
  }
  return {available:Array.isArray(agents),agents:scoped};
 }
 async list(){
  const inventory=await this.inventory();const result=new Map(),blocked=new Set();
  for(const root of this.roots)if(existsSync(root))for(const filename of readdirSync(root)){const id=filename.replace(/\.jsonl$/,'');if(!filename.endsWith('.jsonl')||!validSessionId(id))continue;if(root!==this.root&&result.has(id))continue;try{const info=this.fileInfo(id);if(info&&this.scoped(info))result.set(id,info);else blocked.add(id);}catch{blocked.add(id);}}
  for(const [id,saved]of Object.entries(this.saved))if(validSessionId(id)&&!blocked.has(id))result.set(id,{...result.get(id),...saved,id,updatedAt:Math.max(saved.updatedAt??0,result.get(id)?.updatedAt??0),hasTranscript:existsSync(this.path(id))});
  for(const agent of inventory.agents){const id=agent.sessionId;if(blocked.has(id))continue;result.set(id,{id,title:agent.name||'Claude konuşması',createdAt:agent.startedAt,updatedAt:agent.startedAt,...result.get(id),agent});}
  return {inventoryAvailable:inventory.available,sessions:[...result.values()].map(item=>{
   const own=this.live.get(item.id);const agent=item.agent??inventory.agents.find(a=>a.sessionId===item.id);
   const active=!!own||(agent&&(ACTIVE.has(agent.state)||ACTIVE.has(agent.status)));
   const background=agent?.kind==='background';
   const task=this.tasks().find(t=>t.sessionId&&(t.sessionId===item.id||item.id.startsWith(t.sessionId+'-')));
   const ext=this.isExternal(item.id);const status=own?'open':active?(background?'background':'external'):item.hasTranscript?'history':'new';
   return {id:item.id,title:task?.title??item.title,role:item.role??task?.role??null,createdAt:item.createdAt,updatedAt:item.updatedAt,status,activity:agent?.state??agent?.status??(own?'open':'unknown'),
    canOpen:!ext&&(!!own||!!background||(!active&&inventory.available)),canStop:!!own&&!own.background,hasTranscript:!!item.hasTranscript,
    remoteControlUrl:this.saved[item.id]?.remoteControlUrl??null,taskId:task?.id??null,taskTitle:task?.title??null,taskStatus:task?.status??null,
    origin:ext?'windows':'host',note:ext?(!inventory.available?'Windows canlı durumu doğrulanamadı; bu kayıt yalnızca izlenebilir.':'Windows oturumu: Mac panelinden yalnızca izlenebilir. Devam etmek için Windows tarafında aç.'):status==='external'?'Başka bir terminalde açık. Geçmişini okuyabilirsin; devam etmek için önce o terminalde oturumu kapat.':!inventory.available&&!own?'Aktif oturumlar doğrulanamadı. Yenileyip tekrar dene.':null};
  }).sort((a,b)=>b.updatedAt-a.updatedAt)};
 }
 create(input){
  this.refreshRoles();
  this.context?.assertValid();
  const title=String(input?.title??'').trim();const role=String(input?.role??'chief');
  if(title.length<3||title.length>100)throw new Error('Konuşma adı 3–100 karakter olmalı.');
  if(!this.roles.has(role))throw new Error('Bilinmeyen uzman rolü.');
  const id=randomUUID();this.saved[id]={title,role,memorySnapshot:this.memoryPrompt?.()??'',options:sessionOptions(input.options),...(this.context?{projectId:this.context.projectId,workspaceId:this.context.workspaceId,hostId:this.context.hostId}:{}),createdAt:Date.now(),updatedAt:Date.now()};this.save();return {id,...this.saved[id]};
 }
 async known(id){this.path(id);const found=(await this.list()).sessions.find(s=>s.id===id);if(!found)throw new Error('Bu projede oturum bulunamadı.');return found;}
 async transcript(id,before){
  await this.known(id);const path=this.path(id);if(!existsSync(path))return {messages:[],nextBefore:null};
  this.assertTranscript(id);const size=statSync(path).size;const end=before===undefined?size:Number(before);
  if(!Number.isSafeInteger(end)||end<0||end>size)throw new Error('Geçersiz geçmiş sayfası.');
  const start=Math.max(0,end-512*1024);let bytes=sliceFile(path,start,end-start);let offset=start;
  if(start>0){const newline=bytes.indexOf(10);if(newline<0)return {messages:[],nextBefore:start};offset=start+newline+1;bytes=bytes.subarray(newline+1);}
  const lines=bytes.toString('utf8').split('\n');const entries=[];let position=offset;
  for(const line of lines){let row;try{row=JSON.parse(line);}catch{}const entry=row&&conversationEntry(row);if(entry)entries.push({entry,offset:position});position+=Buffer.byteLength(line)+1;}
  const recent=entries.slice(-120);const next=entries.length>120?recent[0].offset:offset;
  return {messages:recent.map(r=>r.entry),nextBefore:next>0?next:null};
 }
 async setRemoteControl(id,url){
  this.context?.assertValid();const session=await this.known(id);
  if(session.origin!=='windows')throw Error('Bu bağlantı Windows oturumları içindir.');
  const value=remoteControlUrl(url);
  this.saved[id]={...this.saved[id],title:session.title,createdAt:session.createdAt,updatedAt:Date.now(),...(this.context?{workspaceId:this.context.workspaceId}:{}),remoteControlUrl:value||null};this.save();return await this.known(id);
 }
 async takeover(id){
  if(this.isExternal(id))throw Error('Windows oturumu yalnızca izlenebilir.');
  this.context?.assertValid();this.path(id);
  if(this.transferring.has(id)||this.opening.has(id))throw new Error('Oturum zaten devralınıyor.');
  this.transferring.add(id);
  try{
   const session=await this.known(id);if(session.status!=='external'||!session.hasTranscript)throw new Error('Yalnızca geçmişi bulunan harici CLI oturumu devralınabilir.');
   const inventory=await this.inventory();if(!inventory.available)throw new Error('CLI durumu doğrulanamadı.');
   const agent=inventory.agents.find(a=>a.sessionId===id);
   if(agent?.kind!=='interactive'||!Number.isInteger(agent.pid)||agent.pid<=1||(agent.state??agent.status)!=='idle')throw new Error('Oturum çalışıyor veya izin bekliyor. İş bittikten sonra yeniden dene.');
   await this.stopExternal(agent);
   for(let i=0;i<30;i++){
    const next=await this.inventory();
    if(next.available&&!next.agents.some(a=>a.sessionId===id&&(ACTIVE.has(a.state)||ACTIVE.has(a.status))))return await this.known(id);
    await new Promise(resolve=>setTimeout(resolve,200));
   }
   throw new Error('Dış terminalin kapanması doğrulanamadı. İkinci bir oturum açılmadı.');
  }finally{this.transferring.delete(id);}
 }
 async connect(id,ws,{blocked=false}={}){
  if(this.isExternal(id))throw Error('Windows oturumu yalnızca izlenebilir.');
  if(this.discoveryReadOnly)throw Error('Keşfedilen geçmişten oturum başlatılamaz.');
  this.context?.assertValid();
  if(this.opening.has(id))throw new Error('Oturum bağlanıyor. Biraz sonra tekrar dene.');
  this.opening.add(id);
  try{
   const session=await this.known(id);if(ws.readyState!==1)return;let live=this.live.get(id);
   if(!live){
    if(!session.canOpen)throw new Error(session.note??'Bu oturum zaten başka bir yerde açık.');
    if(blocked)throw new Error('Claude erişimi engelli. Oturum geçmişini okuyabilirsin; başlatmak için bağlantıyı düzelt.');
    if(this.live.size>=5)throw new Error('Aynı anda en fazla 5 konuşma açık olabilir.');
    const inventory=await this.inventory();if(!inventory.available)throw new Error('Aktif oturumlar doğrulanamadı.');
    const agent=inventory.agents.find(a=>a.sessionId===id);
    if(agent?.kind==='background'&&!this.canAttach(id))throw new Error('Bu görev terminali başka bir panelde açık. Önce onu kapat.');
    if(agent?.kind!=='background'&&agent&&(ACTIVE.has(agent.state)||ACTIVE.has(agent.status)))throw new Error('Oturum başka bir terminalde açık. Önce orada kapat.');
    if(agent?.kind!=='background'&&inventory.agents.some(a=>a.sessionId!==id&&hasNativeWork(a)))throw Error('Bu klasörde çalışan CLI işi var; bitmesini bekle.');
    const args=agent?.kind==='background'?['attach',agent.id??id]:session.hasTranscript?['--resume',id,...(this.saved[id]?.options?sessionOptionArgs(this.saved[id].options):['--permission-mode','default'])]:['--session-id',id,'--name',session.title,...(this.saved[id]?.options?sessionOptionArgs(this.saved[id].options):['--permission-mode','default'])];
    if(!agent&&!session.hasTranscript){this.refreshRoles();if(session.role&&!this.roles.has(session.role))throw Error('Ajan tanımı artık bu projede yok; farklı bir ajan seç.');if(session.role&&(session.role!=='chief'||this.nativeRoles?.has('chief')))args.push('--agent',session.role);else args.push('--append-system-prompt',`${this.context?.projectName ?? 'BiBilen'} projesinin orkestrasyon şefi Gökhan olarak çalış. CLAUDE.md ve proje kurallarını izle. Gerektiğinde .claude/agents içindeki uzmanları kullan.`);}
    if(!agent&&this.saved[id]?.memorySnapshot){const note='\n\nSahibinin bu oturum oluşturulurken kaydettiği proje kararları (güvenlik ve CLAUDE.md kuralları geçerlidir):\n'+this.saved[id].memorySnapshot;const index=args.indexOf('--append-system-prompt');if(index>=0)args[index+1]+=note;else args.push('--append-system-prompt',note);}
    if(ws.readyState!==1)return;
    if(this.live.size>=5)throw new Error('Aynı anda en fazla 5 konuşma açık olabilir.');
    this.context?.assertValid();if(session.hasTranscript)this.assertTranscript(id);const terminal=this.spawnTerminal(args,{session});live={id,terminal,output:'',clients:new Set(),controller:null,background:agent?.kind==='background'};this.live.set(id,live);
    this.wireTerminal(live);
    if(this.saved[id]){this.saved[id].updatedAt=Date.now();this.save();}
   }
   if(ws.readyState!==1)return;
   live.clients.add(ws);if(!live.controller)live.controller=ws;
   ws.send(JSON.stringify({type:'control',writable:live.controller===ws}));if(live.output)ws.send(live.output);
   ws.on('message',raw=>{let m;try{m=JSON.parse(String(raw));}catch{return;}
    if(live.controller!==ws)return;
    if(m.type==='input'&&typeof m.data==='string'&&m.data.length<=32768)live.terminal.write(m.data);
    if(m.type==='resize'&&Number.isInteger(m.cols)&&Number.isInteger(m.rows)&&m.cols>=20&&m.cols<=300&&m.rows>=5&&m.rows<=120)live.terminal.resize(m.cols,m.rows);
   });
   ws.on('close',()=>{live.clients.delete(ws);if(live.controller===ws){live.controller=live.clients.values().next().value??null;if(live.controller?.readyState===1)live.controller.send(JSON.stringify({type:'control',writable:true}));}if(!live.clients.size&&live.background){if(this.live.get(id)===live)this.live.delete(id);live.terminal.kill();}});
  }finally{this.opening.delete(id);}
 }
 wireTerminal(live){live.terminal.onData(data=>{live.output=(live.output+data).slice(-65536);for(const client of live.clients)if(client.readyState===1)client.send(data);});live.terminal.onExit(()=>{if(this.live.get(live.id)===live)this.live.delete(live.id);for(const client of live.clients)if(client.readyState===1)client.close(1000,'Claude oturumu kapandı');});}
 stopOwned(id){this.path(id);const live=this.live.get(id);if(!live)throw new Error('Panelde açık oturum bulunamadı.');if(live.background)throw new Error('Bu oturumu Görevler bölümünden durdur.');live.terminal.kill();}
 close(){for(const live of this.live.values()){if(live.terminal.disconnect)live.terminal.disconnect();else live.terminal.kill();}this.live.clear();}
}
