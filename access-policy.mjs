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
 identity(headers){
  const value=headers['tailscale-user-login'];
  if(value!==undefined)return typeof value==='string'&&value.length>=3&&value.length<=200&&!/[\s\x00-\x1f\x7f]/.test(value)?value.toLowerCase():null;
  // A proxied request must not become the trusted local owner by forging Host.
  if(headers['x-forwarded-for']||headers['x-forwarded-host']||headers['x-forwarded-proto'])return null;
  const host=String(headers.host??'').toLowerCase();return [`localhost:${Number(process.env.BIBILEN_GATEWAY_PORT??3100)}`,`127.0.0.1:${Number(process.env.BIBILEN_GATEWAY_PORT??3100)}`].includes(host)?'local-owner':null;
 }
 role(headers){const identity=this.identity(headers);return identity==='local-owner'&&headers['tailscale-user-login']===undefined||identity&&[...this.owners].some(owner=>typeof owner==='string'&&owner.toLowerCase()===identity)?'operator':'viewer';}
 canWrite(headers){return this.role(headers)==='operator';}
}
