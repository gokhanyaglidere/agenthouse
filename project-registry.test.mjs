import lockfile from 'proper-lockfile';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,renameSync,symlinkSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectRegistry} from './project-registry.mjs';
import {TaskManager} from './task-manager.mjs';

function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'bb-projects-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const a=join(root,'a'),b=join(root,'b');mkdirSync(a);mkdirSync(b);
 const path=join(root,'private','projects.json'),storageRoot=join(root,'private');
 return {root,a,b,path,storageRoot,registry:new ProjectRegistry({path,storageRoot})};
}
test('stable project identities, aliases and private metadata survive restart',t=>{
 const f=fixture(t),a=f.registry.register({name:'A',path:f.a}),b=f.registry.register({name:'B',path:f.b});
 assert.notEqual(a.projectId,b.projectId);assert.notEqual(a.id,b.id);
 const alias=join(f.root,'alias');symlinkSync(f.a,alias);
 assert.equal(f.registry.register({name:'Alias',path:alias}).id,a.id);
 const recovered=new ProjectRegistry(f);assert.equal(recovered.context(a.id).workspaceId,a.id);
 assert.equal(statSync(f.path).mode&0o777,0o600);
 assert.equal(recovered.publicState().workspaces[0].root,undefined);
 assert.throws(()=>recovered.context('unknown'),/Bilinmeyen/);
});
test('two task stores cannot mix records or accept client scope overrides',t=>{
 const f=fixture(t);
 const ca=f.registry.context(f.registry.register({name:'A',path:f.a}).id);
 const cb=f.registry.context(f.registry.register({name:'B',path:f.b}).id);
 function manager(context){const m=new TaskManager({context,claudePath:'unused',allowedRoles:new Set(context.roles)});m.schedule=async()=>{};return m;}
 const ma=manager(ca),mb=manager(cb);
 const task=ma.create({title:'Project A task',prompt:'Do fixture work',workspaceId:cb.workspaceId,projectId:cb.projectId});
 mb.create({title:'Project B task',prompt:'Do fixture work'});
 assert.equal(task.workspaceId,ca.workspaceId);assert.equal(mb.get(task.id),null);
 assert.equal(manager(ca).get(task.id).projectId,ca.projectId);
 assert.notEqual(ca.taskStorePath,cb.taskStorePath);assert.notEqual(ca.sessionStorePath,cb.sessionStorePath);assert.notEqual(ca.terminalRoot,cb.terminalRoot);
 assert.ok(Object.isFrozen(ca));assert.ok(Object.isFrozen(ca.roles));
});
test('replaced root blocks queued execution and no process is invoked',async t=>{
 const f=fixture(t),ctx=f.registry.context(f.registry.register({name:'A',path:f.a}).id);
 let calls=0;const m=new TaskManager({context:ctx,claudePath:'unused',allowedRoles:new Set(['chief']),runCommand:async()=>{calls++;}});m.schedule=async()=>{};
 const task=m.create({title:'Queued task',prompt:'Fixture work'});
 renameSync(f.a,f.a+'-old');mkdirSync(f.a);
 await m.launchReserved(task);assert.equal(calls,0);assert.equal(task.status,'failed');assert.match(task.error,/kimliği/);
 assert.throws(()=>m.create({title:'New task',prompt:'Fixture work'}),/kimliği/);
});
test('legacy binding preserves IDs, status and native session identity',t=>{
 const f=fixture(t),ctx=f.registry.context(f.registry.register({name:'BiBilen',path:f.a,legacy:true}).id);
 writeFileSync(ctx.taskStorePath,JSON.stringify({tasks:[{id:'original',status:'running',sessionId:'native-session'}]}));
 new TaskManager({context:ctx,claudePath:'unused',allowedRoles:new Set(['chief'])});
 const record=JSON.parse(readFileSync(ctx.taskStorePath,'utf8')).tasks[0];
 assert.equal(record.id,'original');assert.equal(record.sessionId,'native-session');assert.equal(record.status,'running');assert.equal(record.workspaceId,ctx.workspaceId);
});
test('malformed existing registry fails closed without overwriting it',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'private'));writeFileSync(f.path,'broken');
 assert.throws(()=>new ProjectRegistry(f));assert.equal(readFileSync(f.path,'utf8'),'broken');
});

test('session inventories reject another workspace even with a real native UUID',async t=>{
 const {SessionManager}=await import('./session-manager.mjs');
 const f=fixture(t),a=f.registry.context(f.registry.register({name:'A',path:f.a}).id),b=f.registry.context(f.registry.register({name:'B',path:f.b}).id);
 const options={allowedRoles:new Set(['chief']),listAgents:async()=>[],spawnTerminal:()=>{throw new Error('No process expected');}};
 const sa=new SessionManager({...options,cwd:a.cwd,context:a}),sb=new SessionManager({...options,cwd:b.cwd,context:b});
 const s=sa.create({title:'Project A conversation',workspaceId:b.workspaceId});
 assert.equal(s.workspaceId,a.workspaceId);
 assert.equal((await sb.list()).sessions.length,0);
 await assert.rejects(sb.known(s.id),/Bu projede/);
});

test('foreign task binding cannot launch through the current workspace runner',async t=>{
 const f=fixture(t),ctx=f.registry.context(f.registry.register({name:'A',path:f.a}).id);
 let calls=0;const m=new TaskManager({context:ctx,claudePath:'unused',allowedRoles:new Set(['chief']),runCommand:async()=>{calls++;}});m.schedule=async()=>{};
 const task=m.create({title:'Fixture task',prompt:'Fixture instruction'});task.workspaceId='foreign';
 await m.launchReserved(task);assert.equal(calls,0);assert.equal(task.status,'failed');assert.match(task.error,/başka bir projeye/);
});

test('git worktrees share project identity with independent workspace stores',async t=>{
 const {execFileSync}=await import('node:child_process');const f=fixture(t);
 const git=args=>execFileSync('git',args,{stdio:'ignore'});
 git(['-C',f.a,'init']);git(['-C',f.a,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','fixture']);
 const worktree=join(f.root,'worktree');git(['-C',f.a,'worktree','add','--detach',worktree]);
 const a=f.registry.register({name:'A',path:f.a}),w=f.registry.register({name:'A worktree',path:worktree});
 assert.equal(a.projectId,w.projectId);assert.notEqual(a.id,w.id);
 assert.notEqual(f.registry.context(a.id).taskStorePath,f.registry.context(w.id).taskStorePath);
});

test('separate registry instances serialize updates without dropping a project',t=>{
 const f=fixture(t),other=new ProjectRegistry(f);
 const a=f.registry.register({name:'A',path:f.a});other.register({name:'B',path:f.b});
 assert.equal(f.registry.publicState().projects.length,2);assert.equal(other.context(a.id).projectId,a.projectId);
 const release=lockfile.lockSync(f.path,{realpath:false,lockfilePath:f.path+'.write-lock',stale:30000});try{assert.throws(()=>f.registry.register({name:'A',path:f.a}),/başka bir işlemde/);}finally{release();}
});
test('portable profiles preserve existing instructions and refuse external agent directories',async t=>{
 const {installProjectProfiles}=await import('./project-onboarding.mjs');const f=fixture(t);
 const dir=join(f.a,'.claude','agents');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'project-engineer.md'),'owner instructions');
 const result=installProjectProfiles(f.a);assert.ok(result.preserved.includes('project-engineer'));assert.equal(readFileSync(join(dir,'project-engineer.md'),'utf8'),'owner instructions');
 symlinkSync(f.a,join(f.b,'.claude'));assert.throws(()=>installProjectProfiles(f.b),/proje dışına/);
});
