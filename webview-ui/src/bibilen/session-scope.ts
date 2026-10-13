import type {CatalogSession} from './types.js';
export function scopedSessions(items:CatalogSession[],scope:string,localId:string|null){return items.filter(s=>scope==='all'||(scope==='current'?!!localId&&s.workspaceId===localId:s.projectName===scope));}
