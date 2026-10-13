export function terminalScrollMode(type:string,baseY:number,direction:number){return direction<0&&(type==='alternate'||baseY===0)?'history':'terminal';}
