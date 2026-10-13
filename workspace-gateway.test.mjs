import {request as rawHttpRequest} from 'node:http';
import test from 'node:test';import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';import net from 'node:net';
const here=dirname(fileURLToPath(import.meta.url));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function waitUntil(fn){for(let n=0;n<80;n++){try{return await fn();}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Fixture gateway did not start');}
test('isolated gateway routes two real workspace contexts without crossing records',async t=>{
 const root=mkdtempSync(join(tmpdir(),'bb-gateway-')),home=join(root,'home'),a=join(root,'a'),b=join(root,'b');for(const p of [home,a,b])mkdirSync(p);
 for(const [folder,description]of [[a,'Only project A'],[b,'Only project B']]){mkdirSync(join(folder,'.claude','agents'),{recursive:true});writeFileSync(join(folder,'.claude','agents','local.md'),'---\nname: local\ndescription: '+description+'\n---\nProject instructions');}
 const privateDir=join(home,'.pixel-agents');mkdirSync(privateDir);writeFileSync(join(privateDir,'bibilen-access.json'),JSON.stringify({owners:[]}));
 const claude=join(root,'claude-fixture');writeFileSync(claude,`#!${process.execPath}\nimport fs from 'node:fs';fs.appendFileSync(${JSON.stringify(join(root,'calls.jsonl'))},JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)})+'\\n');if(process.argv.includes('agents'))console.log('[]');else if(process.argv.includes('--bg'))console.log('backgrounded · 12345678');else console.log('{}');`,{mode:0o700});
 // Executable .mjs keeps the fixture independent of any developer package type.
 const fixtureCommand=claude+'.mjs';writeFileSync(fixtureCommand,readFileSync(claude),{mode:0o700});
 const port=await freePort(),nativePort=await freePort();
 const child=spawn(process.execPath,[join(here,'server.mjs')],{cwd:here,env:{...process.env,HOME:home,BIBILEN_GATEWAY_PORT:String(port),BIBILEN_NATIVE_PORT:String(nativePort),BIBILEN_DEFAULT_CWD:a,BIBILEN_CLAUDE_PATH:fixtureCommand,BIBILEN_REMOTE_HOST:'office.example'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 t.after(async()=>{child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(child.exitCode===null)child.kill('SIGKILL');rmSync(root,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${port}`;
 async function request(path,{workspace,body,headers={}}={}){return new Promise((resolve,reject)=>{const req=rawHttpRequest(base+'/bibilen/api/'+path,{method:body?'POST':'GET',headers:{origin:base,'Content-Type':'application/json',...(workspace?{'x-workspace-id':workspace}:{}),...headers}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(text)});}catch(e){reject(e);}});});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});}

 const inventory=await waitUntil(async()=>{const r=await request('projects');if(r.status!==200)throw Error();return r.body;});
 const aid=inventory.defaultWorkspaceId;const registration=await request('projects',{body:{name:'Fixture B',path:b}});assert.equal(registration.status,201,output);const bid=registration.body.workspace.id;
 assert.notEqual(aid,bid);
 const decision=await request('project-context',{workspace:aid,body:{text:'Project A approved decision'}});assert.equal(decision.status,200);assert.equal((await request('project-context',{workspace:bid})).body.decisions.length,0);assert.equal((await request('project-context',{workspace:aid,body:{text:'Denied viewer change'},headers:{host:'office.example',origin:'https://office.example','tailscale-user-login':'viewer@example.com'}})).status,403);

 assert.equal(registration.body.capabilities.agents[0].description,'Only project B');
 assert.equal((await request('roles',{workspace:aid})).body.agents[0].description,'Only project A');
 assert.equal((await request('roles',{workspace:bid})).body.agents[0].description,'Only project B');
 writeFileSync(join(b,'.claude','agents','new.md'),'---\nname: freshly-added\ndescription: New local role\n---\nLocal instructions');
 assert.ok((await request('roles',{workspace:bid})).body.roles.includes('freshly-added'));
 assert.equal((await request('capabilities',{workspace:aid,headers:{host:'office.example','tailscale-user-login':'viewer@example.com'}})).status,403);

 // Require both native office engines to answer, not just the gateway metadata.
 for(const workspace of [aid,bid])await waitUntil(()=>new Promise((resolve,reject)=>{
  const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?workspaceId=${workspace}`,{headers:{origin:base}});
  const timeout=setTimeout(()=>finish(Error('Office engine did not respond')),1000);
  function finish(error){clearTimeout(timeout);ws.removeAllListeners();ws.on('error',()=>{});ws.close();error?reject(error):resolve();}
  ws.on('open',()=>ws.send(JSON.stringify({type:'webviewReady'})));
  ws.on('message',raw=>{try{if(JSON.parse(raw).type==='layoutLoaded')finish();}catch{}});
  ws.on('error',finish);ws.on('close',()=>finish(Error('Office engine unavailable')));
 }));
 const sa=await request('sessions',{workspace:aid,body:{title:'Only A',role:'chief',workspaceId:bid}});assert.equal(sa.status,201,output);
 assert.equal((await request('sessions',{workspace:bid})).body.sessions.length,0);
 assert.equal((await request(`sessions/${sa.body.session.id}/transcript`,{workspace:bid})).status,400);
 const transcriptRoot=join(home,'.claude','projects',realpathSync(a).replace(/[^a-zA-Z0-9]/g,'-'));mkdirSync(transcriptRoot,{recursive:true});
 writeFileSync(join(transcriptRoot,sa.body.session.id+'.jsonl'),JSON.stringify({type:'user',uuid:'search-proof',cwd:a,message:{content:'scoped search evidence'},timestamp:new Date().toISOString()})+'\n');
 const searchA=await request('conversation-search?q=scoped%20search',{workspace:aid});assert.equal(searchA.status,200);assert.equal(searchA.body.matches[0].sessionId,sa.body.session.id);
 const searchB=await request('conversation-search?q=scoped%20search',{workspace:bid});assert.equal(searchB.status,200);assert.equal(searchB.body.matches.length,0);
 assert.equal((await request('conversation-search?q=scoped',{workspace:aid,headers:{host:'office.example',origin:'https://office.example','tailscale-user-login':'viewer@example.com'}})).status,403);

 const task=await request('tasks',{workspace:aid,body:{title:'Only A task',prompt:'Fixture instruction',role:'chief',workspaceId:bid}});assert.equal(task.status,201);assert.equal(task.body.task.workspaceId,aid);
 assert.equal((await request('state',{workspace:bid})).body.tasks.length,0);
 // Observer fixtures are isolated to this temporary gateway; no real grants occur.
 const alice={host:'office.example',origin:'https://office.example','tailscale-user-login':'alice@example.com'};
 const bob={...alice,'tailscale-user-login':'bob@example.com'};
 const emptyObserver=await request('viewer/projects',{headers:alice});assert.equal(emptyObserver.status,200,JSON.stringify(emptyObserver.body));assert.equal(emptyObserver.body.projects.length,0);
 const grant=await request('sharing/grants',{workspace:aid,body:{login:'alice@example.com',name:'Alice',days:7}});assert.equal(grant.status,200);const grantId=grant.body.grants[0].id;
 const visible=(await request('viewer/projects',{headers:alice})).body;assert.equal(visible.projects.length,1);assert.equal(visible.workspaces[0].id,aid);assert.equal(JSON.stringify(visible).includes(b),false);
 assert.equal((await request('viewer/state',{workspace:bid,headers:alice})).status,403);
 assert.equal((await request('viewer/state',{workspace:aid,headers:bob})).status,403);
 const publication=await request('sharing/items',{workspace:aid,body:{kind:'task',sourceId:task.body.task.id,title:'Approved progress',summary:'Owner approved result'}});assert.equal(publication.status,200);
 assert.equal((await request('sharing/items',{workspace:bid,body:{kind:'task',sourceId:task.body.task.id,title:'Wrong project',summary:''}})).status,400);
 const observed=await request('viewer/state',{workspace:aid,headers:alice});assert.equal(observed.status,200);assert.equal(observed.body.items[0].title,'Approved progress');assert.equal(observed.body.items[0].summary,'Owner approved result');assert.equal(JSON.stringify(observed.body).includes('Fixture instruction'),false);assert.equal(JSON.stringify(observed.body).includes(task.body.task.id),false);
 for(const path of ['projects','portfolio','state','roles','appearance','usage','sessions','session-catalog',`sessions/${sa.body.session.id}/transcript`,`sessions/${sa.body.session.id}/changes`,`sessions/${sa.body.session.id}/work`,`tasks/${task.body.task.id}/work`,`tasks/${task.body.task.id}/logs`,'work/overview','conversation-search?q=scoped','notifications?scope=all','backups/export','sharing','push-key'])assert.equal((await request(path,{workspace:aid,headers:alice})).status,403,path);
 assert.equal((await request('tasks',{workspace:aid,headers:alice,body:{title:'Forbidden',prompt:'No',role:'chief'}})).status,403);
 assert.equal((await request('sharing/grants',{workspace:aid,headers:alice,body:{login:'bob@example.com',days:7}})).status,403);
 const socketDenied=await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?workspaceId=${aid}`,{headers:alice});ws.on('open',()=>{ws.close();reject(Error('Observer native socket accepted'));});ws.on('unexpected-response',(_,response)=>{resolve(response.statusCode);ws.terminate();});ws.on('error',()=>{});});assert.equal(socketDenied,403);
 const nativeLeak=await fetch(base+'/assets/private-catalog.json',{headers:alice});assert.equal(nativeLeak.status,403);
 const ownPreview=await request('viewer/state',{workspace:aid});assert.equal(ownPreview.status,200);assert.equal(ownPreview.body.preview,true);
 assert.equal((await request(`sharing/grants/${grantId}/revoke`,{workspace:bid,body:{}})).status,400);
 assert.equal((await request(`sharing/grants/${grantId}/revoke`,{workspace:aid,body:{}})).status,200);
 assert.equal((await request('viewer/state',{workspace:aid,headers:alice})).status,403);assert.equal((await request('viewer/projects',{headers:alice})).body.projects.length,0);

 assert.equal((await request('state',{workspace:bid})).body.context.workspaceId,bid);
 assert.equal((await request('state?workspaceId='+aid,{workspace:bid})).status,400);
 assert.equal((await request('state',{workspace:'unknown'})).status,400);
 const paused=await request('project-policy',{workspace:aid,body:{allowNewWork:false}});assert.equal(paused.status,200);assert.equal(paused.body.allowNewWork,false);
 assert.equal((await request('tasks',{workspace:aid,body:{title:'Blocked task',prompt:'Must not execute',role:'chief'}})).status,400);
 assert.equal((await request('sessions',{workspace:aid,body:{title:'Blocked session',role:'chief'}})).status,400);
 assert.equal((await request('project-policy',{workspace:bid})).body.allowNewWork,true);
 assert.equal((await request('state',{workspace:aid})).body.tasks.length,1);
 const viewerPolicy=await request('project-policy',{workspace:aid,body:{allowNewWork:true},headers:{host:'office.example',origin:'https://office.example','tailscale-user-login':'viewer@example.com'}});assert.equal(viewerPolicy.status,403);
 assert.equal((await request('project-policy',{workspace:aid})).body.allowNewWork,false);
 await request('project-policy',{workspace:aid,body:{allowNewWork:true}});
 // Exercise the real guard HTTP boundary without launching a model or command.
 const guardToken=JSON.parse(readFileSync(join(privateDir,'bibilen-tool-guard.json'),'utf8')).token;
 const payload={guard_runtime_revision:2,guard_policy_revision:(await request('project-policy',{workspace:aid})).body.toolRevision,hook_event_name:'PreToolUse',session_id:'fixture-session',tool_name:'Bash',tool_input:{command:'git push && rm -rf fixture-only'}};
 const guardedFetch=(workspace,token)=>fetch(base+'/bibilen/guard/check?workspaceId='+workspace,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(payload)});
 assert.equal((await guardedFetch(aid,'invalid')).status,403);
 assert.equal((await guardedFetch(bid,guardToken)).status,403);
 const waiting=guardedFetch(aid,guardToken);
 const pending=await waitUntil(async()=>{const p=(await request('approvals',{workspace:aid})).body.pending;if(!p.length)throw Error();return p[0];});
 assert.equal(pending.input.command,payload.tool_input.command);
 const deniedViewer=await request('approvals/'+pending.id,{workspace:aid,body:{decision:'allow'},headers:{host:'office.example',origin:'https://office.example','tailscale-user-login':'viewer@example.com'}});assert.equal(deniedViewer.status,403);
 assert.equal((await request('approvals/'+pending.id,{workspace:aid,body:{decision:'allow'}})).status,200);
 assert.equal((await (await waiting).json()).decision,'allow');
 assert.equal((await request('approvals/'+pending.id,{workspace:aid,body:{decision:'allow'}})).status,400);


 assert.equal((await request('roles',{workspace:bid})).body.legacy,false);
 await request('notifications/test',{workspace:aid,body:{}});await request('notifications/test',{workspace:bid,body:{}});
 const own=(await request('notifications',{workspace:bid})).body.items;assert.ok(own.length);assert.ok(own.every(n=>n.workspaceId===bid));
 const all=(await request('notifications?scope=all',{workspace:bid})).body.items;assert.ok(all.some(n=>n.workspaceId===aid));assert.ok(all.some(n=>n.workspaceId===bid));
 await request('notifications/read?scope=all',{workspace:bid,body:{id:all.find(n=>n.workspaceId===aid).id}});
 assert.ok((await request('notifications',{workspace:aid})).body.items.some(n=>n.read));
 const denied=await request('notifications/read?scope=all',{workspace:bid,body:{},headers:{host:'office.example',origin:'https://office.example'}});assert.equal(denied.status,403);
 const portfolio=await request('portfolio');assert.equal(portfolio.body.items.length,2);assert.equal(portfolio.body.admission.limit,3);
 const viewer=await request('projects',{body:{name:'Unauthorized',path:a},headers:{host:'office.example',origin:'https://office.example'}});assert.equal(viewer.status,403);
 const calls=await waitUntil(async()=>{const rows=readFileSync(join(root,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(c=>c.args.includes('--bg'));if(!rows.length)throw Error('Task still queued');return rows;});assert.ok(calls.every(c=>c.cwd===realpathSync(a)));
});
