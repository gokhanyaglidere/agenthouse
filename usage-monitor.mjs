import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {usageState} from './usage.mjs';
const run=promisify(execFile);
async function credential(){
 let raw;if(process.platform==='darwin'){try{raw=(await run('/usr/bin/security',['find-generic-password','-s','Claude Code-credentials','-w'],{timeout:5000,maxBuffer:65536})).stdout;}catch{}}
 if(!raw){try{raw=await readFile(join(homedir(),'.claude','.credentials.json'),'utf8');}catch{return null;}}
 try{return JSON.parse(raw).claudeAiOauth?.accessToken??null;}catch{return null;}
}
const normalize=(v,now)=>{const resetsAt=Date.parse(v?.resets_at)/1000;return Number.isFinite(v?.utilization)&&v.utilization>=0&&v.utilization<=100&&Number.isFinite(resetsAt)?{usedPercent:v.utilization,remainingPercent:100-v.utilization,resetsAt,expired:resetsAt*1000<=now}:null;};
export class UsageMonitor{
 constructor({fetchImpl=fetch,getToken=credential,now=Date.now}={}){this.fetch=fetchImpl;this.getToken=getToken;this.now=now;this.next=0;this.value=null;this.flight=null;}
 async state(){if(this.flight)return this.flight;if(this.now()<this.next&&this.value)return {...this.value,fiveHour:this.value.fiveHour?{...this.value.fiveHour,expired:this.value.fiveHour.resetsAt*1000<=this.now()}:null,weekly:this.value.weekly?{...this.value.weekly,expired:this.value.weekly.resetsAt*1000<=this.now()}:null};this.flight=this.refresh().finally(()=>{this.flight=null;});return this.flight;}
 async refresh(){this.next=this.now()+60000;try{const token=await this.getToken();if(!token)throw new Error('authentication_required');const response=await this.fetch('https://api.anthropic.com/api/oauth/usage',{headers:{Authorization:`Bearer ${token}`,'anthropic-beta':'oauth-2025-04-20'},redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok){if(response.status===429)this.next=this.now()+Math.max(60000,Math.min(3600000,(Number(response.headers.get('retry-after'))||300)*1000));throw new Error(response.status===401||response.status===403?'authentication_required':'unavailable');}const data=await response.json();const fiveHour=normalize(data.five_hour,this.now()),weekly=normalize(data.seven_day,this.now());if(!fiveHour&&!weekly)throw new Error('unavailable');this.value={provider:'Claude',source:'Claude hesap sorgusu',status:'ready',capturedAt:this.now(),fiveHour,weekly,message:'Claude hesabının ortak limitleri. CLI etkinliğinden bağımsız olarak en fazla dakikada bir sorgulanır.'};}catch(error){const old=this.value??usageState();this.value={...old,status:'stale',fiveHour:null,weekly:null,message:error.message==='authentication_required'?'Hesap kotası doğrulanamadı. Claude oturum açma bilgisi veya kullanım erişimi gerekiyor; eski yüzdeler gösterilmiyor.':'Hesap kotasına ulaşılamadı. Eski yüzdeler güncelmiş gibi gösterilmiyor; sorgu yeniden denenecek.'};}return this.value;}
}
