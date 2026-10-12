import {expect,test} from 'vitest';import {roleActivity} from './role-activity.js';import type {WorkTrace} from './types.js';
const group=(sessionId:string,live:boolean,liveState:string|null)=>({sessionId,title:sessionId,live,members:[{role:'chief',status:'running',liveState}]} as WorkTrace);
test('uses actual CLI signals instead of historical running labels',()=>{
 expect(roleActivity('chief',[],[group('old',false,'running')]).state).toBe('unconnected');
 expect(roleActivity('chief',[],[group('new',true,'idle')]).state).toBe('idle');
 expect(roleActivity('chief',[],[group('unknown',true,null)]).state).toBe('unconnected');
});
test('highlights required answers while counting separate concurrent sessions',()=>{
 const result=roleActivity('chief',[],[group('a',true,'running'),group('b',true,'waiting')]);
 expect(result.state).toBe('waiting');expect(result.title).toBe('b');expect(result.sessions).toBe(2);
 expect(roleActivity('web-frontend',[],[group('a',true,'running')]).sessions).toBe(0);
});
test('counts distinct linked work without duplicating a task and its session, prioritizes waiting',()=>{
 const tasks=[{id:'a',role:'chief',status:'queued',sessionId:null},{id:'b',role:'chief',status:'waiting',sessionId:'active'}] as import('./types.js').BibilenTask[];
 const result=roleActivity('chief',tasks,[group('active',true,'waiting'),group('past',false,'running')]);
 expect(result.jobs).toBe(2);expect(result.queued).toBe(1);expect(result.state).toBe('waiting');
 expect(roleActivity('chief',tasks,[]).state).toBe('waiting');
});
