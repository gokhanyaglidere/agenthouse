import type {UsageState,UsageWindow} from './IntegrationsPanel.js';
export function invalidateUsage(previous:UsageState|null,message:string):UsageState{return {...previous,provider:previous?.provider??'Claude',status:'stale',fiveHour:null,weekly:null,message};}
export function visibleUsageWindow(usage:UsageState|null,window:UsageWindow|null|undefined,now:number):UsageWindow|null {
 if(usage?.status!=='ready'||!Number.isFinite(usage.capturedAt)||now-(usage.capturedAt??0)>90000||!window||window.expired||window.resetsAt*1000<=now)return null;
 return window;
}
export async function refreshUsage(fetcher:()=>Promise<UsageState>,publish:(value:UsageState)=>void,previous:UsageState|null){
 try{const value=await fetcher();publish(value);return true;}catch{publish(invalidateUsage(previous,'Kota bağlantısı doğrulanamadı; eski yüzdeler gösterilmiyor.'));return false;}
}
