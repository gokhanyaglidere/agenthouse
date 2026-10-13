import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ROSTER} from './roster.js';
import './observer.css';
type Projects={preview:boolean;accessType?:'web'|'private';projects:Array<{id:string;name:string}>;workspaces:Array<{id:string;projectId:string}>};
type Shared={projectName:string;preview:boolean;checkedAt:number;items:Array<{id:string;title:string;summary:string;updatedAt:number;status:string;members:Array<{role:string|null;state:string}>}>};
const statuses:Record<string,string>={queued:'Sırada',starting:'Başlıyor',running:'Çalışıyor',waiting:'Yanıt bekliyor',completed:'Tamamlandı',failed:'Sorun oluştu',stopped:'Durduruldu',closed:'Konuşma sona erdi',connected:'Konuşma bağlı',unknown:'Canlı durum doğrulanamadı'};
async function read<T>(path:string,signal:AbortSignal):Promise<T>{const r=await fetch('/bibilen/api/viewer/'+path,{signal,cache:'no-store'});if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Giriş oturumu doğrulanamadı. Sayfayı yeniden açıp giriş yap.');const d=await r.json();if(!r.ok)throw Error(d.error??'Bağlantı kurulamadı.');return d;}
function ObserverPage(){
 const [projects,setProjects]=useState<Projects|null>(null),[selected,setSelected]=useState(new URLSearchParams(location.search).get('workspaceId')??''),[data,setData]=useState<Shared|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all'),[limit,setLimit]=useState(10);
 const selectedRef=useRef(selected);selectedRef.current=selected;
 useEffect(()=>{let alive=true,pending=false;let active:AbortController|null=null;
  async function refresh(){if(pending||document.hidden)return;pending=true;const controller=new AbortController();active=controller;const timer=setTimeout(()=>controller.abort(),15000);
   try{const p=await read<Projects>('projects',controller.signal);if(!alive)return;setProjects(p);const current=selectedRef.current;const id=p.workspaces.some(w=>w.id===current)?current:p.workspaces[0]?.id??'';if(current!==id){selectedRef.current=id;setSelected(id);setData(null);}
    if(!id){setData(null);setError('');return;}
    const d=await read<Shared>('state?workspaceId='+encodeURIComponent(id),controller.signal);if(alive&&selectedRef.current===id){setData(d);setError('');}
   }catch(e){if(alive){setData(null);setProjects(null);setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Bağlantı doğrulanamadı. Yeniden kontrol ediliyor.');}}finally{clearTimeout(timer);pending=false;if(alive)setLoading(false);}
  }
  void refresh();const interval=setInterval(refresh,5000);const focus=()=>void refresh();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{alive=false;active?.abort();clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[selected]);
 const visible=data?.items.filter(i=>filter==='all'||(filter==='results'?!!i.summary:['running','waiting','queued','starting','connected'].includes(i.status)))??[];
 return <div className="ah-observer"><header><span className="ah-mark">AH</span><div><strong>Agent House</strong><p>Paylaşılan projeler · izleyici erişimi</p></div></header>{projects?.preview&&<aside>Yönetici önizlemesi: izleyicilerin göreceği paylaşım ekranındasın. <a href="/?view=tasks">Yönetim paneline dön</a></aside>}
  {error&&<p className="ah-error" role="alert">{error} <a href="/">Erişimi yeniden kontrol et</a></p>}{loading&&<p role="status">Erişimin kontrol ediliyor…</p>}
  {projects&&projects.workspaces.length===0&&<section><h1>Henüz paylaşılan projen yok</h1><p>Proje sahibi, giriş yaptığın hesabı ilgili projeye izleyici olarak eklemeli. Erişim süren dolduysa yeniden izin iste.</p></section>}
  {!!projects?.workspaces.length&&<><label>Proje<select aria-label="Paylaşılan proje" value={selected} onChange={e=>{setData(null);setFilter('all');setLimit(10);setSelected(e.target.value);}}>{projects.workspaces.map(w=><option key={w.id} value={w.id}>{projects.projects.find(p=>p.id===w.projectId)?.name??'Proje'}{projects.workspaces.filter(x=>x.projectId===w.projectId).length>1?' · '+w.id.slice(0,6):''}</option>)}</select></label><section><h1>{data?.projectName??'Proje yükleniyor…'}</h1><p>Yalnızca proje sahibinin paylaştığı işler ve sonuç özetleri gösterilir.</p>{data&&<small>Son kontrol: {new Date(data.checkedAt).toLocaleTimeString('tr-TR')} · 5 saniyede yenilenir</small>}<nav aria-label="Paylaşılan iş filtresi">{[['all','Tümü'],['active','Devam edenler'],['results','Sonuç paylaşılanlar']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setLimit(10);}}>{label}</button>)}</nav>
   {visible.slice(0,limit).map(i=><article key={i.id}><div className="ah-job-heading"><h2>{i.title}</h2><span className={'ah-status ah-'+i.status}>{statuses[i.status]??statuses.unknown}</span></div>{i.members.length>0&&<p>{i.members.map((m,n)=><span className="ah-member" key={n}>{ROSTER.find(r=>r.key===m.role)?.name??'Uzman'} · {m.state==='waiting'?'Yanıt bekliyor':'Çalışıyor'}</span>)}</p>}{i.summary?<><h3>Paylaşılan sonuç</h3><p className="ah-summary">{i.summary}</p><small>Paylaşım güncellendi: {new Date(i.updatedAt).toLocaleString('tr-TR')}</small></>:<p>Henüz sonuç özeti paylaşılmadı.</p>}</article>)}{visible.length>limit&&<button onClick={()=>setLimit(n=>n+10)}>10 iş daha göster</button>}{data&&!visible.length&&<p>{data.items.length?'Bu filtreye uyan paylaşım yok.':'Bu proje için henüz iş paylaşılmadı.'}</p>}
  </section></>}
  {projects?.accessType==='web'&&<p><a href="/cdn-cgi/access/logout">Çıkış yap</a></p>}
  <footer>Bu ekran izleme içindir. Görev, terminal, kaynak kodu, özel konuşmalar ve komut onayları yönetici panelindedir.</footer></div>;
}
createRoot(document.getElementById('root')!).render(<ObserverPage/>);
