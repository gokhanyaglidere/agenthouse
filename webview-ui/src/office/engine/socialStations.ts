import {SOCIAL_VISITS} from '../../bibilen/layouts.js';
import {layoutToSeats,getBlockedTiles} from '../layout/layoutSerializer.js';
import {Direction,TILE_SIZE} from '../types.js';import type {Character,OfficeLayout} from '../types.js';
type Visit=NonNullable<Character['ambientTarget']>;
const stationCache=new WeakMap<OfficeLayout,{signature:string;tiles:OfficeLayout['tiles'];visits:Visit[]}>();
/** Interaction positions follow furniture, including owner layout edits. */
export function socialStations(layout:OfficeLayout):Visit[]{
 const signature=layout.furniture.map(f=>`${f.uid}:${f.type}:${f.col}:${f.row}`).join('|');const cached=stationCache.get(layout);if(cached?.signature===signature&&cached.tiles===layout.tiles)return cached.visits;
 const visits:Visit[]=SOCIAL_VISITS.filter(v=>!['game','eat','garden','read'].includes(v.activity));
 const seats=layoutToSeats(layout.furniture),table=layout.furniture.find(f=>f.uid==='dining-table');
 for(const f of layout.furniture){
  if(table&&['dining-a','dining-b'].includes(f.uid)){
   const seat=seats.get(f.uid);if(seat)visits.push({col:seat.seatCol,row:seat.seatRow,label:'Masada yemek yiyor',activity:'meal',furnitureUid:table.uid,seatUid:f.uid,seated:true,facing:Direction.DOWN,offsetY:14});
  }
  if(f.type==='BB_BENCH'&&(f.uid.startsWith('grove-')||f.uid.startsWith('terrace-'))||f.type==='BB_ARMCHAIR'&&['rest-chair','cafe-chair'].includes(f.uid))visits.push({col:f.col+1,row:f.row+2,label:'Oturarak kitap okuyor',activity:'bench',furnitureUid:f.uid,facing:Direction.DOWN,seated:true,offsetX:f.type==='BB_BENCH'?0:-8,offsetY:-16});
  if(f.type==='BB_FLOWERBED'||f.type==='BB_GARDEN_PLANTER')visits.push({col:f.col-1,row:f.row+1,label:'Çiçekleri suluyor',activity:'water',furnitureUid:f.uid,facing:Direction.RIGHT});
  if(f.type!=='BB_ARCADE'&&f.type!=='BB_POOL'&&f.type!=='BB_COFFEE_STATION')continue;
  const arcade=f.type==='BB_ARCADE',pool=f.type==='BB_POOL';
  const width=arcade?2:pool?5:3,col=pool?f.col-1:f.col+Math.floor(width/2),row=pool?f.row+1:f.row+3;
  visits.push({col,row,label:arcade?'Arcade oynuyor':pool?'Bilardo oynuyor':'Kahve hazırlıyor',activity:arcade?'arcade':pool?'pool':'coffee',furnitureUid:f.uid,facing:pool?Direction.RIGHT:Direction.UP,offsetX:pool?0:width%2?0:-TILE_SIZE/2,offsetY:pool?0:-8});
 }
 const blocked=getBlockedTiles(layout.furniture);
 const usable=visits.filter(v=>v.col>=0&&v.row>=0&&v.col<layout.cols&&v.row<layout.rows&&![0,255].includes(layout.tiles[v.row*layout.cols+v.col])&&(!blocked.has(`${v.col},${v.row}`)||!!v.seatUid&&seats.has(v.seatUid)));
 stationCache.set(layout,{signature,tiles:layout.tiles,visits:usable});return usable;
}
/** Small decorative conversations, never Claude messages or recorded delegations. */
export function updateSocialPairs(characters:Iterable<Character>,dt:number){
 const all=[...characters],byId=new Map(all.map(c=>[c.id,c]));
 const available=(c:Character)=>!c.isActive&&!c.sessionHidden&&!c.privateOffice&&!(c.ambientTarget?.furnitureUid&&c.ambientTarget.activity==='coffee'&&(c.ambientElapsed??0)<2)&&c.state==='idle'&&(c.ambientPause??0)>0&&!['arcade','pool','water','meal'].includes(c.ambientTarget?.activity??'');
 for(const c of all){if(c.ambientPartnerId===undefined)continue;const partner=byId.get(c.ambientPartnerId);c.ambientChatTimer=Math.max(0,(c.ambientChatTimer??0)-dt);if(!partner||!available(c)||!available(partner)||partner.ambientPartnerId!==c.id||!c.ambientChatTimer){c.ambientPartnerId=undefined;c.ambientChatTimer=0;}}
 for(const c of all){if(!available(c)||c.ambientPartnerId!==undefined||Math.random()>dt*.18)continue;const partner=all.find(p=>p.id!==c.id&&available(p)&&p.ambientPartnerId===undefined&&Math.abs(p.tileCol-c.tileCol)+Math.abs(p.tileRow-c.tileRow)<=3);
  if(!partner)continue;c.ambientPartnerId=partner.id;partner.ambientPartnerId=c.id;c.ambientChatTimer=partner.ambientChatTimer=5+Math.random()*4;
 }
 for(const c of all){if(c.ambientPartnerId===undefined)continue;const p=byId.get(c.ambientPartnerId);if(!p)continue;c.dir=Math.abs(p.x-c.x)>=Math.abs(p.y-c.y)?p.x>c.x?Direction.RIGHT:Direction.LEFT:p.y>c.y?Direction.DOWN:Direction.UP;}
}
