import {terminalScrollMode,liveScrollKey} from './terminal-scroll.js';
import {SessionControls} from './SessionControls.js';
import {useDialogFocus} from './use-dialog-focus.js';
import {terminalChannel} from './terminal-channel.js';
import {useDraft} from './drafts.js';
import {DictationButton} from './DictationButton.js';
import {MessageContent} from './MessageContent.js';
import {scopedUrl} from './workspace.js';
import {useEffect,useRef,useState} from 'react';
import {Terminal} from '@xterm/xterm';import {FitAddon} from '@xterm/addon-fit';import '@xterm/xterm/css/xterm.css';
import {Icon} from './Icon.js';import type {ClaudeSession} from './types.js';
import {getTranscript} from './api.js';import type {ConversationMessage} from './types.js';
export function SessionTerminal({session,close,onSessionChange,embedded=false}:{embedded?:boolean;session:ClaudeSession;close:()=>void;onSessionChange:(id:string,title:string)=>void}){
 const dialog=useRef<HTMLElement>(null);useDialogFocus(dialog,!embedded);
 const mount=useRef<HTMLDivElement>(null);const [status,setStatus]=useState('Bağlanıyor…');
 const historyMount=useRef<HTMLDivElement>(null);const scrollTerminal=useRef<(amount:number)=>void>(()=>{});
 const send=useRef<(data:string)=>boolean>(()=>false);const focus=useRef(()=>{});
 const [canWrite,setCanWrite]=useState(false);const [draft,setDraft]=useDraft('session:'+session.id);const [connectionVersion,reconnect]=useState(0);const [history,setHistory]=useState(false);
 const [messages,setMessages]=useState<ConversationMessage[]>([]);const [before,setBefore]=useState<number|null>(null);const [loading,setLoading]=useState(false);const [readError,setReadError]=useState('');const readVersion=useRef(0);
 const read=async(cursor?:number)=>{const version=++readVersion.current;setLoading(true);setReadError('');try{const result=await getTranscript(session.id,cursor);if(version!==readVersion.current)return;setMessages(old=>cursor===undefined?result.messages:[...result.messages,...old]);setBefore(result.nextBefore);}catch(e){if(version===readVersion.current)setReadError(e instanceof Error?e.message:'Geçmiş okunamadı.');}finally{if(version===readVersion.current)setLoading(false);}};
 useEffect(()=>{setMessages([]);setBefore(null);setReadError('');return()=>{readVersion.current++;};},[session.id]);
 useEffect(()=>{
  if(!mount.current)return;
  const terminal=new Terminal({scrollback:10000,scrollOnEraseInDisplay:true,fontSize:14,fontFamily:'Menlo, monospace',cursorBlink:true,theme:{background:'#0e1929',foreground:'#f5f3ed',cursor:'#a5c4ff'}});
  const fit=new FitAddon();terminal.loadAddon(fit);terminal.open(mount.current);fit.fit();
  const scroll=(amount:number)=>{if(terminalScrollMode(terminal.buffer.active.type)==='cli'){if(writable)ws.send({type:'input',data:liveScrollKey(amount)});return;}terminal.scrollLines(amount);};scrollTerminal.current=scroll;
  terminal.attachCustomWheelEventHandler(event=>{if(!event.deltaY)return false;if(terminal.buffer.active.type==='alternate'&&terminal.modes.mouseTrackingMode!=='none')return true;scroll(Math.sign(event.deltaY)*Math.max(1,Math.round(Math.abs(event.deltaY)/24)));event.preventDefault();return false;});
  let touchY:number|null=null;const touchStart=(event:TouchEvent)=>{touchY=event.touches.length===1?event.touches[0].clientY:null;};const touchMove=(event:TouchEvent)=>{if(touchY===null||event.touches.length!==1)return;const delta=touchY-event.touches[0].clientY;if(Math.abs(delta)<12)return;scroll(Math.sign(delta)*Math.max(1,Math.round(Math.abs(delta)/12)));touchY=event.touches[0].clientY;event.preventDefault();};
  const element=mount.current;element.addEventListener('touchstart',touchStart,{passive:true});element.addEventListener('touchmove',touchMove,{passive:false});
  const url=(`${location.protocol==='https:'?'wss':'ws'}://${location.host}${scopedUrl(`/bibilen-session-terminal?id=${encodeURIComponent(session.id)}`)}` );let writable=false;let error=false;
  setCanWrite(false);setStatus('Bağlanıyor…');terminal.options.disableStdin=true;
  const ws=terminalChannel(url,{
   open:()=>{error=false;terminal.reset();setStatus('Oturum doğrulanıyor…');},
   message:text=>{let message;try{message=JSON.parse(text);}catch{}
    if(message?.type==='control'){writable=message.writable;setCanWrite(writable);setStatus(writable?'Canlı oturum · yazabilirsin':'İzleme modu · başka bir panel kontrol ediyor');terminal.options.disableStdin=!writable;if(writable){fit.fit();ws.send({type:'resize',cols:terminal.cols,rows:terminal.rows});}return;}
    if(message?.type==='error'){error=true;setStatus(message.message);return;}
    if(message?.type==='session'){onSessionChange(message.id,message.title);return;}
    terminal.write(text);
   },
   closed:message=>{writable=false;setCanWrite(false);terminal.options.disableStdin=true;if(!error)setStatus(message+' Taslağın bu sekmede korunuyor.');},
   retrying:attempt=>{setStatus(`Bağlantı yeniden kuruluyor · ${attempt}/5. Taslağın korunuyor.`);},
  });
  send.current=data=>writable&&ws.send({type:'input',data});focus.current=()=>terminal.focus();
  const input=terminal.onData(data=>{if(writable)ws.send({type:'input',data});});
  const resize=()=>{if(!mount.current||mount.current.clientHeight===0)return;fit.fit();if(writable)ws.send({type:'resize',cols:terminal.cols,rows:terminal.rows});};
  const observer=new ResizeObserver(resize);observer.observe(mount.current);
  return()=>{writable=false;send.current=()=>false;focus.current=()=>{};observer.disconnect();element.removeEventListener('touchstart',touchStart);element.removeEventListener('touchmove',touchMove);scrollTerminal.current=()=>{};input.dispose();ws.close();terminal.dispose();};
 },[session.id,onSessionChange,connectionVersion]);
 return <section ref={dialog} className="bb-console" role={embedded?'region':'dialog'} aria-modal={embedded?undefined:true} aria-label="Claude oturumu"><header><div><small>Claude Code</small><strong>{session.title}</strong></div><button aria-label="Oturum panelini kapat" onClick={close}><Icon name="close"/></button></header>
  <nav className="bb-terminal-tabs" aria-label="Konuşma görünümü"><button aria-pressed={!history} onClick={()=>setHistory(false)}>Canlı terminal</button><button aria-pressed={history} onClick={()=>{setHistory(true);void read();}}>Tüm konuşma</button></nav><div className="bb-terminal-scroll-tools" aria-label="Konuşmayı kaydır">{history?<><button onClick={()=>historyMount.current?.scrollTo({top:0})}>Başa git</button><button onClick={()=>historyMount.current?.scrollTo({top:historyMount.current.scrollHeight})}>Sona git</button><button disabled={loading} onClick={()=>void read()}>Yenile</button></>:<><button onClick={()=>scrollTerminal.current(-12)}>↑ Yukarı</button><button onClick={()=>scrollTerminal.current(12)}>↓ Aşağı</button><button disabled={!canWrite} title="Claude CLI’ın kendi ayrıntılı konuşma görünümünü açar veya kapatır." onClick={()=>send.current('\x0f')}>CLI ayrıntıları</button></>}</div>
  <SessionControls key={session.id} canWrite={canWrite} send={text=>send.current(text)} stage={text=>{if(draft.trim()||text.length>20000)return false;setDraft(text);return true;}}/>
  <div className="bb-terminal" hidden={history} ref={mount}/>
  {history&&<div ref={historyMount} className="bb-terminal-history" role="region" aria-label="Kaydırılabilir konuşma geçmişi" tabIndex={0}>{before!==null&&<button disabled={loading} onClick={()=>void read(before)}>Önceki mesajları yükle</button>}{messages.map((m,i)=><article className={`bb-message bb-message-${m.role}`} key={`${m.id}-${i}`}><header><strong>{m.role==='user'?'Sen':'Claude'}</strong>{m.timestamp&&<time>{new Date(m.timestamp).toLocaleString('tr-TR')}</time>}</header><MessageContent text={m.text}/>{m.tools.length>0&&<p>Araçlar: {m.tools.join(', ')}</p>}</article>)}{loading&&<p role="status">Yükleniyor…</p>}{readError&&<p role="alert">{readError}</p>}</div>}
  <footer><span role="status">{status}</span>{!canWrite&&<button type="button" onClick={()=>reconnect(v=>v+1)}>Yeniden bağlan</button>}
   <form className="bb-terminal-reply" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;if(send.current(`\x1b[200~${draft}\x1b[201~`)&&send.current('\r')){setDraft('');setHistory(false);}}}><label>Yanıtın<textarea aria-label="Claude'a yanıt yaz" placeholder="Mesajını veya /compact gibi bir komutu yaz…" rows={2} value={draft} maxLength={20000} onChange={e=>setDraft(e.target.value)}/></label><DictationButton disabled={false} onText={text=>setDraft(old=>old?`${old} ${text}`:text)}/><button className="bb-primary" disabled={!canWrite||!draft.trim()}>Gönder</button></form>
   {!history&&<details className="bb-terminal-key-menu"><summary>Terminal tuşları</summary><div className="bb-terminal-keys"><button disabled={!canWrite} onClick={()=>focus.current()}>Terminale yaz</button>{[['Enter','\r'],['Esc','\x1b'],['↑','\x1b[A'],['↓','\x1b[B'],['Durdur (Ctrl+C)','\x03']].map(([label,data])=><button key={label} disabled={!canWrite} onClick={()=>send.current(data)}>{label}</button>)}</div></details>}
  </footer></section>;
}
