// Compile generated transparent art into native pixel sprites. No runtime image
// fetching, background rectangles, or scene-wide image hiding the characters.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
function png(path){
 const b=readFileSync(path);let w,h,depth,type;const chunks=[];
 for(let p=8;p<b.length;){const n=b.readUInt32BE(p),kind=b.toString('ascii',p+4,p+8),data=b.subarray(p+8,p+8+n);if(kind==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);depth=data[8];type=data[9];if(data[12])throw Error('Interlaced PNG unsupported');}if(kind==='IDAT')chunks.push(data);p+=n+12;}
 if(depth!==8||![2,6].includes(type))throw Error('Expected 8-bit RGB/RGBA atlas');
 const channels=type===6?4:3,stride=w*channels,raw=inflateSync(Buffer.concat(chunks)),out=Buffer.alloc(w*h*4);let prior=Buffer.alloc(stride),offset=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=raw[offset++],row=Buffer.alloc(stride);for(let x=0;x<stride;x++){const a=x>=channels?row[x-channels]:0,u=prior[x],ul=x>=channels?prior[x-channels]:0;row[x]=(raw[offset++]+[0,a,u,Math.floor((a+u)/2),paeth(a,u,ul)][filter])&255;}for(let x=0;x<w;x++){const q=(y*w+x)*4,k=x*channels;out[q]=row[k];out[q+1]=row[k+1];out[q+2]=row[k+2];out[q+3]=channels===4?row[k+3]:255;}prior=row;}
 return {w,h,pixels:out};
}
function components(image,expected=16){
 const {w,h,pixels}=image,seen=new Uint8Array(w*h),groups=[];
 for(let i=0;i<w*h;i++){if(seen[i]||pixels[i*4+3]<40)continue;const stack=[i];seen[i]=1;let minX=w,minY=h,maxX=0,maxY=0,count=0;
 while(stack.length){const p=stack.pop(),x=p%w,y=Math.floor(p/w);count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const q=yy*w+xx;if(!seen[q]&&pixels[q*4+3]>=40){seen[q]=1;stack.push(q);}}}
 if(count>1000)groups.push({minX,minY,maxX,maxY,count});
 }
 // The generation may vary cell margins. Identify each actual isolated object
 // rather than blindly cutting through a sprite at a nominal grid boundary.
 const selected=groups.sort((a,b)=>b.count-a.count).slice(0,expected);
 if(selected.length!==expected)throw Error(`Expected ${expected} separate objects, got ${selected.length}`);
 if(expected===1)return selected;
 const ordered=[];for(let row=0;row<4;row++){const g=selected.filter(c=>Math.floor(((c.minY+c.maxY)/2)/h*4)===row).sort((a,b)=>a.minX-b.minX);if(g.length!==4)throw Error(`Atlas row ${row+1} has ${g.length} objects`);ordered.push(...g);}return ordered;
}
const specs=[
 ['BB_COUNTER','Karşılama bankosu',96,64,6,4,'desks'],['BB_SOFA','Adaçayı kanepe',48,32,3,2,'decor'],['BB_ARMCHAIR','Okuma koltuğu',32,32,2,2,'decor'],['BB_COFFEE_TABLE','Yuvarlak sehpa',32,32,2,2,'desks'],
 ['BB_EXEC_DESK','Yönetici masası',48,32,3,2,'desks'],['BB_EXEC_CHAIR','Yönetici koltuğu',16,16,1,1,'chairs','back'],['BB_BOOKCASE','Çerçeveli kitaplık',32,48,2,3,'storage'],['BB_SIDEBOARD','Ahşap konsol',48,32,3,2,'storage'],
 ['BB_MONSTERA','Seramik saksıda monstera',32,48,2,3,'decor',null,1],['BB_FLOWERS','Çiçekli saksı',16,24,1,2,'decor',null,1],['BB_COAT','Askılık',24,48,2,3,'decor',null,1],['BB_NOTICE','Not panosu',32,24,2,2,'wall',null,2],
 ['BB_WINDOW','Perdeli pencere',32,40,2,3,'wall',null,3],['BB_LAMP','Pirinç duvar lambası',16,24,1,2,'wall',null,2],['BB_RUG_TERRA','Kiremit dokuma halı',80,64,5,4,'decor',null,4],['BB_RUG_SAGE','Yeşil dokuma halı',80,64,5,4,'decor',null,4],
 ['BB_WORK_DESK','Ahşap çalışma masası',48,32,3,2,'desks'],['BB_WORK_CHAIR','Yeşil çalışma sandalyesi',16,16,1,1,'chairs','back'],['BB_MEETING_TABLE','Toplantı masası',96,48,6,3,'desks'],['BB_MEETING_CHAIR','Toplantı sandalyesi',16,16,1,1,'chairs','front'],
 ['BB_KITCHEN','Mutfak tezgâhı',80,48,5,3,'storage'],['BB_FRIDGE','Yeşil buzdolabı',32,64,2,4,'storage'],['BB_DINING','Yemek masası',64,40,4,3,'desks'],['BB_COFFEE_STATION','Kahve dolabı',48,48,3,3,'storage',null,1],
 ['BB_POOL','Bilardo masası',80,48,5,3,'desks'],['BB_ARCADE','Oyun makinesi',32,48,2,3,'electronics',null,1],['BB_STUDIO_DESK','İçerik üretim masası',48,32,3,2,'desks'],['BB_CAMERA','Tripodlu kamera',24,40,2,3,'decor'],
 ['BB_BENCH','Bahçe bankı',48,24,3,2,'decor'],['BB_TREE','Saksılı ağaç',32,48,2,3,'decor',null,1],['BB_BIKE','Bisiklet',48,32,3,2,'decor'],['BB_WHITEBOARD','Sunum panosu',48,32,3,2,'wall',null,2],
 ['BB_POND','Taş kıyılı gölet',112,80,7,5,'decor'],
 ['BB_OFFICE_BACK','Ergonomik ofis koltuğu · arka',16,24,1,1,'chairs','back'],['BB_OFFICE_FRONT','Ergonomik ofis koltuğu · ön',16,24,1,1,'chairs','front'],['BB_EXEC_MODERN','Deri yönetici koltuğu',16,24,1,1,'chairs','back'],['BB_DINING_FRONT','Döşemeli yemek sandalyesi · ön',16,20,1,1,'chairs','front'],
 ['BB_DINING_BACK','Döşemeli yemek sandalyesi · arka',16,20,1,1,'chairs','back'],['BB_MAPLE','Bahçe akçaağacı',64,80,4,5,'decor',null,4],['BB_PINE','Bahçe çamı',32,64,2,4,'decor',null,3],['BB_CHERRY','Çiçekli kiraz ağacı',64,80,4,5,'decor',null,4],
 ['BB_HEDGE','Yapraklı çit',64,32,4,2,'decor'],['BB_FLOWERBED','Yükseltilmiş çiçek yatağı',64,32,4,2,'decor'],['BB_SHRUB','Bahçe çalısı',32,32,2,2,'decor'],['BB_GARDEN_PLANTER','Karışık bahçe saksılığı',64,32,4,2,'decor'],
 ['BB_PAVING','Doğal taş döşeme',32,32,2,2,'decor',null,2],['BB_RUG_ROUND','Yuvarlak jüt halı',64,64,4,4,'decor',null,4],['BB_RUG_BLUE','Mavi düz dokuma halı',64,48,4,3,'decor',null,3],['BB_LANTERN','Bahçe feneri',16,32,1,2,'decor',null,1],
 ['BB_WALL_SINK','Duvara bağlı evye ünitesi',64,48,4,3,'storage',null,1],['BB_WALL_OVEN','Duvara bağlı ocak ve fırın',48,48,3,3,'storage',null,1],['BB_WALL_FRIDGE','Duvara bağlı buzdolabı',32,64,2,4,'storage',null,2],['BB_WALL_BOOKS','Duvara bağlı kitaplık',48,32,3,2,'storage',null,1],
 ['BB_FINANCE_DESK','Bütçe ve raporlama çalışma grubu',80,56,5,4,'desks'],['BB_LEDGER_DESK','Defter ve hesap çalışma grubu',80,56,5,4,'desks'],['BB_SALES_DESK','Teklif ve müşteri çalışma grubu',64,48,4,3,'desks'],['BB_FINANCE_CHART','Bütçe planlama panosu',48,32,3,2,'wall',null,2],
 ['BB_ARCHIVE','Evrak ve dosya dolabı',48,32,3,2,'storage',null,1],['BB_SEARCH_MAP','Arama ve harita panosu',48,32,3,2,'wall',null,2],['BB_ANALYTICS_BOARD','Teknik analiz panosu',48,32,3,2,'wall',null,2],['BB_EDITORIAL_BOARD','İçerik takvimi panosu',48,32,3,2,'wall',null,2],
 ['BB_SERVER_RACK','Sunucu kabini',32,48,2,3,'storage',null,1],['BB_SOFTBOX','Stüdyo ışığı',24,48,2,3,'decor',null,2],['BB_GARDEN_TABLE','Bahçe sohbet masası',64,48,4,3,'desks'],['BB_PRINTER','Rapor ve evrak yazıcısı',48,48,3,3,'electronics'],
];
const catalog=[],sprites={};
const mounted=new Set(['BB_WALL_SINK','BB_WALL_OVEN','BB_WALL_FRIDGE','BB_WALL_BOOKS','BB_ARCHIVE','BB_SERVER_RACK','BB_ARCADE','BB_COFFEE_STATION']);
let specCursor=0;
for(let sheet=0;sheet<process.argv.length-2;sheet++){
 const count=sheet===2?1:16,image=png(process.argv[2+sheet]),bounds=components(image,count);
 for(let i=0;i<count;i++){
  const [id,label,width,height,footprintW,footprintH,category,orientation,backgroundTiles]=specs[specCursor+i],box=bounds[i],bw=box.maxX-box.minX+1,bh=box.maxY-box.minY+1,scale=Math.min((width-2)/bw,(height-2)/bh),wall=mounted.has(id),dw=(id==='BB_PAVING'||wall)?width:Math.max(1,Math.round(bw*scale)),dh=(id==='BB_PAVING'||wall)?height:Math.max(1,Math.round(bh*scale)),ox=Math.floor((width-dw)/2),oy=category==='chairs'||wall||(category==='wall'&&id!=='BB_WINDOW')?0:height-dh;
  const sprite=Array.from({length:height},()=>Array(width).fill(''));
  for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){const sx=Math.min(box.maxX,box.minX+Math.floor((x+.5)/dw*bw)),sy=Math.min(box.maxY,box.minY+Math.floor((y+.5)/dh*bh)),q=(sy*image.w+sx)*4,a=image.pixels[q+3];if(a<40)continue;const rgb=[0,1,2].map(k=>Math.min(255,Math.round(image.pixels[q+k]/8)*8).toString(16).padStart(2,'0'));sprite[oy+y][ox+x]='#'+rgb.join('')+(a<240?a.toString(16).padStart(2,'0'):'');}
  let blockingTiles=['BB_MAPLE','BB_CHERRY'].includes(id)?[{col:1,row:4},{col:2,row:4}]:id==='BB_PINE'?[{col:1,row:3}]:undefined;
  // Compound business workstations already include a chair in their art.
  // Leave its last row walkable and add a transparent native seat anchor there.
  if(['BB_FINANCE_DESK','BB_LEDGER_DESK','BB_SALES_DESK'].includes(id))blockingTiles=Array.from({length:footprintW*(footprintH-1)},(_,n)=>({col:n%footprintW,row:Math.floor(n/footprintW)}));
  catalog.push({id,label,width,height,footprintW,footprintH,category,isDesk:category==='desks',...(orientation?{orientation}:{}),...(backgroundTiles?{backgroundTiles}:{}),...(blockingTiles?{blockingTiles}:{}),...(category==='wall'||wall?{canPlaceOnWalls:true}:{})});sprites[id]=sprite;
  console.log(id,`${bw}x${bh} -> ${dw}x${dh}`);
 }
 specCursor+=count;
}
catalog.push({id:'BB_EMBEDDED_SEAT',label:'Entegre çalışma koltuğu',width:16,height:16,footprintW:1,footprintH:1,category:'chairs',orientation:'back',isDesk:false});sprites.BB_EMBEDDED_SEAT=Array.from({length:16},()=>Array(16).fill(''));
const output=resolve('tools/pixel-office/webview-ui/src/bibilen/assets/cozy-assets.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({catalog,sprites}));console.log(`Compiled ${catalog.length} native entries (65 artwork sprites plus embedded seat anchor).`);
