import {it,expect} from 'vitest';
import {buildDynamicCatalog} from '../office/layout/furnitureCatalog.js';
import {makeLayout} from './layouts.js';
import {applyBibilenGarden,isBibilenWorkspace,BIBILEN_POND} from './bibilenGarden.js';
import {OfficeState} from '../office/engine/officeState.js';
import {socialStations} from '../office/engine/socialStations.js';
buildDynamicCatalog({catalog:[],sprites:{}});
it('only BiBilen receives its garden and the source and interior remain intact',()=>{
 expect(isBibilenWorkspace('2c03578a-b572-451c-9c07-4a155bfc3cb4')).toBe(true);
 for(const id of [null,undefined,'e9392047-aa3b-4e4a-84aa-ab06fbd17956','106c81ce-ac36-46c4-8ad9-73da8ce99710'])expect(isBibilenWorkspace(id)).toBe(false);
 const source=makeLayout('studio'),before=JSON.stringify(source);expect(applyBibilenGarden(source,false)).toBe(source);
 const next=applyBibilenGarden(source,true);expect(JSON.stringify(source)).toBe(before);
 expect(next.furniture.filter(f=>f.row<56)).toEqual(source.furniture.filter(f=>f.row<56));
 expect(next.tiles.slice(0,56*77)).toEqual(source.tiles.slice(0,56*77));
 expect(applyBibilenGarden(next,true)).toEqual(next);
});
it('both exits and every outdoor activity remain reachable without walking through the pond',()=>{
 const layout=applyBibilenGarden(makeLayout('studio'),true),office=new OfficeState(layout),seen=new Set<string>(),queue=[[46,55]];
 while(queue.length){const [x,y]=queue.shift()!,key=`${x},${y}`;if(seen.has(key)||x<0||x>=77||y<55||y>=77||[0,255].includes(layout.tiles[y*77+x])||office.blockedTiles.has(key))continue;seen.add(key);queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);}
 expect(seen.has('66,55')).toBe(true);
 const visits=socialStations(layout).filter(s=>s.row>=56);expect(visits.filter(s=>s.activity==='bench')).toHaveLength(2);expect(visits.filter(s=>s.activity==='water')).toHaveLength(2);
 for(const visit of visits)expect(seen.has(`${visit.col},${visit.row}`),`${visit.activity}: ${visit.col},${visit.row}`).toBe(true);
 const p=BIBILEN_POND;for(let y=p.row;y<p.row+p.h;y++)for(let x=p.col;x<p.col+p.w;x++)expect(seen.has(`${x},${y}`)).toBe(false);
});
