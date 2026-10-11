// Extend established native pixel assets; preserve their proportions and palette.
import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('./webview-ui/src/bibilen/assets/cozy-assets.json',import.meta.url);
const assets=JSON.parse(readFileSync(path,'utf8'));
function variant(source,id,label,draw){const entry=structuredClone(assets.catalog.find(c=>c.id===source));entry.id=id;entry.label=label;const sprite=structuredClone(assets.sprites[source]);const rect=(x,y,w,h,color)=>{for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)if(sprite[row]?.[col]!==undefined)sprite[row][col]=color;};draw(rect,sprite);assets.catalog=assets.catalog.filter(c=>c.id!==id);assets.catalog.push(entry);assets.sprites[id]=sprite;}
variant('BB_EDITORIAL_BOARD','BB_LEDGER_BOARD','Mutabakat ve evrak panosu',(r)=>{r(5,5,38,19,'#ebe2c9');for(let y=8;y<23;y+=4)r(7,y,34,1,'#bac1ab');for(const x of [17,29])r(x,6,1,17,'#bac1ab');for(let y=9;y<21;y+=4){r(8,y,6,1,'#6a7664');r(20,y,5,1,'#9a7956');r(32,y,6,1,'#6a7664');}});
variant('BB_EDITORIAL_BOARD','BB_PIPELINE_BOARD','Müşteri ve teklif akışı panosu',(r)=>{r(5,5,38,19,'#ebe2c9');for(let i=0;i<3;i++){r(7+i*12,7,10,3,['#a2b7a0','#c6aa7b','#aeacc2'][i]);r(8+i*12,12,8,4,'#fff2d4');r(9+i*12,13,5,1,'#8b8f77');if(i<2){r(8+i*12,18,8,4,'#fff2d4');r(9+i*12,19,5,1,'#8b8f77');}}});
variant('BB_COFFEE_TABLE','BB_REVIEW_TABLE','Rapor inceleme sehpası',(r)=>{r(9,9,10,7,'#f3e6c8');r(10,10,6,1,'#80977c');r(10,12,7,1,'#b7aa88');r(21,12,5,6,'#dbc9a7');r(22,13,3,1,'#9b7756');});
variant('BB_CAMERA','BB_CAMERA_NORTH','Çekim alanına dönük kamera',(r,s)=>{for(let y=0;y<15;y++)s[y].fill('');r(6,4,12,9,'#343d39');r(8,6,7,5,'#709587');r(9,7,5,3,'#a2b9a1');r(17,6,2,6,'#505b50');r(8,3,7,2,'#4a5148');r(10,13,4,3,'#343d39');});
variant('BB_SOFTBOX','BB_SOFTBOX_LEFT','Çekim alanına dönük sağ ışık',(_r,s)=>{for(const row of s)row.reverse();});
writeFileSync(path,JSON.stringify(assets));console.log('Added five native functional variants.');
