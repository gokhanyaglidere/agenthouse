import type { OfficeState } from '../office/engine/officeState.js';
import { ROSTER, residentId, isResident } from './roster.js';
import { insideCeo, COZY_REVISION } from './layouts.js';
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
    if(key){office.agentRoleKeys.set(ch.id,key);ch.privateOffice=key==='chief'&&office.getLayout().layoutRevision===COZY_REVISION;}
    if(key && !bound.has(key)) bound.set(key,ch.id);
  }
  ROSTER.forEach((role,i)=>{
    const id=residentId(i);
    if(bound.has(role.key)) {
      const ghost=office.characters.get(id);
      if(ghost){if(ghost.seatId){const seat=office.seats.get(ghost.seatId); if(seat)seat.assigned=false;}office.characters.delete(id);}
      const live=office.characters.get(bound.get(role.key)!);
      if(live){live.agentName=role.name;live.palette=i%COZY_CHARACTER_COUNT;live.hueShift=0;}
      if(live && live.seatId!==`seat-${role.key}`){
        if(role.key==='chief'){for(const other of office.characters.values())if(other.id!==live.id&&other.seatId==='seat-chief'){other.seatId=null;other.path=[];other.state=CharacterState.IDLE;const seat=office.seats.get('seat-chief');if(seat)seat.assigned=false;}}
        office.reassignSeat(live.id,`seat-${role.key}`);
      }
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
  for(const ch of chiefs){
    if(ch.privateOffice){
      const current=ch.seatId?office.seats.get(ch.seatId):undefined;
      if(!current||!insideCeo(current.seatCol,current.seatRow)){
        const spare=[...office.seats.values()].find(s=>!s.assigned&&insideCeo(s.seatCol,s.seatRow));
        if(spare){office.reassignSeat(ch.id,spare.uid);ch.tileCol=spare.seatCol;ch.tileRow=spare.seatRow;ch.dir=spare.facingDir;}
        else{if(current)current.assigned=false;ch.seatId=null;const place=office.walkableTiles.filter(t=>insideCeo(t.col,t.row)&&![...office.characters.values()].some(other=>other.id!==ch.id&&other.tileCol===t.col&&other.tileRow===t.row)).sort((a,b)=>Math.min(Math.hypot(a.col-11,a.row-10),Math.hypot(a.col-12,a.row-13))-Math.min(Math.hypot(b.col-11,b.row-10),Math.hypot(b.col-12,b.row-13)))[0];if(place){ch.tileCol=place.col;ch.tileRow=place.row;}}
        ch.x=(ch.tileCol+.5)*TILE_SIZE;ch.y=(ch.tileRow+.5)*TILE_SIZE;ch.path=[];ch.state=ch.isActive?CharacterState.TYPE:CharacterState.IDLE;
      }
      if(!insideCeo(ch.tileCol,ch.tileRow)){
        const place=office.walkableTiles.find(t=>insideCeo(t.col,t.row));if(place){ch.tileCol=place.col;ch.tileRow=place.row;ch.x=(place.col+.5)*TILE_SIZE;ch.y=(place.row+.5)*TILE_SIZE;ch.path=[];}
      }
    }
    const session=office.agentSessionIds.get(ch.id);ch.agentName=chiefs.length>1&&session?`Gökhan · ${session.slice(0,4)}`:'Gökhan';}
  return bound;
}
