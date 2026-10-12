import type {CapabilityInventory} from './api.js';
export function validCapabilityInventory(value:CapabilityInventory):boolean{return !!value&&typeof value.revision==='string'&&value.revision.length>0&&Number.isFinite(value.scannedAt)&&Array.isArray(value.agents)&&value.agents.length<=200&&value.agents.every(a=>a&&typeof a.key==='string'&&a.key.length>0&&a.key.length<=256&&!a.key.startsWith('-')&&!/[:\x00-\x1f\x7f]/.test(a.key)&&typeof a.name==='string'&&typeof a.description==='string'&&Array.isArray(a.skills)&&a.skills.every(s=>typeof s==='string')&&(a.skillLinks===undefined||Array.isArray(a.skillLinks)&&a.skillLinks.every(s=>s&&typeof s.name==='string'&&typeof s.available==='boolean'&&(s.reason===undefined||s.reason===null||typeof s.reason==='string'))))&&new Set(value.agents.map(a=>a.key)).size===value.agents.length&&Array.isArray(value.skills)&&value.skills.every(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&typeof s.source==='string'&&typeof s.scope==='string'&&typeof s.native==='boolean')&&Array.isArray(value.diagnostics)&&value.diagnostics.every(d=>d&&typeof d.path==='string'&&typeof d.message==='string')&&Array.isArray(value.instructions)&&value.instructions.every(i=>typeof i==='string');}
// Single in-flight request, explicit scope check and no fabricated empty state
// on network failure. The page reloads when changing projects.
export class CapabilityRefresh {
 private pending=false;private closed=false;
 private fetcher:()=>Promise<CapabilityInventory>;private scope:string|null;private publish:(value:CapabilityInventory)=>void;private fail:()=>void;
 constructor(fetcher:()=>Promise<CapabilityInventory>,scope:string|null,publish:(value:CapabilityInventory)=>void,fail:()=>void){this.fetcher=fetcher;this.scope=scope;this.publish=publish;this.fail=fail;}
 async refresh(){if(this.pending||this.closed)return;this.pending=true;try{const value=await this.fetcher();if(this.closed)return;if(!validCapabilityInventory(value))throw Error('Invalid inventory');if(this.scope&&value.workspaceId!==this.scope)throw Error('Foreign workspace');this.publish(value);}catch{if(!this.closed)this.fail();}finally{this.pending=false;}}
 close(){this.closed=true;}
}
