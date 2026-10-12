import type {CapabilityInventory} from './api.js';
// Single in-flight request, explicit scope check and no fabricated empty state
// on network failure. The page reloads when changing projects.
export class CapabilityRefresh {
 private pending=false;private closed=false;
 private fetcher:()=>Promise<CapabilityInventory>;private scope:string|null;private publish:(value:CapabilityInventory)=>void;private fail:()=>void;
 constructor(fetcher:()=>Promise<CapabilityInventory>,scope:string|null,publish:(value:CapabilityInventory)=>void,fail:()=>void){this.fetcher=fetcher;this.scope=scope;this.publish=publish;this.fail=fail;}
 async refresh(){if(this.pending||this.closed)return;this.pending=true;try{const value=await this.fetcher();if(this.closed)return;if(this.scope&&value.workspaceId!==this.scope)throw Error('Foreign workspace');this.publish(value);}catch{if(!this.closed)this.fail();}finally{this.pending=false;}}
 close(){this.closed=true;}
}
