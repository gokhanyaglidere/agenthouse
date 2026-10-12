import type {OfficeLayout} from '../office/types.js';
// Geometry/resource changes need reconciliation even when files are unchanged.
export function teamSyncKey(revision:string,activeRoles:string[],layout:OfficeLayout,assetsReady:boolean){return JSON.stringify([revision,[...new Set(activeRoles)].sort(),assetsReady,layout.cols,layout.rows,layout.tiles,layout.furniture.map(f=>[f.uid,f.type,f.col,f.row])]);}
