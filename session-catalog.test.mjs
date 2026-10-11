import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {SessionCatalog} from './session-catalog.mjs';
const id='12345678-1234-4234-8234-123456789012';
test('catalog includes unregistered project histories, tracks external CLI and reads exact project transcript',async t=>{
 const root=mkdtempSync(join(tmpdir(),'bb-catalog-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const [dir,cwd,text] of [['a','/projects/a','Only A'],['b','/projects/b','Only B']]){mkdirSync(join(root,dir));writeFileSync(join(root,dir,id+'.jsonl'),JSON.stringify({type:'user',cwd,message:{content:text}})+'\n');}
 symlinkSync(join(root,'a'),join(root,'linked'));
 const catalog=new SessionCatalog({root,runtimes:new Map(),listAgents:async()=>[{cwd:'/projects/b',sessionId:id,status:'busy',kind:'interactive'}]});
 const data=await catalog.list();assert.equal(data.sessions.length,2);const b=data.sessions.find(s=>s.projectName==='b');assert.equal(b.status,'external');assert.equal(b.canOpen,false);assert.equal(data.sessions.find(s=>s.projectName==='a').status,'history');assert.equal((await catalog.transcript(b.catalogKey)).messages[0].text,'Only B');await assert.rejects(catalog.transcript('../outside'));assert.ok(data.sessions.every(s=>!('cwd' in s)));
});
test('registered workspace entries keep exact namespace and do not duplicate discovery',async()=>{
 const manager={root:'/missing/a',list:async()=>({sessions:[{id,title:'Registered',status:'open',updatedAt:1}]}),transcript:async()=>({messages:[{text:'Registered'}]})};
 const catalog=new SessionCatalog({root:'/missing',runtimes:new Map([['w',{context:{workspaceId:'w',projectName:'One'},sessionManager:manager}]]),listAgents:async()=>null});
 const data=await catalog.list();assert.equal(data.inventoryAvailable,false);assert.equal(data.sessions[0].workspaceId,'w');assert.equal(data.sessions[0].catalogKey,'w:'+id);assert.equal((await catalog.transcript('w:'+id)).messages[0].text,'Registered');
});

test('open CLI sessions without a transcript are still visible and never launched',async()=>{const catalog=new SessionCatalog({root:'/missing',runtimes:new Map(),listAgents:async()=>[{cwd:'/projects/fresh',sessionId:id,status:'idle',kind:'interactive',startedAt:1}]});const {sessions}=await catalog.list();assert.equal(sessions.length,1);assert.equal(sessions[0].hasTranscript,false);assert.equal((await catalog.transcript(sessions[0].catalogKey)).messages.length,0);});
