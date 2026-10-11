export function roomCamera(layout:{cols:number;rows:number},room:{left:number;right:number;top:number;bottom:number},canvas:{width:number;height:number}){
 const zoom=Math.max(.25,Math.min(canvas.width/((room.right-room.left+3)*16),canvas.height/((room.bottom-room.top+3)*16))*.95);
 const mapW=layout.cols*16*zoom,mapH=layout.rows*16*zoom;
 const centerX=Math.floor((canvas.width-mapW)/2),centerY=Math.floor((canvas.height-mapH)/2);
 const desiredX=canvas.width/2-(room.left+room.right+1)*8*zoom;
 const desiredY=canvas.height/2-(room.top+room.bottom+1)*8*zoom;
 const x=mapW>canvas.width?Math.max(canvas.width-mapW,Math.min(0,desiredX)):centerX;
 const y=mapH>canvas.height?Math.max(canvas.height-mapH,Math.min(0,desiredY)):centerY;
 return {zoom,pan:{x:x-centerX,y:y-centerY}};
}
