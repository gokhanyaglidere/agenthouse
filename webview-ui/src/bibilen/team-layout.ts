import {getPlacementBlockedTiles} from '../office/layout/layoutSerializer.js';
import {getCatalogEntry} from '../office/layout/furnitureCatalog.js';
import type {OfficeLayout,PlacedFurniture} from '../office/types.js';
// Reconcile roster-owned pairs only. Never move a retained workstation or decor.
export function reconcileTeamLayout(current:OfficeLayout,proposed:OfficeLayout,previousKeys:string[],nextKeys:string[]):OfficeLayout{
 const next=new Set(nextKeys),removed=new Set(previousKeys.filter(k=>!next.has(k)).flatMap(k=>['desk-'+k,'seat-'+k]));
 const furniture=current.furniture.filter(f=>!removed.has(f.uid));
 const spots=proposed.furniture.filter(f=>f.uid.startsWith('desk-'));
 for(const key of nextKeys){
  const existingDesk=furniture.find(f=>f.uid==='desk-'+key),existingSeat=furniture.find(f=>f.uid==='seat-'+key);
  if(existingDesk&&existingSeat)continue;
  const desk=proposed.furniture.find(f=>f.uid==='desk-'+key),seat=proposed.furniture.find(f=>f.uid==='seat-'+key);if(!desk||!seat)continue;
  const occupied=getPlacementBlockedTiles(furniture.filter(f=>f.uid!==existingDesk?.uid&&f.uid!==existingSeat?.uid));
  const pair=(spot:PlacedFurniture)=>[existingDesk??{...desk,col:spot.col,row:spot.row},existingSeat??{...seat,col:seat.col+spot.col-desk.col,row:seat.row+spot.row-desk.row}];
  const fits=(spot:PlacedFurniture)=>{const moved=pair(spot);return moved.every(f=>{const entry=getCatalogEntry(f.type);return f.col>=0&&f.row>=0&&f.col+(entry?.footprintW??1)<=current.cols&&f.row+(entry?.footprintH??1)<=current.rows;})&&!furniture.some(f=>f.uid.startsWith('desk-')&&f.uid!==existingDesk?.uid&&f.col===spot.col&&f.row===spot.row)&&![...getPlacementBlockedTiles(moved)].some(tile=>occupied.has(tile));};
  const anchor=existingDesk??(existingSeat?{...desk,col:existingSeat.col-seat.col+desk.col,row:existingSeat.row-seat.row+desk.row}:desk);
  const place=fits(anchor)?anchor:!existingDesk&&!existingSeat?spots.find(fits):undefined;if(!place)continue;
  const moved=pair(place);if(!existingDesk)furniture.push(moved[0]);if(!existingSeat)furniture.push(moved[1]);
 }
 return {...current,furniture};
}
