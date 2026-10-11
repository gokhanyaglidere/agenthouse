import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {realpathSync,existsSync} from 'node:fs';import {resolve,relative,isAbsolute} from 'node:path';
const run=promisify(execFile);
export async function sessionChanges(cwd,trace){
 const root=realpathSync(cwd);const paths=[...new Set(trace.files.filter(f=>f.edited||['Edit','Write','NotebookEdit'].includes(f.operation)).map(f=>f.path))].slice(0,30);const files=[];
 for(const path of paths){if(typeof path!=='string'||path.startsWith('-')||isAbsolute(path)||path.split(/[\\/]/).includes('..'))continue;const absolute=resolve(root,path);try{if(relative(root,realpathSync(absolute)).startsWith('..'))continue;}catch{/* Deleted tracked files can still have a diff. */}
  let diff='',limited=false;try{const result=await run('git',['--no-pager','diff','--no-ext-diff','--no-textconv','HEAD','--',path],{cwd:root,maxBuffer:512*1024,timeout:5000});diff=result.stdout;limited=diff.length>50000;diff=diff.slice(0,50000);}catch{files.push({path,diff:'',unavailable:true});continue;}
  if(!diff){try{const tracked=await run('git',['ls-files','--error-unmatch','--',path],{cwd:root,timeout:5000});if(!tracked.stdout)throw Error();}catch{files.push({path,diff:'',untracked:existsSync(absolute),missing:!existsSync(absolute)});continue;}}
  files.push({path,diff,limited});
 }
 return {files,scope:'workspace',note:'Bu oturumun düzenleme aracı kullandığı dosyaların mevcut çalışma alanındaki farklarıdır. Aynı dosyada başka oturumların değişiklikleri de bulunabilir.',limited:paths.length>=30};
}
