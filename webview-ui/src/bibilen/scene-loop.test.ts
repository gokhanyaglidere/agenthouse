import {afterEach,expect,test,vi} from 'vitest';
import {startGameLoop} from '../office/engine/gameLoop.js';
afterEach(()=>vi.unstubAllGlobals());
function harness(hidden=false){let next:(time:number)=>void=()=>{};vi.stubGlobal('document',{hidden});vi.stubGlobal('getComputedStyle',()=>({visibility:'visible'}));vi.stubGlobal('requestAnimationFrame',(fn:(time:number)=>void)=>{next=fn;return 1;});vi.stubGlobal('cancelAnimationFrame',vi.fn());const canvas={dataset:{},getContext:()=>({}),parentElement:{}} as unknown as HTMLCanvasElement;const update=vi.fn(),render=vi.fn();const stop=startGameLoop(canvas,{update,render});return {tick:(t:number)=>next(t),update,render,stop};}
test('high refresh displays update movement but cap scene paints around sixty per second',()=>{const h=harness();for(let i=0;i<=144;i++)h.tick(i*1000/144);expect(h.update).toHaveBeenCalledTimes(145);expect(h.render.mock.calls.length).toBeGreaterThanOrEqual(58);expect(h.render.mock.calls.length).toBeLessThanOrEqual(62);});
test('hidden scene has no paints',()=>{const h=harness(true);h.tick(0);h.tick(1000);expect(h.render).not.toHaveBeenCalled();});
test('stopping the loop prevents updates and drawing',()=>{const h=harness();h.stop();h.tick(10);expect(h.update).not.toHaveBeenCalled();expect(h.render).not.toHaveBeenCalled();});
