import type {BibilenTask,WorkTrace} from './types.js';
export function roleActivity(role:string,tasks:BibilenTask[],groups:WorkTrace[]){
 const members=groups.filter(g=>g.live).flatMap(g=>g.members.filter(m=>m.role===role&&m.liveState&&m.liveState!=='closed').map(m=>({state:m.liveState,title:g.title,session:g.sessionId})));
 const roleTasks=tasks.filter(t=>t.role===role&&!['completed','failed','stopped'].includes(t.status));
 const task=roleTasks.find(t=>t.status==='waiting')??roleTasks.find(t=>['starting','running'].includes(t.status))??roleTasks[0];
 const waiting=members.find(m=>m.state==='waiting');const running=members.find(m=>m.state==='running');
 const state=waiting||task?.status==='waiting'?'waiting':running||task&&['starting','running'].includes(task.status)?'running':members.length?'idle':task?.status==='queued'?'queued':'unconnected';
 const matched=new Set(members.map(m=>m.session));
 const unlinked=roleTasks.filter(t=>!t.sessionId||!matched.has(t.sessionId));
 return {jobs:matched.size+unlinked.length,queued:roleTasks.filter(t=>t.status==='queued').length,state,label:{waiting:'Yanıt bekliyor',running:'Çalışıyor',idle:'Yeni mesaj için hazır',queued:'Sırada',unconnected:'Bağlı oturum yok'}[state],title:waiting?.title??running?.title??task?.title??members[0]?.title,sessions:new Set(members.map(m=>m.session)).size};
}
