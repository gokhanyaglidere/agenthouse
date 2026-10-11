import {readFileSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';import {execFileSync} from 'node:child_process';
export class AccessPolicy{
 constructor({owners,path=join(homedir(),'.pixel-agents','bibilen-access.json')}={}){
  if(owners){this.owners=new Set(owners);return;}
  try{this.owners=new Set(JSON.parse(readFileSync(path,'utf8')).owners);}catch{
   this.owners=new Set();try{const state=JSON.parse(execFileSync('/usr/local/bin/tailscale',['status','--json'],{encoding:'utf8',timeout:5000}));const login=state.User?.[state.Self?.UserID]?.LoginName;if(login)this.owners.add(login);}catch{}
   if(this.owners.size){mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,JSON.stringify({owners:[...this.owners]}),{mode:0o600});chmodSync(path,0o600);}
  }
 }
 role(headers){const host=String(headers.host??'').toLowerCase();if([`localhost:${Number(process.env.BIBILEN_GATEWAY_PORT??3100)}`,`127.0.0.1:${Number(process.env.BIBILEN_GATEWAY_PORT??3100)}`].includes(host))return 'operator';const login=headers['tailscale-user-login'];return typeof login==='string'&&this.owners.has(login)?'operator':'viewer';}
 canWrite(headers){return this.role(headers)==='operator';}
}
