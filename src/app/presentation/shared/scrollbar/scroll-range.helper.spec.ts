// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { maxScrollValue } from './scroll-range.helper';
import { SCROLLBAR_CONSTANTS } from './constants';

describe('maxScrollValue', () => {
  const overhang = SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

  it('allows the overhang beyond the last fully scrolled position', () => {
    expect(maxScrollValue(100, 20)).toBe(80 + overhang);
  });

  it('keeps the overhang when the rounded-up visible count equals the content', () => {
    expect(maxScrollValue(20, 20)).toBe(overhang);
    expect(maxScrollValue(18, 20)).toBe(overhang - 2);
  });

  it('is 0 when the content is far smaller than the viewport or empty', () => {
    expect(maxScrollValue(10, 20)).toBe(0);
    expect(maxScrollValue(0, 0)).toBe(0);
    expect(maxScrollValue(0, 20)).toBe(0);
  });
});
