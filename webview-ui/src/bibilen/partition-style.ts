// Shared world-pixel dimensions for static glazing and animated door leaves.
export const PARTITION={rise:18,depth:14,doorWidth:48,frame:2,paneWidth:32} as const;
export function doorGeometry(x:number,y:number){return {x,y:y-PARTITION.rise,width:PARTITION.doorWidth,height:PARTITION.rise+PARTITION.depth};}
