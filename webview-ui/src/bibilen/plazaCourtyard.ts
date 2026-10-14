import type {OfficeLayout,PlacedFurniture} from '../office/types.js';

export const COURTYARD_POOL={col:21,row:65,w:22,h:4};
export const COURTYARD_BEDS=[
 {col:4,row:59,w:27,h:3},{col:35,row:59,w:8,h:3},{col:51,row:59,w:21,h:3},
 {col:4,row:65,w:4,h:5},{col:68,row:65,w:4,h:5},
 {col:7,row:71,w:22,h:3},{col:49,row:71,w:23,h:3},
];
const within=(c:number,r:number,b:{col:number;row:number;w:number;h:number})=>c>=b.col&&c<b.col+b.w&&r>=b.row&&r<b.row+b.h;
/** One-Line's local presentation layout; does not overwrite a host's saved layout. */
export function applyPlazaCourtyard(layout:OfficeLayout,enabled:boolean):OfficeLayout{
 if(!enabled||layout.cols!==77||layout.rows!==77)return layout;
 const tiles=[...layout.tiles],areaTiles=layout.areaTiles?[...layout.areaTiles]:undefined;
 for(let row=56;row<=75;row++)for(let col=2;col<=74;col++){
  const border=col===2||col===74||row===57||row===75;
  const entry=col>=45&&col<=47||col>=65&&col<=67;
  const walk=!(border&&!(row===57&&entry))&&!COURTYARD_BEDS.some(b=>within(col,row,b))&&!within(col,row,COURTYARD_POOL);
  tiles[row*layout.cols+col]=walk?1:0;
  if(areaTiles)areaTiles[row*layout.cols+col]=walk?(col<38?'Bahçe · Koruluk':'Bahçe · Teras'):null;
 }
 const outdoor:PlacedFurniture[]=[
  {uid:'grove-bench-a',type:'BB_BENCH',col:10,row:63},
  {uid:'terrace-bench-a',type:'BB_BENCH',col:58,row:63},
  {uid:'grove-beds-a',type:'BB_FLOWERBED',col:7,row:71},
  {uid:'terrace-beds-a',type:'BB_GARDEN_PLANTER',col:49,row:71},
 ];
 return {...layout,tiles,areaTiles,furniture:[...layout.furniture.filter(f=>f.row<56),...outdoor]};
}

