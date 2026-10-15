import type {OfficeState} from '../office/engine/officeState.js';
import {CharacterState,TILE_SIZE} from '../office/types.js';
import type {WorkOverview} from './types.js';
import {insideCeo,COZY_REVISION} from './layouts.js';
/** Reconstruct only explicit plan-mode tools or actual Plan subagents, never infer from task titles. */
export function syncPlanningRoom(office:OfficeState,work?:WorkOverview,subagents:Array<{id:number;label:string}>=[]){
 if(office.getLayout().layoutRevision!==COZY_REVISION)return;
 for(const ch of office.characters.values()){
  if(ch.id<0)continue;
  const meta=office.subagentMeta.get(ch.id),session=office.agentSessionIds.get(meta?.parentAgentId??ch.id),trace=work?.groups.find(g=>g.live&&g.sessionId===session);
  // Parent plan-mode events never move unrelated children.
  if(!ch.isSubagent){const last=trace?.events?.filter(e=>e.from==='lead'&&e.kind==='tool'&&['EnterPlanMode','ExitPlanMode'].includes(e.text)).at(-1);if(last&&last.id!==ch.planningTraceEvent){if(ch.planningMode===undefined||Date.parse(last.at??'')>=(ch.planningSignalAt??0))ch.planningMode=last.text==='EnterPlanMode';ch.planningTraceEvent=last.id;}}
  const planChild=ch.isSubagent&&ch.isActive&&/^(?:\[Plan\]|Plan\b|Subtask:\s*\[Plan\])/.test(subagents.find(s=>s.id===ch.id)?.label??'');
  const planning=!ch.sessionHidden&&ch.matrixEffect!=='despawn'&&(ch.planningMode||planChild);
  if(planning&&!ch.planningMeeting){
   const current=ch.seatId?office.seats.get(ch.seatId):undefined;const seat=current&&/^meeting-[a-f]$/.test(current.uid)?current:[...office.seats.values()].find(s=>/^meeting-[a-f]$/.test(s.uid)&&!s.assigned);if(!seat)continue;
   ch.planningHomeSeat=ch.seatId?.startsWith('meeting-')?null:ch.seatId;ch.planningMeeting=true;ch.privateOffice=false;
   const fromPrivate=insideCeo(ch.tileCol,ch.tileRow);office.reassignSeat(ch.id,seat.uid);
   // The CEO room is access-controlled. A scene transition moves its owner only;
   // it does not open the locked door to other agents or modify execution permissions.
   if(fromPrivate){ch.tileCol=seat.seatCol;ch.tileRow=seat.seatRow;ch.x=(seat.seatCol+.5)*TILE_SIZE;ch.y=(seat.seatRow+.5)*TILE_SIZE;ch.path=[];ch.state=CharacterState.TYPE;ch.dir=seat.facingDir;}
  }else if(!planning&&ch.planningMeeting){
   ch.planningMeeting=false;const home=ch.planningHomeSeat;ch.planningHomeSeat=undefined;
   if(home&&office.seats.has(home)&&!office.seats.get(home)!.assigned)office.reassignSeat(ch.id,home);
   else {const seat=ch.seatId?office.seats.get(ch.seatId):undefined;if(seat)seat.assigned=false;ch.seatId=null;ch.path=[];ch.state=CharacterState.IDLE;}
  }
 }
}
