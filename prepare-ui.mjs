import {syncOfficePresence} from './office-presence-sync.mjs';
import { readFileSync,writeFileSync,existsSync,cpSync,mkdirSync,chmodSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const dest=resolve(root,'node_modules/pixel-agents/dist/webview');
const build=resolve(root,'build/webview');
if(!existsSync(resolve(build,'index.html')))throw Error('Run npm run build --prefix tools/pixel-office/webview-ui first');
const backup=resolve(root,'build/upstream-webview');
if(!existsSync(backup)){mkdirSync(backup,{recursive:true});cpSync(resolve(dest,'index.html'),resolve(backup,'index.html'));}
cpSync(build,dest,{recursive:true});
const cli=resolve(root,'node_modules/pixel-agents/dist/cli.js');
let text=readFileSync(cli,'utf8');
const original='case"Task":case"Agent":{let o=typeof n.description=="string"?n.description:"";return o?`Subtask: ${o.length>40?o.slice(0,40)+"\\u2026":o}`:"Running subtask"}';
const replacement='case"Task":case"Agent":{let o=typeof n.description=="string"?n.description:"";let bibilenRole=typeof n.subagent_type=="string"?`[${n.subagent_type}] `:"";return o||bibilenRole?`Subtask: ${bibilenRole}${o.length>40?o.slice(0,40)+"\\u2026":o}`:"Running subtask"}';
if(!text.includes('let bibilenRole=')){
 if(text.split(original).length!==2)throw Error('Pixel Agents version mismatch; role patch stopped');
 text=text.replace(original,replacement);writeFileSync(cli,text);
}
const identityPatches=[
 ['type:"agentCreated",id:l,folderName:f.folderName','type:"agentCreated",id:l,sessionId:f.sessionId,folderName:f.folderName'],
 ['p[g]={palette:S.palette,hueShift:S.hueShift,seatId:T?.seatId}', 'p[g]={sessionId:S.sessionId,palette:S.palette,hueShift:S.hueShift,seatId:T?.seatId}'],
];
for(const [before,after] of identityPatches){
 if(text.includes(after))continue;
 if(text.split(before).length!==2)throw Error('Pixel Agents version mismatch; session identity patch stopped');
 text=text.replace(before,after);
}
const presenceMarker='case"webviewReady":Ml(e,n);break;';
const legacyPresencePatch='case"bibilenSyncSessions":{if(!o||!Array.isArray(t.sessions))break;let live=new Set;for(let entry of t.sessions.slice(0,50)){if(typeof entry.sessionId!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.sessionId)||typeof entry.transcriptPath!=="string"||!entry.transcriptPath.endsWith(entry.sessionId+".jsonl")||typeof entry.cwd!=="string")continue;live.add(entry.sessionId);o.hookEventHandler.lifecycleCallbacks.onExternalSessionDetected?.(entry.sessionId,entry.transcriptPath,entry.cwd);}for(let sid of o.bibilenInventorySessions??[]){if(live.has(sid))continue;for(let [id,agent]of s)if(agent.isExternal&&agent.sessionId===sid)o.removeAgent(id);}o.bibilenInventorySessions=live;break;}';
const presencePatch='case"bibilenSyncSessions":{('+syncOfficePresence.toString()+')(o,s,t);break;}';
if(text.includes(legacyPresencePatch))text=text.replace(legacyPresencePatch,presencePatch);
else if(!text.includes('function syncOfficePresence(')){
 if(text.split(presenceMarker).length!==2)throw Error('Pixel Agents version mismatch; verified session recovery patch stopped');
 text=text.replace(presenceMarker,presencePatch+presenceMarker);
}
const workspacePatches=[
 ['this.readAndPruneRegistry().find(f=>f.servesSpa===s)','this.readAndPruneRegistry().find(f=>f.servesSpa===s&&!process.env.BIBILEN_NATIVE_SCOPE)'],
 ['this.stateFilePath=ht.join(cr.homedir(),Ae,`${e.namespace}-state.json`)','this.stateFilePath=process.env.BIBILEN_NATIVE_STATE_PATH??ht.join(cr.homedir(),Ae,`${e.namespace}-state.json`)'],
 ['function Dr(){return bt.join(Hr.homedir(),Ae,qn)}','function Dr(){return process.env.BIBILEN_NATIVE_LAYOUT_PATH??bt.join(Hr.homedir(),Ae,qn)}'],
 ['function rr(){return dt.join(sr.homedir(),Ae,zn)}','function rr(){return process.env.BIBILEN_NATIVE_CONFIG_PATH??dt.join(sr.homedir(),Ae,zn)}'],
 ['onExternalSessionDetected:(s,o,r)=>{let i=o?je.dirname(o):r;', 'onExternalSessionDetected:(s,o,r)=>{if(typeof r!=="string")return;try{if(at.realpathSync(r)!==at.realpathSync(process.cwd()))return;}catch{return;}let i=o?je.dirname(o):r;'],
];
for(const [before,after]of workspacePatches){
 if(text.includes(after))continue;
 if(text.split(before).length!==2)throw Error('Pixel Agents version mismatch; workspace isolation patch stopped');
 text=text.replace(before,after);
}
writeFileSync(cli,text);
console.log('BiBilen UI, explicit role labels and Claude session identities prepared.');

const helper=resolve(root,`node_modules/node-pty/prebuilds/${process.platform}-${process.arch}/spawn-helper`);
if(existsSync(helper))chmodSync(helper,0o755);
cpSync(resolve(root,"default-layout.json"),resolve(root,"node_modules/pixel-agents/dist/assets/default-layout-1.json"));
