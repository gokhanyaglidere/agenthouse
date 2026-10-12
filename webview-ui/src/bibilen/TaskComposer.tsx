import {TASK_TEMPLATES} from './task-templates.js';
import {useDialogFocus} from './use-dialog-focus.js';
import {useDraft} from './drafts.js';
import {DictationButton} from './DictationButton.js';
import {Icon} from './Icon.js';
import {useState,useRef,useEffect} from 'react';
import {createTask} from './api.js';
import {ROSTER} from './roster.js';
import type {Priority,ExecutionStatus} from './types.js';
import {ConnectionStatus} from './ConnectionStatus.js';
export function TaskComposer({defaultRole='chief',close,onCreated,execution,onCheck}:{defaultRole?:string;close:()=>void;onCreated:()=>void;execution?:ExecutionStatus;onCheck:()=>void}){
 const [title,setTitle]=useDraft('new-task-title');const [prompt,setPrompt]=useDraft('new-task-prompt');const [role,setRole]=useState(defaultRole);const [priority,setPriority]=useState<Priority>('normal');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [template,setTemplate]=useState('');
 const dialog=useRef<HTMLFormElement>(null);useDialogFocus(dialog);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){e.preventDefault();close();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[busy,close]);
 const groups=[...ROSTER].reduce((map,role)=>{const list=map.get(role.group)??[];list.push(role);map.set(role.group,list);return map;},new Map<string,Array<(typeof ROSTER)[number]>>());
 return <div className="bb-modal-backdrop" onMouseDown={e=>{if(!busy&&e.target===e.currentTarget)close();}}><form ref={dialog} className="bb-composer" role="dialog" aria-modal="true" aria-label="Yeni görev" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await createTask({title,prompt,role,priority});setTitle('');setPrompt('');onCreated();close();}catch(err){setError(err instanceof Error?err.message:'Görev başlatılamadı.');}finally{setBusy(false);}}}>
  <header><div><span className="bb-kicker">Yeni görev</span><h2>Ne yapalım?</h2></div><button type="button" disabled={busy} onClick={close} aria-label="Kapat"><Icon name="close"/></button></header>
  {execution?.status!=='ready'&&<ConnectionStatus value={execution} onChange={onCheck}/>}
  <details className="bb-task-options"><summary>Görev şablonları</summary><label><span>Başlangıç taslağı</span><select value={template} onChange={e=>setTemplate(e.target.value)}><option value="">Bir şablon seç…</option>{TASK_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{template&&<><p>{title||prompt?'Uygularsan mevcut başlık ve açıklama bu şablonla değişir. Görev otomatik gönderilmez.':'Şablonu uygulayıp köşeli parantezli alanları doldur. Görev otomatik gönderilmez.'}</p><button type="button" onClick={()=>{const t=TASK_TEMPLATES.find(t=>t.id===template);if(t){setTitle(t.title);setPrompt(t.prompt);}}}>Şablonu taslağa uygula</button></>}</details>
  <label><span>Görev adı</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Örn. ödeme akışındaki hatayı düzelt" maxLength={100} autoFocus required/></label>
  <label><span>Ne yapılmasını istiyorsun?</span><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Beklenen sonucu, önemli sınırları ve kontrol edilmesi gereken yerleri yaz…" rows={7} maxLength={20000} required/></label><DictationButton disabled={busy} onText={text=>setPrompt(old=>(old?`${old} ${text}`:text).slice(0,20000))}/>
  <details className="bb-task-options" open={defaultRole!=='chief'||undefined}><summary>Uzman ve öncelik · {ROSTER.find(r=>r.key===role)?.name} · {priority==='normal'?'Normal':priority==='high'?'Yüksek':'Acil'}</summary><div className="bb-form-row"><label><span>Görevi kim alsın?</span><select value={role} onChange={e=>setRole(e.target.value)}>{[...groups].map(([group,roles])=><optgroup key={group} label={group}>{roles.map(r=><option key={r.key} value={r.key}>{r.name}</option>)}</optgroup>)}</select></label>
  <label><span>Öncelik</span><select value={priority} onChange={e=>setPriority(e.target.value as Priority)}><option value="normal">Normal</option><option value="high">Yüksek</option><option value="urgent">Acil</option></select></label></div></details>
  <aside><strong>{ROSTER.find(r=>r.key===role)?.name}</strong><span>{role==='chief'?'Gökhan işi analiz eder ve gerektiğinde uzmanlara dağıtır.':'Bu görev seçilen uzman rolüyle ayrı Claude oturumu olarak başlar.'}</span></aside>
  {error&&<p className="bb-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={close}>Vazgeç</button><button className="bb-primary" disabled={busy||execution?.status==='blocked'}>{busy?'Başlatılıyor…':'Görevi başlat'}</button></footer>
 </form></div>;
}
