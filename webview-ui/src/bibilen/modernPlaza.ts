import {BUILDING,COZY_ROOMS,ROOM_WINDOWS} from './layouts.js';
import type {SpriteData} from '../office/types.js';

// Exact project identity: names, test fixtures and other hosts never opt in accidentally.
export function isOneLineWorkspace(id:string|null|undefined){
 return id==='e9392047-aa3b-4e4a-84aa-ab06fbd17956'||id==='h~80b0fe8422234778~e9392047-aa3b-4e4a-84aa-ab06fbd17956';
}
export const PLAZA={floor:'#292f39',hall:'#353e49',seam:'#222932',frame:'#151e29',edge:'#8b9cab',glass:'#9ec9df45',accent:'#64c8c4',white:'#dbe3e9'};
/** Replaces only the enclosed interior. Outdoor scenery remains outside the facade. */
export function paintPlazaInterior(c:CanvasRenderingContext2D){
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(x,y,w,h);};
 const l=BUILDING.left*16,t=BUILDING.top*16,w=(BUILDING.right-BUILDING.left+1)*16,h=(BUILDING.bottom-BUILDING.top+1)*16;
 rect(l,t,w,h,PLAZA.hall);
 for(let y=t;y<t+h;y+=32)for(let x=l;x<l+w;x+=32){rect(x,y,32,1,'#2c343e');rect(x,y,1,32,'#2c343e');rect(x+2,y+2,28,1,'#46505b');}
 // Exterior facade is distinct from light internal glazing.
 rect(l,t,w,16,PLAZA.frame);rect(l,t,16,h,PLAZA.frame);rect(l+w-16,t,16,h,PLAZA.frame);rect(l,t+h-16,w,16,PLAZA.frame);
 const glass=(x:number,y:number,width:number,height:number)=>{
  rect(x,y,width,height,PLAZA.hall);rect(x,y,width,height,PLAZA.glass);
  if(width>height){
   rect(x,y,width,2,PLAZA.edge);rect(x,y+height-3,width,3,PLAZA.frame);
   for(let xx=x;xx<x+width;xx+=32){rect(xx,y,2,height,PLAZA.frame);for(let i=0;i<7;i++)if(xx+10+i<x+width)rect(xx+10+i,y+3+i,2,1,'#e7faff75');}
  }else{rect(x,y,2,height,PLAZA.frame);rect(x+width-2,y,2,height,PLAZA.edge);for(let yy=y;yy<y+height;yy+=32){rect(x,yy,width,2,PLAZA.frame);for(let i=0;i<7;i++)if(yy+9+i<y+height)rect(x+4+i,yy+9+i,1,1,'#e7faff75');}}
 };
 for(const [index,r] of COZY_ROOMS.entries()){
  if(r.outdoor)continue;
  const x=r.left*16,y=r.top*16,rw=(r.right-r.left+1)*16,rh=(r.bottom-r.top+1)*16;
  rect(x+16,y+16,rw-32,rh-32,index===8?'#272a3b':index===4?'#242e38':PLAZA.floor);
  for(let yy=y+16;yy<y+rh-16;yy+=32)for(let xx=x+16;xx<x+rw-16;xx+=32){rect(xx,yy,Math.min(32,x+rw-16-xx),1,PLAZA.seam);rect(xx,yy,1,Math.min(32,y+rh-16-yy),PLAZA.seam);}
  // Solid service wall carries boards/screens; corridor sides are glazed.
  rect(x,y,rw,16,'#475361');rect(x,y+2,rw,2,'#a5b3c0');rect(x+6,y+12,rw-12,2,index===8?'#9f8be1':PLAZA.accent);
  glass(x,y+16,16,rh-32);glass(x+rw-16,y+16,16,rh-32);glass(x,y+rh-16,rw,16);
  // Same 3-tile openings and collision boundaries as the existing floor plan.
  for(const d of [{side:r.doorSide,at:r.door},...(r.extraDoors??[])]){
   const horizontal=d.side==='north'||d.side==='south';const dx=horizontal?(d.at-1)*16:(d.side==='west'?r.left:r.right)*16,dy=horizontal?(d.side==='north'?r.top:r.bottom)*16:(d.at-1)*16;
   rect(dx,dy,horizontal?48:16,horizontal?16:48,PLAZA.hall);
   if(horizontal){rect(dx-2,dy,3,16,PLAZA.edge);rect(dx+47,dy,3,16,PLAZA.edge);rect(dx,dy+14,48,2,PLAZA.accent);}else{rect(dx,dy-2,16,3,PLAZA.edge);rect(dx,dy+47,16,3,PLAZA.edge);rect(dx+14,dy,2,48,PLAZA.accent);}
   if(r.locked){rect(dx+3,dy+2,42,12,'#557589');rect(dx+22,dy+4,3,7,PLAZA.accent);}
  }
  for(const col of ROOM_WINDOWS[index]??[]){rect(col*16,y+2,30,9,'#749eaf');rect(col*16+2,y+3,26,2,'#cee9f2');}
  // Thin wall-mounted light bars, never in front of a window or board.
  rect(x+rw-30,y+5,14,3,'#edf4f4');
 }
 // A branded stone reception, aligned with the existing counter below it.
 rect(40*16,44*16-8,7*16,18,PLAZA.frame);rect(40*16,44*16+9,7*16,2,PLAZA.accent);
 c.fillStyle=PLAZA.white;c.font='bold 9px monospace';c.textAlign='center';c.fillText('ONE-LINE',43.5*16,44*16+4);
}

