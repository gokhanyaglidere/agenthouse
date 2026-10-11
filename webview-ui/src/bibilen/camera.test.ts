import {it,expect} from 'vitest';
import {roomCamera} from './camera.js';
import {COZY_ROOMS,COZY_COLS,COZY_ROWS} from './layouts.js';
import {mapOffset} from '../office/projection.js';
it('keeps every room visible on a portrait phone without exposing empty space beyond the map',()=>{
 const layout={cols:COZY_COLS,rows:COZY_ROWS},canvas={width:390,height:644};
 for(const room of COZY_ROOMS){const {zoom,pan}=roomCamera(layout,room,canvas),o=mapOffset(canvas.width,canvas.height,layout.cols,layout.rows,zoom,pan.x,pan.y);
  expect(o.offsetY).toBeLessThanOrEqual(0);expect(o.offsetY+layout.rows*16*zoom).toBeGreaterThanOrEqual(canvas.height-1);
  expect(o.offsetX+room.left*16*zoom).toBeGreaterThanOrEqual(-1);
  expect(o.offsetX+(room.right+1)*16*zoom).toBeLessThanOrEqual(canvas.width+1);
  expect(o.offsetY+room.top*16*zoom).toBeGreaterThanOrEqual(-1);
  expect(o.offsetY+(room.bottom+1)*16*zoom).toBeLessThanOrEqual(canvas.height+1);
 }
});
