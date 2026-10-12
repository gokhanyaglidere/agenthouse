import {ToolGuard} from './tool-guard.mjs';
import {ProjectPolicy} from './project-policy.mjs';
import {StateBackup} from './state-backup.mjs';
import {SessionCatalog} from './session-catalog.mjs';
import {installProjectProfiles} from './project-onboarding.mjs';
import {Admission,ScopedPush,SlackCoordinator,workspaceScope} from './workspace-services.mjs';
import {ProjectRegistry} from './project-registry.mjs';
import {Operations} from './operations.mjs';
import {Appearance} from './appearance.mjs';
import {UsageMonitor} from './usage-monitor.mjs';
const accountUsage=new UsageMonitor();
import {Integrations} from './integrations.mjs';
import {SlackHub} from './slack-hub.mjs';
import {DailyReports} from './daily-reports.mjs';
import http from 'node:http';
import {sessionChanges} from './changes.mjs';
import {SessionNotifications} from './session-notifications.mjs';
import {TerminalBroker} from './terminal-broker.mjs';
import {AccessPolicy} from './access-policy.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname,join,resolve } from 'node:path';
import { existsSync,mkdirSync,chmodSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { authorizedControl, authorizedRequest, validHost, validOrigin } from './control-auth.mjs';
import { PushManager } from './push-manager.mjs';
import { TaskManager } from './task-manager.mjs';
import { ExecutionHealth } from './execution-health.mjs';
import { SessionManager } from './session-manager.mjs';
import { WorkTracker } from './work-tracker.mjs';
import { presenceInventory } from './session-presence.mjs';
import { watchTaskTerminal } from './task-terminal-lifecycle.mjs';
import { homedir } from 'node:os';
const here=dirname(fileURLToPath(import.meta.url));
const projects=new ProjectRegistry();
const gatewayPort=Number(process.env.BIBILEN_GATEWAY_PORT??3100);
const nativePort=Number(process.env.BIBILEN_NATIVE_PORT??3101);
const registeredDefault=projects.data.workspaces.find(w=>w.id===projects.data.defaultWorkspaceId);
const defaultRoot=process.env.BIBILEN_DEFAULT_CWD??registeredDefault?.root??here;
const defaultWorkspace=projects.register({name:'Agent House',path:defaultRoot,legacy:!registeredDefault||registeredDefault.root===defaultRoot});
const executionContext=projects.context(defaultWorkspace.id);
const cwd=executionContext.cwd;
// LaunchAgent's minimal PATH must also reach background Claude hooks and tools.
process.env.PATH=`/opt/homebrew/bin:/usr/local/bin:${process.env.PATH??'/usr/bin:/bin:/usr/sbin:/sbin'}`;
const claudePath=process.env.BIBILEN_CLAUDE_PATH??(existsSync('/opt/homebrew/bin/claude')?'/opt/homebrew/bin/claude':'claude');
const executionHealth=new ExecutionHealth(claudePath,join(homedir(),'.pixel-agents','bibilen-execution-health.json'));
const accessPolicy=new AccessPolicy();
const accountPush=new PushManager();
const stateBackup=new StateBackup(join(homedir(),'.pixel-agents'));
try{stateBackup.create({daily:true});}catch{}
const backupTimer=setInterval(()=>{try{stateBackup.create({daily:true});}catch{}},3600000);
const admission=new Admission({limit:3});
const slackCoordinator=new SlackCoordinator();
const runtimes=new Map();
let stopping=false;
let recovering=true;
let nextPort=nativePort+1;
function getRuntime(workspaceId){
 if(runtimes.has(workspaceId))return runtimes.get(workspaceId);
 if(runtimes.size>=20)throw new Error('En fazla 20 çalışma ortamı etkin olabilir.');
 const context=projects.context(workspaceId);
 mkdirSync(context.storageDir,{recursive:true,mode:0o700});chmodSync(context.storageDir,0o700);
 const roles=new Set(context.roles);
 const scopedPath=name=>join(context.storageDir,context.legacy?'bibilen-'+name+'.json':name+'.json');
 const push=new ScopedPush(accountPush,context,{legacy:context.legacy});
 const taskTerminals=new Map();
 const policy=new ProjectPolicy(scopedPath('project-policy'));
 const guard=new ToolGuard({cwd:context.cwd,path:scopedPath('tool-guard'),policy,notify:r=>push.send({id:r.id,sessionId:r.sessionId,status:'waiting',title:'Araç onayı gerekiyor',noticeId:r.id},'İzin')});
 const launchGuard=()=>guard.settings({node:process.execPath,script:join(here,'tool-guard-client.mjs'),port:gatewayPort,workspaceId:context.workspaceId,mode:policy.state().toolMode});
 const taskManager=new TaskManager({cwd:context.cwd,claudePath,allowedRoles:roles,context,admission,launchGuard,checkNewWork:()=>policy.assertNewWork(),onNotice:(task,heading)=>push.send(task,heading)});
 const terminalBroker=new TerminalBroker({cwd:context.cwd,command:claudePath,storageDir:context.terminalRoot,context});
 const spawnTerminal=args=>{
  context.assertValid();
  if(args[0]==='attach')return pty.spawn(claudePath,args,{name:'xterm-256color',cols:100,rows:32,cwd:context.cwd,env:{...process.env,TERM:'xterm-256color'}});
  const id=args[args.indexOf(args.includes('--session-id')?'--session-id':'--resume')+1];
  const key=context.workspaceId+':'+id;
  admission.reserve(key);
  try{const terminal=terminalBroker.create([...args,...launchGuard()]);terminal.onExit(()=>admission.release(key));return terminal;}catch(error){admission.release(key);throw error;}
 };
 const sessionManager=new SessionManager({cwd:context.cwd,context,allowedRoles:roles,tasks:()=>taskManager.data.tasks,
  canAttach:id=>!taskManager.data.tasks.some(t=>t.sessionId&&(id===t.sessionId||id.startsWith(t.sessionId+'-'))&&taskTerminals.has(t.id)),
  listAgents:()=>taskManager.listAgents(),
  restoreTerminals:async()=>{const recovered=await terminalBroker.recover();for(const {id,terminal}of recovered){const key=context.workspaceId+':'+id;admission.recover(key);terminal.onExit(()=>admission.release(key));}return recovered;},spawnTerminal});
 const slackAlarms=slackCoordinator.add(new SlackHub({dir:context.storageDir,push}));
 const runtime={context,cwd:context.cwd,taskManager,sessionManager,taskTerminals,pushManager:push,policy,guard,launchGuard,
  appearance:new Appearance({roles,path:scopedPath('character-looks')}),
  integrations:new Integrations({cwd:context.cwd,command:claudePath}),slackAlarms,
  dailyReports:new DailyReports({slack:slackAlarms,tasks:taskManager,path:scopedPath('daily-reports')}),
  operations:new Operations({slack:slackAlarms,tasks:taskManager,path:scopedPath('operations')}),
  sessionNotices:new SessionNotifications({sessions:sessionManager,push,path:scopedPath('session-notices')}),
  workTracker:new WorkTracker({sessionManager,cwd:context.cwd}),port:context.legacy?nativePort:nextPort++,
  terminal:null,output:'',controller:null,presenceSocket:null,presenceBusy:false};
 runtimes.set(workspaceId,runtime);
 runtime.native=spawn(process.execPath,[resolve(here,'node_modules/pixel-agents/dist/cli.js'),'--host','127.0.0.1','--port',String(runtime.port)],{cwd:context.cwd,env:{...process.env,BIBILEN_NATIVE_SCOPE:context.workspaceId,...(!context.legacy?{BIBILEN_NATIVE_STATE_PATH:join(context.storageDir,'native-state.json'),BIBILEN_NATIVE_LAYOUT_PATH:join(context.storageDir,'layout.json'),BIBILEN_NATIVE_CONFIG_PATH:join(context.storageDir,'config.json')}:{})},stdio:['ignore','inherit','inherit']});
 runtime.native.on('exit',()=>{runtime.nativeFailed=true;});
 runtime.native.on('error',()=>{runtime.nativeFailed=true;});
 void runtime.integrations.check();
 admission.pendingRecovery.add(workspaceId);
 runtime.ready=sessionManager.inventory().catch(()=>null).finally(()=>admission.pendingRecovery.delete(workspaceId));
 if(!recovering)void runtime.ready.then(()=>taskManager.start());
 connectPresence(runtime);
 return runtime;
}
const defaultRuntime=getRuntime(defaultWorkspace.id);
const sessionCatalog=new SessionCatalog({runtimes,listAgents:()=>defaultRuntime.taskManager.listAgents()});
// Recover queued work from registered projects before admitting new panel jobs.
for(const workspace of projects.data.workspaces){try{getRuntime(workspace.id);}catch(error){console.error('Workspace unavailable:',workspace.id,error.message);}}
void Promise.allSettled([...runtimes.values()].map(r=>r.ready)).then(()=>{recovering=false;for(const r of runtimes.values())r.taskManager.start();});
const slackTimer=setInterval(()=>void slackCoordinator.poll(),65000);
const dailyTimer=setInterval(()=>{for(const r of runtimes.values())void r.dailyReports.tick().catch(()=>{});},60000);
const noticeTimer=setInterval(()=>{for(const r of runtimes.values())void r.sessionNotices.poll().catch(()=>{});},5000);
const sessionWss=new WebSocketServer({noServer:true,maxPayload:65536,handleProtocols:()=> 'bibilen-control'});
sessionWss.on('connection',(ws,req)=>{
 const {sessionManager}=req.bibilenRuntime;
 void sessionManager.connect(req.bibilenSessionId,ws,{blocked:executionHealth.state.status==='blocked'}).catch(error=>{
  if(ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({type:'error',message:error.message}));ws.close(1008);}
 });
});
const wss=new WebSocketServer({noServer:true,maxPayload:65536,handleProtocols:()=> 'bibilen-control'});
wss.on('connection',(ws,req)=>{
 const runtime=req.bibilenRuntime;
 runtime.controller=ws;
 const broadcast=data=>{runtime.output=(runtime.output+data).slice(-65536);if(runtime.controller?.readyState===WebSocket.OPEN)runtime.controller.send(data);};
 if(runtime.output)ws.send(runtime.output);
 if(!runtime.terminal){
  const key=runtime.context.workspaceId+':console';
  try{
   runtime.policy.assertNewWork();runtime.context.assertValid();admission.reserve(key);
   runtime.terminal=pty.spawn(claudePath,['--permission-mode','default',...runtime.launchGuard(),'--append-system-prompt',`${runtime.context.projectName} projesinin koordinatörü Gökhan olarak çalış. CLAUDE.md ve proje kurallarını izle. Uzman gerektiğinde bu projenin .claude/agents tanımlarını kullan.`],{name:'xterm-256color',cols:100,rows:32,cwd:runtime.cwd,env:{...process.env,TERM:'xterm-256color'}});
   runtime.terminal.onData(broadcast);runtime.terminal.onExit(({exitCode})=>{admission.release(key);broadcast(`\r\nClaude Code oturumu kapandı (${exitCode}).\r\n`);runtime.terminal=null;});
  }catch(error){admission.release(key);runtime.controller=null;ws.send(error.message);ws.close(1011);return;}
 }
 ws.on('message',raw=>{let m;try{m=JSON.parse(String(raw));}catch{return;}
  if(m.type==='input'&&typeof m.data==='string'&&m.data.length<=32768)runtime.terminal?.write(m.data);
  if(m.type==='resize'&&Number.isInteger(m.cols)&&Number.isInteger(m.rows)&&m.cols>=20&&m.cols<=300&&m.rows>=5&&m.rows<=120)runtime.terminal?.resize(m.cols,m.rows);
 });ws.on('close',()=>{if(runtime.controller===ws)runtime.controller=null;});
});
const taskWss=new WebSocketServer({noServer:true,maxPayload:65536,handleProtocols:()=> 'bibilen-control'});
taskWss.on('connection',(ws,req)=>{
  const {taskManager,sessionManager,taskTerminals,cwd,context}=req.bibilenRuntime;
  const task=taskManager.get(req.bibilenTaskId);
  if(!task?.sessionId){ws.close(1008,'Görev oturumu hazır değil');return;}
  if(taskTerminals.has(task.id)||[...sessionManager.live.keys()].some(id=>id===task.sessionId||id.startsWith(task.sessionId+'-'))){ws.close(1008,'Görev başka bir panelde açık');return;}
  let attached;
  try{
    context.assertValid();
    attached=pty.spawn(claudePath,['attach',task.sessionId],{name:'xterm-256color',cols:100,rows:32,cwd,env:{...process.env,TERM:'xterm-256color',PATH:`/opt/homebrew/bin:/usr/local/bin:${process.env.PATH??''}`}});
  }catch{ws.close(1011,'Claude oturumuna bağlanılamadı');return;}
  watchTaskTerminal(taskTerminals,task.id,attached,ws);
  attached.onData(data=>{if(ws.readyState===WebSocket.OPEN)ws.send(data);});
  ws.on('message',raw=>{
    let message;try{message=JSON.parse(String(raw));}catch{return;}
    if(message.type==='input'&&typeof message.data==='string'&&message.data.length<=32768)attached.write(message.data);
    if(message.type==='resize'&&Number.isInteger(message.cols)&&Number.isInteger(message.rows)&&message.cols>=20&&message.cols<=300&&message.rows>=5&&message.rows<=120)attached.resize(message.cols,message.rows);
  });
});
const officeSockets=new WebSocketServer({noServer:true,maxPayload:4*1024*1024});
officeSockets.on('connection',(client,req)=>{
 const {port,workTracker,sessionNotices}=req.bibilenRuntime;
 const upstream=new WebSocket(`ws://127.0.0.1:${port}${req.url}`);
 const pending=[];
 client.on('message',raw=>{
  let message;try{message=JSON.parse(String(raw));}catch{return;}
  if(req.bibilenViewer&&!['webviewReady'].includes(message.type))return;
  if(message.type==='launchAgent'||message.bypassPermissions){client.send(JSON.stringify({type:'bibilenNotice',message:'Yeni oturum için Oturumlar bölümünü kullan. Korumasız ajan başlatma kapalı.'}));return;}
  if(message.type==='bibilenSyncSessions')return; // Internal verified inventory only.
  delete message.bibilenControlKey;const data=JSON.stringify(message);
  if(upstream.readyState===WebSocket.OPEN)upstream.send(data);else if(pending.length<32)pending.push(data);
 });
 upstream.on('open',()=>{for(const data of pending)upstream.send(data);pending.length=0;});
 upstream.on('message',raw=>{try{workTracker.observeNative(JSON.parse(String(raw)));sessionNotices.observeNative(JSON.parse(String(raw)));}catch{}if(client.readyState===WebSocket.OPEN)client.send(String(raw));});
 upstream.on('error',()=>client.close(1011));upstream.on('close',()=>client.close());client.on('close',()=>upstream.close());
});
function sendJson(res,status,value){
  const body=JSON.stringify(value);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body)});
  res.end(body);
}
function readJson(req){return new Promise((resolveBody,reject)=>{
  let raw='';
  req.on('data',chunk=>{raw+=chunk;if(raw.length>1_000_000){reject(new Error('İstek çok büyük.'));req.destroy();}});
  req.on('end',()=>{try{resolveBody(raw?JSON.parse(raw):{});}catch{reject(new Error('Geçersiz JSON.'));}});
  req.on('error',reject);
});}
async function handleApi(req,res,url){
  const operator=accessPolicy.canWrite(req.headers);
  try{
    if(req.method==='GET'&&url.pathname==='/bibilen/api/session-catalog'){sendJson(res,200,await sessionCatalog.list());return true;}
    const catalogMatch=url.pathname.match(/^\/bibilen\/api\/session-catalog\/([^/]+)\/transcript$/);
    if(req.method==='GET'&&catalogMatch){sendJson(res,200,await sessionCatalog.transcript(decodeURIComponent(catalogMatch[1]),url.searchParams.has('before')?url.searchParams.get('before'):undefined));return true;}
    if(req.method==='GET'&&url.pathname==='/bibilen/api/projects'){sendJson(res,200,{...projects.publicState({paths:operator}),workspaces:projects.publicState({paths:operator}).workspaces.map(w=>({...w,runtime:runtimes.has(w.id)&&!runtimes.get(w.id).nativeFailed?'active':'unavailable'})),admission:admission.state()});return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/projects'){
      if(!operator){sendJson(res,403,{error:'Projeyi yalnızca yönetici ekleyebilir.'});return true;}
      if(projects.data.workspaces.length>=20)throw new Error('En fazla 20 çalışma ortamı kaydedilebilir.');
      const input=await readJson(req);if(input.templates!==undefined&&typeof input.templates!=='boolean')throw new Error('Ekip tercihi geçersiz.');const workspace=projects.register({name:input.name,path:input.path});
      if(input.templates){if(runtimes.has(workspace.id))throw new Error('Bu proje zaten etkin. Yerel ajan tanımlarını düzenleyip servisi yeniden başlatabilirsin.');installProjectProfiles(projects.context(workspace.id).cwd);}
      getRuntime(workspace.id);sendJson(res,201,{workspace});return true;
    }
    if(req.method==='GET'&&url.pathname==='/bibilen/api/portfolio'){
      const items=await Promise.all(projects.data.workspaces.map(async w=>{const r=runtimes.get(w.id);const p=projects.data.projects.find(p=>p.id===w.projectId);let work=null;try{if(r)work=await r.workTracker.overview();}catch{}return {workspaceId:w.id,projectId:w.projectId,name:p.name,available:!!r&&!r.nativeFailed,tasks:r?r.taskManager.publicState(operator).tasks:[],inventoryAvailable:work?.inventoryAvailable??false,connectedSessions:work?.totalLiveSessions??work?.groups.length??0,workingMembers:work?.groups.flatMap(g=>g.members.filter(m=>m.liveState==='running').map(m=>({sessionId:g.sessionId,id:m.id,label:m.label,role:m.role})))??[]};}));
      sendJson(res,200,{items,admission:admission.state()});return true;
    }
    if(req.method==='GET'&&url.pathname==='/bibilen/api/backups/export'){
      if(!operator){sendJson(res,403,{error:'Yedekleri yalnızca yönetici indirebilir.'});return true;}
      res.setHeader('Content-Disposition','attachment; filename="agent-house-backup.json"');sendJson(res,200,stateBackup.exportLatest());return true;
    }
    if(url.pathname==='/bibilen/api/backups'){if(!operator){sendJson(res,403,{error:'Yedekleri yalnızca yönetici görebilir.'});return true;}if(req.method==='POST')stateBackup.create();sendJson(res,200,stateBackup.state());return true;}
    const runtime=getRuntime(workspaceScope(url,req.headers,defaultWorkspace.id));
    const {context:executionContext,cwd,taskManager,sessionManager,workTracker,appearance,integrations,slackAlarms,dailyReports,operations,pushManager}=runtime;
    if(req.method==='GET'&&url.pathname==='/bibilen/api/roles'){sendJson(res,200,{roles:executionContext.roles,projectName:executionContext.projectName,legacy:executionContext.legacy});return true;}

    if(url.pathname.startsWith('/bibilen/api/operations')){if(!operator){sendJson(res,403,{error:'Operasyon kayıtlarını yalnızca yönetici inceleyebilir.'});return true;}
      if(req.method==='GET'&&url.pathname==='/bibilen/api/operations'){sendJson(res,200,operations.state());return true;}
      if(req.method==='POST'&&url.pathname==='/bibilen/api/operations/tasks'){if(executionHealth.state.status==='blocked'){sendJson(res,409,{error:executionHealth.state.message});return true;}sendJson(res,201,await operations.prepare(await readJson(req)));return true;}
    }
    if(req.method==='GET'&&url.pathname==='/bibilen/api/appearance'){sendJson(res,200,appearance.state());return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/appearance'){if(!operator){sendJson(res,403,{error:'Karakterleri yalnızca yönetici değiştirebilir.'});return true;}sendJson(res,200,appearance.update(await readJson(req)));return true;}
    if(req.method==='GET'&&url.pathname==='/bibilen/api/usage'){sendJson(res,200,await accountUsage.state());return true;}
    if(url.pathname.startsWith('/bibilen/api/reports')){if(!operator){sendJson(res,403,{error:'Raporları yalnızca yönetici inceleyebilir.'});return true;}
      if(req.method==='GET'&&url.pathname==='/bibilen/api/reports'){sendJson(res,200,dailyReports.state());return true;}
      if(req.method==='POST'&&url.pathname==='/bibilen/api/reports/settings'){sendJson(res,200,dailyReports.update(await readJson(req)));return true;}
      if(req.method==='POST'&&url.pathname==='/bibilen/api/reports/prepare'){sendJson(res,200,await dailyReports.prepare());return true;}
    }
    if(url.pathname.startsWith('/bibilen/api/integrations')){if(!operator){sendJson(res,403,{error:'Bağlantıları yalnızca yönetici inceleyebilir.'});return true;}
      if(req.method==='GET'&&url.pathname==='/bibilen/api/integrations'){sendJson(res,200,{...integrations.state(),slack:slackAlarms.state()});return true;}
      if(req.method==='POST'&&url.pathname==='/bibilen/api/integrations/check'){sendJson(res,200,{...await integrations.check(),slack:await slackAlarms.poll()});return true;}
      if(req.method==='POST'&&url.pathname==='/bibilen/api/integrations/slack'){sendJson(res,200,await slackAlarms.configure(await readJson(req)));void slackAlarms.poll();return true;}
    }
    if(req.method==='GET'&&url.pathname==='/bibilen/api/state'){sendJson(res,200,{...taskManager.publicState(operator),execution:executionHealth.state,admission:admission.state(),context:{projectId:executionContext.projectId,workspaceId:executionContext.workspaceId,hostId:executionContext.hostId,projectName:executionContext.projectName}});return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/unlock'){
      sendJson(res,operator?200:403,{ok:operator});return true;
    }
    if(!operator&&req.method!=='GET'){sendJson(res,403,{error:'İzleyici erişiminde komut ve ayar değişikliği yapılamaz.'});return true;}
    if(url.pathname==='/bibilen/api/approvals'){if(!operator){sendJson(res,403,{error:'Onayları yalnızca yönetici görebilir.'});return true;}sendJson(res,200,runtime.guard.state());return true;}
    const approvalMatch=url.pathname.match(/^\/bibilen\/api\/approvals\/([^/]+)$/);if(req.method==='POST'&&approvalMatch){if(!operator){sendJson(res,403,{error:'Yalnızca yönetici karar verebilir.'});return true;}sendJson(res,200,runtime.guard.decide(approvalMatch[1],(await readJson(req)).decision));return true;}
    if(url.pathname==='/bibilen/api/project-policy'){if(!operator){sendJson(res,403,{error:'Proje izinlerini yalnızca yönetici görebilir.'});return true;}if(req.method==='POST'){const value=runtime.policy.update(await readJson(req));runtime.guard.invalidate();sendJson(res,200,value);}else sendJson(res,200,runtime.policy.state());return true;}
    if(req.method==='GET'&&url.pathname==='/bibilen/api/work/overview'){sendJson(res,200,await workTracker.overview());return true;}
    const changesMatch=url.pathname.match(/^\/bibilen\/api\/sessions\/([^/]+)\/changes$/);
    if(req.method==='GET'&&changesMatch){sendJson(res,200,await sessionChanges(cwd,await workTracker.get(changesMatch[1])));return true;}
    const workMatch=url.pathname.match(/^\/bibilen\/api\/sessions\/([^/]+)\/work$/);
    if(req.method==='GET'&&workMatch){sendJson(res,200,await workTracker.get(workMatch[1]));return true;}
    const taskWorkMatch=url.pathname.match(/^\/bibilen\/api\/tasks\/([^/]+)\/work$/);
    if(req.method==='GET'&&taskWorkMatch){
      const task=taskManager.get(taskWorkMatch[1]);if(!task){sendJson(res,404,{error:'Görev bulunamadı.'});return true;}
      const inventory=await sessionManager.list();const session=inventory.sessions.find(s=>s.taskId===task.id);
      sendJson(res,200,{task,trace:session?await workTracker.trace(session):null,events:taskManager.data.events.filter(e=>e.taskId===task.id).slice(0,40)});return true;
    }
    if(req.method==='GET'&&url.pathname==='/bibilen/api/sessions'){sendJson(res,200,await sessionManager.list());return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/sessions'){
      runtime.policy.assertNewWork();
      if(executionHealth.state.status==='blocked'){sendJson(res,409,{error:executionHealth.state.message});return true;}
      sendJson(res,201,{session:sessionManager.create(await readJson(req))});return true;
    }
    const transcriptMatch=url.pathname.match(/^\/bibilen\/api\/sessions\/([^/]+)\/transcript$/);
    if(req.method==='GET'&&transcriptMatch){sendJson(res,200,await sessionManager.transcript(transcriptMatch[1],url.searchParams.has('before')?url.searchParams.get('before'):undefined));return true;}
    const takeoverMatch=url.pathname.match(/^\/bibilen\/api\/sessions\/([^/]+)\/takeover$/);
    if(req.method==='POST'&&takeoverMatch){
      if(!operator){sendJson(res,403,{error:'Oturumu yalnızca yönetici devralabilir.'});return true;}
      if(executionHealth.state.status==='blocked')throw new Error(executionHealth.state.message);
      if(admission.pendingRecovery.size||admission.state().active>=admission.state().limit)throw new Error('Ortak çalışma sınırı dolu veya oturumlar kurtarılıyor.');
      const trace=await workTracker.get(takeoverMatch[1]);if(trace.members.some(m=>m.id!=='lead'&&m.liveState==='running'))throw new Error('Alt ajan çalışıyor; bittikten sonra yeniden dene.');
      sendJson(res,200,{session:await sessionManager.takeover(takeoverMatch[1])});return true;
    }
    const sessionStopMatch=url.pathname.match(/^\/bibilen\/api\/sessions\/([^/]+)\/stop$/);
    if(req.method==='POST'&&sessionStopMatch){sessionManager.stopOwned(sessionStopMatch[1]);sendJson(res,200,{ok:true});return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/execution-check'){
      sendJson(res,200,{execution:await executionHealth.check()});return true;
    }
    if(req.method==='POST'&&url.pathname==='/bibilen/api/tasks'){
      runtime.policy.assertNewWork();
      if(executionHealth.state.status==='blocked'){sendJson(res,409,{error:executionHealth.state.message});return true;}
      const task=taskManager.create(await readJson(req));sendJson(res,201,{task});return true;
    }
    const stopMatch=url.pathname.match(/^\/bibilen\/api\/tasks\/([^/]+)\/stop$/);
    if(req.method==='POST'&&stopMatch){sendJson(res,200,{task:await taskManager.stopTask(stopMatch[1])});return true;}
    const logMatch=url.pathname.match(/^\/bibilen\/api\/tasks\/([^/]+)\/logs$/);
    if(req.method==='GET'&&logMatch){
      const task=taskManager.get(logMatch[1]);if(!task){sendJson(res,404,{error:'Görev bulunamadı.'});return true;}
      sendJson(res,200,{logs:await taskManager.logs(task)});return true;
    }
    if(req.method==='POST'&&url.pathname==='/bibilen/api/settings'){
      sendJson(res,200,{settings:taskManager.updateSettings(await readJson(req))});return true;
    }
    if(req.method==='POST'&&url.pathname==='/bibilen/api/notifications/test'){await pushManager.send({id:'notification-test-'+Date.now(),status:'completed',title:'Bildirim bağlantısı testi',noticeId:'notification-test-'+Date.now(),isTest:true});sendJson(res,200,pushManager.state());return true;}
    if(req.method==='GET'&&url.pathname==='/bibilen/api/notifications'){const state=url.searchParams.get('scope')==='all'?accountPush.state():pushManager.state();sendJson(res,200,operator?state:{...state,items:state.items.filter(n=>n.source!=='slack')});return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/notifications/delivery'){sendJson(res,200,pushManager.updateDelivery(await readJson(req)));return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/notifications/preferences'){sendJson(res,200,pushManager.updatePreferences(await readJson(req)));return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/notifications/read'){const input=await readJson(req);sendJson(res,200,(url.searchParams.get('scope')==='all'?accountPush:pushManager).markRead(input.id));return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/push-status'){const input=await readJson(req);sendJson(res,200,{registered:pushManager.registered(input.endpoint)});return true;}
    if(req.method==='POST'&&url.pathname==='/bibilen/api/push-unsubscribe'){const input=await readJson(req);pushManager.unsubscribe(input.endpoint);sendJson(res,200,{ok:true});return true;}
    if(req.method==='GET'&&url.pathname==='/bibilen/api/push-key'){
      sendJson(res,200,{publicKey:pushManager.publicKey()});return true;
    }
    if(req.method==='POST'&&url.pathname==='/bibilen/api/push-subscriptions'){
      pushManager.subscribe(await readJson(req));sendJson(res,201,{ok:true});return true;
    }
    sendJson(res,404,{error:'Bulunamadı.'});return true;
  }catch(error){sendJson(res,400,{error:error?.message??'İşlem tamamlanamadı.'});return true;}
}
const server=http.createServer(async(req,res)=>{
  if(req.url?.startsWith('/bibilen/guard/check?')&&req.method==='POST'){try{const u=new URL(req.url,'http://localhost');const r=getRuntime(u.searchParams.get('workspaceId'));if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!r.guard.authenticates(String(req.headers.authorization??'').replace(/^Bearer /,''))){sendJson(res,403,{error:'Forbidden'});return;}sendJson(res,200,await r.guard.check(await readJson(req)));}catch{sendJson(res,400,{error:'Guard unavailable'});}return;}
  if(!validHost(req.headers.host)){res.writeHead(403);res.end('Forbidden host');return;}
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname.startsWith('/bibilen/api/')){if(!authorizedRequest(req.headers,req.method)){sendJson(res,403,{error:'İstek kaynağına izin verilmiyor.'});return;}await handleApi(req,res,url);return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(403);res.end('Use authenticated office API');return;}
  const proxy=http.request({hostname:'127.0.0.1',port:nativePort,path:req.url,method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode??502,up.headers);up.pipe(res);});
  proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end('Ofis hazırlanıyor. Birkaç saniye sonra yenile.');});req.pipe(proxy);
});
server.on('upgrade',(req,socket,head)=>{
  let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{socket.destroy();return;}
  if(!validHost(req.headers.host)||!validOrigin(req.headers)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  try{req.bibilenRuntime=getRuntime(workspaceScope(new URL(req.url,'http://localhost'),req.headers,defaultWorkspace.id));}catch{socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}
  const {controller,taskManager}=req.bibilenRuntime;
  if(path==='/bibilen-session-terminal'){
    if(!authorizedControl(req.headers)||!accessPolicy.canWrite(req.headers)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    req.bibilenSessionId=new URL(req.url,'http://localhost').searchParams.get('id');
    sessionWss.handleUpgrade(req,socket,head,ws=>sessionWss.emit('connection',ws,req));return;
  }
  if(path==='/bibilen-terminal'){
    if(!authorizedControl(req.headers)||!accessPolicy.canWrite(req.headers)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    if(controller){socket.end('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));return;
  }
  if(path==='/bibilen-task-terminal'){
    if(!authorizedControl(req.headers)||!accessPolicy.canWrite(req.headers)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    const taskId=new URL(req.url,'http://localhost').searchParams.get('id');
    if(!taskId||!taskManager.get(taskId)){socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}
    req.bibilenTaskId=taskId;
    taskWss.handleUpgrade(req,socket,head,ws=>taskWss.emit('connection',ws,req));return;
  }
  if(path!=='/ws'||!validHost(req.headers.host)){socket.destroy();return;}
  if(!validOrigin(req.headers)){socket.destroy();return;}
  req.bibilenViewer=!accessPolicy.canWrite(req.headers);
  officeSockets.handleUpgrade(req,socket,head,ws=>officeSockets.emit('connection',ws,req));
});
async function recoverPresence(runtime){
 const {presenceSocket,sessionManager}=runtime;
 if(runtime.presenceBusy||presenceSocket?.readyState!==WebSocket.OPEN)return;runtime.presenceBusy=true;
 try{const inventory=await sessionManager.inventory();const sessions=presenceInventory(inventory,sessionManager);if(sessions!==null&&presenceSocket?.readyState===WebSocket.OPEN)presenceSocket.send(JSON.stringify({type:'bibilenSyncSessions',sessions}));}catch{}finally{runtime.presenceBusy=false;}
}
function connectPresence(runtime){
 if(stopping)return;const socket=new WebSocket(`ws://127.0.0.1:${runtime.port}/ws`);runtime.presenceSocket=socket;
 socket.on('open',()=>void recoverPresence(runtime));
 socket.on('message',raw=>{try{const message=JSON.parse(String(raw));runtime.workTracker.observeNative(message);runtime.sessionNotices.observeNative(message);}catch{}});
 socket.on('error',()=>{});socket.on('close',()=>{if(!stopping&&!runtime.nativeFailed)setTimeout(()=>connectPresence(runtime),2000).unref();});
}
const presenceTimer=setInterval(()=>{for(const runtime of runtimes.values())void recoverPresence(runtime);},5000);
server.listen(gatewayPort,'127.0.0.1',()=>console.log('BiBilen office gateway: http://127.0.0.1:3100 (private Tailscale access)'));
function stop(){if(stopping)return;stopping=true;clearInterval(backupTimer);clearInterval(presenceTimer);clearInterval(noticeTimer);clearInterval(slackTimer);clearInterval(dailyTimer);for(const r of runtimes.values()){r.presenceSocket?.close();r.taskManager.stopPolling();r.sessionManager.close();r.terminal?.kill();for(const attached of r.taskTerminals.values())attached.kill();r.native.kill('SIGTERM');}server.close();setTimeout(()=>process.exit(0),1000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
