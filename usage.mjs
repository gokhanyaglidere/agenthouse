import {readFileSync,writeFileSync,mkdirSync,renameSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {homedir} from 'node:os';
export const usagePath=join(homedir(),'.pixel-agents','bibilen-usage.json');
const windowValue=v=>v&&typeof v.used_percentage==='number'&&Number.isFinite(v.used_percentage)&&v.used_percentage>=0&&v.used_percentage<=100&&Number.isFinite(v.resets_at)&&v.resets_at>0?{usedPercent:v.used_percentage,remainingPercent:100-v.used_percentage,resetsAt:v.resets_at}:null;
export function recordUsage(input,path=usagePath,now=Date.now()){
 const model=typeof input.model?.display_name==='string'?input.model.display_name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,80):'Claude';
 const snapshot={provider:'Claude',source:'Claude Code statusLine',capturedAt:now,model,fiveHour:windowValue(input.rate_limits?.five_hour),weekly:windowValue(input.rate_limits?.seven_day)};
 // Do not store prompts, transcripts, tokens, workspace paths or credentials.
 mkdirSync(dirname(path),{recursive:true});const tmp=path+'.'+process.pid+'.tmp';writeFileSync(tmp,JSON.stringify(snapshot),{mode:0o600});renameSync(tmp,path);chmodSync(path,0o600);return snapshot;
}
export function usageState(path=usagePath,now=Date.now()){
 let value;try{value=JSON.parse(readFileSync(path,'utf8'));}catch{return {provider:'Claude',status:'waiting',fiveHour:null,weekly:null,message:'İlk Claude yanıtından sonra kullanım verisi gelir. API anahtarıyla çalışan hesaplarda abonelik pencereleri sunulmayabilir.'};}
 const normalize=v=>v&&Number.isFinite(v.usedPercent)&&v.usedPercent>=0&&v.usedPercent<=100&&Number.isFinite(v.resetsAt)?{usedPercent:v.usedPercent,remainingPercent:100-v.usedPercent,resetsAt:v.resetsAt,expired:v.resetsAt*1000<=now}:null;
 const fiveHour=normalize(value.fiveHour),weekly=normalize(value.weekly),stale=!Number.isFinite(value.capturedAt)||now-value.capturedAt>15*60*1000;
 return {provider:'Claude',source:'Claude Code statusLine',model:typeof value.model==='string'?value.model.slice(0,80):'Claude',capturedAt:value.capturedAt,fiveHour,weekly,status:stale?'stale':fiveHour||weekly?'ready':'unavailable',message:'Claude hesabının ortak kullanım pencereleridir; model başına ayrı kota değildir. Son CLI görüntüsü gösterilir, Yenile düğmesi sağlayıcı kotasını yeniden sorgulamaz.'};
}
