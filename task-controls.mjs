export function taskControls(input,lookup){
 const deps=input.dependencies??[];if(!Array.isArray(deps)||deps.length>20)throw Error('En fazla 20 görev koşulu seçilebilir.');
 const seen=new Set();const dependencies=deps.map(d=>{if(!d||typeof d.taskId!=='string'||!['completed','accepted'].includes(d.condition)||seen.has(d.taskId)||!lookup(d.taskId))throw Error('Görev koşulu bu projede bulunamadı veya geçersiz.');seen.add(d.taskId);return {taskId:d.taskId,condition:d.condition};});
 const runMinutes=input.runMinutes??null;if(runMinutes!==null&&(!Number.isInteger(runMinutes)||runMinutes<1||runMinutes>1440))throw Error('Süre 1–1440 dakika olmalı.');
 const limitAction=input.limitAction??'notify';if(!['notify','stop'].includes(limitAction))throw Error('Süre davranışı geçersiz.');return {dependencies,runMinutes,limitAction};
}
export function dependencyReason(task,lookup){for(const d of task.dependencies??[]){const parent=lookup(d.taskId);if(!parent)return 'Ön koşul kaydı bulunamadı; otomatik başlangıç kapalı.';if(parent.status!=='completed')return `${parent.title}: ${['failed','stopped'].includes(parent.status)?'başarısız/durduruldu; koşul sağlanmadı':'tamamlanması bekleniyor'}.`;if(d.condition==='accepted'&&(parent.review?.decision!=='accepted'||parent.review.completedAt!==parent.completedAt))return `${parent.title}: teslim kabulü bekleniyor.`;}return null;}
