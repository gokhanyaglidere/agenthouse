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
