import type {BibilenTask, WorkTrace} from './types.js';
export function deliveryModel(task:BibilenTask, trace:WorkTrace|null) {
 const lead=trace?.members.find(m=>m.id==='lead');
 const summary=lead&&['reported','completed','failed','stopped'].includes(lead.status)&&lead.summary?.trim()?lead.summary:task.summary;
 const files=[...new Set((trace?.files??[]).filter(f=>f.edited||['Edit','Write','NotebookEdit'].includes(f.operation)).map(f=>f.path))];
 const tests=trace?.testResults??[];
 const pending=trace?.workItems.filter(i=>i.status!=='completed')??[];
 const incomplete=!trace||!!(trace.coverage.missingTranscripts||trace.coverage.skippedLines||trace.coverage.limitedMembers);
 const failed=tests.filter(t=>t.failed).length;
 const next=task.status==='failed'?'Hata kaydını incele; yeniden başlatmadan önce nedenini doğrula.':task.status==='stopped'?'Görev durdurulmuş; devam etmeden önce son çıktıyı incele.':failed?'Hatalı test kayıtlarını incele.':pending.length?'Açık iş kayıtlarını gözden geçir.':!tests.length?'Test kaydı yok; uygun doğrulamayı iste.':incomplete?'Kayıt kapsamı eksik; sonucu konuşmadan ve dosya farklarından doğrula.':'Son çıktıyı ve dosya farklarını inceleyerek sonucu değerlendir.';
 return {summary,files,tests,pending,incomplete,failed,next};
}
export function taskMatches(task:BibilenTask, query:string, roleName='') {
 const terms=query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean);
 const text=[task.title,task.prompt,task.summary,task.error,task.role,roleName].join(' ').toLocaleLowerCase('tr-TR');
 return terms.every(term=>text.includes(term));
}
