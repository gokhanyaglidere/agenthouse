import {DictationButton} from './DictationButton.js';
import {Icon} from './Icon.js';
import {useState} from 'react';
import {createTask} from './api.js';
import {ROSTER} from './roster.js';
import type {Priority,ExecutionStatus} from './types.js';
import {ConnectionStatus} from './ConnectionStatus.js';
export function TaskComposer({defaultRole='chief',close,onCreated,execution,onCheck}:{defaultRole?:string;close:()=>void;onCreated:()=>void;execution?:ExecutionStatus;onCheck:()=>void}){
 const [title,setTitle]=useState('');const [prompt,setPrompt]=useState('');const [role,setRole]=useState(defaultRole);const [priority,setPriority]=useState<Priority>('normal');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const groups=[...ROSTER].reduce((map,role)=>{const list=map.get(role.group)??[];list.push(role);map.set(role.group,list);return map;},new Map<string,Array<(typeof ROSTER)[number]>>());
 return <div className="bb-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><form className="bb-composer" role="dialog" aria-modal="true" aria-label="Yeni görev" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await createTask({title,prompt,role,priority});onCreated();close();}catch(err){setError(err instanceof Error?err.message:'Görev başlatılamadı.');}finally{setBusy(false);}}}>
  <header><div><span className="bb-kicker">Yeni görev</span><h2>Ekibe iş ver</h2></div><button type="button" onClick={close} aria-label="Kapat"><Icon name="close"/></button></header>
  {execution?.status!=='ready'&&<ConnectionStatus value={execution} onChange={onCheck}/>}
  <label><span>Görev adı</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Örn. ödeme akışındaki hatayı düzelt" maxLength={100} autoFocus required/></label>
  <label><span>Ne yapılmasını istiyorsun?</span><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Beklenen sonucu, önemli sınırları ve kontrol edilmesi gereken yerleri yaz…" rows={7} maxLength={20000} required/></label><DictationButton disabled={busy} onText={text=>setPrompt(old=>(old?`${old} ${text}`:text).slice(0,20000))}/>
  <div className="bb-form-row"><label><span>Görevi kim alsın?</span><select value={role} onChange={e=>setRole(e.target.value)}>{[...groups].map(([group,roles])=><optgroup key={group} label={group}>{roles.map(r=><option key={r.key} value={r.key}>{r.name}</option>)}</optgroup>)}</select></label>
  <label><span>Öncelik</span><select value={priority} onChange={e=>setPriority(e.target.value as Priority)}><option value="normal">Normal</option><option value="high">Yüksek</option><option value="urgent">Acil</option></select></label></div>
  <aside><strong>{ROSTER.find(r=>r.key===role)?.name}</strong><span>{role==='chief'?'Gökhan işi analiz eder ve gerektiğinde uzmanlara dağıtır.':'Bu görev seçilen uzman rolüyle ayrı Claude oturumu olarak başlar.'}</span></aside>
  {error&&<p className="bb-error" role="alert">{error}</p>}<footer><button type="button" onClick={close}>Vazgeç</button><button className="bb-primary" disabled={busy||execution?.status==='blocked'}>{busy?'Başlatılıyor…':'Görevi başlat'}</button></footer>
 </form></div>;
}
