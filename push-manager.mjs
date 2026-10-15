import { randomUUID, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import webpush from 'web-push';

const dir = join(homedir(), '.pixel-agents');
const conversationReply=item=>item.kind==='completed'&&!!item.sessionId&&!item.taskId&&item.source!=='slack'&&item.source!=='task-limit';
const groupKey=item=>JSON.stringify([item.workspaceId??'legacy',item.source==='slack'?'slack':item.sessionId?'session':'task',item.sessionId??item.taskId??item.id,item.kind]);
function compact(items){const groups=new Map();for(const item of items){const key=groupKey(item),prior=groups.get(key);if(!prior)groups.set(key,{...item,count:item.count??1,firstAt:item.firstAt??item.at});else{prior.count+=(item.count??1);prior.firstAt=Math.min(prior.firstAt,item.firstAt??item.at);}}return [...groups.values()].sort((a,b)=>b.at-a.at).slice(0,150);}


function secureWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, path);
  chmodSync(path, 0o600);
}

function read(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

export class PushManager {
  constructor({storageDir=dir,deliver=webpush.sendNotification.bind(webpush),now=()=>Date.now()}={}) {
    this.subscriptionPath=join(storageDir,'bibilen-push-subscriptions.json');
    this.noticePath=join(storageDir,'bibilen-notifications.json');
    this.deliver=deliver;this.now=now;
    const keyPath=join(storageDir,'bibilen-vapid.json');
    const saved=read(this.noticePath,{});
    this.preferences={completed:true,waiting:true,failed:true,alert:true,sessionReplies:false};
    for(const key of Object.keys(this.preferences))if(typeof saved.preferences?.[key]==='boolean')this.preferences[key]=saved.preferences[key];
    this.deliveryPreferences={quietEnabled:false,quietStart:'22:00',quietEnd:'08:00',timeZone:'Europe/Istanbul',privacy:false,mutedSessions:[],mutedWorkspaces:[],...saved.deliveryPreferences};
    this.items=Array.isArray(saved.items)?saved.items.slice(0,150):[];
    this.seenEvents=Array.isArray(saved.seenEvents)?saved.seenEvents.slice(-1000):[];
    if(saved.policyVersion!==2){
      const archive=join(storageDir,'notification-history-before-smart-v2.json');
      if(this.items.length&&!existsSync(archive))secureWrite(archive,{items:this.items});
      this.seenEvents=[...this.seenEvents,...this.items.filter(item=>item.noticeId).map(item=>JSON.stringify([item.workspaceId??null,item.noticeId]))].slice(-1000);
      this.items=compact(this.items.map(item=>conversationReply(item)?{...item,read:true}:item.kind==='waiting'&&item.sessionId&&!item.taskId?{...item,read:true,resolvedAt:this.now()}:item));
    }
    this.lastDelivery=saved.lastDelivery??null;
    this.warning=saved.warning??null;
    const candidate=read(keyPath,null);
    const previousKeys=typeof candidate?.publicKey==='string'&&typeof candidate?.privateKey==='string'?candidate:null;
    this.keys=previousKeys??webpush.generateVAPIDKeys();
    secureWrite(keyPath, this.keys);
    const subscriptions=read(this.subscriptionPath, []);
    this.subscriptions=Array.isArray(subscriptions)?subscriptions.slice(-20):[];
    if(!previousKeys&&this.subscriptions.length){this.subscriptions=[];secureWrite(this.subscriptionPath,[]);this.warning='Bildirim anahtarı yenilendi. Cihazlarında bildirimleri yeniden etkinleştir.';this.save();}
    webpush.setVapidDetails('https://bibilen.com', this.keys.publicKey, this.keys.privateKey);
    this.save();
  }

  publicKey() { return this.keys.publicKey; }

  subscribe(subscription) {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new Error('Geçersiz bildirim aboneliği.');
    }
    this.subscriptions = this.subscriptions.filter((item) => item.endpoint !== subscription.endpoint);
    this.subscriptions.push(subscription);
    this.subscriptions=this.subscriptions.slice(-20);
    secureWrite(this.subscriptionPath, this.subscriptions);
    this.warning=null;this.save();
  }

  state(){return {preferences:this.preferences,deliveryPreferences:this.deliveryPreferences,items:this.items,devices:this.subscriptions.length,lastDelivery:this.lastDelivery,warning:this.warning};}
  registered(endpoint){return this.subscriptions.some(s=>s.endpoint===endpoint);}
  save(){secureWrite(this.noticePath,{policyVersion:2,seenEvents:this.seenEvents,preferences:this.preferences,deliveryPreferences:this.deliveryPreferences,items:this.items,lastDelivery:this.lastDelivery,warning:this.warning});}
  updatePreferences(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Bildirim tercihi geçersiz.');
    for(const key of Object.keys(this.preferences))if(key in input){if(typeof input[key]!=='boolean')throw new Error('Bildirim tercihi geçersiz.');}
    for(const key of Object.keys(this.preferences))if(key in input)this.preferences[key]=input[key];
    this.save();return this.state();
  }
  updateDelivery(input){
    const next={...this.deliveryPreferences};for(const key of ['quietEnabled','privacy'])if(key in input){if(typeof input[key]!=='boolean')throw new Error('Geçersiz tercih.');next[key]=input[key];}
    for(const key of ['quietStart','quietEnd'])if(key in input){if(typeof input[key]!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input[key]))throw new Error('Saat geçersiz.');next[key]=input[key];}
    if('timeZone'in input){try{new Intl.DateTimeFormat('en',{timeZone:input.timeZone}).format();}catch{throw new Error('Saat dilimi geçersiz.');}next.timeZone=input.timeZone;}
    if('mutedWorkspaces'in input){if(!Array.isArray(input.mutedWorkspaces)||input.mutedWorkspaces.length>200||input.mutedWorkspaces.some(id=>typeof id!=='string'||! /^(?:[a-zA-Z0-9-]{1,100}|h~[a-z0-9]{8,32}~[a-f0-9-]{36})$/.test(id)))throw new Error('Proje listesi geçersiz.');next.mutedWorkspaces=[...new Set(input.mutedWorkspaces)];}
    if('mutedSessions'in input){if(!Array.isArray(input.mutedSessions)||input.mutedSessions.length>200||input.mutedSessions.some(id=>typeof id!=='string'||! /^[a-zA-Z0-9-]{1,100}$/.test(id)))throw new Error('Oturum listesi geçersiz.');next.mutedSessions=[...new Set(input.mutedSessions)];}this.deliveryPreferences=next;this.save();return this.state();
  }
  quiet(at){const p=this.deliveryPreferences;if(!p.quietEnabled||p.quietStart===p.quietEnd)return false;const parts=new Intl.DateTimeFormat('en-GB',{timeZone:p.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at);const time=parts.find(x=>x.type==='hour').value+':'+parts.find(x=>x.type==='minute').value;return p.quietStart<p.quietEnd?time>=p.quietStart&&time<p.quietEnd:time>=p.quietStart||time<p.quietEnd;}
  markRead(id){for(const item of this.items)if(!id||item.id===id)item.read=true;this.save();return this.state();}
  unsubscribe(endpoint){this.subscriptions=this.subscriptions.filter(s=>s.endpoint!==endpoint);secureWrite(this.subscriptionPath,this.subscriptions);}
  resolveSession(sessionId,workspaceId){let changed=false;for(const item of this.items)if(item.sessionId===sessionId&&(item.workspaceId??null)===(workspaceId??null)&&item.kind==='waiting'&&!item.resolvedAt){item.resolvedAt=this.now();item.read=true;changed=true;}if(changed)this.save();}
  async send(task, heading) {
    const kind=task.status;if(!['completed','waiting','failed','alert'].includes(kind))return;
    const at=this.now(),sessionNotice=task.source==='session'||task.source==='approval'||task.sessionId&&task.id===task.sessionId;
    // Deduplicate the same status event, never a later permission episode.
    const eventKey=task.noticeId?JSON.stringify([task.workspaceId??null,task.noticeId]):null;
    if(eventKey&&(this.seenEvents.includes(eventKey)||this.items.some(item=>item.noticeId===task.noticeId&&(item.workspaceId??null)===(task.workspaceId??null))))return;
    if(eventKey)this.seenEvents=[...this.seenEvents,eventKey].slice(-1000);
    const title=task.source==='task-limit'?'Görev süre uyarısı':task.source==='slack'?task.title:task.isTest?'Bildirim bağlantısı testi':task.sessionId&&task.id===task.sessionId&&kind==='completed'?'Oturum yanıtı hazır':{completed:'Görev tamamlandı',waiting:'Yanıtın gerekiyor',failed:'Görevde sorun var'}[kind];
    const body=task.source==='task-limit'?`${task.title} · ${task.runMinutes} dakikalık süre doldu. İş otomatik durdurulmadı.`:task.source==='slack'?task.body:task.isTest?'Bu bir bağlantı testidir. Bildirime dokunarak Agent House panelini açabilirsin.':`${task.title} · ${{completed:'Sonucu ve ekip çalışmalarını inceleyebilirsin.',waiting:'İzin veya yanıt vermek için görev terminalini aç.',failed:'Ayrıntıları ve son işlemleri kontrol et.'}[kind]}`;
    const item={id:randomUUID(),noticeId:task.noticeId,source:task.source??null,taskId:task.source==='slack'||task.isTest||sessionNotice?null:task.id,sessionId:task.sessionId??null,kind,title,body,at,read:false,...(task.workspaceId?{workspaceId:task.workspaceId,projectId:task.projectId,projectName:task.projectName}:{}),url:task.source==='slack'?'/?view=office&alerts=slack':task.isTest?'/?view=office':sessionNotice?`/?view=sessions&session=${encodeURIComponent(task.sessionId)}`:`/?view=${kind==='completed'?'history':'tasks'}&task=${encodeURIComponent(task.id)}`};
    if(task.workspaceId){const url=new URL(item.url,'https://office.invalid');url.searchParams.set('workspaceId',task.workspaceId);item.url=url.pathname+url.search;item.body=`${task.projectName} · ${item.body}`;}
    const key=groupKey(item),previous=this.items.find(old=>groupKey(old)===key);
    if(previous){item.id=previous.id;item.count=(previous.count??1)+1;item.firstAt=previous.firstAt??previous.at;item.lastPushedAt=previous.lastPushedAt;}else{item.count=1;item.firstAt=at;}
    const reply=conversationReply(item);if(reply)item.read=true;
    if(['completed','failed'].includes(kind)&&task.sessionId)this.resolveSession(task.sessionId,task.workspaceId);
    // Record every update as one current card; only genuinely new attention episodes interrupt a device.
    this.items=[item,...this.items.filter(old=>old.id!==item.id)].slice(0,150);this.save();
    if(reply&&!this.preferences.sessionReplies)return;
    if(previous&&!previous.read&&!previous.resolvedAt&&at-(previous.lastPushedAt??0)<(kind==='waiting'?60000:kind==='failed'?300000:30000))return;
    if(!this.preferences[kind]||this.quiet(at)||this.deliveryPreferences.mutedSessions.includes(task.sessionId??task.id)||this.deliveryPreferences.mutedWorkspaces.includes(task.workspaceId))return;
    item.lastPushedAt=at;this.save();
    const payload=JSON.stringify({...item,renotify:kind==='waiting'&&(!previous||!!previous.resolvedAt||previous.read),title:this.deliveryPreferences.privacy&&task.source==='slack'?'Slack alarmı':title,body:this.deliveryPreferences.privacy?'Agent House’ta bir oturum güncellemesi var. Ayrıntılar için paneli aç.':item.body,tag:`bibilen-${task.workspaceId??"legacy"}-${task.sessionId??task.id}`});
    const expired=[];let delivered=0,failed=0;
    await Promise.all(this.subscriptions.map(async subscription=>{try{await this.deliver(subscription,payload,{TTL:3600,timeout:10000});delivered++;}catch(error){failed++;if([404,410].includes(error?.statusCode))expired.push(subscription.endpoint);}}));
    if(expired.length){this.subscriptions=this.subscriptions.filter(s=>!expired.includes(s.endpoint));secureWrite(this.subscriptionPath,this.subscriptions);}
    this.lastDelivery={at,delivered,failed};this.save();
  }
}
