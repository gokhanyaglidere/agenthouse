import {describe,it,expect} from 'vitest';
import {isOneLineWorkspace,plazaFurniture} from './modernPlaza.js';
import assets from './assets/cozy-assets.json';
import type {SpriteData} from '../office/types.js';
describe('One-Line plaza isolation',()=>{
 it('matches only the actual One-Line workspace, never its fixture or another project',()=>{
  expect(isOneLineWorkspace('h~80b0fe8422234778~e9392047-aa3b-4e4a-84aa-ab06fbd17956')).toBe(true);
  for(const id of [null,'2c03578a-b572-451c-9c07-4a155bfc3cb4','h~80b0fe8422234778~b13c58e5-5882-49d4-8548-daa475dc3dae','h~other~e9392047-aa3b-4e4a-84aa-ab06fbd17956'])expect(isOneLineWorkspace(id)).toBe(false);
 });
 it('preserves sprite bounds and original shared assets for other projects',()=>{
  for(const type of ['BB_WORK_DESK','BB_EXEC_DESK','BB_SOFA','BB_COFFEE_TABLE','BB_FINANCE_DESK']){
   const source=(assets.sprites as Record<string,SpriteData>)[type];const original=JSON.stringify(source);const result=plazaFurniture(type,source);
   expect(result.length).toBe(source.length);expect(result.every(row=>row.length===source[0].length)).toBe(true);expect(JSON.stringify(source)).toBe(original);expect(plazaFurniture(type,source)).toBe(result);
  }
 });
});
