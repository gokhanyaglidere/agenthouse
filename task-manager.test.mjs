import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanAnsi, inferStage, stateFromAgent, validateTaskInput, claudeFailure, TaskManager } from './task-manager.mjs';

const roles = new Set(['chief', 'senior-backend']);

test('an idle session with a subscription error never becomes a completed task', async()=>{
  const task={id:'test',sessionId:'deadbeef',status:'running',stage:'working',sessionName:'probe'};
  const manager=Object.create(TaskManager.prototype);
  manager.data={tasks:[task],events:[]};manager.save=()=>{};manager.schedule=async()=>{};
  manager.onNotice=async()=>{};
  manager.listAgents=async()=>[{id:'deadbeef',status:'idle',state:'done'}];
  manager.logs=async()=>JSON.stringify({type:'result',is_error:true,api_error_code:'oauth_not_allowed_for_organization'});
  await manager.tick();
  assert.equal(task.status,'failed');assert.equal(task.stage,'failed');
  assert.ok(task.completedAt);assert.match(task.error,/organizasyon/);
  assert.equal(manager.data.events.some(e=>e.type==='completed'),false);
});

test('a Claude subscription rejection is a failure even when the CLI says success', () => {
  assert.match(claudeFailure(JSON.stringify({type:'result',subtype:'success',is_error:true,api_error_code:'oauth_not_allowed_for_organization',result:'Your organization has disabled Claude subscription access for Claude Code'})), /organizasyon/);
  assert.match(claudeFailure('Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead'), /organizasyon/);
  assert.equal(claudeFailure(JSON.stringify({type:'result',is_error:false,result:'Görev tamamlandı.'})), null);
  assert.equal(claudeFailure('Read source and fix an error in the component.'), null);
});

test('task input is bounded and role checked', () => {
  assert.deepEqual(validateTaskInput({ title: 'API düzelt', prompt: 'Hatanın kök nedenini bul.', role: 'senior-backend', priority: 'high' }, roles), {
    title: 'API düzelt', prompt: 'Hatanın kök nedenini bul.', role: 'senior-backend', priority: 'high',
  });
  assert.throws(() => validateTaskInput({ title: 'İş', prompt: 'yeterli açıklama', role: 'unknown' }, roles));
});

test('claude background states map to the task board', () => {
  assert.equal(stateFromAgent({ status: 'busy', state: 'running' }), 'running');
  assert.equal(stateFromAgent({ status: 'idle', state: 'blocked' }), 'waiting');
  assert.equal(stateFromAgent({ status: 'idle', state: 'ready' }), 'waiting');
  assert.equal(stateFromAgent(null), null);
});

test('terminal output is stripped before history storage', () => {
  assert.equal(cleanAnsi('\u001b[31mHata\u001b[0m\r\nAçıklama'), 'Hata\nAçıklama');
});

test('current work phase is inferred from Claude output', () => {
  assert.equal(inferStage('Read package.json then Search the source'), 'researching');
  assert.equal(inferStage('Apply patch and implement the component'), 'coding');
  assert.equal(inferStage('Run vitest and typecheck'), 'testing');
  assert.equal(inferStage('Thinking through the next step'), 'working');
});

