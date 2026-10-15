import atlasUrl from './assets/japanese-garden-atlas.png';
import {motionEnabled,motionLevel} from './motion.js';
import type {FurnitureInstance} from '../office/types.js';
let atlas:HTMLImageElement|null=null;
export function japaneseAtlasReady(){
 if(!atlas&&typeof Image!=='undefined'){atlas=new Image();atlas.src=atlasUrl;}
 return !!atlas?.complete&&!!atlas.naturalWidth;
}
/** Root anchors match the existing physical tree/planter footprint; enlarged crowns are visual overhangs. */
export function japanesePlant(f:FurnitureInstance){
 if(!f.uid?.startsWith('garden-'))return null;
 if(f.type==='BB_CHERRY')return {variant:0,w:f.uid.includes('west-')||f.uid.includes('south-')?136:112,h:f.uid.includes('west-')||f.uid.includes('south-')?132:112};
 if(f.uid.includes('bonsai'))return {variant:2,w:46,h:43};
 if(f.type==='BB_MAPLE'&&/north-maple-b|edge-maple|deck-maple/.test(f.uid))return {variant:1,w:94,h:104};
 if(f.type==='BB_PINE'&&/edge-pine|north-pine/.test(f.uid))return {variant:3,w:42,h:86};
 return null;
}
export function drawJapanesePlant(c:CanvasRenderingContext2D,f:FurnitureInstance,x:number,y:number,z:number){
 const plant=japanesePlant(f);if(!plant||!japaneseAtlasReady()||!atlas)return false;
 const frames=[[0,8,710,548],[716,0,658,557],[66,565,642,568],[751,557,620,586]], [sx,sy,sw,sh]=frames[plant.variant];
 const scale=atlas.naturalWidth/1374,w=plant.w*z,h=plant.h*z,base=y+f.sprite.length*z,cx=x+(f.sprite[0]?.length??0)*z/2,left=cx-w/2,top=base-h;
 if(left+w<0||left>c.canvas.width||base<0||top>c.canvas.height)return true;
 c.fillStyle='#263d2830';c.beginPath();c.ellipse(cx,base-2*z,w*.35,5*z,0,0,Math.PI*2);c.fill();
 // Each band bends around the roots; the trunk base stays perfectly stationary.
 const t=motionEnabled()?performance.now()/1000:0;
 for(let band=0;band<8;band++){const a=band/8,b=(band+1)/8,wind=t?Math.sin(t*.75+f.x*.017)*(1-b)*(1-b)*1.6*z:0;
  c.drawImage(atlas,sx*scale,(sy+sh*a)*scale,sw*scale,sh/8*scale,Math.round(left+wind),Math.round(top+h*a),w,Math.ceil(h*(b-a))+1);
 }
 return true;
}
export function renderSakuraPetals(c:CanvasRenderingContext2D,furniture:FurnitureInstance[],ox:number,oy:number,z:number){
 if(!motionEnabled()||!japaneseAtlasReady())return;
 const t=performance.now()/1000,count=motionLevel()==='live'?14:8;
 c.save();c.beginPath();c.rect(ox+32*z,oy+56*16*z,73*16*z,20*16*z);c.clip();
 for(const f of furniture){const p=japanesePlant(f);if(p?.variant!==0)continue;const cx=f.x+(f.sprite[0]?.length??64)/2,base=f.y+f.sprite.length;
  for(let i=0;i<count;i++){const phase=(t*(.045+i%3*.006)+i/count+f.x*.001)%1;
   const x=cx-p.w*.42+(i*29%p.w)+phase*32+Math.sin(t*.7+i)*7,y=base-p.h*.73+phase*p.h*.9;
   c.fillStyle=i%3?'#f4c0ce':'#ffe6e9';c.fillRect(Math.round(ox+x*z),Math.round(oy+y*z),(i%2+1)*z,z);if(i%3===0)c.fillRect(Math.round(ox+(x+1)*z),Math.round(oy+(y-1)*z),z,z);
  }
 }c.restore();
}
/** Bounded pond fish and pollinators are scenery, not extra Claude sessions or pet jobs. */
export function renderGardenFauna(c:CanvasRenderingContext2D,ox:number,oy:number,z:number){
 const t=motionEnabled()?performance.now()/1000:0;c.save();c.translate(ox,oy);c.scale(z,z);
 c.save();c.beginPath();c.roundRect(18*16+10,66*16+9,11*16-20,4*16-18,18);c.clip();
 for(let i=0;i<3;i++){const a=t*.12+i*2.1,x=23.5*16+Math.sin(a)*49,y=68*16+Math.sin(a*1.7+i)*12,dir=Math.cos(a)>=0?1:-1;
  c.fillStyle='#263e4230';c.fillRect(Math.round(x-4),Math.round(y+3),11,3);c.fillStyle=i%2?'#e3c8a6b0':'#df9872b0';c.fillRect(Math.round(x-4),Math.round(y),8,3);c.fillStyle='#e8d8bcb0';c.fillRect(Math.round(x-2),Math.round(y),3,2);c.fillStyle='#cd8c69a0';c.fillRect(Math.round(x-dir*6),Math.round(y+Math.sin(t*3+i)),3,2);
 }c.restore();
 for(let i=0;i<4;i++){const x=(15+i*13)*16+Math.sin(t*.3+i)*20,y=(i%2?69:61)*16+Math.sin(t*.7+i*2)*11,wing=t?Math.floor(t*5+i)%3:1;
  c.fillStyle=i%2?'#dab478':'#dac0d7';c.fillRect(Math.round(x-3),Math.round(y-wing),2,2+wing);c.fillRect(Math.round(x+1),Math.round(y-wing),2,2+wing);c.fillStyle='#5e6144';c.fillRect(Math.round(x),Math.round(y),1,3);
 }c.restore();
}
