import { describe,it,expect } from 'vitest';
import { OfficeState } from '../office/engine/officeState.js';
import { syncResidents,roleFromLabel } from './residents.js';
import { ROSTER,residentId } from './roster.js';
import { makeLayout, refineSavedLayout, CEO_ROOM, insideCeo, COZY_ROOMS, SOCIAL_VISITS, ROOM_WINDOWS, ROOM_RUGS, GARDEN_PAVING, WALL_PLACEMENTS, WORK_TEAMS, BUILDING, POND, HALL_HUB, contains } from './layouts.js';
import { findPath } from '../office/layout/tileMap.js';
import {getPlacementBlockedTiles} from '../office/layout/layoutSerializer.js';
describe('persistent office residents',()=>{
 it('show every defined role idle without persisting fake Claude sessions',()=>{
  const office=new OfficeState();syncResidents(office);
  expect(office.characters.size).toBe(ROSTER.length);
  expect([...office.characters.values()].every(c=>!c.isActive)).toBe(true);
  expect(office.getPersistableSeats()).toEqual({});
  const first=office.characters.get(residentId(0))!;first.wanderTimer=8;syncResidents(office);expect(first.wanderTimer).toBe(8);
 });
 it('binds chief to a real session and restores resident after closure',()=>{
  const office=new OfficeState();syncResidents(office);office.addAgent(15);expect(syncResidents(office).get('chief')).toBe(15);
  expect(office.characters.has(residentId(0))).toBe(false);expect(office.characters.get(15)?.agentName).toBe('Gökhan');
  office.characters.delete(15);syncResidents(office);expect(office.characters.has(residentId(0))).toBe(true);
 });
 it('matches explicit roles only',()=>{expect(roleFromLabel('[senior-backend] implement')).toBe('senior-backend');expect(roleFromLabel('Explore')).toBeUndefined();expect(roleFromLabel('senior-backend may help')).toBeUndefined();});
 it('hides closed transcript watchers and distinguishes concurrent chief sessions',()=>{
  const office=new OfficeState();
  for(const [id,session] of [[15,'idle-session'],[16,'working-session'],[17,'closed-session']] as const){office.addAgent(id);office.agentSessionIds.set(id,session);}
  const work={inventoryAvailable:true,groups:[{sessionId:'idle-session',live:true,members:[{id:'lead',liveState:'idle'}]},{sessionId:'working-session',live:true,members:[{id:'lead',liveState:'running'}]}]} as import('./types.js').WorkOverview;
  expect(syncResidents(office,[],[],work).get('chief')).toBe(16);
  expect(office.getCharacters().map(ch=>ch.id)).not.toContain(17);
  expect(office.characters.get(15)?.agentName).toBe('Gökhan · idle');
  expect(office.characters.get(16)?.agentName).toBe('Gökhan · work');
  expect(office.characters.get(15)?.isActive).toBe(false);expect(office.characters.get(16)?.isActive).toBe(true);
  syncResidents(office,[],[],{inventoryAvailable:false,groups:[]});expect(office.getCharacters().map(ch=>ch.id)).toContain(17);
 });
 it('each theme has unique workstations for the full roster',()=>{for(const theme of ['studio','night','garden'] as const){const layout=makeLayout(theme);expect(layout.tiles.length).toBe(layout.cols*layout.rows);expect(layout.furniture.filter(f=>f.uid.startsWith('seat-')).length).toBe(ROSTER.length);expect(new Set(layout.furniture.map(f=>f.uid)).size).toBe(layout.furniture.length);}});
});

