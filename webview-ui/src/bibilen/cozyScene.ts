import {motionEnabled} from './motion.js';
import {BUILDING,COZY_ROOMS,COZY_COLS,COZY_ROWS,ROOM_RUGS,ROOM_WINDOWS,GARDEN_PAVING,GARDEN_TERRACE,EXTERIOR_APPROACHES,POND,type CozyRoom} from './layouts.js';
import {getCatalogEntry} from '../office/layout/furnitureCatalog.js';
import {getCachedSprite} from '../office/sprites/spriteCache.js';

let scenery:HTMLCanvasElement|null=null,lastReady=false;
export function renderCozyScene(ctx:CanvasRenderingContext2D,x:number,y:number,zoom:number){
 const ready=Boolean(getCatalogEntry('BB_WALL_SINK'));
 if(!scenery||ready!==lastReady){
  lastReady=ready;scenery=document.createElement('canvas');scenery.width=COZY_COLS*16;scenery.height=COZY_ROWS*16;
  const c=scenery.getContext('2d')!;c.imageSmoothingEnabled=false;
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const prop=(type:string,col:number,row:number,w?:number,h?:number)=>{
   const e=getCatalogEntry(type);if(e)c.drawImage(getCachedSprite(e.sprite,1),col*16,row*16,w??e.sprite[0].length,h??e.sprite.length);
  };
  // Outdoors is organic ground. It never appears inside the building polygon.
  rect(0,0,scenery.width,scenery.height,'#7e9459');
  for(let yy=0;yy<scenery.height;yy+=7)for(let xx=0;xx<scenery.width;xx+=9){
   const n=(xx*19+yy*23)%13;
   if(n<7)rect(xx+(yy%4),yy+2,2,2,['#718b50','#90a36a','#658248'][n%3]);
  }
  const brick=(col:number,row:number,w:number,h:number)=>{
   const px=col*16,py=row*16,pw=w*16,ph=h*16;
   c.save();c.beginPath();c.rect(px,py,pw,ph);c.clip();
   rect(px,py,pw,ph,'#b98e66');
   // Small running-bond bricks, one grid shared by every joined path.
   for(let yy=Math.floor(py/4)*4;yy<py+ph;yy+=4){
    rect(px,yy,pw,1,'#927250');
    for(let xx=Math.floor(px/8)*8+((yy/4)%2?4:0);xx<px+pw;xx+=8){
     rect(xx,yy,1,4,'#927250');rect(xx+2,yy+1,4,1,'#d7b486');
    }
   }
   c.restore();
  };
  // One enclosed, continuous limestone hallway slab.
  const bl=BUILDING.left*16,bt=BUILDING.top*16,bw=(BUILDING.right-BUILDING.left+1)*16,bh=(BUILDING.bottom-BUILDING.top+1)*16;
  rect(bl+8,bt+8,bw+8,bh+12,'#40513a55');
  rect(bl,bt,bw,bh,'#c9c1ac');
  for(let yy=bt;yy<bt+bh;yy+=32)for(let xx=bl;xx<bl+bw;xx+=32){
   rect(xx,yy,32,1,'#b1aa99');rect(xx,yy,1,32,'#b1aa99');
   rect(xx+2,yy+2,28,1,'#ddd5bf');
  }
  // Room surfaces are different from the covered common hall.
  for(const room of COZY_ROOMS.filter(r=>!r.outdoor)){
   for(let row=room.top+1;row<room.bottom;row++)for(let col=room.left+1;col<room.right;col++){
    const px=col*16,py=row*16,n=(col*17+row*31)%7;
    if(room.floor==='tile'){
     rect(px,py,16,16,'#e4dbc0');rect(px,py,16,1,'#bbb69d');rect(px,py,1,16,'#bbb69d');rect(px+2,py+2,12,1,'#f7edce');
    }else if(room.floor==='slate'){
     rect(px,py,16,16,(col+row)%2?'#66725b':'#6c775f');rect(px,py,16,1,'#505c49');
    }else{
     const colors=room.floor==='walnut'?['#a77d50','#b0875a','#a77a50','#b58d5f','#a97f55','#b38c5d','#ad8253']:room.floor==='studio'?['#bda17a','#c4a980','#b99c76','#c5aa84','#bda27c','#c9ae86','#c0a580']:['#b48150','#bd8c58','#b88754','#bd8e5d','#b88453','#c29561','#bc8954'];
     rect(px,py,16,16,colors[n]);rect(px,py+7,16,1,'#90683e');rect(px,py+15,16,1,'#90683e');
     if((col+row)%3===0)rect(px+5,py,1,7,'#90683e');
     if((col+row)%3===1)rect(px+10,py+8,1,7,'#90683e');
     rect(px+2,py+3,9,1,'#e0b78238');
    }
   }
  }
  for(const r of ROOM_RUGS)prop(r.type,r.col,r.row,r.w*16,r.h*16);
  // Garden is below the exterior facade, not between working rooms.
  for(const room of COZY_ROOMS.filter(r=>r.outdoor)){
   const l=room.left*16,t=room.top*16,w=(room.right-room.left+1)*16,h=(room.bottom-room.top+1)*16;
   rect(l,t,w,h,room.label.includes('Koruluk')?'#789358':'#839c61');
   for(let yy=t+6;yy<t+h;yy+=9)for(let xx=l+5;xx<l+w;xx+=13){
    const seed=((xx*73856093)^(yy*19349663))>>>0;
    if(seed%11<4)rect(xx+(seed%7),yy+((seed>>>4)%5),2,1,seed%2?'#6c8650':'#91a66c');
   }
   // Low planted/fenced boundaries, visually distinct from solid indoor walls.
   rect(l,t,w,7,'#536b43');rect(l,t,5,h,'#506c43');rect(l+w-5,t,5,h,'#506c43');rect(l,t+h-7,w,7,'#536b43');
   for(let xx=l+12;xx<l+w;xx+=32){rect(xx,t,3,10,'#8d744d');rect(xx,t+h-10,3,10,'#8d744d');}
  }
  for(const p of EXTERIOR_APPROACHES)brick(p.left,p.top,p.right-p.left+1,p.bottom-p.top+1);
  for(const p of GARDEN_PAVING)brick(p.col,p.row,p.w,p.h);
  brick(GARDEN_TERRACE.col,GARDEN_TERRACE.row,GARDEN_TERRACE.w,GARDEN_TERRACE.h);
  // A terrace and a woodland bed, rather than loose pots along blank grass.
  for(let col=4;col<37;col+=4)prop('BB_HEDGE',col,73,60,22);
  for(let col=40;col<73;col+=4)prop('BB_HEDGE',col,73,60,22);
  prop('BB_POND',POND.left,POND.top);
  const door=(room:CozyRoom,side:CozyRoom['doorSide'],at:number)=>{
   const horizontal=side==='north'||side==='south';
   const px=horizontal?(at-1)*16:(side==='west'?room.left:room.right)*16;
   const py=horizontal?(side==='north'?room.top:room.bottom)*16:(at-1)*16;
   if(room.outdoor){
    rect(px,py,horizontal?48:16,horizontal?16:48,'#b98e66');
    brick(horizontal?at-1:(side==='west'?room.left:room.right),horizontal?(side==='north'?room.top:room.bottom):at-1,horizontal?3:1,horizontal?1:3);
    return;
   }
   if(horizontal){
    rect(px,py,48,16,'#c9c1ac');rect(px,py+11,48,3,'#a9855e');
    rect(px-2,py-5,5,26,'#624b34');rect(px+45,py-5,5,26,'#624b34');
    rect(px,py-3,3,22,'#b78d5e');rect(px+45,py-3,3,22,'#b78d5e');
   }else{
    rect(px,py,16,48,'#c9c1ac');rect(px+1,py,3,48,'#a9855e');
    rect(px-3,py-2,22,5,'#624b34');rect(px-3,py+45,22,5,'#624b34');
    rect(px-1,py,20,3,'#b78d5e');rect(px-1,py+45,20,3,'#b78d5e');
   }
   if(room.locked){
    rect(px+3,py-3,42,22,'#64482e');rect(px+6,py,36,17,'#9c7547');
    for(const dx of [9,21,33])rect(px+dx,py+1,1,15,'#c49a62');
    rect(px+35,py+8,3,3,'#dfbc65');rect(px+19,py-12,9,7,'#684b30');rect(px+21,py-15,4,5,'#d2b36b');
   }
  };
  // Exterior enclosure: thick facade and a continuous front foundation.
  rect(bl,bt,bw,16,'#654b33');rect(bl+3,bt+3,bw-6,10,'#eadfbe');
  rect(bl,bt,16,bh,'#735637');rect(bl+3,bt,8,bh,'#cdb88e');
  rect((BUILDING.right)*16,bt,16,bh,'#735637');rect(BUILDING.right*16+4,bt,9,bh,'#cdb88e');
  rect(bl,BUILDING.bottom*16,bw,23,'#654b33');rect(bl+2,BUILDING.bottom*16+3,bw-4,11,'#d4c3a1');
  rect(bl+2,BUILDING.bottom*16+16,bw-4,5,'#9d7853');
  for(const [index,room] of COZY_ROOMS.entries()){
   if(room.outdoor){
    door(room,room.doorSide,room.door);for(const d of room.extraDoors??[])door(room,d.side,d.at);
    continue;
   }
   const l=room.left*16,r=room.right*16,t=room.top*16,b=room.bottom*16;
   // Every side occupies its actual collision wall tile, not a thin fence.
   rect(l,t,r-l+16,16,'#725539');rect(l+3,t+2,r-l+10,13,'#eadfbe');
   rect(l+3,t+16,r-l+10,10,'#71805a');rect(l+3,t+16,r-l+10,2,'#aab38a');
   for(let xx=l+7;xx<r+12;xx+=10)rect(xx,t+19,1,7,'#536447');
   rect(l,t+16,16,b-t-16,'#725539');rect(l+3,t+16,8,b-t-16,'#d5c29d');rect(l+12,t+16,3,b-t-16,'#a98357');
   rect(r,t+16,16,b-t-16,'#725539');rect(r+4,t+16,8,b-t-16,'#d5c29d');rect(r+1,t+16,3,b-t-16,'#a98357');
   rect(l,b,r-l+16,16,'#705238');rect(l+2,b+2,r-l+12,7,'#d3c29d');rect(l+2,b+10,r-l+12,3,'#b38b5d');
   for(const col of ROOM_WINDOWS[index]??[])prop('BB_WINDOW',col,room.top-1);
   // Lights are confined to unoccupied wall slots; no random panel overlays.
   if(![1,5,11,12,13,14].includes(index))prop('BB_LAMP',room.left+1,room.top);
   door(room,room.doorSide,room.door);for(const d of room.extraDoors??[])door(room,d.side,d.at);
   c.font='bold 7px Georgia,serif';c.textAlign='center';c.textBaseline='middle';
   const title=room.locked?'GÖKHAN · ÖZEL OFİS':room.label,width=c.measureText(title).width+10;
   if(index!==10){
    const center=(l+r+16)/2,plaqueY=t-12;
    rect(center-width/2-1,plaqueY,width+2,11,'#614831');rect(center-width/2,plaqueY+1,width,9,'#eadcba');c.fillStyle='#354c36';c.fillText(title,center,plaqueY+5.5);
   }
  }
  // Reception brand belongs directly above the actual welcome counter.
  const sx=41*16,sy=44*16-10;
  rect(sx-2,sy-2,75,24,'#64452d');rect(sx,sy,71,20,'#ebdebc');rect(sx+2,sy+2,67,16,'#f4e8ce');
  rect(sx+6,sy+7,3,7,'#5b734c');rect(sx+4,sy+6,4,4,'#6c8251');rect(sx+9,sy+4,3,5,'#6c8251');
  c.font='bold 12px Georgia,serif';c.textAlign='left';c.fillStyle='#36543b';c.font='bold 8px Georgia,serif';c.fillText('Agent House',sx+15,sy+11);
  // Material thresholds distinguish covered halls from the outside promenade.
  for(const at of [46,66]){
   rect((at-1)*16,55*16+13,48,6,'#ad9977');rect((at-1)*16+2,55*16+19,44,4,'#d9c4a0');
  }
  rect(45*16+5,56*16,38,10,'#7b6849');rect(45*16+7,56*16+2,34,1,'#c4ab78');
 }
 ctx.imageSmoothingEnabled=false;ctx.drawImage(scenery,x,y,scenery.width*zoom,scenery.height*zoom);
 if(motionEnabled()){
  const time=performance.now()/1000;
  ctx.save();ctx.translate(x,y);ctx.scale(zoom,zoom);
  // Small surface highlights remain inside the pond; no walkability changes.
  ctx.fillStyle='#dfecce';ctx.globalAlpha=.3;
  for(let i=0;i<5;i++){const px=(POND.left+1)*16+10+i*12,py=(POND.top+1)*16+12+(i%3)*9;ctx.fillRect(px+Math.round(Math.sin(time*.8+i)*3),py,5,1);}
  ctx.globalAlpha=.22;ctx.fillStyle='#d5e9cb';
  for(let i=0;i<2;i++){const radius=3+((time*.9+i*5)%8),cx=(POND.left+3)*16,cy=(POND.top+2.5)*16;for(let a=0;a<12;a++){const angle=a*Math.PI/6;ctx.fillRect(Math.round(cx+Math.cos(angle)*radius),Math.round(cy+Math.sin(angle)*radius*.5),2,1);}}
  ctx.globalAlpha=.8;
  for(let i=0;i<4;i++){
   const bx=(i<2?11:57)*16+Math.sin(time*.24+i*2)*42,by=(i<2?67:62)*16+Math.cos(time*.31+i)*24;
   const flap=Math.sin(time*7+i)>0?2:1;ctx.fillStyle=i%2?'#edc487':'#e4a5ba';ctx.fillRect(Math.round(bx)-flap,Math.round(by),flap,2);ctx.fillRect(Math.round(bx)+1,Math.round(by),flap,2);ctx.fillStyle='#596047';ctx.fillRect(Math.round(bx),Math.round(by),1,2);
  }
  ctx.restore();
 }
}
