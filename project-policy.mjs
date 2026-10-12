import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
export class ProjectPolicy{
 constructor(path){this.path=path;try{this.value=JSON.parse(readFileSync(path,'utf8'));if(typeof this.value.allowNewWork!=='boolean')throw Error('invalid');}catch(e){this.value={allowNewWork:e.code==='ENOENT',updatedAt:null};}}
 state(){return {...this.value};}
 update(input){if(typeof input?.allowNewWork!=='boolean')throw Error('Yeni iş izni geçersiz.');const value={allowNewWork:input.allowNewWork,updatedAt:Date.now()};mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(this.path+'.tmp',this.path);this.value=value;return this.state();}
 assertNewWork(){if(!this.value.allowNewWork)throw Error('Bu projede yeni iş başlatma kapalı. Yönetim merkezinden açabilirsin.');}
}