const deferred = () => { let resolve; const promise=new Promise(r=>{resolve=r}); return {promise,resolve}; };
function fixture(tasks=[], runCommand=async()=>({code:0,stdout:'',stderr:''})) {
 const m=Object.create(TaskManager.prototype);
 m.data={tasks,events:[],settings:{maxConcurrent:3}};m.launching=new Set();
 m.save=()=>{};m.onNotice=async()=>{};m.runCommand=runCommand;
 m.cwd='/tmp';m.claudePath='claude';return m;
}
const job=(overrides={})=>({id:'a',role:'senior-backend',prompt:'Inspect only',priority:'normal',createdAt:1,status:'running',stage:'working',sessionId:'deadbeef',sessionName:'owned-job',...overrides});
test('official background states take precedence over process status',()=>{
 for(const [state,expected] of [['working','running'],['blocked','waiting'],['done','completed'],['failed','failed'],['stopped','stopped']])
  assert.equal(stateFromAgent({state,status:'idle'}),expected);
 assert.equal(stateFromAgent({status:'idle'}),'waiting');
 assert.equal(stateFromAgent({state:'unknown'}),null);
});
test('short session IDs match full identities and stopped jobs release capacity',async()=>{
 const task=job();const m=fixture([task]);m.schedule=async()=>{};
 m.listAgents=async()=>[{sessionId:'deadbeef-1111-2222-3333-444444444444',state:'stopped'}];m.logs=async()=>'';
 await m.tick();assert.equal(task.status,'stopped');assert.ok(task.completedAt);
});
test('stopping during launch cannot resurrect a job and stops its late session',async()=>{
 const pending=deferred(),calls=[];const task=job({status:'queued',sessionId:null});
 const m=fixture([task],async(_,args)=>{calls.push(args);return args[0]==='--bg'?pending.promise:{code:0,stdout:'',stderr:''}});
 m.schedule=async()=>{};const launch=m.launch(task);await m.stopTask(task.id);
 pending.resolve({code:0,stdout:'backgrounded · deadbeef',stderr:''});await launch;
 assert.equal(task.status,'stopped');assert.ok(calls.some(a=>a[0]==='stop'&&a[1]==='deadbeef'));
 assert.equal(m.launching.size,0);
});
test('failed CLI stop does not pretend a running job was stopped',async()=>{
 const task=job();const m=fixture([task],async()=>({code:1,stdout:'',stderr:'cannot stop'}));
 await assert.rejects(m.stopTask(task.id),/cannot stop/);assert.equal(task.status,'running');
});
test('an inflight start keeps the workspace reserved until it finishes',async()=>{
 const starting=job({status:'starting',sessionId:null});const queued=job({id:'b',status:'queued',sessionId:null});const another=job({id:'c',status:'queued',sessionId:null});
 const m=fixture([starting,queued,another]);m.launching.add(starting.id);const seen=[];m.launch=async t=>seen.push(t.id);
 await m.schedule();assert.deepEqual(seen,[]);
});
test('polls coalesce and cannot overwrite a stop while awaiting logs',async()=>{
 const task=job(),pending=deferred();const m=fixture([task]);m.schedule=async()=>{};
 let lists=0;m.listAgents=async()=>{lists++;return[{id:'deadbeef',state:'done'}]};m.logs=async()=>pending.promise;
 const poll=m.tick();await Promise.resolve();const second=m.tick();await m.stopTask(task.id);
 pending.resolve('completed output');await Promise.all([poll,second]);
 assert.equal(lists,1);assert.equal(task.status,'stopped');
});
test('unavailable session inventory never fabricates completion',async()=>{
 const task=job();const m=fixture([task]);m.schedule=async()=>{};m.listAgents=async()=>null;
 await m.tick();assert.equal(task.status,'running');
});

test('cancelled inflight launches retain capacity until late stop is confirmed',async()=>{
 const pending=deferred(),lateStop=deferred(),starts=[];
 const a=job({status:'queued',sessionId:null}),b=job({id:'b',status:'queued',sessionId:null});
 const m=fixture([a,b],async(_,args)=>{
  if(args[0]==='stop')return lateStop.promise;
  starts.push(args);return starts.length===1?pending.promise:{code:0,stdout:'backgrounded · cafebabe',stderr:''};
 });m.data.settings.maxConcurrent=1;
 const first=m.schedule();await m.stopTask(a.id);
 assert.equal(starts.length,1);assert.equal(b.status,'queued');
 pending.resolve({code:0,stdout:'backgrounded · deadbeef',stderr:''});await Promise.resolve();await Promise.resolve();
 await m.schedule();assert.equal(starts.length,1);
 lateStop.resolve({code:1,stdout:'',stderr:'cannot stop'});await first;
 assert.equal(a.status,'waiting');assert.equal(b.status,'queued');assert.equal(starts.length,1);
});
test('notification outages do not undo completed task state',async()=>{
 const task=job(),m=fixture([task]);m.schedule=async()=>{};
 m.onNotice=async()=>{throw Error('push unavailable')};m.listAgents=async()=>[{id:'deadbeef',state:'done'}];m.logs=async()=> 'Finished';
 await m.tick();assert.equal(task.status,'completed');assert.ok(task.completedAt);
});

