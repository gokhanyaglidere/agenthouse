import { describe, expect, it } from 'vitest';
import { createPreviewClock } from './previewClock';

describe('preview playback timing', () => {
  it('excludes hidden and paused time after resuming', () => {
    const clock = createPreviewClock();
    expect(clock.tick(1000, 1)).toBe(0);
    expect(clock.tick(1050, 1)).toBe(.05);
    clock.reset();
    expect(clock.tick(60000, 1)).toBe(0);
    expect(clock.tick(60050, .5)).toBe(.025);
  });
  it('uses real frame duration and bounds stalls or backwards timestamps', () => {
    const clock = createPreviewClock();
    clock.tick(1000, 1);
    expect(clock.tick(1010, 1)).toBe(.01);
    expect(clock.tick(1060, 1)).toBe(.05);
    expect(clock.tick(2000, 1)).toBe(.1);
    expect(clock.tick(1900, 1)).toBe(0);
  });
});
