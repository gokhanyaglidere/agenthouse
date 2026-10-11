// Inputs are never queued or replayed after reconnection: every send is explicit.
export function terminalChannel(url:string, callbacks:{open:()=>void;message:(data:string)=>void;closed:(message:string)=>void;retrying:(attempt:number)=>void}, create:(url:string)=>WebSocket=url=>new WebSocket(url,['bibilen-control'])){
 let socket:WebSocket|null=null, timer:ReturnType<typeof setTimeout>|undefined, stopped=false, attempt=0;
 const connect=()=>{
  if(stopped)return;
  const current=create(url);socket=current;
  current.onopen=()=>{if(stopped||socket!==current)return;attempt=0;callbacks.open();};
  current.onmessage=e=>{if(!stopped&&socket===current)callbacks.message(String(e.data));};
  current.onerror=()=>{}; // close delivers both HTTP rejection and transport failure.
  current.onclose=e=>{if(stopped||socket!==current)return;callbacks.closed(e.reason||'Bağlantı kapandı.');
   if(e.code===1000||e.code===1008||attempt>=5)return;
   const delay=Math.min(15000,1000*2**attempt);callbacks.retrying(++attempt);timer=setTimeout(connect,delay);
  };
 };
 connect();
 return {send:(value:object)=>{if(stopped||socket?.readyState!==1)return false;try{socket.send(JSON.stringify(value));return true;}catch{return false;}},close:()=>{stopped=true;clearTimeout(timer);socket?.close();}};
}
