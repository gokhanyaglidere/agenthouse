export function terminalScrollMode(type:string){return type==='alternate'?'cli':'terminal';}
export function liveScrollKey(amount:number){return amount<0?'\x1b[5~':'\x1b[6~';}