import {readFileSync,readdirSync} from 'node:fs';
import {buildDynamicCatalog,type LoadedAssetData,getCatalogEntry} from '../office/layout/furnitureCatalog.js';
it('uses installed furniture and lets idle characters walk with the native engine',()=>{
 const base='../node_modules/pixel-agents/dist/assets/furniture';
 const catalog:LoadedAssetData['catalog']=[];const sprites:LoadedAssetData['sprites']={};
 for(const folder of readdirSync(base)){
  const root=JSON.parse(readFileSync(`${base}/${folder}/manifest.json`,'utf8'));
  const visit=(item:Record<string,unknown>,inherited:Record<string,unknown>)=>{
   const props={...inherited,...item};
   if(item.type==='asset'){
    const id=String(item.id);catalog.push({...props,id,label:String(root.name),category:root.category,isDesk:root.category==='desks'} as LoadedAssetData['catalog'][number]);sprites[id]=[['#ffffff']];
   }else for(const child of (item.members as Record<string,unknown>[]??[]))visit(child,props);
  };visit(root,{});
 }
 buildDynamicCatalog({catalog,sprites});
 for(const theme of ['studio','night','garden'] as const){
  const layout=makeLayout(theme);expect(layout.furniture.every(f=>Boolean(getCatalogEntry(f.type)))).toBe(true);
  // Review physical placement, rather than merely counting furniture.
  for(const [i,a] of layout.furniture.entries()){
   const blocks=getPlacementBlockedTiles([a]);
   for(const tile of blocks){const [col,row]=tile.split(',').map(Number);expect(layout.tiles[row*layout.cols+col],a.uid+' extends into a wall or outside its room').toBe(1);}
   for(const b of layout.furniture.slice(i+1))expect([...getPlacementBlockedTiles([b])].filter(t=>blocks.has(t)),a.uid+' overlaps '+b.uid).toEqual([]);
  }
  for(const mount of WALL_PLACEMENTS){
   const item=layout.furniture.find(f=>f.uid===mount.uid)!;
   const entry=getCatalogEntry(item.type)!;
   expect(item.row+(mount.lift??0),mount.uid+' touches its wall').toBe(COZY_ROOMS[mount.room].top);
   expect(entry.canPlaceOnWalls).toBe(true);
   expect(entry.sprite.findIndex(row=>row.some(Boolean)),mount.uid+' has no empty upper sprite margin').toBeLessThanOrEqual(1);
  }
  const kitchen=['kitchen-sink','kitchen-oven','kitchen-coffee','kitchen-fridge'].map(uid=>layout.furniture.find(f=>f.uid===uid)!);
  for(let i=1;i<kitchen.length;i++)expect(kitchen[i].col).toBe(kitchen[i-1].col+getCatalogEntry(kitchen[i-1].type)!.footprintW);
  expect(new Set(kitchen.map(f=>f.row*16+getCatalogEntry(f.type)!.sprite.length)).size,'appliance fronts align').toBe(1);
  for(const [index,room] of COZY_ROOMS.entries())for(const col of ROOM_WINDOWS[index]??[]){
   for(const f of layout.furniture.filter(f=>getCatalogEntry(f.type)?.canPlaceOnWalls&&f.row===room.top&&f.col>room.left&&f.col<room.right))
    expect(f.col+getCatalogEntry(f.type)!.footprintW<=col||f.col>=col+2,`${f.uid} covers a window`).toBe(true);
  }
  for(const role of ROSTER){
   const desk=layout.furniture.find(f=>f.uid==='desk-'+role.key)!;
   const chair=layout.furniture.find(f=>f.uid==='seat-'+role.key)!;
   if(chair.type==='BB_EMBEDDED_SEAT'){
    expect(chair.row).toBe(desk.row+getCatalogEntry(desk.type)!.footprintH-1);
    expect(chair.col).toBe(desk.col+(role.key==='sales-lead'?1:2));
   }else{
    expect(chair.type).toMatch(/^BB_(OFFICE_BACK|EXEC_MODERN)$/);
    expect(chair.row).toBe(desk.row+getCatalogEntry(desk.type)!.footprintH);
    expect(chair.col).toBe(desk.col+1);
   }
  }
  expect(ROOM_RUGS).toHaveLength(4);
  expect(new Set(ROOM_RUGS.map(r=>r.type)).size).toBe(4);
  const office=new OfficeState(layout);syncResidents(office);
  for(const p of GARDEN_PAVING)for(let y=p.row;y<p.row+p.h;y++)for(let x=p.col;x<p.col+p.w;x++){
   expect(layout.tiles[y*layout.cols+x],'garden path runs into a wall or pond').toBe(1);
   expect(office.blockedTiles.has(`${x},${y}`),'garden path runs into furniture').toBe(false);
  }
  expect(ROSTER.every((r,i)=>office.characters.get(residentId(i))?.seatId===`seat-${r.key}`)).toBe(true);
  for(const r of ROSTER){const seat=office.seats.get(`seat-${r.key}`)!;const tile=`${seat.seatCol},${seat.seatRow}`;const blockers=layout.furniture.filter(f=>f.uid!==`seat-${r.key}`&&getPlacementBlockedTiles([f]).has(tile)).map(f=>f.uid);expect(blockers,`${r.key}: ${blockers.join(',')}`).toEqual([]);}
  const positions=new Map([...office.characters.values()].map(c=>[c.id,[c.x,c.y]]));
  const chiefSeat=office.seats.get('seat-chief')!;
  const helper=office.addSubagent(residentId(0),'ceo-helper');
  const helperCharacter=office.characters.get(helper)!;
  expect(insideCeo(helperCharacter.tileCol,helperCharacter.tileRow)).toBe(false);
  office.removeSubagent(residentId(0),'ceo-helper');
  // The oak CEO door is a collision wall, not merely a decoration.
  const openBlocks=new Set(office.blockedTiles);openBlocks.delete(`${chiefSeat.seatCol},${chiefSeat.seatRow}`);
  expect(findPath(HALL_HUB.col,HALL_HUB.row,chiefSeat.seatCol,chiefSeat.seatRow,office.tileMap,openBlocks)).toEqual([]);
  for(const {col,row} of SOCIAL_VISITS)expect(findPath(HALL_HUB.col,HALL_HUB.row,col,row,office.tileMap,office.blockedTiles).length,`${col},${row} visit`).toBeGreaterThan(0);
  // Every non-private room doorway joins its interior to the common routes.
  for(const room of COZY_ROOMS.filter(r=>!r.locked)){
   const col=room.doorSide==='east'?room.right-1:room.doorSide==='west'?room.left+1:room.door;
   const row=room.doorSide==='north'?room.top+1:room.doorSide==='south'?room.bottom-1:room.door;
   expect(findPath(HALL_HUB.col,HALL_HUB.row,col,row,office.tileMap,office.blockedTiles).length,room.label+' is connected').toBeGreaterThan(0);
  }
  expect(findPath(46,56,HALL_HUB.col,HALL_HUB.row,office.tileMap,office.blockedTiles).length,'main entrance crosses reception to the hallway').toBeGreaterThan(0);
  expect(layout.furniture.every(f=>f.type.startsWith('BB_'))).toBe(true);
  expect(COZY_ROOMS.map(r=>r.label)).not.toContain('Kış bahçesi');
  expect(COZY_ROOMS.map(r=>r.label)).not.toContain('Tuvaletler');
  expect(COZY_ROOMS.map(r=>r.label)).not.toContain('Depo');
  expect(layout.furniture.some(f=>f.uid.startsWith('storage-'))).toBe(false);
  expect(findPath(53,69,POND.left+2,POND.top+2,office.tileMap,office.blockedTiles)).toEqual([]);
  for(const role of ROSTER.filter(r=>r.key!=='chief')){
   const seat=office.seats.get(`seat-${role.key}`)!;
   expect(findPath(seat.seatCol,seat.seatRow,HALL_HUB.col,HALL_HUB.row,office.tileMap,office.blockedTiles).length,`${role.key} can reach the shared hallway`).toBeGreaterThan(0);
  }
  let moved=false;
  let sawSocialVisit=false;
  for(let i=0;i<2400;i++){
   office.update(0.1);
   sawSocialVisit ||= [...office.characters.values()].some(c=>(c.ambientPause??0)>0);
   moved ||= [...office.characters.values()].some(c=>{const start=positions.get(c.id);return start&&(c.x!==start[0]||c.y!==start[1]);});
   const chief=office.characters.get(residentId(0))!;
   expect(chief.tileCol).toBeGreaterThanOrEqual(CEO_ROOM.left);
   expect(chief.tileCol).toBeLessThanOrEqual(CEO_ROOM.right);
   expect(chief.tileRow).toBeGreaterThanOrEqual(CEO_ROOM.top);
   expect(chief.tileRow).toBeLessThan(CEO_ROOM.bottom);
   expect([...office.characters.values()].filter(c=>c.id!==residentId(0)).every(c=>!insideCeo(c.tileCol,c.tileRow))).toBe(true);
  }
  expect(moved).toBe(true);
  expect(sawSocialVisit).toBe(true);
  const visitor=[...office.characters.values()].find(c=>c.ambientTarget);
  expect(visitor).toBeDefined();
  office.setAgentActive(visitor!.id,true);office.update(.1);
  expect(visitor!.ambientTarget).toBeUndefined();expect(visitor!.ambientPause).toBe(0);
  office.setAgentActive(visitor!.id,false);
  expect([...office.characters.values()].every(c=>!c.isActive)).toBe(true);
 }
},20000);

