// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for the container template item helpers.
 * @param convertShiftToContainerTemplateItem - Must send no time range for fixed-time shifts
 * @param resolveItemStartTime - Must honour the time range only for time-range shifts
 * @param resolveItemEndTime - Must honour the time range only for time-range shifts
 */
import { describe, it, expect } from 'vitest';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import {
  convertShiftToContainerTemplateItem,
  resolveItemEndTime,
  resolveItemStartTime,
  usesItemTimeRange,
} from './container-template-format.helper';

const shiftOf = (isTimeRange: boolean): IShift =>
  ({
    id: 'shift-1',
    isTimeRange,
    startShift: '08:00:00',
    endShift: '16:00:00',
    briefingTime: '00:00:00',
    debriefingTime: '00:00:00',
    travelTimeAfter: '00:00:00',
    travelTimeBefore: '00:00:00',
  }) as unknown as IShift;

const itemOf = (
  isTimeRange: boolean,
  timeRange: [string | null, string | null],
  absenceId?: string,
): IContainerTemplateItem =>
  ({
    shiftId: 'shift-1',
    absenceId,
    shift: { isTimeRange } as IShift,
    startItem: '08:00:00',
    endItem: '16:00:00',
    timeRangeStartItem: timeRange[0],
    timeRangeEndItem: timeRange[1],
  }) as IContainerTemplateItem;

describe('container-template-format.helper', () => {
  describe('convertShiftToContainerTemplateItem', () => {
    it('should send no time range for a fixed-time shift', () => {
      const item = convertShiftToContainerTemplateItem(shiftOf(false));

      expect(item.timeRangeStartItem).toBeNull();
      expect(item.timeRangeEndItem).toBeNull();
    });

    it('should copy the shift times as time range for a time-range shift', () => {
      const item = convertShiftToContainerTemplateItem(shiftOf(true));

      expect(item.timeRangeStartItem).toBe('08:00:00');
      expect(item.timeRangeEndItem).toBe('16:00:00');
    });
  });

  describe('usesItemTimeRange', () => {
    it('should be true only for a time-range shift item', () => {
      expect(usesItemTimeRange(itemOf(true, ['09:00:00', '10:00:00']))).toBe(true);
      expect(usesItemTimeRange(itemOf(false, ['09:00:00', '10:00:00']))).toBe(false);
    });

    it('should be false for an absence item', () => {
      expect(usesItemTimeRange(itemOf(true, ['09:00:00', '10:00:00'], 'absence-1'))).toBe(false);
    });
  });

  describe('resolveItemStartTime and resolveItemEndTime', () => {
    it('should ignore a persisted 00:00 time range on a fixed-time shift', () => {
      const item = itemOf(false, ['00:00:00', '00:00:00']);

      expect(resolveItemStartTime(item)).toBe('08:00:00');
      expect(resolveItemEndTime(item)).toBe('16:00:00');
    });

    it('should use the time range of a time-range shift', () => {
      const item = itemOf(true, ['09:00:00', '10:30:00']);

      expect(resolveItemStartTime(item)).toBe('09:00:00');
      expect(resolveItemEndTime(item)).toBe('10:30:00');
    });

    it('should fall back to the fixed times when the time range is null or empty', () => {
      expect(resolveItemStartTime(itemOf(true, [null, null]))).toBe('08:00:00');
      expect(resolveItemEndTime(itemOf(true, ['', '']))).toBe('16:00:00');
    });
  });
});
