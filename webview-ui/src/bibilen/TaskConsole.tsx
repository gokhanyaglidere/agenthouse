import {terminalChannel} from './terminal-channel.js';
import {useDraft} from './drafts.js';
import {DictationButton} from './DictationButton.js';
import {scopedUrl} from './workspace.js';
import {Icon} from './Icon.js';
import {useEffect,useRef,useState} from 'react';
import {Terminal} from '@xterm/xterm';import {FitAddon} from '@xterm/addon-fit';import '@xterm/xterm/css/xterm.css';
import {getTaskLogs} from './api.js';import type {BibilenTask} from './types.js';
export function TaskConsole({task,close}:{task:BibilenTask;close:()=>void}){
 const channel=useRef<ReturnType<typeof terminalChannel>|null>(null);const [writable,setWritable]=useState(false);const [draft,setDraft]=useDraft('task:'+task.id);const [connectionVersion,reconnect]=useState(0);const mount=useRef<HTMLDivElement>(null);const [status,setStatus]=useState('Bağlanıyor…');
 useEffect(()=>{if(!mount.current)return;const terminal=new Terminal({fontSize:13,fontFamily:'Menlo, monospace',cursorBlink:true,theme:{background:'#071022',foreground:'#edf3ff',cursor:'#79a2ff'}});const fit=new FitAddon();terminal.loadAddon(fit);terminal.open(mount.current);fit.fit();let ws:ReturnType<typeof terminalChannel>|null=null;let disposed=false;setWritable(false);
  if(task.sessionId&&!['completed','failed','stopped'].includes(task.status)){ws=terminalChannel(`${location.protocol==='https:'?'wss':'ws'}://${location.host}${scopedUrl(`/bibilen-task-terminal?id=${encodeURIComponent(task.id)}`)}`,{
   open:()=>{setWritable(true);setStatus('Canlı oturuma bağlı');terminal.reset();fit.fit();ws?.send({type:'resize',cols:terminal.cols,rows:terminal.rows});},
   message:data=>terminal.write(data),closed:message=>{setWritable(false);setStatus(message+' Taslağın korunuyor.');},retrying:attempt=>setStatus(`Yeniden bağlanıyor · ${attempt}/5`),
  });channel.current=ws;terminal.onData(data=>ws?.send({type:'input',data}));}

  else {if(task.sessionId)void getTaskLogs(task.id).then(({logs})=>{if(!disposed&&logs)terminal.write('\r\n'+logs.replace(/\n/g,'\r\n'));}).catch(()=>{});setStatus(task.error?'Görev hatası':task.status==='completed'?'Tamamlanan görev kaydı':task.status==='stopped'?'Durdurulan görev kaydı':'Görev oturumu henüz yok');terminal.write((task.error||task.summary||'Claude oturumu henüz oluşmadı. Görev durumunu panelden takip edebilirsin.').replace(/\n/g,'\r\n'));}
  const observer=new ResizeObserver(()=>{fit.fit();ws?.send({type:'resize',cols:terminal.cols,rows:terminal.rows});});observer.observe(mount.current);return()=>{disposed=true;channel.current=null;observer.disconnect();ws?.close();terminal.dispose();};
 },[task.id,task.sessionId,['completed','failed','stopped'].includes(task.status),connectionVersion]);
 return <div className="bb-modal-backdrop"><section className="bb-task-console" role="dialog" aria-modal="true" aria-label="Görev oturumu"><header><div><span className="bb-kicker">{status}</span><h2>{task.title}</h2></div><button onClick={close} aria-label="Kapat"><Icon name="close"/></button></header><div ref={mount}/><form className="bb-terminal-reply" onSubmit={e=>{e.preventDefault();if(!writable||!draft.trim())return;if(channel.current?.send({type:'input',data:`\x1b[200~${draft}\x1b[201~`})&&channel.current.send({type:'input',data:'\r'}))setDraft('');}}><label>Yanıtın<textarea aria-label="Görev oturumuna yanıt yaz" value={draft} maxLength={20000} onChange={e=>setDraft(e.target.value)} rows={2}/></label><DictationButton disabled={false} onText={text=>setDraft(old=>old?`${old} ${text}`:text)}/><button disabled={!writable||!draft.trim()}>Gönder</button></form><footer>{!writable&&task.sessionId&&!['completed','failed','stopped'].includes(task.status)&&<button onClick={()=>reconnect(v=>v+1)}>Yeniden bağlan</button>}İzin sorusu varsa yanıt alanından veya terminalden cevap verebilirsin.</footer></section></div>;
}
