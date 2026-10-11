import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {claudeFailure} from './task-manager.mjs';

export function executionResult(stdout, exitCode) {
  const failure=claudeFailure(stdout);
  if(failure)return {status:'blocked',message:/organizasyon/.test(failure)?failure:'Claude görev erişimi bir hatayla sonlandı. Gökhan terminalinden hesap erişimini kontrol et.'};
  try {
    const result=JSON.parse(stdout.trim().split('\n').at(-1));
    if(exitCode===0&&result.type==='result'&&result.is_error!==true&&String(result.result).trim()==='BIBILEN_OK')
      return {status:'ready',message:'Claude Code bağlantı denemesi başarılı.'};
  }catch{/* Never return raw command output, which can contain account information. */}
  return {status:'unavailable',message:'Claude Code bağlantısı doğrulanamadı. Gökhan terminalinden hesap erişimini kontrol et.'};
}

export class ExecutionHealth {
  constructor(claudePath,storePath){
    this.claudePath=claudePath;this.storePath=storePath;this.pending=null;
    this.state={status:'unchecked',message:'Claude Code görev erişimi henüz kontrol edilmedi.',checkedAt:null};
    try{const saved=JSON.parse(readFileSync(storePath,'utf8'));if(['ready','blocked','unavailable'].includes(saved.status)&&Number.isFinite(saved.checkedAt))this.state=saved;}catch{}
  }
  check(){
    if(this.pending)return this.pending;
    this.pending=this.probe().finally(()=>{this.pending=null;});return this.pending;
  }
  async probe(){
    const result=await new Promise(resolve=>{
      const child=spawn(this.claudePath,['-p','--tools','','--no-session-persistence','--output-format','json','Yalnızca BIBILEN_OK yaz. Araç kullanma.'],{cwd:'/tmp',stdio:['ignore','pipe','ignore']});
      let output='';let settled=false;
      const finish=(code)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(executionResult(output,code));};
      const timer=setTimeout(()=>{child.kill('SIGTERM');finish(-1);},30000);
      child.stdout.on('data',chunk=>{output=(output+chunk).slice(-100000);});
      child.on('error',()=>finish(-1));child.on('close',finish);
    });
    this.state={...result,checkedAt:Date.now()};
    mkdirSync(dirname(this.storePath),{recursive:true});
    const temp=this.storePath+'.tmp';writeFileSync(temp,JSON.stringify(this.state)+'\n',{mode:0o600});renameSync(temp,this.storePath);
    return this.state;
  }
}
