// Late exit from an earlier attach must never unlock a newer viewer.
export function watchTaskTerminal(registry,id,terminal,ws){
 registry.set(id,terminal);
 const release=()=>{if(registry.get(id)===terminal)registry.delete(id);};
 terminal.onExit(()=>{release();if(ws.readyState===1)ws.close();});
 ws.on('close',()=>{release();try{terminal.kill();}catch{}});
}
