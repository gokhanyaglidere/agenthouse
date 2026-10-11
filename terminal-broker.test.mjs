import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {TerminalBroker} from './terminal-broker.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('PTY survives gateway disconnect and reconnects to same pid with replay; explicit stop removes broker',async t=>{
 const dir=mkdtempSync('/tmp/bb-terminal-');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const broker=new TerminalBroker({cwd:process.cwd(),command:process.execPath,storageDir:dir});
 const id='11111111-1111-4111-8111-111111111111';
 // Node consumes later arguments as script arguments, mirroring Claude's session flag.
 const terminal=broker.create(['-e',"process.stdin.on('data',d=>process.stdout.write('ECHO:'+d));console.log('READY');setInterval(()=>{},1000)",'--','--session-id',id]);
 t.after(()=>terminal.kill());const ready=await new Promise((r,j)=>{terminal.once('ready',r);terminal.once('exit',j);});let data='';terminal.onData(x=>data+=x);await delay(150);assert.match(data,/READY/);terminal.write('before\n');await delay(100);terminal.disconnect();
 const recovered=await broker.recover();assert.equal(recovered.length,1);const resumed=recovered[0].terminal;t.after(()=>resumed.kill());assert.equal(resumed.pid,ready.pid);let replay='';resumed.onData(x=>replay+=x);await delay(100);assert.match(replay,/before/);resumed.write('after\n');await delay(100);assert.match(replay,/after/);
 const exit=new Promise(r=>resumed.once('exit',r));resumed.kill();await exit;await delay(100);assert.equal((await broker.recover()).length,0);
});

test('workspace identity is reported by PTY worker and foreign brokers are refused on recovery',async t=>{
 const dir=mkdtempSync('/tmp/bb-scoped-pty-');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const context={cwd:process.cwd(),workspaceId:'workspace-a',projectId:'project-a',assertValid(){}};
 const broker=new TerminalBroker({context,command:process.execPath,storageDir:dir});
 const terminal=broker.create(['-e',"setInterval(()=>{},1000)",'--','--session-id','22222222-2222-4222-8222-222222222222']);
 const ready=await new Promise((r,j)=>{terminal.once('ready',r);terminal.once('exit',j);});assert.equal(ready.workspaceId,'workspace-a');t.after(()=>{try{process.kill(ready.pid,'SIGTERM');}catch{}});terminal.disconnect();
 const foreign=new TerminalBroker({context:{...context,workspaceId:'workspace-b'},command:process.execPath,storageDir:dir});assert.equal((await foreign.recover()).length,0);
 let recovered=[];for(let attempt=0;attempt<10&&!recovered.length;attempt++){await delay(20);recovered=await broker.recover();}assert.equal(recovered.length,1);const resumed=recovered[0].terminal;t.after(()=>resumed.kill());assert.equal(resumed.pid,ready.pid);const exit=new Promise(r=>resumed.once('exit',r));resumed.kill();await exit;
});
