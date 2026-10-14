import atlasUrl from './assets/plaza-botanical-atlas-v2.png';
let atlas:HTMLImageElement|null=null;
if(typeof Image!=='undefined'){atlas=new Image();atlas.src=atlasUrl;}
export function botanicalAtlasReady(){return !!atlas?.complete&&atlas.naturalWidth>0;}
/** Sprite-atlas source rectangles are sampled at draw time; the generated alpha remains intact. */
export function botanicalCluster(c:CanvasRenderingContext2D,variant:number,x:number,base:number,w:number,h:number){
 if(!botanicalAtlasReady()||!atlas)return;
 // Actual atlas cells use generous, irregular silhouettes rather than a perfectly uniform grid.
 const frames=[[10,8,595,626],[650,70,590,568],[8,640,697,595],[710,870,535,370]];
 const [sx,sy,sw,sh]=frames[variant%4],scale=atlas.naturalWidth/1254;
 c.drawImage(atlas,sx*scale,sy*scale,sw*scale,sh*scale,Math.round(x-w/2),Math.round(base-h),w,h);
}
