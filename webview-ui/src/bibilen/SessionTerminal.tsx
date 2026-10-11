import {DictationButton} from './DictationButton.js';
import {MessageContent} from './MessageContent.js';
import {scopedUrl} from './workspace.js';
import {useEffect,useRef,useState} from 'react';
import {Terminal} from '@xterm/xterm';import {FitAddon} from '@xterm/addon-fit';import '@xterm/xterm/css/xterm.css';
import {Icon} from './Icon.js';import type {ClaudeSession} from './types.js';
import {getTranscript} from './api.js';import type {ConversationMessage} from './types.js';
export function SessionTerminal({session,close,onSessionChange}:{session:ClaudeSession;close:()=>void;onSessionChange:(id:string,title:string)=>void}){
 const mount=useRef<HTMLDivElement>(null);const [status,setStatus]=useState('Bağlanıyor…');
 const send=useRef<(data:string)=>boolean>(()=>false);const focus=useRef(()=>{});
 const [canWrite,setCanWrite]=useState(false);const [draft,setDraft]=useState('');const [history,setHistory]=useState(false);
 const [messages,setMessages]=useState<ConversationMessage[]>([]);const [before,setBefore]=useState<number|null>(null);const [loading,setLoading]=useState(false);const [readError,setReadError]=useState('');const readVersion=useRef(0);
 const read=async(cursor?:number)=>{const version=++readVersion.current;setLoading(true);setReadError('');try{const result=await getTranscript(session.id,cursor);if(version!==readVersion.current)return;setMessages(old=>cursor===undefined?result.messages:[...result.messages,...old]);setBefore(result.nextBefore);}catch(e){if(version===readVersion.current)setReadError(e instanceof Error?e.message:'Geçmiş okunamadı.');}finally{if(version===readVersion.current)setLoading(false);}};
 useEffect(()=>()=>{readVersion.current++;},[session.id]);
 useEffect(()=>{
  if(!mount.current)return;
  const terminal=new Terminal({fontSize:14,fontFamily:'Menlo, monospace',cursorBlink:true,theme:{background:'#0e1929',foreground:'#f5f3ed',cursor:'#a5c4ff'}});
  const fit=new FitAddon();terminal.loadAddon(fit);terminal.open(mount.current);fit.fit();
  const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}${scopedUrl(`/bibilen-session-terminal?id=${encodeURIComponent(session.id)}`)}`,['bibilen-control']);let writable=false;let error=false;
  setCanWrite(false);send.current=data=>{if(!writable||ws.readyState!==WebSocket.OPEN)return false;ws.send(JSON.stringify({type:'input',data}));return true;};focus.current=()=>terminal.focus();
  ws.onmessage=e=>{const text=String(e.data);let message;try{message=JSON.parse(text);}catch{}
   if(message?.type==='control'){writable=message.writable;setCanWrite(writable);setStatus(writable?'Canlı oturum · yazabilirsin':'İzleme modu · başka bir panel kontrol ediyor');terminal.options.disableStdin=!writable;if(writable){terminal.focus();fit.fit();ws.send(JSON.stringify({type:'resize',cols:terminal.cols,rows:terminal.rows}));}return;}
   if(message?.type==='error'){error=true;setStatus(message.message);return;}
   if(message?.type==='session'){onSessionChange(message.id,message.title);return;}
   terminal.write(text);
  };
  ws.onclose=()=>{writable=false;setCanWrite(false);if(!error)setStatus('Bağlantı kapandı. Konuşma kayıtları Oturumlar bölümünde kalır.');};
  ws.onerror=()=>{error=true;setStatus('Oturuma bağlanılamadı. Paneli kapatıp yeniden dene.');};
  const input=terminal.onData(data=>{if(writable&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'input',data}));});
  const resize=()=>{if(!mount.current||mount.current.clientHeight===0)return;fit.fit();if(writable&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'resize',cols:terminal.cols,rows:terminal.rows}));};
  const observer=new ResizeObserver(resize);observer.observe(mount.current);
  return()=>{writable=false;send.current=()=>false;focus.current=()=>{};observer.disconnect();input.dispose();ws.close();terminal.dispose();};
 },[session.id,close,onSessionChange]);
 return <section className="bb-console" role="dialog" aria-modal="true" aria-label="Claude oturumu"><header><div><small>Claude Code</small><strong>{session.title}</strong></div><button aria-label="Oturum panelini kapat" onClick={close}><Icon name="close"/></button></header>
  <nav className="bb-terminal-tabs" aria-label="Konuşma görünümü"><button aria-pressed={!history} onClick={()=>setHistory(false)}>Canlı terminal</button><button aria-pressed={history} onClick={()=>{setHistory(true);void read();}}>Konuşma geçmişi</button></nav>
  <div className="bb-terminal" hidden={history} ref={mount}/>
  {history&&<div className="bb-terminal-history" role="region" aria-label="Kaydırılabilir konuşma geçmişi" tabIndex={0}>{before!==null&&<button disabled={loading} onClick={()=>void read(before)}>Önceki mesajları yükle</button>}{messages.map((m,i)=><article className={`bb-message bb-message-${m.role}`} key={`${m.id}-${i}`}><header><strong>{m.role==='user'?'Sen':'Claude'}</strong>{m.timestamp&&<time>{new Date(m.timestamp).toLocaleString('tr-TR')}</time>}</header><MessageContent text={m.text}/>{m.tools.length>0&&<p>Araçlar: {m.tools.join(', ')}</p>}</article>)}{loading&&<p role="status">Yükleniyor…</p>}{readError&&<p role="alert">{readError}</p>}</div>}
  <footer><span role="status">{status}</span>
   <form className="bb-terminal-reply" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;if(send.current(`\x1b[200~${draft}\x1b[201~`)&&send.current('\r')){setDraft('');setHistory(false);}}}><label>Yanıtın<textarea aria-label="Claude'a yanıt yaz" placeholder="Mesajını veya /compact gibi bir komutu yaz…" rows={2} value={draft} disabled={!canWrite} onChange={e=>setDraft(e.target.value)}/></label><DictationButton disabled={!canWrite} onText={text=>setDraft(old=>old?`${old} ${text}`:text)}/><button className="bb-primary" disabled={!canWrite||!draft.trim()}>Gönder</button></form>
   {!history&&<div className="bb-terminal-keys"><button disabled={!canWrite} onClick={()=>focus.current()}>Terminale yaz</button>{[['Enter','\r'],['Esc','\x1b'],['↑','\x1b[A'],['↓','\x1b[B'],['Durdur (Ctrl+C)','\x03']].map(([label,data])=><button key={label} disabled={!canWrite} onClick={()=>send.current(data)}>{label}</button>)}</div>}
  </footer></section>;
}
