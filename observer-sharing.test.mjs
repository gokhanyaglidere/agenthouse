import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,statSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {ObserverSharing,observerItem} from './observer-sharing.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',sourceId='33333333-3333-4333-8333-333333333333';
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'ah-sharing-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));let now=1000;const path=join(dir,'sharing.json');return {path,sharing:new ObserverSharing(path,{now:()=>now}),advance:n=>{now+=n;}};}
test('project-specific identities, expiry, revocation and restart stay read-only and private',t=>{
 const f=fixture(t),s=f.sharing;s.grant(a,{login:'Alice@Example.com',name:'Alice',days:7},'owner');s.grant(b,{login:'bob@example.com',name:'Bob',days:30},'owner');
 assert.equal(s.allowed('alice@example.com',a),true);assert.equal(s.allowed('alice@example.com',b),false);assert.equal(s.allowed(null,a),false);assert.equal(s.allowed('unknown@example.com',a),false);
 assert.equal(new ObserverSharing(f.path,{now:()=>1000}).allowed('alice@example.com',a),true);assert.equal(statSync(f.path).mode&0o777,0o600);
 f.advance(7*86400000);assert.equal(s.allowed('alice@example.com',a),false);assert.equal(s.allowed('bob@example.com',b),true);
 const id=s.state(b).grants[0].id;assert.throws(()=>s.revoke(a,id,'owner'));s.revoke(b,id,'owner');assert.equal(s.allowed('bob@example.com',b),false);assert.equal(s.state(b).audit[0].action,'revoke');
});
test('unknown/corrupt stores fail closed and cannot be silently replaced',t=>{
 const f=fixture(t);writeFileSync(f.path,'invalid');assert.equal(f.sharing.allowed('a@example.com',a),false);assert.ok(f.sharing.state(a).error);assert.throws(()=>f.sharing.grant(a,{login:'a@example.com',days:7},'owner'));
 writeFileSync(f.path,JSON.stringify({version:1,grants:[{id:a,projectId:a,login:'a@example.com',name:'',expiresAt:'forever',createdAt:1}],items:[],audit:[]}));assert.equal(f.sharing.allowed('a@example.com',a),false);
});
test('publishing is scoped, explicit, bounded and independently removable',t=>{
 const {sharing:s}=fixture(t);const input={kind:'task',sourceId,workspaceId:b,title:'Approved title',summary:'Approved summary'};
 s.publish(a,input,'owner');s.publish(a,{...input,summary:'Updated'},'owner');assert.equal(s.state(a).items.length,1);assert.equal(s.state(b).items.length,0);assert.equal(s.state(a).items[0].summary,'Updated');
 assert.throws(()=>s.publish(a,{...input,summary:'x'.repeat(4001)},'owner'));assert.throws(()=>s.grant(a,{login:'bad\nidentity',days:30},'owner'));assert.throws(()=>s.grant(a,{login:'alice@example.com',days:365},'owner'));
 const id=s.state(a).items[0].id;assert.throws(()=>s.unpublish(b,id,'owner'));s.unpublish(a,id,'owner');assert.equal(s.state(a).items.length,0);
});
test('observer projection omits prompts, transcript, files, tools, source identities and raw errors',()=>{
 const secret='DO_NOT_SHARE';const item={id:a,title:'Owner title',summary:'Approved result',kind:'task',sourceId,workspaceId:b,updatedAt:1};
 const task={status:'completed',title:secret,prompt:secret,summary:secret,error:secret,sessionId:sourceId};
 const trace={live:true,members:[{role:'chief',liveState:'running',instruction:secret,summary:secret,lastTool:secret,file:secret},{role:'other',liveState:'closed'}],files:[secret],events:[secret]};
 const result=observerItem(item,{task,trace,inventoryAvailable:true});assert.equal(result.status,'completed');assert.equal(result.members.length,0);assert.equal(JSON.stringify(result).includes(secret),false);assert.equal(JSON.stringify(result).includes(sourceId),false);
 assert.equal(observerItem({...item,kind:'session'},{inventoryAvailable:false}).status,'unknown');assert.equal(observerItem({...item,kind:'session'},{inventoryAvailable:true,session:{status:'history'}}).status,'closed');
});
