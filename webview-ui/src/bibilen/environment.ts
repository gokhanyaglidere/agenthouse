import {COZY_ROOMS} from './layouts.js';
import {motionEnabled,motionLevel} from './motion.js';
import {getCatalogEntry} from '../office/layout/furnitureCatalog.js';
import type {SpriteData,Character} from '../office/types.js';
const doors=new Map<string,number>();let last=0;let crowns:Set<SpriteData>|null=null;
export function treeSway(c:CanvasRenderingContext2D,bitmap:HTMLCanvasElement,sprite:SpriteData,x:number,y:number,zoom:number){
 if(x+bitmap.width<0||y+bitmap.height<0||x>c.canvas.width||y>c.canvas.height)return;
 if(!crowns||crowns.size===0)crowns=new Set(['BB_MAPLE','BB_CHERRY','BB_PINE'].map(t=>getCatalogEntry(t)?.sprite).filter((s):s is SpriteData=>!!s));
 if(!motionEnabled()||!crowns.has(sprite)){c.drawImage(bitmap,x,y);return;}
 const split=Math.floor(bitmap.height*.78),shift=Math.round(Math.sin(performance.now()/2400+x/150)*zoom*.65);
 c.drawImage(bitmap,0,split,bitmap.width,bitmap.height-split,x,y+split,bitmap.width,bitmap.height-split);
 c.drawImage(bitmap,0,0,bitmap.width,split,x+shift,y,bitmap.width,split);
}
export function renderDoors(c:CanvasRenderingContext2D,x:number,y:number,zoom:number,characters:Character[]){
 const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;c.save();c.translate(x,y);c.scale(zoom,zoom);
 for(const room of COZY_ROOMS){if(room.outdoor||room.locked)continue;
  for(const d of [{side:room.doorSide,at:room.door},...(room.extraDoors??[])]){
   const horizontal=d.side==='north'||d.side==='south';const px=horizontal?(d.at-1)*16:(d.side==='west'?room.left:room.right)*16,py=horizontal?(d.side==='north'?room.top:room.bottom)*16:(d.at-1)*16;
   if(x+(px+48)*zoom<0||y+(py+48)*zoom<0||x+px*zoom>c.canvas.width||y+py*zoom>c.canvas.height)continue;
   const near=characters.some(ch=>!ch.sessionHidden&&Math.hypot(ch.x-(px+(horizontal?24:8)),ch.y-(py+(horizontal?8:24)))<42);
   const key=room.label+d.side+d.at,target=near?1:0,old=doors.get(key)??target;const value=motionEnabled()?old+Math.sign(target-old)*Math.min(Math.abs(target-old),dt*4):target;doors.set(key,value);
   const panel=Math.round(21*(1-value));c.fillStyle='#96724e';
   if(horizontal){c.fillRect(px+3,py-1,panel,12);c.fillRect(px+45-panel,py-1,panel,12);c.fillStyle='#e9c888';if(panel>4){c.fillRect(px+panel,py+4,2,3);c.fillRect(px+46-panel,py+4,2,3);}}
   else{c.fillRect(px+1,py+3,12,panel);c.fillRect(px+1,py+45-panel,12,panel);}
  }
 }c.restore();
}
const cat=['..........o..o..','..........oooo..','..oo.....oooooo.','...oo.ooooooooo.','....ooooooooooo.','.....ooooooooo..','.....oo....oo...','.....oo....oo...'];
export function renderWildlife(c:CanvasRenderingContext2D,x:number,y:number,zoom:number){
 const moving=motionEnabled(),time=moving?performance.now()/1000:0,level=motionLevel();c.save();c.translate(x,y);c.scale(zoom,zoom);
 // Decorative wildlife stays in the garden. It never creates agent activity or obstacles.
 const phase=time%32,progress=Math.min(1,(phase%16)/12),cx=10*16+progress*10*16,cy=63*16+4;const facing=phase<16?1:-1;
 c.save();c.translate(Math.round(phase<16?cx:30*16-cx),cy);c.scale(facing*1.5,1.5);
 c.fillStyle='#41503b44';c.fillRect(3,7,13,3);
 for(let row=0;row<cat.length;row++)for(let col=0;col<cat[row].length;col++)if(cat[row][col]==='o'){c.fillStyle=row<3?'#c58a55':'#ddac71';c.fillRect(col,row,1,1);}
 c.fillStyle='#f2dfbc';c.fillRect(10,5,4,2);c.fillStyle='#493d31';c.fillRect(12,3,1,1);c.fillRect(15,4,1,1);if(moving&&phase%16<12){c.fillRect(5+(Math.floor(time*4)%2),7,2,1);c.fillRect(11-(Math.floor(time*4)%2),7,2,1);}c.restore();
 for(let i=0;i<(level==='live'?5:3);i++){
  const bx=Math.round((43+i*5)*16+Math.sin(time*.25+i)*11),by=Math.round((i%2?62:71)*16+Math.cos(time*.2+i)*7);
  c.fillStyle='#52473744';c.fillRect(bx-1,by+4,7,2);c.fillStyle=i%2?'#9c7861':'#657c91';c.fillRect(bx,by,5,3);c.fillRect(bx+4,by-2,3,3);c.fillStyle='#e7bd77';c.fillRect(bx+7,by-1,2,1);c.fillStyle='#283a32';c.fillRect(bx+6,by-2,1,1);c.fillRect(bx+1,by+3,1,2);
 }
 c.restore();
}
