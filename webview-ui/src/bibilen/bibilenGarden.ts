import type {OfficeLayout,PlacedFurniture} from '../office/types.js';
export const isBibilenWorkspace=(id:string|null|undefined)=>id==='2c03578a-b572-451c-9c07-4a155bfc3cb4';
export const BIBILEN_GARDEN={left:2,right:74,top:56,bottom:75};
export const BIBILEN_POND={col:18,row:66,w:11,h:4};
export const BIBILEN_DECK={col:50,row:65,w:14,h:6};
export const BIBILEN_BEDS=[
 {col:4,row:58,w:36,h:4},{col:49,row:58,w:14,h:4},
 {col:4,row:62,w:6,h:12},{col:70,row:58,w:3,h:16},
 {col:30,row:73,w:17,h:2},{col:50,row:73,w:14,h:2},
];
const inBox=(x:number,y:number,b:{col:number;row:number;w:number;h:number})=>x>=b.col&&x<b.col+b.w&&y>=b.row&&y<b.row+b.h;
const inBed=(x:number,y:number,b:typeof BIBILEN_BEDS[number])=>{
 if(!inBox(x,y,b))return false;
 return !((x===b.col||x===b.col+b.w-1)&&(y===b.row||y===b.row+b.h-1));
};
const gardenFurniture:PlacedFurniture[]=[
 {uid:'grove-bench-a',type:'BB_BENCH',col:22,row:63},
 {uid:'terrace-bench-a',type:'BB_BENCH',col:43,row:67},
 {uid:'grove-beds-a',type:'BB_FLOWERBED',col:30,row:73},
 {uid:'terrace-beds-a',type:'BB_GARDEN_PLANTER',col:49,row:59},
 {uid:'garden-table',type:'BB_GARDEN_TABLE',col:55,row:66},
 {uid:'garden-chair-a',type:'BB_DINING_FRONT',col:56,row:65},
 {uid:'garden-chair-b',type:'BB_DINING_FRONT',col:58,row:65},
 {uid:'garden-chair-c',type:'BB_DINING_BACK',col:56,row:69},
 {uid:'garden-chair-d',type:'BB_DINING_BACK',col:58,row:69},
 // Roots stay in beds. Canopies overhang the lawns and paths naturally.
 ...([
  ['north-cherry','BB_CHERRY',6,56],['north-maple-a','BB_MAPLE',13,57],['north-maple-b','BB_MAPLE',22,56],['north-pine','BB_PINE',31,57],['north-maple-c','BB_MAPLE',34,57],
  ['east-cherry','BB_CHERRY',52,57],['east-maple','BB_MAPLE',58,57],['west-maple','BB_MAPLE',4,64],['west-cherry','BB_CHERRY',5,68],
  ['edge-pine-a','BB_PINE',70,58],['edge-maple','BB_MAPLE',69,62],['edge-pine-b','BB_PINE',70,68],
  ['south-maple','BB_MAPLE',33,69],['south-cherry','BB_CHERRY',40,69],['deck-maple','BB_MAPLE',54,69],['deck-pine','BB_PINE',61,70],
  ['north-shrub-a','BB_SHRUB',4,59],['north-shrub-b','BB_SHRUB',11,60],['north-shrub-c','BB_SHRUB',19,59],['north-shrub-d','BB_SHRUB',28,60],['north-shrub-e','BB_SHRUB',37,59],
  ['west-shrub-a','BB_SHRUB',5,62],['west-shrub-b','BB_SHRUB',7,70],['east-shrub-a','BB_SHRUB',70,65],['east-shrub-b','BB_SHRUB',71,71],
  ['south-shrub-b','BB_SHRUB',45,73],['deck-shrub-a','BB_SHRUB',50,73],['deck-shrub-b','BB_SHRUB',62,73],
  ['bonsai-west','BB_SHRUB',10,65],['bonsai-deck','BB_SHRUB',63,65],
  ['path-lantern-a','BB_LANTERN',47,62],['path-lantern-b','BB_LANTERN',68,69],
 ] as [string,string,number,number][]).map(([uid,type,col,row])=>({uid:'garden-'+uid,type,col,row})),
];
export function applyBibilenGarden(layout:OfficeLayout,enabled:boolean):OfficeLayout{
 if(!enabled||layout.cols!==77||layout.rows!==77)return layout;
 const tiles=[...layout.tiles],areaTiles=layout.areaTiles?[...layout.areaTiles]:undefined;
 for(let row=56;row<=75;row++)for(let col=2;col<=74;col++){
  const edge=col===2||col===74||row===75;
  const blocked=edge||BIBILEN_BEDS.some(b=>inBed(col,row,b))||inBox(col,row,BIBILEN_POND);
  tiles[row*77+col]=blocked?0:1;
  if(areaTiles)areaTiles[row*77+col]=blocked?null:col<38?'Bahçe · Koruluk':'Bahçe · Teras';
 }
 return {...layout,tiles,areaTiles,furniture:[...layout.furniture.filter(f=>f.row<56),...gardenFurniture.map(f=>({...f}))]};
}

