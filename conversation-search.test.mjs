import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchConversations} from './conversation-search.mjs';
const message=(id,text)=>({id,text,role:'assistant',timestamp:null});
function manager(count,transcript){return {list:async()=>({inventoryAvailable:true,sessions:Array.from({length:count},(_,i)=>({id:'session-'+i,title:'Conversation '+i,updatedAt:count-i,hasTranscript:true}))}),transcript};}
test('search matches visible message content literally, preserving session links',async()=>{
 const seen=[];const m=manager(1,async(id,before)=>{seen.push([id,before]);return {messages:[message('a','Ödeme kararı: test sonucu bekle.'),message('b','another')],nextBefore:null};});
 const r=await searchConversations(m,{query:'ödeme KARARI'});assert.equal(r.matches.length,1);assert.equal(r.matches[0].sessionId,'session-0');assert.equal(r.nextCursor,null);assert.equal(seen.length,1);
 assert.equal((await searchConversations(m,{query:'.*'})).matches.length,0);
 await assert.rejects(searchConversations(m,{query:'x'}));await assert.rejects(searchConversations(m,{query:'x'.repeat(201)}));
});
test('bounded scanning resumes older pages without dropping same-page matches',async()=>{
 const m=manager(1,async(id,before)=>({messages:[message(String(before??100),'needle')],nextBefore:(before??100)>0?(before??100)-1:null}));
 const first=await searchConversations(m,{query:'needle'});assert.equal(first.pages,24);assert.equal(first.matches.length,24);assert.ok(first.nextCursor);
 const second=await searchConversations(m,{query:'needle',cursor:first.nextCursor});assert.equal(second.matches[0].messageId,'76');assert.equal(second.pages,24);
 await assert.rejects(searchConversations(m,{query:'other',cursor:first.nextCursor}));
 const invalid=Buffer.from(JSON.stringify({id:'foreign-session',query:'needle',before:null})).toString('base64url');await assert.rejects(searchConversations(m,{query:'needle',cursor:invalid}));
});
test('unreadable sessions are disclosed and bounded, and non-progressing pages stop',async()=>{
 const broken=manager(50,async()=>{throw Error('private error');});const r=await searchConversations(broken,{query:'needle'});assert.equal(r.unreadableSessions,24);assert.ok(r.nextCursor);assert.equal(r.matches.length,0);
 let calls=0;const stuck=manager(1,async()=>{calls++;return {messages:[],nextBefore:5};});const done=await searchConversations(stuck,{query:'needle'});assert.equal(calls,2);assert.equal(done.nextCursor,null);
});
