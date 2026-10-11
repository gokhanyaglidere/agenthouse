import type {OfficeState} from '../office/engine/officeState.js';
import {isResident} from './roster.js';
import {BUILDING,COZY_ROOMS,contains} from './layouts.js';
import type {WorkTrace} from './types.js';import {memberName,workBadge,workColor} from './work.js';
export function syncWorkPresence(office:Pick<OfficeState,'characters'|'agentSessionIds'|'subagentMeta'>,groups:WorkTrace[]){
 for(const ch of office.characters.values()){
  ch.workBadge=undefined;ch.workColor=undefined;ch.workName=undefined;
  const meta=office.subagentMeta.get(ch.id);const session=meta?office.agentSessionIds.get(meta.parentAgentId):office.agentSessionIds.get(ch.id);
  if(!session||isResident(ch.id)||ch.matrixEffect==='despawn')continue;
  const group=groups.find(g=>g.live&&g.sessionId===session);if(!group)continue;
  const member=meta?group.members.find(m=>m.id===meta.parentToolId):group.members.find(m=>m.id==='lead');
  if(member){ch.workBadge=workBadge(group.sessionId);ch.workColor=workColor(group.sessionId);ch.workName=memberName(member);}
 }
}

export type WorkLocation={characterId:number;room:string};
type PresenceOffice=Pick<OfficeState,'characters'|'agentSessionIds'|'subagentMeta'>;
function nativeLocations(office:PresenceOffice,sessionId:string):Map<string,WorkLocation>{
 const result=new Map<string,WorkLocation>();
 for(const ch of office.characters.values()){
  if(isResident(ch.id)||ch.matrixEffect==='despawn'||ch.sessionHidden)continue;
  const meta=office.subagentMeta.get(ch.id);
  const session=office.agentSessionIds.get(meta?meta.parentAgentId:ch.id);
  if(!session||session!==sessionId)continue;
  const memberId=meta?.parentToolId??'lead';
  const room=COZY_ROOMS.find(r=>contains(r,ch.tileCol,ch.tileRow));
  const previous=result.get(memberId);
  if(previous&&Math.abs(previous.characterId)>Math.abs(ch.id))continue;
  result.set(memberId,{characterId:ch.id,room:room?.label??(contains(BUILDING,ch.tileCol,ch.tileRow)?'Koridor':'Dış alan')});
 }
 return result;
}
export function liveMemberLocation(office:PresenceOffice,sessionId:string,memberId:string){return nativeLocations(office,sessionId).get(memberId);}
export function workLocations(office:PresenceOffice,trace:WorkTrace):Map<string,WorkLocation>{
 if(!trace.live)return new Map();
 const wanted=new Set(trace.members.map(m=>m.id));
 return new Map([...nativeLocations(office,trace.sessionId)].filter(([id])=>wanted.has(id)));
}
