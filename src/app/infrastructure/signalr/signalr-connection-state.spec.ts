// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { jitter } from './signalr-connection-state';

describe('jitter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 0 for non-positive delay', () => {
    expect(jitter(0)).toBe(0);
    expect(jitter(-100)).toBe(0);
  });

  it('stays within +/- factor*delay around the base delay', () => {
    const samples = 200;
    const baseDelay = 1000;
    const factor = 0.3;
    const minAllowed = baseDelay * (1 - factor);
    const maxAllowed = baseDelay * (1 + factor);

    for (let i = 0; i < samples; i++) {
      const result = jitter(baseDelay, factor);
      expect(result).toBeGreaterThanOrEqual(minAllowed);
      expect(result).toBeLessThanOrEqual(maxAllowed);
    }
  });

  it('returns the lower bound when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(jitter(1000, 0.3)).toBe(700);
  });

  it('returns the upper bound when Math.random returns 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999999);
    expect(jitter(1000, 0.3)).toBe(1300);
  });

  it('returns the base delay when Math.random returns 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(jitter(1000, 0.3)).toBe(1000);
  });

  it('uses the default factor 0.3 when omitted', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(jitter(1000)).toBe(1300);
  });

  it('clamps negative results to 0 even with extreme factor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(jitter(100, 5)).toBe(0);
  });
});
