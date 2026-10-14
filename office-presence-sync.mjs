// Self-contained: prepare-ui embeds this function into the pinned upstream office engine.
export function syncOfficePresence(o,s,t){
 if(!o||!Array.isArray(t.sessions))return;
 const live=new Set();
 for(const entry of t.sessions.slice(0,50)){
  if(typeof entry.sessionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.sessionId)||typeof entry.transcriptPath!=='string'||!entry.transcriptPath.endsWith(entry.sessionId+'.jsonl')||typeof entry.cwd!=='string')continue;
  live.add(entry.sessionId);
  for(const [id,agent]of s)if(agent.isExternal&&agent.sessionId===entry.sessionId&&agent.jsonlFile&&agent.jsonlFile!==entry.transcriptPath){
   o.removeAgent(id);o.hookEventHandler.lifecycleCallbacks.onSessionResume?.(entry.transcriptPath);
  }
  o.hookEventHandler.lifecycleCallbacks.onExternalSessionDetected?.(entry.sessionId,entry.transcriptPath,entry.cwd);
 }
 for(const sid of o.bibilenInventorySessions??[]){if(live.has(sid))continue;for(const [id,agent]of s)if(agent.isExternal&&agent.sessionId===sid)o.removeAgent(id);}
 o.bibilenInventorySessions=live;
}