it('encloses every indoor room and divides SEO into actual six-person teams',()=>{
 const layout=makeLayout('studio');
 for(let row=BUILDING.top;row<=BUILDING.bottom;row++)for(let col=BUILDING.left;col<=BUILDING.right;col++){
  expect(layout.tiles[row*layout.cols+col],'no grass/void inside the building').not.toBe(255);
  if(col===BUILDING.left||col===BUILDING.right||row===BUILDING.top||row===BUILDING.bottom){
   const exit=row===BUILDING.bottom&&[46,66].some(at=>Math.abs(col-at)<=1);
   expect(layout.tiles[row*layout.cols+col]).toBe(exit?1:0);
  }
 }
 expect(COZY_ROOMS.filter(r=>r.outdoor).every(r=>r.top>BUILDING.bottom)).toBe(true);
 const seo=WORK_TEAMS.filter(t=>t.roles.every(key=>key.startsWith('seo-')));
 expect(seo).toHaveLength(3);expect(seo.every(t=>t.roles.length===6)).toBe(true);
 expect(new Set(WORK_TEAMS.flatMap(t=>t.roles)).size).toBe(ROSTER.length);
 for(const team of WORK_TEAMS)for(const key of team.roles){
  const desk=layout.furniture.find(f=>f.uid==='desk-'+key)!;
  expect(contains(COZY_ROOMS[team.room],desk.col,desk.row)).toBe(true);
 }
 expect(layout.furniture.filter(f=>['BB_MAPLE','BB_CHERRY','BB_PINE'].includes(f.type)).length).toBeGreaterThanOrEqual(18);
 const tree=layout.furniture.find(f=>f.type==='BB_MAPLE')!;
 expect(getPlacementBlockedTiles([tree]).size,'walk under foliage, block only the trunk').toBe(2);
});

