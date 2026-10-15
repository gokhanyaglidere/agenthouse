import {it,expect} from 'vitest';
import {buildDynamicCatalog} from '../office/layout/furnitureCatalog.js';
import {OfficeState} from '../office/engine/officeState.js';
import {createCharacter,updateCharacter} from '../office/engine/characters.js';
import {makeLayout} from './layouts.js';
import {ROSTER} from './roster.js';
import {syncResidents} from './residents.js';
import {syncPlanningRoom} from './planningRoom.js';
import {activeWorkstation,receptionHost} from './officeLife.js';
import {japanesePlant} from './japaneseGarden.js';
import {CharacterState} from '../office/types.js';
import type {FurnitureInstance} from '../office/types.js';
buildDynamicCatalog({catalog:[],sprites:{}});
it('plan mode uses a real meeting seat, persists through read tools, then returns ownership to the workstation',()=>{
 const office=new OfficeState(makeLayout('studio'));office.addAgent(15);syncResidents(office);const ch=office.characters.get(15)!;
 office.setAgentTool(15,'EnterPlanMode');syncResidents(office);expect(ch.planningMeeting).toBe(true);expect(ch.privateOffice).toBe(false);expect(ch.seatId).toMatch(/^meeting-/);
 const seat=ch.seatId!;expect(office.getPersistableSeats()[15].seatId).toBe('seat-chief');office.setAgentTool(15,'Read');syncResidents(office);expect(ch.seatId).toBe(seat);
 office.setAgentActive(15,false);updateCharacter(ch,.1,office.walkableTiles,office.seats,office.tileMap,office.blockedTiles);expect(ch.tileCol).toBe(office.seats.get(seat)!.seatCol);
 office.setAgentTool(15,'ExitPlanMode');syncResidents(office);expect(ch.planningMeeting).toBe(false);expect(ch.seatId).toBe('seat-chief');expect(ch.privateOffice).toBe(true);expect(office.seats.get(seat)!.assigned).toBe(false);
});
it('concurrent planning cannot overbook the six meeting chairs or steal another workstation',()=>{
 const office=new OfficeState(makeLayout('studio'));for(let id=10;id<18;id++){office.addAgent(id,0,0,'seat-'+ROSTER[id-10].key);office.setAgentTool(id,'EnterPlanMode');}
 syncPlanningRoom(office);const seated=[...office.characters.values()].filter(c=>c.planningMeeting);expect(seated).toHaveLength(6);expect(new Set(seated.map(c=>c.seatId)).size).toBe(6);
 const first=seated[0],home=first.planningHomeSeat;first.sessionHidden=true;syncPlanningRoom(office);expect(first.planningMeeting).toBe(false);expect(first.seatId).toBe(home);
});
it('reception decoration does not create a task, real session or persistable seat',()=>{
 const office=new OfficeState(makeLayout('studio')),before=office.getPersistableSeats(),count=office.characters.size;const host=receptionHost(office.furniture,[]);expect(host?.isActive).toBe(false);expect(host?.agentName).toContain('dekoratif');expect(host?.seatId).toBe(null);expect(office.characters.size).toBe(count);expect(office.getPersistableSeats()).toEqual(before);
});
it('screens animate only at an occupied, currently active matching workstation',()=>{
 const f={uid:'desk-demo',type:'BB_WORK_DESK',x:100,y:100} as FurnitureInstance,ch=createCharacter(1,0,null,null);ch.seatId='seat-demo';ch.x=124;ch.y=132;ch.state=CharacterState.TYPE;
 expect(activeWorkstation(f,[ch])).toBe(true);ch.isActive=false;expect(activeWorkstation(f,[ch])).toBe(false);ch.isActive=true;ch.sessionHidden=true;expect(activeWorkstation(f,[ch])).toBe(false);ch.sessionHidden=false;ch.seatId='meeting-a';expect(activeWorkstation(f,[ch])).toBe(false);
});
it('majestic tree art is restricted to garden placements and includes bonsai and bamboo',()=>{
 const f=(uid:string,type:string)=>({uid,type}) as FurnitureInstance;
 expect(japanesePlant(f('garden-west-cherry','BB_CHERRY'))?.w).toBeGreaterThan(120);expect(japanesePlant(f('garden-bonsai-deck','BB_SHRUB'))?.variant).toBe(2);expect(japanesePlant(f('garden-edge-pine-a','BB_PINE'))?.variant).toBe(3);expect(japanesePlant(f('unrelated-cherry','BB_CHERRY'))).toBe(null);
});
it('an old transcript event cannot override a newer live mode exit',()=>{
 const office=new OfficeState(makeLayout('studio'));office.addAgent(15);office.agentSessionIds.set(15,'live');office.setAgentTool(15,'ExitPlanMode');
 const work={groups:[{live:true,sessionId:'live',events:[{id:'old-enter',from:'lead',kind:'tool',text:'EnterPlanMode',at:'2020-01-01T00:00:00Z'}]}]} as import('./types.js').WorkOverview;
 syncPlanningRoom(office,work);expect(office.characters.get(15)!.planningMeeting).not.toBe(true);
});
it('a running Plan child may use a meeting seat without moving unrelated children',()=>{
 const office=new OfficeState(makeLayout('studio'));office.addAgent(15);office.addAgent(16);office.addAgent(17);for(const id of [16,17]){office.characters.get(id)!.isSubagent=true;office.setAgentActive(id,true);}
 syncPlanningRoom(office,undefined,[{id:16,label:'[Plan] Architecture'},{id:17,label:'[Explore] Read source'}]);expect(office.characters.get(16)!.planningMeeting).toBe(true);expect(office.characters.get(17)!.planningMeeting).not.toBe(true);expect(office.characters.get(15)!.planningMeeting).not.toBe(true);
});
