import type {SpriteData} from '../types.js';
export type AmbientActivity='coffee'|'read'|'garden'|'game'|'eat'|'arcade'|'pool';
const cache=new WeakMap<SpriteData,Map<string,SpriteData>>();
/** Four bounded pixel poses, cached per source frame. Decorative only. */
export function activitySprite(base:SpriteData,kind:AmbientActivity,elapsed:number):SpriteData{
 const frame=Math.floor(elapsed/.7)%4,key=kind+frame;let poses=cache.get(base);if(!poses){poses=new Map();cache.set(base,poses);}const found=poses.get(key);if(found)return found;
 const s=base.map(row=>[...row]),h=s.length,w=s[0].length;
 const pixel=(x:number,y:number,c:string)=>{if(y>=0&&y<h&&x>=0&&x<w)s[y][x]=c;};const rect=(x:number,y:number,ww:number,hh:number,c:string)=>{for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++)pixel(xx,yy,c);};
 const skin=base[h-18]?.[8]||'#edbfa3',ink='#41382e',cream='#f3e8cd';const raised=frame===1||frame===2;
 if(kind==='coffee'||kind==='eat'){
  const y=raised?h-17:h-9;rect(11,y+2,2,2,skin);rect(10,y,3,3,kind==='coffee'?cream:'#d78f51');
  if(kind==='coffee'){rect(10,y,3,1,'#6e4832');pixel(13,y+1,cream);pixel(13,y+2,cream);pixel(11+(frame%2),y-2,'#d4d8b5');pixel(10,y-4-(frame%2),'#d4d8b5');}
  else{pixel(11,y-1,'#769169');if(raised)pixel(10,y,skin);}
 }else if(kind==='read'){
  rect(5,h-11,8,5,ink);rect(6,h-10,3,3,cream);rect(10,h-10,2,3,'#d9d3b6');rect(9+(frame%2),h-10,1,3,'#a1b88e');rect(4,h-9,2,2,skin);rect(12,h-9,2,2,skin);
 }else if(kind==='game'){
  rect(5,h-9,8,3,ink);pixel(7,h-8,'#91a58a');pixel(11,h-8,raised?'#f0b85b':'#9b7350');rect(4,h-9,2,2,skin);rect(12,h-9+(frame%2),2,2,skin);
 }else{
  // Raise binoculars, lower them, then observe again.
  const y=raised?h-18:h-10;rect(5,y,3,3,ink);rect(9,y,3,3,ink);rect(7,y+1,3,1,ink);pixel(6,y+1,'#8eafad');pixel(10,y+1,'#8eafad');pixel(4,y+2,skin);pixel(12,y+2,skin);
 }
 poses.set(key,s);return s;
}
