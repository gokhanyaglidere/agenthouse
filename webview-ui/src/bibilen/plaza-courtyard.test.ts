import {it,expect} from 'vitest';
import {buildDynamicCatalog} from '../office/layout/furnitureCatalog.js';
import {makeLayout} from './layouts.js';
import {applyPlazaCourtyard,COURTYARD_POOL,COURTYARD_BEDS} from './plazaCourtyard.js';
import {OfficeState} from '../office/engine/officeState.js';
import {socialStations} from '../office/engine/socialStations.js';
buildDynamicCatalog({catalog:[],sprites:{}});
it('courtyard transformation preserves other projects and all indoor content',()=>{
 const source=makeLayout('studio'),before=JSON.stringify(source);expect(applyPlazaCourtyard(source,false)).toBe(source);
 const next=applyPlazaCourtyard(source,true);expect(JSON.stringify(source)).toBe(before);expect(next.furniture.filter(f=>f.row<56)).toEqual(source.furniture.filter(f=>f.row<56));expect(next.tiles.slice(0,56*77)).toEqual(source.tiles.slice(0,56*77));expect(applyPlazaCourtyard(next,true)).toEqual(next);
 for(const b of [COURTYARD_POOL,...COURTYARD_BEDS])for(let y=b.row;y<b.row+b.h;y++)for(let x=b.col;x<b.col+b.w;x++)expect(next.tiles[y*77+x]).toBe(0);
});
it('both entrances, benches and watering stations connect around the water and planters',()=>{
 const layout=applyPlazaCourtyard(makeLayout('studio'),true),office=new OfficeState(layout),seen=new Set<string>(),queue=[[46,55]];
 while(queue.length){const [x,y]=queue.shift()!,key=`${x},${y}`;if(seen.has(key)||x<0||x>=77||y<55||y>=77||[0,255].includes(layout.tiles[y*77+x])||office.blockedTiles.has(key))continue;seen.add(key);queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);}
 expect(seen.has('66,55')).toBe(true);
 const outdoor=socialStations(layout).filter(s=>s.row>=56);expect(outdoor.filter(s=>s.activity==='bench')).toHaveLength(2);expect(outdoor.filter(s=>s.activity==='water')).toHaveLength(2);for(const visit of outdoor)expect(seen.has(`${visit.col},${visit.row}`)).toBe(true);
});
