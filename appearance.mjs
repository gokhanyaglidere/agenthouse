import {readFileSync,writeFileSync,mkdirSync,renameSync,chmodSync} from 'node:fs';import {dirname,join} from 'node:path';import {homedir} from 'node:os';
export class Appearance{
 constructor({roles,path=join(homedir(),'.pixel-agents','bibilen-character-looks.json')}){this.roles=roles;this.path=path;try{this.value=JSON.parse(readFileSync(path,'utf8'));}catch{this.value={style:'cozy',looks:{},revision:0};}}
 state(){return this.value;}
 update(input){const next={...this.value,looks:{...this.value.looks}};if('style'in input){if(!['cozy','original'].includes(input.style))throw new Error('Karakter stili geçersiz.');next.style=input.style;}if('role'in input){if(!this.roles.has(input.role)||!Number.isInteger(input.palette)||input.palette<0||input.palette>=48)throw new Error('Karakter seçimi geçersiz.');next.looks[input.role]=input.palette;}next.revision++;mkdirSync(dirname(this.path),{recursive:true});const tmp=this.path+'.tmp';writeFileSync(tmp,JSON.stringify(next),{mode:0o600});renameSync(tmp,this.path);chmodSync(this.path,0o600);this.value=next;return this.state();}
}
