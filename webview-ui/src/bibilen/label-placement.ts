export interface LabelBox{x:number;y:number;width:number;height:number}
export const overlaps=(a:LabelBox,b:LabelBox)=>a.x<b.x+b.width+3&&a.x+a.width+3>b.x&&a.y<b.y+b.height+3&&a.y+a.height+3>b.y;
export function placeLabel(anchorX:number,anchorY:number,width:number,height:number,viewport:{width:number;height:number},occupied:LabelBox[]):LabelBox{
 const candidates=[[0,0],[-width-6,0],[width+6,0],[0,-height-8],[0,height+8],[-width-6,-height-8],[width+6,-height-8],[0,-2*(height+8)],[0,2*(height+8)]];
 const boxes=candidates.map(([dx,dy])=>({x:Math.max(2,Math.min(viewport.width-width-2,anchorX-width/2+dx)),y:Math.max(2,Math.min(viewport.height-height-2,anchorY-height+dy)),width,height}));
 return boxes.find(box=>!occupied.some(other=>overlaps(box,other)))??boxes[0];
}
