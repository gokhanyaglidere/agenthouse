import {test} from 'node:test';import assert from 'node:assert/strict';import {presenceInventory} from './session-presence.mjs';
const id='12345678-1234-4234-8234-123456789012';const manager={cwd:'/project',path:id=>`/project/history/${id}.jsonl`};const checks={hasFile:()=>true,alive:()=>true};
test('recovery includes only verified live sessions with transcripts, never stopped/history or malformed identities',()=>{const agents=[{sessionId:id,kind:'interactive',pid:42,status:'busy'},{sessionId:'bad',status:'busy'},{sessionId:id,state:'done'},{sessionId:id,state:'stopped'}];assert.deepEqual(presenceInventory({available:true,agents},manager,checks),[{sessionId:id,transcriptPath:`/project/history/${id}.jsonl`,cwd:'/project'}]);});
test('an unavailable inventory cannot remove existing office characters',()=>{assert.equal(presenceInventory({available:false,agents:[]},manager,checks),null);});
test('dead interactive processes and missing transcripts cannot create office occupants',()=>{const inventory={available:true,agents:[{sessionId:id,kind:'interactive',pid:42,status:'idle'}]};assert.deepEqual(presenceInventory(inventory,manager,{...checks,alive:()=>false}),[]);assert.deepEqual(presenceInventory(inventory,manager,{...checks,hasFile:()=>false}),[]);});
test('Windows process ids are validated on Windows, never against unrelated WSL pids',()=>{
 const agent={sessionId:id,kind:'interactive',pid:42,state:'busy',origin:'windows',nativeAlive:true};
 assert.equal(presenceInventory({available:true,agents:[agent]},manager,{...checks,alive:()=>false}).length,1);
 assert.deepEqual(presenceInventory({available:true,agents:[{...agent,nativeAlive:false}]},manager,checks),[]);
});
test('office rebinds a transferred session to its new transcript without duplicating unchanged sessions',async()=>{
 const {syncOfficePresence}=await import('./office-presence-sync.mjs');const events=[];const store=new Map([[1,{isExternal:true,sessionId:id,jsonlFile:'/windows/'+id+'.jsonl'}]]);
 const owner={removeAgent:key=>{events.push('remove');store.delete(key);},hookEventHandler:{lifecycleCallbacks:{onSessionResume:()=>events.push('reset'),onExternalSessionDetected:()=>events.push('adopt')}}};
 syncOfficePresence(owner,store,{sessions:[{sessionId:id,transcriptPath:'/wsl/'+id+'.jsonl',cwd:'/project'}]});assert.deepEqual(events,['remove','reset','adopt']);
 events.length=0;store.set(2,{isExternal:true,sessionId:id,jsonlFile:'/wsl/'+id+'.jsonl'});syncOfficePresence(owner,store,{sessions:[{sessionId:id,transcriptPath:'/wsl/'+id+'.jsonl',cwd:'/project'}]});assert.deepEqual(events,['adopt']);assert.equal(store.size,1);
});
