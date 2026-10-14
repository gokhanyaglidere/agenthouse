import test from 'node:test';
import assert from 'node:assert/strict';
import {unlinkSync,readFileSync,realpathSync,mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SessionManager} from './session-manager.mjs';
import {windowsTranscriptRoot} from './host-mode.mjs';

// Windows Claude transcripts seen from a Linux/WSL host. Path mapping (D:\x <-> /mnt/d/x) only exists on Linux.
const linux = {};
const ID = '9674c6e1-7a11-4c0e-8a3f-1d2e3f4a5b6c', OTHER = '11111111-2222-4333-8444-555555555555', FRESH = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const line = (cwd, text) => JSON.stringify({type: 'user', cwd, message: {role: 'user', content: text}, timestamp: new Date().toISOString()}) + '\n';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ah-winsess-'));
  const own = join(dir, 'wsl-home-projects', '-mnt-d-proj'), win = join(dir, 'winclaude', 'projects', 'D--proj');
  mkdirSync(own, {recursive: true}); mkdirSync(join(win, ID, 'subagents'), {recursive: true});
  writeFileSync(join(win, ID + '.jsonl'), line('D:\\proj', 'Windows oturumu başlığı'));
  writeFileSync(join(win, OTHER + '.jsonl'), line('D:\\baska-proje', 'başka proje')); // same folder name collision must not leak
  writeFileSync(join(win, FRESH + '.jsonl'), line('D:\\proj', 'şimdi çalışan'));
  utimesSync(join(win, ID + '.jsonl'), new Date(Date.now() - 3600_000), new Date(Date.now() - 3600_000));
  writeFileSync(join(win, ID, 'subagents', 'agent-abc.meta.json'), '{}');
  const manager = new SessionManager({cwd: process.platform==='linux'?'/mnt/d/proj':'D:\\proj', root: own, extraRoots: [win], listAgents: async () => [], storePath: join(dir, 'store.json'), allowedRoots: new Set(['chief'])});
  return {dir, own, win, manager};
}

test('Windows transcript folder is derived from the Windows drive path', linux, () => {
  const dir = mkdtempSync(join(tmpdir(), 'ah-winroot-')); const projects = join(dir, 'projects');
  mkdirSync(join(projects, 'D--One-Line'), {recursive: true}); mkdirSync(join(projects, 'D--One-Line-ux'), {recursive: true});
  try {
    assert.equal(windowsTranscriptRoot(projects, '/mnt/d/One-Line'), realpathSync(join(projects, 'D--One-Line')));
    assert.equal(windowsTranscriptRoot(projects, '/mnt/d/One-Line-ux'), realpathSync(join(projects, 'D--One-Line-ux'))); // siblings stay separate
    assert.equal(windowsTranscriptRoot(projects, '/mnt/d/Missing'), null);
    assert.equal(windowsTranscriptRoot(projects, '/home/ahost/agenthouse'), null); // WSL-native project: not a Windows path
    assert.equal(windowsTranscriptRoot(null, '/mnt/d/One-Line'), null);
  } finally {rmSync(dir, {recursive: true, force: true});}
});

test('Windows sessions are listed read-only and scoped to the project', linux, async () => {
  const f = fixture();
  try {
    const {sessions} = await f.manager.list();
    const ids = sessions.map(s => s.id);
    assert.ok(ids.includes(ID) && ids.includes(FRESH));
    assert.ok(!ids.includes(OTHER), 'a transcript whose recorded cwd is another project must not appear');
    const old = sessions.find(s => s.id === ID), fresh = sessions.find(s => s.id === FRESH);
    assert.equal(old.origin, 'windows'); assert.equal(old.canOpen, false); assert.equal(old.status, 'history'); assert.equal(old.canStop, false);
    assert.equal(fresh.status, 'history'); assert.match(fresh.note, /yalnızca izlenebilir/);
    assert.equal(f.manager.isExternal(ID), true);
    assert.equal(f.manager.rootFor(ID), f.win);
  } finally {rmSync(f.dir, {recursive: true, force: true});}
});