/** Warm woodland garden: one loop, one pond, one social terrace and continuous planting edges. */
export function paintBibilenGarden(c:CanvasRenderingContext2D){
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
 c.save();c.beginPath();c.rect(2*16,56*16,73*16,20*16);c.clip();
 rect(32,56*16,73*16,20*16,'#83995c');
 for(let y=56*16;y<76*16;y+=5)for(let x=32;x<75*16;x+=7){const n=((x*37)^(y*19))>>>0;if(n%5<2)rect(x+n%4,y+n%3,2,1,n%3?'#91a668':'#748c51');}
 // Border planting reads as one landscape edge, rather than identical hedge props.
 for(const b of BIBILEN_BEDS){
  c.fillStyle='#58764a';c.beginPath();c.roundRect(b.col*16-3,b.row*16-3,b.w*16+6,b.h*16+6,14);c.fill();
  c.fillStyle='#465f3a';c.beginPath();c.roundRect(b.col*16,b.row*16,b.w*16,b.h*16,12);c.fill();
  for(let y=b.row*16+5;y<(b.row+b.h)*16-3;y+=7)for(let x=b.col*16+5;x<(b.col+b.w)*16-3;x+=9){
   const n=(x*23+y*11)%17;rect(x+n%5-2,y+(n%4)-2,4+n%3,2,['#527940','#6b8a49','#8d9f5a','#3c623a'][n%4]);
   if(n===0&&x%3===0){rect(x+3,y-1,2,2,n%3?'#d7bc88':'#d7c1c4');}
  }
 }
 // A connected, softly rounded path loop. Both actual facade exits join it without dead ends.
 const paths=[{col:45,row:56,w:3,h:9},{col:65,row:56,w:3,h:17},{col:12,row:62,w:56,h:3},{col:12,row:62,w:3,h:11},{col:12,row:70,w:56,h:3}];
 const outline=(expand:number)=>{c.beginPath();for(const p of paths)c.roundRect(p.col*16-expand,p.row*16-expand,p.w*16+expand*2,p.h*16+expand*2,13+expand);};
 outline(3);c.fillStyle='#b6b28c';c.fill();outline(0);c.fillStyle='#d1c4a5';c.fill();
 c.save();outline(0);c.clip();
 for(let y=56*16;y<74*16;y+=16)for(let x=11*16;x<69*16;x+=24){const shift=(y/16)%2?12:0,n=(x*13+y*7)%5;rect(x+shift+1,y+1,22,14,['#d9cdb1','#d2c4a7','#dfd3b8','#cbbc9d','#d8c9ae'][n]);rect(x+shift+2,y+2,20,1,'#e9dfc6');}
 c.restore();
 // The deck occupies one coherent social zone; furniture follows the same physical layout.
 const d=BIBILEN_DECK,dx=d.col*16,dy=d.row*16,dw=d.w*16,dh=d.h*16;
 rect(dx+3,dy+4,dw,dh,'#43553e55');rect(dx,dy,dw,dh,'#6e533d');
 for(let y=dy+2;y<dy+dh-4;y+=7){rect(dx+3,y,dw-6,5,(y%3)?'#af8b5c':'#b59468');rect(dx+5,y,dw-10,1,'#d0ad7c');for(let x=dx+7;x<dx+dw-4;x+=30){rect(x,y+2,1,1,'#735c42');}}
 rect(dx,dy+dh-4,dw,4,'#6d5139');rect(dx+5,dy+dh,dw-10,3,'#c3a477');
 // Clear, low transitions from the covered office to garden paving.
 for(const at of [46,66]){rect((at-1)*16,56*16,48,12,'#c9bd9d');rect((at-1)*16+2,56*16+2,44,2,'#e8ddc3');rect((at-1)*16+2,56*16+10,44,2,'#a79573');}
 // Natural stone pond: broad irregular edge and muted water, no isolated decorative puddle.
 const p=BIBILEN_POND,x=p.col*16,y=p.row*16,w=p.w*16,h=p.h*16;
 c.fillStyle='#526a48';c.beginPath();c.roundRect(x-8,y-8,w+16,h+16,30);c.fill();
 c.fillStyle='#918d73';c.beginPath();c.roundRect(x-4,y-4,w+8,h+8,26);c.fill();
 c.fillStyle='#c2b89a';c.beginPath();c.roundRect(x-1,y-1,w+2,h+2,24);c.fill();
 c.fillStyle='#456d62';c.beginPath();c.roundRect(x+7,y+6,w-14,h-12,20);c.fill();
 c.save();c.beginPath();c.roundRect(x+8,y+7,w-16,h-14,20);c.clip();
 for(let yy=y+10;yy<y+h-7;yy+=4)for(let xx=x+10;xx<x+w-7;xx+=7){const n=(xx*11+yy*23)%7;rect(xx,yy,3+n%4,1,['#628d7a','#527b6b','#7d9d7e','#3f685e'][n%4]);}c.restore();
 for(let i=0;i<17;i++){const a=i*Math.PI*2/17,px=x+w/2+Math.cos(a)*(w/2+2),py=y+h/2+Math.sin(a)*(h/2+1);rect(px-3,py-2,6+i%3,4,['#a7a18a','#b9b097','#868b73'][i%3]);}
 // Soft path lighting belongs beside the route, with only a few grounded fixtures.
 for(const p of [{x:47.5*16,y:63.5*16},{x:68.5*16,y:70.5*16}]){const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,28);g.addColorStop(0,'#f0d59e30');g.addColorStop(1,'#f0d59e00');c.fillStyle=g;c.fillRect(p.x-28,p.y-28,56,56);}
 // Low perimeter: no dividing fence through the middle of the garden.
 rect(32,75*16,73*16,5,'#566d43');rect(32,75*16,73*16,1,'#a0ad79');
 c.restore();
}
export function renderBibilenPond(c:CanvasRenderingContext2D,x:number,y:number,zoom:number,time:number){
 const p=BIBILEN_POND;c.save();c.translate(x,y);c.scale(zoom,zoom);c.beginPath();c.roundRect(p.col*16+10,p.row*16+9,p.w*16-20,p.h*16-18,18);c.clip();
 for(let i=0;i<9;i++){c.fillStyle=i%3?'#b9cfab50':'#d6dcb66b';c.fillRect(Math.round((p.col+1)*16+i*16+Math.sin(time*.6+i)*4),(p.row+1)*16+8+(i%3)*11,7,1);}
 c.restore();
}
