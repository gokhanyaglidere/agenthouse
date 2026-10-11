import {useState} from 'react';
import {checkExecution} from './api.js';
import type {ExecutionStatus} from './types.js';

export function ConnectionStatus({operator=true,value,onChange}:{operator?:boolean;value?:ExecutionStatus;onChange:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const labels={unchecked:'Henüz kontrol edilmedi',ready:'Görev bağlantısı hazır',blocked:'Görev erişimi kapalı',unavailable:'Bağlantı doğrulanamadı'};
 return <section className={`bb-connection bb-connection-${value?.status??'unchecked'}`} aria-label="Claude Code bağlantısı">
  <strong>Claude Code · {labels[value?.status??'unchecked']}</strong>
  <p>{value?.message??'Görev erişimini bu panelden kontrol edebilirsin.'}</p>
  {value?.checkedAt&&<small>Son kontrol: {new Date(value.checkedAt).toLocaleString('tr-TR')}</small>}
  <button type="button" disabled={busy||!operator} onClick={async()=>{setBusy(true);setError('');try{await checkExecution();onChange();}catch(e){setError(e instanceof Error?e.message:'Bağlantı kontrol edilemedi.');}finally{setBusy(false);}}}>{busy?'Kontrol ediliyor…':'Bağlantıyı kontrol et'}</button>
  <small>Kontrol, araç kullanmadan tek kısa Claude yanıtı ister; hesap kullanımına yansıyabilir.</small>
  {error&&<p role="alert" className="bb-error">{error}</p>}
 </section>;
}
