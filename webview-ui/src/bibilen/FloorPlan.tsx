import {useRef} from 'react';
import {useDialogFocus,useDialogEscape} from './use-dialog-focus.js';
import {Icon} from './Icon.js';
import {BUILDING,COZY_ROOMS,COZY_COLS,COZY_ROWS,CORRIDORS,type Bounds} from './layouts.js';
const boundsStyle=(r:Bounds)=>({left:String(r.left/COZY_COLS*100)+'%',top:String(r.top/COZY_ROWS*100)+'%',width:String((r.right-r.left+1)/COZY_COLS*100)+'%',height:String((r.bottom-r.top+1)/COZY_ROWS*100)+'%'});
const detail:Record<string,string>={
 'Gökhan · CEO':'Özel çalışma odası · kilitli',
 'Toplantı odası':'Altı kişilik masa ve sunum panosu',
 'Kahve & kitap':'Kahve tezgâhı ve sohbet köşesi',
 'Ürün · Platform':'Altı uzman · mimari, veri, sunucu ve güvenlik',
 'Ürün · Teslim & kalite':'Beş uzman · mobil, web, kalite, inceleme ve sürüm',
 'İçerik stüdyosu':'Video ve görsel üretimi',
 'SEO · Teknik & veri':'Altı uzman · veri, performans, şema ve teknik denetim',
 'SEO · İçerik':'Altı uzman · konu, içerik, görsel ve yayın planlama',
 'SEO · Arama & büyüme':'Altı uzman · arama, harita, yerel, bağlantı ve e-ticaret',
 'Pazarlama':'Pazarlama çalışma odası',
 'Dinlenme salonu':'Oturma ve okuma köşeleri',
 'Oyun odası':'Bilardo ve ekranlı oyun köşesi',
 'Bahçe · Teras':'Çıkışlara hizalı tuğla yollar ve sohbet masası',
 'Bahçe · Koruluk':'Kümelenmiş ağaçlar, çiçek yatakları, banklar ve gölet',
 'Giriş ve resepsiyon':'Ana giriş ve karşılama',
 'Mutfak ve yemek':'Duvara monte evye, fırın, kahve ünitesi ve buzdolabı',
 'Satış':'Satış uzmanı · müşteri ihtiyaçları ve teklif hazırlığı',
 'Finans':'Finans uzmanı · bütçe, gelir ve gider analizi',
 'Muhasebe':'Muhasebe uzmanı · belge düzeni ve mutabakat',
};
export function FloorPlan({close,visit,preview}:{close:()=>void;visit:(index:number)=>void;preview:()=>void}){
 const dialog=useRef<HTMLElement>(null);useDialogFocus(dialog);useDialogEscape(close);
 const groups=[{name:'Yönetim ve ürün',indices:[0,3,15,2]},{name:'SEO ve içerik',indices:[5,16,17,4,6]},{name:'İşletme',indices:[12,13,14,10]},{name:'Sosyal alanlar',indices:[1,7,8,11]},{name:'Dış bahçe',indices:[9,18]}];
 return <div className="bb-modal-backdrop" onClick={e=>e.target===e.currentTarget&&close()}><section ref={dialog} className="bb-floor-plan" role="dialog" aria-modal="true" aria-label="Kat planı"><header><div><span className="bb-kicker">Agent House · kapalı ofis ve bahçe</span><h2>Ofiste nereye gidelim?</h2></div><button onClick={close} aria-label="Kat planını kapat"><Icon name="close"/></button></header><button className="bb-preview-link" onClick={preview}>Tasarım referansını gör ↗</button><div className="bb-plan-body"><div><div className="bb-plan-map" style={{aspectRatio:`${COZY_COLS}/${COZY_ROWS}`}}><i className="bb-plan-building" style={boundsStyle(BUILDING)}/>{CORRIDORS.map((r,i)=><i className="bb-plan-corridor" key={i} style={{left:`${r.left/COZY_COLS*100}%`,top:`${r.top/COZY_ROWS*100}%`,width:`${(r.right-r.left+1)/COZY_COLS*100}%`,height:`${(r.bottom-r.top+1)/COZY_ROWS*100}%`}}/>)}<span className="bb-plan-entry">↑ Giriş</span>{COZY_ROOMS.map((room,index)=><button key={room.label} title={detail[room.label]} onClick={()=>visit(index)} style={{left:`${room.left/COZY_COLS*100}%`,top:`${room.top/COZY_ROWS*100}%`,width:`${(room.right-room.left+1)/COZY_COLS*100}%`,height:`${(room.bottom-room.top+1)/COZY_ROWS*100}%`,background:room.color}}>{room.label}{room.locked&&<span>⌑</span>}</button>)}</div><p>Bir odaya dokun. Kamera o alanı ekrana sığdırır. Açık renkli koridorlar bina içindedir. Bahçe dışarıdadır; Gökhan’ın odası diğer ajanlara kapalıdır.</p></div><div className="bb-plan-list">{groups.map(group=><section key={group.name}><h3>{group.name}</h3>{group.indices.map(index=>{const room=COZY_ROOMS[index];return <button key={room.label} onClick={()=>visit(index)}><i style={{background:room.color}}/><span><strong>{room.label}</strong><small>{detail[room.label]}</small></span><b>↗</b></button>;})}</section>)}</div></div></section></div>;
}
