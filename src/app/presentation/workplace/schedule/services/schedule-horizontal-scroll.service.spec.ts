// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SCROLLBAR_CONSTANTS } from 'src/app/presentation/shared/scrollbar/constants';
import { ScheduleHorizontalScrollService } from './schedule-horizontal-scroll.service';

describe('ScheduleHorizontalScrollService', () => {
  const COLUMNS = 38;
  const VISIBLE = 13;
  const UPPER = COLUMNS - VISIBLE + SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

  let service: ScheduleHorizontalScrollService;

  beforeEach(() => {
    service = new ScheduleHorizontalScrollService();
    service.setMaxValue(COLUMNS);
    service.setVisibleValue(VISIBLE);
  });

  it('clamps a wheel overshoot to the same upper bound the scrollbar thumb uses', () => {
    expect(service.requestPosition(COLUMNS + 50)).toBe(UPPER);
    expect(service.horizontalPosition()).toBe(UPPER);
  });

  it('clamps negative requests to zero', () => {
    service.forceSetPosition(4);

    expect(service.requestPosition(-3)).toBe(0);
    expect(service.horizontalPosition()).toBe(0);
  });

  it('passes through positions inside the range', () => {
    expect(service.requestPosition(7)).toBe(7);
    expect(service.horizontalPosition()).toBe(7);
  });

  it('does not clamp the upper bound while the column count is still unknown', () => {
    const fresh = new ScheduleHorizontalScrollService();

    expect(fresh.requestPosition(12)).toBe(12);
    expect(fresh.horizontalPosition()).toBe(12);
  });

  it('respects the lock like setPosition does', () => {
    service.lock();

    service.requestPosition(9);

    expect(service.horizontalPosition()).toBe(0);
  });
});
