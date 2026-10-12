import {readFileSync,writeFileSync,mkdirSync,renameSync,lstatSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s);
export const observerLogin=value=>typeof value==='string'&&value.length>=3&&value.length<=200&&!/[\s\x00-\x1f\x7f]/.test(value)?value.toLowerCase():null;
const text=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
export class ObserverSharing {
 constructor(path,{now=()=>Date.now()}={}){this.path=path;this.now=now;this.error=null;}
 read(){
  try{const stat=lstatSync(this.path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw Error();const d=JSON.parse(readFileSync(this.path,'utf8'));
   if(d.version!==1||!Array.isArray(d.grants)||d.grants.length>200||!Array.isArray(d.items)||d.items.length>300||!Array.isArray(d.audit)||d.audit.length>250)throw Error();
   if(d.grants.some(g=>!uuid(g.id)||!uuid(g.projectId)||!observerLogin(g.login)||!text(g.name,80)||!Number.isSafeInteger(g.expiresAt)||!Number.isSafeInteger(g.createdAt)))throw Error();
   if(d.items.some(i=>!uuid(i.id)||!uuid(i.projectId)||!['task','session'].includes(i.kind)||!uuid(i.sourceId)||!uuid(i.workspaceId)||!text(i.title,100)||!text(i.summary,4000)||!Number.isSafeInteger(i.updatedAt)))throw Error();
   this.error=null;return d;
  }catch(e){if(e.code==='ENOENT'){this.error=null;return {version:1,grants:[],items:[],audit:[]};}this.error='Paylaşım kayıtları doğrulanamadı; izleyici erişimi kapalı.';return null;}
 }
 save(d){if(!this.read())throw Error(this.error);mkdirSync(dirname(this.path),{recursive:true,mode:0o700});writeFileSync(this.path+'.tmp',JSON.stringify(d),{mode:0o600});renameSync(this.path+'.tmp',this.path);}
 audit(d,actor,action,target,projectId){d.audit.unshift({id:randomUUID(),actor,action,target,projectId,at:this.now()});d.audit=d.audit.slice(0,250);}
 allowed(login,projectId){const d=this.read();return !!d&&!!observerLogin(login)&&d.grants.some(g=>g.login===observerLogin(login)&&g.projectId===projectId&&g.expiresAt>this.now());}
 state(projectId){const d=this.read();return {error:this.error,grants:d?.grants.filter(g=>g.projectId===projectId).map(g=>({...g,active:g.expiresAt>this.now()}))??[],items:d?.items.filter(i=>i.projectId===projectId)??[],audit:d?.audit.filter(e=>e.projectId===projectId).slice(0,30)??[]};}
 grant(projectId,input,actor){
  const d=this.read();if(!d)throw Error(this.error);const login=observerLogin(input?.login),days=input?.days;
  if(!uuid(projectId)||!login||!text(input?.name??'',80)||![7,30,90].includes(days))throw Error('Kimlik, ad veya erişim süresi geçersiz.');
  if(d.grants.length>=200&&!d.grants.some(g=>g.projectId===projectId&&g.login===login))throw Error('İzleyici sınırı dolu.');
  const old=d.grants.find(g=>g.projectId===projectId&&g.login===login);const g={id:old?.id??randomUUID(),projectId,login,name:input.name??'',createdAt:old?.createdAt??this.now(),expiresAt:this.now()+days*86400000};
  d.grants=d.grants.filter(g=>g.projectId!==projectId||g.login!==login);d.grants.push(g);this.audit(d,actor,'grant',g.id,projectId);this.save(d);return this.state(projectId);
 }
 revoke(projectId,id,actor){const d=this.read();if(!d)throw Error(this.error);if(!d.grants.some(g=>g.id===id&&g.projectId===projectId))throw Error('İzleyici bulunamadı.');d.grants=d.grants.filter(g=>g.id!==id);this.audit(d,actor,'revoke',id,projectId);this.save(d);return this.state(projectId);}
 publish(projectId,input,actor){
  const d=this.read();if(!d)throw Error(this.error);
  if(!uuid(projectId)||!['task','session'].includes(input?.kind)||!uuid(input.sourceId)||!uuid(input.workspaceId)||!text(input.title,100)||!input.title.trim()||!text(input.summary??'',4000))throw Error('Paylaşım başlığı veya özeti geçersiz.');
  const old=d.items.find(i=>i.projectId===projectId&&i.kind===input.kind&&i.sourceId===input.sourceId);if(!old&&d.items.length>=300)throw Error('Paylaşılan iş sınırı dolu.');
  const i={id:old?.id??randomUUID(),projectId,kind:input.kind,sourceId:input.sourceId,workspaceId:input.workspaceId,title:input.title.trim(),summary:input.summary??'',updatedAt:this.now()};
  d.items=d.items.filter(i=>i.id!==old?.id);d.items.push(i);this.audit(d,actor,'publish',i.id,projectId);this.save(d);return this.state(projectId);
 }
 unpublish(projectId,id,actor){const d=this.read();if(!d)throw Error(this.error);if(!d.items.some(i=>i.id===id&&i.projectId===projectId))throw Error('Paylaşım bulunamadı.');d.items=d.items.filter(i=>i.id!==id);this.audit(d,actor,'unpublish',id,projectId);this.save(d);return this.state(projectId);}
}
// Only owner-authored titles and result summaries cross the observer boundary.
export function observerItem(item,{task,session,trace,inventoryAvailable}){
 const allowed=new Set(['queued','starting','running','waiting','completed','failed','stopped']);
 const members=inventoryAvailable&&trace?.live&&!(item.kind==='task'&&['completed','failed','stopped'].includes(task?.status))?trace.members.filter(m=>['running','waiting'].includes(m.liveState)).map(m=>({role:m.role??null,state:m.liveState})):[];
 const status=item.kind==='task'?(task&&allowed.has(task.status)?task.status:'unknown'):!inventoryAvailable?'unknown':!session?'unknown':['history','new'].includes(session.status)?'closed':members.some(m=>m.state==='waiting')?'waiting':members.some(m=>m.state==='running')?'running':'connected';
 return {id:item.id,title:item.title,summary:item.summary,updatedAt:item.updatedAt,status,members};
}
