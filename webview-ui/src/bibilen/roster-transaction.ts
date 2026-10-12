import {ROSTER,reconcileRoster,type ProjectAgent} from './roster.js';
// Failed visual application must not publish an unverified roster. The caller
// marks a revision applied only after this function returns successfully.
export function applyRosterTransaction(agents:ProjectAgent[],activeRoles:string[],apply:()=>void){
 const previous=[...ROSTER];try{reconcileRoster(agents,activeRoles);apply();}catch(error){ROSTER.splice(0,ROSTER.length,...previous);throw error;}
}