const modernCache=new WeakMap<SpriteData,Map<string,SpriteData>>();
/** Keep dimensions and activity anchors; electronics and plants retain their semantic details. */
export function plazaFurniture(type:string|undefined,source:SpriteData):SpriteData{
 if(!type||!/^BB_/.test(type)||/TREE|MAPLE|PINE|CHERRY|FLOWER|SHRUB|HEDGE|POND|PLANT|MONSTERA|CACTUS|CAMERA|SOFTBOX/.test(type))return source;
 let variants=modernCache.get(source);if(!variants){variants=new Map();modernCache.set(source,variants);}const saved=variants.get(type);if(saved)return saved;
 const h=source.length,w=source[0]?.length??0;if(!w)return source;
 // Complex business stations keep their charts, ledgers and devices; remove warm timber materials.
 const image=source.map(row=>row.map(color=>{
  if(!/^#[0-9a-f]{6}$/i.test(color))return color;const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  if(r>g*1.12&&g>b*1.15&&r>65){const v=Math.round((r+g+b)/3);return v>155?'#bdc8d2':v>110?'#8494a5':v>75?'#526173':'#293544';}return color;
 }));
 const rect=(x:number,y:number,rw:number,rh:number,color:string)=>{for(let yy=Math.max(0,y);yy<Math.min(h,y+rh);yy++)for(let xx=Math.max(0,x);xx<Math.min(w,x+rw);xx++)image[yy][xx]=color;};
 if(['BB_WORK_DESK','BB_EXEC_DESK','BB_STUDIO_DESK'].includes(type)){
  // Retain the workstation electronics above the surface; new slab and steel T-legs below.
  for(let yy=18;yy<h;yy++)image[yy].fill('');
  rect(2,17,w-4,7,type==='BB_EXEC_DESK'?'#526477':'#dbe3e9');rect(3,18,w-6,1,'#f1f6f8');rect(2,23,w-4,2,'#677b8d');
  rect(6,25,2,h-27,'#293748');rect(w-9,25,2,h-27,'#293748');rect(3,h-3,9,2,'#8ea2b5');rect(w-13,h-3,9,2,'#8ea2b5');
 }else if(type==='BB_SOFA'||type==='BB_ARMCHAIR'){
  image.forEach(row=>row.fill(''));rect(2,7,w-4,h-11,'#283849');rect(4,5,w-8,12,'#728b9d');rect(5,17,w-10,h-22,'#a3b5bf');rect(2,12,5,h-17,'#536e80');rect(w-7,12,5,h-17,'#536e80');rect(5,h-5,3,3,'#c5d0d7');rect(w-8,h-5,3,3,'#c5d0d7');
  if(w>35)rect(Math.floor(w/2),8,1,h-14,'#536e80');
 }else if(type==='BB_COFFEE_TABLE'||type==='BB_REVIEW_TABLE'){
  image.forEach(row=>row.fill(''));rect(4,9,w-8,h-18,'#c6dbe1');rect(5,10,w-10,2,'#e6f3f5');rect(4,h-11,w-8,2,'#607d90');rect(7,h-9,2,6,'#6b7f91');rect(w-9,h-9,2,6,'#6b7f91');
 }
 variants.set(type,image);return image;
}