/** Pixel-drawn limestone court and layered tropical planting, cached with the static scene. */
export function paintPlazaCourtyard(c:CanvasRenderingContext2D){
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
 c.save();c.beginPath();c.rect(2*16,56*16,73*16,20*16);c.clip();
 rect(32,56*16,73*16,20*16,'#c5c2ae');
 // Large slabs instead of isolated stepping stones. Deterministic patina stays quiet.
 for(let row=56;row<=75;row+=2)for(let col=2;col<=74;col+=4){const x=col*16,y=row*16,n=(col*17+row*13)%4;rect(x,y,64,32,['#d9d6c5','#d5d2bf','#dedbca','#d3d0bf'][n]);rect(x,y,64,1,'#b8b7a8');rect(x,y,1,32,'#b8b7a8');rect(x+2,y+2,60,1,'#eeebdc');}
 for(const at of [46,66]){rect((at-2)*16,56*16,80,16,'#e4e1d2');for(let dy=2;dy<16;dy+=5){rect((at-2)*16,56*16+dy,80,2,'#f6f2e5');rect((at-2)*16,56*16+dy+2,80,1,'#b9b8ab');}}
 // Perimeter parapet, with two real entrances aligned to the building exits.
 rect(32,57*16,16,18*16,'#b0afa0');rect(74*16,57*16,16,18*16,'#b0afa0');rect(32,75*16,73*16,12,'#aaa99c');
 rect(32,57*16,16,2,'#f0edde');rect(74*16,57*16,16,2,'#f0edde');rect(32,75*16,73*16,3,'#ece8d9');
 for(const [a,b]of [[2,45],[48,65],[68,75]]){rect(a*16,57*16,(b-a)*16,10,'#b7b6a8');rect(a*16,57*16,(b-a)*16,3,'#f3efe2');}
 const leaf=(x:number,y:number,size:number,tone:string,seed:number)=>{
  // Angular paired leaves keep the pixel language, with a bright central vein.
  c.fillStyle='#203e28';c.beginPath();c.moveTo(x-size,y+2);c.lineTo(x-2,y-size/2);c.lineTo(x+size,y-3);c.lineTo(x+3,y+size/2);c.closePath();c.fill();
  c.fillStyle=tone;c.beginPath();c.moveTo(x-size+2,y+1);c.lineTo(x-2,y-size/2+2);c.lineTo(x+size-2,y-3);c.lineTo(x+2,y+size/2-2);c.closePath();c.fill();rect(x-2,y-1,Math.max(2,size-2),1,seed%3?'#749557':'#9caf69');
 };
 const bambooLeaf=(x:number,y:number,side:number,tone:string)=>{
  c.fillStyle=tone;c.beginPath();c.moveTo(x,y);c.lineTo(x+side*8,y-6);c.lineTo(x+side*17,y-8);c.lineTo(x+side*10,y-3);c.closePath();c.fill();
  rect(x+side*7,y-4,3,1,'#9bac68');
 };
 const tropical=(x:number,y:number)=>{
  for(let i=0;i<5;i++){const dx=(i-2)*7,dy=-(19+((i*11)%17));c.fillStyle=i%2?'#4c793b':'#678b43';c.beginPath();c.moveTo(x,y);c.lineTo(x+dx-5,y+dy+6);c.lineTo(x+dx,y+dy);c.lineTo(x+dx+6,y+dy+9);c.closePath();c.fill();rect(x+Math.round(dx/2),y+Math.round(dy/2),1,8,'#91a25a');}
 };
 const rock=(x:number,y:number)=>{
  c.fillStyle='#4f5a51';c.beginPath();c.moveTo(x-19,y+7);c.lineTo(x-13,y-10);c.lineTo(x+3,y-20);c.lineTo(x+19,y-10);c.lineTo(x+24,y+10);c.closePath();c.fill();
  c.fillStyle='#879184';c.beginPath();c.moveTo(x-13,y-10);c.lineTo(x+3,y-20);c.lineTo(x+10,y-9);c.lineTo(x-4,y+1);c.closePath();c.fill();
  c.fillStyle='#677668';c.beginPath();c.moveTo(x+10,y-9);c.lineTo(x+19,y-10);c.lineTo(x+24,y+10);c.lineTo(x+4,y+6);c.closePath();c.fill();rect(x-13,y+8,29,3,'#374f36');
 };
 for(const [i,b]of COURTYARD_BEDS.entries()){
  const x=b.col*16,y=b.row*16,w=b.w*16,h=b.h*16;
  rect(x+4,y+6,w,h+3,'#696f5a3d');rect(x,y,w,h,'#aaa99a');rect(x+3,y-4,w-6,h-3,'#e7e4d7');rect(x+7,y,w-14,h-13,'#263e29');rect(x,y+h-9,w,9,'#aaa99b');rect(x+2,y+h-10,w-4,3,'#f1eddf');
  // Dense underplanting is layered before tall stems, not a scattering of isolated trees.
  for(let yy=y+8;yy<y+h-12;yy+=9)for(let xx=x+13;xx<x+w-10;xx+=10){const n=(xx*29+yy*17+i*31)%11;leaf(xx+(n%7)-3,yy+(n%5)-2,5+n%4,['#476c39','#5c7b43','#7b954b','#365a36'][n%4],n);}
  const count=Math.max(1,Math.floor(w/55));
  for(let j=0;j<count;j++){
   const bx=x+20+j*(w-35)/count,by=y+h-20,height=b.row<63?48+(j%3)*8:65+(j%3)*12;
   for(let k=0;k<4;k++){
    const sx=Math.round(bx+k*4-5),top=by-height+(k%2)*7;rect(sx+1,top+2,2,by-top,'#223e2a');rect(sx,top,2,by-top,'#7c8850');
    for(let yy=top+6;yy<by;yy+=11){rect(sx-1,yy,4,1,'#b2b17a');if(yy<by-17)for(const side of [-1,1])bambooLeaf(sx,yy,side,['#4d733c','#6c8d48','#395f35'][(j+k)%3]);}
   }
   // Broad tropical leaves alternate with bamboo clusters.
   if(j%2===0)tropical(bx+22,by);
  }
  if([1,3,6].includes(i))rock(x+w*.62,y+h-22);
  // Tiny pale flowers and glossy highlights give each bed a finished edge.
  for(let xx=x+12;xx<x+w-8;xx+=17){rect(xx,y+h-17,2,2,'#c7d2a0');rect(xx+3,y+h-20,2,2,'#7eab58');}
 }
 const p=COURTYARD_POOL,x=p.col*16,y=p.row*16,w=p.w*16,h=p.h*16;
 rect(x-6,y-6,w+12,h+14,'#62685d');
 for(let yy=y-6;yy<y+h+8;yy+=3)for(let xx=x-6;xx<x+w+6;xx+=4)if(xx<x||xx>x+w||yy<y||yy>y+h)rect(xx,yy,2,2,(xx+yy)%3?'#434e47':'#92968a');
 rect(x,y,w,h,'#293e3c');rect(x+3,y+3,w-6,h-6,'#72847b');rect(x+6,y+6,w-12,h-12,'#3c6c66');rect(x+8,y+8,w-16,2,'#9cb9a4');rect(x+7,y+h-8,w-14,2,'#233e3d');
 for(let yy=y+12;yy<y+h-9;yy+=4)for(let xx=x+10;xx<x+w-10;xx+=7){const n=(xx*19+yy*7)%9;rect(xx,yy,3+n%4,1,['#6b9685','#527f73','#7da38b','#37645f'][n%4]);}
 c.restore();
}
export function renderCourtyardWater(c:CanvasRenderingContext2D,x:number,y:number,zoom:number,time:number){
 const p=COURTYARD_POOL;c.save();c.translate(x,y);c.scale(zoom,zoom);c.beginPath();c.rect(p.col*16+8,p.row*16+8,p.w*16-16,p.h*16-16);c.clip();
 for(let i=0;i<24;i++){const xx=p.col*16+14+i*13+Math.round(Math.sin(time*.5+i)*5),yy=p.row*16+12+(i*11)%38;c.fillStyle=i%3?'#b4c9a44d':'#dce2bc70';c.fillRect(xx,yy,6+i%5,1);}
 c.restore();
}
