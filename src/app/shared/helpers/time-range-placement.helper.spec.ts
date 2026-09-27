// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  defaultTimeRangePlacement,
  resolveTimeRangePlacement,
  timeRangeWindowMinutes,
} from './time-range-placement.helper';

describe('time-range-placement.helper', () => {
  describe('timeRangeWindowMinutes', () => {
    it('treats equal bounds as a full-day window', () => {
      expect(timeRangeWindowMinutes('00:00:00', '00:00:00')).toBe(1440);
    });

    it('measures a window crossing midnight', () => {
      expect(timeRangeWindowMinutes('20:00:00', '06:00:00')).toBe(600);
    });
  });

  describe('defaultTimeRangePlacement', () => {
    it('places the work time at the window start, never the whole window', () => {
      expect(defaultTimeRangePlacement('00:00:00', '00:00:00', 8)).toEqual({
        startTime: '00:00:00',
        endTime: '08:00:00',
        workTime: 8,
        dayOffset: 0,
      });
    });

    it('caps the work time at the window length', () => {
      expect(defaultTimeRangePlacement('08:00:00', '12:00:00', 8)).toEqual({
        startTime: '08:00:00',
        endTime: '12:00:00',
        workTime: 4,
        dayOffset: 0,
      });
    });

    it('falls back to the whole window when the shift has no work time', () => {
      expect(defaultTimeRangePlacement('08:00:00', '12:00:00', 0).workTime).toBe(4);
    });
  });

  describe('resolveTimeRangePlacement', () => {
    it('accepts a span inside a full-day window', () => {
      const result = resolveTimeRangePlacement('00:00:00', '00:00:00', 8 * 60, 16 * 60);

      expect(result).toEqual({ startTime: '08:00:00', endTime: '16:00:00', workTime: 8, dayOffset: 0 });
    });

    it('rejects a span leaving a full-day window past midnight', () => {
      expect(resolveTimeRangePlacement('00:00:00', '00:00:00', 20 * 60, 4 * 60)).toBeNull();
    });

    it('accepts a span ending exactly at the end of a full-day window', () => {
      const result = resolveTimeRangePlacement('00:00:00', '00:00:00', 16 * 60, 0);

      expect(result).toEqual({ startTime: '16:00:00', endTime: '00:00:00', workTime: 8, dayOffset: 0 });
    });

    it('rejects a span starting before the window', () => {
      expect(resolveTimeRangePlacement('08:00:00', '20:00:00', 7 * 60, 12 * 60)).toBeNull();
    });

    it('rejects a span ending after the window', () => {
      expect(resolveTimeRangePlacement('08:00:00', '20:00:00', 14 * 60, 21 * 60)).toBeNull();
    });

    it('moves a start after midnight inside a wrapping window to the next day', () => {
      const result = resolveTimeRangePlacement('20:00:00', '06:00:00', 2 * 60, 5 * 60);

      expect(result).toEqual({ startTime: '02:00:00', endTime: '05:00:00', workTime: 3, dayOffset: 1 });
    });

    it('keeps a start before midnight inside a wrapping window on the planned day', () => {
      const result = resolveTimeRangePlacement('20:00:00', '06:00:00', 22 * 60, 2 * 60);

      expect(result).toEqual({ startTime: '22:00:00', endTime: '02:00:00', workTime: 4, dayOffset: 0 });
    });

    it('rejects a zero-length span', () => {
      expect(resolveTimeRangePlacement('08:00:00', '20:00:00', 10 * 60, 10 * 60)).toBeNull();
    });
  });
});
