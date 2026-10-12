import {SOCIAL_VISITS} from '../../bibilen/layouts.js';
import {Direction,TILE_SIZE} from '../types.js';import type {Character,OfficeLayout} from '../types.js';
type Visit=NonNullable<Character['ambientTarget']>;
/** Interaction positions follow furniture, including owner layout edits. */
export function socialStations(layout:OfficeLayout):Visit[]{
 const visits:Visit[]=SOCIAL_VISITS.filter(v=>v.activity!=='game');
 for(const f of layout.furniture){
  if(f.type!=='BB_ARCADE'&&f.type!=='BB_POOL'&&f.type!=='BB_COFFEE_STATION')continue;
  const arcade=f.type==='BB_ARCADE',pool=f.type==='BB_POOL';
  const width=arcade?2:pool?5:3,col=f.col+Math.floor(width/2),row=f.row+3;
  visits.push({col,row,label:arcade?'Arcade oynuyor':pool?'Bilardo oynuyor':'Kahve hazırlıyor',activity:arcade?'arcade':pool?'pool':'coffee',furnitureUid:f.uid,facing:Direction.UP,offsetX:width%2?0:-TILE_SIZE/2,offsetY:-8});
 }
 return visits;
}
/** Small decorative conversations, never Claude messages or recorded delegations. */
export function updateSocialPairs(characters:Iterable<Character>,dt:number){
 const all=[...characters],byId=new Map(all.map(c=>[c.id,c]));
 const available=(c:Character)=>!c.isActive&&!c.sessionHidden&&!c.privateOffice&&!(c.ambientTarget?.furnitureUid&&c.ambientTarget.activity==='coffee'&&(c.ambientElapsed??0)<2)&&c.state==='idle'&&(c.ambientPause??0)>0&&!['arcade','pool'].includes(c.ambientTarget?.activity??'');
 for(const c of all){if(c.ambientPartnerId===undefined)continue;const partner=byId.get(c.ambientPartnerId);c.ambientChatTimer=Math.max(0,(c.ambientChatTimer??0)-dt);if(!partner||!available(c)||!available(partner)||partner.ambientPartnerId!==c.id||!c.ambientChatTimer){c.ambientPartnerId=undefined;c.ambientChatTimer=0;}}
 for(const c of all){if(!available(c)||c.ambientPartnerId!==undefined||Math.random()>dt*.18)continue;const partner=all.find(p=>p.id!==c.id&&available(p)&&p.ambientPartnerId===undefined&&Math.abs(p.tileCol-c.tileCol)+Math.abs(p.tileRow-c.tileRow)<=3);
  if(!partner)continue;c.ambientPartnerId=partner.id;partner.ambientPartnerId=c.id;c.ambientChatTimer=partner.ambientChatTimer=5+Math.random()*4;
 }
 for(const c of all){if(c.ambientPartnerId===undefined)continue;const p=byId.get(c.ambientPartnerId);if(!p)continue;c.dir=Math.abs(p.x-c.x)>=Math.abs(p.y-c.y)?p.x>c.x?Direction.RIGHT:Direction.LEFT:p.y>c.y?Direction.DOWN:Direction.UP;}
}
