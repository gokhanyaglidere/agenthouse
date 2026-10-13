import type {CatalogSession} from './types.js';
export const MAX_SESSION_PANES=4;
export function sessionPaneUrl(session:Pick<CatalogSession,'id'|'workspaceId'>){if(!session.workspaceId)throw Error('Önce projeyi panele ekle.');const params=new URLSearchParams({sessionPane:'1',session:session.id,workspaceId:session.workspaceId});return '/?'+params;}
export function selectSessionPane(slots:Array<string|null>,index:number,key:string|null){if(index<0||index>=slots.length||index>=MAX_SESSION_PANES||slots.length>MAX_SESSION_PANES)throw Error('Geçersiz bölme.');if(key&&slots.some((s,i)=>s===key&&i!==index))throw Error('Bu oturum zaten başka bölmede açık.');return slots.map((s,i)=>i===index?key:s);}

export function restoreSessionPanes(raw:string|null):Array<string|null>{try{const value=JSON.parse(raw??'null');if(!Array.isArray(value)||value.length<2||value.length>MAX_SESSION_PANES||value.some(k=>k!==null&&(typeof k!=='string'||k.length>200))||new Set(value.filter(Boolean)).size!==value.filter(Boolean).length)throw Error();return value;}catch{return [null,null];}}

export function paneSessionChange(data:unknown,workspaceId:string|null){const value=data as {type?:string;id?:string;title?:string;workspaceId?:string}|null;if(!value||value.type!=='agent-house-session-change'||value.workspaceId!==workspaceId||typeof value.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)||typeof value.title!=='string'||value.title.length>200)return null;return {id:value.id,title:value.title,catalogKey:workspaceId+':'+value.id};}
