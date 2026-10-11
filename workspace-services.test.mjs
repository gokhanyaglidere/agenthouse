import test from 'node:test';import assert from 'node:assert/strict';
import {Admission,ScopedPush,SlackCoordinator,workspaceScope} from './workspace-services.mjs';
function manager(tasks=[]){return {data:{tasks,settings:{maxConcurrent:3}},launching:new Set()};}
test('account admission prevents two workspaces multiplying job slots',()=>{
 const admission=new Admission({limit:1});const a=manager([{id:'a',status:'queued',priority:'normal',createdAt:1}]),b=manager([{id:'b',status:'queued',priority:'normal',createdAt:2}]);admission.add(a);admission.add(b);
 assert.equal(admission.canLaunch(b,b.data.tasks[0]),false);assert.equal(admission.canLaunch(a,a.data.tasks[0]),true);
 a.launching.add('a');a.data.tasks[0].status='starting';assert.equal(admission.active(),1);assert.equal(admission.canLaunch(b,b.data.tasks[0]),false);assert.throws(()=>admission.reserve('session'),/sınırı/);
 a.launching.clear();a.data.tasks[0].status='completed';admission.reserve('session');assert.equal(admission.canLaunch(b,b.data.tasks[0]),false);admission.release('session');assert.equal(admission.canLaunch(b,b.data.tasks[0]),true);
});
test('conflicting scope sources never silently choose another project',()=>{
 assert.throws(()=>workspaceScope(new URL('http://local/?workspaceId=a'),{'x-workspace-id':'b'},'default'),/çelişiyor/);
 assert.throws(()=>workspaceScope(new URL('http://local/?workspaceId='),{},'default'),/geçersiz/);
 assert.equal(workspaceScope(new URL('http://local/'),{},'default'),'default');
});
test('scoped notifications keep legacy records in default project and preserve device identity',async()=>{
 const push={items:[{id:'old'},{id:'a',workspaceId:'a'},{id:'b',workspaceId:'b'}],state(){return {items:this.items,devices:2};},save(){},send(task){this.sent=task;},publicKey(){return 'original';}};
 const a=new ScopedPush(push,{workspaceId:'a',projectId:'project-a',projectName:'A'},{legacy:true}),b=new ScopedPush(push,{workspaceId:'b',projectId:'project-b',projectName:'B'});
 assert.deepEqual(a.state().items.map(n=>n.id),['old','a']);assert.deepEqual(b.state().items.map(n=>n.id),['b']);assert.equal(a.publicKey(),b.publicKey());assert.equal(b.state().devices,2);
 a.markRead();assert.equal(push.items[2].read,undefined);assert.throws(()=>b.markRead('a'),/bulunamadı/);
 await b.send({id:'task',status:'completed'});assert.equal(push.sent.workspaceId,'b');
});
test('Slack coordinator backs off all projects rather than polling per-project quotas',async()=>{
 let now=1000,calls=0;const c=new SlackCoordinator({now:()=>now});
 const hub=()=>({channels:new Map([['channel',{}]]),retryAt:0,state:()=>({status:'connected'}),async poll(){calls++;this.retryAt=now+120000;},async configure(){calls++;}});
 const a=c.add(hub()),b=c.add(hub());await a.poll();await b.poll();assert.equal(calls,1);await assert.rejects(b.configure({}),/bekliyor/);now+=120001;await b.poll();assert.equal(calls,2);
});
