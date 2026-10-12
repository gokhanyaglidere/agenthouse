import {setPetTemplates} from '../office/sprites/petSpriteData.js';
/** Decode the bundled upstream cat atlas using its documented 96x96 frame layout. */
export async function loadPreviewCat(){
 const image=new Image();image.src='./agent-house-gitcat-atlas.png';await image.decode();const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const c=canvas.getContext('2d')!;c.drawImage(image,0,0);const rgba=c.getImageData(0,0,96,96).data;
 const frame=(x:number,y:number,w:number)=>Array.from({length:32},(_,dy)=>Array.from({length:w},(_,dx)=>{const i=((y+dy)*96+x+dx)*4;return rgba[i+3]===0?'':'#'+[rgba[i],rgba[i+1],rgba[i+2],rgba[i+3]].map(v=>v.toString(16).padStart(2,'0')).join('');}));
 const vertical=(y:number,idle=false)=>Array.from({length:3},(_,i)=>frame((i+(idle?3:0))*16,y,16));setPetTemplates([{walkDown:vertical(0),idleDown:vertical(0,true),walkUp:vertical(32),idleUp:vertical(32,true),walkRight:Array.from({length:3},(_,i)=>frame(i*32,64,32))}],['Gitcat']);
}
