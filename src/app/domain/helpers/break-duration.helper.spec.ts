// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { breakWorkTimeToCarry, hasDirectlyRecordedBreakDuration } from './break-duration.helper';

const NO_TIMES_RECORDED = '00:00:00';
const FULL_DAY_START = '00:00:00';
const FULL_DAY_END = '23:59:00';
const RECORDED_HOURS = 4.5;

describe('break-duration.helper', () => {
  describe('hasDirectlyRecordedBreakDuration', () => {
    it('is true for equal bounds with hours, which is how duration mode is stored', () => {
      expect(hasDirectlyRecordedBreakDuration(NO_TIMES_RECORDED, NO_TIMES_RECORDED, RECORDED_HOURS)).toBe(true);
    });

    it('is false for a time span even when hours are present', () => {
      expect(hasDirectlyRecordedBreakDuration('08:00:00', '12:00:00', RECORDED_HOURS)).toBe(false);
      expect(hasDirectlyRecordedBreakDuration(FULL_DAY_START, FULL_DAY_END, RECORDED_HOURS)).toBe(false);
    });

    it('is false for equal bounds without hours, which is a genuinely empty entry', () => {
      expect(hasDirectlyRecordedBreakDuration(NO_TIMES_RECORDED, NO_TIMES_RECORDED, 0)).toBe(false);
      expect(hasDirectlyRecordedBreakDuration(NO_TIMES_RECORDED, NO_TIMES_RECORDED, null)).toBe(false);
      expect(hasDirectlyRecordedBreakDuration(NO_TIMES_RECORDED, NO_TIMES_RECORDED, undefined)).toBe(false);
    });

    it('is false for equal bounds with negative hours', () => {
      expect(hasDirectlyRecordedBreakDuration(NO_TIMES_RECORDED, NO_TIMES_RECORDED, -1)).toBe(false);
    });
  });

  describe('breakWorkTimeToCarry', () => {
    it('carries the hours of a duration-mode break', () => {
      expect(breakWorkTimeToCarry(NO_TIMES_RECORDED, NO_TIMES_RECORDED, RECORDED_HOURS)).toBe(RECORDED_HOURS);
    });

    it('returns zero for a time-span break so the backend macro recomputes it for the target employee', () => {
      expect(breakWorkTimeToCarry(FULL_DAY_START, FULL_DAY_END, RECORDED_HOURS)).toBe(0);
      expect(breakWorkTimeToCarry('08:00:00', '12:00:00', RECORDED_HOURS)).toBe(0);
    });

    it('returns zero when no hours are stored', () => {
      expect(breakWorkTimeToCarry(NO_TIMES_RECORDED, NO_TIMES_RECORDED, null)).toBe(0);
      expect(breakWorkTimeToCarry(NO_TIMES_RECORDED, NO_TIMES_RECORDED, undefined)).toBe(0);
    });
  });
});