it('maps direct specialist sessions by task identity and keeps the chief resident',()=>{
 const office=new OfficeState(makeLayout('studio'));office.addAgent(80,undefined,undefined,'seat-seo-sxo');
 office.agentSessionIds.set(80,'deadbeef-1111-2222-3333-444444444444');
 const tasks=[{sessionId:'deadbeef',role:'finance-analyst'}];
 const bindings=syncResidents(office,[],tasks);
 expect(bindings.get('finance-analyst')).toBe(80);expect(bindings.has('chief')).toBe(false);
 expect(office.characters.get(80)?.agentName).toBe(ROSTER.find(r=>r.key==='finance-analyst')!.name);
 expect(office.characters.get(80)?.seatId).toBe('seat-finance-analyst');
 expect(office.characters.has(residentId(0))).toBe(true);
 expect(syncResidents(office,[],tasks).get('finance-analyst')).toBe(80);
});
it('recognizes native subtask prefixes and preserves explicit roles across label replacement',()=>{
 expect(roleFromLabel('Subtask: [senior-backend] implement')).toBe('senior-backend');
 expect(roleFromLabel('Subtask: [Explore] explore')).toBeUndefined();
 const office=new OfficeState(makeLayout('studio'));office.addAgent(81);
 office.characters.get(81)!.agentName='[senior-backend] delegated';
 expect(syncResidents(office).get('senior-backend')).toBe(81);
 expect(syncResidents(office).get('senior-backend')).toBe(81);
});

it('refines old furniture placement while preserving user decoration and occupied destinations',()=>{
 const old=makeLayout('studio');old.layoutRevision=115;const printer=old.furniture.find(f=>f.uid==='finance-printer')!;printer.col=12;printer.row=51;
 const custom={uid:'owner-decoration',type:'BB_FLOWERS',col:19,row:34};old.furniture.push(custom);
 const next=refineSavedLayout(old);expect(next.furniture.find(f=>f.uid===printer.uid)).toMatchObject({col:11,row:49});expect(next.furniture.find(f=>f.uid===custom.uid)).toBe(custom);expect(old.furniture.find(f=>f.uid===printer.uid)).toMatchObject({col:12,row:51});
 old.furniture.push({...printer,uid:'owner-equipment',col:11,row:49});expect(refineSavedLayout(old).furniture.find(f=>f.uid===printer.uid)).toMatchObject({col:12,row:51});
});

