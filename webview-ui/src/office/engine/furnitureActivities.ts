import type {Character,FurnitureInstance} from '../types.js';
/** All coordinates are integer logical pixels; no real session telemetry is changed. */
export function furnitureActivity(ctx:CanvasRenderingContext2D,f:FurnitureInstance,characters:Character[],x:number,y:number,z:number){
 if(!f.uid||!['BB_ARCADE','BB_POOL','BB_COFFEE_STATION','BB_DINING'].includes(f.type??''))return;
 const player=characters.find(c=>!c.isActive&&(c.ambientPause??0)>0&&c.ambientTarget?.furnitureUid===f.uid);if(!player||!f.uid)return;
 const t=(player.ambientElapsed??0)%4;
 const pixel=(px:number,py:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x+px*z),Math.round(y+py*z),w*z,h*z);};
 if(f.type==='BB_ARCADE'){
  // A little paddle game on the cabinet's screen, not a handheld controller.
  pixel(7,9,18,12,'#223e43');pixel(8,11+Math.floor(t*2)%6,2,4,'#cddcb9');pixel(22,11+Math.floor((4-t)*2)%6,2,4,'#e9bc6c');pixel(11+Math.floor(t*3)%9,12+Math.floor(t*2)%6,2,2,'#f3ebcf');pixel(12,30,2,1,t<2?'#edbe65':'#87644c');
 }else if(f.type==='BB_POOL'){
  // One strike every four seconds, then a bounded ball roll on the felt.
  const roll=Math.max(0,(t-1.6)/2.4);pixel(18+Math.round(roll*28),14+Math.round(roll*7),3,3,'#f4eedc');pixel(58+Math.round(roll*5),14+Math.round(roll*5),3,3,'#daaf5a');
 }else if(f.type==='BB_DINING'){for(const guest of characters.filter(c=>!c.isActive&&(c.ambientPause??0)>0&&c.ambientTarget?.furnitureUid===f.uid&&c.ambientTarget?.activity==='meal')){const px=(guest.tileCol*16+8)-f.x;pixel(px-5,5,10,3,'#f0e5ce');pixel(px-3,5,3,2,'#d29b57');pixel(px+1,5,2,2,'#83a273');}}else if(f.type==='BB_COFFEE_STATION'&&(player.ambientElapsed??0)<2){pixel(20,27,2,5,'#815435');pixel(18,32,5,3,'#f2e8ce');}
}
export function playerActivity(ctx:CanvasRenderingContext2D,ch:Character,x:number,y:number,z:number){
 if(ch.isActive||(ch.ambientPause??0)<=0)return;
 const pixel=(px:number,py:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x+px*z),Math.round(y+py*z),w*z,h*z);};
 if(ch.ambientTarget?.activity==='pool'&&ch.ambientPartnerId===undefined){const t=(ch.ambientElapsed??0)%4;const stroke=t<1.6?Math.round(t):0;pixel(14+stroke,22,18,1,'#bb9a69');pixel(32+stroke,22,1,1,'#eee6d0');pixel(13+stroke,21,2,2,'#edbfa3');}
 if(ch.ambientTarget?.activity==='water'&&ch.ambientPartnerId===undefined){const phase=Math.floor((ch.ambientElapsed??0)/.5)%4;pixel(13,21,5,4,'#8ca5a1');pixel(14,19,3,1,'#58746e');pixel(18,22,4,1,'#8ca5a1');for(let i=0;i<3;i++)pixel(22+i,23+(i+phase)%4,1,1,'#a5d5df');}
 if(ch.ambientTarget?.activity==='pet'){const hand=Math.floor((ch.ambientElapsed??0)/.4)%2;const right=ch.dir===2;pixel(right?13:-2,25+hand,5,2,'#edbfa3');pixel(right?17:-3,27+hand,2,1,'#edbfa3');if((ch.ambientElapsed??0)>3){pixel(right?20+hand*2:-8-hand*2,30-hand*2,2,2,'#e3b265');}}
 if(ch.ambientPartnerId!==undefined){const speaking=(Math.floor((ch.ambientElapsed??0)/1.5)+ch.id)%2===0;if(!speaking)return;pixel(1,-9,12,7,'#49483e');pixel(2,-8,10,5,'#eee7cf');pixel(4,-3,2,2,'#eee7cf');for(let i=0;i<3;i++)pixel(4+i*3,-6,1,1,'#79785e');}
}
