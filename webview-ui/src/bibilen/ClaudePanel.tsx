import {scopedUrl} from './workspace.js';
import {Icon} from './Icon.js';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
export function ClaudePanel({close}:{close:()=>void}) {
  const mount=useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    if(!mount.current)return;
    const terminal=new Terminal({fontSize:13,fontFamily:'Menlo, monospace',cursorBlink:true,convertEol:false,theme:{background:'#0b1224',foreground:'#e5edff',cursor:'#3f72ff'}});
    const fit=new FitAddon();terminal.loadAddon(fit);terminal.open(mount.current);fit.fit();
    const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}${scopedUrl("/bibilen-terminal")}`,['bibilen-control']);
    const resize=()=>{fit.fit();if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'resize',cols:terminal.cols,rows:terminal.rows}));};
    ws.onopen=()=>{setStatus('Gökhan · Claude Code bağlantısı açık');resize();terminal.focus();};
    ws.onmessage=e=>terminal.write(String(e.data));
    ws.onclose=()=>setStatus('Bağlantı kapandı. Paneli kapatıp yeniden açabilirsin.');
    const input=terminal.onData(data=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'input',data}));});
    const observer=new ResizeObserver(resize);observer.observe(mount.current);
    return()=>{observer.disconnect();input.dispose();ws.close();terminal.dispose();};
  },[]);
  return <section className="bb-console" aria-label="Gökhan çalışma paneli">
    <header><div><strong>Gökhan</strong><small>Ana çalışma alanı · Claude Code</small></div><button onClick={close} aria-label="Paneli kapat"><Icon name="close"/></button></header>
    <div className="bb-terminal" ref={mount}/><footer><span role="status">{status}</span></footer>
  </section>;
}
