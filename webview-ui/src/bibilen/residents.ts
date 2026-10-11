import type { OfficeState } from '../office/engine/officeState.js';
import { ROSTER, residentId, isResident } from './roster.js';
import { insideCeo } from './layouts.js';
import { COZY_CHARACTER_COUNT } from '../office/sprites/cozyCharacters.js';
import { TILE_SIZE, CharacterState } from '../office/types.js';
import type {WorkOverview} from './types.js';
export function roleFromLabel(label: string): string | undefined {
  const marker = /^(?:Subtask:\s*)?\[([^\]]+)\]/.exec(label)?.[1];
  return ROSTER.find(r=>r.key === marker || r.key === label)?.key;
}
export function syncResidents(office: OfficeState, subagents: Array<{id:number;label:string}> = [], tasks: Array<{sessionId?:string|null;role:string}> = [], work?:WorkOverview): Map<string,number> {
  const bound = new Map<string,number>();
  const live=work?.inventoryAvailable?new Map(work.groups.filter(g=>g.live).map(g=>[g.sessionId,g])):null;
  for(const ch of office.characters.values()){
    if(isResident(ch.id))continue;
    const meta=office.subagentMeta.get(ch.id);const session=office.agentSessionIds.get(meta?.parentAgentId??ch.id);
    ch.sessionHidden=!!(live&&!work?.limitedSessions&&session&&!live.has(session));
    if(live&&session&&!ch.isSubagent&&!ch.sessionHidden){const lead=live.get(session)?.members.find(m=>m.id==='lead');if(lead?.liveState){office.setAgentActive(ch.id,lead.liveState==='running');if(lead.liveState==='idle'){ch.bubbleType=null;ch.currentTool=null;}}}
  }
  for(const ch of [...office.characters.values()].sort((a,b)=>Number(b.isActive)-Number(a.isActive)||b.id-a.id)) {
    if(isResident(ch.id)) continue;
    if(ch.matrixEffect==='despawn'||ch.sessionHidden) continue;
    const sessionId=office.agentSessionIds.get(ch.id);
    const taskRole=!ch.isSubagent && sessionId ? tasks.find(t=>t.sessionId && (sessionId===t.sessionId || (/^[0-9a-f]{8}$/i.test(t.sessionId) && sessionId.startsWith(t.sessionId+'-'))))?.role : undefined;
    const explicit=roleFromLabel(subagents.find(s=>s.id===ch.id)?.label ?? ch.agentName ?? '');
    const key = (taskRole && ROSTER.some(r=>r.key===taskRole) ? taskRole : undefined) ?? explicit ?? office.agentRoleKeys.get(ch.id) ?? (ch.id>0 && !ch.isSubagent ? 'chief' : undefined);
    if(key) office.agentRoleKeys.set(ch.id,key);
    if(key && !bound.has(key)) bound.set(key,ch.id);
  }
  ROSTER.forEach((role,i)=>{
    const id=residentId(i);
    if(bound.has(role.key)) {
      const ghost=office.characters.get(id);
      if(ghost){if(ghost.seatId){const seat=office.seats.get(ghost.seatId); if(seat)seat.assigned=false;}office.characters.delete(id);}
      const live=office.characters.get(bound.get(role.key)!);
      if(live){live.agentName=role.name;live.palette=i%COZY_CHARACTER_COUNT;live.hueShift=0;}
      if(live && live.seatId!==`seat-${role.key}`) office.reassignSeat(live.id,`seat-${role.key}`);
      // A specialist may be spawned next to its parent in the locked CEO room.
      // Put it at its own workstation; the closed door never becomes walkable.
      if(live && (role.key==='chief'?!insideCeo(live.tileCol,live.tileRow):insideCeo(live.tileCol,live.tileRow))){
        const seat=office.seats.get(`seat-${role.key}`);
        if(seat){live.tileCol=seat.seatCol;live.tileRow=seat.seatRow;live.x=(seat.seatCol+.5)*TILE_SIZE;live.y=(seat.seatRow+.5)*TILE_SIZE;live.path=[];live.state=CharacterState.TYPE;live.dir=seat.facingDir;}
      }
    }
  });
  // Reserve live specialists' desks before creating residents; otherwise a
  // resident displaced from a random spawn seat can take a specialist's desk.
  ROSTER.forEach((role,i)=>{
    const id=residentId(i);
    if(!bound.has(role.key) && !office.characters.has(id)){
      office.addAgent(id,i%COZY_CHARACTER_COUNT,0,`seat-${role.key}`,true,'BiBilen');
      office.setAgentActive(id,false);
      const ch=office.characters.get(id)!;ch.agentName=role.name;ch.wanderTimer=1+(i%9)*0.7;
    }
    const resident=office.characters.get(id);
    if(resident){resident.agentName=role.name;resident.palette=i%COZY_CHARACTER_COUNT;resident.hueShift=0;}
  });
  // Several genuine CLI conversations may share the chief role. Distinguish
  // their sessions instead of presenting different states as one person.
  const chiefs=[...office.characters.values()].filter(ch=>!isResident(ch.id)&&!ch.sessionHidden&&ch.matrixEffect!=='despawn'&&office.agentRoleKeys.get(ch.id)==='chief');
  for(const ch of chiefs){const session=office.agentSessionIds.get(ch.id);ch.agentName=chiefs.length>1&&session?`Gökhan · ${session.slice(0,4)}`:'Gökhan';}
  return bound;
}
