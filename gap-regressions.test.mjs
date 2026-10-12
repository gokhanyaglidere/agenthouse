import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TaskManager} from './task-manager.mjs';
import {SessionManager} from './session-manager.mjs';
import {ProjectRegistry} from './project-registry.mjs';
import {Admission} from './workspace-services.mjs';
import {runCli} from './cli-command.mjs';
import {resolveSession} from './session-identity.mjs';
import {protectedRuntimeWrite,protectedRuntimePaths,runtimeRoot} from './protected-runtime.mjs';
import {ToolGuard} from './tool-guard.mjs';
function temp(t){const dir=mkdtempSync(join(tmpdir(),'house-gap-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
test('runtime trust boundary covers bootstrap, access and worker sources',()=>{
 for(const file of ['server.mjs','access-policy.mjs','observer-sharing.mjs','terminal-worker.mjs','protected-runtime.mjs','start.sh','package.json','node_modules/example/index.js'])assert.equal(protectedRuntimeWrite(join(runtimeRoot,file)),true,file);
 assert.equal(protectedRuntimeWrite(join(runtimeRoot,'webview-ui/src/main.tsx')),false);
 assert.equal(protectedRuntimeWrite('/tmp/server.mjs'),false);
 assert.ok(protectedRuntimePaths().includes(join(runtimeRoot,'terminal-worker.mjs')));
});
test('old hook revision cannot run Bash even with current policy',async t=>{
 const dir=temp(t),guard=new ToolGuard({cwd:dir,path:join(dir,'guard.json'),policy:{state:()=>({toolMode:'guarded',deniedPaths:[],deniedTools:[]})}});
 const result=await guard.check({tool_name:'Bash',tool_input:{command:'echo hi'},guard_policy_revision:null});assert.equal(result.decision,'deny');assert.equal(guard.state().pending.length,0);
});
test('colliding Claude project folders do not expose or resume foreign history',async t=>{
 const dir=temp(t),root=join(dir,'transcripts');mkdirSync(root);const id='12345678-1234-4234-8234-123456789012';
 writeFileSync(join(root,id+'.jsonl'),JSON.stringify({cwd:'/project_a',type:'user',message:{content:'private'}})+'\n');let launches=0;
 const m=new SessionManager({cwd:'/project-a',root,storePath:join(dir,'saved.json'),allowedRoles:new Set(['chief']),listAgents:async()=>[],spawnTerminal:()=>launches++});
 assert.equal((await m.list()).sessions.length,0);await assert.rejects(m.transcript(id));await assert.rejects(m.connect(id,{}));assert.equal(launches,0);
 rmSync(join(root,id+'.jsonl'));const foreign=join(dir,'foreign.jsonl');writeFileSync(foreign,JSON.stringify({cwd:'/project-a'}));symlinkSync(foreign,join(root,id+'.jsonl'));assert.equal((await m.list()).sessions.length,0);
});
test('retention keeps old active tasks across restart and corrupt state is preserved',t=>{
 const dir=temp(t),storePath=join(dir,'tasks.json'),make=()=>new TaskManager({cwd:dir,storePath,claudePath:'unused',allowedRoles:new Set(['chief'])});const m=make();
 m.data.tasks=[...Array.from({length:300},(_,i)=>({id:'done'+i,status:'completed',createdAt:1000-i})),{id:'old-live',status:'running',createdAt:1,sessionId:'deadbeef'},{id:'old-queue',status:'queued',createdAt:0}];m.save();
 const recovered=make();assert.equal(recovered.data.tasks.length,252);assert.equal(recovered.get('old-live').sessionId,'deadbeef');assert.equal(recovered.get('old-queue').status,'queued');
 recovered.schedule=async()=>{};recovered.data.tasks=Array.from({length:250},(_,i)=>({id:String(i),status:'queued'}));assert.throws(()=>recovered.create({title:'New work',prompt:'A valid prompt'}));
 writeFileSync(storePath,'broken');assert.throws(make);assert.equal(readFileSync(storePath,'utf8'),'broken');
});
test('registry ignores legacy abandoned lock and recovers stale real lock',t=>{
 const dir=temp(t),root=join(dir,'repo');mkdirSync(root);const path=join(dir,'projects.json'),registry=new ProjectRegistry({path,storageRoot:dir});registry.register({name:'Test',path:root});
 writeFileSync(path+'.lock','');assert.ok(registry.register({name:'Test',path:root}));mkdirSync(path+'.write-lock');const old=new Date(Date.now()-60000);utimesSync(path+'.write-lock',old,old);assert.ok(registry.register({name:'Test',path:root}));
});
test('stuck CLI and oversized output resolve without blocking later commands',async()=>{
 const stuck=await runCli(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:100});assert.equal(stuck.timedOut,true);
 const huge=await runCli(process.execPath,['-e',"process.stdout.write('x'.repeat(10000))"],{maxOutputBytes:100});assert.equal(huge.outputLimited,true);assert.equal(huge.stdout.length,0);
 const next=await runCli(process.execPath,['-e',"console.log('ok')"]);assert.equal(next.code,0);assert.equal(next.stdout.trim(),'ok');
});
test('live task identity resolves short IDs and refuses ambiguous prefixes',()=>{
 const a={id:'deadbeef-1111-2222-3333-444444444444'},b={id:'deadbeef-9999-2222-3333-444444444444'};assert.equal(resolveSession([a],{sessionId:'deadbeef'}),a);assert.equal(resolveSession([a,b],{sessionId:a.id}),a);assert.throws(()=>resolveSession([a,b],{sessionId:'deadbeef'}));assert.equal(resolveSession([a],{sessionId:'badbadba'}),null);
});
test('write leases serialize one folder but allow separate projects and task attachment',()=>{
 const gate=new Admission({limit:3});gate.reserve('a','/a');assert.throws(()=>gate.reserve('a2','/a'));gate.reserve('b','/b');gate.release('a');
 const m={cwd:'/a',data:{tasks:[{id:'task',status:'running'}],settings:{maxConcurrent:3}},launching:new Set()};gate.add(m);gate.reserveControl('attach','/a','task');assert.equal(gate.active(),2);assert.throws(()=>gate.reserveControl('attach2','/a','task'));assert.throws(()=>gate.reserve('new','/a'));gate.releaseControl('attach');m.data.tasks[0].status='completed';gate.reserve('new','/a');assert.equal(gate.active(),2);
});
