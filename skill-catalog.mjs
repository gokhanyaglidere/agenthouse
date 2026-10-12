import {ProjectCapabilities,readDefinition} from './project-capabilities.mjs';
import {readdirSync,readFileSync,statSync,realpathSync} from 'node:fs';import {relative,join} from 'node:path';import {homedir} from 'node:os';
export class SkillCatalog{
 constructor(cwd,{personal=join(homedir(),'.claude','skills')}={}){this.capabilities=new ProjectCapabilities(cwd,{personal});this.roots=[{key:'project',name:'Proje',path:join(cwd,'.claude','skills')},{key:'cursor',name:'Proje talimatları',path:join(cwd,'.cursor','skills')},{key:'personal',name:'Kişisel',path:personal}];}
 file(root,folder){const base=realpathSync(root.path),path=realpathSync(join(base,folder,'SKILL.md'));if(relative(base,path).startsWith('..')||!statSync(path).isFile()||statSync(path).size>64000)throw Error('Skill dosyası güvenli kapsamın dışında veya çok büyük.');return path;}
 list(){const inventory=this.capabilities.scan();return {skills:inventory.skills,diagnostics:inventory.diagnostics,revision:inventory.revision};}
 read(id){const item=this.list().skills.find(s=>s.id===id);if(!item)throw Error('Bu projede skill bulunamadı.');const decoded=Buffer.from(id,'base64url').toString(),split=decoded.indexOf(':'),root=this.roots.find(r=>r.key===decoded.slice(0,split));const {body}=readDefinition(this.file(root,decoded.slice(split+1)),root.path);if(body.length>16000)throw Error('Skill talimatı taslak için çok uzun.');return {...item,body};}
}
