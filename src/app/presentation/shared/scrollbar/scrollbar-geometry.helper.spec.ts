// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { isPositionOnThumb } from './scrollbar-geometry.helper';

describe('isPositionOnThumb', () => {
  it('never hits a thumb without a scroll range (tick size 0)', () => {
    expect(isPositionOnThumb(10, 0, 0, 100)).toBe(false);
    expect(isPositionOnThumb(0, 0, 0, 100)).toBe(false);
  });

  it('hits positions within the thumb ticks', () => {
    expect(isPositionOnThumb(50, 5, 10, 100)).toBe(true);
    expect(isPositionOnThumb(160, 5, 10, 100)).toBe(false);
  });
});
