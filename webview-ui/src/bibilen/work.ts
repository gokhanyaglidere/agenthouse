import {ROSTER} from './roster.js';import type {WorkMember,WorkTrace} from './types.js';
export const workStatusLabels={assigned:'Görevlendirildi',running:'Çalışıyor',waiting:'Yanıt bekliyor',reported:'Yanıt üretti',completed:'Sonuç döndü',failed:'Hata',stopped:'Durduruldu',unknown:'Durum doğrulanmadı'};
export function memberName(m:WorkMember){return ROSTER.find(r=>r.key===m.role)?.name??(m.role==='Explore'?'Araştırmacı':m.role==='Plan'?'Planlayıcı':m.label);}
export function workColor(id:string){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))|0;return ['#8dd6b2','#a5c4ff','#f6ce85','#e4a6cb','#bdb5f6','#8ed6de'][(hash>>>0)%6];}
export function workBadge(id:string){return `İş ${id.slice(0,4).toLocaleUpperCase('tr')}`;}
export function actorName(trace:WorkTrace,id:string|null){if(!id)return 'Ekip';const member=trace.members.find(m=>m.id===id||m.agentId===id||m.label===id);return member?memberName(member):id;}
