// One account-wide admission gate. Native external CLI sessions remain observable,
// but are not controlled or silently stopped by this panel.
export class Admission {
 constructor({limit=3}={}) {this.limit=limit;this.managers=new Set();this.interactive=new Set();this.pendingRecovery=new Set();}
 add(manager){this.managers.add(manager);}
 active(){let count=this.interactive.size;for(const m of this.managers)count+=new Set([...m.data.tasks.filter(t=>['starting','running','waiting'].includes(t.status)).map(t=>t.id),...m.launching]).size;return count;}
 canLaunch(manager,task){
  if(this.pendingRecovery.size||this.active()>=this.limit)return false;
  const candidates=[...this.managers].flatMap(m=>{
   const active=new Set([...m.data.tasks.filter(t=>['starting','running','waiting'].includes(t.status)).map(t=>t.id),...m.launching]).size;
   return active<m.data.settings.maxConcurrent?m.data.tasks.filter(t=>t.status==='queued').map(t=>({m,t})):[];
  }).sort((a,b)=>({urgent:0,high:1,normal:2}[a.t.priority]-{urgent:0,high:1,normal:2}[b.t.priority])||a.t.createdAt-b.t.createdAt||a.t.id.localeCompare(b.t.id));
  return candidates[0]?.m===manager&&candidates[0]?.t===task;
 }
 reserve(key){if(this.pendingRecovery.size)throw new Error('Oturumlar geri yükleniyor. Biraz sonra tekrar dene.');if(this.interactive.has(key))return; if(this.active()>=this.limit)throw new Error('Ortak çalışma sınırı dolu. Açık bir oturumu kapat veya çalışan görevin bitmesini bekle.');this.interactive.add(key);}
 recover(key){this.interactive.add(key);}
 release(key){this.interactive.delete(key);}
 state(){return {limit:this.limit,active:this.active(),scope:'account',externalSessionsControlled:false};}
}

export function workspaceScope(url,headers,defaultId){
 const query=url.searchParams.get('workspaceId'),header=headers['x-workspace-id'];
 if(query!==null&&!query||header!==undefined&&(!header||typeof header!=='string'))throw new Error('Çalışma ortamı kimliği geçersiz.');
 if(query&&header&&query!==header)throw new Error('Çalışma ortamı kimlikleri çelişiyor.');
 return query??header??defaultId;
}

export class ScopedPush {
 constructor(push,context,{legacy=false}={}){this.push=push;this.context=context;this.legacy=legacy;}
 belongs(item){return item.workspaceId===this.context.workspaceId||(!item.workspaceId&&this.legacy);}
 state(){return {...this.push.state(),items:this.push.items.filter(n=>this.belongs(n))};}
 async send(task,heading){return this.push.send({...task,projectId:this.context.projectId,workspaceId:this.context.workspaceId,projectName:this.context.projectName},heading);}
 markRead(id){if(id&&!this.push.items.some(n=>n.id===id&&this.belongs(n)))throw new Error('Bu projede bildirim bulunamadı.');for(const item of this.push.items)if(this.belongs(item)&&(!id||item.id===id))item.read=true;this.push.save();return this.state();}
 publicKey(){return this.push.publicKey();}
 registered(endpoint){return this.push.registered(endpoint);}
 subscribe(value){return this.push.subscribe(value);}
 unsubscribe(endpoint){return this.push.unsubscribe(endpoint);}
 updatePreferences(input){this.push.updatePreferences(input);return this.state();}
 updateDelivery(input){this.push.updateDelivery(input);return this.state();}
}

// One history request window across all configured project hubs. Retry-After from
// any hub backs off all hubs so adding projects cannot multiply Slack polling.
export class SlackCoordinator {
 constructor({now=()=>Date.now()}={}){this.now=now;this.retryAt=0;this.busy=false;this.hubs=[];this.cursor=0;}
 add(hub){this.hubs.push(hub);return {state:()=>hub.state(),poll:()=>this.poll(hub),configure:input=>this.configure(hub,input)};}
 async configure(hub,input){if(this.busy||this.now()<this.retryAt)throw new Error('Slack ortak bağlantı kontrolü bekliyor. Biraz sonra tekrar dene.');this.busy=true;this.retryAt=this.now()+65000;try{return await hub.configure(input);}finally{this.retryAt=Math.max(this.retryAt,hub.retryAt??0);this.busy=false;}}
 async poll(preferred){if(this.busy||this.now()<this.retryAt)return preferred?.state();const configured=this.hubs.filter(h=>h.channels.size&&this.now()>=h.retryAt);const hub=preferred?.channels.size&&this.now()>=preferred.retryAt?preferred:configured[this.cursor++%configured.length];if(!hub)return preferred?.state();this.busy=true;this.retryAt=this.now()+65000;try{return await hub.poll();}finally{this.retryAt=Math.max(this.retryAt,hub.retryAt??0);this.busy=false;}}
}
