import {createHash} from 'node:crypto';
export const ALARM_WINDOW=15*60*1000;
// Keep numbers, severity and resource names: different incidents must not merge.
export function alarmFingerprint(item){return createHash('sha256').update(String(item.channel??item.channelName??'')+'\n'+String(item.text??'').trim().replace(/\s+/g,' ')).digest('hex').slice(0,24);}
export function groupAlarms(items=[]){const buckets=new Map(),groups=[];for(const item of [...items].filter(x=>Number.isFinite(x.at)).sort((a,b)=>a.at-b.at)){const fingerprint=alarmFingerprint(item);let group=buckets.get(fingerprint);if(!group||item.at-group.firstAt>=ALARM_WINDOW){group={id:item.id,fingerprint,channel:item.channel,channelName:item.channelName,text:item.text,url:item.url,firstAt:item.at,lastAt:item.at,count:0,messageIds:[]};buckets.set(fingerprint,group);groups.push(group);}group.count++;group.lastAt=item.at;group.messageIds.push(item.id);}return groups.sort((a,b)=>b.lastAt-a.lastAt);}
