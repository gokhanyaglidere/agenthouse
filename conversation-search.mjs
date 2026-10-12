// Read-only, project-scoped search over the same visible message pages as history.
export async function searchConversations(manager,{query,cursor}={}) {
 if(typeof query!=='string'||query.trim().length<2||query.length>200)throw Error('Arama 2–200 karakter olmalı.');
 const terms=query.trim().toLocaleLowerCase('tr-TR').split(/\s+/);
 const inventory=await manager.list();
 const sessions=inventory.sessions.filter(s=>s.hasTranscript).sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
 let index=0,before;
 if(cursor){
  let value;try{if(typeof cursor!=='string'||cursor.length>1200)throw Error();value=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw Error('Geçersiz arama sayfası.');}
  index=sessions.findIndex(s=>s.id===value.id);
  if(index<0||value.query!==query||!(value.before===null||Number.isSafeInteger(value.before)&&value.before>=0))throw Error('Arama kaydı değişmiş; yeniden ara.');
  before=value.before??undefined;
 }
 const matches=[],errors=[];let pages=0,attempts=0;
 for(;index<sessions.length&&attempts<24&&matches.length<30;){
  const session=sessions[index];let page;attempts++;
  try{page=await manager.transcript(session.id,before);}catch{errors.push(session.id);index++;before=undefined;continue;}
  pages++;
  for(const message of [...page.messages].reverse()){
   const text=message.text??'',normalized=text.toLocaleLowerCase('tr-TR');
   if(!terms.every(term=>normalized.includes(term)))continue;
   const at=normalized.indexOf(terms[0]),start=Math.max(0,at-80);
   matches.push({sessionId:session.id,title:session.title,messageId:message.id,role:message.role,timestamp:message.timestamp,excerpt:(start?'…':'')+text.slice(start,start+360)+(text.length>start+360?'…':'')});
  }
  if(page.nextBefore!==null&&(before===undefined||page.nextBefore<before))before=page.nextBefore;
  else {index++;before=undefined;}
 }
 const nextCursor=index<sessions.length?Buffer.from(JSON.stringify({id:sessions[index].id,before:before??null,query})).toString('base64url'):null;
 return {matches,nextCursor,pages,unreadableSessions:errors.length,totalSessions:sessions.length,inventoryAvailable:inventory.inventoryAvailable};
}
