import {existsSync} from 'node:fs';
const ACTIVE=new Set(['busy','working','running','waiting','blocked','ready','idle','starting']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function presenceInventory(inventory,sessionManager,{hasFile=existsSync,alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}}}={}){
 if(!inventory.available)return null; // A failed CLI query is not proof that agents exited.
 return inventory.agents.filter(agent=>UUID.test(agent.sessionId??'')&&ACTIVE.has(agent.state??agent.status)&&(agent.kind!=='interactive'||(Number.isInteger(agent.pid)&&alive(agent.pid))))
  .map(agent=>({sessionId:agent.sessionId,transcriptPath:sessionManager.path(agent.sessionId),cwd:sessionManager.cwd}))
  .filter(agent=>hasFile(agent.transcriptPath)).slice(0,50);
}
