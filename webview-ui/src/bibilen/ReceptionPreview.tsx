import {Icon} from './Icon.js';
export function ReceptionPreview({close}:{close:()=>void}){
 return <div className="bb-modal-backdrop" onClick={e=>e.target===e.currentTarget&&close()}><section className="bb-reception-preview" role="dialog" aria-modal="true" aria-label="Yeni resepsiyon tasarımı"><header><div><span className="bb-kicker">Görsel referans</span><h2>Resepsiyon tasarımı</h2></div><button aria-label="Önizlemeyi kapat" onClick={close}><Icon name="close"/></button></header><img src="/bibilen/reception-concept-v2.png" alt="Ahşap karşılama bankosu, BiBilen tabelası, yeşil oturma grubu ve açık geçiş yolu olan sıcak resepsiyon tasarımı"/><p>Bu görsel tasarım referansı. Canlı ofis aynı tarzdaki ayrı mobilyalarla kuruldu; ajanlar oda içinde hareket ediyor.</p></section></div>;
}
