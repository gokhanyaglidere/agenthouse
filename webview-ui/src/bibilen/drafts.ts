import {useState} from 'react';
import {workspaceStorage} from './workspace.js';
const TTL=24*60*60*1000;
export function readDraft(storage:Pick<Storage,'getItem'|'removeItem'>,key:string,now=Date.now()){
 try{const raw=storage.getItem(key);if(!raw)return '';const value=JSON.parse(raw);if(typeof value.text!=='string'||typeof value.at!=='number'||now-value.at>TTL){storage.removeItem(key);return '';}return value.text.slice(0,20000);}catch{return '';}
}
export function writeDraft(storage:Pick<Storage,'setItem'|'removeItem'>,key:string,text:string){try{if(text)storage.setItem(key,JSON.stringify({text:text.slice(0,20000),at:Date.now()}));else storage.removeItem(key);}catch{/* Private browsing or exhausted storage must not block writing. */}}
export function useDraft(identity:string){
 const key=workspaceStorage('agent-house-draft:'+identity);
 const load=()=>{try{return readDraft(sessionStorage,key);}catch{return '';}};
 const [state,setState]=useState(()=>({key,text:load()}));
 const text=state.key===key?state.text:load();
 const set=(value:string|((old:string)=>string))=>{const next=(typeof value==='function'?value(text):value).slice(0,20000);try{writeDraft(sessionStorage,key,next);}catch{}setState({key,text:next});};
 return [text,set] as const;
}
