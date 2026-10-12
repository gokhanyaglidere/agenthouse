/** A suspended preview never catches up time spent paused or in another tab. */
export function createPreviewClock() {
  let previous: number | null = null;
  return {
    reset() { previous = null; },
    tick(now: number, speed: number): number {
      const delta = previous === null ? 0 : Math.max(0, Math.min(100, now - previous));
      previous = now;
      return delta / 1000 * speed;
    },
  };
}
