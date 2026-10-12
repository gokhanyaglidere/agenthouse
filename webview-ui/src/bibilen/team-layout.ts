import {getPlacementBlockedTiles} from '../office/layout/layoutSerializer.js';
import type {OfficeLayout} from '../office/types.js';
// Change only roster-owned workstations; keep existing positions and decor.
export function reconcileTeamLayout(current:OfficeLayout,proposed:OfficeLayout,previousKeys:string[],nextKeys:string[]):OfficeLayout{
 const next=new Set(nextKeys),removed=new Set(previousKeys.filter(k=>!next.has(k)).flatMap(k=>['desk-'+k,'seat-'+k]));
 const furniture=current.furniture.filter(f=>!removed.has(f.uid));
 const used=new Set(furniture.filter(f=>f.uid.startsWith('desk-')).map(f=>`${f.col},${f.row}`));
 const spots=proposed.furniture.filter(f=>f.uid.startsWith('desk-'));
 for(const key of nextKeys){if(furniture.some(f=>f.uid==='desk-'+key))continue;const desk=proposed.furniture.find(f=>f.uid==='desk-'+key),seat=proposed.furniture.find(f=>f.uid==='seat-'+key);if(!desk||!seat)continue;const occupied=getPlacementBlockedTiles(furniture);const fits=(spot:typeof desk)=>{if(used.has(`${spot.col},${spot.row}`))return false;const moved=[{...desk,col:spot.col,row:spot.row},{...seat,col:seat.col+spot.col-desk.col,row:seat.row+spot.row-desk.row}];return moved.every(f=>f.col>=0&&f.row>=0&&f.col<current.cols&&f.row<current.rows)&&![...getPlacementBlockedTiles(moved)].some(tile=>occupied.has(tile));};const place=fits(desk)?desk:spots.find(fits);if(!place)continue;used.add(`${place.col},${place.row}`);furniture.push({...desk,col:place.col,row:place.row});if(!furniture.some(f=>f.uid===seat.uid))furniture.push({...seat,col:seat.col+place.col-desk.col,row:seat.row+place.row-desk.row});}
 return {...current,furniture};
}
