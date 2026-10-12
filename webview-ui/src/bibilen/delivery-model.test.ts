import {expect,test} from 'vitest';
import {deliveryModel,taskMatches} from './delivery-model.js';
import type {BibilenTask,WorkTrace} from './types.js';
const task={title:'Ödeme geliştirme',summary:'İstanbul için test sonucu',role:'chief',status:'completed'} as BibilenTask;
test('delivery never equates missing tests or incomplete records with success',()=>{
 expect(deliveryModel(task,null).incomplete).toBe(true);expect(deliveryModel(task,null).next).toContain('Test kaydı yok');
 const trace={members:[],files:[{path:'a',operation:'Read'},{path:'a',operation:'Edit'},{path:'a',operation:'Read',edited:true}],testResults:[{failed:true}],workItems:[{status:'completed'},{status:'unknown',subject:'Review'}],coverage:{missingTranscripts:0,skippedLines:0,limitedMembers:true}} as unknown as WorkTrace;
 const result=deliveryModel(task,trace);expect(result.files).toEqual(['a']);expect(result.failed).toBe(1);expect(result.pending).toHaveLength(1);expect(result.incomplete).toBe(true);expect(result.next).toContain('Hatalı');
 expect(deliveryModel({...task,status:'stopped'},null).next).toContain('durdurulmuş');
});
test('history search covers output, prompt and human role names with Turkish casing',()=>{
 expect(taskMatches(task,'ödeme test')).toBe(true);expect(taskMatches(task,'İSTANBUL')).toBe(true);expect(taskMatches(task,'gökhan','Gökhan')).toBe(true);expect(taskMatches(task,'unknown')).toBe(false);
});

test('uses recorded final lead response rather than terminal repaint artifacts',()=>{
 const trace={members:[{id:'lead',status:'reported',summary:'Readable final answer'}],files:[],workItems:[],coverage:{missingTranscripts:0,skippedLines:0,limitedMembers:false}} as unknown as WorkTrace;
 expect(deliveryModel({...task,summary:'PTY repaint artifacts'},trace).summary).toBe('Readable final answer');
 trace.members[0].status='running';expect(deliveryModel(task,trace).summary).toBe(task.summary);
});
