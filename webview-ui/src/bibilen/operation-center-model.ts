import type {BibilenTask,WorkTrace} from './types.js';
export const activeTask=(t:BibilenTask)=>!['completed','failed','stopped'].includes(t.status);
export function operationRows(tasks:BibilenTask[],groups:WorkTrace[]){const live=groups.filter(g=>g.live),used=new Set<string>();const rows=tasks.filter(activeTask).map(task=>{const trace=live.find(g=>g.taskId===task.id||!!task.sessionId&&g.sessionId===task.sessionId);if(trace)used.add(trace.sessionId);return {id:'task:'+task.id,task,trace,title:task.title};});return [...rows,...live.filter(g=>!used.has(g.sessionId)&&!tasks.some(t=>t.id===g.taskId&&!activeTask(t))).map(trace=>({id:'session:'+trace.sessionId,task:undefined,trace,title:trace.title}))];}
export function currentMembers(trace:WorkTrace,locatedIds:Set<string>){return trace.live?trace.members.filter(m=>m.id==='lead'||m.liveState==='running'||m.liveState==='waiting'||locatedIds.has(m.id)):[];}
export function liveCommunication(trace:WorkTrace){return trace.events.filter(e=>['message','delegated','result'].includes(e.kind)).slice(-3).reverse();}
export function workingCount(tasks:BibilenTask[],groups:WorkTrace[]){
 const live=groups.filter(g=>g.live);
 const members=live.reduce((n,g)=>n+g.members.filter(m=>m.liveState==='running').length,0);
 return members+tasks.filter(t=>t.status==='running'&&!live.some(g=>g.taskId===t.id||!!t.sessionId&&g.sessionId===t.sessionId)).length;
}
export function waitingCount(tasks:BibilenTask[],groups:WorkTrace[]){
 const live=groups.filter(g=>g.live);
 return live.reduce((n,g)=>n+g.members.filter(m=>m.liveState==='waiting').length,0)+tasks.filter(t=>t.status==='waiting'&&!live.some(g=>g.taskId===t.id||!!t.sessionId&&g.sessionId===t.sessionId)).length;
}