test('Windows sessions cannot be resumed or taken over from the host', linux, async () => {
  const f = fixture();
  try {
    await assert.rejects(f.manager.connect(ID, {send() {}, on() {}, readyState: 1}), /yalnızca izlenebilir/);
    await assert.rejects(f.manager.takeover(ID), /yalnızca izlenebilir/);
    const t = await f.manager.transcript(ID); // reading the transcript still works
    assert.ok(Array.isArray(t.messages));
  } finally {rmSync(f.dir, {recursive: true, force: true});}
});

test('same UUID and timestamps across roots cannot reuse another project scope from cache',async()=>{
 const f=fixture();try{
  const own=join(f.own,ID+'.jsonl'),foreign=join(f.win,ID+'.jsonl');const contents=readFileSync(foreign,'utf8');
  writeFileSync(own,contents);writeFileSync(foreign,contents.replace('proj','evil'));
  for(const p of [own,foreign])utimesSync(p,new Date(0),new Date(0));
  f.manager.assertTranscript(ID);unlinkSync(own);
  assert.throws(()=>f.manager.assertTranscript(ID),/bu projeye ait değil/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('verified live mirror appears active but remains read-only and uses its mirrored transcript',async()=>{
 const f=fixture();try{
  f.manager.listAgents=async()=>[{sessionId:ID,cwd:f.manager.cwd,origin:'windows',nativeAlive:true,pid:42,kind:'interactive',state:'busy'}];
  const session=(await f.manager.list()).sessions.find(s=>s.id===ID);assert.equal(session.status,'external');assert.equal(session.activity,'busy');assert.equal(session.canOpen,false);assert.equal(session.canStop,false);assert.equal(f.manager.path(ID),join(f.win,ID+'.jsonl'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('Windows Remote Control links persist without launching or stopping a process',async()=>{
 const f=fixture();try{
  const before=readFileSync(join(f.win,ID+'.jsonl'),'utf8');
  const url='https://claude.ai/code/session_example';
  const saved=await f.manager.setRemoteControl(ID,url);assert.equal(saved.remoteControlUrl,url);assert.equal(saved.canOpen,false);
  assert.equal((await f.manager.list()).sessions.find(s=>s.id===ID).remoteControlUrl,url);
  assert.equal(readFileSync(join(f.win,ID+'.jsonl'),'utf8'),before);
  assert.equal((await f.manager.setRemoteControl(ID,'')).remoteControlUrl,null);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('Remote Control rejects foreign scopes and misleading or executable links',async()=>{
 const f=fixture();try{
  for(const url of ['javascript:alert(1)','https://claude.ai.evil/code/x','https://user:pass@claude.ai/code/x','https://claude.ai:444/code/x','https://claude.ai/settings','http://claude.ai/code/x'])await assert.rejects(f.manager.setRemoteControl(ID,url));
  await assert.rejects(f.manager.setRemoteControl(OTHER,'https://claude.ai/code/session_example'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('central gateway saves remote control per host workspace without a host software update',async()=>{
 const {HostManager,remoteWorkspaceId}=await import('./host-manager.mjs');const {Readable}=await import('node:stream');
 const f=fixture();try{
  const manager=new HostManager({hostsPath:join(f.dir,'hosts.json'),secretsPath:join(f.dir,'secrets.json')});const host='12345678',workspace='one',scope=remoteWorkspaceId(host,workspace);
  const link={info:{workspaces:[{id:workspace}]},effectiveStatus:()=> 'online',request:async input=>{assert.equal(input.method,'GET');return {status:200,body:JSON.stringify({sessions:[{id:ID,origin:'windows'}]})};}};manager.links.set(host,link);
  const invoke=async(id,url)=>{const req=Readable.from([Buffer.from(JSON.stringify({url}))]);req.method='POST';req.headers={};let status,body;await manager.proxy(req,{writeHead:n=>{status=n;},end:s=>{body=JSON.parse(s);}},new URL('http://localhost/bibilen/api/sessions/'+id+'/remote-control?workspaceId='+scope));return {status,body};};
  const result=await invoke(ID,'https://claude.ai/code/session_example');assert.equal(result.status,200);assert.equal(result.body.session.remoteControlUrl,'https://claude.ai/code/session_example');
  assert.equal((await invoke(OTHER,'https://claude.ai/code/session_example')).status,404);
  const restored=new HostManager({hostsPath:join(f.dir,'hosts.json'),secretsPath:join(f.dir,'secrets.json')});assert.equal(restored.controlLinks[scope+':'+ID],'https://claude.ai/code/session_example');assert.equal(restored.controlLinks[remoteWorkspaceId(host,'other')+':'+ID],undefined);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('idle Windows takeover uses native verification, preserves original, and resumes through owned WSL terminal',async()=>{
 const f=fixture();try{
  const original=readFileSync(join(f.win,ID+'.jsonl'),'utf8');let agents=[{sessionId:ID,cwd:f.manager.cwd,kind:'interactive',pid:42,state:'idle',origin:'windows'}],calls=0;
  f.manager.listAgents=async()=>agents;f.manager.stopExternal=()=>{throw Error('must never kill a Windows pid from WSL');};f.manager.windowsHandoff=async agent=>{assert.equal(agent.sessionId,ID);calls++;agents=[];};
  assert.equal((await f.manager.list()).sessions.find(s=>s.id===ID).canTakeover,true);
  const imported=await f.manager.takeover(ID);assert.equal(calls,1);assert.equal(imported.origin,'host');assert.equal(imported.canOpen,true);assert.equal(f.manager.saved[ID].windowsImported,true);
  assert.equal(readFileSync(join(f.win,ID+'.jsonl'),'utf8'),original);assert.equal(readFileSync(join(f.own,ID+'.jsonl'),'utf8'),original);
  let args;f.manager.spawnTerminal=a=>{args=a;return {onData(){},onExit(){},write(){},resize(){}};};
  await f.manager.connect(ID,{readyState:1,send(){},on(){}});assert.deepEqual(args.slice(0,2),['--resume',ID]);assert.ok(args.includes('--append-system-prompt'));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('busy, permission-waiting and unavailable Windows sessions cannot be stopped or imported',async()=>{
 const f=fixture();try{
  f.manager.windowsHandoff=()=>{throw Error('must not run');};
  for(const state of ['busy','working','waiting','blocked']){f.manager.listAgents=async()=>[{sessionId:ID,cwd:f.manager.cwd,kind:'interactive',pid:42,state,origin:'windows'}];await assert.rejects(f.manager.takeover(ID),/çalışıyor|izin/);assert.equal(f.manager.isExternal(ID),true);}
  f.manager.listAgents=async()=>null;await assert.rejects(f.manager.importWindows(ID),/doğrulanamadı/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('closed Windows history can transfer, but unrelated work prevents transfer without modifying either history',async()=>{
 const f=fixture();try{
  f.manager.windowsHandoff=async()=>{throw Error('closed sessions must not be stopped');};
  f.manager.listAgents=async()=>[{sessionId:FRESH,cwd:f.manager.cwd,state:'busy',kind:'interactive'}];await assert.rejects(f.manager.takeover(ID),/başka CLI/);assert.equal(f.manager.isExternal(ID),true);
  f.manager.listAgents=async()=>[];const session=await f.manager.takeover(ID);assert.equal(session.canOpen,true);
  f.manager.listAgents=async()=>[{sessionId:ID,cwd:f.manager.cwd,kind:'interactive',pid:42,state:'idle',origin:'windows'}];assert.equal((await f.manager.list()).sessions.find(s=>s.id===ID).canOpen,false);
  await assert.rejects(f.manager.connect(ID,{readyState:1,send(){},on(){}}),/yeniden açılmış/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('handoff preserves child-agent metadata and refuses overwrite and symlink imports',async()=>{
 const {importSessionHistory}=await import('./session-history-import.mjs');const {symlinkSync}=await import('node:fs');const f=fixture();try{
  const source=join(f.win,ID+'.jsonl');importSessionHistory({source,root:f.own,id:ID});assert.equal(readFileSync(join(f.own,ID,'subagents','agent-abc.meta.json'),'utf8'),'{}');
  const before=readFileSync(join(f.own,ID+'.jsonl'),'utf8');assert.throws(()=>importSessionHistory({source,root:f.own,id:ID}));assert.equal(readFileSync(join(f.own,ID+'.jsonl'),'utf8'),before);assert.equal(readFileSync(join(f.own,ID,'subagents','agent-abc.meta.json'),'utf8'),'{}');
  const alternate=join(f.dir,'symlink-dest');symlinkSync(source,join(f.dir,'source-link.jsonl'));assert.throws(()=>importSessionHistory({source:join(f.dir,'source-link.jsonl'),root:alternate,id:ID}));
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('transferred history supports real PTY input/output and broker recovery without model requests',async t=>{
 const {EventEmitter}=await import('node:events');const {TerminalBroker}=await import('./terminal-broker.mjs');
 const f=fixture();let terminal,second;try{
  const fake=join(f.dir,'echo-cli.cjs');writeFileSync(fake,"process.stdin.on('data',data=>process.stdout.write('reply:'+data.toString()));setInterval(()=>{},1000);");
  const brokerDir=mkdtempSync('/tmp/ah-handoff-');t.after(()=>rmSync(brokerDir,{recursive:true,force:true}));const broker=new TerminalBroker({cwd:f.dir,command:process.execPath,storageDir:brokerDir});
  f.manager.windowsHandoff=async()=>{};f.manager.conversationOnlyWhenBusy=true;f.manager.listAgents=async()=>[{sessionId:FRESH,cwd:f.manager.cwd,state:'busy',kind:'interactive'}];await f.manager.takeover(ID);f.manager.spawnTerminal=(args,context)=>{assert.equal(context.session.conversationOnly,true);terminal=broker.create([fake,...args]);return terminal;};
  class Socket extends EventEmitter{readyState=1;sent=[];send(data){this.sent.push(data);this.emit('output');}close(){this.readyState=3;this.emit('close');}}
  const until=async predicate=>{const end=Date.now()+6000;while(!predicate()){if(Date.now()>end)throw Error('terminal scenario timed out');await new Promise(r=>setTimeout(r,20));}};
  const ws=new Socket();await f.manager.connect(ID,ws);await until(()=>terminal.pid);assert.equal(ws.sent.some(s=>String(s).includes('\"conversationOnly\":true')),true);ws.emit('message',JSON.stringify({type:'input',data:'ping\n'}));await until(()=>ws.sent.some(s=>String(s).includes('reply:ping')));
  f.manager.close();await new Promise(r=>setTimeout(r,100));
  second=new SessionManager({cwd:f.manager.cwd,root:f.own,extraRoots:[f.win],storePath:f.manager.storePath,allowedRoles:new Set(['chief']),listAgents:async()=>[],restoreTerminals:()=>broker.recover(),spawnTerminal:()=>{throw Error('recovery must not create a duplicate process');}});
  const next=new Socket();await second.connect(ID,next);assert.equal(second.live.size,1);next.emit('message',JSON.stringify({type:'input',data:'recovered\n'}));await until(()=>next.sent.some(s=>String(s).includes('reply:recovered')));
  second.listAgents=async()=>[{sessionId:ID,cwd:second.cwd,origin:'windows',state:'idle',pid:42,kind:'interactive'}];next.emit('message',JSON.stringify({type:'input',data:'blocked\n'}));await until(()=>next.sent.some(s=>String(s).includes('"writable":false')));assert.equal(next.sent.some(s=>String(s).includes('reply:blocked')),false);
  for(const live of second.live.values())live.terminal.kill();await until(()=>second.live.size===0);
 }finally{second?.close();terminal?.kill();f.manager.close();rmSync(f.dir,{recursive:true,force:true});}
});

test('transferred sessions and their child tools fail closed if Windows is reopened or inventory is unavailable',async()=>{
 const f=fixture();try{
  f.manager.windowsHandoff=async()=>{};await f.manager.takeover(ID);f.manager.live.set(ID,{id:ID,terminal:{}});
  assert.equal(await f.manager.importedToolConflict(),null);
  f.manager.listAgents=async()=>null;assert.match(await f.manager.importedToolConflict(),/doğrulanamadı/);
  f.manager.listAgents=async()=>[{sessionId:ID,cwd:f.manager.cwd,state:'busy',kind:'interactive',origin:'windows',pid:42}];assert.match(await f.manager.importedToolConflict(),/yeniden açılmış/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
