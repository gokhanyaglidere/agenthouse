import {writeFileSync} from 'node:fs';
import {test,expect} from 'vitest';
import {doorGeometry,PARTITION} from './partition-style.js';
import {operationRows,prioritizeOperations,workingCount} from './operation-center-model.js';
import type {BibilenTask,WorkTrace} from './types.js';
test('door frame has the same rise and base as the adjacent glazing',()=>{const g=doorGeometry(96,240);expect(g.y).toBe(240-PARTITION.rise);expect(g.y+g.height).toBe(240+PARTITION.depth);expect(g.width).toBe(48);expect(g.height).toBe(32);});
test('dense operation lists preserve exact sessions and live counts without merging same-role agents',()=>{
 const groups=Array.from({length:100},(_,i)=>({sessionId:'s'+i,title:'session '+i,taskId:'t'+i,live:true,members:Array.from({length:100},(_,n)=>({id:n?'a'+n:'lead',role:'chief',liveState:n===0?'waiting':'running'})),events:[]} as unknown as WorkTrace));
 const tasks=Array.from({length:100},(_,i)=>({id:'t'+i,sessionId:'s'+i,title:'task '+i,status:'running',priority:'normal'} as BibilenTask));
 const timings=[];for(let n=0;n<20;n++){const start=performance.now();const rows=prioritizeOperations(operationRows(tasks,groups));expect(rows).toHaveLength(100);expect(new Set(rows.map(r=>r.trace?.sessionId)).size).toBe(100);expect(workingCount(tasks,groups)).toBe(9900);timings.push(performance.now()-start);}
 timings.sort((a,b)=>a-b);writeFileSync('/tmp/agent-house-density-benchmark.json',JSON.stringify({sessions:100,members:10000,iterations:20,p95ms:timings[18],maxms:timings[19],kind:'synthetic metadata workload'}));expect(timings[18]).toBeLessThan(500);
});
