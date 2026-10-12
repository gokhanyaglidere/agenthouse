// Trusted application bootstrap is not an ordinary agent-editable project file.
import {fileURLToPath} from 'node:url';
import {dirname,join,relative} from 'node:path';
import {readdirSync} from 'node:fs';
export const runtimeRoot=dirname(fileURLToPath(import.meta.url));
const entries=new Set(['start.sh','package.json','package-lock.json']);
export function protectedRuntimeWrite(path){
 const rel=relative(runtimeRoot,path);
 return !rel.startsWith('../')&&(rel==='node_modules'||rel.startsWith('node_modules/')||!rel.includes('/')&&(rel.endsWith('.mjs')||entries.has(rel)));
}
export function protectedRuntimePaths(){return [...readdirSync(runtimeRoot).filter(n=>n.endsWith('.mjs')||entries.has(n)).map(n=>join(runtimeRoot,n)),join(runtimeRoot,'*.mjs'),join(runtimeRoot,'node_modules')];}

export const RUNTIME_GUARD_REVISION=2;
