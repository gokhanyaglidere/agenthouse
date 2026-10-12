import {ROSTER} from '../../bibilen/roster.js';
import type {SpriteData} from '../types.js';
export const COZY_CHARACTER_COUNT=48;
const SKINS=[['#edbfa3','#d99a84'],['#dca881','#bf805f'],['#ba8164','#98604a'],['#f1d0b4','#ddb094'],['#906347','#704831']];
const HAIR=[['#49342d','#715042'],['#2c303b','#4a5060'],['#74533d','#a17b53'],['#976845','#c69664'],['#5f3d35','#88544a'],['#afa496','#d5cabb']];
const CLOTHES=[['#3e6880','#75a2b0'],['#68846c','#9fb08a'],['#aa6d60','#d89c84'],['#77628d','#b096bc'],['#b48f55','#dbbd7d'],['#597e8d','#84b9bb'],['#934e6d','#c6839d'],['#617fa3','#9fb7cc']];
const UNIFORMS:Record<string,string[][]>={'Ürün ve mühendislik':[['#3e6880','#75a2b0'],['#4e6677','#95b0b3']],'SEO':[['#68846c','#a1b68c'],['#617b73','#a0b5a2']],'Video ve görsel':[['#77628d','#b096bc'],['#8a637b','#c6a0aa']],'Pazarlama':[['#aa6d60','#d89c84'],['#a07658','#cfaa80']],'İşletme':[['#526458','#92a18b'],['#61566b','#ada0b5']]};
export const cozyProfile=(index:number,roleKey?:string)=>{const i=((index%COZY_CHARACTER_COUNT)+COZY_CHARACTER_COUNT)%COZY_CHARACTER_COUNT;const role=roleKey?ROSTER.find(r=>r.key===roleKey):ROSTER[i],family=role?.group??'Genel',chief=role?.key==='chief';return {index:i,family,skin:SKINS[Math.floor(i/6)%SKINS.length],hair:HAIR[i%HAIR.length],clothes:chief?['#344960','#657992']:UNIFORMS[family]?.[i%2]??CLOTHES[Math.floor(i/3)%CLOTHES.length],style:i%6,glasses:i%7===2,chief};};
export function cozyFrame(index:number,direction:'down'|'up'|'right',frame:number,roleKey?:string):SpriteData{
 const p=cozyProfile(index,roleKey),s:SpriteData=Array.from({length:32},()=>Array(16).fill(''));const ink='#3a3036',pants='#505566',shoe='#3e3437',cream='#efe7d3';const walking=frame<3,bob=walking&&frame!==1?-1:0;
 const dot=(x:number,y:number,c:string)=>{if(x>=0&&x<16&&y>=0&&y<32)s[y][x]=c;};const rect=(x:number,y:number,w:number,h:number,c:string)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)dot(xx,yy,c);};
 // A consistent floor anchor and soft, bounded shadow under every pose.
 rect(4,31,8,1,'#514b513b');
 const leftStep=frame===0?1:0,rightStep=frame===2?1:0;
 rect(5,25,3,4-leftStep,pants);rect(9,25,3,4-rightStep,pants);rect(4,29-leftStep,4,2,shoe);rect(9,29-rightStep,4,2,shoe);dot(5,29-leftStep,'#81705c');dot(10,29-rightStep,'#81705c');
 rect(4,18+bob,9,8,p.clothes[0]);rect(5,18+bob,7,1,p.clothes[1]);rect(5,25,7,1,ink);rect(7,17+bob,3,2,p.skin[1]);
 if(p.chief){rect(7,19+bob,3,5,cream);rect(8,19+bob,1,3,'#a67d50');dot(11,20+bob,'#e7c679');}else{rect(7,19+bob,3,1,cream);dot(8,22+bob,p.clothes[1]);dot(8,24,p.clothes[1]);}
 rect(3,19+bob,2,5,p.clothes[0]);rect(12,19+bob,2,5,p.clothes[0]);rect(3,24+bob,2,2,p.skin[0]);rect(12,24+bob,2,2,p.skin[0]);
 // Rounded head; natural skin/hair are never hue-shifted.
 rect(5,7+bob,7,1,ink);rect(4,8+bob,9,7,p.skin[0]);rect(5,15+bob,7,2,p.skin[0]);rect(6,17+bob,5,1,p.skin[1]);dot(3,11+bob,p.skin[1]);dot(13,11+bob,p.skin[1]);
 rect(4,7+bob,9,3,p.hair[0]);rect(5,6+bob,7,1,p.hair[0]);rect(5,7+bob,5,1,p.hair[1]);rect(4,9+bob,1,4,p.hair[0]);rect(12,9+bob,1,3,p.hair[0]);
 if(p.style===1){rect(4,9+bob,3,2,p.hair[0]);dot(7,9+bob,p.hair[0]);}if(p.style===2){rect(3,9+bob,2,9,p.hair[0]);rect(12,9+bob,2,9,p.hair[0]);dot(3,8+bob,p.hair[1]);}if(p.style===3){rect(6,4+bob,5,3,p.hair[0]);rect(7,4+bob,3,1,p.hair[1]);}if(p.style===4){rect(4,6+bob,9,3,p.clothes[0]);rect(3,9+bob,11,1,p.clothes[1]);}if(p.style===5){rect(3,8+bob,2,4,p.hair[0]);rect(12,8+bob,2,5,p.hair[0]);dot(5,9+bob,p.hair[1]);dot(10,9+bob,p.hair[1]);}
 if(direction==='up'){rect(4,10+bob,9,6,p.hair[0]);rect(5,14+bob,7,2,p.hair[1]);rect(7,19+bob,3,3,p.clothes[0]);}
 else if(direction==='right'){rect(4,9+bob,5,7,p.hair[0]);rect(9,10+bob,4,5,p.skin[0]);dot(12,12+bob,ink);dot(13,13+bob,p.skin[1]);dot(11,15+bob,'#a46866');if(p.glasses){rect(10,11+bob,4,1,ink);dot(10,12+bob,ink);dot(13,12+bob,ink);}}
 else{dot(6,12+bob,ink);dot(10,12+bob,ink);dot(8,13+bob,p.skin[1]);dot(8,15+bob,'#9b615d');dot(5,14+bob,'#dda18d');dot(11,14+bob,'#dda18d');if(p.glasses){rect(5,11+bob,3,1,ink);rect(9,11+bob,3,1,ink);rect(5,13+bob,3,1,ink);rect(9,13+bob,3,1,ink);dot(8,12+bob,ink);}}
 decorateCostume(s,p,direction,18+bob);
 if(!walking){rect(3,23,2,3,p.clothes[0]);rect(12,23,2,3,p.clothes[0]);rect(5,23+(frame%2),2,1,p.skin[0]);rect(10,23+(frame%2),2,1,p.skin[0]);if(frame>=5){rect(6,22,5,4,'#aa8456');rect(6,22,2,3,cream);rect(9,22,2,3,cream);dot(8,24,'#6a5144');}if(direction==='right'){rect(11,22+(frame%2),3,1,p.skin[0]);}}
 return s;
}