test('a hanging push notification never blocks queued work or later polls',async()=>{
 const task=job(),queued=job({id:'b',status:'queued',sessionId:null});const m=fixture([task,queued]);m.data.settings.maxConcurrent=1;
 m.onNotice=()=>new Promise(()=>{});m.listAgents=async()=>[{id:'deadbeef',state:'done'}];m.logs=async()=> 'Finished';
 m.runCommand=async()=>({code:0,stdout:'backgrounded · cafebabe',stderr:''});
 await m.tick();assert.equal(task.status,'completed');assert.equal(queued.status,'running');
 await m.tick();assert.equal(m.pollPromise,null);
});

test('startup recovery reconnects a persisted starting job by its unique name',async()=>{
 const task=job({status:'starting',sessionId:null}),m=fixture([task]);m.schedule=async()=>{};
 m.listAgents=async()=>[{id:null,sessionId:'unrelated',name:'other-project',status:'idle'},{id:'deadbeef',name:task.sessionName,state:'working'}];m.logs=async()=> 'Read sources';
 await m.tick();assert.equal(task.sessionId,'deadbeef');assert.equal(task.status,'running');
});
test('stop-in-progress flags never enter persisted task data',async()=>{
 const task=job(),pending=deferred(),m=fixture([task],()=>pending.promise);
 const stopping=m.stopTask(task.id);assert.equal(m.stopping.has(task.id),true);assert.equal('stopping' in task,false);
 pending.resolve({code:0,stdout:'',stderr:''});await stopping;assert.equal(m.stopping.size,0);
});

test('notifications retain the status snapshot and distinct event identity across fast transitions',async()=>{const manager=Object.create(TaskManager.prototype);manager.save=()=>{};const delivered=[];manager.onNotice=snapshot=>delivered.push(snapshot);const task={id:'probe',status:'waiting'};manager.notice(task,'İzin');task.status='running';manager.notice({...task,status:'waiting'},'Yeni izin');await Promise.resolve();assert.equal(delivered[0].status,'waiting');assert.notEqual(delivered[0].noticeId,delivered[1].noticeId);});

test('unconfirmed launch recovers only unique evidence without relaunching',async()=>{
 const task=job({status:'queued',sessionId:null});const m=fixture([task],async()=>({code:-1,stdout:'',stderr:'timeout',timedOut:true}));
 await m.launchReserved(task);assert.equal(task.status,'starting');assert.equal(task.launchUnconfirmed,true);
 m.schedule=async()=>{};m.logs=async()=>'';m.listAgents=async()=>[{name:task.sessionName,id:'first',state:'working'},{name:task.sessionName,id:'second',state:'working'}];await m.tick();assert.equal(task.sessionId,null);
 m.listAgents=async()=>[{name:task.sessionName,id:'confirmed',state:'working'}];await m.tick();assert.equal(task.sessionId,'confirmed');assert.equal(task.status,'running');assert.equal(task.launchUnconfirmed,undefined);
});
test('one failed logs query cannot block another task or later polls',async()=>{
 const a=job(),b=job({id:'b',sessionId:'bbbbbbbb',sessionName:'b'}),m=fixture([a,b]);m.schedule=async()=>{};m.listAgents=async()=>[{id:'deadbeef',state:'done'},{id:'bbbbbbbb',state:'done'}];let offline=true;
 m.logs=async t=>{if(t===a&&offline)throw Error('offline');return '';};await m.tick();assert.equal(a.status,'running');assert.equal(b.status,'completed');offline=false;await m.tick();assert.equal(a.status,'completed');
});
test('project-defined chief is launched as its native definition rather than a substituted prompt',async()=>{let args;const task=job({role:'chief',status:'queued',sessionId:null}),m=fixture([task],async(_command,value)=>{args=value;return {code:0,stdout:'backgrounded · 12345678',stderr:''};});m.nativeRoles=new Set(['chief']);await m.launchReserved(task);assert.equal(args[args.indexOf('--agent')+1],'chief');assert.equal(args.at(-1),task.prompt);});
test('unknown native state cannot hide an external busy CLI from workspace admission',async()=>{const task=job({status:'queued',sessionId:null}),m=fixture([task]);m.context={assertValid(){}};m.admission={workspaceBusy:()=>false};let launches=0;m.launch=async()=>launches++;m.listAgents=async()=>[{cwd:m.cwd,state:'unknown',status:'busy'}];await m.schedule();assert.equal(launches,0);assert.match(task.queueReason,/CLI işi/);m.listAgents=async()=>[{cwd:m.cwd,state:'done',status:'busy'}];await m.schedule();assert.equal(launches,1);});
