import {constants,openSync,closeSync,fstatSync,readSync,lstatSync,readdirSync,existsSync,mkdirSync,writeFileSync,linkSync,unlinkSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';import {randomUUID} from 'node:crypto';
const MAX=64*1024*1024;
function snapshot(path,budget){
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{
  const before=fstatSync(fd);if(!before.isFile()||before.size>budget)throw Error('Konuşma geçmişi güvenli aktarım sınırının dışında.');
  const bytes=Buffer.alloc(before.size);let used=0;while(used<bytes.length){const n=readSync(fd,bytes,used,bytes.length-used,used);if(!n)break;used+=n;}
  const after=fstatSync(fd);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||used!==before.size)throw Error('Konuşma kaydı aktarım sırasında değişti. Tekrar dene.');return bytes;
 }finally{closeSync(fd);}
}
export function importSessionHistory({source,root,id}){
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw Error('Geçersiz konuşma kimliği.');
 const main=snapshot(source,MAX),files=[];let budget=MAX-main.length;
 const children=join(dirname(source),id,'subagents');
 if(existsSync(children)){
  const stat=lstatSync(children),parent=lstatSync(dirname(children));if(!stat.isDirectory()||stat.isSymbolicLink()||parent.isSymbolicLink())throw Error('Alt ajan geçmişi doğrulanamadı.');
  for(const name of readdirSync(children)){
   if(!/^agent-[A-Za-z0-9_-]+\.(?:jsonl|meta\.json)$/.test(name))continue;
   if(files.length>=256||lstatSync(join(children,name)).isSymbolicLink())throw Error('Alt ajan geçmişi güvenli aktarım sınırının dışında.');
   const bytes=snapshot(join(children,name),budget);budget-=bytes.length;files.push([name,bytes]);
  }
 }
 mkdirSync(root,{recursive:true,mode:0o700});const tmp=join(root,'.handoff-'+randomUUID()),aux=join(root,id);let ownAux=false;
 try{
  writeFileSync(tmp,main,{mode:0o600,flag:'wx'});
  if(files.length){mkdirSync(aux,{mode:0o700});ownAux=true;mkdirSync(join(aux,'subagents'),{mode:0o700});for(const [name,bytes]of files)writeFileSync(join(aux,'subagents',name),bytes,{mode:0o600,flag:'wx'});}
  linkSync(tmp,join(root,id+'.jsonl')); // No replacement of existing WSL histories.
 }catch(error){if(ownAux)rmSync(aux,{recursive:true,force:true});throw error;}
 finally{try{unlinkSync(tmp);}catch{}}
}