/** Small clothing details follow the torso instead of becoming held props. */
export function decorateCostume(s:SpriteData,p:ReturnType<typeof cozyProfile>,direction:string,top:number){
 if(direction==='up'||p.chief)return;const dot=(x:number,y:number,c:string)=>{if(s[y]?.[x]!==undefined)s[y][x]=c;};
 if(p.family==='Video ve görsel'){for(let y=top+2;y<top+6;y++)for(let x=6;x<11;x++)dot(x,y,p.clothes[1]);dot(6,top+1,'#efe7d3');dot(10,top+1,'#efe7d3');dot(8,top+4,'#d4bd85');}
 else if(p.family==='SEO'){for(let y=top+1;y<top+4;y++)dot(10,y,'#d5bf7a');dot(11,top+4,'#efe7d3');}
 else if(p.family==='Ürün ve mühendislik'){dot(6,top+1,'#bdccd0');dot(10,top+1,'#bdccd0');dot(11,top+3,'#8bc4c6');}
 else if(p.family==='İşletme'){dot(7,top+2,'#e0d3b1');dot(9,top+2,'#e0d3b1');dot(8,top+3,'#d6b57b');dot(8,top+5,'#d6b57b');}
 else if(p.family==='Pazarlama'){dot(7,top+1,'#f2debd');dot(8,top+2,'#f2debd');dot(10,top+4,'#e6bd89');}
}
