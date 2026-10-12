// Call only with an already project-scoped inventory. Ambiguous prefixes fail closed.
export function resolveSession(sessions,{sessionId,taskId}={}) {
 const exact=sessionId&&sessions.find(s=>s.id===sessionId);if(exact)return exact;
 const prefix=typeof sessionId==='string'&&/^[a-f0-9]{8}$/i.test(sessionId)?sessions.filter(s=>s.id.toLowerCase().startsWith(sessionId.toLowerCase()+'-')):[];
 if(prefix.length>1)throw Error('Oturum kimliği birden fazla kayıtla eşleşiyor.');
 if(prefix.length===1)return prefix[0];
 const linked=taskId?sessions.filter(s=>s.taskId===taskId):[];
 if(linked.length>1)throw Error('Görev birden fazla oturumla eşleşiyor.');
 return linked[0]??null;
}
