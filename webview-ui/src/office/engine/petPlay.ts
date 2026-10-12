import {findPath} from '../layout/tileMap.js';import {Direction,CharacterState,PetState} from '../types.js';import type {Character,Pet,TileType} from '../types.js';import {insideCeo} from '../../bibilen/layouts.js';
const idle=(c:Character)=>!c.isActive&&!c.privateOffice&&c.seatId!=='seat-chief'&&!c.sessionHidden&&!c.matrixEffect&&c.ambientPartnerId===undefined&&c.state===CharacterState.IDLE&&!['arcade','pool','meal','water'].includes(c.ambientTarget?.activity??'');
export function updatePetPlay(pets:Pet[],characters:Map<number,Character>,dt:number,map:TileType[][],blocked:Set<string>){
 const petIds=new Set(pets.map(p=>p.id));
 for(const c of characters.values())if(c.ambientPetId&&!petIds.has(c.ambientPetId)){c.ambientPetId=undefined;c.ambientTarget=undefined;c.ambientPause=0;if(!c.isActive){c.path=[];c.state=CharacterState.IDLE;c.wanderTimer=1;}}
 for(const p of pets){
  p.playCooldown=Math.max(0,(p.playCooldown??0)-dt);
  if(p.playAgentId!==undefined){const c=characters.get(p.playAgentId);p.playTimer=(p.playTimer??0)-dt;
   if(!c||c.isActive||c.sessionHidden||c.privateOffice||c.ambientPetId!==p.id||(p.playTimer??0)<=0){if(c&&c.ambientPetId===p.id){c.ambientPetId=undefined;c.ambientTarget=undefined;c.ambientPause=0;c.ambientElapsed=0;if(!c.isActive){c.path=[];c.state=CharacterState.IDLE;c.wanderTimer=1;}}p.playAgentId=undefined;p.playStarted=false;p.playCooldown=15;p.bubbleType=null;p.bubbleTimer=0;if(c&&!c.isActive&&(p.playTimer??0)<=0){p.state=PetState.FOLLOW;p.followTargetId=c.id;p.followDuration=0;p.followDurationLimit=4;p.followRecalcTimer=0;}continue;}
   if(c.state===CharacterState.IDLE&&!p.playStarted){p.playStarted=true;p.playTimer=6;c.ambientPause=6;c.ambientElapsed=0;}
   if(p.playStarted){c.dir=p.x>c.x?Direction.RIGHT:Direction.LEFT;p.dir=p.x>c.x?Direction.LEFT:Direction.RIGHT;p.bubbleType='heart';p.bubbleTimer=1;}
   continue;
  }
  if(p.playCooldown||p.state!==PetState.IDLE||insideCeo(p.tileCol,p.tileRow))continue;
  const c=[...characters.values()].find(c=>idle(c)&&!c.ambientPetId&&Math.abs(c.tileCol-p.tileCol)+Math.abs(c.tileRow-p.tileRow)<=4);
  if(!c||Math.random()>dt*.3)continue;
  const occupied=new Set([...characters.values()].filter(o=>o.id!==c.id&&!o.sessionHidden).flatMap(o=>[`${o.tileCol},${o.tileRow}`,...(o.ambientTarget?[`${o.ambientTarget.col},${o.ambientTarget.row}`]:[]),...(o.path.length?[`${o.path.at(-1)!.col},${o.path.at(-1)!.row}`]:[])]));
  const candidates=[{col:p.tileCol-1,row:p.tileRow},{col:p.tileCol+1,row:p.tileRow}];
  for(const target of candidates){if(target.col<0||target.row<0||insideCeo(target.col,target.row)||blocked.has(`${target.col},${target.row}`)||occupied.has(`${target.col},${target.row}`))continue;
   const path=findPath(c.tileCol,c.tileRow,target.col,target.row,map,blocked);if(!path.length&&(c.tileCol!==target.col||c.tileRow!==target.row))continue;
   c.ambientTarget={...target,label:'Hayvanı seviyor',activity:'pet'};c.ambientPetId=p.id;c.ambientPause=0;c.ambientElapsed=0;c.path=path;c.moveProgress=0;c.state=path.length?CharacterState.WALK:CharacterState.IDLE;p.path=[];p.moveProgress=0;p.playAgentId=c.id;p.playTimer=10;p.playStarted=false;p.followTargetId=null;break;
  }
 }
}
