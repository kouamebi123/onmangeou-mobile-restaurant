import { describe, expect, it } from 'vitest';

import { expandedHeight, motion, staggerDelay } from '../../src/theme/motion';

describe('motion rules', () => {
  it('takes its durations from the design tokens', () => {
    expect(motion.appearMs).toBe(320);
    expect(motion.imageMs).toBe(200);
  });

  it('staggers the first items of a list and never keeps the rest waiting', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(motion.staggerMs);
    expect(staggerDelay(3)).toBe(3 * motion.staggerMs);
    expect(staggerDelay(40)).toBe(motion.maxStaggered * motion.staggerMs);
    expect(staggerDelay(-2)).toBe(0);
    expect(staggerDelay(Number.NaN)).toBe(0);
  });

  it('opens a section from nothing to its full height', () => {
    expect(expandedHeight(240, 0)).toBe(0);
    expect(expandedHeight(240, 0.5)).toBe(120);
    expect(expandedHeight(240, 1)).toBe(240);
    expect(expandedHeight(240, 1.4)).toBe(240);
    expect(expandedHeight(-10, 1)).toBe(0);
  });
});