it('keeps every concurrent chief session in the private CEO room without borrowing another team desk',()=>{
 const office=new OfficeState(makeLayout('studio'));
 for(const id of [501,502,503]){office.addAgent(id);office.agentSessionIds.set(id,'session-'+id);}
 syncResidents(office);
 for(const id of [501,502,503]){const ch=office.characters.get(id)!;expect(ch.privateOffice).toBe(true);expect(insideCeo(ch.tileCol,ch.tileRow)).toBe(true);if(ch.seatId){const seat=office.seats.get(ch.seatId)!;expect(insideCeo(seat.seatCol,seat.seatRow)).toBe(true);}}
 office.setAgentActive(502,false);office.setAgentActive(503,false);office.setAgentActive(501,true);syncResidents(office);
 expect(office.characters.get(501)?.seatId).toBe('seat-chief');
 const occupied=[501,502,503].map(id=>office.characters.get(id)!.seatId).filter(Boolean);expect(new Set(occupied).size).toBe(occupied.length);
 for(let i=0;i<500;i++)office.update(.1);
 expect([501,502,503].every(id=>{const ch=office.characters.get(id)!;return insideCeo(ch.tileCol,ch.tileRow);})).toBe(true);
});

it('groups default CEO visitor seats without moving owner-customized furniture',()=>{
 const old=makeLayout('studio');old.layoutRevision=116;
 for(const f of old.furniture){if(f.uid==='ceo-sofa')f.type='BB_SOFA';if(f.uid==='ceo-table')f.col=8;if(f.uid==='ceo-chair'){f.col=12;f.row=8;}}
 const upgraded=refineSavedLayout(old);
 expect(upgraded.furniture.find(f=>f.uid==='ceo-sofa')).toMatchObject({type:'BB_ARMCHAIR',col:5,row:11});
 expect(upgraded.furniture.find(f=>f.uid==='ceo-chair')).toMatchObject({col:9,row:11});
 const custom=old.furniture.find(f=>f.uid==='ceo-chair')!;custom.col=11;
 expect(refineSavedLayout(old).furniture.find(f=>f.uid===custom.uid)).toMatchObject({col:11,row:8});
});

it('upgrades default studio and game groups while preserving owner changes',()=>{
 const old=makeLayout('studio');old.layoutRevision=117;
 for(const f of old.furniture){if(f.uid==='studio-camera'){f.col=8;f.row=28;}if(f.uid==='studio-light'){f.col=13;f.row=27;}if(f.uid==='studio-chair'){f.col=5;f.row=28;}}
 old.furniture=old.furniture.filter(f=>f.uid!=='game-bench');old.furniture.push({uid:'game-sofa',type:'BB_SOFA',col:59,row:53},{uid:'game-table',type:'BB_COFFEE_TABLE',col:62,row:53},{uid:'game-plant',type:'BB_MONSTERA',col:71,row:51});
 const upgraded=refineSavedLayout(old);
 expect(upgraded.furniture.find(f=>f.uid==='studio-camera')).toMatchObject({col:10,row:29});
 expect(upgraded.furniture.some(f=>f.uid==='game-sofa')).toBe(false);expect(upgraded.furniture.find(f=>f.uid==='game-bench')).toMatchObject({col:69,row:52});
 old.furniture.find(f=>f.uid==='studio-camera')!.col=6;old.furniture.find(f=>f.uid==='game-table')!.col=63;
 const customized=refineSavedLayout(old);expect(customized.furniture.find(f=>f.uid==='studio-camera')!.col).toBe(6);expect(customized.furniture.some(f=>f.uid==='game-sofa')).toBe(true);
});

it('adds department equipment without overwriting customized boards or blocked additions',()=>{
 const old=makeLayout('studio');old.layoutRevision=118;old.furniture=old.furniture.filter(f=>!f.uid.endsWith('pod-plant')&&!['finance-review','finance-visitor','accounting-printer','studio-fill-light','grove-seat-bed','grove-seat-shrub','terrace-seat-bed'].includes(f.uid));
 old.furniture.find(f=>f.uid==='accounting-board')!.type='BB_NOTICE';
 old.furniture.find(f=>f.uid==='sales-board')!.type='BB_ANALYTICS_BOARD';
 old.furniture.push({uid:'owner-review-corner',type:'BB_ARMCHAIR',col:12,row:52});
 const next=refineSavedLayout(old);
 expect(next.furniture.find(f=>f.uid==='accounting-board')!.type).toBe('BB_LEDGER_BOARD');
 expect(next.furniture.find(f=>f.uid==='sales-board')!.type).toBe('BB_ANALYTICS_BOARD');
 expect(next.furniture.some(f=>f.uid==='finance-review')).toBe(false);
 expect(next.furniture.some(f=>f.uid==='accounting-printer')).toBe(true);
});
