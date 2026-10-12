import type {Character,FurnitureInstance} from '../types.js';
/** All coordinates are integer logical pixels; no real session telemetry is changed. */
export function furnitureActivity(ctx:CanvasRenderingContext2D,f:FurnitureInstance,characters:Character[],x:number,y:number,z:number){
 if(!f.uid||!['BB_ARCADE','BB_POOL','BB_COFFEE_STATION'].includes(f.type??''))return;
 const player=characters.find(c=>!c.isActive&&(c.ambientPause??0)>0&&c.ambientTarget?.furnitureUid===f.uid);if(!player||!f.uid)return;
 const t=(player.ambientElapsed??0)%4;
 const pixel=(px:number,py:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x+px*z),Math.round(y+py*z),w*z,h*z);};
 if(f.type==='BB_ARCADE'){
  // A little paddle game on the cabinet's screen, not a handheld controller.
  pixel(7,9,18,12,'#223e43');pixel(8,11+Math.floor(t*2)%6,2,4,'#cddcb9');pixel(22,11+Math.floor((4-t)*2)%6,2,4,'#e9bc6c');pixel(11+Math.floor(t*3)%9,12+Math.floor(t*2)%6,2,2,'#f3ebcf');pixel(12,30,2,1,t<2?'#edbe65':'#87644c');
 }else if(f.type==='BB_POOL'){
  // One strike every four seconds, then a bounded ball roll on the felt.
  const roll=Math.max(0,(t-1.6)/2.4);pixel(38+Math.round(roll*18),26-Math.round(roll*9),3,3,'#f4eedc');pixel(58+Math.round(roll*5),14+Math.round(roll*5),3,3,'#daaf5a');
 }else if(f.type==='BB_COFFEE_STATION'&&(player.ambientElapsed??0)<2){pixel(20,27,2,5,'#815435');pixel(18,32,5,3,'#f2e8ce');}
}
export function playerActivity(ctx:CanvasRenderingContext2D,ch:Character,x:number,y:number,z:number){
 if(ch.isActive||(ch.ambientPause??0)<=0)return;
 const pixel=(px:number,py:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x+px*z),Math.round(y+py*z),w*z,h*z);};
 if(ch.ambientTarget?.activity==='pool'&&ch.ambientPartnerId===undefined){const t=(ch.ambientElapsed??0)%4;const stroke=t<1.6?Math.round(t*3):0;pixel(8,5-stroke,1,23,'#bb9a69');pixel(8,4-stroke,1,1,'#eee6d0');}
 if(ch.ambientPartnerId!==undefined){const speaking=(Math.floor((ch.ambientElapsed??0)/1.5)+ch.id)%2===0;if(!speaking)return;pixel(1,-9,12,7,'#49483e');pixel(2,-8,10,5,'#eee7cf');pixel(4,-3,2,2,'#eee7cf');for(let i=0;i<3;i++)pixel(4+i*3,-6,1,1,'#79785e');}
}
