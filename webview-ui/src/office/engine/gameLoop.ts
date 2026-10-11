import { MAX_DELTA_TIME_SEC } from '../../constants.js';

/** @internal */
export interface GameLoopCallbacks {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

export function startGameLoop(canvas: HTMLCanvasElement, callbacks: GameLoopCallbacks): () => void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  let lastTime = 0;
  let rafId = 0;
  let stopped = false;
  let lastVisibilityCheck = -Infinity;
  let visible = true;
  let lastPaint=-Infinity;
  let sampleStart=0,sampleFrames=0,sampleCost=0;

  const frame = (time: number) => {
    if (stopped) return;
    const dt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, MAX_DELTA_TIME_SEC);
    lastTime = time;

    const frameStart=performance.now();
    callbacks.update(dt);

    ctx.imageSmoothingEnabled = false;
    // Hidden operation screens do not need sixty office repaints per second.
    if (time - lastVisibilityCheck >= 250) {
      visible = !document.hidden && getComputedStyle(canvas.parentElement ?? canvas).visibility !== 'hidden';
      lastVisibilityCheck = time;
    }
    if (visible&&time-lastPaint>=1000/60-.001){lastPaint=Number.isFinite(lastPaint)?lastPaint+Math.max(1,Math.floor((time-lastPaint+.001)/(1000/60)))*(1000/60):time;callbacks.render(ctx);sampleFrames++;sampleCost+=performance.now()-frameStart;
      if(!sampleStart)sampleStart=time;
      if(time-sampleStart>=1000){canvas.dataset.frameRate=(sampleFrames*1000/(time-sampleStart)).toFixed(1);canvas.dataset.frameCostMs=(sampleCost/sampleFrames).toFixed(2);sampleStart=time;sampleFrames=0;sampleCost=0;}
    }else if(!visible){sampleStart=0;sampleFrames=0;sampleCost=0;}

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
