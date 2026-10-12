import {cozyFrame,cozyProfile,decorateCostume} from './cozyCharacters.js';
import {Direction} from '../types.js';import type {SpriteData} from '../types.js';
import type {AmbientActivity} from '../engine/ambientActivities.js';
export type PosePhase='prepare'|'act'|'finish';
const frames=new Map<string,SpriteData>();
export function poseFrame(elapsed:number){return Math.floor(Math.max(0,elapsed)/.7)%4;}
/** Shared palm ports keep utensils/cues attached to the authored arm poses. */
export function handPort(kind:AmbientActivity,elapsed:number){const f=poseFrame(elapsed);if(kind==='water')return {x:14,y:19+f%2};if(kind==='talk')return {x:12,y:[20,23,21,23][f]};if(kind==='meal')return {x:11,y:[26,21,15,21][f]};if(kind==='coffee'||kind==='eat')return {x:11,y:f===1||f===2?17:24};if(kind==='pet')return {x:14,y:27+f%2};if(kind==='pool')return {x:14+((elapsed%4)<1.6?Math.round(elapsed%4):0),y:22};return {x:14,y:22+f%2};}
/** Separate directional body poses with a fixed 16x32 floor anchor. */
export function cozyPose(index:number,dir:Direction,kind:AmbientActivity,elapsed:number,seated=false,phase:PosePhase='act',roleKey?:string):SpriteData{
 const p=cozyProfile(index,roleKey),frame=phase==='act'?poseFrame(elapsed):Math.floor(elapsed/.35)%2,right=dir===Direction.RIGHT||dir===Direction.LEFT;
 const palm=handPort(kind,elapsed);const key=[index,dir,kind,frame,palm.x,palm.y,seated,phase,roleKey??'',p.family,...p.clothes].join(':');const existing=frames.get(key);if(existing)return existing;
 const base=cozyFrame(index,right?'right':dir===Direction.UP?'up':'down',1,roleKey),s:SpriteData=Array.from({length:32},()=>Array(16).fill(''));
 const dot=(x:number,y:number,c:string)=>{if(x>=0&&x<16&&y>=0&&y<32)s[y][x]=c;};const rect=(x:number,y:number,w:number,h:number,c:string)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)dot(xx,yy,c);};
 const line=(x1:number,y1:number,x2:number,y2:number,c:string)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i++)dot(Math.round(x1+(x2-x1)*i/Math.max(1,n)),Math.round(y1+(y2-y1)*i/Math.max(1,n)),c);};
 const crouch=kind==='pet'&&phase==='act',lean=(kind==='pool'||kind==='water')&&phase==='act';
 const halfCrouch=kind==='pet'&&phase!=='act'&&(phase==='prepare'?frame===1:frame===0);
 const dy=crouch?4:halfCrouch?2:lean?2:seated?1:0,dx=lean&&right?1:0;
 for(let y=0;y<18;y++)for(let x=0;x<16;x++)if(base[y][x])dot(x+dx,y+dy,base[y][x]);
 const shoulder=crouch?23:halfCrouch?21:lean?20:seated?19:18,hip=crouch?27:halfCrouch?26:seated?24:25;
 rect(4+dx,shoulder,9-dx,hip-shoulder+1,p.clothes[0]);rect(5+dx,shoulder,6,1,p.clothes[1]);rect(7+dx,shoulder-1,3,1,p.skin[1]);
 if(p.chief){rect(7,shoulder+1,3,Math.max(2,hip-shoulder-1),'#efe7d3');rect(8,shoulder+1,1,2,'#a67d50');}else rect(7+dx,shoulder+1,3,1,'#efe7d3');
 decorateCostume(s,p,right?'right':dir===Direction.UP?'up':'down',shoulder);
 rect(5,hip,7,1,'#3a3036');
 if(crouch||halfCrouch){rect(4,28,5,2,'#505566');rect(9,27,4,3,'#505566');rect(3,30,5,1,'#3e3437');rect(10,30,4,1,'#3e3437');}
 else if(seated){rect(4,25,4,2,'#505566');rect(9,25,4,2,'#505566');rect(3,27,5,1,'#3e3437');rect(10,27,4,1,'#3e3437');}
 else{rect(5,26,3,4,'#505566');rect(9,26,3,4,'#505566');rect(4,30,4,1,'#3e3437');rect(9,30,4,1,'#3e3437');}
 const port=phase==='act'?handPort(kind,elapsed):{x:12,y:24};
 // Rear arm first, then bent forearm and a palm following the exact prop port.
 line(4,shoulder+1,3,shoulder+4,p.clothes[0]);rect(3,shoulder+4,2,2,p.skin[0]);
 if(kind==='bench'||kind==='read'){line(12,shoulder+1,12,22,p.clothes[0]);line(12,22,11,23,p.skin[0]);line(4,shoulder+1,4,22,p.clothes[0]);rect(4,23,2,2,p.skin[0]);rect(12,23,2,2,p.skin[0]);}
 else if(kind==='arcade'&&phase==='act'){for(const x of [5,11]){line(x,shoulder+1,x,22+frame%2,p.clothes[0]);rect(x,22+frame%2,2,2,p.skin[0]);}}
 else{line(12,shoulder+1,12,shoulder+4,p.clothes[0]);line(12,shoulder+4,port.x,port.y,p.skin[1]);rect(port.x-1,port.y,2,2,p.skin[0]);}
 rect(4,31,8,1,'#514b513b');
 const output=dir===Direction.LEFT?s.map(r=>[...r].reverse()):s;
 if(frames.size>=1024)frames.delete(frames.keys().next().value!);frames.set(key,output);return output;
}
