import {COZY_COLS,COZY_ROWS,COZY_ROOMS} from './layouts.js';

let layer:HTMLCanvasElement|null=null;
/** Static lighting is cached, clipped to rooms, and drawn below people and labels. */
export function renderCozyLighting(ctx:CanvasRenderingContext2D,x:number,y:number,zoom:number){
 if(!layer){
  layer=document.createElement('canvas');layer.width=COZY_COLS*16;layer.height=COZY_ROWS*16;
  const c=layer.getContext('2d')!;
  const glow=(col:number,row:number,radius:number,color:string,strength:number)=>{
   const px=col*16,py=row*16,r=radius*16;
   const gradient=c.createRadialGradient(px,py,0,px,py,r);
   gradient.addColorStop(0,`rgba(${color},${strength})`);gradient.addColorStop(.5,`rgba(${color},${strength*.45})`);gradient.addColorStop(1,`rgba(${color},0)`);
   c.fillStyle=gradient;c.fillRect(px-r,py-r,r*2,r*2);
  };
  for(const [index,room]of COZY_ROOMS.entries()){
   c.save();c.beginPath();c.rect((room.left+1)*16,(room.top+1)*16,(room.right-room.left-1)*16,(room.bottom-room.top-1)*16);c.clip();
   if(index===4){
    // Softbox beam aims into the subject bay; editing desks stay neutral.
    c.save();c.beginPath();c.moveTo(8*16,28*16);c.lineTo(13*16,26*16);c.lineTo(13*16,29*16);c.closePath();c.clip();
    const beam=c.createLinearGradient(8*16,28*16,13*16,28*16);beam.addColorStop(0,'#fff7d72b');beam.addColorStop(1,'#fff7d708');c.fillStyle=beam;c.fillRect(7*16,26*16,7*16,4*16);c.restore();
    glow(11,28,3,'255,244,210',.12);
   }else if(index===8){
    glow(67,50,2.8,'116,200,225',.18);glow(70,50,2.8,'173,144,220',.16);
    glow(61.5,51.5,3.5,'249,215,149',.13);
   }else if([0,1,2,7,10,11].includes(index)){
    glow(room.left+1.5,room.top+2,4,'255,215,151',.18);
    if(index===1)glow(7,42,3,'255,224,176',.1);
    if(index===7)glow(63,23,4,'255,224,176',.1);
   }else if(room.outdoor){
    const points=index===9?[[49.5,70],[63.5,70]]:[[31.5,70]];
    for(const [col,row]of points)glow(col,row,3,'255,218,133',.23);
   }
   c.restore();
  }
 }
 ctx.save();ctx.drawImage(layer,x,y,layer.width*zoom,layer.height*zoom);ctx.restore();
}
