import {spawn} from 'node:child_process';
// Bound the launcher/monitor client, never a detached Claude background job.
export function runCli(command,args,options={}){
 const {timeoutMs=(args[0]==='--bg'?30000:8000),maxOutputBytes=2*1024*1024,...spawnOptions}=options;
 return new Promise(resolve=>{
  let stdout='',stderr='',bytes=0,finished=false,timer,killTimer;
  const child=spawn(command,args,{...spawnOptions,stdio:['ignore','pipe','pipe']});
  const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);resolve({stdout,stderr,...result});};
  const stop=reason=>{if(finished)return;try{child.kill('SIGTERM');}catch{}killTimer=setTimeout(()=>{try{child.kill('SIGKILL');}catch{}},250);killTimer.unref();finish({code:-1,stderr:reason,...(reason.includes('süre')?{timedOut:true}:{outputLimited:true})});};
  const collect=(chunk,which)=>{if(finished)return;bytes+=chunk.length;if(bytes>maxOutputBytes){stop('CLI çıktısı güvenli boyut sınırını aştı.');return;}if(which==='out')stdout+=chunk;else stderr+=chunk;};
  child.stdout.on('data',d=>collect(d,'out'));child.stderr.on('data',d=>collect(d,'err'));
  child.on('error',e=>finish({code:-1,stderr:e.message}));child.on('close',code=>{clearTimeout(killTimer);finish({code:code??-1});});
  timer=setTimeout(()=>stop('CLI çağrısının süre sınırı doldu; durum doğrulanamadı.'),timeoutMs);
 });
}
