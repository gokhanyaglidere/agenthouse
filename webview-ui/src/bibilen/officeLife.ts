import {createCharacter} from '../office/engine/characters.js';
import {CharacterState,Direction} from '../office/types.js';
import type {FurnitureInstance,Character} from '../office/types.js';
import {motionEnabled} from './motion.js';
const host=createCharacter(-1900000001,5,null,null);
/** Decorative member of the scene only: no session, role binding, task or persisted seat. */
export function receptionHost(furniture:FurnitureInstance[],visitors:Character[]){
 const counter=furniture.find(f=>f.uid==='reception-counter');if(!counter)return null;
 host.x=counter.x+48;host.y=counter.y+17;host.tileCol=Math.floor(host.x/16);host.tileRow=Math.floor(host.y/16);host.state=CharacterState.IDLE;host.isActive=false;host.matrixEffect=null;host.agentName='Karşılama · dekoratif';
 const visitor=visitors.find(ch=>!ch.sessionHidden&&ch.y>counter.y&&Math.hypot(ch.x-host.x,ch.y-host.y)<90);
 host.dir=visitor?(Math.abs(visitor.x-host.x)>40?visitor.x>host.x?Direction.RIGHT:Direction.LEFT:Direction.DOWN):Direction.DOWN;
 return host;
}
export function activeWorkstation(f:FurnitureInstance,characters:Character[]){
 if(!f.uid?.startsWith('desk-'))return false;
 return characters.some(ch=>!ch.sessionHidden&&ch.isActive&&ch.state===CharacterState.TYPE&&ch.seatId===f.uid!.replace(/^desk-/,'seat-')&&Math.abs(ch.x-(f.x+24))<48&&Math.abs(ch.y-(f.y+32))<48);
}
/** Tiny UI inside existing monitor glass, with no fake execution events. */
export function workstationScreen(c:CanvasRenderingContext2D,f:FurnitureInstance,characters:Character[],x:number,y:number,z:number){
 if(!['BB_WORK_DESK','BB_EXEC_DESK','BB_STUDIO_DESK'].includes(f.type??'')||!activeWorkstation(f,characters))return;
 const exec=f.type==='BB_EXEC_DESK',studio=f.type==='BB_STUDIO_DESK',sx=exec?16:studio?16:12,sy=exec?5:studio?7:9,w=exec?7:studio?7:10,h=exec?4:5;
 const tick=motionEnabled()?Math.floor(performance.now()/550):0;
 c.save();c.beginPath();c.rect(x+sx*z,y+sy*z,w*z,h*z);c.clip();c.fillStyle='#213f43';c.fillRect(x+sx*z,y+sy*z,w*z,h*z);
 for(let i=0;i<3;i++){c.fillStyle=i===2?'#e5c27b':'#9acbb5';c.fillRect(Math.round(x+(sx+1)*z),Math.round(y+(sy+1+i)*z),(2+(tick+i)%Math.max(2,w-3))*z,z*.6);}c.restore();
}
export function receptionLabel(c:CanvasRenderingContext2D,ch:Character,ox:number,oy:number,z:number){
 const label='Karşılama · dekoratif',size=Math.max(10,Math.min(13,9*z));c.save();c.font=`500 ${size}px system-ui`;const w=c.measureText(label).width+12,x=Math.round(ox+ch.x*z-w/2),y=Math.round(oy+(ch.y-40)*z);c.fillStyle='#253a30e8';c.fillRect(x,y,w,size+7);c.fillStyle='#e4eddc';c.fillText(label,x+6,y+size+1);c.restore();
}
